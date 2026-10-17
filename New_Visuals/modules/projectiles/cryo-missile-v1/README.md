# Cryo + Missile cold payload

Build `2026.10.17-cryo-missile-49` adds the requested second Cryo spatial combo.
The existing Cryo + Rail Shatter combo remains at +25% damage against actual
chill/freeze, including the new missile chill.

An installed Missile Pod sharing a cell edge with Cryo snapshots a cold payload
at each discharge. Diagonals and extra Cryos add no benefit. Fired payloads
persist after source loss; future volleys recheck adjacency. Projectile pooling
resets the payload flag for every weapon and hostile shot.

Each existing missile blast applies 25% slow for 1 second to survivors inside
the unchanged damage area. Boss speed remains at least 80%. Equal missile chill
refreshes without stacking; a stronger active slow is neither weakened nor
extended. Freeze hit history, freeze/immunity timers and burning are untouched.
Salvo, Heavy and the three secondary Cluster blasts carry the same weak payload
without changing damage, radius, homing, reload or shot count.

Browser verification exposed an existing boss-contact gap: a radius-5 missile
could collide with a radius-72 boss at distance 75–77, outside the base radius-74
blast's center test. Only that boss contact now projects the primary blast to
the real hull surface. The radius and damage formula are retained; Cluster's
three secondary centers remain at their original positions. Travel regression
checks cover 30/60/120 Hz and several contact offsets, with warm/cold damage
parity. This repairs the missed hit for ordinary missiles as well.

Presentation uses the existing missile artwork with a small pale cold warhead
and cyan exhaust trail. Cold explosions shed a short burst of ice facets and a
faint central puff instead of the warm blast stamp. Surviving enemies use the
existing silhouette-clipped frost and cold particles. There is no persistent
area indicator or added freeze icon. Quality and Reduced flashes reduce facet
count/opacity; the ordinary effect pool and existing blast lifetime are reused.

Production renderers: `attack-vfx.js` and `cold-vfx.js`. Gameplay and Build links
remain in `game.js`; no new bitmap asset, persistence field or upgrade is added.
Build previews count both receiver types and explain their different effects.

Validation evidence lives in
`outputs/experiments/2026-10-17-cryo-missile/qa/`.
