import { COSMETIC_CATEGORIES, COSMETIC_ITEMS, DEFAULT_COSMETICS, COSMETIC_STORAGE_KEY } from "../config/cosmetics.js";

const cosmeticState = {
  selections: { ...DEFAULT_COSMETICS }
};

function cloneSelections() {
  return { ...cosmeticState.selections };
}

function getOptionsForCategory(categoryId) {
  const category = COSMETIC_CATEGORIES.find((entry) => entry.id === categoryId);
  return Array.isArray(category?.options) ? category.options.map((option) => option.id) : [];
}

function normalizeSelection(categoryId, optionId) {
  const options = getOptionsForCategory(categoryId);
  if (options.length === 0) {
    return null;
  }
  if (optionId && options.includes(optionId)) {
    return optionId;
  }
  const fallback = DEFAULT_COSMETICS[categoryId];
  if (fallback && options.includes(fallback)) {
    return fallback;
  }
  return options[0];
}

function ensureSelectionsValid() {
  const next = {};
  COSMETIC_CATEGORIES.forEach((category) => {
    next[category.id] = normalizeSelection(category.id, cosmeticState.selections[category.id]);
  });
  cosmeticState.selections = next;
}

function setCosmeticSelection(categoryId, optionId) {
  if (!categoryId) {
    return false;
  }
  const normalized = normalizeSelection(categoryId, optionId);
  if (!normalized) {
    return false;
  }
  if (cosmeticState.selections[categoryId] === normalized) {
    return false;
  }
  cosmeticState.selections = {
    ...cosmeticState.selections,
    [categoryId]: normalized
  };
  return true;
}

function cycleCosmeticSelection(categoryId, direction = 1) {
  const options = getOptionsForCategory(categoryId);
  if (options.length === 0) {
    return null;
  }
  const current = cosmeticState.selections[categoryId] ?? options[0];
  const index = options.indexOf(current);
  const nextIndex = (index + direction + options.length) % options.length;
  const optionId = options[nextIndex];
  const changed = setCosmeticSelection(categoryId, optionId);
  return {
    optionId,
    changed
  };
}

function getCosmeticSelections() {
  return cloneSelections();
}

function getCosmeticOption(optionId) {
  return COSMETIC_ITEMS[optionId] ?? null;
}

function getResolvedCosmetics() {
  ensureSelectionsValid();
  return COSMETIC_CATEGORIES.map((category) => {
    const selectionId = cosmeticState.selections[category.id];
    const option = getCosmeticOption(selectionId);
    return {
      categoryId: category.id,
      label: category.label,
      selectionId,
      option
    };
  });
}

function resetCosmetics() {
  cosmeticState.selections = { ...DEFAULT_COSMETICS };
  return getCosmeticSelections();
}

function saveCosmetics() {
  if (typeof localStorage === "undefined") {
    return false;
  }
  try {
    localStorage.setItem(COSMETIC_STORAGE_KEY, JSON.stringify(cosmeticState.selections));
    return true;
  } catch (error) {
    console.warn("Failed to save cosmetics", error);
    return false;
  }
}

function loadCosmetics() {
  if (typeof localStorage === "undefined") {
    ensureSelectionsValid();
    return false;
  }
  try {
    const raw = localStorage.getItem(COSMETIC_STORAGE_KEY);
    if (!raw) {
      ensureSelectionsValid();
      return false;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      ensureSelectionsValid();
      return false;
    }
    const selections = { ...DEFAULT_COSMETICS };
    COSMETIC_CATEGORIES.forEach((category) => {
      selections[category.id] = normalizeSelection(category.id, parsed[category.id]);
    });
    cosmeticState.selections = selections;
    return true;
  } catch (error) {
    console.warn("Failed to load cosmetics", error);
    ensureSelectionsValid();
    return false;
  }
}

function getCosmeticCategories() {
  return COSMETIC_CATEGORIES.map((category) => ({
    id: category.id,
    label: category.label,
    description: category.description,
    options: category.options.map((option) => ({
      ...option,
      category: category.id
    }))
  }));
}

ensureSelectionsValid();

export {
  getCosmeticSelections,
  getResolvedCosmetics,
  getCosmeticOption,
  getCosmeticCategories,
  setCosmeticSelection,
  cycleCosmeticSelection,
  resetCosmetics,
  saveCosmetics,
  loadCosmetics
};
