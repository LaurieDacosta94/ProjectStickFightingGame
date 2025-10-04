import { SURVIVAL_SETTINGS } from "../../config/survival.js";
import {
  getSurvivalState,
  beginSurvivalCountdown,
  setSurvivalActive,
  setSurvivalStage,
  incrementSurvivalWave,
  setSurvivalTimer,
  setSurvivalEnemiesAlive,
  setSurvivalLastReward,
  addSurvivalImmediateReward,
  setSurvivalLastOutcome,
  resetSurvivalState,
  isSurvivalActive
} from "../../state/survival.js";
import { spawnEnemies } from "../world/enemySpawner.js";
import { stickman, enemies, removeSandboxEnemies, restoreSandboxEnemies } from "../../state/entities.js";
import { addMaterials } from "../../state/resources.js";
import { input } from "../input/index.js";

const SURVIVAL_CONTEXT = "survival";

function healStickmanForSurvival() {
  const percent = Math.max(0, Math.min(1, SURVIVAL_SETTINGS.reviveHealthPercent ?? 1));
  const targetHealth = Math.round(stickman.maxHealth * (percent || 1));
  stickman.health = Math.max(stickman.health, targetHealth);
  if (stickman.health <= 0) {
    stickman.health = Math.max(1, targetHealth || stickman.maxHealth);
  }
  stickman.deadTimer = 0;
  stickman.invulnerability = Math.max(stickman.invulnerability, 0.6);
}

function clearSurvivalEnemies() {
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    if (enemies[i].spawnContext === SURVIVAL_CONTEXT) {
      enemies.splice(i, 1);
    }
  }
}

function startSurvival() {
  removeSandboxEnemies();
  clearSurvivalEnemies();
  healStickmanForSurvival();
  beginSurvivalCountdown();
  setSurvivalLastOutcome(null);
}

function endSurvivalRun(outcome, { stage = "inactive", timer = 0 } = {}) {
  setSurvivalActive(false);
  setSurvivalStage(stage, timer);
  setSurvivalLastOutcome(outcome);
  setSurvivalEnemiesAlive(0);
  clearSurvivalEnemies();
  restoreSandboxEnemies();
}

function applySurvivalScaling(enemy, wave) {
  const baseStats = enemy.baseStats ?? {};
  const baseHealth = baseStats.maxHealth ?? enemy.maxHealth ?? 120;
  const baseDamage = baseStats.attackDamage ?? enemy.attackDamage ?? 12;
  const baseMove = baseStats.moveSpeed ?? enemy.moveSpeed ?? 160;

  const waveIndex = Math.max(0, wave - 1);
  const healthMultiplier = 1 + waveIndex * (SURVIVAL_SETTINGS.healthMultiplierPerWave ?? 0);
  const damageMultiplier = 1 + waveIndex * (SURVIVAL_SETTINGS.damageMultiplierPerWave ?? 0);
  const speedMultiplier = 1 + waveIndex * (SURVIVAL_SETTINGS.speedMultiplierPerWave ?? 0);

  enemy.maxHealth = Math.round(baseHealth * healthMultiplier);
  enemy.health = enemy.maxHealth;
  enemy.attackDamage = Math.round(baseDamage * damageMultiplier);
  enemy.moveSpeed = baseMove * speedMultiplier;
  enemy.attackKnockback = Math.round(enemy.attackKnockback * (1 + waveIndex * 0.05));
  enemy.survivalWave = wave;
}

function spawnSurvivalEnemies(requested, wave) {
  if (requested <= 0) {
    return;
  }
  const previousIds = new Set(
    enemies.filter((enemy) => enemy.spawnContext === SURVIVAL_CONTEXT).map((enemy) => enemy.id)
  );
  spawnEnemies(requested, { context: SURVIVAL_CONTEXT, autoRespawn: false });
  for (const enemy of enemies) {
    if (enemy.spawnContext !== SURVIVAL_CONTEXT || previousIds.has(enemy.id)) {
      continue;
    }
    applySurvivalScaling(enemy, wave);
  }
}

