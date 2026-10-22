# Hades (and Hades II): boons, duos, legendaries, hammers

Catalog: `../catalog/hades.csv` (257 rows: 18 system rules, 10 god themes, 28 duos, 10 legendaries plus 3 Hermes prerequisite boons, 32 tier-2 boons, 16 notable base boons, 24 Chaos parts, 78 hammer upgrades, and a 38-row Hades II Early Access snapshot).

## Sources

**Primary data (strongest evidence).** These are Hades I game scripts mirrored on GitHub. Prerequisites, numbers and offer logic were read directly from them.
- Requirements: `LootData.lua` (LinkedUpgrades `OneOf` / `OneFromEachSet`, PriorityUpgrades, hammer pool). https://github.com/crazytuzi/LuaFramework/blob/master/Hades/LootData.lua
- Values: `TraitData.lua` (rarity multipliers, duo and legendary numbers, Pom decay). https://github.com/crazytuzi/LuaFramework/blob/master/Hades/TraitData.lua
- Offer algorithm: `TraitScripts.lua` (`SetTraitsOnLoot`, `GetTotalLootChoices`), `RoomManager.lua` (`GetRarityChances`), `HeroData.lua` (base chances), `RunManager.lua` (`ReachedMaxGods`), `UpgradeChoice.lua` (prerequisite checks, exchange carry-over).
- English names and descriptions: SotSF/hades-codicil `help.en.json` and `god.json`. https://github.com/SotSF/hades-codicil
- **Version caveat:** the exact build of the mirror is not stated. It includes Blood Price content (all 28 duos, Huge Catch, Anvil-era hammers), so it is close to 1.0. A few numbers may differ from the final patch. Calculated Risk shows 50% here; some guides list another value.

**Official sources:** Supergiant's Blood Price patch notes (Patch 044, June 23 2020): https://www.supergiantgames.com/blog/hades-the-blood-price-update-patch-notes

**Interviews and press:** Kasavin on Early Access iteration, quoted via PC Gamer, inkl and GamesRadar summaries in search results (pages partly paywalled or blocked). RPG Site interview (2026): https://www.rpgsite.net/interview/20348-supergiant-games-interview-with-greg-kasavin-and-darren-korb-hades-ii-early-access-feedback-boss-themes-the-ending-coffee-and-the-future. Siliconera on Hades II patch 4: https://www.siliconera.com/hades-2-early-access-patch-4-adjusts-boons-blessings-daedalus-hammer-upgrades/

**Community:** Steam threads:
- God strength debate, Hades I: https://steamcommunity.com/app/1145360/discussions/2/1744518767206225215
- Pom value: https://steamcommunity.com/app/1145360/discussions/2/1745646405802810932
- Hades II duo and legendary requirement complaints: https://steamcommunity.com/app/1145350/discussions/2/4353373056338025006
- Hades II hammer rerolls: surfaced via search snippets; I could not fetch the thread itself.

**Guides:** Prima, GameSpot (Chaos), Keengamer (Hades II duo and legendary list, June 2024), Destructoid (Hades II elements), fextralife (boon index only).

**Gaps:**
- hades.fandom.com, hades.wiki.gg, Reddit and BreezeWiki all blocked automated fetches (402/401/403/Anubis). **I read no Reddit threads directly**, so community sentiment comes from Steam and guides.
- I found no primary Supergiant interview that explains *boon* design philosophy specifically. The dev-intent section below is assembled from patch notes and general iteration quotes.
- The Hades II rows are an Early Access snapshot from June 2024. Exact Hades II prerequisites and 1.0 changes (Warsong, 1.0 gods) were not verified.
- Hammer numbers were not extracted. The tooltips are templates, so I listed behaviour and exclusions only.
- The hammer-per-run cap exists in code (`RequiredMaxWeaponUpgrades` gate; mods raise it), but I did not confirm the exact value. Players commonly say about 2 per run.

## System structure

**How an offer is built** (from `SetTraitsOnLoot`):
1. A door shows the reward type and god icon in advance, so the player chooses which god's offer comes next. Each offer comes from one god and shows **3** options.
2. In a fresh god relationship, slots are filled first from *PriorityUpgrades*: that god's Attack, Special, Dash and Cast boons. This puts the god's status effect onto a core verb early.
3. **PriorityChance 0.5 boons** are linked tier-2 boons that each god's identity depends on: Static Discharge (Zeus), Hunter's Mark (Artemis), Blinding Flash (Athena), Razor Shoals (Poseidon). Once their prerequisite is met, each has a 50% chance to be pushed into the offer.
4. **Exchange:** after 2 cleared runs, each offer has a 10% chance (`ReplaceChance`) to show "swap another god's slot boon for mine". The old boon's Pom levels carry over.
5. The remaining slots roll rarity per slot: Legendary 12%, then Epic 5%, then Rare 10%, otherwise Common. Heroic appears only through bonuses. Hermes uses a separate table of 6/3/1%.
6. **Duo and Legendary boons share the Legendary roll.** Their only rarity level is "Legendary", so they can appear only when that 12% roll succeeds *and* their prerequisites are met. That is why they feel like jackpots. The 12% value comes from this mirror's `HeroData.lua`. Blood Price slightly reduced the duo chance, and I could not verify whether this mirror is from before or after that change. Treat 12% as an order of magnitude, not the final value.

