import { context } from "../../environment/canvas.js";
import { getScenarioEditorState } from "../scenario/index.js";
import { getScenarioSlots } from "../../state/scenarios.js";

function drawWrappedText(text, x, y, maxWidth, lineHeight) {
  const words = String(text ?? "").split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return 0;
  }
  let line = "";
  let cursorY = y;
  let lines = 0;
  for (const word of words) {
    const candidate = line.length > 0 ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      context.fillText(line, x, cursorY);
      line = word;
      cursorY += lineHeight;
      lines += 1;
    } else {
      line = candidate;
    }
  }
  if (line) {
    context.fillText(line, x, cursorY);
    lines += 1;
  }
  return lines;
}

function drawScenarioToast(message, alpha = 1) {
  const text = String(message ?? "").trim();
  if (!text) {
    return;
  }
  context.save();
  context.globalAlpha = Math.max(0, Math.min(1, alpha));
  context.font = "14px 'Segoe UI', Arial, sans-serif";
  const padding = 12;
  const textWidth = context.measureText(text).width;
  const boxWidth = Math.min(context.canvas.width - 48, textWidth + padding * 2);
  const boxHeight = 32;
  const x = context.canvas.width - boxWidth - 24;
  const y = context.canvas.height - boxHeight - 32;
  context.fillStyle = "rgba(12, 20, 36, 0.88)";
  context.fillRect(x, y, boxWidth, boxHeight);
  context.strokeStyle = "rgba(140, 168, 255, 0.55)";
  context.lineWidth = 1;
  context.strokeRect(x + 0.5, y + 0.5, boxWidth - 1, boxHeight - 1);
  context.fillStyle = "#dce6ff";
  context.fillText(text, x + padding, y + 20);
  context.restore();
}

function formatPercent(value) {
  return `${Math.round((value ?? 0) * 100)}%`;
}

function drawScenarioOverlay() {
  const state = getScenarioEditorState();
  const {
    visible,
    fieldIndex = 0,
    fields = [],
    scenario,
    environmentName,
    message,
    messageTimer = 0,
    slotIndex = 0
  } = state;

  const showMessage = Boolean(message) && messageTimer > 0.03;
  if (!visible && !showMessage) {
    return;
  }

  const width = context.canvas.width;
  const height = context.canvas.height;

  if (visible) {
    context.save();
    context.fillStyle = "rgba(8, 12, 20, 0.65)";
    context.fillRect(0, 0, width, height);

    const panelWidth = Math.min(width - 140, 620);
    const panelHeight = Math.min(height - 120, 420);
    const panelX = (width - panelWidth) * 0.5;
    const panelY = (height - panelHeight) * 0.5;

    context.fillStyle = "rgba(14, 20, 36, 0.94)";
    context.fillRect(panelX, panelY, panelWidth, panelHeight);
    context.strokeStyle = "rgba(140, 168, 255, 0.85)";
    context.lineWidth = 2;
    context.strokeRect(panelX + 0.5, panelY + 0.5, panelWidth - 1, panelHeight - 1);

    const padding = 26;
    let cursorY = panelY + padding;
    const leftX = panelX + padding;
    const valueX = panelX + panelWidth - padding;

    context.fillStyle = "#f2f5ff";
    context.font = "20px 'Segoe UI', Arial, sans-serif";
    context.fillText("Scenario Editor", leftX, cursorY);
    cursorY += 30;

    context.fillStyle = "#9aa9c7";
    context.font = "13px 'Segoe UI', Arial, sans-serif";
    context.fillText("F8 close   ?/? fields   ?/? adjust   Enter apply   E edit text   R reset", leftX, cursorY);
    cursorY += 26;

    context.font = "14px 'Segoe UI', Arial, sans-serif";
    context.fillStyle = "#8cffd4";
    const scenarioLabel = scenario ? `${slotIndex + 1}. ${scenario.name}` : `Slot ${slotIndex + 1}`;
    context.fillText(scenarioLabel, leftX, cursorY);
    cursorY += 24;

    const totalSlots = getScenarioSlots().length;

    context.font = "15px 'Segoe UI', Arial, sans-serif";
    fields.forEach((field, index) => {
      let valueText = "--";
      if (!scenario) {
        valueText = "N/A";
      } else {
        switch (field.id) {
          case "scenarioSlot":
            valueText = `${slotIndex + 1} / ${totalSlots}`;
            break;
          case "name":
            valueText = scenario.name;
            break;
          case "environmentId":
            valueText = environmentName;
            break;
          case "startingMaterials":
            valueText = `${scenario.startingMaterials}`;
            break;
          case "enemyCount":
            valueText = `${scenario.enemyCount}`;
            break;
          case "playerSpawnRatio":
            valueText = formatPercent(scenario.playerSpawnRatio);
            break;
          case "dummySpawnRatio":
            valueText = formatPercent(scenario.dummySpawnRatio);
            break;
          case "enemySpawnLeft":
            valueText = formatPercent(scenario.enemySpawnRatios?.[0]);
            break;
          case "enemySpawnRight":
            valueText = formatPercent(scenario.enemySpawnRatios?.[1]);
            break;
          case "description":
            valueText = scenario.description ?? "";
            break;
          default:
            valueText = "";
            break;
        }
      }

      const rowY = cursorY + index * 28;
      const isActive = index === fieldIndex;
      if (isActive) {
        context.fillStyle = "rgba(92, 128, 220, 0.3)";
        context.fillRect(leftX - 12, rowY - 22, panelWidth - padding * 2 + 24, 28);
      }

      context.fillStyle = isActive ? "#dfe7ff" : "#c5cee4";
      context.fillText(field.label, leftX, rowY);

      context.fillStyle = isActive ? "#8cffd4" : "#9aa9c7";
      context.font = field.id === "description" ? "13px 'Segoe UI', Arial, sans-serif" : "15px 'Segoe UI', Arial, sans-serif";
      const textWidth = context.measureText(valueText).width;
      context.fillText(valueText, Math.max(leftX, valueX - textWidth), rowY);
      context.font = "15px 'Segoe UI', Arial, sans-serif";
    });

    let descriptionTop = cursorY + fields.length * 28 + 12;
    if (scenario?.description) {
      context.fillStyle = "#9aa9c7";
      context.font = "12px 'Segoe UI', Arial, sans-serif";
      const maxWidth = panelWidth - padding * 2;
      const lines = drawWrappedText(scenario.description, leftX, descriptionTop, maxWidth, 16);
      descriptionTop += lines * 16 + 8;
    }

    const footerY = panelY + panelHeight - padding + 4;
    context.fillStyle = "#7f8aad";
    context.font = "12px 'Segoe UI', Arial, sans-serif";
    context.fillText("Apply to rebuild the arena with new spawns and resources.", leftX, footerY);

    context.restore();
  }

  if (showMessage && !visible) {
    drawScenarioToast(message, Math.min(1, messageTimer / 0.4));
  }
}

export { drawScenarioOverlay };
