
import { context } from "../../environment/canvas.js";
import { isWithinView, recordVisibility } from "./culling.js";
import { SUPPLY_DROP_SETTINGS, SUPPLY_DROP_TYPES } from "../../config/supplyDrops.js";
import { clamp } from "../utils/math.js";
import { getSupplyDrops } from "../world/supplyDrops.js";

function drawCrate(drop) {
  const baseAlpha = drop.state === "collected" ? clamp(drop.despawnTimer / SUPPLY_DROP_SETTINGS.collectedFanfare, 0, 1) : 1;
  context.save();
  context.globalAlpha = baseAlpha;

  if (drop.state === "descending") {
    const parachuteWidth = drop.width * 1.8;
    const canopyHeight = drop.height * 0.9;
    context.fillStyle = drop.glowColor;
    context.beginPath();
    context.moveTo(drop.x - parachuteWidth * 0.5, drop.y + canopyHeight * 0.2);
    context.quadraticCurveTo(drop.x, drop.y - canopyHeight * 0.8, drop.x + parachuteWidth * 0.5, drop.y + canopyHeight * 0.2);
    context.closePath();
    context.fill();

    context.strokeStyle = drop.glowColor;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(drop.x - parachuteWidth * 0.3, drop.y + canopyHeight * 0.25);
    context.lineTo(drop.x - drop.width * 0.25, drop.y + drop.height * 0.1);
    context.moveTo(drop.x + parachuteWidth * 0.3, drop.y + canopyHeight * 0.25);
    context.lineTo(drop.x + drop.width * 0.25, drop.y + drop.height * 0.1);
    context.stroke();
  }

  const topColor = drop.glowColor;
  const bodyColor = drop.crateColor;
  const highlightAlpha = drop.highlight ?? 0;

  context.fillStyle = bodyColor;
  context.fillRect(drop.x - drop.width * 0.5, drop.y, drop.width, drop.height);
  context.fillStyle = topColor;
  context.fillRect(drop.x - drop.width * 0.5, drop.y - drop.height * 0.25, drop.width, drop.height * 0.25);

  context.strokeStyle = "rgba(12, 16, 24, 0.65)";
  context.lineWidth = 3;
  context.strokeRect(drop.x - drop.width * 0.5, drop.y, drop.width, drop.height);

  if (highlightAlpha > 0) {
    context.globalAlpha = highlightAlpha * 0.6;
    context.fillStyle = drop.glowColor;
    context.beginPath();
    context.arc(drop.x, drop.y + drop.height * 0.5, SUPPLY_DROP_SETTINGS.pickupRadius, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function drawSupplyDrops() {
  const drops = getSupplyDrops();
  if (drops.length === 0) {
    return;
  }

  context.save();
  context.textAlign = "center";
  context.font = "15px 'Segoe UI', Arial, sans-serif";

  for (const drop of drops) {
    const culled = !isWithinView(drop.x, 60, 360);
    recordVisibility("resource", culled);
    if (culled) {
      continue;
    }
    drawCrate(drop);
    const typeDef = SUPPLY_DROP_TYPES[drop.typeId];
    if (drop.state !== "descending") {
      context.fillStyle = drop.glowColor;
      context.globalAlpha = 0.9;
      context.fillText(typeDef?.label ?? drop.label ?? "Supply Drop", drop.x, drop.y - 16);
    }
  }

  context.restore();
}

export { drawSupplyDrops };
