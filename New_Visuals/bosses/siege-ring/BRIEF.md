# Siege Ring — hull brief

Date: 2026-11-11. Status: **v1 selected by the user**, unchanged. It is wired into the test build only (`outputs/experiments/2026-11-11-space-vfx/`); the release HTML still draws the vector ring.

## Readable role

A heavy circular siege platform. It is radially symmetric on purpose: the boss `rotation` value in `game.js` advances continuously, so a ring looks correct at any angle and needs no separate facing value (unlike the Pursuer).

- Thick armored outer ring of twelve plated segments, one outward gun emplacement each. Twelve matches the boss's `sides: 12`.
- Compact hub with a pink-red reactor, matching Siege Ring's `#ff637c` identity.
- Four struts between hub and ring, with open gaps so it reads as a ring and not a disc.
- Same enemy family as the other sprites: graphite structure, terracotta plates, flat faceted shading, crisp dark outlines.

## Behaviour to preserve (read from `game.js`, 2026-11-11)

- First boss variant (`variant: "ring"`), collision radius 72 world units.
- Attack pattern `aimed`; volley of 8 shots plus one per encounter level, up to 12.
- HP, damage, cooldowns, collision and telegraphs stay as they are. This is art only.

## Candidates

| File | Notes |
| --- | --- |
| [raw/siege-ring-v1.png](raw/siege-ring-v1.png) | Widest armor pads, guns sit on top of the pads. Cleanest ring. |
| [raw/siege-ring-v2.png](raw/siege-ring-v2.png) | Guns run through the ring as long barrels; more grey, less terracotta. |
| [raw/siege-ring-v3.png](raw/siege-ring-v3.png) | Chunkiest pads, largest reactor. Reads best when small. Touches the bottom edge of the canvas. |

All three: 1024×1024 PNG with real alpha.

## Decision

The user chose v1 and asked whether it was a little over-detailed. Two simplified revisions were made from it ([raw/siege-ring-v4.png](raw/siege-ring-v4.png), [raw/siege-ring-v5.png](raw/siege-ring-v5.png); comparison in [technical/v1-vs-simplified.png](technical/v1-vs-simplified.png)). The user rejected both: v1 stays as generated. They are kept as history only.

## Integration (test build only)

- `enemy-art-manifest.json`: entry `bossRing`, source `bosses/siege-ring/raw/siege-ring-v1.png`, scale 1.2, export up to 384 px (`maxSize`, new optional field in `tools/build-enemy-art.js`).
- `game.js`: `BOSS_ART_TYPES` maps the `ring` variant to that sprite; `drawBossSprite` draws it with the boss's existing rotation and hit flash, and falls back to the vector hull for variants without art (Pursuer, Storm Ring).
- Gameplay values, collision radius, telegraphs and the boss locator are unchanged.
- In-game captures: `outputs/experiments/2026-11-11-space-vfx/review/boss-siege-ring-in-game.png` and `boss-siege-ring-charging.png`.

## Known defects before any integration

- Margins are tight: the hull nearly fills the canvas, and v3 reaches the bottom edge. Scale and pad before export.
- Edges are clean on the game background: only 2–5% of pixels are semi-transparent (anti-aliasing). The orange haze visible in some image viewers is colour stored in fully transparent pixels and does not show in the game.
- Checked only as a static composite at about gameplay size ([technical/candidates-on-game-background.png](technical/candidates-on-game-background.png)). Not checked in the running game against the 72-unit collision radius.

## How they were made

Image tool in the Claude session (model `gpt_image_2_6`, quality high, 1k, transparent background, 1:1), 4.5 credits for the three. Reference images attached: `../../enemies/raw/colossus-v1.png` and `../pursuer/raw/pursuer-v2.png`. Job ids: `0bc242da-7d2e-476e-b011-cc0a765c73fa` (v1), `68c8d44e-9708-4245-b67a-1d2cfb1f145b` (v2), `ad14d83c-b941-4f5f-988d-2f54602ea7a2` (v3).

Prompt:

> Game sprite of an enemy boss called Siege Ring, in exactly the same art style as the two reference sprites: graphite-grey structure, terracotta-orange armor plates, flat faceted cel shading, crisp dark outlines, strict top-down orthographic view, no perspective. Design: a heavy circular siege platform that is radially symmetric so it looks correct at any rotation. A thick armored outer ring made of twelve repeating plated segments, each segment carrying one short gun emplacement pointing outward. A compact armored hub in the center with a glowing pink-red reactor core (colour #ff637c). Four sturdy struts connect the hub to the ring, with clearly open gaps between them so the shape reads as a ring, not a disc. A few large connected armor masses, restrained pink-red light accents along the ring, no tiny greebles. One sprite, centered, generous clear margin, transparent background. No exhaust, no projectiles, no shadows on the ground, no text, no background.
