"use strict";
// Merges player telemetry exports (Drift_Bastion_Playtest_*.json) into one balance report.
// Usage: node tools/balance-report.cjs <files or folders...> [--out=report.md] [--csv=waves.csv]
//        [--build=<prefix>] [--mode=waves|survival] [--include-debug]
const fs = require("node:fs");
const path = require("node:path");

function parseArgs(argv) {
  const options = { inputs: [], out: null, csv: null, build: null, mode: null, includeDebug: false };
  for (const arg of argv) {
    if (arg.startsWith("--out=")) options.out = arg.slice(6);
    else if (arg.startsWith("--csv=")) options.csv = arg.slice(6);
    else if (arg.startsWith("--build=")) options.build = arg.slice(8);
    else if (arg.startsWith("--mode=")) options.mode = arg.slice(7);
    else if (arg === "--include-debug") options.includeDebug = true;
    else options.inputs.push(arg);
  }
  return options;
}

function listJsonFiles(inputs) {
  const files = [];
  for (const input of inputs) {
    if (!fs.existsSync(input)) throw new Error("Not found: " + input);
    if (fs.statSync(input).isDirectory()) {
      for (const name of fs.readdirSync(input).sort()) if (name.toLowerCase().endsWith(".json")) files.push(path.join(input, name));
    } else files.push(input);
  }
  return files;
}

function loadExports(files) {
  const exports = [], skipped = [];
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      if (!data || !Array.isArray(data.runs)) throw new Error("no runs array");
      exports.push({ file, data });
    } catch (error) { skipped.push({ file, reason: error.message }); }
  }
  return { exports, skipped };
}

// Exports are cumulative: a tester who exports twice sends the same runs twice. Keep one copy of each run.
function collectRuns(exports, options = {}) {
  const byId = new Map();
  for (const { file, data } of exports) {
    for (const run of data.runs) {
      if (!run || !run.runId) continue;
      const entry = { run, testerId: data.testerId || "unknown", file };
      const previous = byId.get(run.runId);
      if (!previous || (!previous.run.endedAt && run.endedAt) || (run.events || []).length > (previous.run.events || []).length) byId.set(run.runId, entry);
    }
  }
  const excluded = { unfinished: 0, debug: 0, build: 0, mode: 0 };
  const runs = [];
  for (const entry of byId.values()) {
    const run = entry.run, context = run.context || {};
    if (!run.endedAt || !run.summary) { excluded.unfinished += 1; continue; }
    if (context.debugTools && !options.includeDebug) { excluded.debug += 1; continue; }
    if (options.build && !String(run.gameBuild || "").startsWith(options.build)) { excluded.build += 1; continue; }
    if (options.mode && normalizedMode(context.mode) !== options.mode) { excluded.mode += 1; continue; }
    runs.push(entry);
  }
  runs.sort((a, b) => String(a.run.startedAt).localeCompare(String(b.run.startedAt)));
  return { runs, excluded, duplicatesRemoved: countRuns(exports) - byId.size };
}

function countRuns(exports) { return exports.reduce((sum, item) => sum + item.data.runs.length, 0); }
function normalizedMode(mode) { return mode === "waves" ? "waves" : mode ? "survival" : "unknown"; }

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
function sumInto(target, map) { for (const [key, value] of Object.entries(map || {})) target[key] = (target[key] || 0) + (Number(value) || 0); return target; }
function count(target, key) { target[key] = (target[key] || 0) + 1; return target; }
function fixed(value, digits = 1) { return value === null || value === undefined || !Number.isFinite(value) ? "–" : Number(value.toFixed(digits)).toString(); }
function percent(part, whole) { return whole > 0 ? fixed(part / whole * 100, 0) + "%" : "–"; }
function table(headers, rows) {
  if (!rows.length) return "_No data._\n";
  return "| " + headers.join(" | ") + " |\n|" + headers.map(() => "---").join("|") + "|\n" + rows.map(row => "| " + row.join(" | ") + " |").join("\n") + "\n";
}
function sortedEntries(map) { return Object.entries(map).sort((a, b) => b[1] - a[1]); }

