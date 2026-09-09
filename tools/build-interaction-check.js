"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const harness = fs.readFileSync(".artifact_build/runtime-check.js", "utf8");
const marker = "let installPromptCalls";
const source = fs.readFileSync("game.js", "utf8");
const exposure = "    window.__driftBastion = {";
assert.ok(harness.includes(marker) && source.includes(exposure));
const instrumented = source.replace(exposure,
  "    window.__buildTest = { Game: Game, save: save, defaultSave: defaultSave, makeTile: makeTile, price: modulePrice, place: placePurchasedModule, sell: sellInstalledModule, refund: moduleSellRefund, connected: buildLayoutConnected, buy: buyRunUpgrade, preview: updateBuildPreview, render: renderBuildGrid, catalog: createCatalog, interaction: buildInteraction, activate: function(instance,type) { game = instance; selectedBuildModule = type || 'cannon'; clearBuildInteraction(); } };\n" + exposure);
const bootstrap = {
  console, URLSearchParams, setTimeout() { return 0; }, clearTimeout() {},
  process: { env: { BALANCE_SECONDS: "1" } },
  require(name) {
    if (name === "fs") return { ...fs, readFileSync(file, encoding) { return file === "game.js" ? instrumented : fs.readFileSync(file, encoding); } };
    return require(name);
  }
};
vm.runInNewContext(harness.slice(0, harness.indexOf(marker)) + "\nglobalThis.runtime = sandbox;", bootstrap);
const runtime = bootstrap.runtime;
const api = runtime.__buildTest;
const document = runtime.document;
assert.doesNotMatch(source, /function (?:moveInstalledModule|buildTileCanMove)\b/, "Installed movement APIs must be removed");

// Exercise the actual registered handlers with a DOM stub that preserves capture order and replacement.
function decorate(element) {
  let html = element.innerHTML;
  Object.defineProperty(element, "innerHTML", { get() { return html; }, set(value) { html = value; this.children = []; } });
  let classes = "";
  Object.defineProperty(element, "className", { get() { return classes; }, set(value) {
    this.classList.remove(...classes.split(/\s+/).filter(Boolean));
    classes = value;
    this.classList.add(...value.split(/\s+/).filter(Boolean));
  } });
  element.appendChild = function (child) { child.parentNode = this; this.children.push(child); return child; };
  element.removeChild = function (child) { this.children = this.children.filter(item => item !== child); child.parentNode = null; };
  element.contains = function (child) { return this === child || this.children.some(item => item.contains(child)); };
  element.closest = function (selector) { return this.classList.contains(selector.slice(1)) ? this : this.parentNode?.closest(selector) || null; };
  const attributes = {};
  element.setAttribute = (name, value) => { attributes[name] = value; };
  element.getAttribute = name => attributes[name];
  const handlers = {};
  element.addEventListener = function (type, callback, capture) {
    (handlers[type] ||= []).push({ callback, capture: capture === true });
    this.listeners[type] = event => {
      const ordered = handlers[type].filter(item => item.capture).concat(handlers[type].filter(item => !item.capture));
      for (const item of ordered) { item.callback(event); if (event.immediateStopped) break; }
    };
  };
  return element;
}
const originalCreateElement = document.createElement.bind(document);
document.createElement = tag => decorate(originalCreateElement(tag));
for (const id of ["buildGrid", "catalog", "upgradeList", "buildModuleDetails"]) decorate(document.getElementById(id));
decorate(document.body);
let time = 1000;
runtime.performance.now = () => time;
function event(pointerType = "mouse", clientX = 10, clientY = 10) {
  return { pointerId: 1, pointerType, button: 0, detail: 1, clientX, clientY,
    preventDefault() {}, stopImmediatePropagation() { this.immediateStopped = true; } };
}
function dispatch(element, type, value = event()) { element.listeners[type]?.(value); }
function cellAt(x, y) {
  return document.getElementById("buildGrid").children.find(cell => cell.dataset.x === String(x) && cell.dataset.y === String(y));
}
function catalogCard(type) {
  return document.getElementById("catalog").children.flatMap(group => group.children.at(-1).children).find(card => card.dataset.type === type);
}
function selectCatalog(type) { time += 500; dispatch(catalogCard(type), "click"); }
function dragCatalog(type, x, y, pointerType = "mouse") {
  const start = event(pointerType, 20, 20);
  dispatch(catalogCard(type), "pointerdown", start);
  document.pointerElement = cellAt(x, y);
  dispatch(document, "pointermove", event(pointerType, 20, 120));
  return event(pointerType, 20, 120);
}
Object.assign(api.save, api.defaultSave());
api.save.progression.purchasedModules.push("shield");

