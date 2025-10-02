# Ammo System Notes

## Goals
- Give ranged weapons lightweight magazine + reserve management without bloating the prototype.
- Surface reload state through the existing HUD and player flags so combat logic can respect reloading gates.
- Provide an extendable state module that other weapons can tap without coupling to specific gadgets or throwables.

## Implementation Overview
- Weapon definitions declare an optional mmo block (magazine, eserve, eloadSeconds). Absence of the block implies infinite ammo.
- src/state/ammo.js owns runtime ammo data per weapon (magazine count, reserve pool, reload timers) and exposes helpers (consumeAmmo, startReload, updateAmmoTimers, getAmmoStatus, egisterShot).
- ireEquippedWeaponProjectile now consults ammo state before spawning bullets; on empty magazines it kicks off a reload instead of firing.
- Player input (R) buffers a reload request. The update loop (src/core/world/update.js) routes reloads only for ranged weapons, blocks attacks while reloading, and slightly reduces move speed.

## HUD & UX
- The HUD shows Ammo: clip/reserve (or INF for unlimited weapons) and appends (Reloading X.Xs) while a reload is in progress.
- Reloading cancels melee combos and shows a recoil kick readout so the player feels the weapon response.
- Shield bubble absorption reduces incoming knockback even when a reload is underway, keeping the player grounded during refills.

## Recoil & Spread Tie-In
- Ammo state also tracks shot spread, incrementing on each fired round and decaying over time (spread.perShot, spread.max, spread.recovery).
- src/state/recoil.js manages horizontal/vertical kick so the HUD can display live recoil offsets.
- Striker Pistol is the first weapon using the combined ammo + recoil + spread stack; additional firearms can opt in by defining mmo, ecoil, and spread blocks.

## Next Up
- Extend ammo/recoil definitions to future weapons (SMGs, rifles) as they land.
- Layer audio/FX on reload begin/end and shield shatter events for better combat readability.
