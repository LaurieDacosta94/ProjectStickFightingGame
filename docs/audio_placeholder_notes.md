# Placeholder Audio Notes

## Overview
- initializePlaceholderAudio (src/core/audio/placeholder.js) listens to weapon/shield/throwable events and plays short Web Audio tones so timing can be validated before final assets arrive.
- Audio context is resumed on first pointer/keyboard input; browsers without Web Audio simply skip playback.
- Event-to-tone mapping is kept in EVENT_SOUND_MAP, keeping future sample swaps centralized.

## Current Event Map
- weapon:muzzle-flash / weapon:shot-fired: rapid, high-frequency chirps to mark firing cadence.
- weapon:reload-start / weapon:reload-finish: mid-frequency triangles bookend the reload window.
- weapon:recoil-kick: softer sine chirp, scaled by recoil magnitude so heavy kicks stand out.
- shield:hit / shield:shatter / shield:end: low-frequency pulses communicate absorption versus collapse.
- throwable:explosion / throwable:flash-burst: quick boom/flare stubs so grenade detonation timing is audible.
- throwable:smoke-detonate / throwable:smoke-dissipate: soft whoosh + fade to match the smoke cloud lifecycle.

## Next Steps
- Replace tone synthesis with queued sample playback once asset pack is ready.
- Allow per-weapon overrides (e.g., SMG burst riff, pistol snap) via weapon metadata.
- Pipe the same event feed into the particle system so muzzle flashes and shield impacts share timing with audio cues.
