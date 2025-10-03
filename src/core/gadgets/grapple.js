import { canvas, GROUND_Y, context } from "../../environment/canvas.js";
import { stickman } from "../../state/entities.js";
import { getEnvironmentWidth } from "../../state/environment.js";
import { clamp } from "../utils/math.js";

const grappleState = {
  active: false,
  tetherLength: 0,
  maxLength: 0,
  targetX: 0,
  targetY: 0,
  duration: 0,
  retracting: false,
  cooldown: 0,
  color: "#8cf1ff",
  travelSpeed: 860,
  pullSpeed: 740
};

function canGrapple(config) {
  if (grappleState.active) {
    return false;
  }
  if ((stickman.gadgetCooldown ?? 0) > 0) {
    return false;
  }
  return true;
}

function startGrapple(config) {
  const envWidth = getEnvironmentWidth();
  const clampRect = config.clamp ?? { left: 80, right: envWidth - 80 };
  const apex = config.apex ?? { y: GROUND_Y - 280 };
  const launchLength = config.maxLength ?? 320;
  const facing = stickman.facing || 1;
  const anchorX = clamp(stickman.x + facing * launchLength, clampRect.left, clampRect.right);
  const anchorY = Math.min(apex.y ?? (GROUND_Y - 240), stickman.y - (config.maxRise ?? 260));

  grappleState.active = true;
  grappleState.retracting = false;
  grappleState.tetherLength = 0;
  grappleState.maxLength = Math.hypot(anchorX - stickman.x, anchorY - stickman.y);
  grappleState.targetX = anchorX;
  grappleState.targetY = anchorY;
  grappleState.duration = config.duration ?? 0.65;
  grappleState.cooldown = config.cooldownSeconds ?? 1.6;
  grappleState.color = config.color ?? "#8cf1ff";
  grappleState.travelSpeed = config.travelSpeed ?? 860;
  grappleState.pullSpeed = config.pullSpeed ?? 740;
  stickman.gadgetCooldown = grappleState.cooldown;
}

function updateGrapple(delta) {
  if (!grappleState.active) {
    return;
  }

  const travelSpeed = grappleState.travelSpeed ?? 860;
  const pullSpeed = grappleState.pullSpeed ?? 740;
  const progressSpeed = (grappleState.retracting ? pullSpeed : travelSpeed) * delta;

  if (!grappleState.retracting) {
    grappleState.tetherLength += progressSpeed;
    if (grappleState.tetherLength >= grappleState.maxLength) {
      grappleState.tetherLength = grappleState.maxLength;
      grappleState.retracting = true;
    }
  } else {
    grappleState.duration -= delta;
    const dx = grappleState.targetX - stickman.x;
    const dy = grappleState.targetY - stickman.y;
    const distance = Math.hypot(dx, dy);

    if (distance > 12) {
      const step = Math.min(distance, pullSpeed * delta);
      stickman.vx = (dx / distance) * step / delta;
      stickman.vy = (dy / distance) * step / delta;
      stickman.x += (dx / distance) * step;
      stickman.y += (dy / distance) * step;
    }

    grappleState.tetherLength = Math.max(0, grappleState.tetherLength - progressSpeed);
    if (grappleState.duration <= 0 || grappleState.tetherLength <= 0) {
      endGrapple();
    }
  }
}

function endGrapple() {
  grappleState.active = false;
  grappleState.retracting = false;
  grappleState.tetherLength = 0;
  grappleState.maxLength = 0;
}

function clearGrapple() {
  endGrapple();
}

function updateGrappleState(delta) {
  if (grappleState.cooldown > 0) {
    grappleState.cooldown = Math.max(0, grappleState.cooldown - delta);
  }
  updateGrapple(delta);
}

function drawGrapple() {
  if (!grappleState.active) {
    return;
  }
  context.save();
  context.strokeStyle = grappleState.color;
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(stickman.x, stickman.y);
  const ratio = grappleState.tetherLength / (grappleState.maxLength || 1);
  const currentX = stickman.x + (grappleState.targetX - stickman.x) * ratio;
  const currentY = stickman.y + (grappleState.targetY - stickman.y) * ratio;
  context.lineTo(currentX, currentY);
  context.stroke();
  context.restore();
}

function hasActiveGrapple() {
  return grappleState.active;
}

export { canGrapple, startGrapple, updateGrappleState, drawGrapple, hasActiveGrapple, clearGrapple };

