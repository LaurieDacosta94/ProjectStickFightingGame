import { spawnSalvagePickup } from "../../state/resources.js";
import { destructibles, getDestructibles } from "../../state/destructibles.js";
import { clamp } from "../utils/math.js";
import { spawnExplosionParticles, spawnExplosionDebris, spawnSmokePuffs, spawnRingBurst } from "../effects/particles.js";
import { applyExplosionImpulse, computeExplosionFalloff } from "../combat/explosions.js";

function getBounds(destructible) {
  const halfWidth = destructible.halfWidth ?? destructible.width / 2;
  const left = destructible.x - halfWidth;
  const right = destructible.x + halfWidth;
  const top = destructible.y - destructible.height;
  const bottom = destructible.y;
  return { left, right, top, bottom };
}

function circleIntersectsDestructible(x, y, radius, destructible) {
  const { left, right, top, bottom } = getBounds(destructible);
  const closestX = clamp(x, left, right);
  const closestY = clamp(y, top, bottom);
  const dx = x - closestX;
  const dy = y - closestY;
  return dx * dx + dy * dy <= radius * radius;
}

function distanceToDestructible(x, y, destructible) {
  const { left, right, top, bottom } = getBounds(destructible);
  const dx = Math.max(left - x, 0, x - right);
  const dy = Math.max(top - y, 0, y - bottom);
  return Math.hypot(dx, dy);
}

function spawnDamageEffects(destructible, hit = {}) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("destructible:hit", {
        detail: {
          id: destructible.id,
          type: destructible.type,
          material: destructible.template?.material ?? "generic",
          cause: hit.cause ?? "impact",
          x: hit.impactX ?? destructible.x,
          y: hit.impactY ?? destructible.y - destructible.height * 0.5,
          health: destructible.health,
          maxHealth: destructible.maxHealth
        }
      })
    );
  }
}

function triggerDestructibleDeath(destructible, hit = {}) {
  const template = destructible.template;
  if (!template || destructible.deathTriggered) {
    return;
  }
  destructible.deathTriggered = true;
  const centerX = hit.impactX ?? destructible.x;
  const centerY = hit.impactY ?? (destructible.y - destructible.height * 0.35);

  spawnExplosionParticles({
    x: centerX,
    y: centerY,
    radius: Math.max(destructible.width, destructible.height) * 0.8
  });
  spawnSmokePuffs({
    x: centerX,
    y: centerY,
    radius: Math.max(destructible.width, destructible.height),
    maxRadius: (template.deathBlast?.radius ?? destructible.width * 1.2) * 0.6
  });
  spawnRingBurst({
    x: centerX,
    y: centerY,
    startRadius: destructible.width * 0.35,
    endRadius: destructible.width * 1.1,
    color: "#ffb347",
    ttl: 0.55,
    lineWidth: 5
  });

  if (template.deathBlast) {
    const blast = template.deathBlast;
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("destructible:explosion", {
          detail: {
            id: destructible.id,
            x: centerX,
            y: centerY,
            radius: blast.radius
          }
        })
      );
    }

    applyExplosionImpulse({
      x: centerX,
      y: centerY,
      radius: blast.radius,
      maxDamage: blast.maxDamage,
      maxKnockback: blast.knockback,
      minDamageRatio: blast.minDamageRatio ?? 0.25
    });

    damageDestructiblesInRadius({
      x: centerX,
      y: centerY,
      radius: blast.radius,
      maxDamage: blast.maxDamage,
      minDamageRatio: blast.minDamageRatio ?? 0.25,
      sourceId: destructible.id,
      cause: "chain-explosion"
    });
  }
  const salvageAmount = template.salvage ?? Math.round((destructible.maxHealth ?? 200) / 25);
  if (salvageAmount > 0) {
    const chunks = Math.max(1, Math.round(salvageAmount / 10));
    const amountPer = Math.max(1, Math.round(salvageAmount / chunks));
    for (let i = 0; i < chunks; i += 1) {
      const jitterX = (Math.random() - 0.5) * (destructible.width ?? 120) * 0.4;
      spawnSalvagePickup({
        x: centerX + jitterX,
        y: centerY,
        amount: amountPer,
        vy: -120 - Math.random() * 60
      });
    }
  }
}

