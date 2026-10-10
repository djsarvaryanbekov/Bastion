# Horde balance and motion feedback — 2026-10-08

Build: `2026.10.08-matter-economy-26`.

The current direction is a forgiving opening followed by greater pressure near boss three, requiring continued investment in weapons and upgrades. Ordinary enemy types keep fixed HP, shields and damage. Boss HP may differ by encounter and must not depend on the player's power.

## Latest playtest evidence

Ten available playtest exports contain 37 unique runs after deduplication by runId. Three runs belong to `2026.10.08-fixed-enemies-24`; the newest exported run is also build 24. It does not provide a human playtest of the later shield/horde build 25. The exporter build is not used to relabel historical runs.

The newest run lasts 434.2 combat seconds (7:14), with 2,175 kills, 3,211 Matter earned, 1,755 spent and 1,456 left on death. It uses the Striker Core with Scatter as starter, no permanent ranks and no branch licenses. The player purchases 25 modules and six base upgrades; all purchases stop at 5:08, with a 27-tile ship. Matter then rises above 1,000 while the core stays at full health until boss two. Boss one dies after 18.6 seconds; boss two destroys the ship with 11,939 of its 16,000 HP remaining. This supports making fleet investment slower while retaining the boss tuning, rather than treating the spare Matter as proof of low boss difficulty.

The earlier, slightly longer build-24 run lasts 459.9 combat seconds (7:40), with 2,297 kills, 3,513 Matter earned and 3,014 spent. The core takes 6 damage, shields absorb 1,756.15, and thirteen modules are lost: six Cannons, four Scatter Arrays and three Shield Nodes. The player buys replacements and expands the fleet. The first two bosses take 20.33 and 42.13 seconds from arrival to defeat. This export ends after boss two; it contains no third-boss encounter or movement inputs.

The screenshot matches the 15-module layout built by 3:44: six Cannons, four Scatter Arrays, four Shield Nodes and the Striker Core. All three module families have base1/base2 upgrades, with no branch licenses or permanent core ranks recorded. Four upgraded shield generators provide up to 300 total charge, with overlapping local fields.

## Current changes

- Preserve ordinary enemy HP, damage, shield capacity, movement and payouts per type. Keep the existing wave settings before 8:00 and the established first-boss tuning.
- From 8:00, increase group size and ambient supply gradually. Increase ranged escorts from three at 8:00 to four at 9:00 and up to six in later phases. Heavy fronts gain one ranged escort from 8:00; they remain heavy-body formations. Origins stay outside the viewport, groups remain cohesive, and the active caps remain 420 ordinary enemies and 900 projectiles.
- At 8:00, ordinary groups are 26 bodies instead of 23 and ambient packs are 14 instead of 12. At 9:00, groups are 28 instead of 25 and packs are 16 instead of 14. Continue the stronger quantity curve after the third-boss stretch without modifying individual enemy stats.
- Keep shield capacity (60 base / 75 upgraded), coverage radius and the six-second quiet-time delay. Reduce base recharge from 4 to 3 per second, the second base upgrade from 5 to 4, and the completed Fast Recharge route from 8 to 6. Fast Recharge retains its four-second delay. Hits still interrupt covered fields, including empty ones.
- Preserve weapon values, Matter/Fragment separation, saved purchases and ranks. Run prices are adjusted in the economy pass below. Retain the matching Build/combat sprites, turret angles, rank badges and forward-motion feedback.

An empty upgraded shield now takes 24.75 quiet seconds to fill completely, versus 21 previously. Moving away still allows recovery; four-node stacking refills at 16 charge per second instead of 20.

## Matter prices — build 26

The user reports that normal enemies require too little investment, leaving about 1,000 Matter unused, while bosses feel threatening. This pass changes run prices only and retains build 25's combat tuning.

