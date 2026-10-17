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
  "    window.__buildTest = { Game: Game, save: save, defaultSave: defaultSave, makeTile: makeTile, upgrades: runUpgrades, price: modulePrice, place: placePurchasedModule, sell: sellInstalledModule, refund: moduleSellRefund, connected: buildLayoutConnected, buy: buyRunUpgrade, preview: updateBuildPreview, render: renderBuildGrid, catalog: createCatalog, interaction: buildInteraction, activate: function(instance,type) { game = instance; selectedBuildModule = type || 'cannon'; clearBuildInteraction(); } };\n" + exposure);
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
assert.equal(api.refund(shield), 0);
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
assert.equal(api.sell("0,-1"), false, "The final weapon stays installed even when a replacement is affordable");
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
assert.equal(api.buy("cannon", "base1", 0), true);
assert.equal(api.buy("cannon", "base2", 1), true);
const upgraded = game.weaponDefinitions.cannon;
const peak = game.upgradeFleetSizes.cannon;
assert.equal(api.sell("1,0"), true);
assert.equal(game.weaponDefinitions.cannon, upgraded);
assert.equal(game.upgrades.cannon.branch, null);
assert.equal(game.upgradeFleetSizes.cannon, peak, "Sale cannot discount family upgrades");
assert.equal(api.place(1, 0), true);
assert.equal(game.weaponDefinitions.cannon, upgraded, "A replacement inherits all family upgrades");
api.interaction.selectedKey = "1,0";
api.render();
assert.equal(runtime.document.getElementById("buildUpgradePanel").classList.contains("hidden"), false);
function findUpgrade(node) { if (node.dataset.weapon) return node; for (const child of node.children) { const found = findUpgrade(child); if (found) return found; } }
const nextCannonUpgrade = findUpgrade(runtime.document.getElementById("upgradeList").children.at(-1));
assert.equal(nextCannonUpgrade.dataset.weapon, "cannon", "Inspector upgrades must follow the installed weapon");
api.save.progression.branchLicenses = ["cannon:twin"];
assert.equal(api.buy("cannon", "twin", 2), true);
assert.equal(api.interaction.selectedKey, "1,0", "Buying an upgrade must not clear installed selection");
api.interaction.selectedKey = "0,0";
api.render();
assert.equal(runtime.document.getElementById("buildUpgradePanel").classList.contains("hidden"), true,
  "Selecting the core must hide the weapon upgrade inspector");

game = fresh("cannon");
game.ship.tiles.set("1,0", api.makeTile("laser", 1, 0, false));
api.interaction.selectedKey = "1,0";
api.render();
const laserChoice = findUpgrade(runtime.document.getElementById("upgradeList").children.at(-1));
assert.equal(laserChoice.dataset.weapon, "laser", "Installed selection must take precedence over the catalog's previous family");
assert.equal(api.buy("laser", "base1", 0), true);
assert.equal(api.interaction.selectedKey, "1,0");
assert.equal(game.upgrades.cannon, undefined, "An inline purchase must never upgrade a different displayed family");
api.interaction.selectedKey = null;
api.render();
const catalogChoice = findUpgrade(runtime.document.getElementById("upgradeList").children.at(-1));
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
assert.equal(previewStatus.classList.contains("is-empty"), false, "Installed shield coverage remains visible after hover ends");
assert.match(previewStatus.textContent, /Shield coverage:/);
assert.equal(cellAt(0, 0).dataset.shieldCoverage, "active", "Coverage remains visible while placing a weapon");
assert.equal(previewStatus.classList.contains("hidden"), false, "Leaving shield hover cannot collapse the status row");
const css = fs.readFileSync("styles.css", "utf8");
assert.match(css, /\.build-preview-status\.is-empty\s*\{\s*visibility:\s*hidden;/, "Empty preview hides only its content");
assert.match(css, /height:\s*3\.75rem;[\s\S]*?min-height:\s*3\.75rem;[\s\S]*?max-height:\s*3\.75rem;/, "Preview row is reserved at a fixed height");

function supportFixture(type, weapons) {
  const instance = fresh(type);
  instance.ship.tiles.clear();
  for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) {
    instance.ship.tiles.set(`${x},${y}`, api.makeTile(weapons ? "cannon" : "armor", x, y, false));
  }
  instance.ship.tiles.set("0,0", api.makeTile(type, 0, 0, false));
  api.interaction.selectedKey = "0,0";
  api.render();
  return instance;
}

