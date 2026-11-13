"use strict";
// Phase 4b — render ablation in the installed Chrome: switch one render layer off at a time (test copy only)
// and measure frame time in the same late-game scene. Usage: node qa-ablate.cjs [--html=path] [--tag=name]
const fs = require("node:fs");
const path = require("node:path");
const q = require("./qa-lib.cjs");
const { chromium } = require("playwright");

const htmlArg = process.argv.find(a => a.startsWith("--html="));
const tag = (process.argv.find(a => a.startsWith("--tag=")) || "--tag=main").split("=")[1];
const BUY_ORDER = ["cannon", "scatter", "missile", "shield", "laser", "arc", "pulse", "repair", "rail", "flak", "cryo", "ember", "reactor", "bulkhead", "gravity", "collector", "mine", "armor"];

// Guards inserted into the test copy's render path. Each [needle, key] wraps one statement.
const GUARDS = [
  ["      drawBackground(time);\n", "background"],
  ["        drawGravityFields();\n", "gravity"],
  ["        drawEnemies();\n", "enemies"],
  ["        drawProjectiles(false);\n", "projectilesHostile"],
  ["        drawShip();\n", "ship"],
  ["        drawEffects();\n", "effects"],
  ["        if (game.attackVfx) game.attackVfx.muzzles(ctx, worldToScreen, save.settings.reducedFlash);\n", "muzzles"],
  ["        drawProjectiles(true);\n", "projectilesFriendly"],
  ["      drawScreenFeedback();\n", "screenFeedback"],
  ["        if (moduleArt) moduleArt.drawBase(ctx, tileArtType(tile), tile.x * TILE_SIZE, tile.y * TILE_SIZE, TILE_SIZE);\n", "shipBase"],
  ["        drawModuleGlyph(tile, tile.x * TILE_SIZE, tile.y * TILE_SIZE);\n", "shipEquipment"],
  ["      shieldVfx.drawFields(ctx, TILE_SIZE);\n", "shieldFields"],
];

function ablationCopy(source) {
  let html = fs.readFileSync(source, "utf8");
  for (const [needle, key] of GUARDS) {
    const count = html.split(needle).length - 1;
    if (count !== 1) throw new Error(`guard '${key}' matched ${count} times`);
    const indent = needle.match(/^ */)[0];
    html = html.replace(needle, `${indent}if (!window.__off.${key}) ${needle.trimStart()}`);
  }
  html = html.replace("<script>", "<script>window.__off = {};</script><script>");
  const tmp = path.join(require("node:os").tmpdir(), "bastion-qa-2026-11-13", "ablate-src-" + tag + ".html");
  fs.writeFileSync(tmp, html);
  return q.instrumentedCopy(tmp, "Drift_Bastion_QA_ablate_" + tag + ".html");
}

const MEASURE = `window.__frames = function (ms) { return new Promise(function (resolve) {
  var t = [], start = performance.now(), last = start;
  function tick(now) { t.push(now - last); last = now; if (now - start < ms) requestAnimationFrame(tick); else {
    t.shift(); t.sort(function (a, b) { return a - b; }); var sum = t.reduce(function (s, v) { return s + v; }, 0);
    var g = window.__qa.game();
    resolve({ fps: +(1000 * t.length / sum).toFixed(1), avgMs: +(sum / t.length).toFixed(1), p95: +t[Math.floor(t.length * .95)].toFixed(1), enemies: g.enemies.length, effects: g.effects ? g.effects.length : null, particles: g.particles ? g.particles.length : null }); } }
  requestAnimationFrame(tick); }); };`;

