# Notes per game — active verbs in auto-fire games

Researched 2026-11-11. Labels: **[S]** sourced · **[C]** community opinion · **[I]** inference · **[?]** not found. Player posts are paraphrased with handle and link.

## Why these 15

| # | Game | Why it is in the sample |
|---|---|---|
| 1 | GUNBOAT-8 | Named comparison; a steer-only boat with a drift verb |
| 2 | 20 Minutes Till Dawn | Manual aim and reload as the default, auto-aim added later |
| 3 | Brotato | Same wave-shop shape as Bastion; auto default with a manual-aim option; many weapons on one body |
| 4 | Halls of Torment | Separate auto-aim and auto-attack toggles |
| 5 | HoloCure | Aim lock (strafe), mouse aim, one cooldown special |
| 6 | Vampire Survivors | The no-verb baseline |
| 7 | Deep Rock Galactic: Survivor | An active verb done through movement (mining), no button |
| 8 | Nova Drift | Drift physics with fully manual fire; mouse steers and aims at once |
| 9 | Death Must Die | Dash plus auto-attack; the developers wrote down why that was not enough |
| 10 | Starsector | Player-aimed weapon group plus autofire groups, chosen per group |
| 11 | Cosmoteer | Built ship; direct control with a per-weapon AI switch and target designation |
| 12 | Dome Keeper | One manually aimed main weapon; automation bought as upgrades |
| 13 | World of Warships | Target marking for automatic guns (secondaries) |
| 14 | The Riftbreaker | Player-aimed mech plus automatic towers (thin data) |
| 15 | TerraTech Legion | Closest commercial peer (built vehicle, bullet heaven) |

Not obtained: Mindustry (wiki 404, search empty) **[?]**. SPAZ, Starcom, Airships: Lost Flotilla were not researched.

---

## 1. GUNBOAT-8 (demo; full game unreleased)

**Verbs and inputs**
- Steer only. The store feature list says the ship attacks for you and you focus on steering. **[S]** https://store.steampowered.com/app/5213390/GUNBOAT8_Demo/
- Inputs listed on itch: keyboard, mouse. Controller is supported; a forum request implies the left stick steers. **[S]** https://matt-neave.itch.io/gunboat-8 · **[C]** https://steamcommunity.com/app/4783980/discussions/0/565924517973818525/
- **Drift** exists as a separate handling state. A long itch review says the player found drifting only late, and judged the game without it. That suggests a distinct input that the game does not teach. **[C]** hectojoule, https://matt-neave.itch.io/gunboat-8 · **[I]** for the "distinct input" reading. The key is not stated anywhere **[?]**.
- **Dash / boost: not found.** Checked: demo store page, itch page and comments, all 12 Steam forum threads' titles, the full patch feed (30 Sep – 23 Oct), Indiecator's write-up, playin.gg, two web searches. None mentions a dash or boost. Either it is undocumented, or the "dash" remembered is the drift. Treat "GUNBOAT-8 has a dash" as **unverified [?]** until someone checks the demo's control screen.
- Aim by hull: the Broadside weapon fires to the side; on 15 Oct it gained limited rotation and on 19 Oct its placement was made more forgiving. **[S]** https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=4783980&count=40&maxlength=0

**23 Oct rework (v0.4.4)**
- The note is one line: drifting was reworked in how it feels. No numbers, no reason. **[S]** same feed. No later news items exist as of today **[S]**.

**What players say**
- The itch reviewer suggested removing drift from the largest hull and lowering its turn speed; also thought drift helps slow ships. One opinion. **[C]** itch page.
- Indiecator's author describes the play as drifting the boat and dodging while turrets shoot, and liked it. **[C]** https://indiecator.org/2026/10/31/steam-next-fest-2026-october/
- Controller: a request to let either stick steer, unanswered (6 Nov). One opinion. **[C]** thread above.
- No "AFK" or "plays itself" complaint was found, but Steam review text is unreachable, so absence proves little **[?]**.

**Second job for steering [S]:** scrap pickups that expire, chests, islands that block paths, and '?' objective stages (see `../game-audit-2026-11-11/notes/gunboat-8.md`).

---

## 2. 20 Minutes Till Dawn

