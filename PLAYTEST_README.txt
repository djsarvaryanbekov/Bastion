Bastion — PC playtest

Open Drift_Bastion_Playtest.html in a modern desktop browser. It is self-contained
and works offline. Use Fullscreen in the menu or Settings. This is the PC
playtest; a native executable and Steam integration are still to come.

CONTROLS
W/S: thrust. A/D: turn. Hold left mouse on the battlefield to follow the cursor;
release to coast. Weapons fire automatically.
B: open/resume Build. P or Escape: pause. Escape closes the current layer first.

LANGUAGES — 2026.10.20-languages-51
Bastion is playable in 16 languages: English, French, Italian, German,
Spanish (Spain), Spanish (Latin America), Simplified Chinese, Traditional
Chinese, Japanese, Korean, Polish, Portuguese (Brazil), Russian, Thai, Turkish
and Uzbek. The system language is used on first launch; Settings > Language
changes it (after the current run if one is active). Translations are drafts
awaiting native-speaker review.

RUN SAFETY — 2026.10.20-bank-run-50
Closing the window mid-run banks the run like End run: Fragments and their
progress are kept. An unexpected error now stops the game on a crash screen
instead of freezing silently; the current run is banked first. Copy error
gives a report for bug reports. The game is named Bastion in the window
title and menu.

CRYO MISSILES — 2026.10.17-cryo-missile-49
An edge-adjacent Cryo gives Missile Pods a cold payload at each discharge.
Existing blast areas slow surviving ordinary enemies by 25% for 1s; bosses
retain at least 80% speed. Salvo, Heavy and Cluster retain their damage/radii.
Repeated hits refresh one chill; extra Cryos and overlapping blasts do not
stack strength. Weak missile chill neither weakens nor extends a stronger
active slow and never contributes to the Freeze specialization's hit count.
Launched payloads persist if the Cryo is lost; future shots recheck the link.
Cold warheads, cyan trails, brief ice fragments and existing hull frost show
the effect. Build badges, previews and the installed inspector explain it.
Missiles touching a boss now place the primary blast on its hull, fixing a
small gap where collision could trigger outside blast range. Cluster secondary
blast positions and every blast radius remain unchanged.
Cryo + Rail retains its +25% damage against actual chilled/frozen enemies,
including missile chill. Diagonals do not link. Laser gains no Cryo combo.

CRYO / RAIL RELIABILITY — 2026.10.16-cryo-reliability-48
Rail and Cryo now check their complete path each simulation step, including the
initial origin-to-muzzle segment. Fast shots cannot skip small enemy hulls
between endpoints. Hits use the existing round/rotated hull shapes and occur
in travel order; Cryo stops at the first hull and Rail retains its piercing.
Shatter, Freeze, recoil and weapon damage values remain the same.
Previewing a Rail attachment shows whether it has a Cryo edge link and the
conditional Shatter bonus. An installed unlinked Rail explains how to connect
Cryo. Leaving the preview clears its temporary link message and badge.

CRYO SHATTER — 2026.10.16-cryo-shatter-47
Cryo enables Shatter rounds in edge-adjacent Rail Lances. Each round checks the
link when fired and deals 25% extra damage only to enemies actually chilled or
frozen at impact. Extra Cryos do not stack the bonus. Cryo slow/freeze values,
Rail piercing, aiming, reload and knockback remain the same. Moving or losing
the Cryo removes the link for future shots; launched rounds keep their charge.
Cold Rail tracers and brief ice fragments show the combo. Build highlights the
affected Rails and explains the target condition. Diagonal neighbors do not link.
Build upgrade details now show per-copy arithmetic and the inherited-upgrade
surcharge paid by future copies. The new-copy inspector breaks down base price
and inherited upgrades. Prices and Matter/Fragment rules remain the same.

MODULE COLLISION — 2026.10.16-module-collision-46
Modules occupy solid square cells. Hostile bullets check their complete travel
path and hit the first blocker, including corners and fast crossings. Armor
and Bulkhead stop Sniper shots; other modules retain the two-target penetration
rule. A projectile hit gives only that module 0.10 seconds of repeat-shot grace.
Newly purchased modules get 0.35 seconds of protection when combat resumes.
Protected modules still stop bullets. A pale square rim shows these windows;
ignored hits do not refresh them. Build and pause do not spend protection time.
Moving existing modules does not grant protection. Continuous contact damage,
explosion rules and the Reserve circuit upgrade are unchanged.

