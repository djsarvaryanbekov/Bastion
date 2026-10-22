"use strict";

// Rule, duo and doctrine cards inside the real game: adjacency rewrites, duo gating, combat effects and the break flow.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const Cards = require("../cards");
const Waves = require("../waves");

const harness = fs.readFileSync(".artifact_build/runtime-check.js", "utf8");
const marker = "    window.__driftBastion = {";
const source = fs.readFileSync("game.js", "utf8").replace(marker,
  "    window.__cardsTest = { Game, save, MODULES, defaultSave, startRun, startNextWave, makeTile, keyOf, modulePrice, current: function () { return game; }, activate: function (value) { game = value; } };\n" + marker);
const bootstrap = {
  console, URLSearchParams, setTimeout() { return 0; }, clearTimeout() {},
  process: { env: { BALANCE_SECONDS: "1" } },
  require(name) {
    if (name === "fs") return { ...fs, readFileSync(file, encoding) { return file === "game.js" ? source : fs.readFileSync(file, encoding); } };
    return require(name);
  }
};
vm.runInNewContext(harness.slice(0, harness.indexOf("let installPromptCalls")) + "\nglobalThis.runtime = sandbox;", bootstrap);
const api = bootstrap.runtime.__cardsTest;
const STEP = 1 / 30;
const T = Cards.TUNING;
const near = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-6, message + ": " + a + " vs " + b);

// A fresh Waves run with only the core, no enemies, and a hand-built layout.
function freshRun() {
  api.activate(null);
  Object.assign(api.save, api.defaultSave());
  api.startRun("waves");
  const game = api.current();
  const core = game.ship.tiles.get("0,0");
  game.ship.tiles = new Map([["0,0", core]]);
  game.enemies.length = 0;
  game.projectiles.length = 0;
  game.compactEnemies();
  return game;
}
function place(game, type, x, y) {
  const tile = api.makeTile(type, x, y, false, game.coreDef.moduleHpMultiplier, false);
  game.applyFamilyTileStats(tile, true);
  game.ship.tiles.set(api.keyOf(x, y), tile);
  game.activePairs = game.adjacentPairs();
  return tile;
}
function enemyAt(game, type, dx, dy) {
  const enemy = game.spawnEnemy(type, game.ship.x + dx, game.ship.y + dy);
  enemy.vx = 0; enemy.vy = 0;
  return enemy;
}
const grant = (game, id) => game.addCardPick({ id: id });

// ---- Rule rewrites
let game = freshRun();
const cannon = place(game, "cannon", 0, -1);
const rail = place(game, "rail", 1, -1);
const ember = place(game, "ember", 1, 0);
const bulkhead = place(game, "bulkhead", -1, -1);
assert.equal(game.hasCryoNeighbor(rail), false, "A Cannon is not Cryo without the card");
grant(game, "coldSteel");
assert.equal(game.hasCryoNeighbor(rail), true, "Cold Steel: a Cannon neighbor links Shatter");

ember.emberActiveTime = 1;
assert.equal(game.hasActiveEmberNeighbor(cannon), false, "Diagonal Ember does not ignite by default");
grant(game, "wideIgnition");
assert.equal(game.hasActiveEmberNeighbor(cannon), true, "Wide Ignition reaches diagonal neighbors");

const rateBefore = game.weaponCooldownRate(cannon);
grant(game, "bulkheadRelay");
near(game.weaponCooldownRate(cannon), rateBefore * (1 + T.bulkheadRelay), "Bulkhead Relay adds a half Reactor");
assert.ok(bulkhead);

const chilled = enemyAt(game, "brute", 900, 0);
chilled.slowTimer = 2; chilled.slowFactor = .5;
const plain = enemyAt(game, "brute", -900, 0);
grant(game, "openShatter");
game.damageEnemy(chilled, 10); game.damageEnemy(plain, 10);
near(chilled.maxHp - chilled.hp, 10 * (1 + T.openShatter), "Open Shatter boosts hits on chilled enemies");
near(plain.maxHp - plain.hp, 10, "Open Shatter leaves warm enemies alone");