**Rarity** changes numbers only, never behaviour. Tier-1 multipliers are Rare ×1.3–1.5, Epic ×1.8–2.0 and Heroic ×2.3–2.5. Pom of Power adds levels with decay: each level adds (1 + per-boon modifier) × 0.7^(level−1), floored at 10% of base. Mirror talents raise the rarity, duo and legendary chances. Chaos "Favor", Exclusive Access and Rare Crop also manipulate rarity.

**Prerequisites:**
- **Tier-2 boons** require one boon from a listed set (`OneOf`).
- **Duos** require one boon from each god's set (`OneFromEachSet`). Vengeful Mood needs a third set: any revenge boon.
- **Legendaries** need a tier-2 boon. Several use a "two of these three" rule: Fully Loaded, Winter Harvest, Huge Catch.
- Mutual exclusions (`RequiredFalseTraits`) keep incompatible transformations apart. Examples: Blizzard Shot vs Curse of Drowning vs Mirage Shot; Crystal Clarity vs Cold Embrace.

**Structural facts worth copying:**
- Hades I has exactly **one duo for each Olympian pair**: 8 gods, 28 pairs, 28 duos. Hermes is excluded. The Hades II Early Access build also had 28 duos for its 8 gods.
- Each run is capped at **4 Olympians** (`ReachedMaxGods`). This narrowing makes prerequisites reachable.
- Slot boons (Attack, Special, Cast, Dash, Call) are the prerequisite currency for almost every duo.

**Signposting:**
- Before the room: the door shows only the god.
- During the offer: duos get a lime "Duo" frame and a two-god icon, and the two gods' voices appear together. Legendaries are gold.
- Legendary and duo boons look unmistakably different in the menu, and the Codex/Boon Info screen lists requirements.
- Nothing shows "you are 1 boon away from duo X" during a run. Players track this themselves, and they complain about it.

**Theme per god** (status effect defined in `help.en.json`):

| God | Verb identity | Status |
|---|---|---|
| Zeus | chain lightning / bolts | **Jolted**: the foe's next attack zaps itself and nearby foes |
| Poseidon | knock-away, wall slams, resources | **Rupture** via Razor Shoals: damage while the foe moves |
| Athena | Deflect projectiles, damage resistance | **Exposed**: more damage from behind |
| Aphrodite | big hits, Weak, Charm | **Weak**: the foe deals less damage |
| Ares | delayed bursts, blade rifts | **Doom**: delayed burst of damage |
| Artemis | crits, seeking arrows | **Marked**: higher crit chance taken |
| Dionysus | damage over time, fog | **Hangover** (stacking DoT); **Festive Fog** (periodic stun) |
| Demeter | slow, stacks, execute | **Chill**: slow that stacks up to 10 |
| Hermes | speed, dodge, ammo | none; outside the slot system |

Mirror talent **Privileged Status** gives bonus damage against foes with 2+ statuses, which pays players for mixing gods.

**Daedalus Hammer:**
- A separate reward type: 3 weapon-specific options, no rarity, one-time.
- Each weapon has 12 options, plus aspect-only ones, for 78 in the catalog.
- Many hammers *rewrite a verb*: Flurry Jab, Spread Fire, Rocket Bomb, Kinetic Launcher, Twin Shot, Charged Shot. Exclusion lists keep the rewrites coherent.
- The Anvil of Fates trades one random hammer for two.

**Chaos:**
- Each offer pairs a random curse lasting a few encounters with a random permanent blessing that applies afterwards.
- There are 13 curses and 12 blessings.
- A "Defiance" blessing grants an extra Death Defiance for the run.

**Hades II differences:**
- **Infusion boons** count elements (Air/Water/Fire/Earth/Aether) across *all* gods' boons. This tags builds globally, not by pair.
- Statuses are reworked: Hitch, Blitz, Scorch, Freeze, Slip and others.
- Players report about 2 duos per run versus about 3 in Hades I. They also report stricter, harder-to-track requirements and legendaries that need 4+ boons from one god (Steam).

## What players love

