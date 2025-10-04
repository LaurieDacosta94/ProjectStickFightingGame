import { context } from "../../environment/canvas.js";
import { isWithinView, recordVisibility } from "./culling.js";
import { getDestructibles } from "../../state/destructibles.js";
import { getElapsedTime } from "../utils/time.js";
import { clamp } from "../utils/math.js";

function drawBarrierBody(destructible, template, elapsed) {
  const width = destructible.width;
  const height = destructible.height;
  const top = -height;
  const bodyColor = template.bodyColor ?? "#555";
  const accentColor = template.accentColor ?? "#888";
  const edgeColor = template.edgeColor ?? "#333";
  const crackColor = template.damageHighlight ?? "#d5dde8";
  const damageRatio = clamp(1 - (destructible.health / destructible.maxHealth), 0, 1);
  context.fillStyle = bodyColor;
  context.fillRect(-width / 2, top, width, height);

  context.fillStyle = accentColor;
  context.fillRect(-width / 2, top, width, Math.max(10, height * 0.12));
  context.fillRect(-width / 2, top + height * 0.55, width, Math.max(8, height * 0.1));

  context.strokeStyle = edgeColor;
  context.lineWidth = 4;
  context.strokeRect(-width / 2, top, width, height);

  if (damageRatio > 0) {
    const crackCount = 3 + Math.floor(damageRatio * 3);
    const phase = elapsed * 3 + destructible.x * 0.02;
    context.strokeStyle = crackColor;
    context.lineWidth = 2;
    for (let i = 0; i < crackCount; i += 1) {
      const offset = (i + 1) / (crackCount + 1);
      const startX = -width * 0.45 + width * offset;
      const crackHeight = height * (0.2 + damageRatio * 0.5);
      const wobble = Math.sin(phase + i * 1.7) * 12;
      context.beginPath();
      context.moveTo(startX, top + height * 0.18);
      context.lineTo(startX + wobble * 0.3, top + height * 0.18 + crackHeight * 0.45);
      context.lineTo(startX + wobble, top + height * 0.18 + crackHeight);
      context.stroke();
    }
  }
}

function drawRubble(destructible, template, progress) {
  const width = destructible.width;
  const rubbleHeight = Math.max(8, (template.rubbleHeight ?? 32) * progress);
  const debrisColor = template.debrisColor ?? template.bodyColor ?? "#4a4a4a";
  context.fillStyle = debrisColor;
  context.beginPath();
  context.moveTo(-width / 2, 0);
  context.lineTo(-width * 0.35, -rubbleHeight * 0.3);
  context.lineTo(-width * 0.12, -rubbleHeight);
  context.lineTo(width * 0.08, -rubbleHeight * 0.65);
  context.lineTo(width * 0.32, -rubbleHeight * 0.9);
  context.lineTo(width / 2, 0);
  context.closePath();
  context.fill();

  context.fillStyle = "rgba(30, 32, 40, 0.6)";
  context.fillRect(-width / 2, 0, width, Math.max(6, rubbleHeight * 0.2));
}

