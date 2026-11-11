# Background

Chosen on 2026-11-12: a Space Scavenger-style rock field with the game's grid kept on top. It is in the test build `outputs/experiments/2026-11-11-space-vfx/` only, not the release build.

It is drawn entirely in code by `space-backdrop.js`: a deep-blue field with dark clouds, a dust of tiny stars, clusters of dark faceted rocks and larger blurred rocks behind. Everything moves only with the camera, at 7-18% of its speed. The study behind it, with measurements from the reference, is in `research/backgrounds-2026-11-11/references.md`.

## What was rejected on the way

- A nebula whose patches barely moved while the grid and stars scrolled, so it looked stuck to the screen.
- Dust clouds, deep stars, sector grid, debris polygons: "very bad", the original was better.
- Wreck graveyard, lighter asteroid field, code-drawn megastructure, gas giant with rings.
- Two first attempts at the Space Scavenger look: pitch-black blobs on patchy haze, then flat navy shapes. Matching colours and sizes was not matching the look; the reference's rocks are faceted and softly lit, with star dust and clouds around them.
- The same rock field without the grid.

## Unused generated art

`raw/rock-1.png`, `raw/rock-2.png`, `raw/rock-3.png` and `raw/planet.png` were generated for the rejected asteroid-field and gas-giant candidates (image tool in the Claude session, model `gpt_image_2_6`; jobs `8e23610e-3c86-42fd-a324-9ef3affeb9b7`, `a633cc23-86a0-4e1b-b1a3-1c255ff439fb`, `61532d97-ab5b-4e07-a7bf-a6d2a04d50d1`, `e59fdd34-4735-453e-9278-78ffc3496347`). The game does not use them.
