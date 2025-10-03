import { SURVIVAL_SETTINGS } from "../config/survival.js";
import { onEnvironmentChange } from "./environment.js";

const survivalState = {
  active: false,
  stage: "idle",
  timer: 0,
  wave: 0,
  enemiesAlive: 0,
  lastReward: 0
};

function resetSurvivalState() {
  survivalState.active = false;
  survivalState.stage = "idle";
  survivalState.timer = 0;
  survivalState.wave = 0;
  survivalState.enemiesAlive = 0;
  survivalState.lastReward = 0;
}

function beginSurvivalCountdown() {
  survivalState.active = true;
  survivalState.wave = 0;
  survivalState.lastReward = 0;
  setSurvivalStage("countdown", SURVIVAL_SETTINGS.countdownDuration);
}

function setSurvivalStage(stage, timer = 0) {
  survivalState.stage = stage;
  survivalState.timer = Math.max(0, timer ?? 0);
}

function incrementSurvivalWave() {
  survivalState.wave += 1;
}

function setSurvivalTimer(value) {
  survivalState.timer = Math.max(0, value ?? 0);
}

function setSurvivalEnemiesAlive(count) {
  survivalState.enemiesAlive = Math.max(0, Math.floor(count ?? 0));
}

function setSurvivalLastReward(amount) {
  survivalState.lastReward = Math.max(0, Math.round(amount ?? 0));
}

function getSurvivalState() {
  return survivalState;
}

function isSurvivalActive() {
  return survivalState.active;
}

onEnvironmentChange(() => {
  resetSurvivalState();
});

export {
  getSurvivalState,
  beginSurvivalCountdown,
  setSurvivalStage,
  incrementSurvivalWave,
  setSurvivalTimer,
  setSurvivalEnemiesAlive,
  setSurvivalLastReward,
  resetSurvivalState,
  isSurvivalActive
};
