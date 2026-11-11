# Bastion — genre-framing fit (research notes, 2026-11-11)

Scope: which genre framing fits Bastion (top-down grid-of-modules ship, auto-fire, drift flight, swarms, 20 waves of 30–60 s with build/card breaks, bosses at 5/10/15/20, Endless mode, Fragments meta in a Hangar; flat 2D, HTML/JS, Steam intended, solo + one sound designer, no publisher).

## How to read this file

Every claim carries one of these labels:

- **[S]** sourced — a URL is given.
- **[C]** community opinion — a URL is given; it is opinion, not data.
- **[I]** inference — my reasoning, not something a source states.
- **[M]** from memory — general knowledge not re-verified in this session. Treat as unverified.
- **[NF]** not found — I looked and did not find it.

Method limits (read before trusting any number):

- Web search/fetch only. Steam store pages and the Steam review API could not be fetched directly (requests were redirected to the store front page). **All review counts, % positive, prices and release dates in the tables come from raijin.gg**, a third-party tracker, pages stamped **2026-11-11 (UTC)**.
- raijin.gg "copies" and "gross revenue" are **modelled estimates** (it labels them "medium confidence"). Where developer figures exist they are sometimes much higher: The King is Watching — raijin ~246K copies vs publisher-reported 500K+ in March 2026; Sir, We Have an Orc Problem — raijin ~128K now vs developer-reported ~128K one week after launch. Treat raijin unit/revenue numbers as rough, probably low.
- raijin shows the **1.0 date** for Early Access graduates, not the first paid release. EA start dates I add are [M] unless sourced.
- Several prices were captured while a sale banner was visible, so "price" may be a sale price. Flagged where raijin itself was ambiguous.
- Player praise/complaint summaries come from vaporlens.app, an automated review summariser. Its "weights" are relative mention frequency, not percentages of reviews.
- Reddit was read through a mirror (reddit.sentinel-team.org), not Reddit itself.

---

## 0. Market context (applies to all four framings)

| Claim | Label / source |
|---|---|
| Steam Niche Index, releases 1 Jan – 27 Sep 2026 vs same weeks of 2025: **Bullet Heaven 329 vs 65 (+406%)**, **Idler 1,566 vs 626 (+150%)**, **Tower Defense 402 → 652 (+62%)**, Action Roguelike 1,505 vs 957 (+57%), Roguelike Deckbuilder 316 vs 164 (+93%). All of Steam grew 45%. | [S] https://www.steampageanalyzer.com/blog/steam-niches-2026-filling-fastest |
| Same source, share of games released Jan 2024 – Jun 2025 that reached 1,000 reviews: **Bullet Heaven 13.1% of 107**, **Tower Defense 3.5% of 810**, Action Roguelike 3.5% of 1,849; all-Steam rate 4.2%. Idler rate not given. | [S] same URL |
| Caveat stated by that source: "Bullet Heaven" only became an official Steam tag in the **May 2026 tag overhaul**; the +406% and the 13.1% are inflated by re-tagging of older, already-successful games. | [S] same URL; tag announcement also at https://rogueliker.com/bullet-heaven-fest-steam-tags/ |
| Same source: unreleased pages dated within the next 90 days — Bullet Heaven 102 (vs a "normal" 26 per 90 days in 2025), Idler 314 (vs 235). | [S] same URL |
| Roguelike/roguelite releases per year: 432 (2021) → 1,926 (2025); Steam roguelite revenue ~$400M in 2025. The author argues the top of the distribution captures nearly all of it, and that systemic-build and management-adjacent roguelikes break through more often than action-roguelite clones (no figure given for the latter claim). | [S] https://recognizingpatterns.substack.com/p/the-roguelite-cull-hasnt-happened (19 Jul 2026) |
| GameDiscoverCo, hit-game tags 2021 → 2025: Roguelite is the #1 tag among new games with >50k units; **Idler rose 46 places to #15**; median price of hits fell from $19.99 to $16.99. Survivors-like, tower defense and auto-battler are not broken out. | [S] https://newsletter.gamediscover.co/p/how-have-the-genres-of-hit-pc-games (25 Aug 2026) |
| WN Hub headline: idle games on Steam grew fivefold in two years (body paywalled). PC Gamer headline: 54 idle games released on Steam in one week, "many look eerily similar" (body not retrievable). | [S] https://wnhub.io/news/stores-and-publishing/item-50959 (27 May 2026); https://pcgamer.com/gaming-industry/steam-week-in-review-54-idle-games-released-on-steam-last-week-and-many-look-eerily-similar |
| "Incremental" reportedly replaced "Clicker" as a Steam tag in the 2026 overhaul. | [C] r/incremental_games thread surfaced by search; not independently verified |
| A full review-count distribution or median revenue for 2024–2026 survivors-likes. | **[NF]** — only the 13.1%-of-107 figure above, which is biased upward |

