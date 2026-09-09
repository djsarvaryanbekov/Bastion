"use strict";

const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
const output = path.join(root, "outputs", "action-onboarding-2026-09-09");
const primaryKey = "drift-bastion-save-v2";
const backupKey = primaryKey + "-backup";
const legacyKey = "drift-bastion-save-v1";
const logKey = "drift-bastion-playtest-v1";
const sentinelRun = { id: "settings-qa-history", endedAt: "2026-09-08T12:00:00.000Z", outcome: "death", summary: { elapsed: 71, kills: 24 } };
fs.mkdirSync(output, { recursive: true });
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  const file = path.resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
  if (path.relative(root, file).startsWith("..") || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.setHeader("Content-Type", { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml" }[path.extname(file)] || "application/octet-stream");
  let source = fs.readFileSync(file);
  // The fixture lives only in this ephemeral server/context; no user profile or save is opened.
  if (pathname === "/game.js") source = source.toString().replace("    window.__driftBastion = {",
    "    window.__settingsFixture = { current: () => game, saved: () => JSON.parse(JSON.stringify(save)), defaults: defaultSave };\n    window.__driftBastion = {");
  res.end(source);
});

async function saved(page) { return page.evaluate(() => window.__settingsFixture.saved()); }
async function snapshot(page) {
  return page.evaluate(() => {
    const game = window.__settingsFixture.current();
    return game && { matter: game.matter, modules: game.ship.tiles.size, enemies: game.enemies.length,
      projectiles: game.projectiles.length, bossHp: game.boss && game.boss.hp, state: game.state };
  });
}
async function storage(page) { return page.evaluate(() => Object.fromEntries(Object.entries(localStorage))); }
async function freshState(page, expectedSettings) {
  const value = await saved(page);
  const defaults = await page.evaluate(() => window.__settingsFixture.defaults());
  for (const key of ["fragments", "meta", "bestTime", "bestKills", "victories", "guidance", "onboarding", "progression", "campaign", "lastLoadout"]) {
    assert.deepEqual(value[key], defaults[key], "Reset must restore default " + key);
  }
  assert.deepEqual(value.settings, expectedSettings, "Reset must preserve every setting");
  return value;
}
async function reachable(locator, label) {
  await locator.scrollIntoViewIfNeeded();
  const result = await locator.evaluate(element => {
    const rect = element.getBoundingClientRect();
    let left = 0, top = 0, right = innerWidth, bottom = innerHeight;
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const bounds = parent.getBoundingClientRect(), style = getComputedStyle(parent);
      if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) { left = Math.max(left, bounds.left); right = Math.min(right, bounds.right); }
      if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) { top = Math.max(top, bounds.top); bottom = Math.min(bottom, bounds.bottom); }
    }
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return { visible: rect.left >= left - 1 && rect.top >= top - 1 && rect.right <= right + 1 && rect.bottom <= bottom + 1,
      receivesInput: Boolean(hit && (hit === element || element.contains(hit))), width: rect.width, height: rect.height };
  });
  assert.equal(result.visible, true, label + " must fit its scroll area: " + JSON.stringify(result));
  assert.equal(result.receivesInput, true, label + " must receive pointer input");
  return result;
}

