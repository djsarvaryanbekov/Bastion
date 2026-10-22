# Slay the Spire (StS1) relics: research notes

Catalogue: `../catalog/slay-the-spire.csv` has all 193 relics from the wiki.gg Relics List: 4 starter, 36 common, 36 uncommon, 34 rare, 30 boss, 20 shop, 18 event, 2 special and 13 Endless-mode blights.

## Sources

Verified this session:
- slaythespire.wiki.gg is the current wiki. The Fandom wiki now returns HTTP 402, and the community moved to wiki.gg.
  - Relics_List: https://slaythespire.wiki.gg/wiki/Relics_List. This is the main source for names and effects.
  - Relic system page: https://slaythespire.wiki.gg/wiki/Relic. Source for drop odds, pool and floor restrictions, and starter swaps.
  - Per-relic pages with update history: Snecko_Eye, Busted_Crown, Velvet_Choker, Hovering_Kite, Lizard_Tail, Orrery, Ectoplasm, Pen_Nib.
- Official V2.0 "The Watcher" patch notes, 14 Jan 2020, mirrored on GOG DB: https://www.gogdb.org/product/1950754973/releasenotes
- Steam community threads. These are the only player-opinion source I could reach (see Gaps).
  - Energy and boss relics debate: https://steamcommunity.com/app/646570/discussions/0/1742232339939829970/
  - Most and least favourite relic: https://steamcommunity.com/app/646570/discussions/0/1710690018666815150
  - Worst relic, and Dead Branch you cannot refuse: search snippets from steamcommunity.com/app/646570 discussions 1696043263488602845, 1710690018667130706 and 1640913421075645135
- GDC 2019 talk by Anthony Giovannetti, "Slay the Spire: Metrics Driven Design and Balance." The GDC Vault page is gated. I used the preview at https://www.gamedeveloper.com/design/learn-i-slay-the-spire-i-s-metrics-driven-approach-to-game-balancing-at-gdc-2019 and third-party summaries, which are not transcripts.
- Think Like A Game Designer podcast with Giovannetti. I could only read the show notes: https://justingarydesign.substack.com/p/anthony-giovannetti-crafting-slay
- Slay the Spire 2 Ancients, from secondary coverage: https://www.pcgamesn.com/slay-the-spire-2/ancients and https://mobalytics.gg/slay-the-spire-2/guides/ancients

Gaps (honest):
- **Reddit r/slaythespire was unreachable.** WebFetch is blocked for reddit.com, and the search tool refuses that domain. The "love" and "hate" sections below therefore rely on Steam forums, which are older (mostly 2018–2019) and a smaller sample, plus wiki notes. They are not Reddit consensus.
- I did not read the GDC talk itself. MegaCrit's own reasoning for individual boss relic designs is mostly inferred from the patch history, not quoted.
- Patch history before V2.0 is only partial. It comes from per-relic wiki pages, and several of those fetches hit HTTP 429 rate limits.
- Effect wording in the CSV is my paraphrase of the wiki. Synergy partners come from general game knowledge plus the wiki. They are not exhaustive.
- I could not confirm which event gives Warped Tongs, so the CSV marks it as unverified.
- Slay the Spire 2, now in early access, replaced boss relics with "Ancients". I covered this only from secondary coverage. Its relic list is not catalogued.

## System structure

**Pools and rarity**
- Each run has separate pools for common, uncommon, rare, boss, shop and event relics.
- Each relic appears at most once per run. Once a relic has been obtained or seen, it leaves the pool.
- When every relic is gone, the game gives a filler relic called Circlet. It has no effect and only increments a counter.

**Drop sources**
- **Elites:** a random common, uncommon or rare relic, weighted roughly 50 / 33 / 17. The wiki lists these odds only as the general split for most sources, not as elite-specific numbers.
- **Chests by size:**

  | Chest | Common | Uncommon | Rare |
  |---|---|---|---|
  | Small | 75% | 25% | 0% |
  | Medium | 35% | 50% | 15% |
  | Large | 0% | 75% | 25% |

