# 20 Minutes Till Dawn (flanne, 2022 EA / 2023 1.0) — upgrade system study

Catalog: `../catalog/20-minutes-till-dawn.csv` (231 rows: 100 tree upgrades, 12 synergies, 12 tomes, 33 weapon evolutions, 37 character upgrades, 24 runes, plus 8 removed and 6 datamined-unused entries).

## Sources

Fandom pages are behind a Cloudflare challenge (HTTP 402/403 to tools), so they were read through Wayback Machine snapshots (Upgrades snapshots dated 2024 and 2026-01-23 are identical; the other pages are 2024-11 to 2026-02 snapshots). Patch notes came from the official Steam news feed (`ISteamNews` API, appid 1966900).

- Wiki, Upgrades (25 trees / 100 upgrades): https://20-minutes-till-dawn.fandom.com/wiki/Upgrades
- Wiki, Synergies (12): https://20-minutes-till-dawn.fandom.com/wiki/Synergies
- Wiki, Tomes: https://20-minutes-till-dawn.fandom.com/wiki/Tomes
- Wiki, Runes: https://20-minutes-till-dawn.fandom.com/wiki/Runes
- Wiki, Character Upgrades: https://20-minutes-till-dawn.fandom.com/wiki/Character_Upgrades
- Wiki, Weapon Evolutions: https://20-minutes-till-dawn.fandom.com/wiki/Weapon_Evolutions
- Wiki, Specialize (tripled values): https://20-minutes-till-dawn.fandom.com/wiki/Specialize
- Wiki, Shana (offer count, reroll): https://20-minutes-till-dawn.fandom.com/wiki/Shana
- Wiki, Darkness (difficulty; D9 removes one choice): https://20-minutes-till-dawn.fandom.com/wiki/Darkness
- Wiki, Removed and Unused Content: https://20-minutes-till-dawn.fandom.com/wiki/Removed_and_Unused_Content
- Steam patch notes: 10MTD release + 20MTD plans (2022-05-12), V0.6.3 (2022-06-18), V0.7.6 (2022-08-15), V0.8.5 (2022-11-12), V0.9.0 (2022-12-22), 1.0 (2023-06-08), "Next Patch Delayed" (2024-01-07), "More Info" (2024-03-15), "Blessings & Curses" (2024-10-28): https://store.steampowered.com/news/app/1966900
- Dev post on pool dilution and RNG, 2023-11-07: https://steamcommunity.com/app/1966900/discussions/0/3958161899230616271
- Steam threads: "How do upgrades work?" https://steamcommunity.com/app/1966900/discussions/0/3422186614301467625 · "OP Builds" https://steamcommunity.com/app/1966900/discussions/0/3416558383301878054 · "Spark is stupidly OP" https://steamcommunity.com/app/1966900/discussions/0/3363650131506546191 · "Salvo knife advice" https://steamcommunity.com/app/1966900/discussions/0/3810655055433936398 · suggestions list https://steamcommunity.com/app/1966900/discussions/0/3422186614295374924
- Review aggregate (themes weighted by frequency): https://vaporlens.app/app/1966900/20_minutes_till_dawn.md

**Gaps (be aware):**
- Reddit (r/20MinutesTillDawn) was not reachable. Search returned no threads and the JSON API returned 403. Community evidence therefore comes from Steam discussions and a review aggregator.
- The live game might differ from the wiki. The "Blessings & Curses" overhaul was announced for a closed beta in Oct 2024, and it is the latest Steam announcement. I found no evidence that it shipped publicly, so the catalog describes the 1.0-era system.
- The wiki says the game has 13 weapons and 13 characters, but its tables list only 11 weapon evolution sets and 12 characters. The Nov 2023 weapons and Katana (Dec 2023) are missing, so their upgrades are not catalogued.
- Offer count: the wiki says a level-up offers 5 upgrades (4 from Darkness 9). I could not confirm this from a second source.
- Offer weighting and probabilities are undocumented. Nothing public says whether synergies or higher tiers are weighted up.
- Exact numbers can drift between versions. Mini Clip, for example, is -5 ammo per the wiki and -4 per the 1.0 notes.

