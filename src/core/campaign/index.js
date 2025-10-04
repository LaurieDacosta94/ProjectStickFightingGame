import { spawnEnemies } from "../world/enemySpawner.js";
import { input } from "../input/index.js";
import { stickman, enemies, removeSandboxEnemies, restoreSandboxEnemies } from "../../state/entities.js";
import { setEnvironment, refreshEnvironment } from "../../state/environment.js";
import { addMaterials } from "../../state/resources.js";
import { resetSurvival } from "../survival/index.js";
import {
  getCampaignState,
  getCampaignMissionDefinition,
  getCampaignMissions,
  getCampaignSettings,
  resetCampaignState,
  setCampaignActive,
  setCampaignStage,
  decrementCampaignStageTimer,
  configureCampaignMission,
  setCampaignMessage,
  incrementCampaignProgress,
  setCampaignProgress,
  setCampaignRemaining,
  decrementCampaignRemaining,
  resetCampaignRemaining,
  setCampaignSpawnCooldown,
  decrementCampaignSpawnCooldown,
  setCampaignLastOutcome,
  setCompletedMissions
} from "../../state/campaign.js";

const CAMPAIGN_CONTEXT = "campaign";

function clearCampaignEnemies() {
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    if (enemies[i].spawnContext === CAMPAIGN_CONTEXT) {
      enemies.splice(i, 1);
    }
  }
}

function ensureEnvironmentLoaded(environmentId) {
  if (environmentId) {
    const changed = setEnvironment(environmentId);
    if (!changed) {
      refreshEnvironment();
    }
  } else {
    refreshEnvironment();
  }
}

function applyMissionRewards(rewards = {}) {
  const materials = Math.max(0, Math.floor(rewards.materials ?? 0));
  if (materials > 0) {
    addMaterials(materials);
  }
}

function spawnCampaignEnemies() {
  const state = getCampaignState();
  if (state.stage !== "active") {
    return;
  }
  const mission = getCampaignMissionDefinition();
  if (!mission) {
    return;
  }
  const spawnSettings = state.spawn ?? {};
  const batchSize = Math.max(0, spawnSettings.batchSize ?? 0);
  if (batchSize <= 0) {
    return;
  }
  if ((spawnSettings.cooldown ?? 0) > 0) {
    return;
  }
  const alive = enemies.reduce((count, enemy) => {
    if (enemy.spawnContext === CAMPAIGN_CONTEXT && enemy.health > 0) {
      return count + 1;
    }
    return count;
  }, 0);
  if (alive >= batchSize) {
    return;
  }
  let remainingQuota = batchSize - alive;
  if (state.objective.type === "eliminate") {
    const remainingKills = Math.max(0, state.objective.target - state.objective.progress);
    if (remainingKills <= 0) {
      return;
    }
    remainingQuota = Math.min(remainingQuota, remainingKills);
  }
  if (remainingQuota <= 0) {
    return;
  }
  spawnEnemies(remainingQuota, {
    context: CAMPAIGN_CONTEXT,
    autoRespawn: Boolean(spawnSettings.autoRespawn)
  });
  const delay = spawnSettings.replenishDelay ?? 0;
  setCampaignSpawnCooldown(delay > 0 ? delay : 0.75);
}

function removeDefeatedCampaignEnemies() {
  const state = getCampaignState();
  if (state.stage !== "active") {
    return;
  }
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    if (enemy.spawnContext === CAMPAIGN_CONTEXT && enemy.health <= 0 && enemy.autoRespawn === false) {
      enemies.splice(i, 1);
    }
  }
}

function beginMissionActive(messageFallback = "Objective in progress") {
  const state = getCampaignState();
  setCampaignStage("active", 0);
  const label = state.objective.label || messageFallback;
  setCampaignMessage(label);
  resetCampaignRemaining();
  setCampaignProgress(0);
  setCampaignSpawnCooldown(0);
  spawnCampaignEnemies();
}

function startMission(index) {
  const mission = configureCampaignMission(index);
  if (!mission) {
    completeCampaign();
    return false;
  }
  const settings = getCampaignSettings();
  clearCampaignEnemies();
  removeSandboxEnemies();
  ensureEnvironmentLoaded(mission.environmentId);
  removeSandboxEnemies();
  const briefingDuration = mission.briefingDuration ?? settings.briefingDuration ?? 0;
  if (briefingDuration > 0 && (mission.briefing ?? "").trim().length > 0) {
    setCampaignStage("briefing", briefingDuration);
    setCampaignMessage(`${mission.briefing} (Press Q to deploy early)`);
  } else {
    beginMissionActive(mission.objective?.label ?? "Objective started");
  }
  setCampaignLastOutcome(null);
  return true;
}

function startCampaign(startIndex = 0) {
  resetSurvival();
  resetCampaignState();
  setCampaignActive(true);
  const missions = getCampaignMissions();
  const clampedIndex = Math.min(Math.max(0, startIndex), Math.max(0, missions.length - 1));
  return startMission(clampedIndex);
}

function retryCurrentMission() {
  const state = getCampaignState();
  const index = state.missionIndex >= 0 ? state.missionIndex : 0;
  setCampaignActive(true);
  return startMission(index);
}

