import { WEAPON_DEFINITIONS } from "../../config/weapons.js";
import { stickman, enemies, removeSandboxEnemies, restoreSandboxEnemies } from "../../state/entities.js";
import { getWeaponInventory, setWeaponInventory, resetWeaponInventory } from "../../state/weapons.js";
import { ensureAmmoEntry, setWeaponInfiniteAmmo, resetAllWeaponAmmo } from "../../state/ammo.js";
import { getMaterialCount, setMaterialCount } from "../../state/resources.js";
import { spawnEnemies } from "../world/enemySpawner.js";
import { input } from "../input/index.js";
import { resetSurvival } from "../survival/index.js";

const SANDBOX_CONTEXT = "sandboxSkirmish";

const SANDBOX_SETTINGS = {
  materialFloor: 12000,
  spawnDelay: 0.5,
  restDuration: 4,
  minEnemies: 3,
  enemyGrowth: 1,
  enemyVariance: 2,
  maxEnemies: 16,
  healthMultiplierPerWave: 0.14,
  damageMultiplierPerWave: 0.12,
  speedMultiplierPerWave: 0.08
};

const sandboxState = {
  active: false,
  arsenalGranted: false,
  inRest: true,
  restTimer: 0,
  wave: 0,
  kills: 0,
  bestWave: 0,
  bestKills: 0,
  lastWaveDuration: 0,
  runTime: 0,
  waveStartTime: null,
  enemiesAlive: 0,
  lastOutcome: null,
  previousInventory: null,
  previousEquippedId: null,
  previousMaterials: null
};

function clearSkirmishEnemies() {
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    if (enemies[i].spawnContext === SANDBOX_CONTEXT) {
      enemies.splice(i, 1);
    }
  }
}

function ensureMaterialFloor(force = false) {
  const floor = SANDBOX_SETTINGS.materialFloor ?? 0;
  if (floor <= 0) {
    return;
  }
  const current = getMaterialCount();
  if (force || current < floor) {
    setMaterialCount(Math.max(current, floor));
  }
}

function grantFullArsenal() {
  if (sandboxState.arsenalGranted) {
    return;
  }
  const allWeapons = Object.keys(WEAPON_DEFINITIONS);
  const preferredId = allWeapons.includes(stickman.equippedWeaponId)
    ? stickman.equippedWeaponId
    : (allWeapons.includes("strikerPistol") ? "strikerPistol" : allWeapons[0]);
  setWeaponInventory(allWeapons, { equipId: preferredId });
  for (const weaponId of allWeapons) {
    setWeaponInfiniteAmmo(weaponId);
  }
  sandboxState.arsenalGranted = true;
}

function restorePreviousLoadout() {
  const previousInventory = sandboxState.previousInventory;
  const previousEquippedId = sandboxState.previousEquippedId;
  if (previousInventory && previousInventory.length > 0) {
    setWeaponInventory(previousInventory, { equipId: previousEquippedId });
  } else {
    resetWeaponInventory();
  }
  resetAllWeaponAmmo();
  const currentInventory = getWeaponInventory();
  for (const weaponId of currentInventory) {
    ensureAmmoEntry(weaponId);
  }
  sandboxState.arsenalGranted = false;
}

function applySkirmishScaling(enemy, wave) {
  const base = enemy.baseStats ?? {};
  const baseHealth = base.maxHealth ?? enemy.maxHealth ?? 120;
  const baseDamage = base.attackDamage ?? enemy.attackDamage ?? 12;
  const baseSpeed = base.moveSpeed ?? enemy.moveSpeed ?? 160;
  const waveIndex = Math.max(0, wave - 1);

  const healthMultiplier = 1 + waveIndex * (SANDBOX_SETTINGS.healthMultiplierPerWave ?? 0);
  const damageMultiplier = 1 + waveIndex * (SANDBOX_SETTINGS.damageMultiplierPerWave ?? 0);
  const speedMultiplier = 1 + waveIndex * (SANDBOX_SETTINGS.speedMultiplierPerWave ?? 0);

  enemy.maxHealth = Math.round(baseHealth * healthMultiplier);
  enemy.health = enemy.maxHealth;
  enemy.attackDamage = Math.round(baseDamage * damageMultiplier);
  enemy.moveSpeed = baseSpeed * speedMultiplier;
}

function spawnNextSkirmishWave() {
  const allWeapons = Object.keys(WEAPON_DEFINITIONS);
  if (!sandboxState.arsenalGranted && allWeapons.length > 0) {
    grantFullArsenal();
  }

  const wave = sandboxState.wave + 1;
  const base = SANDBOX_SETTINGS.minEnemies ?? 3;
  const growth = SANDBOX_SETTINGS.enemyGrowth ?? 1;
  const maxEnemies = SANDBOX_SETTINGS.maxEnemies ?? 12;
  const variance = Math.max(0, SANDBOX_SETTINGS.enemyVariance ?? 0);
  const desired = Math.min(base + Math.floor((wave - 1) * growth), maxEnemies);
  const randomOffset = variance > 0 ? Math.floor((Math.random() * (variance * 2 + 1)) - variance) : 0;
  const count = Math.max(1, Math.min(maxEnemies, desired + randomOffset));

  const existingIds = new Set(
    enemies.filter((enemy) => enemy.spawnContext === SANDBOX_CONTEXT).map((enemy) => enemy.id)
  );

  spawnEnemies(count, { context: SANDBOX_CONTEXT, autoRespawn: false });

  for (const enemy of enemies) {
    if (enemy.spawnContext === SANDBOX_CONTEXT && !existingIds.has(enemy.id)) {
      applySkirmishScaling(enemy, wave);
    }
  }

  sandboxState.wave = wave;
  sandboxState.bestWave = Math.max(sandboxState.bestWave, sandboxState.wave);
  sandboxState.inRest = false;
  sandboxState.waveStartTime = sandboxState.runTime;
  sandboxState.lastOutcome = "wave";
}

