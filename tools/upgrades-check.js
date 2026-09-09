"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const upgrades = require("../run-upgrades.js");

const projectRoot = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(projectRoot, file), "utf8");
const plain = value => JSON.parse(JSON.stringify(value));
const harness = read(".artifact_build/runtime-check.js");
const marker = "let installPromptCalls";
assert.ok(harness.includes(marker), "The existing runtime harness must expose its initialization boundary.");
const source = read("game.js");
const exposureMarker = "    window.__driftBastion = {";
assert.ok(source.includes(exposureMarker));
const expose = "    window.__upgradeTest = { Game: Game, makeTile: makeTile, modules: MODULES, weapons: WEAPON_TYPES, save: save, sanitizeSave: sanitizeSave, buy: buyRunUpgrade, activate: function(instance) { game = instance; } };\n";
const instrumented = read("progression.js") + "\n" + read("run-upgrades.js") + "\n" + source.replace(exposureMarker, expose + exposureMarker);
const bootstrap = {
  console, setTimeout, clearTimeout, URLSearchParams,
  process: { env: { BALANCE_SECONDS: "1" } },
  require(name) {
    if (name === "fs") return { ...fs, readFileSync(file, encoding) {
      if (file === "game.js") return instrumented;
      return fs.readFileSync(path.isAbsolute(file) ? file : path.join(projectRoot, file), encoding);
    } };
    return require(name);
  }
};
vm.runInNewContext(harness.slice(0, harness.indexOf(marker)) + "\nglobalThis.runtime = sandbox;", bootstrap, { filename: "upgrades-check-runtime.js" });
const runtime = bootstrap.runtime;
const { Game, makeTile, modules, weapons, save, sanitizeSave, buy, activate } = runtime.__upgradeTest;
const originalDefinitions = plain(modules);
Object.keys(save.meta).forEach(key => { save.meta[key] = 0; });

assert.equal(weapons.length, 12);
for (const type of weapons) {
  const state = {};
  const initial = upgrades.options(type);
  assert.equal(initial.length, 1);
  const calibration = initial[0];
  assert.equal(calibration.name, "Fire rate");
  const beforeRejected = plain(state);
  assert.equal(upgrades.purchase(state, type, calibration.id, calibration.cost - .01), null, `${type}: insufficient Matter must reject purchase`);
  assert.deepEqual(state, beforeRejected);
  for (const invalidMatter of [NaN, Infinity, -1, "100"]) {
    assert.equal(upgrades.purchase(state, type, calibration.id, invalidMatter), null);
  }
  assert.equal(upgrades.purchase(state, type, "unknown", 1000), null);
  const purchase = upgrades.purchase(state, type, calibration.id, calibration.cost);
  assert.equal(purchase.matter, 0, `${type}: exact affordability must work`);
  assert.equal(state[type].level, 1);
  assert.equal(upgrades.purchase(state, type, calibration.id, 1000), null, `${type}: calibration must not be bought twice`);
  const calibrated = upgrades.resolve(modules[type], state[type]);
  assert.equal(calibrated.damage, modules[type].damage);
  assert.equal(calibrated.cooldown, modules[type].cooldown * .8);
  assert.equal(upgrades.label(type, state[type]), "Lv2/10 · Tuned");

  const specializations = upgrades.options(type, state[type]);
  assert.equal(specializations.length, 2);
  assert.notEqual(specializations[0].id, specializations[1].id);
  for (const branch of specializations) {
    const separateState = { [type]: { level: 1, branch: null } };
    assert.equal(upgrades.purchase(separateState, type, branch.id, branch.cost - 1), null);
    const branchResult = upgrades.purchase(separateState, type, branch.id, branch.cost + 7);
    assert.equal(branchResult.matter, 7);
    assert.equal(separateState[type].level, 2);
    assert.equal(separateState[type].branch, branch.id);
    assert.equal(upgrades.options(type, separateState[type])[0].id, "calibrate");
    for (const other of specializations) {
      assert.equal(upgrades.purchase(separateState, type, other.id, 1000), null, `${type}: specializations must remain exclusive`);
    }
    const resolved = upgrades.resolve(modules[type], separateState[type]);
    assert.notDeepEqual(plain(resolved), plain(calibrated), `${type}/${branch.id}: specialization must change combat properties`);
    assert.equal(upgrades.label(type, separateState[type]), `Lv3/10 · ${branch.name}`);
    for (const [property, value] of Object.entries(resolved)) {
      if (typeof value === "number") assert.ok(Number.isFinite(value) && value >= 0, `${type}/${branch.id}: ${property} must be finite and nonnegative`);
    }
  }
}
assert.deepEqual(upgrades.options("armor"), []);
assert.equal(upgrades.purchase({}, "toString", "tune", 1000), null);
assert.deepEqual(plain(modules), originalDefinitions, "Resolving all upgrade paths must preserve the shared module definitions");

