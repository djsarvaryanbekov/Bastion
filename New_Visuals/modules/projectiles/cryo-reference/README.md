# Cryofluid and cold status reference

Research for the user's Cryo discussion on 2026-10-16. The requested focus is
the effect **on enemy units**. Combos are deferred. This is a reference and
proposal. The user subsequently authorized integration; see the separate
[build45 implementation record](../cryo-v1/README.md). This document retains
the reference evidence and distinguishes Mindustry's behavior from our adaptation.

## Gameplay footage

[Testing Every Turret with Every Ammo — AerN, Cryofluid chapter at11:07](https://www.youtube.com/watch?v=FUHHu2oe-04&t=667s).
The built-in browser was used to inspect frames at11:14,11:19 and11:24. The11:14
Tsunami impact has a dense cyan spray that partially obscures the target.
That spray includes liquid bullets and repeated impact effects; it should not
be copied as the whole persistent debuff. Lingering status details are checked
against official source, since this clip does not isolate them cleanly.
[Captured contact frame at11:24](cryofluid-11m24s.jpg).

## Verified reference behavior: Mindustry v159.5

- [Cryofluid](https://github.com/Anuken/Mindustry/blob/v159.5/core/src/mindustry/content/Liquids.java#L40-L47)
  is cyan `#6ecdec` and applies Freezing.
- [Impact spray](https://github.com/Anuken/Mindustry/blob/v159.5/core/src/mindustry/content/Fx.java#L964-L970)
  uses five circles, expanding outward and shrinking over about0.27s.
- [Lingering Freezing](https://github.com/Anuken/Mindustry/blob/v159.5/core/src/mindustry/content/Fx.java#L1542-L1548)
  emits two small cyan circles per burst. They spread a short distance and
  shrink away over about0.67s.
- [Emission](https://github.com/Anuken/Mindustry/blob/v159.5/core/src/mindustry/type/StatusEffect.java#L164-L167)
  occurs at changing positions across the unit's hit area. Particles do not
  remain parented to the moving unit.
- There is no Freezing-specific ice shell, snowflake sprite or whole-hull tint.
  [Status draw hook](https://github.com/Anuken/Mindustry/blob/v159.5/core/src/mindustry/type/StatusEffect.java#L203-L209),
  [unit tint handling](https://github.com/Anuken/Mindustry/blob/v159.5/core/src/mindustry/type/UnitType.java#L1984-L1997).
- [Freezing](https://github.com/Anuken/Mindustry/blob/v159.5/core/src/mindustry/content/StatusEffects.java#L36-L58)
  slows the unit; full immobilization belongs to a separate Unmoving status.
  Mindustry's exact balance and elemental reactions are not proposed for import.

## Current Drift Bastion behavior

Two enemy-render paths draw the same fixed partial blue arc whenever
`slowFactor < 1`. Its angle does not show remaining time. It uses collision
radius, can fit imported artwork poorly, and has no distinct true-freeze stage.

Base Cryo reduces movement to50% for2s. Existing upgrades can strengthen and
extend the slow. The existing Freeze specialization locks ordinary enemies
for0.6s after qualifying repeated hits; bosses do not freeze. Cold and burning
currently coexist. These rules are outside the requested visual redesign.

## Proposed visual direction

1. Replace the arc with compact cyan/white cold particles emitted across the
   hull and drifting off it. Keep hit splash brief and status particles small.
2. Add restrained pale frost patches on the armor so the status reads between
   particle bursts. This is our adaptation, not a claim about Mindustry's tint.
3. During the existing actual0.6s freeze, use denser, brighter frost marks;
   return to the lighter chilled appearance as movement resumes.
4. Fade the cold presentation near expiry. Keep every affected enemy readable
   in Low quality and Reduced flashes, budgeting only animated detail.

Use one post-enemy cold pass before burn indicators, actual artwork bounds,
and simulation time. Preserve silhouettes, hit flashes, shields, warning
telegraphs, pause, all combat values, save data and current burn coexistence.
No new elemental combo or automatic fire extinguishing is part of this pass.