function analyse(runs) {
  const balanceRuns = runs.filter(entry => entry.run.metricsVersion >= 3);
  const wavesRuns = balanceRuns.filter(entry => normalizedMode(entry.run.context && entry.run.context.mode) === "waves");
  const result = {
    runs: runs.length, balanceRuns: balanceRuns.length, legacyRuns: runs.length - balanceRuns.length, wavesRuns: wavesRuns.length,
    testers: new Set(runs.map(entry => entry.testerId)).size,
    builds: {}, outcomes: {}, highestWave: {}, victories: 0,
    deathsByWave: {}, killedBy: {}, waveRows: {}, damageBySource: {}, sourceRuns: {}, sourceShares: {},
    damageTakenBySource: {}, coreDamageBySource: {}, cardsSeen: {}, cardsPicked: {}, breaks: 0, skips: 0, rerolls: 0,
    matterEarnedByReason: {}, matterSpentByReason: {}, purchases: {}, upgradePaths: {}, balanceErrors: [], durations: []
  };
  for (const { run } of runs) {
    count(result.builds, run.gameBuild || "unknown (old exporter)");
    count(result.outcomes, run.outcome || "unknown");
    result.durations.push(run.summary.durationSeconds);
  }
  for (const { run } of balanceRuns) {
    const summary = run.summary;
    if (Number.isFinite(summary.matterBalanceError) && Math.abs(summary.matterBalanceError) > .5) result.balanceErrors.push({ runId: run.runId, error: summary.matterBalanceError });
    sumInto(result.damageBySource, summary.damageBySource);
    for (const [source, value] of Object.entries(summary.damageShareBySource || {})) {
      if (!(value > 0)) continue;
      count(result.sourceRuns, source);
      (result.sourceShares[source] = result.sourceShares[source] || []).push(value);
    }
    sumInto(result.damageTakenBySource, summary.damageTakenBySource);
    sumInto(result.coreDamageBySource, summary.coreDamageBySource);
    sumInto(result.matterEarnedByReason, summary.matterEarnedByReason);
    sumInto(result.matterSpentByReason, summary.matterSpentByReason);
    sumInto(result.purchases, summary.modulesPurchased);
    for (const [family, route] of Object.entries(summary.upgradePaths || {})) count(result.upgradePaths, family + ": " + route.join(" → "));
    if (run.death) {
      count(result.killedBy, run.death.killedBy || "unknown");
      if (run.death.wave !== null) count(result.deathsByWave, run.death.wave);
    }
    for (const breakEntry of run.cards || []) {
      result.breaks += 1;
      result.rerolls += breakEntry.rerolls || 0;
      if (breakEntry.skipped) result.skips += 1;
      for (const card of new Set([].concat(...(breakEntry.offers || [])))) count(result.cardsSeen, card);
      if (breakEntry.picked) count(result.cardsPicked, breakEntry.picked);
    }
  }
  for (const { run } of wavesRuns) {
    if (run.summary.victory) result.victories += 1;
    if (run.summary.highestWave !== null) count(result.highestWave, run.summary.highestWave);
    for (const row of run.waves || []) {
      const bucket = result.waveRows[row.wave] = result.waveRows[row.wave] || { reached: 0, cleared: 0, died: 0, boss: row.boss || "", seconds: [], dps: [], taken: [], minCore: [], kills: [], earned: [], modules: [], fps: [] };
      bucket.reached += 1;
      if (row.outcome === "cleared") bucket.cleared += 1;
      if (row.outcome === "died") bucket.died += 1;
      if (row.outcome === "cleared") bucket.seconds.push(row.seconds);
      if (row.seconds > 0) bucket.dps.push(row.damageDealt / row.seconds);
      bucket.taken.push(row.damageTaken);
      bucket.minCore.push(row.minCoreHpRatio);
      bucket.kills.push(row.kills);
      bucket.earned.push(row.matterEarned);
      bucket.modules.push(row.modulesStart);
      if (row.minRenderFps !== null) bucket.fps.push(row.minRenderFps);
    }
  }
  return result;
}

