# Nova Drift — upgrade system study (for Bastion run cards)

Researched 2026-10-21. Catalog: `../catalog/nova-drift.csv` (231 rows: 213 current upgrades + 18 removed/legacy entries).

## Sources

| Source | What it gave | Version / date seen |
|---|---|---|
| Nova Drift Fandom wiki (community's main English wiki; no wiki.gg mirror found). Fandom serves a Cloudflare challenge to tools, so all pages were read through Wayback Machine snapshots. | Full stat text for every upgrade, mod-tree layout, super-mod unlock recipes, rank unlocks, rerolls, glossary | `Upgrade_List` snapshot 2025-04-09 (http://web.archive.org/web/20250409000054/https://nova-drift.fandom.com/wiki/Upgrade_List); `Mods_Overview` (tree layout, last updated 25/09/2023) via snapshot 2024-09-10; `Super_Mods` and `Rank_Unlocks` snapshots 2026-07-31; `Wild_Metamorphosis` snapshot 2026-06-20; `Basics`, `Glossary`, `Rerolls`, `Weapons`, `Shields`, `Ships`, the `Mods/CT_Mods*` category lists, and the Minefield, Retribution, Swords, Helix and Stealth pages. Most mod pages say "Last Update – Patch V1.2.22". |
| Official patch notes: https://blog.novadrift.io/patch-notes/ (mirrored on Steam at https://steamcommunity.com/app/858210/discussions/0/3658515990056189069) | Nerfs, reworks and stated reasons, from early access through 1.2.38.2 | Newest entry 1.2.38.2, dated 2026-09-28. 1.0 shipped 2024-08-06. |
| Dev retrospective, "Nova Drift Has Reached Full Release": https://blog.novadrift.io/novadrift-released/ | Why mini-trees and super mods exist, and the problems caused by "everything works with everything" | ~Aug 2024 |
| itch.io devlogs: Glistering https://pixeljam.itch.io/nova-drift/devlog/653857 · Vorpal https://pixeljam.itch.io/nova-drift/devlog/611652 · 1.2 https://pixeljam.itch.io/nova-drift/devlog/960454 | Viper, Sanctuary, Strafe and Void Slice reworks, with reasons | 0.35.30 (Sep 2023), 0.36.14 (Dec 2023), 1.2.22 (Jun 2025) |
| r/NovaDrift. reddit.com blocked the fetch, so posts were read through the Pullpush archive API. | Player sentiment (threads are linked below) | 2020–2026 |
| Aggregated Steam review sentiment: https://vaporlens.app/app/858210/nova_drift · review: https://rogueliker.com/nova-drift-review/ (2024-08-23) | Broad themes in what players praise and complain about | 2024–2026 |

**Gaps (honest):**
- I did not play the game. Everything here comes from the wiki, the patch notes and community posts.
- Wiki numbers are from v1.2.22 and the 2025-04 snapshot. Later patches (up to 1.2.38.2) changed some values, for example Strafing Strikes 100%→140% and the Saturation Fire mechanics, and the CSV only partly reflects this.
- Steam discussion threads were barely reachable, so the community evidence is mostly Reddit.
- The number of mod cards per offer is **inferred** as 3. The evidence is the achievement "reach level 40 having only chosen the central mod". I could not confirm it in a primary source.
- Seven removed mods (Double Team, Flotilla, Stunning Shots, Rebirth, Magnetism, Auto Mines, Vulcan) have names and a removal patch but no recovered effect text.
- The T3 prerequisite is ambiguous. The wiki lists both T2 mods as "Unlocked From", and I believe either one is enough, but I have not verified that.

## System structure

- **Leveling.** Kills drop XP orbs. Each level grants **1 upgrade point**. A point buys either a **gear swap** (weapon, body or shield; you hold exactly one of each, and a new pick replaces the old) or **a mod** (mods are permanent and unlimited). Typical late runs reach roughly level 40–60, judging by community posts (e.g. https://reddit.com/r/NovaDrift/comments/jh5ubt/). 1.0 added an ending, and Endless mode is optional after it.
- **Offer.** Each upgrade screen shows a gear row (3 options, raised to 5 at rank 24 and 7 at rank 50; the dev's reason was "never more than 1 reroll to get the gear you want") and a short row of random mods (inferred as 3). In Wild Metamorphosis, 0–3 wild mods are mixed in per offer and per reroll. You can cancel the screen and bank points, which Ataraxia rewards.
- **Pool shape: 28 mini-trees × 4 mods = 112 mods.** Each tree has 1 T1, 2 T2 and 1 T3. Taking the T1 adds its two T2s to the pool, and a T2 adds the T3. Fourteen trees are available from the start (weapon stats, blast, targeting, hull, regen, thrusters, the three shield trees, mines, drones plus the two drone branch trees). The other 14 unlock with account rank: turret, armor stacks, kinetics, ally (with Guardian and Interceptor), stabilization, skirmish, burn, construct ×2, efficiency.
- **Exclusive forks.** Assault Drones and Defense Drones each banish the other. Guardian and Interceptor do the same. Taking one Construct Specialist wild mod locks out the other three.
- **Super Mods (26).** You unlock them on account ranks 30–64. Within a run, one only enters the pool once you meet its **recipe**. Most recipes are **two specific normal mods** (Barrage = Focus Fire + Burst Fire; Void Slice = Blink + Strafe; Deflagration = Rupture + Purge). Four use a count instead:
  - Hidden Power: 4 sources of secondary damage
  - Mastery: 10 weapon upgrades
  - Last Stand: 10 shield or body upgrades
  - Ataraxia: 4 banked points

  The dev calls mini-trees plus super-mod recipes the "middle ground" between deliberate build-crafting and roguelike randomness ([retrospective](https://blog.novadrift.io/novadrift-released/)).
- **Wild Mods (37, Wild Metamorphosis mode only).** Rarities: 17 common, 12 rare, 8 ultra-rare. Rares appear about 1 in 3.5. Nineteen are **recursive**, meaning you can take them repeatedly. Several mods care about how many wild mods you own (Solar Heart, Discord) or duplicate the recursive ones (Obsession, Revelation, Explosive Growth). When the pool runs dry, **The Void** appears as a dead pick.
- **Rerolls.** You start with 3, gaining +1 every 4 ranks up to 10 at rank 50. Cargo Train enemies drop extras. Wild Metamorphosis halves rerolls, and Draft mode gives 20 (10 in Wild).
  - The Research body can spend rerolls to **banish** mods (2 rerolls for a wild mod), gaining +1% hull and shields per reroll spent.
  - Pool-editing mods: Regression (banish the offered T1s, +1 level), Winnow (banish everything offered, +7 rerolls), Transmogrification (+1 level, then three recursive-only offers), Quantum Decoherence (+5 levels, but no rerolls ever again).
- **Build-arounds vs support.** Gear sets the identity: 13 weapons, 14 bodies, 10 shields. Super mods and several T3s are build-defining (Hidden Power, Overseer, Rapid Reconstruction, Singular Strike, Barrage, Strafing Strikes, Sanctuary). The many T1 stat mods are filler and support, e.g. Rapid Fire +15%, Hull Strength +20%.
- **Signposting.**
  - Tree adjacency: taking a mod visibly opens the next ones.
  - Super-mod recipes: documented. In-game display is unverified, but players clearly know the recipes; see the complaint below about meeting requirements and never being offered the mod.
  - Maluses are printed in red (Basics page).
  - Mods incompatible with your gear are filtered out of offers. Rapid Reconstruction, Hidden Power and Overseer explicitly banish whole categories.
  - Banished mods have been shown in a strip on the right of the upgrade screen since 0.33.20.

## What players love

Recurring themes:

1. **Your weapon stops looking like the weapon you started with. The run produces a spectacle.**
   - "1760 rainbow missiles" (Salvo stockpile), 117 upvotes: https://reddit.com/r/NovaDrift/comments/v33u7u/
   - "Firing 2200+ salvo missiles": https://reddit.com/r/NovaDrift/comments/hex8ev/
   - "I turned my Flak shooter into an Antimatter machine gun", 130: https://reddit.com/r/NovaDrift/comments/1fjqs3i/
   - Eight-armed "Octolance" lance-mine (Thermal Lance + Loaded Mines + stacked Double Tap): https://reddit.com/r/NovaDrift/comments/m2xtow/
   - "Perhaps I took too many double taps": https://reddit.com/r/NovaDrift/comments/vqvcwr/
   - "Leviathan + deadly wake + boost is one of the most beautiful things": https://reddit.com/r/NovaDrift/comments/kx2rtz/

   Many of the most-upvoted posts in the subreddit are of this kind.
2. **Identity flips where the ship becomes the weapon.**
   - Hidden Power + Hullbreaker: one commenter jokes that they are not shooting bullets, they are the bullet. https://reddit.com/r/NovaDrift/comments/1su7omb/
   - "You are the weapon…" (Pulse + Singular Strike + Phantom Strike + Charged Shot), 94: https://reddit.com/r/NovaDrift/comments/1lf5ozp/. A commenter adds that the short delay before the hit makes it more satisfying.
   - Hullbreaker/Rampage and Leviathan "snek" as the easy mode: https://reddit.com/r/NovaDrift/comments/qh8r2l/
3. **Theorycrafting multi-part engines.** "Quite literally infinite DPS" chains Shockwave vulnerability, Discharge, Volatile Shields, Tempest Break and Fleet Commanders keeping vulnerability up: https://reddit.com/r/NovaDrift/comments/y3j98r/. "Some of my favourite builds… diversity": https://reddit.com/r/NovaDrift/comments/1i88178/.
4. **Build variety is the headline praise.** Vaporlens counts "Massive Build Variety" (53 mentions) and "Extensive build variety" (47) as the top positives. The Rogueliker review praises the range of abilities and how they interact.
5. **Pick-economy decisions.** On Ataraxia: it forces you to really evaluate every mod, and it combos with Grandeur and Quantum Decoherence to push level 60+ (https://reddit.com/r/NovaDrift/comments/jh5ubt/).
6. **Wild mods split the playerbase about 50/50**, according to the dev (https://reddit.com/r/NovaDrift/comments/1ldzgzr/). Fans love the absurd stacks ("lucked into 7 twin strikes… hilarious"). Others say a build "never really feels complete" in Wild (y3j98r), or play vanilla 98% of the time.

One-offs: Seraph/boss fan art, and lag as a "badge" ("any build that periodically flashbangs you is a good build", 1lf5ozp).

## What players hate, and trap picks

- **RNG denies the planned build even after spending everything.** Recipe met, but the super mod never offered in 30 upgrades; a wild mod never seen in an hour of banishing: https://reddit.com/r/NovaDrift/comments/ytrt3p/. "Burn all your rerolls and not find the wild mod": https://reddit.com/r/NovaDrift/comments/191ccqh/. Defiance took a Discord member 100+ rerolls to see (https://reddit.com/r/NovaDrift/comments/i6jnys/). Players asked for mods that bias tag weights and for rerolls as rewards.
- **Rerolls spent on gear instead of mods**, and body and shield arriving at different times so you can't match them: https://reddit.com/r/NovaDrift/comments/vrx7lg/. The dev answered with 5 and 7 gear choices and Draft mode.
- **Mods that punish the core verb are traps.**
  - Aegis (bonus only while not thrusting) "feels useless… you never want to stand still": https://reddit.com/r/NovaDrift/comments/lt9nms/. Defenders: it works on turret/siege and recoil-movement builds, and Rampage (always thrusting) cancels it completely.
  - Efficiency: the offshoots, Conversion especially, read as useless or confusing: https://reddit.com/r/NovaDrift/comments/ldw05h/
- **Mods that barely work in this game's math.** Incendiary Strike doesn't stack, so it is weak in a game built on fire rate and projectile count. A commenter calls it viable "in very little builds" (1i88178).
- **Pool collapse after a pruning pick.** After Hidden Power plus Rapid Reconstruction, "nothing else worth getting after levels 30–35" except Ataraxia (i6jnys). The dev's own note says wild mods "can take over your upgrade pool".
- **Near-mandatory picks**, stated by the dev in patch notes: Strafe for hyperscoring, Adaptive Armor for high scores, Research in top Wild builds, and Defiance stacking into "immortality".
- **Performance.** Construct-spam builds (Engineer/Wingman) tank FPS (Steam thread surfaced in search, 2021).

## Dev changes (selected; stated reasons paraphrased)

| Version | Change | Stated reason |
|---|---|---|
| 0.19 / 0.21.6 | Warp Strike's cost moved to an HP loss on screen-wrap. Its prerequisite changed Guidance→Blink. | Make it situational rather than an automatic pick for Salvo. More thematic, and raises the number of mods a weapon build needs. |
| 0.20.11 | Base rerolls 4→3. Research's XP bonus removed. | The bonus was largely illusory because of the XP curve. |
| 0.21.6 | Movement trees split into Kinetics, Efficiency and Movement. Rebirth and Magnetism pulled from the pool. | Restructure (no further reason). |
| 0.24.4 | Defiance reworked. | It let some builds become immortal. |
| 0.26.12 | Turret given its own tree. Ally trees flattened so useful mods come earlier. | Turret should be strong with less uptime and used tactically. Allies should be useful sooner. |
| 0.27.20 | Vortex nerfed. Mine changes. | Too strong for too little risk. Architect Vortex-mines outclassed every other mine. |
| 0.29.8 | Antimatter Rounds buffed only for weapons you fire yourself. Gear choices raised to 7. | Mine abuse; self-fired builds needed incentive. Never need more than 1 reroll to find gear. |
| 0.30.1 | Grandeur nerfed. | Players were reaching level 100. |
| 0.31.19 | Research: wild mods cost 2 rerolls to banish. Overseer: +1 advanced construct instead of double. | Research was practically mandatory in top Wild builds. Overseer + Engineer broke balance. |
| 0.33.20 | Charged Shot moved to an S-curve. Maelstrom nerfed. Drone and Ally branches reachable right after T1. | Optimal play was tiny charges; designers wanted commitment. Maelstrom nearly removed projectiles as a threat. |
| 0.35.30.1 (Vorpal) | Strafe cooldown 1→1.5s, Blink 2→1.5s, enemy speed scaling reduced. Ataraxia threshold changed. Displacement became Void Slice. | Strafe was near-mandatory for hyperscoring and Blink couldn't compete. The old Ataraxia bonus caused "degenerate" scaling with Spectre/Architect. |
| 0.36.14 (Glistering) | Viper reworked. Sanctuary reworked into a follow-zone. Corrosion lost its weapon-damage malus. All burn now ignites. | Viper was wordy, convoluted and weak. Sanctuary didn't deserve Super Mod status. Corrosion's malus made it hard to evaluate on weapon builds. Simplify burn. |
| 1.0 | Adaptive Armor and Rebuke retuned. Snipe max 120→80%. Many mobility penalties cut 30→20%. Ataraxia guaranteed once when its condition is met. Construct Specialists only offered if you own the matching construct. | Self-damage builds had too cheap a path to damage reduction. Early play should be easier without resistance mods. |
| 1.1.11 | Rank progress based on waves cleared instead of score. | — |
| 1.2.23 / 1.2.38.2 | Ignite-modifier fix offset by +25% to lightning and lance. Strafing Strikes charge bonus 100→140%. | Keep effective power where it was after bug fixes. |

Dev meta-lesson ([retrospective](https://blog.novadrift.io/novadrift-released/)):
- "Everything works with everything" compounded the fun.
- Past roughly 150 upgrades, every addition multiplied the balance work.
- Veterans understood the metagame better than the solo developer.
- Endless mode made balance hard, because builds were judged by how many waves they reached. The fix was a real ending, with Endless made optional.

## Standout designs (patterns)

1. **Recipe super mods (two normal mods unlock a third).** Barrage = Focus Fire + Burst Fire; Deflagration = Rupture + Purge; Void Slice = Blink + Strafe.
   - *Why it works:* common picks gain a second meaning as ingredients, so players start planning two picks ahead. The pool itself teaches the combo.
   - *Failure mode:* the recipe is met and then RNG never offers the result. That is the #1 complaint.
2. **Power from not picking (Ataraxia).** Banked points scale damage, with thresholds at 5/10/20.
   - *Why it works:* the pick screen becomes a resource decision, and every offer is weighed against "nothing". Players call this its best quality.
3. **Give up a pillar, get an identity and a pruned pool.** Hidden Power (no weapon), Rapid Reconstruction (no shield), Overseer (can't fire), Apotheosis (no collisions).
   - *Why it works:* a single pick rewrites how you play, and banishing a whole category improves every later offer.
   - *Failure mode:* the pool collapses late in the run.
4. **Your weapon, fired from somewhere else.** Loaded Mines (mines fire your gun radially), Interceptor/Wingman (an ally fires your gun), Death Blossom (360° volley on shield break), Outrage Module (empowered shot on a big hit), Phantom Strike (teleport behind and fire).
   - *Why it works:* every earlier weapon mod gets multiplied by a new delivery point and a new trigger. It produces the most-shared images in the community, like the Octolance.
5. **Turning a bad event into a payoff (shield break as the trigger).** Volatile Shields, Death Blossom, Warp, Emergency Systems, Tempest Break, Flash Shielding.
   - *Why it works:* losing your shield becomes a rhythm you want, so defense turns into a cadence of explosions. Retribution and Outrage Module do the same with big hull hits.
6. **Rest/rhythm rewards in an auto-fire game.** Salvo's stockpile, Spectre's cloak, Efficiency, Calibrate, and Siege Weaponry (the opposite: commit to firing).
   - *Why it works:* they create a fire/hold rhythm when firing is otherwise not a decision.
   - *Lesson from Aegis:* reward the rest state, but never ask the player to stop the core verb (thrusting) for a passive bonus.
7. **Movement converted to damage.** Kinetic Boost, Celestial Lance, Deadly Wake, Firefly, Hullbreaker, Leviathan's whipping segments, Energized Shields.
   - *Why it works:* flight skill shows up directly in the damage numbers.
8. **Exclusive forks that banish the alternative.** Assault vs Defense Drones; Guardian vs Interceptor; one Construct Specialist.
   - *Why it works:* a clean "become A or B" moment that also tidies the pool.
9. **Cross-system status currency.** Vulnerability is applied by Thermal Lance, Shockwave, Fleet Commanders, Carrier swarms and Rebuke, and read by everything.
   - *Why it works:* it creates combos between unrelated families, like the infinite-DPS engine above.
10. **On-death contagion for crowds.** Corrosion (stacks jump to neighbours when the host dies), Rupture (dead enemies explode for 3% of max hull), Deflagration (ignites cashed in on kill), and the enemy-side Hammerhead (chain-explodes its own pack).
    - *Why it works:* swarms become fuel, and power scales with density.
11. **Stackables plus multipliers of stackables.** Recursive wild mods; Obsession, Revelation and Explosive Growth (+1/+2/+3 copies); Solar Heart and Discord scaling per wild mod owned.
    - *Why it works:* a deckbuilder-style engine inside a shooter. "7 Twin Strikes" stories come from this.
12. **Offense that is also defense.** Antimatter Rounds and Counter Artillery shoot down enemy projectiles; Swords parry and retaliate; Reflect turns enemy shots back.
    - *Why it works:* it answers ranged threats without adding a separate defensive stat.

## Ideas worth transforming for Bastion

Translated through Bastion's pillars. These are pattern transfers, not finished cards.

- **Recipe cards keyed to the grid (from #1).** A rare card that only enters the offer when the ship shows a specific **adjacency pattern**, e.g. Cryo touching Rail and inside a Reactor's 3×3, or after owning two named commons. Each common card prints "Ingredient of: X".
  - Why it fits: Bastion's neighbour rules already are recipes. This makes them visible and gives them a payoff tier.
  - Mitigate Nova Drift's main complaint: once the recipe is met, **guarantee** the card in the next wave-break offer, as Nova Drift itself did for Ataraxia in 1.0.
- **Banked picks (from #2).** Skipping a wave-break card stores a charge, and each banked charge gives a small global buff. One card could pay out a lump of Matter or a free upgrade at 3/5 banked.
  - Why it fits: Bastion's free pick plus Matter-cost reroll economy creates exactly the opportunity cost that made Ataraxia loved.
- **Give up a pillar (from #3).** Grid-specific versions, rather than the rejected "Ram Prow" stat:
  - "Weapons stop auto-firing; support and armor modules project damage auras through their 3×3."
  - "No Shield Nodes can be bought; Bulkheads regenerate."

  The card also **banishes** the now-useless families from future card and shop offers, which is the part Nova Drift players credit. Flag the risk of a dead late pool.
- **Your weapon from another tile (from #4).** Detached or destroyed modules become drifting mines that fire their weapon once in a radial burst. That turns detachment, a Bastion pillar, into a Loaded Mines / Death Blossom moment, and it reuses the existing detach and explosion VFX. Variant: the outermost edge tile copies the attack of its strongest neighbour at reduced rate (Interceptor/Wingman logic on the grid).
- **Turning a bad event into a payoff (from #5).** Bastion's equivalents of shield break are a **Shield Node popping** and a **module destroyed**. Example cards: a popping Shield Node releases a ring that freezes (reuses Cryo); a Bulkhead absorbing a lethal hit vents fire to adjacent weapons (reuses Ember ignition).
- **Coast vs thrust rhythm (from #6, avoiding Aegis's trap).** Bastion has an explicit coast state when the mouse is released. A card can charge weapons while coasting and release the charge on the next thrust (Salvo/Spectre logic). Don't penalize thrusting; reward the switch between the two states. Because weapons auto-fire, rhythm has to come from movement, not from the trigger.
- **Flight converted to damage (from #7).** Speed-scaled effects tied to tiles, e.g. edge modules on the trailing side leave Ember wake, or front-facing Flak gains spread at speed. Keep it grid-local so placement matters. Note that the rejected list included Drift Gunnery and Momentum. The difference Nova Drift suggests is a *visible new behaviour* (a trail, an aura), not a percentage.
- **Exclusive family forks at a wave break (from #8).** Example: "Ember: Wildfire (spreads on kill) **or** Furnace (stacks on one target)". Picking one banishes the other for the run. It fits the 18-family branch trees already licensed in Hangar.
- **Status as a cross-family currency (from #9).** Make chill or burn something *other* families read. Rail Shatter already does this. Scale the pattern: Reactor-boosted weapons deal +X vs burning targets, and Repair Array heals per chilled enemy nearby (Purification analogue).
- **Swarm contagion (from #10). The strongest fit for Bastion's swarms.** Burn stacks jump to nearby formation members when the host dies (Corrosion); kills burst for a % of max hull (Rupture); splitter kills seed chill. It rewards fighting formations, as Bastion intends, and reuses existing fire and cold VFX.
- **Interception (from #12).** A Flak or Scatter card that shoots down bolter and sniper projectiles in its arc. A direct answer to Bastion's ranged enemy types and a reason to place Flak on the threatened side of the grid.
- **Avoid these, based on Nova Drift's lessons:**
  - Stat-percentage commons as the main content.
  - Recipe cards gated behind pure RNG.
  - Mods that ask the player to stop flying.
  - Pruning cards that leave a dead pool. Bastion only has 20 waves, so fewer cards per run need to land.
  - Cards whose value is hard to evaluate because of mixed maluses (Corrosion's original weapon-damage malus).
