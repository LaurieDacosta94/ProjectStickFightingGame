import { canvas, GROUND_Y } from "../environment/canvas.js";
import { POSES } from "../config/constants.js";
import { SQUAD_COMMANDS } from "../config/squad.js";

function getTotalHeight(pose) {
  return pose.headRadius * 2 + pose.bodyLength + pose.legLength;
}

function createGruntEnemy(spawnX = canvas.width * 0.25) {
  const spawnY = GROUND_Y - 118;
  return {
    id: `grunt-${Math.random().toString(36).slice(2, 8)}`,
    spawnX,
    spawnY,
    x: spawnX,
    y: spawnY,
    vx: 0,
    vy: 0,
    radius: 22,
    height: 118,
    facing: 1,
    onGround: true,
    state: "patrol",
    stateTimer: 1 + Math.random(),
    patrolRange: { min: spawnX - 100, max: spawnX + 220 },
    aggressionRange: 360,
    attackRange: 86,
    moveSpeed: 160,
    health: 120,
    maxHealth: 120,
    attackCooldown: 0,
    attackWindup: 0,
    attackActive: 0,
    attackDamage: 12,
    attackKnockback: 120,
    attackLaunch: -80,
    flashTimer: 0,
    shakeTimer: 0,
    shakeMagnitude: 0,
    invulnerability: 0,
    respawnTimer: 0,
    stunTimer: 0,
    smokeSlowTimer: 0,
    smokeSlowStrength: 1
  };
}


function createSquadmate(offsetX = 0, name = "Ally") {
  const spawnX = canvas.width * 0.5 + offsetX;
  const spawnY = GROUND_Y - getTotalHeight(POSES.standing);
  return {
    id: `squad-${Math.random().toString(36).slice(2, 8)}`,
    name,
    x: spawnX,
    y: spawnY,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: true,
    state: "follow",
    fireCooldown: 0,
    commandTimer: 0,
    targetEnemyId: null,
    flashTimer: 0,
    highlight: 0,
    roleIndex: 0
  };
}

const stickman = {
  x: canvas.width * 0.5,
  y: GROUND_Y - getTotalHeight(POSES.standing),
  vx: 0,
  vy: 0,
  facing: 1,
  onGround: true,
  controlMode: "onFoot",
  vehicleId: null,
  vehicleCandidateId: null,
  squadCommandIndex: 0,
  squadCommandId: SQUAD_COMMANDS[0]?.id ?? "hold",
  squadCommandCooldown: 0,
  rolling: false,
  rollTimer: 0,
  crouching: false,
  currentPose: POSES.standing,
  attacking: false,
  attackIndex: -1,
  currentAttack: null,
  attackElapsed: 0,
  attackInstanceId: 0,
  comboWindowOpen: false,
  comboWindowTimer: 0,
  nextAttackQueued: false,
  hitboxSpawned: false,
  activeHitboxes: [],
  health: 100,
  maxHealth: 100,
  invulnerability: 0,
  deadTimer: 0,
  throwCooldown: 0,
  gadgetCooldown: 0,
  reloading: false,
  stunTimer: 0,
  flashBlindTimer: 0,
  smokeSlowTimer: 0,
  smokeSlowStrength: 1,
  equippedWeaponId: "combatFists"
};

const squadmates = [
  createSquadmate(-120, "Sparrow"),
  createSquadmate(40, "Rook"),
  createSquadmate(120, "Viper")
];

const remotePlayers = new Map();

function upsertRemotePlayer(state) {
  if (!state || !state.id) {
    return;
  }
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  const existing = remotePlayers.get(state.id) ?? {};
  remotePlayers.set(state.id, {
    id: state.id,
    name: state.name ?? existing.name ?? "Remote",
    x: state.x ?? existing.x ?? 0,
    y: state.y ?? existing.y ?? GROUND_Y - getTotalHeight(POSES.standing),
    facing: state.facing ?? existing.facing ?? 1,
    commandId: state.commandId ?? existing.commandId ?? "hold",
    lastUpdate: now
  });
}

function getRemotePlayers() {
  return Array.from(remotePlayers.values());
}

function pruneRemotePlayers(maxAgeMs = 6000) {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  for (const [id, player] of remotePlayers.entries()) {
    if (now - (player.lastUpdate ?? now) > maxAgeMs) {
      remotePlayers.delete(id);
    }
  }
}

const trainingDummy = {
  id: "training-dummy",
  x: canvas.width * 0.75,
  y: GROUND_Y - 120,
  height: 120,
  radius: 26,
  maxHealth: 150,
  health: 150,
  flashTimer: 0,
  shakeTimer: 0,
  shakeMagnitude: 0,
  respawnTimer: 0
};

const enemies = [
  createGruntEnemy(canvas.width * 0.24),
  createGruntEnemy(canvas.width * 0.68)
];

export { stickman, trainingDummy, enemies, squadmates, remotePlayers, createGruntEnemy, createSquadmate, upsertRemotePlayer, getRemotePlayers, pruneRemotePlayers, getTotalHeight };
