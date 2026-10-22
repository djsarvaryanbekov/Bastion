# Brotato — item system study (for Bastion run cards)

Researched 2026-10-21. Focus: the **items** bought in the between-wave shop (all tiers, uniques, items with downsides) and how **character rules** change what an item is worth. Catalog: `../catalog/brotato.csv` (248 rows).

---

## Sources

| Source | What it gave | Version / date | Trust |
|---|---|---|---|
| Brotato Wiki (spellsandguns), item data template — https://brotato.wiki.spellsandguns.com/Template:Item_Data (raw) and https://brotato.wiki.spellsandguns.com/Items | Every item's tier, price, unique/limit, tags, unlock, DLC flag, stat text. **This was the catalog's main source** (parsed from the raw template, not hand-copied). | Page says "updated for 1.1.15.4"; item data matches the 1.1.15 changes (Pile of Books Tier II at 60, Kraken's Eye +15 Curse) | High |
| Same wiki, character data — https://brotato.wiki.spellsandguns.com/Template:Character_Data | 64 character rules + their "wanted tags" | same | High |
| Wiki mechanics pages: Shop, Loot Crate, Curse, Consumables, Ban System — https://brotato.wiki.spellsandguns.com/Shop · /Loot_Crate · /Curse · /Ban_System | Rarity curves, reroll/price formulas, locks, tag weighting, curse ratios | current | High |
| Wiki item pages (Notes/Strategy sections) for ~60 items, e.g. /Axolotl, /Spicy_Sauce, /Goldfish, /Knot, /Tardigrade, /Weird_Ghost, /Fish_Hook | Hidden rules (Axolotl can't be locked, Spicy Sauce quadratic stacking, Weird Ghost/Sick meme) | current | High (editor-written, community voice) |
| Wiki patch pages: /Patch_0.5.9 … /Patch_1.0.0.3, /Beta_Patches_1.0.0.x, /Patch_1.1.0.0, /Patch_1.1.*.* | Every item nerf/buff 0.5.9 → 1.1.14.5 | Oct 2022 → 2026 | High (copies of Steam posts) |
| Nintendo Everything, "All Pain No Gain" (1.1.15) notes — https://nintendoeverything.com/brotato-all-pain-no-gain-update-announced-patch-notes-nightmare-difficulty-new-character-weapon-more/ | 1.1.15 item changes (fog-visibility items, Wounded bans) | 12 May 2026 | Medium-high |
| Steam forum "worst items" — https://steamcommunity.com/app/1942280/discussions/0/6204299339019884773/ | Player trap-item list + defences | 10 Nov 2022 (pre-1.0) | Medium (old balance) |
| Steam "Quantity of items is too much" — https://steamcommunity.com/app/1942280/discussions/0/592884947430223233/ | Pool-bloat complaint vs defence | 31 Dec 2024 | Medium |
| Steam "Fish Hook pity system sounds like a mistake" — https://steamcommunity.com/app/1942280/discussions/0/4631484289351991695 | Unwanted uniques clogging shops; dev QoL debate | 20 Nov 2024 | Medium |
| Steam "I think Curse ruins Endless" — https://steamcommunity.com/app/1942280/discussions/0/4631483212915316142 | Curse love/hate | 8 Nov 2024 | Medium |
| Steam "This is no longer a Blobfish game" — https://steamcommunity.com/app/1942280/discussions/0/573792101998841777/ | Reaction to Evil Empire-era items (pets, Candy Bag, Hourglass) | June 2026 (Nightmare era) | Medium |
| Steam item-selling request (Pocket Factory) — https://steamcommunity.com/app/1942280/discussions/0/4763207322161811256 | "No selling is part of the decision" debate | Sept 2024 | Medium |
| Steam "Progression" thread — https://steamcommunity.com/app/1942280/discussions/0/4042609512663052066 | RNG complaints (Cyborg without turrets); "no metaprogression is a strength" | Jan 2024 – Feb 2025 | Medium |
| Steam Endless/Spicy Sauce comment — https://steamcommunity.com/app/1942280/discussions/0/6330466705288033847 | Endless converges on Demon + Potato Thrower + Spicy Sauce | 2024 | Low-medium (single comment, via search snippet) |
| Goodreads DLC review — https://www.goodreads.com/author_blog_posts/25793374-game-review-brotato-abyssal-terrors-dlc · TrueAchievements Creature page — https://www.trueachievements.com/a453926/creature-achievement | Curse sentiment | 2024 | Low-medium (via search snippets) |
| Adrian Hon, design analysis — https://adrianhon.substack.com/p/brotato | Why short waves + big numeric items work | 29 Aug 2023 | Medium (single critic) |
| Fextralife item tier list — https://brotato.wiki.fextralife.com/Item_Tier_List | Value-per-material ranking | edited Jul 2026, 199 items (out of date) | **Low**: odd placements (Grind's Magical Leaf C, Sifd's Relic S); used only as a weak signal |
| RogueRanker tier list — https://rogueranker.com/brotato-tier-list/ | Grind's Magical Leaf best all-round, Lure most underrated, Bloody Hand best damage item | "Patch 1.1.6, Mar 2026" | Low-medium |

**Gaps, stated plainly**
- **Reddit (r/brotato) wasn't reachable.** reddit.com returned a network-security block and WebFetch can't fetch it. I didn't try to get around this. So I couldn't confirm which wiki the subreddit's sidebar points to. The spellsandguns wiki is the most complete and most current one (it tracks 1.1.15.4, uses structured data templates and has full patch history). Fextralife is behind (199 items). Community sentiment below comes from Steam forums and wiki editor notes, not Reddit.
- The official Steam news posts weren't read directly. The wiki patch pages copy them and link each one.
- Patch notes almost never give **reasons**. Where a reason is listed below, it comes from a wiki editor note, the item's own wording, or what the change obviously does. Each one says which.
- The catalog covers **items only**. Weapons (the other ~35% of shop slots) and level-up stat upgrades come up only where they explain item value.
- Possible lag in the wiki data: patch 1.1.0.0 says Black Belt's Luck penalty went from 8 to 5, but the item template still says 8. Treat single numbers as "per wiki template, 1.1.15.4".

---

## System structure

**Loop.** 20 waves (20 s at wave 1, 60 s from wave 9, 90 s boss wave 20). After every wave: level-up stat picks (4 options, rerollable), crate items picked up during the wave (take or recycle), then the **shop**. Endless mode continues after 20.

**Shop.**
- 4 slots. Each slot is an item 65% of the time and a weapon 35%. Waves 1–2 always show 2 weapons + 2 items. Waves 3–5 guarantee 1 weapon.
- Tier gates: T2 from shop 2, T3 from shop 4, T4 from shop 8. Chances grow per wave up to caps of 60% / 25% / 8%. **Luck multiplies these chances.** At 0 Luck, the wave-19 shop is about 40% T1, 35% T2, 22% T3, 2.8% T4.
- Price = (base + wave + base × 0.1 × wave) × shop-price modifier. Cheap items lose value faster to inflation (the flat "+wave" term hurts them most).
- **Reroll:** the first reroll costs about 0.75 × wave + 0.4 × wave, and each further reroll adds 0.4 × wave. The cost resets every shop. Buying out all 4 slots gives one free reroll. Dangerous Bunny gives free rerolls and Spyglass cuts the cost. Rerolls were made cheaper in 1.1.4.0 and slightly dearer again in 1.1.7.1.
- **Lock:** free and unlimited. A locked item stays through rerolls *and into the next shop*, at the price it had when locked (it dodges inflation). Locked slots can't be rerolled. Axolotl is the only item that can't be locked.
- **Ban (1.1.13.0):** unlocked by winning on Danger 3+. Gives 8 ban tokens per run that remove an offered item for the rest of the run. Banned items come back after wave 20 in Endless.
- **Item tags:** each slot has a 5% chance to draw from the character's "wanted tags" pool (3.25% per slot after the 65% item roll). Weapon slots are biased towards owned weapons (20% same weapon, 15% same class, 65% any).

**Items are permanent.** There's no selling or removal. Only weapons and freshly opened crate items can be recycled (25% of current price, 60% with Recycling Machine). Players in the 2024 item-selling thread defended this: being unable to sell is part of the decision. It's the main reason "trap" items exist.

**Tiers and stacking.** 240 real items (the wiki header says 241, but its table lists Candy Bag twice), tagged T1 common through T4 legendary. 59 are **unique** (max 1). 24 are **limited** (e.g. Coupon 5, Cute Monkey 13, Metal Detector 20, Spicy Sauce 2). The rest stack without limit. 73 of the 240 have no downside. About 40% (96) are plain stat packages, usually a bundle of plusses with one minus, like Helmet (+1 Armor, −2% Speed). The rule-changing items are a minority of roughly 60–70.

**Loot crates.** Dropped by trees (20%), elites, bosses and loot aliens, plus rarely by normal enemies. Each crate dropped in a wave lowers the chance of the next. Luck raises both drop rate and crate item tier. Legendary crates always hold a T4 item.

**Curse (Abyssal Terrors DLC, 1.1.0.0).**
- Curse is a primary stat that some items give.
- It makes **shop items roll cursed**: their good numbers are multiplied by 1.1–2.1 (rising with wave) and their bad numbers divided by the same ratio. The shop curse chance is 15 × C / (50 + C).
- It also makes **enemies cursed**: +25% damage, +15% speed, +150% HP plus 2% per Curse point, and 33% more materials. The enemy curse chance is 50 × C / (50 + C).
- Fish Hook turns locks into a cursing tool, with a pity bonus since 1.1.7.1.

**Characters rewrite item value.** 64 characters. They change item value in these ways:
- **Hard bans on whole item classes:** Ranger/Knight/Gladiator can't use one weapon type. Golem can't heal. Bull has no weapons. Wounded dies in one hit and gets no HP/regen/lifesteal/armor items. Builder can't own structures.
- **Stat-modification multipliers.** E.g. Ranger gets 1.5× from Ranged items and 0.75× from Max HP. Mage gets 0× from Melee/Ranged and 1.25× from Elemental. Entrepreneur gets 0.5× from Damage items. Cyborg gets 3× Ranged and 0.25× Engineering. These quietly double or delete an item's worth.
- **Item-shape rules:** One Armed (1 weapon, so Focus is free and Spider is dead), Multitasker (12 weapons), Generalist (melee/ranged conversion), Vagabond (no duplicate weapons), King (rewards T4, punishes T1), Renegade (+10% damage per distinct T1 item), Curious (+XP per distinct item, −10% damage per duplicate).
- **Starting items** that bend a run around one item: Saver starts with Piggy Bank, Explorer/Pacifist with Lumberjack Shirt, Mage with Snake + Scared Sausage, Arms Dealer with Dangerous Bunny (and loses every weapon each shop, so Knot costs it nothing), Creature with a cursed Fish Hook, Wounded with Tardigrade.
- **Shop rules:** Fisherman always sees a free Bait. Gangster can steal 1 item per shop but can't lock. Demon pays for items with Max HP. Mutant pays +50% prices for −66% XP needed.
- **Pool hygiene by character** (1.1.4.0 and later): items a character can't use are removed from its pool, 141 character–item pairs at first. Before this, Weird Ghost on Sick (Sick takes 1 damage per second, so starting a wave at 1 HP is lethal) was a running community joke and trap.
- Many T3/T4 items unlock by **winning with a specific character** (Anvil from Arms Dealer, Focus from One Armed, Stone Skin from Golem …). That item then carries the character's signature mechanic into everyone else's pool.

---

## What players love (concrete)

- **Scaling engines that change how you value a stat.**
  - Bloody Hand gives +2% damage per 1% Life Steal. RogueRanker calls it the best damage item, and it's the centre of the "masochist" builds players praise.
  - Retromation's Hoodie turns Dodge into attack speed and ignores the dodge cap. The wiki notes that Dodge then becomes your most important stat.
  - Lucky Coin turns Crit into Luck.
  - Sources: wiki item pages; Epic/Steam build threads.
- **Buy-early compounding items.**
  - Grind's Magical Leaf (+3 Max HP, +1 regen, +1% lifesteal every wave, no downside) is RogueRanker's best universal item.
  - Piggy Bank (20% interest; the wiki works out ×6.2 over ten waves of saving).
  - Extra Stomach, Vigilante Ring, Robot Arm.
- **No-downside "instapicks"** with a small timing twist. Lure (+2 regen, 2 extra loot aliens next wave) is RogueRanker's most-underrated item, and Fextralife's S tier includes Celery Tea and Peacock.
- **Risk/reward with a clear payoff.**
  - Bait: +8% damage, and the extra Lampreys it spawns also drop materials. The wiki page signs off with the pun "Will you take the Bait?"
  - Cursed items. A Goodreads DLC review calls Curse an interesting trade-off, a TrueAchievements commenter calls it their favourite part of the DLC, and Steam players report cursed Coupon and cursed Mirror stacking discounts in Endless.
- **Run-defining legendaries.** Axolotl swaps your highest and lowest stats; the wiki calls it extremely polarising, able to win or lose the run on the spot. Goldfish makes the next reroll one tier higher, so T4s can show up before wave 8. Hourglass replays a wave and can loop.
- **Character + item stories:** Saver + Piggy Bank, Arms Dealer + Knot, Demon + Potato Thrower + Spicy Sauce (a Steam commenter complained every Endless run ends up as this build; it was later limited).
- Adrian Hon's analysis: items are blunt numbers, but because waves are short each one visibly changes how you move within a minute. Some do it directly (stand still), some indirectly (Pocket Factory pulls you towards trees).

## What players hate / trap items

- **Stand-still items in a movement game.** Statue, Barricade, Chameleon (and Coral). The Steam "worst items" thread called them weak because the condition rarely holds; they're defended only on Chunky and Soldier, who stand still anyway. Devs kept buffing them: Statue's attack speed went 25 → 30 → 40%, its price 85 → 60; Barricade armor 6 → 8 and later +3 Knockback; Chameleon's penalty went −6 → −4% and it gained +3% Dodge. A pattern of a condition that fights the core verb.
- **Fake-value economy and healing items.**
  - Alien Worm's −1 consumable healing cancels its own gain.
  - Sifd's Relic had −12% Speed for a pickup convenience (2022 thread). Current data shows no Speed penalty, and 1.1.0.0 added +3 Armor.
  - Baby Gecko was buffed four times.
- **Healing replaced or frozen.** Torture (all other healing off) and Handcuffs/Shackles (stat frozen) are traps if bought early. They're good when bought late, because the lock no longer matters (wiki Knot/Handcuffs notes).
- **"Hit me and you lose" items.** Triangle of Power (−2% damage per hit) is contested. Some call it trash; others say ranged builds rarely get hit. It's a true trap with self-damage items (Blood Donation, Bloody Hand, Sick).
- **Variety counters at the wrong count.** Focus and Spider were called bad before Focus switched from per weapon to per *distinct* weapon and Spider's penalties were softened.
- **Late-game anti-synergy you can't undo.** Pocket Factory floods the map with turrets in late Endless and there's no way to sell it (Steam, 2024).
- **Pool clutter.**
  - Unwanted uniques and limiteds (Esty's Couch, Ricochet) keep reappearing, so players buy junk just to clear the shop (Fish Hook thread, 2024).
  - A Dec 2024 thread says the pool is too big, with many never-picked limited items (Coil, Bag, Scared Sausage, Cute Monkey, Metal Detector). Defenders answer that weak items make reroll decisions matter and runs differ.
  - 2026: players call pets (1.1.14) off-style and too expensive and ban them; some call new items uninspired.
- **Knot** is called bad by some players (Steam "Quantity of items" thread, Dec 2024). The wiki says it's strong in a 20-wave run if you combine weapons before buying.
- **Curse in Endless:** it can't be lowered, so enemies eventually outscale you, and enemies can get cursed in ways you didn't see (Steam, Nov 2024).
- **RNG dependence.** Missing key items (Cyborg without turrets) can make a run unwinnable. This is the most common general complaint (Steam progression and "hate" threads).

---

## Dev changes (item nerfs and reworks, with reasons where known)

| Change | Patch | Stated or inferred reason |
|---|---|---|
| Items get internal tags; characters weighted towards their tags | 0.5.11c | Inferred: build coherence without fixed pools |
| Luck-damage items (Lucky, Baby Elephant, Cyberball) no longer stack damage; each copy's damage is tied to its own proc chance | 0.8.0.3 (nerf) | Wiki editor: makes them behave like Hunting Trophy (stops multiplicative stacking) |
| Bloody Hand +3% → +2% damage per 1% Life Steal, then made unique; Life Steal 12 → 10%, price 100 → 110 | 0.8.0.3 / 1.1.0.0 | Self-scaling item was too strong |
| Anvil made unique; Hunting Trophy, Dangerous Bunny, Padding given limits | 0.8 → 1.0.0.3 | Inferred: stop economy/upgrade items being copied endlessly |
| Esty's Couch / Power Generator / Stone Skin / Strange Book count only **permanent** stats | 0.6.1.6 / 1.0 | Explicitly worded to stop temporary buffs (Streamer passive, Barricade) being converted |
| Stone Skin downside −2 Armor → −6% Attack Speed | 1.1.0.0 | Inferred: the downside fought its own fuel (Armor) |
| Robot Arm effect fully replaced (now +3 Melee, +3 Eng, −1 Max HP per wave) | 1.1.0.0 | Not stated |
| Spicy Sauce limit 4 → 3 → 2, chance 25 → 33 → 50% | 1.1.0.0, 1.1.9.0 | Wiki editor: damage and chance both scale per copy (quadratic); cutting the cap nerfs the most dominant Endless strategy |
| Extra Stomach cap 10 → 8 Max HP per wave | 1.1.0.0 | Endless HP farming |
| Giant Belt loses effect past wave 38 | 0.8 | %HP damage trivialises deep Endless |
| Piggy Bank and Crown removed from the pool after wave 20 (they also stop working) | 1.1.13.0 | Compounding economy breaks Endless |
| Unusable items removed per character (the patch note counts 141 removals: harvesting items for Sailor/Hunter, Weird Ghost for Sick, healing for Golem …); more in 1.1.6.x; Riposte banned where melee items are banned; Doc Moth for Druid/Golem; Wounded gets no healing/armor items | 1.1.4.0 → 1.1.15 | Stated: "useless items" for that character |
| Axolotl can't be locked and appears 50% less often | 1.1.0.0 | Wiki: stops players locking it, then buying their way into choosing which stats get swapped |
| Fish Hook pity system | 1.1.7.1 | Smooths variance. A player complained the devs were responding to streamer hype |
| Item Ban System (8 tokens) + cheaper rerolls | 1.1.13.0 / 1.1.4.0 | Answers pool clutter and RNG complaints |
| Riposte proc 50 → 100%; Statue / Barricade / Chameleon / Tardigrade / Baby Gecko repeatedly buffed | many | Under-picked items |
| Hourglass, Candy Bag, Gobbler's Hat, Ghost Outfit, pets added | 1.1.12 → 1.1.14 (Evil Empire era) | Content. Some long-time players find them off-style |
| Fog-visibility side effects added to Candle/Campfire/Lantern/Greek Fire/Lighthouse | 1.1.15 | Gives old items a role in Nightmare fog waves |

---

## 10 standout designs and WHY (pattern)

1. **Knot / Handcuffs / Shackles / Ball and Chain: lock-in for power.** Big stats now, in exchange for permanently freezing a stat or banning an action (combining weapons, healing above the current cap, attacking faster than once per 0.75 s). *Pattern:* the price is future flexibility, so the item's value depends on timing. It's bad on wave 3 and excellent on wave 17. That gives cheap-looking items a real decision.
2. **Lucky Coin / Retromation's Hoodie / Stone Skin / Coil / Power Generator / Esty's Couch: stat-from-stat converters.** Each one turns a stat you already have into another. *Pattern:* it re-values what you own, so a "dead" stat becomes fuel and later buys change. Devs had to pin the conversion to *permanent* stats to stop temporary-buff exploits.
3. **Bait / Peacock / Celery Tea / Lure / Scarf / Weird Ghost: next-wave contracts.** Pay now, settle next wave, with a visible forecast (the elite/horde radar on Danger 2+). *Pattern:* a deferred cost that the player times against what they know is coming. Bait's cost (extra enemies) is also its reward (extra materials).
4. **Blood Donation / Bloody Hand + Bull / Masochist / Kraken's Eye: self-damage as fuel.** The downside "take 1 damage per second" becomes a trigger source for on-hit effects. *Pattern:* a cost that is also an input, which creates combos players find themselves and talk about.
5. **Giant Belt / Greek Fire: percent-current-HP damage, 10% vs normal enemies and 1% vs elites/bosses.** *Pattern:* it scales with the enemy, so it stays relevant as enemies scale, while a hard boss cap keeps it from deleting set pieces. Clean and easy to explain.
6. **Goldfish / Mirror / Hourglass: single-use items that leave a visible spent version.** *Pattern:* a one-shot shop or time effect in the permanent inventory. It's a "spell" without adding a separate consumable system.
7. **Spider / Focus / Jelly / Fairy / Curious / King: count-distinct rules.** Reward variety (+% per distinct weapon or T1 item) or focus (−% per distinct weapon). *Pattern:* a whole-inventory rule that turns every later purchase into a yes/no on "does this keep my count?"
8. **Character rules + tag-weighted pool + per-character bans.** The same item is a different item per character (Knot on Arms Dealer, Focus on One Armed, Piggy Bank on Saver). *Pattern:* define a few rules for the owner and let the existing item pool supply variety. Prune items that are dead for that owner so they don't clog choices.
9. **Spicy Sauce: limited count with quadratic stacking.** Both chance and damage go up per copy, capped at 2. *Pattern:* "collect the set" excitement, held in check by a limit instead of weaker numbers. The limit was lowered twice when it dominated.
10. **Curse (DLC): opt-in overcharge.** Cursed items roll good numbers ×1.1–2.1 and bad numbers ÷ the same ratio, in exchange for stronger cursed enemies that drop more. *Pattern:* every item gets a "risky deluxe" variant without new content. It was well liked. The complaint is that it's irreversible in Endless.
11. **Axolotl: extreme variance, plus an anti-exploit rule.** Swaps your highest and lowest positive stats. *Pattern:* a jackpot item. The design lesson is that the devs added *no-lock* and *50% rarer* to stop players from setting it up deterministically.
12. **Tardigrade / Sunken Bell: once-per-wave safety valves.** Negate the first hit, or explode the first time you drop below 40%. *Pattern:* a per-wave reset makes defence readable (Tardigrade colours the HP bar purple while armed). It strongly supports glass-cannon builds.

---

## Ideas worth transforming for Bastion

Each idea below comes from a Brotato pattern that has evidence behind it, adapted to Bastion's pillars (module grid, neighbour combos, drift flight, swarms, wave breaks). Card = 1 of 3 offered per break. Hooks refer to the brief. Where an idea is close to the rejected list, it's flagged.

1. **Welded Frame** (Knot pattern) — Grid.
   - Effect: +20% weapon damage and +15% module hull. From now on modules can't be sold or moved; you can still buy and attach.
   - Why: it turns the existing Build phase into the price. Good late, bad early (the Knot/Handcuffs timing lesson).
   - Hooks: `moduleSellRefund` / `validPlacement` (block relocation), damage multiplier in `updateWeapons`.
   - Risk: destroyed modules still detach, so the cost bites harder in Bastion than Knot does in Brotato. Say "can still re-buy" clearly in the text.
2. **Fixed Footprint** (Shackles/Handcuffs) — Grid.
   - Effect: big flat bonus (e.g. +40% Reactor radius or +3 range tiers). The ship's module **count** is capped at the current number; you can only replace destroyed modules.
   - Why: the community values these as late "finisher" picks. Offer it only from wave ~12 (Brotato tier gates).
3. **Heavy Breech** (Ball and Chain) — Weapons.
   - Effect: +25% damage and +2 armor on every module. Every weapon has a 0.75 s minimum cooldown.
   - Why: it reshuffles which families are good (Rail/Cannon gain; Scatter/Flak lose) without new VFX.
   - Hook: `weaponCooldownRate` floor.
4. **Converters on board state** (Lucky Coin / Stone Skin / Coil). For example:
   - **Plated Core:** +1% weapon damage per tile inside any Bulkhead 3×3.
   - **Cold Ledger:** each Cryo module counts as +1 Reactor neighbour for adjacent weapons.
   - Rule from the dev history: count **permanent** board facts (modules attached), not temporary states.
   - Why: makes existing modules into fuel for new decisions, through the neighbour pillar.
5. **Next-wave contracts with forecast** (Bait / Peacock / Lure).
   - **Beacon:** next wave adds one extra formation from a direction marked at the break. Killing all of it gives a free module copy.
   - **Overclock Contract:** next wave pays +100% Matter, but enemies deal +50% damage.
   - Needs: the break screen must preview the next wave's direction or composition (Brotato's elite radar).
   - Hooks: `startWave` / `completeWave`.
   - Endless: only offer during waves 1–20, or give endless its own scaling.
6. **Doctrine vs Mixed Fleet** (Focus vs Spider).
   - **Doctrine:** +30% damage, −4% fire rate per **distinct weapon family** on the grid.
   - **Mixed Fleet:** +5% fire rate per distinct weapon family.
   - Why: a whole-grid rule that makes every later purchase a family decision. Uses the 18 family IDs already present.
7. **Brittle Shatter** (Giant Belt / Greek Fire).
   - Effect: Rail hits on chilled targets deal +8% of current HP (1% vs bosses and Siege/Storm Ring parts).
   - Burn variant: Ember-ignited weapons' burn ticks deal 3% current HP (0.3% bosses).
   - Why: scales with Bastion's +8% HP per wave and stays relevant for 20 waves; the boss cap protects the 3 boss variants.
   - Hook: `damageEnemy`.
   - *Check against the rejected "Superconductor"/"Napalm Warheads"* if those were Cryo/Ember damage boosts. The difference here is the %HP mechanic with the boss cap.
8. **Dock Mirror / Gold Reroll** (Mirror / Goldfish), single-use with a spent state.
   - **Dock Mirror:** the next module you buy this break is duplicated for free. It must fit; the price escalation still counts.
   - **Gold Reroll:** your next card reroll shows one rarity higher.
   - Why: a one-shot shop event, cheap to build (UI only).
   - Hooks: `placePurchasedModule`, card reroll.
9. **Venting Core** (Blood Donation + Kraken's Eye).
   - Effect: the Core loses a little hull per second. Each time any module takes damage, 40% chance it emits a knockback ring (existing ring VFX) scaled by its hull.
   - Why: the downside is the trigger. It pairs with Repair Array and Shield Node, which become engine parts.
   - Hook: `applyDamageToTile`.
   - *Possible overlap with the rejected "Shock Barrier"/"Sacrificial Plating"*. The thing to keep from Brotato is "the cost is the trigger", not "shockwave on hit" by itself.
10. **Last Bulkhead** (Tardigrade): the first module that would be destroyed each wave survives at 1 hull, with the hull bar tinted while it's armed. Stackable, so 2 copies cover 2 modules per wave. Hook: `destroyTile`.
11. **Overcharged variants** (Curse): some rare/epic offers can appear "overcharged", with good numbers ×1.3–1.8 and bad numbers divided by the same. Taking one adds +5% HP to the next N waves' enemies. This gives variety without new card designs. Hook: card generation.
12. **Pool hygiene and owner rules** (the 1.1.4 cleanup, bans, tag weight):
    - Never offer a neighbour card whose partner family isn't on the grid or affordable. This is the Weird Ghost / Sick lesson.
    - Give each of the 4 cores a "wanted tag" with a ~5–10% weighted draw.
    - Consider 1–2 per-run card bans unlocked in the Hangar.
    - Make some rare cards read the core: e.g. a Salvager-only version of Piggy Bank-style interest. That overlaps the rejected "Salvage Rights"/"Harvest" if those were interest effects, so only pursue it with a core-specific twist.

**What Brotato evidence says to avoid**
- **Conditional "stand still" items** underperformed and needed repeated buffs, except on characters that already stand still. The Bastion equivalent ("while coasting", "while not thrusting") was already rejected (Drift Gunnery, Momentum). The evidence supports dropping it unless a core makes coasting the default.
- **Downsides that cancel the upside** (Alien Worm), or that fight the item's own fuel (old Stone Skin −Armor).
- **Uniques that keep clogging the 3-card offer** once they're irrelevant. Remove them from the pool when they're dead for the current grid.
- **Uncapped compounding economy in Endless** (Piggy Bank, Spicy Sauce). Gate it to waves 1–20, since Bastion's Endless must stay unchanged.