async function prepare(browser, url, profile, errors, query = "", starter = "laser") {
  const context = await browser.newContext({ viewport: profile.viewport, isMobile: profile.touch, hasTouch: profile.touch, serviceWorkers: "block" });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on("pageerror", error => errors.push(profile.name + ": " + error.message));
  await page.addInitScript(fixture => {
    if (!sessionStorage.getItem("settings-qa-seeded")) {
      const seed = { version: 9, fragments: 321, meta: { core: 2, modules: 1, matter: 2, drive: 1, damage: 2 },
        bestTime: 420, bestKills: 180, victories: 3, guidance: { step: 4, complete: true }, onboarding: { version: 1, step: "complete", family: fixture.starter },
        progression: { schemaVersion: 4, purchasedModules: ["laser", "shield", "drive"], bestTime: 420, totalKills: 999, bossesDefeated: 3, totalUpgrades: 17, contractsCompleted: 2 },
        campaign: { schemaVersion: 2, completed: ["sector1-1"], mastered: ["sector1-1"], purchasedCores: ["bulwark"], selectedCore: "bulwark" },
        lastLoadout: { selectedWeapon: fixture.starter, tile: { x: 0, y: -1, type: fixture.starter } },
        settings: { muted: true, masterVolume: .35, shakeIntensity: .25, reducedFlash: true, damageNumbers: false, autoPause: true, qualityTier: 1, fpsLimit: 30, uiScale: fixture.scale, debugTools: false } };
      localStorage.setItem(fixture.primaryKey, JSON.stringify(seed));
      localStorage.setItem(fixture.backupKey, JSON.stringify({ ...seed, fragments: 777 }));
      localStorage.setItem(fixture.legacyKey, JSON.stringify({ ...seed, version: 1, fragments: 888 }));
      localStorage.setItem(fixture.logKey, JSON.stringify({ schemaVersion: 2, testerId: "qa-preserved-tester", createdAt: "2026-09-08T12:00:00.000Z", runs: [fixture.sentinelRun] }));
      localStorage.setItem("unrelated-application-setting", "preserve-me-exactly");
      sessionStorage.setItem("settings-qa-seeded", "1");
    }
  }, { primaryKey, backupKey, legacyKey, logKey, sentinelRun, scale: profile.scale, starter });
  await page.clock.install();
  await page.goto(url + query);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  return { context, page };
}

