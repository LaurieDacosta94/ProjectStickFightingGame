import { context } from "../../environment/canvas.js";
import { clamp } from "../utils/math.js";
import { GRAVITY } from "../../config/constants.js";

const RAGDOLL_BLUEPRINTS = {
  player: [
    { radius: 16, offsetX: 0, offsetY: -42, color: "#f4f7ff" },
    { radius: 12, offsetX: 0, offsetY: -14, color: "#cfd3df" },
    { radius: 10, offsetX: -14, offsetY: 6, color: "#f4f7ff" },
    { radius: 10, offsetX: 14, offsetY: 6, color: "#f4f7ff" },
    { radius: 11, offsetX: -10, offsetY: 34, color: "#cfd3df" },
    { radius: 11, offsetX: 10, offsetY: 34, color: "#cfd3df" }
  ],
  enemy: [
    { radius: 16, offsetX: 0, offsetY: -40, color: "#fa5b4a" },
    { radius: 12, offsetX: 0, offsetY: -12, color: "#d94d3f" },
    { radius: 10, offsetX: -12, offsetY: 8, color: "#ff9488" },
    { radius: 10, offsetX: 12, offsetY: 8, color: "#ff9488" },
    { radius: 11, offsetX: -10, offsetY: 36, color: "#d94d3f" },
    { radius: 11, offsetX: 10, offsetY: 36, color: "#d94d3f" }
  ]
};

const ragdolls = [];

function spawnRagdoll(kind, originX, originY, facing = 1, baseVx = 0, baseVy = 0) {
  const blueprint = RAGDOLL_BLUEPRINTS[kind];
  if (!blueprint) {
    return;
  }

  for (const part of blueprint) {
    ragdolls.push({
      x: originX + part.offsetX * facing,
      y: originY + part.offsetY,
      vx: baseVx + facing * (40 + Math.random() * 80) + (Math.random() - 0.5) * 60,
      vy: baseVy - (80 + Math.random() * 140),
      radius: part.radius,
      color: part.color,
      life: 1.6 + Math.random() * 0.8,
      maxLife: 1.6 + Math.random() * 0.8
    });
  }
}

function updateRagdolls(delta, groundY) {
  for (const piece of ragdolls) {
    piece.life -= delta;
    piece.vy += GRAVITY * delta * 0.9;
    piece.x += piece.vx * delta;
    piece.y += piece.vy * delta;
    piece.vx *= 0.96;

    if (piece.y + piece.radius >= groundY) {
      piece.y = groundY - piece.radius;
      piece.vy = -piece.vy * 0.35;
      piece.vx *= 0.7;
      if (Math.abs(piece.vy) < 20) {
        piece.vy = 0;
      }
    }
  }

  for (let i = ragdolls.length - 1; i >= 0; i -= 1) {
    if (ragdolls[i].life <= 0.05) {
      ragdolls.splice(i, 1);
    }
  }
}

function drawRagdolls() {
  context.save();
  for (const piece of ragdolls) {
    const alpha = clamp(piece.life / piece.maxLife, 0, 1);
    context.globalAlpha = alpha * 0.85;
    context.fillStyle = piece.color;
    context.beginPath();
    context.arc(piece.x, piece.y, piece.radius, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function getRagdolls() {
  return ragdolls;
}

export { spawnRagdoll, updateRagdolls, drawRagdolls, getRagdolls };