function countSkirmishEnemies() {
  let alive = 0;
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    if (enemy.spawnContext !== SANDBOX_CONTEXT) {
      continue;
    }
    if (enemy.health <= 0 && enemy.autoRespawn === false) {
      enemies.splice(i, 1);
      continue;
    }
    if (enemy.health > 0) {
      alive += 1;
    }
  }
  return alive;
}

function activateSandboxSkirmish() {
  if (sandboxState.active) {
    return;
  }
  sandboxState.previousInventory = getWeaponInventory();
  sandboxState.previousEquippedId = stickman.equippedWeaponId;
  sandboxState.previousMaterials = getMaterialCount();
  sandboxState.active = true;
  sandboxState.inRest = true;
  sandboxState.restTimer = SANDBOX_SETTINGS.spawnDelay ?? 0.5;
  sandboxState.wave = 0;
  sandboxState.kills = 0;
  sandboxState.runTime = 0;
  sandboxState.waveStartTime = null;
  sandboxState.lastWaveDuration = 0;
  sandboxState.lastOutcome = "ready";
  sandboxState.enemiesAlive = 0;

  grantFullArsenal();
  ensureMaterialFloor(true);
  removeSandboxEnemies();
  clearSkirmishEnemies();
  resetSurvival();
}

function deactivateSandboxSkirmish(outcome = "inactive") {
  if (!sandboxState.active && !sandboxState.arsenalGranted) {
    sandboxState.lastOutcome = outcome;
    return;
  }
  sandboxState.bestWave = Math.max(sandboxState.bestWave, sandboxState.wave);
  sandboxState.bestKills = Math.max(sandboxState.bestKills, sandboxState.kills);
  sandboxState.active = false;
  sandboxState.inRest = true;
  sandboxState.restTimer = 0;
  sandboxState.waveStartTime = null;
  sandboxState.lastOutcome = outcome;

  clearSkirmishEnemies();
  restoreSandboxEnemies();
  restorePreviousLoadout();
  if (typeof sandboxState.previousMaterials === "number") {
    setMaterialCount(sandboxState.previousMaterials);
  }
  sandboxState.previousInventory = null;
  sandboxState.previousEquippedId = null;
  sandboxState.previousMaterials = null;
}

function updateSandboxSkirmish(delta) {
  if (input.sandboxToggleBuffered) {
    input.sandboxToggleBuffered = false;
    if (sandboxState.active) {
      deactivateSandboxSkirmish("aborted");
    } else {
      activateSandboxSkirmish();
    }
  }

  sandboxState.enemiesAlive = countSkirmishEnemies();

  if (!sandboxState.active) {
    return;
  }

  sandboxState.runTime += delta;
  ensureMaterialFloor();

  if (!sandboxState.inRest && sandboxState.enemiesAlive === 0) {
    if (sandboxState.waveStartTime != null) {
      sandboxState.lastWaveDuration = Math.max(0, sandboxState.runTime - sandboxState.waveStartTime);
    }
    sandboxState.waveStartTime = null;
    sandboxState.inRest = true;
    sandboxState.restTimer = SANDBOX_SETTINGS.restDuration ?? 4;
    sandboxState.lastOutcome = "rest";
  }

  if (sandboxState.inRest) {
    sandboxState.restTimer = Math.max(0, sandboxState.restTimer - delta);
    if (sandboxState.restTimer <= 0) {
      spawnNextSkirmishWave();
    }
  }
}

function recordSandboxKill(enemy) {
  if (!enemy || enemy.spawnContext !== SANDBOX_CONTEXT) {
    return;
  }
  if (!sandboxState.active) {
    return;
  }
  sandboxState.kills += 1;
  sandboxState.bestKills = Math.max(sandboxState.bestKills, sandboxState.kills);
}

function getSandboxHudStatus() {
  return {
    active: sandboxState.active,
    wave: sandboxState.wave,
    enemiesAlive: sandboxState.enemiesAlive,
    kills: sandboxState.kills,
    bestWave: sandboxState.bestWave,
    bestKills: sandboxState.bestKills,
    restTimer: sandboxState.inRest ? sandboxState.restTimer : 0,
    inRest: sandboxState.inRest,
    lastWaveDuration: sandboxState.lastWaveDuration,
    lastOutcome: sandboxState.lastOutcome,
    materialFloor: SANDBOX_SETTINGS.materialFloor
  };
}

export { updateSandboxSkirmish, getSandboxHudStatus, recordSandboxKill, deactivateSandboxSkirmish };


