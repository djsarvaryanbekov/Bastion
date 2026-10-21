# Translator brief — Bastion

Bastion is a top-down space survival roguelite: the player builds a modular ship on a grid (weapons, shields, armor), survives endless enemy swarms and bosses, spends **Matter** during a run and **Fragments** between runs in the **Hangar**. Tone: concise, technical, sci-fi UI. Players read it mid-action, so shorter is better; never longer than needed.

## Output

`locales/<code>.json`: one JSON object mapping every key of `locales/en.json` to its translation. Valid UTF-8 JSON, no comments, keys copied exactly.

## Hard rules (checked by `node tools/check-locales.cjs <code>`)

1. Keep every `{placeholder}` exactly (same names, may move within the sentence). Never translate placeholder names.
2. Keep the ` · ` separator count identical (code splits on it).
3. Keys ending in ` {cost} F` must still end in `{cost} F`.
4. Keys ending in ` +15%`-style numbers must still end in ` +N%` (same number).
5. Keep leading/trailing spaces as in the key.

## Style rules

- ALL-CAPS keys stay all-caps in scripts that have case (Latin, Cyrillic). CJK/Thai: no case, keep it short.
- Keep `BASTION`, `Bastion`, hotkeys and symbols as is: `[P]`, `[B]`, `W/S`, `A/D`, `LMB`/`P`, `→`, `↗`, `×`, `%`, `/s`, `3×3`, numbers.
- `F` is the short form of Fragments in prices; keep `F`.
- Pick one translation per game term and use it everywhere: Matter, Fragments, Hangar, Build, Core, module names (Auto Cannon, Rail Lance, Cryo Projector…), Shatter, Cold payload, Ember combo, boss names (Siege Ring, Pursuer, Storm Ring). Keeping a term in English is fine when that is common for games in your language.
- Upgrade descriptions shaped `Label: value` must keep `Label:` before the value (code splits at the first `:`).
- Units like `s` (seconds) may stay `s`.
- Uzbek uses the official Latin alphabet (Oʻzbekcha, with ʻ U+02BB).
- Spanish (es) is Spain; es-419 is Latin American Spanish (ustedes, no vosotros). pt-BR is Brazilian Portuguese. zh-Hans simplified, zh-Hant traditional (Taiwan usage).
