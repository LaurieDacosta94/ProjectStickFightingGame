import { stickman, trainingDummy, enemies } from "../state/entities.js";
import { spawnRagdoll } from "./ragdoll.js";
import { spawnDamagePopup } from "./effects.js";
import { getCurrentWeapon } from "./weapons.js";
import { spawnProjectile } from "./projectiles.js";

function resolveHitDetection() {
  for (const hitbox of stickman.activeHitboxes) {
    if (trainingDummy.health > 0 && !hitbox.hitTargets.has(trainingDummy.id)) {
      const dx = hitbox.x - trainingDummy.x;
      const dy = hitbox.y - (trainingDummy.y + trainingDummy.height * 0.55);
      const distance = Math.hypot(dx, dy);
      if (distance <= hitbox.radius + trainingDummy.radius) {
        hitbox.hitTargets.add(trainingDummy.id);
        applyDamageToDummy(hitbox);
      }
    }

    for (const enemy of enemies) {
      if (enemy.health <= 0 || hitbox.hitTargets.has(enemy.id)) {
        continue;
      }
      const dx = hitbox.x - enemy.x;
      const dy = hitbox.y - (enemy.y + enemy.height * 0.5);
      const distance = Math.hypot(dx, dy);
      if (distance <= hitbox.radius + enemy.radius) {
        hitbox.hitTargets.add(enemy.id);
        applyDamageToEnemy(enemy, hitbox);
      }
    }
  }
}

function applyDamageToDummy(hitbox) {
  trainingDummy.health = Math.max(0, trainingDummy.health - hitbox.damage);
  trainingDummy.flashTimer = 0.18;
  trainingDummy.shakeTimer = Math.min(0.4, trainingDummy.shakeTimer + 0.22);
  trainingDummy.shakeMagnitude = Math.min(14, trainingDummy.shakeMagnitude + hitbox.knockback / 60);

  const popupY = trainingDummy.y + trainingDummy.height * 0.55 - trainingDummy.radius - 12;
  spawnDamagePopup(trainingDummy.x, popupY, hitbox.damage);

  if (trainingDummy.health === 0 && trainingDummy.respawnTimer <= 0) {
    trainingDummy.respawnTimer = 2.5;
  }
}

function applyDamageToEnemy(enemy, hitbox) {
  if (enemy.health <= 0 || enemy.invulnerability > 0) {
    return;
  }

  enemy.health = Math.max(0, enemy.health - hitbox.damage);
  enemy.flashTimer = 0.18;
  enemy.shakeTimer = Math.min(0.5, enemy.shakeTimer + 0.24);
  enemy.shakeMagnitude = Math.min(18, enemy.shakeMagnitude + hitbox.knockback / 55);
  enemy.vx += hitbox.knockback * stickman.facing * 0.35;
  if (hitbox.launch > 0) {
    enemy.vy -= hitbox.launch * 0.3;
  }

  spawnDamagePopup(enemy.x + enemy.facing * 14, enemy.y - 14, hitbox.damage);
  enemy.invulnerability = 0.15;

  if (enemy.health === 0) {
    if (enemy.respawnTimer <= 0) {
      spawnRagdoll("enemy", enemy.x, enemy.y, stickman.facing, enemy.vx, enemy.vy);
    }
    enemy.state = "defeated";
    enemy.attackCooldown = 1.2;
    enemy.respawnTimer = 3;
  }
}

function applyDamageToPlayer(enemy) {
  if (stickman.invulnerability > 0 || stickman.health <= 0) {
    return;
  }

  stickman.health = Math.max(0, stickman.health - enemy.attackDamage);
  stickman.invulnerability = 0.6;
  stickman.vx += enemy.attackKnockback * enemy.facing;
  stickman.vy += enemy.attackLaunch;
  spawnDamagePopup(stickman.x, stickman.y + 10, enemy.attackDamage);

  if (stickman.health === 0 && stickman.deadTimer <= 0) {
    stickman.deadTimer = 2.6;
    stickman.attacking = false;
    stickman.activeHitboxes = [];
    stickman.comboWindowOpen = false;
    stickman.attackIndex = -1;
    stickman.rolling = false;
    spawnRagdoll("player", stickman.x, stickman.y, -enemy.facing, stickman.vx, stickman.vy);
  }
}

function fireEquippedWeaponProjectile() {
  const weapon = getCurrentWeapon();
  if (!weapon || weapon.category.startsWith("melee")) {
    return;
  }

  const speed = 460;
  const facing = stickman.facing;
  const muzzleY = stickman.y + 20;
  spawnProjectile({
    x: stickman.x + facing * 34,
    y: muzzleY,
    vx: facing * speed,
    vy: -12,
    radius: 5,
    lifetime: 0.8,
    color: "#ffca7a"
  });
}

export {
  resolveHitDetection,
  applyDamageToEnemy,
  applyDamageToPlayer,
  fireEquippedWeaponProjectile
};
