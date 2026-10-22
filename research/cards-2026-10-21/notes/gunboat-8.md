# GUNBOAT-8 (Orange Acorn Games / Matt Neave) — upgrade-system notes

Researched 2026-10-21. The demo has been out for 3 weeks. There is no wiki, no Steam guides, and no press previews or Reddit threads the search could find. The trailer's YouTube page did not load. **Nearly all mechanical detail comes from the dev's Steam patch notes, plus 16 demo reviews and 7 forum threads.** Item effects are mostly *not* public. The patch notes give only names and number changes.

Legend: **[C]** confirmed by a source · **[P]** a player's claim · **[I]** my inference

## Sources
- Store page (full game): https://store.steampowered.com/app/4783980/
- Demo page (released 30 Sep 2026, 16/16 positive): https://store.steampowered.com/app/5213390/
- Dev patch notes, 7 posts from 14 Jun to 19 Oct 2026. These are the main source: https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=4783980&count=30&maxlength=0 (the same posts are on https://store.steampowered.com/news/app/4783980)
- Demo reviews (JSON): https://store.steampowered.com/appreviews/5213390?json=1&filter=recent&num_per_page=100&language=all&purchase_type=all
- Forum threads: Broadside runes https://steamcommunity.com/app/4783980/discussions/0/706660083369716607/ · '?' stages dev feedback https://steamcommunity.com/app/4783980/discussions/0/588440437425989012/ · Raiders https://steamcommunity.com/app/4783980/discussions/0/588439600673863841/ · Bomber https://steamcommunity.com/app/4783980/discussions/0/588440207635857772/ · Frigate allies https://steamcommunity.com/app/4783980/discussions/0/588440207635937127/
- itch.io playtest (Jun–Jul 2026) with player comments and dev replies: https://matt-neave.itch.io/gunboat-8 and its devlogs
- Not reachable or empty: press kit (impress.games, body didn't load), Steam guides (none), YouTube trailer description, Discord (not public).

## System structure
- **Loop [C]:** Brotato on the sea. The dev names Brotato and SNKRX as the inspirations. You steer and the ship auto-fires. Battles are made of waves. Killing enemies earns scrap/money and bounties. Between battles a **shop** sells weapons, modifiers and runes, with rerolls (Lootbug gives a free one). Chests dropped in battle give modifiers.
- **Run shape [C]:** A voyage is split into acts and the map has node choices. Stage wave counts were cut on 7 Oct (4→3, 6→4, 8→5, 10→6, 12→8). The goal was to bring an average winning run down from about 70 min to 35–50 min. The map has **'!' nodes** (double reward, harder fight) and pink **'?' special stages**: Escort, Hold, Cargo, Land Attack and Storm, 7 in all by 19 Oct. These reward legendary or **special-rarity** items that the shop never sells, and the items are recorded in a **log book**. Endless mode unlocks after a completed run.
- **Hull and slots [C]:** The title ship has **8 weapon slots**. The name plays on 8-bit and the 8 slots. There are 7 unlockable hulls (GUNBOAT-8, Brig-4, Buccaneer, Speed Boat, Dreadnought, Rammer, Banana Boat). Slot **position matters**:
  - A player mounts guns at the stern to hit pursuers **[P]**.
  - Crow's Nest counts *adjacent* [PIRATE] weapons **[C]**.
  - Broadside is a two-part side-firing weapon with limited rotation, and "placement made more forgiving" **[C]**. This implies some kind of slot/facing placement step **[I]**.
- **Merging [C]:** Weapons merge into higher tiers, T4 at least. A merge refunds 1 scrap. Some weapons gain a *new property* at T4 (Foghorn T4 applies Vulnerable; Shark Net T4 has its own behaviour). The rule "two identical weapons of the same tier make one of the next tier" is **[I]**, assumed from Brotato and not documented.
- **Runes [C]:** Runes socket onto one weapon and change how it behaves. The one documented example is **Lifebuoy**: on a Stungun, the weapon detaches and floats, slowing enemies from one side. Rune strength is a stat (Seaweed: +20% rune effect). On a Broadside, a rune applies to both halves. The dev admits "runes" is an odd name for a naval game.
- **Tags [C]:**
  - [PIRATE] is a family tag that other items read.
  - [ADRIFT] means the weapon fires at a random location.
  - [UNIQUE] means extra copies don't stack.
- **Rarities [C]:** Rare and legendary (Poison Vial moved from legendary to rare), plus special. Players say the rarity colour doesn't always match an item's value.
- **Allies [C]:** Beaten bosses can be recruited (the store names Blackbeard and aircraft carriers). Frigate allies and an ally submarine that fires flares also exist. Some builds use summoned squids or sharks ("outsource your weaponry to an army of sharks").
- **Meta [C]:** There are 3 captains. Each levels up and earns skill points for a unique skill tree (Blastbeard, Extra Blasters). Ships unlock between runs.
- **Statuses [C]:** Burn, bleed (%HP), toxin (stacking, max 5), frost (40% slow), vulnerable. On 19 Oct they got coloured damage numbers, and boss bars now show statuses.
- **Defensive rules [C]:**
  - Incoming damage is capped at 60% of max HP per 0.3 s.
  - Dodge and armour use diminishing returns combined with Luck instead of a hard 60% cap.
  - Bosses spawn 3 s apart, and boss waves have fewer enemies.
  - Chest and scrap drop chance decays within a stage to stop "chance snowballing".

## What players and previewers say
There are no press previews. These come from 16 reviews, ~6 itch comments and 7 threads.

**Love**
- Build variety and "no single way to deal damage". **Ramming** works as a real alternative to guns, and the Rammer hull is a favourite.
- Runes that **change behaviour**. The Lifebuoy/Stungun discovery is called out by name.
- Weapon synergies.
- Stacking power fantasies: Boarding Pike stacks took one player past 400% weapon damage.
- The music (Kubbi), and co-op with friends.
- '?' stages: one player always seeks them out, even when the reward is unusable, because it can be sold. They break up the wave-clear monotony, and the player wants more event types.

**Hate**
- The shop is overwhelming. Item wording is unclear, and it sometimes offers only unaffordable or only cheap items.
- Balance spikes: the Machine Gun on-hit proc, Bastion if found early, an extreme difficulty jump between levels, and the early Bomber enemy, which is fast and bursty and can't be outrun at base speed.
- The Banana Boat's heavy reliance on drift handling.
- Weak frigate allies on escort missions.
- Ram builds stuck on fixed-turret missions.
- Bugs, and players asking for patch changelogs.

## Dev statements
- **Run length [C]:** Winning runs averaged about 70 min. The dev cut waves per stage to target 35–50 min and raised XP gain to compensate.
- **Early power [C]:** Win rates were below expectations overall and for the Buccaneer and pirate weapons. The dev wants the lowest difficulty to "feel more powerful early".
- **Chance snowballing [C]:** Drop chances now decay as drops accumulate within a stage. Players had found that 3–5% chance was enough to snowball.
- **'?' stages [C]:** The dev calls them unbalanced. Bastion is too strong and Storm too easy, while others can be near-impossible for some builds. The dev openly asked whether to keep them.
- **Downsides removed [C]:** Treasure Map lost its weapon-damage penalty and Man-O-War lost its shield penalty. Cursed Rose's self-poison got a visible icon. **[I]:** Hidden or confusing downsides were testing poorly.
- **Island-dependent items [C]:** Raiders only appears in the shop on runs with islands. Before that fix it showed up as a dead item on islandless runs.

## Standout designs and why
1. **Lifebuoy rune: the weapon leaves the ship.** A rune that changes a weapon's *spatial role* (it becomes a drifting area-denial emplacement) instead of its numbers. It is the single most-cited "rune is not a stat" example, and exactly the kind of uniqueness the Bastion brief asks for.
2. **Crow's Nest: tag-counted adjacency.** A non-weapon item placed in the slot grid grows from neighbours that share a family tag. It's a cheap rule that makes *placement* a build decision. The dev buffed it and then retuned it, so it is a live lever.
3. **T4 adds a property, not just numbers.** Foghorn T4 gets Vulnerable, and Shark Net T4 gets a rework. A merge becomes an unlock moment and not only "+damage".
4. **Merge refunds a scrap.** It softens the "two copies for one slot" cost and rewards consolidating.
5. **Risk nodes and objective stages between waves** ('!' double reward, '?' Escort/Hold/Cargo/Land/Storm). They give the wave break a choice and vary the objective. Hold in particular forces the player to stay in place, which turns movement skill around.
6. **Recruit the boss you beat.** The reward for a boss is the boss itself as an ally. It reuses existing art and turns a threat into power.
7. **Kill-condition stacking (Boarding Pike).** A permanent stack is earned only by one-shot kills. That ties the item to specific weapons (high single-hit damage) and gives a visible number that climbs over the run.
8. **Anti-snowball and anti-spike rules** (drop decay, 60%/0.3 s damage cap, diminishing dodge/armour, staggered bosses). These aren't cards, but they are the guard rails that let wild cards exist without breaking runs.

## Ideas worth transforming for Bastion
Each idea below is a transformation of a confirmed GUNBOAT-8 mechanic. Overlap with ideas already rejected for Bastion is flagged so the developer can judge.

1. **"Castaway" rune-card, from Lifebuoy + Bastion's existing detach.** Mark one module. When it is cut off or shot loose, it doesn't drift away dead. Instead it stays as a free-floating turret or emitter for N seconds: Cryo becomes a chill field, Ember a fire patch, Flak a point-defence buoy. Hooks: `detachTile`/`destroyTile`. It turns module loss, a core Bastion pillar, into a tactical tool, and the VFX already exist (rings, fire, cold).
2. **Tag adjacency, from Crow's Nest.** Give Bastion module families tags (Thermal, Cryo, Kinetic, Energy). A rare card makes a support module (Bulkhead/Reactor/Shield Node) gain +X per orthogonal neighbour with a chosen tag. This extends the existing neighbour rules instead of inventing a new system. Hook: `validPlacement` adjacency scan in `resolveWeaponDefinition`. Caution: the rejected "Twin Link" and "Edge Battery" were similar in spirit. The difference here is that the evidence says *tag-counted* adjacency on a non-weapon piece is what works.
3. **Fusion card, from merging + T4 property.** Two edge-adjacent copies of the same module can be fused into one cell, freeing a grid slot. The fused module gains a *new property* rather than a multiplier (Rail pierces, Cryo freezes outright, Flak gains knockback). Partial Matter refund like the scrap refund. Hooks: Build `placePurchasedModule`, `moduleSellRefund`.
4. **Wave-break choices, from '!' and '?' nodes.** At the card pick, add an optional "Bounty Wave" (next wave harder, double Matter) or an objective wave: Hold a zone, which is anti-drift and forces positioning, or Escort a salvage hulk, which uses enemy art. Rewards are a special-rarity card pool that isn't in the normal offering. Hooks: `startWave`/`completeWave`. Endless mode stays untouched as long as this is gated to the 20-wave mode.
5. **Recruit the boss, from boss allies.** After beating Siege Ring, Pursuer or Storm Ring, offer an epic card that turns a scaled-down copy into an escort. Siege Ring could orbit the ship, Pursuer could hunt the nearest swarm, and Storm Ring could pulse arcs. No new art is needed.
6. **One-shot stacking, from Boarding Pike.** A card that permanently adds +1% damage to a weapon *family* whenever a module of that family kills an enemy in one hit. It pushes Rail/Cannon builds against swarms of small enemies and shows a growing counter. Hook: `killEnemy` with a check that the enemy died from full HP.
7. **Stern guns, from the "rear slots vs chasers" player claim.** Bastion is a top-down drift game where chasers come from behind. A card could make modules on the rear edge of the grid fire backwards with a bonus while the ship is coasting. Note: overlaps the rejected "Firing Line" and "Drift Gunnery". The only new evidence is one player's claim that slot position mattered to them.
8. **Guard rails to copy regardless of cards:**
   - Drop or bonus decay within a wave if any card adds chance-based Matter. GUNBOAT-8 had to fix "chance snowballing".
   - A burst-damage cap per short window for swarm spikes.
   - Stagger boss spawns.
   - Avoid dead offers: GUNBOAT-8 offered Raiders on runs without islands. Bastion should not offer, for example, Cryo-neighbour cards when the player owns no Cryo.
   - Keep downsides visible. GUNBOAT-8 removed or iconified hidden penalties.

**Weight of evidence:** GUNBOAT-8 is young and lightly documented, with 16 reviews and no wiki. Treat it as a source of *structural* ideas (runes that change role, tag adjacency, merge-unlocks, risk/objective nodes, boss recruits). It can't validate specific card numbers.