- **Merchant:** two relics drawn from the normal pools, plus one fixed slot that always holds a shop-only relic. There are 20 shop relics, 4 of them class-specific. V2.0 cut the shop relic base price from 200 to 150 gold.
- **Events:** event relics come only from specific events. They are often paired with a cost, for example Mark of the Bloom (you can never heal), Necronomicon (comes with a curse) and Golden Idol (the trap costs HP). Some are pure penalties, such as Gremlin Visage and N'loth's Hungry Face.
- **Campfire relics:** Girya, Shovel and Peace Pipe each add a new action at rest sites. At most 2 of the 3 can appear in one run.

**Pool hygiene: no dead offers**
- Relics whose value depends on time stop appearing late in the run:
  - Ectoplasm cannot appear from floor 18 on.
  - Tiny Chest stops before floor 36.
  - Matryoshka and Wing Boots stop before floor 41.
  - About 24 relics (Maw Bank, Ceramic Fish, Omamori, Girya and others) stop before floor 49.
  - Preserved Insect stops before floor 53.
- The Bottled relics are only offered if your deck has a card of the matching type.

**Boss relic choice**
- After the Act 1 and Act 2 bosses, a boss chest offers 3 boss relics. You take 1 or skip.
- Neow, the run-start event, can swap your starter relic for a random boss relic.
- Class-specific boss "upgrades" can appear in the 3 and replace the starter relic: Black Blood, Ring of the Serpent, Frozen Core and Holy Water.

**The boss pool has a few archetypes**
1. **"+1 energy, lose a subsystem."** Ten relics: Busted Crown, Coffee Dripper, Cursed Key, Ectoplasm, Fusion Hammer, Philosopher's Stone, Runic Dome, Sozu, Velvet Choker and Mark of Pain. Each one disables or taxes a different part of the game:
   - card rewards: Busted Crown
   - resting: Coffee Dripper
   - chests: Cursed Key
   - gold: Ectoplasm
   - upgrades: Fusion Hammer
   - enemy power: Philosopher's Stone
   - information: Runic Dome
   - potions: Sozu
   - tempo: Velvet Choker
   - deck clog: Mark of Pain
2. **Rule-changers without energy:** Snecko Eye, Runic Pyramid and Sacred Bark.
3. **Deck surgery:** Astrolabe, Empty Cage and Pandora's Box.
4. **Economy or loot:** Black Star, Calling Bell and Tiny House.
5. **Conditional energy:** Slaver's Collar, Hovering Kite and Violet Lotus.

**Counters and visual indicators**
- Relics with counters show a number on the icon:
  - action counters: Pen Nib, Nunchaku and Ink Bottle
  - turn counters: Happy Flower and Incense Burner
  - shuffle counter: Sundial
  - charges: Omamori, Matryoshka, Wing Boots and Neow's Lament
  - lifts used: Girya
  - cards played this turn: Velvet Choker
- Weekly Patch 47 fixed the counter number's position when a player holds many relics, which confirms the number is drawn on the icon.
- Counters such as Pen Nib, Nunchaku, Happy Flower and Incense Burner **persist across combats**. Players therefore plan around them; for example, they hold back so the 10th attack lands on the elite.
- When Pen Nib is armed, a buff icon appears on the player.
- Relics flash when they trigger. Busted Crown gained its flash in Weekly Patch 53.
- Since V2.0, relics that work once per combat or once per run grey out when spent. Examples: Lizard Tail, Centennial Puzzle and Fossilized Helix.

## What players love (evidence-weighted; see Gaps)

- **A drawback that becomes an engine.** Snecko Eye is repeatedly rated the strongest relic.
  - Its Confused effect randomises each drawn card's cost to 0–3, which averages 1.5. That makes expensive cards cheaper on average.
  - Players then deliberately draft expensive cards. The "drawback" changes what you want to take.
  - Players still note that it makes you think hard every turn.
- **Relics you build a deck around.** Players describe building a Shiv deck around one early relic and enjoying it. The 3-attacks-per-turn trio (Kunai, Shuriken, Ornamental Fan) and Dead Branch with Corruption are cited as build anchors.
- **Clean removal.** Empty Cage and Astrolabe count as valuable because "two free card removals goes a long way." A thinner, more reliable deck is a tangible improvement.
- **Energy relics whose drawback you can route around.** Sozu ("easily worked around") and Cursed Key ("drawback barely noticeable") are well liked. Players enjoy finding a pick whose cost does not apply to their plan.
- **Context-dependent boss choices.** The debate itself is the fun. The same relic, such as Pandora's Box, Snecko Eye, Black Star, Coffee Dripper or Velvet Choker, is called "potentially great or potentially awful" depending on the deck and act.