**Verbs and inputs**
- Twin-stick: move, aim with mouse or right stick, hold to fire, limited ammo and a reload. Characters add verbs (Hina has a dash; it became invulnerable in 1.0). **[S]** https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=1966900&count=60&maxlength=0
- **Manual aim is the default.** Auto-aim was added on 30 Jul 2022 (V0.7.4) as a Space-bar toggle, described by the developer as a more casual mode. **[S]** same feed.
- 5 Aug 2022 (V0.7.5): option to turn off auto-reload when you stop shooting. **[S]**
- 1.0 (8 Jun 2023): key rebinding; controller scheme changed for comfort; auto-aim fixed so it targets bosses. **[S]**

**What players say**
- Recurring (at least four threads, Dec 2022 – May 2023): auto-aim ignores bosses and elites, so players switch to manual mid-fight and find that awkward. **[C]** https://steamcommunity.com/app/1966900/discussions/0/3718314144377686221/ · https://steamcommunity.com/app/1966900/discussions/0/6682809959400246441/
- A poster's advice marked as the answer: auto-aim is fine with many projectiles, aim by hand with single-shot weapons on bosses; wanted a priority order (very close enemies, then elites and bosses, then nearest). **[C]** Radiowavehero, first thread above.
- Recurring: controller and Steam Deck players cannot find the auto-aim key. **[C]** https://steamcommunity.com/app/1966900/discussions/0/4034727918508441855/ · https://steamcommunity.com/app/1966900/discussions/0/6682809959393626743/
- Aug 2022: players who hit the toggle by accident thought auto-aim was a bug and could not find how to turn it off. **[C]** https://steamcommunity.com/app/1966900/discussions/0/3453716885209518464/
- One poster prefers the mobile version's controls (auto-aim that includes bosses). **[C]** first thread above.
- Forum search for "auto aim" returns 130 hits **[S]** https://steamcommunity.com/app/1966900/discussions/search/?q=auto+aim

**Takeaway [I]:** auto-aim's standing failure is priority, not accuracy. Players do not ask to aim everything; they ask to say which target matters.

---

## 3. Brotato

**Verbs and inputs**
- Move only by default; up to six weapons auto-target independently.
- Options: manual aim, and manual aim only while the mouse button is held. **[S]** bug thread naming both options: https://steamcommunity.com/app/1942280/discussions/1/3488628040286881959/
- In manual aim every weapon points at the cursor. **[C]** multiple posters, below.
- No dash. **[C]** https://steamcommunity.com/app/1942280/discussions/0/3884973963047065179/

**What players say about manual aim**
- Thread "auto or manual aim?" (Oct 2022): all four posters keep auto. Reasons: guns cover every direction; each gun picks its own target; staggered fire feels better; one hand free. **[C]** https://steamcommunity.com/app/1942280/discussions/0/3364776031342120318/
- Another thread: one poster calls manual aim simply inferior because auto aims in every direction at once; the original poster finds it weak for ranged characters. **[C]** https://steamcommunity.com/app/1942280/discussions/0/3493130356489139508/
- Niche use: on one character, aim away from enemies on purpose so they bunch up, then blast. **[C]** https://steamcommunity.com/app/1942280/discussions/0/569302217694233546/
- Two 2024 proposals to split manual aim by weapon type (one button for ranged, one for melee) drew **zero replies**. **[C]** https://steamcommunity.com/app/1942280/discussions/0/651430242945143063/
- Controller has no click-to-aim equivalent. One thread. **[C]** https://steamcommunity.com/app/1942280/discussions/0/3548301990162477364/
- Forum search "manual aim": 123 hits, many of them bugs (cursor vanishing, Steam Deck freeze). **[S]** https://steamcommunity.com/app/1942280/discussions/search/?q=manual+aim

**What players say about a dash**
- Recurring request since Sep 2022 (60 search hits). The main thread splits about 4–5 for, 3 against, one compromise (dash as an item or on one character). No developer reply. **[C]** https://steamcommunity.com/app/1942280/discussions/0/3364775865381273723/
- Oct 2025: a poster argues a dash would break the game's balance. One opinion. **[C]** https://steamcommunity.com/app/1942280/discussions/0/659340488559566755/
- The developer has not added one in four years **[I from absence]**.