for (const copies of [undefined, 1, 4, 420, 421, 1000000]) {
  const count = Math.min(copies === undefined ? 1 : copies, 420);
  const state = {};
  const tuneCost = Math.ceil((16 + 6 * (count - 1)) * 1.25);
  const branchCost = Math.ceil((38 + 10 * (count - 1)) * 1.25);
  assert.equal(upgrades.options("cannon", null, copies)[0].cost, tuneCost);
  assert.equal(upgrades.purchase(state, "cannon", "tune", tuneCost - 1, copies), null);
  assert.deepEqual(state, {}, "A rejected scaled purchase must not advance the track");
  assert.equal(upgrades.purchase(state, "cannon", "tune", tuneCost, copies).matter, 0);
  assert.equal(upgrades.purchase(state, "cannon", "tune", 10000, copies), null);
  const choices = upgrades.options("cannon", state.cannon, copies);
  assert.ok(choices.every(choice => choice.cost === branchCost));
  assert.equal(upgrades.purchase(state, "cannon", choices[0].id, branchCost - 1, copies), null);
  assert.equal(state.cannon.level, 1);
  assert.equal(upgrades.purchase(state, "cannon", choices[0].id, branchCost, copies).matter, 0);
  assert.equal(upgrades.purchase(state, "cannon", choices[1].id, 10000, copies), null);
}
for (const copies of [0, -1, .5, 1.5, NaN, Infinity, -Infinity, "4", null, {}, [], true]) {
  for (const level of [0, 1]) {
    const state = level ? { cannon: { level: 1, branch: null } } : {};
    const before = plain(state);
    assert.deepEqual(upgrades.options("cannon", state.cannon, copies), []);
    assert.equal(upgrades.purchase(state, "cannon", level ? "twin" : "tune", 100000, copies), null);
    assert.deepEqual(state, before, "Invalid counts must never buy a cheap fallback upgrade");
  }
}

function combatProbe(type, branch, rank = 2) {
  const probe = new Game();
  probe.enemies.length = 0;
  probe.enemyById.clear();
  probe.ship.tiles.clear();
  probe.ship.tiles.set("0,0", makeTile("core", 0, 0, true));
  const tile = makeTile(type, 0, -1, false);
  tile.cooldown = 0;
  probe.ship.tiles.set("0,-1", tile);
  probe.upgrades[type] = branch ? { level: rank, branch } : { level: 1, branch: null };
  const def = upgrades.resolve(modules[type], probe.upgrades[type]);
  probe.weaponDefinitions[type] = def;
  const target = probe.spawnEnemy("scout", 0, -130);
  target.hp = target.maxHp = 100000;
  probe.rebuildEnemyGrid();
  probe.updateWeapons(0);
  const emitted = probe.projectiles.map(projectile => ({
    kind: projectile.kind, damage: projectile.damage, blastRadius: projectile.blastRadius,
    slowFactor: projectile.slowFactor, slowDuration: projectile.slowDuration, life: projectile.life
  }));
  const fields = probe.gravityFields.map(field => ({ radius: field.radius, damage: field.damage, life: field.life, pullStrength: field.pullStrength }));
  const burn = { damage: target.burnDamage, duration: target.burnTimer };
  assert.equal(tile.cooldown, def.cooldown, `${type}/${branch || "tune"}: the actual firing path must use upgraded cooldown`);
  for (let frame = 0; frame < 90; frame += 1) {
    probe.updateWeaponStatuses(1 / 30);
    probe.rebuildEnemyGrid();
    probe.updateProjectiles(1 / 30);
  }
  assert.ok(target.hp < 100000, `${type}/${branch || "tune"}: actual weapon/projectile code must damage a target`);
  assert.ok(Number.isFinite(target.hp));
  return { probe, target, emitted, def, fields, burn };
}

