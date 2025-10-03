import { stickman, trainingDummy, enemies } from "../../state/entities.js";
import { getCurrentWeapon } from "./weapons.js";
import { spawnProjectile } from "./projectiles.js";
import { applyDamageToDummy, applyDamageToEnemy, applyDamageToPlayer } from "./damageHandlers.js";
import { handleHitboxCollision } from "../world/destructibles.js";
import { handleInteractableHitboxCollision } from "../world/interactables.js";
import { consumeAmmo, startReload, registerShot } from "../../state/ammo.js";
import { applyRecoil } from "../../state/recoil.js";

function spawnHitbox(attack) {
  stickman.activeHitboxes.push({
    id: stickman.attackInstanceId,
    attackIndex: stickman.attackIndex,
    remaining: attack.active,
    duration: attack.active,
    offsetX: attack.range,
    heightOffset: attack.heightOffset,
    radius: attack.radius,
    damage: attack.damage,
    knockback: attack.knockback,
    launch: attack.launch,
    ownerFacing: stickman.facing,
    hitTargets: new Set(),
    x: 0,
    y: 0
  });
}

function updateHitboxes(delta, baseHeight) {
  stickman.activeHitboxes = stickman.activeHitboxes.filter((hitbox) => {
    hitbox.remaining -= delta;
    hitbox.ownerFacing = stickman.facing;
    hitbox.x = stickman.x + stickman.facing * hitbox.offsetX;
    hitbox.y = stickman.y + baseHeight + hitbox.heightOffset;
    return hitbox.remaining > 0;
  });
}

function resolveHitDetection() {
  for (const hitbox of stickman.activeHitboxes) {
    if (trainingDummy.health > 0 && !hitbox.hitTargets.has(trainingDummy.id)) {
      const dx = hitbox.x - trainingDummy.x;
      const dy = hitbox.y - (trainingDummy.y + trainingDummy.height * 0.55);
      const distance = Math.hypot(dx, dy);
      if (distance <= hitbox.radius + trainingDummy.radius) {
        hitbox.hitTargets.add(trainingDummy.id);
        applyDamageToDummy({
          damage: hitbox.damage,
          knockback: hitbox.knockback,
          launch: hitbox.launch,
          facing: hitbox.ownerFacing
        });
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
        applyDamageToEnemy(enemy, {
          damage: hitbox.damage,
          knockback: hitbox.knockback,
          launch: hitbox.launch,
          facing: hitbox.ownerFacing
        });
      }
    }

    handleHitboxCollision(hitbox);
    handleInteractableHitboxCollision(hitbox);
  }
}

function fireEquippedWeaponProjectile() {
  const weapon = getCurrentWeapon();
  if (!weapon || !weapon.category?.startsWith("ranged")) {
    return;
  }

  if (!consumeAmmo(weapon.id)) {
    if (startReload(weapon.id)) {
      stickman.attacking = false;
      stickman.currentAttack = null;
      stickman.attackIndex = -1;
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("weapon:reload-start", { detail: { weaponId: weapon.id } }));
      }
    }    return;
  }

  const projectileConfig = weapon.projectile ?? {};
  const speed = projectileConfig.speed ?? 460;
  const facing = stickman.facing;
  const baseVx = facing * speed;
  const baseVy = projectileConfig.initialVy ?? -12;
  const magnitude = Math.hypot(baseVx, baseVy);
  const baseAngle = Math.atan2(baseVy, baseVx);
  const spreadAngle = registerShot(weapon.id);
  const finalAngle = baseAngle + spreadAngle;
  const vx = Math.cos(finalAngle) * magnitude;
  const vy = Math.sin(finalAngle) * magnitude;

  if (weapon.recoil) {
    applyRecoil(weapon.recoil);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("weapon:recoil-kick", { detail: { weaponId: weapon.id, recoil: weapon.recoil } }));
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("weapon:muzzle-flash", { detail: { weaponId: weapon.id, x: stickman.x + facing * 34, y: stickman.y + 20, facing } }));
  }

  spawnProjectile({
    x: stickman.x + facing * 34,
    y: stickman.y + 20,
    vx,
    vy,
    radius: projectileConfig.radius ?? 5,
    lifetime: projectileConfig.lifetime ?? 0.9,
    color: projectileConfig.color ?? "#ffca7a",
    damage: projectileConfig.damage ?? 10,
    knockback: projectileConfig.knockback ?? 60,
    facing,
    gravityFactor: projectileConfig.gravityFactor ?? 0.2
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("weapon:shot-fired", { detail: { weaponId: weapon.id } }));
  }
}

export { spawnHitbox, updateHitboxes, resolveHitDetection, applyDamageToEnemy, applyDamageToPlayer, fireEquippedWeaponProjectile };