function fresh(type = "cannon") {
  const game = new api.Game();
  game.state = "building";
  game.matter = 1000;
  api.activate(game, type);
  time += 500;
  api.catalog();
  api.render();
  return game;
}

let game = fresh("shield");
const shieldPrice = api.price("shield");
assert.equal(api.place(1, 0), true);
const shield = game.ship.tiles.get("1,0");
assert.equal(shield.paidMatter, shieldPrice, "The receipt must store the price actually paid");
shield.hp *= .5;
shield.shield = 12;
shield.shieldDelay = 3;
const beforeInspectMatter = game.matter;
for (const pointerType of ["mouse", "touch"]) {
  const installed = cellAt(1, 0);
  assert.equal(installed.listeners.pointerdown, undefined, "Installed modules must not register a drag start");
  dispatch(installed, "pointerdown", event(pointerType));
  dispatch(document, "pointermove", event(pointerType, 100, 100));
  dispatch(document, "pointerup", event(pointerType, 100, 100));
  assert.equal(api.interaction.drag, null, "Dragging an installed tile must not create a purchase or movement drag");
  dispatch(installed, "click", event(pointerType));
  assert.equal(api.interaction.selectedKey, "1,0");
  assert.equal(catalogCard("shield").getAttribute("aria-pressed"), "false", "Inspector selection must not advertise an active catalog purchase");
  assert.equal(cellAt(0, 1).dataset.action, "none");
  assert.equal(cellAt(0, 1).getAttribute("aria-disabled"), "true");
  assert.equal(cellAt(0, 1).classList.contains("valid"), false);
  dispatch(cellAt(0, 1), "click", event(pointerType));
  dispatch(cellAt(0, 1), "click", event(pointerType));
  assert.equal(api.place(0, 1), false, "Installed selection also gates programmatic placement");
  assert.equal(game.ship.tiles.get("1,0"), shield, "Inspecting and dragging retain the exact installed object");
  assert.equal(game.ship.tiles.has("0,1"), false, "An empty-cell click in inspector mode cannot silently buy a copy");
  assert.equal(shield.x, 1); assert.equal(shield.y, 0);
  api.preview(0, 1);
  assert.equal(api.interaction.preview.tile, shield);
  assert.equal(api.interaction.preview.x, 1, "Selected shield coverage stays at its installed position");
  assert.equal(api.interaction.preview.y, 0);
  assert.equal(game.matter, beforeInspectMatter);
}
assert.equal(shield.shield, 12);
assert.equal(shield.shieldDelay, 3);
assert.equal(shield.paidMatter, shieldPrice);
assert.equal(api.refund(shield), Math.floor(shieldPrice * .3));
const refund = api.refund(shield);
game.gravityFields.push({ sourceTile: shield }, { sourceTile: game.ship.tiles.get("0,-1") });
assert.equal(api.sell("1,0"), true);
assert.equal(game.matter, beforeInspectMatter + refund);
assert.equal(game.modulesLost, 0, "Intentional selling must not count as a combat module loss");
assert.equal(game.gravityFields.length, 1, "Selling removes only fields owned by that exact tile");
assert.equal(api.sell("1,0"), false, "Repeated sell callbacks cannot refund twice");
assert.equal(game.matter, beforeInspectMatter + refund);

game = fresh();
game.matter = 0;
assert.equal(api.refund(game.ship.tiles.get("0,-1")), 0, "Free starter tiles have no resale value");
assert.equal(api.sell("0,-1"), false, "The last weapon cannot leave an unaffordable defenseless ship");
game.matter = 19;
assert.equal(api.sell("0,-1"), false);
game.matter = 20;
assert.equal(api.sell("0,-1"), true, "Exact post-sale replacement affordability allows selling the last weapon");
assert.equal(game.matter, 20);
assert.equal(api.place(0, -1), true);
assert.equal(game.matter, 0);
assert.equal(game.ship.tiles.get("0,-1").paidMatter, 20);
assert.equal(api.sell("0,-1"), false, "Repeated buy/sell cannot create a free replacement cycle");
assert.equal(api.sell("0,0"), false);
dispatch(cellAt(0, 0), "click");
dispatch(cellAt(1, 0), "click");
assert.equal(game.ship.tiles.get("0,0").type, "core");
assert.equal(game.ship.tiles.has("1,0"), false);