let firingConfigurations = 0;
for (const type of weapons) {
  combatProbe(type);
  firingConfigurations += 1;
  for (const branch of upgrades.options(type, { level: 1 })) {
    const result = combatProbe(type, branch.id);
    firingConfigurations += 1;
    if (["cannon", "missile", "cryo"].includes(type)) {
      assert.equal(result.emitted.length, result.def.shots || 1, `${type}/${branch.id}: volley count must reach combat`);
    }
    if (type === "scatter") assert.equal(result.emitted.length, result.def.pellets);
    if (type === "cannon" && branch.id === "pierce") assert.equal(result.emitted[0].kind, "rail");
    if (type === "missile" && branch.id === "heavy") assert.equal(result.emitted[0].blastRadius, 115);
    if (type === "cryo" && branch.id === "deep") {
      assert.equal(result.target.slowFactor, .25);
      assert.equal(result.target.slowTimer, 4);
    }
    if (type === "mine" && branch.id === "wide") assert.equal(result.emitted[0].blastRadius, modules.mine.blastRadius * 1.5);
    const maxed = combatProbe(type, branch.id, upgrades.MAX_RANK);
    firingConfigurations += 1;
    assert.ok(maxed.def.cooldown <= result.def.cooldown, `${type}: milestones must preserve or improve firing cadence`);
    assert.ok(Math.abs(maxed.def.damage - result.def.damage * 1.48) < 1e-8, `${type}: four power ranks must reach the actual weapon definition`);
    if (result.emitted.length) {
      const expectedCount = type === "scatter" ? maxed.def.pellets : (["cannon", "missile", "cryo"].includes(type) ? maxed.def.shots || 1 : 1);
      assert.equal(maxed.emitted.length, expectedCount, `${type}: milestones must reach the emitted volley`);
      assert.ok(maxed.emitted.length <= 13, "A single emitter must keep its projectile count bounded");
      assert.ok(Math.abs(maxed.emitted[0].damage - result.emitted[0].damage * 1.48) < 1e-8,
        `${type}: the actual projectile must receive Lv10 damage`);
    }
    if (type === "cryo") assert.equal(maxed.emitted[0].slowDuration, maxed.def.slowDuration);
    if (type === "missile" && branch.id === "heavy") assert.equal(maxed.emitted[0].blastRadius, 190);
    if (type === "gravity") {
      assert.equal(result.fields.length, 1);
      assert.equal(maxed.fields.length, 1);
      assert.ok(Math.abs(maxed.fields[0].damage - result.fields[0].damage * 1.48) < 1e-8,
        "Lv10 must reach actual gravity field DPS");
      assert.ok(Math.abs(maxed.fields[0].radius - result.fields[0].radius * 1.5625) < 1e-8,
        "Lv10 must reach actual gravity field radius");
      assert.equal(maxed.fields[0].life, result.fields[0].life * 1.5);
      assert.equal(maxed.fields[0].pullStrength, result.fields[0].pullStrength * 1.25);
    }
    if (type === "ember") {
      assert.ok(Math.abs(maxed.burn.damage - result.burn.damage * 1.48) < 1e-8, "Lv10 must reach actual burn DPS");
      assert.equal(maxed.burn.duration, result.burn.duration * 1.4);
    }
    assert.ok(100000 - maxed.target.hp >= 100000 - result.target.hp,
      `${type}/${branch.id}: a developed weapon must remain effective against its center target`);
  }
}

