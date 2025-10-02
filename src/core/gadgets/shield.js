import { context } from "../../environment/canvas.js";
import { stickman } from "../../state/entities.js";
import { clamp } from "../utils/math.js";

const shieldState = {
  active: false,
  strength: 0,
  maxStrength: 0,
  duration: 0,
  maxDuration: 0,
  radius: 90,
  color: "#7cd6ff",
  flashTimer: 0
};

function getShieldCenter() {
  const poseHeight = (stickman.currentPose?.headRadius ?? 16) * 2 + (stickman.currentPose?.bodyLength ?? 34) + (stickman.currentPose?.legLength ?? 36);
  return {
    x: stickman.x,
    y: stickman.y + poseHeight * 0.5
  };
}

function dispatchShieldEvent(type, detail = {}) {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(type, { detail }));
}

function activateShield(config = {}) {
  const strength = config.strength ?? 90;
  if (shieldState.active) {
    return false;
  }
  shieldState.active = true;
  shieldState.strength = strength;
  shieldState.maxStrength = strength;
  shieldState.duration = config.duration ?? 6;
  shieldState.maxDuration = shieldState.duration;
  shieldState.radius = config.radius ?? 96;
  shieldState.color = config.color ?? "#7cd6ff";
  shieldState.flashTimer = 0;
  stickman.gadgetCooldown = config.cooldownSeconds ?? 4.5;
  return true;
}

function updateShield(delta) {
  if (!shieldState.active) {
    return;
  }
  shieldState.duration -= delta;
  shieldState.flashTimer = Math.max(0, shieldState.flashTimer - delta);
  if (shieldState.duration <= 0) {
    deactivateShield("expired");
  } else if (shieldState.strength <= 0) {
    const center = getShieldCenter();
    dispatchShieldEvent("shield:shatter", {
      reason: "decayed",
      center,
      maxStrength: shieldState.maxStrength,
      radius: shieldState.radius,
    });
    deactivateShield("shatter");
  }
}

function deactivateShield(reason = "expired") {
  if (!shieldState.active) {
    return;
  }
  const detail = {
    reason,
    remainingStrength: shieldState.strength,
    maxStrength: shieldState.maxStrength,
    duration: shieldState.duration,
    maxDuration: shieldState.maxDuration,
    center: getShieldCenter(),
    radius: shieldState.radius
  };
  shieldState.active = false;
  shieldState.strength = 0;
  shieldState.duration = 0;
  shieldState.flashTimer = 0;
  dispatchShieldEvent("shield:end", detail);
}

function absorbShieldHit(hit) {
  if (!shieldState.active) {
    return hit;
  }
  const damage = hit.damage ?? 0;
  if (damage <= 0) {
    return hit;
  }
  const absorb = Math.min(damage, shieldState.strength);
  shieldState.strength -= absorb;
  shieldState.flashTimer = Math.max(shieldState.flashTimer, 0.2);

  const center = getShieldCenter();
  dispatchShieldEvent("shield:hit", {
    absorb,
    remainingStrength: Math.max(0, shieldState.strength),
    maxStrength: shieldState.maxStrength,
    duration: shieldState.duration,
    maxDuration: shieldState.maxDuration,
    center,
    radius: shieldState.radius,
  });

  const residualDamage = damage - absorb;
  const result = {
    ...hit,
    damage: residualDamage
  };
  if (residualDamage <= 0) {
    result.damage = 0;
    result.knockback = (hit.knockback ?? 0) * 0.25;
    result.launch = (hit.launch ?? 0) * 0.25;
  }
  if (shieldState.strength <= 0) {
    dispatchShieldEvent("shield:shatter", {
      reason: "damage",
      absorb,
      center,
      maxStrength: shieldState.maxStrength,
      radius: shieldState.radius
    });
    deactivateShield("shatter");
  }
  return result;
}

function drawShield() {
  if (!shieldState.active) {
    return;
  }
  context.save();
  const alpha = clamp(shieldState.flashTimer > 0 ? 0.45 : 0.25 + shieldState.strength / Math.max(1, shieldState.maxStrength) * 0.35, 0.15, 0.6);
  context.strokeStyle = shieldState.color;
  context.lineWidth = 4;
  context.globalAlpha = alpha;
  context.beginPath();
  const center = getShieldCenter();
  context.arc(center.x, center.y, shieldState.radius, 0, Math.PI * 2);
  context.stroke();
  context.globalAlpha = alpha * 0.4;
  context.fillStyle = shieldState.color;
  context.beginPath();
  context.arc(center.x, center.y, shieldState.radius * 0.9, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function clearShield() {
  deactivateShield("cleared");
}

function getShieldStatus() {
  return {
    active: shieldState.active,
    strength: shieldState.strength,
    maxStrength: shieldState.maxStrength,
    duration: shieldState.duration,
    maxDuration: shieldState.maxDuration
  };
}

export { activateShield, updateShield, drawShield, clearShield, absorbShieldHit, getShieldStatus };

