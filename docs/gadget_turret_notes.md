# Deployable Turret Notes

## Gameplay Intent
- Quick-drop sentry that buys space while the player repositions or swaps weapons.
- Prioritises nearest hostile or the training dummy, encouraging arena setups for combo practice.
- Lifetime-limited (8.5s) with a modest cooldown so fights can rotate through turret windows without overwhelming pace.

## Data Overview
- Gadget config lives in `src/config/weapons.js` under `turretDrone` with:
  - `cooldownSeconds`: 3.2s global gadget cooldown.
  - `duration`: 8.5s uptime; `maxActive`: 2 concurrent turrets (oldest despawns when exceeded).
  - `range`: 260px targeting radius; `fireInterval`: 0.55s.
  - Projectile spec mirrors pistol speed (540 px/s) but lighter damage (9) and medium knockback (80).
  - Cosmetic tint (`baseColor`/`headColor`) keeps it readable on the dark arena backdrop.

## Systems Wiring
- `src/core/gadgets/turret.js` owns deployment, targeting, firing pulse, and render of active turrets.
- `src/core/world/update.js` branches on `category === "gadget"` to call `deployGadget` and steps turrets via `updateGadgets`.
- HUD pulls from `getGadgetStatus()` to surface cooldown readiness and the active turret count.
- Turret projectiles reuse `spawnProjectile`, so they immediately pipe into existing dummy/enemy damage flows.

## Tuning Hooks
- Adjust fire pacing (`fireInterval`) and projectile damage for balance passes.
- Increase `maxActive` for survival modes; current cap keeps encounters readable in Phase 2.
- Consider line-of-sight checks or elevation offsets once multi-layer arenas arrive.


## Grapple Rig
- Shares the gadget slot with turret drone but emphasises mobility.
- Configurable range/height clamps keep anchors in-bounds while maintaining fast travel/pull speeds.
- Movement update applies a manual reposition with velocity injection so existing physics stay aware of the dash.

## Shield Bubble
- Activates a 360-degree barrier (default 96px radius) absorbing up to 90 damage before shattering or expiring after 6 seconds.
- Dampens knockback and launch on blocked hits so the player can stay grounded during scrums.
- Shield status reports through the HUD (strength bar) and flashes on impact; activation shares the gadget cooldown with turrets and grapples.
\n\n## Polish Considerations\n- Shield bubble: hook impact/shatter SFX and particle rings when `absorbShieldHit` fires or the bubble expires.\n- Turret/SMG: share muzzle flash assets so upcoming audio pass can reuse events.\n
\n\n### Event Hooks\n- `shield:hit`, `shield:shatter`, and `shield:end` fire from `src/core/gadgets/shield.js` to coordinate audio/FX cues.\n- `weapon:muzzle-flash` events can be shared between turret and SMG implementations for consistent visuals.\n- `src/core/events/polishDebug.js` mirrors those events with debug HUD text and shield ring overlays for quick iteration.\n- `src/core/audio/index.js` renders the procedural tones on the same events so gadget timing reads audibly.\n- `src/core/effects/particles.js` now powers muzzle sparks, shield shards, and dust bursts from those events for cohesive visuals.\n- Throwable detonation events (`throwable:explosion`, `throwable:flash-burst`, `throwable:smoke-detonate`) now mirror through the same hooks so gadgets and throwables share timing cues.\n