game = fresh("armor");
assert.equal(api.place(1, 0), true);
assert.equal(api.place(2, 0), true);
const bridge = game.ship.tiles.get("1,0");
const beforeRejected = game.matter;
assert.equal(api.sell("1,0"), false, "Selling an articulation tile must preserve its entire branch");
assert.equal(game.ship.tiles.get("1,0"), bridge);
assert.ok(game.ship.tiles.has("2,0"));
assert.equal(game.matter, beforeRejected);
assert.equal(game.modulesLost, 0);
assert.equal(api.sell("2,0"), true, "Sell outer modules before their connecting tile");
assert.equal(api.sell("1,0"), true);
assert.equal(game.ship.tiles.has("1,0"), false);

game = fresh("cannon");
assert.equal(api.place(1, 0), true);
assert.equal(api.buy("cannon", "tune", 0), true);
assert.equal(api.buy("cannon", "twin", 1), true);
const upgraded = game.weaponDefinitions.cannon;
const peak = game.upgradeFleetSizes.cannon;
assert.equal(api.sell("1,0"), true);
assert.equal(game.weaponDefinitions.cannon, upgraded);
assert.equal(game.upgrades.cannon.branch, "twin");
assert.equal(game.upgradeFleetSizes.cannon, peak, "Sale cannot discount family upgrades");
assert.equal(api.place(1, 0), true);
assert.equal(game.weaponDefinitions.cannon, upgraded, "A replacement inherits all family upgrades");
api.interaction.selectedKey = "1,0";
api.render();
assert.equal(runtime.document.getElementById("buildUpgradePanel").classList.contains("hidden"), false);
const nextCannonUpgrade = runtime.document.getElementById("upgradeList").children.at(-1).children[0].children[0];
assert.equal(nextCannonUpgrade.dataset.weapon, "cannon", "Inspector upgrades must follow the installed weapon");
assert.equal(api.buy("cannon", "calibrate", 2), true);
assert.equal(api.interaction.selectedKey, "1,0", "Buying an upgrade must not clear installed selection");
api.interaction.selectedKey = "0,0";
api.render();
assert.equal(runtime.document.getElementById("buildUpgradePanel").classList.contains("hidden"), true,
  "Selecting the core must hide the weapon upgrade inspector");

game = fresh("cannon");
game.ship.tiles.set("1,0", api.makeTile("laser", 1, 0, false));
api.interaction.selectedKey = "1,0";
api.render();
const laserChoice = runtime.document.getElementById("upgradeList").children.at(-1).children[0].children[0];
assert.equal(laserChoice.dataset.weapon, "laser", "Installed selection must take precedence over the catalog's previous family");
assert.equal(api.buy("laser", "tune", 0), true);
assert.equal(api.interaction.selectedKey, "1,0");
assert.equal(game.upgrades.cannon, undefined, "An inline purchase must never upgrade a different displayed family");
api.interaction.selectedKey = null;
api.render();
const catalogChoice = runtime.document.getElementById("upgradeList").children.at(-1).children[0].children[0];
assert.equal(catalogChoice.dataset.weapon, "cannon", "Without an installed selection, the catalog family drives upgrades");

game = fresh("shield");
for (const [x, y] of [[-1, 0], [-1, -1], [-2, -1]]) game.ship.tiles.set(`${x},${y}`, api.makeTile("armor", x, y, false));
api.render();
assert.equal(runtime.document.getElementById("buildUpgradePanel").classList.contains("hidden"), true,
  "Selecting a catalog system must not show an unrelated weapon family");
const matterBeforePreview = game.matter;
const sizeBeforePreview = game.ship.tiles.size;
api.preview(0, 1);
assert.equal(cellAt(-1, -1).classList.contains("shield-covered"), true, "The diagonal sqrt(5) tile lies inside radius 2.3");
assert.equal(cellAt(-2, -1).classList.contains("shield-covered"), false, "The diagonal sqrt(8) tile lies outside radius 2.3");
assert.equal(cellAt(0, 0).classList.contains("shield-covered"), true);
assert.equal(game.matter, matterBeforePreview, "Hover preview never charges Matter");
assert.equal(game.ship.tiles.size, sizeBeforePreview, "Hover preview never installs a tile");
assert.match(runtime.document.getElementById("buildPreviewStatus").textContent, /Shield 60/);

game.state = "playing";
assert.equal(api.place(1, 0), false);
assert.equal(api.sell("0,-1"), false, "All edit commands must remain inside paused Build mode");