**Takeaway [I]:** with several guns mounted around a body, one cursor for all of them is a downgrade. Bastion has 20 guns on a wide hull; the effect would be stronger.

---

## 4. Halls of Torment

**Verbs and inputs**
- Move; main attack aimed by mouse or right stick. **Auto-attack and auto-aim are separate toggles**, each with a key. **[C]** https://steamcommunity.com/app/2218750/discussions/0/565924824838398643/ · confirmed indirectly by the patch line below.
- 5 Oct 2026: fixed controllers not firing with auto-aim on and auto-fire off — so that combination is supported. **[S]** https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=2218750&count=80&maxlength=0
- 15 Jan 2026: the Alchemist's attacks can now be manually triggered and aimed. **[S]** same feed.
- 11 Mar 2024: custom key bindings for auto-aim and pause. **[S, search snippet]** https://consolepcgaming.com/halls-of-torment-march-11-patch-brings-new-features-content-and-bug-fixes
- A "Mouse Only" beta mode where auto-aim is always on appears only in a search snippet of SteamDB; not opened **[?]**.

**What players say**
- May 2023: two threads ask for auto-aim *without* auto-attack, to aim abilities and for achievements. **[C]** https://steamcommunity.com/app/2218750/discussions/2/3833171785699730127/ · https://steamcommunity.com/app/2218750/discussions/0/3833171785697676696/
- Recurring state confusion: no on-screen sign of whether auto-aim is on; the toggle disabling itself; aim stuck in one direction. **[C]** https://steamcommunity.com/app/2218750/discussions/0/3807283698652487188/ · https://steamcommunity.com/app/2218750/discussions/0/599639673106629929/ · https://steamcommunity.com/app/2218750/discussions/0/3816292165315063332/
- A HoloCure player describing HoT: auto-aim fires at the nearest enemy when the right stick is idle; worse most of the time, useful when running away. One opinion. **[C]** wally, https://steamcommunity.com/app/2420510/discussions/0/3810661765911493597/
- Vaporlens' summary carries one line that the aiming mechanic does not make it better than Vampire Survivors; no count given. **[C]** https://vaporlens.app/app/2218750/halls_of_torment
- Forum search "auto aim": 271 hits. **[S]** https://steamcommunity.com/app/2218750/discussions/search/?q=auto+aim

**Takeaway [I]:** a toggle is cheap to add and expensive to support. It needs an always-visible state, parity on controller, and it generates bug reports for years.

---

## 5. HoloCure

**Verbs and inputs [S]** https://holocure.wiki.gg/wiki/Help:Getting_started_guide
- Arrow keys move; the character attacks automatically in the facing direction.
- Hold Z to **strafe**: locks the attack direction while you move freely.
- Click during play to switch to **mouse aiming**.
- **Special** on X: a gauge that starts on cooldown; using it resets the gauge. Specials are unlocked in the shop for 500 coins; a five-step shop upgrade and two items shorten the cooldown.
- No dash is listed.

**What players say**
- 137-comment thread asking for optional auto-aim (Aug 2023). For: accessibility and one-handed play. Against: several posters say aiming is the point, and that no auto-aim is what keeps directional weapons different from area weapons. **[C]** https://steamcommunity.com/app/2420510/discussions/0/3810661765911493597/
- Strafe is poorly discovered: a thread by a player who learned it exists after their hand hurt from flicking; a reply says strafe is mostly useless now that mouse and controller aiming exist. **[C]** https://steamcommunity.com/app/2420510/discussions/0/3810661765909562816/
- Request for a strafe toggle instead of hold (Nov 2024). One opinion. **[C]** https://steamcommunity.com/app/2420510/discussions/0/6589423683861818797/
- Reception of the special button itself was not found **[?]**.

**Takeaway [I]:** hold-to-lock controls go unnoticed unless taught, and are abandoned once a direct aim exists.

---

## 6. Vampire Survivors

