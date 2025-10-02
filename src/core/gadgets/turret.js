import { canvas, GROUND_Y, context } from "../../environment/canvas.js";
import { stickman, trainingDummy, enemies, getTotalHeight } from "../../state/entities.js";
import { spawnProjectile } from "../combat/projectiles.js";
import { clamp } from "../utils/math.js";

const turrets = [];

function createTurret(config, facing) {
  const height = config.height ?? 54;
  const spawnOffset = config.spawnOffset ?? { x: 64, y: 0 };
  const baseHeight = getTotalHeight(stickman.currentPose ?? null) || 0;
  const spawnX = clamp(stickman.x + facing * (spawnOffset.x ?? 64), 40, canvas.width - 40);
  const spawnYBase = stickman.y + baseHeight;
  const spawnY = Math.min(spawnYBase + (spawnOffset.y ?? 0), GROUND_Y);
  const y = Math.min(GROUND_Y - height, spawnY - height);

  return {
    id: `turret-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    x: spawnX,
    y,
    height,
    facing,
    range: config.range ?? 260,
    fireInterval: Math.max(0.1, config.fireInterval ?? 0.6),
    fireTimer: 0.1,
    duration: config.duration ?? 8,
    maxDuration: config.duration ?? 8,
    projectile: {
      speed: config.projectile?.speed ?? 520,
      radius: config.projectile?.radius ?? 5,
      damage: config.projectile?.damage ?? 10,
      knockback: config.projectile?.knockback ?? 70,
      lifetime: config.projectile?.lifetime ?? 1.1,
      color: config.projectile?.color ?? "#9ae9ff"
    },
    baseColor: config.baseColor ?? "#7a8bff",
    headColor: config.headColor ?? "#cfd8ff"
  };
}

function deployTurret(config) {
  const facing = stickman.facing || 1;
  const turret = createTurret(config, facing);
  const maxActive = Math.max(1, config.maxActive ?? 1);
  if (turrets.length >= maxActive) {
    turrets.shift();
  }
  turrets.push(turret);
}

function getTargets() {
  const targets = [];
  if (trainingDummy.health > 0) {
    targets.push({
      id: trainingDummy.id,
      x: trainingDummy.x,
      y: trainingDummy.y + trainingDummy.height * 0.5
    });
  }
  for (const enemy of enemies) {
    if (enemy.health > 0) {
      targets.push({
        id: enemy.id,
        x: enemy.x,
        y: enemy.y + enemy.height * 0.5,
        ref: enemy
      });
    }
  }
  return targets;
}

function acquireTarget(turret) {
  const targets = getTargets();
  let closest = null;
  let closestDistSq = Infinity;
  for (const target of targets) {
    const dx = target.x - turret.x;
    const dy = target.y - (turret.y + turret.height * 0.4);
    const distSq = dx * dx + dy * dy;
    if (distSq <= turret.range * turret.range && distSq < closestDistSq) {
      closest = target;
      closestDistSq = distSq;
    }
  }
  return closest;
}

function fireTurret(turret, target) {
  const originX = turret.x;
  const originY = turret.y + turret.height * 0.35;
  const dx = target.x - originX;
  const dy = target.y - originY;
  turret.facing = Math.sign(dx) || turret.facing;
  const distance = Math.hypot(dx, dy) || 1;
  const speed = turret.projectile.speed;
  const vx = (dx / distance) * speed;
  const vy = (dy / distance) * speed;
  spawnProjectile({
    x: originX,
    y: originY,
    vx,
    vy,
    radius: turret.projectile.radius,
    lifetime: turret.projectile.lifetime,
    color: turret.projectile.color,
    damage: turret.projectile.damage,
    knockback: turret.projectile.knockback,
    facing: Math.sign(vx) || 1,
    gravityFactor: 0
  });
  turret.fireTimer = turret.fireInterval;
}

function updateTurrets(delta) {
  for (const turret of turrets) {
    turret.duration -= delta;
    turret.fireTimer -= delta;
    const target = acquireTarget(turret);
    if (target && turret.fireTimer <= 0) {
      fireTurret(turret, target);
    }
  }
  for (let i = turrets.length - 1; i >= 0; i -= 1) {
    if (turrets[i].duration <= 0) {
      turrets.splice(i, 1);
    }
  }
}

function drawTurrets() {
  if (turrets.length === 0) {
    return;
  }
  context.save();
  for (const turret of turrets) {
    const baseWidth = 40;
    const baseHeight = turret.height * 0.4;
    const remainingRatio = clamp(turret.duration / (turret.maxDuration || 1), 0, 1);
    context.fillStyle = turret.baseColor;
    context.fillRect(turret.x - baseWidth * 0.5, turret.y + turret.height - baseHeight, baseWidth, baseHeight);

    const headHeight = turret.height * 0.6;
    context.fillStyle = turret.headColor;
    context.fillRect(turret.x - baseWidth * 0.3, turret.y, baseWidth * 0.6, headHeight);

    context.fillStyle = "#ffd66d";
    context.fillRect(turret.x - baseWidth * 0.3, turret.y - 6, baseWidth * 0.6 * remainingRatio, 4);
  }
  context.restore();
}

function clearTurrets() {
  turrets.length = 0;
}

function getTurretCount() {
  return turrets.length;
}

export { turrets, deployTurret, updateTurrets, drawTurrets, clearTurrets, getTurretCount };
