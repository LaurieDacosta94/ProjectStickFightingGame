# Melee Combat Prototype Notes

## Controls
- **Light Attack**: `J` key or left mouse click.
- **Combo Timing**: A prompt appears during the chain window; press attack again to flow into the next strike.
- **Movement**: Rolling (Shift) cancels attacks, but attacks lock out rolling until recovery ends.

## Combo Steps
1. **Quick Jab** – fast opener, modest damage, opens combo window quickly.
2. **Cross Strike** – medium reach, higher knockback.
3. **Rising Kick** – launcher-style finisher with the highest damage.

Each strike spawns a short-lived circular hitbox in front of the player. Hitboxes track stickman position and vanish after their active window, preventing multi-hit overlaps on the same target.

## Training Dummy
- Stationary target with 150 HP, shake and flash feedback on impact.
- Respawns 2.5s after defeat.
- Damage popups visualize per-hit values.

These systems provide a testbed for real enemy actors and combo tuning later in Phase 1.
\n\n## Shock Baton Combo\n1. **Jab Feint** - quick opener for meter build.\n2. **Slide Sweep** - low sweep with lateral reach for crowd control.\n3. **Arc Burst** - heavy finisher with big launch and knockback tuned for juggle setups.\n
