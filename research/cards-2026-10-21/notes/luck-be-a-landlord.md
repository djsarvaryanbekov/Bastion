# Luck be a Landlord (TrampolineTales, 1.0 on 6 Jan 2023): items, essences and adjacency study

- Date researched: 2026-10-22
- Version seen: the latest Steam patch is **v1.2.24 (8 Jan 2025)**. No gameplay patch has been posted since; the most recent news post is from Nov 2025. Names, rarities and base values come from an installed-game catalog snapshot (168 symbol ids, 114 item ids, 113 essence ids), published in a 2026 GitHub project. Its effect text is the project's own approximation and has not been verified in-game, so I cross-checked numbers against the official patch notes wherever they exist.
- Catalog: `catalog/luck-be-a-landlord.csv`, 411 rows:
  - 113 items (50 Common, 30 Uncommon, 23 Rare, 10 Very Rare), plus 1 legacy item (Instant Ramen)
  - 114 essence rows (113 current plus legacy Instant Ramen Essence)
  - 161 symbol rows (every catalog id; the dice-face states are merged into one row)
  - 12 rent milestones and 11 mechanic rows (tokens, skip, toggling, item draft, item copies, floors, boss, endless)
- Labels: [C] sourced, [P] player opinion (linked), [I] my inference.

## Sources

- Installed-game catalog snapshot (ids, rarity, base value, tags, approximate rules):
  - https://github.com/andy35p/luck-be-a-landlord-ai/blob/main/luck_agent/data/items.json
  - https://github.com/andy35p/luck-be-a-landlord-ai/blob/main/luck_agent/data/essences.json
  - https://github.com/andy35p/luck-be-a-landlord-ai/blob/main/luck_agent/data/symbols.json
- Official Steam patch notes. All 300 posts from Apr 2021 to Nov 2025 came through the Steam News API (https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=1404850). These were the key ones:
  - Content Patch #6, symbols/items and reworks: https://store.steampowered.com/news/app/1404850/view/4074045244008061305
  - #7: https://store.steampowered.com/news/app/1404850/view/5019805792165272755
  - #8: https://store.steampowered.com/news/app/1404850/view/4032392655068006944
  - #9, Essences: https://store.steampowered.com/news/app/1404850/view/4204657340169653431
  - #9 Hotfix #13, the essence rebalance and dev statement: https://store.steampowered.com/news/app/1404850/view/4038024692281499453
  - #10, balance: https://store.steampowered.com/news/app/1404850/view/4516534149059594363
  - #11: https://store.steampowered.com/news/app/1404850/view/4020014099092449336
  - #12: https://store.steampowered.com/news/app/1404850/view/4698935641759430252
  - #14, Spring Cleaning: https://store.steampowered.com/news/app/1404850/view/4348797798079577843
  - #15, item odds after rent 6: https://store.steampowered.com/news/app/1404850/view/4937651144689889778
  - #17: https://store.steampowered.com/news/app/1404850/view/6402455182508789839
  - #18, Landlord Boss Fight: https://store.steampowered.com/news/app/1404850/view/6368680725425400742
  - Full Release: https://store.steampowered.com/news/app/1404850/view/5035620387691815867
  - Big Buffs Preview (design rationale): https://store.steampowered.com/news/app/1404850/view/5839532486211744114
  - Big Buffs Update: https://store.steampowered.com/news/app/1404850/view/5127964289177128512
- Early-Access guides, used for symbol behaviour and the EA rent table:
  - GamePretty tier list (Mar 2021): https://gamepretty.com/luck-be-a-landlord-tier-list-early-access/
  - GamePretty symbol and item guide (Feb 2021): https://gamepretty.com/luck-be-a-landlord-symbol-item-guide/
- Steam guides:
  - Value per spin: https://steamcommunity.com/sharedfiles/filedetails/?id=2478205369
  - General Tips: https://steamcommunity.com/sharedfiles/filedetails/?id=2927406144
  - Tierlists (images only): https://steamcommunity.com/sharedfiles/filedetails/?id=2927434044
- Steam threads:
  - Item disabling: https://steamcommunity.com/app/1404850/discussions/0/4309452818498805691/
  - "Most broken build" (Clear Sky and Sun): https://steamcommunity.com/app/1404850/discussions/0/693122745159956658/
