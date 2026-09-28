"use strict";

const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const file = path.resolve(process.argv[2] || path.join(root, "outputs/Drift_Bastion_Playtest.html"));
const output = path.resolve(process.argv[3] || path.join(root, "outputs/enemy-art-qa"));
const types = ["scout", "drone", "hunter", "raptor", "orbiter", "brute", "bulwark", "bolter", "gunner", "bomber", "splitter", "sniper", "colossus", "mini"];
const expectedEarlyVisualScales = { scout: 1.45, drone: 1.15, hunter: 2.25 };

(async function () {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on("pageerror", function (error) { errors.push(error.message); });
    await page.goto(pathToFileURL(file).href + "?debug=1");
    assert.equal(await page.evaluate(function () { return document.body.classList.contains("pc-ui-pending"); }), false, "PC UI must finish initialization before the viewport is shown");
    const decoded = await page.evaluate(function () { return window.DriftEnemyArt.ready; });
    assert.equal(decoded.length, types.length);
    assert.ok(decoded.every(Boolean), "Every enemy sprite must decode");
    const payload = await page.evaluate(function (enemyTypes) {
      var art = window.DriftEnemyArt;
      return enemyTypes.map(function (type) {
        var canvas = document.createElement("canvas");
        canvas.width = canvas.height = 160;
        var context = canvas.getContext("2d");
        var drawn = art.draw(context, type, 80, 80, 24, 0);
        var pixels = context.getImageData(0, 0, 160, 160).data;
        var opaque = 0;
        for (var index = 3; index < pixels.length; index += 4) if (pixels[index] > 0) opaque += 1;
        return { type: type, available: art.available(type), drawn: drawn, opaque: opaque, displaySize: art.displaySize(type, 24), visualScale: window.DriftEnemyArtData[type].scale };
      });
    }, types);
    payload.forEach(function (entry) {
      assert.equal(entry.available, true, entry.type + " should be available");
      assert.equal(entry.drawn, true, entry.type + " should draw");
      assert.ok(entry.opaque > 100, entry.type + " should retain an opaque silhouette");
      assert.ok(entry.displaySize > 48, entry.type + " cache must fit its silhouette");
      if (Object.hasOwn(expectedEarlyVisualScales, entry.type)) assert.equal(entry.visualScale, expectedEarlyVisualScales[entry.type], entry.type + " visual scale must preserve the early-enemy hierarchy");
    });
    await page.locator("#pcRangeMenu").click();
    await page.locator("#pcRangeScenario").waitFor();
    const scenarioIds = await page.locator("#pcRangeScenario option").evaluateAll(function (options) { return options.map(function (option) { return option.value; }); });
    assert.ok(scenarioIds.includes("enemy"), "Test Range must offer the enemy formation scenario");
    assert.ok(scenarioIds.includes("boss"), "Test Range must offer the boss encounter scenario");
    await page.locator("#pcRangeScenario").selectOption("boss");
    await page.waitForTimeout(180);
    assert.equal(await page.evaluate(function () { return window.__driftBastion.getState().bossSpawned; }), true, "Boss scenario must spawn a live boss");
    await page.locator("#pcRangeScenario").selectOption("enemy");
    await page.waitForTimeout(120);
    assert.equal(await page.evaluate(function () { return window.__driftBastion.getState().activeEnemies; }), 6, "Enemy formation must spawn the full enemy group");
    await page.locator("#pcRangeExit").click();
    await page.locator("#startButton").click();
    await page.evaluate(function (enemyTypes) {
      var state = window.__driftBastion.getState();
      enemyTypes.forEach(function (type, index) {
        var column = index % 5;
        var row = Math.floor(index / 5);
        window.__driftBastion.spawnEnemy(type, state.ship.x - 220 + column * 110, state.ship.y - 280 + row * 105);
      });
    }, types);
    await page.waitForTimeout(120);
    const combatLayout = await page.evaluate(function () {
      var health = document.querySelector(".health-shell");
      var bottomDock = document.querySelector(".bottom-dock");
      var healthBounds = health.getBoundingClientRect();
      return {
        healthInBottomDock: bottomDock.contains(health),
        healthInTopHud: document.querySelector(".hud-stack").contains(health),
        healthNearTop: healthBounds.top < window.innerHeight * .25,
        mobileControlsHidden: getComputedStyle(document.querySelector("#mobileControls")).display === "none"
      };
    });
    assert.equal(combatLayout.healthInBottomDock, false, "Core health must not use the lower dock");
    assert.equal(combatLayout.healthInTopHud, true, "Core health must remain in the top combat HUD");
    assert.equal(combatLayout.healthNearTop, true, "Core health must be visible near the top of the viewport");
    assert.equal(combatLayout.mobileControlsHidden, true, "The PC playtest must not show mobile controls");
    await page.keyboard.down("w");
    await page.waitForTimeout(220);
    assert.equal(await page.evaluate(function () { return document.querySelector("#pcViewport").classList.contains("pc-core-hud-faded"); }), true, "Core health must fade during active movement");
    await page.keyboard.up("w");
    await page.waitForTimeout(5200);
    assert.equal(await page.evaluate(function () { return document.querySelector("#pcViewport").classList.contains("pc-core-hud-faded"); }), false, "Core health must return after five seconds idle");
    await page.screenshot({ path: path.join(output, "combat-enemy-sprites.png") });
    await page.locator("#pauseButton").click();
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, "report.json"), JSON.stringify({ passed: true, source: file, sprites: payload, combatLayout: combatLayout, errors: errors }, null, 2));
    console.log(JSON.stringify({ passed: true, sprites: payload, combatLayout: combatLayout, errors: errors }));
  } finally {
    await browser.close();
  }
})().catch(function (error) { console.error(error); process.exitCode = 1; });
