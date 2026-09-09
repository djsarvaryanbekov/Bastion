# Bastion

Browser survival game with a modular ship, grouped enemy swarms, a ten-minute main run and optional continuation.

## Play

Download `outputs/Drift_Bastion_Playtest_Package.zip`, extract it, and open `Drift_Bastion_Playtest.html` in a browser. The historical filename stays stable for existing local saves and links. The game is named **Bastion**.

Matter buys modules and weapon upgrades within a run. Fragments fund permanent Hangar purchases. Browser saves and exported playtest logs stay local; exporting a log does not upload it.

## Development

Use Node.js 24 or later.

```sh
npm ci
npm run check
npm test
npm run build:playtest
```

`index.html`, the root JavaScript files and stylesheets are the maintained sources. `outputs/Drift_Bastion_Playtest.html` is the canonical self-contained release. Read `AGENTS.md` before changing it: back it up, test changes in an isolated copy, then promote the verified build. Rebuild the ZIP from that same HTML and `PLAYTEST_README.txt` when publishing.

Runtime regression tests use the checked-in `.artifact_build/runtime-check.js` harness and isolated in-memory storage. Browser checks require Playwright browsers; they are separate from `npm test` and are not evidence of a human playtest.

See `CONTENT_PLAN.md` for gameplay decisions and `PLAYTEST_README.txt` for controls and playtest instructions. Experiments, local review outputs, downloaded player logs and dependencies are excluded from Git.

## Current changes

- Grouped swarm retains the previous formations, random group origins and overlapping arrivals.
- Starter weapon durability is 1.5 times its base HP; purchased copies retain normal durability.
- Shield preview has reserved space, preventing ship-grid movement when hover text appears or disappears.
- Bosses take damage without external knockback; their own movement and attacks remain.
