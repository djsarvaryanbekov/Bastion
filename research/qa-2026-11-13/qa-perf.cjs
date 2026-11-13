"use strict";
// Phase 4 — performance.
//   node qa-perf.cjs --sim [--html=path]      headless: per-subsystem simulation cost in a late-game swarm
//   node qa-perf.cjs --render [--html=path]   installed Chrome, real GPU: frame times per scenario + CPU profile
// --tag=name labels the output file so builds can be compared in the same session.
const fs = require("node:fs");
const path = require("node:path");
const q = require("./qa-lib.cjs");

const mode = process.argv.includes("--render") ? "render" : "sim";
const htmlArg = process.argv.find(a => a.startsWith("--html="));
const tag = (process.argv.find(a => a.startsWith("--tag=")) || "--tag=main").split("=")[1];
const BUY_ORDER = ["cannon", "scatter", "missile", "shield", "laser", "arc", "pulse", "repair", "rail", "flak", "cryo", "ember", "reactor", "bulkhead", "gravity", "collector", "mine", "armor"];
const SUBSYSTEMS = ["updateMovement", "updateFeedback", "updateShields", "updateSupportModules", "updateWaveDirector", "updateSpawner",
  "updateWeaponStatuses", "updateEnemies", "updateProjectiles", "updateLayoutCards", "updateWeapons", "updateDerelicts", "updateEffects", "processVolatileBlasts"];

// Builds a late-game ship (~modules) in a wave break, then jumps to the target wave.
async function lateGame(page, { wave = 18, modules = 120 } = {}) {
  await page.evaluate(order => order.forEach(t => window.__driftBastion.unlockModule(t)), BUY_ORDER);
  await page.click("#startButton");
  await q.installDrivers(page);
  await page.evaluate(({ order, modules, wave }) => {
    var d = window.__driftBastion, qa = window.__qa, game = qa.game();
    d.setInvulnerable(true);
    window.__qaClearWave();
    d.addMatter(1e7);
    qa.openBuild();
    var ring = [];
    for (var r = 1; r <= 8; r += 1) for (var x = -r; x <= r; x += 1) for (var y = -r; y <= r; y += 1) if (Math.max(Math.abs(x), Math.abs(y)) === r) ring.push([x, y]);
    for (var n = 0; game.ship.tiles.size < modules && n < 400; n += 1) {
      var spot = ring.find(function (c) { return !game.ship.tiles.has(c[0] + "," + c[1]) && game.isAdjacentToShip(c[0], c[1]); });
      if (!spot) break;
      qa.buy(order[n % order.length], spot[0], spot[1]);
    }
    qa.closeBuild();
    window.__qaJumpToWave(wave);
  }, { order: BUY_ORDER, modules, wave });
}

