import { context } from "../../environment/canvas.js";
import { getCosmeticEditorState } from "../cosmetics/index.js";

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

function drawCosmeticToast(message, alpha = 1) {
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
  const x = 24;
  const y = context.canvas.height - boxHeight - 32;
  context.fillStyle = "rgba(12, 18, 32, 0.9)";
  context.fillRect(x, y, boxWidth, boxHeight);
  context.strokeStyle = "rgba(140, 168, 255, 0.55)";
  context.lineWidth = 1;
  context.strokeRect(x + 0.5, y + 0.5, boxWidth - 1, boxHeight - 1);
  context.fillStyle = "#dce6ff";
  context.fillText(text, x + padding, y + 20);
  context.restore();
}

function drawCosmeticOverlay() {
  const state = getCosmeticEditorState();
  const {
    visible,
    categories = [],
    categoryIndex = 0,
    optionIndex = 0,
    options = [],
    activeCategory = null,
    selections = {},
    message = null,
    messageTimer = 0
  } = state;
  const showMessage = Boolean(message) && messageTimer > 0.03;

  if (!visible && !showMessage) {
    return;
  }

  const width = context.canvas.width;
  const height = context.canvas.height;

  if (visible) {
    context.save();
    context.fillStyle = "rgba(6, 10, 18, 0.65)";
    context.fillRect(0, 0, width, height);

    const panelWidth = Math.min(width - 140, 620);
    const panelHeight = Math.min(height - 120, 420);
    const panelX = (width - panelWidth) * 0.5;
    const panelY = (height - panelHeight) * 0.5;

    context.fillStyle = "rgba(14, 20, 32, 0.94)";
    context.fillRect(panelX, panelY, panelWidth, panelHeight);
    context.strokeStyle = "rgba(140, 168, 255, 0.85)";
    context.lineWidth = 2;
    context.strokeRect(panelX + 0.5, panelY + 0.5, panelWidth - 1, panelHeight - 1);

    const padding = 26;
    let cursorY = panelY + padding + 4;
    const leftX = panelX + padding;

    context.fillStyle = "#f2f5ff";
    context.font = "20px 'Segoe UI', Arial, sans-serif";
    context.fillText("Cosmetic Customization", leftX, cursorY);
    cursorY += 28;

    context.fillStyle = "#9aa9c7";
    context.font = "13px 'Segoe UI', Arial, sans-serif";
    context.fillText("F7 close   ?/? categories   ?/? cycle variants   R reset", leftX, cursorY);
    cursorY += 26;

    const categoryColumnWidth = 200;
    const categoryRowHeight = 32;
    const optionColumnX = leftX + categoryColumnWidth + 28;
    const optionMaxWidth = panelX + panelWidth - padding - optionColumnX;

    context.font = "15px 'Segoe UI', Arial, sans-serif";
    categories.forEach((category, index) => {
      const rowY = cursorY + index * categoryRowHeight;
      const isActive = index === categoryIndex;
      if (isActive) {
        context.fillStyle = "rgba(92, 128, 220, 0.22)";
        context.fillRect(leftX - 10, rowY - 22, categoryColumnWidth + 20, categoryRowHeight);
      }
      context.fillStyle = isActive ? "#dfe7ff" : "#c5cee4";
      context.fillText(category.label, leftX, rowY);
      const selectedId = selections?.[category.id];
      const selectedOption = category.options?.find((option) => option.id === selectedId) ?? null;
      if (selectedOption) {
        context.fillStyle = isActive ? "#8cffd4" : "#9aa9c7";
        context.font = "12px 'Segoe UI', Arial, sans-serif";
        context.fillText(selectedOption.name, leftX, rowY + 14);
        context.font = "15px 'Segoe UI', Arial, sans-serif";
      }
    });

    let optionsY = cursorY;
    context.font = "15px 'Segoe UI', Arial, sans-serif";
    context.fillStyle = "#dce6ff";
    context.fillText(activeCategory?.label ?? "Variants", optionColumnX, optionsY);
    optionsY += 24;

    if (options.length === 0) {
      context.fillStyle = "#8a96b9";
      context.font = "13px 'Segoe UI', Arial, sans-serif";
      context.fillText("No cosmetics available for this category.", optionColumnX, optionsY);
      optionsY += 22;
    } else {
      options.forEach((option, idx) => {
        const isHighlighted = idx === optionIndex;
        const isSelected = option.selected;
        context.font = "14px 'Segoe UI', Arial, sans-serif";
        context.fillStyle = isHighlighted ? "#ffcf7a" : (isSelected ? "#8cffd4" : "#aab5d5");
        const prefix = isSelected ? "• " : "";
        context.fillText(`${prefix}${option.name}`, optionColumnX, optionsY);
        optionsY += 22;
      });
    }

    const descriptionY = optionsY + 10;
    const selectedOption = options[optionIndex] ?? null;
    if (selectedOption?.description) {
      context.fillStyle = "#9aa9c7";
      context.font = "12px 'Segoe UI', Arial, sans-serif";
      const lines = drawWrappedText(selectedOption.description, optionColumnX, descriptionY, optionMaxWidth, 16);
      optionsY = descriptionY + lines * 16 + 10;
    }

    const footerY = panelY + panelHeight - padding + 4;
    context.fillStyle = "#7f8aad";
    context.font = "12px 'Segoe UI', Arial, sans-serif";
    context.fillText("Selections save locally and apply instantly.", leftX, footerY);

    context.restore();
  }

  if (showMessage && !visible) {
    drawCosmeticToast(message, Math.min(1, messageTimer / 0.4));
  }
}

export { drawCosmeticOverlay };
