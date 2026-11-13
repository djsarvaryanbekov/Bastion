# Missile Pod blast — history (2026-11-12/13)

Kept as history; none of these files is used by the game.

- `missile-blast-A/B/C.png`, `strip-*.png`: painted flipbook candidates (fireball, burning disc, shrapnel) made by
  `paint-missile-blast.cjs`. Not shown to the user as final; superseded.
- `raw/gen-v1..v4.png`, `missile-blast-gen-v*.png`: image-generator fireballs (gpt_image_2_6, module and boss sprites
  as references). Rejected: opaque, covered enemies and the ship.

Shipped (build `2026.11.13-missile-58`): `missile-blast-vfx.js` in the project root draws the blast in code, after
Nova Drift's explosions — see `research/missile-blast-2026-11-12/REFERENCES.md`.
