import { POSES } from "../../config/constants.js";
import { GROUND_Y } from "../../environment/canvas.js";
import { getEnvironmentWidth } from "../../state/environment.js";
import { stickman, remotePlayers, upsertRemotePlayer, getTotalHeight } from "../../state/entities.js";
import { input } from "../input/index.js";
import { resetSurvival } from "../survival/index.js";
import { deactivateSandboxSkirmish } from "../sandbox/index.js";
import { activateCoop, deactivateCoop, setCoopParticipants, setCoopMetrics, setCoopOutcome, getCoopHudStatus } from "../../state/coop.js";

const COOP_SETTINGS = {
  maxParticipants: 100,
  spawnInterval: 0.25,
  spawnBatchSize: 12,
  orbitRadius: 420,
  orbitVariance: 260,
  bobHeight: 46,
  speedMin: 0.4,
  speedMax: 1.1
};

const simulatedParticipants = new Map();
let spawnTimer = 0;
let statsTimer = 0;
let packetCounter = 0;

const standingHeight = getTotalHeight(POSES.standing);
const baseY = GROUND_Y - standingHeight;

function createSimulatedParticipant(index) {
  const id = `coop-${index}-${Math.random().toString(36).slice(2, 8)}`;
  const radius = COOP_SETTINGS.orbitRadius + Math.random() * COOP_SETTINGS.orbitVariance;
  const angle = Math.random() * Math.PI * 2;
  const speed = COOP_SETTINGS.speedMin + Math.random() * (COOP_SETTINGS.speedMax - COOP_SETTINGS.speedMin);
  const latency = 30 + Math.random() * 110;
  return {
    id,
    name: `Agent ${index + 1}`,
    angle,
    radius,
    speed,
    latency,
    latencyTarget: latency,
    latencyTimer: 1 + Math.random() * 2,
    x: stickman.x + Math.cos(angle) * radius,
    y: baseY,
    jitter: Math.random() * Math.PI * 2
  };
}

function ensureSimulatedParticipants(delta) {
  const maxParticipants = COOP_SETTINGS.maxParticipants;
  if (simulatedParticipants.size >= maxParticipants) {
    return;
  }
  spawnTimer += delta;
  if (spawnTimer < COOP_SETTINGS.spawnInterval) {
    return;
  }
  spawnTimer = 0;
  const batch = Math.min(COOP_SETTINGS.spawnBatchSize, maxParticipants - simulatedParticipants.size);
  for (let i = 0; i < batch; i += 1) {
    const index = simulatedParticipants.size;
    const participant = createSimulatedParticipant(index);
    simulatedParticipants.set(participant.id, participant);
  }
}

function updateParticipant(participant, delta, width) {
  participant.angle = (participant.angle + participant.speed * delta) % (Math.PI * 2);
  const orbitX = stickman.x + Math.cos(participant.angle) * participant.radius;
  const clampMargin = 120;
  const minX = clampMargin;
  const maxX = Math.max(clampMargin, width - clampMargin);
  participant.x = Math.min(maxX, Math.max(minX, orbitX));
  const bobOffset = Math.sin(participant.angle * 2 + participant.jitter) * COOP_SETTINGS.bobHeight;
  participant.y = baseY + bobOffset;

  participant.latencyTimer -= delta;
  if (participant.latencyTimer <= 0) {
    participant.latencyTarget = 24 + Math.random() * 160;
    participant.latencyTimer = 1.5 + Math.random() * 2.5;
  }
  const latencyDelta = participant.latencyTarget - participant.latency;
  participant.latency += latencyDelta * Math.min(1, delta * 0.6);

  const facing = participant.x >= stickman.x ? 1 : -1;
  upsertRemotePlayer({
    id: participant.id,
    name: participant.name,
    x: participant.x,
    y: participant.y,
    facing,
    commandId: "support"
  });
  packetCounter += 1;
  return participant.latency;
}

function removeSimulatedParticipants() {
  for (const id of simulatedParticipants.keys()) {
    remotePlayers.delete(id);
  }
  simulatedParticipants.clear();
}

function activateMassiveCoop() {
  activateCoop(COOP_SETTINGS.maxParticipants);
  setCoopOutcome("active");
  spawnTimer = 0;
  statsTimer = 0;
  packetCounter = 0;
  removeSimulatedParticipants();
  resetSurvival();
  deactivateSandboxSkirmish("coop");
}

function deactivateMassiveCoop(outcome = "inactive") {
  deactivateCoop(outcome);
  removeSimulatedParticipants();
  spawnTimer = 0;
  statsTimer = 0;
  packetCounter = 0;
}

function updateMassiveCoop(delta) {
  if (input.coopToggleBuffered) {
    input.coopToggleBuffered = false;
    const hud = getCoopHudStatus();
    if (hud?.active) {
      deactivateMassiveCoop("aborted");
    } else {
      activateMassiveCoop();
    }
  }

  const hud = getCoopHudStatus();
  if (!hud?.active) {
    return;
  }

  ensureSimulatedParticipants(delta);

  const envWidth = getEnvironmentWidth();
  let latencySum = 0;
  let latencyCount = 0;
  for (const participant of simulatedParticipants.values()) {
    latencySum += updateParticipant(participant, delta, envWidth);
    latencyCount += 1;
  }

  setCoopParticipants(simulatedParticipants.size + 1, COOP_SETTINGS.maxParticipants);

  statsTimer += delta;
  if (statsTimer >= 1) {
    const packetsPerSecond = packetCounter / statsTimer;
    const averageLatency = latencyCount > 0 ? latencySum / latencyCount : 0;
    setCoopMetrics({ packetsPerSecond, averageLatency });
    packetCounter = 0;
    statsTimer = 0;
  }
}

export { updateMassiveCoop, deactivateMassiveCoop };
