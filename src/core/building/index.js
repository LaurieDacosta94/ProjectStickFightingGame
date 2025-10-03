import { BUILDING_DEFINITIONS } from "../../config/buildings.js";
import { spendMaterials, getMaterialCount, spawnSalvagePickup } from "../../state/resources.js";
import { getEnvironmentPlatforms, getEnvironmentWidth } from "../../state/environment.js";
import { stickman, squadmates, enemies } from "../../state/entities.js";
import { GROUND_Y, canvas } from "../../environment/canvas.js";
import {
  getStructures,
  addStructure,
  getBuildState,
  getBuildingDefinitions,
  getBlueprintByIndex,
  resetStructures
} from "../../state/buildings.js";
import { spawnProjectile } from "../combat/projectiles.js";
import { applyDamageToEnemy } from "../combat/damageHandlers.js";
import { spawnRingBurst } from "../effects/particles.js";
import { spawnDynamicLight } from "../effects/lighting.js";
import { input } from "../input/index.js";

const GRID_SIZE = 20;

function snapToGrid(value) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function getGroundYAt(x, halfWidth) {
  let bestY = GROUND_Y;
  const platforms = getEnvironmentPlatforms();
  for (const platform of platforms) {
    const left = platform.x - halfWidth;
    const right = platform.x + platform.width + halfWidth;
    if (x >= left && x <= right && platform.y < bestY) {
      bestY = platform.y;
    }
  }
  return bestY;
}

function clampBlueprintIndex(index) {
  const defs = getBuildingDefinitions();
  if (defs.length === 0) {
    return 0;
  }
  return ((index % defs.length) + defs.length) % defs.length;
}

function cycleBlueprint(direction) {
  const state = getBuildState();
  state.blueprintIndex = clampBlueprintIndex(state.blueprintIndex + direction);
}

function calculatePreview() {
  const state = getBuildState();
  const blueprint = getBlueprintByIndex(state.blueprintIndex);
  if (!blueprint) {
    state.lastPreview.valid = false;
    return state.lastPreview;
  }
  const halfWidth = (blueprint.width ?? 120) / 2;
  const rawX = snapToGrid(stickman.x + stickman.facing * Math.max(140, halfWidth + 30));
  const envWidth = getEnvironmentWidth();
  const clampedX = Math.max(halfWidth + 30, Math.min(envWidth - halfWidth - 30, rawX));
  const groundY = getGroundYAt(clampedX, halfWidth);
  const cost = blueprint.cost ?? 0;
  state.lastPreview = {
    x: clampedX,
    y: groundY,
    width: blueprint.width,
    height: blueprint.height,
    blueprintId: blueprint.id,
    cost,
    color: blueprint.color,
    accentColor: blueprint.accentColor,
    strokeColor: blueprint.strokeColor,
    ambient: blueprint.ambient ?? null,
    valid: getMaterialCount() >= cost
  };
  return state.lastPreview;
}

