"use strict";

// Regression check for the landscape phone export (outputs/Drift_Bastion_Mobile.html, also inside the APK).
// Usage: node tools/mobile-share-check.cjs [mobile.html]
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const file = path.resolve(process.argv[2] || path.join(root, "outputs/Drift_Bastion_Mobile.html"));
const captures = path.join(root, "outputs/qa/mobile-share");
const SAVE_KEY = "drift-bastion-mobile-review-save-v2";
const SIZES = [{ width: 640, height: 360 }, { width: 844, height: 390 }, { width: 932, height: 430 }];
const html = fs.readFileSync(file, "utf8");
for (const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) new vm.Script(script[1]);
assert.ok(!/<script[^>]+src=|<link[^>]+href="(?!data:)/i.test(html), "No external scripts or styles");
assert.ok(!html.includes('"drift-bastion-save-v2"') && !html.includes('"drift-bastion-playtest-v1"'), "Isolated storage");
fs.mkdirSync(captures, { recursive: true });
const report = { passed: false, captures: [], checks: [], errors: [] };

// Visible defects in the topmost layer: clipped or off-screen text and controls, or controls covered by other UI.
function layoutDefects() {
  const vw = innerWidth, vh = innerHeight, found = [];
  const shown = el => {
    for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity) < 0.05) return false;
    }
    return true;
  };
  const label = el => (el.id ? "#" + el.id : el.tagName.toLowerCase() + "." + String(el.className).split(" ")[0]) + ' "' + (el.textContent || "").trim().slice(0, 24) + '"';
  const scrolls = style => /(auto|scroll)/.test(style.overflowX + style.overflowY);
  const layers = Array.from(document.querySelectorAll(".overlay, .crash-overlay, .rotate-notice"))
    .filter(node => shown(node) && node.getBoundingClientRect().width > 0)
    .map((node, order) => ({ node, order, z: parseInt(getComputedStyle(node).zIndex, 10) || 0 }))
    .sort((a, b) => b.z - a.z || b.order - a.order);
  const scope = layers.length ? layers[0].node : document.getElementById("pcViewport");
  if (document.documentElement.scrollWidth > vw + 1 || document.documentElement.scrollHeight > vh + 1) found.push("page scrolls");
  for (const el of scope.querySelectorAll("button, select, input, h2, h3, p, strong, small, span, label")) {
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1 || !shown(el) || el.closest("#debugBar")) continue;
    let scroller = null;
    for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (scrolls(style)) { scroller = node; break; }
      if (style.overflowX !== "visible" || style.overflowY !== "visible") {
        const box = node.getBoundingClientRect();
        if (node.id !== "pcViewport" && (rect.left < box.left - 1.5 || rect.right > box.right + 1.5 || rect.top < box.top - 1.5 || rect.bottom > box.bottom + 1.5)) { found.push("clipped " + label(el)); break; }
      }
    }
    if (scroller) {
      // Outside the scroll box is fine only on an axis the player can actually scroll.
      const box = scroller.getBoundingClientRect(), style = getComputedStyle(scroller);
      const outX = rect.right <= box.left + 1 || rect.left >= box.right - 1;
      const outY = rect.bottom <= box.top + 1 || rect.top >= box.bottom - 1;
      if ((outX && !/(auto|scroll)/.test(style.overflowX)) || (outY && !/(auto|scroll)/.test(style.overflowY))) { found.push("unreachable " + label(el)); continue; }
      const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
      if (outX || outY || cx < box.left || cx > box.right || cy < box.top || cy > box.bottom) continue;
    } else if (rect.left < -1 || rect.top < -1 || rect.right > vw + 1 || rect.bottom > vh + 1) found.push("off-screen " + label(el));
    if (!el.matches("button, select, input")) continue;
    const hit = document.elementFromPoint(Math.min(vw - 1, rect.left + rect.width / 2), Math.min(vh - 1, rect.top + rect.height / 2));
    if (hit && hit !== el && !el.contains(hit) && !hit.contains(el) && hit.id !== "gameCanvas") found.push("covered " + label(el) + " by " + label(hit));
  }
  return found;
}