async function sim(file) {
  const browser = await q.launch();
  const { page, log } = await q.newPage(browser, { save: { training: { version: 1, completed: true } } });
  await page.goto(q.url(file) + "?debug=1");
  await lateGame(page, { wave: 18 });
  const result = await page.evaluate(names => {
    var game = window.__qa.game(), stats = {};
    names.forEach(function (name) {
      var orig = game[name]; if (typeof orig !== "function") return;
      var s = stats[name] = { total: 0, max: 0, calls: 0 };
      game[name] = function () { var a = performance.now(); var r = orig.apply(this, arguments); var t = performance.now() - a; s.total += t; s.calls += 1; if (t > s.max) s.max = t; return r; };
    });
    var steps = [], spikes = [];
    for (var i = 0; i < 60 * 30 && game.state === "playing"; i += 1) {
      var snapshot = {}; names.forEach(function (n) { snapshot[n] = stats[n] ? stats[n].total : 0; });
      var a = performance.now(); game.update(1 / 30); var t = performance.now() - a; steps.push(t);
      if (t > 12) {
        var worst = names.map(function (n) { return [n, stats[n] ? stats[n].total - snapshot[n] : 0]; }).sort(function (x, y) { return y[1] - x[1]; }).slice(0, 3);
        spikes.push({ step: i, ms: +t.toFixed(1), enemies: game.enemies.length, projectiles: game.projectiles.length, top: worst.map(function (w) { return w[0] + " " + w[1].toFixed(1); }) });
      }
    }
    steps.sort(function (x, y) { return x - y; });
    var sum = steps.reduce(function (s, v) { return s + v; }, 0);
    var table = Object.keys(stats).map(function (n) { return { fn: n, avgMs: +(stats[n].total / Math.max(1, stats[n].calls)).toFixed(3), maxMs: +stats[n].max.toFixed(2), share: +(stats[n].total / sum * 100).toFixed(1) }; })
      .sort(function (x, y) { return y.share - x.share; });
    return { steps: steps.length, enemiesEnd: game.enemies.length, modules: game.ship.tiles.size,
      stepAvgMs: +(sum / steps.length).toFixed(3), p50: +steps[Math.floor(steps.length * .5)].toFixed(2), p95: +steps[Math.floor(steps.length * .95)].toFixed(2),
      p99: +steps[Math.floor(steps.length * .99)].toFixed(2), max: +steps[steps.length - 1].toFixed(2), subsystems: table, spikes: spikes.slice(0, 15), spikeCount: spikes.length };
  }, SUBSYSTEMS);
  result.errors = log;
  await browser.close().catch(() => {});
  return result;
}

// Real-time frame timing in the page: rAF intervals plus long tasks.
const MEASURE = `window.__measureFrames = function (ms) {
  return new Promise(function (resolve) {
    var times = [], start = performance.now(), last = start, longTasks = 0;
    var obs; try { obs = new PerformanceObserver(function (l) { longTasks += l.getEntries().length; }); obs.observe({ type: "longtask", buffered: false }); } catch (e) {}
    function tick(now) {
      times.push(now - last); last = now;
      if (now - start < ms) requestAnimationFrame(tick);
      else {
        if (obs) obs.disconnect();
        var sorted = times.slice(1).sort(function (a, b) { return a - b; }), n = sorted.length, sum = sorted.reduce(function (s, v) { return s + v; }, 0);
        var g = window.__qa && window.__qa.game && window.__qa.game();
        resolve({ frames: n, fps: +(1000 * n / sum).toFixed(1), avgMs: +(sum / n).toFixed(2), p95: +sorted[Math.floor(n * .95)].toFixed(1), p99: +sorted[Math.floor(n * .99)].toFixed(1),
          max: +sorted[n - 1].toFixed(1), over20ms: +(sorted.filter(function (v) { return v > 20; }).length / n * 100).toFixed(1), over34ms: sorted.filter(function (v) { return v > 34; }).length,
          longTasks: longTasks, enemies: g ? g.enemies.length : 0, projectiles: g ? g.projectiles.length : 0, particles: g ? (g.particles ? g.particles.length : null) : 0, modules: g ? g.ship.tiles.size : 0 });
      }
    }
    requestAnimationFrame(tick);
  });
};`;

