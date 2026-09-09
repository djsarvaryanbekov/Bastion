"use strict";

const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
const output = path.join(root, "outputs", "training-2026-09-09");
const saveKey = "drift-bastion-save-v2";
const logKey = "drift-bastion-playtest-v1";
fs.mkdirSync(output, { recursive: true });
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  const file = path.resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
  if (path.relative(root, file).startsWith("..") || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.setHeader("Content-Type", { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml" }[path.extname(file)] || "application/octet-stream");
  let source = fs.readFileSync(file);
  // Read-only fixture access in an isolated browser; gameplay lessons still use real input.
  if (pathname === "/game.js") source = source.toString().replace("    window.__driftBastion = {",
    "    window.__trainingFixture = { current: () => game, saved: () => JSON.parse(JSON.stringify(save)), telemetry: () => playtestTelemetry, lesson: () => trainingSession && trainingSession.controller.snapshot(), interaction: () => ({ pending: buildInteraction.pendingCellKey, selected: buildInteraction.selectedKey, suppressed: buildInteraction.suppressClickUntil, now: performance.now(), drag: buildInteraction.drag && { active: buildInteraction.drag.active, type: buildInteraction.drag.type, target: buildInteraction.drag.target && buildInteraction.drag.target.dataset } }), modules: MODULES };\n    window.__driftBastion = {");
  res.end(source);
});

async function persistentState(page) {
  return page.evaluate(() => ({ save: window.__trainingFixture.saved(), storage: Object.fromEntries(Object.entries(localStorage)) }));
}

async function gameState(page) {
  return page.evaluate(() => {
    const game = window.__trainingFixture.current();
    return game && JSON.parse(JSON.stringify({ training: game.training, state: game.state, finished: game.finished, elapsed: game.elapsed,
      kills: game.kills, matter: game.matter, modulesLost: game.modulesLost, core: game.coreDef,
      ship: { x: game.ship.x, y: game.ship.y, vx: game.ship.vx, vy: game.ship.vy, angle: game.ship.angle, tiles: Array.from(game.ship.tiles) },
      upgrades: game.upgrades, weaponDefinitions: game.weaponDefinitions, purchasedCounts: game.purchasedCounts, peakCopies: game.upgradeFleetSizes,
      enemies: game.enemies, projectiles: game.projectiles, gravityFields: game.gravityFields, bossesDefeated: game.bossesDefeated,
      nextBossAt: game.nextBossAt, assaultIndex: game.assaultIndex, totalEnemiesSpawned: game.totalEnemiesSpawned }));
  });
}

async function prepare(browser, url, profile, errors) {
  const context = await browser.newContext({ viewport: profile.viewport, isMobile: profile.touch, hasTouch: profile.touch, serviceWorkers: "block" });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on("pageerror", error => errors.push(profile.name + ": " + error.message));
  await page.addInitScript(fixture => {
    if (!sessionStorage.getItem("training-qa-seeded")) {
      const saved = { version: 9, fragments: 483, bestTime: 731, bestKills: 644, victories: 8,
        meta: { core: 9, modules: 8, matter: 7, drive: 6, damage: 5 }, guidance: { step: 4, complete: true },
        onboarding: { version: 1, step: "complete", family: "laser" },
        progression: { schemaVersion: 4, purchasedModules: ["laser", "missile", "repair"], bestTime: 731, totalKills: 1400, bossesDefeated: 8, totalUpgrades: 36, contractsCompleted: 3 },
        campaign: { schemaVersion: 2, completed: ["sector1-1"], purchasedCores: ["bulwark"], selectedCore: "bulwark" },
        settings: { muted: true, uiScale: fixture.scale, autoPause: true },
        lastLoadout: { selectedWeapon: "laser", tile: { x: 0, y: -1, type: "laser" } } };
      localStorage.setItem(fixture.saveKey, JSON.stringify(saved));
      localStorage.setItem(fixture.saveKey + "-backup", JSON.stringify({ ...saved, fragments: 841 }));
      localStorage.setItem("drift-bastion-save-v1", JSON.stringify({ ...saved, version: 1, fragments: 909 }));
      localStorage.setItem(fixture.logKey, JSON.stringify({ schemaVersion: 2, testerId: "training-qa-history", createdAt: "2026-09-08T12:00:00.000Z",
        runs: [{ id: "historical-survival", endedAt: "2026-09-08T12:10:00.000Z", outcome: "survived", summary: { elapsed: 600, kills: 641 } }] }));
      localStorage.setItem("unrelated-training-sentinel", "leave-intact");
      sessionStorage.setItem("training-qa-seeded", "1");
    }
  }, { saveKey, logKey, scale: profile.scale });
  await page.clock.install();
  await page.goto(url);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  return { context, page };
}

async function advanceUntil(page, predicate, label, maximumMs = 15000) {
  for (let elapsed = 0; elapsed <= maximumMs; elapsed += 100) {
    if (await predicate()) return;
    await page.clock.runFor(100);
  }
  fs.writeFileSync(path.join(output, "failure-state.json"), JSON.stringify({ label, lesson: await lesson(page), game: await gameState(page) }, null, 2));
  await page.screenshot({ path: path.join(output, "failure.png") });
  assert.fail("Timed out waiting for actual lesson action: " + label);
}

function cell(page, x, y) { return page.locator('.build-cell[data-x="' + x + '"][data-y="' + y + '"]'); }
async function drag(page, source, target, touch = false) {
  const from = await source.boundingBox(), to = await target.boundingBox();
  assert.ok(from && to);
  if (touch) {
    const cdp = await page.context().newCDPSession(page);
    const start = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
    const end = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
    const before = (await gameState(page)).matter;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
    const activation = { x: start.x, y: start.y + (end.y >= start.y ? 18 : -18) };
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [activation] });
    for (let step = 1; step <= 12; step += 1) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: activation.x + (end.x - activation.x) * step / 12, y: activation.y + (end.y - activation.y) * step / 12 }] });
    assert.equal(await target.evaluate((element, point) => {
      const hit = document.elementFromPoint(point.x, point.y);
      return hit === element || element.contains(hit);
    }, end), true, "The original touch-drop destination must remain under the pointer");
    assert.equal((await gameState(page)).matter, before, "Touch dragging must preview without payment until release");
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await cdp.detach();
    await page.clock.runFor(400);
    return;
  }
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await page.mouse.up();
  await page.clock.runFor(400);
}