function continueToNextMission() {
  const state = getCampaignState();
  const nextIndex = state.missionIndex + 1;
  const missions = getCampaignMissions();
  if (nextIndex >= missions.length) {
    completeCampaign(true);
    return;
  }
  startMission(nextIndex);
}

function completeCampaign(success = true) {
  const state = getCampaignState();
  if (!state.active && state.stage === "inactive") {
    restoreSandboxEnemies();
    return;
  }
  clearCampaignEnemies();
  restoreSandboxEnemies();
  if (success) {
    setCampaignLastOutcome("complete");
    setCampaignMessage("Campaign complete! Press Q to replay the story.");
  } else {
    setCampaignLastOutcome("aborted");
    setCampaignMessage("Campaign closed. Press Q to restart missions.");
  }
  setCampaignStage("complete", 0);
  setCampaignActive(false);
}

function handleMissionSuccess() {
  const state = getCampaignState();
  if (state.stage !== "active") {
    return;
  }
  const mission = getCampaignMissionDefinition();
  const settings = getCampaignSettings();
  clearCampaignEnemies();
  applyMissionRewards(state.rewards);
  setCompletedMissions(state.missionIndex + 1);
  const holdTime = mission?.successHoldDuration ?? settings.successHoldDuration ?? 4;
  const successMessage = state.successMessage || "Mission complete.";
  setCampaignMessage(`${successMessage} (Press Q to continue)`);
  setCampaignStage("success", holdTime);
  setCampaignLastOutcome("success");
}

function handleMissionFailure(reason = "") {
  const state = getCampaignState();
  if (state.stage !== "active") {
    return;
  }
  const mission = getCampaignMissionDefinition();
  const settings = getCampaignSettings();
  clearCampaignEnemies();
  const failureText = state.failureMessage || "Mission failed.";
  const extra = reason ? ` — ${reason}` : "";
  setCampaignMessage(`${failureText}${extra} (Press Q to retry)`);
  const holdTime = mission?.failureHoldDuration ?? settings.failureHoldDuration ?? 4;
  setCampaignStage("failure", holdTime);
  setCampaignLastOutcome("failure");
  restoreSandboxEnemies();
}

function handleCampaignInput() {
  if (!input.campaignStartBuffered) {
    return;
  }
  input.campaignStartBuffered = false;
  const state = getCampaignState();
  switch (state.stage) {
    case "inactive":
      startCampaign(0);
      break;
    case "briefing":
      beginMissionActive();
      break;
    case "active":
      // Ignore while mission running to avoid accidental aborts
      break;
    case "success":
      continueToNextMission();
      break;
    case "failure":
      retryCurrentMission();
      break;
    case "complete":
      startCampaign(0);
      break;
    default:
      startCampaign(0);
      break;
  }
}

function updateCampaign(delta) {
  decrementCampaignStageTimer(delta);
  decrementCampaignSpawnCooldown(delta);
  handleCampaignInput();

  const state = getCampaignState();
  if (!state.active && state.stage === "inactive") {
    return;
  }

  if (state.stage === "briefing") {
    if (state.stageTimer <= 0) {
      beginMissionActive();
    }
    return;
  }

  if (state.stage === "active") {
    if (state.objective.type === "survive") {
      decrementCampaignRemaining(delta);
      const duration = state.objective.duration ?? 0;
      const elapsed = Math.max(0, duration - state.objective.remaining);
      setCampaignProgress(elapsed);
      if (state.objective.remaining <= 0) {
        handleMissionSuccess();
        return;
      }
    }
    if (state.objective.type === "eliminate" && state.objective.target > 0 && state.objective.progress >= state.objective.target) {
      handleMissionSuccess();
      return;
    }
    removeDefeatedCampaignEnemies();
    spawnCampaignEnemies();
    if (stickman.health <= 0) {
      handleMissionFailure("Operative down");
      return;
    }
    return;
  }

  if (state.stage === "success") {
    if (state.stageTimer <= 0) {
      continueToNextMission();
    }
    return;
  }

  if (state.stage === "failure") {
    if (state.stageTimer <= 0) {
      // waiting for player to retry
    }
    return;
  }
}

function getCampaignHudStatus() {
  const state = getCampaignState();
  const mission = getCampaignMissionDefinition();
  return {
    active: state.active || state.stage !== "inactive",
    stage: state.stage,
    message: state.message,
    missionIndex: state.missionIndex,
    missionName: mission?.name ?? "",
    missionDescription: mission?.description ?? "",
    completedMissions: state.completedMissions,
    totalMissions: state.totalMissions,
    lastOutcome: state.lastOutcome,
    objective: {
      type: state.objective.type,
      label: state.objective.label,
      target: state.objective.target,
      progress: state.objective.progress,
      remaining: state.objective.remaining,
      duration: state.objective.duration
    }
  };
}

function recordCampaignEnemyDefeated(enemy) {
  if (!enemy || enemy.spawnContext !== CAMPAIGN_CONTEXT) {
    return;
  }
  const state = getCampaignState();
  if (state.stage !== "active" || state.objective.type !== "eliminate") {
    return;
  }
  incrementCampaignProgress(1);
}

export { updateCampaign, getCampaignHudStatus, recordCampaignEnemyDefeated, startCampaign, retryCurrentMission, completeCampaign };