// ---- Duos
game = freshRun();
const emberB = place(game, "ember", 1, 0);
const cryo = place(game, "cryo", 2, 0);
grant(game, "thermalShock");
assert.equal(game.duoActive("thermalShock"), true, "Adjacent Ember + Cryo activate Thermal Shock");
const target = enemyAt(game, "brute", 900, 0);
const bystander = enemyAt(game, "brute", 930, 0);
target.burnTimer = 2; target.burnDamage = 1e-4; target.burnTickTime = 0; target.slowTimer = 2; target.slowFactor = .5;
game.updateWeaponStatuses(STEP);
game.processVolatileBlasts();
near(bystander.maxHp - bystander.hp, T.thermalShockDamage * game.cardDamageScale(), "Thermal Shock bursts on nearby enemies");
assert.ok(!(target.burnTimer > 0) && !(target.slowTimer > 0), "Thermal Shock consumes both statuses");
game.ship.tiles.delete("2,0");
game.activePairs = game.adjacentPairs();
assert.equal(game.duoActive("thermalShock"), false, "A broken pair leaves the duo dormant");
assert.ok(emberB && cryo);

game = freshRun();
place(game, "pulse", -1, 0);
place(game, "arc", -2, 0);
grant(game, "stormSurge");
for (let i = 0; i < 6; i += 1) enemyAt(game, "brute", 60 + i * 15, 40);
const arcsBefore = game.effects.filter(effect => effect.type === "arc").length;
game.firePulse(game.gridToWorld(-1, 0), game.weaponDefinitions.pulse, 1);
const arcs = game.effects.filter(effect => effect.type === "arc").length - arcsBefore;
assert.equal(arcs, T.stormSurgeTargets, "Storm Surge arcs into the capped number of pulse targets");

game = freshRun();
const laser = place(game, "laser", 0, 1);
place(game, "cryo", 1, 1);
grant(game, "coldLens");
const laserOrigin = game.gridToWorld(0, 1);
game.fireAttack(laser, laserOrigin, 1, 0, game.weaponDefinitions.laser, enemyAt(game, "brute", 2000, 2000), 1);
assert.equal(game.frostLines.length, 1, "Cold Lens leaves a frost line");
game.fireAttack(laser, laserOrigin, 1, 0, game.weaponDefinitions.laser, enemyAt(game, "brute", 2000, 2100), 1);
assert.equal(game.frostLines.length, 1, "Frost lines are throttled per laser");
const crosser = enemyAt(game, "brute", laserOrigin.x - game.ship.x + 120, laserOrigin.y - game.ship.y);
game.updateFrostLines(STEP);
assert.ok(crosser.slowTimer > 0 && Math.abs(crosser.slowFactor - T.coldLensSlowFactor) < 1e-9, "Enemies on the frost line are chilled");

game = freshRun();
place(game, "rail", 1, 0);
place(game, "gravity", 2, 0);
grant(game, "lensing");
game.gravityFields.push({ x: game.ship.x + 1000, y: game.ship.y, radius: 100, life: 2, maxLife: 2, pullStrength: 0, damage: 0, collapseDamage: 0, tickTime: 0, color: "#c8a2ff" });
const slug = game.spawnProjectile(true, "rail", game.ship.x + 920, game.ship.y, 900, 0, 80, 4, 1, "#fff");
game.updateProjectiles(STEP);
const rails = game.projectiles.filter(projectile => projectile.kind === "rail" && projectile.life > 0);
assert.equal(rails.length, T.lensingSplit, "Lensing splits a slug inside a gravity field");
rails.forEach(projectile => near(projectile.damage, 80 * T.lensingDamage, "Split slugs share the reduced damage"));
assert.ok(slug.lensed);

// ---- Doctrines
game = freshRun();
place(game, "cannon", 0, -1);
const railC = place(game, "rail", 1, -1);
place(game, "ember", 1, 0);
game.destroyTile("1,-1");
assert.equal(game.derelicts.length, 0, "No wrecks without Castaway Protocol");
place(game, "rail", 1, -1);
grant(game, "castaway");
game.destroyTile("1,-1");
assert.equal(game.derelicts.length, 1, "A lost weapon becomes a drifting wreck");
assert.ok(railC);
const wreck = game.derelicts[0];
enemyAt(game, "colossus", wreck.x - game.ship.x + 300, wreck.y - game.ship.y);
const shotsBefore = game.projectiles.filter(projectile => projectile.friendly && projectile.kind === "rail").length;
for (let i = 0; i < Math.ceil(1.2 / STEP); i += 1) game.updateDerelicts(STEP);
assert.ok(game.projectiles.filter(projectile => projectile.friendly && projectile.kind === "rail").length > shotsBefore, "The wreck keeps firing");
for (let i = 0; i < Math.ceil(T.castawayLife / STEP); i += 1) game.updateDerelicts(STEP);
assert.equal(game.derelicts.length, 0, "Wrecks expire");