(async () => {
  const file = ablationCopy(htmlArg ? path.resolve(htmlArg.split("=")[1]) : q.MAIN_HTML);
  const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-size=1920,1080", "--window-position=0,0", "--disable-background-timer-throttling", "--disable-renderer-backgrounding"] });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, locale: "en-US" });
  const page = await context.newPage();
  const errors = []; page.on("pageerror", e => errors.push(e.message));
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [q.SAVE_KEY, JSON.stringify({ version: 9, settings: { muted: true, autoPause: false }, training: { version: 1, completed: true } })]);
  await page.goto(q.url(file) + "?debug=1");
  await page.addStyleTag({ content: "#debugBar{display:none!important}" });
  await page.evaluate(MEASURE);
  await page.evaluate(order => order.forEach(t => window.__driftBastion.unlockModule(t)), BUY_ORDER);
  await page.click("#startButton");
  await q.installDrivers(page);
  await page.evaluate(order => {
    var d = window.__driftBastion, qa = window.__qa, game = qa.game();
    d.setInvulnerable(true); window.__qaClearWave(); d.addMatter(1e7); qa.openBuild();
    var ring = [];
    for (var r = 1; r <= 8; r += 1) for (var x = -r; x <= r; x += 1) for (var y = -r; y <= r; y += 1) if (Math.max(Math.abs(x), Math.abs(y)) === r) ring.push([x, y]);
    for (var n = 0; game.ship.tiles.size < 120 && n < 400; n += 1) {
      var spot = ring.find(function (c) { return !game.ship.tiles.has(c[0] + "," + c[1]) && game.isAdjacentToShip(c[0], c[1]); });
      if (!spot) break; qa.buy(order[n % order.length], spot[0], spot[1]);
    }
    qa.closeBuild(); window.__qaJumpToWave(18);
  }, BUY_ORDER);
  await page.waitForTimeout(20000);
  // Live scene (simulation running). Each variant alternates with baseline 3 times to cancel drift.
  await page.evaluate(() => {
    var cf = window.DriftCombatFeedback, mb = window.DriftMissileBlastVfx, av = window.__qa.game().attackVfx, s = window.__qa.save();
    window.__orig = { cf: cf.draw, mb: mb.draw, av: av.effect, q: s.settings.qualityTier };
    window.__variant = function (name) {
      cf.draw = window.__orig.cf; mb.draw = window.__orig.mb; av.effect = window.__orig.av; s.settings.qualityTier = window.__orig.q;
      if (name === "no combat feedback (sparks, wrecks, smoke, shockwaves)") cf.draw = function () { return true; };
      if (name === "no wreck fragments") cf.draw = function (c, e) { return e.type === "wreck" ? true : window.__orig.cf.apply(this, arguments); };
      if (name === "no missile blast") mb.draw = function () {};
      if (name === "no missile blob only") mb.draw = function (ctx, pos, age) { return window.__orig.mb.call(this, ctx, pos, Math.max(age, .71), arguments[3], arguments[4], arguments[5], arguments[6]); };
      if (name === "no attack vfx effects") av.effect = function () { return true; };
      if (name === "quality tier 1 (no shadow blur)") s.settings.qualityTier = 1;
    };
  });
  const variants = ["no combat feedback (sparks, wrecks, smoke, shockwaves)", "no wreck fragments", "no missile blast", "no missile blob only", "no attack vfx effects", "quality tier 1 (no shadow blur)"];
  const results = [];
  for (const v of variants) {
    const base = [], test = [];
    for (let rep = 0; rep < 3; rep++) {
      await page.evaluate(() => window.__variant("baseline")); await page.waitForTimeout(300);
      base.push(await page.evaluate(() => window.__frames(2000)));
      await page.evaluate(v => window.__variant(v), v); await page.waitForTimeout(300);
      test.push(await page.evaluate(() => window.__frames(2000)));
    }
    const avg = a => +(a.reduce((s, r) => s + r.avgMs, 0) / a.length).toFixed(1);
    const row = { variant: v, baselineMs: avg(base), variantMs: avg(test), savedMs: +(avg(base) - avg(test)).toFixed(1), enemies: test[2].enemies, effects: test[2].effects };
    results.push(row); console.log(JSON.stringify(row));
  }
  await page.evaluate(() => window.__variant("baseline"));
  q.writeJson(`perf-effects-${tag}.json`, { scene: "wave 18, 120 modules, live", results, errors });
  await browser.close().catch(() => {});
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
