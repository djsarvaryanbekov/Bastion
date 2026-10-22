# Brief — Bastion run cards

## Question
Design rare/epic **cards** (1 of 3 picked after each wave, free; reroll costs Matter) that change how the player builds, flies or fights — "part of the game with uniqueness, not just new stats". Plain stat cards may remain as commons.

## Bastion identity pillars
1. **The ship is a grid of modules.** You buy copies of weapon/support/armor modules with Matter and attach them edge-adjacent; destroyed modules detach (and everything cut off with them).
2. **Neighbours matter.** Existing adjacency rules: Ember next to Cannon/Scatter/Flak ignites them during flame bursts; Cryo next to Rail (Shatter +25% vs chilled) or Missile (cold payload); Reactor boosts weapons in its 3×3; Bulkhead protects its 3×3; Shield Node covers a radius; Repair Array heals a radius.
3. **Drift flight.** W/S thrust, A/D turn, hold mouse to follow cursor, release to coast; weapons auto-fire, so the player's skill is positioning and steering.
4. **Swarms.** Grouped enemy formations from several directions, 14 enemy types (melee chasers, ranged bolters/gunners/snipers, bombers, splitters, shielded bulwarks), 3 boss variants (Siege Ring, Pursuer, Storm Ring).
5. **Waves with breaks.** 20 waves; timer stops spawns, swarm must be destroyed; break = Matter bonus, 30% repair, card pick, Build. Enemies scale +8% HP/+4% dmg per wave.

## Economy and systems already present
- Matter (in-run): buys module copies (price rises per copy) and family upgrades (18 module families, branch trees licensed with Fragments in Hangar).
- Fragments (meta): Hangar licenses, 4 cores (Standard, Striker, Bulwark, Salvager) with stat multipliers, core calibration ranks.
- Status effects: burn, chill/freeze, knockback, gravity pull.

## Hooks available in code (game.js)
`resolveWeaponDefinition` (per-family stat copy) · `weaponCooldownRate` · damage multiplier in `updateWeapons` · `fireAttack` per weapon type · `damageEnemy` / `killEnemy` (on-hit / on-kill) · `applyDamageToTile` (incoming damage) · `updateSupportModules` (repair) · `updateMovement`/ship handling (thrust vs coast) · `destroyTile`/`detachTile` (module loss) · wave director `startWave` / `beginSweep` / `completeWave` · Build placement `validPlacement`, `placePurchasedModule`, `moduleSellRefund`.

## Constraints
- Plain JS canvas game; new art is costly (New_Visuals pipeline) — prefer effects built from existing VFX (fire, cold, arcs, rings, lines).
- All text localized via `tr()` into 16 languages.
- Endless mode must stay unchanged.

## What was already rejected
- Current 20 cards: mostly "+X% stat" — rejected as not unique.
- My first "unique" list (Twin Link, Firing Line, Edge Battery, Sacrificial Plating, Napalm Warheads, Superconductor, Shock Barrier, Singularity Mines, Drift Gunnery, Ram Prow, Afterburner, Momentum, Salvage Drones, Harvest, Mercenary Contract, Overload Core, Salvage Rights, Trophy Turret) — rejected ("none of that I liked"). Reason given: designs should come from studying how successful games and their communities do it, not invention from scratch. Bar: evidence-grounded, clearly better than generic.
