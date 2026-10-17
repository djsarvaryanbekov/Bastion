# Ember's own firing effect

Build `2026.10.16-ember-plume-42` refines Ember itself after the separate
Scatter muzzle change. [Production renderer](../../../../fire-vfx.js).

The flame has a short hot nozzle tongue, overlapping puffs through the middle,
and detached cooling tips. Its leading edge tapers before the actual range
boundary. Lower quality uses fewer larger puffs; reduced flashes lowers opacity.
The nozzle fades out with emission instead of leaving a fixed bright bead.
Each discharge uses its simulation timestamp as a cosmetic seed.

Reference: [Mindustry Scorch, coal test](https://www.youtube.com/watch?v=FUHHu2oe-04&t=153s),
with the previously recorded [reference index](../MINDUSTRY_REFERENCES.md).
No reference assets or source implementation were imported.

The real cone bounds, upgraded range/width, .2-second burst, damage, burn and
combo activation are preserved. Hull burning and Scatter/Flak presentation
remain the build 41 versions. The world-space cone is still a shot snapshot.

Checks: syntax; burn indicators; weapon muzzles; Ember combo; new weapons;
104 weapon configurations; 2,700 independent canvas cases. Visual review used
Codex's built-in browser at 1920×1080 with isolated storage, including early/late
frames, quality levels and reduced flashes. This is integrated for review;
the user has not approved this narrower Ember revision.

The main build 41, renderer, game source, Scatter renderer and ZIP are preserved
under `outputs/experiments/2026-10-16-ember-refinement/before*`.