async function steerTo(page, target, touch) {
  const held = new Set();
  const setKey = async (key, active) => {
    if (active === held.has(key)) return;
    if (active) { await page.keyboard.down(key); held.add(key); }
    else { await page.keyboard.up(key); held.delete(key); }
  };
  let cdp, origin;
  if (touch) {
    origin = await page.evaluate(() => {
      const canvas = document.getElementById("gameCanvas");
      for (const y of [innerHeight * .55, innerHeight * .45, innerHeight * .7]) {
        for (const x of [innerWidth * .25, innerWidth * .5, innerWidth * .75]) {
          if (document.elementFromPoint(x, y) === canvas) return { x, y };
        }
      }
      return null;
    });
    assert.ok(origin, "Training must leave canvas space for real touch steering");
    cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [origin] });
  }
  try {
    for (let elapsed = 0; elapsed < 20000; elapsed += 100) {
      const ship = (await gameState(page)).ship;
      const dx = target.x - ship.x, dy = target.y - ship.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= (target.radius ? target.radius - 2 : 45)) return;
      if (touch) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: origin.x + dx / distance * 66, y: origin.y + dy / distance * 66 }] });
      } else {
        const desiredAngle = Math.atan2(dx, -dy);
        const delta = Math.atan2(Math.sin(desiredAngle - ship.angle), Math.cos(desiredAngle - ship.angle));
        await setKey("a", delta < -.08);
        await setKey("d", delta > .08);
        await setKey("w", Math.abs(delta) < .28);
      }
      await page.clock.runFor(100);
    }
    fs.writeFileSync(path.join(output, "steering-failure.json"), JSON.stringify({ target, touch, lesson: await lesson(page), game: await gameState(page), input: await page.evaluate(() => window.__driftBastion.getState()) }, null, 2));
    await page.screenshot({ path: path.join(output, "steering-failure.png") });
    assert.fail("Real steering did not reach the beacon " + JSON.stringify(target));
  } finally {
    for (const key of held) await page.keyboard.up(key);
    if (cdp) { await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await cdp.detach(); }
  }
}

