
import { context, GROUND_Y } from "../../environment/canvas.js";
import { GRAVITY } from "../../config/constants.js";
import { stickman, trainingDummy, enemies, getTotalHeight } from "../../state/entities.js";
import { getEnvironmentWidth } from "../../state/environment.js";
import { getCurrentWeapon } from "./weapons.js";
import { damageDestructiblesInRadius } from "../world/destructibles.js";
import { clamp } from "../utils/math.js";
import { getElapsedTime } from "../utils/time.js";
import { applyExplosionImpulse } from "./explosions.js";
import { spawnExplosionDebris } from "../effects/particles.js";

const throwables = [];
const smokeClouds = [];

function dispatchThrowableEvent(type, detail = {}) {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(type, { detail }));
}

function throwEquippedWeapon() {
  const weapon = getCurrentWeapon();
  if ((stickman.stunTimer ?? 0) > 0) {
    return false;
  }
  if (!weapon || weapon.category !== "throwable") {
    return false;
  }
  if (stickman.throwCooldown > 0 || stickman.health <= 0 || stickman.rolling) {
    return false;
  }

  const config = weapon.throwable ?? {};
  const aim = stickman.aim ?? null;
  const rawDirX = Number.isFinite(aim?.vectorX) ? aim.vectorX : (stickman.facing || 1);
  const rawDirY = Number.isFinite(aim?.vectorY) ? aim.vectorY : 0;
  const normLength = Math.hypot(rawDirX, rawDirY) || 1;
  const dirX = rawDirX / normLength;
  const dirY = rawDirY / normLength;
  const perpX = -dirY;
  const perpY = dirX;

  const anchorX = Number.isFinite(aim?.anchorX) ? aim.anchorX : stickman.x;
  const anchorY = Number.isFinite(aim?.anchorY) ? aim.anchorY : stickman.y + 24;
  const spawnOffset = config.spawnOffset ?? { x: 22, y: 12 };
  const forwardOffset = spawnOffset.x ?? 22;
  const verticalOffset = spawnOffset.y ?? 12;
  const lateralOffset = spawnOffset.side ?? 0;

  const envWidth = getEnvironmentWidth();
  const spawnX = clamp(anchorX + dirX * forwardOffset + perpX * lateralOffset, 40, envWidth - 40);
  const spawnY = anchorY + dirY * forwardOffset + perpY * lateralOffset + verticalOffset;

  const arc = config.arcVelocity ?? { vx: 260, vy: -420 };
  const forwardSpeed = arc.vx ?? 260;
  const verticalBoost = arc.vy ?? -420;
  const vx = dirX * forwardSpeed + perpX * (arc.side ?? 0);
  const vy = dirY * forwardSpeed + perpY * (arc.side ?? 0) + verticalBoost;

  stickman.throwCooldown = config.cooldownSeconds ?? 0.9;

  const grenade = {
    id: `grenade-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    x: spawnX,
    y: spawnY,
    vx,
    vy,
    radius: config.radius ?? 16,
    fuse: config.fuseSeconds ?? 1.5,
    maxFuse: config.fuseSeconds ?? 1.5,
    explosionRadius: config.explosionRadius ?? 120,
    damage: config.damage ?? 45,
    knockback: config.knockback ?? 260,
    gravityFactor: config.gravityFactor ?? 0.5,
    bounciness: clamp(config.bounciness ?? 0.45, 0, 0.95),
    color: config.color ?? "#ffb347",
    explosionDuration: config.explosionDuration ?? 0.32,
    selfDamageScale: clamp(config.selfDamageScale ?? 0.65, 0, 1),
    selfKnockbackScale: clamp(config.selfKnockbackScale ?? 0.6, 0, 1),
    effectType: config.effectType ?? "explosive",
    stunDuration: config.stunDuration ?? 0,
    playerStunDuration: config.playerStunDuration ?? 0,
    smokeDuration: config.smokeDuration ?? 0,
    smokeRadius: config.smokeRadius ?? (config.explosionRadius ?? 120),
    smokeExpansion: config.smokeExpansion ?? 1.1,
    smokeSlowMultiplier: clamp(config.smokeSlowMultiplier ?? 0.55, 0.1, 1),
    smokeTickDuration: config.smokeTickDuration ?? 0.5,
    detonated: false,
    explosionTimer: 0
  };

  throwables.push(grenade);
  dispatchThrowableEvent("throwable:thrown", {
    id: grenade.id,
    effectType: grenade.effectType,
    x: grenade.x,
    y: grenade.y,
    radius: grenade.explosionRadius,
    fuse: grenade.fuse
  });

  return true;
}

function applyExplosiveDamage(grenade) {
  const { x, y, explosionRadius, damage, knockback } = grenade;
  applyExplosionImpulse({
    x,
    y,
    radius: explosionRadius,
    maxDamage: damage,
    maxKnockback: knockback,
    minDamageRatio: grenade.damageFalloff ?? 0.3,
    selfDamageScale: grenade.selfDamageScale ?? 1,
    selfKnockbackScale: grenade.selfKnockbackScale ?? 1
  });

  if (damage > 0) {
    damageDestructiblesInRadius({
      x,
      y,
      radius: explosionRadius,
      maxDamage: damage,
      minDamageRatio: grenade.destructibleFalloff ?? 0.35,
      cause: grenade.effectType ?? "explosion"
    });
  }

  spawnExplosionDebris({
    x,
    y,
    radius: explosionRadius,
    count: Math.max(10, Math.round(explosionRadius / 10)),
    speed: 220 + Math.max(0, knockback ?? 0) * 0.5
  });
}

function applyFlashEffect(grenade) {
  const { x, y, explosionRadius, stunDuration, playerStunDuration } = grenade;
  const duration = Math.max(0.1, stunDuration);

  if (trainingDummy.health > 0) {
    const dx = trainingDummy.x - x;
    const dy = (trainingDummy.y + trainingDummy.height * 0.55) - y;
    if (Math.hypot(dx, dy) <= explosionRadius) {
      trainingDummy.flashTimer = Math.max(trainingDummy.flashTimer, duration * 0.6);
      trainingDummy.shakeTimer = Math.max(trainingDummy.shakeTimer, duration * 0.5);
      trainingDummy.shakeMagnitude = Math.max(trainingDummy.shakeMagnitude, 14);
    }
  }

  for (const enemy of enemies) {
    if (enemy.health <= 0) {
      continue;
    }
    const dx = enemy.x - x;
    const dy = (enemy.y + enemy.height * 0.5) - y;
    if (Math.hypot(dx, dy) <= explosionRadius) {
      enemy.stunTimer = Math.max(enemy.stunTimer ?? 0, duration);
      enemy.flashTimer = Math.max(enemy.flashTimer, duration * 0.7);
      enemy.shakeTimer = Math.max(enemy.shakeTimer, duration * 0.4);
      enemy.shakeMagnitude = Math.max(enemy.shakeMagnitude, 12);
    }
  }

  if (playerStunDuration > 0 && stickman.health > 0) {
    const pose = stickman.currentPose ?? { headRadius: 16, bodyLength: 34, legLength: 36 };
    const playerHeight = getTotalHeight(pose);
    const playerCenterY = stickman.y + playerHeight * 0.6;
    const dx = stickman.x - x;
    const dy = playerCenterY - y;
    if (Math.hypot(dx, dy) <= explosionRadius) {
      stickman.flashBlindTimer = Math.max(stickman.flashBlindTimer ?? 0, playerStunDuration);
      stickman.stunTimer = Math.max(stickman.stunTimer ?? 0, playerStunDuration * 0.6);
    }
  }
}

function spawnSmokeCloud(grenade) {
  const duration = Math.max(0.5, grenade.smokeDuration);
  const radius = Math.max(40, grenade.smokeRadius);
  const cloud = {
    id: `smoke-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    x: grenade.x,
    y: grenade.y,
    radius,
    baseRadius: radius,
    maxRadius: radius * (grenade.smokeExpansion ?? 1.1),
    duration,
    life: duration,
    slowMultiplier: clamp(grenade.smokeSlowMultiplier ?? 0.55, 0.1, 1),
    tick: grenade.smokeTickDuration ?? 0.5,
    tickTimer: 0
  };
  smokeClouds.push(cloud);
  dispatchThrowableEvent("throwable:smoke-spawn", {
    id: cloud.id,
    x: cloud.x,
    y: cloud.y,
    radius: cloud.radius,
    maxRadius: cloud.maxRadius,
    duration: cloud.duration
  });
  return cloud;
}

