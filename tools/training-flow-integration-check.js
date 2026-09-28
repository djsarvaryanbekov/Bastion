"use strict";

// Gameplay integration in an isolated VM. This does not launch or navigate a browser.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const plain = value => JSON.parse(JSON.stringify(value));
const marker = "    window.__driftBastion = {";
const original = fs.readFileSync("game.js", "utf8");
assert.ok(original.includes(marker), "The fixture injection point must exist");
const source = original.replace(marker,
  "    window.__trainingFlowTest = { Game, save, ui, MODULES, defaultSave, sanitizeSave, storeSave, startRun, startTraining, leaveTraining, openBuild, closeBuild, closePause, resetProgress, buyRunUpgrade, placePurchasedModule, sellInstalledModule, interaction: () => buildInteraction, current: () => game, session: () => trainingSession, telemetry: () => playtestTelemetry, select: type => { selectedBuildModule = type; }, setKeys: value => { keys = value; } };\n" + marker);
const gameLoad = 'vm.runInNewContext(fs.readFileSync("game.js", "utf8"), sandbox, { filename: "game.js" });';
let harness = fs.readFileSync(".artifact_build/runtime-check.js", "utf8");
harness = harness.slice(0, harness.indexOf("let installPromptCalls"));
assert.ok(harness.includes(gameLoad));
harness = harness.replace(gameLoad, ["training.js", "training-arena.js", "training-view.js"].map(file =>
  `vm.runInNewContext(fs.readFileSync(${JSON.stringify(file)}, "utf8"), sandbox, { filename: ${JSON.stringify(file)} });`).join("\n") + "\n" + gameLoad);
// The production view removes its listeners on exit; extend only this fixture's mock.
harness = harness.replace("    addEventListener(type, callback) { this.listeners[type] = callback; },",
  "    addEventListener(type, callback) { this.listeners[type] = callback; },\n    removeEventListener(type, callback) { if (this.listeners[type] === callback) delete this.listeners[type]; },");
const bootstrap = {
  console, URLSearchParams, setTimeout() { return 0; }, clearTimeout() {},
  process: { env: { BALANCE_SECONDS: "1" } },
  require(name) {
    if (name === "fs") return { ...fs, readFileSync(file, encoding) { return file === "game.js" ? source : fs.readFileSync(file, encoding); } };
    return require(name);
  }
};
vm.runInNewContext(harness + "\nglobalThis.runtime = sandbox; globalThis.storageMap = storage;", bootstrap);
const { runtime, storageMap } = bootstrap;
const api = runtime.__trainingFlowTest;
const element = id => runtime.document.getElementById(id);
const state = () => plain(api.session().controller.snapshot());
const storageSnapshot = () => plain(Object.fromEntries(storageMap));
const persistence = () => ({ save: plain(api.save), storage: storageSnapshot() });
const targets = group => api.current().enemies.filter(enemy => !enemy.dead && enemy.trainingTarget && enemy.trainingTarget.group === group);
const clickAction = id => {
  assert.equal(typeof element(id).listeners.click, "function", id + " must be wired");
  element(id).listeners.click();
};
const assertStage = id => { assert.equal(state().stageId, id); assert.equal(state().status, "active"); };
const tickUntil = (predicate, label, seconds = 40) => {
  let frames = 0;
  while (!predicate() && frames < seconds * 60) { api.current().update(1 / 60); frames += 1; }
  assert.ok(predicate(), label + ": " + JSON.stringify({ lesson: state(), gameState: api.current().state, matter: api.current().matter, targets: api.current().enemies.map(enemy => ({ hp: enemy.hp, target: enemy.trainingTarget })) }));
  return frames / 60;
};
const latestCell = (x, y) => api.ui.buildGrid.children.filter(cell => cell.dataset.x === String(x) && cell.dataset.y === String(y)).at(-1);

function monitorCombat(game) {
  const observed = { kills: [], volleys: [], hostileProjectiles: 0 };
  const kill = game.killEnemy, fire = game.fireWeaponVolley, projectile = game.spawnProjectile;
  game.killEnemy = function (enemy, ...args) {
    const target = enemy.trainingTarget && { ...enemy.trainingTarget };
    const maxHp = enemy.maxHp;
    const before = this.kills;
    const result = kill.call(this, enemy, ...args);
    if (target && this.kills > before) observed.kills.push({ ...target, maxHp, elapsed: this.elapsed });
    return result;
  };
  game.fireWeaponVolley = function (origin, nx, ny, def, ...args) {
    this.ship.tiles.forEach((tile, key) => {
      const point = this.gridToWorld(tile.x, tile.y);
      if (tile.type === "cannon" && Math.hypot(point.x - origin.x, point.y - origin.y) < .001) {
        observed.volleys.push({ group: state().stageId, key, cooldown: def.cooldown, damage: def.damage });
      }
    });
    return fire.call(this, origin, nx, ny, def, ...args);
  };
  game.spawnProjectile = function (friendly, ...args) {
    if (!friendly) observed.hostileProjectiles += 1;
    return projectile.call(this, friendly, ...args);
  };
  return observed;
}

