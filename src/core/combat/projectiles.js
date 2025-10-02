import { context, GROUND_Y } from "../../environment/canvas.js";
import { GRAVITY } from "../../config/constants.js";
import { trainingDummy, enemies } from "../../state/entities.js";
import { applyDamageToDummy, applyDamageToEnemy } from "./damageHandlers.js";
import { handleProjectileCollision } from "../world/destructibles.js";

const projectiles = [];

function spawnProjectile({
  x,
  y,
  vx,
  vy,
  radius = 6,
  lifetime = 1.4,
  color = "#ffcf7a",
  damage = 0,
  knockback = 0,
  facing = 1,
  gravityFactor = 0.2
}) {
  projectiles.push({
    x,
    y,
    vx,
    vy,
    radius,
    life: lifetime,
    maxLife: lifetime,
    color,
    damage,
    knockback,
    facing,
    gravityFactor,
    hitTargets: new Set()
  });
}

function circleOverlap(ax, ay, ar, bx, by, br) {
  const dx = ax - bx;
  const dy = ay - by;
  const radii = ar + br;
  return dx * dx + dy * dy <= radii * radii;
}

function updateProjectiles(delta) {
  for (const projectile of projectiles) {
    projectile.life -= delta;
    projectile.vy += GRAVITY * delta * projectile.gravityFactor;
    projectile.x += projectile.vx * delta;
    projectile.y += projectile.vy * delta;

    if (projectile.y + projectile.radius >= GROUND_Y) {
      projectile.life = 0;
      continue;
    }

    if (trainingDummy.health > 0 && !projectile.hitTargets.has(trainingDummy.id)) {
      if (circleOverlap(projectile.x, projectile.y, projectile.radius, trainingDummy.x, trainingDummy.y + trainingDummy.height * 0.55, trainingDummy.radius)) {
        projectile.hitTargets.add(trainingDummy.id);
        applyDamageToDummy({
          damage: projectile.damage,
          knockback: projectile.knockback,
          facing: projectile.facing
        });
        projectile.life = 0;
        continue;
      }
    }

    for (const enemy of enemies) {
      if (enemy.health <= 0 || projectile.hitTargets.has(enemy.id)) {
        continue;
      }
      if (circleOverlap(projectile.x, projectile.y, projectile.radius, enemy.x, enemy.y + enemy.height * 0.5, enemy.radius)) {
        projectile.hitTargets.add(enemy.id);
        applyDamageToEnemy(enemy, {
          damage: projectile.damage,
          knockback: projectile.knockback,
          launch: 0,
          facing: projectile.facing
        });
        projectile.life = 0;
        break;
      }
    }
    if (projectile.life > 0) {
      if (handleProjectileCollision(projectile)) {
        projectile.life = 0;
        continue;
      }
    }
  }

  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    if (projectiles[i].life <= 0) {
      projectiles.splice(i, 1);
    }
  }
}

function drawProjectiles() {
  if (projectiles.length === 0) {
    return;
  }
  context.save();
  context.lineWidth = 2;
  for (const projectile of projectiles) {
    const alpha = Math.max(0, projectile.life / projectile.maxLife);
    context.fillStyle = `rgba(255, 200, 120, ${alpha})`;
    context.beginPath();
    context.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function clearProjectiles() {
  projectiles.length = 0;
}

export { spawnProjectile, updateProjectiles, drawProjectiles, clearProjectiles };

