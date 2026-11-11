# Stellar Swarm — competitor profile

Research date: 2026-11-11. Method: web search + page fetches only. **The game was not played and no video was watched.**

Claim labels used throughout:

- **[S]** sourced fact, URL given
- **[C]** community / third-party opinion, URL given
- **[I]** my inference, not a fact
- **[?]** unverified or low-reliability source (auto-generated portal copy etc.)

---

## 0. Read this first: evidence limits

1. **There is no Steam game called "Stellar Swarm."** Steam store search on 2026-11-11 returned 27 results, none with that title [S: https://store.steampowered.com/search/?term=Stellar+Swarm]. So there are **no Steam reviews, no Steam discussions, no SteamDB data, no price, no early-access state** to report. Any number of that kind would be invented.
2. The game that matches is a **free browser game on CrazyGames**. Its public footprint is one store-style listing, a handful of tiny YouTube videos and auto-generated portal copy. There is **no wiki, no devlog, no patch notes, no press review, no written player reviews** that I could find.
3. I could not read the game's own files (`stellar-swarm.game-files.crazygames.com/.../index.html` returned HTTP 403) and YouTube watch pages return no description/comments to the fetch tool. So **weapon names, enemy types, boss existence, wave structure, run length, crystal costs and all numbers are unknown.** Section 2 is therefore thin and mostly inference. Do not treat it as a mechanical breakdown.
4. Closing this gap needs ~20–30 minutes of hands-on play (or an agent with a browser) at https://www.crazygames.com/game/stellar-swarm. A checklist is in section 8.

---

## 1. Which "Stellar Swarm"? Disambiguation

| Candidate | What it is | Verdict |
|---|---|---|
| **Stellar Swarm — Bilbo Studios, CrazyGames** | Free HTML5 horde-survival shooter: neon ship, geometric enemies, auto-fire, weapon skill trees + evolutions, crystals meta currency [S: https://www.crazygames.com/game/stellar-swarm] | **Picked.** Only title with this exact name that matches "survive swarms in a spaceship with upgrades." |
| STELLAR SWARM — 星屑の群れ, shinogin, itch.io | Free browser idle clicker: click asteroids, buy drones/probes, prestige ("Nova Fragments"), 10 achievements, JP/EN [S: https://shinogin.itch.io/stellar-swarm] | Not it — no ship combat. Only relevant if "incremental" in the brief meant a pure idle game. |
| "Stellar Swarm second version", YouTube, Jeremy Anderson | 5:26 video, ~100 views, ~5 months old; snippet describes a survivor shoot-'em-up inspired by Geometry Wars, moved from canvas to three.js to render thousands of particles [S: https://www.youtube.com/watch?v=108_-IyBjtI] | **Unresolved.** Description fits the CrazyGames game and the timing fits its June 2026 update, but nothing links this channel to Bilbo Studios. Could be the dev, could be an unrelated hobby project with the same name. |
| Swarmfall (Steam app 4331330) | Surfaced by search for "Stellar Swarm". 2D bullet-heaven: pilot a mothership, scrap buys/upgrades auto-fighting escort ships, bosses. grannyForge, released 2 Nov 2026, $3.99, 2 reviews [S: https://store.steampowered.com/app/4331330?l=english] | Different game. Noted because "in-run currency buys ship parts that auto-fight" is closer to Bastion's loop than Stellar Swarm is. |
| Cosmic Swarm (Steam app 3434980) | 3D space shooter, Early Access since 18 Oct 2025, $1.39, 13 reviews (100% positive), "combine spaceship components"; Steam flags no dev update in 12+ months [S: https://store.steampowered.com/app/3434980?l=english] | Different game, tiny and stalled. |

No Google Play / App Store / Poki / Newgrounds listing under this name was found [S: searches 2026-11-11]. Mobile availability is through the CrazyGames app only [S: https://www.crazygames.com/game/stellar-swarm].

**[I] Relevance warning for the Bastion audit:** the picked game has **no modular ship, no grid, no in-run shop/currency for parts** in any description. If Bastion was "like Stellar Swarm," the inheritance is feel (neon ship, auto-fire, swarm survival, between-run upgrades), not structure. It is also a free ad-portal game judged by thumbs-up ratio, not a paid PC game judged by Steam reviews. It is a weak benchmark for Bastion's economy and a reasonable one for first-minute accessibility.

---

## 2. Facts

| Field | Value | Label |
|---|---|---|
| Developer | Bilbo Studios | [S: https://www.crazygames.com/game/stellar-swarm] |
| Studio | "Indie Games from Bilbao" (Bilbao, Spain). Site lists 4 games: Pirates.io and Uninstall Humanity (Poki), Stellar Swarm and Pocket Goal: World Cup (CrazyGames). No team names, no socials, no Discord, no devlog. | [S: https://bilbostudios.com/] |
| Earlier developer credit | Localized CrazyGames pages were indexed crediting **"Fafimba"**; the live pages (EN/RU/ES fetched today) now say Bilbo Studios. One mirror still says "Developed by Fafimba". | [S: search snippets of crazygames.com/{ua,es,it,br,tr}/game/stellar-swarm; https://browsergamers.gg/game/stellar-swarm]. [I] same developer account renamed/rebranded; not confirmed. |
| Platforms | Browser (desktop, mobile, tablet) + CrazyGames app (iOS, Android). HTML5. **Portrait orientation.** | [S: https://www.crazygames.com/game/stellar-swarm; https://api.crazygames.com/v3/en_US/page/game/stellar-swarm] |
| Price | Free. `hasIap: false`. | [S: API URL above] |
| Monetization | Not stated. | [I] CrazyGames portal ads; whether the game uses rewarded ads is unknown. |
| Release | Basic launch 2026-03-16, full listing 2026-04-09 ("Released April 2026"). | [S: API URL above; third-party mirror shows "added 09 Apr 2026": https://www.games-kids.com/game/44206/stellar-swarm.html] |
| Early access | Not applicable (web portal). | — |
| Last update | 2026-10-23 (file update and "significant update" both). Loader path ends `/stellar-swarm/72/index.html`. | [S: API URL above]. [I] "72" is the upload/build counter → roughly 72 builds in ~7 months. |
| Rating (seen 2026-11-11) | **9.4/10 from 17,268 ratings: 16,286 up / 982 down = 94.3% positive.** Page notes rating is "based on the last 6 months". | [S: API URL above; percentage is my arithmetic] |
| Rating growth | ~11,410 votes when last-updated date was 9 Jun 2026; 12,761 on a mirror dated 2 Jul 2026; 17,268 on 11 Nov 2026. | [S: search snippet of https://www.crazygames.com/tr/game/stellar-swarm; https://stellarswarm.web.app/; API]. [I] steady, not viral: ~1.1–1.5K new ratings/month after the launch spike. |
| Play count | Not published. | — |
| Tags | Action › Survival › Horde Survival; Mobile, Destroy, Leaderboards, 2D, Survival. A mirror copying portal tags also shows "5-minute fun". | [S: CrazyGames page; https://stellarswarm.web.app/] |
| Portal status | `gameThumbLabels` contains "originals". | [S: API]. [I] it is in CrazyGames' Originals programme (portal-backed/exclusive); the exact deal is unknown. |
| Leaderboard | Enabled, descending, score label "POINTS"; guide text: "Get the most kills to top the ranks!" | [S: API] |
| Save | Cloud progression save via CrazyGames account. | [S: API] |
| Controls | WASD/arrows to move, P pause/menu. Mobile: on-screen joystick [?]. No aim or fire input listed. | [S: CrazyGames page]; joystick [?: https://stellarswarm.web.app/] |
| Session / run length | **No figure published.** Soft signals: "5-minute fun" tag; a comparison article tags it "Short runs"; player videos are 5:00, 10:03 and 25:44 long (may contain several runs). | [S/C: https://stellarswarm.web.app/; https://zombiedefence.io/en/articles/games-like-vampire-survivors-browser; YouTube listing in §5] |
| Hours to complete | **No data.** No HowLongToBeat entry, no achievement data, no completion claims found. | — |

---

## 3. Core loop, run structure, progression

### What is actually sourced (the official description, in full substance)

- Pilot a neon starship through "endless waves of geometric enemies" [S: https://www.crazygames.com/game/stellar-swarm].
- Choose a **starting weapon**, **unlock new ones**, upgrade through **branching skill trees**, push toward **evolutions** [S: same].
- Spend **crystals between runs** to **permanently upgrade the ship** [S: same].
- Input is movement only; firing is automatic [S: controls list has no fire key; mirrors state auto-fire explicitly [?]: https://stellarswarm.web.app/].
- Score is kills/points on a leaderboard [S: API].

### Reported by portal mirrors — treat as unverified

These sites publish templated, likely machine-written copy. Details that go beyond the official description may be invented.

- XP from kills/pickups → level-up → pick an upgrade in a weapon's branching tree; heavy investment in one branch evolves the weapon [?: https://browsergamers.gg/game/stellar-swarm; https://stellarswarm.web.app/].
- Branches boost damage / fire rate / spread [?: https://stellarswarm.web.app/]; paths described as rapid-fire vs wide-area vs precise high-impact [?: https://www.games-kids.com/game/44206/stellar-swarm.html].
- Some enemies rush, some hang back; spawn rate and toughness rise over time [?: https://stellarswarm.web.app/].
- "Runs reset, but crystals do not"; crystals are collected during runs [?: https://stellarswarm.web.app/].
- Permanent upgrades in four groups — offence, defence, mobility, utility/economy — and "spawners" as priority targets [?: https://browsergamers.gg/game/stellar-swarm]. **I would not rely on these two.**
- One YouTube snippet: levelling up unlocks new weapons [C: https://www.youtube.com/watch?v=ItNSk4zyvIU].

### Second-by-second loop — inference only

[I] Reconstructed from the description plus genre convention, **not observed**:
pick starting weapon → ship auto-fires → steer to dodge and to sweep through drops → XP bar fills → pause for an upgrade pick inside a weapon tree → density rises → repeat until death → crystals banked → spend on permanent stats → restart. Total decisions per minute are low; the skill expression is pathing.

### Unknown (plainly)

- Whether "waves" are discrete numbered waves or a continuous timer ramp.
- Whether there are bosses or elites. **No source mentions a boss.**
- Whether there is any win state. [I] "Endless" + kill leaderboard strongly implies **no win condition: the run ends on death and score is the goal.**
- How many weapons, how many can be equipped at once, tree depth, number of evolutions.
- Crystal income rate, upgrade costs, how many runs to max the meta.
- How difficulty scales beyond "more, faster, tougher over time" [?].

---

## 4. Visual and audio presentation

| Aspect | Finding | Label |
|---|---|---|
| Art style | "Neon starship", "geometric enemies" — abstract vector/glow look. | [S: CrazyGames description] |
| Lineage | Described as "inspired by geometry wars" in the possibly-related dev video. An article calls it "clean sci-fi arcade action". | [S: https://www.youtube.com/watch?v=108_-IyBjtI (attribution unresolved)]; [C: https://zombiedefence.io/en/articles/games-like-vampire-survivors-browser] |
| Juice | Enemies "shatter or disintegrate"; bright colours and glow. If the dev video is the same game: renderer rebuilt in three.js specifically to push "thousands of particles". | [?: https://browsergamers.gg/game/stellar-swarm; https://www.games-kids.com/game/44206/stellar-swarm.html]; [S: YouTube snippet, attribution unresolved] |
| Layout | Portrait-first; store assets exist in 16:9, 1:1 and 2:3 covers plus landscape and portrait trailer cuts. | [S: API] |
| Readability, UI style, HUD, upgrade-screen design | **Not assessed — nothing was viewed.** | — |
| Audio / music | **No information found anywhere.** | — |
| What the trailer/screens lead with | **Not assessed.** | — |

[I] An abstract neon/geometric style on a dark field is the cheapest way to get high-density readability: enemy class = shape + colour, no sprite art pipeline. It also makes the game visually interchangeable with dozens of "neon" shooters (the search for this game returned Neon Swarm, Neon Blitz, Neon Null, Neon Striker, Rogue Geometry and others).

---

## 5. Player sentiment

### Hard signal

- **94.3% thumbs-up over 17,268 ratings** on CrazyGames, 9.4/10 [S: API, 2026-11-11]. This is a one-click rating from free players, many on mobile. It is **not comparable to a Steam review percentage** — no purchase, no text, lower bar.

### Soft signal — YouTube (titles/snippets only; I could not read comments)

All small channels, 34–262 views each, mostly ~5 months old (June 2026), one ~2 months old. Listing captured from a YouTube search results page.

| Video | Views | Signal |
|---|---|---|
| "Very addicting neon space ship \| Stellar Swarm" — TheUndercoverNoob, 25:44, https://www.youtube.com/watch?v=ItNSk4zyvIU | 262 | [C] "addicting"; notes level-ups unlock weapons |
| "stellar swarm attempt" — hackergamez, 5:00, https://www.youtube.com/watch?v=Soyr4cGPot4 | 227 | [C] run-attempt framing |
| "Stellar Swarm Gameplay - The Next Addictive Neon Roguelike Bullet Heaven (EP - 01)" — Gazaa Gaming, 2:20, https://www.youtube.com/watch?v=ApK7H2zVr_k (Short: https://www.youtube.com/watch?v=0ynuctg-iY0) | 135 | [C] "addictive" |
| "Top 1000 National in stellar swarm" — LVK, 10:03, https://www.youtube.com/watch?v=g6X2RB7CuN0 | 90 | [C] chasing a national leaderboard rank |
| "sTELLAR SWARM [A GAME TO TRY]" — bailiwicker, 0:40, https://www.youtube.com/watch?v=0V-zQwrRmwc | 34 | [C] recommendation |

### Press / articles

- Only one article with an opinion: a "games like Vampire Survivors for the browser" list on a **competitor's own blog** (Zombie Defence), dated 2026-09-24. Scores it 8.5/10, fifth of six; sub-scores Combat 8.2, Progression 8.8, Usability 8.3, Value 8.6. Praises branching weapon trees, evolutions and permanent crystal upgrades. Criticises "less character-role variety than a survivor roster" and a setting that is a loose thematic fit for Vampire Survivors fans [C: https://zombiedefence.io/en/articles/games-like-vampire-survivors-browser]. Treat as marketing content, not independent press.

### Themes

- **Recurring (weak evidence, 2–3 sources each):** "addictive/addicting" [C: two video titles]; progression systems (weapon trees + evolutions + permanent upgrades) are the named strength [C: article; echoed by every portal blurb]; leaderboard rank is a goal players pursue [C: LVK video; S: API leaderboard].
- **One-off:** limited role variety because there is one ship, no roster [C: article].
- **Complaints:** **none found in text.** The only negative signal is the 982 downvotes (5.7%) with no reasons attached [S: API]. Absence of complaints here reflects absence of a review channel, not absence of problems.
- **Not available:** Steam reviews/discussions (no Steam page), Reddit (not searchable with these tools), CrazyGames comments (portal exposes none).

---

## 6. Patch / dev history

No patch notes, changelog, devlog or roadmap exist publicly [S: https://bilbostudios.com/; API shows no release-notes field]. What can be reconstructed:

| Date | Event | Label |
|---|---|---|
| 2026-03-16 | "Basic launch" on CrazyGames (soft launch/test tier) | [S: API] |
| 2026-04-09 | Full listing ("Released April 2026") | [S: API; https://www.games-kids.com/game/44206/stellar-swarm.html] |
| ~late May–June 2026 | Video "Stellar Swarm second version": moved from 2D canvas to three.js, rendering improved for thousands of particles | [S: https://www.youtube.com/watch?v=108_-IyBjtI]; **link to this game unconfirmed** |
| 2026-06-09 | Listing shows "last updated" 9 Jun 2026; developer credited as Fafimba at this time | [S: search snippets of localized CrazyGames pages] |
| Sept 2026 | Listing updated again | [C: https://zombiedefence.io/en/articles/games-like-vampire-survivors-browser] |
| 2026-10-23 | Latest file + "significant" update; developer now shown as Bilbo Studios; build path number 72 | [S: API] |

- [I] The dev ships often and silently (build counter 72) and tells players nothing about what changed or why. The "why" behind any change is **not findable**.
- [I] If the three.js rewrite is this game, the one known engineering priority was **swarm/particle density at stable frame rate on phones**, i.e. spectacle and performance over new content.
- Wayback snapshots exist (2026-04-19, 2026-07-25) for anyone who wants to diff the listing, but the archive could not be fetched with these tools [S: http://archive.org/wayback/available?url=crazygames.com/game/stellar-swarm&timestamp=20260420].

---

## 7. Inference — lessons and weaknesses

Everything in this section is **[I] inference** from the evidence above. Confidence is limited because the game was not played.

### Five things a modular-ship swarm game should learn from it

1. **One-input onboarding.** Move only, auto-fire, no account, no download, works one-thumbed in portrait. 17K ratings at 94% positive from a cold portal audience says the first 30 seconds ask almost nothing. Bastion adds drift flight, a module grid and Matter purchases; each needs to arrive after the player already feels powerful, not before.
2. **Run identity from second zero.** The first decision is a starting weapon, so every run has a named build before the first enemy. Bastion's equivalent is the starting hull/loadout; it should make run 2 feel different from run 1 without needing a card pick first.
3. **A visible long goal inside the run.** Branching per-weapon trees that end in an "evolution" give each upgrade pick a direction (commit to a branch to transform the weapon). It is the only feature every source singles out. Bastion's between-wave cards and module purchases should point at similar commit-and-transform payoffs rather than flat stat bumps.
4. **One persistent currency, one sentence.** "Runs reset, crystals do not." A single meta currency spent on permanent ship stats is trivially explainable. Bastion's Matter (in-run) vs Fragments (meta) split is fine only if the difference is equally explainable on one screen.
5. **A cheap social hook.** A kill-count leaderboard with national ranking costs little and produced the "Top 1000 National" video. For a game with fixed 20-wave runs, a per-run score/time board is the comparable hook.

Secondary: frequent small builds (72 in ~7 months) and treating enemy/particle density at frame rate as a headline feature.

### Three biggest weaknesses a competitor can beat

1. **No structural identity.** One ship, no roster, no ship construction, generic neon-geometric look shared with many "neon" shooters, and a name that collides with an idle clicker. A modular grid ship where the build is visible on screen is a real differentiator — provided the grid is readable in motion.
2. **No arc.** As described it is an endless kill-score ramp: no documented bosses, no win condition, no ending. A fixed 20-wave run with distinct bosses and a clear victory gives a climax and a reason to say "one more run" that is not just a higher number. (Unverified: bosses may exist and simply not be mentioned.)
3. **No footprint outside the portal.** No Steam page, no wiki, no patch notes, no community space, YouTube videos under 300 views, single-portal dependence with ad monetization. Retention and word of mouth rest entirely on CrazyGames' front page. A competitor with a Steam page, visible changelog and a community channel owns the search results for the genre query almost by default.

---

## 8. Hands-on checklist to close the gaps (about 20–30 min)

Play at https://www.crazygames.com/game/stellar-swarm and record:

1. Time from page load to first enemy killed; number of clicks.
2. Starting weapons offered; how many are locked and what unlocks them.
3. Level-up screen: number of choices, tree depth, how evolutions are signposted.
4. Wave structure: numbered waves, timer, or continuous ramp; any boss/elite and at what minute.
5. Length of first run, and of a run after 5 meta upgrades.
6. Crystals earned per run vs cost of first three permanent upgrades.
7. End screen: what is shown, how fast "retry" is.
8. Ads: interstitial timing, any rewarded-ad offers (revive, double crystals).
9. Audio: music style, hit/kill/level-up sounds.
10. Readability at peak density on desktop (portrait window) and on a phone.

---

## Sources

- https://www.crazygames.com/game/stellar-swarm (also /ru/, /es/ localized pages)
- https://api.crazygames.com/v3/en_US/page/game/stellar-swarm
- https://bilbostudios.com/
- https://zombiedefence.io/en/articles/games-like-vampire-survivors-browser
- https://stellarswarm.web.app/ (third-party mirror/landing page)
- https://browsergamers.gg/game/stellar-swarm (portal copy, low reliability)
- https://bbfreegame.com/game/stellar-swarm-75244 (portal copy, low reliability)
- https://vibygames.com/games/new/stellar-swarm/ (portal copy, low reliability)
- https://www.games-kids.com/game/44206/stellar-swarm.html (portal copy, low reliability)
- https://www.youtube.com/watch?v=108_-IyBjtI, https://www.youtube.com/watch?v=ItNSk4zyvIU, https://www.youtube.com/watch?v=Soyr4cGPot4, https://www.youtube.com/watch?v=ApK7H2zVr_k, https://www.youtube.com/watch?v=0ynuctg-iY0, https://www.youtube.com/watch?v=g6X2RB7CuN0, https://www.youtube.com/watch?v=0V-zQwrRmwc
- https://store.steampowered.com/search/?term=Stellar+Swarm
- https://store.steampowered.com/app/4331330?l=english (Swarmfall)
- https://store.steampowered.com/app/3434980?l=english (Cosmic Swarm)
- https://shinogin.itch.io/stellar-swarm
- Failed/blocked: https://stellar-swarm.game-files.crazygames.com/stellar-swarm/72/index.html (403), web.archive.org snapshots (not fetchable), YouTube watch pages (no description/comments returned), https://lolrusgames.com/game/stellar-swarm/ (HTTP 525)