function coverageProbe(type, branch, level, offsets) {
  const probe = new Game();
  probe.ship.tiles.clear();
  probe.enemies.length = 0;
  probe.enemyById.clear();
  const tile = makeTile(type, 0, -1, false);
  tile.cooldown = 0;
  probe.ship.tiles.set("0,-1", tile);
  probe.weaponDefinitions[type] = upgrades.resolve(modules[type], { level, branch });
  const origin = probe.gridToWorld(tile.x, tile.y);
  const targets = offsets.map(([x, y]) => {
    const enemy = probe.spawnEnemy("scout", origin.x + x, origin.y + y);
    enemy.hp = enemy.maxHp = 100000;
    return enemy;
  });
  probe.rebuildEnemyGrid();
  probe.updateWeapons(0);
  probe.updateWeaponStatuses(.25);
  return targets.map(target => target.hp < target.maxHp);
}
for (const [type, branch, offsets] of [
  ["laser", "wide", [[0, -100], [48, -100]]],
  ["pulse", "wide", [[0, -100], [400, 0]]],
  ["flak", "screen", [[0, -100], [230, -100]]],
  ["ember", "searing", [[0, -100], [120, -145]]],
  ["gravity", "well", [[0, -100], [185, -100]]]
]) {
  assert.deepEqual(coverageProbe(type, branch, 2, offsets), [true, false], `${type}: the side target must start outside the specialized footprint`);
  assert.deepEqual(coverageProbe(type, branch, 9, offsets), [true, true], `${type}: Lv10 must actually clear a wider footprint`);
}
const arcLine = Array.from({ length: 12 }, (_, index) => [index * 60, -100]);
assert.equal(coverageProbe("arc", "chain", 2, arcLine).filter(Boolean).length, 8);
assert.equal(coverageProbe("arc", "chain", 9, arcLine).filter(Boolean).length, 12,
  "The developed arc must damage twelve separate enemies through the live chain code");

for (const branch of ["twin", "pierce"]) {
  const probe = new Game();
  probe.ship.tiles.clear();
  probe.enemies.length = 0;
  probe.enemyById.clear();
  const tile = makeTile("cannon", 0, -1, false);
  tile.cooldown = 0;
  probe.ship.tiles.set("0,-1", tile);
  const definition = upgrades.resolve(modules.cannon, { level: 9, branch });
  probe.weaponDefinitions.cannon = definition;
  const origin = probe.gridToWorld(0, -1);
  const target = probe.spawnEnemy("scout", origin.x, origin.y - definition.range * .95);
  target.hp = target.maxHp = 100000;
  probe.rebuildEnemyGrid();
  probe.updateWeapons(0);
  assert.ok(probe.projectiles[0].life * 560 >= definition.range,
    "The upgraded targeting reach must remain within actual projectile travel");
  for (let step = 0; step < 45; step += 1) probe.updateProjectiles(1 / 30);
  assert.ok(target.hp < target.maxHp, `${branch}: a developed cannon must still hit the target at its new reach`);
}

for (const branch of ["deep", "hail"]) {
  const probe = new Game();
  probe.ship.tiles.clear();
  probe.enemies.length = 0;
  probe.enemyById.clear();
  const tile = makeTile("cryo", 0, -1, false);
  tile.cooldown = 0;
  probe.ship.tiles.set("0,-1", tile);
  const definition = upgrades.resolve(modules.cryo, { level: 4, branch });
  probe.weaponDefinitions.cryo = definition;
  const origin = probe.gridToWorld(0, -1);
  const target = probe.spawnEnemy("scout", origin.x, origin.y - definition.range * .95);
  target.hp = target.maxHp = 100000;
  probe.rebuildEnemyGrid();
  probe.updateWeapons(0);
  assert.equal(probe.projectiles.length, definition.shots, "Cryo must retain its milestone bolt count");
  for (let step = 0; step < 30; step += 1) probe.updateProjectiles(1 / 30);
  assert.ok(target.hp < target.maxHp && target.slowTimer > 0,
    `${branch}: an even Lv5 freezing fan must keep an aimed bolt on a small distant target`);
}

function cannonCadence(tuned) {
  const probe = new Game();
  probe.enemies.length = 0;
  probe.enemyById.clear();
  probe.ship.tiles.clear();
  const tile = makeTile("cannon", 0, -1, false);
  tile.cooldown = 0;
  probe.ship.tiles.set("0,-1", tile);
  probe.weaponDefinitions.cannon = upgrades.resolve(modules.cannon, tuned ? { level: 1 } : null);
  probe.spawnEnemy("scout", 0, -130).hp = 100000;
  probe.rebuildEnemyGrid();
  probe.updateWeapons(0);
  for (let frame = 0; frame < 13; frame += 1) probe.updateWeapons(1 / 30);
  return { shots: probe.projectiles.length, damage: probe.projectiles[0].damage };
}
const standardCadence = cannonCadence(false);
const tunedCadence = cannonCadence(true);
assert.equal(standardCadence.shots, 1, "The standard cannon must still be recharging after 13 simulation steps");
assert.equal(tunedCadence.shots, 2, "Tuning must produce an additional actual shot before the base cooldown finishes");
assert.equal(tunedCadence.damage, standardCadence.damage, "Fire-rate tuning must preserve per-shot damage");

