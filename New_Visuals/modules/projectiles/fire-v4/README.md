# Fire particles — Mindustry reference

Build `2026.10.16-mindustry-fire-40` uses the original procedural renderer in
[fire-vfx.js](../../../../fire-vfx.js). The user selected Mindustry as the
reference on 2026-10-16. This implementation is integrated for review; no user
approval of the result is implied.

References inspected:

- [Scorch gameplay, 0:29](https://www.youtube.com/watch?v=NQMOxE5FXp0&t=29s): small warm particles around firing turrets and units.
- [Official Scorch particle definitions](https://github.com/Anuken/Mindustry/blob/17012d61d9e4c3cbd9820d87e81c24495486ac53/core/src/mindustry/content/Fx.java#L2203-L2217): forward spreading circles that shrink and cool from yellow/orange to gray.
- [Official burning status](https://github.com/Anuken/Mindustry/blob/17012d61d9e4c3cbd9820d87e81c24495486ac53/core/src/mindustry/content/Fx.java#L1400-L1443): tiny local warm particles, distinct from persistent ground-fire sprites.

Adaptation: compact circle particles, no blurred flame stamps; tiny local
cinders on hulls; matching incendiary Scatter trails and Flak bursts. Uses
simulation time, deterministic variation and existing quality/reduced-flash
settings. No reference game assets or source implementation were imported.

The old flame-stamp build and package remain in
`outputs/experiments/2026-10-16-mindustry-fire/before*`. The unpromoted cloudy
texture attempt remains under `fire-v3` and
`outputs/experiments/2026-10-16-fire-references-v3/unpromoted-source`.
Neither rejected attempt is a production dependency.
