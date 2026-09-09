"use strict";

const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
const output = path.join(root, "outputs", "build-inspector-2026-09-09");
fs.mkdirSync(output, { recursive: true });
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, "http://127.0.0.1").pathname;
  const file = path.resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
  if (path.relative(root, file).startsWith("..") || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.setHeader("Content-Type", { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml" }[path.extname(file)] || "application/octet-stream");
  let content = fs.readFileSync(file);
  if (pathname === "/game.js") content = content.toString().replace("    window.__driftBastion = {",
    "    window.__buildFixture = { current: () => game, makeTile, renderBuildGrid, clearBuildInteraction };\n    window.__driftBastion = {");
  res.end(content);
});

function gridCell(page, x, y) { return page.locator('.build-cell[data-x="' + x + '"][data-y="' + y + '"]'); }
async function center(locator) { const box = await locator.boundingBox(); assert.ok(box, "The drag control must be visible"); return { x: box.x + box.width / 2, y: box.y + box.height / 2 }; }
async function state(page) {
  return page.evaluate(() => {
    const game = window.__buildFixture.current();
    return { matter: game.matter, lost: game.modulesLost, tiles: Array.from(game.ship.tiles, ([key, tile]) => ({ key, type: tile.type, hp: tile.hp, shield: tile.shield, shieldDelay: tile.shieldDelay, paid: tile.paidMatter })) };
  });
}
async function assertCenteredGhost(page, pointer) {
  // Synchronize with the delivered pointer event, rather than a guessed single compositor frame.
  var delivered = false;
  for (let frame = 0; frame < 12 && !delivered; frame += 1) {
    await page.clock.runFor(20);
    delivered = await page.evaluate(point => {
      const actual = window.__buildDeliveredPointer;
      return actual && Math.abs(actual.x - point.x) < .6 && Math.abs(actual.y - point.y) < .6;
    }, pointer);
  }
  assert.ok(delivered, "Chromium must deliver the final native pointer move before checking its visual");
  const ghost = await page.locator(".build-drag-ghost").boundingBox();
  assert.ok(ghost, "An active drag must show its module ghost");
  assert.ok(Math.abs(ghost.x + ghost.width / 2 - pointer.x) < 0.6 && Math.abs(ghost.y + ghost.height / 2 - pointer.y) < 0.6,
    "The dragged module center must coincide with the actual pointer/drop point: " + JSON.stringify({ ghost, pointer }));
  const aligned = await page.evaluate(point => {
    const hit = document.elementFromPoint(point.x, point.y);
    const target = hit && hit.closest(".build-cell");
    const preview = document.querySelector(".build-cell.drop-valid, .build-cell.drop-invalid");
    return target === preview;
  }, pointer);
  assert.equal(aligned, true, "The outlined drop cell must be the cell under the visible module center");
}
async function dragMouse(page, source, destination) {
  const from = await center(source), to = await center(destination);
  await page.mouse.move(from.x, from.y); await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await assertCenteredGhost(page, to);
  await page.screenshot({ path: path.join(output, "mouse-ghost-centered.png") });
  await page.mouse.up();
  await page.clock.runFor(400);
}
async function assertInstalledCannotMove(page, source, destination, touch = false) {
  if (touch) await source.tap(); else await source.click();
  const before = await state(page), from = await center(source), to = await center(destination);
  if (touch) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [from] });
    for (let index = 1; index <= 12; index += 1) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: from.x + (to.x - from.x) * index / 12, y: from.y + (to.y - from.y) * index / 12 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } else {
    await page.mouse.move(from.x, from.y); await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 12 }); await page.mouse.up();
  }
  await page.clock.runFor(400);
  assert.equal(await page.locator(".build-drag-ghost").count(), 0, "Installed modules must never start a placement drag");
  assert.deepEqual(await state(page), before, "Dragging an installed module cannot move it or buy another copy");
  const point = await center(destination);
  if (touch) await page.touchscreen.tap(point.x, point.y); else await page.mouse.click(point.x, point.y);
  assert.deepEqual(await state(page), before, "An empty cell cannot buy while an installed module is selected");
}
async function prepare(page, url, uiScale = 100, purchasedModules = ["shield"]) {
  await page.addInitScript(fixture => localStorage.setItem("drift-bastion-save-v2", JSON.stringify({
    version: 9,
    progression: { schemaVersion: 4, purchasedModules: fixture.purchasedModules, bestTime: 180, totalKills: 100 },
    settings: { muted: true, uiScale: fixture.uiScale }
  })), { uiScale, purchasedModules });
  await page.clock.install(); await page.goto(url + "/?debug=1");
  await page.evaluate(() => document.addEventListener("pointermove", event => {
    window.__buildDeliveredPointer = { x: event.clientX, y: event.clientY };
  }, true));
  await page.locator("#debugBar").evaluate(element => { element.style.visibility = "hidden"; });
  await page.locator("#startButton").click();
  await page.evaluate(() => window.__driftBastion.addMatter(500));
  if (await page.locator("#buildButton").isVisible()) await page.locator("#buildButton").click();
  else await page.locator(".mobile-build").tap();
  assert.equal(await page.locator("#catalogBrowseButton, #buildAddTab, #buildUpgradeTab, #upgradeFamilyPicker, #guidePanel").count(), 0,
    "Build must not restore removed catalog toggles, tabs, family pickers, or tutorial panels");
}

