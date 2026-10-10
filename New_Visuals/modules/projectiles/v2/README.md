# Moving attack effects — v2

Approved for import on 2026-10-10 and integrated into the main game and package as `2026.10.10-attack-vfx-27`.

The production renderer is [attack-vfx.js](../../../../attack-vfx.js), with shared decoded sheets and separate cosmetic state for each game instance. `npm run build:attack-vfx` bundles the approved PNGs into `attack-vfx-data.js` without editing artwork. `npm run test:attack-vfx` verifies the canonical HTML. [Integration evidence](../../../../outputs/experiments/2026-10-10-attack-vfx-import/qa/report.json) covers the eight production render hooks, real mechanics, pooled state, reduced flashes, missing-art fallback and unchanged saves. A seeded comparison also matched all twelve weapons against the accepted balance baseline. The previous main HTML and package are backed up in that task directory.

The user rejected the static v1 concepts for Auto Cannon, Scatter Array, Missile Pod, Cryo Projector, Ember Projector, Gravity Well, Pulse Nova and Flak Battery. A large isolated drawing did not demonstrate the attack. These eight were first reviewed as **animated attacks running in a copy of the actual game**, with editable SVG flipbooks, transparent PNG sheets and presentation code.

Open [the live combat preview](../../../../outputs/experiments/2026-10-09-attack-vfx-v2/Drift_Bastion_Playtest.html). It starts with Scatter. The buttons switch weapons; **Showing revised** switches between the original and revised rendering without changing combat. **Pause** freezes the scene. The recording is [attacks in motion](../../../../outputs/experiments/2026-10-09-attack-vfx-v2/qa/attacks-in-motion-1920x1080.webm).

| Attack | Moving presentation | SVG source |
| --- | --- | --- |
| Auto Cannon | Small hot tracer, muzzle flash and existing impact sparks | [Flipbook](svg/cannon-effect-sheet-v2.svg) |
| Scatter Array | Five independent small pellets per shot, each moving along its actual spread vector | [Single-pellet flipbook](svg/scatter-effect-sheet-v2.svg) |
| Missile Pod | Small rocket, flickering engine, trail along its actual curved flight and a detonation | [Flipbook](svg/missile-effect-sheet-v2.svg) |
| Cryo Projector | Frost comet; actual hit applies slow and the existing status marker shows the affected enemy | [Flipbook](svg/cryo-effect-sheet-v2.svg) |
| Ember Projector | Overlapping moving flame packets, clipped to the actual cone; targets keep burning after the jet | [Flipbook](svg/ember-effect-sheet-v2.svg) |
| Gravity Well | Violet wisps move inward while actual enemies are pulled toward the field | [Wisp flipbook](svg/gravity-effect-sheet-v2.svg) |
| Pulse Nova | A wave expands around the emitter while targets around it take radial damage | [Energy-edge flipbook](svg/pulse-effect-sheet-v2.svg) |
| Flak Battery | Short flash and uneven outward shrapnel while hostile shots are destroyed | [Burst flipbook](svg/flak-effect-sheet-v2.svg) |

`sheets.json` describes the eight editable SVG sources and PNG exports, with 44 frames total. SVGs contain editable groups for each frame. `attack-vfx.js` draws and animates these parts using actual game positions, velocities, effect lifetime, cone boundaries and field radius. A single pellet texture is instantiated five times by Scatter's existing firing code.

The review uses the game's Game, projectile collision, homing, damage, slow, burn, gravity and Flak interception code. `combat-lab.js` supplies controlled target arrangements and movement in the existing Test Range, plus visual event tags. It is a review fixture, not production UI. The original/revised toggle keeps the same simulation running. Muzzle cosmetics are capped at 64 and expire; each missile retains at most ten sampled trail points. Existing projectile rendering budgets remain in place.

The earlier standalone review has separate save keys and no service-worker registration. Its local `attack-vfx.js` and `combat-lab.js` remain review fixtures; production does not import the lab, target arrangements or comparison controls. The integration changes presentation only. Laser, Arc, Rail and Mine are outside this revision; their v1 concepts have not been implicitly approved.

## Rebuild and inspect

Run from the project root:

```powershell
node New_Visuals/modules/projectiles/v2/draw-sheets.cjs
node New_Visuals/modules/projectiles/v2/build-review.cjs
node New_Visuals/modules/projectiles/v2/check-review.cjs
node New_Visuals/modules/projectiles/v2/record-preview.cjs
```

For one sheet, pass its module ID to `draw-sheets.cjs`, for example `ember`. This regenerates the working v2 source/export; make a new numbered version when preserving a chosen design. `INKSCAPE_PATH` overrides the installed Inkscape CLI path. `serve-review.cjs` serves just the standalone preview and recording on an available loopback port.

Validation runs at **1920×1080, normal scale**. [The earlier review report](../../../../outputs/experiments/2026-10-09-attack-vfx-v2/qa/report.json) covers firing for all eight weapons, five distinct Scatter vectors, homing turns, slow, burn, inward pull, Flak clearing only shots within its range, transparent flipbook frame margins, bounded muzzle feedback, rendering without simulation mutation and preservation of a sentinel in the original save key. The rendered scenes were visually inspected, and the recording shows the effects in motion. These automated fixtures do not establish full-run balance or release readiness.
