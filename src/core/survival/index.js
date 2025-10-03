import { SURVIVAL_SETTINGS } from "../../config/survival.js";
import { getSurvivalState, beginSurvivalCountdown, setSurvivalStage, incrementSurvivalWave, setSurvivalTimer, setSurvivalEnemiesAlive, setSurvivalLastReward, resetSurvivalState, isSurvivalActive } from "../../state/survival.js";
import { spawnEnemies } from "../world/enemySpawner.js";
import { enemies, removeSandboxEnemies, restoreSandboxEnemies } from "../../state/entities.js";
import { addMaterials } from "../../state/resources.js";
import { input } from "../input/index.js";

function startSurvival() {
  removeSandboxEnemies();
  beginSurvivalCountdown();
}

function getSurvivalHudStatus() {
  const state = getSurvivalState();
  return {
    active: state.active,
    stage: state.stage,
    timer: state.timer,
    wave: state.wave,
    enemiesAlive: state.enemiesAlive,
    lastReward: state.lastReward
  };
}

function updateSurvival(delta) {
  const state = getSurvivalState();

  if (input.survivalToggleBuffered) {
    input.survivalToggleBuffered = false;
    if (!state.active) {
      startSurvival();
    }
  }

  if (!state.active) {
    return;
  }

  setSurvivalTimer(Math.max(0, state.timer - delta));

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    if (enemy.spawnContext === "survival" && enemy.health <= 0 && enemy.autoRespawn === false) {
      enemies.splice(i, 1);
    }
  }

  const alive = enemies.reduce(
    (count, enemy) => count + (enemy.spawnContext === "survival" && enemy.health > 0 ? 1 : 0),
    0
  );
  setSurvivalEnemiesAlive(alive);

  switch (state.stage) {
    case "countdown": {
      if (state.timer <= 0) {
        incrementSurvivalWave();
        const spawnCount = SURVIVAL_SETTINGS.baseEnemies + (state.wave - 1) * SURVIVAL_SETTINGS.enemiesPerWave;
        spawnEnemies(spawnCount, { context: "survival" });
        setSurvivalStage("wave", 0);
      }
      break;
    }
    case "wave": {
      if (alive === 0) {
        const reward = SURVIVAL_SETTINGS.waveReward + (state.wave - 1) * SURVIVAL_SETTINGS.rewardIncrement;
        if (reward > 0) {
          addMaterials(reward);
          setSurvivalLastReward(reward);
        } else {
          setSurvivalLastReward(0);
        }
        setSurvivalStage("rest", SURVIVAL_SETTINGS.restDuration);
      }
      break;
    }
    case "rest": {
      if (state.timer <= 0) {
        setSurvivalStage("countdown", SURVIVAL_SETTINGS.countdownDuration);
      }
      break;
    }
    default:
      break;
  }
}

function resetSurvival() {
  resetSurvivalState();
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    if (enemies[i].spawnContext === "survival") {
      enemies.splice(i, 1);
    }
  }
  restoreSandboxEnemies();
}

export { updateSurvival, getSurvivalHudStatus, isSurvivalActive, resetSurvival };

