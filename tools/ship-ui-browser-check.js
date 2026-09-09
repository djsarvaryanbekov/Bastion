"use strict";

const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
const output = path.join(root, "outputs", "ship-ui-2026-09-09");
const purchasedModules = ["scatter", "shield", "drive", "missile", "repair", "laser", "reactor"];
const ownedModules = ["cannon", "armor"].concat(purchasedModules).sort();
fs.mkdirSync(output, { recursive: true });
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  const file = path.resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
  if (path.relative(root, file).startsWith("..") || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.setHeader("Content-Type", { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" }[path.extname(file)] || "application/octet-stream");
  let source = fs.readFileSync(file);
  // Isolated browser fixtures preserve the production API and do not represent earned progress.
  if (pathname === "/game.js") source = source.toString().replace("    window.__driftBastion = {",
    "    window.__shipUiFixture = { current: () => game, save, makeTile, updateHud };\n    window.__driftBastion = {");
  res.end(source);
});

function cell(page, x, y) { return page.locator('.build-cell[data-x="' + x + '"][data-y="' + y + '"]'); }

async function controlGeometry(locator) {
  return locator.evaluate(element => {
    const rect = element.getBoundingClientRect();
    let left = Math.max(0, rect.left), top = Math.max(0, rect.top);
    let right = Math.min(innerWidth, rect.right), bottom = Math.min(innerHeight, rect.bottom);
    const clippingParents = [];
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const bounds = parent.getBoundingClientRect(), style = getComputedStyle(parent);
      if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) { left = Math.max(left, bounds.left); right = Math.min(right, bounds.right); }
      if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) { top = Math.max(top, bounds.top); bottom = Math.min(bottom, bounds.bottom); }
      if ((/(auto|scroll|hidden|clip)/.test(style.overflowY) && (rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1)) ||
          (/(auto|scroll|hidden|clip)/.test(style.overflowX) && (rect.left < bounds.left - 1 || rect.right > bounds.right + 1))) {
        clippingParents.push({ element: parent.id || parent.className, x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height });
      }
    }
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return {
      x: rect.x, y: rect.y, width: rect.width, height: rect.height,
      fullyVisible: left <= rect.left + 1 && top <= rect.top + 1 && right >= rect.right - 1 && bottom >= rect.bottom - 1,
      unobstructed: Boolean(hit && (hit === element || element.contains(hit))),
      textClipped: element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1,
      clippingParents
    };
  });
}

async function assertControl(locator, description, checkText = true) {
  const geometry = await controlGeometry(locator);
  assert.equal(geometry.fullyVisible, true, description + " must fit its visible scroll area: " + JSON.stringify(geometry));
  assert.equal(geometry.unobstructed, true, description + " must receive pointer input");
  if (checkText) assert.equal(geometry.textClipped, false, description + " text must not be clipped");
  return geometry;
}

async function assertShipBesideUpgrade(page, description) {
  assert.equal(await page.locator("#buildGrid").isVisible(), true);
  assert.equal(await page.locator("#buildUpgradePanel").isVisible(), true);
  const ship = await assertControl(cell(page, 0, 0), description + " core", false);
  const upgrade = await assertControl(page.locator("#upgradeList .upgrade-option").first(), description + " upgrade");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "Build must not overflow the document horizontally");
  return { ship, upgrade };
}

async function prepare(browser, url, profile, errors) {
  const context = await browser.newContext({ viewport: profile.viewport, isMobile: profile.touch, hasTouch: profile.touch, serviceWorkers: "block" });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(profile.name + ": " + error.message));
  page.setDefaultTimeout(10000);
  await page.addInitScript(fixture => {
    const key = "drift-bastion-save-v2";
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({
      version: 9, fragments: 37, guidance: { complete: false, step: 2 },
      progression: { schemaVersion: 4, purchasedModules: fixture.purchasedModules, bestTime: 420, totalKills: 350, bossesDefeated: 3 },
      settings: { muted: true, uiScale: fixture.scale },
      lastLoadout: { selectedWeapon: "cannon", tile: { x: 0, y: -1, type: "cannon" } }
    }));
    let seed = 43;
    Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  }, { purchasedModules, scale: profile.scale });
  await page.clock.install(); await page.goto(url);
  return { context, page };
}

