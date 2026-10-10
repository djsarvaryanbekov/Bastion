# Game integration — 2026-09-20

The current indexed artwork is integrated into the authoritative
`outputs/Drift_Bastion_Playtest.html` and its modular sources. Original PNGs are
unchanged. Runtime exports are embedded, including in the standalone HTML.

## Layer decisions

- The square platform stays fixed to the hull. Every platform is drawn before
  equipment so neighboring platforms cannot cover a weapon barrel.
- Cannon, Missile, Rail, Laser, Arc, Scatter, Flak, Cryo and Ember use a fixed
  swivel bearing. Their barrel/nozzle, receiver, attached storage and upper
  cradle turn together with the existing weapon aim.
- Cannon, Arc and Flak have explicit source-coordinate clipping polygons that
  isolate the upper assembly from their baked lower bearing. The independent
  swivel-mount v3 supplies the fixed bearing underneath. These are technical
  layer masks, not regenerated art. The raw files remain intact.
- Scatter's source points left; its rotation offset corrects that to the same
  aiming convention as the upward-facing weapons.
- Pulse, Gravity, Mine, Shield, Repair and Matter Siphon stay fixed to the hull.
- Armor, Aegis and Standard Core already include a platform, so they replace
  the base tile instead of stacking a second platform underneath.
- Reactor Link and non-Standard Core variants retain their original glyphs.
  Retired Drive data and save migration remain unchanged.
- Weapon bodies fit inside a half-cell radius throughout rotation. Only
  barrels may overhang. The Rail's original long barrel is retained per the
  user's instruction to integrate the existing images.

## Maintenance

`module-art-manifest.json` maps game IDs to raw files, source pivots, scale,
layer masks and rotation policy. `module-art.js` renders Canvas and SVG icons.
`module-art-data.js` is the generated embedded PNG bundle; do not edit it by hand.

Run `npm run build:art` after a manifest/source-art change. The exporter reads
raw files under `New_Visuals`, retains alpha, trims exterior padding and uniformly
downsamples to a maximum 256-pixel dimension. It never rewrites source artwork.
`module-art-audit.json` records source hashes, bounds, pivots and measured fit.

For an experimental standalone build, use
`node tools/build-standalone.js outputs/experiments/<task>/Drift_Bastion_Playtest.html`.
The optional output argument prevents an experimental build overwriting the main HTML.

`npm run test:art` checks decoding, static/rotating layers, offline launch,
construction, previews, combat, mobile layout, save reload and legacy/missing-art
fallbacks in isolated browser contexts. Captures are in `outputs/module-art-qa`.
This is automated browser verification and a short visual inspection, not a
full-duration human balance playtest.

Baseline backup and the isolated integration trial are under
`outputs/experiments/2026-09-20-new-visuals-integration`.

## Enemy art

The first supplied enemy set is integrated through `enemy-art-manifest.json`:
Bolter, Scout, Sniper and Gunner use their selected transparent PNG exports in
combat. `tools/build-enemy-art.js` crops the marked concept-sheet region,
retains alpha, downscales to a 256px maximum, and records the raw checksum and
crop bounds in `enemy-art-audit.json`. Its `enemy-art.js` cache uses a larger
square frame for the long Sniper and wide Gunner, so the artwork cannot be
clipped. The remaining enemy behavior types stay on their existing procedural
fallbacks until their own source art is supplied.

## Attack effects — 2026-10-10

The user approved eight animated v2 attacks for import: Cannon, Scatter,
Missile, Cryo, Ember, Gravity, Pulse and Flak. SVG flipbooks and PNG sheets stay
in `modules/projectiles/v2`. The production `attack-vfx.js` draws their actual
projectile positions, effect lifetimes and area boundaries, with per-game
muzzle/trail state and procedural fallback while a sheet is unavailable.
`npm run build:attack-vfx` generates the embedded `attack-vfx-data.js` bundle.
Both scripts are included in the modular page, offline cache and canonical HTML.

`npm run test:attack-vfx` checks the canonical HTML at 1920×1080 with isolated
storage. Import evidence and the pre-import HTML/ZIP are under
`outputs/experiments/2026-10-10-attack-vfx-import`. Seeded fixtures for all twelve
weapons matched the accepted balance baseline. The review lab and static v1
drawings are not shipped. Laser, Arc, Rail and Mine retain their existing effects.
