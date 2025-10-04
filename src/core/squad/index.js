import { GROUND_Y } from "../../environment/canvas.js";
import { SPEED, GRAVITY, POSES } from "../../config/constants.js";
import { SQUAD_COMMANDS, SQUAD_SETTINGS } from "../../config/squad.js";
import { stickman, squadmates, enemies, getTotalHeight } from "../../state/entities.js";
import { resolvePlatformLanding } from "../world/arena.js";
import { spawnProjectile } from "../combat/projectiles.js";
import { getShoulderAnchor } from "../aim/index.js";

function getActiveCommand() {
  return SQUAD_COMMANDS[stickman.squadCommandIndex % SQUAD_COMMANDS.length] ?? SQUAD_COMMANDS[0];
}

function cycleSquadCommand() {
  if (stickman.squadCommandCooldown > 0) {
    return getActiveCommand();
  }
  stickman.squadCommandIndex = (stickman.squadCommandIndex + 1) % SQUAD_COMMANDS.length;
  const command = getActiveCommand();
  stickman.squadCommandId = command?.id ?? stickman.squadCommandId;
  stickman.squadCommandCooldown = SQUAD_SETTINGS.commandCooldown;
  return command;
}

function setSquadCommandById(commandId) {
  const index = SQUAD_COMMANDS.findIndex((command) => command.id === commandId);
  if (index >= 0) {
    stickman.squadCommandIndex = index;
    stickman.squadCommandId = commandId;
    stickman.squadCommandCooldown = SQUAD_SETTINGS.commandCooldown;
  }
}

function findNearestEnemy(x, y) {
  let best = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const enemy of enemies) {
    if (enemy.health <= 0) {
      continue;
    }
    const dx = enemy.x - x;
    const dy = (enemy.y + enemy.height * 0.5) - y;
    const dist = Math.hypot(dx, dy);
    if (dist < bestDist) {
      bestDist = dist;
      best = enemy;
    }
  }
  return best;
}

function updateMovement(entity, delta) {
  entity.vy += GRAVITY * delta;
  const previousY = entity.y;
  entity.x += entity.vx * delta;
  entity.y += entity.vy * delta;
  entity.onGround = false;
  const standingHeight = getTotalHeight(POSES.standing);
  const landed = resolvePlatformLanding(entity, previousY, standingHeight);
  if (!landed) {
    const feetY = entity.y + standingHeight;
    if (feetY >= GROUND_Y) {
      entity.y = GROUND_Y - standingHeight;
      entity.vy = 0;
      entity.onGround = true;
    }
  }
  entity.vx = Math.max(-SPEED, Math.min(SPEED, entity.vx));
}

function steerTowards(entity, targetX, delta, speedFactor = 1) {
  const desired = targetX - entity.x;
  const threshold = 12;
  entity.vx = 0;
  if (Math.abs(desired) > threshold) {
    const dir = Math.sign(desired);
    entity.vx = dir * SPEED * speedFactor;
    entity.facing = dir;
  }
}