async function settingsAndReset(browser, url, profile, errors) {
  const { context, page } = await prepare(browser, url, profile, errors);
  try {
    const original = await saved(page);
    assert.equal(original.fragments, 321);
    assert.equal(original.onboarding.step, "complete");
    await page.locator("#menuSettingsButton").click();
    await reachable(page.locator("#debugToolsToggle"), profile.name + " debug toggle");
    await reachable(page.locator("#resetProgressButton"), profile.name + " reset control");
    assert.equal(await page.locator("#debugToolsToggle").isChecked(), false);
    const beforeCancelStorage = await storage(page);
    await page.locator("#resetProgressButton").click();
    assert.equal(await page.locator("#resetProgressConfirm").isVisible(), true);
    await reachable(page.locator("#confirmResetProgress"), profile.name + " reset confirmation");
    await reachable(page.locator("#cancelResetProgress"), profile.name + " reset cancellation");
    await page.screenshot({ path: path.join(output, profile.name + "-settings-reset.png") });
    await page.locator("#cancelResetProgress").click();
    assert.deepEqual(await saved(page), original, "Cancelling reset must preserve in-memory progress");
    assert.deepEqual(await storage(page), beforeCancelStorage, "Cancelling reset must preserve all storage");
    await reachable(page.locator("#resumeButton"), profile.name + " Settings close button");
    await page.locator("#resumeButton").click();
    await page.locator("#startButton").click();
    await page.evaluate(() => { window.__settingsPageIdentity = "unchanged"; });
    assert.equal(await page.locator("#debugBar").isVisible(), false);
    const disabledBefore = await snapshot(page);
    await page.evaluate(() => {
      for (const id of ["debugMatter", "debugBoss", "debugKillBoss", "debugStress", "debugDamage"]) document.getElementById(id).click();
      window.__driftBastion.addMatter(100);
      window.__driftBastion.spawnBoss();
    });
    assert.deepEqual(await snapshot(page), disabledBefore, "Disabled tools and public debug APIs must perform no gameplay action");
    await page.keyboard.press("p");
    await page.locator("#debugToolsToggle").check();
    await page.locator("#resumeButton").click();
    assert.equal(await page.evaluate(() => window.__settingsPageIdentity), "unchanged", "Enabling tools must not reload the page");
    assert.equal(await page.locator("#debugBar").isVisible(), true, "Enabling tools must show controls in the current run");
    const beforeFunding = await snapshot(page);
    await page.locator("#debugMatter").click();
    assert.equal((await snapshot(page)).matter, beforeFunding.matter + 100);
    await page.locator("#debugBoss").click();
    assert.ok((await snapshot(page)).bossHp > 0);
    await page.keyboard.press("p");
    await page.locator("#debugToolsToggle").uncheck();
    await page.locator("#resumeButton").click();
    assert.equal(await page.locator("#debugBar").isVisible(), false);
    const disabledBoss = await snapshot(page);
    await page.evaluate(() => { for (const id of ["debugMatter", "debugBoss", "debugKillBoss", "debugStress", "debugDamage"]) document.getElementById(id).click(); });
    assert.deepEqual(await snapshot(page), disabledBoss, "Disabling tools must also guard actions against an existing boss");
    await page.keyboard.press("p");
    const settingsBeforeReset = (await saved(page)).settings;
    await page.locator("#resetProgressButton").click();
    await page.locator("#confirmResetProgress").click();
    assert.equal(await page.locator("#menuOverlay").isVisible(), true, "Confirmed reset must return to the menu");
    assert.equal(await page.locator("#pauseOverlay").isVisible(), false);
    const resetValue = await freshState(page, settingsBeforeReset);
    const resetStorage = await storage(page);
    for (const key of [primaryKey, backupKey]) {
      const persisted = JSON.parse(resetStorage[key]);
      for (const field of ["fragments", "meta", "progression", "campaign", "lastLoadout", "guidance", "onboarding", "settings"]) assert.deepEqual(persisted[field], resetValue[field], key + " must contain reset " + field);
    }
    assert.equal(resetStorage[legacyKey], undefined, "Reset must clear the old legacy save");
    assert.equal(resetStorage["unrelated-application-setting"], "preserve-me-exactly");
    assert.deepEqual(JSON.parse(resetStorage[logKey]).runs.find(run => run.id === sentinelRun.id), sentinelRun, "Reset must preserve historical playtest logs");
    await page.reload();
    await freshState(page, settingsBeforeReset);
    await page.evaluate(key => localStorage.setItem(key, "{corrupted-primary"), primaryKey);
    await page.reload();
    await freshState(page, settingsBeforeReset);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), legacyKey), null);
    await page.locator("#startButton").click();
    assert.equal((await snapshot(page)).state, "playing", "Play must start a valid new run after reset and backup recovery");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    return { profile: profile.name, cancelledWithoutChanges: true, liveTools: true, resetAndBackupRecovery: true };
  } finally { await context.close(); }
}

