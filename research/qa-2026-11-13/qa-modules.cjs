"use strict";
// Phase 2 — per-module bench. Endless run with the spawner switched off, core + the module under test,
// stationary dummy enemies, fixed-step simulation. Measures each module's own effect.
const q = require("./qa-lib.cjs");

const BENCH = `
window.__bench = (function () {
  var api = window.__driftBastion, qa = window.__qa;
  function g() { return qa.game(); }
  function reset(invulnerable) {
    var game = g();
    game.updateSpawner = function () {};
    game.enemies.forEach(function (e) { e.dead = true; }); game.compactEnemies();
    game.projectiles.forEach(function (p) { p.life = 0; });
    Array.from(game.ship.tiles.keys()).forEach(function (k) { if (k !== "0,0") game.ship.tiles.delete(k); });
    game.ship.x = 0; game.ship.y = 0; game.ship.vx = 0; game.ship.vy = 0; game.ship.angle = 0;
    var core = game.ship.tiles.get("0,0"); core.hp = core.maxHp;
    game.matter = 0; game.gravityFields.length = 0;
    if (game.mines) game.mines.length = 0;
    api.setInvulnerable(invulnerable !== false);
    window.__dmg = 0; window.__hits = 0;
    if (!game.__wrapped) {
      var orig = game.damageEnemy;
      game.damageEnemy = function (enemy, amount) { if (!enemy.dead) { window.__dmg += Math.max(0, amount); window.__hits += 1; } return orig.apply(this, arguments); };
      game.__wrapped = true;
    }
    game.activePairs = game.adjacentPairs();
  }
  function place(type, x, y) {
    var ok = api.placeModule(type, x, y);
    var t = g().ship.tiles.get(x + "," + y); if (t) t.placementProtectedUntil = 0;
    g().activePairs = g().adjacentPairs();
    return ok;
  }
  // Stationary, non-firing dummies; hp scaled so nothing dies unless asked.
  function dummies(type, count, radius, hp) {
    var game = g(), out = [];
    for (var i = 0; i < count; i += 1) {
      var a = (i / count) * Math.PI * 2;
      game.spawnEnemy(type, Math.cos(a) * radius, Math.sin(a) * radius);
      var e = game.enemies[game.enemies.length - 1];
      e.speed = 0; e.fireClock = 1e9; e.vx = 0; e.vy = 0;
      if (hp) { e.hp = hp; e.maxHp = hp; e.shield = 0; e.maxShield = 0; }
      out.push(e);
    }
    return out;
  }
  function run(seconds) { var game = g(); for (var i = 0; i < seconds * 30 && !game.finished; i += 1) { game.update(1 / 30); } }
  function living() { return g().enemies.filter(function (e) { return !e.dead; }); }
  return { g: g, reset: reset, place: place, dummies: dummies, run: run, living: living };
})();
`;

const WEAPONS = ["cannon", "laser", "missile", "scatter", "arc", "rail", "flak", "pulse", "cryo", "mine", "ember", "gravity"];

