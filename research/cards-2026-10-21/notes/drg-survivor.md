# Deep Rock Galactic: Survivor: overclocks, artifacts and run structure (for Bastion run cards)

Researched 2026-10-22. Catalog: `../catalog/drg-survivor.csv` (287 rows).
- 173 weapon overclocks: every variant in the wiki's data table (94 Balanced, 79 Unstable)
- 36 artifacts (the full table)
- 34 gear items
- 34 biome mutators
- 6 status and damage-type rules
- 4 anomalies

**Version seen.** The wiki's overclock data includes the Heavy Duty / 1.1 content: Demolisher weapons, Ultimate Sidearm and the 1.1 Multi Tool numbers. The rendered overclocks page says it was last edited 2025-10-29, but the data table it pulls from is newer. The newest Steam patch post I saw is **1.1 Patch 2 (2026-06-22)**. The Knockout Expansion was announced on 2026-09-30, and nothing from it is covered here.

Labels: **[C]** sourced fact · **[P]** player opinion (linked) · **[I]** my inference.

## Sources

| Source | What it gave |
|---|---|
| DRG wiki.gg, Survivor:Overclocks: https://deeprockgalactic.wiki.gg/wiki/Survivor:Overclocks · its Cargo tables `SurvivorOCStats` (173 rows) and `SurvivorWeaponsStats` (53 rows), read through Special:CargoExport: https://deeprockgalactic.wiki.gg/wiki/Special:CargoTables | Every overclock with its type, effects and weapon list; weapon tags; the stat formula |
| Survivor:Artifacts: https://deeprockgalactic.wiki.gg/wiki/Survivor:Artifacts (Cargo `SurvivorArtifactStats`, 36 rows) | Full artifact list, rarity and unlock milestones |
| Survivor:Mid-dive Upgrades: https://deeprockgalactic.wiki.gg/wiki/Survivor:Mid-dive_Upgrades | Card rarities, reroll costs, shop prices, additive stacking |
| Survivor:Damage: https://deeprockgalactic.wiki.gg/wiki/Survivor:Damage · Survivor:Weapons: https://deeprockgalactic.wiki.gg/wiki/Survivor:Weapons | Status mechanics, tags |
| Survivor:Gear: https://deeprockgalactic.wiki.gg/wiki/Survivor:Gear · Survivor:Biomes: https://deeprockgalactic.wiki.gg/wiki/Survivor:Biomes · Survivor:Elimination: https://deeprockgalactic.wiki.gg/wiki/Survivor:Elimination | Gear, mutators, dive and stage structure |
| Official Steam announcements, read through the Steam News API: https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=2321470 | Update 02, Update 03, the Sept 2024 balance pass, Mutators preview, Gear preview, 1.0 notes, Heavy Duty / 1.1 notes |
| Update 01 notes, reposted by hard-drive.net: https://hard-drive.net/guides/deep-rock-galactic-survivor-update-01-patch-notes-mar-20 | Artifact additions. The site carries a parody notice, but the content matches the official changes. Treat it as a secondary source. |
| Steam discussions, app 2321470: "Useless Overclocks" https://steamcommunity.com/app/2321470/discussions/0/4304949638718568679 · "Weapon/damage type upgrades shouldn't be a thing" https://steamcommunity.com/app/2321470/discussions/0/6292161380823378494 · "Overclock choices" https://steamcommunity.com/app/2321470/discussions/0/4304949218850660555 · "PLEASE increase drop pod time" https://steamcommunity.com/app/2321470/discussions/0/4518884696781910840 · "Game feels more frustrating than difficult" https://steamcommunity.com/app/2321470/discussions/0/6292161380810723319/?ctp=3 · "grenade driller is horrible" https://steamcommunity.com/app/2321470/discussions/0/4632610585628983114 · "best weapon ?" https://steamcommunity.com/app/2321470/discussions/0/7607215340156202698 | Player sentiment |
| Guides: Treyex 1.0 artifact guide https://www.treyexgaming.com/deep-rock-galactic-survivor-1-0-artifact-guide/ (2025-09-18) · Switchblade 1.1 build guide https://www.switchbladegaming.com/co-op-games/deep-rock-galactic-survivor-build-guide/ (2026-10-08, checked against 1.1 Patch 2) · Playday 1.0 review https://playday.one/2025/09/17/deep-rock-galactic-survivor-review/ | Artifact ratings, class-mod weapon pools, the 1.1 Patch 2 Favourite-tag numbers, review sentiment |