**Verbs and inputs**
- Move only. No attack, aim, dash or ability button.
- Galante says he took the movement and the auto attacks from the mobile game Magic Survival and then experimented with the rest (for example settling on three to four level-up options). **[S]** https://www.androidpolice.com/vampire-survivors-developer-interview/
- No statement from him on *why* there is no button was found; the GamesRadar piece that reportedly discusses it did not load **[?]**.

**What players say**
- The praise is evolutions, chests and build synergy; the standing criticism is a shallow loop where moment-to-moment decisions are only positional (Vaporlens: 29 mentions). **[C]** carried from `../cards-2026-10-21/notes/vampire-survivors.md`
- Forum search "dash": 124 hits, but the first page is about a character named Exdash, not requests for a dash. No evidence of a dash demand on that page. **[S/C]** https://steamcommunity.com/app/1794680/discussions/search/?q=dash

**Why no verb works here [I]**
- Steering has two jobs: avoid contact, and route through XP gems and chests. The second job creates constant small decisions without a button.
- Rewards arrive every few seconds (level-up) and in set pieces (chest).
- A 30-minute arc ends with a build that visibly plays itself; that end state is the fantasy, not a flaw.
- $5 price sets expectations.
- **Bastion today has only the first job.** There are no pickups **[code]**, the shop is between waves, and there are about 19 card picks per run instead of a level-up every few seconds.

---

## 7. Deep Rock Galactic: Survivor

**Verbs and inputs**
- Move; weapons auto-fire and auto-aim. Walking into rock mines it. No dash.
- Mining is the active verb and costs no button: you cut paths, enemies follow you into them, you make bottlenecks, and you dig escape routes; ore feeds both in-run and permanent upgrades. **[C, review]** https://rogueliker.com/deep-rock-galactic-survivor-early-access-review/
- The same review says many survivors-likes fail to make the play space matter and this one does. **[C]**

**What players say**
- Recurring: a dash or dodge on Space is requested (six hits on the first search page, Oct 2023 – Mar 2024). In the thread read, nobody argued against and no developer replied. **[C]** https://steamcommunity.com/app/2321470/discussions/search/?q=dash · https://steamcommunity.com/app/2321470/discussions/0/6292161380818928785/
- The only existing substitute named is a Scout build with a 25% dodge chance, judged unreliable. **[C]** same thread.
- No dash has been added **[I from absence]**.

**Takeaway [I]:** a verb expressed through steering adds decisions without input cost. It does not stop dash requests.

---

## 8. Nova Drift

**Verbs and inputs**
- Thrust-and-turn. Keyboard defaults: A/D turn, W thrust, Space fire, Shift/Q/E for mods such as Blink and Strafe. **[S, search snippet]** https://www.magicgameworld.com/?p=41730
- Mouse option: the ship aims at the cursor; controls can be mixed freely (mouse to aim and fire, keys to thrust). **[C]** Bozobub, https://steamcommunity.com/app/858210/discussions/0/2969524117998397092
- A setting disables automatic mouse-aim detection. **[S, search snippet]** https://pixeljam.itch.io/nova-drift/devlog/76032/the-first-major-update-is-live-quality-of-life-game-balance-drone-ai-improvements
- The developer's FAQ, as quoted by a player: giving up twin-stick controls is core to the design and to the Drift mechanic. **[C quoting S]** same Steam thread.

**What players say**
- Controls are the largest negative theme (Vaporlens weight 0.40); refunds within the hour are reported. **[C]** carried from `../game-audit-2026-11-11/notes/modular-ship-peers.md`
- Requests for an optional twin-stick or WASD mode; one poster finds it hard to tell which side is forward. **[C]** same Steam thread.
- Mouse suits builds that need precise aim, keys suit ramming builds; the scheme can be changed before each run. **[C]** CHOO CHOO, https://steamcommunity.com/app/858210/discussions/0/2266943550297394259/
- Mouse steering bug reports recur (unresponsive, over-sensitive, spontaneous rotation). **[C]** https://steamcommunity.com/app/858210/discussions/search/?q=mouse+controls (416 hits)
- Patch history: the Strafe mod was near-mandatory for high scores and its cooldown was lengthened 1 → 1.5 s while Blink's was shortened. **[S]** carried from `../cards-2026-10-21/notes/nova-drift.md`

