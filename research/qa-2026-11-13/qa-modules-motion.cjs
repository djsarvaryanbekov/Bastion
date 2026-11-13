"use strict";
// Phase 2b — Mine and Gravity need moving enemies (mines go into approach lanes; gravity pulls moving groups).
const q = require("./qa-lib.cjs");
const fs = require("node:fs");
const BENCH = fs.readFileSync(__dirname + "/qa-modules.cjs", "utf8").match(/const BENCH = `([\s\S]*?)`;/)[1];
(async () => {
  const file = q.instrumentedCopy();
  const browser = await q.launch();
  const { page, log } = await q.newPage(browser, { save: { training: { version: 1, completed: true } } });
  await page.goto(q.url(file) + "?debug=1");
  await page.click("#startEndlessButton");
  await page.evaluate(BENCH);
  const out = {};
  for (const type of ["mine", "gravity", "cannon"]) {
    out[type] = await page.evaluate(type => {
      var b = window.__bench, game = b.g(); b.reset(true); b.place(type, 1, 0);
      // A tight group approaching from 420px, normal enemy AI.
      var ds = [];
      for (var i = 0; i < 8; i += 1) { game.spawnEnemy("brute", 420 + (i % 3) * 30, -60 + Math.floor(i / 3) * 40); var e = game.enemies[game.enemies.length - 1]; e.fireClock = 1e9; ds.push(e); }
      var fieldsSeen = 0, minesSeen = 0, minSpread = 1e9;
      for (var s = 0; s < 15 * 30; s += 1) {
        game.update(1 / 30);
        fieldsSeen = Math.max(fieldsSeen, game.gravityFields.length);
        minesSeen = Math.max(minesSeen, game.projectiles.filter(function (p) { return p.friendly && /mine/.test(p.kind || p.type || p.weapon || ""); }).length);
        var alive = ds.filter(function (e) { return !e.dead; });
        if (alive.length > 2) {
          var cx = 0, cy = 0; alive.forEach(function (e) { cx += e.x; cy += e.y; }); cx /= alive.length; cy /= alive.length;
          minSpread = Math.min(minSpread, alive.reduce(function (t, e) { return t + Math.hypot(e.x - cx, e.y - cy); }, 0) / alive.length);
        }
      }
      return { damage: Math.round(window.__dmg), hits: window.__hits, killed: ds.filter(function (e) { return e.dead; }).length, of: ds.length,
        maxGravityFields: fieldsSeen, maxMineProjectiles: minesSeen, minGroupSpread: Math.round(minSpread) };
    }, type);
  }
  out.errors = log;
  q.writeJson("modules-motion.json", out);
  console.log(JSON.stringify(out, null, 1));
  await browser.close().catch(() => {}); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