function detonate(grenade) {
  if (grenade.detonated) {
    return;
  }

  grenade.detonated = true;
  grenade.explosionTimer = Math.max(grenade.explosionDuration, 0.08);
  grenade.fuse = 0;

  const baseDetail = {
    id: grenade.id,
    effectType: grenade.effectType,
    x: grenade.x,
    y: grenade.y,
    radius: grenade.explosionRadius
  };

  switch (grenade.effectType) {
    case "flash": {
      applyFlashEffect(grenade);
      baseDetail.radius = grenade.explosionRadius;
      baseDetail.stunDuration = grenade.stunDuration;
      baseDetail.playerStunDuration = grenade.playerStunDuration;
      dispatchThrowableEvent("throwable:flash-burst", {
        ...baseDetail,
        stunDuration: grenade.stunDuration,
        playerStunDuration: grenade.playerStunDuration
      });
      break;
    }
    case "smoke": {
      const cloud = spawnSmokeCloud(grenade);
      baseDetail.radius = cloud.maxRadius;
      baseDetail.duration = cloud.duration;
      baseDetail.cloudId = cloud.id;
      dispatchThrowableEvent("throwable:smoke-detonate", {
        ...baseDetail,
        radius: cloud.maxRadius,
        duration: cloud.duration,
        cloudId: cloud.id
      });
      break;
    }
    default: {
      applyExplosiveDamage(grenade);
      baseDetail.damage = grenade.damage;
      baseDetail.knockback = grenade.knockback;
      dispatchThrowableEvent("throwable:explosion", {
        ...baseDetail,
        damage: grenade.damage,
        knockback: grenade.knockback
      });
      break;
    }
  }

  dispatchThrowableEvent("throwable:detonate", baseDetail);
}