**Takeaway [I]:** in thrust-and-turn physics, where the hull points is the aim. One mouse can do both jobs only because the gun fires along the nose. Optional mobility actives turn into must-picks.

---

## 9. Death Must Die

**Verbs and inputs**
- Move; attack (hold, or auto-attack toggle on Q); aim with the mouse or auto-aim at the nearest; **dash** with i-frames. **[C]** https://steamcommunity.com/app/2334730/discussions/0/3975051032840104903/
- Dash default cooldown 2.7 → 2.4 s on 17 Nov 2023, marked as inspired by community feedback. **[S]** https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=2334730&count=60&maxlength=0
- Scaling: dash "blessings" add effects; a later item adds dash recharge speed. **[S]** same feed.

**Developer changes and reasons [S, same feed]**
- **Attack slowdown.** Moving slower while attacking was intended as a tactical consideration. Players widely called it clunky. 17 Mar 2024: the team tested without it and liked it; 20 Apr 2024: it became an optional difficulty modifier.
- **Auto-attack.** 17 Mar 2024: auto-attack now fires only when an enemy is in range.
- **21 Nov 2025 roadmap.** The team writes that with auto-attack on, dashing is the only skill left to the player, which they call "quite limiting". They announce a skill system where a build can use anywhere from 0 to 5 buttons.
- **17 Aug 2026.** They report the split in feedback: some players fear more inputs make the game "too active", others want more action. Skill upgrades let a player push skills toward fewer or easier inputs (for example removing targeting).

**What players say**
- The demo had manual attack with auto-aim on a shoulder button; release removed it. Posters call the current options clunky and ask for it back. A developer replied (5 Jan 2025) that the programmer found the old scheme confusing and that they are arguing for its return. **[C/S]** thread above.
- A prospective buyer says auto-aim makes it feel as if the game is playing itself. One opinion. **[C]** same thread.
- Requests for auto-aim date from the demo (Jun 2023) and for mouse-only movement (Dec 2024). **[C]** https://steamcommunity.com/app/2334730/discussions/search/?q=auto+aim (129 hits)

**Takeaway [I]:** the clearest evidence in the sample. A team that shipped dash + auto-attack concluded two years later that the dash alone leaves too little to do, and that the audience is split on how many buttons it wants. Their answer is opt-in: the build decides the button count.

---

## 10. Starsector

**Verbs and inputs**
- Flight on keys: A/D turn, W/S thrust; Shift+A/D strafes and turns the ship toward the cursor. **[S]** "Starfarer Manual" (old version of the game, number not stated) https://docs.google.com/document/d/1Tn8lAEi8hZAHDDgOSZ_HJx_0bgQMQ_Tt2TNx2kXbQVc/pub
- **Weapon groups.** Number keys select a group; the selected group tracks the cursor and fires on left click. Shift+number toggles **autofire** for a group; autofire groups pick their own targets even while another group is selected. **[S]** same manual.
- Up to 7 groups in the current game; autofire's starting state is set per group in the refit screen. **[S]** https://starsector.wiki.gg/wiki/Refit_Screen (the manual says 4 — outdated).
- Other verbs: right click toggles shields, V vents flux (no firing or shields while venting), R targets the ship under the cursor. **[S]** manual.
- Cost model: the manual warns that autofire on too many groups maxes out flux quickly. **[S]**

**What players say (via Reddit mirrors found by search; not opened directly)**
- Common beginner advice: put point defence on autofire and keep main guns manual; if struggling, put more groups on autofire. **[C]**
- Some players dislike piloting by hand and hand the flagship to the autopilot. **[C]**
- Sentiment was not researched in depth **[?]**.

**Takeaway [I]:** the cleanest form of option B. The player chooses which weapons are theirs, and a shared resource makes "everything on auto" wasteful. It depends on the mouse being free, because flight is on the keyboard.

---

## 11. Cosmoteer

**Verbs and inputs [S]** https://cosmoteer.wiki.gg/wiki/Guides_Hub/Ship_Control
- Direct control mode: WASD flies; weapons turn to the cursor and fire on left click.
- Per weapon, a menu keeps it AI-controlled or sets its manual fire key. A shortcut switches AI weapon control off entirely.
- Target designation: select weapons, Ctrl+right-click a target; "fire at target" is recommended for concentrating fire; a picture-in-picture view lets you target a specific enemy part.
- Fire modes: hold fire, fire at will, autofire.
- An aim-assist setting and an automatic brake setting exist.
- Player sentiment on direct control was not gathered **[?]**.