function fireAtTarget(entity, target, delta) {
  entity.fireCooldown = Math.max(0, (entity.fireCooldown ?? 0) - delta);
  if (entity.fireCooldown > 0) {
    return;
  }
  entity.fireCooldown = SQUAD_SETTINGS.supportFireCooldown;

  const aim = entity.aim ?? null;
  const anchor = aim && Number.isFinite(aim.anchorX) && Number.isFinite(aim.anchorY)
    ? { x: aim.anchorX, y: aim.anchorY }
    : getShoulderAnchor(entity, POSES.standing);
  const targetX = target.x;
  const targetY = target.y + target.height * 0.35;
  const rawDirX = aim && Number.isFinite(aim.vectorX) ? aim.vectorX : targetX - anchor.x;
  const rawDirY = aim && Number.isFinite(aim.vectorY) ? aim.vectorY : targetY - anchor.y;
  const norm = Math.hypot(rawDirX, rawDirY) || 1;
  const dirX = rawDirX / norm;
  const dirY = rawDirY / norm;
  const perpX = -dirY;
  const perpY = dirX;

  const muzzleDistance = 32;
  const lateralOffset = 4 * (entity.roleIndex ?? 0) - 4;
  const muzzleX = anchor.x + dirX * muzzleDistance + perpX * lateralOffset;
  const muzzleY = anchor.y + dirY * muzzleDistance + perpY * lateralOffset;

  const speed = SQUAD_SETTINGS.projectileSpeed;
  const verticalLift = -18;
  const vx = dirX * speed;
  const vy = dirY * speed + verticalLift;
  const facing = vx >= 0 ? 1 : -1;

  spawnProjectile({
    x: muzzleX,
    y: muzzleY,
    vx,
    vy,
    radius: 5,
    lifetime: 0.8,
    color: facing > 0 ? "#8cffd4" : "#a0ffe1",
    damage: SQUAD_SETTINGS.projectileDamage,
    knockback: 110,
    facing
  });
  entity.flashTimer = 0.12;
}

function updateSquadmate(squadmate, delta) {
  const command = getActiveCommand();
  const standingHeight = getTotalHeight(POSES.standing);
  const feetY = squadmate.y + standingHeight;
  if (feetY >= GROUND_Y - 2 && Math.abs(squadmate.vy) < 1) {
    squadmate.onGround = true;
  }

  squadmate.targetEnemyId = null;

  switch (command?.id) {
    case "attack": {
      const target = findNearestEnemy(squadmate.x, squadmate.y);
      if (target && Math.abs(target.x - stickman.x) <= SQUAD_SETTINGS.commandRange) {
        steerTowards(squadmate, target.x - 24, delta, 0.95);
        fireAtTarget(squadmate, target, delta);
        squadmate.targetEnemyId = target.id;
      } else {
        steerTowards(squadmate, stickman.x - 60, delta, 0.8);
      }
      break;
    }
    case "defend": {
      const offset = (squadmate.roleIndex ?? 0) * 40 - 40;
      steerTowards(squadmate, stickman.x + offset, delta, 0.7);
      const target = findNearestEnemy(squadmate.x, squadmate.y);
      if (target && Math.abs(target.x - stickman.x) <= SQUAD_SETTINGS.defendRadius) {
        fireAtTarget(squadmate, target, delta);
        squadmate.targetEnemyId = target.id;
      }
      break;
    }
    case "flank": {
      const flankSide = (squadmate.roleIndex ?? 0) % 2 === 0 ? -1 : 1;
      const offset = flankSide * SQUAD_SETTINGS.flankOffset;
      steerTowards(squadmate, stickman.x + offset, delta, 0.9);
      const target = findNearestEnemy(squadmate.x, squadmate.y);
      if (target) {
        fireAtTarget(squadmate, target, delta);
        squadmate.targetEnemyId = target.id;
      }
      break;
    }
    case "hold":
    default: {
      const offset = (squadmate.roleIndex ?? 0) * 36 - 36;
      steerTowards(squadmate, stickman.x + offset, delta, 0.6);
      break;
    }
  }

  updateMovement(squadmate, delta);
  squadmate.flashTimer = Math.max(0, (squadmate.flashTimer ?? 0) - delta);
}

function updateSquadmates(delta) {
  stickman.squadCommandCooldown = Math.max(0, stickman.squadCommandCooldown - delta);
  let roleIndex = 0;
  for (const squadmate of squadmates) {
    squadmate.roleIndex = roleIndex;
    roleIndex += 1;
    updateSquadmate(squadmate, delta);
  }
}

function getSquadStatus() {
  return {
    command: getActiveCommand(),
    cooldown: stickman.squadCommandCooldown,
    members: squadmates
  };
}

export { updateSquadmates, cycleSquadCommand, setSquadCommandById, getSquadStatus };
