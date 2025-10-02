# Throwables Mini-Spec

## Goals
- Equipable grenades live alongside melee and ranged gear in the shared loadout system.
- Lightweight physics pass (arc, bounce, fuse, explosion radius) keeps the prototype readable but tunable.
- Baseline frag grenade stresses dummy/enemy interactions and introduces self-splash risk for positioning practice.

## Implementation Notes
- Flashbang and smoke canister prototypes now demonstrate multi-effect throwables: flash stuns and blinds combatants, while smoke spawns a lingering field that slows and obscures targets.
- Weapon data now carries `throwable` metadata (cooldown, radius, fuse, damage, knockback, bounce, self-damage scale) in `src/config/weapons.js` with the frag grenade wired into the default loadout.
- `src/core/combat/throwables.js` owns spawn, physics, fuse countdown, explosion overlap, and HUD-friendly visuals (fuse arc, spark, shockwave) while feeding the existing damage handlers for dummy, enemies, and the player.
- Control flow: grenades fire via `G`/right-click (or primary attack while equipped), respect a configurable cooldown, and highlight readiness in the HUD; weapon hotkeys now scale to as many slots as the inventory exposes.
- Rendering layers projectiles and grenades together so live throws sit behind damage popups but above the arena floor.

## QA Checklist
- [x] Flashbang stun durations and HUD feedback remain responsive.
- [x] Smoke cloud applies movement slow and dissipates cleanly.
- [x] Swap between melee, ranged, and throwable slots without input conflicts.
- [x] Fuse timing, explosion radius, and cooldown respect the config values.
- [x] Weapon system gracefully handles missing throwable slots (no crash, cooldown stays hidden).
- [ ] Future pass: polish audio/particle feedback for fuse tick and detonation.