**Takeaway [I]:** a built ship with many weapons handles manual control by letting the player pick per weapon and by offering designation as the lighter alternative.

---

## 12. Dome Keeper

**Verbs and inputs**
- Laser Dome: one laser the player moves along the dome and fires; "Move Speed" is an upgradable stat (base 0.20). **[S]** https://domekeeper.wiki.gg/wiki/Laser_Dome (the page gives the stat but not the keys **[?]**).
- Automation is bought: Laser Sight adds an aim line (4 iron); **Swivel Head** makes the laser auto-aim within 6° (+6° per step, 16 iron); **Double Laser** adds a second turret that splits firepower (80% damage). **[S]** same page.
- Artillery Dome: the player aims and fires a mortar with limited rotation (upgrades widen it by 14° and speed it up) and an anti-air gun; a later upgrade swaps bullets for homing rockets. **[S]** https://domekeeper.wiki.gg/wiki/Artillery_Dome
- Sentiment was not gathered **[?]**.

**Takeaway [I]:** aim assist as a small-angle upgrade keeps manual aim meaningful while removing its frustration. Automation is a purchase, not a setting.

---

## 13. World of Warships (secondary guns)

**How it works [S]** https://wiki.worldofwarships.com/Ship:Secondary_Armament
- Secondaries are never player-aimed. Each mount fires at the closest enemy it can bear on, so the ship can engage several targets.
- **Ctrl + left click** designates one priority target. Guns that can bear on it fire at it; the rest keep shooting the closest target they can reach. An icon marks it.
- By default designation gives no bonus.
- The skill Manual Secondary Battery Aiming changes that: base −10% reload and dispersion; while firing at the designated target the dispersion bonus builds to −32.5% in 10 s and to −55% after a further 35 s; switching target cuts the built-up bonus by 20%; it decays over 15 s when firing stops.
- Sentiment was not gathered **[?]**.

**Takeaway [I]:** the reference for marking. One target at a time, a fallback for guns that cannot reach, and a bonus that grows with commitment so that re-marking has a cost.

---

## 14. The Riftbreaker (thin data)

- Twin-stick mech with player-aimed weapons, plus automatic defence towers. Not verified from an official control list today **[?]**.
- Forum search found no thread weighing mech weapons against towers. Two loosely related posts: defence advice that is entirely about walls and towers, and a complaint that a boss which destroys towers and forces a solo fight spoiled the flow. Two opinions. **[C]** https://steamcommunity.com/app/780310/discussions/0/583935357196827830/ · https://steamcommunity.com/app/780310/discussions/0/598536186508652089/
- No conclusion is drawn from this game.

---

## 15. TerraTech Legion

- Built block vehicle in a bullet heaven. Each character has an ability (phasing through enemies, a plasma trail, a stun, and so on); boosters are a build part that trades toughness for speed. **[S]** https://store.steampowered.com/app/3596700/
- Whether weapons are aimed by hand is not stated on the store page **[?]**.
- Controls and handling are the top complaint (Vaporlens weight 0.66: sluggish, complex, steering reversal). Some praise responsiveness (0.17). A small group asks for mouse control (0.07). **[C]** https://vaporlens.app/app/3596700/terra_tech_legion.md

**Takeaway [I]:** where the build changes handling, handling is already the main friction. Adding a second real-time input stream on top of it is a risk in itself.

---

## Sources that failed
- `store.steampowered.com/appreviews/...` — redirects to the store home page.
- PC Gamer DRG:S review, GamesRadar genre feature — page body truncated.
- Prima Games HoT controls guide — 403.
- starsector.wiki.gg/wiki/Weapon_groups, mindustrygame.github.io wiki FAQ — 404.
- 80.lv Vampire Survivors piece — contains nothing on design.
- Halls of Torment news feed: only the first 200k of 293k characters were read; older auto-aim patch lines may exist beyond that.