async function cpuProfile(page, ms) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Profiler.enable");
  await cdp.send("Profiler.setSamplingInterval", { interval: 200 });
  await cdp.send("Profiler.start");
  await page.waitForTimeout(ms);
  const { profile } = await cdp.send("Profiler.stop");
  const byId = new Map(profile.nodes.map(n => [n.id, n]));
  const self = new Map();
  const deltas = profile.timeDeltas;
  let idle = 0, total = 0;
  profile.samples.forEach((id, i) => {
    const node = byId.get(id); const dt = (deltas[i] || 0) / 1000; total += dt;
    const name = node.callFrame.functionName || "(anonymous)";
    if (name === "(idle)" || name === "(program)") { if (name === "(idle)") idle += dt; return; }
    const key = name + " :" + (node.callFrame.lineNumber + 1);
    self.set(key, (self.get(key) || 0) + dt);
  });
  const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => ({ fn: k, selfMs: +v.toFixed(1), pct: +(v / total * 100).toFixed(1) }));
  // Inclusive time: each function counted once per sample stack.
  const parent = new Map();
  profile.nodes.forEach(n => (n.children || []).forEach(c => parent.set(c, n.id)));
  const incl = new Map();
  profile.samples.forEach((id, i) => {
    const dt = (deltas[i] || 0) / 1000; const seen = new Set();
    for (let cur = id; cur !== undefined; cur = parent.get(cur)) {
      const n = byId.get(cur); const name = n.callFrame.functionName;
      if (!name || name === "(root)" || name === "(idle)" || name === "(program)") continue;
      const key = name + " :" + (n.callFrame.lineNumber + 1);
      if (seen.has(key)) continue; seen.add(key);
      incl.set(key, (incl.get(key) || 0) + dt);
    }
  });
  const inclusive = [...incl.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, v]) => ({ fn: k, pct: +(v / total * 100).toFixed(1) }));
  return { wallMs: Math.round(total), busyPct: +((1 - idle / total) * 100).toFixed(1), top, inclusive };
}

async function render(file) {
  const { chromium } = require("playwright");
  const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-size=1920,1080", "--window-position=0,0", "--disable-background-timer-throttling", "--disable-renderer-backgrounding"] });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, locale: "en-US" });
  const page = await context.newPage();
  const log = { pageErrors: [] }; page.on("pageerror", e => log.pageErrors.push(e.message));
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [q.SAVE_KEY, JSON.stringify({ version: 9, settings: { muted: true, autoPause: false }, training: { version: 1, completed: true } })]);
  await page.goto(q.url(file) + "?debug=1");
  await page.addStyleTag({ content: "#debugBar{display:none!important}" });
  await page.evaluate(MEASURE);
  const gpu = await page.evaluate(() => { const c = document.createElement("canvas").getContext("webgl"); const e = c && c.getExtension("WEBGL_debug_renderer_info"); return e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : "unknown"; });
  const out = { gpu, scenarios: {}, profiles: {} };
  const measure = async (name, ms = 5000) => { await page.waitForTimeout(800); out.scenarios[name] = await page.evaluate(ms => window.__measureFrames(ms), ms); console.log(name, JSON.stringify(out.scenarios[name])); };

  await measure("menu");
  await page.evaluate(order => order.forEach(t => window.__driftBastion.unlockModule(t)), BUY_ORDER);
  await page.click("#startButton");
  await q.installDrivers(page);
  await page.evaluate(() => window.__driftBastion.setInvulnerable(true));
  await page.waitForTimeout(6000);
  await measure("wave1-starter-ship");
  await page.evaluate(() => window.__qaClearWave());
  await measure("card-break");
  await page.evaluate(() => window.__driftBastion.addMatter(1e7));
  await page.click("#waveBuildButton");
  await measure("build-screen-small-ship");
  // Ten real purchases one click at a time, then back to the card screen with their flashes.
  const ring = `var ring = []; for (var r = 1; r <= 8; r += 1) for (var x = -r; x <= r; x += 1) for (var y = -r; y <= r; y += 1) if (Math.max(Math.abs(x), Math.abs(y)) === r) ring.push([x, y]);
    function freeSpot(game) { return ring.find(function (c) { return !game.ship.tiles.has(c[0] + "," + c[1]) && game.isAdjacentToShip(c[0], c[1]); }); }`;
  for (let n = 0; n < 10; n++) {
    await page.evaluate(([order, n, ring]) => { eval(ring); var qa = window.__qa, game = qa.game(), s = freeSpot(game); qa.buy(order[n % order.length], s[0], s[1]); }, [BUY_ORDER, n, ring]);
    await page.waitForTimeout(120);
  }
  await page.click("#closeBuild");
  await measure("card-break-after-10-buys", 3000);
  // The big ship is placed with the debug placer (no per-click grid render), the same for every build.
  await page.evaluate(([order, ring]) => { eval(ring); var game = window.__qa.game();
    for (var n = 0; game.ship.tiles.size < 120 && n < 400; n += 1) { var s = freeSpot(game); if (!s) break; window.__driftBastion.placeModule(order[n % order.length], s[0], s[1]); }
  }, [BUY_ORDER, ring]);
  await page.click("#waveBuildButton");
  await measure("build-screen-120-modules");
  const buyMs = await page.evaluate(([ring]) => { eval(ring); var qa = window.__qa, game = qa.game(), s = freeSpot(game); var a = performance.now(); qa.buy("cannon", s[0], s[1]); return +(performance.now() - a).toFixed(1); }, [ring]);
  out.scenarios["build-purchase-click-121st-module"] = { jsMs: buyMs };
  console.log("build purchase click at 121 modules: " + buyMs + " ms");
  await page.click("#closeBuild");
  await page.evaluate(() => window.__qaJumpToWave(18));
  await page.waitForTimeout(25000); // let the swarm build up in real time
  await measure("wave18-swarm-120-modules", 6000);
  out.profiles["wave18-swarm-120-modules"] = await cpuProfile(page, 5000);
  await page.evaluate(() => window.__qaClearWave());
  await page.evaluate(() => window.__qaJumpToWave(20));
  await page.waitForTimeout(14000);
  await measure("wave20-boss-120-modules", 6000);
  out.profiles["wave20-boss-120-modules"] = await cpuProfile(page, 5000);
  // Missile stress used for build 58: 8 Missile Pods into 60 enemies.
  await page.evaluate(() => {
    var game = window.__qa.game();
    Array.from(game.ship.tiles.keys()).forEach(function (k) { if (k !== "0,0") game.ship.tiles.delete(k); });
    [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].forEach(function (c) { window.__driftBastion.placeModule("missile", c[0], c[1]); });
    game.enemies.forEach(function (e) { if (e.type !== "boss") e.dead = true; }); game.compactEnemies();
    game.updateSpawner = function () {};
    for (var i = 0; i < 60; i += 1) { var a = i / 60 * Math.PI * 2; game.spawnEnemy("brute", Math.cos(a) * 300, Math.sin(a) * 300); }
  });
  await measure("missile-8-pods-60-enemies", 4000);
  out.errors = log;
  await browser.close().catch(() => {});
  return out;
}