function grantWaveRewards(wave, reward) {
  if (reward > 0) {
    addMaterials(reward);
    setSurvivalLastReward(reward);
  } else {
    setSurvivalLastReward(0);
  }
  const bestWaveBonus = SURVIVAL_SETTINGS.bestWaveBonus ?? 0;
  if (bestWaveBonus > 0) {
    const state = getSurvivalState();
    if (state.bestWave === wave) {
      addMaterials(bestWaveBonus);
      addSurvivalImmediateReward(bestWaveBonus);
    }
  }
}

function handleSurvivalDefeat() {
  const hold = Math.max(0, SURVIVAL_SETTINGS.defeatCooldown ?? 0);
  endSurvivalRun("defeat", { stage: "defeat", timer: hold });
}

function updateSurvival(delta) {
  const state = getSurvivalState();

  if (input.survivalToggleBuffered) {
    input.survivalToggleBuffered = false;
    if (state.active) {
      endSurvivalRun("aborted");
    } else {
      startSurvival();
    }
  }

  if (!state.active && state.stage === "defeat") {
    setSurvivalTimer(Math.max(0, state.timer - delta));
    if (state.timer <= 0) {
      setSurvivalStage("inactive", 0);
    }
    return;
  }

  if (!state.active) {
    return;
  }

  setSurvivalTimer(Math.max(0, state.timer - delta));

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    if (enemy.spawnContext === SURVIVAL_CONTEXT && enemy.health <= 0 && enemy.autoRespawn === false) {
      enemies.splice(i, 1);
    }
  }

  const alive = enemies.reduce(
    (count, enemy) => count + (enemy.spawnContext === SURVIVAL_CONTEXT && enemy.health > 0 ? 1 : 0),
    0
  );
  setSurvivalEnemiesAlive(alive);

  if (stickman.health <= 0) {
    handleSurvivalDefeat();
    return;
  }

  switch (state.stage) {
    case "countdown": {
      if (state.timer <= 0) {
        incrementSurvivalWave();
        const desired = SURVIVAL_SETTINGS.baseEnemies + (state.wave - 1) * (SURVIVAL_SETTINGS.enemiesPerWave ?? 0);
        const cap = SURVIVAL_SETTINGS.enemyCap ?? desired;
        const toSpawn = Math.max(0, Math.min(desired, cap));
        spawnSurvivalEnemies(toSpawn, state.wave);
        setSurvivalStage("wave", 0);
      }
      break;
    }
    case "wave": {
      if (alive === 0) {
        const reward = SURVIVAL_SETTINGS.waveReward + (state.wave - 1) * (SURVIVAL_SETTINGS.rewardIncrement ?? 0);
        grantWaveRewards(state.wave, reward);
        setSurvivalStage("rest", SURVIVAL_SETTINGS.restDuration ?? 8);
      } else {
        const desired = SURVIVAL_SETTINGS.baseEnemies + (state.wave - 1) * (SURVIVAL_SETTINGS.enemiesPerWave ?? 0);
        const cap = SURVIVAL_SETTINGS.enemyCap ?? desired;
        const missing = Math.max(0, Math.min(desired, cap) - alive);
        if (missing > 0) {
          spawnSurvivalEnemies(missing, state.wave);
        }
      }
      break;
    }
    case "rest": {
      if (state.timer <= 0) {
        setSurvivalStage("countdown", SURVIVAL_SETTINGS.countdownDuration ?? 4);
      }
      break;
    }
    default:
      break;
  }
}

function getSurvivalHudStatus() {
  const state = getSurvivalState();
  return {
    active: state.active,
    stage: state.stage,
    timer: state.timer,
    wave: state.wave,
    enemiesAlive: state.enemiesAlive,
    lastReward: state.lastReward,
    kills: state.kills,
    runReward: state.runReward,
    bestWave: state.bestWave,
    bestKills: state.bestKills,
    bestReward: state.bestReward,
    lastOutcome: state.lastOutcome
  };
}

function resetSurvival() {
  endSurvivalRun("reset");
  resetSurvivalState({ preserveStats: true });
}

export { updateSurvival, getSurvivalHudStatus, isSurvivalActive, resetSurvival };
