# HoloCure – Save the Fans! — upgrade system study

Game version covered: 0.7 (release 2024-11-15; latest wiki changelog entry 0.7 Patch 27, 2025-05-07, "bug fixes"). No 0.8 notes were found.

## Sources

Primary (current wiki, wiki.gg is the live one; the old Fandom wiki was not used):
- Items: https://holocure.wiki.gg/wiki/Items
- Collabs: https://holocure.wiki.gg/wiki/Collabs and the individual pages Absolute_Wall, BL_Fujoshi, Black_Plague, Blood_Lust, Bone_Bros., Breathe-In_Type_Asacoco, Dragon_Fire, Elite_Cooking, Flattening_Board, MiComet, Rap_Dog, Ring_Of_Fitness, Stream_Of_Tears
- Super Collab / Golden Hammer: https://holocure.wiki.gg/wiki/Super_Collab
- Golden Anvil: https://holocure.wiki.gg/wiki/Golden_Anvil · Anvil and enchantments: https://holocure.wiki.gg/wiki/Anvil
- Stamps: https://holocure.wiki.gg/wiki/Stamps
- Level-up offers, Reroll/Eliminate/Hold: https://holocure.wiki.gg/wiki/Level_Up · Shop upgrades: https://holocure.wiki.gg/wiki/Upgrade
- Holozon Box: https://holocure.wiki.gg/wiki/Holozon_Box · Support items: https://holocure.wiki.gg/wiki/Support_Item · Weapons: https://holocure.wiki.gg/wiki/Weapons · Changelog: https://holocure.wiki.gg/wiki/Changelog

Patch history (item-level balance): https://samurai-gamers.com/holocure/version-update-and-changelog-information/ (covers 0.4–0.5; no stated reasons)

Community (Steam discussions):
- "super collabs, how to find them?" (Aug 2023): https://steamcommunity.com/app/2420510/discussions/0/3824173205608493884
- "Which are the best collabs for clearing stages/farming coins/long survivals?" (Nov 2024): https://steamcommunity.com/app/2420510/discussions/0/4634862385195183284
- "watame help" (Nov 2024–Jan 2025): https://steamcommunity.com/app/2420510/discussions/0/6589423683861843109
- "Upgrade vs Enchant" (Aug 2023): https://steamcommunity.com/app/2420510/discussions/0/3824172831335151432
- Guide sites: samurai-gamers "Common mistakes" and "Useful tips/hidden mechanics"; Steam search snippets on Kusogaki Shackles builds.

**Gaps (be aware):**
- Reddit is blocked for my fetch tool, so r/holocure was NOT read. "What players love/hate" rests on ~5 Steam threads, guide sites and review snippets. That is thin evidence. Treat it as a sample, not a consensus.
- The wiki item page lists one description per item, not level 1 vs max values. Per-level numbers are missing for most items.
- Character skills (3 per character × ~40 characters) and Fan Letters were not catalogued. They are per-character and don't map well onto Bastion's cards.
- Several collab effects (Crescent Bardiche, Curse Ball, Eldritch Horror, Frozen Sea, Light Beam, Lightning Wiener, MiKorone, Idol Concert, Legendary Sausage, Broken Dreams) come from the overview table only, without the per-page numbers.
- Developer reasons for changes are almost never published. Official notes mostly say "balance changes". Any reasons in the "Dev changes" section are my inference and are marked as such.
- One Steam page contained embedded text that tried to issue instructions to the fetch tool. It was ignored, and nothing from it is used.

## System structure

