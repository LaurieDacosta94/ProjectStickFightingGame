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
    return false;
  }

  if (!consumeAmmo(weapon.id)) {
    if (startReload(weapon.id)) {
      stickman.attacking = false;
      stickman.currentAttack = null;
      stickman.attackIndex = -1;
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("weapon:reload-start", { detail: { weaponId: weapon.id } }));
      }
    }
      return false;
  }

  const projectileConfig = weapon.projectile ?? {};
  const speed = projectileConfig.speed ?? 460;

  const aim = stickman.aim ?? null;
  const rawDirX = Number.isFinite(aim?.vectorX) ? aim.vectorX : (stickman.facing || 1);
  const rawDirY = Number.isFinite(aim?.vectorY) ? aim.vectorY : 0;
  const normLength = Math.hypot(rawDirX, rawDirY) || 1;
  const dirX = rawDirX / normLength;
  const dirY = rawDirY / normLength;

  const anchorX = Number.isFinite(aim?.anchorX) ? aim.anchorX : stickman.x;
  const anchorY = Number.isFinite(aim?.anchorY) ? aim.anchorY : stickman.y + 24;

  const muzzleDistance = projectileConfig.muzzleDistance ?? 38;
  const sideOffset = projectileConfig.muzzleSideOffset ?? 0;
  const verticalOffset = projectileConfig.muzzleVerticalOffset ?? 0;

  const perpX = -dirY;
  const perpY = dirX;

  const muzzleX = anchorX + dirX * muzzleDistance + perpX * sideOffset;
  const muzzleY = anchorY + dirY * muzzleDistance + perpY * sideOffset + verticalOffset;

  const baseAngle = Math.atan2(dirY, dirX);
  const spreadAngle = registerShot(weapon.id);
  const finalAngle = baseAngle + spreadAngle;
  const vx = Math.cos(finalAngle) * speed + (projectileConfig.initialVx ?? 0);
  const vy = Math.sin(finalAngle) * speed + (projectileConfig.initialVy ?? 0);

  const facing = vx >= 0 ? 1 : -1;

  if (weapon.recoil) {
    applyRecoil(weapon.recoil);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("weapon:recoil-kick", { detail: { weaponId: weapon.id, recoil: weapon.recoil } }));
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("weapon:muzzle-flash", {
        detail: {
          weaponId: weapon.id,
          x: muzzleX,
          y: muzzleY,
          facing,
          direction: { x: dirX, y: dirY }
        }
      })
    );
  }

  spawnProjectile({
    x: muzzleX,
    y: muzzleY,
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

  return true;
}

export { spawnHitbox, updateHitboxes, resolveHitDetection, applyDamageToEnemy, applyDamageToPlayer, fireEquippedWeaponProjectile };



