function startLesson() {
  api.startTraining();
  assertStage("combat");
  const game = api.current();
  assert.equal(game.training, true);
  assert.equal(game.matter, 30, "The training wallet has a fixed independent starting balance");
  assert.equal(api.telemetry(), null);
  assert.equal(game.ship.tiles.get("0,0").maxHp, 350);
  assert.equal(game.ship.tiles.get("0,-1").maxHp, api.MODULES.cannon.hp);
  assert.equal(targets("combat").length, 3, "Training starts immediately with real enemies");
  assert.ok(targets("combat").every(enemy => enemy.hp === 72 && enemy.speed > 0 && enemy.damage > 0));
  assert.equal(element("trainingOpenBuildButton").classList.contains("hidden"), false, "Build is available from the start");
  const observation = monitorCombat(game);
  const positions = targets("combat").map(enemy => ({ enemy, x: enemy.x, y: enemy.y }));
  game.update(1 / 60);
  assert.ok(positions.some(({ enemy, x, y }) => enemy.x !== x || enemy.y !== y), "Training enemies must execute their actual AI movement");
  return observation;
}

function clearStage(group, next, observation) {
  const killsBefore = observation.kills.filter(kill => kill.group === group).length;
  assert.equal(targets(group).length, group === "combat" ? 3 : 2, "Every stage starts with a populated arena");
  assert.ok(targets(group).every(enemy => enemy.maxHp === 72));
  const duration = tickUntil(() => next ? state().stageId === next : state().completed, "Automatic transition from " + group);
  const creditedKills = observation.kills.filter(kill => kill.group === group).slice(killsBefore);
  assert.equal(creditedKills.length, group === "combat" ? 3 : 2);
  assert.ok(creditedKills.every(kill => kill.maxHp === 72));
  if (next) {
    assertStage(next);
    assert.equal(api.current().state, "playing", "Stage changes must not interrupt flight with Build");
    assert.equal(targets(next).length, 2, "The next stage cannot leave an empty arena");
  } else assert.equal(api.current().state, "training_complete", "Final kills automatically complete training");
  return { group, kills: creditedKills.length, targetHp: 72, seconds: duration };
}

function buyCannon(x = 1, y = 0) {
  if (api.current().state !== "building") clickAction("trainingOpenBuildButton");
  api.select("cannon");
  const before = api.current().matter;
  const lessonBefore = state().stageId;
  assert.equal(api.placePurchasedModule(x, y), true);
  assert.ok(api.current().matter < before);
  const tile = api.current().ship.tiles.get(x + "," + y);
  assert.ok(tile.paidMatter > 0);
  assert.equal(tile.maxHp, api.MODULES.cannon.hp, "Purchased training modules ignore permanent durability bonuses");
  assert.equal(api.current().state, "building", "Buying must leave Build open until Resume");
  assert.equal(state().stageId, lessonBefore);
  const time = api.current().elapsed, enemies = plain(api.current().enemies);
  api.current().update(5);
  assert.equal(api.current().elapsed, time);
  assert.deepEqual(plain(api.current().enemies), enemies, "Build pauses the existing enemies and automatic lesson transitions");
}

function upgradeCannon() {
  if (api.current().state !== "building") clickAction("trainingOpenBuildButton");
  const before = api.current().weaponDefinitions.cannon.damage;
  assert.equal(api.buyRunUpgrade("cannon", "base1", 0), true);
  assert.equal(api.current().upgrades.cannon.level, 1);
  assert.ok(api.current().weaponDefinitions.cannon.damage > before);
  assert.equal(api.current().state, "building", "Upgrading must leave Build open until Resume");
  assert.equal(state().completed, false);
}

