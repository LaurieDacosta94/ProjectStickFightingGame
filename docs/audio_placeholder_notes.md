# Audio System Notes

## Overview
- initializeAudioSystem (src/core/audio/index.js) wires a Web Audio graph with master, SFX, and music busses, then seeds synthetic sound buffers for common gameplay events.
- The engine resumes the context on the first user gesture, spins up an ambient pad/pulse/bass soundtrack, and throttles repeated cues via simple cooldown tracking.
- SOUND_DEFINITIONS and EVENT_SOUND_MAP describe how events map to generated buffers, playback-rate variance, pan spread, and soundtrack intensity bumps.

## Event Palette
- **Fire / muzzle** – layered noise plus harmonic clicks with subtle stereo variation.
- **Reload** – paired confirmation beeps (start/finish) so weapon state is audible even with eyes off the HUD.
- **Recoil** – dampened low-frequency thumps scaled by cadence to distinguish cannons from pistols.
- **Grenades & explosives** – roaring low-end booms, bright flash streaks, and breathy smoke pulses for lifecycle cues.
- **Shields** – shimmering impact glissandos, crystalline shatters, and descending release tones when the bubble expires.
- **Environment & debris** – light chimes on biome swaps and gritty bursts when destructible props crumble.

## Soundtrack
- Procedural pad (warm chords), pulse (percussive accents), and bass drones loop via buffer sources tied to the music buss.
- Background gain idles near 0.28 and eases toward 	argetMusicLevel; combat events call umpMusicIntensity to push the mix toward 0.85 before decaying.
- A low-frequency update loop adjusts the music gain every ~220 ms so ambience reacts without touching the main game loop.

## Integration Notes
- All playback routes through playSound, so future sample swaps can replace generated buffers without reworking event plumbing.
- setMasterVolume, setSfxVolume, and setMusicVolume expose runtime controls for menus or accessibility settings.
- Callers only need initializeAudioSystem() from main.js; the module guards unsupported browsers by no-oping when Web Audio is unavailable.
