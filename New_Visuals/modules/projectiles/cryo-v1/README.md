# Cryo status on enemy hulls

Build `2026.10.16-cryo-status-45` implements the requested enemy cold visuals
from the [cryofluid reference discussion](../cryo-reference/README.md).
The user authorized integration after reviewing that direction. Final
appearance approval is not implied. Cryo combos remain deferred.

Chilled enemies have restrained pale frost facets clipped to their actual
artwork, with small cyan motes emitted across the hull. Older motes stay in
world space as the ship moves and turns. True freeze uses heavier, brighter
frost for the existing Freeze proc; its final 0.12s crossfades toward the chilled
appearance. Frost fades over the final 0.4s of slow. The two old partial blue
arcs are removed. The cold pass runs after all enemy sprites and before burn,
so other enemy sprites cannot cover the status and concurrent fire remains visible.

Mindustry provides the small cyan emission reference. Armor frost and the
heavier true-freeze appearance are our adaptation, not features attributed to
Mindustry. Cryo projectiles, hit effects and the weapon module retain build 44.

[cold-vfx.js](../../../../cold-vfx.js) owns presentation. Two frost overlays per
cached sprite are built on demand, clipped through the original sprite alpha
and held by weak keys. The original artwork is unchanged. A fallback draws
compact facets for vector enemies/bosses. Detailed particles have a bound of
12 per enemy and use deterministic cosmetic seeds. Detail budgets 32/16/0
match other status VFX; Low quality and Reduced flashes retain steady frost.
Animation reads simulation time and freezes on pause.

Every gameplay method and the Cryo balance/upgrade definitions match build 44.
Base hits still apply 50% speed for 2s. Existing upgrades, four-hit Freeze proc,
0.6s freeze, immunity and boss resistance are retained. Cold and burning
continue to coexist independently. No new elemental reactions, currency,
save schema, progression or upgrade changes are included.

Checks include syntax and full `npm test`; the dedicated Cryo checks cover
actual projectile hits, Freeze proc, boss resistance, expiry/death, pause,
layering, quality budgets, clipped cache reuse, world-space emission, bounded
history and canvas/gameplay/RNG/save purity. The task-only baseline audit
compares all 86 gameplay methods and Cryo definitions against the saved source.
Built-in browser review at 1920×1080, normal scale and isolated muted storage
covers small/large enemies, real hits, freeze-to-chill, expiry, motion/turning,
crowds, low/medium/high quality and reduced flashes. These are controlled
checks, not a human gameplay or balance approval.

Baseline HTML/package/source, fixture and review captures are preserved in
`outputs/experiments/2026-10-16-cryo-status/`.
