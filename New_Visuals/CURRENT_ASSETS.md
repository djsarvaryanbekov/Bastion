# Current visual-design entry points

Updated 2026-09-20. These are the current discussed versions, not a claim that every asset is approved or production-ready. User selection overrides this index. Inspect actual images and the relevant history in `modules/README.md` before editing.

Integration update: the user subsequently requested using these existing images in the game. They now feed the runtime sprite bundle; see [INTEGRATION.md](INTEGRATION.md) for layer/rotation decisions, export tooling and validation. Raw sources and earlier design history remain unchanged.

| Asset | Current source |
| --- | --- |
| Base square platform | [Square v2 PNG](platforms/Drift_Bastion_Platform_Square_v2.png), [editable SVG](platforms/Drift_Bastion_Platform_Square_v2.svg) |
| Auto Cannon | [v2](modules/auto-cannon-v2.png) |
| Missile Pod | [v5](modules/missile-pod-v5.png) |
| Rail Lance | [v1](modules/rail-lance-v1.png) |
| Piercing Laser | [v2](modules/piercing-laser-v2.png) |
| Arc Emitter | [v16](modules/arc-emitter-v16.png) |
| Scatter Array | [v28](modules/scatter-array-v28.png) |
| Flak Battery | [v6](modules/flak-battery-v6.png) |
| Pulse Nova | [v1](modules/pulse-nova-v1.png) |
| Cryo Projector | [v1](modules/cryo-projector-v1.png) |
| Mine Layer | [v1](modules/mine-layer-v1.png) |
| Ember Projector | [v1](modules/ember-projector-v1.png) |
| Gravity Well | [v1](modules/gravity-well-v1.png) |
| Shield Node | [v2](modules/shield-node-v2.png) |
| Repair Array | [v6](modules/repair-array-v6.png) |
| Matter Siphon | [v4](modules/matter-siphon-v4.png) |
| Armor Tile / armored platform | [v6 graphite](modules/armor-platform-v6.png) |
| Aegis Bulkhead | [v1](modules/aegis-bulkhead-v1.png) |
| Standard Core | [v1](modules/standard-core-v1.png) |
| Shared swivel-mount study | [v3](modules/swivel-mount-v3.png) |
| Scout enemy | [fighter v1](enemies/raw/scout-fighter-v1.png) |
| Swarm Drone enemy | [v2](enemies/raw/drone-v2.png) |
| Hunter enemy | [v1](enemies/raw/hunter-v1.png) |
| Raptor enemy | [v1](enemies/raw/raptor-v1.png) |
| Orbiter enemy | [v1](enemies/raw/orbiter-v1.png) |
| Brute enemy | [v1](enemies/raw/brute-v1.png) |
| Bulwark enemy | [v1](enemies/raw/bulwark-v1.png) |
| Bolter enemy | [concept v1](enemies/raw/bolter-concept-v1.png) |
| Gunner enemy | [triple turret v1](enemies/raw/gunner-triple-turret-v1.png) |
| Bomber enemy | [v1](enemies/raw/bomber-v1.png) |
| Splitter enemy | [v1](enemies/raw/splitter-v1.png) |
| Sniper enemy | [sniper v1](enemies/raw/sniper-v1.png) |
| Colossus enemy | [v1](enemies/raw/colossus-v1.png) |
| Shard enemy | [v1](enemies/raw/mini-v1.png) |

Reactor Link is excluded by user instruction. Its old image remains in `modules/` for history, not as an active asset. Striker/Bulwark/Salvager Core variants have not been designed in this pass. The Standard Core was the most recent design shown; no user approval was given before this folder reorganization.

## Boss visuals — 2026-10-14

Pursuer's first review candidate is [raw v2](bosses/pursuer/raw/pursuer-v2.png),
with a broad blunt ram, graphite/terracotta armor and twin rear engines.
The [separate motion study](bosses/pursuer/review.html) shows idle, a warned
dash, a five-shot aimed volley and proposed phase-two lighting, with a
gameplay-size toggle. This is artwork/presentation development; it is not
integrated or user-approved. [v1](bosses/pursuer/raw/pursuer-v1.png) is retained
as the earlier long-nosed design. [Brief and history](bosses/pursuer/BRIEF.md)
record the Chrome chat, actual attached references, current behavior and
technical export processing. Siege Ring and Storm Ring remain pending.

## Shield coverage effect — 2026-10-13

The user rejected the large v29 combat grid as a debug-looking effect. Build `2026.10.13-support-presentation-30` uses [shield-vfx.js](../shield-vfx.js) for a restrained energy rim around the protected installed hull. Charged overlaps share one barrier; generators keep their individual charge bars. Depleted-only hull loses the barrier. Full range remains visible in Build, with [contextual support icons](modules/support-indicators/README.md) showing received Shield, Repair, Reactor, Bulkhead and Siphon benefits on installed modules and placement ghosts. Selecting a node shows its own coverage. Repeated rank badges are removed from combat and installed artwork; ranks remain in the family upgrade panel. Bulkhead now protects the surrounding eight cells, including diagonals, at the unchanged 12% reduction per source and 48% cap. Other combat values and module sprites are unchanged. The [v29 backup](../outputs/experiments/2026-10-13-shield-polish/before.html) and [earlier round-field implementation](../outputs/experiments/2026-10-12-shield-coverage/before-game.js) are preserved.

## Projectile artwork request — 2026-10-08