game = supportFixture("ember", false);
for (const [type,x,y] of [["scatter",1,0],["flak",-1,0],["scatter",1,1],["cannon",0,1],["cannon",-1,-1]]) game.ship.tiles.set(`${x},${y}`,api.makeTile(type,x,y,false));
api.render();
assert.equal(cellAt(1,0).classList.contains("support-range"),true);
assert.equal(cellAt(-1,0).classList.contains("support-range"),true);
assert.equal(cellAt(1,1).classList.contains("support-range"),false,"Diagonal Scatter cannot receive Ember combo");
assert.equal(cellAt(0,1).classList.contains("support-range"),true,"Edge-adjacent Cannon receives Ember combo");
assert.equal(cellAt(-1,-1).classList.contains("support-range"),false,"Diagonal Cannon cannot receive Ember combo");
assert.match(previewStatus.textContent,/Flame-burst combo/);
assert.match(previewStatus.textContent,/Cannon/i,"Ember preview names the newly eligible Cannon family");
assert.match(cellAt(1,0).getAttribute("aria-label"),/during flame bursts/);
assert.match(cellAt(0,1).getAttribute("aria-label"),/during flame bursts/);
assert.match(cellAt(0,1).dataset.supportBenefits,/ember:1:/,"Cannon receives the same non-stacking conditional benefit");
api.interaction.selectedKey="0,1";api.render();
assert.match(document.getElementById("buildModuleDetails").innerHTML,/3 burn\/s for 1.5s during adjacent flame bursts/,
  "Installed Cannon details explain the conditional minor burn");
api.interaction.selectedKey="0,0";
game.ship.tiles.set("2,0",api.makeTile("ember",2,0,false));api.render();
assert.match(cellAt(1,0).dataset.supportBenefits,/ember:1:/,"Several Embers advertise one non-stacking combo");
assert.doesNotMatch(cellAt(1,0).dataset.supportBenefits,/ember:2:/);
api.interaction.selectedKey="1,0";api.render();
assert.match(document.getElementById("buildModuleDetails").innerHTML,/3 burn\/s for 1.5s during adjacent flame bursts/);

game = fresh("scatter");api.save.progression.purchasedModules.push("scatter","ember","flak");api.catalog();selectCatalog("scatter");game.ship.tiles.set("1,0",api.makeTile("ember",1,0,false));api.render();api.preview(1,-1);
assert.match(cellAt(1,-1).dataset.supportBenefits,/ember:1:/,"Scatter ghost receives a conditional Ember combo before purchase");
api.preview();assert.equal(cellAt(1,-1).dataset.supportBenefits,"");
selectCatalog("cannon");api.preview(1,-1);
assert.match(cellAt(1,-1).dataset.supportBenefits,/ember:1:/,"Cannon ghost receives the conditional combo before purchase");
api.preview();assert.equal(cellAt(1,-1).dataset.supportBenefits,"");
selectCatalog("armor");api.preview(1,-1);assert.doesNotMatch(cellAt(1,-1).dataset.supportBenefits,/ember:/);

game = supportFixture("repair", false);
game.ship.tiles.forEach(tile => { tile.hp -= 10; tile.repairDelay = 0; tile.repairCooldown = 0; tile.supportClock = 0; });
const beforeRepair = new Map([...game.ship.tiles].map(([key, tile]) => [key, tile.hp]));
game.updateSupportModules(0);
game.ship.tiles.forEach((tile, key) => assert.equal(cellAt(tile.x, tile.y).classList.contains("support-range"), tile.hp > beforeRepair.get(key), "Repair preview must match actual healing targets"));
game.weaponDefinitions.repair.repairRadius = 2.5;
api.render();
assert.equal(cellAt(2, 1).classList.contains("support-range"), true, "Repair upgrades expand the preview");
assert.equal(cellAt(2, 2).classList.contains("support-range"), false);

game = supportFixture("reactor", true);
game.ship.tiles.forEach(tile => {
  if (tile.type === "cannon") assert.equal(cellAt(tile.x, tile.y).classList.contains("support-range"), game.weaponCooldownRate(tile) > 1, "Reactor preview must match the real surrounding 3x3 boost");
});
game.ship.tiles.set("1,0", api.makeTile("armor", 1, 0, false));
api.render();
assert.equal(cellAt(1, 0).classList.contains("support-range"), false, "Reactor cannot advertise a weapon boost on armor");

