# Weapon System Notes

## Overview
- Weapon metadata lives in `src/config/weapons.js` and is consumed by the equip helpers in `src/core/combat/weapons.js`.
- Hotkeys (1-9) swap based on the loadout array managed in `src/state/weapons.js`, resetting combo state and cancelling reloads when switching slots.
- `stickman` tracks additional combat state (reloading, stun, gadget cooldown) so the update loop can gate attacks consistently.

## Current Loadout Snapshot
1. **Combat Fists** - baseline three-hit combo for mobility and stagger testing.
2. **Short Blade** - quicker melee chain with a launching finisher.
3. **Striker Pistol** - semi-auto sidearm driven by the new ammo/reload system.
4. **Vector SMG** (bench) - rapid-fire PDW with high-capacity mags, recoil kick, and spread bloom ready for future combat tests.
5. **Frag/Flash/Smoke** - throwables covering explosive, stun, and lingering AoE use-cases.
6. **Turret / Grapple / Shield** - gadget trio sharing the gadget cooldown pipeline (lane control, mobility, mitigation).

## Ammo & Reload Highlights
- Projectile weapons can declare `ammo` blocks (`magazine`, `reserve`, `reloadSeconds`) that seed runtime tracking in `src/state/ammo.js`.
- `fireEquippedWeaponProjectile` now consults ammo state before spawning bullets, auto-triggering a reload if the magazine is empty.
- Manual reload (`R`) is available while standing; reload progress updates the HUD and dampens knockback when the shield bubble absorbs hits.

## HUD Integration
- The HUD surfaces ammo counts (or `INF` for unlimited weapons), gadget cooldown readiness, turret counts, grapple state, and shield strength.
- Shield absorption flashes the bubble and feeds reduced damage/knockback back into the damage handlers.

## Next Up
- Extend ammo definitions to SMGs/LMGs once those weapons land.
- Layer final audio/FX on reload begin/end and shield shatter events, replacing the placeholder tone scaffolding when assets land.

\n\n## Polish Roadmap\n- Add reload start/end SFX triggers in `src/core/combat/melee.js` once an audio bus exists.\n- Spawn muzzle flash/particle FX alongside `fireEquippedWeaponProjectile` to visualize recoil/spread.\n- Emit shield impact/shatter particles from `absorbShieldHit` and the shield teardown in `src/core/gadgets/shield.js`.\n


\n\n## Event Hooks (Stubbed)\n- `weapon:muzzle-flash` / `weapon:shot-fired` dispatched from `fireEquippedWeaponProjectile` for FX and audio.\n- `weapon:reload-start` / `weapon:reload-finish` dispatched from ammo state and fire routine to drive reload timing cues.\n- `weapon:recoil-kick` offers per-shot kick data should camera sway or haptics be added later.\n- `src/core/events/polishDebug.js` listens to those hooks and paints placeholder muzzle flashes + shield/shatter rings while logging reload/recoil cues in the HUD until audio/FX assets arrive.\n- `src/core/audio/placeholder.js` hooks the same events into Web Audio chirps so reload/firing cadence can be heard while assets are in flight.\n- `src/core/effects/particles.js` mirrors muzzle/shield events with placeholder bursts so visual timing stays in sync while real FX are authored.\n- `throwable:explosion` / `throwable:flash-burst` push detonation data to audio + particle placeholders so blasts and flashes stay synced across systems.\n- `throwable:smoke-detonate` / `throwable:smoke-dissipate` describe smoke lifecycle for tone fades and particle cleanup.\n
\n## Debug Notes\n- Alt+6/7/8 toggle the polish debug filters (weapons/shield/throwables) in the HUD so event spam can be scoped during testing.