## System structure

**Five reward channels in a run, each with a different shape:**
1. **Level-up upgrades** (main channel). Pick 1 of ~5 (wiki figure). Upgrades come from 25 themed 4-node trees in five groups: Damage & Guns (5), Summons (7), Status Effects (5), Defense (4), General (4). Each pick is taken once; outside Endless there are no repeat stacks.
2. **Synergies** (12). These are ordinary level-up offers, but each one enters the pool only once you own its 2–3 prerequisite upgrades. They have a red icon with a red inner border.
3. **Elite chests** give a random character-specific upgrade. There are 3 per character (Shana has 4 plus Halo Pieces), and you cannot reroll them.
4. **Boss tomes** let you pick 1 of 3 from 12 trade-off upgrades. Most have a real penalty, for example Glass (any hit kills you) or Stillness (you cannot move while shooting).
5. **Weapon evolution** happens at level 20: pick 1 of 3 rule-changing variants for your weapon (added in 1.0).
Outside the run, **runes** are the meta-progression (see below).

**Tree prerequisites (the core rule):**
- Every tree has 4 nodes: **T1 → (T2a | T2b) → T3**. T1 must come first. **Either** T2 unlocks T3, and you can still take the other T2 later. All 4 can be owned. Players call this "very forgiving" (Steam thread).
- The pool therefore starts with only the 25 T1 entries. Committing to a tree adds that tree's deeper nodes to the pool, so the pool grows in the directions you have already chosen. This is a soft, invisible weighting toward your build.
- Since the 10MTD release notes (2022-05) the UI shows each upgrade's unlock path. Players later asked to see their current perks during level-up, and the dev planned a stats UI and an upgrade compendium (2024-01).

**Synergy prerequisites:**
- Nearly all synergies need one specific node from each of **two different trees**: Overload = Electro Mastery (Electromancy T3) + Fire Starter (Pyromancy T2). Gun Mastery needs three nodes (Power Shot + Rapid Fire + Armed and Ready). Sword and Shield and Titan pair a T1 or T2 with a T3.
- Most prerequisites sit at T2 or T3. You cannot reach a synergy by accident; it rewards going deep in two trees.
- Synergies are **not guaranteed** offers. They only become eligible. Several of them carry a commitment cost: Summon Mastery gives -35% bullet damage, Stand your Ground -25% move speed, Mini Clip -5 ammo.
- The dev stated the purpose on Steam (2023-11-07). New regular perks dilute the pool and make RNG worse, while synergies appear only after specific picks, so they add depth without diluting the pool.

**Shared trigger hooks that many trees plug into:**
- **On last ammo**: Fan Fire, Ice Shard, Holy Arts, Tome of Electro, Aftershock rune, Volley.
- **On reload**: Fresh Clip, Kill Clip reset, Courage, Whirlwind, Luna's black hole, Cyclone Sword.
- **On hit** (elements): Frost Mage, Pyro Mage, Dark Arts. Proc sources that copy on-hit, such as Ghost Wizard, Sight Magic, Magic Spray and Thunder Caller, multiply them.
- **Move-speed conversion**: Windcutter, Windborne, Reflex, Tome of Wind, and the Wind Bolt, Wind Katana and Wind Knife evolutions make other stats scale with move-speed bonuses.
- **Stationary / unhit state**: Siege, Stand your Ground and Stillness reward standing still. In the Wind and Kunoichi reward not getting hit. Anger Point and Berserk reward getting hit.

