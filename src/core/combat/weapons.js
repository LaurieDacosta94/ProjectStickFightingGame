import { WEAPON_DEFINITIONS } from "../../config/weapons.js";
import { stickman } from "../../state/entities.js";
import { weaponState, getCurrentWeaponId, setActiveWeaponByIndex, getWeaponInventory } from "../../state/weapons.js";
import { getAmmoStatus, ensureAmmoEntry, cancelReload } from "../../state/ammo.js";

let controlsInitialized = false;

const previousWeaponState = {
  id: stickman.equippedWeaponId
};

equipWeaponIndex(weaponState.activeIndex);

function getWeaponDefinitionById(id) {
  return WEAPON_DEFINITIONS[id];
}

function getCurrentWeapon() {
  const weaponId = getCurrentWeaponId();
  return getWeaponDefinitionById(weaponId) ?? null;
}

function equipWeaponIndex(index) {
  const previousId = stickman.equippedWeaponId;
  if (!setActiveWeaponByIndex(index)) {
    return false;
  }
  if (previousId && previousId !== stickman.equippedWeaponId) {
    cancelReload(previousId);
  }

  ensureAmmoEntry(stickman.equippedWeaponId);

  stickman.attacking = false;
  stickman.currentAttack = null;
  stickman.attackElapsed = 0;
  stickman.comboWindowOpen = false;
  stickman.comboWindowTimer = 0;
  stickman.attackIndex = -1;
  stickman.hitboxSpawned = false;

  const ammoStatus = getAmmoStatus(stickman.equippedWeaponId);
  stickman.reloading = ammoStatus?.reloading ?? false;
  stickman.fireCooldown = 0;

  previousWeaponState.id = stickman.equippedWeaponId;
  return true;
}

function equipWeaponBySlot(slotNumber) {
  const index = slotNumber - 1;
  equipWeaponIndex(index);
}

function getSlotFromCode(code) {
  if (code.startsWith("Digit")) {
    return Number.parseInt(code.slice(5), 10);
  }
  if (code.startsWith("Numpad")) {
    return Number.parseInt(code.slice(6), 10);
  }
  return Number.NaN;
}

function handleWeaponKey(event) {
  const slot = getSlotFromCode(event.code);
  if (!Number.isNaN(slot) && slot >= 1) {
    equipWeaponBySlot(slot);
    event.preventDefault();
  }
}

function initializeWeaponControls() {
  if (controlsInitialized) {
    return;
  }
  window.addEventListener("keydown", handleWeaponKey);
  controlsInitialized = true;
}

function getWeaponSlots() {
  return getWeaponInventory().map((id) => WEAPON_DEFINITIONS[id] ?? { id, name: "Unknown" });
}

export {
  getCurrentWeapon,
  getWeaponDefinitionById,
  equipWeaponBySlot,
  initializeWeaponControls,
  getWeaponSlots
};

