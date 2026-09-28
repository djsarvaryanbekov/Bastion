"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
const output = path.join(root, "outputs", "survival-2026-09-08");
fs.mkdirSync(output, { recursive: true });
const server = http.createServer((req, res) => {
  const requestPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const file = path.resolve(root, "." + (requestPath === "/" ? "/index.html" : requestPath));
  if (path.relative(root, file).startsWith("..") || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.setHeader("Content-Type", { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" }[path.extname(file)] || "application/octet-stream");
  let source = fs.readFileSync(file);
  // Browser-only fixtures do not expose extra mutation APIs in the distributed game.
  if (requestPath === "/game.js") source = source.toString().replace("    window.__driftBastion = {",
    "    window.__survivalFixture = { current: () => game, save, makeTile, render, updateHud, firstUpgradeCost: () => runUpgrades.options(selectedStarter, game.upgrades[selectedStarter], upgradePricingCopies(selectedStarter))[0].cost };\n    window.__driftBastion = {");
  res.end(source);
});
(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const url = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch({ headless: true });
  const errors = [], report = { firstUpgradeAt: null, firstUpgradeCost: null, fixturePerformance: null, checks: [] };
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: "block" });
    const page = await context.newPage(); page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => {
      let seed = 43;
      Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    });
    await page.clock.install(); await page.goto(url);
    assert.equal(await page.locator("#hangarOperationTab, #contractHud").count(), 0);
    assert.equal(await page.locator("#startButton").isEnabled(), true);
    await page.screenshot({ path: path.join(output, "menu.png") });
    await page.locator("#startButton").click(); await page.keyboard.down("w"); await page.keyboard.down("d");
    report.firstUpgradeCost = await page.evaluate(() => window.__survivalFixture.firstUpgradeCost());
    for (let second = 1; second <= 45; second++) {
      await page.clock.runFor(1000);
      const state = await page.evaluate(() => window.__driftBastion.getState());
      assert.equal(state.screen, "playing", "Opening scripted flight must remain alive");
      if (state.matter >= report.firstUpgradeCost) { report.firstUpgradeAt = state.elapsed; break; }
    }
    await page.keyboard.up("w"); await page.keyboard.up("d");
    assert.ok(report.firstUpgradeAt !== null && report.firstUpgradeAt <= 35, "Fresh starter should afford its first upgrade within 35 seconds of real circling flight");
    await page.screenshot({ path: path.join(output, "first-upgrade.png") });
    await page.locator("#buildButton").click();
    await page.locator('.build-cell[data-x="0"][data-y="-1"]').click();
    assert.equal(await page.locator("#buildUpgradePanel").isVisible(), true);
    const tune = page.locator("#upgradeList button").first(); assert.equal(await tune.isEnabled(), true);
    await tune.click();
    assert.equal((await page.evaluate(() => window.__driftBastion.getState())).upgrades.cannon.level, 1);
    await page.screenshot({ path: path.join(output, "upgrade-branches.png") });
    assert.equal(await page.locator("#buildGrid").isVisible(), true);
    assert.equal(await page.locator("#buildUpgradePanel").isVisible(), true, "The ship must stay visible alongside its selected weapon upgrade");
    await page.locator("#closeBuild").click();
    report.checks.push("Ungated Play; seeded scripted circling opening and first paid upgrade beside the visible ship");

    // Explicit fixture for late pressure rendering and timing, with real updates and damage enabled.
    report.fixturePerformance = await page.evaluate(() => {
      const fixture = window.__survivalFixture, game = fixture.current();
      game.elapsed = 540; game.nextBossAt = 570; game.enemies.length = 0; game.enemyById.clear();
      game.ship.x = game.ship.y = game.camera.x = game.camera.y = 0; game.ship.angle = 0;
      for (const [type, x, y] of [["laser", -1, 0], ["pulse", 1, 0], ["shield", 0, 1], ["missile", -1, -1]]) game.ship.tiles.set(x + "," + y, fixture.makeTile(type, x, y, false));
      for (let i = 0; i < 40 && game.enemies.length < 420; i++) game.spawnAssaultWave(false);
      for (let i = 0; i < 50 && game.enemies.length < 420; i++) game.spawnAmbientPack();
      const samples = [], peak = game.enemies.length;
      for (let i = 0; i < 90; i++) {
        const start = performance.now(); game.update(1 / 30); fixture.render(performance.now()); samples.push(performance.now() - start);
        if (game.finished) break;
      }
      game.state = "paused"; fixture.updateHud(); fixture.render(performance.now());
      samples.sort((a, b) => a - b);
      return { peakEnemies: peak, frames: samples.length, medianMs: samples[Math.floor(samples.length / 2)], p95Ms: samples[Math.floor(samples.length * .95)], ended: game.finished, mode: "Headless desktop dense fixture, real damage, update + render CPU duration; not device FPS" };
    });
    assert.equal(report.fixturePerformance.peakEnemies, 420);
    await page.screenshot({ path: path.join(output, "late-swarm.png") });

    // A controlled culmination fixture verifies choice wiring without claiming a human ten-minute win.
    // Freeze between input and readback: the retained swarm can earn Matter as soon as Continue resumes combat.
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
    await page.evaluate(() => {
      const f = window.__survivalFixture, game = f.current();
      game.finished = false; game.state = "playing"; game.ship.tiles.get("0,0").hp = 200;
      game.elapsed = 600; game.bossesDefeated = 3; game.kills = 350; game.matter = 77;
      game.checkSurvival(); f.render(performance.now());
    });
    await page.screenshot({ path: path.join(output, "survival-complete.png") });
    assert.equal(await page.locator("#milestoneOverlay").isVisible(), true);
    await page.locator("#continueSurvivalButton").click();
    let state = await page.evaluate(() => window.__driftBastion.getState());
    assert.equal(state.continued, true); assert.equal(state.matter, 77); assert.equal(state.upgrades.cannon.level, 1);
    await page.locator("#pauseButton").click(); await page.locator("#pauseHangarButton").click(); await page.clock.runFor(400);
    assert.equal(await page.locator("#resultOverlay").isVisible(), true);
    const payout = await page.locator("#resultFragments").innerText(); assert.match(payout, /^\+\d+$/);
    await page.locator("#hangarButton").click();
    assert.equal(await page.locator("#metaList").isVisible(), true, "Returning to Hangar must show permanent upgrades without an expander");
    await page.locator("#hangarWeaponTab").click();
    assert.equal(await page.locator("#weaponPicker .pick-button").count(), 19);
    const beforePreviewSave = await page.evaluate(() => localStorage.getItem("drift-bastion-save-v2"));
    await page.locator('[data-module="scatter"]').click();
    assert.equal(await page.locator("#modulePreviewDialog").isVisible(), true);
    assert.equal(await page.evaluate(() => localStorage.getItem("drift-bastion-save-v2")), beforePreviewSave,
      "Viewing an available module must not buy its licence");
    await page.locator("#modulePreviewAction").click();
    if (await page.locator("#modulePreviewDialog").isVisible()) await page.locator("#modulePreviewClose").click();
    assert.match(await page.locator('[data-module="scatter"]').innerText(), /Unlocked · Preview/);
    await page.screenshot({ path: path.join(output, "hangar.png") });
    await page.locator("#hangarUpgradeTab").click();
    assert.equal(await page.locator("#corePicker .core-card").count(), 4);
    await page.screenshot({ path: path.join(output, "cores.png") });
    await page.reload();
    assert.ok((await page.evaluate(() => window.__driftBastion.getState())).progression.purchasedModules.includes("scatter"));
    report.checks.push("Same ship continuation; one bank; actual Hangar licence purchase survives reload; four existing cores");

    await page.locator("#menuSettingsButton").click(); await page.locator("#uiScaleSelect").selectOption("150"); await page.locator("#resumeButton").click();
    await page.setViewportSize({ width: 360, height: 640 }); await page.locator("#menuLoadoutButton").click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: path.join(output, "mobile-hangar-150.png") });
    await page.locator("#closeHangar").click(); await page.locator("#startButton").click();
    await page.evaluate(() => { const g = window.__survivalFixture.current(); g.elapsed = 600; g.bossesDefeated = 3; g.kills = 300; g.checkSurvival(); });
    for (const id of ["finishSurvivalButton", "continueSurvivalButton"]) {
      const box = await page.locator("#" + id).boundingBox();
      assert.ok(box.y >= 0 && box.y + box.height <= 640, "Both milestone actions must be visible without scrolling at 150% text");
    }
    await page.screenshot({ path: path.join(output, "mobile-complete-150.png") });
    await page.locator("#finishSurvivalButton").click(); await page.clock.runFor(400);
    assert.equal(await page.locator("#resultOverlay").isVisible(), true);
    report.checks.push("360x640 at 150% text; completion and finish reachable");
    assert.deepEqual(errors, []);
    report.errors = errors;
    fs.writeFileSync(path.join(output, "browser-report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    await context.close();
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