game = supportFixture("bulkhead", false);
game.ship.tiles.forEach(tile => assert.equal(cellAt(tile.x, tile.y).classList.contains("support-range"), game.bulkheadReduction(tile) > 0, "Bulkhead preview must match surrounding 3x3 damage reduction"));
assert.equal(game.bulkheadReduction(game.ship.tiles.get("1,1")), .12, "Diagonal modules receive Bulkhead protection");
assert.equal(game.bulkheadReduction(game.ship.tiles.get("0,0")), 0, "Bulkhead does not protect itself");
assert.equal(game.bulkheadReduction(game.ship.tiles.get("2,0")), 0, "Bulkhead does not reach two cells away");
const diagonalArmor = game.ship.tiles.get("1,1");
const diagonalHp = diagonalArmor.hp;
game.applyDamageToTile("1,1", 10, { kind: "projectile" });
assert.ok(Math.abs(diagonalArmor.hp - (diagonalHp - 8.8)) < 1e-8, "Actual diagonal hull damage is reduced by 12 percent");
for (const [x,y] of [[0,1],[0,2],[1,2],[2,2],[2,1]]) game.ship.tiles.set(`${x},${y}`, api.makeTile("bulkhead",x,y,false));
assert.equal(game.bulkheadReduction(diagonalArmor), .48, "Overlapping diagonal and edge sources retain the 48 percent cap");
game = supportFixture("collector", true);
assert.equal(cellAt(3, 3).classList.contains("support-range"), true, "Siphon income applies to distant weapons too");
assert.match(previewStatus.textContent, /Ship-wide Matter bonus/);
api.interaction.selectedKey = null;
api.activate(game, "cannon");
api.render();
assert.ok([...document.getElementById("buildGrid").children].every(cell => !cell.classList.contains("support-range")), "Support icons must disappear when support inspection ends");
assert.match(cellAt(3,3).dataset.supportBenefits, /collector:1/, "Installed weapon keeps its Siphon benefit icon without support inspection");

game = fresh("cannon");
const previewCore = game.ship.tiles.get("0,0");
game.ship.tiles.clear();
game.ship.tiles.set("0,0",previewCore);
for (const [type,x,y] of [["shield",0,-1],["repair",1,2],["bulkhead",0,1],["reactor",1,0],["collector",3,0],["shield",2,0]]) {
  game.ship.tiles.set(`${x},${y}`,api.makeTile(type,x,y,false));
}
api.render();
api.preview(1,1);
const ghostBenefits = cellAt(1,1).dataset.supportBenefits;
for (const type of ["shield","repair","bulkhead","reactor","collector"]) assert.match(ghostBenefits,new RegExp(type+":"),"Cannon ghost shows "+type+" before purchase");
assert.match(ghostBenefits,/shield:2:/,"Overlapping Shield Nodes share one icon with an accurate source count");
assert.match(cellAt(1,1).getAttribute("aria-label"),/Receives:.*Reactor Link.*Matter Siphon/);
api.preview();
assert.equal(cellAt(1,1).dataset.supportBenefits,"","Ghost badges clear when hover ends");
assert.doesNotMatch(cellAt(0,0).dataset.supportBenefits,/reactor|collector/,"Non-weapons cannot advertise weapon-only benefits");
selectCatalog("armor");
api.preview(1,1);
assert.doesNotMatch(cellAt(1,1).dataset.supportBenefits,/reactor|collector/,"Armor ghost cannot receive weapon-only benefits");
assert.match(cellAt(1,1).dataset.supportBenefits,/bulkhead:1/);
selectCatalog("cannon");
const dragRelease = dragCatalog("cannon",1,1);
assert.match(cellAt(1,1).dataset.supportBenefits,/reactor:1/,"Dragging a weapon shows its destination benefits");
dispatch(document,"pointercancel",dragRelease);
game.ship.tiles.forEach(tile=>{if(tile.type==="shield") { tile.shield=0; tile.shieldDelay=6; }});
api.preview(1,1);
assert.match(cellAt(1,1).dataset.supportBenefits,/shield:2:true/,"Depleted shield benefits are marked offline");
game.ship.tiles.delete("0,1");
api.render();
api.preview(1,1);
assert.doesNotMatch(cellAt(1,1).dataset.supportBenefits,/bulkhead/,"Removed supports disappear from prospective benefits");
api.save.progression.purchasedModules.push("bulkhead");
game.ship.tiles.set("-1,0",api.makeTile("armor",-1,0,false));
api.catalog();
api.render();
selectCatalog("bulkhead");
api.preview(0,1);
assert.match(cellAt(1,0).dataset.supportBenefits,/bulkhead:1:false:preview/,"Previewed Bulkhead remains visible beside existing shield benefits on diagonal weapons");
assert.match(cellAt(-1,0).dataset.supportBenefits,/bulkhead:1:false:preview/,"Previewed Bulkhead protects diagonal armor too");