function renderReport(analysis, meta) {
  const a = analysis, lines = [];
  lines.push("# Bastion balance report", "");
  lines.push(`Files: ${meta.files} (${meta.skipped} unreadable) · testers: ${a.testers} · runs: ${a.runs} (duplicates removed: ${meta.duplicatesRemoved}; excluded: ${Object.entries(meta.excluded).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(", ") || "none"})`);
  lines.push(`Runs with balance rows (telemetry v3): ${a.balanceRuns} · older runs (totals only): ${a.legacyRuns} · Waves runs: ${a.wavesRuns}`);
  lines.push("", "Builds: " + sortedEntries(a.builds).map(([build, n]) => `${build} ×${n}`).join(", "), "");
  lines.push("## Runs", "");
  lines.push(table(["Outcome", "Runs"], sortedEntries(a.outcomes).map(([k, n]) => [k, n])));
  lines.push(`Median run length: ${fixed(median(a.durations) / 60, 1)} min`, "");
  if (a.wavesRuns) {
    lines.push(`Waves victories: ${a.victories} of ${a.wavesRuns} (${percent(a.victories, a.wavesRuns)})`, "");
    lines.push("### How far Waves runs get", "");
    lines.push(table(["Highest wave", "Runs"], Object.entries(a.highestWave).sort((x, y) => x[0] - y[0]).map(([wave, n]) => [wave, n])));
    lines.push("### Per wave (medians across runs)", "");
    lines.push(table(["Wave", "Boss", "Reached", "Cleared", "Died", "Clear time s", "DPS", "Damage taken", "Lowest core HP", "Kills", "Matter earned", "Modules", "Min fps"],
      Object.entries(a.waveRows).sort((x, y) => x[0] - y[0]).map(([wave, b]) => [wave, b.boss, b.reached, percent(b.cleared, b.reached), b.died,
        fixed(median(b.seconds)), fixed(median(b.dps)), fixed(median(b.taken), 0), b.minCore.some(Number.isFinite) ? percent(median(b.minCore), 1) : "–",
        fixed(median(b.kills), 0), fixed(median(b.earned), 0), fixed(median(b.modules), 0), fixed(median(b.fps), 0)])));
  }
  lines.push("## Deaths", "");
  lines.push(table(["Killed by (last core hit)", "Deaths"], sortedEntries(a.killedBy)));
  lines.push(table(["Death wave", "Deaths"], Object.entries(a.deathsByWave).sort((x, y) => x[0] - y[0])));
  const totalDamage = Object.values(a.damageBySource).reduce((s, v) => s + v, 0);
  lines.push("## Damage dealt by source", "");
  lines.push("Share = all damage across runs. In-run share = median share in runs where the source dealt damage.", "");
  lines.push(table(["Source", "Damage", "Share", "Runs used", "In-run share"], sortedEntries(a.damageBySource).map(([source, value]) => [source, fixed(value, 0), percent(value, totalDamage), a.sourceRuns[source] || 0, percent(median(a.sourceShares[source] || []), 1)])));
  const totalTaken = Object.values(a.damageTakenBySource).reduce((s, v) => s + v, 0);
  const totalCore = Object.values(a.coreDamageBySource).reduce((s, v) => s + v, 0);
  lines.push("## Damage taken by enemy type", "");
  lines.push(table(["Enemy", "Hull + shield", "Share", "Core damage", "Core share"], sortedEntries(a.damageTakenBySource).map(([enemy, value]) => [enemy, fixed(value, 0), percent(value, totalTaken), fixed(a.coreDamageBySource[enemy] || 0, 0), percent(a.coreDamageBySource[enemy] || 0, totalCore)])));
  lines.push("## Cards", "");
  lines.push(`Card breaks: ${a.breaks} · skipped: ${a.skips} (${percent(a.skips, a.breaks)}) · rerolls: ${a.rerolls} (${fixed(a.breaks ? a.rerolls / a.breaks : null, 2)} per break)`, "");
  lines.push("Pick rate = breaks where the card was picked ÷ breaks where it was offered (any reroll counts).", "");
  lines.push(table(["Card", "Offered", "Picked", "Pick rate"], sortedEntries(a.cardsSeen).map(([card, seen]) => [card, seen, a.cardsPicked[card] || 0, percent(a.cardsPicked[card] || 0, seen)])));
  lines.push("## Economy", "");
  lines.push(table(["Matter earned from", "Total"], sortedEntries(a.matterEarnedByReason).map(([k, v]) => [k, fixed(v, 0)])));
  lines.push(table(["Matter spent on", "Total"], sortedEntries(a.matterSpentByReason).map(([k, v]) => [k, fixed(v, 0)])));
  lines.push(table(["Module bought", "Copies"], sortedEntries(a.purchases)));
  lines.push(table(["Upgrade route (final)", "Runs"], sortedEntries(a.upgradePaths).slice(0, 25)));
  lines.push("## Data quality", "");
  lines.push(a.balanceErrors.length ? "Runs whose Matter does not reconcile (missing hook or debug funding): " + a.balanceErrors.map(e => `${e.runId} (${e.error})`).join(", ") : "All balance runs reconcile their Matter.");
  if (meta.skippedFiles.length) lines.push("", "Unreadable files: " + meta.skippedFiles.map(s => `${path.basename(s.file)} (${s.reason})`).join(", "));
  return lines.join("\n") + "\n";
}