---

## A. Survivors-like / bullet heaven

### Representative games (raijin.gg, seen 2026-11-11)

| Game | Price | Release (raijin = 1.0) | Reviews | % pos | Est. copies / gross | Run length | Content |
|---|---|---|---|---|---|---|---|
| Vampire Survivors | $4.99 | 20 Oct 2022 (EA Dec 2021 [M]) | 266,635 | 98% | ~6.5M / ~$26M | 30 min [M] | 100+ h [M] |
| Brotato | $4.99 | 23 Jun 2023 (EA 2022 [M]) | 120,028 | 96% | ~3.0M / ~$11.9M | 20 waves of 20–90 s [S: brotato.wiki.spellsandguns.com/Waves] | very long, many characters [M] |
| 20 Minutes Till Dawn | $4.99 (raijin also shows $2.99) | 8 Jun 2023 | 29,196 | 90% | ~744K / ~$3.0M | 20 min (title) | — |
| Halls of Torment | $6.66 as listed (may be a sale price) | 24 Sep 2024 | 31,978 | 95% | ~822K / ~$4.4M | 30 min [M] | — |
| Deep Rock Galactic: Survivor | $12.99 | 17 Sep 2025 (EA Feb 2024 [S]) | 48,594 | 86% | ~1.24M / ~$9.7M (devs report 2M+ on Steam [S]) | multi-stage dive [M] | — |
| Megabonk | $9.99 | 18 Sep 2025 | 107,215 | 94% | ~2.7M / ~$21.5M; peak 116,969 CCU | — [NF] | — |
| BALL x PIT | $14.99 | 15 Oct 2025 | 27,718 | 95% | ~1.15M / ~$10.3M | — [NF] | — |
| Vital Shell (solo dev) | $5.99 | 7 Jan 2026 | 1,867 | 97% | ~50K / ~$238K | — [NF] | — |
| Nordic Ashes | $9.99 | 26 Apr 2024 | 6,344 | 88% | ~165K / ~$1.3M | — | — |
| NIMRODS (gun-crafting twist) | $12.99 | 28 Oct 2024 | 1,860 | 85% | ~48K / ~$374K | — | — |
| TerraTech Legion ("Bullet Heaven Builder", block vehicle) | $9.99 | 30 Apr 2026 | 2,225 | 82% | ~64K / ~$511K | endless, run ends on failure | ~30 h by one player's guess |
| Airships: Lost Flotilla (ship-building auto-shooter, solo dev with existing IP) | $8.99 | 23 Jan 2025 | 317 | 93% | ~7.9K / ~$57K | — | — |

Sources: raijin.gg/app/1794680, /1942280, /1966900, /2218750, /2321470, /3405340, /2062430, /3741860, /2068280, /2086430, /3596700, /2858150. DRG:S sales: https://pcgamer.com/games/roguelike/deep-rock-galactic-survivor-sails-past-a-million-sold-as-developers-salute-players-ravenous-appetite-for-space-dwarf-content and the GamingOnLinux March 2026 report surfaced by search.

### Loop skeleton
One continuous timed run (15–30 min) → XP pickups → level-up choice every few tens of seconds → weapon evolutions/synergies → boss or timer end → meta currency → permanent unlocks and stat bumps → new characters/stages. [M], consistent with the games above.

