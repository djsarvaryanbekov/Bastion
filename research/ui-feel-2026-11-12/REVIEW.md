# UI response review — 2026-11-12

Question from the developer: does the UI answer the player? When you hover or press something, does it move the way the wave cards do? Review every screen, and the Build (buy) screen in particular.

## How it was checked

A script opened the release build at 1920×1080 and visited twelve screens: menu, settings, the four Hangar tabs, combat HUD, pause, card break, Build, Build upgrade tree and results. For one control of every kind it forced the hover state and then the pressed state through the browser debugger and recorded which visual properties changed and whether the change was animated. Raw results: `audit.json` (before) and `audit-after.json` (after the changes below). Screenshots of each screen: `screens/`.

This measures whether a response exists. It does not measure whether it feels good; that needs a person.

## Findings in build 2026.11.12-visuals-54

62 controls checked.

| Finding | Where |
| --- | --- |
| Pressing did nothing visible on every primary button. The teal fill overrode the generic pressed colour. | Start run, Hangar Buy / Selected / Unlock, Resume on the pause screen, Resume in Build, Return to Hangar, End run on the card break |
| All response was colour only. Nothing moved except the wave cards. | Every screen |
| The pointer did not turn into a hand on some clickable rows. | Hangar system rows, Build family cards |
| Buying a module gave no feedback in the Build screen itself. The Matter number just changed. A flash was drawn on the battlefield, which is hidden behind the Build screen. | Build |
| A refused purchase showed only a toast. | Build |
| Drop-downs and the search box did not react to hover. | Settings, Hangar research, Build |

Not a problem: the disabled Start wave button, the pan areas of the upgrade trees and the volume slider do not react, as expected.

## What was changed (build 2026.11.12-ui-feel-55)

All of it is presentation. No rule, price or layout changed.

- **Action buttons** (primary, secondary, pause, fullscreen, corner buttons): lift 1 px on hover; push in and darken on press. Primary buttons also gain a soft teal shadow on hover and a darker teal fill on press.
- **List rows** (Build module library, Hangar system rows, Build family cards, results unlock card, starting loadout on the menu, Hangar tabs): slide 3–4 px toward their detail panel on hover; shrink slightly on press.
- **Tree nodes** (Hangar research, Build upgrade tree): lift 2 px with a shadow on hover; shrink on press.
- **Build grid**: a cell you can buy into grows 5% under the pointer and dips when pressed; installed modules brighten on hover.
- **Purchase feedback in Build**: the new module lands with a short scale-and-flash; the Matter number pulses when it goes down; a refused purchase shakes the wallet and turns the number red for a moment.
- **Pointer**: hand cursor on Hangar system rows and Build family cards.
- **Drop-downs and search box**: border lights up on hover.

After the change the same script finds a hover and a press response, both animated, on every button. The only controls without one are the slider, the drop-downs' pressed state, the search box, the pan areas and the disabled button.

Motion is switched off by the existing reduced-motion rule in `pc-ui.css`.

Code: the last section of `pc-workspaces.css`; `replayAnimation`, `showBuildMatter` and `refuseBuildPurchase` in `game.js`.

## Build screen review

From the screenshot `screens/10-build.png` and the code. Nothing in this section is built.

1. **There is no buy button.** You buy by clicking a "+" cell. The right panel says "36 MATTER / READY TO ATTACH" as plain text, and the instruction is the small line "Place Auto Cannon" above the grid. A new player has to work out that the grid is the button.
2. **Cells you cannot afford still show "+".** They are dimmer, but they read as buyable until you click and get refused.
3. **Prices are bare numbers.** The library shows "36" with no Matter mark; the only sign that something is too expensive is that the number turns red.
4. **The ship is small in a large empty panel.** At 100% zoom a four-module ship fills about a fifth of the centre.
5. **The help line is tiny** and sits in the bottom-left corner, far from where you are looking.
6. **"Resume [B]" during a wave break** takes you back to the cards, not to the fight.
7. **Upgrades are on a second tab.** Buying a copy and upgrading the family are two places for one decision.

These are layout questions, so the next step would be two or three mockups to choose from, the same way the card screen was done.

## Not reviewed

- Sound. The sound designer owns it.
- Touch and phone layouts.
- The training sector's own screens.
