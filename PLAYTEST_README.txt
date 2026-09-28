# Drift Bastion — PC UI/UX review copy

Open **Drift_Bastion_Playtest.html** in Chrome or Edge. It is self-contained and works offline. Use **Fullscreen** on the menu or in Settings for a borderless presentation. This is the playable PC redesign prototype; native executable packaging and Steam integration remain a later step.

This copy has its own profile. The original game and its saves are untouched. A new profile starts with the game's normal unlocks; use **Test range** to try every module and upgrade without grinding or buying anything.

## Controls and screens

- W/S: thrust. A/D: turn. Hold left mouse on the battlefield to follow the cursor; release to coast. Weapons fire automatically.
- B: open/resume Build. P or Escape: pause. Escape closes the current inspector/settings/tree layer first.
- Build: choose a catalog module, then click a valid grid cell or drag the catalog card onto it. Placement is immediate. Select an installed module to inspect or dismantle it; open **Upgrade tree** to buy run upgrades. Scroll the tree horizontally and vertically. Select later nodes to inspect their exact effects and prerequisites.
- Hangar: **Modules** for licenses and starting weapons, **Cores** for the next run's core, **Permanent upgrades** for that core's ranks and module branch licenses. Matter belongs to a run; Fragments fund permanent purchases.
- Test range: choose a module, upgrade configuration, and scenario in the right panel. Build is free. Reset scenario restores targets/hull; Reset loadout reconstructs the demonstration ship. Return restores the suspended screen/run, including the selected installed module. Range activity grants no permanent rewards, records, licenses, or training completion.
- Settings: text sizes 100%, 125%, 150%; audio, quality, reduced flashes and existing comfort settings. Diagnostic controls are inside Advanced settings.

Layouts target 1280×720, 1920×1080 and 2560×1440. Other aspect ratios use a centered 16:9 viewport. Large text, long lists, large ships and upgrade trees use internal scrolling. Mouse and keyboard are the supported inputs for this copy; mobile controls and installation prompts are hidden.

## Files

- `Drift_Bastion_Playtest.html`: play this file.
- `source/`: editable modular sources and existing gameplay systems.
- `qa/`: screenshots and machine-readable browser reports.
- `VERIFICATION.md`: checks performed and their limits.
- `before/`: original snapshots and archived one-time migration tools, retained locally and excluded from the review ZIP.

From `source/`, run `npm ci` when dependencies are not already available, then:

```text
npm run build:playtest
npm run check
npm test
npm run test:pc
node tools/mouse-input-check.cjs ../Drift_Bastion_Playtest.html
```

The builder writes only the HTML in this experiment's parent directory. Do not use the archived one-time migration scripts to rebuild; `source/` is the current editable version. Older mobile/browser fixture scripts are retained as development history; `test:pc` is the desktop interaction suite for this redesign.

## Design and implementation

Original navy/teal components use the supplied concepts for visual direction. Section navigation and equipment presentation take organizational inspiration from [Ghostrunner 2](https://www.behance.net/gallery/217870181/Ghostrunner-2-UI-Design); tree/inspector organization takes inspiration from [BACKTRACE](https://www.behance.net/gallery/251363253/BACKTRACE-Cyberpunk-PC-Game-UIUX-Concept). No reference graphics were copied into the game.

`pc-ui.js` and `pc-ui.css` own the PC presentation. `test-range.js` owns temporary targets and scenarios. The session bridge in `game.js` suspends/restores the real Game instance, uses the existing upgrade resolver, and grants availability only inside the range. Combat, aiming, sprites, support effects and progression rules remain shared with the game.

The already integrated art is reused. Mounts remain attached to the hull; directional weapon assemblies aim independently and barrels may extend past their platform. Reactor Link and non-Standard core variants retain their existing fallback art. Range resource pickups demonstrate the existing Matter-income multiplier; survival's normal kill-income economy is unchanged.

Storage namespace: `drift-bastion-pc-uiux-save-v2`, its `-backup`, isolated legacy `drift-bastion-pc-uiux-save-v1`, and `drift-bastion-pc-uiux-playtest-v1`. No service worker is registered. Saves are browser/origin specific; moving to another browser does not transfer a profile automatically.