**Runes (meta):** There are two sides, Sword (offence) and Shield (defence), each with 4 rows that unlock at 1/5/10/15 total ranks bought. Each rune has 5 ranks, and the cost per rank rises by row (1350/3150/6300/12800 souls). You equip **1 rune per row per side**, 8 active in total. Several runes are miniature run-mechanics, not just stats: Cadence (every 3rd shot is huge), Ethereal (no ammo use for a while after 50 kills), Dedication (bonus only with exactly 1 summon), Glass Cannon (start at half HP). In 1.0 four "cheat death" runes (Last Stand, Second Wind, Guardian, Elemental Shield) were replaced by dodge, Wind Shield and Soul Heart runes. The dev later said that pre-run rune choice locks the build before the run starts, and planned to make all purchased runes active (2024-10).

**Difficulty interacts with choice:** Darkness 9 removes one upgrade option from each level-up, so it uses offer count as a difficulty lever.

## What players love
- **Build variety from combining trees, characters and weapons.** In the review aggregate, "synergies" (0.23) and "build variety" (0.17) are the top positive themes after roster variety (0.30).
- **The forgiving tree rule.** Either T2 opens T3, and you never lose the other branch (Steam "How do upgrades work?").
- **Elemental chains that read on screen**, such as Frost Fire, Overload, and Spark with SMGs plus Lightning. "OP Builds" and "Spark is OP" are full of players sharing these, and they describe enemies dying a minute after they stopped firing as a highlight.
- **High-risk, chaotic builds** like "embrace the chaos", Tome of Glass and Stand your Ground tripled with Specialize, where move speed falls by about 58%.
- **Movement-scaling builds** like Kunoichi, Wind evolutions, and Salvo Knife with move speed (Salvo thread).
- **Adapting to RNG** is satisfying to some players. They pushed back against full rerolls (dev thread).

## What players hate
- **RNG decides the run.** The review aggregate notes that if the build does not come together, skill cannot save the run. Players asked for rerolls and banishes, weighting toward the current build, a "locked" tree that always appears, and a lower repeat chance for perks they keep skipping (dev thread replies).
- **Random character-chest upgrades** feel unbalanced and frustrating, and the dev agreed. Tomes are often useless for the current build.
- **Dominant elemental on-hit builds, especially Freeze.** The dev nerfed them in 0.6.3 ("on-hit elemental builds are the easiest") and again in 1.0. Players call Frost near-mandatory at high Darkness. In 2024 the dev named the freeze upgrades "overpowered in almost every build."
- **Dead or trap picks**: Soothing Warmth (a 1-in-2000 chance to heal), the Magnetism tree (the dev said it does not make interesting builds), Blazing Speed (the dev said it does too little), and Death Rounds ("spreads build thin").
- **Too easy once it snowballs.** "Almost impossible to lose after a couple of upgrades", and repetition is the top negative theme (0.26).
- **Anti-synergy**: summons kill enemies before Salvo Knife can lock onto them, and Split Fire broke lock-on for one player.

## Dev changes (chronological)
- **2022-05 (10MTD):** Unlock paths shown in the UI. Synergies announced for 20MTD, with Frost Fire as the first example. Pyro Mage and Fire Starter swapped so the simpler one appears earlier.
- **0.6.3:** Elemental on-hit builds nerfed (Frostbite 35→15% max HP, Shatter 25→10%) and pure-gun upgrades buffed, because on-hit elemental builds were too dominant. Electro Mage now targets near the cursor, which players praised.
- **0.7.6:** Holy Arts and Dark Arts trees added together with 5 synergies. Their prerequisites included new upgrades (Ritual, Justice, Angelic), so new trees were introduced *already wired* to old trees.
- **0.8.5:** Bounce changed to ricochet toward the nearest enemy, because bullets bouncing back hid the player sprite (a readability fix). Getting hit now knocks enemies away instead of pushing the player around.
- **0.9.0:** Summoning rework. Magic Daggers removed. Summon damage now scales off player stats (bullet damage, move speed, Max HP). Soul Hearts added as alternative HP.
- **1.0:** Weapon evolutions at level 20 (1 of 3 per weapon), 6 new tomes, "cheat death" runes replaced, Freeze duration halved, Death Rounds lost its HP cost, Gun Mastery buffed.
- **2023-11:** The dev said new perks dilute the pool, so synergies are the preferred way to add content. He was open to RNG mitigation and to letting players choose the character upgrade.
- **2024-01 and 2024-03:** Rerolls planned as standard for everyone. Weak perks (Blazing Speed) to be reworked. Endless to become a "loop" with a separate pool of stackable upgrades.
- **2024-10 "Blessings & Curses" (closed beta):** Pick 1 of 3 **Blessings** at early levels, from strong stat boosts to unique versions of upgrades. Tomes become chest **Curses** with rarities: common curses are stat trade-offs, rare curses change how the character plays. Character upgrades become a 1-of-3 **specialization** instead of random chest drops. All purchased runes active. Magnetism and freeze perks reworked. I could not verify a public release.

