import { canvas } from "../../environment/canvas.js";
import { getEnvironmentWidth } from "../../state/environment.js";
import { interactables, getInteractables } from "../../state/interactables.js";
import { stickman, enemies, squadmates, getTotalHeight } from "../../state/entities.js";
import { POSES } from "../../config/constants.js";
import { clamp } from "../utils/math.js";
import { spawnRingBurst, spawnSmokePuffs } from "../effects/particles.js";
import { spawnDynamicLight } from "../effects/lighting.js";
import { applyDamageToEnemy, applyDamageToPlayer } from "../combat/damageHandlers.js";

const PLAYER_HALF_WIDTH = 22;
const ALLY_HALF_WIDTH = 20;
const ENEMY_HALF_WIDTH = 24;

function approachZero(value, deltaValue) {
  if (value > 0) {
    return Math.max(0, value - deltaValue);
  }
  if (value < 0) {
    return Math.min(0, value + deltaValue);
  }
  return 0;
}

function getActorProfile(actor, options = {}) {
  if (!actor) {
    return null;
  }
  const pose = options.pose ?? (actor === stickman ? stickman.currentPose ?? POSES.standing : POSES.standing);
  const height = options.height ?? (actor.height ?? getTotalHeight(pose));
  const halfWidth = options.halfWidth ?? (actor.radius ?? PLAYER_HALF_WIDTH);
  const vx = options.vx ?? actor.vx ?? 0;
  const onGround = options.onGround ?? actor.onGround ?? true;
  return {
    ref: actor,
    x: actor.x,
    y: actor.y,
    vx,
    onGround,
    facing: actor.facing ?? 1,
    height,
    halfWidth
  };
}

function applyPushFromActor(interactable, template, actorProfile, delta) {
  if (!actorProfile || (template.category !== "movable" && template.category !== "rolling")) {
    return;
  }

  const actorFeet = actorProfile.y + actorProfile.height;
  const verticalGap = Math.abs(actorFeet - interactable.y);
  const verticalThreshold = interactable.height * 0.6 + actorProfile.height * 0.25 + 24;
  if (verticalGap > verticalThreshold) {
    return;
  }

  const interactHalf = interactable.width ? interactable.width / 2 : interactable.radius;
  const dx = actorProfile.x - interactable.x;
  const overlap = actorProfile.halfWidth + interactHalf - Math.abs(dx);
  if (overlap <= 0) {
    return;
  }

  const direction = dx >= 0 ? 1 : -1;
  const impulseBase = template.pushImpulse ?? 260;
  const isPlayer = actorProfile.ref === stickman;
  const velocityInfluence = Math.abs(actorProfile.vx) * (isPlayer ? 0.7 : 0.45);
  const appliedImpulse = (impulseBase + velocityInfluence) * delta;

  interactable.vx += direction * appliedImpulse;
  const maxSpeed = template.maxSpeed ?? interactable.maxSpeed ?? 240;
  interactable.vx = clamp(interactable.vx, -maxSpeed, maxSpeed);

  const targetActorX = interactable.x + direction * (interactHalf + actorProfile.halfWidth + 0.5);
  if (direction > 0) {
    actorProfile.ref.x = Math.min(actorProfile.ref.x, targetActorX);
  } else {
    actorProfile.ref.x = Math.max(actorProfile.ref.x, targetActorX);
  }

  if (actorProfile.ref === stickman) {
    const envWidth = getEnvironmentWidth();
    stickman.x = clamp(stickman.x, 40, envWidth - 40);
  }

  interactable.flashTimer = Math.max(interactable.flashTimer, 0.12);
  interactable.state = template.category === "rolling" ? "rolling" : "pushed";
}

function updateTrap(interactable, template, delta) {
  interactable.cooldown = Math.max(0, (interactable.cooldown ?? 0) - delta);
  if (interactable.cooldown > 0) {
    return;
  }

  const effectiveHalf = interactable.width ? interactable.width / 2 : interactable.radius;
  const detectionRadius = effectiveHalf + 26;
  const damage = template.damage ?? 0;
  const knockback = template.knockback ?? 80;
  const launch = template.launch ?? -140;
  const stun = template.stunDuration ?? 0.6;

  let triggered = false;

  const actors = [];
  actors.push(getActorProfile(stickman, { halfWidth: PLAYER_HALF_WIDTH, vx: stickman.vx }));
  for (const enemy of enemies) {
    if (enemy.health > 0) {
      actors.push(getActorProfile(enemy, { halfWidth: ENEMY_HALF_WIDTH }));
    }
  }

  for (const profile of actors) {
    if (!profile) {
      continue;
    }
    const feet = profile.y + profile.height;
    const verticalGap = Math.abs(feet - interactable.y);
    if (verticalGap > interactable.height * 0.8 + profile.height * 0.35) {
      continue;
    }
    const dx = profile.x - interactable.x;
    const distance = Math.abs(dx);
    if (distance > detectionRadius + profile.halfWidth) {
      continue;
    }

    const facing = dx >= 0 ? 1 : -1;
    triggered = true;
    if (profile.ref === stickman) {
      applyDamageToPlayer(
        { attackDamage: damage, attackKnockback: knockback, attackLaunch: launch, facing },
        { damage, knockback, launch, facing }
      );
      stickman.stunTimer = Math.max(stickman.stunTimer ?? 0, stun);
    } else {
      applyDamageToEnemy(profile.ref, {
        damage,
        knockback,
        launch: Math.abs(launch),
        facing
      });
      profile.ref.stunTimer = Math.max(profile.ref.stunTimer ?? 0, stun * 0.8);
    }
  }

  if (triggered) {
    interactable.cooldown = template.cooldown ?? 2.4;
    interactable.flashTimer = 0.25;
    interactable.state = "triggered";
    interactable.timer = template.cooldown ?? 2.4;

    spawnRingBurst({
      x: interactable.x,
      y: interactable.y - interactable.height * 0.5,
      startRadius: effectiveHalf * 0.6,
      endRadius: effectiveHalf * 1.6,
      color: template.glowColor ?? "#96f7ff",
      ttl: 0.35,
      lineWidth: 6
    });
    spawnSmokePuffs({
      x: interactable.x,
      y: interactable.y - interactable.height * 0.5,
      radius: effectiveHalf * 1.2,
      maxRadius: effectiveHalf * 1.8,
      ttl: 0.4
    });
    spawnDynamicLight({
      type: "point",
      x: interactable.x,
      y: interactable.y,
      radius: effectiveHalf * 3,
      intensity: 1.4,
      color: template.glowColor ?? "#8cf7ff",
      ttl: 0.22,
      flicker: 0.5,
      decay: 0.8
    });
  }
}