function drawStreetCar(destructible, template, elapsed) {
  const width = destructible.width;
  const height = destructible.height;
  const top = -height;
  const facing = destructible.facing ?? 1;
  const damageRatio = clamp(1 - (destructible.health / destructible.maxHealth), 0, 1);

  context.save();
  context.scale(facing, 1);

  const bodyColor = template.bodyColor ?? "#b13d30";
  const windowColor = template.glassColor ?? "#4ac3ff";
  const accentColor = template.accentColor ?? "#f7f9ff";
  const edgeColor = template.edgeColor ?? "#1c1d25";

  const bodyTop = top + height * 0.15;
  const cabinHeight = height * 0.55;
  const wheelRadius = Math.max(12, height * 0.18);

  context.fillStyle = bodyColor;
  context.beginPath();
  context.moveTo(-width / 2, bodyTop + height * 0.1);
  context.lineTo(-width * 0.42, top + cabinHeight * 0.45);
  context.lineTo(-width * 0.25, top);
  context.lineTo(width * 0.22, top);
  context.lineTo(width * 0.45, top + cabinHeight * 0.5);
  context.lineTo(width / 2, bodyTop + height * 0.1);
  context.closePath();
  context.fill();

  context.fillStyle = windowColor;
  const windowHeight = cabinHeight * 0.55;
  context.fillRect(-width * 0.28, top + cabinHeight * 0.12, width * 0.42, windowHeight);

  context.fillStyle = accentColor;
  context.fillRect(-width / 2, bodyTop + cabinHeight * 0.55, width, height * 0.2);

  context.fillStyle = edgeColor;
  context.beginPath();
  context.arc(-width * 0.28, wheelRadius * -0.15, wheelRadius, 0, Math.PI * 2);
  context.arc(width * 0.28, wheelRadius * -0.15, wheelRadius, 0, Math.PI * 2);
  context.fill();

  if (!destructible.destroyed && damageRatio > 0.05) {
    context.strokeStyle = "rgba(0, 0, 0, 0.35)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(-width * 0.12, top + cabinHeight * 0.8);
    context.lineTo(-width * 0.22, bodyTop + height * 0.55);
    context.lineTo(-width * 0.05, bodyTop + height * 0.7);
    context.stroke();

    context.beginPath();
    context.moveTo(width * 0.18, top + cabinHeight * 0.6);
    context.lineTo(width * 0.3, bodyTop + height * 0.4);
    context.lineTo(width * 0.12, bodyTop + height * 0.65);
    context.stroke();
  }

  context.restore();
}
function drawBarrelCluster(destructible, template, elapsed) {
  const width = destructible.width;
  const height = destructible.height;
  const damageRatio = clamp(1 - (destructible.health / destructible.maxHealth), 0, 1);
  const barrelRadius = width * 0.22;
  const barrelHeight = height * 0.48;
  const top = -height;
  const bodyColor = template.bodyColor ?? "#c0671c";
  const stripeColor = template.stripeColor ?? template.accentColor ?? "#ffd45f";
  const edgeColor = template.edgeColor ?? "#2f1a08";

  const positions = [
    { x: -width * 0.22, y: top + height * 0.45 },
    { x: width * 0.22, y: top + height * 0.5 },
    { x: 0, y: top + height * 0.1 }
  ];

  const visibleCount = destructible.destroyed ? 1 : 3;
  for (let i = 0; i < visibleCount; i += 1) {
    const pos = positions[i];
    context.save();
    context.translate(pos.x, pos.y);
    context.fillStyle = bodyColor;
    context.beginPath();
    context.ellipse(0, 0, barrelRadius, barrelHeight * 0.5, 0, 0, Math.PI * 2);
    context.fill();

    context.fillRect(-barrelRadius, -barrelHeight * 0.5, barrelRadius * 2, barrelHeight);

    context.fillStyle = stripeColor;
    context.fillRect(-barrelRadius, -barrelHeight * 0.12, barrelRadius * 2, barrelHeight * 0.24);

    context.strokeStyle = edgeColor;
    context.lineWidth = 3;
    context.strokeRect(-barrelRadius, -barrelHeight * 0.5, barrelRadius * 2, barrelHeight);
    context.restore();
  }

  if (!destructible.destroyed && damageRatio > 0.2) {
    const flicker = 0.2 + Math.abs(Math.sin(elapsed * 8 + destructible.x * 0.05)) * 0.3 * damageRatio;
    context.fillStyle = `rgba(255, 174, 72, ${flicker.toFixed(3)})`;
    context.beginPath();
    context.ellipse(0, top + height * 0.1, width * 0.12, height * 0.18, 0, 0, Math.PI * 2);
    context.fill();
  }
}
function drawHealthTick(width, ratio, yOffset) {
  const clamped = clamp(ratio, 0, 1);
  const barWidth = width * 0.85;
  context.fillStyle = "rgba(0, 0, 0, 0.45)";
  context.fillRect(-barWidth / 2, yOffset, barWidth, 5);
  context.fillStyle = clamped > 0.5 ? "#58ec8c" : clamped > 0.25 ? "#ffd15c" : "#ff675c";
  context.fillRect(-barWidth / 2, yOffset, barWidth * clamped, 5);
}