async function lesson(page) { return page.evaluate(() => window.__trainingFixture.lesson()); }
async function assertStage(page, id, status) {
  const state = await lesson(page);
  if (state.stageId !== id || status && state.status !== status) {
    fs.writeFileSync(path.join(output, "stage-failure.json"), JSON.stringify({ expected: { id, status }, lesson: state, game: await gameState(page) }, null, 2));
    await page.screenshot({ path: path.join(output, "stage-failure.png") });
  }
  assert.equal(state.stageId, id);
  if (status) assert.equal(state.status, status);
  return state;
}
async function clickTraining(page, suffix) {
  const inBuild = await page.locator("#buildOverlay").isVisible();
  const control = page.locator("#" + (inBuild ? "trainingBuild" : "training") + suffix);
  await control.click();
}
async function openTrainingBuild(page) {
  if (!(await page.locator("#buildOverlay").isVisible())) await clickTraining(page, "OpenBuildButton");
  assert.equal(await page.locator("#trainingBuildBar").isVisible(), true);
}
async function attach(page, type, x, y, touch) {
  if (touch) await page.locator('[data-type="' + type + '"]').tap();
  else await page.locator('[data-type="' + type + '"]').click();
  if (touch) {
    await drag(page, page.locator('[data-type="' + type + '"]'), cell(page, x, y), true);
  } else await cell(page, x, y).click();
}
async function destroyPracticeTargets(page, touch, group) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const progress = await lesson(page);
    if (progress.stageId !== group || progress.completed) return;
    const current = await gameState(page);
    const active = current.enemies.filter(enemy => !enemy.dead && enemy.trainingTarget && enemy.trainingTarget.group === group);
    assert.ok(active.length > 0, "An active training stage must keep actual enemies available");
    assert.ok(active.every(enemy => enemy.maxHp === 72));
    const target = active[0];
    if (Math.hypot(target.x - current.ship.x, target.y - current.ship.y) > 285) {
      await steerTo(page, { x: (current.ship.x + target.x) / 2, y: (current.ship.y + target.y) / 2 }, touch);
    }
    await page.clock.runFor(500);
  }
  throw new Error("Training did not automatically advance after real " + group + " kills");
}

