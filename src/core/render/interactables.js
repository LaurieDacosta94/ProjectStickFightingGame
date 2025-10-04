import { context } from "../../environment/canvas.js";
import { isWithinView, recordVisibility } from "./culling.js";
import { getInteractables } from "../../state/interactables.js";
import { clamp } from "../utils/math.js";
import { getElapsedTime } from "../utils/time.js";

function drawCrate(interactable, template, elapsed) {
  const halfWidth = (interactable.width ?? 96) / 2;
  const height = interactable.height ?? 72;
  const top = interactable.y - height;
  const sway = Math.sin(elapsed * 4 + interactable.x * 0.02) * (interactable.vx ?? 0) * 0.002;

  context.save();
  context.translate(interactable.x, interactable.y);
  context.rotate(sway);

  context.fillStyle = template.bodyColor ?? "#8b6f4a";
  context.fillRect(-halfWidth, -height, halfWidth * 2, height);

  context.strokeStyle = template.edgeColor ?? "#4a3b28";
  context.lineWidth = 4;
  context.strokeRect(-halfWidth, -height, halfWidth * 2, height);

  context.strokeStyle = template.braceColor ?? "#c59b61";
  context.lineWidth = 3;
  const braceInset = halfWidth * 0.4;
  context.beginPath();
  context.moveTo(-halfWidth, -height + 8);
  context.lineTo(-braceInset, -height + height * 0.4);
  context.moveTo(halfWidth, -height + 8);
  context.lineTo(braceInset, -height + height * 0.4);
  context.moveTo(-halfWidth, -height + height * 0.55);
  context.lineTo(-braceInset, -8);
  context.moveTo(halfWidth, -height + height * 0.55);
  context.lineTo(braceInset, -8);
  context.stroke();

  context.restore();
}

function drawBarrel(interactable, template, elapsed) {
  const radius = interactable.radius ?? 30;
  const height = interactable.height ?? radius * 2.2;
  const top = interactable.y - height;
  const wobble = Math.sin(elapsed * 6 + interactable.x * 0.05) * (interactable.vx ?? 0) * 0.003;

  context.save();
  context.translate(interactable.x, top + height / 2);
  context.rotate(wobble);

  context.fillStyle = template.bodyColor ?? "#a33b32";
  context.beginPath();
  context.ellipse(0, 0, radius, height * 0.5, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = template.topColor ?? "#c95b4f";
  context.beginPath();
  context.ellipse(0, -height * 0.5, radius * 0.95, radius * 0.55, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = template.edgeColor ?? "#3a1c18";
  context.beginPath();
  context.ellipse(0, height * 0.5, radius * 0.95, radius * 0.55, 0, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = template.stripeColor ?? "#ffd45f";
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(-radius * 0.85, -height * 0.25);
  context.lineTo(radius * 0.85, -height * 0.1);
  context.moveTo(-radius * 0.85, height * 0.05);
  context.lineTo(radius * 0.85, height * 0.2);
  context.stroke();

  context.restore();
}

function drawTrap(interactable, template, elapsed) {
  const halfWidth = (interactable.width ?? 110) / 2;
  const height = interactable.height ?? 20;
  const top = interactable.y - height;
  const glow = template.glowColor ?? "#8cf7ff";
  const accent = template.accentColor ?? "#6ddcff";
  const body = template.bodyColor ?? "#2a374b";
  const pulse = Math.sin(elapsed * 5 + interactable.x * 0.04) * 0.15 + 0.35 + (interactable.cooldown > 0 ? 0.1 : 0.35);

  context.save();
  context.translate(interactable.x, 0);

  context.fillStyle = body;
  context.fillRect(-halfWidth, top, halfWidth * 2, height);

  context.fillStyle = accent;
  context.fillRect(-halfWidth * 0.9, top + height * 0.25, halfWidth * 1.8, height * 0.35);

  context.globalAlpha = clamp(pulse, 0, 1);
  context.fillStyle = glow;
  context.fillRect(-halfWidth, top - 6, halfWidth * 2, height * 0.2);
  context.fillRect(-halfWidth, top + height - 4, halfWidth * 2, height * 0.2);
  context.globalAlpha = 1;

  context.restore();
}

function drawInteractable(interactable, elapsed) {
  const template = interactable.template ?? {};
  switch (template.category) {
    case "movable":
      drawCrate(interactable, template, elapsed);
      break;
    case "rolling":
      drawBarrel(interactable, template, elapsed);
      break;
    case "trap":
      drawTrap(interactable, template, elapsed);
      break;
    default:
      break;
  }

  const flash = interactable.flashTimer ?? 0;
  if (flash > 0) {
    const alpha = clamp(flash / 0.2, 0, 1) * 0.4;
    const halfWidth = interactable.width ? interactable.width / 2 : interactable.radius;
    const height = interactable.height ?? halfWidth * 1.4;
    context.save();
    context.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
    context.translate(interactable.x, interactable.y);
    context.fillRect(-halfWidth, -height, halfWidth * 2, height);
    context.restore();
  }

  const highlight = clamp(interactable.highlight ?? 0, 0, 1);
  if (highlight > 0.01) {
    const templateHighlight = template.highlightColor ?? template.accentColor ?? "#ffd89a";
    const halfWidth = interactable.width ? interactable.width / 2 : interactable.radius;
    const height = interactable.height ?? halfWidth * 1.4;
    context.save();
    context.globalAlpha = highlight * 0.45;
    context.fillStyle = templateHighlight;
    context.translate(interactable.x, interactable.y);
    context.fillRect(-halfWidth * 1.15, -height * 1.05, halfWidth * 2.3, height * 1.3);
    context.restore();
  }
}

function drawInteractables() {
  const items = getInteractables();
  if (!items || items.length === 0) {
    return;
  }
  const elapsed = getElapsedTime();
  context.save();
  for (const interactable of items) {
    const halfWidth = ((interactable.width ?? 80) * 0.5) + 36;
    const culled = !isWithinView(interactable.x, halfWidth, 280);
    recordVisibility("interactable", culled);
    if (culled) {
      continue;
    }
    drawInteractable(interactable, elapsed);
  }
  context.restore();
}

export { drawInteractables };