CRYO PRESENTATION — 2026.10.16-cryo-status-45
Chilled enemies carry pale frost patches on their armor and shed small cyan
particles. The Freeze upgrade adds heavier frost during its actual freeze;
the appearance returns to light frost as the unit thaws. Frost fades near
status expiry. It follows the hull silhouette and remains visible at Low
quality and with Reduced flashes. The old partial blue arc is removed.
Damage, slow, freeze, boss resistance and all combo rules are unchanged.

FIRE PRESENTATION — 2026.10.16-enemy-burn-43
Mindustry's Scorch and burning particles are the reference for this pass.
Ember fires a connected plume of overlapping yellow/orange puffs, with a short
hot nozzle tongue and detached cooling tips. The nozzle fades as emission ends.
Burning enemies emit compact fire clusters across their hulls. Yellow cores
cool into shrinking orange cinders; emitted fire separates from moving and
turning ships. The old three fixed bright dots are removed.
Ignited Cannon, Scatter and Flak use matching warm tracers, trails and bursts.
Ignited Cannon and Scatter fire a brief warm puff
from its actual barrel; its floating side sparks are removed. Flak retains
the active-combo contact sparks.
The spray clips to the real damage cone. Ember damage values are unchanged.
Quality settings limit animation; reduced flashes keeps steady
warm hull patches and subdued attack effects.

EMBER COMBO — 2026.10.16-cannon-ember-44
Only an actual Ember discharge activates the combo for 0.2 seconds. During this
window, edge-adjacent Auto Cannon rounds, Scatter pellets and Flak hits apply
3 burn damage per second for 1.5 seconds. Idle adjacency gives no damage bonus and does not force
neighboring weapons to fire. Each delayed discharge checks the current window.
Repeated hits refresh one burn; extra Embers and volley hits do not stack its DPS.
A weaker combo cannot extend a stronger Ember burn or inherit specializations.
Ignited rounds keep their effect in flight. Piercing Cannon applies the burn to
each enemy directly hit, within its existing penetration limit. Cannon volley
counts, direct damage and reload times are retained. Warm tracers, trails and
Flak rims show the combo; Build badges, placement previews and the inspector
explain the condition.

SHIP HANDLING — 2026.10.14-shape-handling-36
Module mass and distance from the Core now affect turning. Compact layouts retain
their existing response. Spread-out or off-center weight slows turn speed by up
to 28% and eases turn acceleration and braking. Mouse, keyboard and touch share
the same limits. Handling updates after purchases, dismantling and combat losses.
The Core remains the rotation pivot; linear thrust, drag and speed rules retain
their existing mass and Core modifiers.

WEAPON MUZZLES — 2026.10.14-muzzle-alignment-35
Projectile weapons use muzzle positions measured from their installed artwork.
Shots and flashes follow turret aim and recoil. Missiles cycle through four
visible tubes; Flak alternates its two barrels. Laser, Arc and Ember visuals
start at their emitters, with their existing damage bounds preserved.
The first projectile collision check includes the launch path, preventing a
blind spot beneath long barrels. Damage, reload times and shot counts are retained.

WEAPON FEEDBACK
Auto Cannon, missiles, Scatter, Flak and Rail kick their weapon assemblies back
on every discharge, including base weapons. Heavy upgrades have a stronger kick.
The kick holds briefly, then returns over a total of 0.30 seconds. Platforms and
swivel mounts stay fixed. Rail, Heavy/Cluster missiles and Double blast also apply
a small impulse opposite their firing direction, scaled by ship mass. Opposing
guns cancel; a shared fleet budget bounds broadside and sustained recoil.
Volleys use one kick, and delayed bursts kick per discharge.
A brief low thump and mechanical snap layer over the existing heavy firing sounds;
the shared audio throttle, voice limit, mute, focus and volume settings apply.
Damage, reload times, projectile counts and economy values are unchanged.

STRUCTURAL BREAKAWAY
When a connection is destroyed, each disconnected group of two or more modules
keeps its shape as one drifting, slowly spinning wreck for about three seconds.
Sparks mark the broken connection. Wrecks use the installed module artwork and
turret angles, and remain visual effects with no collision or salvage payout.
Module losses, family upgrades and both currencies retain their existing rules.
Individual destroyed modules retain their existing debris. Effects respect the
quality budgets and Reduced flashes setting.

BUILD AND PROGRESSION
Choose a catalog module, then click a valid slot or drag its card onto the grid.
Placement is immediate. Select an installed module to inspect or dismantle it.
Upgrade tree applies run upgrades to the selected family’s installed copies.
Single-click inspects an upgrade; a fast double-click purchases an available one.
Locked upgrades remain inspectable. Branch licenses are unlocked between runs
in Hangar → Research.

