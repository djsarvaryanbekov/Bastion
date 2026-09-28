# Enemy visual set

The selected raw PNGs in `raw/` are preserved versioned sources. `drone-v1.png`
was an early concept-reference draft; `drone-v2.png` is the current source,
generated using `reference-gameplay-v1.png`, an actual Drift Bastion combat
capture. Every selected sprite uses strict top-down orientation, true alpha,
and a role-specific silhouette.

| Game enemy | Source | Silhouette purpose |
| --- | --- | --- |
| Scout | `scout-fighter-v1.png` | Fast direct-chase fighter |
| Swarm Drone | `drone-v2.png` | Small diamond swarm unit |
| Hunter | `hunter-v1.png` | Agile swept-wing pursuer |
| Raptor | `raptor-v1.png` | Elite arrowhead attacker |
| Orbiter | `orbiter-v1.png` | Ringed skirmisher |
| Brute | `brute-v1.png` | Broad collision-heavy chassis |
| Bulwark | `bulwark-v1.png` | Shielded heavy, solid forward plate |
| Bolter | `bolter-concept-v1.png` | Ranged Bolt Drone |
| Gunner | `gunner-triple-turret-v1.png` | Triple-shot Gunner |
| Bomber | `bomber-v1.png` | Payload-canister bomber |
| Splitter | `splitter-v1.png` | Two-hull split enemy |
| Sniper | `sniper-v1.png` | Long-range Sniper |
| Colossus | `colossus-v1.png` | Capital-scale heavy with four pylons |
| Shard | `mini-v1.png` | Small split-off dart |

`enemy-art-manifest.json` maps each selected source to its crop, visual scale
and forward axis. `tools/build-enemy-art.js` makes transparent, maximum-256px
runtime exports without changing raw art. It writes `enemy-art-data.js` and
`enemy-art-audit.json`; do not edit those generated files by hand.

The combat renderer uses this set for all defined non-boss enemy types. Enemy
mechanics, collision radii and progression remain authoritative in `game.js`.
`tools/enemy-art-browser-check.js` verifies decode, draw coverage and a
full-roster combat capture.