(async () => {
  const file = q.instrumentedCopy(htmlArg ? path.resolve(htmlArg.split("=")[1]) : q.MAIN_HTML, "Drift_Bastion_QA_" + tag + ".html");
  const result = mode === "sim" ? await sim(file) : await render(file);
  q.writeJson(`perf-${mode}-${tag}.json`, result);
  if (mode === "sim") {
    console.log(`sim ${tag}: ${result.steps} steps, ${result.modules} modules, ${result.enemiesEnd} enemies, avg ${result.stepAvgMs} p95 ${result.p95} p99 ${result.p99} max ${result.max} ms, spikes>12ms ${result.spikeCount}`);
    result.subsystems.slice(0, 8).forEach(s => console.log("  " + s.fn.padEnd(22) + " avg " + s.avgMs + " max " + s.maxMs + " share " + s.share + "%"));
    result.spikes.slice(0, 6).forEach(s => console.log("  spike " + JSON.stringify(s)));
  } else {
    console.log("GPU " + result.gpu);
    for (const [name, p] of Object.entries(result.profiles)) {
      console.log(`${name}: CPU busy ${p.busyPct}% ; inclusive:`);
      p.inclusive.slice(0, 30).forEach(t => console.log("  " + t.pct + "%  " + t.fn));
    }
  }
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