- The first two total copies of each family keep the existing base cost curve. A selected starter counts as the first copy. Each copy beyond the second applies another 20% increase on top of the existing per-family curve. This is driven by living copies, not time, boss count or player power. Losing a copy reduces the duplicate portion of its replacement cost; paid upgrades still remain in the family investment.
- First upgrade prices are unchanged. Second and later base upgrades and every branch stage cost 50% more per copy, rounded upward. All installed copies are charged together. New copies include those updated paid stages, so upgrading before expansion does not avoid their cost.
- Cannon expansion costs with one starter are 25 / 36 / 53 / 77 / 113 / 165 / 241 Matter, previously 25 / 30 / 37 / 45 / 55 / 66 / 81. Cannon base upgrades cost 8 / 18 per copy, previously 8 / 12; Shield base upgrades cost 14 / 30, previously 14 / 20. The first Shield Node remains 37.
- Weapon effects, ordinary enemy stats/payouts, boss tuning, permanent Fragment prices, ranks, save keys and the free Test Range remain unchanged.

Repricing the newest run's recorded purchases yields 2,453 instead of 1,755 Matter, an increase of 698 (39.8%). With the recorded income held constant, 758 would remain instead of 1,456. This is a price-only comparison: the player could not afford all those purchases at their original timestamps. Slower expansion changes kills, income and survival, so these amounts are not a prediction or a replay.

The first additional Cannon remains affordable at 22.37 seconds in the opening idle fixture. Runtime checks verify rejected purchases do not charge Matter, upgrade spending equals installed copies, replacements retain their investment, fresh runs reset levels, and Fragments remain separate. A dedicated 1920×1080 browser check compares displayed prices and actual debits for copies, multi-copy upgrades and later branches.

The baseline, all ten exported logs, a deduplicated price audit, regression output and candidate are preserved under `outputs/experiments/2026-10-08-matter-economy/`. The next human run should check whether the first boss remains fair with slower expansion and whether later upgrades now require choosing between new firepower and protection.

## Boss HP

The boss spawn function is unchanged in this pass. The first three encounter HP values remain 3,200 / 16,000 / 42,000. Later encounter HP follows the existing encounter-count curve, capped at 100,000,000. It reads neither player DPS nor weapon upgrades, shield count, module count or elapsed combat time.

The recurring Siege Ring has 3,200 HP as boss one and 74,340 as boss four. The Pursuer has 16,000 as boss two and 116,760 as boss five. Tests compare a starter and an upgraded Striker fleet at different combat times for the same encounter and require identical boss stats.

## Verification

`npm test` passes all 26 gameplay checks. The suite includes fixed ordinary stats across all fourteen enemy types, very long runs and repeated boss defeats; opening affordability; shield recovery and hit interruption; offscreen cohesive spawning; ranged escort bounds; purchasing, saves, telemetry and entity caps.

`tools/shield-horde-check.cjs` uses the screenshot layout at 3:45 and 9:00 across three seeds. It compares idle play with short straight thrust inputs triggered by nearby enemies. A separate late fixture grants ten additional weapons and licensed crowd-control branches. It uses real movement, firing, damage and module destruction, with no purchases or bosses during each two-minute measurement. These fixtures do not replay the player's inputs, establish affordability or prove human difficulty.

In the current early moving fixtures, all three seeds retain 350 core HP after two minutes, losing zero to two modules. At 9:00 the unchanged 15-tile fleets lose all fourteen non-core modules, even when the moving core survives. The expanded crowd-control builds have mixed module retention; these fixtures establish pressure and continued retreat as possible outcomes, rather than proving that any particular upgrade layout is sufficient.

Task evidence, the previous canonical game and measured comparisons are preserved in `outputs/experiments/2026-10-08-shield-horde-pressure/`. Browser checks use 1920×1080 at normal scale and isolated storage. The main HTML and package must match the verified candidate.

For the next human run, export the log after reaching boss three. Check that the opening remains comfortable, shields require a meaningful retreat to refill, and adding firepower and choosing upgrades helps maintain pressure against the later horde.
