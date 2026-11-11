# GUNBOAT-8 — whole-game profile

Researched 2026-11-11 (web only). Companion to the upgrade/rune catalog notes in `research/cards-2026-10-21/notes/gunboat-8.md` — the catalog is not repeated here.

Labels: **[S]** sourced (URL given) · **[C]** community opinion (URL given) · **[I]** my inference · **[?]** could not be found / verified

## Evidence limits (read first)
- The full game is **not released**. Everything players have touched is the free demo (Steam) and an older itch.io playtest. All sentiment is demo sentiment.
- **Steam review text could not be re-read today.** The `appreviews` JSON endpoint redirected to the Steam homepage on every attempt. Only counts (store page + review histogram) were readable. Review-text themes below are carried from the 21 Oct pass (16 reviews read then). The 31 reviews posted since — including the single negative one (30 Oct) — are **unread [?]**.
- No trailer, screenshot or video could be viewed (YouTube pages return titles only; no image viewing). Section 3 is built from text evidence and is the weakest section.
- Press kit body (impress.games) did not load; two facts from it come from a search-engine snippet only.
- Reddit is blocked. The dev's r/IndieDev post is known only via an AUTOMATON article and a Steam forum retelling.
- SteamDB returned 403. No wishlist, follower or concurrent-player numbers were found **[?]**.

## 1. Facts

| Item | Value | Label |
|---|---|---|
| Developer / publisher | Orange Acorn Games (self-published). Posts signed "Matt"; itch account `matt_neave`; Reddit `mattdoesdev` | [S] https://store.steampowered.com/app/4783980/ · https://matt-neave.itch.io/gunboat-8 · https://automaton-media.com/articles/newsjp/20261014-473469/ |
| Team | Dev writes "we / the team". Music by Kubbi. Team size not stated [?]. "London-based" appears only in a search snippet of the press kit | [S] itch page · snippet of https://impress.games/press-kit/orange-acorn-games/gunboat-8 |
| Engine | Not stated for this game [?]. Dev's YouTube channel blurb (search snippet) says self-taught dev building in Godot; the itch build runs as HTML5, consistent with a Godot web export | [I] from https://www.youtube.com/@OrangeAcornGames + itch page |
| Previous game | Holding Pattern (minimal incremental; released on Steam 22 Apr 2026, ~750 wishlists at launch) | [S] https://bsky.app/profile/orngacrn.bsky.social |
| Dev time | About five months, per a streamer who knows the dev | [C] https://indiecator.org/2026/10/31/steam-next-fest-2026-october/ |
| Platforms | Full game page: Windows only. Demo: Windows + macOS (Mac requirements "TBD"). itch playtest: HTML5 in browser + Windows download (co-op only in the download). Steam Deck: broken at demo launch, fix attempted, status unknown | [S] Steam appdetails API for 4783980 and 5213390 · itch page · https://steamcommunity.com/app/4783980/discussions/0/588439235122542734/ |
| Price | None announced [?]. EA text says price "may increase" after Early Access | [S] store page |
| Release state | "Coming soon", tagged Early Access. Store: planned 2026. Press kit snippet / AUTOMATON: Q4 2026. EA planned to last 1–2 months, launching with "over 20 weapons" | [S] store page · AUTOMATON |
| Demo release | 30 Sep 2026 (Steam). Press kit snippet says 1 Oct | [S] https://store.steampowered.com/app/5213390/ |
| itch playtest | Announced 13 Jun 2026; v0.0.2 on 25 Jun; last build 4 Jul 2026. Rated 4.9/5 from 8 ratings | [S] itch page |
| Steam reviews (demo), seen 2026-11-11 | **47 reviews, 97% positive** (46 up / 1 down). Last 30 days: 40 reviews, 97% ("Very Positive"). All-time label "Positive". Full game: 0 reviews (unreleased) | [S] store page · https://store.steampowered.com/appreviewhistogram/5213390 |
| Review pace | Weekly ups: 3 → 7 → 6 → **15** (Next Fest week of 21 Oct) → 10 (+1 down) → 5. Slowing since early Nov | [S] histogram URL above |
| Tags | Bullet Heaven, Action Roguelike, Roguelite, Arena Shooter, Perma Death, Arcade, Roguelike, 2D, Controller, Multiplayer, Online Co-Op, Co-op, Gun Customization, Loot, **Minimalist**, Replay Value, Stylized, Top-Down Shooter | [S] store pages |
| Players | 1–4, online + LAN co-op, full controller support | [S] appdetails |
| Languages | 29–30 listed. A dev forum reply is signed "Google translate"; AUTOMATON says Japanese is only partial in the demo | [S] appdetails · https://steamcommunity.com/app/4783980/discussions/0/563671642446881943/ |
| Size / specs | 200 MB, 1 GB RAM, graphics requirement literally "Potato" | [S] appdetails |
| Run length | Winning runs averaged ~70 min (60–120) before 7 Oct; retargeted to **35–50 min** | [S] Steam news feed https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=4783980&count=40&maxlength=0 |
| Content (demo) | 7 ships, 3 captains with skill trees, 80 upgrades at launch (+20 items/runes/skills on 14 Oct), 7 special missions, 2 difficulties enabled (a further one added 12 Oct), endless mode, "all the bosses" (count not stated [?]), 2 special post-game modes | [S] news feed |
| Press | No critic reviews; Metacritic "tbd". One Next Fest roundup (Indiecator), one AUTOMATON news story | [S] https://www.metacritic.com/game/gunboat-8/ |