### What recent entries needed to stand out
- [S] How To Market A Game, "2026 State of Bullet Heavens" (19 May 2026): Vital Shell — solo part-time dev, ~15 months, 17,826 wishlists at launch, 1,500+ Overwhelmingly Positive reviews. Differentiators named: mech theme, PSX/N64 look, licensed jungle soundtrack, an in-game strategy guide. It was then pulled into a bundle by the Vampire Survivors team. https://howtomarketagame.com/2026/05/19/2026-state-of-bullet-heavens-how-vital-shell-succeeded/
- [S] Same article's verdict: still viable for small teams, "but only if you are a dev who has released previous games and know what you are doing"; stay close to the genre's tropes; expect "a year or so" of development; it is **more competitive than idle games**, and beginners are steered toward idle instead. It lists the launches a new entry must match: Monsters are Coming!, Shard Squad, GOD FORSAKEN, TerraTech Legion, Grind Survivors.
- [I] The 2025 breakouts changed the bar by adding a dimension rather than content: Megabonk (3D movement), BALL x PIT (brick-breaker hybrid, established publisher), DRG:S (known IP + mining). The $5 flat-2D "more weapons" entry no longer reaches the top band.

### Typical price
[S, raijin] $4.99 was the 2022–23 norm (VS, Brotato, 20MTD). 2024–26 successes sit at $5.99–$14.99 (Vital Shell $5.99, TerraTech Legion/Megabonk/Nordic Ashes $9.99, DRG:S/NIMRODS $12.99, BALL x PIT $14.99).

### Audience expectations
[I, from the comps and reviews] Dense screens with readable feedback; a new choice every 20–40 s; dozens of weapons with evolutions; many characters; a 100% achievement path; frequent free updates; price under $10 unless there is a brand or 3D.

### Realistic bar for a small team
[I] The honest comp band for a competent solo/small entry with a twist is **300–2,300 reviews** (Airships LF 317, NIMRODS 1,860, Vital Shell 1,867, TerraTech Legion 2,225), i.e. roughly $50K–$500K gross on raijin's estimates. Vital Shell is the documented solo success and it needed 15 months plus a strong visual identity.

### Risks
- [S] The pipeline is the fullest of any niche measured: 102 dated Bullet Heaven pages in the next 90 days vs 26 in a normal 2025 quarter.
- [I] Flat top-down 2D with abstract ships is the weakest possible art position in this framing; every recent success has an instantly recognisable look.
- [S] Build-your-vehicle survivors has a direct, recent, better-resourced occupant (TerraTech Legion). Its top complaints are a warning list for Bastion: controls/handling (weight 0.66), difficulty and confusing progression (0.61), repetitive grind (0.49), unlock friction (0.47), meta favouring small high-damage builds (0.43), construction limits such as no mirroring (0.43). https://vaporlens.app/app/3596700/terra_tech_legion.md

---

## B. Short "active incremental" games

### Representative games (raijin.gg, seen 2026-11-11)

| Game | Price | Release | Reviews | % pos | Est. copies / gross | Completion |
|---|---|---|---|---|---|---|
| Nodebuster | $2.99 | 13 Aug 2024 | 14,121 | 97% | ~338K / ~$809K | ~3 h (reviews say 2–7 h) |
| Digseum | $2.99 | 9 Dec 2024 | 8,229 | 98% | ~185K / ~$442K | ~2.5 h, often one sitting |
| Tower Wizard | $2.99 | 19 Jun 2025 | 9,110 | 97% | ~204K / ~$488K | 3–5 h |
| Keep on Mining! | $4.99 | 30 Jul 2025 | 8,487 | 93% | ~191K / ~$761K | 4–8 h |
| (the) Gnorp Apologue | $6.99 | 14 Dec 2023 | 10,020 | 95% | ~235K / ~$1.3M | ~10 h first finish, 30–40 h for 100% |
| To The Core | $7.99 | 10 Aug 2023 | 5,211 | 93% | ~116K / ~$744K | median playtime 8.5 h |
| Bills Must Be Paid (2 devs, 7 months) | $6.99 | 29 Jul 2026 | 12,934 | 97% | ~336K / ~$1.88M | — [NF] |
| Sir, We Have an Orc Problem (incremental + TD, 2 devs, ~4 months) | $9.99 | 28 Jul 2026 | 4,710 | 86% | ~128K / ~$1.03M | — [NF] |
| Outhold (incremental + TD) | $6.99 | 12 Dec 2025 | 1,876 | 86% | ~53K / ~$297K | — |

**Space-themed incrementals specifically:**

