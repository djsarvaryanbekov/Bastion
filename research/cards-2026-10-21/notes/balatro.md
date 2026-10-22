# Balatro (LocalThunk / Playstack, 2024): joker system study

- Date researched: 2026-10-22
- Version seen: the live 1.0.1 line (balance patch 1.0.1f and later hotfixes), as documented on balatrowiki.org. Update 1.1 has been announced (at least 4 new jokers, a new voucher called "Lunker", a Blue Stake rework) but had no release date as of September 2026, so it is not covered here.
- Catalog: `catalog/balatro.csv` has 246 rows: 150 jokers (61 Common, 64 Uncommon, 20 Rare, 5 Legendary), 32 vouchers, 24 skip tags, 23 boss blinds, 5 showdown blinds, 5 booster pack types, 4 joker editions and 3 stake stickers.
- Labels used below: [C] backed by a source, [P] player opinion (linked), [I] my own inference.

## Sources

- Joker master table (names, rarity, cost, effects, unlocks): https://balatrowiki.org/w/Jokers
- Vouchers: https://balatrowiki.org/w/Vouchers
- Boss and Showdown blinds, ante structure: https://balatrowiki.org/w/Blinds_and_Antes
- Skip tags: https://balatrowiki.org/w/Tags
- Booster packs: https://balatrowiki.org/w/Booster_Packs
- Shop structure and rarity weights: https://balatrowiki.org/w/Shop
- Scoring order: https://balatrowiki.org/w/Scoring
- Editions and stickers: https://balatrowiki.org/w/Editions
- Blueprint mechanics and incompatibilities: https://balatrowiki.org/w/Blueprint
- Yorick history: https://balatrowiki.org/w/Yorick
- Swashbuckler history: https://balatrowiki.org/w/Swashbuckler
- 1.0.1 patch notes (press repost): https://tech.yahoo.com/general/articles/balatros-first-big-balance-patch-193732958.html
- 1.0.1 experimental difficulty changes: https://www.pcgamesn.com/balatro/patch-1-0-1-experimental
- LocalThunk's development timeline (AUTOMATON summary): https://automaton-media.com/articles/newsjp/localthunk-the-balatro-timeline-20250308-330836/
- LocalThunk on signposting (Game Developer): https://gamedeveloper.com/design/balatro-creator-unveils-a-few-slick-signposting-strategies
- LocalThunk, "Guidelines for Joker design" (Reddit, 24 May 2024), read through a mirror's search snippet: https://lr.sudovanilla.org/r/balatro/comments/1czo9g0/guidelines_for_joker_design
- Status of update 1.1: https://godisageek.com/2026/09/balatro-1-1-update-new-jokers-lunker/
- Steam threads (app 2379780):
  - Least favourite Boss Blind: https://steamcommunity.com/app/2379780/discussions/0/4346606879521850576
  - Face-down boss "just bad": https://steamcommunity.com/app/2379780/discussions/0/4201364759913051022
  - "Frustration Engine": https://steamcommunity.com/app/2379780/discussions/0/596266417888720065/?ctp=2
  - Spare Trousers and Blueprint debate: https://steamcommunity.com/app/2379780/discussions/0/600772377968682727
  - Jokers players skip: https://steamcommunity.com/app/2379780/discussions/0/596263586302527680
  - "Worst Joker?": https://steamcommunity.com/app/2379780/discussions/0/4348864563390769870
  - "Need a way to filter out jokers": https://steamcommunity.com/app/2379780/discussions/0/596264731321304966
  - "so many jokers are useless": https://steamcommunity.com/app/2379780/discussions/0/4346606879520222198
- Tier list: https://mobalytics.gg/blog/tier-lists/best-balatro-jokers/ (Blueprint and Brainstorm rated S+ for Gold Stake). I saw this only through search results, not a direct read.
- **Gaps:** I could not open the official 1.0.1 patch notes, which are posted in the Discord experimental channel, so the press repost is the only source for old and new values. Neither the notes nor the press quote any reason for a change ("because Fibonacci" is a joke). Reddit is blocked, and the mirror of LocalThunk's design-guidelines post returned 404, so its guidelines come from a search-result excerpt and may be incomplete. The TouchArcade interview returned 403. I did not fetch per-joker wiki pages except Blueprint, Yorick and Swashbuckler, so the catalog's synergy partners and downsides are my own analysis [I] built on the sourced effects. The Palette voucher's unlock condition is missing from the wiki page. I did not cover Tarot, Planet and Spectral cards, seals, enhancements, decks, stakes or challenges beyond what the jokers reference.

