"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

const file = path.resolve(process.argv[2] || "outputs/Drift_Bastion_Playtest.html");
const baseline = process.argv[3] && path.resolve(process.argv[3]);
const output = path.resolve("outputs/experiments/2026-10-10-attack-vfx-import/qa");
const renderer = fs.readFileSync("attack-vfx.js", "utf8");
fs.mkdirSync(output, { recursive: true });

async function checkLoadFallback() {
  const root = { ATTACK_VFX_SHEETS: ["cannon", "ember", "gravity", "pulse", "flak"].map(module => ({ module })),
    Image: class { decode() { return Promise.reject(new Error("Missing test artwork")); } } };
  vm.runInNewContext(renderer, { window: root, Promise, WeakMap, Float32Array });
  const vfx = root.DriftAttackVfx.create();
  assert.equal(vfx.projectile(null, { kind: "cannon" }), false, "Pending artwork must use the old renderer");
  assert.equal(vfx.effect(null, { type: "flameCone" }), false);
  assert.equal(vfx.field(null), false);
  assert.ok((await root.DriftAttackVfx.ready).every(sheet => !sheet.loaded));
  assert.equal(vfx.projectile(null, { kind: "cannon" }), false, "Failed artwork must use the old renderer");
  assert.equal(vfx.effect(null, { type: "ring", weaponType: "missile" }), false);
  assert.equal(vfx.field(null), false);
}

function instrument(source, name) {
  const marker = "    window.__driftBastion = {";
  assert.equal(source.split(marker).length, 2);
  const bridge = "    window.__vfxTest = { Game:Game, makeTile:makeTile, save:save, game:function(){return game;}, render:render, ctx:ctx };\n";
  const target = path.join(output, name + ".html");
  fs.writeFileSync(target, source.replace(marker, bridge + marker));
  return target;
}

function installFixture() {
  const bridge = window.__vfxTest;
  const api = window.DriftPCGame;
  window.__vfxFixture = {
    select(type) {
      let seed = 74123;
      Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
      if (api.rangeState()) api.rangeModule(type); else api.startRange(type);
      const game = bridge.game();
      game.state = "paused";
      game.enemies.length = 0; game.enemyById.clear(); game.enemyGrid.clear();
      game.effects.length = 0; game.particles.length = 0; game.projectiles.length = 0;
      game.ship.tiles.forEach(tile => { tile.cooldown = 999; });
      const origin = game.gridToWorld(0, -1);
      const points = type === "pulse" ? [[0,-150],[-130,0],[130,0],[0,150]] :
        type === "ember" ? [[0,-120],[-40,-105],[55,-140]] :
        type === "scatter" ? [[0,-230],[-60,-230],[60,-230]] :
        type === "gravity" ? [[0,-230],[-55,-230],[60,-260]] : [[0,-230],[-80,-300],[80,-300]];
      points.forEach((point, index) => {
        const enemy = game.spawnEnemy(index % 2 ? "hunter" : "scout", origin.x + point[0], origin.y + point[1]);
        enemy.hp = enemy.maxHp = 10000; enemy.speed = 0; enemy.fireClock = 9999;
      });
      game.rebuildEnemyGrid();
      const tile = game.ship.tiles.get("0,-1");
      game.fireAttack(tile, origin, 0, -1, game.weaponDefinitions[type], game.enemies[0], 1);
      return { shots: game.projectiles.length, vectors: game.projectiles.map(p => Math.atan2(p.vy, p.vx)) };
    },
    step(seconds) {
      const game = bridge.game();
      for (let elapsed = 0; elapsed < seconds - .00001; elapsed += 1 / 60) {
        game.elapsed += 1 / 60; game.backgroundPulse += 1 / 60;
        game.rebuildEnemyGrid(); game.updateWeaponStatuses(1 / 60);
        game.updateEnemies(1 / 60); game.updateProjectiles(1 / 60); game.updateEffects(1 / 60);
      }
    },
    snapshot() {
      const game = bridge.game();
      return {
        enemies: game.enemies.map(e => [e.x,e.y,e.hp,e.dead,e.slowTimer,e.slowFactor,e.burnTimer,e.burnDamage]),
        projectiles: game.projectiles.map(p => [p.kind,p.x,p.y,p.vx,p.vy,p.life,p.damage]),
        fields: game.gravityFields.map(f => [f.x,f.y,f.radius,f.life,f.damage]),
        effects: game.effects.map(e => [e.type,e.x,e.y,e.life,e.radius,e.maxRadius,e.color]),
        tiles: Array.from(game.ship.tiles.values(), t => [t.type,t.hp,t.shield]),
        matter: game.matter, kills: game.kills
      };
    },
    render() {
      const ctx = bridge.ctx, draw = ctx.drawImage, sheets = window.ATTACK_VFX_SHEETS || [];
      const drawn = [];
      ctx.drawImage = function (image, ...args) {
        const sheet = sheets.find(sheet => sheet.data === image.src);
        if (sheet) drawn.push(sheet.module);
        return draw.call(this, image, ...args);
      };
      try { bridge.render(performance.now()); } finally { ctx.drawImage = draw; }
      return drawn;
    }
  };
}

