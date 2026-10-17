"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const sourcePath = process.argv[2] || "game.js";
let source = fs.readFileSync(sourcePath, "utf8");
const inlineModules = new Map();
if (/\.html?$/i.test(sourcePath)) {
  const scripts = [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].map(match => match[1]);
  const runtimes = scripts.filter(script => script.includes("Game.prototype.updateProjectiles ="));
  assert.equal(runtimes.length, 1, "Expected one game runtime in standalone HTML");
  source = runtimes[0];
  for (const [file, marker] of [["cold-vfx.js", /root\.DriftColdVfx\s*=/],
    ["run-upgrades.js", /root\.DriftRunUpgrades\s*=/]]) {
    const matches = scripts.filter(script => marker.test(script));
    if (matches.length === 1) inlineModules.set(file, matches[0]);
  }
}
const exposure = "    window.__driftBastion = {";
assert.equal(source.split(exposure).length, 2, "Expected one fixture injection point");
source = source.replace(exposure, `
    window.friendlySweepTest = {Game,makeTile,save,defaultSave,MODULES,upgrades:runUpgrades,
      activate:function(instance){game=instance;}};
` + exposure);
const harness = fs.readFileSync(".artifact_build/runtime-check.js", "utf8").split("let installPromptCalls")[0];
const bootstrap = {
  console, URLSearchParams, setTimeout() { return 0; }, clearTimeout() {},
  process: {env: {BALANCE_SECONDS: "1"}},
  require(name) {
    if (name === "fs") return {...fs, readFileSync(file, encoding) {
      if (file === "game.js") return source;
      if (inlineModules.has(file)) return inlineModules.get(file);
      return fs.readFileSync(file, encoding);
    }};
    return require(name);
  }
};
vm.runInNewContext(harness + "\nglobalThis.runtime=sandbox;", bootstrap);
const api = bootstrap.runtime.friendlySweepTest;
const checks = [], failures = [];
function check(label, run) {
  try { run(); checks.push(label); }
  catch (error) { failures.push({label, error: error.message}); }
}
function near(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) < 1e-7, `${label}: ${actual} != ${expected}`);
}
function add(g, type, x, y) {
  const tile = api.makeTile(type, x, y, type === "core", 1, true);
  tile.cooldown = 999;
  g.ship.tiles.set(`${x},${y}`, tile);
  g.applyFamilyTileStats(tile, true);
  return tile;
}
function fresh() {
  Object.assign(api.save, api.defaultSave());
  api.save.settings.muted = true;
  api.save.settings.damageNumbers = false;
  const g = new api.Game();
  g.operation = null; g.elapsed = 1;
  g.enemies = []; g.enemyById.clear(); g.enemyGrid.clear();
  g.projectiles = []; g.projectilePool = []; g.effects = []; g.particles = [];
  g.ship.tiles.clear();
  add(g, "core", 0, 0);
  const impacts = [], damageEnemy = g.damageEnemy;
  g.damageEnemy = function(enemy, damage, x, y) {
    impacts.push({id:enemy.id, damage, x, y});
    return damageEnemy.call(this, enemy, damage, x, y);
  };
  api.activate(g);
  return {g, impacts};
}
function enemy(s, x=0, y=0, halfLength=10, halfWidth=7, rotation=0) {
  const e = s.g.spawnEnemy("drone", x, y);
  e.hp = e.maxHp = 10000; e.shield = 0;
  e.speed = e.vx = e.vy = 0; e.fireClock = 999;
  e.radius = Math.min(halfLength, halfWidth);
  e.halfLength = halfLength; e.halfWidth = halfWidth;
  e.collisionRadius = Math.hypot(halfLength, halfWidth);
  e.rotation = e.visualRotation = rotation;
  s.g.rebuildEnemyGrid();
  return e;
}
function shot(s, kind="rail", x=-45, y=0, vx=900, vy=0, radius=4, life=1) {
  return s.g.spawnProjectile(true, kind, x, y, vx, vy, kind === "cryo" ? 9 : 85,
    radius, life, "#8ac7ff", 0, kind === "cryo" ? .5 : 1, kind === "cryo" ? 2 : 0);
}
function step(s, dt=1/30) { s.g.elapsed += dt; s.g.updateProjectiles(dt); }
function localPoint(e, x, y) {
  const c = Math.cos(e.rotation), n = Math.sin(e.rotation);
  return {x:e.x + x*c - y*n, y:e.y + x*n + y*c};
}
function localShot(s, e, start, end, radius=4) {
  const a = localPoint(e, ...start), b = localPoint(e, ...end);
  return shot(s, "rail", a.x, a.y, (b.x-a.x)*30, (b.y-a.y)*30, radius);
}
function upgrade(s, type, ids) {
  const data = {}, licenses = api.upgrades.trees[type].branches.map(branch => type + ":" + branch.id);
  for (const id of ids) assert.ok(api.upgrades.purchase(data, type, id, 1e8, 1, undefined, licenses));
  s.g.upgrades[type] = data[type];
  return s.g.weaponDefinitions[type] = api.upgrades.resolve(api.MODULES[type], data[type]);
}