game = freshRun();
const lone = place(game, "cannon", 0, -1);
grant(game, "leanHull");
const modules = game.ship.tiles.size - 1;
near(game.leanHullBonus(), Math.min(T.leanHullMax, T.leanHullPer * (T.leanHullCap - modules)), "Lean Hull scales with missing modules");
near(game.tileCardDamage(lone), 1 + game.leanHullBonus(), "Lean Hull raises weapon damage");

game = freshRun();
const hub = place(game, "cannon", 0, -1);
place(game, "armor", -1, -1);
place(game, "armor", 1, -1);
place(game, "armor", 0, -2);
const outer = place(game, "rail", 2, -1);
grant(game, "flagship");
assert.equal(game.flagshipTile, hub, "The most surrounded weapon becomes the Flagship");
near(game.tileCardDamage(hub), 1 + T.flagshipBase + T.flagshipPer * game.occupiedNeighbors(hub), "Flagship bonus counts neighbors");
near(game.tileCardDamage(outer), 1 - T.flagshipPenalty, "Other weapons pay the Flagship penalty");
game.destroyTile("0,-1");
assert.equal(game.flagshipActive(), false, "A destroyed Flagship stays lost until the next break");

game = freshRun();
const mixed = place(game, "cannon", 0, -1);
place(game, "rail", 1, -1);
place(game, "laser", -1, -1);
place(game, "cannon", 0, -2);
const armsBefore = game.weaponCooldownRate(mixed);
grant(game, "combinedArms");
assert.equal(game.combinedArmsCount(mixed), 2, "Combined Arms counts distinct other weapon families on edges");
near(game.weaponCooldownRate(mixed), armsBefore * (1 + 2 * T.combinedArmsPer), "Combined Arms speeds up mixed neighbors");

game = freshRun();
place(game, "cannon", 0, -1);
const basePrice = api.modulePrice("rail");
grant(game, "grayMarket");
const factor = game.priceFactors.rail;
assert.ok(factor >= T.marketMin && factor <= T.marketMax, "Gray Market rolls a price factor");
assert.equal(api.modulePrice("rail"), factor === 1 ? basePrice : Math.max(1, Math.round(basePrice * factor)), "Prices follow the factor");
game.wave = 3;
game.enterIntermission();
assert.equal(game.cardOffer.length, T.marketOfferSize, "Gray Market offers 4 cards");

// ---- Break flow: Doctrine offers after boss waves, free reroll, skip, cap
game = freshRun();
place(game, "cannon", 0, -1);
game.wave = 5;
game.enterIntermission();
assert.equal(game.offerIsDoctrine, true, "Boss breaks offer Doctrines");
assert.ok(game.cardOffer.length === 3 && game.cardOffer.every(pick => Cards.BY_ID[pick.id].kind === "doctrine"));
game.matter = 0;
assert.equal(game.rerollCards(), true, "The Doctrine offer has a free reroll");
assert.equal(game.rerollCards(), false, "Only one free reroll without Matter");
assert.ok(game.cardOffer.every(pick => Cards.BY_ID[pick.id].kind === "doctrine"), "Rerolls stay Doctrine-only");
assert.equal(game.skipCard(), true);
assert.equal(game.matter, Cards.skipReward(5), "Skipping pays Matter");
assert.equal(game.cardPicked, true, "Skipping counts as the break's choice");
api.startNextWave();
assert.equal(game.state, "playing");
assert.equal(game.wave, 6);

game.state = "intermission";
["castaway", "leanHull", "grayMarket"].forEach(id => grant(game, id));
game.wave = 10;
game.enterIntermission();
assert.equal(game.offerIsDoctrine, false, "The Doctrine cap ends Doctrine offers");
const rareSlot = Cards.BY_ID[game.cardOffer[0].id];
assert.ok(rareSlot.rarity !== "common", "Capped boss breaks keep the guaranteed rare");