function damageDestructible(destructible, hit = {}) {
  if (!destructible || destructible.destroyed) {
    return { applied: false, destroyed: false };
  }

  const template = destructible.template;
  const damage = Math.max(0, hit.damage ?? 0);
  if (damage <= 0) {
    return { applied: false, destroyed: false };
  }

  const appliedDamage = Math.min(damage, destructible.health);
  destructible.health = Math.max(0, destructible.health - appliedDamage);
  destructible.flashTimer = 0.2;
  destructible.shakeTimer = Math.min(0.45, destructible.shakeTimer + 0.18 + (appliedDamage / destructible.maxHealth) * 0.3);
  const baseShake = template?.shakeFactor ?? 14;
  destructible.shakeMagnitude = Math.max(destructible.shakeMagnitude * 0.6, baseShake * (0.35 + (appliedDamage / destructible.maxHealth) * 1.2));
  destructible.smokeTimer = Math.min(template?.smokeDuration ?? 0, (destructible.smokeTimer ?? 0) + 0.5);
  spawnDamageEffects(destructible, hit);

  let destroyed = false;
  if (destructible.health <= 0) {
    destructible.destroyed = true;
    destructible.rubbleLevel = Math.max(destructible.rubbleLevel, 0.05);
    destructible.smokeTimer = template?.smokeDuration ?? 0;
    triggerDestructibleDeath(destructible, hit);
    destroyed = true;
  }

  return { applied: true, destroyed };
}

function damageDestructiblesInRadius({ x, y, radius, maxDamage, minDamageRatio = 0.25, sourceId = null, cause = "explosion" }) {
  const damageMax = Math.max(0, maxDamage ?? 0);
  if (damageMax <= 0 || radius <= 0) {
    return 0;
  }

  const minRatio = clamp(minDamageRatio, 0, 1);
  let hits = 0;
  for (const destructible of destructibles) {
    if (destructible.id === sourceId || (destructible.destroyed && destructible.deathTriggered)) {
      continue;
    }
    const distance = distanceToDestructible(x, y, destructible);
    if (distance > radius) {
      continue;
    }
    const falloff = computeExplosionFalloff(distance, radius, minRatio);
    const damage = damageMax * falloff;
    if (damage <= 0) {
      continue;
    }
    const impactX = clamp(x, destructible.x - destructible.halfWidth, destructible.x + destructible.halfWidth);
    const impactY = clamp(y, destructible.y - destructible.height, destructible.y);
    const result = damageDestructible(destructible, { damage, cause, impactX, impactY });
    if (result.applied) {
      hits += 1;
    }
  }
  return hits;
}

function handleProjectileCollision(projectile) {
  for (const destructible of destructibles) {
    if (destructible.destroyed) {
      continue;
    }
    if (circleIntersectsDestructible(projectile.x, projectile.y, projectile.radius, destructible)) {
      damageDestructible(destructible, {
        damage: projectile.damage ?? 0,
        cause: "projectile",
        impactX: projectile.x,
        impactY: projectile.y
      });
      return true;
    }
  }
  return false;
}

function handleHitboxCollision(hitbox) {
  let hit = false;
  for (const destructible of destructibles) {
    if (destructible.destroyed || hitbox.hitTargets.has(destructible.id)) {
      continue;
    }
    if (circleIntersectsDestructible(hitbox.x, hitbox.y, hitbox.radius, destructible)) {
      hitbox.hitTargets.add(destructible.id);
      damageDestructible(destructible, {
        damage: hitbox.damage ?? 0,
        cause: "melee",
        impactX: hitbox.x,
        impactY: hitbox.y
      });
      hit = true;
    }
  }
  return hit;
}

function updateDestructibles(delta) {
  for (const destructible of destructibles) {
    destructible.flashTimer = Math.max(0, (destructible.flashTimer ?? 0) - delta);
    destructible.shakeTimer = Math.max(0, (destructible.shakeTimer ?? 0) - delta);
    destructible.smokeTimer = Math.max(0, (destructible.smokeTimer ?? 0) - delta);
    destructible.shakeMagnitude *= destructible.shakeTimer > 0 ? 0.92 : 0.6;
    if (destructible.destroyed) {
      destructible.rubbleLevel = Math.min(1, (destructible.rubbleLevel ?? 0) + delta * 2.2);
    } else {
      destructible.rubbleLevel = Math.max(0, (destructible.rubbleLevel ?? 0) - delta * 0.8);
    }
  }
}

export {
  getDestructibles,
  updateDestructibles,
  damageDestructible,
  damageDestructiblesInRadius,
  handleProjectileCollision,
  handleHitboxCollision
};








