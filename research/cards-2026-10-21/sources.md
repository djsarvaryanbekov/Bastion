# Sources index

This file lists the main sources per game. Each `notes/<game>.md` has the full source table, the version or date seen, and an honest **Gaps** line.

None of the games were played. All evidence comes from wikis, patch notes, data mirrors and community posts. reddit.com blocks web tools. Reddit posts were read through the Pullpush archive where possible; otherwise Steam threads and review aggregators (vaporlens.app) were used.

| Game | Why chosen | Catalog | Primary sources |
|---|---|---|---|
| GUNBOAT-8 | Direct peer: auto-fire boat, slot positions, runes, waves + shop | `catalog/gunboat-8.csv` (80 rows; thin: no wiki) | Steam store + dev patch notes (app 4783980), demo reviews, itch devlogs |
| Slay the Spire | Mechanic peer: relics, boss picks, drawbacks, counters | `catalog/slay-the-spire.csv` (193) | slaythespire.wiki.gg Relics_List, patch notes (gogdb), Steam threads, GDC 2019 summary |
| HoloCure | Genre peer: collabs, super items, drawback items + Shackles | `catalog/holocure.csv` (116) | holocure.wiki.gg (Items, Collabs, Super_Collab, Stamps), Steam threads |
| 20 Minutes Till Dawn | Genre peer: tree upgrades, gated synergies, tomes, evolutions | `catalog/20-minutes-till-dawn.csv` (232) | 20-minutes-till-dawn.fandom.com (Upgrades, Synergies, Tomes, Runes, Evolutions), dev Steam posts |
| Vampire Survivors | Genre-defining peer: evolutions, Arcanas, banish/seal | `catalog/vampire-survivors.csv` (172) | vampire.survivors.wiki (Arcana, Evolution, Banish, Seal), patch history, RogueRanker tiers |
| Brotato | Closest loop peer: 20 waves + shop between waves | `catalog/brotato.csv` (248) | brotato.wiki.spellsandguns.com (Items, Shop), patch notes, Steam threads |
| Hades | Mechanic peer: boons, duos, legendaries, hammers, Chaos | `catalog/hades.csv` (257) | Hades Lua data mirror (LootData/TraitData), Supergiant patch notes, interviews, Steam |
| Nova Drift | Peer on both pillars: drift-flight ship + modular builds | `catalog/nova-drift.csv` (231) | nova-drift.fandom.com via Wayback, blog.novadrift.io patch notes + retrospective, r/NovaDrift via Pullpush |
| Backpack Battles | Mechanic peer: grid adjacency (★/◆ cells), recipes | `catalog/backpack-battles.csv` (499, Cargo export 2026-10-22) | backpackbattles.wiki.gg (items, Recipe, Game_Mechanics, Cargo), Steam threads, vaporlens, r/BackpackBattles via Pullpush |
| Cobalt Core | Mechanic peer: positional ship parts + moving to line up | `catalog/cobalt-core.csv` (108: all 93 artifacts + parts/boot options) | cobaltcore.wiki.gg artifacts/ships/parts, 5 Steam threads; patch notes thin (1.0.x changelog unreachable) |
| Luck be a Landlord | Mechanic peer: adjacency chains, removal tokens | `catalog/luck-be-a-landlord.csv` (411; 59 of 113 essences lack sourced effects) | Wikis unreachable (401/402); GitHub game-data catalog + ~300 official Steam patch notes |
| Balatro | Mechanic peer: order/copy jokers, self-scaling, rule-breakers | `catalog/balatro.csv` (246: 150 jokers + vouchers, tags, blinds) | balatrowiki.org, 8 Steam threads, Game Developer interview; 1.0.1 values via press reposts |
| DRG: Survivor | Genre peer: weapon overclocks (balanced/unstable), elements | `catalog/drg-survivor.csv` (287: 173 overclocks, 36 artifacts, 34 gear, 34 mutators) | DRG Survivor wiki data tables, official patch notes (Steam News API), 7 Steam threads |
