# HUD & UI Overhaul Notes

## Overview
- Replaced the text-heavy HUD with glass panels that surface health, shields, cooldowns, and materials at a glance.
- Weapon readout shows ammo bars, reload progress, and gadget/throw readiness with color-coded accents.
- Mission, wave, and co-op statuses render as stacked info cards so multiple modes stay readable without wall-of-text overlays.
- Weapon hotbar highlights the active slot and exposes magazine/reserve counts for quick swaps.

## Visual Language
- Panels share a dark glass backdrop with accent strips that borrow each system's palette (campaign gold, survival amber, gadgets cyan, etc.).
- Progress bars now use the particle palette: crimson for health, cyan for shields, amber for ammo/reload, teal for gadgets.
- Status tags (combo windows, stuns, smoke, downed) render as compact pills near the vitals card instead of scattering text across the screen.

## Interaction Hints
- Core controls live in a dedicated card (move, attack, throw, build, mode toggles) so instructions stop competing with dynamic HUD text.
- Performance/debug feeds occupy their own panels on the right edge; polish debug still streams notices but no longer pushes gameplay info off screen.

## Extensibility
- drawUiPanel, drawUiProgressBar, drawUiTag, and drawUiCardStack provide shared primitives for future menus or overlays.
- Additional systems can push cards ({ title, lines, accent }) without touching the HUD layout logic.
- Particle-heavy moments have matching UI colors, keeping the new effects pass consistent with UI cues.
