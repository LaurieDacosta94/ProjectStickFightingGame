import {
  getResolvedLoadoutSlots,
  cycleSlotWeapon,
  resetLoadout,
  applyLoadout,
  saveLoadout,
  loadLoadout
} from "../../state/loadout.js";
import { resetInputs } from "../input/index.js";

const MESSAGE_DURATION = 2.6;

const uiState = {
  visible: false,
  slotIndex: 0,
  optionIndex: 0,
  message: null,
  messageTimer: 0
};

let initialized = false;

function clampSlotIndex(total) {
  if (total <= 0) {
    uiState.slotIndex = 0;
    uiState.optionIndex = 0;
    return;
  }
  if (uiState.slotIndex >= total) {
    uiState.slotIndex = total - 1;
  }
  if (uiState.slotIndex < 0) {
    uiState.slotIndex = 0;
  }
}

function syncOptionIndex(slots) {
  const resolvedSlots = Array.isArray(slots) ? slots : getResolvedLoadoutSlots();
  clampSlotIndex(resolvedSlots.length);
  const activeSlot = resolvedSlots[uiState.slotIndex];
  if (!activeSlot) {
    uiState.optionIndex = 0;
    return resolvedSlots;
  }
  const allowed = activeSlot.allowedWeaponIds;
  if (!Array.isArray(allowed) || allowed.length === 0) {
    uiState.optionIndex = 0;
    return resolvedSlots;
  }
  const currentIndex = allowed.indexOf(activeSlot.weaponId);
  uiState.optionIndex = currentIndex >= 0 ? currentIndex : 0;
  return resolvedSlots;
}

function setMessage(message) {
  uiState.message = message ?? null;
  uiState.messageTimer = message ? MESSAGE_DURATION : 0;
}

function applyAndPersist(message) {
  applyLoadout({ preserveEquipped: true });
  saveLoadout();
  setMessage(message);
}

function openEditor() {
  if (uiState.visible) {
    return;
  }
  uiState.visible = true;
  syncOptionIndex();
  setMessage(null);
  resetInputs();
}

function closeEditor() {
  if (!uiState.visible) {
    return;
  }
  uiState.visible = false;
  resetInputs();
  setMessage(null);
}

function moveSlot(delta) {
  const slots = getResolvedLoadoutSlots();
  if (slots.length === 0) {
    return;
  }
  uiState.slotIndex = (uiState.slotIndex + delta + slots.length) % slots.length;
  syncOptionIndex(slots);
}

function cycleOption(delta) {
  const slots = getResolvedLoadoutSlots();
  const activeSlot = slots[uiState.slotIndex];
  if (!activeSlot) {
    return;
  }
  const result = cycleSlotWeapon(activeSlot.slotId, delta);
  if (!result || result.changed === false) {
    syncOptionIndex();
    return;
  }
  const updatedSlots = syncOptionIndex();
  const updatedSlot = updatedSlots[uiState.slotIndex];
  const weaponName = updatedSlot?.weapon?.name ?? "Updated";
  applyAndPersist(`${updatedSlot?.label ?? "Slot"} ? ${weaponName}`);
}

function handleReset() {
  resetLoadout();
  applyLoadout({ preserveEquipped: false });
  saveLoadout();
  const slots = syncOptionIndex();
  const firstWeapon = slots[0]?.weapon?.name;
  setMessage(firstWeapon ? `Defaults restored (${firstWeapon} equipped)` : "Defaults restored");
}

function handleKeyDown(event) {
  if (event.defaultPrevented) {
    return;
  }
  const code = event.code;
  if (!uiState.visible) {
    if (code === "KeyL") {
      openEditor();
      event.preventDefault();
      event.stopPropagation();
    }
    return;
  }

  switch (code) {
    case "Escape":
      closeEditor();
      break;
    case "KeyL":
    case "Enter":
      closeEditor();
      break;
    case "ArrowUp":
      moveSlot(-1);
      setMessage(null);
      break;
    case "ArrowDown":
      moveSlot(1);
      setMessage(null);
      break;
    case "Tab":
      moveSlot(event.shiftKey ? -1 : 1);
      setMessage(null);
      break;
    case "ArrowLeft":
      cycleOption(-1);
      break;
    case "ArrowRight":
      cycleOption(1);
      break;
    case "KeyR":
      handleReset();
      break;
    default:
      return;
  }
  event.preventDefault();
  event.stopPropagation();
}

function handlePointerEvent(event) {
  if (!uiState.visible) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
}

function initializeLoadoutSystem() {
  if (initialized) {
    return;
  }
  loadLoadout();
  applyLoadout({ preserveEquipped: true });
  syncOptionIndex();
  window.addEventListener("keydown", handleKeyDown, true);
  window.addEventListener("mousedown", handlePointerEvent, true);
  window.addEventListener("mouseup", handlePointerEvent, true);
  window.addEventListener("contextmenu", handlePointerEvent, true);
  initialized = true;
}

function updateLoadoutSystem(delta = 0) {
  if (uiState.messageTimer > 0) {
    uiState.messageTimer = Math.max(0, uiState.messageTimer - delta);
    if (uiState.messageTimer === 0) {
      uiState.message = null;
    }
  }
}

function isLoadoutEditorVisible() {
  return uiState.visible;
}

function getLoadoutEditorState() {
  const slots = syncOptionIndex();
  return {
    visible: uiState.visible,
    slotIndex: uiState.slotIndex,
    optionIndex: uiState.optionIndex,
    slots,
    message: uiState.message,
    messageTimer: uiState.messageTimer
  };
}

export {
  initializeLoadoutSystem,
  updateLoadoutSystem,
  isLoadoutEditorVisible,
  getLoadoutEditorState
};
