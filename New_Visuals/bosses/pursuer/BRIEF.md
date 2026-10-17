# Pursuer — hull and animation brief

Date: 2026-10-14. Status: v2 is the current review candidate. The separate
[motion study](review.html) demonstrates the proposed presentation. No
candidate has been accepted or integrated.

Asset chat: https://chatgpt.com/c/6acf3000-b0d0-83eb-9fc5-b24788abbceb

## Readable role

A heavy, compact triangular ram with a reinforced blunt prow, broad swept
shoulders and two substantial rear engines. Comparable width and length keep
it distinct from the long Hunter fighter and the four-pod Colossus. Use a
small number of large connected armor masses; the silhouette must survive
reduction to the existing boss footprint.

Match the current enemy family: graphite structure, terracotta plates,
controlled faceted shading and crisp edges. Restrained amber-orange power
accents correspond to Pursuer's existing `#ff9b55` identity.

Actual references inspected and attached:

- `../../enemies/raw/hunter-v1.png`: faction materials and illustrated edges.
- `../../enemies/raw/colossus-v1.png`: armor weight and broad surfaces.

Output: one centered upward-facing overhead orthographic hull, real alpha,
preferred 1024x1024 PNG, generous clear margins. Keep exhaust, trails, warning
lanes, projectiles and background out of the base sprite.

## Existing behavior to preserve

Verified against `game.js` on 2026-10-14:

- Boss collision radius: 72 world units. It spawns as the second boss variant.
- Dash warning: 1.15 seconds, with locked direction and stationary wind-up.
- Dash: up to 0.9 seconds at 320 world units/second before slow effects.
- Aimed volley warning: 0.9 seconds; five shots, 0.18 radians between shots.
- Phase one alternates dash and aimed volley. At half HP, the next attack
  selection switches to two dashes per three attacks and one aimed volley.
- A requested dash beyond 300 units becomes an aimed volley instead.
- Existing cooldowns, damage, HP, collision, motion and warning boundaries
  remain gameplay authority during eventual visual integration.

## Presentation contract

1. Idle: a quiet central power spine and restrained engine light.
2. Dash wind-up: power and engine intensity rise over the actual warning;
   the existing lane remains unobstructed and the hull faces locked dash aim.
3. Dash: bright short rear exhaust and a restrained trail, aligned with actual
   velocity. Fade as the real dash ends; do not stretch the hull or move it
   separately from its collision center.
4. Volley wind-up: a visible forward emitter charge using the real attack
   progress; flash at the real five-shot release.
5. Phase two: a persistent change in the power/engine pattern after the real
   phase changes. Keep the same silhouette and existing telegraphs readable.
6. Hit/death: reuse current combat feedback with the new hull. No full-screen
   flashes or giant debris cloud.

Current boss `rotation` advances continuously and also supports other boss
patterns. A directional hull will need a separate presentation facing value
when integrated. Do not repurpose that gameplay value or introduce rotation
of the warning lane. Review locked-aim, dash-end and phase-switch transitions
before finalizing renderer logic.

## Candidate checks

Inspect raw dimensions, alpha distribution, transparent borders, centering,
clipping, orthographic geometry and role clarity at the existing gameplay
size. Do not label a painted checkerboard as transparency. Keep any technical
resizes separate and proportional. The raw generated image is always retained.

## Version history

- `raw/pursuer-v1.png`: original Chrome download, 1254x1254 RGBA with genuine
  alpha. Graphite/terracotta materials and twin engines match the family,
  but the long nose is too close to Hunter. Revision requested: a short broad
  blunt prow, fuller connected shoulders, fewer armor fragments and a clean
  transparent border. The raw alpha bounds include faint pixels at the bottom
  canvas edge, so this version is not ready for runtime export.
- `raw/pursuer-v2.png`: the actual saved v1 PNG was reattached in the same chat. The revision
  asks for a beveled front bumper spanning 35-40% of hull width, a prow
  extending about 15% ahead of the shoulders, shorter wing tips and two
  substantial rear engines. The broad blunt prow and compact shoulders are
  visibly improved. The raw download is 1254x1254 RGBA with genuine alpha.
  Visible artwork has at least 8% canvas margins; very faint exterior alpha
  specks remain in the raw file.

## Motion study and technical preparation

`prepare_preview.py` records raw hashes and alpha measurements in `audit.json`.
It crops exterior near-transparent specks using the visible-art bounds,
centers the unchanged hull, pads to contain its circular footprint, then
proportionally downsamples a separate 256px review export. No stretching,
repainting or raw-file replacement is performed.

`review.js` draws separate engine light/exhaust and power/emitter glows over
that technical export. The warning/dash/volley durations and five-shot spacing
match the current behavior. The page is a repeating presentation study with
manual attack and phase controls, not an encounter simulation or a balance
playtest. Phase-two lighting is a proposal; it does not simulate the changed
attack sequence. Existing game code and the main HTML were not edited for
this study.