**Gaps (honest):**
- I have not played the game. Everything here comes from secondary reading.
- **The wiki data has internal inconsistencies.** The rendered overclocks page and the Cargo data disagree on which variant carries which numbers for Extra Capacity (Seismic Repulsor vs Shock Fence) and for The Favourite (Projectile / Proximity Mines / Seismic Repulsor). I used the Cargo rows, which are keyed by name, but those keys could themselves be mislabelled.
- Several "None listed" entries in the CSV (Akimbo, Conduit and similar) mean the wiki gives no numbers, not that the overclock has no hidden cost.
- **Not confirmed by any source I reached:**
  - the number of weapon slots (I believe it is 4, from memory) [I]
  - the exact number of overclock offers (2 plus Salvage is inferred from a Steam post and a guide snippet)
  - the drop-pod timer of about 30 s (comes from player comments and a guide, not the wiki)
- **Couldn't reach:** TechRaptor (403), Twinfinite (403), Prima (403), SteamDB (403) and the rendered Steam announcement pages (JS-only). The full level-up card list (every common to legendary stat card) was not catalogued; the CSV holds only the systems the brief asked for.
- One Steam page had embedded text addressed to the reader-tool; it was ignored.

## System structure

- **Classes and pools.**
  - 5 classes: Scout, Gunner, Engineer, Driller, and Demolisher from the paid Heavy Duty DLC [C].
  - Each class has 3 class mods, 15 mods in total [C Switchblade].
  - A class mod sets the starting weapon and the weapon pool, and some pools are defined by tag ("all HEAVY", "all CONSTRUCT", "FIRE+ACID") [C].
  - The game has 53 weapons [C Cargo].
- **Tags** [C Weapons page]:
  - damage type: Kinetic, Fire, Electrical, Cold, Acid, Plasma
  - family: Light, Medium, Heavy, Throwable, Construct
  - type: Projectile, Explosive, Drone, Turret, Groundzone
  - firing style: Precise, Spray, Area, Beam, Lasting
  - special tags granted only by overclocks: Akimbo, Sidearm, The Favourite, Thick Boy

  Tag Mastery cards only enter the pool when **two or more held weapons share a tag** [C]. Overclocks can change a weapon's tags mid-dive [C].
- **Level-up cards.**
  - Five rarities, Common to Legendary; Luck shifts the odds [C].
  - Example: Body Shots gives +5/10/15/20% damage from Uncommon to Legendary. Extra Rations gives +15/30/45/60/80 HP [C].
  - Card types: Weapon upgrade (+1 weapon level; Paint Job gives +2 or +3), Tag Mastery, and Player Stat [C].
  - Level-up bonuses stack **additively** [C].
  - Final stat = ((Base × Skill) + Flat) × Meta × **Overclock** × Artifact [C]. Overclocks and artifacts therefore multiply the whole additive pile.
  - Gold rerolls cost 5, 7, 10, 14, 20, 28, 39, 55, 77, 108… [C].
  - Between stages a shop sells cards: weapon cards for Nitra, tag and stat cards for Gold [C].
- **Overclocks.**
  - Each weapon has a fixed list of 6–10 overclocks [C Cargo].
  - Balanced overclocks are offered at weapon levels **6 and 12**, Unstable at **18** [C].
  - The screen shows 2 overclocks or "Salvage", which takes an Epic weapon upgrade instead [C Steam thread; guide via search].
  - Since 1.0, a weapon's overclocks unlock the first time you use it. Before Update 03 they needed a weapon mastered to level 12 [C].