(async () => {
  await checkLoadFallback();
  const html = fs.readFileSync(file, "utf8");
  for (const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(script[1]);
  assert.ok(html.includes(renderer.replace(/\r\n?/g, "\n")), "HTML must contain the current production renderer");
  assert.ok(!html.includes("AttackVfxLab"), "Review controls must not enter the game");
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  const report = { file, viewport: "1920x1080 at normal scale", sheets: [], attacks: [], checks: {} };
  async function open(target) {
    const context = await browser.newContext({ viewport: { width:1920, height:1080 }, deviceScaleFactor:1 });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem("drift-bastion-save-v2", JSON.stringify({ version:9,
      settings:{ muted:true, autoPause:false }, training:{ completed:true } })));
    await page.clock.install();
    await page.goto(pathToFileURL(target).href);
    await page.evaluate(() => Promise.all([window.DriftModuleArt.ready, window.DriftEnemyArt.ready, window.DriftAttackVfx?.ready]));
    await page.clock.pauseAt(new Date(Date.now() + 100));
    await page.evaluate(installFixture);
    return page;
  }
  try {
    const page = await open(instrument(html, "production-fixture"));
    report.sheets = await page.evaluate(() => window.DriftAttackVfx.ready);
    assert.equal(report.sheets.length, 8);
    assert.ok(report.sheets.every(sheet => sheet.loaded));
    assert.equal(await page.evaluate(() => window.ATTACK_VFX_SHEETS.reduce((sum, sheet) => sum + sheet.frames, 0)), 44);
    const profile = await page.evaluate(() => localStorage.getItem("drift-bastion-save-v2"));
    for (const [type, seconds] of [["cannon",.16],["scatter",.18],["missile",.55],["cryo",.22],["ember",.08],["gravity",.45],["pulse",.09],["flak",.08]]) {
      const firing = await page.evaluate(type => window.__vfxFixture.select(type), type);
      if (type === "scatter") { assert.equal(firing.shots, 5); assert.equal(new Set(firing.vectors).size, 5); }
      await page.evaluate(seconds => window.__vfxFixture.step(seconds), seconds);
      const before = await page.evaluate(() => window.__vfxFixture.snapshot());
      const drawn = await page.evaluate(() => window.__vfxFixture.render());
      assert.ok(drawn.includes(type), `${type} must draw its approved sheet through the real game renderer`);
      assert.deepEqual(await page.evaluate(() => window.__vfxFixture.snapshot()), before, "Rendering must not mutate combat");
      if (type === "ember") assert.ok(before.enemies.some(enemy => enemy[6] > 0));
      await page.screenshot({ path: path.join(output, `${type}-1920x1080.png`) });
      if (type === "cryo") {
        await page.evaluate(() => window.__vfxFixture.step(.3));
        assert.ok((await page.evaluate(() => window.__vfxFixture.snapshot())).enemies.some(enemy => enemy[4] > 0));
      }
      report.attacks.push({ type, firing, sprites: drawn.length });
    }
    const mechanics = await page.evaluate(() => {
      const fixture = window.__vfxFixture, bridge = window.__vfxTest;
      fixture.select("gravity");
      let game = bridge.game(), field = game.gravityFields[0], enemy = game.enemies[1];
      const distanceBefore = Math.hypot(enemy.x-field.x, enemy.y-field.y);
      fixture.step(.3);
      const distanceAfter = Math.hypot(enemy.x-field.x, enemy.y-field.y);
      fixture.select("missile"); game = bridge.game();
      const missile = game.projectiles[0], angleBefore = Math.atan2(missile.vy,missile.vx);
      game.enemyById.get(missile.targetId).x += 100; fixture.step(.3);
      const angleAfter = Math.atan2(missile.vy,missile.vx);
      fixture.select("flak"); game = bridge.game();
      const origin = game.gridToWorld(0,-1), target = game.enemies[0];
      const shots = [0,30,60,160].map(offset => game.spawnProjectile(false,"enemyShot",target.x+offset,target.y,0,90,3,4,4,"#ff7359"));
      game.fireFlakAirburst(origin,target,game.weaponDefinitions.flak,1);
      const intercepted = shots.map(p => p.life);
      game.explodeMissile({ x:0,y:-130,damage:0,clusterCount:3 });
      const missileBlasts = game.effects.filter(e => e.weaponType === "missile").length;
      game.explodeBlast({ x:0,y:-100,damage:0 },74,"#fff",0);
      const mineUsesOldRing = game.effects.at(-1).weaponType === null;
      const effect = game.spawnEffect("ring",0,0,.1,"#fff");
      effect.weaponType = "pulse"; game.effects.pop(); game.effectPool.push(effect);
      const pooledEffectCleared = game.spawnEffect("ring",0,0,.1,"#fff").weaponType === null;
      const first = new bridge.Game({training:true}), second = new bridge.Game({training:true});
      for (let i=0;i<200;i++) first.attackVfx.shoot("cannon",{x:0,y:0},0,-1);
      const bounded = first.attackVfx.muzzleFlashes.length === 64;
      const separate = second.attackVfx.muzzleFlashes.length === 0 && first.attackVfx !== second.attackVfx;
      first.updateEffects(.2);
      const expired = first.attackVfx.muzzleFlashes.length === 0;
      const shot = first.spawnProjectile(true,"missile",0,0,0,-180,0,5,3,"#fff");
      for(let i=0;i<20;i++){shot.y-=3;first.attackVfx.sampleProjectiles(first.projectiles);}
      const trailBounded = first.attackVfx.trails.get(shot).count === 10;
      shot.life=0;first.compactProjectiles();
      const recycled = first.spawnProjectile(true,"missile",0,0,0,-180,0,5,3,"#fff");
      const pooledTrailCleared = recycled === shot && !first.attackVfx.trails.has(recycled);
      return { distanceBefore,distanceAfter,angleBefore,angleAfter,intercepted,missileBlasts,mineUsesOldRing,
        pooledEffectCleared,bounded,separate,expired,trailBounded,pooledTrailCleared };
    });
    assert.ok(mechanics.distanceAfter < mechanics.distanceBefore);
    assert.ok(Math.abs(mechanics.angleAfter - mechanics.angleBefore) > .04);
    assert.deepEqual(mechanics.intercepted.slice(0,3), [0,0,0]); assert.ok(mechanics.intercepted[3] > 0);
    assert.equal(mechanics.missileBlasts,4);
    for (const key of ["mineUsesOldRing","pooledEffectCleared","bounded","separate","expired","trailBounded","pooledTrailCleared"]) assert.equal(mechanics[key],true,key);
    report.mechanics = mechanics;
    await page.evaluate(() => {
      const fixture = window.__vfxFixture, bridge = window.__vfxTest;
      for(const tier of [0,1,2]) {
        bridge.save.settings.qualityTier=tier; bridge.save.settings.reducedFlash=true;
        fixture.select("gravity"); fixture.step(.2); fixture.render();
        fixture.select("ember"); fixture.step(.08); fixture.render();
      }
      bridge.save.settings.reducedFlash=false; bridge.save.settings.qualityTier=0;
      window.DriftPCGame.leaveRange();
    });
    assert.equal(await page.evaluate(() => localStorage.getItem("drift-bastion-save-v2")), profile);
    report.checks = { pendingAndFailedArtFallback:true, allEightProductionHooks:true, renderingPreservesCombat:true,
      realStatusAndInterception:true, pooledStateCleared:true, boundedPerRunCosmetics:true, qualityAndReducedFlashes:true, rangePreservesSave:true };
    if (baseline) {
      const oldPage = await open(instrument(fs.readFileSync(baseline,"utf8"), "baseline-fixture"));
      for(const type of ["cannon","scatter","missile","cryo","ember","gravity","pulse","flak","laser","arc","rail","mine"]) {
        const current = await page.evaluate(type => { const f=window.__vfxFixture;f.select(type);f.step(.65);return f.snapshot(); },type);
        const original = await oldPage.evaluate(type => { const f=window.__vfxFixture;f.select(type);f.step(.65);return f.snapshot(); },type);
        assert.deepEqual(current, original, `${type} combat differs from the accepted balance baseline`);
      }
      report.checks.allTwelveWeaponsMatchBaseline = true;
    }
    assert.deepEqual(errors, []);
    report.passed = true; report.errors = errors;
    fs.writeFileSync(path.join(output,"report.json"),JSON.stringify(report,null,2)+"\n");
    console.log(JSON.stringify({ passed:true, attacks:report.attacks.length, checks:report.checks, errors },null,2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
