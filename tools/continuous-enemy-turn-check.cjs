"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

(async function () {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => {
      window.enemyDraws = [];
      const original = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function (image, ...args) {
        if (this.canvas.id === "gameCanvas" && image instanceof HTMLCanvasElement) {
          const matrix = this.getTransform();
          window.enemyDraws.push({ width: image.width, angle: Math.atan2(matrix.b, matrix.a), at: performance.now() });
        }
        return original.call(this, image, ...args);
      };
    });
    const gameFile = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, "..", "outputs", "Drift_Bastion_Playtest.html");
    await page.goto(pathToFileURL(gameFile).href + "?debug=1");
    await page.evaluate(() => window.DriftEnemyArt.ready);
    await page.locator("#startButton").click();
    await page.evaluate(() => {
      const ship = window.__driftBastion.getState().ship;
      window.__driftBastion.spawnEnemy("sniper", ship.x + 420, ship.y + 90);
    });
    await page.keyboard.down("w");
    await page.waitForTimeout(900);
    await page.keyboard.up("w");
    const { draws, sniperWidth } = await page.evaluate(() => ({
      draws: window.enemyDraws,
      sniperWidth: Math.ceil(Math.ceil(window.DriftEnemyArt.displaySize("sniper", 16) * Math.SQRT2) * devicePixelRatio)
    }));
    const series = draws.filter(entry => entry.width === sniperWidth);
    assert.ok(series.length > 20, "The Sniper sprite should be rendered across many frames");
    const uniqueAngles = new Set(series.map(entry => entry.angle.toFixed(4)));
    assert.ok(uniqueAngles.size > 10, "Enemy facing should change through intermediate angles");
    assert.ok(series.some(entry => Math.abs(entry.angle / (2 * Math.PI / 32) - Math.round(entry.angle / (2 * Math.PI / 32))) > .05),
      "Enemy rendering must not be limited to 32 directions");
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, frames: series.length, uniqueAngles: uniqueAngles.size, spriteWidth: series[0].width, errors }));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