function updateSmokeClouds(delta) {
  for (const cloud of smokeClouds) {
    cloud.life = Math.max(0, cloud.life - delta);
    const progress = 1 - cloud.life / cloud.duration;
    cloud.radius = clamp(cloud.baseRadius + (cloud.maxRadius - cloud.baseRadius) * clamp(progress, 0, 1), cloud.baseRadius, cloud.maxRadius);
    cloud.tickTimer -= delta;
    if (cloud.tickTimer <= 0) {
      cloud.tickTimer = cloud.tick;
      const effectiveRadius = cloud.radius;
      for (const enemy of enemies) {
        if (enemy.health <= 0) {
          continue;
        }
        const dx = enemy.x - cloud.x;
        const dy = (enemy.y + enemy.height * 0.5) - cloud.y;
        if (Math.hypot(dx, dy) <= effectiveRadius) {
          enemy.smokeSlowTimer = Math.max(enemy.smokeSlowTimer ?? 0, cloud.tick + 0.4);
          enemy.smokeSlowStrength = Math.min(enemy.smokeSlowStrength ?? 1, cloud.slowMultiplier);
        }
      }
      const pose = stickman.currentPose ?? { headRadius: 16, bodyLength: 34, legLength: 36 };
      const playerHeight = getTotalHeight(pose);
      const playerCenterY = stickman.y + playerHeight * 0.6;
      const pdx = stickman.x - cloud.x;
      const pdy = playerCenterY - cloud.y;
      if (Math.hypot(pdx, pdy) <= effectiveRadius) {
        stickman.smokeSlowTimer = Math.max(stickman.smokeSlowTimer ?? 0, cloud.tick + 0.4);
        stickman.smokeSlowStrength = Math.min(stickman.smokeSlowStrength ?? 1, cloud.slowMultiplier + 0.1);
      }
    }
  }

  for (let i = smokeClouds.length - 1; i >= 0; i -= 1) {
    if (smokeClouds[i].life <= 0) {
      const dissipated = smokeClouds.splice(i, 1)[0];
      dispatchThrowableEvent("throwable:smoke-dissipate", {
        id: dissipated.id,
        x: dissipated.x,
        y: dissipated.y,
        radius: dissipated.maxRadius ?? dissipated.radius
      });
    }
  }
}

function updateThrowables(delta) {
  const envWidth = getEnvironmentWidth();

  for (const grenade of throwables) {
    if (!grenade.detonated) {
      grenade.fuse -= delta;
      grenade.vy += GRAVITY * grenade.gravityFactor * delta;
      grenade.x += grenade.vx * delta;
      grenade.y += grenade.vy * delta;

      if (grenade.y + grenade.radius >= GROUND_Y) {
        grenade.y = GROUND_Y - grenade.radius;
        if (grenade.vy > 0) {
          grenade.vy = -grenade.vy * grenade.bounciness;
        }
        grenade.vx *= 0.7;
        if (Math.abs(grenade.vy) < 36) {
          grenade.vy = 0;
        }
      }

      if (grenade.x - grenade.radius <= 0 || grenade.x + grenade.radius >= envWidth) {
        grenade.x = clamp(grenade.x, grenade.radius, envWidth - grenade.radius);
        grenade.vx = -grenade.vx * 0.45;
      }

      if (grenade.fuse <= 0) {
        detonate(grenade);
      }
    } else {
      grenade.explosionTimer -= delta;
    }
  }

  for (let i = throwables.length - 1; i >= 0; i -= 1) {
    if (throwables[i].detonated && throwables[i].explosionTimer <= 0) {
      throwables.splice(i, 1);
    }
  }

  updateSmokeClouds(delta);
}