async function completeRoute(browser, url, profile, errors) {
  const { context, page } = await prepare(browser, url, profile, errors);
  try {
    const baseline = await persistentState(page);
    await page.locator("#startTrainingButton").click();
    const initial = await gameState(page);
    assert.equal(initial.training, true);
    assert.equal(initial.core.id, "standard");
    assert.equal(initial.matter, 20);
    assert.deepEqual(initial.ship.tiles.map(([, tile]) => tile.type).sort(), ["cannon", "core"]);
    assert.equal(initial.ship.tiles.find(([, tile]) => tile.type === "core")[1].maxHp, 350);
    assert.equal(initial.ship.tiles.find(([, tile]) => tile.type === "cannon")[1].maxHp,
      await page.evaluate(() => window.__trainingFixture.modules.cannon.hp));
    assert.equal(await page.evaluate(() => window.__trainingFixture.telemetry()), null);
    assert.equal(await page.locator("#trainingContinueButton, #trainingBuildContinueButton, #trainingPracticeButton, #trainingBuildPracticeButton, #trainingStepText, #trainingBuildStepText").count(), 0,
      "Training must have no lesson confirmations, practice menus, or numbered tasks");
    await assertStage(page, "combat", "active");
    assert.equal(initial.enemies.filter(enemy => enemy.trainingTarget?.group === "combat").length, 3);
    await page.locator("#trainingPauseButton").click();
    const pausedByControl = await gameState(page);
    await page.clock.runFor(1200);
    assert.deepEqual(await gameState(page), pausedByControl, "The visible Pause control must stop the training simulation");
    await page.locator("#resumeButton").click();
    assert.equal((await gameState(page)).state, "playing");
    await openTrainingBuild(page);
    assert.deepEqual((await page.locator("#catalog .catalog-card").evaluateAll(elements => elements.map(element => element.dataset.type))).sort(), ["armor", "cannon", "shield"],
      "Training licenses are temporary and independent of the saved loadout");
    const paused = await gameState(page);
    await page.clock.runFor(1500);
    assert.deepEqual(await gameState(page), paused, "Build must pause enemies and lesson transitions");
    await page.locator("#closeBuild").click();
    await destroyPracticeTargets(page, profile.touch, "combat");
    await assertStage(page, "construction");
    assert.equal((await gameState(page)).state, "playing", "An automatic transition must preserve flight");
    const afterCombat = await gameState(page);
    assert.ok(afterCombat.kills >= 3);
    assert.equal(afterCombat.enemies.filter(enemy => !enemy.dead && enemy.trainingTarget?.group === "construction").length, 2);
    await page.screenshot({ path: path.join(output, profile.name + "-combat.png") });
    await openTrainingBuild(page);
    await attach(page, "cannon", 1, 0, profile.touch);
    await assertStage(page, "construction", "active");
    assert.equal((await gameState(page)).state, "building", "A purchase must preserve Build until Resume");
    assert.equal((await gameState(page)).ship.tiles.filter(([, tile]) => tile.type === "cannon").length, 2);
    await page.screenshot({ path: path.join(output, profile.name + "-construction.png") });
    await page.locator("#closeBuild").click();
    await destroyPracticeTargets(page, profile.touch, "construction");
    await assertStage(page, "upgrades");
    assert.equal((await gameState(page)).state, "playing", "The upgrade stage must not force a Build visit");
    assert.ok((await gameState(page)).kills >= afterCombat.kills + 2);
    await openTrainingBuild(page);
    await page.locator('[data-type="cannon"]').click();
    const cost = await page.locator('[data-weapon="cannon"][data-choice="tune"]').innerText();
    assert.match(cost, /22 Matter/, "The shared upgrade uses the real two-copy price");
    await page.locator('[data-weapon="cannon"][data-choice="tune"]').click();
    assert.equal((await gameState(page)).state, "building");
    assert.equal((await lesson(page)).progress.upgraded, true);
    assert.ok((await gameState(page)).weaponDefinitions.cannon.cooldown < .5);
    await page.screenshot({ path: path.join(output, profile.name + "-upgrades.png") });
    await page.locator("#closeBuild").click();
    await destroyPracticeTargets(page, profile.touch, "upgrades");
    assert.equal((await lesson(page)).completed, true);
    assert.equal(await page.locator("#trainingCompleteOverlay").isVisible(), true);
    assert.deepEqual(await persistentState(page), baseline, "All practice time, purchases, upgrades and combat must leave permanent saves and telemetry intact");
    const completedTime = (await gameState(page)).elapsed;
    await page.keyboard.press("b");
    await page.clock.runFor(600);
    assert.equal((await gameState(page)).state, "training_complete");
    assert.equal((await gameState(page)).elapsed, completedTime);
    await page.screenshot({ path: path.join(output, profile.name + "-complete.png") });
    await page.locator("#trainingReturnButton").click();
    assert.equal(await page.locator("#menuOverlay").isVisible(), true);
    const after = await persistentState(page);
    assert.equal(after.save.training.completed, true);
    for (const key of Object.keys(baseline.save).filter(key => !["training", "updatedAt"].includes(key))) assert.deepEqual(after.save[key], baseline.save[key], "Completion must preserve saved " + key);
    assert.equal(after.storage[logKey], baseline.storage[logKey]);
    assert.equal(after.storage["unrelated-training-sentinel"], "leave-intact");
    await page.reload();
    assert.equal((await persistentState(page)).save.training.completed, true);
    await page.locator("#startButton").click();
    const survival = await gameState(page);
    assert.equal(survival.training, false);
    assert.ok(survival.ship.tiles.some(([, tile]) => tile.type === "laser"));
    assert.equal(survival.core.id, "bulwark");
    return { profile: profile.name, automaticStages: ["combat", "construction", "upgrades"], targetHp: 72, constructionCopies: 2,
      noForcedBuild: true, pauseControl: true, purchasesKeepBuildOpen: true, automaticCompletion: true, isolatedCompletion: true };
  } finally { await context.close(); }
}
async function suspendedRunSafety(browser, url, errors) {
  const profile = { name: "suspended-survival", viewport: { width: 1280, height: 800 }, touch: false, scale: 100 };
  const { context, page } = await prepare(browser, url, profile, errors);
  try {
    await page.locator("#startButton").click();
    await page.clock.runFor(1200);
    await page.keyboard.press("p");
    const before = await gameState(page), persistentBefore = await persistentState(page);
    await page.evaluate(() => { window.__suspendedGameIdentity = window.__trainingFixture.current(); });
    await page.locator("#replayOnboardingButton").click();
    assert.equal((await gameState(page)).training, true);
    await page.clock.runFor(6100);
    await openTrainingBuild(page);
    await attach(page, "cannon", 1, 0, false);
    await clickTraining(page, "ExitButton");
    assert.equal(await page.evaluate(() => window.__suspendedGameIdentity === window.__trainingFixture.current()), true);
    assert.deepEqual(await gameState(page), before, "Exiting training must restore the exact paused Survival object and state");
    assert.deepEqual(await persistentState(page), persistentBefore, "Early exit must preserve every save and telemetry byte");
    await page.locator("#replayOnboardingButton").click();
    const deathBaseline = await persistentState(page);
    await page.evaluate(() => window.__trainingFixture.current().applyDamageToTile("0,0", 1000000));
    assert.equal(await page.locator("#trainingHUD").isVisible(), true, "Lesson death must retain visible retry and exit controls");
    await page.keyboard.press("Escape");
    assert.equal((await gameState(page)).state, "paused", "Escape must not resume a training ship with a destroyed core");
    assert.equal(await page.locator("#trainingFailureRetryButton").isVisible(), true);
    await page.locator("#trainingFailureRetryButton").click();
    assert.equal((await gameState(page)).state, "playing");
    assert.ok((await gameState(page)).ship.tiles.find(([, tile]) => tile.type === "core")[1].hp > 0);
    assert.deepEqual(await persistentState(page), deathBaseline, "Training death and retry must not pay rewards or save progress");
    await page.keyboard.press("p");
    assert.equal(await page.locator("#resetProgressButton").isDisabled(), true, "Training must prevent resetting a suspended Survival context");
    await page.locator("#confirmResetProgress").evaluate(element => element.click());
    assert.deepEqual(await persistentState(page), deathBaseline, "A hidden stale reset callback must be guarded during training");
    await page.locator("#resumeButton").click();
    await clickTraining(page, "ExitButton");
    assert.deepEqual(await gameState(page), before);
    assert.equal(await page.locator("#resetProgressButton").isDisabled(), false);
    await page.locator("#resumeButton").click();
    const timeBefore = (await gameState(page)).elapsed;
    await page.clock.runFor(100);
    const resumed = await gameState(page);
    assert.ok(resumed.elapsed > timeBefore && resumed.elapsed < timeBefore + .2, "Restored Survival must resume without simulating the time spent in training");
    assert.equal(resumed.training, false);
    return { sameObject: true, exactState: true, earlyExitStorageUnchanged: true, deathRetrySafe: true, escapeCannotResumeDeadShip: true, resetGuarded: true, noCatchUp: true };
  } finally { await context.close(); }
}