## Standout designs and why

1. **Synergies are gated out of the pool.** They never dilute early offers, and they show up as a reward exactly when a two-tree investment matures. The dev used this rule to add content without adding RNG.
2. **4-node trees where either T2 opens T3.** Commitment grows the pool in your direction without locking you out. It gives players the feel of weighted offers without any visible weighting.
3. **Overload / Frost Fire (status × status).** The trigger is a state that another tree already applies, for example lightning hitting a burning enemy. Nothing new is needed visually; two existing effects collide into an explosion.
4. **Magic Lens and Focal Point.** A positional buff zone: only bullets that pass through it get the bonus. Focal Point doubles the effect but halves the area. It turns "+30% damage" into a spatial puzzle.
5. **The on-last-ammo trigger family.** One rhythm event (emptying the magazine) has 6+ upgrades from different trees hooked to it, so Mini Clip (a smaller magazine) becomes a deliberate synergy. A shared trigger hook makes unrelated cards combine.
6. **Sight Magic / Ghost Wizard ("this source now applies on-hit").** They turn an aura or a summon into a proc engine for every element tree. One card multiplies the value of several others.
7. **Stat conversion (Windcutter, Holy Spear, Tome of Wind, Wind evolutions).** "X now scales with Y" pulls normally unrelated stats into one build, which makes plain stat commons valuable again.
8. **Siege → Stand your Ground → Tome of Stillness.** A build that is defined by a movement state (standing still) and gets stronger the more you commit, with a real cost (move speed).
9. **Soul Link.** Losing a layer of HP becomes a screen-wide 80% max-HP nuke on non-bosses, so taking damage turns into an attack.
10. **Weapon evolutions at level 20.** A fixed mid-run milestone where you pick 1 of 3 rule changes for what you already use: a bullet slug (Focused Blast), edge wrap (Quantum Bolt), arrows that explode on reload (Bomb Arrows). Each one is a new verb, not a stat.
11. **Tomes as boss-only trade-offs.** Big power with a hard penalty (Glass: double damage, but one hit kills you). The dev later split them by rarity: simple trade-offs are common, playstyle changers are rare.
12. **Specialize (triple the next pick).** A meta-card that amplifies a later decision and creates memorable spikes, such as Stand your Ground tripled.

## Ideas worth transforming for Bastion

These are mappings to Bastion's pillars (`00-brief.md`), not final cards. The evidence for each is the 20MTD design above.

- **Prerequisite-gated synergy cards (from 1, 2).** Keep synergy cards out of the post-wave offer pool until their prerequisites are met. Those prerequisites can be **ship-layout facts as well as owned cards**: for example, "own the Ember card AND have an Ember tile adjacent to a Cannon" unlocks a synergy card. That is Bastion's neighbour rule, used as the gate. Give synergies a distinct frame colour, as 20MTD uses a red border.
  - **The maths needs adjusting.** 20MTD gives 20+ level-ups at ~5 choices each. Bastion gives about 19 picks at 1-of-3, so there is far less chance to see a specific synergy. Make it guaranteed: once a synergy unlocks, it appears in the next card pick. Alternatively, show "locked synergy" previews in Build mode so players can aim for them. Players' strongest complaint was that RNG decides the run.
