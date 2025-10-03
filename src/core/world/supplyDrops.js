import { addMaterials, spawnSalvagePickup } from "../../state/resources.js";

import { canvas, GROUND_Y } from "../../environment/canvas.js";
import { stickman, getTotalHeight } from "../../state/entities.js";
import { WEAPON_DEFINITIONS } from "../../config/weapons.js";
import { SUPPLY_DROP_TYPES, SUPPLY_DROP_SETTINGS } from "../../config/supplyDrops.js";
import { ensureAmmoEntry, refillWeaponAmmo } from "../../state/ammo.js";
import { getWeaponInventory, addWeaponToInventory } from "../../state/weapons.js";
import { clamp } from "../utils/math.js";

const supplyDrops = [];
const manager = {
  nextDropTimer: SUPPLY_DROP_SETTINGS.initialDelay,
  nextDropTypeId: chooseWeightedType(),
  incomingMessage: null,
  incomingTimer: 0,
  incomingDuration: 3,
  rewardMessage: null,
  rewardTimer: 0,
  rewardDuration: SUPPLY_DROP_SETTINGS.collectedFanfare,
  dropSequence: 0
};

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function chooseWeightedType() {
  const entries = Object.values(SUPPLY_DROP_TYPES);
  if (entries.length === 0) {
    return null;
  }
  const totalWeight = entries.reduce((sum, entry) => sum + (entry.weight ?? 1), 0);
  let roll = Math.random() * totalWeight;
  for (const entry of entries) {
    const weight = entry.weight ?? 1;
    if (roll <= weight) {
      return entry.id;
    }
    roll -= weight;
  }
  return entries[entries.length - 1].id;
}

function scheduleNextDrop() {
  manager.nextDropTimer = randomBetween(SUPPLY_DROP_SETTINGS.intervalMin, SUPPLY_DROP_SETTINGS.intervalMax);
  manager.nextDropTypeId = chooseWeightedType();
}

function spawnSupplyDrop(typeId) {
  const definition = SUPPLY_DROP_TYPES[typeId] ?? SUPPLY_DROP_TYPES.ammo;
  const width = 52;
  const height = 42;
  const envWidth = getEnvironmentWidth();
  const clampedWidth = Math.max(width * 0.6, envWidth * 0.05);
  const dropRange = Math.max(0, envWidth - clampedWidth * 2);
  const x = clamp(envWidth * (0.2 + Math.random() * 0.6), clampedWidth, envWidth - clampedWidth);
  const spawnY = -SUPPLY_DROP_SETTINGS.spawnHeight;
  const drop = {
    id: `supply-${manager.dropSequence += 1}`,
    typeId: definition.id,
    label: definition.label,
    description: definition.description,
    crateColor: definition.crateColor ?? "#4d7cff",
    glowColor: definition.glowColor ?? "#9ab5ff",
    width,
    height,
    x,
    y: spawnY,
    vx: (Math.random() * 2 - 1) * SUPPLY_DROP_SETTINGS.driftSpeed,
    vy: 0,
    state: "descending",
    timer: 0,
    highlight: 0,
    despawnTimer: SUPPLY_DROP_SETTINGS.despawnDelay,
    parachutePhase: 0
  };
  supplyDrops.push(drop);
  manager.incomingMessage = `${definition.label} inbound!`;
  manager.incomingTimer = manager.incomingDuration;
}

function applyAmmoReward() {
  const inventory = getWeaponInventory();
  for (const weaponId of inventory) {
    const entry = ensureAmmoEntry(weaponId);
    if (!entry || entry.capacity === Number.POSITIVE_INFINITY) {
      continue;
    }
    refillWeaponAmmo(weaponId);
  }
  stickman.reloading = false;
}

function applyMedkitReward() {
  const healAmount = 70;
  stickman.health = Math.min(stickman.maxHealth, stickman.health + healAmount);
  stickman.invulnerability = Math.max(stickman.invulnerability, SUPPLY_DROP_SETTINGS.armorBoostValue ?? 0.4);
}

function applyHeavyWeaponReward() {
  const heavyType = SUPPLY_DROP_TYPES.heavy;
  const weaponId = heavyType?.weaponId ?? null;
  if (weaponId && WEAPON_DEFINITIONS[weaponId]) {
    addWeaponToInventory(weaponId, { autoEquip: true });
    ensureAmmoEntry(weaponId);
    refillWeaponAmmo(weaponId);
  }
}

function applySupplyDropReward(typeId) {
  switch (typeId) {
    case "medkit":
      applyMedkitReward();
      manager.rewardMessage = "Health restored";
      break;
    case "heavy":
      applyHeavyWeaponReward();
      manager.rewardMessage = "Heavy weapon acquired";
      break;
    case "ammo":
    default:
      applyAmmoReward();
      manager.rewardMessage = "Ammo resupply";
      break;
  }
  manager.rewardTimer = manager.rewardDuration;
  const rewardType = SUPPLY_DROP_TYPES[typeId];
  if (rewardType?.materialsReward) {
    const immediateGain = Math.max(0, Math.round(rewardType.materialsReward * 0.7));
    if (immediateGain > 0) {
      addMaterials(immediateGain);
      manager.rewardMessage = `${manager.rewardMessage} (+${immediateGain} materials)`;
    }
  }
}