function drawSmokeClouds() {
  if (smokeClouds.length === 0) {
    return;
  }

  context.save();
  for (const cloud of smokeClouds) {
    const lifeRatio = clamp(cloud.life / cloud.duration, 0, 1);
    const radius = cloud.radius;
    const gradient = context.createRadialGradient(cloud.x, cloud.y, radius * 0.15, cloud.x, cloud.y, radius);
    gradient.addColorStop(0, "rgba(172, 196, 216, 0.35)");
    gradient.addColorStop(1, "rgba(40, 52, 64, 0)");
    context.globalAlpha = lifeRatio;
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(cloud.x, cloud.y, radius, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawThrowables() {
  const elapsed = getElapsedTime();
  context.save();

  for (const grenade of throwables) {
    if (!grenade.detonated) {
      context.globalAlpha = 1;
      context.fillStyle = grenade.color;
      context.beginPath();
      context.arc(grenade.x, grenade.y, grenade.radius, 0, Math.PI * 2);
      context.fill();

      const fuseRatio = grenade.maxFuse > 0 ? clamp(grenade.fuse / grenade.maxFuse, 0, 1) : 0;
      context.strokeStyle = "rgba(255, 232, 194, 0.85)";
      context.lineWidth = 3;
      context.beginPath();
      context.arc(grenade.x, grenade.y, grenade.radius * 0.65, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fuseRatio);
      context.stroke();

      const sparkOffsetX = Math.cos(elapsed * 20) * grenade.radius * 0.4;
      const sparkOffsetY = Math.sin(elapsed * 24) * grenade.radius * 0.2 - grenade.radius * 0.8;
      context.fillStyle = "rgba(255, 240, 210, 0.9)";
      context.beginPath();
      context.arc(grenade.x + sparkOffsetX, grenade.y + sparkOffsetY, 3.2, 0, Math.PI * 2);
      context.fill();
    } else {
      const duration = Math.max(grenade.explosionDuration, 0.001);
      const progress = clamp(1 - grenade.explosionTimer / duration, 0, 1);
      const alpha = clamp(1 - progress, 0, 1);

      if (grenade.effectType === "flash") {
        const flashRadius = grenade.explosionRadius * (0.8 + progress * 0.5);
        const flashAlpha = Math.max(0, Math.min(1, 0.75 * alpha + 0.15));
        context.fillStyle = `rgba(255, 255, 224, ${flashAlpha.toFixed(3)})`;
        context.beginPath();
        context.arc(grenade.x, grenade.y, flashRadius, 0, Math.PI * 2);
        context.fill();
      } else if (grenade.effectType === "smoke") {
        const puffRadius = grenade.explosionRadius * (0.6 + progress * 0.6);
        const puffAlpha = Math.max(0, Math.min(0.65, 0.5 * alpha + 0.1));
        context.fillStyle = `rgba(180, 200, 220, ${puffAlpha.toFixed(3)})`;
        context.beginPath();
        context.arc(grenade.x, grenade.y, puffRadius, 0, Math.PI * 2);
        context.fill();
      } else {
        const outerRadius = grenade.explosionRadius * (0.65 + progress * 0.4);
        const ringAlpha = Math.max(0, Math.min(1, 0.7 * alpha));
        context.strokeStyle = `rgba(255, 196, 120, ${ringAlpha.toFixed(3)})`;
        context.lineWidth = 6 * (1 - progress * 0.6);
        context.beginPath();
        context.arc(grenade.x, grenade.y, outerRadius, 0, Math.PI * 2);
        context.stroke();

        const coreAlpha = Math.max(0, Math.min(1, 0.75 * alpha));
        context.fillStyle = `rgba(255, 118, 64, ${coreAlpha.toFixed(3)})`;
        context.beginPath();
        context.arc(grenade.x, grenade.y, outerRadius * 0.6, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  context.restore();
  drawSmokeClouds();
}

export { throwEquippedWeapon, updateThrowables, drawThrowables };