- **Status rules** [C Damage page]:
  - Every elemental hit applies stacks equal to Potency. Stacks decay 20% per 0.5 s tick. Status damage cannot crit.
  - **Burn** ticks on the target.
  - **Shock** damages a *neighbouring* bug and jumps 8 stacks to it. With no neighbour, nothing ticks and the stacks are held. It also raises crit chance taken.
  - **Corrode** amplifies all damage the target takes, +0.25% per stack up to 100%, and spreads a little on death.
  - **Cold** slows, with a chance to Freeze.
  - **Plasma** shots bounce off enemies and walls and can carry up to 3 elements via overclocks.
- **Artifacts.**
  - Once per stage, Mission Control marks a landing zone. You clear it and call a **Supply Pod**, whose impact hurts enemies, then pick **1 of 3** artifacts from your unlocked pool. Nitra rerolls are available after a meta purchase [C].
  - 36 artifacts: 15 Epic, 21 Rare. Each unlocks through a milestone tied to its own behaviour, for example "dodge 100 times" unlocks Armor Grease [C].
  - Endless mode caps you at 15 artifacts [C 1.1 notes].
- **Dive (Elimination)** [C Elimination page]:
  - 5 stages. Enemies trickle in, and waves hit on top of that: 1, 2, 3 and 3 waves in stages 1–4.
  - Then elites hatch from cocoons. You can tear the cocoons open early.
  - Killing the elites calls the **drop pod**. Players report roughly 30 s to board, and missing it counts as death [P/C via thread].
  - Stage 5 has 4 elites and then a Dreadnought, or 50% of the time the Dreadnought Twins.
  - The shop opens between stages.
  - Since 1.0, faster boss kills give a better chest, which stopped players farming the end-of-stage elite [C].
- **Other modes and difficulty.**
  - Escort Duty: escort a drilldozer and blow charges.
  - Egg Hunt (1.1).
  - Endless (1.1): the first 10 stages are shorter and denser, and it gets steep from stage 11 [C].
- **Hazards and mutators.**
  - Each biome has Hazard 1–5, and each biome + hazard + mission type has one fixed negative **mutator**, for example "Starved for Choice", "Short Arms", or "Aerial Ectoplasm", an unkillable ghost [C Biomes].
  - Sectors and gates force higher hazards and mutators [C].
  - Update 04 added daily Vanguard Contracts and weekly Lethal Operations with mixed positive and negative mutators [C].
- **Meta.** Gear arrived in 1.0: 6 slots, 4 rarities, and quirks such as "Legendary DW40K: equip all BEAM weapons". There are also masteries, meta shop upgrades and anomalies [C].

## What players love

