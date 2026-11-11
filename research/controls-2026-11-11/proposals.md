# Proposals — an active verb for Bastion

**Nothing here is built or tested. Every number is provisional.** Evidence is in `notes.md` and `patterns.md`; the labels are the same (**[S]**, **[C]**, **[I]**, **[?]**, **[code]**).

## The filter every proposal passed

1. **Pillar test.** It uses the grid, the neighbours, detachment, drift or the swarm in a way that could not be pasted into the source game unchanged.
2. **Input test.** One button or one click, no sustained aim, direction taken from the ship or from one sampled point (`patterns.md`, input conflicts).
3. **Decision test.** It creates a choice between dangers, not only a reaction to one. This is the lesson from Death Must Die's developers, who had a dash and still called the play limited **[S]**.
4. **Opt-in test.** The audience splits on wanting more buttons (Death Must Die, Brotato's dash thread) **[S/C]**, so the best verbs are ones a build can take or leave.

Free inputs today **[code]**: Space, Shift, Q, E, R, F, right mouse button; a second finger on touch.

---

## 1. Salvage Run — steering gets a second job (no button)

- **Effect.**
  - Normal kills still credit Matter directly.
  - Each enemy group's last survivor, every elite and every boss phase drops a **Matter cache**. Caches carry about 20% of a wave's total Matter between them. A cache expires after 10 s. Any hull tile touching it collects it.
  - A detached module drifts for 8 s (the life the Castaway wrecks already use **[code]**). Touch it with the hull and it **re-docks** in its old slot at 40% HP if that slot is still attached to the ship. If the slot is gone, it pays 40% of its price in Matter instead.
- **Pattern / inspired by.** Verb through movement: DRG:S mining, GUNBOAT-8's expiring scrap, VS gems and chests.
- **Why it is fun here.** Pillar 4 (parts break off) becomes a rescue instead of a pure loss (audit M4; you liked drifting chunks on 10-14). Pillar 3 gets a reason to fly *into* trouble. Every no-verb success in the sample puts something on the field to fetch **[S]**; Bastion has nothing **[code]**. An idle ship now loses income and modules.
- **Input.** None. Identical on mouse-follow, WASD and touch by construction.
- **Readability.** Caches reuse the Matter colour with a shrinking ring for the timer. Drifting modules reuse the debris sprites with an outline in the module's colour and the same ring. Edge arrows if off-screen.
- **Risks.**
  - AFK stays if a still ship can survive anyway; this only makes idling poorer, not fatal.
  - Chore risk if caches are many and small. Keep them few and large.
  - A wide ship collects by accident; that is acceptable and rewards size.
  - Economy shifts: total Matter must stay the same for a player who collects about 70%.
  - Interaction with Castaway Protocol (wrecks that keep firing) needs a rule: a wreck can still be re-docked.
- **Cost.** M. Cache entity and collision; re-dock on top of `spawnDerelict` / `detachTile`; telemetry for collected share.
- **Not pasteable because** re-docking depends on the grid slot and on which neighbours survived.

## 2. Kill Zone — mark an area, the ship's guns converge

- **Effect.**
  - Place a circular zone, radius 150 px, for 6 s. Cooldown 10 s from placement.
  - A weapon that has any enemy inside the zone within its own range targets that enemy instead of the nearest one. Weapons that cannot reach the zone keep their normal target.
  - **Crossfire:** enemies inside take +6% damage for each different weapon family currently hitting the zone, up to +30% at five families.
  - One zone at a time. Placing a new one ends the old one.
- **Pattern / inspired by.** Target marking: World of Warships secondaries (one mark, fallback for guns that cannot bear, a bonus that rewards commitment) **[S]**; 20MTD players asking auto-aim to prioritise bosses and elites **[C]**.
- **Why it is fun here.** Pillar 1: how many families reach the zone depends on where they sit on the hull, so you turn the ship to bring a side to bear. Pillar 4: grouped swarms make an area mark meaningful where a single-target mark would not be. It answers the one thing auto-aim is known to do badly **[C]**.
- **Input.**
  - Mouse-follow: **right click** at the cursor. Steering on LMB is not interrupted; the cursor visits the spot for one click.
  - WASD: right click (mouse is free), or **Space** = zone on the densest pack within 500 px ahead of the nose.
  - Touch: second-finger tap on the spot.
  - A future pad: one button, same rule as Space.
- **Readability.** A ring (existing ring VFX) in a colour no enemy uses; one pip on the ring per family hitting it; tracers already show the convergence.
- **Risks.**
  - Could be pressed on cooldown without thought. The 10 s cooldown against 6 s life leaves a 4 s gap so that placement matters; tune after play.
  - Overkill: 20 guns on a small pack waste shots. The area form softens this.
  - Mouse-follow players must flick the cursor off their heading for a moment. If that feels bad, the Space rule can serve all inputs.
  - Balance: +30% is a real multiplier; enemy HP per wave may need a small raise.
- **Cost.** S–M. A priority branch in `findTarget`, zone state, ring draw, one HUD cooldown.
- **Not pasteable because** the bonus counts weapon families and depends on hull layout and facing.

## 3. Manual Trigger — choose which modules are yours (option B without aiming)

- **Effect.**
  - In Build, trigger-type modules get a switch: **Auto / Manual**. First version: Gravity Well and Pulse only.
  - A Manual module stops firing by itself. It stores up to 2 charges at its normal cooldown and fires on command with +40% effect (Gravity: radius and duration; Pulse: radius and damage).
  - Gravity fires at the Kill Zone if one exists, otherwise at the densest pack in its range. Pulse is radial and needs no target.
  - One command fires every Manual module that has a charge.
- **Pattern / inspired by.** Player group + auto groups: Starsector's per-group autofire choice, Cosmoteer's per-weapon AI switch, Halls of Torment making one character's attack manually triggered **[S]**. Opt-in button count: Death Must Die's 0–5 skill plan **[S]**.
- **Why it is fun here.** Pillar 2: you pull a pack together and then let the Ember–Cannon side burn it. The auto Gravity Well wastes pulls on stragglers **[I, unverified in play]**. A player who wants no buttons leaves every switch on Auto and loses nothing.
- **Input.** Space on keyboard and mouse-follow; one on-screen button on touch. No aim.
- **Readability.** Manual modules show a small charge pip on the tile; the HUD shows one combined charge counter.
- **Risks.**
  - If +40% is too generous, Manual becomes mandatory and the opt-in is fake (Nova Drift's Strafe became near-mandatory **[S]**). If too small, nobody uses it.
  - Shares Space with other proposals; only one of 3, 5, 6, 8 should own it.
  - Extending it to Missile or Mine needs a target rule and is deferred.
- **Cost.** M. Per-tile flag, charge storage, Build UI switch, 16-language strings.
- **Not pasteable because** it is a per-tile choice inside a neighbour-combo grid.

## 4. Reactor Surge — a verb you buy as a module

- **Effect.**
  - Only if the ship has at least one Reactor.
  - Press: for 4 s every Reactor's 3×3 bonus rises from +25% to +75% fire rate.
  - Then all Reactors go dark for 6 s (the +25% is lost too). The button is ready again when they relight.
- **Pattern / inspired by.** Cooldown ability with a cost: Starsector's vent (power now, a window of weakness after) **[S]**.
- **Why it is fun here.** Pillar 1 and 2: the surge is as big as your Reactor layout. A ship built around two Reactors has a strong button; a ship without Reactors has none. It gives Reactor placement a second reason.
- **Input.** One key (E, or Space if nothing else owns it); one touch button.
- **Readability.** Reactor tiles brighten, then go dim; the affected weapons' muzzle flashes already speed up.
- **Risks.**
  - Net gain over a 10 s cycle is small by design (4 s at +75%, 6 s at 0, against 10 s at +25%). Its value is timing: a boss opening, a pack arriving. If players find the best play is never to press it, raise the surge, do not shorten the dark time.
  - Pushes builds further toward the compact blob the audit already warns about (M1).
- **Cost.** S. One timer in the Reactor bonus path, a tint, a HUD icon.
- **Not pasteable because** the effect is defined by a 3×3 neighbourhood on the player's own grid.

## 5. Core abilities — one verb per core, chosen before the run

- **Effect.** Each of the four cores gets one active on the same key, replacing the idea of a universal verb:
  - **Standard:** Kill Zone (proposal 2).
  - **Striker:** Kick (proposal 8).
  - **Bulwark:** Lockdown — 2.5 s, modules take 70% less damage and the ship cannot thrust; cooldown 20 s.
  - **Salvager:** Tractor — pulls every cache and drifting module within 600 px to the hull; cooldown 15 s (needs proposal 1).
- **Pattern / inspired by.** Character special: HoloCure's one special per character; TerraTech Legion's character abilities **[S]**.
- **Why it is fun here.** The audit found cores are four stat multipliers that do not change play (M2). The audience split on inputs **[S]** is handled by choice of core.
- **Input.** One key for all; one touch button.
- **Readability.** One HUD slot with the core's icon and a cooldown sweep.
- **Risks.** Four verbs to balance; new players start on Standard and never meet the others unless unlocks are quick (audit L2). Reception of HoloCure's special was not found **[?]**.
- **Cost.** M–L (sum of its parts). Start with two cores.
- **Not pasteable because** two of the four act on the grid or on detached parts.

## 6. Held Volley — stop firing, then unload

- **Effect.**
  - Hold the key: all weapons cease fire and each banks shots at its normal cooldown, up to 3.
  - Release: banked shots fire in a ripple from the core outward over 0.6 s. No damage bonus.
  - While holding, Flak, Shield and Repair keep working.
- **Pattern / inspired by.** Fire-mode control: Cosmoteer's hold fire / fire at will **[S]**. Brotato players prefer staggered fire to everything at once **[C]**, hence the ripple.
- **Why it is fun here.** Pillar 4: grouped swarms reward a burst at the moment the group is dense, chilled or pulled together. Pillar 2: Ember bursts and Cryo chills can be lined up with the release.
- **Input.** Hold and release one key; hold a touch button.
- **Readability.** Weapon tiles fill one to three pips; the silence itself is the tell.
- **Risks.** Total damage is unchanged, so its value may be too subtle to feel. Holding fire in a swarm is frightening, and new players may never try it. Hold inputs are poorly discovered (HoloCure strafe **[C]**).
- **Cost.** S–M.

## 7. Scuttle — eject a dying module as a bomb

- **Effect.**
  - Hold F for 0.4 s: the outer module with the lowest HP, if below 35%, is ejected away from the hull.
  - After 1 s it explodes: radius 160 px, damage equal to twice the module's maximum HP.
  - Pays back 25% of the module's price.
- **Pattern / inspired by.** Loss turned into an attack: Nova Drift's mine-on-death mods (see `../cards-2026-10-21/notes/nova-drift.md`).
- **Why it is fun here.** Pillar 4 again: a module about to be lost becomes a choice. Captain Forever Remix players complain of losing more than they gain (audit M4).
- **Input.** One key; one touch button that appears only when a module qualifies.
- **Readability.** The qualifying module pulses; the eject reuses detach debris and an existing blast.
- **Risks.** Competes with re-docking (proposal 1) for the same moment; pick one meaning for a dying module. Accidental use is costly, hence the hold. Rarely available, so it does not answer "AFK-able".
- **Cost.** M.

## 8. Kick — the dash, shaped by the hull (option A)

- **Effect.**
  - +200 px/s along the ship's **current heading** (not toward the cursor); speed cap ×1.7 for 0.5 s; then normal damping.
  - Cooldown 7 s. No invulnerability. Small enemies touched during the kick are shoved with the existing knockback.
  - Heavier and wider ships already accelerate less (`massFactor`, handling spread **[code]**), so the kick scales the same way.
- **Pattern / inspired by.** Dash: Death Must Die (2.4 s cooldown, i-frames) **[S]**; the recurring requests in Brotato and DRG:S **[C]**.
- **Why it is fun here.** It is the genre's expected panic button and suits drift: kick, release, coast.
- **Input.** Space or Shift; one touch button. Heading-based, so identical on all three inputs.
- **Readability.** Existing drive particles, longer for the kick.
- **Risks.**
  - **It is the rejected Afterburner in a different slot.** The research adds demand evidence, not a new design.
  - Death Must Die's developers say a dash alone leaves play limited **[S]**. It adds a reaction, not a decision.
  - Enemy speeds and boss patterns would need retuning around it; a Brotato poster's balance objection applies **[C]**.
  - Without i-frames a 20-tile hull cannot dodge through anything, so it is an escape, not a dodge.
- **Cost.** S for the verb, M once retuning is counted.

## 9. Brake — an assist, not a verb

- **Effect.** Hold Shift: damping triples, so the ship stops in about half a second; turn rate +30% while held. No combat bonus.
- **Pattern / inspired by.** Handling aids: Cosmoteer's automatic brake setting **[S]**; inertia as the top complaint in Nova Drift and TerraTech Legion **[C]**.
- **Why it is here.** It was on the candidate list. The evidence supports it as an accessibility aid (audit M8), not as an answer to "AFK-able". A stance bonus for holding still is the rejected Drift Gunnery, and stand-still items underperformed in Brotato **[S]**.
- **Input.** Hold one key; touch: second-finger hold.
- **Risks.** A stopped ship in a swarm dies; players may read the button as a trap.
- **Cost.** S.

---

## Ranked shortlist

| Rank | Proposal | Option | Answers "AFK-able"? | Input load | Cost | Main evidence |
|---|---|---|---|---|---|---|
| 1 | Salvage Run | C | Partly — idling costs income and modules | none | M | Every no-verb hit gives steering a second job |
| 2 | Kill Zone | C (B-lite) | Yes — a repeated placement decision | 1 click | S–M | WoWS marking; 20MTD priority complaints |
| 3 | Manual Trigger | B, safe form | Yes, for those who opt in | 1 button | M | Starsector, Cosmoteer; Death Must Die's opt-in plan |
| 4 | Reactor Surge | C | Yes, for Reactor builds | 1 button | S | Starsector vent |
| 5 | Core abilities | container | Depends on core | 1 button | M–L | HoloCure, TerraTech Legion |
| 6 | Held Volley | C | Weakly | hold | S–M | Cosmoteer fire modes |
| 7 | Scuttle | C | No — too rare | 1 hold | M | Nova Drift mods |
| 8 | Kick | A | No — reaction only | 1 button | S (+M tuning) | Death Must Die's own verdict |
| 9 | Brake | C | No | hold | S | Assist only |

## Recommendation

**C. Not A as the answer, and not B as mouse-aimed weapons.**

- **A (dash).** Cheap and expected, and players of every auto-fire game ask for one. But the one team in the sample that shipped dash + auto-fire later wrote that it was not enough **[S]**. A dash would also be the rejected Afterburner again. Keep it as the Striker core's ability if cores get abilities; do not build it first.
- **B (player-aimed weapons).** Fails on three counts: the mouse already steers and its cursor points away from the threat **[code/I]**; touch has no cursor **[code]**; and Brotato shows that many guns on one cursor is worse than auto **[C]**. What survives of B is the idea that the player owns some weapons. Proposal 3 keeps that without aiming.
- **Do nothing.** Not supported. Bastion asks less of the player than the no-verb games do, because it has no pickups and a slower reward rhythm **[code]**. But note how thin the trigger is: "AFK-able" comes from one tester.

**Suggested order**

1. **Measure first (S).** Run a no-input ship with real damage through waves 1–10, and log the share of wave time with no input in telemetry. If a still ship survives past wave 5, the cause is threat design (snipers, bombers and bolters not punishing a parked ship), and no verb will fix that **[I]**.
2. **Salvage Run** — no input cost, and it reuses detach and derelict code.
3. **Kill Zone** on right click and Space.
4. Playtest those two together. Only then decide on Manual Trigger or Reactor Surge as the opt-in layer. Give Space to one of them, not both.

## Open questions

1. Is GUNBOAT-8's "dash" real? No source found one. If it is the drift button, the comparison changes.
2. Does a parked ship survive today? This decides whether the problem is verbs or threats.
3. Is right click acceptable for mouse-follow players, or must every verb sit on a key?
4. Is touch still a real target? If not, the cursor constraint loosens for Kill Zone but not for B.
5. Should a dying module be rescued (1) or weaponised (7)? Not both.
6. One universal verb, or one per core (5)?