for (const pointerType of ["mouse", "touch"]) {
  game = fresh("shield");
  const originalCannon = game.ship.tiles.get("0,-1");
  dispatch(cellAt(0, -1), "click", event(pointerType));
  const before = game.matter;
  const price = api.price("shield");
  const release = dragCatalog("shield", 1, 0, pointerType);
  assert.equal(api.interaction.drag.active, true);
  assert.equal(api.interaction.drag.ghost.style.left, release.clientX + "px");
  assert.equal(api.interaction.drag.ghost.style.top, release.clientY + "px");
  assert.equal(cellAt(1, 0).classList.contains("drop-valid"), true);
  assert.equal(cellAt(0, 0).classList.contains("shield-covered"), true, "Catalog drag still previews shield coverage");
  dispatch(document, "pointerup", release);
  const purchased = game.ship.tiles.get("1,0");
  assert.equal(purchased.type, "shield");
  assert.equal(purchased.paidMatter, price);
  assert.equal(game.matter, before - price, "Catalog drop purchases exactly one new module");
  assert.equal(game.ship.tiles.get("0,-1"), originalCannon);
  assert.equal(originalCannon.x, 0); assert.equal(originalCannon.y, -1);
  dispatch(cellAt(0, 1), "click", event(pointerType));
  assert.equal(game.matter, before - price, "The post-drop synthetic click cannot purchase another module");
  time += 500;
  dispatch(cellAt(1, 0), "click", event(pointerType));
  selectCatalog("cannon");
  assert.equal(api.interaction.selectedKey, null, "Choosing a catalog card explicitly returns to purchase mode");
  const cannonPrice = api.price("cannon");
  dispatch(cellAt(0, 1), "click", event(pointerType));
  if (pointerType === "touch") {
    assert.equal(game.ship.tiles.has("0,1"), false, "First touch previews a catalog purchase");
    dispatch(cellAt(0, 1), "click", event(pointerType));
  }
  assert.equal(game.ship.tiles.get("0,1").type, "cannon");
  assert.equal(game.matter, before - price - cannonPrice);
}

game = fresh("shield");
const beforeCancel = game.matter;
dispatch(catalogCard("shield"), "pointerdown", event("touch", 20, 20));
dispatch(document, "pointermove", event("touch", 120, 20));
assert.equal(api.interaction.drag, null, "A sideways touch swipe scrolls the catalog instead of purchasing");
assert.equal(game.matter, beforeCancel);
const invalidRelease = dragCatalog("shield", 0, 0);
assert.equal(cellAt(0, 0).classList.contains("drop-invalid"), true);
dispatch(document, "pointerup", invalidRelease);
assert.equal(game.matter, beforeCancel, "Dropping onto an installed module cannot purchase or replace it");
// Preview content may change, but hiding it must not remove its layout row.
game = fresh("cannon");
game.ship.tiles.set("1,0", api.makeTile("shield", 1, 0, false));
api.render();
const previewStatus = document.getElementById("buildPreviewStatus");
api.interaction.selectedKey = null;
api.preview(1, 0);
assert.equal(previewStatus.classList.contains("is-empty"), false);
assert.equal(previewStatus.classList.contains("hidden"), false);
api.preview(undefined, undefined);
assert.equal(previewStatus.classList.contains("is-empty"), true);
assert.equal(previewStatus.classList.contains("hidden"), false, "Leaving shield hover cannot collapse the status row");
const css = fs.readFileSync("styles.css", "utf8");
assert.match(css, /\.build-preview-status\.is-empty\s*\{\s*visibility:\s*hidden;/, "Empty preview hides only its content");
assert.match(css, /height:\s*3\.75rem;[\s\S]*?min-height:\s*3\.75rem;[\s\S]*?max-height:\s*3\.75rem;/, "Preview row is reserved at a fixed height");

console.log(JSON.stringify({ passed: true, checks: ["Actual price receipts", "Condition-based bounded refund", "No double sale", "Free starter and last weapon guard", "Installed tiles have no drag binding", "No placement in inspector mode", "Object identity and coordinates unchanged by mouse/touch drag", "Connected sale and no branch deletion", "HP and shield state preserved", "Peak family pricing retained", "Stationary installed shield preview", "Catalog mouse/touch purchases and shield previews", "Post-drop click suppression and touch tap preview", "Catalog swipe and invalid drop guards", "Contextual family upgrades and preserved selection", "Build-mode gate"] }, null, 2));