check("Normal 30fps Rail crosses a small hull exactly once between frame endpoints", () => {
  const s = fresh(), e = enemy(s), p = shot(s);
  p.launchX = -200; p.launchY = 0;
  step(s); near(p.x, -15, "First endpoint"); near(e.hp, 10000, "First frame remains outside");
  step(s); near(p.x, 15, "Second endpoint"); near(e.hp, 9915, "Crossed hull takes base damage");
  near(s.impacts[0].x, -14, "Impact is on the expanded front face");
  step(s); near(e.hp, 9915, "Following frame cannot repeat the hit");
  assert.equal(s.impacts.length, 1);
});

check("Cryo crosses a narrow hull at normal frame rate and stops at its first contact", () => {
  const s = fresh(), e = enemy(s, 0, 0, 1, 7);
  const p = shot(s, "cryo", -8, 0, 500, 0, 1);
  step(s);
  near(e.hp, 9991, "Cryo direct damage"); near(e.slowFactor, .5, "Cryo chill");
  near(e.slowTimer, 2, "Cryo duration"); near(p.x, -2, "Bolt stops at impact");
  assert.equal(s.g.projectiles.length, 0);
});

check("Circular enemies use true circle entry, tangency and near misses", () => {
  for (const [y, expected] of [[0,true],[12,true],[12.001,false]]) {
    const s = fresh(), e = enemy(s, 0, 0, 10, 10);
    shot(s, "rail", -30, y, 1800, 0, 2); step(s);
    assert.equal(s.impacts.length, expected ? 1 : 0, `Circle path y=${y}`);
    near(e.hp, expected ? 9915 : 10000, "Circle damage");
    if (expected) near(s.impacts[0].x, y === 0 ? -12 : 0, "Exact circle entry");
  }
});

check("Rotated thin hulls sweep in hull space and use the actual collision rotation", () => {
  for (const rotation of [Math.PI/4, Math.PI/2, -Math.PI/3]) {
    const s = fresh(), e = enemy(s, 7, -13, 20, 2, rotation);
    e.visualRotation = rotation + Math.PI/2;
    localShot(s, e, [-30,0], [30,0]); step(s);
    assert.equal(s.impacts.length, 1);
    const expected = localPoint(e, -24, 0);
    near(s.impacts[0].x, expected.x, "Rotated front contact x");
    near(s.impacts[0].y, expected.y, "Rotated front contact y");
    const miss = fresh(), distant = enemy(miss, 7, -13, 20, 2, rotation);
    localShot(miss, distant, [-30,6.001], [30,6.001]); step(miss);
    assert.equal(miss.impacts.length, 0, "Parallel path outside narrow side misses");
  }
});

check("Rectangle corner contact is exact and expanded-box corner grazes do not count", () => {
  const s = fresh(), e = enemy(s, 0, 0, 20, 2, .63);
  localShot(s, e, [-30,5.5], [30,5.5]); step(s);
  const expected = localPoint(e, -20-Math.sqrt(16-3.5*3.5), 5.5);
  assert.equal(s.impacts.length, 1);
  near(s.impacts[0].x, expected.x, "Exact curved projectile contact x");
  near(s.impacts[0].y, expected.y, "Exact curved projectile contact y");
  for (const [start,end] of [[[-16,11],[-14,9.9]],[[-13.9,10.9],[-13.9,10.9]]]) {
    const miss = fresh(), corner = enemy(miss);
    localShot(miss, corner, start, end); step(miss);
    assert.equal(miss.impacts.length, 0, "Missing the true circle-expanded corner must not damage");
  }
});