- Steam reviews: 100 positive and 33 negative English reviews via the appreviews endpoint. Individual reviews are linked below as steamcommunity.com/profiles/<id>/recommended/1404850/.
- Release history: https://en.wikipedia.org/wiki/Luck_Be_a_Landlord
- Gaps:
  - Both wikis were unreachable: luckbealandlord.wiki.gg returned 401, the Fandom wiki returned 402, and its BreezeWiki/antifandom mirrors were behind a bot check or returned empty pages.
  - Gamezebo and Twinfinite returned 403. The Moegirl (Chinese) page rendered empty.
  - As a result, **about 60 of the 113 essences have no sourced effect.** Their CSV rows say "not retrieved", and the rest come only from patch-note deltas.
  - The base effects of Copycat, Popsicle and Mobius Strip were not retrieved. Eldritch Creature and Pirate text is also missing.
  - The current rent table has only two confirmed values (Rent 7 = 350, Rent 8 = 425, from a wiki search snippet), so the CSV uses the 2021 EA table.
  - The full Floor 7-20 modifier list was not retrieved.
  - Reddit is blocked, so no Reddit sentiment is included.

## System structure

- **Board** [C]: The slot machine is 5 columns by 4 rows, so 20 symbols show per spin. The symbol inventory can grow past 20, and each spin draws which 20 appear. Any shortfall is filled by Empty. Sources: https://steamcommunity.com/profiles/76561197972300836/recommended/1404850/ and https://steamcommunity.com/sharedfiles/filedetails/?id=2927406144.
  - Adjacency effects key off neighbours. [I] I believe this includes diagonals (8 neighbours), but I could not verify it here.
- **Draft cadence** [C]:
  - After every spin you pick 1 of 3 symbols or skip.
  - After rent payments you pick an item (Bag of Holding adds choices; Comfy Pillow forces a Rare).
  - Uncommon, Rare and Very Rare item odds rise by about 5, 2 and 1 percentage points after the 6th rent payment (CP15).
  - Items stack once a rarity pool is exhausted (CP14), and destroyed items can return to the pool (CP10).
- **Rent cadence** [C]:
  - Twelve escalating payments, with spins per payment growing from 5 to 10. The EA table is 25, 50, 100, 150, 225, 275, 325, 375, 500, 550, 650, 777 coins.
  - Current values differ slightly: Rent 7 = 350 and Rent 8 = 425 on Floor 1, per a wiki snippet.
  - A guide estimates the needed income at about 7 coins per spin at payment 1, rising to about 78 per spin at payment 12.
- **Floors** [C]: Twenty ascension-style floors.
  - Floor 2 adds +25 to Rent 7, Floor 3 adds +25 to Rent 8, Floor 4 gives 1 fewer Removal Token per landlord e-mail, Floor 5 adds a starting Dud, and Floor 6 adds +25 to Rent 10.
  - Higher floors add up to 3 starting Duds (BB notes). Duds self-destruct after 33 spins (CP9).
  - The landlord boss fight unlocks after a Floor 10 win or 10 total wins (CP18). Every coin source damages him (1.0), and he adds "fine print" rule changes during the fight.
- **Token economy** [C]: There are three currencies.
  - **Removal Tokens** permanently thin the inventory.
  - **Reroll Tokens** reroll the symbol draft.
  - **Essence Tokens** are taken by the landlord at the next rent, and each becomes one Essence pick.
  - Sources: landlord e-mails, capsule symbols, and items (Cardboard Box, Sunglasses, Dishwasher, Recycling). Skipping is a free fourth option, and Pink Pepper pays for it.
- **Item toggling** [C]: Most items can be switched off and on. Players use this as a timing tool, for example holding Lockpick until chests are worth popping, letting Zaroff kill Billionaires before Guillotine does, or timing Telescope and Protractor. Popsicle and Frozen Pizza Essence cannot be toggled. Sources: https://steamcommunity.com/app/1404850/discussions/0/4309452818498805691/ and CP12.
- **Essences** [C]: Each of 113 items has an Essence twin.
  - Essences have no rarity and an equal chance to appear.
  - They are outside the normal item pool, have a *different* effect from the base item, and unlock after a Floor 6 win or 7 total wins.
  - The sourced ones follow three templates:
    - **Timed**: Bowling Ball Essence gives 3 coins per spin for 20 spins; Pool Ball Essence gives 1 per spin for 60.
    - **Break-condition then payoff**: Copycat Essence triggers at 5 adjacent Cats and turns Cats into Wildcards at 1.5x; Nori Essence triggers at 4+ Rabbits and Fluff for a permanent 1.5x.
    - **One-shot tokens or coins on destruction**: the Symbol Bomb Essences give 1, 2 or 4 Removal Tokens.
  - Popsicle Essence makes other Essences need two destructions (CP9H4).