## What players hate

- **Relics that actively work against you.** The pre-V2.0 Hovering Kite forced 2 discards every turn. It was called the worst relic because it "actively works against you unlike every other relic," and MegaCrit reworked it in V2.0.
- **Hard caps that kill a build style.** Velvet Choker limits you to 6 cards per turn. It is named as a least-favourite relic: "often the correct pick" but hard to play around, and it ruins cheap-card decks.
- **Hidden information.** Runic Dome hides enemy intents and is called a "huge drawback." It removes the core skill of the game: reading the enemy's next move.
- **Unrefusable randomness.** Dead Branch was complained about when received from digging or events without a choice: it "takes all strategic thought out of the game." Runic Pyramid "hosed" a deck it did not fit.
- **Feel-bad filler.** Strawberry, Prayer Wheel, Dream Catcher and Tiny House were mocked as consolation prizes. A Steam poster said Tiny House is the kind of weak reward you get after barely winning a fight.
- **RNG gating of the key resource.** One thread's opening post argues that energy is too important to depend on whether an energy relic shows up and whether its drawback is crippling.
- **A drawback taken at the wrong time is a run-ender.** Ectoplasm, Fusion Hammer and Busted Crown after Act 1, and Pandora's Box on high Ascension ("a death sentence").

## Dev changes (what MegaCrit actually changed)

**V2.0, "The Watcher" (Jan 2020), was the big relic pass:**
- Several boss relics moved down a tier: Eternal Feather and White Beast Statue to uncommon, Lizard Tail to rare, and Orrery to shop.
- Meal Ticket and Toy Ornithopter moved from shop to common.
- The reading: **the boss slot was cleaned of generic value relics** so each boss pick is run-defining.
- Two new boss relics were added: Sacred Bark (doubles potions) and Slaver's Collar (energy only in elite and boss fights).
- Reworks:
  - Hovering Kite changed from forced discards to +1 energy on the first discard each turn. A punishment became a conditional reward.
  - Calling Bell and Tiny Chest were also reworked. I did not retrieve the exact wording.
- Number buffs to under-picked relics:
  - Black Blood heal went from 10 to 12.
  - Wrist Blade bonus went from 3 to 4.
  - Toolbox went from a random card to a choice of 3. Choice replaced randomness.
- Spent once-per-combat and once-per-run relics now grey out.

**Weekly patches (early access):**
- Snecko Eye was added in Weekly Patch 3 and Busted Crown in Weekly Patch 28.
- Orrery moved uncommon → (removed for a crash) → boss → shop.
- Counter display was fixed in Weekly Patch 47. Busted Crown's trigger flash came in Weekly Patch 53.

**Spawn restrictions**
- The floor gates listed above, such as Ectoplasm only before floor 18, show that MegaCrit prunes picks that would be dead or degenerate at a given point in the run, rather than nerfing them.

**GDC 2019 (summaries)**
- Balance was metrics-driven from early on.
- Every card and relic should have a distinct purpose.
- In a single-player game, rare overpowered combos are acceptable and even desirable.

**Slay the Spire 2 (2026, early access)**
- Boss relics as the act-transition power spike were replaced by "Ancients" at the start of each act. They offer a choice of blessings, and some carry significant trade-offs.
- MegaCrit kept the idea of a pick at act transitions that changes your plan, but moved it to the start of an act. The player picks knowing what is coming, rather than as a post-boss reward.

## Standout designs and why they work

