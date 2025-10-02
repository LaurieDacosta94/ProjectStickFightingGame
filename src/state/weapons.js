import { DEFAULT_LOADOUT, WEAPON_DEFINITIONS } from "../config/weapons.js";
import { stickman } from "./entities.js";

const weaponState = {
  inventory: [...DEFAULT_LOADOUT],
  activeIndex: 0
};

function isValidIndex(index) {
  return index >= 0 && index < weaponState.inventory.length;
}

function getCurrentWeaponId() {
  return weaponState.inventory[weaponState.activeIndex];
}

function setActiveWeaponByIndex(index) {
  if (!isValidIndex(index)) {
    return false;
  }
  weaponState.activeIndex = index;
  stickman.equippedWeaponId = weaponState.inventory[index];
  return true;
}

function getWeaponInventory() {
  return weaponState.inventory.slice();
}

function addWeaponToInventory(weaponId, { autoEquip = false } = {}) {
  if (!weaponId || !WEAPON_DEFINITIONS[weaponId]) {
    return false;
  }
  let index = weaponState.inventory.indexOf(weaponId);
  if (index === -1) {
    weaponState.inventory.push(weaponId);
    index = weaponState.inventory.length - 1;
  }
  if (autoEquip) {
    setActiveWeaponByIndex(index);
  } else {
    ensureEquippedWeaponValid();
  }
  return true;
}

function getThrowableCount() {
  return weaponState.inventory
    .map((id) => WEAPON_DEFINITIONS?.[id]?.category)
    .filter((category) => category === "throwable")
    .length;
}

function ensureEquippedWeaponValid() {
  const existingIndex = weaponState.inventory.indexOf(stickman.equippedWeaponId);
  if (existingIndex >= 0) {
    weaponState.activeIndex = existingIndex;
    return;
  }

  weaponState.inventory[0] = weaponState.inventory[0] ?? DEFAULT_LOADOUT[0];
  weaponState.activeIndex = 0;
  stickman.equippedWeaponId = weaponState.inventory[0];
}

ensureEquippedWeaponValid();

export { weaponState, getCurrentWeaponId, setActiveWeaponByIndex, getWeaponInventory, getThrowableCount, addWeaponToInventory };