## 2. Core loop and run structure

### Second-by-second (in a battle)
- You steer one ship; every weapon fires on its own. The store pitch is that you "only steer". **[S]** store page
- Steering includes **drifting** to dodge. Movement is the only real-time input. **[C]** Indiecator; **[S]** v0.4.4 notes ("reworked drift handling")
- The arena is a single bounded 16:9 screen with a border (changed from 16:10 on 11 Oct). Some ships enable **islands** in the arena, which block paths and are used by certain weapons (Raiders). **[S]** news feed · https://steamcommunity.com/app/4783980/discussions/0/588439600673863841/ · Bluesky 26 Jun post
- Enemies arrive in waves: ships, planes, landmine layers, artillery that used to hug the arena edge, fast Bomber rushers, tanky Haulers/Breachers. Kills drop scrap pickups (which now expire), XP and occasional chests. **[S]** news feed
- Chests give modifiers mid-battle. Bosses arrive on boss waves, staggered 3 s apart, with fewer adds. **[S]** news feed
- **[I]** Net moment-to-moment decision: where to point the hull so the right slots face the right threats, when to drift, and whether to detour for scrap before it expires. There is no aiming and no ability button that sources mention.

### Run shape
- A run is a **voyage** split into acts on a node map. Each node is a battle of several waves (per-stage wave counts after 7 Oct: 3/4/5/6/8). **[S]** news feed
- Node types: normal, **'!'** (harder, double reward), pink **'?'** special missions (Escort, Hold, Cargo, Land Attack, Storm + 2 more; reward items the shop never sells). **[S]** news feed
- After each battle: **shop** (weapons, modifiers, runes, rerolls, merging). The economy has **interest** on banked money. **[C]** Indiecator (only source for interest)
- Runs can be suspended and resumed (added 25 Jun on itch). **[S]** https://matt-neave.itch.io/gunboat-8/devlog/1563654/put-down-pick-up-v002
- End: finish the voyage (win) or lose the ship (perma-death tag). After a win you may continue into **endless mode**, "exponentially" harder, with surrender allowed and a Next Fest leaderboard. **[S]** news feed

