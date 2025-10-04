import { SURVIVAL_SETTINGS } from "../config/survival.js";
import { onEnvironmentChange } from "./environment.js";

const persistentSurvivalStats = {
  bestWave: 0,
  bestKills: 0,
  bestReward: 0
};

const survivalState = {
  active: false,
  stage: "inactive",
  timer: 0,
  wave: 0,
  enemiesAlive: 0,
  lastReward: 0,
  kills: 0,
  runReward: 0,
  bestWave: 0,
  bestKills: 0,
  bestReward: 0,
  lastOutcome: null
};

function syncPersistentStats(preserve = true) {
  if (preserve) {
    persistentSurvivalStats.bestWave = Math.max(persistentSurvivalStats.bestWave, survivalState.bestWave);
    persistentSurvivalStats.bestKills = Math.max(persistentSurvivalStats.bestKills, survivalState.bestKills);
    persistentSurvivalStats.bestReward = Math.max(persistentSurvivalStats.bestReward, survivalState.bestReward);
  } else {
    persistentSurvivalStats.bestWave = 0;
    persistentSurvivalStats.bestKills = 0;
    persistentSurvivalStats.bestReward = 0;
  }
}

function applyPersistentStats() {
  survivalState.bestWave = Math.max(survivalState.bestWave, persistentSurvivalStats.bestWave);
  survivalState.bestKills = Math.max(survivalState.bestKills, persistentSurvivalStats.bestKills);
  survivalState.bestReward = Math.max(survivalState.bestReward, persistentSurvivalStats.bestReward);
}

function resetSurvivalState({ preserveStats = true } = {}) {
  if (preserveStats) {
    syncPersistentStats(true);
  } else {
    syncPersistentStats(false);
  }
  survivalState.active = false;
  survivalState.stage = "inactive";
  survivalState.timer = 0;
  survivalState.wave = 0;
  survivalState.enemiesAlive = 0;
  survivalState.lastReward = 0;
  survivalState.kills = 0;
  survivalState.runReward = 0;
  survivalState.lastOutcome = null;
  survivalState.bestWave = persistentSurvivalStats.bestWave;
  survivalState.bestKills = persistentSurvivalStats.bestKills;
  survivalState.bestReward = persistentSurvivalStats.bestReward;
}

function beginSurvivalCountdown() {
  survivalState.active = true;
  survivalState.wave = 0;
  survivalState.lastReward = 0;
  survivalState.kills = 0;
  survivalState.runReward = 0;
  survivalState.lastOutcome = null;
  setSurvivalStage("countdown", SURVIVAL_SETTINGS.countdownDuration);
}

function setSurvivalActive(value) {
  survivalState.active = Boolean(value);
}

function setSurvivalStage(stage, timer = 0) {
  survivalState.stage = stage;
  survivalState.timer = Math.max(0, timer ?? 0);
}

function incrementSurvivalWave() {
  survivalState.wave += 1;
  const newBest = survivalState.wave > survivalState.bestWave;
  if (newBest) {
    survivalState.bestWave = survivalState.wave;
    persistentSurvivalStats.bestWave = Math.max(persistentSurvivalStats.bestWave, survivalState.bestWave);
  }
  return newBest;
}
function setSurvivalWave(value) {
  survivalState.wave = Math.max(0, Math.floor(value ?? 0));
  survivalState.bestWave = Math.max(survivalState.bestWave, survivalState.wave);
  persistentSurvivalStats.bestWave = Math.max(persistentSurvivalStats.bestWave, survivalState.bestWave);
}

function setSurvivalTimer(value) {
  survivalState.timer = Math.max(0, value ?? 0);
}

function setSurvivalEnemiesAlive(count) {
  survivalState.enemiesAlive = Math.max(0, Math.floor(count ?? 0));
}

function setSurvivalLastReward(amount) {
  const reward = Math.max(0, Math.round(amount ?? 0));
  survivalState.lastReward = reward;
  if (reward > 0) {
    survivalState.runReward += reward;
    survivalState.bestReward = Math.max(survivalState.bestReward, survivalState.runReward);
    persistentSurvivalStats.bestReward = Math.max(persistentSurvivalStats.bestReward, survivalState.bestReward);
  }
}

function addSurvivalImmediateReward(amount) {
  const reward = Math.max(0, Math.round(amount ?? 0));
  if (reward <= 0) {
    return;
  }
  survivalState.runReward += reward;
  survivalState.bestReward = Math.max(survivalState.bestReward, survivalState.runReward);
  persistentSurvivalStats.bestReward = Math.max(persistentSurvivalStats.bestReward, survivalState.bestReward);
}

function incrementSurvivalKills(amount = 1) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return;
  }
  survivalState.kills += amount;
  survivalState.bestKills = Math.max(survivalState.bestKills, survivalState.kills);
  persistentSurvivalStats.bestKills = Math.max(persistentSurvivalStats.bestKills, survivalState.bestKills);
}

function setSurvivalKills(value) {
  survivalState.kills = Math.max(0, Math.floor(value ?? 0));
  survivalState.bestKills = Math.max(survivalState.bestKills, survivalState.kills);
  persistentSurvivalStats.bestKills = Math.max(persistentSurvivalStats.bestKills, survivalState.bestKills);
}

function setSurvivalLastOutcome(outcome) {
  survivalState.lastOutcome = outcome ?? null;
}

function getSurvivalState() {
  return survivalState;
}

function isSurvivalActive() {
  return survivalState.active;
}

applyPersistentStats();

onEnvironmentChange(() => {
  resetSurvivalState({ preserveStats: false });
});

export {
  getSurvivalState,
  beginSurvivalCountdown,
  setSurvivalActive,
  setSurvivalStage,
  incrementSurvivalWave,
  setSurvivalWave,
  setSurvivalTimer,
  setSurvivalEnemiesAlive,
  setSurvivalLastReward,
  addSurvivalImmediateReward,
  incrementSurvivalKills,
  setSurvivalKills,
  setSurvivalLastOutcome,
  resetSurvivalState,
  isSurvivalActive
};