- **Duos as surprise jackpots** that you can still plan toward. Guides describe the two-god conversation on the offer screen as the signal. Keepsakes and door choice let players steer, while RNG keeps the surprise.
- **Door preview equals agency.** You choose the next god before you fight for it (Prima, Shacknews door guides).
- **God identity:** reviews praise that each god's boons express that god's domain and personality.
- **Status interplay:** Steam players praise Sea Storm, which they say stacks several statuses at once, and Blizzard Shot.
- **Chaos as a value engine:** guides call it among the best value in the game because the blessings outscale normal boons, but only if you survive the curse.
- **Hammers that change how a weapon plays.** In the Hades II thread, hammers are listed among the praised systems. Some hammers change playstyle while others only add stats, and the playstyle ones are the memorable ones.
- **Variety over parity:** on Steam, players defend gods being unequal because different strengths make runs different.

## What players hate

- **Requirement bookkeeping.** In Hades II, duo prerequisites exclude different slots unpredictably, and players complain they must memorise them. Legendaries needing 4+ specific boons force players to skip stronger picks.
- **Flat-stat duos and legendaries feel dull.** Hades II players single out duos and legendaries that are only "+X% damage", and conditional effects that are weak against bosses. In Hades I, Sweet Nectar and some other duos are called weak.
- **Pom offers lose to new boons** because of diminishing returns. Players use Poms only to round out a build.
- **Hammers are too rare to fix a bad offer.** In Hades II players asked for hammer rerolls because one bad hammer late in a run ruins the build.
- **Athena** is seen as situational because her status needs two boons, and her effects are hard to notice. Poseidon's **resource boons** clog offers.
- **RNG droughts:** the same god keeps appearing, or a wanted duo never does.

## Dev intent (interviews / patch notes)

**Blood Price, Patch 044 (June 23 2020):**
- Added duos so that every Olympian pair has one.
- Then *slightly reduced the base duo chance "now that there are many more of them"*. Supergiant is keeping duos rare as their number grows.
- Fully Loaded and Winter Harvest got "adjusted requirements" from community feedback, so requirement tuning is treated as a live balance lever.
- Kiss of Styx is offered only when you are missing a Death Defiance, which shows a state-aware offer filter.
- Added the Pom Slice and the Anvil of Fates.

**Hades II patch 3 (2024):** duos and legendaries are offered more frequently, after players found them too scarce.

**Kasavin on iteration:**
- Content was iterated using the team's own goals, player feedback and gameplay data.
- not attached to individual ideas: the Hades II boon Smithy Sprint was simplified and its idea moved into a weapon aspect.
- Balance work on a thing stops once feedback on it dries up.
- He cited Dota 2 as a reference for ability and item-choice design.

**Inferred from data (my reading, not stated by devs):**
- PriorityUpgrades and PriorityChance exist to get each god's *status identity* into a build quickly.
- The 4-god cap and the shared legendary roll make duos rare but reachable.

## Standout designs and why

1. **Sea Storm (Zeus + Poseidon): knock-away triggers lightning.** One god's crowd-control verb becomes the other god's damage trigger. The rule is simple, the effect is visible, and it adds no new UI.
2. **Merciful End (Ares + Athena): Deflect detonates Doom instantly.** It turns a slow delayed-damage status into an on-demand detonator. The duo changes the *timing* of a mechanic, not its size.
3. **Curse of Longing (Ares + Aphrodite): Doom repeats while the foe is Weak.** Status A keeps status B alive, so a duo between two curses creates sustained, emergent damage.
4. **Static Discharge / Jolted (Zeus): the enemy's own attack hurts it and its neighbours.** Enemy behaviour becomes your damage, and it is strongest against crowds of attackers.
5. **Cold Embrace (Demeter + Aphrodite): the crystal beams at you.** It turns a turret into a weapon you aim with your position. Body movement becomes the skill, which suits a game where movement is the main input.
6. **Blizzard Shot (Demeter + Poseidon): a slow piercing orb that sheds shards.** The duo changes projectile *behaviour* (speed, pierce, spawning), not just damage. Exclusions keep it coherent.
7. **Lightning Rod (Zeus + Artemis): ammo on the floor becomes turrets.** Battlefield debris becomes an asset, and positioning gains a second layer.
8. **Vengeful Mood (Zeus + Ares + any Revenge): revenge fires on a 3 s timer.** It turns defensive "when hit" boons into offensive ones. A three-set prerequisite rewards a strange build.
9. **Smoldering Air (Zeus + Aphrodite): auto-charge capped at 25%.** The downside is built into the card and pushes a different playstyle (spamming the small Call) instead of being pure power.
10. **Winter Harvest (Demeter legendary): chilled foes at 10% life shatter and chill neighbours.** It executes in chains through crowds. Its "two of three tier-2 boons" prerequisite makes it an endpoint goal.
11. **Exclusive Access / Rare Crop: cards that change future offers.** Rarity becomes a strategic resource instead of pure luck. Rare Crop even takes power away now for more later.
12. **Chaos: curse now, permanent blessing after N encounters.** It is a deliberate risk-and-delay contract that the player times around upcoming dangers.
13. **Hammer verb rewrites** (Flurry Jab, Spread Fire, Rocket Bomb, Twin Shot), with exclusion lists. These are rare, one-time changes to how a weapon *operates*. They sit in a separate offer type, so they never compete with god boons.

