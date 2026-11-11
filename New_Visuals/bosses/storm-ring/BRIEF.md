# Storm Ring — hull brief

Date: 2026-11-11. Status: the first round (v1–v3, pinwheel blades) was **rejected by the user**. From the second round the user **selected v4** (sea-mine). It is wired into the test build only (`outputs/experiments/2026-11-11-space-vfx/`); the release HTML still draws the vector octagon.

## Readable role

A storm emitter that fires in every direction. Like the Siege Ring it spins with the boss's `rotation`, so it is rotationally symmetric (eight-fold, matching `sides: 8`) and needs no facing value. It must not be confused with the Siege Ring's wheel: swept blades in a pinwheel, emitter nozzles at the tips, and a violet core matching Storm Ring's `#a987ff` identity.

## Behaviour to preserve (read from `game.js`, 2026-11-11)

- Third boss variant (`variant: "storm"`), collision radius 72 world units, preferred range 310.
- Radial volleys of 12 shots plus two per three encounter levels, with a gap that opens toward the player; it stands still while charging.
- Art only: no gameplay value changes.

## Candidates

| File | Notes |
| --- | --- |
| [raw/storm-ring-v1.png](raw/storm-ring-v1.png) | Tight pinwheel, blades overlap; small core on thin arms. |
| [raw/storm-ring-v2.png](raw/storm-ring-v2.png) | Fullest blades with long violet strips; reads as the heaviest. |
| [raw/storm-ring-v3.png](raw/storm-ring-v3.png) | Open ring with eight nodes and separate hooked arms; the most distinct from the Siege Ring. |

All three: 1024×1024 PNG with real alpha. Margins are tight and v1 and v2 touch the bottom edge. Comparison on the game background: [technical/candidates-on-game-background.png](technical/candidates-on-game-background.png).

## How they were made

Image tool in the Claude session (model `gpt_image_2_6`, quality high, 1k, transparent, 1:1). References attached: `../../enemies/raw/colossus-v1.png`, `../pursuer/raw/pursuer-v2.png`, and Siege Ring v1. Job ids: `a79f2b44-29c7-4b19-a765-9052500f1db7` (v1), `d364b1a8-c694-4e23-9bf5-53cfc958db9b` (v2), `98418f5d-bb68-472e-a81e-f2141957cf70` (v3).

Prompt:

> Game sprite of an enemy boss called Storm Ring, in exactly the same art style as the reference sprites: graphite-grey structure, terracotta-orange armor plates, two-tone faceted shading, crisp dark outlines, strict top-down orthographic view, no perspective. It must look clearly different from the wheel-shaped boss in the references. Design: a storm emitter that fires in all directions and spins, so it is rotationally symmetric with eight-fold symmetry. Eight large swept armor blades arranged like a turbine or pinwheel around an open ring, each blade ending in a wide emitter nozzle. A hollow center with a floating violet energy core (colour #a987ff) held by thin graphite arms. Violet light strips along each blade. A few large connected shapes, readable when small. One sprite, centered, with a clear margin around it, transparent background. No lightning, no projectiles, no glow, no shadow, no text, no background.

## Second round — 2026-11-11

The pinwheel direction was rejected outright, so these avoid curved or swept blades and wheel shapes.

| File | Shape | Job id |
| --- | --- | --- |
| [raw/storm-ring-v4.png](raw/storm-ring-v4.png) | Sea-mine: round core with eight straight cannons and a large violet dome. | `ec966e5e-c719-4d32-98f3-d7eddf61fc2b` |
| [raw/storm-ring-v5.png](raw/storm-ring-v5.png) | Fortress: solid octagonal platform with eight violet pylons and a faceted central dome. | `27a3ae54-6b2b-4f58-9684-2a3d339eb18a` |
| [raw/storm-ring-v6.png](raw/storm-ring-v6.png) | X-platform: square reactor with four long diagonal gun arms (four-fold symmetry). | `99da49d5-f442-4006-a652-5e54d7a3e01f` |

Same tool, settings and references as the first round, without the Siege Ring reference. Each prompt began with the shared style sentence and "It must not look like a wheel and must not have curved or swept blades", followed by the shape described in the table. Comparison: [technical/second-round-on-game-background.png](technical/second-round-on-game-background.png). Margins are tight on all three.

## Decision and integration — 2026-11-11

- v4 selected by the user, used as generated.
- `enemy-art-manifest.json`: entry `bossStorm`, scale 1.3, export up to 384 px. `game.js`: `BOSS_ART_TYPES.storm`; the sprite spins with the boss's existing `rotation`.
- The cannons reach past the 72-unit collision circle; the round core sits inside it. Gameplay values are unchanged.
- In-game captures: `outputs/experiments/2026-11-11-space-vfx/review/boss-storm-ring-in-game.png` and `boss-storm-ring-charging.png`.

## Rule from the user

Strict top-down only: no isometric view, no 3D look, nothing drawn from an angle. A sprite must look the same from every side it repeats on. Put this in every prompt.