[Weapon projectile artwork](modules/projectiles/README.md) now contains **12 drawn v1 SVG candidates and transparent PNG exports**, following the user's 2026-10-09 choice to draw editable artwork. [Preview all attacks with their module references](modules/projectiles/review.html); individual source/export links are in the projectile README. [The artwork manifest](modules/projectiles/artwork-manifest.json) records anchors, dimensions and reference mappings.

**Latest feedback, 2026-10-09:** the user rejected the static v1 designs for Auto Cannon, Scatter Array, Missile Pod, Cryo Projector, Ember Projector, Gravity Well, Pulse Nova and Flak Battery. The drawings failed to show the attacks doing their job, especially Scatter's five-pellet shotgun spread. Laser, Arc, Rail and Mine were not included in this revision and have no implied approval.

[Eight animated v2 effects](modules/projectiles/v2/README.md) were approved for import on 2026-10-10 and integrated into the main game and package as `2026.10.10-attack-vfx-27`. Editable SVG flipbooks and PNG sheets remain here; the root `attack-vfx.js` is the production renderer. Actual firing, homing, slow, burn, gravity pull and Flak interception were checked at 1920×1080, normal scale. All twelve weapons matched the pre-import combat baseline in seeded fixtures. The [earlier combat preview](../outputs/experiments/2026-10-09-attack-vfx-v2/Drift_Bastion_Playtest.html), v1 files and blank Chrome-generation history are preserved. Laser, Arc, Rail and Mine concepts remain outside this approval.

## Fire presentation — 2026-10-16

Build `2026.10.16-mindustry-fire-40` follows the user's chosen Mindustry reference:
compact yellow/orange particles for Ember, tiny hull-local burning cinders,
and matching incendiary Scatter/Flak effects. [References and history](modules/projectiles/fire-v4/README.md).
The production renderer is [fire-vfx.js](../fire-vfx.js); no texture atlas is required.
Actual cone clipping, simulation timing, quality budgets and reduced flashes remain supported.
Combat source is unchanged from build 39. Syntax, burn/combo mechanics and all 104 weapon configurations passed;
visual review used Codex's built-in browser at 1920×1080, normal scale with isolated storage.
The user accepted the general build 40 fire direction.
Build `2026.10.16-scatter-muzzle-41` removes Scatter's floating side sparks and uses a brief warm forward puff only on an actual ignited volley. Plain Scatter and other fire renderers are retained. Muzzle, combo, burn and recoil checks passed. [Weapon videos and all debuff references](modules/projectiles/MINDUSTRY_REFERENCES.md). The narrower Scatter revision remains subject to user review.
Build `2026.10.16-ember-plume-42` also refines Ember itself: a connected tapered plume, hot nozzle tongue and cooling tips replace the separate fan of sparks. [Current Ember effect and checks](modules/projectiles/fire-v5/README.md). Hull burn and Scatter/Flak are unchanged from build 41. This revision is integrated for user review.
The user clarified that the intended complaint was **burning on enemy units**. Build `2026.10.16-enemy-burn-43` replaces fixed hull dots with changing fire clusters, warm cores and cooling world-space cinders. Emitted fire separates from moving/turning enemies. [Enemy burn implementation and reference evidence](modules/projectiles/enemy-burn-v1/README.md). Combat and weapon attack visuals retain build 42 behavior. The new enemy status pass is integrated for review, without implied visual approval.
Build `2026.10.16-cannon-ember-44` adds the requested Auto Cannon combo: warm narrow tracers and brief muzzle puffs during an adjacent Ember's actual firing window, with the existing weak non-stacking burn on direct hits. [Cannon combo behavior and validation](modules/projectiles/cannon-ember-v1/README.md). Enemy burn visuals retain build 43. Cryo is next, outside this pass.
Cryo research records [cryofluid footage and source findings](modules/projectiles/cryo-reference/README.md). Build `2026.10.16-cryo-status-45` integrates [enemy hull frost and cold particles](modules/projectiles/cryo-v1/README.md), replacing the fixed blue arc. Actual freeze has heavier frost and thaws to the chilled appearance. Combat values and Cryo combos are unchanged; new combos are explicitly deferred. The visual pass is integrated for review, without implied final appearance approval.

Build `2026.10.16-cryo-shatter-47` adds the subsequently requested [Cryo + Rail Shatter combo](modules/projectiles/cryo-shatter-v1/README.md): edge adjacency enables cold Rail rounds with +25% damage against enemies actually chilled/frozen at impact. Compact ice fragments show qualifying hits; Build badges/previews explain the link. Existing frost visuals remain. Pricing details now show per-copy arithmetic and inherited-upgrade charges. Firing arcs were dropped at the user's request; current aiming directions are retained.
Build `2026.10.16-cryo-reliability-48` checks Rail/Cryo travel through small enemy hulls between steps and resolves impacts in path order. Rail placement previews now visibly explain the Cryo edge link; unlinked installed Rails show how to enable it. Existing Shatter values and artwork are retained. See the reliability follow-up in the same combo notes.
Build `2026.10.17-cryo-missile-49` adds [Cryo + Missile cold payloads](modules/projectiles/cryo-missile-v1/README.md): edge adjacency gives existing missile blasts a brief, weaker chill. Cyan warheads/trails, compact ice bursts and the existing enemy frost show the effect; Build previews distinguish Missile control from Rail Shatter. Rail's existing +25% conditional bonus remains. This pass is integrated for user review, without implied final visual approval.
The user rejected build 39's flame stamps and the later unpromoted cloudy texture direction;
both are preserved in the task experiments. Module artwork is unchanged.
