# Remaining enemy sprite briefs

These are production briefs for the ten current behaviors that still use
procedural fallback art. Each is a separate ChatGPT image-generation chat and
must use one of the approved Bolter, Scout, Sniper, or Gunner raw images as a
material and rendering reference only. All outputs must be a single centered,
top-down orthographic enemy silhouette on a genuinely transparent PNG; no
labels, concept-sheet panels, shadows, ground, perspective, UI, or weapons
fired from the image.

Shared style: dark graphite mechanical hull, terracotta/coral armor plates,
small red-orange emissive core, crisp pale metal edges, restrained details,
readable at 32–64px. The sprite faces upward. Its silhouette, rather than text
or effects, must communicate the role.

## Swarm Drone — `drone`

Smallest unit. Diamond body with four short stabilizer fins, a narrow coral
top plate, and one bright red vertical core. Make it compact and visibly less
armored than Scout.

## Hunter — `hunter`

Fast pursuit craft. Forward spear nose, swept rear wings, two slim engine
pods, and an exposed central red core. It must read as a quick dart at 48px.

## Raptor — `raptor`

Elite high-speed predator. Angular arrowhead body, longer swept wings than
Hunter, a forked rear, and a vivid magenta-red core. It must look more lethal
and more valuable than Hunter without becoming larger than its game radius.

## Orbiter — `orbiter`

Circular skirmisher. Open mechanical ring with three compact radial pods and
a red core suspended in the center. Keep the outer ring broken at one point
so it does not look like a generic circle at small size.

## Brute — `brute`

Large collision-heavy chassis. Broad square armored body, heavy shoulder
plates, deep central core recess, and short rear thruster housings. The visual
weight must read before its details.

## Bulwark — `bulwark`

Shielded heavy. Wide forward-facing shield plate, protected central core, and
side armor wings. Leave a clear solid front silhouette that makes its shield
role readable; do not draw an energy shield effect into the sprite.

## Bomber — `bomber`

Explosive carrier. Compact forward body with two visible cylindrical payload
canisters hanging behind it. Use amber hazard accents sparingly; the canisters
must distinguish it from Gunner at 64px.

## Splitter — `splitter`

Dividing threat. Two mirrored hull halves separated by a narrow bright red
central seam and linked by two small structural bridges. It must visibly imply
that it can divide without looking broken.

## Colossus — `colossus`

Largest standard enemy. Wide armored capital chassis with a large recessed
red core, four symmetrical outer pylons, and heavy layered plates. Keep a
single readable mass with no thin fragile details; it will be reduced to 64px.

## Shard — `mini`

Small split-off fragment. A simple sharp three-sided dart with one red core
slit and two tiny stabilizer fins. It must be distinct from Scout and readable
at 24–32px.

## Import contract

After a candidate is selected, save it as `raw/<id>-v1.png`; add its crop,
scale and `forward: -90` to `enemy-art-manifest.json`; run
`node tools/build-enemy-art.js`; then verify it alongside all enemy types with
`node tools/enemy-art-browser-check.js`. Raw art remains unmodified.
