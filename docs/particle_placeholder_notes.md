# Particle Placeholder Notes

## Overview
- `src/core/effects/particles.js` listens to weapon/shield gameplay events and spawns lightweight bursts so designers can validate cadence before custom FX arrive.
- The system keeps a small pool of spark particles and expanding rings that fade quickly to avoid clutter.
- Listeners attach lazily the first time `updateParticles` or `drawParticles` runs via the main loop.

## Current Effects
- **Muzzle sparks** (`weapon:muzzle-flash`): six short-lived sparks fired in the current facing direction with light velocity damping.
- **Shield hits** (`shield:hit`): cyan shards radiate outward alongside a compact ring scaled to the active bubble radius.
- **Shield shatter** (`shield:shatter`): larger ring plus recycled shards to emphasize barrier break.
- **Explosive bursts** (`throwable:explosion`): ember arcs and an orange ring so grenade blasts read instantly even before bespoke FX.
- **Flash shockwave** (`throwable:flash-burst`): bright ring + spokes that line up with stun timing.
- **Smoke plumes** (`throwable:smoke-spawn`/`throwable:smoke-dissipate`): rising puffs and fade-out rings tied to the cloud lifecycle.

## Integration Points
- `updateGame` steps particles via `updateParticles(delta)` alongside damage popups.
- `drawProjectilesLayer` renders particles before the debug overlay via `drawParticles()`.
- Shield event payloads now include `radius` from `src/core/gadgets/shield.js` so hit/shatter visuals match the active bubble size.
- Throwable detonation events from `src/core/combat/throwables.js` drive the explosion/flash/smoke placeholders, keeping both audio and particles in sync.

## Next Steps
- Add pooled smoke/flashbang clouds that reuse the same pipeline when more throwable FX are required.
- Allow weapons/gadgets to register custom particle templates once high-fidelity assets begin landing.
- Share the particle manager with ragdoll/gore FX (sparks, debris) to keep allocations predictable.
