import { context } from "../../environment/canvas.js";
import { getStructures, getBuildState, getBlueprintByIndex } from "../../state/buildings.js";
import { calculatePreview } from "../building/index.js";
import { clamp } from "../utils/math.js";

function drawHealthBar(structure, halfWidth, height) {
  if (!structure || structure.maxHealth <= 0) {
    return;
  }
  const ratio = clamp(structure.health / structure.maxHealth, 0, 1);
  if (ratio >= 0.98) {
    return;
  }
  context.save();
  context.translate(structure.x, structure.y - height - 10);
  const barWidth = halfWidth * 2;
  context.fillStyle = "rgba(0, 0, 0, 0.55)";
  context.fillRect(-barWidth / 2, -4, barWidth, 6);
  context.fillStyle = ratio > 0.5 ? "#6cffb2" : ratio > 0.25 ? "#ffd66c" : "#ff6c6c";
  context.fillRect(-barWidth / 2, -4, barWidth * ratio, 6);
  context.restore();
}

function drawStructure(structure) {
  const halfWidth = (structure.width ?? 120) / 2;
  const height = structure.height ?? 120;
  const topY = structure.y - height;
  context.save();
  context.translate(structure.x, topY);
  context.fillStyle = structure.color ?? "#566072";
  context.fillRect(-halfWidth, 0, halfWidth * 2, height);
  if (structure.accentColor) {
    context.fillStyle = structure.accentColor;
    context.fillRect(-halfWidth + 6, height * 0.12, halfWidth * 2 - 12, 10);
    context.fillRect(-halfWidth + 6, height * 0.58, halfWidth * 2 - 12, 10);
  }
  context.strokeStyle = structure.strokeColor ?? "#232a36";
  context.lineWidth = 4;
  context.strokeRect(-halfWidth, 0, halfWidth * 2, height);

  if ((structure.flashTimer ?? 0) > 0) {
    const alpha = clamp(structure.flashTimer / 0.25, 0, 1) * 0.45;
    context.fillStyle = `rgba(255, 120, 120, ${alpha})`;
    context.fillRect(-halfWidth, 0, halfWidth * 2, height);
  }
  context.restore();
  drawHealthBar(structure, halfWidth, height);
}

function drawBuildings() {
  const structures = getStructures();
  if (!structures || structures.length === 0) {
    return;
  }
  for (const structure of structures) {
    drawStructure(structure);
  }
}

function drawBuildPreview() {
  const state = getBuildState();
  if (!state.active) {
    return;
  }
  const preview = calculatePreview();
  const blueprint = getBlueprintByIndex(state.blueprintIndex);
  if (!preview || !blueprint) {
    return;
  }
  const halfWidth = (preview.width ?? 120) / 2;
  const height = preview.height ?? 120;
  const topY = preview.y - height;
  context.save();
  context.translate(preview.x, topY);
  const fillColor = preview.valid ? "rgba(110, 210, 140, 0.36)" : "rgba(255, 110, 110, 0.36)";
  context.fillStyle = fillColor;
  context.fillRect(-halfWidth, 0, halfWidth * 2, height);
  context.strokeStyle = preview.valid ? "#5de28f" : "#ff6f6f";
  context.setLineDash(preview.valid ? [8, 6] : [4, 4]);
  context.lineWidth = 3;
  context.strokeRect(-halfWidth, 0, halfWidth * 2, height);
  context.restore();
}

export { drawBuildings, drawBuildPreview };
