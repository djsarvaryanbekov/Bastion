# Modular-ship peers: what sells the "build a ship from parts and fight with it" fantasy

Research date: 2026-11-11. Web search and page fetches only; no game was played.

## How to read this

Labels used on every claim:

- **[S]** sourced fact, with URL.
- **[C]** community opinion (Steam reviews, reader comments, press opinion), with URL.
- **[I]** my inference.
- **[M]** from memory, not re-verified today.

Limits you should know about:

- **Review numbers come from three places that do not agree exactly.** The Steam store page (English-only count and %), the Steam `appdetails` API (`recommendations.total`, all languages, US price), and SteamSpy (positive/negative totals). Each figure says which.
- **Store-page prices fetched by my tool were regional, not US.** US prices below are from the `appdetails` API with `cc=us`. Where I only have the regional figure I say "US price not verified".
- **I could not see images or trailers.** "What the page leads with" is therefore the short description, the first trailer's title, the press blurbs and the section order. Anything about imagery is marked [M].
- **Review "weights" from vaporlens.app** are a third-party machine summary of Steam reviews (relative frequency scores, not percentages). Treat them as a rough ranking of themes.
- **Direct quotes are almost entirely paraphrased.** My tooling limits verbatim quoting of fetched pages, so each opinion carries the reviewer handle, hours and a link to the page where the wording sits. One press blurb is quoted verbatim (TerraTech Legion).
- Rock Paper Shotgun and PC Gamer article bodies were blocked or truncated, and Reddit was not reachable.

---

## 1. Galaxy Siege 1–3 (Flash / mobile)

