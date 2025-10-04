import { LOADOUT_SLOTS, LOADOUT_STORAGE_KEY } from "../config/loadouts.js";
import { WEAPON_DEFINITIONS, DEFAULT_LOADOUT } from "../config/weapons.js";
import { setWeaponInventory, getCurrentWeaponId } from "./weapons.js";
import { resetAllWeaponAmmo } from "./ammo.js";

function getAllowedWeaponsForSlot(slot) {
  const categories = Array.isArray(slot?.allowedCategories) ? slot.allowedCategories : [];
  if (categories.length === 0) {
    return [];
  }
  return Object.values(WEAPON_DEFINITIONS)
    .filter((weapon) => categories.includes(weapon.category))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((weapon) => weapon.id);
}

function resolveDefaultWeapon(slot, index) {
  const allowed = getAllowedWeaponsForSlot(slot);
  if (allowed.length === 0) {
    return null;
  }
  const preferred = [
    DEFAULT_LOADOUT[index],
    slot.defaultWeaponId
  ];
  for (const candidate of preferred) {
    if (candidate && allowed.includes(candidate)) {
      return candidate;
    }
  }
  return allowed[0];
}

function createAssignments() {
  return LOADOUT_SLOTS.map((slot, index) => ({
    slotId: slot.id,
    weaponId: resolveDefaultWeapon(slot, index)
  }));
}

let assignments = createAssignments();

function cloneAssignments() {
  return assignments.map((entry) => ({ ...entry }));
}

function getAssignmentIndex(slotId) {
  return assignments.findIndex((entry) => entry.slotId === slotId);
}

function ensureAssignmentsUnique() {
  const seen = new Set();
  for (let index = 0; index < assignments.length; index += 1) {
    const slot = LOADOUT_SLOTS[index];
    if (!slot) {
      continue;
    }
    const allowed = getAllowedWeaponsForSlot(slot);
    const entry = assignments[index];
    let weaponId = entry.weaponId;
    if (!weaponId || !allowed.includes(weaponId) || seen.has(weaponId)) {
      weaponId = allowed.find((id) => !seen.has(id)) ?? allowed[0] ?? null;
    }
    entry.weaponId = weaponId ?? null;
    if (weaponId) {
      seen.add(weaponId);
    }
  }
}

function applyAssignments(newAssignments) {
  assignments = LOADOUT_SLOTS.map((slot, index) => {
    const incoming = newAssignments.find((entry) => entry.slotId === slot.id);
    let weaponId = incoming?.weaponId ?? null;
    const allowed = getAllowedWeaponsForSlot(slot);
    if (!weaponId || !allowed.includes(weaponId)) {
      weaponId = resolveDefaultWeapon(slot, index);
    }
    return { slotId: slot.id, weaponId };
  });
  ensureAssignmentsUnique();
}

function getLoadoutAssignments() {
  return cloneAssignments();
}

function getLoadoutWeaponList() {
  return assignments
    .map((entry) => entry.weaponId)
    .filter((weaponId) => typeof weaponId === "string" && weaponId.length > 0);
}

function setSlotWeapon(slotId, weaponId) {
  const slotIndex = getAssignmentIndex(slotId);
  if (slotIndex === -1) {
    return false;
  }
  const slot = LOADOUT_SLOTS[slotIndex];
  const allowed = getAllowedWeaponsForSlot(slot);
  if (!allowed.includes(weaponId)) {
    return false;
  }
  const current = assignments[slotIndex].weaponId;
  if (current === weaponId) {
    return false;
  }
  const conflictIndex = assignments.findIndex((entry, index) => index !== slotIndex && entry.weaponId === weaponId);
  if (conflictIndex >= 0) {
    assignments[conflictIndex].weaponId = current;
  }
  assignments[slotIndex].weaponId = weaponId;
  ensureAssignmentsUnique();
  return true;
}

function cycleSlotWeapon(slotId, direction = 1) {
  const slotIndex = getAssignmentIndex(slotId);
  if (slotIndex === -1) {
    return null;
  }
  const slot = LOADOUT_SLOTS[slotIndex];
  const allowed = getAllowedWeaponsForSlot(slot);
  if (allowed.length === 0) {
    return null;
  }
  const current = assignments[slotIndex].weaponId;
  let currentIndex = allowed.indexOf(current);
  if (currentIndex === -1) {
    currentIndex = 0;
  }
  const nextIndex = (currentIndex + direction + allowed.length) % allowed.length;
  const nextId = allowed[nextIndex];
  const changed = setSlotWeapon(slotId, nextId);
  return {
    slotIndex,
    weaponId: assignments[slotIndex].weaponId,
    changed
  };
}

function resetLoadout() {
  assignments = createAssignments();
  ensureAssignmentsUnique();
  return getLoadoutAssignments();
}

function applyLoadout({ preserveEquipped = true } = {}) {
  ensureAssignmentsUnique();
  const weaponList = getLoadoutWeaponList();
  const inventory = weaponList.length > 0 ? weaponList : DEFAULT_LOADOUT.slice();
  const equipId = preserveEquipped ? getCurrentWeaponId() : inventory[0];
  setWeaponInventory(inventory, { equipId });
  resetAllWeaponAmmo();
  return inventory;
}

function saveLoadout() {
  if (typeof localStorage === "undefined") {
    return false;
  }
  try {
    const payload = assignments.map((entry) => ({ ...entry }));
    localStorage.setItem(LOADOUT_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.warn("Failed to save loadout", error);
    return false;
  }
}

function loadLoadout() {
  if (typeof localStorage === "undefined") {
    ensureAssignmentsUnique();
    return false;
  }
  try {
    const raw = localStorage.getItem(LOADOUT_STORAGE_KEY);
    if (!raw) {
      ensureAssignmentsUnique();
      return false;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      ensureAssignmentsUnique();
      return false;
    }
    const sanitized = parsed
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }
        const slotId = entry.slotId ?? null;
        const weaponId = typeof entry.weaponId === "string" ? entry.weaponId : null;
        if (!slotId || !weaponId) {
          return null;
        }
        return { slotId, weaponId };
      })
      .filter(Boolean);
    applyAssignments(sanitized);
    ensureAssignmentsUnique();
    return true;
  } catch (error) {
    console.warn("Failed to load saved loadout", error);
    ensureAssignmentsUnique();
    return false;
  }
}

function getResolvedLoadoutSlots() {
  return LOADOUT_SLOTS.map((slot, index) => {
    const assignment = assignments[index];
    const weaponId = assignment?.weaponId ?? null;
    const weapon = weaponId ? WEAPON_DEFINITIONS[weaponId] ?? null : null;
    return {
      index,
      slotId: slot.id,
      label: slot.label,
      allowedCategories: Array.isArray(slot.allowedCategories) ? slot.allowedCategories.slice() : [],
      allowedWeaponIds: getAllowedWeaponsForSlot(slot),
      weaponId,
      weapon
    };
  });
}

export {
  getLoadoutAssignments,
  getLoadoutWeaponList,
  getResolvedLoadoutSlots,
  setSlotWeapon,
  cycleSlotWeapon,
  resetLoadout,
  applyLoadout,
  saveLoadout,
  loadLoadout
};
