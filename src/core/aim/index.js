import { POSES } from "../../config/constants.js";
import { stickman, squadmates, enemies } from "../../state/entities.js";
import { vehicles, VEHICLE_DEFINITIONS } from "../../state/vehicles.js";
import { pointer, refreshPointerWorld, input } from "../input/index.js";
import { getCamera } from "../../state/camera.js";

const POINTER_INACTIVE_TIMEOUT = Number.POSITIVE_INFINITY;
const POINTER_DEADZONE = 4;

function normalizeAngle(angle) {
  let result = angle;
  while (result <= -Math.PI) {
    result += Math.PI * 2;
  }
  while (result > Math.PI) {
    result -= Math.PI * 2;
  }
  return result;
}

function shortestAngleDiff(current, target) {
  return normalizeAngle(target - current);
}

function dampAngle(current, target, smoothing, delta) {
  const diff = shortestAngleDiff(current, target);
  if (!Number.isFinite(diff)) {
    return target;
  }
  const rate = Math.max(0, smoothing ?? 0.18);
  const factor = 1 - Math.exp(-rate * Math.max(delta, 0));
  return normalizeAngle(current + diff * factor);
}

function ensureAimRecord(record, fallbackSmoothing = 0.18) {
  if (!record) {
    return {
      angle: 0,
      targetAngle: 0,
      vectorX: 1,
      vectorY: 0,
      magnitude: 0,
      anchorX: 0,
      anchorY: 0,
      targetX: 0,
      targetY: 0,
      smoothing: fallbackSmoothing,
      active: false,
      lastUpdated: 0
    };
  }
  if (typeof record.smoothing !== "number") {
    record.smoothing = fallbackSmoothing;
  }
  return record;
}

function updateAimRecord(record, { targetAngle, targetX, targetY, anchorX, anchorY, smoothing, active }, delta) {
  const aim = ensureAimRecord(record, smoothing);
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  const nextAngle = dampAngle(aim.angle ?? targetAngle, targetAngle, smoothing ?? aim.smoothing, delta);
  const vectorX = Math.cos(nextAngle);
  const vectorY = Math.sin(nextAngle);
  aim.targetAngle = targetAngle;
  aim.angle = nextAngle;
  aim.vectorX = Number.isFinite(vectorX) ? vectorX : 1;
  aim.vectorY = Number.isFinite(vectorY) ? vectorY : 0;
  aim.anchorX = anchorX;
  aim.anchorY = anchorY;
  aim.targetX = targetX;
  aim.targetY = targetY;
  aim.magnitude = Math.hypot(targetX - anchorX, targetY - anchorY);
  aim.active = Boolean(active);
  aim.lastUpdated = now;
  return aim;
}

function getPointerWorld() {
  const camera = getCamera();
  const offsetX = camera?.offsetX ?? 0;
  const offsetY = camera?.y ?? 0;
  return {
    x: pointer.screenX + offsetX,
    y: pointer.screenY + offsetY
  };
}

function pointerIsActive(now) {
  if (!pointer.active) {
    return false;
  }
  if (!Number.isFinite(POINTER_INACTIVE_TIMEOUT)) {
    return true;
  }
  const last = pointer.lastUpdate ?? 0;
  return now - last <= POINTER_INACTIVE_TIMEOUT;
}

function getFallbackAngle() {
  if (input.left && !input.right) {
    return Math.PI;
  }
  if (input.right && !input.left) {
    return 0;
  }
  if (input.down && !stickman.onGround) {
    return Math.PI * 0.5;
  }
  if (stickman.vx && Math.abs(stickman.vx) > 6) {
    return stickman.vx > 0 ? 0 : Math.PI;
  }
  return stickman.facing >= 0 ? 0 : Math.PI;
}

function getShoulderAnchor(entity, pose) {
  const resolvedPose = pose ?? POSES.standing;
  const headRadius = resolvedPose.headRadius ?? 16;
  const shoulderYOffset = resolvedPose.armLength ? resolvedPose.armLength * 0.2 : 6;
  const neckY = entity.y + headRadius * 2;
  const shoulderY = neckY + shoulderYOffset;
  return {
    x: entity.x,
    y: shoulderY
  };
}

function updatePlayerAim(delta) {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  const pose = stickman.rolling ? POSES.rolling : (stickman.crouching ? POSES.crouching : POSES.standing);
  const anchor = getShoulderAnchor(stickman, pose);
  const pointerWorld = getPointerWorld();
  const pointerVectorX = pointerWorld.x - anchor.x;
  const pointerVectorY = pointerWorld.y - anchor.y;
  const pointerDistance = Math.hypot(pointerVectorX, pointerVectorY);
  const pointerHasSignal = (pointer.lastUpdate ?? 0) > 0;
  const pointerWithinReach = pointerDistance >= POINTER_DEADZONE;
  const pointerIsLive = pointerIsActive(now);
  const pointerEffective = pointerWithinReach && (pointerIsLive || pointerHasSignal);

  let targetX;
  let targetY;
  let targetAngle;

  if (pointerEffective) {
    targetX = pointerWorld.x;
    targetY = pointerWorld.y;
    targetAngle = Math.atan2(pointerVectorY, pointerVectorX);
  } else if (stickman.aim) {
    const previousAngle = stickman.aim.targetAngle ?? stickman.aim.angle ?? getFallbackAngle();
    const reach = 320;
    targetAngle = previousAngle;
    targetX = anchor.x + Math.cos(previousAngle) * reach;
    targetY = anchor.y + Math.sin(previousAngle) * reach;
  } else {
    const fallbackAngle = getFallbackAngle();
    targetAngle = fallbackAngle;
    const reach = 320;
    targetX = anchor.x + Math.cos(fallbackAngle) * reach;
    targetY = anchor.y + Math.sin(fallbackAngle) * reach;
  }

  const aim = updateAimRecord(stickman.aim, {
    targetAngle: normalizeAngle(targetAngle),
    targetX,
    targetY,
    anchorX: anchor.x,
    anchorY: anchor.y,
    smoothing: stickman.aim?.smoothing ?? 22,
    magnitude: pointerDistance,
    active: pointerEffective
  }, delta);
  stickman.aim = aim;

  if (pointerEffective && aim) {
    stickman.facing = aim.vectorX >= 0 ? 1 : -1;
  }
}

