# Cobalt Core (Rocket Rat Games, pub. Brace Yourself Games, 2023): artifact and ship-part notes

Researched 2026-10-22. Latest version I saw: **1.2** (23–24 Jan 2025, which added a daily mode). PC release 8 Nov 2023. Steam rating: 96% positive of 3,447 English reviews. Catalogue: `catalog/cobalt-core.csv`, 108 rows. That is **93 artifacts** (the wiki's full list, including starters, ship-specific, crew-specific, boss, event and finale items), plus 4 part modifiers, 1 part-changing event and 10 Boot Sequence options.

Legend: **[C]** confirmed by a source · **[P]** a player's opinion, with link · **[I]** my inference

## Sources
- Artifact list, 93 entries. This is the main source: https://cobaltcore.wiki.gg/wiki/Artifacts
- Part types and modifiers: https://cobaltcore.wiki.gg/wiki/Ship_Parts
- Ship pages: https://cobaltcore.wiki.gg/wiki/Artemis · /Ares · /Jupiter · /Gemini · /Tiderunner
- Statuses: https://cobaltcore.wiki.gg/wiki/Status
- Difficulty: https://cobaltcore.wiki.gg/wiki/Hardmode · Boot Sequence: https://cobaltcore.wiki.gg/wiki/Boot_Sequence · Repair Yard: https://cobaltcore.wiki.gg/wiki/Repair_Yard · Extra Scaffold: https://cobaltcore.wiki.gg/wiki/Extra_Scaffold · Warp Prep: https://cobaltcore.wiki.gg/wiki/Warp_Prep
- Strategy pages for individual artifacts: https://cobaltcore.wiki.gg/wiki/Hi_Freq_Intercom · /Tridimensional_Cockpit · /Genesis · /Perpetual_Motion_Device
- Card rarity and card counts per crew: https://cobaltcore.wiki.gg/wiki/Cards
- New-player guide (map nodes and rewards): https://gamepretty.com/cobalt-core-starting-guide-for-new-players/
- Patch notes for 1.1 and 1.2 (via a Switch update tracker): https://www.perfectly-nintendo.com/?p=612481
- Steam threads:
  - Suggestions: https://steamcommunity.com/app/2179850/discussions/0/3960413699063486711
  - "Certain combos unwinnable?": https://steamcommunity.com/app/2179850/discussions/0/4137186611105332748
  - Most satisfying win: https://steamcommunity.com/app/2179850/discussions/0/4349988265831230749
  - Dizzy best character: https://steamcommunity.com/app/2179850/discussions/0/6027566653451568936
  - Cobalt Core vs Balatro: https://steamcommunity.com/app/2179850/discussions/0/4349988102757021081
- Store page: https://store.steampowered.com/app/2179850/Cobalt_Core/
- Review summary (automated, use only as a rough signal): https://vaporlens.app/app/2179850/cobalt_core.md
- Review: https://turnbasedlovers.com/review/cobalt-core-review · dev interview: https://turnbasedlovers.com/10-turns-interview/with-cobalt-core-devs/
- **Gaps:**
  - I couldn't get the full PC changelog for 1.0.x. SteamDB returned 403, the Steam news hub is rendered by JS, and Reddit is blocked. Players mention that the Riggs and Max "easy infinites" were nerfed early, but I can't name the patch or what changed.
  - The Tech Tribune making-of article returned 522.
  - The wiki's Map, Difficulty and Boot Options pages return 404. I took node structure from the guide and the Repair Yard page.
  - Effects of individual crew cards are not catalogued. That is out of scope; the catalogue covers artifacts only.
  - Some artifact rows link to the list page, not to a page for that artifact.
  - The synergy_partners column is mostly my inference [I]. It is not wiki text.

## System structure
- **Board [C]:** Combat happens on one axis. Each part of a ship fills one column. Your cannon fires straight up its lane and hits the first thing in it, which is either a midrow object (missile, drone, asteroid) or an enemy part. Enemies show which lanes they will hit by marking them in red. Moving out of a marked lane dodges the attack. The ship moves through move cards or by spending **Evade** (1 Evade buys a 1-lane shift during your turn). (Ship_Parts, Status, gamepretty)
- **Parts [C]:** Cockpit, Cannon, Missile Bay, Comms (Jupiter only, always Weak), Wings (no effect of their own) and Empty scaffolding (shots pass through it). Damage modifiers:
  - Weak: +1 damage taken.
  - Brittle: double damage taken.
  - Armored: 1 less damage taken.
  - Empty: shots pass through.
  - On Hard and Harder your cockpit is Weak; on Hardest it is Brittle. Defending your weak spot is a core skill. (Ship_Parts, Hardmode)
- **Defence layers [C]:**
  - Shield: has a cap and stays between your turns.
  - Temp Shield: no cap, gone at the start of your next turn.
  - Evade: banked movement.
  - Heat (Drake's resource): at 3 or more at end of turn you overheat, take 1 hull damage and Heat resets to 0.
  - Stun Charge: your next attack stuns the part it hits, which disables an enemy cannon.
- **Ships [C]:**

  | Ship | Hull / Shield | Layout | Starting artifacts | Unlock |
  |---|---|---|---|---|
  | Artemis | 12 / 4 | 5 wide, cannon in the centre that can't be repositioned | Cargo Hold | Unlocked from the start |
  | Ares | 8 / 4 | 2 cannons, switched by toggling; the inactive one is Armored | Ares Cannon, Control Rods (draw -1) | Win on Hard |
  | Jupiter | 12 / 4 | 6 wide, no cannon, attacks only through drones, Weak Comms | Drone Hub | Discover 40 artifacts |
  | Gemini | 11 / 4 | 2 cannons and 2 bays, which swap after every card | Gemini Core | Win without any of the 3 starting crew |
  | Tiderunner | 7 / 3 | 6 wide with 2 empty tiles in the middle | Tide Runner (edge card moves you), Mooring Line (Anchor locks movement) | Win 10 runs |

  Every ship also starts with Warp Prep (1 Shield and 1 Evade on turn 1).
- **Run [C]:**
  - A run is 3 zones, each ending in a boss.
  - Node types:

    | Node | Reward |
    |---|---|
    | Normal fight | Pick 1 of 3 cards, can be skipped |
    | Elite | 2–3 artifact options plus a card reward (Harder and above: 2 options) |
    | Artifact node | Artifact choice; Cargo Hold adds 1 option |
    | Event | Usually positive |
    | Repair Yard | Heal 50% of max hull, upgrade a card (A or B branch), or remove 1 card |
    | Boss | Boss artifact choice, more max hull and a large heal |

  - Each zone has 2 Repair Yards somewhere in the middle and a guaranteed one just before the boss.
  - From the second run on, each run opens with **Boot Sequence**: pick 1 of 3 random bonuses. One of them trades Warp Prep for a boss artifact.
- **Cards [C]:** Rarity is Common, Uncommon or Rare. Rares are more likely from bosses. You choose 3 of 8 crew per run. Each crew member has about 21–24 cards (9 common / 7 uncommon / 5 rare), and their artifacts only appear if they are aboard.
- **Artifact taxonomy [C]:**
  - Neutral commons, roughly 25.
  - Neutral bosses, 6. Most are "+1 Energy, but…" or a large trade-off.
  - Crew commons and crew bosses. Every crew member has 3–5 commons and 2–3 bosses.
  - Ship starters, plus ship boss upgrades that *replace* the starter (V2 / Booster).
  - Event and special items (Scrap Armor, Broken Glasses).
  - You are never offered an artifact you already have. Artifacts can only be lost through events.

## What players love
- **Movement as the core verb.** A reviewer calls it "a refreshing new movement element that we don't really see in the genre" [P](https://turnbasedlovers.com/review/cobalt-core-review). One player says "Without a certain amount of movement you often just lose." [P](https://steamcommunity.com/app/2179850/discussions/0/4137186611105332748)
- **Ships that play differently.** Switching cannons and a ship that fights only with drones are praised, and the drone ship is the reviewer's favourite [P](https://turnbasedlovers.com/review/cobalt-core-review).
- **Absurd synergy stacks.** "Double Ares Cannon, Books Scaling OP, Payback and Infinite shields" [P](https://steamcommunity.com/app/2179850/discussions/0/4349988265831230749). Another player answers that people listing "comically overpowered synergies" are weird, so the community is split on whether broken builds are the point [P](same thread).
- **Every crew is viable, and starter upgrades rescue runs.** "Every combo is doable on hardest." The OP's lesson: "don't ignore potential run saving upgrades" [P](https://steamcommunity.com/app/2179850/discussions/0/4137186611105332748).
- **Crew-specific artifacts.** Max's are called "best in class" [P](https://steamcommunity.com/app/2179850/discussions/0/6027566653451568936).

## What players hate
- **Too little content, artifacts repeat:** "more artifacts, i run into so many doubles already" [P](https://steamcommunity.com/app/2179850/discussions/0/3960413699063486711). Limited content is the most-weighted complaint in the review summary [P](https://vaporlens.app/app/2179850/cobalt_core.md).
- **Difficulty that only takes choices away:** Hardest offering 1 artifact option "is bad design - it's unfun" [P](https://steamcommunity.com/app/2179850/discussions/0/3960413699063486711). Another player wants harder modes without trash cards, hull cuts or fewer artifact choices [P](same).
- **Too easy, or too dependent on the roll:** one player calls it "not nearly as challenging" as FTL or Slay the Spire. Another says building a deck "feels a lot more RNG dependant" [P](https://steamcommunity.com/app/2179850/discussions/0/4349988102757021081).
- **Some kits are opaque.** One player on Max and Books: "I can't for the life of me figure out what you're supposed to do" [P](https://steamcommunity.com/app/2179850/discussions/0/6027566653451568936).
- **Balance swings toward defence.** Some players find dodging and defence too easy once an evade or shield engine is online [P](https://steamcommunity.com/app/2179850/discussions/0/4349988265831230749). Players say Riggs's evasion is "OP" and makes shields unnecessary [P](https://steamcommunity.com/app/2179850/discussions/0/6027566653451568936).

## Dev changes
- **1.1 [C]:**
  - Added 6 enemies: 1 normal per zone, a zone-2 elite, and alternate bosses for zones 1 and 2.
  - Promoted Duncan's Mining Drill from normal to elite, because it killed players more often than any other non-boss fight.
  - Added **Chaff Emitters**, the only artifact added since launch.
  - Renamed "Draw Less Next Turn" to Shaken. (https://www.perfectly-nintendo.com/?p=612481)
- **1.1.1 [C]:** a balance test lowered Tiderunner's hull by 1, to 7 (https://cobaltcore.wiki.gg/wiki/Tiderunner).
- **1.2 [C]:**
  - Daily mode with a shared seed and 1–3 modifiers. Some modifiers shuffle enemy parts at the start of a fight; some give a free boss artifact.
  - The Release card became a dual card. (same source)
- **Early infinites [P]:** players say the easy Riggs and Max infinites were nerfed soon after launch (https://steamcommunity.com/app/2179850/discussions/0/6027566653451568936). I don't have the exact changelog.
- **Design intent [C]:** cards that proved too complicated could become artifacts instead (https://turnbasedlovers.com/10-turns-interview/with-cobalt-core-devs/).
- **[I]:** The artifact pool has hardly grown since launch (1 artifact added). That fits the "doubles" complaint.

## Standout designs and why
1. **Tridimensional Cockpit [C]:** your cockpit becomes Empty and you lose half your max hull. It deletes your weakest part from the silhouette, so a centred volley passes through a hole. The trade is huge on Hardest, where the cockpit is Brittle. [I] It is the best example in the game of an artifact that **changes your shape, not your numbers**.
2. **Hunter Wings [C]:** your wings become Empty if you end the turn with unspent Energy. [I] The ship's footprint now depends on the turn, and a resource you would normally spend now buys a narrower target.
3. **Ares Cannon V2 / War Mode [C]:** you get a second firing point instead of +damage. [I] Every per-attack bonus (Overdrive, Piercer, Powerdrive) doubles, which explains the "Double Ares Cannon" stories.
4. **Gemini Core and Tide Runner [C]:** card order controls which part is active, or which way you move. [I] They tie the action you choose to where you are in space, which makes the hand a positioning tool.
5. **Hi Freq Intercom [C]:** +2 draw per turn, but rewards show 1 fewer card and can't be skipped. [I] A boss artifact whose cost falls on **drafting**, not combat. It forces a different way of building the deck.
6. **Ricochet Paddle, Grazer Beam, Recalibrator [C]:** these reward *near* misses: a shot missing by exactly 1 lane still deals 1, and each miss draws a card. Shooting a missile sends it back instead of destroying it. [I] They turn being out of position, or the enemy's projectiles, into resources.
7. **Fracture Detection [C]:** one hidden enemy part is Brittle, and you only learn which once it is hit. [I] A cheap way to make players probe instead of always shooting the same lane.
8. **Boss artifacts that upgrade a starter instead of adding a new one (V2 / Booster) [C].** [I] Each ship gets a clear power spike that you can read, without making the pool bigger.
9. **"+1 Energy, but" bosses (Glass Cannon, Dirty Engines, Power Diversion, Thermo Reactor, Broken Glasses) [C].** [I] This is the game's weakest pattern, because six artifacts share one upside. It works only because each downside points the build somewhere different: protect a weak cannon, clear trash, go Peri-only, manage Heat, or skip healing.
10. **Genesis [C]:** converts one boss pick into three picks of 1-of-2 commons, and adds 3 junk canisters to the deck. [I] Good for players hunting one key piece of their build.

## Ideas worth transforming for Bastion
All of these are [I] unless marked otherwise. Each is mapped onto Bastion's pillars: the grid, combos, drift, swarms and the 20 waves.
1. **Hollow Frame (from Tridimensional Cockpit and Extra Scaffold).** Replace one chosen module with an *empty strut*. It keeps the grid connected for the detach check, but enemy shots pass through it and it can't be destroyed. Cost: lose maximum structure, or that tile. This changes how you build, because you can now route a fragile branch through "unhittable" links so that losing a module can't cut off the core. Lesson: give it a real cost. Cobalt Core's half-hull cost is what makes it a decision.
2. **Folding Wings (from Hunter Wings).** Outer-edge modules retract when you are not thrusting, or while you drift above a speed threshold, and stop firing and stop being hittable. The ship gets narrower when you commit to drifting. It rewards a positioning skill and lets swarms pass through. Fits pillar 3.
3. **Twin Barrel / War Mode (from Ares Cannon V2).** A rare card: your largest weapon cluster fires from a mirrored point on the opposite edge, or one chosen weapon gains a second muzzle on the far side of the grid. Every per-shot combo (Ember ignite, Cryo+Rail Shatter) doubles without a +% stat. Watch the multiplicative stacking: Cobalt players call the double-Ares stacks "comically" overpowered.
4. **Near-Miss economy (from Grazer Beam, Recalibrator, Ricochet Paddle).**
   - *Grazer*: enemies that pass within N px of a Bulkhead take chip damage.
   - *Ricochet*: an enemy projectile hitting a Bulkhead's 3x3 bounces back instead of being absorbed.
   - *Recalibrate*: when an auto-fire volley misses, the next Rail shot charges faster.

   These turn skilful close passes into a resource, which suits drift flight.
5. **Hidden Fracture (from Fracture Detection).** Bosses spawn with one random Brittle segment that is revealed when hit. This pushes players to circle the boss and probe angles instead of parking in one spot. It fits pillar 4 and is cheap to build.
6. **Starter-upgrade boss cards (from V2 / Booster).** A wave-10 or wave-20 card evolves an existing combo rule instead of adding a new one, for example "Reactor boosts its 5x5 instead of its 3x3, but no longer self-powers" or "Bulkhead's 3x3 also blocks detachment once per wave". The power spike is easy to read and the card pool stays small.
7. **Draft-side costs (from Hi Freq Intercom).** An epic card pays you now and limits later breaks. For example: "+1 module slot every break, but future breaks offer 2 cards and can't be skipped." This changes how you build without touching combat numbers.
8. **Lane-locked effects (from Radar Subwoofer, Gemini Core).** A module buffs only what is directly in front of a specific part, such as a Cryo directly ahead of a Rail. Bastion's grid already has geometry, so "in front of" and "behind" can be card text instead of only "adjacent".
9. **Lessons to avoid:**
   - Don't ship six variants of "+1 Energy, but". If several rares share an upside, each downside must push a different build.
   - Hard modes shouldn't just cut reward choices. Players named that as unfun.
   - Watch for infinites from per-event resource refunds; Cobalt's had to be nerfed [P].
   - Never offer a card the player already owns. Track owned cards so a 20-wave run doesn't show doubles; Cobalt's ~25 neutral commons drew "doubles" complaints.
   - Make opaque kits readable in-game. Players got lost in the Max and Books kits.