(async () => {
  const file = q.instrumentedCopy();
  const browser = await q.launch();
  const { page, log } = await q.newPage(browser, { save: { training: { version: 1, completed: true } } });
  await page.goto(q.url(file) + "?debug=1");
  await page.click("#startEndlessButton");
  await page.evaluate(BENCH);
  const results = { weapons: {}, support: {}, combos: {}, failures: [] };
  const fail = m => results.failures.push(m);

  for (const type of WEAPONS) {
    const r = await page.evaluate(type => {
      var b = window.__bench, game = b.g(), def = window.__qa.MODULES[type];
      b.reset(true);
      b.place(type, 1, 0);
      var range = def.range || 300;
      var dist = Math.min(range * 0.6, 170);
      var ds = b.dummies("brute", 8, dist, 100000);
      var t0 = performance.now();
      b.run(12);
      var ms = performance.now() - t0;
      var slowed = ds.filter(function (e) { return e.slowTimer > 0; }).length;
      var burning = ds.filter(function (e) { return e.burnTimer > 0; }).length;
      var cx = 0, cy = 0; ds.forEach(function (e) { cx += e.x; cy += e.y; }); cx /= ds.length; cy /= ds.length;
      var spread = ds.reduce(function (s, e) { return s + Math.hypot(e.x - cx, e.y - cy); }, 0) / ds.length;
      var wd = game.weaponDefinitions[type] || def;
      var theoreticalDps = wd.damage ? wd.damage * (wd.pellets || 1) / wd.cooldown : 0;
      return { damage: Math.round(window.__dmg), hits: window.__hits, dps: +(window.__dmg / 12).toFixed(1),
        singleTargetTheoreticalDps: +theoreticalDps.toFixed(1), targetsHit: ds.filter(function (e) { return e.hp < e.maxHp; }).length,
        slowed: slowed, burning: burning, spreadAfter: Math.round(spread), spreadBefore: Math.round(dist),
        gravityFields: game.gravityFields.length, simMsPer12s: Math.round(ms) };
    }, type);
    results.weapons[type] = r;
    if (r.damage <= 0) fail(`${type}: dealt no damage to dummies at ${r.spreadBefore}px`);
    if (type === "cryo" && r.slowed === 0) fail("cryo: no enemy slowed");
    if (type === "ember" && r.burning === 0 && r.damage > 0) fail("ember: no burn applied");
    if (type === "gravity" && r.spreadAfter >= r.spreadBefore) fail("gravity: enemies were not pulled together");
  }

  // Kills and Matter: every weapon must actually kill an ordinary scout pack and pay Matter.
  for (const type of WEAPONS) {
    const r = await page.evaluate(type => {
      var b = window.__bench, game = b.g(), def = window.__qa.MODULES[type];
      b.reset(true); b.place(type, 1, 0);
      var ds = b.dummies("scout", 6, Math.min((def.range || 300) * 0.6, 170), 0);
      var kills0 = game.kills; b.run(20);
      return { killed: ds.filter(function (e) { return e.dead; }).length, of: ds.length, matter: +game.matter.toFixed(1), killsCounted: game.kills - kills0 };
    }, type);
    results.weapons[type].scoutKills = r;
    if (r.killed === 0) fail(`${type}: killed no scouts in 20s`);
    if (r.killed > 0 && r.matter <= 0) fail(`${type}: kills paid no Matter`);
  }

  // Support modules.
  results.support.armor = await page.evaluate(() => {
    var b = window.__bench; b.reset(false); b.place("armor", 1, 0);
    var t = b.g().ship.tiles.get("1,0"); return { hp: t.hp, maxHp: t.maxHp };
  });
  results.support.shield = await page.evaluate(() => {
    var b = window.__bench, game = b.g(); b.reset(false); b.place("shield", 1, 0); b.run(1);
    var s = game.ship.tiles.get("1,0"), core = game.ship.tiles.get("0,0");
    var shieldBefore = s.shield, hpBefore = core.hp;
    game.applyDamageToTile("0,0", 30);
    var absorbed = shieldBefore - s.shield, hpLost = hpBefore - core.hp;
    b.run(12);
    return { shieldBefore: shieldBefore, absorbed: absorbed, coreHpLost: hpLost, shieldAfter12s: +s.shield.toFixed(1) };
  });
  if (!(results.support.shield.absorbed > 0 && results.support.shield.coreHpLost === 0)) fail("shield: did not absorb a 30 hit on the core");
  if (!(results.support.shield.shieldAfter12s > results.support.shield.shieldBefore - results.support.shield.absorbed)) fail("shield: did not recharge");
  results.support.repair = await page.evaluate(() => {
    var b = window.__bench, game = b.g(); b.reset(false); b.place("repair", 1, 0);
    var core = game.ship.tiles.get("0,0"); game.applyDamageToTile("0,0", core.maxHp * 0.5);
    var hp0 = core.hp; b.run(10);
    return { hpBefore: Math.round(hp0), hpAfter10s: Math.round(core.hp), maxHp: core.maxHp };
  });
  if (!(results.support.repair.hpAfter10s > results.support.repair.hpBefore)) fail("repair: core not repaired");
  results.support.bulkhead = await page.evaluate(() => {
    var b = window.__bench, game = b.g(), core;
    b.reset(false); core = game.ship.tiles.get("0,0"); var a = core.hp; game.applyDamageToTile("0,0", 50); var plain = a - core.hp;
    b.reset(false); b.place("bulkhead", 1, 0); core = game.ship.tiles.get("0,0"); a = core.hp; game.applyDamageToTile("0,0", 50); var guarded = a - core.hp;
    return { damagePlain: plain, damageWithBulkhead: +guarded.toFixed(2), reduction: +(1 - guarded / plain).toFixed(3) };
  });
  if (!(results.support.bulkhead.reduction > 0.1)) fail("bulkhead: no damage reduction on neighbour");
  results.support.reactor = await page.evaluate(() => {
    var b = window.__bench, game = b.g();
    function trial(withReactor) { b.reset(true); b.place("cannon", 1, 0); if (withReactor) b.place("reactor", 1, 1); b.dummies("brute", 4, 150, 100000); b.run(15); return window.__dmg; }
    var plain = trial(false), boosted = trial(true);
    return { cannonDamagePlain: Math.round(plain), cannonDamageWithReactor: Math.round(boosted), ratio: +(boosted / plain).toFixed(3) };
  });
  if (!(results.support.reactor.ratio > 1.15)) fail("reactor: cannon did not fire faster");
  results.support.collector = await page.evaluate(() => {
    var b = window.__bench, game = b.g();
    function trial(withCollector) { b.reset(true); b.place("cannon", 1, 0); if (withCollector) b.place("collector", -1, 0); b.dummies("scout", 6, 150, 0); b.run(20); return game.matter; }
    var plain = trial(false), boosted = trial(true);
    return { matterPlain: +plain.toFixed(2), matterWithCollector: +boosted.toFixed(2), ratio: +(boosted / plain).toFixed(3) };
  });
  if (!(results.support.collector.ratio > 1.05)) fail("collector: no extra Matter");

  // Documented edge-adjacent combos.
  results.combos.emberCannon = await page.evaluate(() => {
    var b = window.__bench; b.reset(true); b.place("cannon", 1, 0); b.place("ember", 1, 1);
    var ds = b.dummies("brute", 6, 150, 100000); b.run(10);
    return { burning: ds.filter(function (e) { return e.burnTimer > 0; }).length, damage: Math.round(window.__dmg) };
  });
  results.combos.cryoRail = await page.evaluate(() => {
    var b = window.__bench; b.reset(true); b.place("rail", 1, 0); b.place("cryo", 1, 1);
    var ds = b.dummies("brute", 6, 200, 100000); b.run(12);
    return { damage: Math.round(window.__dmg), slowed: ds.filter(function (e) { return e.slowTimer > 0; }).length };
  });
  results.combos.cryoMissile = await page.evaluate(() => {
    var b = window.__bench; b.reset(true); b.place("missile", 1, 0); b.place("cryo", 2, 0);
    var ds = b.dummies("brute", 6, 200, 100000); b.run(12);
    return { damage: Math.round(window.__dmg), slowed: ds.filter(function (e) { return e.slowTimer > 0; }).length };
  });

  // Destroying a module mid-fight must not break the run.
  results.destroyModule = await page.evaluate(() => {
    var b = window.__bench, game = b.g(); b.reset(false);
    ["cannon", "laser", "shield", "repair", "reactor"].forEach(function (t, i) { b.place(t, i + 1, 0); });
    b.dummies("brute", 6, 160, 2000);
    var before = game.ship.tiles.size;
    window.__driftBastion.destroyModule(3, 0);
    b.run(5);
    return { before: before, after: game.ship.tiles.size, detachedOrDestroyed: before - game.ship.tiles.size, finished: game.finished };
  });

  results.errors = log;
  results.crashed = await page.locator("#crashOverlay").isVisible();
  q.writeJson((process.env.QA_TAG ? process.env.QA_TAG + "-" : "") + "modules.json", results);
  console.log(`modules: ${WEAPONS.length} weapons + 6 support + 3 combos, ${results.failures.length} failures, ${log.pageErrors.length} page errors, crashed=${results.crashed}`);
  results.failures.forEach(f => console.log("FAIL " + f));
  await browser.close().catch(() => {});
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
