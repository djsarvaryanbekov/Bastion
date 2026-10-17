# Contextual support indicators

Editable line SVGs used as CSS masks in `styles.css`, added for the user's request on 2026-10-13. Their masks are embedded in the standalone HTML.

- Shield: shield outline; radius from the current Shield definition.
- Repair: medical cross; radius from the current Repair definition.
- Reactor: lightning bolt; surrounding 3×3, weapons only.
- Bulkhead: reinforced plate; eight surrounding cells (3×3), excluding the source.
- Siphon: Matter diamond; all installed weapons, with an explicit ship-wide description instead of a local radius.

Build shows received benefits on installed modules and valid placement ghosts, including dragged weapons. Each type appears once; titles and accessible labels include overlapping source counts. Depleted-only Shield coverage has a dim icon. Hovering, placing or inspecting a support also highlights its area. One support source is focused at a time; other Shield coverage stays as faint context. Combat uses the separate restrained hull barrier in `shield-vfx.js` and individual generator charge bars.