function createStructureFromBlueprint(blueprint, preview) {
  return {
    id: `${blueprint.id}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
    type: blueprint.id,
    x: preview.x,
    y: preview.y,
    width: blueprint.width,
    height: blueprint.height,
    health: blueprint.maxHealth,
    maxHealth: blueprint.maxHealth,
    color: blueprint.color,
    accentColor: blueprint.accentColor,
    strokeColor: blueprint.strokeColor,
    ambient: blueprint.ambient ?? null,
    blocking: blueprint.blocking ?? false,
    turret: blueprint.turret ?? null,
    shield: blueprint.shield ?? null,
    trap: blueprint.trap ?? null,
    fireCooldown: 0,
    trapCooldown: 0,
    flashTimer: 0
  };
}

function placeStructure() {
  const state = getBuildState();
  const preview = calculatePreview();
  if (!preview.valid) {
    return false;
  }
  const blueprint = getBlueprintByIndex(state.blueprintIndex);
  if (!blueprint) {
    return false;
  }
  if (!spendMaterials(blueprint.cost ?? 0)) {
    state.lastPreview.valid = false;
    return false;
  }
  const structure = createStructureFromBlueprint(blueprint, preview);
  addStructure(structure);
  spawnRingBurst({
    x: structure.x,
    y: structure.y - (structure.height ?? 80),
    startRadius: 20,
    endRadius: Math.max(90, structure.width ?? 120),
    color: blueprint.accentColor ?? "#8cffd4",
    ttl: 0.35
  });
  return true;
}

function toggleBuildMode(forceState) {
  const state = getBuildState();
  if (typeof forceState === "boolean") {
    state.active = forceState;
  } else {
    state.active = !state.active;
  }
  if (!state.active) {
    state.lastPreview.valid = false;
  } else {
    calculatePreview();
  }
}

function handleBuildInputs() {
  const state = getBuildState();
  if (input.buildToggleBuffered) {
    toggleBuildMode();
    input.buildToggleBuffered = false;
  }
  if (!state.active) {
    input.buildCycleBuffered = 0;
    input.buildConfirmBuffered = false;
    input.buildCancelBuffered = false;
    return;
  }
  if (input.buildCycleBuffered !== 0) {
    cycleBlueprint(input.buildCycleBuffered);
    input.buildCycleBuffered = 0;
    calculatePreview();
  }
  if (input.buildCancelBuffered) {
    toggleBuildMode(false);
    input.buildCancelBuffered = false;
  }
  if (input.buildConfirmBuffered || input.attackBuffered) {
    if (placeStructure()) {
      input.buildConfirmBuffered = false;
      input.attackBuffered = false;
      input.attackDown = false;
      calculatePreview();
    } else {
      input.buildConfirmBuffered = false;
      input.attackBuffered = false;
    }
  }
}

function damageStructure(structure, amount) {
  if (!structure || amount <= 0) {
    return;
  }
  structure.health = Math.max(0, structure.health - amount);
  structure.flashTimer = 0.25;
}

function destroyStructure(structures, index, structure) {
  spawnRingBurst({
    x: structure.x,
    y: structure.y - (structure.height ?? 80),
    startRadius: 30,
    endRadius: Math.max(120, (structure.width ?? 120) * 1.4),
    color: structure.accentColor ?? "#ffb347",
    ttl: 0.4
  });
  structures.splice(index, 1);
  const salvage = Math.max(5, Math.round((structure.maxHealth ?? 200) / 15));
  spawnSalvagePickup({
    x: structure.x,
    y: structure.y - (structure.height ?? 80),
    amount: salvage,
    vy: -150
  });
}

function updateTurret(structure, delta) {
  const turret = structure.turret;
  if (!turret) {
    return;
  }
  structure.fireCooldown = Math.max(0, (structure.fireCooldown ?? 0) - delta);
  if (structure.fireCooldown > 0) {
    return;
  }
  let bestEnemy = null;
  let bestDist = Number.POSITIVE_INFINITY;
  const muzzleY = structure.y - (structure.height ?? 100) + 24;
  for (const enemy of enemies) {
    if (enemy.health <= 0) {
      continue;
    }
    const dx = enemy.x - structure.x;
    const dy = (enemy.y + enemy.height * 0.5) - muzzleY;
    const distance = Math.hypot(dx, dy);
    if (distance > (turret.range ?? 420)) {
      continue;
    }
    if (distance < bestDist) {
      bestDist = distance;
      bestEnemy = enemy;
    }
  }
  if (!bestEnemy) {
    return;
  }
  const dx = bestEnemy.x - structure.x;
  const dy = (bestEnemy.y + bestEnemy.height * 0.5) - muzzleY;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const speed = turret.projectile?.speed ?? 520;
  const vx = (dx / distance) * speed;
  const vy = (dy / distance) * speed;
  spawnProjectile({
    x: structure.x,
    y: muzzleY,
    vx,
    vy,
    radius: turret.projectile?.radius ?? 6,
    lifetime: 1.4,
    damage: turret.projectile?.damage ?? 18,
    color: turret.projectile?.color ?? "#ffd57a",
    facing: Math.sign(dx) || 1,
    gravityFactor: 0.05
  });
  structure.fireCooldown = turret.cooldown ?? 1.2;
}

function applyShieldField(structure, delta) {
  const shield = structure.shield;
  if (!shield) {
    return;
  }
  const radius = shield.radius ?? 220;
  const emitY = structure.y - (structure.height ?? 100) * 0.6;
  const actors = [stickman, ...squadmates];
  for (const actor of actors) {
    if (!actor || actor.health <= 0) {
      continue;
    }
    const dx = actor.x - structure.x;
    const dy = (actor.y + actor.height) - emitY;
    if (Math.hypot(dx, dy) <= radius) {
      actor.structureShieldTimer = Math.max(actor.structureShieldTimer ?? 0, shield.buffDuration ?? 0.6);
      actor.structureShieldStrength = Math.max(actor.structureShieldStrength ?? 0, shield.damageReduction ?? 0.4);
    }
  }
}

function updateTrap(structure, delta) {
  const trap = structure.trap;
  if (!trap) {
    return;
  }
  structure.trapCooldown = Math.max(0, (structure.trapCooldown ?? 0) - delta);
  if (structure.trapCooldown > 0) {
    return;
  }
  const radius = trap.radius ?? 140;
  const originY = structure.y - (structure.height ?? 24) * 0.5;
  let triggered = false;
  for (const enemy of enemies) {
    if (enemy.health <= 0) {
      continue;
    }
    const dx = enemy.x - structure.x;
    const dy = (enemy.y + enemy.height * 0.5) - originY;
    if (Math.hypot(dx, dy) <= radius) {
      applyDamageToEnemy(enemy, {
        damage: trap.damage ?? 24,
        knockback: 160,
        launch: 0,
        facing: Math.sign(dx) || 1
      });
      enemy.stunTimer = Math.max(enemy.stunTimer ?? 0, trap.stun ?? 0.6);
      triggered = true;
    }
  }
  if (triggered) {
    structure.trapCooldown = trap.cooldown ?? 2.6;
    spawnDynamicLight({
      type: "point",
      x: structure.x,
      y: originY,
      radius: radius * 1.2,
      intensity: 1.4,
      color: trap.color ?? "#9af0ff",
      ttl: 0.25,
      flicker: 0.5,
      decay: 1.2
    });
    spawnRingBurst({
      x: structure.x,
      y: originY,
      startRadius: radius * 0.6,
      endRadius: radius * 1.3,
      color: trap.color ?? "#9af0ff",
      ttl: 0.3,
      lineWidth: 5
    });
  }
}

function updateStructureCollisions(structure, delta) {
  const halfWidth = (structure.width ?? 120) / 2;
  const topY = structure.y - (structure.height ?? 80);
  for (const enemy of enemies) {
    if (enemy.health <= 0) {
      continue;
    }
    const horizontalOverlap = Math.abs(enemy.x - structure.x) - (halfWidth + enemy.radius - 6);
    const verticalOverlap = (enemy.y + enemy.height) - topY;
    if (horizontalOverlap <= 0 && verticalOverlap > -40) {
      damageStructure(structure, (enemy.attackDamage ?? 12) * delta);
      enemy.vx *= 0.2;
      enemy.stateTimer = Math.max(enemy.stateTimer ?? 0, 0.2);
    }
  }
}

function updateStructures(delta) {
  const structures = getStructures();
  for (let i = structures.length - 1; i >= 0; i -= 1) {
    const structure = structures[i];
    structure.flashTimer = Math.max(0, (structure.flashTimer ?? 0) - delta);
    updateStructureCollisions(structure, delta);
    updateTurret(structure, delta);
    applyShieldField(structure, delta);
    updateTrap(structure, delta);
    if (structure.health <= 0) {
      destroyStructure(structures, i, structure);
    }
  }
}

function updateBuildingSystem(delta) {
  handleBuildInputs();
  updateStructures(delta);
  const state = getBuildState();
  if (state.active) {
    calculatePreview();
  }
}

function getBuildingHudStatus() {
  const state = getBuildState();
  const blueprint = getBlueprintByIndex(state.blueprintIndex);
  return {
    active: state.active,
    resources: getMaterialCount(),
    blueprintName: blueprint?.name ?? "None",
    cost: blueprint?.cost ?? 0,
    valid: state.lastPreview.valid
  };
}

resetStructures();

export {
  updateBuildingSystem,
  getStructures,
  getBuildState,
  calculatePreview,
  getBuildingHudStatus,
  toggleBuildMode,
  cycleBlueprint,
  placeStructure
};

