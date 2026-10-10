# Weapon projectile and attack artwork

**Current integrated effects: [eight animated v2 attacks](v2/README.md).** The user approved their import on 2026-10-10; the main game and package now use them in `2026.10.10-attack-vfx-27`. The user rejected v1 for Auto Cannon, Scatter, Missile, Cryo, Ember, Gravity, Pulse and Flak: isolated drawings did not demonstrate the attacks. [The earlier moving preview](../../../outputs/experiments/2026-10-09-attack-vfx-v2/Drift_Bastion_Playtest.html) is preserved to compare original/revised rendering.

The 12 static v1 SVGs below are preserved as history. Laser, Arc, Rail and Mine remain unapproved v1 concepts outside the latest revision.

Each weapon's current module art is the reference. Physical ammunition uses pale metal and graphite; energy uses a visible light core and restrained colored edges. The 12 attacks retain their gameplay identity. Passive modules do not receive invented projectiles. The rejected procedural VFX experiment is excluded as a style reference.

The earlier [static v1 artwork preview](review-v1.html) is preserved for reference. It enlarged the drawings for inspection and did not establish gameplay readability. [artwork-manifest.json](artwork-manifest.json) records those original sources and current rejection status.

| Weapon | Editable source | Transparent export |
| --- | --- | --- |
| Auto Cannon | [Round v1](svg/auto-cannon-round-v1.svg) | [PNG](png/auto-cannon-round-v1.png) |
| Piercing Laser | [Beam v1](svg/piercing-laser-beam-v1.svg) | [PNG](png/piercing-laser-beam-v1.png) |
| Missile Pod | [Missile v1](svg/homing-missile-v1.svg) | [PNG](png/homing-missile-v1.png) |
| Scatter Array | [Single pellet v1](svg/scatter-pellet-v1.svg) | [PNG](png/scatter-pellet-v1.png) |
| Arc Emitter | [Lightning segment v1](svg/arc-lightning-segment-v1.svg) | [PNG](png/arc-lightning-segment-v1.png) |
| Rail Lance | [Slug v1](svg/rail-slug-v1.svg) | [PNG](png/rail-slug-v1.png) |
| Flak Battery | [Airburst v1](svg/flak-airburst-v1.svg) | [PNG](png/flak-airburst-v1.png) |
| Pulse Nova | [Wave v1](svg/pulse-nova-wave-v1.svg) | [PNG](png/pulse-nova-wave-v1.png) |
| Cryo Projector | [Bolt v1](svg/cryo-bolt-v1.svg) | [PNG](png/cryo-bolt-v1.png) |
| Mine Layer | [Mine v1](svg/proximity-mine-v1.svg) | [PNG](png/proximity-mine-v1.png) |
| Ember Projector | [Flame v1](svg/ember-flame-cone-v1.svg) | [PNG](png/ember-flame-cone-v1.png) |
| Gravity Well | [Field v1](svg/gravity-well-field-v1.svg) | [PNG](png/gravity-well-field-v1.png) |

Sources are plain SVG paths, shapes, groups and gradients, editable in Inkscape. Directional art points upward. PNGs are exported at 4× the SVG viewBox dimensions with Inkscape 1.4.2 and background opacity zero. Save numbered versions when revising; preserve these v1 sources.

To re-export and inspect after editing a source, run from the project root:

```powershell
node New_Visuals/modules/projectiles/export-pngs.cjs
node New_Visuals/modules/projectiles/inspect-art.cjs
```

`INKSCAPE_PATH` can override the default installed Windows CLI path. Inspection uses an isolated browser without user storage. It checks weapon coverage, SVG parsing, PNG dimensions, genuine alpha, unclipped margins, Pulse's transparent center, visible pixels at suggested evaluation sizes, and the 1920×1080 static review. Evidence is in [qa/report.json](qa/report.json) and [the preview capture](qa/review-1920x1080.png). The actual rendered artwork was also visually inspected. These checks are not integrated gameplay or animation tests.

The original artwork-first request did not authorize integration. The later approval applies to the eight v2 effects above. Their integration preserves gameplay range, collisions, damage, timing and existing projectile budgets.

## Earlier generation attempts

[generation-manifest.json](generation-manifest.json) and `briefs/` preserve the initial reference mappings and attempt history. Two Cannon responses in [the Chrome chat](https://chatgpt.com/c/6ac8d9ea-b63c-83ed-a7b9-8a69f40f628a) were blank; no image was recovered. The user briefly authorized the built-in generator, then chose drawn SVGs before any built-in generation call. That choice supersedes the old generation route for this set.