| # | Relic | Pattern | Why it works |
|---|---|---|---|
| 1 | **Snecko Eye** | Variance tax that redirects drafting | It adds +2 draw and randomises costs. Its effect is to change *which cards you want*, not just your power. Players draft expensive cards to exploit it. The drawback fits a counter-strategy (Orange Pellets) and a build path. |
| 2 | **The "+1 energy, lose X" family** | Same reward, different cost | Every boss chest becomes a question about your run. Which subsystem can I give up: rest, gold, potions, upgrades, card choice, information? Comparable rewards make the costs the real decision. The well-liked ones (Sozu, Cursed Key) have costs players can plan around. The hated ones (Velvet Choker, Runic Dome) attack core skill or tempo. |
| 3 | **Pen Nib and Nunchaku** | Persistent action counter with a visible number | Every 10th attack. Because the count carries over between fights, players time the trigger for elites. A number on the icon plus an armed buff makes a hidden stat visible and gives the player something to plan. |
| 4 | **Kunai, Shuriken and Ornamental Fan** | Same trigger, three payoffs | Three attacks in one turn give +Dexterity, +Strength or +Block respectively. Three relics on one trigger create an emergent archetype (Shivs, cheap attacks) without a "set bonus" system. Picking up one makes the others more desirable. |
| 5 | **Runic Pyramid, Calipers, Ice Cream** | Persistence rule | Each removes an end-of-turn reset: the hand, block or energy carries over. A small rule change shifts strategy from "spend everything every turn" to banking. Pyramid's downside appears only when the deck lacks outlets, so it is build-dependent. |
| 6 | **Calling Bell with Du-Vu Doll, Darkstone Periapt and Blue Candle** | A negative item with its own payoff mini-ecosystem | Curses are normally pure cost. Three other relics turn them into Strength, max HP or a playable resource. A boss pick that hands you 3 relics plus a curse reads differently if you already hold Du-Vu Doll. |
| 7 | **Medical Kit, Blue Candle, Dead Branch** | Liability becomes resource | Unplayable junk becomes playable. Exhausting a card generates a new one. These relics flip the meaning of an existing negative (Wounds, curses, exhaust) instead of adding a new stat. |
| 8 | **Gold-Plated Cables and Frozen Core** | Position or empty-slot rule | The *rightmost* orb triggers twice. An *empty* orb slot at end of turn becomes Frost. Layout matters and empty space has value. These are the closest StS analogues to a spatial grid. |
| 9 | **Art of War and Pocketwatch** | Reward restraint | Playing no attacks gives energy. Playing 3 or fewer cards draws 3 extra. Doing less becomes a deliberate choice, and a "bad" turn becomes setup. |
| 10 | **Girya, Shovel, Peace Pipe** | New option in the between-fight phase | Each adds a new rest-site action that competes with Rest and Smith. They change the break phase, not combat stats. The 2-of-3-per-run cap stops the rest site becoming a menu dump. |
| 11 | **Black Star and Slaver's Collar** | Risk appetite | Elites drop 2 relics; energy only in elite and boss fights. These change *route choice*: you seek fights you would otherwise avoid. That is behaviour change outside combat. |
| 12 | **Stone Calendar, Horn Cleat, Captain's Wheel, Incense Burner** | Fight-clock relics | Big effects on turn 7, 2, 3, or every 6th turn. They add a timeline to each fight ("survive to turn 7"), which changes pacing decisions. |

**Supporting cast worth noting for swarms:**
- Gremlin Horn: each kill gives +energy and a card.
- Mercury Hourglass: damages all enemies every turn.
- The Specimen: a dead enemy's poison jumps to another enemy.
- Charon's Ashes and Tingsha: an action triggers damage to all or a random enemy.
- StS rates all of these by enemy count, which is directly relevant to Bastion's swarms.

## Ideas worth transforming for Bastion

These are adaptation notes, not final card designs. Each item names its StS source pattern, so it can be judged as evidence-grounded rather than invented. Where an idea overlaps a previously rejected card, I say so.