Hangar sections: Modules, Cores, Calibration (permanent core ranks), Research
(weapon/support branches). Matter funds the current run. Fragments fund
permanent purchases. The center module list scrolls; the right inspector fits
its content and actions without a scrollbar.

TEST RANGE
Enter from the main menu or a Hangar module inspector, between runs.
Try all modules and upgrade configurations with free construction. Scenarios
include enemies, bosses, incoming fire, support tests, and resource pickups.
Reset scenario restores targets/hull; Reset loadout restores the demonstration
ship. Range activity grants no permanent rewards or records.

TRAINING — 2026.10.12-training-flow-28
Training keeps Resume and both Build workspace tabs visible. Its guide points
to Upgrade tree before the shared Cannon purchase and back to Ship layout
when another copy is needed.

PRESENTATION
Build 2026.10.13-build-workspace-31 expands the ship workspace, replaces the large
instruction card with a compact toolbar, and adds Fit ship plus layout zoom.
Automatic fit includes the complete layout and its next attachment cells.
Upgrade arrows require a legal affordable next purchase (free in Test Range);
locked Hangar branches do not qualify. Repair Arrays can heal themselves and
other Arrays after the target has taken no hull damage for 2s. Repair overlap
does not stack; these combat rules are unchanged.

Build 2026.10.13-support-presentation-30 shows a subtle energy rim around protected
hull during combat. Overlapping fields share one barrier; each generator retains
its charge bar. Empty fields lose their barrier. The large combat coverage grid
and repeated module rank badges are removed. Family ranks remain in Upgrade tree.
Build shows received Shield, Repair, Bulkhead, Reactor and Siphon benefits on
installed modules and placement ghosts. Overlapping copies share one type icon.
Inspect a support to highlight its own area. Depleted shield icons dim. Reactor
and Siphon benefit weapons only; Siphon is ship-wide. Gold marks new shield range.
Bulkhead now protects all eight surrounding cells (3x3), including diagonals,
at the same 12% hull reduction per source and 48% cap. Other combat/economy values
are unchanged.

Build 2026.10.10-attack-vfx-27 adds animated attack effects for Auto Cannon,
Scatter Array, Missile Pod, Cryo, Ember, Gravity Well, Pulse Nova and Flak.
Scatter fires separate pellets; missiles leave trails along their homing paths.
This presentation update retains the current balance and weapon sounds.
The previous weapon and impact sounds are restored. Sprite wreckage and short
panel fades are included. Audio starts after interaction; Sound and Master volume are
in Settings. Focus loss stops audio. Reduced flashes reduces impact brightness;
reduced flashes or the system’s reduced-motion preference disables panel fades.

PC presentation is reviewed at 1920×1080. Other aspect ratios use a
centered 16:9 viewport. Settings retains text-size and comfort options. Diagnostic
tools are under Advanced settings. Keyboard and mouse are the supported inputs.

BALANCE — 2026.10.08-matter-economy-26
Each ordinary enemy type keeps fixed HP, shields and damage throughout the run.
The opening wave settings are preserved. Added group size, arrival frequency
and ranged escorts start at 8:00, approaching boss three. Keep investing in
weapons and upgrades. Shield capacity and recovery delay stay the same;
recharge is 3/s base, 4/s upgraded, or 6/s with Fast Recharge.
Bosses retain stronger health that varies by encounter. Weapon power and
ordinary enemy Matter payouts are unchanged. The first two copies and first
upgrade of each family keep their base prices. Additional copies become costlier;
second and later upgrades cost about 50% more. Hangar Fragment prices stay the same.
Build retains installed turret angles; family ranks appear in Upgrade tree.
Near stars and the world grid make forward travel visible.
Please export a playtest log after the run and note your weapon routes, boss
fight times, and whether a stationary ship remains safe once upgraded.

SAVES
This PC build uses drift-bastion-save-v2 and its backup/legacy
keys, plus drift-bastion-playtest-v1 for local telemetry. Saves belong to
the browser/origin; moving browsers does not transfer a profile automatically.

PACKAGE
Drift_Bastion_Playtest.html — playable game.
PLAYTEST_README.txt — these instructions.

DEVELOPMENT
Editable JS/CSS sources remain in the repository. npm run build:playtest writes
outputs/Drift_Bastion_Playtest.html. For a candidate, supply an explicit output:
node tools/build-standalone.js outputs/experiments/<task>/candidate.html
Run npm run check and the relevant tools/*.js or *.cjs checks before promotion.
Presentation checks: npm run test:presentation (uses an isolated derived fixture).
Attack effects: npm run test:attack-vfx (1920x1080, isolated browser storage).
