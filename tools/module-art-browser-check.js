"use strict";
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
const file = path.resolve(process.argv[2] || path.join(root, "outputs/Drift_Bastion_Playtest.html"));
const output = path.resolve(process.argv[3] || path.join(root, "outputs/module-art-qa"));
const types = ["armor", "missile", "rail", "laser", "arc", "scatter", "flak", "pulse", "cryo", "mine", "ember", "gravity", "shield", "repair", "collector", "bulkhead", "reactor"];

// QA inventory: offline boot; complete sprite roster/alpha; fixed platforms and
// bearings vs aimed upper assemblies; catalog/build/preview/combat; mobile fit;
// legacy Reactor/Core fallback; save reload; failure fallback without art.
(async function () {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const errors = [], report = {};
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(({ types }) => {
      if (localStorage.getItem("art-qa-seeded")) return;
      localStorage.setItem("art-qa-seeded", "yes");
      localStorage.setItem("drift-bastion-save-v2", JSON.stringify({ version: 9, fragments: 1234,
        progression: { schemaVersion: 4, purchasedModules: types, branchLicenses: [] },
        campaign: { purchasedCores: ["striker"], selectedCore: "standard", coreRanks: { standard: { modules: 25, damage: 0, matter: 0, drive: 0 } } },
        settings: { muted: true }, training: { completed: true } }));
    }, { types });
    await page.goto(pathToFileURL(file).href + "?debug=1");
    const loaded = await page.evaluate(() => window.DriftModuleArt.ready);
    await page.clock.install();
    console.log("Offline boot and sprite decode passed");
    assert.equal(loaded.length, 20); assert.ok(loaded.every(Boolean));
    report.spriteChecks = await page.evaluate(() => {
      const art = window.DriftModuleArt, data = window.DriftModuleArtData;
      const result = {};
      for (const [type, sprite] of Object.entries(data)) {
        const canvas = document.createElement("canvas"); canvas.width = canvas.height = 160;
        const ctx = canvas.getContext("2d");
        art.drawBase(ctx, type, 80, 80, 60);
        const base = canvas.toDataURL();
        art.drawEquipment(ctx, type, 80, 80, 60, 0);
        const east = canvas.toDataURL();
        ctx.clearRect(0, 0, 160, 160); art.drawBase(ctx, type, 80, 80, 60);
        const sameBase = base === canvas.toDataURL();
        art.drawEquipment(ctx, type, 80, 80, 60, Math.PI / 2);
        result[type] = { sameBase, changesWithAim: east !== canvas.toDataURL(), rotates: sprite.rotates };
      }
      return result;
    });
    for (const [type, check] of Object.entries(report.spriteChecks)) {
      assert.ok(check.sameBase, type + " base changed");
      assert.equal(check.changesWithAim, check.rotates, type + " rotation policy");
    }
    await page.locator("#startButton").click();
    console.log("Rotation policy passed; assembling ship");
    await page.evaluate(() => window.__driftBastion.addMatter(100000));
    await page.locator("#buildButton").click();
    const positions = [[1,0],[-1,0],[0,1],[1,-1],[-1,-1],[1,1],[-1,1],[2,0],[-2,0],[0,2],[0,-2],[2,-1],[-2,-1],[2,1],[-2,1],[1,2],[-1,2]];
    for (let index = 0; index < types.length; index++) {
      await page.locator('#catalog [data-type="' + types[index] + '"]').click();
      const [x,y] = positions[index];
      await page.locator('.build-cell[data-x="' + x + '"][data-y="' + y + '"]').click();
      console.log("Placed " + types[index]);
    }
    const state = await page.evaluate(() => window.__driftBastion.getState());
    assert.equal(state.modules, 19);
    assert.equal(state.coreId, "standard");
    assert.equal(await page.locator(".build-cell.has-module-art").count(), 18);
    await page.screenshot({ path: path.join(output, "build-desktop.png") });
    await page.locator('.build-cell[data-x="0"][data-y="-1"]').click();
    await page.locator("#buildModulePreview").click();
    await page.clock.runFor(500);
    await page.screenshot({ path: path.join(output, "module-preview.png") });
    await page.keyboard.press("Escape");
    await page.locator("#closeBuild").click();
    await page.clock.runFor(1200);
    await page.screenshot({ path: path.join(output, "combat-desktop.png") });
    await page.keyboard.down("d"); await page.clock.runFor(800); await page.keyboard.up("d");
    await page.clock.runFor(8000);
    report.combat = await page.evaluate(() => window.__driftBastion.getState());
    assert.ok(report.combat.elapsed > 5);
    await page.screenshot({ path: path.join(output, "combat-rotated.png") });
    await page.locator("#buildButton").click();
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: path.join(output, "build-wide.png") });
    console.log("Desktop combat, preview and layouts passed");
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.reload();
    report.persistedFragments = (await page.evaluate(() => window.__driftBastion.getState())).fragments;
    assert.equal(report.persistedFragments, 1234);
    console.log("Save reload passed");
    await page.locator("#hangarMenuButton").click();
    await page.locator('#corePicker [data-core="striker"]').click();
    await page.locator("#closeHangar").click();
    await page.locator("#startButton").click();
    assert.equal((await page.evaluate(() => window.__driftBastion.getState())).coreId, "striker");
    await page.locator("#buildButton").click();
    assert.equal(await page.locator(".build-cell.core.has-module-art").count(), 0);
    report.legacyCore = true;
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const mobilePage = await mobile.newPage(); mobilePage.on("pageerror", error => errors.push(error.message));
    await mobilePage.goto(pathToFileURL(file).href);
    await mobilePage.evaluate(() => window.DriftModuleArt.ready);
    await mobilePage.clock.install();
    await mobilePage.locator("#startTrainingButton").click();
    await mobilePage.clock.runFor(500);
    await mobilePage.screenshot({ path: path.join(output, "training-mobile.png") });
    await mobilePage.locator("#trainingOpenBuildButton").click();
    await mobilePage.screenshot({ path: path.join(output, "build-mobile.png") });
    console.log("Mobile screenshots captured");
    assert.equal(await mobilePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    console.log("Mobile layout passed");
    report.mobile = true;
    const fallback = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const fallbackPage = await fallback.newPage();
    fallbackPage.on("pageerror", error => errors.push(error.message));
    await fallbackPage.addInitScript(() => Object.defineProperty(window, "DriftModuleArt", { get: () => null, set: () => {} }));
    await fallbackPage.goto(pathToFileURL(file).href);
    await fallbackPage.locator("#startTrainingButton").click();
    assert.equal((await fallbackPage.evaluate(() => window.__driftBastion.getState())).mode, "training");
    report.missingArtFallback = true;
    assert.deepEqual(errors, []); report.errors = errors; report.passed = true;
    fs.writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ passed: true, sprites: loaded.length, modules: state.modules, mobile: true, errors }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