// No installed pointer handler exists; both mouse and touch empty-cell callbacks reject relocation/purchase.
function inspectInstalledInput() {
  api.openBuild();
  const before = { matter: api.current().matter, tiles: plain(Array.from(api.current().ship.tiles)) };
  for (const pointerType of ["mouse", "touch"]) {
    let installed = latestCell(0, -1);
    assert.equal(installed.listeners.pointerdown, undefined, "Installed modules cannot begin any pointer drag");
    installed.listeners.click({ detail: 1, pointerType });
    assert.equal(api.interaction().selectedKey, "0,-1");
    const empty = latestCell(-1, 0);
    assert.equal(empty.dataset.action, "none");
    empty.listeners.click({ detail: 1, pointerType });
    empty.listeners.click({ detail: 1, pointerType });
    assert.equal(api.interaction().drag, null);
    assert.deepEqual({ matter: api.current().matter, tiles: plain(Array.from(api.current().ship.tiles)) }, before,
      pointerType + " cannot move an installed module or silently buy another one");
  }
  api.closeBuild();
}

const seeded = api.defaultSave();
seeded.fragments = 483;
seeded.meta = { core: 9, modules: 8, matter: 7, drive: 6, damage: 5 };
seeded.progression.purchasedModules = ["laser", "missile", "repair"];
seeded.campaign.purchasedCores = ["bulwark"];
seeded.campaign.selectedCore = "bulwark";
seeded.lastLoadout.selectedWeapon = "laser";
Object.assign(api.save, api.sanitizeSave(seeded));
api.storeSave();
storageMap.set("drift-bastion-save-v1", '{"fragments":909,"legacy":true}');
storageMap.set("drift-bastion-playtest-v1", '{"runs":[{"id":"historical-survival"}]}');
storageMap.set("unrelated-training-sentinel", "leave-intact");
const baseline = persistence();
const report = { verification: "VM gameplay and mock input integration; no browser or layout test", routes: [] };

const observed = startLesson();
const beforePause = { elapsed: api.current().elapsed, phase: state(), enemies: plain(api.current().enemies) };
clickAction("trainingPauseButton");
assert.equal(api.current().state, "paused");
api.current().update(10);
assert.deepEqual({ elapsed: api.current().elapsed, phase: state(), enemies: plain(api.current().enemies) }, beforePause,
  "The training Pause control must stop elapsed time, enemies, and automatic phase advancement");
assert.equal(api.ui.resetProgressButton.disabled, true);
clickAction("resumeButton");
assert.equal(api.current().state, "playing");
inspectInstalledInput();
const combat = clearStage("combat", "construction", observed);
assert.equal(api.current().matter, 54, "Stage entry must preserve 30 starting Matter plus three real eight-Matter kills");
buyCannon();
api.closeBuild();
const construction = clearStage("construction", "upgrades", observed);
assert.equal(api.current().matter, 45, "Buying the second Cannon and two kills use the ordinary economy");
upgradeCannon();
api.closeBuild();
const upgrades = clearStage("upgrades", null, observed);
for (const group of ["construction", "upgrades"]) assert.equal(new Set(observed.volleys.filter(volley => volley.group === group).map(volley => volley.key)).size, 2, "Both Cannons must really fire in " + group);
assert.ok(observed.volleys.filter(volley => volley.group === "upgrades").every(volley => volley.damage > api.MODULES.cannon.damage), "Every actual Cannon volley uses the family upgrade");
assert.ok(observed.hostileProjectiles > 0, "The final bolter must fire through the ordinary hostile-projectile path");
assert.deepEqual(persistence(), baseline, "All training actions and automatic completion must preserve permanent progress until exit");
const finishedTime = api.current().elapsed;
api.current().update(10);
assert.equal(api.current().elapsed, finishedTime);
clickAction("trainingReturnButton");
assert.equal(api.save.training.completed, true);
for (const key of Object.keys(baseline.save).filter(key => !["training", "updatedAt"].includes(key))) assert.deepEqual(plain(api.save[key]), baseline.save[key], "Completion may not change " + key);
for (const key of ["drift-bastion-save-v1", "drift-bastion-playtest-v1", "unrelated-training-sentinel"]) assert.equal(storageSnapshot()[key], baseline.storage[key]);
report.routes.push({ name: "automatic-standard-route", combat, construction, upgrades, hostileProjectiles: observed.hostileProjectiles });

// Purchase before the construction stage; upgrade before its trial; no repeated action is demanded.
const beforeEarly = persistence();
const early = startLesson();
buyCannon();
api.closeBuild();
clearStage("combat", "construction", early);
assert.equal(state().progress.placed, true);
assert.equal(state().progress.copies, 2);
upgradeCannon();
api.closeBuild();
clearStage("construction", "upgrades", early);
assert.equal(state().progress.upgraded, true);
assert.equal(api.current().state, "playing");
clearStage("upgrades", null, early);
assert.deepEqual(persistence(), beforeEarly);
api.leaveTraining();
report.routes.push({ name: "early-purchase-and-upgrade", repeatedPurchaseRequired: false, redundantBuildRequired: false });

