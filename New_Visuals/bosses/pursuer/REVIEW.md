# Pursuer v2 review evidence

2026-10-14. Review candidate; user selection and integration are pending.

## Artwork

- Generated in Chrome ChatGPT in the [Pursuer asset chat](https://chatgpt.com/c/6acf3000-b0d0-83eb-9fc5-b24788abbceb).
- v1 attached Hunter and Colossus as named material/weight references. v2
  explicitly reattached the saved v1 PNG in the same chat.
- Both original downloads are retained in `raw/`. v2 is 1254x1254 RGBA,
  with alpha spanning 0-255. It has a blunt forward bumper, connected
  shoulders and two rear engines, with an overhead upward-facing silhouette.
- v2 visible bounds at alpha >=16 are `(103, 131, 1151, 1125)`. This leaves
  at least 8% visible-art margin on every side. Raw faint alpha specks extend
  farther, so the raw file is not treated as a finished runtime export.
- `technical/pursuer-v2-256.png` is a proportional technical review export.
  See `audit.json` for exact crop, pivot, footprint padding and source hashes.

## Motion preview

Chrome extension checks used a 1920x1080 viewport at normal scale. The page
loaded the real PNG with no observed browser warnings or errors. Checked:

- Idle hull and twin engine placement.
- Locked-direction dash warning, subsequent translation and engine exhaust.
- Five-shot fan after the volley warning.
- Phase-light toggle and gameplay-size toggle, including the 144px sprite
  frame used for the existing 72-world-unit boss radius at 1:1 scale.

Screenshots are retained in `technical/review-*-1920.png`. The JavaScript
syntax check passed. This verifies a standalone presentation study; it does
not verify game integration, live boss damage/collision, or human gameplay.

## Next decision

Select or revise the Pursuer hull direction before expanding the boss family.
Integration will need a separate visual-facing value so the directional hull
follows its real attack aim without repurposing the existing spinning boss
rotation used by combat patterns.
