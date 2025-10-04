import {
  getCosmeticCategories,
  getCosmeticSelections,
  getCosmeticOption,
  cycleCosmeticSelection,
  setCosmeticSelection,
  resetCosmetics,
  saveCosmetics,
  loadCosmetics
} from "../../state/cosmetics.js";
import { resetInputs } from "../input/index.js";

const MESSAGE_DURATION = 2.6;

const uiState = {
  visible: false,
  categoryIndex: 0,
  optionIndex: 0,
  message: null,
  messageTimer: 0
};

let initialized = false;

function getCategories() {
  return getCosmeticCategories();
}

function clampCategoryIndex(total) {
  if (total <= 0) {
    uiState.categoryIndex = 0;
    uiState.optionIndex = 0;
    return;
  }
  if (uiState.categoryIndex >= total) {
    uiState.categoryIndex = total - 1;
  }
  if (uiState.categoryIndex < 0) {
    uiState.categoryIndex = 0;
  }
}

function syncOptionIndex(categories) {
  const resolvedCategories = Array.isArray(categories) ? categories : getCategories();
  clampCategoryIndex(resolvedCategories.length);
  const activeCategory = resolvedCategories[uiState.categoryIndex];
  const selections = getCosmeticSelections();
  if (!activeCategory) {
    uiState.optionIndex = 0;
    return { categories: resolvedCategories, selections };
  }
  const options = Array.isArray(activeCategory.options) ? activeCategory.options : [];
  if (options.length === 0) {
    uiState.optionIndex = 0;
    return { categories: resolvedCategories, selections };
  }
  const selectedId = selections[activeCategory.id];
  const currentIndex = options.findIndex((option) => option.id === selectedId);
  uiState.optionIndex = currentIndex >= 0 ? currentIndex : 0;
  return { categories: resolvedCategories, selections };
}

function setMessage(message) {
  uiState.message = message ?? null;
  uiState.messageTimer = message ? MESSAGE_DURATION : 0;
}

function applySelection(categoryId, optionId) {
  if (!categoryId || !optionId) {
    return false;
  }
  const changed = setCosmeticSelection(categoryId, optionId);
  if (changed) {
    saveCosmetics();
  }
  return changed;
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

function moveCategory(delta) {
  const categories = getCategories();
  if (categories.length === 0) {
    return;
  }
  uiState.categoryIndex = (uiState.categoryIndex + delta + categories.length) % categories.length;
  syncOptionIndex(categories);
  setMessage(null);
}

function cycleOption(delta) {
  const categories = getCategories();
  const activeCategory = categories[uiState.categoryIndex];
  if (!activeCategory) {
    return;
  }
  const result = cycleCosmeticSelection(activeCategory.id, delta);
  if (!result) {
    return;
  }
  syncOptionIndex(categories);
  const option = getCosmeticOption(result.optionId);
  if (result.changed && option) {
    setMessage(`${activeCategory.label}: ${option.name}`);
  }
  saveCosmetics();
}

function handleReset() {
  resetCosmetics();
  saveCosmetics();
  syncOptionIndex();
  const categories = getCategories();
  const activeCategory = categories[uiState.categoryIndex];
  const selections = getCosmeticSelections();
  const option = activeCategory ? getCosmeticOption(selections[activeCategory.id]) : null;
  setMessage(option ? `${activeCategory.label} reset to ${option.name}` : "Cosmetics reset");
}

function handleKeyDown(event) {
  if (event.defaultPrevented) {
    return;
  }
  const code = event.code;
  if (!uiState.visible) {
    if (code === "F7") {
      openEditor();
      event.preventDefault();
      event.stopPropagation();
    }
    return;
  }

  switch (code) {
    case "Escape":
    case "Enter":
    case "F7":
      closeEditor();
      break;
    case "ArrowUp":
      moveCategory(-1);
      break;
    case "ArrowDown":
      moveCategory(1);
      break;
    case "Tab":
      moveCategory(event.shiftKey ? -1 : 1);
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

function initializeCosmeticSystem() {
  if (initialized) {
    return;
  }
  loadCosmetics();
  syncOptionIndex();
  window.addEventListener("keydown", handleKeyDown, true);
  window.addEventListener("mousedown", handlePointerEvent, true);
  window.addEventListener("mouseup", handlePointerEvent, true);
  window.addEventListener("contextmenu", handlePointerEvent, true);
  initialized = true;
}

function updateCosmeticSystem(delta = 0) {
  if (uiState.messageTimer > 0) {
    uiState.messageTimer = Math.max(0, uiState.messageTimer - delta);
    if (uiState.messageTimer === 0) {
      uiState.message = null;
    }
  }
}

function isCosmeticEditorVisible() {
  return uiState.visible;
}

function getCosmeticEditorState() {
  const { categories } = syncOptionIndex();
  const selections = getCosmeticSelections();
  const activeCategory = categories[uiState.categoryIndex];
  const options = Array.isArray(activeCategory?.options) ? activeCategory.options : [];
  const resolvedOptions = options.map((option, index) => ({
    ...option,
    selected: selections[activeCategory?.id] === option.id,
    index
  }));
  return {
    visible: uiState.visible,
    categoryIndex: uiState.categoryIndex,
    optionIndex: uiState.optionIndex,
    categories,
    selections,
    options: resolvedOptions,
    activeCategory,
    message: uiState.message,
    messageTimer: uiState.messageTimer
  };
}

export {
  initializeCosmeticSystem,
  updateCosmeticSystem,
  isCosmeticEditorVisible,
  getCosmeticEditorState,
  openEditor,
  closeEditor,
  applySelection
};