const CSV_COLUMNS = ["testerId", "runId", "gameBuild", "coreId", "starterWeapon", "wave", "boss", "outcome", "seconds", "kills", "damageDealt", "dps", "topSource", "damageTaken", "coreDamage", "minCoreHpRatio", "matterEarned", "matterSpent", "modulesStart", "modulesEnd", "peakEnemies", "minRenderFps", "purchases", "upgrades"];
function waveCsv(runs) {
  const escape = value => { const text = value === null || value === undefined ? "" : String(value); return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text; };
  const lines = [CSV_COLUMNS.join(",")];
  for (const { run, testerId } of runs) {
    if (!(run.metricsVersion >= 3)) continue;
    for (const row of run.waves || []) {
      const top = sortedEntries(row.damageBySource || {})[0];
      const values = { testerId, runId: run.runId, gameBuild: run.gameBuild, coreId: run.context && run.context.coreId, starterWeapon: run.context && run.context.starterWeapon,
        ...row, dps: row.seconds > 0 ? (row.damageDealt / row.seconds).toFixed(1) : "", topSource: top ? top[0] : "",
        purchases: Object.entries(row.purchases || {}).map(([k, n]) => k + "×" + n).join(" "), upgrades: (row.upgrades || []).join(" ") };
      lines.push(CSV_COLUMNS.map(column => escape(values[column])).join(","));
    }
  }
  return lines.join("\n") + "\n";
}

function buildReport(inputs, options = {}) {
  const files = listJsonFiles(inputs);
  const { exports, skipped } = loadExports(files);
  const { runs, excluded, duplicatesRemoved } = collectRuns(exports, options);
  const analysis = analyse(runs);
  const markdown = renderReport(analysis, { files: files.length, skipped: skipped.length, skippedFiles: skipped, duplicatesRemoved, excluded });
  return { markdown, csv: waveCsv(runs), analysis, runs };
}

if (require.main === module) {
  const options = parseArgs(process.argv.slice(2));
  if (!options.inputs.length) {
    console.error("Usage: node tools/balance-report.cjs <export files or folders> [--out=report.md] [--csv=waves.csv] [--build=prefix] [--mode=waves|survival] [--include-debug]");
    process.exit(1);
  }
  const report = buildReport(options.inputs, options);
  if (options.out) fs.writeFileSync(options.out, report.markdown); else process.stdout.write(report.markdown);
  if (options.csv) fs.writeFileSync(options.csv, report.csv);
  if (options.out || options.csv) console.log(`Report: ${report.analysis.runs} runs from ${report.analysis.testers} testers${options.out ? " → " + options.out : ""}${options.csv ? " · waves CSV → " + options.csv : ""}`);
}

module.exports = { buildReport, collectRuns, analyse, renderReport, waveCsv, median };
