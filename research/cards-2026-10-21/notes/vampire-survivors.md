# Vampire Survivors: upgrade system study

Catalog: `../catalog/vampire-survivors.csv` (172 rows: 22 Arcanas, 13 Darkanas, 9 system rows, 31 base-game evolutions, 3 base unions, 2 gifts, 4 morphs, 54 DLC evolutions and 5 DLC unions, 29 passives or gift items).

## Sources

**Primary: the official wiki, vampire.survivors.wiki.** Poncle launched it with Weird Gloop on 13 Mar 2025. It is the current wiki. It is not on wiki.gg, and the Fandom wiki is a separate legacy wiki that blocked fetches during this session.
- Arcana page (all Arcanas, Darkanas, acquisition rules, patch history): https://vampire.survivors.wiki/w/Arcana
- Evolution page (recipes, chest rules, unions, gifts, morphs): https://vampire.survivors.wiki/w/Evolution
- Passive items page: https://vampire.survivors.wiki/w/Passive_items
- Level-up page (draft rules, rarity weights, patch history): https://vampire.survivors.wiki/w/Level_up
- Mechanic pages: [Banish](https://vampire.survivors.wiki/w/Banish), [Seal](https://vampire.survivors.wiki/w/Seal) and [Grim Grimoire](https://vampire.survivors.wiki/w/Grim_Grimoire)
- Arcana pages: [Silent Old Sanctuary](https://vampire.survivors.wiki/w/Silent_Old_Sanctuary), [Gemini](https://vampire.survivors.wiki/w/Gemini), [Tragic Princess](https://vampire.survivors.wiki/w/Tragic_Princess) and [Game Killer](https://vampire.survivors.wiki/w/Game_Killer)
- Weapon pages: [Crimson Shroud](https://vampire.survivors.wiki/w/Crimson_Shroud), [Infinite Corridor](https://vampire.survivors.wiki/w/Infinite_Corridor), [Soul Eater](https://vampire.survivors.wiki/w/Soul_Eater) and [Vandalier](https://vampire.survivors.wiki/w/Vandalier)

**Community: Steam discussions (Reddit could not be used).**
- "Arcanas are Awesome!": https://steamcommunity.com/app/1794680/discussions/0/4924132112045287634
- Twilight Requiem / Torrona thread: https://steamcommunity.com/app/1794680/discussions/0/3489753940066675240
- Torrona's Box at Lv9: https://steamcommunity.com/app/1794680/discussions/0/3489752656785589266
- "Worst build": https://steamcommunity.com/app/1794680/discussions/0/3826410044355247738
- Builds feel the same / Darkana too strong: https://steamcommunity.com/app/1794680/discussions/0/6589423683861746051
- Evolution chest did not evolve: https://steamcommunity.com/app/1794680/discussions/0/3194745319525530483

**Aggregators and press.**
- Vaporlens summary of Steam reviews: https://vaporlens.app/app/1794680
- RogueRanker arcana tier list: https://rogueranker.com/vampire-survivors-arcanas/
- Destructoid on patch 0.8.0 (Limit Break): https://www.destructoid.com/vampire-survivors-patch-0-8-0-limit-breaks-final-reaper-boss-better-level-ups/
- PCGamesN on patch 0.5 (Arcanas introduced): https://www.pcgamesn.com/vampire-survivors/0-5-patch-notes
- Arcana patch coverage: [TechRaptor 0.7.3](https://techraptor.net/gaming/news/vampire-survivors-update-patch-073-adds-new-character-new-arcanas) and [Prima 0.8.0](https://primagames.com/tips/vampire-survivors-patch-0-8-0-whats-new)

**Gaps. Read these before you trust the details.**
- **Reddit is blocked** for this agent's fetch tool, and a Redlib mirror did not load. The "love" and "hate" evidence therefore comes from Steam threads (mostly from 2022), Vaporlens and tier-list sites. That is thinner than a Reddit sweep.
- **Evolved weapon effects:**
  - Verified this session: Crimson Shroud, Infinite Corridor, Soul Eater and Vandalier.
  - Most other base-game evolution effects come from general game knowledge. Each one is tagged `[not re-verified]` in the CSV.
  - DLC evolution effects were not researched. Only the recipes are listed.
- **DLC recipe pairings:** The wiki table flattened when fetched. I rebuilt the Moonspell, Bloodmoon, Foscari and Emergency Meeting pairings by cross-checking against the passive page's "evolves with" column. "Argent Flow" has no legible base weapon, and I could not confirm it exists.
- **Not captured:** Emerald Diorama and Ante Chamber evolutions. The Castlevania list is partial.
- **Darkana unlocks:** XIII and XIV are uncertain.
- **Tragic Princess:** the wiki gives no exact cooldown formula.
- **Developer intent:** I found no design interview about Arcanas or evolutions. The Noclip documentary is the likely source but has no transcript. Any developer intent below is inferred from patch notes, not quoted.

## System structure

**Level-up draft (the "common card" layer).**
- Each level-up offers 3 options, and Luck gives a chance of a 4th.
- Options are weapons and passives. A new item enters at Lv1, and an owned item gains a level.
- Items have rarity weights. Before drawing from the full pool, the game makes up to 2 checks that favour items you already own. This keeps builds coherent.
- Slots: 6 weapons and 6 passives. Once they are full, only owned items are offered. When everything is maxed, the draft offers gold or Floor Chicken (healing). The Limit Break toggle replaces that with stat steps on maxed weapons.
- The game grants brief invulnerability after each pick (added Feb 2022).

**Pool control.**
- **Reroll:** gives a fresh offer.
- **Skip:** declines the offer but keeps part of the XP.
- **Banish:** removes an item from the pool for the run. It is bought in PowerUps (2 per rank, 5 ranks) and can also come from Golden Eggs or Silent Old Sanctuary. A banished owned item keeps its level but cannot be upgraded further.
- **Seal (Nov 2022 onward):** permanently removes items from the pool between runs. **MEGA SEAL** removes a whole DLC set.
- **Why Seal exists:** as DLC grew the pool, players needed it to find their catalysts. The dev added more seal tiers in 2023, 2024 and 2025.
- **Unbanish (Apr 2026 beta):** picking a banished item up from the stage now offers to unbanish it.

**Evolutions.**
- **Requirements:** the weapon at max level, plus its catalyst passive in inventory. Original recipes accept any catalyst level. Newer recipes require the catalyst at max. Then you open an eligible boss chest, usually one from a boss that spawned after 10:00.
- **Result:** the chest replaces the weapon with its evolution, and the passive stays in inventory.
- **Why the passives matter:** every passive is a useful stat on its own and also a catalyst, so passives work like keys.
- **Unions:** two or three maxed weapons merge into one and free slots, for example Peachone + Ebony Wings → Vandalier.
- **Gifts:** a new weapon is added and the original is kept.
- **Morphs:** the character transforms at Lv80 when holding a relic, and the starter weapon evolves automatically.

**Evolution signposting (weak, and players complain about it).**
- The level-up panels show evolution info (added Mar 2022). That fixed a broken evolution indicator in Jun 2023.
- The full recipe list is in the Grimoire. It is gated behind a relic hidden in a stage and only shows recipes you have discovered.
- Requirements register about 10 s after you meet them.
- Pre-10:00 chests usually cannot evolve, and the exceptions differ by stage.
- Banished or sealed items silently block evolution.
- The Steam "why didn't it evolve" threads are a recurring genre. Players learn the recipes from the wiki.

**Arcanas (the closest analogue to rule-changing cards).**
- **Getting them:** pick 1 at run start from the unlocked Arcanas, or choose a random one. Special bosses at 11:00 and 21:00 drop an Arcana Chest offering 4 uncollected Arcanas. You can reroll until every option has been seen once, and since Aug 2022 you can skip.
- **Cap and frequency:** 3 Arcanas per run. In a 30-minute run that is about 100+ level-up picks against only 3 Arcanas.
- **Unlocks:** reach Lv50 with a specific character (this drives roster variety), survive to 31:00 on a stage, or find a relic.
- **Global or listed:** many Arcanas are global. About half affect only listed weapons, so each one points the player toward a weapon subset.
- **Darkanas (Aug 2024, patch 1.11):** a second set of 13 that shares the same 3 slots.
- **Disabling them:** a stage toggle turns Arcanas off, and the 11:00 and 21:00 Arcana bosses go with them.

## What players love

- **Evolutions and synergy discovery.** Vaporlens lists "weapon evolution system" as a positive theme, and "variety / build synergy" is the second-largest positive cluster (45 mentions). The two-ingredient recipe plus a chest jackpot moment is the signature.
- **Arcanas that fix weak weapons.** In the Steam "Arcanas are Awesome" thread, several players independently say Heart of Fire saved the Fire Wand. Others say Slash made knives useful, Sarabande gave Garlic and lifesteal builds a purpose, and the Whip became viable. Players call them a change to the game, not a stat bump.
- **Universal, low-condition Arcanas rate highest.** In the RogueRanker S tier, Mad Groove (vacuum everything every 2 minutes), Sarabande (healing becomes damage) and Heart of Fire (things explode) all "work on every build and stage".
- **Ways to break the game.** Players like Silent Old Sanctuary one-weapon runs, Game Killer runs with no levels, Limit Break, and Infinite Corridor / Crimson Shroud as tools against the Reaper.
- **Start-of-run Arcana choice**, so you can plan a build around it. It was added in 0.5.2 right after Arcanas launched.

## What players hate / trap picks

- **Conditional Arcanas that scale off a downside.**
  - Twilight Requiem scales with Curse and is called "a bad arcana" on Steam.
  - Divine Bloodline wants missing HP.
  - Blood Astronomia is C tier.
  - Players do not want to invest in a penalty just to switch a card on.
- **Random oscillators.** Chaos in the Dark Night (projectile speed swings ±50%) is C tier. Lost & Found Painting and Boogaloo of Illusions are tolerated only because of their +1% per level rider. The swing is not controlled by the player.
- **Twins that cannot evolve** (Gemini). They are strong early, then fall off. The wiki calls it weak at high Curse.
- **The "most arcanas are useless" view** shows up in 2022 threads. Many listed-weapon Arcanas are dead if you do not hold those weapons.
- **Torrona's Box at Lv9.** Eight good levels end in a +100% Curse spike. Players banish it at Lv8, so the intended dilemma is solved trivially.
- **Evolution confusion:** the 10-minute chest rule, the 10 s registration delay, wiki dependency and the Grimoire gate.
- **Pool dilution from DLC.** Catalysts get hard to find, which led to Seal I–III, Seal All and MEGA SEAL.
- **Overpowered late additions.** Players say Darkanas such as Hail from the Future make characters feel alike, and some players avoid them.
- **The core loop is shallow.** Vaporlens cites shallow strategy and repetition (29 mentions). One critic compares it unfavourably with Slay the Spire's depth. Upgrades are mostly passive picks, and moment-to-moment decisions are only positional.

## Dev changes (dated, from patch history)

- **Oct 2021:** level-up draft added. Jan 2022: stats shown on the level-up and pause screens. Feb 2022: invulnerability after a pick. Mar 2022: evolution info on level-up panels.
- **Banish:** added Mar 2022, given one more charge in Apr 2022 and one more rank in May 2022, visual reminders in Jul 2022, and 2 charges per rank from Oct 2022.
- **Reroll and Skip:** cheaper from Apr 2022.
- **0.5 (2022): Arcanas introduced**, starting with Sarabande via the Randomazzo relic. 0.5.2 added the run-start pick and the 3-Arcana cap. 0.7.0 and 0.7.3 added more Arcanas and the Grimoire. 0.8.0 added Game Killer and Limit Break. 0.9.0 added Gemini, and 0.10.0 widened Gemini's weapon list.
- **Arcana chest changes:** rerolls could draft Arcanas from May 2022, and Arcana drafts became skippable in Aug 2022. Inferred intent: give player control over the rare pick and avoid a forced bad card.
- **Seal:** Seal I in 1.1.0 (Nov 2022), II in 1.4.0 (2023), III in 1.10 (2024), Seal All in 2025, plus MEGA SEAL. This is the response to pool dilution.
- **1.11 (Aug 2024):** Darkasso relic and the Darkana set.
- **2026:** unbanish on pickup, Random LevelUp togglable mid-run, banishing without leaving the level-up menu, and the Grimoire layering fix.
- **Evolution rules:** newer recipes require the catalyst at max, while older ones accept any level. Inferred intent: slow down evolutions as the power ceiling rose.

## Standout designs and why they work

1. **Weapon + catalyst evolution, payout delayed to a boss chest.**
   - Each passive does two jobs: a useful stat now and a key for later. That is why picking a passive is never fully dead.
   - The chest gate turns the payoff into a spectacle moment you anticipate, rather than an instant pick.
   - The weak spot is discovery and timing rules, not the recipe idea.
2. **Silent Old Sanctuary (empty slots give power).**
   - The only Arcana that rewards *refusing* offers. It turns every later level-up into a restraint test and pairs with Limit Break for depth over breadth.
   - It also gives +3 reroll, skip and banish, so you have the tools to say no.
3. **Heart of Fire.** One card makes the weakest weapon family good and makes being hit an attack. Players credit it with saving the Fire Wand. Rare cards are a balancing tool for neglected families, not just power.
4. **Sarabande of Healing.** Converts a defensive stream (healing) into offence: HP restored is dealt as damage nearby. It is universal and simple, which puts it in S tier, and it lets sustain builds play aggressively.
5. **Out of Bounds and Crystal Cries.** These turn an existing status effect into a trigger: frozen enemies explode, and killing frozen enemies grows you. No new stat is needed, only a payoff for a state the game already has.
6. **Crimson Shroud.**
   - Every hit is capped at 10 damage, and each shield charge spent retaliates with what you absorbed.
   - Incoming damage becomes ammunition. It reads clearly and has a cooldown and charges, so it is not a permanent god mode.
7. **Infinite Corridor.** Halving the HP of everything on screen, bosses included, stays relevant against any HP scaling. It is the classic answer to exponential enemy growth.
8. **Unions (Vandalier).** Two maxed weapons fuse into one and free a slot. Space is the currency, so the merge is a real gain and creates long-range build goals.
9. **Tragic Princess.** Listed weapons recharge faster while you move, faster the quicker you go, and it ignores the cooldown cap. It ties a stat directly to the player's one skill input. VS ranks it only B, because in VS you are always moving anyway. The idea is stronger in a game where moving is a choice.
10. **Game Killer.** It deletes the core loop: no XP and no level-ups. In return, XP gems become homing explosives and chests hold 3+ items. It is a whole alternative run mode in one card, and players use it for deliberate challenge and gimmick runs.
11. **Listed-weapon Arcanas as build signposts.** Gemini, Slash, Iron Blue Will and others each name a subset of weapons. Taking one tells the player what to draft next, so a single rare pick shapes many later common picks.
12. **The Arcana cadence: rare, few, chosen with extra options.** There are 3 per run: one at the start and two from milestone bosses. You choose from 4 with look-through rerolls and can skip. Scarcity is what lets each one be rule-changing without breaking balance.

## Ideas worth transforming for Bastion

Honest framing: several of these overlap with concepts the user already rejected (Drift Gunnery, Sacrificial Plating, Shock Barrier, Twin Link). The difference here is the evidence, including how VS players actually rated each idea. Where VS rated it mediocre, I say so.

**A. Structure: copy the cadence, not just the cards.**
- **VS split:** common stat drafts every level, and at most 3 rule cards per run.
- **Bastion now:** a card every wave break (about 19 picks).
- **Proposal:** keep commons each wave and add an Arcana tier at fixed milestones. For example, after boss waves or at waves 5, 10 and 15, offer "choose 1 of 4, free look-through reroll, skippable", capped at 3.
- **Optional:** a run-start pick from unlocked rare cards.
- **Unlocks:** tie them to Hangar achievements per core, mirroring VS's "Lv50 with character X". That drives play across all 4 cores.
- **Hooks:** `completeWave` milestone check, plus the card UI.

**B. Listed-module rare cards (the VS "listed weapons" pattern).**
- Each rare card names 2–4 module families: Ember, Cryo, Rail, Flak and so on.
- Offers should be biased toward families you already own, the same way VS biases drafts toward owned items. That avoids the "most arcanas are useless" complaint.
- Telemetry (`telemetry.js`) can identify under-picked families. Aim rare cards at those, the way Heart of Fire rescued the Fire Wand.

**C. Status becomes a trigger (Out of Bounds / Crystal Cries). This is the strongest fit, because the statuses already exist.**
- Cryo card: chilled-to-frozen enemies shatter, and the shatter chills neighbours. Frozen kills inside a swarm chain through the formation.
- Ember card: a burning enemy that dies passes its burn to the nearest enemies.
- These use existing cold and fire VFX.
- **Hooks:** `killEnemy` (check status), `damageEnemy`.

**D. Repair becomes damage (Sarabande, S tier).**
- HP restored by Repair Array, and by the 30% wave-break repair, is released as a ring pulse around the repaired module, dealing the same amount as damage.
- It turns support placement into a positional weapon. Put the Repair Array where swarms hit, and it uses the existing ring VFX.
- **Hook:** `updateSupportModules`.

**E. Adjacency evolutions: VS evolutions rebuilt for the grid.**
- A recipe is a maxed module family plus a specific support module **edge-adjacent** to it, not merely owned. For example, Rail + Cryo neighbour.
- Payout happens at the next boss-wave break (the VS chest moment), and the module upgrades in place.
- Grid placement then carries the recipe's meaning. Fix VS's signposting flaw: show the recipe in the Build inspector and highlight valid neighbours.
- This may be a separate system from cards. A rare card could unlock a recipe instead.
- **Hooks:** `completeWave`, `validPlacement`, `resolveWeaponDefinition`.

**F. Fusion (Unions): space is the currency.**
- Two adjacent maxed modules of a listed pair fuse into a single-tile module and free a grid cell.
- With detachment (cut-off modules are lost), a smaller hull is also more robust, which VS cannot express.
- **Hooks:** `placePurchasedModule`, `detachTile`.

**G. The restraint card (Silent Old Sanctuary).**
- Each grid cell left empty below a cap (or each weapon module under N) gives weapons +X% damage and a shorter cooldown. The card also grants free rerolls.
- It rewards lean ships and banking Matter. It conflicts with the Build loop, which is the point, because it creates a real decision.
- **Hooks:** `weaponCooldownRate` and the damage multiplier in `updateWeapons`.

**H. Movement-tied cooldown (Tragic Princess). Be careful.**
- VS rates it B, and it resembles the rejected Drift Gunnery.
- If used at all, make it a listed card: short-range Flak and Scatter recharge faster while thrusting.
- Thrust versus coast is a real choice in Bastion, unlike VS, so the idea is stronger here than in its source.
- **Hook:** `weaponCooldownRate` combined with thrust state.

**I. Incoming damage as fuel (Crimson Shroud and Heart of Fire's "you explode when hit").**
- A Bulkhead-family rare card: the first hit on each module in a short window is capped. The capped amount is vented as a blast from that tile, with limited charges and a recharge.
- VS evidence favours a charges-and-cap design over unconditional thorns.
- **Hook:** `applyDamageToTile`.

**J. Percentage boss answer (Infinite Corridor).**
- An epic support evolution or card that periodically halves the current HP of everything on screen, with a long cooldown.
- It stays relevant against the +8% HP per wave scaling and the 3 bosses.

**K. Rule-break card (Game Killer).**
- Kills no longer drop Matter. Instead, Matter you collect fires as homing shrapnel. The wave-break reward changes to free module copies.
- It deletes the shop loop and replaces it with another one. Offer it rarely and only early, since mid-run it freezes the build, which is VS's own warning.

**L. Pool control lessons.**
- Bastion charges Matter per reroll. VS shows players also want banish and skip, and between-run seal once the card pool grows.
- Consider Hangar-licensed banish charges.

**Avoid, based on VS evidence:**
- Random stat oscillation the player cannot control.
- Cards that only pay off after investing in a penalty (Curse-scaling).
- Twins or copies that cannot follow the main upgrade path.
- A "poisoned last level" that a banish trivially dodges.
- Recipes hidden behind wiki knowledge.
