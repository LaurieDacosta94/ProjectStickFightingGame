# Particle Effects Notes

## Overview
- src/core/effects/particles.js now drives the full combat VFX pass: directional blood sprays, impact sparks, dust plumes, explosions, and lingering smoke all share the same lightweight manager.
- The module exposes helpers (spawnBloodSpray, spawnImpactSparks, spawnImpactDust, spawnGroundDust) so gameplay systems can request bespoke bursts without duplicating maths.
- Event listeners still attach lazily the first time updateParticles/drawParticles run, wiring weapon, shield, and throwable events into the new library of effects.

## Current Effects
- **Ballistics** – muzzle flashes trigger sparks and tracer lights; projectile/metal impacts spin off bright shrapnel; missed shots that hit terrain kick up palette-aware dust.
- **Gore** – enemy/player damage calls spawnBloodSpray, scaling droplet count and velocity by damage; finishing blows layer in heavier sprays and mist for cinematic kills.
- **Explosives** – grenade and destructible blasts mix ember arcs, debris chunks, pressure rings, and freshly-seeded smoke columns; flashbangs fire a white shockwave plus radiant spokes.
- **Shielding** – hit/shatter events still paint cyan shards and expanding rings, now sharing clamp/decay logic with the new particle types so timings feel cohesive.
- **Environmental** – destructible hits reuse spawnImpactDust with material palettes, matching concrete rubble, metal hulls, or volatile barrels.

## Integration Points
- damageHandlers calls the new helpers for training dummy dust, enemy gore, and player hit feedback.
- projectiles now spawns terrain dust and collision sparks when rounds terminate.
- Existing listeners (weapon:muzzle-flash, shield:*, 	hrowable:*, destructible:*) continue to feed the particle manager; additional direct spawns can be added without touching the event layer.
- updateGame steps particles via updateParticles(delta) alongside lighting and damage popups; drawParticles() renders before debug overlays for clean compositing.

## Tuning Notes
- Particle entries carry per-type damping and gravity so adjusting look/feel is as simple as tweaking updateParticles cases.
- Colors live in shared palettes at the top of particles.js; add material keys or override palettes when introducing new biome assets.
- The system remains allocation-light—particles/rings are plain objects trimmed when TTL expires—so future FX (bullet trails, gadget exhaust, etc.) can plug in without heavy refactors.
