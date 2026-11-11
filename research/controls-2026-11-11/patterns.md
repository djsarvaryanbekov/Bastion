# Patterns — active verbs in auto-fire games

Built from `notes.md`. Labels: **[S]** sourced · **[C]** community opinion · **[I]** inference · **[?]** not found · **[code]** Bastion source. URLs for every claim are in `notes.md` under the named game.

## Taxonomy

| # | Verb | Games in the sample | Input cost | What it gives the player | Typical failure |
|---|---|---|---|---|---|
| 1 | None (steer only) | Vampire Survivors, Brotato (default), GUNBOAT-8, DRG:S | 0 | Low barrier, one hand, build is the star | "Plays itself" when steering has only one job |
| 2 | Verb through movement (collect, mine, objective) | DRG:S mining, VS gems and chests, Brotato materials, GUNBOAT-8 expiring scrap and '?' stages | 0 | A second reason to steer; risk/greed choices | Pickup chores; unreachable loot inside a swarm |
| 3 | Dash / boost | Death Must Die, 20MTD (one character), Nova Drift (Blink/Strafe mods); requested in Brotato and DRG:S | 1 button | A reaction to a mistake; a burst of control | Becomes the only skill; mandatory if optional; balance |
| 4 | Aim toggle (auto ↔ manual) | 20MTD, Halls of Torment, Brotato, Death Must Die | 1 key + a mode | Lets two audiences share one game | Hidden key, invisible state, bugs, weaker on controller |
| 5 | Fully manual aim | Nova Drift, HoloCure (mouse), 20MTD (default) | Continuous | Skill expression | Works for one gun; bad for many guns on one body |
| 6 | Player group + auto groups | Starsector, Cosmoteer, Dome Keeper (assist upgrades) | Continuous + setup | The player owns the important gun | Needs a free mouse; overload |
| 7 | Target marking | World of Warships secondaries, Cosmoteer "fire at target", Starsector target key | 1 click | Fixes auto-aim's priority errors | Pointless without a payoff; overkill on one target |
| 8 | Cooldown ability / special | HoloCure special, TerraTech Legion character abilities, Death Must Die's coming skills, Starsector vent | 1 button | A set-piece moment; build identity | Pressed on cooldown without thought; split audience |

## Evidence by pattern

### 1. No verb
- It works when steering does more than dodge. VS, Brotato, DRG:S and GUNBOAT-8 all put something on the field to go and get (gems, materials, ore, expiring scrap, chests). **[S]** per game.
- VS's own standing criticism is a shallow loop with only positional decisions (Vaporlens, 29 mentions). **[C]**
- Bastion's source inspiration, Galaxy Siege, was criticised because guns aim themselves and combat is non-interactive. **[C]** `../game-audit-2026-11-11/notes/modular-ship-peers.md`
- **[I]** Bastion is more passive than any game in this row: no pickups **[code]**, shop only between waves, and a card every 30–60 s instead of a level-up every few seconds. "Do nothing" would leave Bastion below the genre's baseline of activity, not at it.

### 2. Verb through movement
- DRG:S: a reviewer credits mining with making the play space matter — cut paths, bottlenecks, escape routes. **[C]**
- GUNBOAT-8's most-liked addition was the '?' objective stages; scrap pickups were given an expiry on 19 Oct. **[S/C]**
- Brotato: an analyst notes each item visibly changes how you move within a minute. **[C]** `../cards-2026-10-21/notes/brotato.md`
- **Why players respond [I]:** it turns one input into several decisions (where, when, how greedy) and costs no learning.
- **Failure modes [I]:** chores; loot you cannot reach; it does not silence dash requests (DRG:S still gets them **[C]**).