**Facts.** Galaxy Siege (Flash, reviewed 19 Apr 2013) and Galaxy Siege 2 (reviewed 1 Oct 2014) are by Vasiliy Kostin. JayIsGames reader ratings were 3.5/5 (88 votes) and 4.2/5 (73 votes) [S: https://games.jayisgames.com/review/galaxy-siege.php , https://games.jayisgames.com/review/galaxy-siege-2.php]. Galaxy Siege 2 reached iOS and Android in Oct 2014, free with IAP that unlocks modules faster [S: https://www.pocketgamer.com/galaxy-siege-2/play-galaxy-siege-2-if-you-fancy-building-a-spaceship-to-shoot-lots-of-cartoon-a]. Galaxy Siege 3 is listed as browser + Android with a MyPlayYard package id; the Google Play link returned 404 today [S: https://alternativeto.net/software/galaxy-siege-3/about/]. **No reviews, ratings, install counts or a developer credit for Galaxy Siege 3 were found.** None of the three is on Steam as far as I could find.

**Loop and build cadence.** Fly a mission with auto-firing weapons and auto-collection, run out of fuel or warp out, return to a shop/engineering station, spend what you gathered on modules, repeat against bigger enemies. Building is strictly **between missions** [S: both JayIsGames reviews; PocketGamer].

**Praise.** The appeal is planned, piece-by-piece upgrading; the reviewer says planning matters more than the fighting [C: https://games.jayisgames.com/review/galaxy-siege.php].

**Complaints.**
- In GS1, module position has no gameplay effect apart from weapons and grabbers, so the ship ends up as a featureless slab [C: same review].
- Readers call GS2 slow and non-interactive because guns aim themselves, and complain about replaying levels many times to afford one section [C: https://games.jayisgames.com/review/galaxy-siege-2.php].
- Unclear whether shields or speed upgrades do anything [C: same].
- PocketGamer frames it as a simple, repetitive back-and-forth for people who like that cycle [C: PocketGamer link above].

**Why it matters for Bastion [I].** Your source inspiration was liked for the buy-a-tile loop and criticised for exactly two things: placement that does not matter, and combat that plays itself. Neighbour combos and drift steering are direct answers to both.

---

## 2. Captain Forever, Captain Forever Trilogy, Captain Forever Remix

**Facts.**
- Captain Forever: Farbs (Jarrad Woods), browser/Flash, 2009; won Best Game at IGF China 2009 [S: https://en.wikipedia.org/wiki/Captain_Forever].
- Captain Forever Trilogy: Steam, 22 May 2018, Farbs. 141 reviews, 86% positive (store page, 2026-11-11). US list price not verified; trackers show $9.99 [S: https://store.steampowered.com/app/758930/Captain_Forever_Trilogy/].
- Captain Forever Remix: Pixelsaurus Games + Future Crayon, Early Access March 2015, 1.0 on 3 Jun 2016, $9.99 US. 320 reviews, 78% positive, "Mostly Positive" (2026-11-11) [S: https://store.steampowered.com/app/298560/Captain_Forever_Remix/ , https://store.steampowered.com/api/appdetails?appids=298560&cc=us].

**Loop.** One life, escalating enemies. Kill a ship, its surviving modules float free, grab them and bolt them onto your command core. The Trilogy page stresses there is no separate editor and that everything is physically simulated, so design changes flight and combat [S: Trilogy store page]. Remix adds a 10-stage race across the Solar System and a cartoon wrapper [S: Wikipedia].

**Build cadence.** **Mid-combat, in real time.** Remix reviewers describe a build timer of about 80 seconds and no pause [C: https://steamcommunity.com/app/298560/negativereviews/].

**Store lead.** Remix leads with its spaceship-builder-roguelike label, plunder-enemies-for-parts, and press lines from PC Gamer, RPS and Retromation (the FTL-meets-Lego comparison) [S: Remix store page]. PC Gamer scored it 80 [S: https://opencritic.com/game/2814/captain-forever-remix].

**Praise.** Space Lego; scavenging mid-fight; lasers that form a tune as they fire; a grandparent can pick it up [C: https://steamcommunity.com/app/758930/reviews/].

**Complaints (Remix, vaporlens weights).** Unfair difficulty spikes 0.68; unbalanced enemies and passive circling 0.60; repetitive 0.55; thin content 0.53; punishing build timers 0.46; sluggish inertia controls with no mouse aim 0.45; ships fall apart too fast 0.44; cartoon tone seen as a downgrade from the original 0.41 [C: https://vaporlens.app/app/298560/captain_forever_remix.md]. Individual reviews: the ship breaks as easily as it is built (tursel, 2.2 h); 20 minutes of careful building erased in seconds (Meep, 17.9 h); salvage usually arrives damaged (mipper, 1.7 h) [C: negative reviews link above]. Trilogy: you can lose more parts while attaching than you gain (Mithaldu); building discourages bigger ships (clasplit, 10.5 h) [C: Trilogy reviews link].

---

## 3. Space Scavenger (2021) and Space Scavenger 2 / "Galactic Scavenger"

**Facts.**
- Space Scavenger: Red Cabin Games (solo dev, Sweden), Early Access 12 Jun 2020, 1.0 on 20 Aug 2021, $12.99 US, 290 reviews, 86% positive (2026-11-11) [S: https://store.steampowered.com/app/1040460/Space_Scavenger/ , appdetails API].
- The sequel is **not released**. Its Steam app (1962010) is currently titled "Galactic Scavenger", status "Coming soon", no price, no reviews [S: https://store.steampowered.com/app/1962010/]. The demo (29 Aug 2024) has 24 reviews, 91% positive [S: https://store.steampowered.com/app/3029210/Space_Scavenger_2_Demo/]. A third-party site's $24.99 figure is unconfirmed.

**Loop.** Top-down action roguelite. Scavenge modules, fight through procedurally generated sectors ending in bosses. Sequel adds module upgrades, run-long "gadgets" that create elemental synergies, between-run unlocks via Science, sector route choice, and local split-screen co-op [S: sequel store page].

**Build cadence.** **Mid-run, drag and drop.** The sequel page says to drop modules on and keep fighting [S]. The first game also stops at workshops between levels [C: Matt4905 review, https://steamcommunity.com/app/1040460/reviews/].

**Store lead.** The pitch is building outlandish modular ships; tags lead with Action Roguelike, Twin Stick Shooter, Local Co-Op, Colorful [S]. Humour-forward (a giant hammer in space) [S: search snippet of the Steam page].

**Praise (first game).** Customising makes each build feel like the player's own (illenialwheeler, 244 h); simple, addictive loop; cute and catchy [C: reviews link].

**Complaints (first game).** Endless mode does not feel endless because you keep stopping at a workshop; early finds decide the run; brutal curve with no real meta progression; unlocks mostly cosmetic; runs short; priced high for the content [C: reviews link].

**Not found.** No press hands-on and no readable Steam reviews of the sequel demo (the review page redirected).

---

## 4. Nova Drift (not a grid, but the top "build a ship" roguelite)

**Facts.** Chimeric, published by Pixeljam. Early Access 2019 [M], 1.0 on 12 Aug 2024. $17.99 US list (seen at 50% off, $8.99). 13,058 recommendations (appdetails API); Steam store shows "Overwhelmingly Positive", 96% of 9,174 English reviews; SteamSpy 12,492 positive / 565 negative (95.7%), 200k–500k owners, median playtime 8.7 h (all 2026-11-11) [S: https://store.steampowered.com/app/858210/Nova_Drift/ , https://store.steampowered.com/api/appdetails?appids=858210&cc=us , https://steamspy.com/api.php?request=appdetails&appid=858210].

**Loop.** Asteroids-style thrust-and-drift arena shooter. Pre-determined waves and bosses; runs of roughly 20–40 minutes [C: https://vaporlens.app/app/858210/nova_drift.md].

**Build cadence.** **Level-up picks, mid-run, paused.** First picks are weapon, shield and hull type; later picks are mods from branching trees with rerolls [C: https://rogueliker.com/nova-drift-review/ ; Steam reviews].

**Store lead.** Short description sells ARPG depth inside arcade combat. First trailer is the 1.0 launch trailer; a "Ship Evolutions" video is also on the page. Press blurbs: Game Informer on the level of ship customisation, Hardcore Gamer, Manablast [S: store page, appdetails movies list].

**Praise.** Build variety is the top theme (0.53); a strong pull to replay; audio; a build goes from idea to payoff in about thirty minutes (klokinator, 232 h) [C: vaporlens; https://steamcommunity.com/app/858210/reviews/]. Niche Gamer 8/10 [S: https://opencritic.com/game/18493/nova-drift].

**Complaints.** **Controls are the single biggest negative (0.40)**, plus learning curve (0.18) and controller support (0.18) [C: vaporlens]. Negative reviews: refunded over thrust controls (lyutkin, 0.6 h); too much momentum (spiralwarrior, 32 h); died fighting the controls, not the game (Ellye, 11 h); slow start before waves threaten (fredex); too drawn out for a score chaser (Etchasketch); grind for super mods (pkt-zer0) [C: https://steamcommunity.com/app/858210/negativereviews/]. Rogueliker calls the movement the most divisive element [C].

---

## 5. Cosmoteer: Starship Architect & Commander (non-roguelite ceiling)

**Facts.** Walternate Realities (self-published). Early Access since 24 Oct 2022, still Early Access. $19.99 US. 12,143 recommendations; store shows "Very Positive", 94% of 7,681 English reviews, recent 84% of 79; SteamSpy 11,423 / 720 (94.1%), 500k–1M owners, median playtime 17.4 h (2026-11-11) [S: https://store.steampowered.com/app/799600/ , appdetails API, SteamSpy]. 144k wishlists at launch, 74k units in week one, almost 300k units in just over three months, 5.7% refunds [S: https://newsletter.gamediscover.co/p/deep-dive-how-cosmoteer-became-a].

**Loop.** Design ships tile by tile (rooms, corridors, crew paths), command them in real-time physics battles, salvage, grow a fleet in a procedural galaxy; co-op and PvP; creative mode [S: store page].

**Build cadence.** **Out of combat, in a full editor**, any time between fights.

**Store lead.** Ship design first, then individually simulated crew, then ships that break apart under targeted fire. Blurbs are from YouTubers (Splattercat, SovietWomble, Lathland), not magazines [S: store page].

**Why it sold [S, dev and analyst].** Years of free public builds that created a community; crew simulation making interior layout matter; streamer coverage; Next Fest and TactiCon; co-op [S: GameDiscoverCo].

**Praise.** Deep ship building is the top theme (0.87) [C: https://vaporlens.app/app/799600/cosmoteer.md].

**Complaints.** No story or endgame 0.26; thin career 0.19; late-game lag. Negative reviews: everyone converges on ion beams and top ships look alike (27 h); design stagnant at the high end (633 h); tired of clicking so much (31 h); outcomes predictable (8.8 h) [C: https://steamcommunity.com/app/799600/negativereviews/].

---

## 6. Reassembly

**Facts.** Anisoptera Games, published by Indie Voyage, 19 Feb 2015, $14.99 US. 3,623 recommendations; store "Very Positive", 94% of 2,444 English reviews; SteamSpy 3,727 / 233 (94.1%), 200k–500k owners (2026-11-11) [S: https://store.steampowered.com/app/329130/Reassembly/ , appdetails API, SteamSpy].

**Loop.** Open procedural galaxy, not a roguelite. Collect resources, unlock blocks, design ships within a point budget, build a fleet, conquer territory. Other players' ships populate your galaxy asynchronously [S: store page].

**Build cadence.** **Out of combat, in an editor.**

**Store lead.** Vector graphics and particles first, then procedural universes, then a designer pitched as easy to use, soundtrack, physics that give ships weight [S: store page].

**Praise.** Ship behaviour is calculated from the design (thrust, mass, thruster placement) rather than assigned (natesternberg, 56 h); waking up with a ship idea and building it (masakari24); Workshop sharing; soundtrack 0.33 [C: https://steamcommunity.com/app/329130/reviews/ ; https://vaporlens.app/app/329130/reassembly.md].

**Complaints.** Balance 0.67; no endgame 0.55; abandoned 0.51; floaty controls 0.43; parts misalign 0.31. **A plain square packed with weapons and shields beats creative designs** (Einhart, 50.9 h); most design time spent fighting the fit of parts (Phezzan, 39 h); the end state is a deathball mopping up [C: https://steamcommunity.com/app/329130/negativereviews/].

---

## 7. 2024–2026 releases that mix grid/modular building with survivors-like or wave roguelite

### 7a. TerraTech Legion (the closest commercial success)

**Facts.** Payload Studios, published by Mythwright, 30 Apr 2026, $9.99 US, on Game Pass. 2,183 recommendations; store "Very Positive", 86% of 1,151 English reviews, recent 90% of 40 (2026-11-11) [S: https://store.steampowered.com/app/3596700/TerraTech_Legion/ , appdetails API]. Spin-off of TerraTech (SteamSpy 19,140 / 1,542, 92.5%).

**Loop.** Bullet heaven on four planets, ~30-minute runs, two timed bosses per run, endless mode after 15 stars; between runs you upgrade per-character skills [C/S: https://www.thexboxhub.com/terratech-legion-review/ , https://www.gamesasylum.com/2026/04/30/terratech-legion-review/].

**Build cadence.** **Mid-run on level-up.** Three block choices with rerolls, then free placement with unlimited time; weight, balance and weapon arcs matter [S: gamesasylum, thexboxhub, https://www.gamingonlinux.com/2026/05/terratech-legion-is-an-awesome-modular-vehicle-building-survivor-like-out-now/]. Whether the world fully pauses was not confirmed; one reviewer says bosses seem to keep acting during the menu (esh, 59 h).

**Store lead.** PC Gamer blurb: "your own deadly LEGO car into Vampire Survivors" [S: store page]. First video is the launch trailer.

**Praise.** Vehicle assembly is the top theme (0.93); the builder does not bog the game down (MyNameMeansBentNose, 132 h); building breaks up the action nicely (GamingOnLinux, 4/5) [C: https://vaporlens.app/app/3596700/terra_tech_legion.md ; https://steamcommunity.com/app/3596700/reviews/].

**Complaints.** Sluggish handling 0.66; difficulty/progression 0.61; grind 0.49; a meta favouring small high-damage builds 0.43; no mirror tool 0.43. The layout puzzle turns into busywork after the learning phase and weight barely matters once wheels touch (Gaia Rai, 24 h); most blocks sit unused (lies, 47 h); moving one block means tearing down and rebuilding from memory (VM04); **unlocking more parts dilutes the pool and makes builds worse** (mondomau 127 h, Big Slim 37 h, TheUnk0wnDead); you get buried in enemies and cannot read the screen (TheXboxHub) [C: https://steamcommunity.com/app/3596700/negativereviews/].

### 7b. Cloudbreaker (grid bullet heaven, small launch)

Ballast Games, 15 Sep 2026, $12.99 US. **38 reviews, 86% positive** about eight weeks after launch (2026-11-11) [S: https://store.steampowered.com/app/3620890/Cloudbreaker/]. Bullet heaven + inventory puzzle: level-up produces engine parts that you slot into the airship's grid; adjacency links and directional firing arcs matter; each ship has its own grid shape; scrap from skipped picks upgrades modules [S: https://www.gamingonlinux.com/2026/10/cloudbreaker-review-bullet-heaven-meets-inventory-management/]. Praise: little else like it, weapon customisation unusually deep. Complaints: slow start, learning curve, generic upgrades, shapes give few combination effects, not enough grid space [C: GamingOnLinux; https://steamcommunity.com/app/3620890/reviews/]. Press attention (GamingOnLinux 4/5, store blurbs) did not convert into volume.

### 7c. Hull Rupture (wave + shop, one week old)

Konfa Games, published by tinyBuild, 4 Nov 2026. **269 reviews, 72% "Mostly Positive"** after seven days [S: https://store.steampowered.com/app/4358660/]. Tower-defence roguelite on a growing ship: add hull sections anywhere, each new section creates a new enemy path; a shop opens **after every wave** [S: https://report.wand.com/previews/hull-rupture-preview]. Praise is for art, animation and charm. Complaints are almost all about the post-wave shop: random packs decide the run, a run is known to be lost by wave 5–9, the demo's choose-your-item shop was better than the release's packs [C: https://steamcommunity.com/app/4358660/reviews/]. US price not verified.

### 7d. Others found

| Game | Release | Reviews seen (2026-11-11) | Building | Source |
|---|---|---|---|---|
| NIMRODS: GunCraft Survivor | EA 28 Oct 2024, $12.99 | 1,850, 86%; recent 95% | One gun per run, 7 slots, branching tiers; not spatial | https://store.steampowered.com/app/2086430/ |
| Monsters are Coming! Rock & Road | 20 Nov 2025 (Raw Fury) | ~2,400–2,530, ~80% (trackers) | Towers on a moving city; grid placement not confirmed | https://steampulse.org/game/2934220 |
| eXoSpace Combat Engineer | EA Sep 2025; store date 22 Sep 2026, $14.99 | 184 recommendations; % not re-verified (84% of 37 on an older tracker) | Gridless snap editor between missions | https://store.steampowered.com/app/2876200 |
| Starforged Legacy | EA 1 Jun 2026 (Tripwire Presents) | 196, 88% | Ship classes + augment picks; no placement found | https://store.steampowered.com/app/3353390/Starforged_Legacy/ |
| Star Survivor | 2023 | ~555, 69% Mixed (tracker) | Not grid as far as found | https://nodal.gg/game/star-survivor-2060750 |
| Modulea | 23 Apr 2025, $2.19 regional | **No user reviews** | Inventory-shape modules on a battleship, waves | https://store.steampowered.com/app/3606980/Modulea/ |
| Void Salvage | 11 Aug 2026 | Not found | Slot-limited modules that can break; auto-battler | https://voxodyssey.com/games/void-salvage/ |
| Nimbatus (older comparator) | 2020 | SteamSpy 1,665 / 424 (79.7%) | Drone editor | https://steamspy.com/api.php?request=appdetails&appid=383840 |

eXoSpace reviewers repeat the Reassembly complaints: parts leave gaps, efficient designs lack diversity, nothing built carries between missions [C: https://steamcommunity.com/app/2876200/reviews/]. Unreleased or unverified leads: Void Reaver (backpack-grid bullet heaven), Backpack Roguelike, Arcane Overdrive. **I found no released 2024–2026 game that matches Bastion's exact mix** (edge-attached grid ship + neighbour combos + part loss + drift flight + wave/card structure).

---

## Cross-game findings (all inference unless a source is given)

### Which building cadence players respond to best

Ranked by how the evidence reads:

1. **Mid-run, on a trigger, with unlimited time to place** (TerraTech Legion, Cloudbreaker; Nova Drift for picks without placement). This is the only cadence in the sample that is praised for *improving* pacing, and it carries the highest-rated roguelites here. The cost shows up late in a run: when the ship is large, each placement becomes a re-layout chore.
2. **Out-of-combat editor** (Cosmoteer, Reassembly). Highest ceiling and longest playtimes, but it is a different product: the editor is the game, and both titles are criticised for having nothing to do with the ship once built.
3. **Real-time under fire** (Captain Forever family, Space Scavenger). Produces the purest "scrap pilot" fantasy and the most affection, and also the lowest scores: timers, no pause and net part loss are the recurring reasons for a thumbs-down.
4. **Fixed shop between waves or missions** (Galaxy Siege, Hull Rupture, Space Scavenger's workshops). Easiest to understand. Complaints cluster on stop-start pacing and on a random shop deciding the run early.

For Bastion: buying tiles mid-run sits in tier 1 as long as placing is paused and takes one gesture. The 20-wave card pick sits in tier 4 and inherits its two risks. Keep the between-wave stop short, and make sure a bad offer cannot lose a run by itself.

### How these games make the ship feel like "mine"

- **Layout changes behaviour, visibly.** Reassembly (handling computed from thrusters and mass), Captain Forever (full physics), TerraTech Legion (tail-heavy builds wheelie), Cloudbreaker and TTL (directional firing arcs). Galaxy Siege 1 is the counter-example: no placement effect, so every ship is the same slab.
- **Parts have a history.** Captain Forever parts are torn off enemies; that origin story is what reviewers remember. Bought tiles lack it, so combos and losses have to supply the story instead.
- **Loss, in moderation.** Break-off parts are the signature of Captain Forever and Cosmoteer. They are also the most common Captain Forever complaint when loss outpaces gain. Loss reads as drama when the player can rebuild within a minute and as futility when 20 minutes vanish in one hit.
- **A readable silhouette and a distinct art signature.** Reassembly's vector look and Nova Drift's glow are named in praise; Remix's cartoon restyle is named in complaints by fans of the original.
- **Sharing.** Workshop and async ship sharing extend Reassembly and Cosmoteer for years. Not relevant to a run-based game beyond a "share my final ship" image.

### Common failure modes

- **Optimal blob.** Reassembly's packed square, Cosmoteer's ion-beam ships, TTL's small high-damage builds. Counters seen in the sample: firing arcs, mass affecting handling, adjacency rules that reward shape, per-ship grid outlines.
- **Unreadable ships and screens.** TTL (buried in enemies), Nova Drift (clutter at high intensity). A wide ship plus grouped swarms makes this worse.
- **Building as a chore.** No mirror tool, teardown to move one block (TTL); parts that do not fit (Reassembly, eXoSpace); heavy clicking (Cosmoteer).
- **Pacing breaks.** Constant workshop stops (Space Scavenger); slow first minutes (Nova Drift, Cloudbreaker, TTL); mission timer ending as the build comes online (TTL).
- **Unlock dilution.** More permanent unlocks made TTL runs feel more random. Directly relevant to a Hangar.
- **Inertia controls.** The top complaint for Nova Drift (a 96% game), and a recurring one for Captain Forever Remix and Reassembly. Some players refund within the hour.
- **Passive combat.** Auto-fire with nothing to do was the core Galaxy Siege complaint.

### Market reality

Rough tiers, all as seen 2026-11-11:

| Tier | Reviews | Titles | What they had |
|---|---|---|---|
| Ceiling | 12k–20k | TerraTech, Nova Drift, Cosmoteer | Years of public development, deep systems, large communities |
| Strong | 1.8k–3.6k | Reassembly, Monsters are Coming, TerraTech Legion, NIMRODS | Known IP or publisher, or a one-line hook tied to a known genre |
| Typical | 140–320 | Captain Forever Remix, Space Scavenger, Hull Rupture (week one), Starforged Legacy, eXoSpace, CF Trilogy | Solo or small team, niche awareness |
| Miss | 0–40 | Cloudbreaker, Modulea | Grid idea present, little reach |

What separates hits from misses in this sample:

- **A hook stated as "known thing + your own built thing".** TTL's Lego-car-in-Vampire-Survivors line and Remix's FTL-meets-Lego line do the selling. Cloudbreaker's pitch (bullet heaven plus inventory management) describes a system, not a fantasy.
- **Building is the first thing shown and named.** Cosmoteer, TTL and Reassembly all put the builder ahead of combat in the page order.
- **Consequences on screen.** Ships breaking apart (Cosmoteer), vehicles tipping over (TTL). An inventory grid in a side panel does not deliver the same promise.
- **An audience before launch.** Cosmoteer's free builds and 144k wishlists; TTL's parent franchise and Game Pass. Cloudbreaker had good press and 38 reviews.
- **Price.** The run-based hits sit at $9.99–$17.99.

Honest read: a solo grid-ship roguelite lands in the "typical" tier by default. The two games that escaped it did so on reach (IP, publisher, years of community), not on mechanics alone.

---

## Data gaps

- Galaxy Siege 3: no reviews, ratings, release date, developer credit or install data found.
- Space Scavenger 2 / Galactic Scavenger: unreleased, no price, no readable demo reviews, no press hands-on.
- Whether TerraTech Legion and Cloudbreaker fully pause during placement: not confirmed.
- Store-page imagery and trailers: not viewed.
- US prices for Hull Rupture, Starforged Legacy, Captain Forever Trilogy: not verified.
- Reddit, Rock Paper Shotgun and PC Gamer article text: not reachable.
- Steam tag browsing ("games like" lists) was only reachable through search results, so the 2024–2026 list is unlikely to be complete.
