"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

const playtest = path.resolve(__dirname, "../outputs/Drift_Bastion_Playtest.html");
const captures = path.resolve(__dirname, "../outputs/qa/mobile-v21");

(async () => {
  fs.mkdirSync(captures, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  const report = { passed: false, captures: [] };

  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true
    });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem("drift-bastion-save-v2", JSON.stringify({
        version: 9,
        fragments: 5000,
        settings: { muted: true },
        progression: {
          schemaVersion: 4,
          purchasedModules: ["armor", "missile", "rail", "laser", "arc", "scatter", "flak", "pulse", "cryo", "mine", "ember", "gravity", "shield", "repair", "collector", "bulkhead", "reactor"],
          branchLicenses: []
        },
        training: { completed: true }
      }));
    });

    await page.goto(pathToFileURL(playtest).href + "?qa=mobile-v21", { waitUntil: "load" });
    await page.waitForFunction(() => window.DriftPCGame && window.__driftBastion);
    await page.screenshot({ path: path.join(captures, "menu-390x844.png") });
    report.captures.push("menu-390x844.png");

    const viewport = await page.locator("#pcViewport").boundingBox();
    assert.equal(Math.round(viewport.width), 390);
    assert.equal(Math.round(viewport.height), 844);
    assert.equal(await page.locator("#mobileControls").evaluate(node => getComputedStyle(node).display), "block");

    await page.locator("#startButton").click();
    await page.locator("#mobileBuildButton").click();
    await page.locator("#catalog .catalog-card").first().waitFor();
    assert.ok(await page.locator("#catalog").evaluate(node => node.scrollWidth >= node.clientWidth));
    await page.locator("#catalog [data-type=\"scatter\"]").click();
    await page.screenshot({ path: path.join(captures, "build-390x844.png") });
    report.captures.push("build-390x844.png");

    await page.locator("#pcUpgradesTab").click();
    await page.screenshot({ path: path.join(captures, "upgrades-390x844.png") });
    report.captures.push("upgrades-390x844.png");
    assert.ok(await page.locator(".pc-tree-open .pc-installed-families").count());
    await page.locator("#closeBuild").click();

    await page.locator("#mobilePauseButton").click();
    await page.locator("#pauseHangarButton").click();
    await page.locator("#hangarButton").click();
    await page.locator("#hangarWeaponTab").click();
    await page.screenshot({ path: path.join(captures, "hangar-390x844.png") });
    report.captures.push("hangar-390x844.png");
    assert.ok(await page.locator(".hangar-screen").count());
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await context.close();

    const landscape = await browser.newContext({
      viewport: { width: 844, height: 390 },
      isMobile: true,
      hasTouch: true
    });
    const landscapePage = await landscape.newPage();
    landscapePage.on("pageerror", error => errors.push(error.message));
    await landscapePage.goto(pathToFileURL(playtest).href + "?qa=mobile-v21-landscape", { waitUntil: "load" });
    await landscapePage.waitForFunction(() => window.DriftPCGame && window.__driftBastion);
    await landscapePage.screenshot({ path: path.join(captures, "menu-844x390.png") });
    report.captures.push("menu-844x390.png");
    const landscapeViewport = await landscapePage.locator("#pcViewport").boundingBox();
    assert.equal(Math.round(landscapeViewport.width), 844);
    assert.equal(Math.round(landscapeViewport.height), 390);
    await landscape.close();

    assert.deepEqual(errors, []);
    report.passed = true;
    report.errors = errors;
    fs.writeFileSync(path.join(captures, "report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
