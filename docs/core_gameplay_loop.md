# Core Gameplay Loop - Stickman Warfare

## Overview
Stickman Warfare delivers fast-paced sandbox combat where the player juggles positioning, arsenal management, and squad tactics. Each match flows through three repeating phases: **Approach**, **Engage**, and **Recover**.

## Loop Phases
1. **Approach**
   - Survey the battlefield and choose an objective (eliminate squad, capture point, survive wave).
   - Traverse the arena using parkour-style movement (run, jump, roll, climb once implemented).
   - Equip loadout slots (primary, secondary, gadget, melee) and issue squad commands if allies are present.

2. **Engage**
   - Close distance and initiate combat using melee chains or ranged fire.
   - Chain attacks with directional inputs; weave in gadgets (grenades, turrets) for crowd control.
   - React to enemy fire with defensive options (roll, crouch, blocking gear) and maintain momentum.

3. **Recover**
   - Loot defeated enemies or supply drops for ammo, upgrades, or materials.
   - Revive or reposition squadmates and repair fortifications if the mode supports it.
   - Re-evaluate objectives, adapt loadout, and re-enter the Approach phase.

## Supporting Systems
- **Progression**: Track mission goals (kill count, wave number, objective timers) and reward skillful play with gear unlocks.
- **Economy**: Earn materials and credits to deploy vehicles, gadgets, or build defenses between engagements.
- **Dynamism**: Destructible environments and reactive AI ensure each loop iteration feels different, encouraging experimentation.

This loop scales from solo skirmishes to large battles by layering AI squads, vehicles, and buildable defenses without changing the player’s moment-to-moment flow.