### 3. Dash / boost
- Demand is ambient. Brotato and DRG:S both get recurring requests (60 and at least 6 forum hits); neither developer has added one. **[C]**
- Death Must Die shipped a dash on a 2.7 s cooldown, shortened it to 2.4 s on feedback **[S]**, and two years later the developers wrote that with auto-attack on, dashing is the only skill and that this is limiting **[S]**.
- Nova Drift's optional mobility mods became near-mandatory for scoring and were re-tuned for it. **[S]**
- A Brotato poster argues a dash would break the wave balance. One opinion. **[C]**
- **Why players respond [I]:** a dash is a correction tool. It converts "I died and could do nothing" into "I mistimed it".
- **Failure modes:** it does not create decisions between dangers, so it does not answer "AFK-able" **[I from Death Must Die's own statement]**; enemy patterns must then be rebuilt around it; in a drift model it also changes momentum, so it must act along the hull's heading to be identical on every input **[I]**.

### 4. Aim toggle
- 20MTD added auto-aim a few weeks after launch as a casual mode. **[S]**
- The recurring complaints are about the toggle, not the aiming: key not discoverable (controller, Steam Deck), state not visible, toggled by accident and taken for a bug, auto-aim missing bosses. **[C]** 20MTD and Halls of Torment threads.
- Death Must Die removed a demo scheme because the programmer found it confusing; players asked for it back. **[C/S]**
- **Why players respond [I]:** fatigue relief and accessibility; one-handed play is cited in HoloCure and Brotato threads **[C]**.
- **Failure modes:** a long tail of support cost (HoT: 271 forum hits; 20MTD: 130; Brotato: 123) **[S counts]**.

### 5. Fully manual aim
- HoloCure's players defend it: without aim, directional and area weapons would be the same thing. **[C]**
- Brotato's players reject it: with six guns, pointing all of them at one cursor loses all-round coverage and staggered fire. Four of four in one thread; "inferior" in another. **[C]**
- Nova Drift makes it work with one gun on the nose, and still has controls as its top complaint. **[C]**
- **[I]** The number of independently mounted weapons decides this. One gun: manual aim is the game. Many guns around a body: manual aim is a downgrade. Bastion has 20+.

### 6. Player group + auto groups
- Starsector lets the player choose which group follows the cursor; the others autofire at their own targets; a shared flux pool punishes putting everything on auto. **[S]**
- Cosmoteer keeps a per-weapon AI switch inside direct control. **[S]**
- Dome Keeper sells automation: a 6° auto-aim cone, a second turret that splits damage. **[S]**
- Community advice in Starsector is to automate point defence and keep the main guns. Some players automate the whole ship. **[C]**
- **Failure modes [I]:** all three keep flight on the keyboard so the mouse is free. None steers with the mouse.

### 7. Target marking
- World of Warships: Ctrl+click marks one target; guns that can reach it obey, the rest keep firing at the nearest; a skill adds accuracy that builds over 45 s and drops 20% on re-marking. **[S]**
- 20MTD players independently ask for the same thing from auto-aim: a priority for bosses and elites. **[C]**
- Cosmoteer's guide recommends "fire at target" for concentrating fire. **[S]**
- **Why players respond [I]:** it fixes the one thing auto-aim is known to get wrong, with a single click and no sustained aiming.
- **Failure modes [I]:** no payoff, no use (WoWS gives none without the skill); in a 400-enemy swarm a single-target mark matters only for elites and bosses, so an area mark is the better fit.
- No bullet-heaven or wave-shop game with a mark verb was found **[?]**. This is untested ground in the genre, which is both the opportunity and the risk.

### 8. Cooldown ability
- HoloCure: one special per character on a gauge, cooldown shortened by shop upgrades and items. **[S]** Player reception not found **[?]**.
- TerraTech Legion: one ability per character. **[S]**
- Death Must Die is moving to 0–5 skills per build and reports that players split on wanting them. **[S]**
- **Failure modes [I]:** an ability with no cost or timing window is pressed whenever it lights up, which adds an input but not a decision.

## Cross-cutting findings

1. **The complaint behind "AFK-able" is a missing decision, not a missing button.** The Death Must Die team had a button (dash) and still described the play as limited. **[S → I]**
2. **Auto-aim's known weakness is priority.** Requests cluster on "shoot the elite / boss", not on "let me aim". **[C]**
3. **Many guns + one cursor fails.** Brotato is the direct test. **[C]**
4. **The audience is split, so the verb should be opt-in.** Death Must Die: some want action, others fear it becomes too active. Brotato's dash thread splits near even. **[S/C]**
5. **Toggles and holds are poorly discovered.** HoloCure's strafe, 20MTD's Space toggle, GUNBOAT-8's drift. **[C]**
6. **Slowing the player while they act reads as clunky.** Death Must Die made its attack slowdown optional. Brotato's stand-still items needed repeated buffs. **[S]**

## Input conflicts

### Mouse used for steering and for aiming
- Bastion's LMB-hold makes the cursor the place the ship flies to **[code]**. While held, the cursor is ahead of the ship. Chasing enemies are usually behind or beside it **[I]**. Aiming weapons at the cursor would aim them away from the threat.
- Nova Drift accepts the same coupling because its gun fires along the nose; players still ask for a twin-stick mode, and the developer refuses on principle. **[C]**
- Starsector and Cosmoteer avoid it by flying with keys. **[S]** That option is not open to Bastion without making WASD the "real" control scheme and mouse-follow a lesser one — against pillar 3.
- **What stays compatible [I]:**
  - A **click that samples a point once** (right mouse button). Steering continues on LMB; the cursor only has to visit the target for one click.
  - A **button with no aim** (Space). Direction comes from the ship: its heading, its velocity, or its layout.
- **What does not [I]:** anything that needs the cursor held on a target (continuous aim, beams, charge-and-aim) while LMB is steering.
- **A trap to avoid [I]:** "the cursor aims while you coast" (LMB released). It makes not-steering the firing stance, which is the rejected Drift Gunnery idea reached through the input layer.

### WASD
- Space, Shift, Q, E, R, F are free **[code]**. WASD players have a free mouse, so any cursor-based verb is easier for them than for mouse-follow players. A verb that needs the cursor therefore breaks parity unless it is click-once.

### Touch
- One floating joystick; a second finger is ignored today **[code]**, so one on-screen button or one tap-to-place is available. There is no hover and no cursor.
- 20MTD's mobile version auto-aims, and one PC player preferred it. **[C]**
- **[I]** Touch can do "press" and "tap a spot". It cannot do "hold aim while steering" comfortably. The phone build is archived, so this is a design constraint rather than a shipping target.

### Controller
- Bastion has no gamepad code **[code]**.
- Peers show the friction: GUNBOAT-8 players ask which stick steers; 20MTD and Halls of Torment players cannot find auto-aim on a pad; Brotato has no click-to-aim on a pad. **[C]**
- **[I]** A one-button verb maps to a pad trivially. A marking verb needs a rule to pick the target without a cursor (nearest elite to the nose).

### Resulting rule for Bastion [I]
A verb passes if it is **one button or one click, needs no sustained aim, and takes its direction from the ship or from a single sampled point**. That rules out pure option B and keeps a dash, a mark, a manual trigger, an overdrive, and every verb done through movement.