async function newPage(browser, size, language) {
  const context = await browser.newContext({ viewport: size, isMobile: true, hasTouch: true, offline: true, locale: "en-US" });
  const page = await context.newPage();
  page.on("pageerror", error => report.errors.push(error.message));
  await page.addInitScript(([key, lang]) => {
    if (sessionStorage.getItem("check-seeded")) return;
    localStorage.clear();
    localStorage.setItem("drift-bastion-save-v2", "pc-profile-sentinel");
    localStorage.setItem(key, JSON.stringify({ version: 9, fragments: 5000, settings: { muted: true }, training: { completed: true },
      progression: { schemaVersion: 4, purchasedModules: ["armor", "missile", "rail", "laser", "scatter", "shield", "repair"], branchLicenses: [] } }));
    if (lang) localStorage.setItem("bastion-language", lang);
    sessionStorage.setItem("check-seeded", "1");
  }, [SAVE_KEY, language]);
  await page.goto(pathToFileURL(file).href + "?debug=1", { waitUntil: "load" });
  await page.waitForFunction(() => window.DriftPCGame && window.__driftBastion && !document.body.classList.contains("pc-ui-pending"));
  return { context, page };
}

async function capture(page, name, size) {
  await page.waitForTimeout(350);
  const output = name + "-" + size.width + "x" + size.height + ".png";
  await page.screenshot({ path: path.join(captures, output) });
  report.captures.push(output);
  assert.deepEqual(await page.evaluate(layoutDefects), [], name + " at " + size.width + "x" + size.height + " has layout defects");
}