- **Adjacency families** [C] (see the CSV for every symbol):
  - **Eaters** destroy a neighbour for coins: Cat/Milk 9, Mouse/Cheese 20, Bear/Honey 40, Dame/Martini 40, Dwarf/Booze 10x value, Monkey/fruit 6x, Goldfish/Bubble 15, Toddler/Candy 6.
  - **Permanent scalers** destroy a neighbour and grow +1 forever: Mrs. Fruit, Geologist, Diver (removal, not destruction), Amethyst/Pear (grow when multiplied), Dove (grows when it prevents a destruction).
  - **Multipliers**: Sun x5 Flowers, Rain/Bee x2, Witch, Chef, Farmer, Beastmaster, Joker, Dame x2, Moon x3, Comedian x3.
  - **Breakers and chests**: Key, Lockpick, Magic Key x3, Miner 20 per Ore. Lockbox 15, Safe 30, Treasure Chest 50, Mega Chest 100.
  - **Lines and positions**: Bronze/Silver/Golden Arrow x2/x3/x4 in a random direction (Quiver gives two directions); Anchor +4 in corners; Lefty x2 in the leftmost column; Tortoise and Hare pays 77 if the Turtle is in the right column and the Rabbit in the left.
  - **Global-adjacency items**: Protractor (every 3rd spin, corners neighbour everything), Telescope (every 3rd spin, everything neighbours everything), Clear Sky (Suns and Moons neighbour everything).
  - **Duplicate/diversity conditions**: Green Pepper (3+ of one symbol), Cyan Pepper (no symbol 3+ times), Red Pepper (all symbols unique), Rusty Gear and Purple Pepper (connected groups of 3+), Ancient Lizard Blade (9 minus duplicated types).
  - **Risk symbols**: seven Hexes, each 3 base with a 30% bad effect; Holy Water neuters them.

## What players love

- [P] The depth of interplay with a simple interface: https://steamcommunity.com/profiles/76561198009249495/recommended/1404850/. Also "Drafting is the whole game", with a high skill ceiling: https://steamcommunity.com/profiles/76561198001073779/recommended/1404850/
- [P] Absurd, readable interaction stories ("19 suns, 1 flower"; ghosts turning into a madman who kills your dwarves): https://steamcommunity.com/profiles/76561198059257792/recommended/1404850/ and https://steamcommunity.com/profiles/76561198410890659/recommended/1404850/
- [P] Flexibility is rewarded, and you can win the top floor "by keeping your options open": https://steamcommunity.com/profiles/76561198066395574/recommended/1404850/. The same idea appears in the Steam tips guide ("don't force a build", "raise the floor"): https://steamcommunity.com/sharedfiles/filedetails/?id=2927406144
- [P] More control than other slot roguelikes, because you choose what goes on the reels: https://steamcommunity.com/profiles/76561198136557835/recommended/1404850/
- [P] Endless-mode exponential builds are celebrated rather than resented. Clear Sky + Suns + one Flower is treated as a classic: https://steamcommunity.com/app/1404850/discussions/0/693122745159956658/
- [P] The item toggle as a skill expression: https://steamcommunity.com/app/1404850/discussions/0/4309452818498805691/

## What players hate

- [P] **Symbol bloat.** Content additions dilute drafts until runs fail on the 25-coin first payment: https://steamcommunity.com/profiles/76561198262564644/recommended/1404850/
- [P] **Low agency.** Some reviewers find it too random or too passive ("upgrades don't seem to matter much"): https://steamcommunity.com/profiles/76561198358088059/recommended/1404850/ and https://steamcommunity.com/profiles/76561197989215641/recommended/1404850/
- [P] **Information UI.** Drafts don't show what you already own, and tooltips are hard to parse: https://steamcommunity.com/profiles/76561198030193439/recommended/1404850/
- [P] **Few late scalers and limited removal**, so weak early picks become permanent dead weight: https://steamcommunity.com/profiles/76561198276015276/recommended/1404850/. A related complaint is that ore and fruit builds hinge on one key symbol: https://steamcommunity.com/profiles/76561198145252707/recommended/1404850/
- [P] **Grindy or pure-RNG achievements** (777 wins; hundreds of resets): https://steamcommunity.com/profiles/76561198116449007/recommended/1404850/
- [P] **No meta-progression or unlocks**, which some reviewers read as thin content: https://steamcommunity.com/profiles/76561198061939200/recommended/1404850/

