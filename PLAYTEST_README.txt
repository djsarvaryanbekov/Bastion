Drift Bastion — PC playtest

Open Drift_Bastion_Playtest.html in Chrome or Edge. The game is self-contained
and works offline. Use Fullscreen in the menu or Settings. This is the PC
playtest; a native executable and Steam integration are still to come.

CONTROLS
W/S: thrust. A/D: turn. Hold left mouse on the battlefield to follow the cursor;
release to coast. Weapons fire automatically.
B: open/resume Build. P or Escape: pause. Escape closes the current layer first.

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

PRESENTATION
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
Build retains installed turret angles and the same upgrade rank badge as combat.
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
