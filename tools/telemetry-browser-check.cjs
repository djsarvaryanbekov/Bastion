"use strict";
require("./english-browser-locale.cjs");
// Plays three real waves in a freshly built copy and checks the balance telemetry the game writes.
// Builds to a temporary file so the main HTML is never touched; storage is an isolated browser context.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "bastion-telemetry-"));
const built = path.join(workDir, "Drift_Bastion_Playtest.html");
execFileSync(process.execPath, [path.join(__dirname, "build-standalone.js"), built], { cwd: root, stdio: "ignore" });
const marker = "window.__driftBastion = {";
const html = fs.readFileSync(built, "utf8");
assert.equal(html.split(marker).length, 2);
const fixture = path.join(workDir, "telemetry-fixture.html");
fs.writeFileSync(fixture, html.replace(marker, "window.__telemetryCheck = { game: function () { return game; }, enemies: ENEMY_DEFS, " +
  "openBuild: openBuild, closeBuild: closeBuild, price: modulePrice, " +
  "buy: function (type, x, y) { selectedBuildModule = type; return placePurchasedModule(x, y); } };\n    " + marker));

async function playUntilBreak(page, label) {
  for (let step = 0; step < 240; step += 1) {
    const state = await page.evaluate(() => { window.__driftBastion.advance(1); return window.__driftBastion.waveState(); });
    if (state.state === "intermission") return state;
  }
  throw new Error(label + " did not reach the card break");
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem("drift-bastion-save-v2", JSON.stringify({ version: 9, fragments: 0,
      progression: { schemaVersion: 4, purchasedModules: ["laser", "ember", "missile"], branchLicenses: [] },
      settings: { muted: true }, training: { completed: true } })));
    await page.goto(pathToFileURL(fixture).href + "?debug=1");
    await page.click("#startButton");
    await page.evaluate(() => {
      const api = window.__driftBastion;
      api.setInvulnerable(true);
      api.placeModule("laser", 1, 0); api.placeModule("ember", -1, 0); api.placeModule("missile", 0, 1);
    });
    await playUntilBreak(page, "Wave 1");
    const bought = await page.evaluate(() => {
      const check = window.__telemetryCheck, game = check.game();
      check.openBuild();
      const spot = [[2, 0], [-2, 0], [0, 2], [1, 1], [-1, 1]].find(([x, y]) => !game.ship.tiles.has(x + "," + y) && game.isAdjacentToShip(x, y));
      const ok = game.matter >= check.price("cannon") && check.buy("cannon", spot[0], spot[1]);
      check.closeBuild();
      return ok;
    });
    assert.equal(bought, true, "Wave 1 earns enough Matter for a Cannon");
    await page.locator("#cardChoices button, #cardChoices [data-index]").first().click();
    await page.click("#nextWaveButton");
    await playUntilBreak(page, "Wave 2");
    await page.click("#cardSkipButton");
    await page.click("#nextWaveButton");
    // Wave 3: drop invulnerability and leave the core one hit from death.
    await page.evaluate(() => {
      const game = window.__telemetryCheck.game();
      window.__driftBastion.setInvulnerable(false);
      // Unarmed, so the wave reaches the core instead of being cleared first.
      Array.from(game.ship.tiles.values()).filter(tile => tile.type !== "core").forEach(tile => window.__driftBastion.destroyModule(tile.x, tile.y));
      game.ship.tiles.get("0,0").hp = 1;
    });
    for (let step = 0; step < 240 && !(await page.evaluate(() => window.__telemetryCheck.game().finished)); step += 1) {
      await page.evaluate(() => window.__driftBastion.advance(1));
    }
    // The run is written after the 1.5 s death presentation, which only real frames advance.
    await page.waitForFunction(() => !window.PlaytestTelemetry.getStatus().active, null, { timeout: 15000 });
    const result = await page.evaluate(() => ({ run: window.PlaytestTelemetry.getDataForTests().runs.at(-1), enemies: Object.keys(window.__telemetryCheck.enemies) }));
    const run = result.run, summary = run.summary;
    assert.equal(run.metricsVersion, 3);
    assert.equal(run.outcome, "death");
    assert.deepEqual(run.waves.map(row => row.outcome), ["cleared", "cleared", "died"]);
    for (const source of ["cannon", "laser", "ember", "missile"]) assert.ok(summary.damageBySource[source] > 0, source + " damage is credited to " + source);
    const total = Object.values(summary.damageBySource).reduce((sum, value) => sum + value, 0);
    assert.ok((summary.damageBySource.other || 0) / total < .01, "Almost no damage is unattributed: " + JSON.stringify(summary.damageBySource));
    const rowKills = run.waves.reduce((sum, row) => sum + row.kills, 0);
    assert.equal(Object.values(summary.killsBySource).reduce((sum, value) => sum + value, 0), rowKills, "Every wave kill has a source");
    assert.ok(run.waves[0].damageDealt > 0 && run.waves[0].seconds > 0 && run.waves[0].clearReward > 0);
    assert.deepEqual(run.waves[0].purchases, { cannon: 1 }, "The break purchase belongs to the wave it followed");
    assert.equal(run.waves[1].modulesStart, 6, "Core, starter, three placed modules and the purchase");
    assert.ok(run.cards[0].picked, "Wave 1 card pick recorded"); assert.equal(run.cards[1].skipped, true, "Wave 2 skip recorded");
    assert.ok(result.enemies.includes(run.death.killedBy) || run.death.killedBy === "boss", "Death names an enemy: " + JSON.stringify(run.death));
    assert.equal(run.death.wave, 3);
    assert.equal(summary.matterBalanceError, 0, "Matter reconciles: " + JSON.stringify(summary.matterEarnedByReason) + " / " + JSON.stringify(summary.matterSpentByReason));
    assert.deepEqual(errors, []);
    const bytesPerMinute = Math.round(JSON.stringify(run).length / Math.max(1, summary.durationSeconds / 60));
    console.log(JSON.stringify({ passed: true, waves: run.waves.length, seconds: summary.durationSeconds, damageShare: summary.damageShareBySource,
      killedBy: run.death.killedBy, bytesPerMinute }));
  } finally {
    await browser.close();
    fs.rmSync(workDir, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