## Dev changes

- [C] **Essence launch, then a fast nerf.** CP9 added 107 essences. Five days later Hotfix #13 cut many of them, and the dev stated that essences should be "build-defining" but not "build-winning". Breaking Endless is fine, but carrying a run to Endless by rent 4 was not intended. CP10 then put spin timers on Booster Pack, Golden Carrot and Lucky Carrot Essence, and shortened the Telescope and Protractor Essence lifespans to 3 and 4 spins.
- [C] **Big Buffs (v1.1, Aug 2023): raise the win rate without lowering fun.** The dev's stated method:
  - +1 coin on symbols only worth taking with a partner (Dog, Card Shark).
  - Give archetypes "backup plans". Flush became an eject button for a failed Suits run. Black/Red Suits became build enablers you can destroy after 7 spins for two Suits.
  - He explicitly rejected starting the run with a buff item, because it would cause tunnel vision.
- [C] **Rework or remove dead content:**
  - Oil Can was "the least popular Rare" because re-spins slowed play for little value. 1.0 changed it to once every 5 spins with re-spun symbols paying 2x.
  - Plum was removed for being identical to Peach.
  - Goldilocks went from a near-impossible trigger to "destroy: add 3 Bears".
  - Devil's Deal went from 66 Empties to 6 Duds once the boss fight made skipping rent 11 no longer a win.
- [C] **Expectation alignment:**
  - Witch and Beastmaster now buff Eldritch Creature, and Time Machine now affects Golem and Frozen Fossil, because players assumed those interactions already existed.
  - Kyle the Kernite now affects Big Ore because the art looks alike.
  - Oyster now adds a Pearl when removed, so the Diver's removal keyword works with it.
- [C] **Pace and pressure tuning:**
  - Duds now self-destruct after 33 spins, so endless-only players try higher floors.
  - Protractor and Telescope went from every 4 to every 3 spins.
  - Credit Card went from every 10 to every 7 spins, after the dev observed that the slowdown was minimal.
  - Item odds rise after rent 6.

## Standout designs and why

