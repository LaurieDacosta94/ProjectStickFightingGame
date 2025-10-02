import { stickman, trainingDummy, enemies, getTotalHeight } from "../../state/entities.js";
import { applyDamageToDummy, applyDamageToEnemy, applyDamageToPlayer } from "./damageHandlers.js";
import { clamp } from "../utils/math.js";

function computeExplosionFalloff(distance, radius, minRatio = 0.25) {
  const clampedRadius = Math.max(1, radius);
  const falloff = clamp(1 - distance / clampedRadius, 0, 1);
  return clamp(minRatio + falloff * (1 - minRatio), 0, 1);
}

function applyExplosionImpulse({
  x,
  y,
  radius,
  maxDamage = 0,
  maxKnockback = 0,
  minDamageRatio = 0.25,
  selfDamageScale = 1,
  selfKnockbackScale = 1,
  includeTrainingDummy = true,
  includeEnemies = true,
  includePlayer = true
}) {
  const summary = {
    dummyHit: false,
    enemiesHit: 0,
    playerHit: false
  };

  const damageCap = Math.max(0, maxDamage);
  const knockbackCap = Math.max(0, maxKnockback ?? damageCap * 1.2);
  const radiusSafe = Math.max(1, radius);
  const minRatio = clamp(minDamageRatio, 0, 1);

  if (includeTrainingDummy && trainingDummy.health > 0) {
    const dummyX = trainingDummy.x;
    const dummyY = trainingDummy.y + trainingDummy.height * 0.55;
    const distance = Math.hypot(dummyX - x, dummyY - y);
    if (distance <= radiusSafe) {
      const ratio = computeExplosionFalloff(distance, radiusSafe, minRatio);
      const damage = damageCap * ratio;
      const knockback = knockbackCap * ratio;
      const facing = dummyX >= x ? 1 : -1;
      applyDamageToDummy({
        damage,
        knockback,
        launch: knockback * 0.18,
        facing
      });
      summary.dummyHit = true;
    }
  }

  if (includeEnemies) {
    for (const enemy of enemies) {
      if (enemy.health <= 0) {
        continue;
      }
      const enemyX = enemy.x;
      const enemyY = enemy.y + enemy.height * 0.5;
      const distance = Math.hypot(enemyX - x, enemyY - y);
      if (distance > radiusSafe) {
        continue;
      }
      const ratio = computeExplosionFalloff(distance, radiusSafe, minRatio);
      const damage = damageCap * ratio;
      const knockback = knockbackCap * ratio;
      const facing = enemyX >= x ? 1 : -1;
      if (damage <= 0 && knockback <= 0) {
        continue;
      }
      applyDamageToEnemy(enemy, {
        damage,
        knockback,
        launch: knockback * 0.24,
        facing
      });
      summary.enemiesHit += 1;
    }
  }

  if (includePlayer && stickman.health > 0) {
    const pose = stickman.currentPose ?? { headRadius: 16, bodyLength: 34, legLength: 36 };
    const playerHeight = getTotalHeight(pose);
    const playerCenterY = stickman.y + playerHeight * 0.6;
    const distance = Math.hypot(stickman.x - x, playerCenterY - y);
    if (distance <= radiusSafe) {
      const ratio = computeExplosionFalloff(distance, radiusSafe, minRatio);
      const damage = Math.max(0, damageCap * ratio * selfDamageScale);
      const knockback = knockbackCap * ratio * selfKnockbackScale;
      const facing = stickman.x >= x ? 1 : -1;
      if (damage > 0 || knockback > 0) {
        applyDamageToPlayer(null, {
          damage,
          knockback,
          launch: knockback * 0.25,
          facing
        });
        summary.playerHit = true;
      }
    }
  }

  return summary;
}

export { computeExplosionFalloff, applyExplosionImpulse };