function findEnemyById(id) {
  if (!id) {
    return null;
  }
  return enemies.find((enemy) => enemy.id === id) ?? null;
}

function updateSquadAims(delta) {
  for (const ally of squadmates) {
    const pose = POSES.standing;
    const anchor = getShoulderAnchor(ally, pose);
    const enemy = findEnemyById(ally.targetEnemyId);
    const targetX = enemy ? enemy.x : stickman.aim?.targetX ?? (ally.x + ally.facing * 120);
    const targetY = enemy ? enemy.y + enemy.height * 0.35 : stickman.aim?.targetY ?? ally.y;
    const angle = Math.atan2(targetY - anchor.y, targetX - anchor.x);
    ally.aim = updateAimRecord(ally.aim, {
      targetAngle: normalizeAngle(angle),
      targetX,
      targetY,
      anchorX: anchor.x,
      anchorY: anchor.y,
      smoothing: ally.aim?.smoothing ?? 18,
      active: Boolean(enemy)
    }, delta);
    if (ally.aim) {
      ally.facing = ally.aim.vectorX >= 0 ? 1 : -1;
    }
  }
}

function updateEnemyAims(delta) {
  const targetAnchor = getShoulderAnchor(stickman, stickman.rolling ? POSES.rolling : (stickman.crouching ? POSES.crouching : POSES.standing));
  for (const enemy of enemies) {
    if (enemy.health <= 0) {
      continue;
    }
    const anchor = {
      x: enemy.x,
      y: enemy.y + (enemy.height ?? 100) * 0.35
    };
    const targetX = targetAnchor.x;
    const targetY = targetAnchor.y;
    const angle = Math.atan2(targetY - anchor.y, targetX - anchor.x);
    enemy.aim = updateAimRecord(enemy.aim, {
      targetAngle: normalizeAngle(angle),
      targetX,
      targetY,
      anchorX: anchor.x,
      anchorY: anchor.y,
      smoothing: enemy.aim?.smoothing ?? 12,
      active: true
    }, delta);
    if (enemy.aim) {
      enemy.facing = enemy.aim.vectorX >= 0 ? 1 : -1;
    }
  }
}

function updateVehicleMountAims(delta) {
  for (const vehicle of vehicles) {
    const definition = VEHICLE_DEFINITIONS[vehicle.type];
    if (!definition) {
      continue;
    }
    const mountDefs = definition.mountedWeapons ?? [];
    if (!Array.isArray(vehicle.mounts)) {
      vehicle.mounts = [];
    }
    for (let index = 0; index < mountDefs.length; index += 1) {
      const mountDef = mountDefs[index];
      if (!mountDef) {
        continue;
      }
      const mountState = vehicle.mounts[index] ?? (vehicle.mounts[index] = {});
      const mountOffset = mountDef.offset ?? { x: 0, y: 0 };
      const followFacing = mountDef.followVehicleFacing !== false;
      const facingMultiplier = followFacing ? (vehicle.facing ?? 1) : 1;
      const anchorX = vehicle.x + (mountOffset.x ?? 0) * facingMultiplier;
      const anchorY = vehicle.y + (mountOffset.y ?? 0);
      let targetX;
      let targetY;
      let active = false;
      if (vehicle.driverId === "player-stickman" && stickman.aim) {
        targetX = stickman.aim.targetX;
        targetY = stickman.aim.targetY;
        active = stickman.aim.active;
      } else {
        const baseFacing = (mountDef.facing ?? 1) * (followFacing ? (vehicle.facing ?? 1) : 1);
        const fallbackAngle = baseFacing >= 0 ? 0 : Math.PI;
        const reach = mountDef.range ?? 220;
        targetX = anchorX + Math.cos(fallbackAngle) * reach;
        targetY = anchorY + Math.sin(fallbackAngle) * reach;
      }
      const angle = Math.atan2(targetY - anchorY, targetX - anchorX);
      mountState.aim = updateAimRecord(mountState.aim, {
        targetAngle: normalizeAngle(angle),
        targetX,
        targetY,
        anchorX,
        anchorY,
        smoothing: mountState.aim?.smoothing ?? 14,
        active
      }, delta);
    }
  }
}

function updateAimSystem(delta) {
  refreshPointerWorld();
  updatePlayerAim(delta);
  updateSquadAims(delta);
  updateEnemyAims(delta);
  updateVehicleMountAims(delta);
}

function getStickmanShoulderAnchor() {
  const pose = stickman.rolling ? POSES.rolling : (stickman.crouching ? POSES.crouching : POSES.standing);
  return getShoulderAnchor(stickman, pose);
}

export { updateAimSystem, getPointerWorld, getStickmanShoulderAnchor, getShoulderAnchor };