1. **Boss-wave "pick 1 of 3" with paired costs**, from the energy-plus-drawback family.
   - Offer it after boss waves. Use one shared reward so the cost is the real decision. That reward should be Bastion's equivalent of energy, something every build wants, such as +1 card choice per break or +X% global fire rate.
   - Each card then removes a *different subsystem*:
     - no 30% break repair (Coffee Dripper)
     - no Matter from kills, only from the wave bonus (Ectoplasm)
     - family upgrades locked (Fusion Hammer)
     - enemies +1 damage tier (Philosopher's Stone)
     - spawn-direction indicators hidden (Runic Dome)
     - card picks show 1 option (Busted Crown)
   - Lessons from StS:
     - Avoid hard caps on the player's main verb, the Velvet Choker equivalent (for example "only N weapons may fire").
     - Avoid hiding core information.
     - Time-gate drawbacks that turn deadly late, the way Ectoplasm is only offered before floor 18.
2. **Persistent counters drawn on the card icon**, from Pen Nib, Nunchaku and Incense Burner.
   - Example: every 10th Cannon volley is a double shot, and the count carries over between waves.
   - Show the number on the card, flash it on trigger, and grey it out when spent.
   - Cheap to build: no new art beyond a number overlay and existing ring or flash VFX.
3. **One trigger, several payoffs**, from Kunai, Shuriken and Fan.
   - Pick one Bastion-native trigger, such as "a module is destroyed or detached," "a frozen enemy shatters," or "3 kills within 1.5 s."
   - Ship 2–3 rare cards that pay off the same trigger differently: damage, repair or Matter.
   - The archetype emerges from overlap. No set-bonus system is needed.
4. **Persistence rules**, from Calipers, Ice Cream and Runic Pyramid.
   - Remove one reset in the wave loop. Candidate resets:
     - shield or armor overflow that does not decay during the break
     - unspent Matter earning a small interest per break
     - burn and chill that persist on enemies carried into the next wave
   - Each changes a "spend everything now" habit into banking.
5. **Liability into resource**, from Medical Kit, Blue Candle and Calling Bell.
   - Bastion's natural liability is the detached module. A card could make detached debris persist as a hazard, burning or cold if the module was Ember or Cryo, that swarm enemies take damage from.
   - Alternative: a curse-like "Ballast" tile that occupies a grid cell. One card gives 3 cards plus 2 Ballast tiles (Calling Bell). Another gives +X% per Ballast tile (Du-Vu Doll).
   - *Overlap note:* the earlier "Salvage Drones" and "Sacrificial Plating" were rejected. The distinguishing StS lesson is the **payoff ecosystem**: the liability needs 2–3 other cards that reward holding it, not a single standalone card.
6. **Position and empty-slot rules on the grid**, from Gold-Plated Cables and Frozen Core.
   - Examples: "the module farthest from the core fires twice," or "each empty grid cell edge-adjacent to the core projects a shield pulse."
   - These make layout a decision without new modules. They fit pillars 1 and 2 directly.
   - *Overlap note:* "Edge Battery" was rejected. If revisited, make it a single crisp positional rule like Cables, not a stat bonus.
7. **Rewarding restraint**, from Art of War and Pocketwatch.
   - In Bastion the "do less" verb is coasting, i.e. releasing thrust.
   - *Overlap note:* "Drift Gunnery" and "Momentum" were already rejected, so evidence for this pattern is weaker here. StS players do not single out Art of War or Pocketwatch as beloved. Treat it as low priority.
8. **A new break action instead of a stat**, from Girya, Shovel and Peace Pipe.
   - A card adds a new option to the break that competes with the 30% repair. Examples:
     - "Overhaul": skip repair to permanently raise one family's tier
     - "Salvage": skip repair to sell a module at full price
     - "Strip": remove a module and refund its slot
   - Cap how many break-action cards can appear per run, as StS caps campfire relics at 2 of 3.
9. **Risk-appetite cards**, from Black Star and Slaver's Collar.
   - Examples: "shielded bulwarks and elites drop a card pick when killed," or "+fire rate only while a boss or elite is alive."
   - These change *which targets you fly toward*, which plays into drift positioning.
10. **Swarm-scaling transfers**, from The Specimen and Gremlin Horn.
    - Examples: "when a burning enemy dies, its burn jumps to the nearest enemy," or "each kill shortens the next Ember burst cooldown."
    - Value scales with formation density. They reuse existing fire and cold VFX.
11. **Fight-clock cards**, from Stone Calendar and Incense Burner.
    - Examples: "45 s into a wave, release a nova," or "every 6th volley gives every module 1 s of invulnerability."
    - Bastion waves already have a timer, so a visible countdown on the card fits.
12. **Snecko-style variance tax**, from Snecko Eye.
    - Example: "Build prices randomise per item each break, 0.4×–1.6×. You get +1 card choice." On average it makes expensive late modules cheaper, which redirects purchases toward high-tier families.
    - This is one of the few drawbacks players *love*, because it steers the build rather than just weakening it.

**Design guardrails from the evidence:**
- Prefer choice over forced randomness. Toolbox changed from random to a choice of 3; Dead Branch drew complaints when it was unrefusable.
- A drawback must leave counterplay. The Hovering Kite rework is the clearest example.
- Keep the top tier, the boss pick, for run-defining cards. Demote generic value cards the way V2.0 did.
- Don't offer cards that are dead at the current wave.
- Show counters and spent states on the card itself.