const active = new Game();
activate(active);
save.progression = runtime.DriftProgression.normalize();
const starterType = active.ship.tiles.get("0,-1").type;
active.matter = 200;
assert.equal(buy(starterType, "tune"), false, "Purchases outside Build mode must fail");
assert.equal(active.matter, 200);
active.state = "building";
const unownedType = weapons.find(type => type !== starterType);
assert.equal(buy(unownedType, "tune"), false, "A weapon must be installed before it can be upgraded");
const initialCost = upgrades.options(starterType)[0].cost;
active.matter = initialCost - 1;
assert.equal(buy(starterType, "tune"), false);
assert.equal(active.matter, initialCost - 1);
assert.equal(save.progression.totalUpgrades, 0);
active.matter = 200;
assert.equal(buy(starterType, "tune"), true);
assert.equal(active.matter, 200 - initialCost);
assert.equal(save.progression.totalUpgrades, 1);
assert.equal(buy(starterType, "tune"), false);
assert.equal(active.matter, 200 - initialCost, "Repeated UI events must not double spend");
assert.equal(save.progression.totalUpgrades, 1);
const selectedBranch = upgrades.options(starterType, active.upgrades[starterType])[0];
assert.equal(buy(starterType, selectedBranch.id), true);
assert.equal(save.progression.totalUpgrades, 2);
assert.equal(active.matter, 200 - initialCost - selectedBranch.cost);
assert.equal(buy(starterType, selectedBranch.id), false);
assert.equal(save.progression.totalUpgrades, 2);

const cachedDefinition = active.weaponDefinitions[starterType];
const additionalTile = makeTile(starterType, 1, 0, false);
active.ship.tiles.set("1,0", additionalTile);
active.enemies.length = 0;
active.enemyById.clear();
active.spawnEnemy("scout", 0, -130).hp = 100000;
active.rebuildEnemyGrid();
active.ship.tiles.forEach(tile => { tile.cooldown = 0; });
active.updateWeapons(0);
assert.equal(additionalTile.cooldown, cachedDefinition.cooldown, "Newly installed copies must share the run's weapon upgrade");
assert.equal(active.ship.tiles.get("0,-1").cooldown, cachedDefinition.cooldown, "Existing copies must share the same upgrade");
while (active.upgrades[starterType].level < 9) {
  const next = upgrades.options(starterType, active.upgrades[starterType], 2)[0];
  active.matter = 1000;
  assert.equal(buy(starterType, next.id, next.rank), true);
}
active.projectiles.length = 0;
active.ship.tiles.forEach(tile => { tile.cooldown = 0; });
active.updateWeapons(0);
assert.equal(active.projectiles.length, active.weaponDefinitions[starterType].shots * 2,
  "Existing and later-added copies must both emit the developed volley");
assert.equal(active.projectiles.length, 8, "Two Twin-shot Lv10 cannons must emit a bounded eight-round volley");