1. **Telescope and Protractor: periodic global adjacency.** [C] Every 3rd spin, the adjacency rules themselves change for the whole board, so local combos briefly go global. [I] This is a card that changes how you build, not by how much. You start valuing multipliers (Sun, Witch, Dame) over raw coin symbols. The fixed cadence also makes the payoff spin readable.
2. **Permanent scalers that eat their neighbours** (Mrs. Fruit, Geologist, Diver, Pirate). [C] They convert board clutter into permanent value. [I] This turns the main downside of drafting (dead symbols) into a resource and creates "feed the engine" placement decisions.
3. **Clear Sky.** [C] One rule change (Suns neighbour everything) on top of an existing x5 multiplier gives exponential, run-defining output. [P] Players love it in Endless. [I] It is a clean template for a very-rare card that removes a constraint from one family.
4. **Essences as break-condition cards.** [C] A temporary or conditional twin of each item that destroys itself on a condition for a big one-time or permanent payoff. [I] Doubling the item roster by flipping the trigger model is cheap content with a distinct feel. The dev's rapid nerfs show the risk: unconditional early payoffs became auto-wins.
5. **Emergency or timing items** (Coffee, Devil's Deal, Piggy Bank, Swear Jar, Comfy Pillow). [C] They act on the rent clock itself. [I] They let a player trade future safety for present survival, a decision class most stat cards never touch.
6. **Duplicate versus diversity conditions** (Green and Cyan Pepper, Rusty Gear, Ancient Lizard Blade, Red Pepper). [C] These are opposed incentives on the same board. [I] Cheap to implement, and each one pushes a whole drafting philosophy.
7. **Toggleable items.** [C][P] An off switch turns passive relics into timing tools. Players report nuanced uses: holding the Lockpick, double-dipping Billionaires, and timing essences.

## Ideas worth transforming for Bastion

1. **"Telescope" becomes Phase Lattice (Epic).** [I] Every 12 s, for 3 s, every module counts as adjacent to every other module. During that window Ember ignites every Cannon, Scatter and Flak; the Reactor buff and Bulkhead protection apply ship-wide; and Cryo+Rail Shatter can link anywhere.
   - Fits pillars 2 and 3: a telegraphed pulse ring makes the window something you *fly for*, such as diving into a swarm just before it fires.
   - Rare variant, **Corner Relay** (the Protractor analogue): only the four outermost modules (the extreme cells by grid bounds) link to everything. This rewards building wide and protecting the tips.
2. **"Clear Sky" becomes Beacon Doctrine (Epic).** [I] Reactors no longer boost their 3x3. Instead, each Reactor gives a smaller boost to *every* module of one chosen family anywhere on the grid.
   - Removes the locality constraint for one family. A destroyed far-flung module no longer breaks the combo, but losing a Reactor hurts everything.
   - Lesson from LBAL: cap the stacking. Make the boost additive per Reactor, never multiplicative, or you recreate the trillion-coin sunflower.
3. **"Mrs. Fruit/Geologist" becomes Salvage Maw (Rare module card).** [I] When an adjacent module is destroyed or detached, the Maw absorbs the wreck and permanently gains +X% fire rate (or HP).
   - Turns pillar 1's punishment into a growth path and creates a placement puzzle: put cheap armor next to the Maw as feed.
   - Pair with **Wreckage Ledger** (the Void Portal/Shrine analogue): +1% ship damage for every 8 modules lost this run.
4. **"Arrows + Quiver" becomes Bow Line (Rare).** [I] Modules in the grid row or column best aligned with your current velocity vector get x2 fire rate. The Epic upgrade adds the reverse direction too (the Quiver analogue).
   - Converts LBAL's random arrow into a drift-skill check: you choose the line by how you fly.
5. **"Dove" becomes Aegis Node.** [I] Adjacent modules cannot be destroyed, so they never detach while the Node lives; they take damage to their HP floor instead. The Node permanently gains armor each time it prevents a loss. It is a natural competitor to Bulkhead.
6. **Essences become Break-glass cards.** [I] These cards occupy a card slot and trigger once on a condition, then vanish:
   - **Ejection Charge**: below 30% core HP, detach the outer ring as a shrapnel nova.
   - **Overclock Debt**: the next boss wave fires at x2, then two modules are disabled for a wave.
   - **Spare Hull**: the next destroyed module is not detached.
   - Lessons from the LBAL nerfs: give each one a real condition or delay, never an immediate unconditional payoff, and keep them out of the normal rarity pool so they feel like a separate class.
7. **Duplicate versus diversity cards.** [I]
   - **Battery Line**: any connected group of 3+ identical weapons fires as a synchronized volley for +50% damage (the Rusty Gear analogue on Bastion's real adjacency graph).
   - **Mixed Arsenal**: +4% damage per distinct module type, minus 4% per duplicate type (Ancient Lizard Blade).
   - Offering both pushes opposite grid philosophies.
8. **"Rent clock" cards that act on the wave timer.** [I] (Coffee, Devil's Deal, Comfy Pillow.)
   - **Early Launch**: skip the remaining break and the next card pick becomes Epic-only.
   - **Hazard Pay**: survive a wave without taking hull damage to bank a second card pick.
   - These tie pressure and positioning to the card economy.
9. **Jettison as a resource.** [I] (Removal Tokens plus Gray Pepper.) A Rare card that lets you voluntarily eject a chosen module as a proximity mine. Its detach no longer cascades, and you gain a small refund. Removal becomes an active, positional fighting tool.
10. **Toggle rule.** [I] Let players disable any owned rare or epic card during the wave break. It is a cheap feature and it turns several conditional cards (Break-glass, Ledger) into timing decisions.

Lessons to avoid:

- **Pool bloat.** [P] A growing card pool diluted LBAL's drafts. Keep the per-break 1-of-3 pool filtered by what the player owns, or weight it toward their families.
- **Single-point enablers.** [P] When one symbol makes or breaks a build, offer backup plans the way the Big Buffs did (Flush as an eject button).
- **Exponential multiplier stacking.** [C][P] Clear Sky + Sun produced trillions.
- **Hidden information.** [P] Show owned modules and family counts on the card offer screen.
- **Pure-RNG triggers** like Black Cat's multiple-of-13. [I] They read as luck, not skill, and the pillar is positioning.