(async function () {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const size of SIZES) {
      const { context, page } = await newPage(browser, size);
      const box = await page.locator("#pcViewport").boundingBox();
      assert.equal(Math.round(box.width), size.width);
      assert.equal(Math.round(box.height), size.height);
      assert.deepEqual(await page.evaluate(() => BastionI18n.languages.map(language => language.code)), ["en", "ru", "uz"], "Phone build ships EN/RU/UZ");
      assert.deepEqual(await page.evaluate(() => Object.keys(BastionLocales).sort()), ["ru", "uz"]);
      await capture(page, "menu", size);
      assert.equal(await page.evaluate(() => bastionHandleBack()), false, "Back on the bare menu leaves the app");

      await page.locator("#hangarMenuButton").tap();
      await page.locator("#hangarWeaponTab").tap();
      await capture(page, "hangar", size);
      assert.ok(await page.locator("#weaponPicker").evaluate(el => el.scrollHeight > el.clientHeight && getComputedStyle(el).overflowY === "auto"), "Module catalog scrolls");
      await page.locator("#closeHangar").tap();

      await page.locator("#startEndlessButton").tap();
      assert.equal(await page.evaluate(() => __driftBastion.getState().screen), "playing");
      await page.evaluate(() => __driftBastion.setInvulnerable(true));
      const cdp = await context.newCDPSession(page);
      const target = { x: Math.round(size.width * .8), y: Math.round(size.height * .42), id: 1 };
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [target] });
      assert.equal(await page.evaluate(() => DriftPCGame.presentation().inputActive), true);
      const initial = await page.evaluate(() => __driftBastion.getState().ship);
      await page.evaluate(() => __driftBastion.advance(.5));
      const moving = await page.evaluate(() => __driftBastion.getState().ship);
      assert.ok(moving.x > initial.x, "Finger target steers and thrusts");
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [target, { x: 40, y: 100, id: 2 }] });
      assert.equal(await page.evaluate(() => DriftPCGame.presentation().inputActive), true, "Second finger cannot steal control");
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      const released = await page.evaluate(() => __driftBastion.getState().ship);
      assert.ok(Math.hypot(released.vx, released.vy) > 0, "Release keeps momentum");
      await capture(page, "combat", size);
      await page.locator("#mobileBuildButton").tap();
      await page.locator("#catalog .catalog-card").first().waitFor();
      await capture(page, "build", size);
      await page.locator("#closeBuild").tap();
      assert.equal(await page.evaluate(() => bastionHandleBack()), true);
      assert.equal(await page.evaluate(() => __driftBastion.getState().screen), "paused", "Back pauses a run");
      assert.ok(!/\[[A-Z]\]/.test(await page.locator("#resumeButton").textContent()), "No keyboard hints on touch");
      await capture(page, "pause", size);
      await page.locator("#pauseHangarButton").tap();
      await capture(page, "results", size);
      await page.locator("#pcResultsMenu").tap();

      await page.locator("#startButton").tap();
      await page.evaluate(() => { __driftBastion.setInvulnerable(true); __driftBastion.endWave(); });
      await page.waitForFunction(() => (__driftBastion.waveState() || {}).state === "intermission", null, { timeout: 15000 });
      await capture(page, "wave-break", size);
      await page.locator("#cardChoices button").first().tap();
      await page.locator("#nextWaveButton").tap();
      assert.equal(await page.evaluate(() => __driftBastion.getState().screen), "playing", "Start wave is reachable");

      await page.evaluate(() => document.fullscreenElement ? document.exitFullscreen() : null);
      await page.waitForTimeout(200);
      await page.setViewportSize({ width: size.height, height: size.width });
      await page.waitForFunction(() => __driftBastion.getState().screen === "paused", null, { timeout: 3000 });
      assert.equal(await page.locator(".rotate-notice").evaluate(el => getComputedStyle(el).display), "flex", "Upright phone sees the rotate prompt");
      await capture(page, "upright", { width: size.height, height: size.width });
      await page.setViewportSize(size);
      assert.equal(await page.evaluate(() => localStorage.getItem("drift-bastion-save-v2")), "pc-profile-sentinel", "PC profile untouched");
      report.checks.push(size.width + "x" + size.height + ": menu, Hangar, touch steering/coast, multitouch, Build, back/pause, results, wave break, upright prompt, EN/RU/UZ only");
      await context.close();
    }

    for (const [language, text] of [["ru", "Начать забег"], ["uz", "Safarni boshlash"]]) {
      const { context, page } = await newPage(browser, SIZES[0], language);
      assert.equal((await page.locator("#startButton strong").textContent()).trim(), text, language + " menu is translated");
      report.checks.push(language + ": menu translated");
      await capture(page, "menu-" + language, SIZES[0]);
      await context.close();
    }

    const fullscreenContext = await browser.newContext({ viewport: SIZES[1], isMobile: true, hasTouch: true });
    const fullscreenPage = await fullscreenContext.newPage();
    await fullscreenPage.goto(pathToFileURL(file).href);
    await fullscreenPage.waitForFunction(() => window.DriftPCGame && !document.body.classList.contains("pc-ui-pending"));
    await fullscreenPage.locator("#pcFullscreen").tap();
    await fullscreenPage.waitForFunction(() => !!document.fullscreenElement);
    assert.equal(await fullscreenPage.locator("#pcFullscreen").isVisible(), false, "No fullscreen button while fullscreen");
    await fullscreenPage.evaluate(() => document.exitFullscreen());
    await fullscreenPage.waitForFunction(() => !document.fullscreenElement);
    await fullscreenPage.locator("#hangarMenuButton").tap();
    await fullscreenPage.waitForFunction(() => !!document.fullscreenElement, null, { timeout: 3000 });
    report.checks.push("Chromium: fullscreen on tap, re-entered by the next tap after leaving it");
    await fullscreenContext.close();

    assert.deepEqual(report.errors, []);
    report.passed = true;
    console.log(JSON.stringify(report, null, 2));
  } finally {
    fs.writeFileSync(path.join(captures, "report.json"), JSON.stringify(report, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