async function freshTouchConfirmation(browser, url, errors) {
  const cases = [];
  for (const joystickFirst of [false, true]) {
    const profile = { name: "touch-confirmation", viewport: { width: 360, height: 640 }, touch: true, scale: 150 };
    const { context, page } = await prepare(browser, url, profile, errors);
    try {
      const baseline = await persistentState(page);
      await page.locator("#startTrainingButton").click();
      if (joystickFirst) await steerTo(page, { x: 0, y: -160, radius: 44 }, true);
      await openTrainingBuild(page);
      await page.locator('[data-type="cannon"]').tap();
      // Use the live native input clock for this independent two-tap confirmation check.
      await page.clock.resume();
      const before = (await gameState(page)).matter;
      await cell(page, 1, 0).tap();
      await page.waitForFunction(() => window.__trainingFixture.interaction().pending === "1,0");
      assert.equal((await gameState(page)).matter, before);
      await cell(page, 1, 0).tap();
      await page.waitForFunction(balance => window.__trainingFixture.current().matter < balance, before);
      assert.equal((await gameState(page)).matter, before - 19);
      await clickTraining(page, "ExitButton");
      assert.deepEqual(await persistentState(page), baseline);
      cases.push({ joystickFirst, previewBeforePayment: true, secondTapPurchasesOnce: true });
    } finally { await context.close(); }
  }
  return cases;
}

(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    const url = "http://127.0.0.1:" + server.address().port;
    const routes = [];
    for (const profile of [
      { name: "desktop-1280", viewport: { width: 1280, height: 800 }, touch: false, scale: 100 },
      { name: "mobile-360-150", viewport: { width: 360, height: 640 }, touch: true, scale: 150 }
    ]) routes.push(await completeRoute(browser, url, profile, errors));
    const suspended = await suspendedRunSafety(browser, url, errors);
    const freshTouch = await freshTouchConfirmation(browser, url, errors);
    assert.deepEqual(errors, []);
    const report = { passed: true, routes, suspended, freshTouch, errors };
    fs.writeFileSync(path.join(output, "training-browser-report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