function drawSmokeColumn(destructible, template, elapsed) {
  if ((destructible.smokeTimer ?? 0) <= 0) {
    return;
  }
  const duration = template.smokeDuration ?? 1.5;
  const lifeRatio = clamp((destructible.smokeTimer ?? 0) / duration, 0, 1);
  const baseAlpha = 0.25 + lifeRatio * 0.35;
  const layers = 4;
  for (let i = 0; i < layers; i += 1) {
    const phase = elapsed * (0.4 + i * 0.15) + destructible.x * 0.03 + i * 1.3;
    const radius = (destructible.width * 0.35) * (1 + lifeRatio * 0.6 + i * 0.15);
    context.globalAlpha = clamp(baseAlpha - i * 0.06, 0, 0.45);
    context.fillStyle = "#9fb6c8";
    context.beginPath();
    context.arc(
      Math.sin(phase) * destructible.width * 0.12,
      -destructible.height * (0.65 + i * 0.2) - Math.cos(phase * 0.6) * 6,
      radius * 0.3,
      0,
      Math.PI * 2
    );
    context.fill();
  }
  context.globalAlpha = 1;
}

function drawDestructible(destructible, elapsed) {
  const template = destructible.template;
  if (!template) {
    return;
  }

  const shakeMag = destructible.shakeMagnitude ?? 0;
  const shakeTimer = destructible.shakeTimer ?? 0;
  const wobblePhase = elapsed * 8 + destructible.x * 0.05;
  const shakeX = shakeTimer > 0 ? Math.sin(wobblePhase) * shakeMag * 0.35 : 0;
  const shakeY = shakeTimer > 0 ? Math.cos(wobblePhase * 0.75) * shakeMag * 0.22 : 0;

  context.save();
  context.translate(destructible.x + shakeX, destructible.y + shakeY);

  if (destructible.destroyed) {
    drawRubble(destructible, template, clamp(destructible.rubbleLevel ?? 0, 0, 1));
  }

  if (!destructible.destroyed || (destructible.rubbleLevel ?? 0) < 1) {
    switch (template.material) {
      case "vehicle":
        drawStreetCar(destructible, template, elapsed);
        break;
      case "volatile":
        drawBarrelCluster(destructible, template, elapsed);
        break;
      default:
        drawBarrierBody(destructible, template, elapsed);
        break;
    }
  }

  if (!destructible.destroyed && destructible.maxHealth > 0) {
    const healthRatio = clamp(destructible.health / destructible.maxHealth, 0, 1);
    if (healthRatio < 0.95) {
      drawHealthTick(destructible.width, healthRatio, -destructible.height - 10);
    }
  }

  const flashTimer = destructible.flashTimer ?? 0;
  if (flashTimer > 0) {
    const alpha = clamp(flashTimer / 0.2, 0, 1) * 0.45;
    context.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
    context.fillRect(-destructible.width / 2, -destructible.height, destructible.width, destructible.height);
  }

  drawSmokeColumn(destructible, template, elapsed);
  context.restore();
}

function drawDestructibles() {
  const elapsed = getElapsedTime();
  const items = getDestructibles();
  if (!items || items.length === 0) {
    return;
  }

  context.save();
  for (const destructible of items) {
    const halfWidth = ((destructible.width ?? 120) * 0.5) + 50;
    const culled = !isWithinView(destructible.x, halfWidth, 320);
    recordVisibility("destructible", culled);
    if (culled) {
      continue;
    }
    drawDestructible(destructible, elapsed);
  }
  context.restore();
}

export { drawDestructibles };











