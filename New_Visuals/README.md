# Drift Bastion — New Visuals

Permanent home for the ongoing visual redesign. User designated this folder on 2026-09-20; these assets are not disposable experiments.

## Start here in any future chat

When the user says we are renewing/updating the visuals, start in this folder. Read [CURRENT_ASSETS.md](CURRENT_ASSETS.md), inspect the relevant actual images, and continue from the user's chosen/current design. Do not restart generation or use older experiment folders as the current source.

- `modules/`: weapons, support, armor, Core, original generations, earlier versions, technical previews, audit files and review helpers. Detailed design history and browser chat URLs: [modules/README.md](modules/README.md).
- `platforms/`: original square platform PNG/SVG, earlier version and checks. See [platforms/README.md](platforms/README.md).
- `enemies/`: current enemy source art, technical exports and integration audit. See [enemies/README.md](enemies/README.md).
- `CURRENT_ASSETS.md`: explicit current design entry points. Use raw image files listed here, not `review`, `mounted-preview`, `32px`, `64px` or grayscale derivatives as source artwork.

## Continuing the work

Use the `chrome-chatgpt-imagegen` skill: generate/edit in ChatGPT through the Google Chrome extension. One chat per asset, revisions in that same chat, actual selected best image attached to every revision. Preserve raw outputs and previous versions. Add new numbered versions here and update the index. Do not equate highest version number with best version or user approval.

Keep strict overhead orthographic geometry, large readable forms, coherent mounts, quiet flat materials and restrained functional accents. Avoid cloudy textures, random greebles and perspective. Non-barrel equipment fits the cell; weapon barrels may extend outside it. Respect per-asset exceptions: Armor Tile is the whole armored platform, without equipment or an empty mount. Reactor Link was explicitly skipped; do not restart it simply because old game code still contains it.

Show the actual image directly to the user. Do not create unsolicited grayscale/size comparison sheets. Transparent PNGs and exact cell/pivot alignment must be verified before production integration; most raw generations are 1254x1254 and are not ready-to-import 1024x1024 exports. Prior audits and previews are historical evidence, not blanket approval.

This relocation does not integrate anything into the game. For a requested integration, follow project `AGENTS.md` and maintain the authoritative `outputs/Drift_Bastion_Playtest.html` plus corresponding modular sources.

## Relocation record

On 2026-09-20, moved all 329 files from `outputs/experiments/2026-09-19-weapons` to `New_Visuals/modules`, and all 9 files from `outputs/experiments/2026-09-19-flat-square-platform` to `New_Visuals/platforms`. SHA-256 checks confirmed all 338 moved files were unchanged before documentation/helper-path updates. No images deleted, overwritten or regenerated. Historical audit records may mention the former paths; resolve their filenames within this permanent folder. Old conversation image links point to the former paths and may no longer open.