const fleet = new Game();
activate(fleet);
fleet.state = "building";
for (const x of [1, 2, 3]) fleet.ship.tiles.set(`${x},0`, makeTile(starterType, x, 0, false));
fleet.upgradeFleetSizes[starterType] = 4;
fleet.purchasedCounts[starterType] = 25;
fleet.matter = 16;
assert.equal(buy(starterType, "tune"), false, "Installed copies must prevent purchasing at the obsolete single-copy price");
assert.equal(fleet.matter, 16);
assert.deepEqual(plain(fleet.upgrades), {});
fleet.matter = 43;
assert.equal(buy(starterType, "tune"), true, "A peak fleet of four copies must cost 43 regardless of lifetime purchases");
assert.equal(fleet.matter, 0);
fleet.matter = 38;
assert.equal(buy(starterType, "twin"), false, "Specialization must also use the peak fleet size");
assert.equal(fleet.matter, 38);
fleet.ship.tiles.delete("2,0");
fleet.ship.tiles.delete("3,0");
fleet.matter = 48;
assert.equal(buy(starterType, "twin"), false, "Losing two modules must not reduce the global upgrade price");
assert.equal(fleet.matter, 48);
fleet.matter = 85;
assert.equal(buy(starterType, "twin"), true, "The four-copy specialization price must remain 85 after module loss");
assert.equal(fleet.matter, 0);
assert.equal(buy(starterType, "pierce"), false, "Repeated branch purchases must not replace or repay specialization");
const nextLevel = upgrades.options(starterType, fleet.upgrades[starterType], 4)[0];
fleet.matter = 1000;
assert.equal(buy(starterType, nextLevel.id, nextLevel.rank), true);
assert.equal(fleet.matter, 1000 - 31, "A later upgrade must retain the same four-copy peak multiplier");
assert.equal(fleet.upgrades[starterType].level, 3);
assert.equal(buy(starterType, nextLevel.id, nextLevel.rank), false, "A stale captured UI callback must not purchase another rank");
assert.equal(fleet.matter, 1000 - 31);
assert.equal(fleet.upgrades[starterType].level, 3);
activate(active);

active.elapsed = 70;
const victim = active.spawnEnemy("scout", 100, 100);
active.killEnemy(victim);
active.killEnemy(victim);
assert.equal(save.progression.totalKills, 1, "Duplicate enemy death callbacks must count once");
active.spawnBoss();
active.killEnemy(active.boss);
active.killEnemy(active.boss);
assert.equal(save.progression.totalKills, 2);
assert.equal(save.progression.bossesDefeated, 1);
const progressBeforeFinish = plain(save.progression);
active.finishRun(false, true);
assert.deepEqual(plain(save.progression), progressBeforeFinish, "Finishing a run must not count kills, bosses, or upgrades again");
const fragmentsAfterFinish = save.fragments;
const victoriesAfterFinish = save.victories;
active.finishRun(false, true);
assert.equal(save.fragments, fragmentsAfterFinish);
assert.equal(save.victories, victoriesAfterFinish);
assert.deepEqual(plain(save.progression), progressBeforeFinish);

const nextRun = new Game();
assert.deepEqual(plain(nextRun.upgrades), {}, "A fresh run must clear all temporary upgrades");
for (const type of weapons) assert.deepEqual(plain(nextRun.weaponDefinitions[type]), originalDefinitions[type], `${type}: next-run definition must reset`);
assert.deepEqual(plain(modules), originalDefinitions, "Combat and purchasing must never mutate the base definitions");

const migrated = sanitizeSave({
  version: 2, fragments: 25, meta: { damage: 2 }, bestKills: 151, bestTime: 80,
  victories: 1, lastLoadout: { selectedWeapon: "rail" }
});
assert.equal(migrated.lastLoadout.selectedWeapon, "rail", "A legacy player's selected starter must remain available");
assert.equal(migrated.progression.totalKills, 151);
assert.equal(migrated.progression.bestTime, 80);
assert.equal(migrated.progression.bossesDefeated, 1);
assert.equal(migrated.fragments, 25);
assert.equal(migrated.meta.damage, 2);
assert.equal(runtime.DriftProgression.isUnlocked(migrated.progression, "rail"), true);
assert.deepEqual(plain(sanitizeSave(migrated).progression), plain(migrated.progression), "Reloading must not reapply legacy counts");
assert.deepEqual(plain(sanitizeSave(save).progression), plain(save.progression), "The live save must preserve exactly the recorded event counters");

console.log(JSON.stringify({ passed: true, weaponTypes: weapons.length, firingConfigurations, checked: ["exact affordability", "peak fleet prices survive module loss", "invalid count rejection and count cap", "stale UI callbacks rejected", "branch exclusivity", "actual faster firing with unchanged shot damage", "actual Lv3 and Lv10 damage and projectile effects", "all installed copies", "new-run reset", "base definitions preserved", "legacy starter retention", "no duplicate finish counters"] }, null, 2));