async function sharedUpgradeScope(browser, url, errors) {
  const profile = { name: "shared-upgrade-scope", viewport: { width: 1280, height: 800 }, touch: false, scale: 100 };
  const { context, page } = await prepare(browser, url, profile, errors, "/?debug=1", "cannon");
  try {
    await page.locator("#startButton").click();
    assert.equal(await page.locator("#debugBar").isVisible(), true, "The debug URL must remain supported");
    await page.evaluate(() => window.__driftBastion.addMatter(1000));
    await page.locator("#buildButton").click();
    await page.locator('[data-type="cannon"]').click();
    await page.locator('.build-cell[data-x="1"][data-y="0"]').click();
    await page.locator('.build-cell[data-x="0"][data-y="-1"]').click();
    const scope = await page.locator("#buildUpgradePanel").innerText();
    assert.match(scope, /Cannon upgrades/i);
    assert.match(scope, /All 2 copies\s*\+\s*future copies/i);
    assert.match(scope, /This run/i);
    await page.locator('[data-weapon="cannon"][data-choice="tune"]').click();
    await page.locator('[data-weapon="cannon"][data-choice="twin"]').click();
    const volley = async () => page.evaluate(() => {
      const game = window.__settingsFixture.current();
      game.enemies.length = 0;
      game.enemyById.clear();
      game.projectiles.length = 0;
      game.ship.tiles.forEach(tile => { tile.cooldown = 0; });
      const target = game.spawnEnemy("scout", game.ship.x, game.ship.y - 130);
      target.hp = target.maxHp = 100000;
      game.rebuildEnemyGrid();
      game.updateWeapons(0);
      return { count: game.projectiles.filter(shot => shot.friendly).length, cooldowns: Array.from(game.ship.tiles.values()).filter(tile => tile.type === "cannon").map(tile => tile.cooldown), cooldown: game.weaponDefinitions.cannon.cooldown };
    });
    const twoCopies = await volley();
    assert.equal(twoCopies.count, 4, "Both existing copies must fire the chosen twin volley");
    assert.ok(twoCopies.cooldowns.every(value => value === twoCopies.cooldown));
    await page.locator('[data-type="cannon"]').click();
    await page.locator('.build-cell[data-x="-1"][data-y="0"]').click();
    const threeCopies = await volley();
    assert.equal(threeCopies.count, 6, "A later purchased third copy must inherit the actual twin firing behavior");
    assert.ok(threeCopies.cooldowns.every(value => value === twoCopies.cooldown));
    assert.match(await page.locator("#buildUpgradePanel").innerText(), /All 3 copies\s*\+\s*future copies\s*·\s*This run/i);
    await page.screenshot({ path: path.join(output, "shared-upgrade-scope.png") });
    return { existingCopies: 2, existingProjectiles: 4, laterCopies: 3, laterProjectiles: 6 };
  } finally { await context.close(); }
}

async function failedResetKeepsProgress(browser, url, errors) {
  const profile = { name: "failed-reset-storage", viewport: { width: 1280, height: 800 }, touch: false, scale: 100 };
  const { context, page } = await prepare(browser, url, profile, errors);
  try {
    await page.locator("#menuSettingsButton").click();
    const before = await saved(page), beforeStorage = await storage(page);
    await page.locator("#resetProgressButton").click();
    await page.evaluate(keys => {
      const originalSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (keys.includes(key)) throw new DOMException("Isolated QA write failure", "QuotaExceededError");
        return originalSet.call(this, key, value);
      };
    }, [primaryKey, backupKey]);
    await page.locator("#confirmResetProgress").click();
    assert.deepEqual(await saved(page), before, "Failed reset must preserve the in-memory progression");
    assert.deepEqual(await storage(page), beforeStorage, "Failed first write must leave the original saves intact");
    assert.equal(await page.locator("#pauseOverlay").isVisible(), true, "A failed reset must keep the Settings context open");
    assert.doesNotMatch(await page.locator("#toast").innerText(), /progress (?:was )?reset|reset complete/i);
    await page.screenshot({ path: path.join(output, "reset-write-failure.png") });
    return true;
  } finally { await context.close(); }
}

(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    const url = "http://127.0.0.1:" + server.address().port;
    const layouts = [];
    for (const profile of [
      { name: "desktop-1280", viewport: { width: 1280, height: 800 }, touch: false, scale: 100 },
      { name: "mobile-360-150", viewport: { width: 360, height: 640 }, touch: true, scale: 150 }
    ]) layouts.push(await settingsAndReset(browser, url, profile, errors));
    const upgrades = await sharedUpgradeScope(browser, url, errors);
    const failedWritePreservesProgress = await failedResetKeepsProgress(browser, url, errors);
    assert.deepEqual(errors, []);
    const report = { passed: true, layouts, upgrades, failedWritePreservesProgress,
      checks: ["Live debug toggle without reload", "Disabled controls and APIs have no effect", "Legacy debug URL remains usable", "Inline reset cancellation preserves all state", "Reset preserves settings, playtest history and unrelated storage", "Primary and backup reset; legacy removed", "Reload and corrupt-primary fallback cannot resurrect progress", "Play works after reset", "Settings reachable at 360×640 with 150% text", "Scope text matches existing and later copies", "Actual shared twin firing for two and three copies", "Failed write preserves progress"], errors };
    fs.writeFileSync(path.join(output, "settings-report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
