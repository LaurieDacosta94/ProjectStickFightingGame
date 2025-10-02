# Enemy AI Prototype Notes

## Behaviours Implemented
- **Patrol**: Grunt roams within a local range, flipping direction at patrol bounds.
- **Aggro & Chase**: Within 360px of the player, the grunt swaps to chase mode and pursues aggressively.
- **Attack Cycle**: Wind-up -> active lunge -> recovery; hits apply knockback and pop damage numbers on the player.
- **Stagger Feedback**: Player combos trigger flash, shake, and minor knockback on enemies.
- **Defeat Handling**: Grunts stop moving on zero health; future iterations can swap in respawn or pooling.

## Tuning Hooks
- `moveSpeed / aggressionRange / attackRange` govern positioning pressure.
- `attackCooldown`, `attackWindup`, `attackActive` control tempo and punish windows.
- Knockback scaling is shared with the player combo table for consistent feel.

Use this skeleton to add more enemy archetypes or extend to squad AI in later phases.