game = fresh("cannon");
api.save.progression.branchLicenses = [];
const cannonKey = [...game.ship.tiles].find(([,tile])=>tile.type==="cannon")[0];
const markerVisible = () => cellAt(...cannonKey.split(",").map(Number)).classList.contains("upgrade-available");
game.matter = 0; api.render();
assert.equal(markerVisible(),false,"No upgrade arrow when Matter cannot buy the next upgrade");
for (let rank=0;rank<2;rank++) {
  const option=api.upgrades.options("cannon",game.upgrades.cannon,1,[])[0];
  game.matter=option.cost; api.render();
  assert.equal(markerVisible(),true,"Available base upgrades need no Hangar branch license or prior tree visit");
  assert.equal(api.buy("cannon",option.id),true,"The advertised base upgrade is actually purchasable");
}
game.matter=1e8;api.render();
assert.equal(markerVisible(),false,"Locked Hangar branches cannot show an upgrade arrow, even with ample Matter");
const cannonBranch=api.upgrades.trees.cannon.branches.find(branch=>!branch.parent);
assert.equal(api.buy("cannon",cannonBranch.id),false,"Locked branch purchases agree with the absent arrow");
api.save.progression.branchLicenses=["cannon:"+cannonBranch.id];api.render();
assert.equal(markerVisible(),true,"A licensed affordable next branch restores the arrow");
assert.equal(api.buy("cannon",cannonBranch.id),true,"The advertised licensed branch is actually purchasable");
game.testRange=true;game.matter=0;api.render();
assert.equal(markerVisible(),true,"Free Test Range upgrades are available with zero Matter");
const rangeLicenses=api.upgrades.trees.cannon.branches.map(branch=>"cannon:"+branch.id);
for (let steps=0;steps<12;steps++) {
  const next=api.upgrades.options("cannon",game.upgrades.cannon,1,rangeLicenses)[0];
  if(!next)break;
  assert.equal(api.buy("cannon",next.id),true);
}
api.render();assert.equal(markerVisible(),false,"A completed upgrade route cannot advertise a further purchase");

game = fresh("repair");
game.ship.tiles.clear();
const repairOne=api.makeTile("repair",0,0,false),repairTwo=api.makeTile("repair",1,0,false);
game.ship.tiles.set("0,0",repairOne);game.ship.tiles.set("1,0",repairTwo);
repairOne.hp-=20;repairTwo.hp-=20;
repairOne.supportClock=0;repairTwo.supportClock=0;
repairOne.repairDelay=2;repairTwo.repairDelay=0;
game.updateSupportModules(0);
assert.equal(repairOne.hp,repairOne.maxHp-20,"An attacked Repair Array waits for its own target safe time");
assert.equal(repairTwo.hp,repairTwo.maxHp-15,"A damaged Repair Array still heals another quiet Repair Array");
game.updateSupportModules(.1);
assert.equal(repairTwo.hp,repairTwo.maxHp-15,"Overlapping Repair Arrays do not stack their healing on one target");
game.updateShields(2);game.updateSupportModules(2);
assert.equal(repairOne.hp,repairOne.maxHp-15,"An Array can heal itself or be healed by another once its safe time expires");
repairOne.supportClock=99;repairOne.repairCooldown=0;repairOne.hp-=5;repairTwo.supportClock=0;
const crossRepairHp=repairOne.hp;
game.updateSupportModules(0);
assert.equal(repairOne.hp,crossRepairHp+5,"A second Array directly repairs a quiet first Array even when the first is not pulsing");
game.applyDamageToTile("0,0",1,{kind:"projectile"});game.updateShields(1);
game.applyDamageToTile("0,0",1,{kind:"projectile"});game.updateShields(1);
repairOne.supportClock=99;repairTwo.supportClock=0;
const stillAttackedHp=repairOne.hp;game.updateSupportModules(0);
assert.equal(repairOne.hp,stillAttackedHp,"Repeated hull hits reset the target's repair wait");
const repairingShield=api.makeTile("shield",0,-1,false);game.ship.tiles.set("0,-1",repairingShield);
repairOne.repairDelay=0;game.applyDamageToTile("0,0",1,{kind:"projectile"});
assert.equal(repairOne.repairDelay,0,"Fully shielded hits do not postpone hull repairs");

console.log(JSON.stringify({ passed: true, checks: ["Actual price receipts", "Zero dismantle refund", "No double sale", "Free starter and last weapon guard", "Installed tiles have no drag binding", "No placement in inspector mode", "Object identity and coordinates unchanged by mouse/touch drag", "Connected sale and no branch deletion", "HP and shield state preserved", "Current-count family pricing", "Stationary installed shield preview", "Catalog mouse/touch purchases and shield previews", "Post-drop click suppression and touch tap preview", "Catalog swipe and invalid drop guards", "Contextual family upgrades and preserved selection", "Build-mode gate"] }, null, 2));