function updateHighlight(drop, delta) {
  const playerX = stickman.x;
  const pose = stickman.currentPose ?? POSES.standing;
  const playerFeetY = stickman.y + getTotalHeight(pose);
  const crateCenterX = drop.x;
  const crateCenterY = drop.y + drop.height * 0.5;
  const dx = playerX - crateCenterX;
  const dy = playerFeetY - crateCenterY;
  const distance = Math.hypot(dx, dy);
  if (distance <= SUPPLY_DROP_SETTINGS.pickupRadius) {
    drop.highlight = clamp(drop.highlight + delta * 4, 0, 1);
    return true;
  }
  drop.highlight = clamp(drop.highlight - delta * 2, 0, 1);
  return false;
}

function pickupDrop(drop) {
  applySupplyDropReward(drop.typeId);
  drop.state = "collected";
  drop.despawnTimer = SUPPLY_DROP_SETTINGS.collectedFanfare;
  drop.highlight = 1;
  const rewardMaterials = SUPPLY_DROP_TYPES[drop.typeId]?.materialsReward ?? 0;
  if (rewardMaterials > 0) {
    const salvagePortion = Math.max(0, Math.round(rewardMaterials * 0.3));
    if (salvagePortion > 0) {
      const chunks = Math.max(1, Math.round(salvagePortion / 12));
      const amountPer = Math.max(1, Math.round(salvagePortion / chunks));
      for (let i = 0; i < chunks; i += 1) {
        const jitter = (Math.random() - 0.5) * 60;
        spawnSalvagePickup({
          x: drop.x + jitter,
          y: drop.y,
          amount: amountPer,
          vy: -160 - Math.random() * 60
        });
      }
    }
  }
}
function updateSupplyDrops(delta) {
  if (manager.nextDropTimer <= 0 && supplyDrops.length < SUPPLY_DROP_SETTINGS.maxActiveDrops) {
    spawnSupplyDrop(manager.nextDropTypeId);
    scheduleNextDrop();
  }

  if (manager.incomingTimer > 0) {
    manager.incomingTimer = Math.max(0, manager.incomingTimer - delta);
  }
  if (manager.rewardTimer > 0) {
    manager.rewardTimer = Math.max(0, manager.rewardTimer - delta);
  }

  for (let i = supplyDrops.length - 1; i >= 0; i -= 1) {
    const drop = supplyDrops[i];
    drop.timer += delta;
    if (drop.state === "descending") {
      drop.vy = Math.min(SUPPLY_DROP_SETTINGS.maxDescentSpeed, drop.vy + SUPPLY_DROP_SETTINGS.descentAcceleration * delta);
      drop.y += drop.vy * delta;
      const envWidth = getEnvironmentWidth();
      drop.x = clamp(drop.x + drop.vx * delta, drop.width * 0.5, envWidth - drop.width * 0.5);
      drop.parachutePhase += delta;
      if (drop.y >= GROUND_Y - drop.height) {
        drop.y = GROUND_Y - drop.height;
        drop.vy = 0;
        drop.state = "ready";
        drop.timer = 0;
      }
    } else if (drop.state === "ready") {
      const withinPickup = updateHighlight(drop, delta);
      if (withinPickup) {
        pickupDrop(drop);
      } else {
        drop.despawnTimer -= delta;
        if (drop.despawnTimer <= 0) {
          supplyDrops.splice(i, 1);
          continue;
        }
      }
    } else if (drop.state === "collected") {
      drop.highlight = clamp(drop.highlight - delta * 0.6, 0, 1);
      drop.despawnTimer -= delta;
      if (drop.despawnTimer <= 0) {
        supplyDrops.splice(i, 1);
        continue;
      }
    }
  }
}

function getSupplyDrops() {
  return supplyDrops;
}

function getSupplyDropStatus() {
  return {
    timeUntilNext: Math.max(0, manager.nextDropTimer),
    nextDropLabel: SUPPLY_DROP_TYPES[manager.nextDropTypeId]?.label ?? null,
    incomingMessage: manager.incomingTimer > 0 ? manager.incomingMessage : null,
    incomingAlpha: manager.incomingTimer > 0 ? manager.incomingTimer / manager.incomingDuration : 0,
    rewardMessage: manager.rewardTimer > 0 ? manager.rewardMessage : null,
    rewardAlpha: manager.rewardTimer > 0 ? manager.rewardTimer / manager.rewardDuration : 0,
    activeCount: supplyDrops.length
  };
}

export { updateSupplyDrops, getSupplyDrops, getSupplyDropStatus };