### How the boat is built during a run
- The ship has a fixed set of weapon slots (8 on the title ship). You do **not** add hull pieces; you fill, merge and re-arrange slots. **[S]** dev reply on itch (name = 8-bit + eight slots)
- Growth axes: buy weapons → merge duplicates to higher tiers (merge refunds 1 scrap) → socket runes onto single weapons → stack passive modifiers → recruit defeated bosses and frigates as allies. **[S]** news feed · store page
- Slot position matters only lightly (adjacency for Crow's Nest, side-firing Broadside). **[S]** news feed
- **[I]** Compared with Bastion: this is Brotato's six-slot model with light positional rules, not a spatial module grid. The ship silhouette does not change with the build, and losing parts is not a mechanic.

### Meta progression
- 7 unlockable hulls; 3 captains who level up and spend skill points in their own trees; a log book that records special-rarity finds; difficulty tiers. **[S]** news feed
- No meta currency is named in any source **[?]**. Unlocks appear to be achievement/XP-driven **[I]**.

### Economy
- In-run currency: scrap/money from kills, bounties and wave clears; interest; rerolls; selling unwanted rewards. **[S]** store page · **[C]** Indiecator · forum
- Greed rune now scales exponentially per scrap earned. **[S]** v0.4.4
- Drop chance decays within a stage (anti-snowball). **[S]** 7 Oct notes

### Difficulty scaling
- Named difficulty tiers (a YouTube run is titled "Drizzle difficulty"), 2 in the demo at launch, one added 12 Oct. **[S]** news feed · https://www.youtube.com/watch?v=A7s4cDDQ4Kk
- Enemy damage scaling was cut 10% on 12 Oct. Incoming damage is capped at 60% max HP per 0.3 s. **[S]** news feed
- Dev's stated intent for the lowest tier: "We want you to feel overpowered". **[S]** 11 Oct notes

## 3. Visual and audio presentation
Text evidence only — nothing was viewed.

- **Style:** 2D top-down, tagged Minimalist and Stylized by the dev. The name plays on 8-bit, but the dev says it "isn't technically 8-bit". System requirement is "Potato"; install is 200 MB. **[S]** store tags · itch dev reply
- **[I]** This points to simple flat/low-detail sprites on open water, not detailed pixel art. Unverified.
- **Readability work the dev had to do after launch:** landmines made more visible; coloured damage numbers per status; statuses shown on boss bars; Cursed Rose self-poison got an icon; snowball overlap cleaned up; Breacher attack indicator *removed*; items renamed "to improve readability". **[S]** news feed
- **Juice:** screen shake and controller vibration were **reduced** on 19 Oct, and vibration got an off switch — the launch amount was too much for some players **[I]**. Game-over screen names your MVP weapon. **[S]** news feed
- **Resolution:** integer-style scaling ("cleaner, crisper image") and a 16:9 arena with a border. **[S]** 11 Oct notes
- **UI:** shop with a secondary stats panel (added 7 Oct), status cards that reflect modifiers, an in-game roadmap and feedback form. Shop density is the most repeated UI complaint (see §4). **[S]** news feed
- **Audio:** chiptune-adjacent soundtrack by Kubbi; praised. Ambience toggle exists. An audio drop-out bug is open (see §4). **[S]** itch page · **[C]** forum
- **Store page leads with:** the line "Arm the GUNBOAT-8 and set sail…", then two looping clips captioned around loot ("Find epic loot…") and scrap spending, then four feature bullets (captain a ship / crazy builds / conquer the seas / recruit allies). One "Official Trailer", 10 screenshots. **[S]** appdetails
- **Marketing hooks used by the dev:** "What if Brotato captained a warship?"; an "ocean themed Brotato". **[S]** Bluesky
- **YouTuber title hooks:** weapon synergies ("…Are Insane!"), "Most Fun I've Had in Ages", captain fantasy. All four videos found are small channels; two are labelled dev requests. View counts unreadable **[?]**. **[S]** https://www.youtube.com/watch?v=RCJw1gA8lq4 (M&L Gaming Bros) · https://www.youtube.com/watch?v=pQfvJUdfs4g (Slick Gaming) · https://www.youtube.com/watch?v=cOkplV74hHI (SparkyTim) · https://www.youtube.com/watch?v=A7s4cDDQ4Kk (The Real Syed)

## 4. Player sentiment

### Praise
| Theme | Recurrence | Evidence |
|---|---|---|
| Build variety / synergies; ramming as a real build | Recurring | 21 Oct review pass; YouTube titles; Indiecator: "slick and creative" [C] https://indiecator.org/2026/10/31/steam-next-fest-2026-october/ |
| Dev responsiveness | Recurring | "dev still reading community thread" [C] https://steamcommunity.com/app/4783980/discussions/0/588440207635857772/ ; dev replied, usually within a day, in at least 5 of the 10 player-started threads; the unanswered ones are all from 25 Oct onward [S] https://steamcommunity.com/app/4783980/discussions/ |
| Generosity of the demo | Recurring | Thread "The demo is the full game." urges people to buy anyway [C] https://steamcommunity.com/app/4783980/discussions/0/563671642446897362/ |
| '?' objective stages as a break from wave-clearing | Recurring (small sample) | "greatly enjoy the ? levels" [C] https://steamcommunity.com/app/4783980/discussions/0/588440437425989012/ |
| Music | Recurring | itch comments, 21 Oct review pass [C] https://matt-neave.itch.io/gunboat-8 |
| Co-op with friends | Recurring | 21 Oct review pass [C] |
| "Fun and arcady" feel | One-off | [C] itch comment (tuna521) |

### Complaints
| Theme | Recurrence | Evidence |
|---|---|---|
| Shop is overwhelming; wording unclear; wants tutorial/better UI | Recurring | itch (tuna521) + 21 Oct review pass [C] |
| Hull balance: starting ships uneven; title ship has no advantage | Recurring | "seems underwhelming" (hectojoule), Coolcatsaves [C] itch page |
| Burst/spike enemies (Bomber: "too fast to out run at base speed") | Recurring → patched | [C] Bomber thread above |
| Objective stages punish some builds (ram hull vs fixed turrets) | Recurring | [C] '?' thread |
| Weak allies on special missions | One-off → dev promised buff | [C] https://steamcommunity.com/app/4783980/discussions/0/588440207635937127/ |
| Audio cuts out; fixed by players via 48 kHz sample rate, no confirmed patch | Recurring (4 users) | [C] https://steamcommunity.com/app/4783980/discussions/0/706660344651808050/ |
| Mac↔Windows co-op blocked by version mismatch | Recurring (2 users), no dev reply | [C] https://steamcommunity.com/app/4783980/discussions/0/563671642446979890/ |
| Steam Deck not working at launch | Dev-reported | [S] Steam Deck thread |
| Graphics rated low / wants more detail | One-off | [C] itch (ultimafreak) |
| itch download flagged unsafe | One-off | [C] itch |
| Controller: wants either stick to steer; audio device selection | One-offs, unanswered (Nov) | [C] https://steamcommunity.com/app/4783980/discussions/0/565924517973818525/ |
| Drift-reliant hull (Banana Boat) disliked | One-off (21 Oct pass); drift reworked 23 Oct | [C]/[S] |

### Notable facts about the audience
- A forum post relays the dev saying on Reddit that the demo is "basically the full game" and one player logged 67 hours; the dev worried the paid release would disappoint. **[C]** second-hand, thread above. Original post not reachable **[?]**.
- Opt-in telemetry showed one player with a 19 h 47 min session and ~150 legendaries per run via an unknown cheat; dev shrugged it off as single-player. This is the game's only mainstream-press mention. **[S]** AUTOMATON
- Forum activity is thin: 12 threads total in six weeks, last post 6 Nov. **[S]** https://steamcommunity.com/app/4783980/discussions/
- **[I]** 47 demo reviews after Next Fest is a small footprint. High approval here measures a few dozen engaged players, not market validation.

## 5. Patch / dev history

| Date (2026) | Version | Notable change | Stated reason |
|---|---|---|---|
| 13 Jun | Announcement | Move from Holding Pattern to a naval Brotato/SNKRX-like; itch playtest | Wants to "inject our own taste into the genre" [S] |
| 25 Jun | itch v0.0.2 | Suspend/resume runs; feel and balance tweaks | Feature was the point of the release [S] |
| 30 Sep | Steam demo | 7 ships, 3 captains, 80 upgrades, in-game roadmap + feedback form + opt-in telemetry | "still early in development" [S] |
| 7 Oct | First major update | '?' missions; shop stats panel; [ADRIFT]/[UNIQUE] tags; **waves per stage cut, XP raised**; drop-chance decay; dodge/armour hard cap → diminishing returns | Runs were ~70 min, "longer than we anticipated"; chance stacking was "an unintended favourable strategy"; the 60% cap created "undesirable items" once reached [S] |
| 11 Oct | v0.2.1 | Arena 16:10 → 16:9; crisper scaling; Bomber nerf; Buccaneer/pirate buffs | 16:9 is more common; win rate for Buccaneer/pirate "significantly below" expectation; overall win rate too low [S] |
| 12 Oct | Big balance patch | Merge refunds 1 scrap; new difficulty; enemy damage scaling −10%; frigates buffed | Not given [S] |
| 14 Oct | v0.3.0 | +15 items, 4 runes, 1 skill; bosses staggered 3 s; 60%/0.3 s damage cap; status effects halved; proc chances cut; penalties removed from two items; renames | "breathing room"; "to improve readability" [S] |
| 19 Oct | Endless mode (Next Fest) | Endless + leaderboard; 7 missions; "special" rarity; MVP weapon on game over; statuses on boss bars; **less screen shake/vibration**; fewer adds on boss waves; scrap pickups expire | Status rework "to help with balancing and scaling"; called the last major demo update [S] |
| 23 Oct | v0.4.4 | **Drift handling reworked**; UI polish; burn/toxin/bleed re-tuned; Greed rune exponential; surrender in endless; many co-op fixes | "balance them more fairly" [S] |
| after 23 Oct | — | No further Steam announcements found. SteamDB (search snippet) shows a store update on 4 Nov | [?] |

Source for all rows except 25 Jun: the Steam news feed URL in §1.

Pattern **[I]**: five patches in 17 days, each undoing a launch assumption (run length, hard caps, hidden downsides, spike damage, shake). The dev tunes from win-rate telemetry and says so publicly.

## 6. Inference

### Five lessons for a modular-ship swarm game
1. **Measure winning-run length before trusting the design.** GUNBOAT-8 shipped at ~70 min and had to cut to 35–50 by removing waves and raising XP. Bastion's 20-wave mode should have its real median winning time logged and checked against the intended run length.
2. **Replace hard stat caps with diminishing returns.** The 60% dodge/armour cap turned later offers into dead picks. Any capped Bastion stat (fire rate, shield, Matter gain) will do the same to its card pool.
3. **Objective waves earn praise only if every build can finish them.** '?' missions were the most-liked addition and also the source of "my ram ship can't do this". A Hold/Escort wave in Bastion must be passable by a short-range or drift-heavy grid.
4. **Make the weakest difficulty feel strong early, and cap burst damage.** Low win rates forced an early-power pass, a 60%/0.3 s damage cap, staggered bosses and thinner boss waves. These rails came before more content.
5. **Readability and restraint beat extra juice in a swarm.** Post-launch work was all subtraction or labelling: less shake, visible mines, coloured status numbers, statuses on boss bars, renamed items. Also: drift as a mandatory skill on one hull drew complaints and a handling rework — relevant because Bastion makes drift universal.

### Three weaknesses a competitor could beat
1. **The ship is not really built.** Eight fixed slots, light adjacency, no hull growth, no part loss. A true spatial grid with detach and visible silhouette change is a deeper and more showable hook than "Brotato on a boat".
2. **Shop clarity and onboarding.** Overwhelming shop, unclear wording and rarity that doesn't track value have been reported since June and are still the top UI complaint. Exact numbers, before/after and no dead offers would be a visible advantage.
3. **Thin reach and rough edges.** 47 reviews after Next Fest, no critic coverage, minimalist look that one player marked down, unresolved audio drop-outs, Mac/Windows co-op mismatch, Steam Deck trouble, and a demo that already contains most of the planned paid content with only a 1–2 month Early Access behind it.