A run gives you **6 weapon slots** (the character's main weapon is one of them) and **6 item slots**. Leveling up pauses the game and offers **4 choices**:
- **Slots 1–2:** a skill, weapon, item or stat-up.
- **Slots 3–4:** a weapon or item, falling back to Food or coins.

Owned gear and new gear are drawn from separate lists with equal chance, so upgrades of what you hold keep coming up.

Layers, from most common to rarest:
1. **Stat Ups** (orange). Generic +% stats, with no cap on stacking. This is the filler layer, like Bastion's plain commons.
2. **Items** (green, 37). Most have 3–5 levels and a weight of 1–4 that controls how often they're offered. There are three categories: Healing, Stat and Utility. About 10 carry an explicit drawback.
3. **Weapons** (blue, 17 basic). Max level is 7. After that they can only be enhanced at anvils.
4. **Anvils** (1/1301 drop chance per kill). You choose which weapon or item to level, so it's deterministic, unlike random level-ups. Past max level, enhancement costs coins and its success chance falls (100%, then −10% per rank). Anvils can also add a random **enchantment** for 250 coins.
5. **Collabs** (25). Two max-level weapons are fused at a **Golden Anvil**. It only spawns when you already own a valid pair, and only one can exist at a time. The fusion frees a weapon slot and keeps both parents' enchantments. Since v0.6 an in-menu recipe list exists.
6. **Holozon Boxes** (boss drops). The reward is mostly an upgrade to gear you own. 9% of boxes are triple. 5% are **super** boxes, which give one **Super Item** (17 exist), or since v0.7 upgrade a held item to its super version. Since v0.7 Patch 20, super odds drop after each super you gain.
7. **Super Collabs** (5). Need a collab, a max-level item (or super item) and the **Golden Hammer**. The hammer appears at player level 50 or on your 3rd collab, with a half-shaft and full-shaft progress icon. The item is consumed and its slot freed. Only **one per run**.
8. **Stamps** (22, v0.5+). Rare drops (1/780 per kill). Up to 3 attach to the **main weapon only**. Feed other stamps in to level them to 3, or sell them.
9. **Meta control** (bought in the shop with permanent coins). Reroll (up to 10 per run), Eliminate (up to 10, bans an option for the run), Hold (up to 5, pins an offer to the next level-up), Customize (disable items before a run), and one support item chosen before the run.

Key properties:
- **Rarity is expressed by acquisition channel, not by a rarity label.** Level-up gives common stuff, anvils give chosen upgrades, boss boxes give super items, the Golden Anvil gives collabs, and the Golden Hammer gives a super collab.
- **Upgrades mostly come from repeat picks** of the same item. Super items are "beyond max" versions that usually delete the drawback.

## What players love (evidence-limited, see gaps)

- **Collab themes and discovery.** Players defend the recipes as thematic: sake makes Snow Queen, food makes Jingisukan, idol items make Idol Live. Finding a recipe by accident and sharing it is part of the fun (Steam, 2023).
- **Planning across systems.** Players enchant both parent weapons before a collab so it inherits two enchantments. Getting a double-enchant collab is a recognised "pro move" (Steam "Upgrade vs Enchant"; samurai-gamers tips).
- **Reroll and Eliminate as agency.** Players cite them as the answer to RNG complaints: you can steer a run toward a target build (Steam, 2023).
- **Kusogaki Shackles turning penalty items into must-picks.** One comment says it turns two never-takes into always-takes. Several build guides list Shackles plus Face Mask, Energy Drink, Gorilla's Paw or Candy Sweets as a core setup.
- **Run-defining collabs.** Dragon Fire and Holy Fire are described as making stage clears trivial. Jingisukan is the "safe" pick (big HP plus healing zones). Blood Lust is the boss killer. Snow Queen and Eldritch Horror are liked because they need no aiming and heal (Steam, Nov 2024).
- **Healing builds stacking multipliers.** Full Meal (doubles healing) with Uber Sheep and Just Bandage is praised as a top survival combo.
- **Economic items as a run goal.** A coin-farming meta exists: Halu, Super Chatto, Greed stamp, Promise Tiara and Piggy Bank. Players turn off sub-weapons so more enemies survive to drop coins. Items that change what the run is *for* are actively used.

## What players hate

- **Opaque super collabs and wiki dependence.** The hints are called far-fetched, and the achievement doesn't explain the mechanic. "Luck and then check the wiki" is called not the best system (Steam, Aug 2023).
- **Long RNG gates.** Golden Anvil and Golden Hammer timing is "pretty much luck". Stamp drops are streaky (ten of the same stamp in a row, then none).
- **Main-weapon-only stamps** confuse players. Guide sites list it as a top misconception, which points to a UI clarity failure.
- **Halu's escalating spawns.** It's advised against at level 5, and some players warn to take it only if you can handle the difficulty. Note: players still take it late because its coin multiplier is set at stage end, so it gets exploited rather than engaged with.
- **Plushie.** Delayed damage that keeps ticking feels bad (one Steam player).
- **Weak enchants.** Crit Damage +10% is seen as the dud.
- **Enhancement failure.** At 10% minimum success, an achievement tied to failing feels harsh.
- **Pacing.** A review (RPS, via search snippet) calls the power fantasy a slow burn and says the many menus and currencies "might be a bit much".

## Dev changes (what was tuned, and the likely reason)

- **v0.4 (2022-09):**
  - Face Mask cut to max level 1 but gained haste. Gorilla's Paw damage was raised and its crit penalty softened. Injection Asacoco's ATK was raised. Energy Drink gained haste.
  - *Inference:* drawback items were underpicked, so the devs raised the upside rather than removing the downside.
  - Plushie lost its post-hit slow. Nurse's Horn changed from a % heal to a flat heal.
  - Weapons got a **minimum attack time**, and many collabs were nerfed (BL Fujoshi axe 200% → 125%). This put a floor under haste scaling.
- **v0.5 (2023-02):**
  - Face Mask and Gorilla's Paw changed from additive ATK to a **total damage multiplier**, so they stay valuable late.
  - Sake changed from "lose all crit on hit" to "lose half". *Inference:* softening a feel-bad all-or-nothing reset.
  - Plushie changed from i-frames to delayed damage.
  - **Stolen Piggy Bank changed from coins per second to coins per distance travelled.** A passive income item became a movement-skill item.
  - Added Stamps, Enchantments and Eliminate. Reroll cap raised from 5 to 10. Rap Dog's debuff raised (15% → 20%).
- **v0.6 (2023-08):**
  - **A collab list was added to the level-up menu** (a direct answer to recipe opacity). Reroll now lowers the weight of options already shown, so rerolls find new things.
  - Big collab damage nerfs: Breathe-In 400% → 240%, Stream of Tears 375% → 275%, Flattening Board, MiComet, Rap Dog, and a hit cap added to Dragon Fire.
  - Added the Super Collab and Golden Hammer layer, plus the Cold, Lightness, Marking and Unit stamps.
- **v0.7 (2024-11):**
  - Added Hold, Customize and Support items, the Owl Dagger collabs, and the Rock Hard and Collector stamps.
  - **Held items can now upgrade into their super version from boxes**, so a run's existing items can reach super instead of super items only replacing them.
- **v0.7 Patch 20 (2025-02):**
  - **Super-item odds fall after each super gained.** This is anti-snowball tuning for long and endless runs.
  - Cast Net size +50%.

**Pattern:** the dev repeatedly (a) raised the upside of drawback items rather than deleting the downside, (b) softened all-or-nothing resets into partial losses, (c) gave players more control tools (Eliminate, Hold, Customize, recipe list), and (d) nerfed collab raw damage once their numbers dominated.

## Standout designs and WHY

1. **Collab = fusion of two maxed things, triggered by a rare event that only appears when valid.**
   - The Golden Anvil never spawns uselessly; its existence means you have a recipe. Fusing frees a slot, so the payoff is power plus build room.
   - Parents' enchantments carry over, which rewards planning ahead.
   - Why it works: it gives a mid-run *goal* ("max these two"), and the reward is a new weapon behaviour, not just bigger numbers.
2. **Super Collab, one per run, consuming an item.** A hard cap of one makes it the run's identity. Consuming a max item to free its slot turns the item from a stat stick into an ingredient. The visible half-shaft and full-shaft progress UI telegraphs that it's coming.
3. **Drawback items plus Kusogaki Shackles.**
   - Face Mask, Energy Drink, Gorilla's Paw, Candy Sweets, Injection Asacoco and Halu each trade a clear upside for a clear tax.
   - Shackles is a *meta-item* that discounts every tax you hold, so the more drawback items you take, the better it gets.
   - Why: it creates an archetype ("penalty build") out of items that alone would be traps. Players explicitly describe it this way.
4. **Super items delete the drawback.** Super Energy Drink drops the HP loss, Super Gorilla's Paw the crit loss, Super Injection the bleed, Super Piggy Bank the pickup loss. A rare boss reward that removes a cost you were already paying feels better than more numbers. Since v0.7, held items can be upgraded in place.
5. **Membership: run currency as fuel.** It burns coins each second, but while you have coins you get +ATK and −damage taken. It links the economy layer to combat and pairs with coin generators (Super Chatto, Greed).
6. **Halu: opt-in difficulty for payout.** It spawns more and stronger enemies for more coins. It's interesting because players chose *when* to take it (late, to exploit the end-of-stage multiplier). That's a lesson: payout timing must match risk timing.
7. **Rock Hard stamp (stand still: +20% damage and much faster attacks).** In a game whose core skill is movement, a stationary bonus creates a real risk choice. Quick Dash preserving the buff produced a "dash, plant, fire" pattern.
8. **Solo / Unit stamps: build-shape rewards.** Solo gives +5% per *empty* weapon slot, rewarding minimalist builds. Unit trades main-weapon damage for every other weapon. These reward the *shape* of the inventory rather than raw stats.
9. **Marking stamp.** The first enemy hit absorbs 20% of all damage you deal to others. This turns crowd-clearing into boss damage, and players cite it for fast boss kills.
10. **Stolen Piggy Bank's v0.5 change (income per distance travelled).** A passive item became a movement item. Its −30% pickup range tax is countered by Limiter.
11. **Researcher's Coat / Sake: ramps that reset when you get hit.** The coat's XP trickle accelerates while at full HP, and Sake's crit ramps per second and halves on hit. Both reward clean play with a growing number the player watches. Sake was softened from a full reset to a halving, showing where the frustration line is.
12. **Contagion and corpse-chaining collabs for swarms.**
    - Black Plague: infected enemies emit new clouds, with a small execute chance on non-bosses.
    - I'm Die: a bomb sticks to an enemy and blows when it dies.
    - MiKorone: struck enemies drip lava as they walk.
    - Rap Dog: hit enemies take +20% from everything.
    - The enemies themselves become the delivery system, so density becomes an advantage.

Honourable mentions:
- **Promise Tiara.** Retroactive counter: every stamp that ever dropped this run adds stats.
- **Corporation Pin and Piki Piki Piman.** Stat converters: pickup range becomes area, and max HP becomes damage.
- **Chicken's Feather.** Revive plus a screen wipe. Its super version gives five revives, each adding a permanent buff.
- **Breastplate.** Reflect fires even while invulnerable, which enables ram builds.

## Ideas worth transforming for Bastion

These are transformations, not copies. Each is grounded in a HoloCure mechanic players use.

**Module grid / neighbour combos**
- **Fusion modules (from Collab + Golden Anvil).**
  - When two specific module families are both at max upgrade **and edge-adjacent** (for example Ember next to Cannon, or Cryo next to Rail), a rare "Fusion" card appears in the post-wave pick. It never appears when no valid pair exists.
  - Taking it merges the pair into a 2-cell fused module with new behaviour, built from existing VFX:
    - Ember + Cannon: shells leave burning ground.
    - Cryo + Rail: a shatter beam.
    - Cryo + Missile: a freeze cluster.
  - The fused module keeps both parents' branch upgrades.
  - Show the recipe list in Build from the start (HoloCure added this in v0.6 after opacity complaints).
- **Capstone fusion (from Super Collab), one per run.**
  - Unlocked by wave 12 or by owning 2 fusions, with a visible half/full progress pip like the Golden Hammer.
  - It consumes a held rare card, freeing its slot, plus a fused module. It makes the run's identity.
- **Lean Hull (from Solo).** +X% weapon damage per empty cell inside the ship's bounding grid, or per module below a threshold. It rewards a small ship and pairs naturally with modules detaching.
- **Distributed Fire (from Unit).** The core weapon loses damage and every attached module gains a little. This is the opposite build shape.
- **Hull to Damage converter (from Piki Piki Piman).** Every N total armor HP on the ship adds +1% weapon damage. It gives Bulwark and armor stacking an offensive payoff without new art.

**Drawback cards and their counter**
- **Tax cards with clear upside.** These are the evidence-based version of the rejected "Overload Core" idea; the difference is the explicit trade and the Shackles counter-card.
  - "Stripped Plating": all damage ×1.3, all modules take +30%.
  - "Overclock Injector": +40% weapon damage, the core bleeds 1% HP per second, floored.
  - "Burner Thrust": +40% thrust, −20% hull HP.
- **"Shackles" rare card.** It reduces the penalty of every drawback card held by a third, and can stack. This makes the penalty build an archetype.
- **Boss-wave "super" upgrade (from super items).** After a boss wave (Siege Ring, Pursuer, Storm Ring), offer to upgrade one held card to its super form, which removes its drawback. Reduce the odds after each one, as in v0.7 Patch 20.

**Economy cards**
- **Matter Burn (from Membership).** During waves, Matter drains per second. While Matter is above 0, you get +30% damage and −10% damage taken. It clashes with spending Matter on rerolls and copies, which creates a real decision at wave break.
- **Bounty Contract (from Halu).** The next waves spawn extra swarm groups and enemies gain stats, and each kill pays extra Matter. Pay the bonus *per wave cleared*, not at run end, so it can't be taken late for a risk-free payout (Halu's exploit).

