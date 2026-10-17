"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

(async () => {
  const output = path.resolve("outputs/feedback-qa");
  fs.mkdirSync(output, { recursive: true });
  const html = fs.readFileSync("outputs/Drift_Bastion_Playtest.html", "utf8");
  const marker = "    window.__driftBastion = {";
  assert.equal(html.split(marker).length, 2);
  const fixture = path.join(output, "feedback-fixture.html");
  fs.writeFileSync(fixture, html.replace(marker, `
    window.__feedbackBrowser = { game: function () { return game; }, background: drawBackground,
      render: render, context: ctx, stars: function () { return stars; }, upgrade: buyRunUpgrade };
` + marker));
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem("drift-bastion-pc-uiux-save-v2", JSON.stringify({
      version: 9, fragments: 57, settings: { muted: true }, training: { completed: true }
    })));
    await page.clock.install();
    await page.goto(pathToFileURL(fixture).href);
    await page.evaluate(() => window.DriftModuleArt.ready);
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    await page.click("#startButton");
    await page.evaluate(() => { window.__feedbackBrowser.game().matter = 100; });
    await page.click("#buildButton");
    const before = await page.evaluate(() => window.__driftBastion.getState());
    const icon = await page.evaluate(() => {
      const api = window.__feedbackBrowser;
      const purchased = api.upgrade("cannon", "base1", 0);
      const tile = api.game().ship.tiles.get("0,-1");
      tile.aim = -.4;
      window.DriftPCGame.selectBuildFamily("cannon");
      const svg = document.querySelector('.build-cell[data-x="0"][data-y="-1"] svg');
      const images = svg.querySelectorAll("image");
      const sprite = window.DriftModuleArtData.cannon;
      const paints = [], rotations = [];
      const ctx = api.context, fillText = ctx.fillText, rotate = ctx.rotate;
      try {
        ctx.fillText = function (value, x, y, ...rest) { paints.push({ value, x, y }); return fillText.call(this, value, x, y, ...rest); };
        ctx.rotate = function (angle) { rotations.push(angle); return rotate.call(this, angle); };
        api.render(1000);
      } finally { ctx.fillText = fillText; ctx.rotate = rotate; }
      return { purchased, rank: svg.querySelector(".module-rank")?.dataset.rank,
        transform: images[images.length - 1].getAttribute("transform"),
        expectedRotation: tile.aim - sprite.forward * Math.PI / 180,
        sameSprite: images[images.length - 1].getAttribute("href") === sprite.src,
        paints, rotations, matter: api.game().matter };
    });
    assert.equal(icon.purchased, true);
    assert.equal(icon.matter, before.matter - 8, "The first weapon upgrade retains its price.");
    assert.equal(icon.rank, undefined, "Family ranks are not repeated on installed module artwork");
    assert.equal(icon.sameSprite, true);
    const rotationDegrees = Number(icon.transform.match(/rotate\(([^)]+)\)/)[1]);
    assert.ok(Math.abs(rotationDegrees * Math.PI / 180 - icon.expectedRotation) < 1e-8);
    assert.ok(icon.rotations.some(angle => Math.abs(angle - icon.expectedRotation) < 1e-8));
    assert.ok(!icon.paints.some(paint => paint.x === -.33 && paint.y === -.325),
      "Combat must not paint a rank badge on every turret.");
    await page.clock.runFor(200);
    await page.screenshot({ path: path.join(output, "upgraded-build-1080.png") });

    await page.click("#closeBuild");
    assert.equal((await page.evaluate(() => window.__driftBastion.getState())).screen, "playing");
    await page.evaluate(() => {
      const game = window.__feedbackBrowser.game();
      game.enemies.length = 0;
      game.enemyById.clear();
      game.rebuildEnemyGrid();
      game.updateSpawner = function () {};
    });
    await page.keyboard.down("w");
    await page.clock.runFor(1500);
    await page.keyboard.up("w");
    const forward = await page.evaluate(() => window.__driftBastion.getState().ship);
    assert.ok(forward.vy < -50 && Math.abs(forward.vx) < 1, "Forward thrust produces actual forward movement: " + JSON.stringify(forward));
    await page.screenshot({ path: path.join(output, "forward-motion-1080.png") });
    const motion = await page.evaluate(() => {
      const api = window.__feedbackBrowser, game = api.game(), ctx = api.context;
      const star = api.stars()[0];
      const original = ctx.fillRect;
      const samples = [];
      star.x = 100; star.y = 100; star.depth = .8;
      function sample(cameraY, velocityY) {
        game.camera.x = 0; game.camera.y = cameraY;
        game.ship.vx = 0; game.ship.vy = velocityY;
        const rectangles = [];
        try {
          ctx.fillRect = function (...args) { rectangles.push(args); return original.apply(this, args); };
          api.background(1000);
        } finally { ctx.fillRect = original; }
        samples.push(rectangles[1]);
      }
      sample(0, 0); sample(-100, -100);
      return { stationary: samples[0], forward: samples[1] };
    });
    assert.equal(motion.stationary[0], motion.forward[0]);
    assert.ok(motion.forward[1] - motion.stationary[1] > 80,
      "Forward camera travel produces visible vertical star movement.");
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("drift-bastion-pc-uiux-save-v2")).fragments), 57);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, viewport: "1920x1080@100%", installedSpriteAndAimMatch: true,
      repeatedUpgradeRanksRemoved: true, forwardVelocity: forward.vy, verticalStarTravel: motion.forward[1] - motion.stationary[1],
      permanentWalletPreserved: true, errors }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
