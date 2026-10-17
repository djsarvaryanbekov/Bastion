# Cryo + Rail Shatter

Build `2026.10.16-cryo-shatter-47` integrates the user's requested Cryo spatial
combo. A Cryo sharing an edge with a Rail enables Shatter rounds. Diagonal
neighbors do not connect; additional Cryos never stack the damage bonus.

Each Rail discharge snapshots the link. At each impact, a charged round deals
25% extra damage if the target has an active slow or a genuine non-boss freeze.
Base Rail damage is 85, or 106.25 on a qualifying target. Current cold from any
source qualifies. The combo neither grants nor consumes cold, burn or Freeze
immunity. Boss slow resistance and Rail penetration, knockback, upgrades,
targeting, reload and firing directions retain their existing rules.

Moving or losing Cryo changes future discharges, including delayed Magazine
shots. Already launched rounds retain their charge. Piercing evaluates each
target separately and never modifies the round's base damage.

Presentation uses the existing pale cyan Cryo palette: a cold Rail tracer and
short muzzle flash, plus a compact 0.24-second ice-fragment/crack cue only on
qualifying hits. There is no persistent aura or expanding status ring.
`cold-vfx.js` draws 7/5/3 fragments by quality tier; Reduced flashes retains
three subdued fragments. Effects share the existing crowd caps and use no
gameplay random numbers. Existing enemy frost artwork and status rendering
are retained. The integration is ready for user review, not final visual or
balance approval.

Build highlights affected Rails, shows one Cryo badge per receiver and explains
the chilled/frozen target condition. Placement previews follow the same edge
rule. The pricing inspector also exposes unit-cost arithmetic and the inherited
upgrade surcharge for future copies; economy rules are unchanged.

Validation: full `npm test`, 16 Cryo-combo groups, eight pricing preview groups,
existing Ember/Cryo-status/collision checks, and isolated built-in browser review
at 1920x1080 with normal scale. Controlled checks cover real Cryo impacts,
Freeze, mixed piercing, bosses, source loss, Build previews, price charging,
quality and Reduced flashes. These do not establish human balance acceptance.

Backup, candidate, review fixtures and evidence:
`outputs/experiments/2026-10-16-cryo-combo/`.

## Reliability follow-up

Build `2026.10.16-cryo-reliability-48` fixes Rail/Cryo projectiles skipping small
hulls between simulation steps. Full-path checks retain exact round/rotated
hull geometry and resolve targets in travel order. Cryo stops at first contact;
Rail preserves piercing, hit identities and independent Shatter calculations.
Damage, slow/freeze and upgrade values are unchanged. Other friendly projectile
kinds retain their existing collision path.

Prospective Rail placements now visibly state whether the Cryo edge link is
present and explain the conditional bonus. Installed unlinked Rails show how
to enable it. Existing Cryo-to-Rail support previews remain available.

Sixteen travel-check and nine placement regressions supplement the original
checks. A seeded 96-case sustained audit uses natural auto-fire, moving enemies
and ordinary boss mechanics; it confirms useful Shatter on boss fights without
requiring a larger bonus. Task evidence is in
`outputs/experiments/2026-10-16-cryo-followup/`.