function updateInteractable(interactable, delta) {
  const template = interactable.template ?? {};

  interactable.flashTimer = Math.max(0, (interactable.flashTimer ?? 0) - delta);
  interactable.timer = Math.max(0, (interactable.timer ?? 0) - delta);

  const playerHeight = getTotalHeight(stickman.currentPose ?? POSES.standing);
  const playerFeet = stickman.y + playerHeight;
  const verticalGap = Math.abs(playerFeet - interactable.y);
  const horizGap = Math.abs(stickman.x - interactable.x);
  const near = verticalGap < interactable.height + playerHeight * 0.25 + 32 && horizGap < (interactable.width ? interactable.width : interactable.radius * 2) + 120;
  const highlightTarget = near ? 1 : 0;
  interactable.highlight += (highlightTarget - interactable.highlight) * clamp(delta * 6, 0, 1);
  interactable.highlight = clamp(interactable.highlight, 0, 1);

  if (template.category === "trap") {
    updateTrap(interactable, template, delta);
    return;
  }

  const frictionStrength = (interactable.friction ?? 2) * (template.category === "rolling" ? 24 : 32);
  interactable.vx = approachZero(interactable.vx, frictionStrength * delta);
  if (Math.abs(interactable.vx) < 2) {
    interactable.vx = 0;
  }

  interactable.x += interactable.vx * delta;

  const interactHalf = interactable.width ? interactable.width / 2 : interactable.radius;
  const padding = 24;
  const envWidthLimits = getEnvironmentWidth();
  let minX = interactable.minX ?? interactHalf + padding;
  let maxX = interactable.maxX ?? envWidthLimits - interactHalf - padding;
  if (minX > maxX) {
    const mid = (minX + maxX) / 2;
    minX = mid;
    maxX = mid;
  }
  if (interactable.x <= minX) {
    interactable.x = minX;
    interactable.vx = Math.max(0, interactable.vx);
  }
  if (interactable.x >= maxX) {
    interactable.x = maxX;
    interactable.vx = Math.min(0, interactable.vx);
  }

  const playerProfile = getActorProfile(stickman, { halfWidth: PLAYER_HALF_WIDTH, vx: stickman.vx });
  applyPushFromActor(interactable, template, playerProfile, delta);

  for (const ally of squadmates) {
    if (!ally || ally.state === "defeated") {
      continue;
    }
    applyPushFromActor(interactable, template, getActorProfile(ally, { halfWidth: ALLY_HALF_WIDTH }), delta);
  }
}

function updateInteractables(delta) {
  if (delta <= 0) {
    return;
  }
  for (const interactable of interactables) {
    updateInteractable(interactable, delta);
  }
}

function handleInteractableHitboxCollision(hitbox) {
  let hit = false;
  for (const interactable of interactables) {
    const template = interactable.template ?? {};
    if (template.category !== "movable" && template.category !== "rolling") {
      continue;
    }
    if (hitbox.hitTargets.has(interactable.id)) {
      continue;
    }
    const interactHalf = interactable.radius ?? (interactable.width ? interactable.width / 2 : 32);
    const centerY = interactable.y - (interactable.height ?? interactHalf);
    const dx = hitbox.x - interactable.x;
    const dy = hitbox.y - centerY;
    const distance = Math.hypot(dx, dy);
    if (distance > hitbox.radius + interactHalf) {
      continue;
    }

    hitbox.hitTargets.add(interactable.id);
    const direction = dx >= 0 ? 1 : -1;
    const impulse = template.hitImpulse ?? interactable.hitImpulse ?? 420;
    interactable.vx += direction * impulse;
    const maxSpeed = template.maxSpeed ?? interactable.maxSpeed ?? 260;
    interactable.vx = clamp(interactable.vx, -maxSpeed, maxSpeed);
    interactable.flashTimer = Math.max(interactable.flashTimer, 0.16);
    interactable.state = template.category === "rolling" ? "rolling" : "nudged";
    hit = true;
  }
  return hit;
}

export { getInteractables, updateInteractables, handleInteractableHitboxCollision };


