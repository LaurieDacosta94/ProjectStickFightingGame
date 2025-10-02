# Ranged Weapon Prototype Notes

## Mechanics Implemented
- `fireEquippedWeaponProjectile()` triggers when the active weapon lacks a melee chain (currently the Striker Pistol).
- `src/core/combat/projectiles.js` manages projectile spawn, ballistic drop, lifetime, collision, and damage routing via shared handlers.
- Projectiles now despawn on impact with the training dummy or grunts, applying damage/knockback based on the weapon definition.

## Controls & Feedback
- Hotkey slots (1-3) swap between fists, short blade, and pistol.
- HUD lists active weapon and loadout, making it easy to confirm weapon swapping.
- Placeholder projectile visuals (`drawProjectilesLayer`) render a light streak; future iterations can add trail or impact effects.

## Next Steps
1. Extend projectile data with recoil/spread tuning and muzzle offsets for automatic weapons.
2. Add muzzle flash / sound hooks to enhance firing feedback.
3. Support enemy projectiles (friendly fire toggles, player knockback balancing).
