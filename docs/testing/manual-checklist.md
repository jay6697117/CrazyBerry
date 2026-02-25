# CrazyBerry Manual Checklist

## Scene and camera
- Canvas loads and fills viewport.
- Camera is fixed isometric-like and cannot rotate.
- Day-night light color changes across phases.

## Core loop
- Till a grass tile.
- Plant strawberry on tilled tile.
- Water on each day until mature.
- Harvest mature strawberry.
- Sell berry in shop and verify coin increase.

## UI and interaction
- HUD day/phase/coins/strawberry updates live.
- HUD clock and weather icon change with day/phase.
- Toolbar highlights active/recommended tool.
- Shop modal opens/closes and buy/sell actions update stock.

## Feedback systems
- Water action triggers visible splash particles.
- Harvest action triggers visible sparkle particles.
- Action audio plays from `assets/sounds`; if blocked/missing, synth fallback still produces sound.

## Persistence
- Refresh page after progress.
- State restores from localStorage.
