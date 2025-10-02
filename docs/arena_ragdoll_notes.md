# Debug Arena & Ragdoll Notes

## Debug Arena Layout
- Three collision platforms placed at varying heights (110px, 180px, and 48px above ground) for aerial combo and traversal checks.
- Platforms use the same collision solver as ground, allowing stickman and grunts to land, roll, and chase across tiers.
- Rendering helper `drawDebugArena` paints the platforms in the background for clear visual targets.

## Ragdoll Death Feedback
- `spawnRagdoll` spawns circle segments for heads/limbs when players or grunts hit 0 HP.
- Ragdoll pieces inherit velocity, apply light gravity, bounce on ground, and fade out over ~2 seconds.
- Player death now triggers a short respawn timer (2.6s) while ragdolls tumble, then respawns with invulnerability.
- Grunts despawn into ragdolls and auto-respawn after 3s at their spawn pads, keeping the arena populated for testing.

These systems provide quick visual confirmation for hit-strength tuning and make Phase 1 combat iteration faster.