## Ideas worth transforming for Bastion

These are derived from the Hades mechanics above, not invented from scratch. Each idea names its source.

1. **Module families as "gods".** Rare cards belong to a family: Ember, Cryo, Rail, Missile, Flak, Scatter, Cannon, Reactor, Bulkhead, Shield Node, Repair Array, and so on.
   - A card is offered only if you *own* a module of that family. This is the Hades "slot boon as prerequisite" rule, with an installed module standing in for the boon.
   - Use Hades' PriorityUpgrades logic: a family's first rare card should give its status (burn, chill, knockback, pull) a signature twist.
2. **Duo cards gated by adjacency, not just ownership.** Bastion's neighbour pillar is a stronger signal than Hades' "own two gods". A duo becomes offerable when its two families are edge-adjacent somewhere on the grid.
   - On the offer screen, show both family icons on a distinct duo frame and highlight the qualifying pair on the ship. This fixes Hades' "requirements are invisible" complaint.
   - Curate the list: Hades used one duo per pair. With 18 families that would be 153 pairs, so limit duos to the 6–8 status-bearing families (15–28 duos).
3. **Sea Storm → "knockback triggers element".** Flak or Scatter knockback calls an arc strike (Rail) or a burn splash (Ember) on the pushed enemy. It reuses the existing knockback status and the arc/fire VFX.
4. **Typhoon's Fury / Breaking Wave → collisions.** Enemies knocked into other enemies, or into a Bulkhead's 3×3, take slam damage or a blast. This works naturally with formation swarms.
5. **Static Discharge → "Jolted" ranged swarms.** Rail or arc hits make bolters, gunners and snipers zap themselves and their neighbours on their next shot. It directly counters Bastion's ranged formations.
6. **Cold Embrace → drift-steered beam.** A Cryo beam fires along the ship's facing, or from a dropped emitter toward the ship, so steering with A/D sweeps it. This adds skill to drift flight, Bastion's pillar 3, without an aim input.
7. **Lightning Rod → detached modules become hazards.** Modules destroyed or cut off by `detachTile` drift as temporary arc turrets or mines. Losing modules becomes a tactical event rather than pure loss.
8. **Blizzard Shot / Curse of Drowning / Mirage Shot → behaviour rewrites for Missile and Cannon, with exclusion groups.** Examples: a slow orb that sheds chill shards; pulses around the ship instead of a projectile; a second weaker volley. Keep them mutually exclusive, the way Hades does with `RequiredFalseTraits`.
9. **Daedalus Hammer → "Blueprint" offers at fixed breaks** (for example wave 5 and wave 12).
   - Its own offer type, 3 options, only for families you own.
   - It rewrites a family's firing verb: Rail chain shot, Scatter hold-flurry, Cannon rocket, Missile cluster.
   - One-time and no rarity, with exclusion lists. A reroll costs Matter, which answers the Hades II "hammer reroll" complaint.
10. **Winter Harvest → Cryo legendary with a "two of three" prerequisite.** Chilled enemies under about 10% HP shatter and chill their neighbours, chaining through swarms. It is a visible endpoint goal that needs two specific Cryo cards.
11. **Chaos → wave-break contract.** At a break, accept a curse for the next 2 waves, then get a permanent blessing. Curse examples: +30% swarm size, no Matter, −repair. This maps one-to-one onto Bastion's break rhythm and gives the player a timing decision ("take it before the boss wave or after?").
12. **Vengeful Mood → defensive modules gain a timer.** Bulkhead or Shield Node "when hit" pulses also fire every few seconds while a duo condition holds.
13. **Rare Crop / Exclusive Access → offer-manipulation cards.** Future rare offers come at least one tier higher, or you take a power cut now for a rarity climb every 3 waves. They pair well with the existing Matter reroll economy.
14. **Smoldering Air → built-in trade-offs.** Some rares should carry an explicit cost that changes play. Example: Reactor overdrive charges automatically but caps at 25%.

**Cautions for Bastion:**
- Hades boons hang off 5 player verbs. Bastion's weapons auto-fire, so the "slot" analogue must be a module family or grid position, not a button.
- Every Hades duo keeps its description to a single sentence. With 16-language localisation, aim for the same.
- Avoid flat "+X%" duos. Players explicitly call them dull.
- Hades keeps duos and legendaries rare (a 12% lane gated by prerequisites), and patch history shows the chance was tuned in both directions. Expose it as a tunable constant.