- **Short card "trees" (from 2).** Use 2-tier chains (entry card → 1 of 2 follow-ups) rather than 4 tiers, because of the low pick count. The follow-ups enter the pool only after the entry card is taken, which weights offers toward the player's build without a visible weighting system.
- **Status-collision synergies (from 3).** Burn, chill and knockback/gravity already exist in Bastion. A card in the style of "Overload": an enemy that is burning *and* chilled shatters in a cold-fire burst, using existing VFX. It needs no new art and works directly with the Ember and Cryo neighbour rules.
- **A positional buff tile (from 4).** A Lens-style module or card: projectiles that pass over or through a marked tile, or the cell in front of it, gain damage or burn. A Focal Point follow-up doubles the effect on a smaller area. This turns grid placement (which way the weapons face, what sits in front of them) into the puzzle, and it uses the line-of-fire geometry the grid already has.
- **A shared trigger hook in place of "on last ammo" (from 5).** Bastion has no ammo. Natural rhythm events it does have:
  - the switch between thrust and coast (`updateMovement`)
  - a module detaching (`destroyTile`/`detachTile`)
  - a flame burst (Ember)
  - the start of the sweep phase (`beginSweep`)

  Pick one, for example "on coast start", and hang 3–4 cards from different families on it. Then add a synergy card that makes it trigger more often, like Mini Clip. This makes Drift flight a source of build identity, not just movement.
- **"Applies on-hit" multiplier cards (from 6).** Example: "Shield Node pulses / Repair Array ticks apply your weapons' burn or chill." This turns support modules into proc engines, so modules the player already owns become offensive without new stats.
- **Stat-conversion commons (from 7).** Examples: "Bulkhead count raises Flak damage", "ship speed raises Rail damage". These are cheap to implement through `resolveWeaponDefinition` and keep plain commons relevant. Wind-style conversion directly rewards the drift pillar.
- **Movement-state builds (from 8).** A "Siege"-style card that rewards **coasting** (no thrust input) with extra fire rate, and a stronger follow-up synergy that also slows turning. This mirrors Siege → Stand your Ground. The cost has to be real, as Stand your Ground's -25% speed is.
- **Module-loss payoff (from 9).** A Soul Link equivalent: losing a module triggers a wave-wide percentage-HP shockwave. Caution: this is close to the rejected "Sacrificial Plating". The 20MTD evidence supports the *screen-wide %HP on non-bosses* version, which feels very different from a local explosion. Only propose it if it adds that difference.
- **Module-family evolutions at a fixed wave (from 10).** At wave 10's break, the family with the most copies (or a family the player chooses) offers 1-of-3 rule-change evolutions. Examples: Rail rounds wrap at the arena edge; Missiles explode only when the wave break begins; Scatter collapses into one slug that gains +X% per pellet. This is a fixed milestone, not RNG, which answers the main complaint.
- **Boss-wave trade-off cards (from 11).** After a boss wave (Siege Ring, Pursuer, Storm Ring), offer a separate 1-of-3 "tome" set. Every option has a hard cost, e.g. double damage but modules can't be repaired during breaks. Following the dev's 2024 split, simple trade-offs are rare and playstyle-changing ones are epic.
- **Specialize-style meta card (from 12).** "The next card you pick applies three times." This is cheap to build (it re-applies a card) and creates highlight moments. It needs a per-card cap, because tripled move-speed costs reached about 58%.
- **Lessons on what to avoid:**
  - Percent-max-HP effects like Frostbite and Shatter dominated against scaling enemy HP, and they were nerfed twice. Bastion adds +8% enemy HP per wave, so %HP cards will dominate the late waves the same way.
  - Avoid trap cards like Soothing Warmth's 1-in-2000 chance.
  - Do not make random, unrerollable reward channels; the dev himself replaced them.
  - Keep any reroll cost (Matter) low enough to use, because players asked for banish and reroll above everything else.
