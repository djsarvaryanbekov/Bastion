# Missile blast — how comparable games show an explosion's area (2026-11-12)

Screenshots: Steam store galleries, saved in `steam/<game>/`, contact sheets `steam/<game>-sheet.jpg`.
Close crops: `steam/crop-*.jpg`.

| Game | What a blast looks like | How you read the radius |
|---|---|---|
| Nova Drift (`crop-nova-01.jpg`) | Translucent warm disc (~30% opacity) with a slightly brighter soft edge; a small white-hot core flash in the middle; overlapping blasts add up in brightness | The disc *is* the damage area; enemies stay visible through it |
| Space Scavenger (`crop-scav-04.jpg`, `crop-scav-10.jpg`) | A clump of flat-shaded white and grey smoke puffs, a dark scorched centre, orange spark specks flying outward; no fireball | Puffs and sparks spread to the edge of the area |
| Halls of Torment (sheet, shot 4) | Translucent coloured discs for areas | Disc edge |
| Reassembly (sheet, shots 7-8) | Spark/particle bursts with a faint circular glow | Particle spread |
| Brotato (sheet, shot 5) | Small cartoon orange puff | Not shown; blasts are small |
| Cosmoteer (sheet, shot 10) | Realistic fire flipbooks on hulls | Not shown; damage is per tile |

Guidance (League of Legends VFX style guide, VFX Apprentice AoE article): the edge of an area effect must be
the easiest thing to read, and the visual must match the real hit area. An effect that covers half its area
"misleads". Keep it distinct but not covering the play.

What failed here:
- Old: Flak burst sprite, ~40% of the real radius.
- Generated fireballs (2026-11-12): opaque, covered enemies and the ship; no game in this list does that.

Directions to build from these references:
1. Nova Drift style: translucent heat disc at the exact radius + soft brighter edge + short white core flash.
2. Space Scavenger style: flat-shaded smoke puffs and orange sparks thrown out to the radius, scorched centre.
3. Both: a faint disc for the area, puffs and sparks for the impact.

## Nova Drift in motion (launch trailer, `video/launch-trailer.mp4`, frames 34.45-35.3 s)
Steam trailer frames in `video/thumbs/` (`blast-seq.png`, `f*.png`). One blast, 0.15 s apart:
- 0-0.2 s: a small overexposed ball (white centre, yellow band, orange-red glow, four-point sparkle),
  about a quarter of the sphere's radius, inside a faint sphere that already spans the full radius.
- 0.3-0.45 s: the ball cools into a lumpy pink-white puff inside a smaller, brighter sphere (~0.4 R).
- 0.6 s on: only the big sphere is left, fading slowly; several overlap.
- The sphere is a tint, not paint: about +55 red over the background in the middle, +90 at a soft edge.
Built in `missile-blast-vfx.js` (red-orange, from the screenshot the user chose). Comparison:
`outputs/experiments/2026-11-12-missile-blast/motion-compare.png`.