// ---- Earned duo is guaranteed once in the real offer
game = freshRun();
place(game, "ember", 1, 0);
place(game, "cryo", 2, 0);
game.wave = 3;
game.enterIntermission();
assert.equal(game.cardOffer[0].id, "thermalShock", "The earned duo is offered");
assert.equal(JSON.stringify(game.seenDuos), JSON.stringify(["thermalShock"]));

// ---- Layout cards
game = freshRun();
const left = place(game, "cannon", -2, 0);
place(game, "armor", -1, 0);
place(game, "armor", 1, 0);
const right = place(game, "rail", 2, 0);
grant(game, "arcSpine");
game.updateLayoutCards(STEP);
assert.ok(game.arcSpinePair && game.arcSpinePair.includes(left) && game.arcSpinePair.includes(right), "Arc Spine joins the farthest weapons");
const crossing = enemyAt(game, "colossus", 0, 0);
crossing.x = (game.gridToWorld(-2, 0).x + game.gridToWorld(2, 0).x) / 2;
crossing.y = (game.gridToWorld(-2, 0).y + game.gridToWorld(2, 0).y) / 2;
for (let i = 0; i < Math.ceil(1 / STEP); i += 1) game.updateLayoutCards(STEP);
assert.ok(crossing.hp < crossing.maxHp, "Enemies on the spine take damage");

game = freshRun();
const strutArmor = place(game, "armor", 0, -1);
const strutTip = place(game, "cannon", 0, -2);
const coreHp = game.ship.tiles.get("0,0").maxHp;
grant(game, "hollowStrut");
near(game.ship.tiles.get("0,0").maxHp, coreHp * (1 - T.strutCorePenalty), "Hollow Strut costs core HP");
const armorHp = strutArmor.hp;
game.applyDamageToTile("0,-1", 999);
assert.equal(strutArmor.hp, armorHp, "Struts take no damage");
assert.equal(game.ship.tiles.get("0,-2"), strutTip, "Modules beyond a strut stay attached");
const strutPos = game.gridToWorld(0, -1);
assert.equal(game.findImpactedTile(strutPos.x, strutPos.y, 4), null, "Contacts pass through struts");

game = freshRun();
place(game, "armor", 0, -1);
const conduitCannon = place(game, "cannon", 0, -2);
grant(game, "coreConduit");
conduitCannon.cooldown = 9;
for (let i = 0; i < Math.ceil((T.conduitInterval + 2 * T.conduitStep + .05) / STEP); i += 1) game.updateLayoutCards(STEP);
assert.ok(conduitCannon.cooldown <= 0, "The conduit spark fires weapons it passes");
near(conduitCannon.conduitBoost, 1 + 2 * T.conduitPerCell, "The spark grows stronger per cell travelled");

game = freshRun();
const latticeCannon = place(game, "cannon", 0, -1);
place(game, "armor", 0, 1);
const farEmber = place(game, "ember", 0, 2);
place(game, "reactor", 1, 1);
grant(game, "phaseLattice");
farEmber.emberActiveTime = 5;
assert.equal(game.hasActiveEmberNeighbor(latticeCannon), false, "Far Ember does not ignite outside the window");
const latticeRate = game.weaponCooldownRate(latticeCannon);
for (let i = 0; i < Math.ceil((T.latticeInterval - T.latticeWindow + .1) / STEP); i += 1) { farEmber.emberActiveTime = 5; game.updateLayoutCards(STEP); }
assert.equal(game.latticeActive, true, "The lattice window opens on its timer");
assert.equal(game.hasActiveEmberNeighbor(latticeCannon), true, "During the window every Ember counts as adjacent");
assert.ok(game.weaponCooldownRate(latticeCannon) > latticeRate, "During the window a far Reactor boosts the Cannon");
for (let i = 0; i < Math.ceil((T.latticeWindow + .1) / STEP); i += 1) game.updateLayoutCards(STEP);
assert.equal(game.latticeActive, false, "The window closes again");