## System structure

- **Run shape** [C]: 8 antes, each with a Small, Big and Boss Blind. You must reach a chip target within limited hands and discards. Small and Big Blinds can be skipped for a Tag; the Boss cannot be skipped. Rewards are $3/$4/$5, and the ante-8 Showdown Boss pays $8. Score = Chips x Mult. ([Blinds](https://balatrowiki.org/w/Blinds_and_Antes))
- **Jokers** [C]: 5 slots by default, expanded by Negative edition, the Antimatter voucher, and so on. They trigger left to right, and the scoring order depends on position: additive Mult placed left of an XMult joker gets multiplied (the wiki's example gives 640 vs 480). So order is a real decision on every build. ([Scoring](https://balatrowiki.org/w/Scoring))
- **Rarity** [C]: shop joker odds are 70% Common, 25% Uncommon, 5% Rare. Legendary jokers come only from The Soul spectral card, a 0.3% chance per card in Arcana or Spectral packs. Sell value is half the buy price. ([Shop](https://balatrowiki.org/w/Shop), [Yorick](https://balatrowiki.org/w/Yorick))
- **Joker effect types** across the 150, from the wiki's type column: +Mult, +Chips, XMult, Economy, Retrigger, Effect (rule changes and generators). Scaling kinds I tagged in the CSV [I]: flat, conditional, self-scaling (permanent growth), self-scaling with reset, decaying (Ice Cream, Popcorn, Ramen, Turtle Bean, Seltzer), history-based (Supernova, Fortune Teller, Satellite), deck-composition (Steel, Stone, Erosion, Driver's License), random, copy (Blueprint, Brainstorm, Invisible), and rule-change.
- **Shop** [C]: 2 random card slots (Joker weight 20, Tarot 4, Planet 4), 2 booster packs, and 1 voucher at $10. Rerolls start at $5 and rise by $1 each. Rerolling refreshes only the cards; packs refresh per shop and the voucher per ante. The first shop always has a Buffoon (joker) pack. Interest pays $1 per $5 held up to a cap, which Seed Money and Money Tree raise to $10 and $20. ([Shop](https://balatrowiki.org/w/Shop), [Vouchers](https://balatrowiki.org/w/Vouchers), [Packs](https://balatrowiki.org/w/Booster_Packs))
- **Booster packs** [C]: Arcana, Celestial and Standard packs are each offered about 29% of the time, Buffoon about 8.7% and Spectral about 4.3%. Sizes are Normal, Jumbo and Mega ($4/$6/$8), e.g. pick 1 of 3, 1 of 5, or 2 of 5. Choosing from a pack is the "1 of N" moment, the same as Bastion's card pick.
- **Vouchers** [C]: 16 base vouchers, each with an upgrade unlocked by a lifetime or run achievement (e.g. reroll 100 times for Reroll Glut). They are permanent run-wide rule changes: slots, odds, hands and discards, boss rerolls, ante rollback.
- **Skip tags** [C]: 24 of them. Skipping a blind trades that blind's money and shop for a Tag (a free joker with an edition, a mega pack, money, a boss reroll). The Throwback joker and Speed Tag reward skipping.
- **Boss blinds** [C]: 23 regular and 5 Showdown. Most debuff a suit or face cards, restrict hand types (The Eye, The Mouth, The Psychic), deny information (The House, Wheel, Fish, Mark), or hit resources or money (The Water, Manacle, Tooth, Ox). Showdowns attack the joker row itself: Amber Acorn shuffles jokers, Crimson Heart disables one each hand, Verdant Leaf forces a sale. The boss is shown in advance, so you can plan around it. Counters: Luchador, Chicot, Director's Cut/Retcon, Boss Tag.
- **Editions and stickers** [C]: Foil +50 Chips, Holographic +10 Mult, Polychrome X1.5, and Negative (no slot used). Orange and Gold stakes add Eternal (cannot be sold or destroyed), Perishable (debuffed after 5 rounds) and Rental ($3 per round). ([Editions](https://balatrowiki.org/w/Editions))
- **Unlock layer** [C]: about 45 jokers start locked behind feats such as "win in 12 or fewer rounds" or "discard a Royal Flush". These feats double as tutorials for the joker's playstyle [I].

## What players love

- **Blueprint and Brainstorm sit at the top of every list.** "Blueprint is the best joker", and repositioning it "breaks the game" ([P] doingwork, [Steam](https://steamcommunity.com/app/2379780/discussions/0/600772377968682727)). Tier lists put both at S+ ([P] [Mobalytics](https://mobalytics.gg/blog/tier-lists/best-balatro-jokers/)). The appeal is that their value depends on what you place next to them [I].
- **Scaling jokers that become a run's identity**, e.g. Spare Trousers reaching +44 Mult ([P] Anzac-A1, same thread). Players do note that scalers must be bought early: they are trash late, or in endless ([P] doingwork and Twelvefield, same thread).
- **Defended niche jokers**: Burnt Joker described as "a better Space Joker", Vagabond yielding 2-3 Tarots per blind ([P] [Steam](https://steamcommunity.com/app/2379780/discussions/0/596263586302527680)). Players argue that "they all have their uses" and that weak jokers matter early ([P] bshock, [Steam](https://steamcommunity.com/app/2379780/discussions/0/4346606879520222198)).
- **Boss variety as a design feature**: some players defend bosses because they force varied scoring and say a cheap reroll is enough ([P] RazzberryMocha and CMDR Shven, [Steam](https://steamcommunity.com/app/2379780/discussions/0/596266417888720065/?ctp=2)).
- **Rule-breakers as revelations**: LocalThunk called Four Fingers in the demo a "huge teachable moment" that showed players how synergistic the game is ([C] [Game Developer](https://gamedeveloper.com/design/balatro-creator-unveils-a-few-slick-signposting-strategies)).

## What players hate

- **Bosses that do permanent damage.** The Arm is the most-named worst boss because lost hand levels "permanently set you back" ([P] Tenacity, [Steam](https://steamcommunity.com/app/2379780/discussions/0/4346606879521850576)).
- **Information denial.** Face-down draw bosses make outcomes feel like luck. One demo player wrote that the round was "so unfun and unfair" they uninstalled ([P] Soldancer, [Steam](https://steamcommunity.com/app/2379780/discussions/0/4201364759913051022)).
- **Late-run swings and too much RNG** ([P] "there's WAY too much RNG", [Steam](https://steamcommunity.com/app/2379780/discussions/0/596266417888720065/?ctp=2)).
- **Dead jokers dilute the pool.** Players have asked for a banish system ([P] Milkshake, [Steam](https://steamcommunity.com/app/2379780/discussions/0/596264731321304966)). Others reply that a ban system is "absolutely unnecessary" (RazzberryMocha, same thread).
- **Repeat "worst" picks**: Superposition, Seance, Showman, Loyalty Card, Credit Card, Golden Ticket and plain Joker ([P] [Steam](https://steamcommunity.com/app/2379780/discussions/0/4348864563390769870)). Obelisk is called "objectively the worst joker" because it punishes your best hand ([P] matija123123, [Steam](https://steamcommunity.com/app/2379780/discussions/0/596263586302527680)). Madness and the other joker-destroyers are avoided because they eat good jokers (same thread).
- **Blueprint alone does nothing** ([P] Brids17 and Twelvefield, [Steam](https://steamcommunity.com/app/2379780/discussions/0/600772377968682727)).

## Dev changes

- **Design method** [C]: LocalThunk avoided playing other roguelikes so he could reinvent the systems himself. He said he was relieved not to have played Slay the Spire earlier, because he would have copied it. Stakes were openly modelled on its Ascension mode. About 30 extra jokers came late, from a publisher miscommunication. ([AUTOMATON](https://automaton-media.com/articles/newsjp/localthunk-the-balatro-timeline-20250308-330836/))
- **Joker design guidelines** [C], from a search excerpt of LocalThunk's post:
  - Each joker has a visual theme tied to its name and effect.
  - At most one effect plus one optional condition.
  - Strong effects come with harsh conditions.
  - Only a few jokers should be truly wacky.
  - No joker should be the obvious pick every time.
  - Descriptions should run 3 lines or fewer.
  - Exceptions exist.
- **1.0.1 balance patch** [C] ([Yahoo repost](https://tech.yahoo.com/general/articles/balatros-first-big-balance-patch-193732958.html), [PCGamesN](https://www.pcgamesn.com/balatro/patch-1-0-1-experimental)):
  - Fast multiplicative scalers were nerfed: Campfire X0.5 to X0.25 per sale, Vampire X0.2 to X0.1, Steel Joker X0.25 to X0.2, Bloodstone from 1 in 3 for X2 to 1 in 2 for X1.5.
  - Weak scalers and conditional jokers were buffed: Hiker +4 to +5, Glass Joker X0.5 to X0.75, Lucky Cat X0.2 to X0.25, Hanging Chad from 1 to 2 retriggers, Smiley +4 to +5, Runner +10 to +15. Square Joker and Wee Joker lost their free starting chips.
  - Dead conditions were reworked: Mad and Clever Joker moved from Four of a Kind to Two Pair; Yorick changed from a one-time X5 after 23 discards to +X1 every 23; 8 Ball was reworked.
  - Position was removed from Swashbuckler: it used to count only jokers to its left and now counts all ([Swashbuckler](https://balatrowiki.org/w/Swashbuckler)).
  - Madness no longer triggers on Boss select. Ancient Joker's suit can no longer repeat. Vampire strips only scoring cards.
  - Rarity and price moves: Vagabond went to Rare $8, Stuntman to Rare, Sixth Sense and Seance down to Uncommon, Reserved Parking down to Common.
  - Tags now make their joker free. Investment Tag went from $15 to $25.
  - Early ante targets were lowered on White, Green and Purple stakes. Orange Stake's pack-price increase and Gold Stake's -1 hand were replaced by Perishable and Rental stickers.
  - Three showdown bosses were banned from some challenges: Crimson Heart, Verdant Leaf and Amber Acorn were removed from Jokerless.
- **Reading the patch** [I]: the notes give no reasons. The pattern points to these goals: slow down multiplicative snowballing, make "+X per event" scalers worth buying, replace binary or never-met conditions with incremental ones, and swap blunt difficulty penalties for joker-level constraints that create decisions (Perishable, Rental). Swashbuckler losing its left-only rule suggests position should only constrain a joker when position is its theme.

## Standout designs and why

- **Blueprint (copy right) and Brainstorm (copy leftmost)** [C]: the joker row becomes a spatial puzzle, and every new joker changes the value of the copiers. About 28-29 jokers are incompatible (passives, end-of-round effects, hand-size changes), and players have to learn that list [C] ([Blueprint](https://balatrowiki.org/w/Blueprint)). The Amber Acorn showdown exists to attack this kind of positional build [C]. [I] The strength of the design is that the copier is empty on its own, so the order puzzle is the whole point of the card. The cost is a hidden compatibility list.
- **Ceremonial Dagger** [C]: on each blind it eats the joker to its right and banks double that joker's sell value as permanent Mult. [I] One card combines position, sacrifice and scaling. It also pairs with generators like Riff-Raff to feed it.
- **Joker Stencil** [C]: X1 per empty slot, and it counts itself. [I] It inverts the "more is better" rule, so a minimal build becomes a real strategy.
- **Rule-breakers** [C]: Four Fingers, Shortcut, Smeared Joker, Pareidolia, Splash and Oops! All 6s. Each rewrites a predicate that other jokers check (what counts as a flush, a face card, a scoring card, a probability). [I] They are the cheapest way to change many existing interactions at once, because they change definitions rather than numbers. Pareidolia shows the risk: a boss that keys on the redefined category (The Plant) now hits everything.
- **Resource swaps** [C]: Burglar (+3 hands, no discards), Merry Andy, Troubadour, Stuntman, Hieroglyph. [I] The trade-off is written on the card, which follows LocalThunk's rule that strong effects need harsh conditions.
- **Self-scaling with a stated reset** [C]: Ride the Bus, Obelisk, Campfire, Hit the Road, Green Joker. [P] Obelisk shows the failure mode: a reset that punishes your best play feels hostile.
- **History scalers** [C]: Supernova, Fortune Teller, Satellite, Handy/Garbage/Speed Tags. They count from the start of the run, not from purchase. [I] That means they don't go dead when picked late, which answers the "take scalers early" complaint.
- **Sacrifice into growth** [C]: Madness, Glass Joker, Canio, Vampire and Campfire turn losses (destroyed jokers, broken cards, sold items) into permanent multipliers.
- **Boss counters as cards** [C]: Luchador (sell to cancel the boss), Chicot (no boss effects ever), Matador (paid when the boss triggers). [I] Matador is the most interesting: it turns the boss's rule into income instead of cancelling it.
- **Gros Michel to Cavendish** [C]: a fragile joker whose death unlocks a stronger version. [I] Loss itself becomes content.

## Ideas worth transforming for Bastion

These go through the Bastion pillars: (1) the module grid with detachment, (2) neighbour combos, (3) drift flight, (4) swarms and bosses, (5) 20 waves with 1-of-3 cards. All are [I] unless marked.

1. **Copy a grid neighbour ("Blueprint")**: a support-sized card-module that copies the behaviour (not the stats) of the module it faces, using module facing or a fixed "forward" side on the grid. Pillars 1 and 2: losing the source module in combat turns the copy off, so detachment adds risk. Keep the copyable list short and visible, and highlight compatible targets in Build. Balatro's hidden list of about 28 incompatible jokers [C] is the thing to avoid.
2. **Rule-breaker cards that rewrite adjacency predicates (Four Fingers, Smeared, Pareidolia, Splash)**. Examples:
   - "Ember ignites diagonally": the 3x3 counts instead of edge-only.
   - "Cryo counts as Rail for Shatter."
   - "Bulkheads also count as Reactors for boosting."
   - "Shatter applies to every chilled hit from any weapon."
   These hook into the existing adjacency checks rather than damage numbers. They change what a good layout is, and they need no new art. Watch for the Pareidolia/Plant trap: if a boss counters a family, a "counts as that family" card makes the whole ship vulnerable.
3. **Empty-cell payoff ("Joker Stencil")**: bonus damage or fire rate per empty grid cell inside the ship's bounding box, or per missing module up to a cap. This makes a compact, low-module "glass dart" build viable, and pairs with drift agility (pillar 3). It also gives a reason to sell modules.
4. **Eat-a-neighbour scaling ("Ceremonial Dagger")**: at the start of each wave, the card consumes the module on its marked side and banks part of that module's Matter price as permanent damage. Rising copy prices make the trade meaningful. Pillar 1 bonus: modules it eats can't detach later.
5. **Detachment fuel ("Glass Joker", "Canio", "Gros Michel to Cavendish")**: each module lost to detachment permanently adds a stack, e.g. to the core's own gun. The worst moment of the run then feeds a power curve. Cap it, or the best play becomes losing modules on purpose.
6. **History scalers instead of from-now-on scalers**, e.g. "+1% damage per enemy killed by burn this run", "per wave cleared without losing a module", or "per second spent coasting this run". Counting from wave 1 keeps a wave-15 pick useful, the lesson from Supernova and Fortune Teller [C] versus late-pick Spare Trousers [P]. Coasting stats tie to drift flight.
7. **Resource-swap cards with the cost on the card (Burglar, Merry Andy, Stuntman)**. Examples:
   - "+2 grid cells, -25% thrust."
   - "Weapons fire only while coasting, but double damage."
   - "No repair at the break; +1 card choice."
   One effect, one condition, three lines or fewer [C, LocalThunk]. Short text matters for 16-language localization.
8. **Last-stand and first-shot triggers (Dusk, Acrobat, Hanging Chad)**: "the last 10% of a wave's swarm takes double damage", or "the first weapon to fire each volley fires 3 times". These are cheap, readable timing hooks on the wave director and the weapon loop.
9. **Boss-interaction cards (Matador over Luchador)**: rather than cancelling a boss, pay off when you engage its rule. Examples: "gain Matter per Siege Ring gap you fly through", "Pursuer's charge leaves a burn trail that hurts enemies". This keeps bosses as build checks while rewarding mastery.
10. **Hoarded Matter as power (Bull, Bootstraps, To the Moon)**: a card that converts unspent Matter into shield or damage creates a real "buy modules now or bank" decision at each break.

**Lessons to avoid:**

- **No permanent or hidden punishment from bosses or enemies.** The Arm's level loss and face-down draws are the most-hated designs [P]. Bastion bosses should counter builds visibly and temporarily, and announce the counter before the fight, the way Balatro previews the boss [C].
- **Don't punish the player's best play** (the Obelisk complaint) [P]. Resets should trigger on mistakes, such as losing a module, not on doing the strong thing.
- **Dead cards in a 1-of-3 pick hurt more than in Balatro's shop.** Balatro players already ask for a banish [P]. With 20 picks, gate niche cards behind owning the relevant module families, or let reroll (Matter) or banish handle them.
- **Watch multiplicative self-scalers early.** The 1.0.1 patch pulled back exactly these: Campfire, Vampire, Steel and Bloodstone [C]. Prefer additive growth with caps over 20 waves.
- **Position should be the card's theme or nothing.** Swashbuckler lost its left-only rule in 1.0.1 [C]. Don't add adjacency restrictions to cards whose fantasy isn't about neighbours.
- **Most cards stay "normal"; a few are wild** [C, LocalThunk]. Plain stat cards can stay as commons to anchor the set, which matches the brief.
