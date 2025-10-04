import { context } from "../../environment/canvas.js";
import { getLoadoutEditorState } from "../loadout/index.js";
import { WEAPON_DEFINITIONS } from "../../config/weapons.js";

function drawWrappedText(text, x, y, maxWidth, lineHeight) {
  if (!text) {
    return 0;
  }
  const words = String(text).split(/\s+/);
  let line = "";
  let lines = 0;
  for (const word of words) {
    const candidate = line.length > 0 ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      context.fillText(line, x, y);
      line = word;
      y += lineHeight;
      lines += 1;
    } else {
      line = candidate;
    }
  }
  if (line) {
    context.fillText(line, x, y);
    lines += 1;
  }
  return lines;
}

function drawLoadoutMessage(message, alpha = 1) {
  const text = String(message ?? "").trim();
  if (!text) {
    return;
  }
  context.save();
  context.globalAlpha = alpha;
  context.font = "14px 'Segoe UI', Arial, sans-serif";
  const padding = 12;
  const textWidth = context.measureText(text).width;
  const boxWidth = Math.min(context.canvas.width - 48, textWidth + padding * 2);
  const boxHeight = 32;
  const x = 24;
  const y = 24;
  context.fillStyle = "rgba(10, 16, 28, 0.84)";
  context.fillRect(x, y, boxWidth, boxHeight);
  context.strokeStyle = "rgba(140, 168, 255, 0.55)";
  context.lineWidth = 1;
  context.strokeRect(x + 0.5, y + 0.5, boxWidth - 1, boxHeight - 1);
  context.fillStyle = "#dce6ff";
  context.fillText(text, x + padding, y + 20);
  context.restore();
}

function drawLoadoutOptions(activeSlot, optionIndex, originX, originY) {
  if (!activeSlot) {
    return originY;
  }
  const options = Array.isArray(activeSlot.allowedWeaponIds) ? activeSlot.allowedWeaponIds : [];
  if (options.length === 0) {
    context.fillStyle = "#8a96b9";
    context.font = "13px 'Segoe UI', Arial, sans-serif";
    context.fillText("No compatible items for this slot.", originX, originY);
    return originY + 20;
  }
  context.font = "13px 'Segoe UI', Arial, sans-serif";
  const lineHeight = 22;
  let cursorY = originY;
  options.forEach((weaponId, idx) => {
    const weapon = WEAPON_DEFINITIONS[weaponId];
    const label = weapon?.name ?? weaponId;
    context.fillStyle = idx === optionIndex ? "#ffcf7a" : "#aab5d5";
    context.fillText(label, originX, cursorY);
    cursorY += lineHeight;
  });
  return cursorY;
}

function drawLoadoutOverlay() {
  const state = getLoadoutEditorState();
  const { visible, slots, slotIndex, optionIndex, message, messageTimer } = state;
  const showMessage = Boolean(message) && messageTimer > 0.03;
  if (!visible && !showMessage) {
    return;
  }

  const width = context.canvas.width;
  const height = context.canvas.height;

  context.save();

  if (visible) {
    context.fillStyle = "rgba(6, 10, 18, 0.65)";
    context.fillRect(0, 0, width, height);

    const panelWidth = Math.min(width - 120, 560);
    const baseSlotHeight = 36;
    const headerHeight = 80;
    const detailHeight = 160;
    const footerHeight = 48;
    const panelHeight = Math.min(height - 120, headerHeight + slots.length * baseSlotHeight + detailHeight + footerHeight);
    const panelX = (width - panelWidth) * 0.5;
    const panelY = (height - panelHeight) * 0.5;

    context.fillStyle = "rgba(12, 18, 32, 0.94)";
    context.fillRect(panelX, panelY, panelWidth, panelHeight);
    context.strokeStyle = "rgba(120, 150, 240, 0.9)";
    context.lineWidth = 2;
    context.strokeRect(panelX + 0.5, panelY + 0.5, panelWidth - 1, panelHeight - 1);

    const padding = 26;
    let cursorY = panelY + padding + 6;
    const leftX = panelX + padding;

    context.fillStyle = "#f2f5ff";
    context.font = "20px 'Segoe UI', Arial, sans-serif";
    context.fillText("Loadout Editor", leftX, cursorY);
    cursorY += 28;

    context.fillStyle = "#9aa9c7";
    context.font = "13px 'Segoe UI', Arial, sans-serif";
    context.fillText("?/? choose slot   ?/? cycle weapons   R reset   Enter/Esc close", leftX, cursorY);
    cursorY += 30;

    context.font = "15px 'Segoe UI', Arial, sans-serif";
    const slotAreaLeft = leftX;
    const slotAreaRight = panelX + panelWidth - padding;
    const activeColor = "rgba(92, 128, 220, 0.22)";
    const inactiveLabel = "#c5cee4";
    const activeLabel = "#dfe7ff";
    const activeValue = "#8cffd4";
    const inactiveValue = "#9da9cc";

    slots.forEach((slot, idx) => {
      const rowY = cursorY + idx * baseSlotHeight;
      if (idx === slotIndex) {
        context.fillStyle = activeColor;
        context.fillRect(slotAreaLeft - 12, rowY - 24, panelWidth - padding * 2 + 24, baseSlotHeight);
      }
      const labelColor = idx === slotIndex ? activeLabel : inactiveLabel;
      const valueColor = idx === slotIndex ? activeValue : inactiveValue;
      const slotLabel = slot.label ?? slot.slotId;
      const weaponName = slot.weapon?.name ?? "Empty";
      context.fillStyle = labelColor;
      context.fillText(slotLabel, slotAreaLeft, rowY);
      context.fillStyle = valueColor;
      context.fillText(weaponName, slotAreaRight - context.measureText(weaponName).width, rowY);
    });

    cursorY += slots.length * baseSlotHeight + 22;
    const activeSlot = slots[slotIndex] ?? null;

    context.font = "14px 'Segoe UI', Arial, sans-serif";
    context.fillStyle = "#dce6ff";
    context.fillText("Available weapons", leftX, cursorY);
    cursorY += 24;

    const optionsBottom = drawLoadoutOptions(activeSlot, optionIndex, leftX, cursorY);
    cursorY = Math.max(cursorY + 24, optionsBottom + 6);

    if (activeSlot?.weapon) {
      const weapon = activeSlot.weapon;
      context.font = "13px 'Segoe UI', Arial, sans-serif";
      context.fillStyle = "#8cffd4";
      context.fillText(`Selected: ${weapon.name}`, leftX, cursorY);
      cursorY += 20;
      context.fillStyle = "#9aa9c7";
      context.font = "12px 'Segoe UI', Arial, sans-serif";
      context.fillText(`Category: ${weapon.category ?? "unknown"}`, leftX, cursorY);
      cursorY += 18;
      if (weapon.description) {
        const maxWidth = panelWidth - padding * 2;
        cursorY += drawWrappedText(weapon.description, leftX, cursorY, maxWidth, 16) * 16;
      }
    }

    const footerY = panelY + panelHeight - padding;
    context.font = "12px 'Segoe UI', Arial, sans-serif";
    context.fillStyle = "#7f8aad";
    context.fillText("Changes apply instantly and persist locally.", leftX, footerY);
  }

  if (showMessage && !visible) {
    const fade = Math.max(0, Math.min(1, messageTimer / 0.4));
    drawLoadoutMessage(message, fade);
  }

  context.restore();
}

export { drawLoadoutOverlay };
