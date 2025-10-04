# Throwable Effect Notes

## Flashbang
- Fuse: 1.2s arc tuned for quick tosses.
- Radius: 160px, applies enemy stun (1.8s) and short self-blind/stun if caught in burst.
- Cancels active combos and interrupts AI wind-ups while nudging HUD with blinded status.

## Smoke Canister
- Fuse: 0.9s with lower arc to land near the player.
- Spawns 4.6s cloud (150px radius, 1.35x expansion) that slows enemies and the player via stacked timers.
- Cloud tick cadence (0.45s) keeps AI aggression lower and surfaces "In Smoke" HUD cues until dissipated.

## Shared Notes
- All throwables support per-weapon cooldowns via `throwable.cooldownSeconds`.
- Effect routing pivots on `throwable.effectType` (explosive, flash, smoke) so future C4/utility entries can hook unique behaviour.
- Detonations now broadcast `throwable:explosion`, `throwable:flash-burst`, and `throwable:smoke-detonate` (plus smoke spawn/dissipate hooks) so audio layer and particles stay synchronized.


## Grapple Rig
- Anchor range ~320px forward with autoclamped bounds to keep shots in the arena.
- Travel phase speeds the tether out (900 px/s) before pulling the player at 760 px/s.
- Shares the gadget cooldown, letting turrets and grapples rotate without separate meters.