**Drift flight**
- **Anchor (from Rock Hard).** While not thrusting and below a speed threshold, all weapons gain damage and fire rate.
  - Note honestly: this is close to the rejected "Drift Gunnery/Momentum". HoloCure's evidence is that a *sharp binary* stance condition works in a movement-skill game.
  - Pair it with a thrust burst that keeps the buff (Quick Dash interaction) to create a "plant, fire, burst, plant" rhythm.
- **Salvage Wake (from Stolen Piggy Bank v0.5).** Gain Matter per distance flown, with reduced pickup radius as the tax. It turns flying itself into income, the same move HoloCure's dev made in v0.5.
- **Centrifuge (from Legendary Sausage).** Orbit or Flak modules spin or fire faster in proportion to current ship speed.

**Swarms**
- **Contagion (from Black Plague).** Burn or chill spreads from an affected enemy to its formation neighbours, with a small execute chance on non-elite enemies at full stacks. Bastion already has formations, so this rewards their density.
- **Corpse Charge (from I'm Die).** A missile or cannon hit attaches a charge that detonates when the host dies, chaining through grouped formations.
- **Marked Target (from Marking).** The first enemy each Rail or Missile volley hits takes 20% of all splash damage dealt to others nearby. This turns swarm-clearing into Bulwark and boss damage.
- **Amplifier Beacon (from Rap Dog).** Enemies hit by a chosen module type take +20% from every source. It's a team-play card for mixed grids.

**Wave breaks**
- **Pristine Hull (from Researcher's Coat + Sake).** A per-wave bonus that grows each second no module has taken damage, and halves (not resets) when hit. Pay it out at the break as Matter or as a repair percentage.
- **Scrap Memory (from Promise Tiara).** Every module lost this run permanently adds +X% to remaining modules of that family. Detachment becomes fuel instead of pure loss.
- **Last Stand (from Chicken's Feather).** Once per run, when the core would die, restore 50% and wipe every non-boss enemy on screen. Its super version gives multiple uses, each with a permanent buff.
- **Offer control as Hangar licenses (from Eliminate / Hold / Customize).** Add Banish (ban a card for the run) and Hold (pin an offer to the next break) as limited per-run charges bought with Fragments. Reroll stays a Matter cost. Make reroll lower the weight of cards already shown (v0.6 rule).

**Anti-lessons (avoid these)**
- Hidden recipes with no in-game list.
- Long pure-luck gates (Golden Hammer timing, stamp streaks).
- Modifiers that only apply to one weapon without saying so in the UI.
- Delayed-damage "defence" that feels like still being hit.
- Payout timing that lets a risk card be taken risk-free.