check("Zero-length sweeps hit overlaps, miss empty space and honor Rail hit IDs", () => {
  const s = fresh(), e = enemy(s), p = shot(s, "rail", 0, 0, 0, 0);
  step(s); step(s); near(e.hp, 9915, "Stationary overlap only hits once");
  assert.equal(p.hitIds.size, 1); assert.equal(s.impacts.length, 1);
  const miss = fresh(); enemy(miss); shot(miss, "rail", 40, 0, 0, 0); step(miss);
  assert.equal(miss.impacts.length, 0);
});

check("Cryo selects the first physical enemy regardless of insertion order", () => {
  const s = fresh(), far = enemy(s, 30), nearEnemy = enemy(s, -20);
  const p = shot(s, "cryo", -60, 0, 3600); step(s);
  assert.deepEqual(s.impacts.map(hit=>hit.id), [nearEnemy.id]);
  near(nearEnemy.hp, 9991, "First enemy receives Cryo"); near(far.hp, 10000, "Rear enemy remains intact");
  near(p.x, -34, "Cryo ends at first face");
  near(nearEnemy.slowTimer, 2, "First enemy chilled"); near(far.slowTimer, 0, "Rear enemy not chilled");
});

check("Rail pierces in travel order with an independent noncompounding Shatter bonus", () => {
  const s = fresh(), far = enemy(s, 60), middle = enemy(s, 0), first = enemy(s, -60);
  middle.slowTimer = 2; middle.slowFactor = .5; far.freezeUntil = s.g.elapsed + .6;
  const p = shot(s, "rail", -120, 0, 7200); p.shatter = true; step(s);
  assert.deepEqual(s.impacts.map(hit=>hit.id), [first.id,middle.id,far.id]);
  near(first.hp, 9915, "Clean target base damage");
  near(middle.hp, 10000-106.25, "Chilled target one bonus");
  near(far.hp, 10000-106.25, "Frozen target one bonus");
  near(p.damage, 85, "Damage never compounds across victims");
  assert.equal(p.hitIds.size, 3); assert.equal(s.g.effects.filter(e=>e.type==="cryoShatter").length, 2);
  p.vx = -7200; step(s);
  assert.equal(s.impacts.length, 3, "Returning through the same hulls does not repeat damage");
});

check("The first sweep includes a long origin-to-muzzle segment across spatial cells", () => {
  for (const kind of ["rail","cryo"]) {
    const s = fresh(), e = enemy(s), p = shot(s, kind, 600, 0, 900);
    p.launchX = -600; p.launchY = 0; step(s);
    near(e.hp, 10000-(kind==="cryo"?9:85), "Launch overhang cannot skip the hull");
    near(s.impacts[0].x, -14, "Initial segment contact");
    assert.equal(p.launchX, null); assert.equal(p.launchY, null);
  }
});

check("Broadphase includes a large hull whose center is many cells away from the path", () => {
  for (const kind of ["rail","cryo"]) {
    const s = fresh(), e = enemy(s, 0, 500, 900, 4, Math.PI/2);
    shot(s, kind, -40, 0, 2400); step(s);
    near(e.hp, 10000-(kind==="cryo"?9:85), "An intersecting oversized hull is a candidate");
    near(s.impacts[0].x, -8, "Oversized side contact");
  }
});

check("Broadphase includes projectile radius at spatial-cell boundary crossings", () => {
  const s = fresh(), e = enemy(s, 220);
  shot(s, "rail", 11.5, 0, 195*30); step(s);
  near(e.hp, 9915, "Projectile radius reaches the enemy in bucket two");
  near(s.impacts[0].x, 206, "Contact occurs before the endpoint");
});

check("Reusing ordered hit records across different paths cannot drop or duplicate enemies", () => {
  const s = fresh(), third = enemy(s, 60), second = enemy(s, 0), first = enemy(s, -60);
  const forward = shot(s, "rail", -120, 0, 7200);
  const overlap = shot(s, "rail", 0, 0, 0, 0);
  const backward = shot(s, "rail", 120, 0, -7200);
  step(s);
  assert.deepEqual(s.impacts.map(hit=>hit.id), [first.id,second.id,third.id,
    second.id,third.id,second.id,first.id]);
  near(first.hp, 10000-170, "First enemy hit by both traversing rounds");
  near(second.hp, 10000-255, "Middle enemy hit by all three independent rounds");
  near(third.hp, 10000-170, "Last enemy hit by both traversing rounds");
  assert.equal(forward.hitIds.size, 3); assert.equal(overlap.hitIds.size, 1); assert.equal(backward.hitIds.size, 3);
  step(s); assert.equal(s.impacts.length, 7, "Persistent hit IDs survive buffer reuse");
});