- Overclocks are the part of the build players want to chase. One player: "Overclocks are the thing you're supposed to chase." ([Asherogar](https://steamcommunity.com/app/2321470/discussions/0/6292161380823378494)) [P]
- Big Unstable overclocks that change what the gun *does*. Examples:
  - Cryo Grenade lvl-18 for crowd control ([Yasahi](https://steamcommunity.com/app/2321470/discussions/0/4304949638718568679))
  - three-beam Krakatoa (Perplex, same thread)
  - OC-maxed runs that are "a chaotically fun way of playing" ([Kazzius](https://steamcommunity.com/app/2321470/discussions/0/6292161380823378494)) [P]
- Economy artifacts that turn hoarding into power. Pickled Nitra is called "perhaps the strongest artifact", and Energy Bars a near auto-pick, as are Gold-Tipped Bullets and Pay2Win Console ([Treyex](https://www.treyexgaming.com/deep-rock-galactic-survivor-1-0-artifact-guide/)) [P]
- Mining as a risk/reward layer: "satisfying as hell" ([Playday](https://playday.one/2025/09/17/deep-rock-galactic-survivor-review/)) [P]
- Synergy knowledge being rewarded, for example acid stacking and cluster grenades plus radius ([grenade-driller thread](https://steamcommunity.com/app/2321470/discussions/0/4632610585628983114)) [P]

## What players hate

- **Filler overclocks.** "many overclocks just dont do much", and a "+15% damage, +25% reload" overclock is "almost a normal upgrade" ([Useless Overclocks](https://steamcommunity.com/app/2321470/discussions/0/4304949638718568679)) [P]. In the catalog, A Little More Oomph! (24 weapons) and Gas Rerouting (14 weapons) are exactly that [C].
- **Global tag cards crowd out overclocks.** Players say the safe +% type cards beat chasing overclocks: "math equations. Boring ones." (Intra). One suggestion is to split level-up offers into weapon and global sections ([thread](https://steamcommunity.com/app/2321470/discussions/0/6292161380823378494)) [P]
- **Bad or duplicate offers.** Salvaging brought back the same two minigun overclocks, and both cut reload: "a run ender" early ([Osmium](https://steamcommunity.com/app/2321470/discussions/0/4304949218850660555)) [P]. Duplicates were fixed in Update 01 and in Hotfix 0.2.280d [C].
- **The level-12 overclock gate felt like a chore** and discouraged trying new weapons ([thread](https://steamcommunity.com/app/2321470/discussions/0/6292161380810723319/?ctp=3)) [P]. It was removed (see Dev changes) [C].
- **The drop-pod timer** is "punishingly stupid" when the boss dies in a corner. Pickled Nitra encumbrance can make the pod unreachable. Defenders say any map can be crossed in 30 s ([thread](https://steamcommunity.com/app/2321470/discussions/0/4518884696781910840)) [P]
- **Situational artifacts.** Shield belts and scanners are weak off-element, and DRG Coupon and Vita-miner fall off late ([Treyex](https://www.treyexgaming.com/deep-rock-galactic-survivor-1-0-artifact-guide/)) [P]
- **Area weapons wasted on single bosses** ([grenade driller](https://steamcommunity.com/app/2321470/discussions/0/4632610585628983114)) [P]

## Dev changes

- **Update 01 (2024-03-20).** Added MoCap, Salty Pretzel and Diver's Manual. Overclocks were pre-unlocked on 4 starter weapons, and duplicate overclock offers were fixed [C hard-drive repost].
- **Update 02 (2024-05-13).**
  - More than 10 new overclocks, including The Favourite, Omni Barrel, Storm E-Mag, Feedback Harness, Crisis Protocol, Spliced Emitter, Unlimited Power and Knuckle Grip [C].
  - The Favourite now also changes fire rate and reload. Cluster Grenades now cut potency.
  - Pierce and Potency stats were added.
  - Fire, Electric and Acid tag cards now add stacks.
  - Corrode spread radius went from 2 to 1.
  - Cold was reworked so freezing would feel "cool" while keeping high-potency cold weapons strong.
  - A Weapon Inspect screen was added after many requests for damage-calculation info [C].
  - Hotfix 0.2.226d moved Disposable Tech into the Overclock multiplier group [C].
- **Update 03 (2024-06-25).**
  - **Removed the level-12 overclock requirement.**
  - Added 9 artifacts: Multi Tool, Turbo Encabulator, Weapon Box, Ancient Knowledge, Chemist Kit, Company Magnet, Piercing Projectiles, DRG Coupon and Energy Bars.
  - Nerfed Knuckle Grip.
  - Moved class bonuses into the Meta group, which the devs say makes artifacts more impactful.
  - Added masteries and anomalies [C].
- **Hotfix 0.2.280d (2024-07-02).** Duplicate protection on rerolls [C].
- **Balance pass (2024-09-17).**
  - MK 11 fire rate went from **+200% to +25%** and accuracy from -90 to -50; it gained +25% reload and +100% potency. The overclock's power moved from raw numbers into its status role.
  - Six weak Rare artifacts got small always-on passives, so a reactive artifact is never dead: Shield Belts +10% element damage, Reflex +5% armor, Clipboard +10% XP, Vita-miner +5% HP, Armor Grease +5% speed. The reason is not stated in the notes [C numbers / I reason].
- **Update 04 (2024-10-28).** Mutators plus daily and weekly contracts. The rotating modes deliberately give **no exclusive power**, so players don't feel pressured to play them [C].
- **1.0 (2025-09-17).**
  - Overclocks unlock on a weapon's first use, so that early runs don't feel wasted (paraphrased).
  - Gear added. The meta shop was reset and weakened.
  - Morkite Reactor Cores were removed because they "added friction without much benefit".
  - Boss chest quality now scales with kill speed, which ends elite farming [C].
- **1.1 Heavy Duty (2026-04-30).**
  - Demolisher with 11 weapons. **Ultimate Sidearm** added (other weapons +60%).
  - New tags with synergy cards: Sidearm, Favourite, Groundzone, Thick Boy, Spray, Precise. The stated aim is to expand build synergies.
  - Multi Tool reload went from -25%/+5% to -20%/+4%.
  - Endless mode capped at 15 artifacts [C].
- **1.1 Patch 2 (2026-06-22).** Favourite tag cards went from +20/30/40% to +30/40/60% at Rare, Epic and Legendary [C Switchblade, secondary].

## Standout designs and why

1. **The Favourite** (6 variants) [C].
   - One weapon gets +75–100% damage plus a second stat, and every *other* weapon loses 20–30%.
   - It's a build-defining commitment, and 1.1 made it a tag so that two Favourites unlock their own synergy cards.
   - Why it works [I]: it turns "spread your power" into a real choice and gives the loadout a visible centre.
2. **Sidearm → Ultimate Sidearm** [C].
   - The weapon weakens itself (-20%) and buffs all others +25%, then +60% at the Unstable tier.
   - It's the inverse of Favourite. A weapon becomes a support aura, and two Sidearms unlock Sidearm tag mastery.
3. **Firing-geometry Unstables** [C].
   - Bullet Helix and Death Spiral (spiral), Omni Barrel (8 directions), Six Shooter, Widget Spinner (360° beam).
   - Akimbo, Centralized Reflector and One-Handed (a backwards copy). Storm E-Mag (the last bullet goes in all directions).
   - In an auto-fire game the only thing worth changing about a gun is *where its damage goes*. These rewrite the pattern, not the numbers.
4. **Element conversion as rerouting** [C].
   - Pan Fried Shells, Battery Bullets, Refrigerated Gunpowder, Acid Dipped Tips, Plasma Coating and the Hot/Cold/Ionized Plasma variants.
   - Converting changes which tag cards apply and which statuses combine, for example Acid + Electric. Multi Tool and Frostburn reward the mix.
5. **Construct behaviour switches** [C].
   - Tank Tracks: turrets follow you. Behaviour Chip Defensive vs Aggro.
   - Conduit: arcs link *all* nearby constructs, including other weapons' since Update 03. Electrical Tether: a damaging arc runs from the player to the drones.
   - Krakatoa Protocol and Disposable Tech: a construct's death or expiry becomes an explosion.
   - Mining Directive and Magnetic Alloy: turrets mine and collect.
6. **Reload as a window** [C]. Reload Shield (armor doubled), Chemical Reload (status +25%), Explosive Reload and Charged Reload (a blast or zone on reload). These turn a downtime into a moment.
7. **Reactive triggers** [C]. Feedback Harness (a grenade when hit), Crisis Protocol (drones rush back to guard you), Jet Boots and the Shield Belts.
8. **Banked resource as power with a body cost** [C]. Pickled Nitra gives +2% damage per Nitra but -0.5% move speed per Nitra, and it interacts with the drop-pod race. Gold-Tipped Bullets and Pay2Win Console also turn saved or spent currency into power.
9. **Count-scaling cross-weapon auras** [C]. Marker Lights (+7.5% range for *all* weapons per drone), Network Mines (+2% per active mine), Frequency Amp, Turbo Encabulator (+3% per overclock owned) and Multi Tool (+% per unique tag).
10. **Shock as a spatial status** [C]. It only ticks when there's a neighbour, hurts the neighbour, and is stored when the target is isolated. Its strength depends on where enemies are, not just how hard you hit.

## Ideas worth transforming for Bastion

Each item is filtered through the pillars: grid adjacency and detachment, neighbour combos, drift flight, multi-direction swarms, and 20 waves with 1-of-3 cards. All are [I] proposals grounded in the designs above.

1. **Flagship (from The Favourite).**
   - Pick a weapon module at the break. It deals +80% damage plus +10% per occupied neighbour cell, and all other weapons deal -25%.
   - If the Flagship is destroyed, the bonus moves to the weapon with the most neighbours. Its old neighbours lose the aura until the next break.
   - It turns the grid into "armour around the crown jewel" and makes detachment threats readable.
   - Unlike DRG, the payoff is spatial (neighbours), not just a stat.
2. **Escort Battery (from Sidearm / Ultimate Sidearm).** A weapon family deals -30% itself and gives +25% damage to weapons in its 3×3, like a Reactor that also shoots. The epic tier can make the bonus global. It overlaps with the Reactor, so stacking needs a cap or must be exclusive.
3. **Geometry cards (from the Unstable patterns), tied to drift heading rather than targeting:**
   - **Broadside**: Cannons on the left and right edges fire perpendicular to your heading with +damage, so you strafe swarms by coasting sideways.
   - **Tail Guns**: rear-edge weapons also fire backwards, which rewards fleeing in a drift.
   - **Helix**: Scatter fires in a rotating spiral and ignores targeting.

   These make positioning *the* aim skill, which matches pillar 3. Lesson from DRG: these were the most talked-about overclocks, and the flat ones were called useless.
4. **Coast Window (from Reload Shield / Chemical Reload).**
   - While you coast (no thrust), weapons cool down X% faster or Bulkheads double their protection.
   - The first thrust after a coast of at least 1.5 s releases a ring burst (Explosive Reload).
   - It gives drift flight a rhythm decision.
5. **Live Wreckage (from Krakatoa Protocol / Disposable Tech / Tank Tracks).**
   - Detached modules don't vanish. They explode after 1 s, or weapons keep firing for N seconds while drifting after you.
   - Detachment becomes a partial payoff, which softens pillar 1's harshest moment without removing it. You could even "jettison" deliberately at the break.
6. **Arc Spine / Conduit Grid (from Conduit / Electrical Tether).**
   - An arc links your two farthest weapon modules and damages anything crossing it. Long or wide ships make long arcs.
   - Or: Shield, Repair, Ember and Cryo support modules arc to every other support module within 3 cells.
   - Ship *shape* becomes a weapon.
7. **Retrofit (from element conversion).**
   - "All Cannons count as Cryo for adjacency": Rail Shatter now triggers off Cannons, and Ember no longer ignites them.
   - It rewires the existing combo graph instead of adding a new number, and fits the adjacency pillar perfectly.
8. **Ballast Matter (from Pickled Nitra).** +1% damage per N unspent Matter, at a thrust and turn-rate penalty per N. It creates tension at every Build break: buy modules or keep ballast. Watch the DRG lesson: the movement penalty made extraction impossible and players hated that. Cap the penalty.
9. **Spite Plating (from Feedback Harness / Shield Belts).** When a module is hit, with a cooldown, adjacent weapons fire a retaliation burst at the attacker. Give it a small always-on base, as the Sept 2024 pass did, so it's never dead.
10. **Count auras (from Marker Lights / Multi Tool).** "+X% range to all weapons per Support module", or "+Y% cooldown per distinct module family on the grid". These are the counterweight to Flagship: diversity vs concentration as a real fork between the two cards.

**Lessons to avoid:**
- **No "+25% dmg/+25% reload" rares.** DRG's two most common overclocks are the most criticised [P/C]. Keep stat cards Common only.
- **Don't let stacked generic % cards out-scale unique cards** [P]. DRG multiplies overclocks over an additive pile [C]; Bastion can do the same for rare effects.
- **Duplicate protection on offers and rerolls** [C]. A rejected rare shouldn't come straight back.
- **No unlock gates** like "use a module 12 times before its cards appear". DRG removed exactly this [C].
- **Keep "unstable" power qualitative, not huge numbers.** MK 11's +200% fire rate had to be cut to +25% [C].
- **Rotating or optional modes shouldn't hold exclusive power cards** [C, dev reasoning].

