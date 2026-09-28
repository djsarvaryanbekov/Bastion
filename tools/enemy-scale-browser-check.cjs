"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

(async function () {
  const file = path.resolve(process.argv[2] || "outputs/Drift_Bastion_Playtest.html");
  const output = path.resolve(process.argv[3] || "outputs/qa/enemy-scale-report.json");
  const screenshot = output.replace(/\.json$/, ".png");
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(pathToFileURL(file).href + "?debug=1");
    await page.evaluate(() => window.DriftEnemyArt.ready);
    const report = await page.evaluate(() => {
      const measure = (type, radius) => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 256;
        const context = canvas.getContext("2d");
        window.DriftEnemyArt.draw(context, type, 128, 128, radius, 0);
        const pixels = context.getImageData(0, 0, 256, 256).data;
        let left = 256, top = 256, right = 0, bottom = 0;
        for (let y = 0; y < 256; y += 1) for (let x = 0; x < 256; x += 1) {
          if (pixels[(y * 256 + x) * 4 + 3] < 128) continue;
          left = Math.min(left, x); top = Math.min(top, y);
          right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1);
        }
        return { type, width: right - left, height: bottom - top, scale: window.DriftEnemyArtData[type].scale };
      };
      return {
        startRunMode: document.querySelector("#startRunMode").textContent,
        startRunModeHidden: document.querySelector("#startRunMode").hidden,
        drone: measure("drone", 8),
        scout: measure("scout", 12)
      };
    });
    assert.equal(report.startRunMode, "", "The unnecessary run-status text must be empty");
    assert.equal(report.startRunModeHidden, true, "The empty run-status element must not occupy UI space");
    assert.equal(report.drone.scale, 1.4, "The normal Swarm Drone must use its corrected visual scale");
    assert.equal(report.scout.scale, 2.45, "The fast Scout must use its corrected visual scale");
    assert.ok(report.drone.height < report.scout.height * .5, "The Swarm Drone should be visibly smaller than the fast Scout");
    await page.locator("#startButton").click();
    await page.evaluate(() => {
      const state = window.__driftBastion.getState();
      window.__driftBastion.spawnEnemy("drone", state.ship.x - 170, state.ship.y - 100);
      window.__driftBastion.spawnEnemy("scout", state.ship.x + 170, state.ship.y - 100);
    });
    await page.waitForTimeout(160);
    await page.screenshot({ path: screenshot });
    assert.deepEqual(errors, []);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify({ passed: true, file, screenshot, ...report, errors }, null, 2));
    console.log(JSON.stringify({ passed: true, ...report, screenshot, errors }, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
