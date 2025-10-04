import { WEAPON_DEFINITIONS } from "../config/weapons.js";
import { stickman } from "./entities.js";

const ammoState = new Map();

function ensureAmmoEntry(weaponId) {
  if (!weaponId) {
    return null;
  }
  const def = WEAPON_DEFINITIONS[weaponId];
  if (!def) {
    ammoState.delete(weaponId);
    return null;
  }

  const ammoDef = def.ammo;
  const spreadDef = def.spread;

  const hasAmmo = ammoDef !== undefined;
  const capacity = hasAmmo ? Math.max(0, ammoDef.magazine ?? 0) : Number.POSITIVE_INFINITY;
  const reserve = hasAmmo ? Math.max(0, ammoDef.reserve ?? 0) : Number.POSITIVE_INFINITY;
  const reloadSeconds = hasAmmo ? Math.max(0.1, ammoDef.reloadSeconds ?? 1.2) : 0;

  let entry = ammoState.get(weaponId);
  if (!entry) {
    entry = {
      capacity,
      magazine: capacity === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : capacity,
      reserve,
      reloadSeconds,
      reloadTimer: 0,
      reloading: false,
      spreadDef: spreadDef ?? null,
      spread: spreadDef ? { current: spreadDef.base ?? 0 } : null
    };
    ammoState.set(weaponId, entry);
  } else {
    entry.capacity = capacity;
    if (capacity === Number.POSITIVE_INFINITY) {
      entry.magazine = Number.POSITIVE_INFINITY;
    } else if (!hasAmmo) {
      entry.magazine = capacity;
    } else {
      entry.magazine = Math.min(entry.magazine, capacity);
    }
    entry.reserve = reserve;
    entry.reloadSeconds = reloadSeconds;
    entry.spreadDef = spreadDef ?? null;
    if (!entry.spread && spreadDef) {
      entry.spread = { current: spreadDef.base ?? 0 };
    }
    if (!spreadDef) {
      entry.spread = null;
    }
  }
  return entry;
}

function getAmmoStatus(weaponId) {
  const entry = ensureAmmoEntry(weaponId);
  if (!entry) {
    return null;
  }
  return {
    magazine: entry.magazine,
    reserve: entry.reserve,
    capacity: entry.capacity,
    reloading: entry.reloading,
    reloadTimer: entry.reloadTimer,
    reloadSeconds: entry.reloadSeconds
  };
}

function consumeAmmo(weaponId) {
  const entry = ensureAmmoEntry(weaponId);
  if (!entry) {
    return true;
  }
  if (entry.capacity === Number.POSITIVE_INFINITY) {
    return true;
  }
  if (entry.reloading) {
    return false;
  }
  if (entry.magazine <= 0) {
    return false;
  }
  entry.magazine -= 1;
  return true;
}

function startReload(weaponId) {
  const entry = ensureAmmoEntry(weaponId);
  if (!entry) {
    return false;
  }
  if (entry.capacity === Number.POSITIVE_INFINITY) {
    return false;
  }
  if (entry.reloading) {
    return false;
  }
  if (entry.magazine >= entry.capacity) {
    return false;
  }
  if (entry.reserve <= 0) {
    return false;
  }
  entry.reloading = true;
  entry.reloadTimer = entry.reloadSeconds;
  if (stickman.equippedWeaponId === weaponId) {
    stickman.reloading = true;
  }
  return true;
}

function cancelReload(weaponId) {
  const entry = ammoState.get(weaponId);
  if (!entry) {
    return;
  }
  entry.reloading = false;
  entry.reloadTimer = 0;
  if (stickman.equippedWeaponId === weaponId) {
    stickman.reloading = false;
  }
}

function registerShot(weaponId) {
  const entry = ensureAmmoEntry(weaponId);
  const def = entry?.spreadDef;
  if (!entry || !def) {
    return 0;
  }

  if (!entry.spread) {
    entry.spread = { current: def.base ?? 0 };
  }
  const spreadState = entry.spread;
  const base = def.base ?? 0;
  const current = Math.max(base, spreadState.current ?? base);
  const max = def.max ?? current;
  const effectiveDegrees = Math.min(max, current);
  const radians = effectiveDegrees * (Math.PI / 180);
  const angle = radians > 0 ? (Math.random() * 2 - 1) * radians : 0;

  const perShot = def.perShot ?? 0;
  spreadState.current = Math.min(max, effectiveDegrees + perShot);

  return angle;
}

function updateAmmoTimers(delta, activeWeaponId) {
  const completedReloads = [];
  for (const [weaponId, entry] of ammoState.entries()) {
    const def = WEAPON_DEFINITIONS[weaponId];
    if (!def) {
      ammoState.delete(weaponId);
      continue;
    }

    if (entry.reloading) {
      entry.reloadTimer = Math.max(0, entry.reloadTimer - delta);
      if (entry.reloadTimer <= 0) {
        if (entry.capacity !== Number.POSITIVE_INFINITY) {
          const needed = entry.capacity - entry.magazine;
          if (needed > 0) {
            const loaded = Math.min(needed, entry.reserve);
            entry.magazine += loaded;
            entry.reserve -= loaded;
          }
        }
        entry.reloading = false;
        entry.reloadTimer = 0;
        completedReloads.push(weaponId);
      }
    }

    if (entry.spread && entry.spreadDef) {
      const base = entry.spreadDef.base ?? 0;
      const recovery = entry.spreadDef.recovery ?? 0;
      if (recovery > 0) {
        entry.spread.current = Math.max(base, entry.spread.current - recovery * delta);
      } else {
        entry.spread.current = Math.max(base, entry.spread.current ?? base);
      }
    }
  }

  if (activeWeaponId) {
    const entry = ammoState.get(activeWeaponId);
    stickman.reloading = entry?.reloading ?? false;
  } else {
    stickman.reloading = false;
  }

  if (typeof window !== "undefined") {
    for (const weaponId of completedReloads) {
      window.dispatchEvent(new CustomEvent("weapon:reload-finish", { detail: { weaponId } }));
    }
  }
}

function refillWeaponAmmo(weaponId) {
  const entry = ensureAmmoEntry(weaponId);
  if (!entry || entry.capacity === Number.POSITIVE_INFINITY) {
    return;
  }
  entry.magazine = entry.capacity;
  entry.reserve = WEAPON_DEFINITIONS[weaponId]?.ammo?.reserve ?? entry.reserve;
  entry.reloading = false;
  entry.reloadTimer = 0;
}
function setWeaponInfiniteAmmo(weaponId) {
  const entry = ensureAmmoEntry(weaponId);
  if (!entry) {
    return;
  }
  entry.capacity = Number.POSITIVE_INFINITY;
  entry.magazine = Number.POSITIVE_INFINITY;
  entry.reserve = Number.POSITIVE_INFINITY;
  entry.reloading = false;
  entry.reloadTimer = 0;
  if (stickman.equippedWeaponId === weaponId) {
    stickman.reloading = false;
  }
}

function resetWeaponAmmo(weaponId) {
  if (!weaponId) {
    return;
  }
  ammoState.delete(weaponId);
  ensureAmmoEntry(weaponId);
}

function resetAllWeaponAmmo() {
  ammoState.clear();
  if (stickman.equippedWeaponId) {
    ensureAmmoEntry(stickman.equippedWeaponId);
  }
}

export {
  ensureAmmoEntry,
  getAmmoStatus,
  consumeAmmo,
  startReload,
  cancelReload,
  registerShot,
  updateAmmoTimers,
  refillWeaponAmmo,
  setWeaponInfiniteAmmo,
  resetWeaponAmmo,
  resetAllWeaponAmmo
};




