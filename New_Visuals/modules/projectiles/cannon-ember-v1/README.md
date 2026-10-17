# Auto Cannon and Ember

Build `2026.10.16-cannon-ember-44` extends the existing Ember combo to Auto Cannon.
The user requested this combo first, with Cryo following later.

An actual adjacent Ember discharge opens the existing 0.2-second ignition
window. Cannon rounds fired then snapshot the effect. A hit applies the same
3 DPS burn for 1.5 seconds as Scatter/Flak. Repeated hits refresh one status;
volley size, extra Embers and Ember upgrades cannot multiply the DPS. A weaker
combo cannot change or extend a stronger active burn. Launched rounds retain
ignition after source removal or window expiry; subsequent shots check again.

Piercing Cannon applies burn to each directly hit enemy within its existing
penetration cap, preserving direct damage and Impact's second-hit multiplier.
Twin/Triple/Fan/Focus preserve their counts and spread. No upgrade is added.

The ignited Cannon keeps a narrow warm tracer with a small yellow core and
existing warm particle tail. Its muzzle emits three restrained forward puffs
(one with reduced flashes). Ordinary Cannon retains its original atlas and
muzzle. No floating side lights are added. The production changes are in
[game.js](../../../../game.js) and [attack-vfx.js](../../../../attack-vfx.js).
The build43 enemy-burning renderer and Ember plume remain unchanged.

Validation: full `npm test` and `npm run check`; expanded combo, Build and
muzzle tests cover eligibility, expiry, source removal, pooling, non-stacking,
piercing limits, stronger burns, direct damage, shot counts and render purity.
The built-in Codex browser uses a 1920×1080 normal-scale viewport and isolated
muted storage. Its comparison sends Ember left and Cannon right, proving zero
direct Ember burn on the Cannon target before firing. Actual Cannon impacts
give idle0 vs ignited3 DPS. Browser controls also exercise projectile snapshots,
source removal, post-window ordinary fire, reduced flashes and Build previews.
These checks do not establish human balance approval.

Baseline HTML/package/sources and review evidence are preserved under
`outputs/experiments/2026-10-16-cannon-ember/`.
