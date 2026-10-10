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

## Projectile artwork request — 2026-10-08

[Weapon projectile artwork](modules/projectiles/README.md) now contains **12 drawn v1 SVG candidates and transparent PNG exports**, following the user's 2026-10-09 choice to draw editable artwork. [Preview all attacks with their module references](modules/projectiles/review.html); individual source/export links are in the projectile README. [The artwork manifest](modules/projectiles/artwork-manifest.json) records anchors, dimensions and reference mappings.

**Latest feedback, 2026-10-09:** the user rejected the static v1 designs for Auto Cannon, Scatter Array, Missile Pod, Cryo Projector, Ember Projector, Gravity Well, Pulse Nova and Flak Battery. The drawings failed to show the attacks doing their job, especially Scatter's five-pellet shotgun spread. Laser, Arc, Rail and Mine were not included in this revision and have no implied approval.

[Eight animated v2 effects](modules/projectiles/v2/README.md) were approved for import on 2026-10-10 and integrated into the main game and package as `2026.10.10-attack-vfx-27`. Editable SVG flipbooks and PNG sheets remain here; the root `attack-vfx.js` is the production renderer. Actual firing, homing, slow, burn, gravity pull and Flak interception were checked at 1920×1080, normal scale. All twelve weapons matched the pre-import combat baseline in seeded fixtures. The [earlier combat preview](../outputs/experiments/2026-10-09-attack-vfx-v2/Drift_Bastion_Playtest.html), v1 files and blank Chrome-generation history are preserved. Laser, Arc, Rail and Mine concepts remain outside this approval.
