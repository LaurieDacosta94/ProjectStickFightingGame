# Recoil & Spread Notes

## Overview
- Recoil defines how the camera/aim kicks when a shot is fired. Spread defines how far subsequent rounds can deviate from the base trajectory.
- Runtime state lives in src/state/recoil.js (for kick decay) and src/state/ammo.js (for per-weapon spread accumulation).

## Config Parameters
- 
ecoil.horizontal / 
ecoil.vertical: immediate kick applied per shot.
- 
ecoil.decay: rate (per second) that recoil relaxes back to center.
- spread.perShot: additional degrees added after each shot.
- spread.max: hard cap on accumulated spread.
- spread.recovery: degrees recovered per second when not firing.
- spread.base (optional): minimum spread even on the first shot.

## Gameplay Wiring
- ireEquippedWeaponProjectile samples a random angle from the current spread, rotates the projectile velocity, and applies the configured recoil kick.
- updateAmmoTimers bleeds off spread over time, while updateRecoil decays the stored recoil kick each frame.
- The HUD displays the live recoil offset so testers can feel tuning changes without external tooling.

## Tuning Tips
- Start with small perShot values (1-2 degrees) and moderate decay to keep pistols snappy.
- Use higher max and lower recovery for LMG/SMG style weapons to emphasize sustained-fire bloom.
- Pair recoil and spread adjustments with reload timings to avoid punishing the player on multiple axes simultaneously.
\n\n## Examples\n- **Striker Pistol**: light per-shot bloom (0.4) with quick decay -> rewards tap firing.\n- **Vector SMG**: higher per-shot bloom (0.6) capped at 6.5 degrees with slower recovery, plus stronger vertical kick, emphasizing burst discipline.\n
