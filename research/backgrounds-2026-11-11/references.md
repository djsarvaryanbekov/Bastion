# Background references — 2026-11-11

How comparable games draw the playfield background. Looked at on 2026-11-11 from each game's Steam store screenshots (stills only, one or two per game), plus one three-minute run of Stellar Swarm played earlier the same day. Nothing here was measured in motion except Stellar Swarm.

Purpose: the user rejected three rounds of invented backgrounds and asked for a study first. No background is chosen yet.

## What each game does

| Game | Approach | Screenshot |
| --- | --- | --- |
| Nova Drift | Painted purple nebula. Asteroids are near-black faceted silhouettes, darker than the field. One ringed planet as a landmark. All colour belongs to the ship and shots. | https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/858210/ss_f09b4b090294906d42a2b7244fdc2d110ce9d29d.1920x1080.jpg |
| Astro Prospector | The whole field is one warm brown hue with soft tone-on-tone blotches. One striped planet in the same palette. Faint dashed range circles. | https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3503440/22cf55234c77ddc7cde5d041daadb56afb651def/ss_22cf55234c77ddc7cde5d041daadb56afb651def.1920x1080.jpg |
| GUNBOAT-8 | Flat bright blue sea with faint wave lines. Islands are simple flat shapes with a pale outline. Pixel art. | https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4783980/c9d5f95026af318e505980c5078d92989e938799/ss_c9d5f95026af318e505980c5078d92989e938799.1920x1080.jpg |
| Geometry Wars 3 | A glowing grid is the background. It bends around explosions and gravity. | https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/310790/ss_5f9f634a96e0651e30b769e44d0839525d5f7920.1920x1080.jpg |
| Space Scavenger | Dark blue field with slightly darker asteroid silhouettes and one large pale rock at the screen edge. | https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1040460/ss_555506465839c0de113a718db24bf31e1a2ddb62.1920x1080.jpg |
| Void Scrappers | Pure black. Enemies and shots carry all the colour. | https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2005210/ss_1842377ce45c61f3d9aad233dd335ee460345b4b.1920x1080.jpg |
| Swarm Grinder | Near-black ground with a soft vignette and faint dark shapes. | https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1375900/ss_fb64c13ff3f81c4c92080d5b72521c5ae0e7de82.1920x1080.jpg |
| Stellar Swarm | Dark navy with large faint technical arcs and lines, like a radar chart. Played, not a store still. | https://www.crazygames.com/game/stellar-swarm |
| Cosmoteer | Realistic red nebula and stars behind detailed ships. | https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/799600/09a81962fe37ec21a377a113cb28459cd0ac8d11/ss_09a81962fe37ec21a377a113cb28459cd0ac8d11.1920x1080.jpg |
| Starcom: Nexus | Rendered 3D planet and nebula. | https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/863590/ss_558d48279558702e4998799a8ece61a028058383.1920x1080.jpg |

Reassembly's store entry returned its soundtrack page, and Minishoot' Adventures is hand-drawn terrain, not space; neither is used.

## Patterns

1. Background objects are darker than the field, never lighter. Nova Drift and Space Scavenger both use dark silhouettes. The asteroid candidate made here on 2026-11-11 did the opposite (rocks lighter than the field), which is one reason it read as foreground.
2. The field has one hue, and that hue is part of the game's identity: purple for Nova Drift, brown for Astro Prospector, blue for GUNBOAT-8.
3. Detail is tone-on-tone. None of these puts mid-brightness, detailed objects behind the action.
4. One landmark at most (a planet), in the field's own palette.
5. Several successful games use almost nothing: Void Scrappers and Swarm Grinder are near-black. Bastion's original background is in this group, closest to Stellar Swarm.
6. Realistic nebulae and rendered planets (Cosmoteer, Starcom) are excluded by the user's "no realism" rule.

## Space Scavenger in motion — the chosen reference

The user picked Space Scavenger's background (the background only; its 3D rocks are not wanted). Studied on 2026-11-11 by stepping through a 31-minute no-commentary video frame by frame: https://www.youtube.com/watch?v=KzFJkPjv17U (Nintendo Switch version), plus the 27-second Steam trailer. Positions were read by eye from stills 0.5–1 s apart, so the ratios are approximate.

What the background is made of, back to front:

1. A black base.
2. A soft haze in one hue that fills most of the level: blue in levels 1-x, green in levels 2-x. It is uneven, with brighter and darker areas, and fades to black outside the level boundary.
3. Flat black rock silhouettes in many sizes, from specks to about a sixth of the screen height. They are plain 2D shapes, darker than the haze, with no shading.
4. Tiny pale stars, visible only in the dark areas.

The 3D low-poly grey rocks are not part of the background. They are gameplay objects you collide with and tow, and they move 1:1 with the world.

How it moves:

- **Only with the camera.** At 25:00–25:03 the camera was almost still while the ship manoeuvred; every silhouette shifted by the same ~20 px and none moved against the others. No drift, spin or animation of their own was visible.
- **Slowly.** At 18:14–18:16 the level boundary (fixed in the world) moved about 130–140 px per second across the screen while the silhouettes moved about 20–30 px. That is roughly 15–20% of the camera's speed.
- **As one layer.** Haze and silhouettes appear to move at the same slow rate, so they read as one distant backdrop. Nothing in the background moves at a different speed from the rest.
- **No grid in flight.** A grid appears only around the ship in Build mode. The glowing boundary line and the hex pattern outside it are level walls, not background.
- **Colour marks progress.** The hue changes when the level set changes.

Why this matters for Bastion: the earlier nebula was rejected because its patches moved at 7% while Bastion's grid moves at 100% and its near stars at 65–100%, so the patches looked stuck to the screen. Space Scavenger avoids that by having no fast-moving background layer at all. Copying it faithfully therefore raises one question: what happens to Bastion's grid.

## Rejected here on 2026-11-11

- Nebula blobs that barely moved while grid and stars scrolled.
- Dust clouds, deep stars, sector grid, debris polygons.
- Wreck graveyard, lighter asteroid field, code-drawn megastructure, gas giant with rings.
