import { stickman, trainingDummy } from "../../state/entities.js";
import { spawnRagdoll } from "../effects/ragdoll.js";
import { spawnDamagePopup } from "../effects/damage.js";
import { absorbShieldHit } from "../gadgets/index.js";

function applyDamageToDummy(hit) {
  const damage = hit.damage ?? 0;
  const knockback = hit.knockback ?? 0;

  trainingDummy.health = Math.max(0, trainingDummy.health - damage);
  trainingDummy.flashTimer = 0.18;
  trainingDummy.shakeTimer = Math.min(0.4, trainingDummy.shakeTimer + 0.22);
  trainingDummy.shakeMagnitude = Math.min(14, trainingDummy.shakeMagnitude + knockback / 60);

  const popupY = trainingDummy.y + trainingDummy.height * 0.55 - trainingDummy.radius - 12;
  spawnDamagePopup(trainingDummy.x, popupY, damage);

  if (trainingDummy.health === 0 && trainingDummy.respawnTimer <= 0) {
    trainingDummy.respawnTimer = 2.5;
  }
}

function applyDamageToEnemy(enemy, hit) {
  if (enemy.health <= 0 || enemy.invulnerability > 0) {
    return;
  }

  const damage = hit.damage ?? 0;
  const knockback = hit.knockback ?? 0;
  const launch = hit.launch ?? 0;
  const facing = hit.facing ?? stickman.facing;

  enemy.health = Math.max(0, enemy.health - damage);
  enemy.flashTimer = 0.18;
  enemy.shakeTimer = Math.min(0.5, enemy.shakeTimer + 0.24);
  enemy.shakeMagnitude = Math.min(18, enemy.shakeMagnitude + knockback / 55);
  enemy.vx += knockback * facing * 0.35;
  if (launch > 0) {
    enemy.vy -= launch * 0.3;
  }

  spawnDamagePopup(enemy.x + enemy.facing * 14, enemy.y - 14, damage);
  enemy.invulnerability = 0.15;

  if (enemy.health === 0) {
    if (enemy.respawnTimer <= 0) {
      spawnRagdoll("enemy", enemy.x, enemy.y, facing, enemy.vx, enemy.vy);
    }
    enemy.state = "defeated";
    enemy.attackCooldown = 1.2;
    enemy.respawnTimer = 3;
  }
}

function applyDamageToPlayer(enemy, hit) {
  if (stickman.invulnerability > 0 || stickman.health <= 0) {
    return;
  }

  const baseDamage = hit?.damage ?? enemy.attackDamage ?? 0;
  const baseKnockback = hit?.knockback ?? enemy.attackKnockback ?? 0;
  const baseLaunch = hit?.launch ?? enemy.attackLaunch ?? 0;
  const facing = hit?.facing ?? enemy.facing ?? 1;

  let adjustedHit = absorbShieldHit({
    damage: baseDamage,
    knockback: baseKnockback,
    launch: baseLaunch,
    facing
  });

  const finalDamage = adjustedHit?.damage ?? 0;
  const finalKnockback = adjustedHit?.knockback ?? baseKnockback;
  const finalLaunch = adjustedHit?.launch ?? baseLaunch;
  const finalFacing = adjustedHit?.facing ?? facing;

  if (finalDamage > 0) {
    stickman.health = Math.max(0, stickman.health - finalDamage);
    stickman.invulnerability = 0.6;
  } else {
    stickman.invulnerability = Math.max(stickman.invulnerability, 0.2);
  }

  stickman.vx += finalKnockback * finalFacing;
  stickman.vy += finalLaunch;
  spawnDamagePopup(stickman.x, stickman.y + 10, Math.max(0, Math.round(finalDamage)));

  if (finalDamage > 0 && stickman.health === 0 && stickman.deadTimer <= 0) {
    stickman.deadTimer = 2.6;
    stickman.attacking = false;
    stickman.activeHitboxes = [];
    stickman.comboWindowOpen = false;
    stickman.attackIndex = -1;
    stickman.rolling = false;
    spawnRagdoll("player", stickman.x, stickman.y, -finalFacing, stickman.vx, stickman.vy);
  }
}

export { applyDamageToDummy, applyDamageToEnemy, applyDamageToPlayer };