| Game | Price | Release | Reviews | % pos | Est. copies / gross | Notes |
|---|---|---|---|---|---|---|
| Astro Prospector | $4.99 | 14 Jul 2025 | 3,367 | 91% | ~87K / ~$349K | "incremental bullet hell": auto-fire ship, mining, skill tree, 25 zones with bosses, 3–5 h; death loses nothing |
| Space Rock Breaker | $2.99 | 19 Dec 2025 | 4,884 | 96% | ~110K / ~$262K | shoot asteroids, Plinko ore processing, big skill tree; 2–3 h to 100% |
| Void Miner – Asteroid Roguelite | $5.99 | 16 Nov 2025 | 749 | 83% | ~20.5K / ~$98K | ship + automated tower; a review calls the skill tree "tiny" |
| Astro Nova | $2.99 | 6 Nov 2025 | **41** | 83% | ~1K / ~$2.4K | "short incremental roguelike about surviving swarms in space, combining modules into powerful builds" — closest description to Bastion, and it failed commercially |

Sources: raijin.gg/app/3107330, /3361470, /3372980, /3769130, /1473350, /1988550, /4421010, /4594150, /3767740, /3503440, /4035270, /3772240, /3964430. Completion times: vaporlens.app pages for each game; https://blog.lauramichet.com/played-nodebuster/ (28 Sep 2025); https://www.wasdland.com/game/keep-on-mining-3769130.

**Incrementals where you build a ship or base:** [NF] I found no successful short incremental whose core is laying out a ship or base on a grid. Astro Nova (modules, not confirmed grid) is the nearest and has 41 reviews. Unreleased/2026 pages surfaced by search (Void Salvage, Nova Fleet, Orebits) were not verified. [I] The slot is open, but one failed attempt shows the label alone does not sell it.

