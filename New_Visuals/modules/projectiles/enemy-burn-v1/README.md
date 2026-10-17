# Burning enemy units

Build `2026.10.16-enemy-burn-43` changes the burning status drawn on enemies.
The user clarified that enemy burning was the intended visual complaint;
the earlier Scatter muzzle and Ember plume revisions remain subject to review.

The old three fixed bright dots are replaced by compact fire clusters emitted
at changing positions across the hull. Young clusters have rounded orange
lobes and smaller yellow cores; they shrink into single cooling cinders.
Birth positions stay in world space as enemies move and turn. There is no
whole-sprite tint, texture atlas, large flame icon or glow pass.

Mindustry v159.5 provided the emission reference: bursts across the unit,
world-space particles, roughly 0.58-second lifetimes and yellow-to-orange
cooling. Our merged lobes and warm cores are an adaptation, not an exact copy.
[Status emission](https://github.com/Anuken/Mindustry/blob/v159.5/core/src/mindustry/type/StatusEffect.java#L136-L157),
[burning particles](https://github.com/Anuken/Mindustry/blob/v159.5/core/src/mindustry/content/Fx.java#L1291-L1297).
The Scorch vs Reign video was inspected at 35/40/45 seconds; the attack obscures
the unit during exposure, so it is not claimed as a clear isolated status demo.
No claim is made that all debuffs were visually verified in gameplay video.

Only `burn()` and its private rendering helpers change in the production
[fire renderer](../../../../fire-vfx.js). Combat source, Ember plume, combo
rules and weapon attack renderers remain the build 42 versions. Cosmetic
history lives in a WeakMap, with at most 21 particles per detailed enemy.
Pooling, time rewind, teleports and offscreen gaps reset it. Animation budgets
remain 32/16/0 enemies; all other burning enemies retain quiet warm patches.
Reduced flashes uses those steady patches. Simulation time controls emission,
pause and fade; drawing consumes no combat randomness or save writes.

Checks: syntax, world-space motion/turning, camera translation, pause,
30/120 Hz emission equivalence, particle bounds, pooling/reset, expiry,
burn-indicator integration, Ember combo, weapon muzzles, new weapons and
104 actual firing configurations. Separate browser fixtures use isolated
storage, actual production enemy rendering, deterministic motion and burning
timers at 1920×1080 with normal scale. They are visual QA, not a human playtest.

Baseline HTML/package/source and review captures are preserved under
`outputs/experiments/2026-10-16-enemy-burn/`. This pass is integrated for review;
the user has not approved its appearance.