(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ headless: true });
  const errors = [], checks = [], layouts = [];
  try {
    const url = "http://127.0.0.1:" + server.address().port;
    const profiles = [
      { name: "desktop-1280", viewport: { width: 1280, height: 800 }, touch: false, scale: 100 },
      { name: "mobile-390", viewport: { width: 390, height: 844 }, touch: true, scale: 100 },
      { name: "mobile-360-150", viewport: { width: 360, height: 640 }, touch: true, scale: 150 }
    ];
    for (const profile of profiles) {
      const { context, page } = await prepare(browser, url, profile, errors);
      assert.equal(await page.locator("#guidePanel, #replayGuideButton, #skipGuideButton, #buildAddTab, #buildUpgradeTab, #upgradeFamilyPicker, #catalogBrowseButton, #catalogFilters, #armoryBrowseButton, #previousWeaponButton, #nextWeaponButton, #menuObjectiveText").count(), 0,
        "Removed teaching, catalog reveal and separate upgrade controls must not remain in the interface");
      await assertControl(page.locator("#menuLoadoutButton"), profile.name + " loadout button");
      await page.screenshot({ path: path.join(output, profile.name + "-menu.png") });
      await page.locator("#menuLoadoutButton").click();
      assert.equal(await page.locator("#weaponPicker").isVisible(), true);
      assert.equal(await page.locator("#weaponPicker .pick-button").count(), 19, "Hangar must render every existing module directly");
      const missile = page.locator('[data-module="missile"]');
      await missile.scrollIntoViewIfNeeded(); await assertControl(missile, profile.name + " owned starter weapon");
      await missile.click();
      assert.equal(await page.locator("#modulePreviewDialog").isVisible(), true);
      assert.equal(await page.evaluate(() => window.__shipUiFixture.save.lastLoadout.selectedWeapon), "cannon", "Viewing an owned weapon cannot change the starting loadout");
      await page.locator("#modulePreviewAction").click();
      if (await page.locator("#modulePreviewDialog").isVisible()) await page.locator("#modulePreviewClose").click();
      assert.match(await missile.innerText(), /Starting weapon/);
      await page.locator("#closeHangar").click();
      assert.match(await page.locator("#startWeaponName").innerText(), /Missile/);
      await page.reload();
      assert.equal(await page.evaluate(() => window.__shipUiFixture.save.lastLoadout.selectedWeapon), "missile");
      assert.equal(await page.evaluate(() => window.__shipUiFixture.save.fragments), 37);
      assert.deepEqual((await page.evaluate(() => window.__shipUiFixture.save.progression.purchasedModules)).sort(), purchasedModules.slice().sort());
      await page.locator("#menuLoadoutButton").click();
      await page.locator('[data-module="cannon"]').click();
      await page.locator("#modulePreviewAction").click();
      if (await page.locator("#modulePreviewDialog").isVisible()) await page.locator("#modulePreviewClose").click();
      await page.locator("#closeHangar").click();

      await page.locator("#hangarMenuButton").click();
      assert.equal(await page.locator("#metaList").isVisible(), true, "Regular Hangar entry must open permanent upgrades");
      assert.equal(await page.locator("#metaList").evaluate(element => Boolean(element.closest("details"))), false);
      const permanent = page.locator("#metaList .meta-card:not(.hidden)").first();
      await assertControl(permanent, profile.name + " permanent upgrade");
      await permanent.click();
      assert.equal(await page.evaluate(() => window.__shipUiFixture.save.meta.modules), 1);
      assert.equal(await page.evaluate(() => window.__shipUiFixture.save.fragments), 32, "A permanent upgrade must charge once");
      await page.screenshot({ path: path.join(output, profile.name + "-permanent.png") });
      await page.locator("#closeHangar").click();
      await page.reload();
      assert.equal(await page.evaluate(() => window.__shipUiFixture.save.meta.modules), 1);
      assert.equal(await page.evaluate(() => window.__shipUiFixture.save.fragments), 32);

      await page.locator("#startButton").click();
      // Funds and a small multi-weapon ship isolate UI routing from combat earnings.
      await page.evaluate(() => {
        const f = window.__shipUiFixture, game = f.current();
        game.matter = 500;
        game.ship.tiles.set("1,0", f.makeTile("cannon", 1, 0, false));
        game.ship.tiles.set("-1,0", f.makeTile("laser", -1, 0, false));
        f.updateHud();
      });
      if (profile.touch) await page.locator(".mobile-build").tap();
      else await page.locator("#buildButton").click();
      assert.deepEqual((await page.locator("#catalog .catalog-card").evaluateAll(elements => elements.map(element => element.dataset.type))).sort(), ownedModules);
      const catalogGeometry = [];
      for (const type of ownedModules) catalogGeometry.push({ type, ...await controlGeometry(page.locator('[data-type="' + type + '"]')) });
      if (!profile.touch) for (const module of catalogGeometry) assert.equal(module.fullyVisible, true, "All nine owned modules must be visible on desktop: " + module.type);
      assert.equal(await page.locator("#buildSelection .module-role").innerText(), "ADD MODULE", "The catalog inspector must identify a purchase");
      assert.equal(await cell(page, 1, -1).innerText(), "+", "Buying a module uses an addition target");
      await cell(page, 0, -1).click();
      assert.equal(await page.locator("#buildModuleDetails .module-role").innerText(), "INSTALLED", "The inspector must identify an existing module");
      assert.notEqual(await cell(page, 1, -1).innerText(), "↔", "Installed selection must not offer a move target");
      assert.equal(await page.locator(".sell-module-button").innerText(), "Remove", "A zero-refund starter must not advertise a positive sale");
      const beforeEmptyClick = await page.evaluate(() => ({ matter: window.__shipUiFixture.current().matter, tiles: Array.from(window.__shipUiFixture.current().ship.tiles) }));
      const emptyCell = await cell(page, 1, -1).boundingBox();
      if (profile.touch) await page.touchscreen.tap(emptyCell.x + emptyCell.width / 2, emptyCell.y + emptyCell.height / 2);
      else await page.mouse.click(emptyCell.x + emptyCell.width / 2, emptyCell.y + emptyCell.height / 2);
      assert.equal(await cell(page, 0, -1).evaluate(element => element.classList.contains("selected-installed")), true);
      assert.deepEqual(await page.evaluate(() => ({ matter: window.__shipUiFixture.current().matter, tiles: Array.from(window.__shipUiFixture.current().ship.tiles) })), beforeEmptyClick,
        "Empty cells cannot move or buy while inspecting an installed module");
      if (!profile.touch) {
        await cell(page, 0, -1).focus(); await page.keyboard.press("Enter");
        assert.equal(await cell(page, 0, -1).evaluate(element => element === document.activeElement), true,
          "Keyboard selection must retain focus after rebuilding the grid");
      }
      assert.match(await page.locator("#buildModuleDetails").innerText(), /Auto Cannon/);
      assert.equal(await page.locator("#upgradeList .upgrade-card").count(), 1);
      assert.match(await page.locator("#upgradeList").innerText(), /All 2 copies/);
      await page.screenshot({ path: path.join(output, profile.name + "-ship-upgrade.png") });
      const geometry = await assertShipBesideUpgrade(page, profile.name);
      const before = await page.evaluate(() => ({ matter: window.__shipUiFixture.current().matter, tiles: window.__shipUiFixture.current().ship.tiles.size }));
      const tune = page.locator('[data-weapon="cannon"][data-choice="tune"]');
      const cost = Number((await tune.locator("b").innerText()).match(/\d+/)[0]);
      if (profile.touch) await tune.tap();
      else { await tune.focus(); await page.keyboard.press("Enter"); }
      assert.equal(await page.evaluate(() => window.__shipUiFixture.current().upgrades.cannon.level), 1);
      assert.equal(await page.evaluate(() => window.__shipUiFixture.current().matter), before.matter - cost);
      assert.equal(await page.evaluate(() => window.__shipUiFixture.current().ship.tiles.size), before.tiles);
      assert.equal(await page.locator("#upgradeList .upgrade-option").count(), 2, "Only the selected family's specialization choices should be shown");
      if (!profile.touch) assert.equal(await page.locator("#upgradeList .upgrade-option").first().evaluate(element => element === document.activeElement), true,
        "A keyboard upgrade must keep focus on the next available action");
      for (const branch of ["twin", "pierce"]) {
        const choice = page.locator('[data-weapon="cannon"][data-choice="' + branch + '"]');
        await choice.scrollIntoViewIfNeeded();
        await assertControl(choice, profile.name + " " + branch + " specialization");
        await assertControl(cell(page, 0, 0), profile.name + " ship while reading specialization", false);
      }

      const laser = page.locator('[data-type="laser"]');
      await laser.scrollIntoViewIfNeeded(); await laser.click();
      assert.match(await page.locator("#buildSelection").innerText(), /Laser/);
      assert.equal(await page.locator('#upgradeList [data-weapon="laser"]').count(), 1, "Catalog selection must open upgrades for that installed weapon family");
      assert.equal(await page.locator('#upgradeList [data-weapon="cannon"]').count(), 0);
      await page.locator('[data-type="scatter"]').scrollIntoViewIfNeeded();
      await page.locator('[data-type="scatter"]').click();
      assert.equal(await page.locator("#buildUpgradePanel").isVisible(), false, "A licence without an installed weapon must not offer an ineffective upgrade");
      await assertControl(page.locator("#closeBuild"), profile.name + " resume action");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.locator("#closeBuild").click();
      assert.equal(await page.evaluate(() => window.__driftBastion.getState().screen), "playing");

      if (!profile.touch) {
        await page.evaluate(() => {
          const f = window.__shipUiFixture, game = f.current();
          game.ship.tiles.set("0,1", f.makeTile("shield", 0, 1, false));
          game.ship.tiles.set("4,0", f.makeTile("shield", 4, 0, false));
          f.updateHud();
        });
        assert.equal(await page.locator("#shieldStatus").count(), 0, "Independent shield nodes must not be presented as one ship shield");
        const recharge = await page.evaluate(() => {
          const f = window.__shipUiFixture, game = f.current(), shield = game.ship.tiles.get("0,1");
          game.applyDamageToTile("0,0", 60);
          const depleted = shield.shield;
          game.updateShields(6); const afterDelay = shield.shield;
          game.updateShields(1); f.updateHud();
          return { depleted, afterDelay, afterSecond: shield.shield, distantCharge: game.ship.tiles.get("4,0").shield };
        });
        assert.deepEqual(recharge, { depleted: 0, afterDelay: 0, afterSecond: 4, distantCharge: 60 });
        checks.push("No aggregate shield HUD; local nodes preserve separate charge and recovery");
      }
      await page.reload();
      assert.equal(await page.evaluate(() => window.__shipUiFixture.save.fragments), 32);
      assert.equal(await page.evaluate(() => window.__shipUiFixture.save.meta.modules), 1);
      assert.deepEqual((await page.evaluate(() => window.__shipUiFixture.save.progression.purchasedModules)).sort(), purchasedModules.slice().sort());
      layouts.push({ profile: profile.name, catalogGeometry, ...geometry });
      checks.push(profile.name + ": all 9 owned modules immediately available; ship and one-family upgrade share Build; direct permanent purchase and starter changes persist; controls fit and accept input");
      await context.close();
    }
    assert.deepEqual(errors, []);
    const report = { passed: true, mode: "Seeded nine-owned-module browser fixtures; isolated UI and preservation checks, not earned progression or gameplay balance", checks, layouts, errors };
    fs.writeFileSync(path.join(output, "browser-report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ passed: report.passed, checks, profiles: layouts.map(layout => layout.profile), errors }, null, 2));
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