### Why they sell
- [S] HTMAG counted idle games reaching 1,000 reviews: 3 (2022), 3 (2023), 16 (2024), 12 in the first half of 2025; the 9 paid hits averaged $3.89; the author's advice was that devs should charge more and that a ~9-month idler is a sane detour from a stuck large project — with the warning that the boom "could be over already". https://howtomarketagame.com/2025/08/04/2025-q2-games-that-are-selling/
- [S] HTMAG, Aug 2026 ("Week of the Golden Age"): three July 2026 Steam best-sellers from tiny teams. Orc Problem: 2 devs, ~4 months, 150,000 wishlists at launch, $361,657 gross in 24 h, 200,000 units in 20 days. Bills Must Be Paid: 2 devs, 7 months, 61k+ wishlists at launch, $163,842 in 24 h, 330,000 units in 20 days. https://howtomarketagame.com/2026/08/18/the-week-of-the-golden-age and https://howtomarketagame.com/2026/08/20/part-2-the-week-of-the-golden-age/
- [S] Same series: the bar is rising — "basic success now requires higher-quality art and novel mechanics layered on the core loop"; BMBP stood out through 3D visuals, game feel and a forced-prestige "bills" mechanic that adds failure risk to a normally passive genre.
- [S] Code Monkey's Game Dev Report (17 Aug 2025) called incrementals the "hottest new genre on Steam", noted store pages openly state "2 to 5 hours long" and players do not mind, and asked whether it lasts like Simulator games or fades like Vampire Survivors-likes. https://gamedevreport.beehiiv.com/p/indie-dev-makes-4-mil-then-goes-broke-and-hottest-new-genre-on-steam
- [S] AppMagic: most idle titles on Steam are priced $3–$15; Tower Wizard ~555K copies in 2025 by its model (well above raijin's lifetime estimate — the trackers disagree). https://appmagic.rocks/blog/idle-steam-games-2026

### Loop skeleton
[S, vaporlens + Michet] Very short active run (tens of seconds to a few minutes) → currency → one screen-filling skill tree → each purchase visibly changes the next run → gates (boss/zone/prestige) every 20–40 minutes → a definite ending at 2–8 hours → optional endless mode. No in-run build decisions of consequence; failure costs nothing.

### What players praise / complain about
- [S] Praise: value for money, steady meaningful upgrades, "doesn't overstay its welcome", finishable 100% achievements. (Nodebuster, Tower Wizard, Digseum, Space Rock Breaker, Astro Prospector vaporlens pages.)
- [S] Complaints: too short / nothing after the ending (Digseum 0.35, Space Rock Breaker 0.46, Astro Prospector 0.26, Nodebuster 0.55); late game becomes trivial or an AFK grind (Nodebuster 0.58); shallow prestige (Space Rock Breaker 0.63); invisible upgrade effects and unexplained deaths (Michet on Nodebuster).
- [C] r/incremental_games: the main grievance is the flood of near-identical Nodebuster clones made "because they sell"; several say these feel like "a regular game with a skill tree slapped on top"; others object to enemies scaling alongside upgrades so numbers rise without real progress, and to rounds that pay for exactly one upgrade. Length itself bothered fewer commenters than expected. https://reddit.sentinel-team.org/posts/1rsgm3n/snapshots/2026-03-13T11%3A00%3A32.204569Z and https://reddit.sentinel-team.org/posts/1pn3s8p/snapshots/2025-12-15T13%3A20%3A24.535083Z
- [C] Same community on short vs long: short paid games suit the mass market; long incrementals are expected to be free. https://reddit.sentinel-team.org/posts/1qpldok/snapshots/2026-01-29T02%3A20%3A55.74342Z

### Realistic bar for a small team
[I] This is the one framing whose production bar matches a solo dev with flat 2D art and web tech: minimal visuals are accepted, scope is 2–8 hours, and documented dev times are 4–9 months for two people. But the hits above are survivors of a field of ~1,566 idler releases in nine months of 2026; the failure rate is [NF], and Astro Nova and Void Miner show the low end.

### Risks
- [S] Supply is rising faster than any niche except the re-tagged Bullet Heaven one (+150% YoY; 314 dated pages in the next 90 days).
- [S] A cautionary case: MMO98 — 27,000 wishlists, $73,886 in ~3 weeks, but reviews settled at Mixed (59%) because players expected a different game from the capsule and late-game balance was undercooked. https://gamedevreport.beehiiv.com/p/lessons-from-a-hit-incremental-game-and-john-carmack-s-advice (17 May 2026)
- [I] Short tail and low price mean revenue is mostly in the first weeks; there is little room to patch a weak launch.
- [I] A sub-2-hour game sits inside Steam's refund window [M]; Digseum (~2.5 h) shows players still keep it, but it is a real exposure.

---

## C. Wave-shop arena roguelites and placement/auto-battler roguelites

### Representative games (raijin.gg, seen 2026-11-11)

| Game | Price | Release (raijin = 1.0) | Reviews | % pos | Est. copies / gross | Run length | Content |
|---|---|---|---|---|---|---|---|
| Brotato (wave-shop template) | $4.99 | 23 Jun 2023 | 120,028 | 96% | ~3.0M / ~$11.9M | 20 waves, 20–90 s each, shop between | very high replay |
| Backpack Battles | $14.99 | 13 Jun 2025 (EA 2024 [M]) | 20,816 | 91% | ~434K / ~$3.9M | 20–30 min matches | 200+ h reported |
| The Bazaar | $19.99 | 13 Aug 2025 (Steam) | 16,335 | 69% | ~370K / ~$4.4M | — | live-service |
| Ballionaire | $12.34 as listed (sale?) | 10 Dec 2024 | 2,764 | 84% | ~64K / ~$477K | — | — |
| SNKRX | $2.99 | 17 May 2021 | 4,334 | 95% | ~112K / ~$267K | — | — |
| NIMRODS | $12.99 | 28 Oct 2024 | 1,860 | 85% | ~48K / ~$374K | — | — |
| TerraTech Legion | $9.99 | 30 Apr 2026 | 2,225 | 82% | ~64K / ~$511K | endless | ~30 h |
| How Many Dudes? (autobattler roguelike, 7 devs, 1 year) | $14.99 | 30 Jul 2026 | — [NF] | — | 242,000 units reported by HTMAG | — | — |
| Cosmoteer (not a roguelite; proof the grid-ship-with-destructible-parts fantasy sells) | $19.99 as listed | 24 Oct 2022 (EA) | 12,971 | 94% | ~276K / ~$3.3M | — | sandbox/campaign |

Sources: raijin.gg/app/1942280, /2427700, /1617400, /2667120, /915310, /2086430, /3596700, /799600; Backpack Battles loop from https://vaporlens.app/app/2427700/backpack_battles.md; How Many Dudes from https://howtomarketagame.com/2026/08/21/part-3-the-week-of-the-golden-age-how-many-dudes/.

### Loop skeleton
- Wave-shop (Brotato): short wave → shop with reroll/lock → stat-and-item build → 20 waves → win/lose → unlock characters, items, difficulty tiers. Meta is mostly **unlocks, not permanent power** [M].
- Placement roguelites (Backpack Battles, Bazaar, Ballionaire): the build screen is the game; combat is automatic; **spatial adjacency is the core skill**; value comes from hundreds of items and constant balance patches.

### Relevance to a grid-of-modules ship
- [I] Bastion's current Waves mode is already this skeleton almost number-for-number: 20 waves, 30–60 s each, a build break between waves, bosses on a fixed cadence. Brotato is 20 waves of 20–90 s with a shop between. Of the four framings this is the one Bastion already is.
- [I] "Neighbours combo" is the Backpack Battles skill (adjacency) placed on a body the player flies. "Parts break off" has no equivalent in Brotato/Backpack; its precedent is Cosmoteer and (older) Captain Forever/Reassembly [M]. That combination is the differentiator, and I found no released game doing exactly it in this format (closest: TerraTech Legion, where the reviews do not mention parts detaching).

### Audience expectations
- [I/M] Brotato audience: many starting characters that each bend the rules, a large item pool, difficulty tiers, a run in 20–30 minutes, low price.
- [S] Placement audience: build variety and deep item combining are the top praise (Backpack Battles 0.26 and 0.16); balance and a narrow meta are the top complaints (0.17, 0.07).

### Realistic bar for a small team
[I] A solo single-player wave-shop game with a spatial twist realistically lands in the SNKRX–NIMRODS–TerraTech band: **~1,900–4,300 reviews at the good end**, at $3–$13. The PvP/live placement games (Backpack Battles, Bazaar) are not a solo-dev model: their value depends on continuous balance patching and matchmaking.

### Risks
- [S] On Steam this audience is reached through the Roguelite / Bullet Heaven / Action Roguelike tags, so framing C inherits framing A's crowding (Action Roguelike: 3.5% of 1,849 games reached 1,000 reviews).
- [S] TerraTech Legion's review profile: when the build system meets real-time movement, handling and build-UI friction become the top complaints. Drift flight plus a growing, lopsided grid is exactly that risk.
- [I] Two choice systems in every break (card pick **and** module shop) is more than the template carries; Brotato has one shop, survivors-likes have one level-up pick.
- [I] Bastion's Fragments/licences/core-ranks meta is permanent power. That is the incremental (B) contract, not the Brotato one, so the game currently sends mixed signals about whether skill or grind wins runs.

---

## D. "Defend the core" / tower-defense roguelites

### Representative games (raijin.gg, seen 2026-11-11)

| Game | Price | Release (raijin = 1.0) | Reviews | % pos | Est. copies / gross | Run length | Content |
|---|---|---|---|---|---|---|---|
| Dome Keeper | $17.99 as listed | 27 Sep 2022 | 22,718 | 92% | ~512K / ~$5.5M | 30–60 min | ~3 h to finish once, ~30 h for 100% |
| Thronefall | $12.99 as listed | 11 Oct 2024 (EA 2023 [M]) | 23,935 | 96% | ~564K / ~$4.4M | — | — |
| Rogue Tower | $14.99 | 28 Jan 2022 | 5,937 | 83% | ~141K / ~$1.27M | — | — |
| Nordhold | $19.99 | 25 Mar 2025 | 3,435 | 86% | ~71K / ~$849K | — | — |
| Tower Dominion | $17.49 | 7 May 2025 | 5,667 | 86% | ~127K / ~$1.33M | — | — |
| The King is Watching | $14.99 | 21 Jul 2025 | 10,749 | 89% | ~246K / ~$2.2M (publisher: 500K+ copies by Mar 2026) | — | median playtime 11 h+ in first month |
| Monsters are Coming! Rock & Road ("tower-survivor", moving city, Raw Fury) | $8.99 as listed | 20 Nov 2025 | 2,929 | 80% | ~127K / ~$910K | 30–40 min | ~32 h for 100% |

Sources: raijin.gg/app/1637320, /2239150, /1843760, /3028310, /3226530, /2753900, /2934220; https://vaporlens.app/app/1637320/dome_keeper.md; https://vaporlens.app/app/2934220/monsters_are_coming_rock_road.md; https://newsletter.gamediscover.co/p/how-the-king-is-watching-sold-200k (19 Aug 2025).

### Loop skeleton
Prepare (build/economy) → wave hits a fixed or slow-moving core → spend → harder wave → run ends when the core falls → meta unlocks. The economy/build phase carries as much weight as the defence.

### Evidence on the niche
- [S] HTMAG Q2 2025: tower defense is picking up (5 games past 1,000 reviews in H1 2025 vs 8 in all of 2024: Orcs Must Die! Deathtrap, Border Pioneer, Nordhold, Tower Dominion, Drill Core), but only when it goes beyond build-earn-upgrade by adding a city-building, roguelike or colony layer. https://howtomarketagame.com/2025/08/04/2025-q2-games-that-are-selling/
- [S] Steam Niche Index flags Tower Defense as a "combination to fear": releases up 62% into a niche where only 3.5% reach 1,000 reviews.
- [S] The 2026 small-team wins here are **incremental-TD hybrids** priced $7–$10 (Outhold, Orc Problem), not classic TD roguelites.
- [S] Monsters are Coming! is the closest "moving fortress" precedent. Complaints: repetitive loop (0.26), lack of variety/content (0.19), unbalanced progression (0.19), weak tower and combat mechanics (0.09).
- **[NF]** Mobile "tower survivor" revenue data. Search returned only general Sensor Tower market reports (hybrid-casual IAP +20% to $4.2B in 2025; Survivor!.io and BangBang Survivor named as mid-core examples), nothing isolating the sub-genre.

### Audience expectations
[I] A readable economy, meaningful placement against predictable approach paths, a calm planning phase, 20–30 hours of unlocks, and a $13–$20 price that implies 3D or rich pixel art. Raw Fury, tinyBuild or HypeTrain publish most of the table above.

### Realistic bar for a small team
[I] Highest of the four in art and content. The unpublished solo comp is Rogue Tower (5,937 reviews, 2022, before the current crowding).

### Risks for Bastion
[I] Bastion's ship drifts, enemies chase rather than path, and weapons auto-fire in all directions. Making it a defence game means replacing movement and enemy behaviour, which are the two things already built and tuned. "Moving fortress" also blurs into framing A/C in the store (Monsters are Coming! is tagged and reviewed as a survivors-like hybrid).

---

## E. Ranking and minimum changes — ALL INFERENCE

Everything in this section is my reasoning from the evidence above. None of it is a sourced claim.

### Two rankings, because they disagree

**By fit to the unique asset ("grid ship where neighbours combo and parts break off"):**

1. **C — wave-shop roguelite with spatial build.** Adjacency only matters if the player makes placement decisions repeatedly under different constraints, which is what a shop-between-waves roguelite provides. Part loss needs stakes, which a run with a fail state provides. The current Waves mode already matches the template.
2. **D — moving fortress.** Parts breaking off reads naturally as walls being breached, and build-between-waves is native. But the asset would be carrying a genre whose other half (economy, pathing, slow core) Bastion does not have.
3. **A — pure survivors-like.** A continuous 20–30 minute run with level-up picks leaves no calm moment to lay out a grid; the asset would be reduced to "pick a module, auto-placed".
4. **B — short incremental.** Progress is permanent and monotonic, so the layout becomes a puzzle solved once, and losing parts cuts against "numbers only go up". The asset is least expressed here.

**By fit to the team and the 2026 market (solo dev, flat 2D, web tech, no publisher):**

1. **B** — only framing where minimal art is accepted, scope is 2–8 hours, and two-person teams are documented shipping hits in 4–9 months. Space-shooter incrementals have sold (Astro Prospector, Space Rock Breaker).
2. **C** — viable but the realistic ceiling is a few thousand reviews, and it competes inside the most crowded tags.
3. **D** — price and production expectations are the highest; nearly all comps are publisher-backed.
4. **A** — fullest pipeline, strongest incumbents, and the framing where flat 2D hurts most.

### Recommendation

Frame Bastion as **C**, sold with the words the store already understands ("bullet heaven" / "roguelite" tags, "build your ship between waves" as the hook), and borrow **B's contract for scope and price** rather than B's structure: a finite, clearly stated amount of content, a price in the $5–$8 band, and meta progression that is visible and quick.

I am not recommending a conversion to B, despite B being the stronger market, for two reasons. First, the conversion removes the reason the grid exists. Second, the one game found that describes itself the way a B-version of Bastion would — Astro Nova, "short incremental roguelike about surviving swarms in space, combining modules into powerful builds" — has 41 reviews. That is one data point, not proof, but it says the incremental label does not rescue a swarm-shooter with modules.

What would change this: if playtests show players ignore layout and just buy the highest number, the asset is not carrying the game, and B (where nobody expects layout depth) becomes the better use of the existing code.

Honest ceiling under C: the TerraTech Legion / NIMRODS / Vital Shell band (roughly 1,900–2,300 reviews) is a good outcome, not the expected one. Airships: Lost Flotilla (317 reviews, from a dev with an existing audience) is the more common result.

### Minimum changes each framing would demand

**C (recommended) — smallest change set**
- Run length: keep 20 waves of 30–60 s (already on template). Total run 20–30 min.
- Merge the two between-wave choice systems into one. Either cards become shop items, or cards are the only in-run choice and modules come from them. Two parallel systems per break is the first thing to cut.
- Meta: shift Fragments from permanent power toward unlocks (new cores, module families, starting layouts, difficulty tiers). Keep power ranks small or drop them; this audience expects skill-and-build to win runs.
- Content the template implies: many distinct starting cores that change layout rules, and a module pool large enough that two runs differ. This is the main cost.
- Make part loss legible and fair: it must be the memorable moment, not a handling problem. TerraTech Legion's top complaint is the warning.
- Endless: keep as a post-win mode only.
- Systems to cut or freeze: one of {cards, separate shop}; power-rank grind; anything in the Hangar that is not an unlock.

**B — a restructure, mostly by cutting**
- Run length: 1–5 minutes; death costs nothing; a run always pays for at least one meaningful upgrade.
- Meta tree becomes the game: on the order of 60–150 nodes on one screen, each visibly changing the next run. The Hangar would have to become that tree — plausibly "the ship is the tree", with permanent module slots.
- A definite ending at 3–8 hours, stated on the store page; Endless only after it.
- Cut: in-run card picks, in-run Matter shop depth, most between-wave build time, the 20-wave structure as the primary mode, licences/core ranks as separate systems.
- Bosses become zone gates (Astro Prospector uses 25 zones).
- Part loss becomes the run-end pressure only; lost parts return free next run.
- Price $3–$7.

**A — more content than the team can supply**
- One continuous 15–30 minute run, no build breaks; level-up pick every 20–40 s.
- Modules auto-attach or snap with one click; adjacency reduced to evolutions.
- Needs multiple stages, 10+ ships, 30+ weapons with evolutions, and a distinctive art direction.
- Cut: wave breaks, shop, cards as a separate layer, Hangar depth. Keeps the least of what is unique.

**D — a different game**
- Ship becomes slow or anchored; enemies need approach paths and target priorities; add an economy phase.
- Runs 30–60 min; 20–30 h of unlocks; price expectation $13–$20 with art to match.
- Cut: drift flight and chase-swarm behaviour — the two most developed parts today.
- Only the incremental-TD variant (Outhold / Orc Problem, $7–$10) is small-team sized, and that is framing B with a fixed core.

---

## F. What was not found

- Full review-count distribution and median revenue for 2024–2026 survivors-likes (only the biased 13.1%-of-107 figure).
- Hit rate / median outcome for short incrementals (only the release counts and the hits).
- Developer-stated dev time or sales for Nodebuster, Digseum, Astro Prospector, Space Rock Breaker.
- Mobile "tower survivor" revenue.
- Any released, successful incremental built around laying out a ship or base on a grid.
- Bodies of two PC Gamer articles (idle flood; Next Fest top-50 with 7 incrementals) and the WN Hub incremental benchmark (paywalled) — headlines only.
- Run length for Megabonk, BALL x PIT, Vital Shell; review count for How Many Dudes?.
- Direct Steam store confirmation of any price or review count: everything is via raijin.gg as of 2026-11-11.