(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    const url = "http://127.0.0.1:" + server.address().port;
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, serviceWorkers: "block" });
    page.on("pageerror", error => errors.push(error.message));
    await prepare(page, url);
    assert.deepEqual(await page.locator(".catalog-group-title").allTextContents(), ["Weapons", "Systems", "Hull"]);
    assert.deepEqual(await page.locator('[data-category="weapon"] .catalog-card').evaluateAll(items => items.map(item => item.dataset.type)), ["cannon"]);
    assert.deepEqual(await page.locator('[data-category="system"] .catalog-card').evaluateAll(items => items.map(item => item.dataset.type)), ["shield"]);
    assert.deepEqual(await page.locator('[data-category="structure"] .catalog-card').evaluateAll(items => items.map(item => item.dataset.type)), ["armor"]);
    assert.equal(await page.locator("#catalog .module-role").count(), 0, "Catalog cards must not repeat explanatory paragraphs");
    await gridCell(page, 0, -1).click();
    assert.equal(await page.locator("#buildUpgradePanel").isVisible(), true);
    assert.equal(await page.locator("#upgradeList .upgrade-card").count(), 1);
    const balanceBeforeTune = (await state(page)).matter;
    await page.locator('[data-weapon="cannon"][data-choice="tune"]').click();
    assert.equal((await state(page)).matter, balanceBeforeTune - 16);
    assert.equal(await gridCell(page, 0, -1).evaluate(element => element.classList.contains("selected-installed")), true,
      "Upgrading in the inspector must retain the selected installed tile");
    assert.equal(await page.locator("#buildGrid").isVisible(), true, "An upgrade must never switch away from the assembly grid");
    await page.evaluate(() => window.__driftBastion.addMatter(16));
    const initial = await state(page);
    await page.locator('[data-type="shield"]').click();
    assert.equal(await page.locator("#buildUpgradePanel").isVisible(), false, "Selecting a system hides weapon upgrades");
    await gridCell(page, 1, 0).hover();
    assert.deepEqual(await state(page), initial, "Hovering a shield placement must not spend or install anything");
    assert.equal(await page.locator(".shield-covered").count(), 2);
    assert.match(await page.locator("#buildPreviewStatus").innerText(), /Shield 60/);
    await page.screenshot({ path: path.join(output, "shield-before-placement.png") });
    await dragMouse(page, page.locator('[data-type="shield"]'), gridCell(page, 1, 0));
    let current = await state(page);
    assert.equal(current.matter, 472);
    assert.equal(current.tiles.filter(tile => tile.type === "shield").length, 1, "A drag release and its click must buy only once");
    assert.equal(current.tiles.find(tile => tile.key === "1,0").paid, 28);
    await page.evaluate(() => { const tile = window.__buildFixture.current().ship.tiles.get("1,0"); tile.hp /= 2; tile.shield = 17; tile.shieldDelay = 2; window.__buildFixture.renderBuildGrid(); });
    await assertInstalledCannotMove(page, gridCell(page, 1, 0), gridCell(page, 0, 1));
    current = await state(page);
    assert.equal(current.matter, 472);
    const installed = current.tiles.find(tile => tile.key === "1,0");
    assert.equal(installed.shield, 17); assert.equal(installed.shieldDelay, 2);
    assert.equal(installed.hp, 27.5);
    assert.match(await page.locator("#buildModuleDetails").innerText(), /Shield 17\/60/);
    await page.clock.runFor(1700);
    await page.screenshot({ path: path.join(output, "installed-shield-details.png") });
    await page.locator(".sell-module-button").click();
    current = await state(page);
    assert.equal(current.matter, 480, "A half-damaged 28-Matter node refunds eight Matter");
    assert.equal(current.tiles.filter(tile => tile.type === "shield").length, 0);
    assert.equal(current.lost, 0);
    await gridCell(page, 0, 0).click();
    assert.equal(await page.locator(".sell-module-button").count(), 0, "The core cannot be sold");
    assert.equal(await page.locator("#buildUpgradePanel").isVisible(), false, "The core has no contextual weapon upgrades");
    await page.locator('[data-type="armor"]').click();
    await gridCell(page, 1, 0).click();
    await gridCell(page, 2, 0).click();
    const connected = await state(page);
    await gridCell(page, 1, 0).click();
    assert.equal(await page.locator(".sell-module-button").isDisabled(), true);
    assert.match(await page.locator("#buildModuleDetails").innerText(), /connection/);
    await assertInstalledCannotMove(page, gridCell(page, 1, 0), gridCell(page, 0, 1));
    assert.deepEqual(await state(page), connected, "An installed bridge cannot be relocated or detach its branch");
    assert.equal(await page.locator(".build-drag-ghost").count(), 0);
    await page.screenshot({ path: path.join(output, "connected-branch-guard.png") });
    const pendingFrom = await center(page.locator('[data-type="armor"]')), pendingTo = await center(gridCell(page, 0, 1));
    await page.mouse.move(pendingFrom.x, pendingFrom.y); await page.mouse.down();
    await page.mouse.move(pendingTo.x, pendingTo.y, { steps: 8 });
    assert.equal(await page.locator(".build-drag-ghost").count(), 1);
    await page.keyboard.press("b"); await page.mouse.up();
    assert.equal(await page.locator(".build-drag-ghost").count(), 0, "Closing Build must cancel its active pointer drag");
    await page.keyboard.press("b");
    assert.deepEqual(await state(page), connected, "A release after closing Build cannot install a pending module");

    const touch = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "block" });
    touch.on("pageerror", error => errors.push(error.message));
    await prepare(touch, url);
    await touch.locator('[data-type="shield"]').tap();
    await gridCell(touch, 1, 0).tap();
    assert.equal((await state(touch)).matter, 500, "The first touch tap previews before charging");
    assert.equal((await state(touch)).tiles.length, 2);
    assert.match(await touch.locator("#buildHint").innerText(), /Tap this cell again/);
    assert.equal(await touch.locator(".shield-covered").count(), 2);
    await touch.screenshot({ path: path.join(output, "touch-shield-preview.png") });
    await gridCell(touch, 1, 0).tap();
    assert.equal((await state(touch)).matter, 472, "The second tap confirms exactly one purchase");
    assert.equal((await state(touch)).tiles.length, 3);
    await touch.locator('[data-type="armor"]').tap();
    const from = await center(touch.locator('[data-type="armor"]')), to = await center(gridCell(touch, 0, 1));
    const cdp = await touch.context().newCDPSession(touch);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: from.x, y: from.y }] });
    for (let index = 1; index <= 12; index += 1) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: from.x + (to.x - from.x) * index / 12, y: from.y + (to.y - from.y) * index / 12 }] });
    await assertCenteredGhost(touch, to);
    await touch.screenshot({ path: path.join(output, "touch-ghost-centered.png") });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await touch.clock.runFor(400);
    current = await state(touch);
    assert.ok(current.tiles.some(tile => tile.key === "0,1" && tile.type === "armor"), "A real touch drag must install the catalog module");
    assert.equal(current.matter, 466);
    assert.equal(await touch.locator(".build-drag-ghost").count(), 0);
    await assertInstalledCannotMove(touch, gridCell(touch, 1, 0), gridCell(touch, -1, 0), true);
    await touch.clock.runFor(1700);
    await touch.screenshot({ path: path.join(output, "touch-drag-built.png") });
    const beforeCancel = await state(touch);
    const cancelFrom = await center(touch.locator('[data-type="armor"]')), cancelTo = await center(gridCell(touch, -1, 0));
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: cancelFrom.x, y: cancelFrom.y }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: cancelTo.x, y: cancelTo.y }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
    assert.deepEqual(await state(touch), beforeCancel, "A cancelled touch catalog drag cannot charge or install a module");
    assert.equal(await touch.locator(".build-drag-ghost").count(), 0);
    const small = await browser.newPage({ viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true, serviceWorkers: "block" });
    small.on("pageerror", error => errors.push(error.message));
    await prepare(small, url, 150);
    await small.locator('[data-type="shield"]').tap();
    await gridCell(small, 1, 0).tap();
    assert.match(await small.locator("#buildPreviewStatus").innerText(), /Tap again to attach/);
    const resume = await small.locator("#closeBuild").boundingBox();
    const preview = await small.locator("#buildPreviewStatus").boundingBox();
    assert.ok(resume.y >= 0 && resume.y + resume.height <= 641 && preview.y >= 0 && preview.y + preview.height <= resume.y + 1,
      "Touch confirmation feedback and Resume must fit at 360×640 with 150% text");
    assert.equal(await small.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await small.screenshot({ path: path.join(output, "touch-preview-360-150.png") });
    await gridCell(small, 0, -1).tap();
    const shipViewport = await small.locator(".build-grid-wrap").boundingBox();
    for (const y of [-1, 0]) {
      const tileBounds = await gridCell(small, 0, y).boundingBox();
      assert.ok(tileBounds.y >= shipViewport.y && tileBounds.y + tileBounds.height <= shipViewport.y + shipViewport.height,
        "The core and selected weapon must fit together after the compact inspector opens");
    }
    await small.screenshot({ path: path.join(output, "touch-selected-weapon-360-150.png") });
    const preservedPan = await small.evaluate(() => {
      const fixture = window.__buildFixture;
      for (let y = 1; y <= 20; y += 1) fixture.current().ship.tiles.set("0," + y, fixture.makeTile("armor", 0, y, false));
      fixture.renderBuildGrid();
      const viewport = document.querySelector(".build-grid-wrap");
      viewport.scrollTop = 120;
      const before = viewport.scrollTop;
      fixture.renderBuildGrid();
      return { before, after: viewport.scrollTop };
    });
    assert.ok(preservedPan.before > 0);
    assert.equal(preservedPan.after, preservedPan.before, "Redrawing the same selection must preserve a large ship's manual pan");
    const fullCatalog = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "block" });
    fullCatalog.on("pageerror", error => errors.push(error.message));
    await prepare(fullCatalog, url, 100, ["armor", "cannon", "laser", "missile", "scatter", "arc", "rail", "flak", "pulse", "cryo", "mine", "ember", "gravity", "shield", "drive", "repair", "reactor", "collector", "bulkhead"]);
    assert.equal(await fullCatalog.locator("#catalog .catalog-card").count(), 19);
    assert.deepEqual(await fullCatalog.locator(".catalog-group-title").allTextContents(), ["Weapons", "Systems", "Hull"]);
    assert.equal(await fullCatalog.locator('[data-category="weapon"] .catalog-card').count(), 12);
    assert.equal(await fullCatalog.locator('[data-category="system"] .catalog-card').count(), 5);
    assert.equal(await fullCatalog.locator('[data-category="structure"] .catalog-card').count(), 2);
    const catalogViewport = await fullCatalog.locator("#catalog").boundingBox();
    const swipeFrom = { x: catalogViewport.x + catalogViewport.width - 35, y: catalogViewport.y + catalogViewport.height / 2 };
    const swipeTo = { x: catalogViewport.x + 35, y: swipeFrom.y };
    const fullCdp = await fullCatalog.context().newCDPSession(fullCatalog);
    const beforeSwipe = await state(fullCatalog);
    const scrollBefore = await fullCatalog.locator("#catalog").evaluate(element => element.scrollLeft);
    await fullCdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [swipeFrom] });
    for (let index = 1; index <= 12; index += 1) {
      await fullCdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: swipeFrom.x + (swipeTo.x - swipeFrom.x) * index / 12, y: swipeFrom.y }] });
      await new Promise(resolve => setTimeout(resolve, 16));
    }
    await fullCdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await fullCatalog.clock.runFor(300);
    const scrollAfter = await fullCatalog.locator("#catalog").evaluate(element => element.scrollLeft);
    assert.ok(scrollAfter > scrollBefore + 50, "A real horizontal swipe across module cards must scroll the 19-item catalog");
    assert.deepEqual(await state(fullCatalog), beforeSwipe, "Browsing the catalog must not install or charge a module");
    assert.equal(await fullCatalog.locator(".build-drag-ghost").count(), 0, "Native catalog panning must not leave a placement ghost");
    await fullCatalog.screenshot({ path: path.join(output, "touch-catalog-scrolled.png") });
    await fullCatalog.locator('[data-type="armor"]').scrollIntoViewIfNeeded();
    const scrollBeforeSelection = await fullCatalog.locator("#catalog").evaluate(element => element.scrollLeft);
    await fullCatalog.locator('[data-type="armor"]').tap();
    assert.equal(await fullCatalog.locator("#catalog").evaluate(element => element.scrollLeft), scrollBeforeSelection,
      "Selecting a module in the last group must preserve the catalogue's scroll position");
    const verticalFrom = await center(fullCatalog.locator('[data-type="armor"]'));
    const verticalTo = await center(gridCell(fullCatalog, 0, 1));
    await fullCdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [verticalFrom] });
    for (let index = 1; index <= 12; index += 1) await fullCdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: verticalFrom.x + (verticalTo.x - verticalFrom.x) * index / 12, y: verticalFrom.y + (verticalTo.y - verticalFrom.y) * index / 12 }] });
    await assertCenteredGhost(fullCatalog, verticalTo);
    await fullCdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await fullCatalog.clock.runFor(400);
    assert.ok((await state(fullCatalog)).tiles.some(tile => tile.key === "0,1" && tile.type === "armor"), "Vertical touch placement must remain available after native horizontal catalog scrolling");
    assert.deepEqual(errors, []);
    const report = { passed: true, checks: ["Owned modules grouped under Weapons, Systems and Hull without filters", "Mouse and touch ghosts centered on the actual pointer", "Drop outline matches the cell under the visible ghost center", "Inline upgrades follow installed selection", "Grid and selection stay after upgrading", "Systems and core hide weapon upgrades", "Desktop hover preview without payment", "Catalog pointer drag", "No synthetic-click double purchase", "Installed mouse and touch drags cannot move or buy", "Condition-based sale", "Core and bridge guards", "Touch preview then confirm", "Real touch catalog drag", "19-item native horizontal catalog swipe", "Vertical drag after catalog scrolling", "360×640 at 150% text", "Core and selected weapon visible together", "Large-ship manual pan retained", "Pointer cancel and closing Build cleanup"], errors };
    fs.writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
