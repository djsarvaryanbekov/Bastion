"use strict";
// Phase 3 — full Waves run driven by a simple bot: stationary ship, picks the first card, buys modules
// through the real purchase path between waves. Usage: node qa-gameplay.cjs [--mortal] [--waves=25]
const q = require("./qa-lib.cjs");

const mortal = process.argv.includes("--mortal");
const lastWave = Number((process.argv.find(a => a.startsWith("--waves=")) || "--waves=25").split("=")[1]);
const BUY_ORDER = ["cannon", "scatter", "missile", "shield", "laser", "arc", "pulse", "repair", "rail", "flak", "cryo", "ember", "reactor", "bulkhead", "gravity", "collector", "mine", "armor"];

(async () => {
  const file = q.instrumentedCopy();
  const browser = await q.launch();
  const { page, log } = await q.newPage(browser, { save: { training: { version: 1, completed: true } } });
  await page.goto(q.url(file) + "?debug=1");
  await page.evaluate(order => order.forEach(t => window.__driftBastion.unlockModule(t)), BUY_ORDER);
  await page.click("#startButton");
  await q.installDrivers(page);
  if (!mortal) await page.evaluate(() => window.__driftBastion.setInvulnerable(true));

  const report = { mortal, waves: [], failures: [], victory: null };
  const fail = m => report.failures.push(m);
  const t0 = Date.now();

  for (let guard = 0; guard < lastWave + 2; guard++) {
    // Combat: advance in 1 s chunks, timing the simulation and sampling entity counts.
    const wave = await page.evaluate(() => {
      var game = window.__qa.game(), d = window.__driftBastion;
      var startWave = game.wave, startElapsed = game.elapsed, startKills = game.kills, peakE = 0, peakP = 0, worstStep = 0, totalMs = 0, steps = 0;
      var bossSeen = false, coreMin = Infinity;
      for (var sec = 0; sec < 240 && game.state === "playing" && !game.finished; sec += 1) {
        for (var i = 0; i < 30 && game.state === "playing" && !game.finished; i += 1) {
          var a = performance.now(); game.update(1 / 30); var dt = performance.now() - a;
          totalMs += dt; steps += 1; if (dt > worstStep) worstStep = dt;
        }
        peakE = Math.max(peakE, game.enemies.length); peakP = Math.max(peakP, game.projectiles.length);
        if (game.boss && !game.boss.dead) bossSeen = true;
        var core = game.ship.tiles.get("0,0"); coreMin = Math.min(coreMin, core ? core.hp / core.maxHp : 0);
      }
      var core2 = game.ship.tiles.get("0,0");
      return { wave: startWave, seconds: +(game.elapsed - startElapsed).toFixed(1), kills: game.kills - startKills,
        spawnedTotal: game.totalEnemiesSpawned, peakEnemies: peakE, peakProjectiles: peakP, boss: bossSeen,
        simAvgMs: +(totalMs / Math.max(1, steps)).toFixed(3), simWorstMs: +worstStep.toFixed(2),
        coreMinPct: Math.round(coreMin * 100), corePctEnd: core2 ? Math.round(core2.hp / core2.maxHp * 100) : 0,
        modules: game.ship.tiles.size, matter: Math.round(game.matter), stateAfter: game.state, finished: game.finished,
        stuck: game.state === "playing" && !game.finished };
    });
    // The victory overlay opens on wave 20; read it before anything else.
    const victoryVisible = await page.locator("#milestoneOverlay").isVisible();
    if (victoryVisible && !report.victory) {
      report.victory = { wave: wave.wave, text: (await page.locator("#milestoneOverlay").innerText()).replace(/\s+/g, " ").slice(0, 160) };
      await page.click("#continueSurvivalButton");
      wave.stateAfter = (await page.evaluate(() => window.__qa.game().state));
    }
    report.waves.push(wave);
    console.log(`wave ${wave.wave}: ${wave.seconds}s kills ${wave.kills} peakE ${wave.peakEnemies} peakP ${wave.peakProjectiles} boss ${wave.boss} sim ${wave.simAvgMs}/${wave.simWorstMs}ms core ${wave.coreMinPct}% modules ${wave.modules} -> ${wave.stateAfter}`);
    if (wave.stuck) { fail(`wave ${wave.wave} did not end within 240 s`); break; }
    if (wave.finished) break;
    if (wave.wave >= lastWave) break;
    if (wave.stateAfter !== "intermission") { fail(`wave ${wave.wave} ended in state ${wave.stateAfter}`); break; }
    if ([5, 10, 15, 20].includes(wave.wave) && !wave.boss) fail(`wave ${wave.wave} had no boss`);

    // Break: pick card 1, buy modules through the real purchase path, start next wave via the button.
    const brk = await page.evaluate(order => {
      var game = window.__qa.game(), qa = window.__qa;
      var offer = (game.cardOffer || []).length;
      var buys = [];
      qa.openBuild();
      var ring = [];
      for (var r = 1; r <= 6; r += 1) for (var x = -r; x <= r; x += 1) for (var y = -r; y <= r; y += 1) if (Math.max(Math.abs(x), Math.abs(y)) === r) ring.push([x, y]);
      for (var n = 0; n < 12; n += 1) {
        var type = order[(game.ship.tiles.size + n) % order.length];
        var cheapest = order.reduce(function (m, t) { return Math.min(m, qa.modulePrice(t)); }, Infinity);
        if (game.matter < cheapest) break;
        if (game.matter < qa.modulePrice(type)) continue;
        var spot = ring.find(function (c) { return !game.ship.tiles.has(c[0] + "," + c[1]) && game.isAdjacentToShip(c[0], c[1]); });
        if (!spot) break;
        if (qa.buy(type, spot[0], spot[1])) buys.push(type);
      }
      qa.closeBuild();
      return { offer: offer, buys: buys, state: game.state };
    }, BUY_ORDER);
    if (brk.offer === 0 && wave.wave < 20) fail(`wave ${wave.wave} break offered no cards`);
    const cards = page.locator("#cardChoices button, #cardChoices [data-index]");
    if (await cards.count()) await cards.first().click();
    await page.click("#nextWaveButton");
    const after = await page.evaluate(() => window.__driftBastion.waveState());
    report.waves[report.waves.length - 1].break = Object.assign(brk, { picks: after.picks.length });
    if (after.wave !== wave.wave + 1) { fail(`Start wave did not advance from ${wave.wave} (now ${after.wave})`); break; }
  }

  const final = await page.evaluate(() => window.__driftBastion.getState());
  report.final = { screen: final.screen, finished: final.finished, kills: final.kills, elapsed: Math.round(final.elapsed), modules: final.modules,
    bossesDefeated: final.bossesDefeated, fragments: await page.evaluate(() => window.__qa.save().fragments) };
  if (!mortal && !report.victory) fail("no victory overlay after wave 20");
  report.wallSeconds = Math.round((Date.now() - t0) / 1000);
  report.errors = log;
  report.crashed = await page.locator("#crashOverlay").isVisible();
  q.writeJson((process.env.QA_TAG ? process.env.QA_TAG + "-" : "") + (mortal ? "gameplay-mortal.json" : "gameplay.json"), report);
  console.log(`DONE ${mortal ? "mortal" : "invulnerable"}: ${report.waves.length} waves, victory=${Boolean(report.victory)}, failures=${report.failures.length}, pageErrors=${log.pageErrors.length}, crashed=${report.crashed}, wall ${report.wallSeconds}s`);
  report.failures.forEach(f => console.log("FAIL " + f));
  await browser.close().catch(() => {});
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