game = freshRun();
const nearGun = place(game, "cannon", 0, -1);
place(game, "armor", 0, -2);
const tipGun = place(game, "cannon", 0, -3);
grant(game, "outrider");
game.updateLayoutCards(STEP);
assert.equal(tipGun.outrider, true, "The farthest weapon is the Outrider");
assert.equal(nearGun.outrider, false);
enemyAt(game, "colossus", 0, -300);
tipGun.cooldown = 0;
const shotsBeforeEcho = game.projectiles.length;
game.updateWeapon(tipGun, STEP, 1);
const shotsAfterFire = game.projectiles.length;
assert.ok(tipGun.echoShot, "Firing schedules the echo");
for (let i = 0; i < Math.ceil((T.outriderDelay + .05) / STEP); i += 1) game.updateWeapon(tipGun, STEP, 1);
assert.ok(shotsAfterFire > shotsBeforeEcho && game.projectiles.length > shotsAfterFire, "The echo fires a second attack");

game = freshRun();
const hugA = place(game, "cannon", 0, -1);
const hugB = place(game, "cannon", 1, 0);
grant(game, "outrider");
game.updateLayoutCards(STEP);
assert.ok(!hugA.outrider && !hugB.outrider, "Weapons next to the core are never Outriders");

game = freshRun();
place(game, "armor", 0, -1);
place(game, "reactor", 0, -2);
const branchGun = place(game, "cannon", 1, -2);
grant(game, "coreConduit");
branchGun.cooldown = 9;
for (let i = 0; i < Math.ceil((T.conduitInterval + 3 * T.conduitStep + .05) / STEP); i += 1) game.updateLayoutCards(STEP);
assert.ok(branchGun.cooldown <= 0, "A Reactor branches the spark sideways into its row");

game = freshRun();
place(game, "flak", 0, -1);
grant(game, "returnToSender");
const shooter = enemyAt(game, "gunner", 400, 0);
const hostile = game.spawnProjectile(false, "enemy", game.ship.x + 200, game.ship.y, -100, 0, 9, 4, 3, "#f00");
game.fireFlakAirburst(game.gridToWorld(0, -1), { x: hostile.x, y: hostile.y }, game.weaponDefinitions.flak, 1);
const shrapnel = game.projectiles.filter(projectile => projectile.friendly && projectile.kind === "scatter" && projectile.life > 0);
assert.equal(hostile.life, 0, "Flak still destroys the shot");
assert.equal(shrapnel.length, 1, "The destroyed shot flies back as shrapnel");
near(shrapnel[0].damage, 9 * T.returnMultiplier, "Shrapnel carries the multiplied damage");
assert.ok(shrapnel[0].vx > 0 && shooter);

// ---- Fresh save: offers never name modules the player has not licensed
game = freshRun();
place(game, "cannon", 0, -1);
place(game, "armor", 0, 1);
const licensed = ["cannon", "armor"];
const shipTypes = ["core", "cannon", "armor"];
const mentions = def => [].concat(def.requires || [], def.installed || [], def.installedAny || [], def.pair || []);
for (let i = 0; i < 300; i += 1) {
  game.wave = 1 + (i % 19);
  game.offerIsDoctrine = false;
  game.rollCardOffer(i % 5 === 0).forEach(pick => {
    const def = Cards.BY_ID[pick.id];
    if (pick.family) assert.ok(licensed.includes(pick.family), "Family card for an unlicensed module: " + pick.family);
    if (def.installed) assert.ok(def.installed.every(type => shipTypes.includes(type)), pick.id + " needs modules on the ship");
    if (def.pair) assert.fail("Duo offered on a fresh save: " + pick.id);
    mentions(def).filter(type => !def.installedAny || !def.installedAny.includes(type)).forEach(type => assert.ok(licensed.includes(type), pick.id + " mentions unlicensed " + type));
  });
}

// ---- Endless never sees card effects
api.activate(null);
Object.assign(api.save, api.defaultSave());
const endless = new api.Game();
assert.equal(endless.mode, "endless");
assert.equal(endless.hasCard("castaway"), false);
assert.equal(Object.keys(endless.priceFactors).length, 0);
assert.equal(Waves.WAVE_COUNT, 20);

console.log(JSON.stringify({ passed: true, checks: "rules, duos, doctrines, break flow, endless" }));