// Killing unqualified targets always leaves replacements. Rebuying a sold gun restores the route.
const beforeRecovery = persistence();
const recovery = startLesson();
clearStage("combat", "construction", recovery);
const unqualifiedKills = recovery.kills.length;
tickUntil(() => recovery.kills.length >= unqualifiedKills + 2, "Real kills before buying a second Cannon");
assertStage("construction");
assert.equal(state().progress.destroyed, 0);
assert.equal(targets("construction").length, 2, "Unqualified kills must replenish the arena");
buyCannon();
assert.equal(api.sellInstalledModule("1,0"), true);
api.closeBuild();
const afterSaleKills = recovery.kills.length;
tickUntil(() => recovery.kills.length >= afterSaleKills + 2, "Real kills after selling the second Cannon");
assertStage("construction");
assert.equal(state().progress.destroyed, 0);
buyCannon();
api.closeBuild();
clearStage("construction", "upgrades", recovery);
const beforeUntunedKills = recovery.kills.length;
tickUntil(() => recovery.kills.length >= beforeUntunedKills + 2, "Real kills before the family upgrade");
assertStage("upgrades");
assert.equal(state().progress.destroyed, 0);
assert.equal(targets("upgrades").length, 2);
upgradeCannon();
api.closeBuild();
clearStage("upgrades", null, recovery);
assert.deepEqual(persistence(), beforeRecovery);
api.leaveTraining();
report.routes.push({ name: "unqualified-kills-sale-and-rebuy", constructionAndUpgradeTargetsReplenished: true });

// Losing the only weapon cannot strand a poor wallet; core loss exposes a working safe Retry.
const beforeLoss = persistence();
startLesson();
upgradeCannon();
api.closeBuild();
assert.equal(api.current().matter, 22);
api.current().applyDamageToTile("0,-1", 1000000);
api.current().update(1 / 60);
assert.equal(Array.from(api.current().ship.tiles.values()).filter(tile => tile.type === "cannon").length, 0);
assert.ok(api.current().matter >= api.MODULES.cannon.baseCost, "With no installed copy, emergency funds must cover the base Cannon price");
buyCannon(0, -1);
assert.equal(api.current().upgrades.cannon.level, 1, "Weapon loss preserves its shared upgrade");
api.closeBuild();
api.current().applyDamageToTile("0,0", 1000000);
assert.equal(api.current().state, "paused");
assert.equal(element("trainingFailureRetryButton").classList.contains("hidden"), false);
api.closePause();
assert.equal(api.current().state, "paused", "The pause handler cannot resume a destroyed core");
assert.equal(api.resetProgress(), false, "A hidden reset callback cannot reset a training/suspended save");
clickAction("trainingFailureRetryButton");
assertStage("combat");
assert.equal(api.current().state, "playing");
assert.ok(api.current().ship.tiles.get("0,0").hp > 0);
assert.equal(targets("combat").length, 3);
assert.equal(api.current().upgrades.cannon.level, 1);
api.leaveTraining();
assert.deepEqual(persistence(), beforeLoss);
report.weaponLossRecoveryAndCoreRetry = true;

// A suspended Survival game returns by identity, with all gameplay fields and storage intact.
api.startRun();
const survival = api.current();
survival.state = "paused"; survival.matter = 113; survival.elapsed = 173.5;
survival.ship.tiles.get("0,0").hp -= 23;
const gameSnapshot = value => JSON.parse(JSON.stringify(value, (key, item) => {
  if (key === "lastFrame" || key === "accumulator") return undefined;
  if (item instanceof Map) return { entries: Array.from(item) };
  if (item instanceof Set) return { values: Array.from(item) };
  return item;
}));
const survivalBefore = gameSnapshot(survival), storageBefore = persistence(), telemetryBefore = api.telemetry();
startLesson();
buyCannon();
api.closeBuild();
for (let frame = 0; frame < 360; frame += 1) api.current().update(1 / 60);
api.storeSave();
assert.deepEqual(persistence(), storageBefore, "An explicit save during training cannot write Survival progress");
api.leaveTraining();
assert.equal(api.current(), survival);
assert.equal(api.telemetry(), telemetryBefore);
assert.deepEqual(gameSnapshot(survival), survivalBefore);
assert.deepEqual(persistence(), storageBefore);
report.suspendedSurvivalRestoredExactly = true;
report.installedMouseAndTouchMoveUnavailable = true;
report.pauseResumePreservesAutomaticFlow = true;
report.storageIsolation = true;
report.passed = true;
const output = path.join("outputs", "training-2026-09-09", "flow-integration-report.json");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report));