check("Dead, off-path and separated hulls do not intercept the projectile", () => {
  const s = fresh(), upper = enemy(s, 0, 30), lower = enemy(s, 0, -30), dead = enemy(s);
  dead.dead = true; s.g.rebuildEnemyGrid();
  shot(s, "rail", -60, 0, 3600); step(s);
  assert.equal(s.impacts.length, 0);
  near(upper.hp, 10000, "Upper hull does not fill the gap");
  near(lower.hp, 10000, "Lower hull does not fill the gap");
});

check("Expired crossing shots cannot hit and pooled shots reset swept launch and hit state", () => {
  const s = fresh(), e = enemy(s), p = shot(s, "rail", -45, 0, 2700, 0, 4, .01);
  p.launchX = -200; p.launchY = 0; p.hitIds.add(e.id); p.shatter = true;
  step(s); near(e.hp, 10000, "Expired shot cannot damage");
  assert.equal(s.g.projectiles.length, 0); assert.equal(s.g.projectilePool.at(-1), p);
  const reused = shot(s, "cryo", -45, 0, 2700);
  assert.equal(reused, p); assert.equal(reused.launchX, null); assert.equal(reused.launchY, null);
  assert.equal(reused.hitIds.size, 0); assert.equal(reused.shatter, false);
  step(s); near(e.hp, 9991, "Reused Cryo can hit normally without stale exclusion");
});

check("Four swept Cryo impacts preserve upgraded Freeze timing and immunity", () => {
  const s = fresh(), e = enemy(s, 0, 0, 1, 7);
  const def = upgrade(s, "cryo", ["base1","base2","deep","deep","freeze"]);
  const freezeShot = () => {
    const p = shot(s, "cryo", -8, 0, 500, 0, 1);
    p.damage = def.damage; p.slowFactor = def.slowFactor;
    p.slowDuration = def.slowDuration; p.freezeHits = def.freezeHits;
    return p;
  };
  for (let i=0; i<4; i+=1) {
    freezeShot(); step(s);
  }
  near(e.hp, 10000-36, "All four direct hits land");
  near(e.slowFactor, .25, "Upgraded Cryo slow"); near(e.slowTimer, 4, "Upgraded Cryo duration");
  near(e.freezeUntil, s.g.elapsed+.6, "Hard Freeze duration");
  near(e.freezeImmuneUntil, s.g.elapsed+3.6, "Freeze immunity duration");
  assert.equal(e.freezeHitTimes.length, 0);
  const frozenUntil = e.freezeUntil, immuneUntil = e.freezeImmuneUntil;
  freezeShot(); step(s);
  near(e.freezeUntil, frozenUntil, "Immune targets do not immediately refreeze");
  near(e.freezeImmuneUntil, immuneUntil, "Immunity does not extend");
});

check("Real upgraded Magazine keeps every burst round and its Shatter damage", () => {
  const s = fresh(), rail = add(s.g, "rail", 0, -1); add(s.g, "cryo", -1, -1);
  const origin = s.g.gridToWorld(rail.x, rail.y), e = enemy(s, origin.x+110, origin.y);
  e.slowTimer = 2; e.slowFactor = .5;
  const def = upgrade(s, "rail", ["base1","base2","magazine","magazine"]);
  const spawned = [], spawn = s.g.spawnProjectile;
  s.g.spawnProjectile = function(...args) {
    const p = spawn.apply(this, args); if (p && p.kind === "rail") spawned.push(p);
    return p;
  };
  rail.cooldown = 0; s.g.updateWeapons(0);
  for (let frame=0; frame<30; frame+=1) { s.g.updateWeapons(1/30); step(s); }
  assert.equal(spawned.length, def.burstCount);
  assert.ok(spawned.every(p=>p.damage===def.damage && p.shatter));
  near(e.hp, 10000-def.damage*def.burstCount*1.25, "Every Magazine round gets exactly one bonus");
  assert.equal(s.impacts.length, def.burstCount);
});

console.log(JSON.stringify({passed:failures.length===0,source:sourcePath,checks,failures}));
assert.equal(failures.length, 0, `${failures.length} friendly projectile regression groups failed`);
