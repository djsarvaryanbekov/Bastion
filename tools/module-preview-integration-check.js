"use strict";

// Root UI/game integration in a VM. No browser, navigation, or real player storage is used.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const plain = value => JSON.parse(JSON.stringify(value));
const marker = "    window.__driftBastion = {";
const original = fs.readFileSync("game.js", "utf8");
assert.ok(original.includes(marker));
const source = original.replace(marker,
  "    window.__previewIntegration = { Game, save, ui, MODULES, defaultSave, sanitizeSave, storeSave, renderStarterPicker, buyModuleUnlock, startRun, startTraining, leaveTraining, returnToMenu, openBuild, closeBuild, createCatalog, renderBuildGrid, placePurchasedModule, openModulePreview, closeModulePreview, modulePreviewAction, modulePreviewState, drawModuleGlyph, current: () => game, session: () => trainingSession, previewSession: () => modulePreviewSession, telemetry: () => playtestTelemetry, selection: () => ({ starter: selectedStarter, module: selectedBuildModule, installed: buildInteraction.selectedKey }), select: type => { selectedBuildModule = type; } };\n" + marker);
let harness = fs.readFileSync(".artifact_build/runtime-check.js", "utf8");
harness = harness.slice(0, harness.indexOf("let installPromptCalls"));
const gameLoad = 'vm.runInNewContext(fs.readFileSync("game.js", "utf8"), sandbox, { filename: "game.js" });';
assert.ok(harness.includes(gameLoad));
const additionalRuntime = `
  // Preserve event capture order and cancellation, which the small shared DOM stub omits.
  function eventTarget(target) {
    const handlers = new Map();
    target.addEventListener = function(type, callback, capture) {
      const entries = handlers.get(type) || [];
      entries.push({callback, capture: capture === true}); handlers.set(type, entries);
      this.listeners[type] = event => {
        const active = handlers.get(type) || [];
        for (const item of active.filter(item => item.capture).concat(active.filter(item => !item.capture))) {
          item.callback(event || {}); if (event && event.immediateStopped) break;
        }
      };
    };
    target.removeEventListener = function(type, callback) {
      handlers.set(type, (handlers.get(type) || []).filter(entry => entry.callback !== callback));
    };
    return target;
  }
  const drawCounts = {main: 0, preview: 0};
  function recordingContext(name) {
    return new Proxy({}, {
      get(target, property) {
        if (Object.prototype.hasOwnProperty.call(target, property)) return target[property];
        const value = context2d[property];
        return typeof value === "function" ? (...args) => { drawCounts[name]++; return value.apply(context2d, args); } : value;
      },
      set(target, property, value) { drawCounts[name]++; target[property] = value; return true; }
    });
  }
  const mainDrawContext = recordingContext("main"), previewDrawContext = recordingContext("preview");
  sandbox.__previewDrawCounts = drawCounts;
  sandbox.__previewDrawContext = previewDrawContext;
  const motionQuery = eventTarget({matches: false, listeners: {}});
  sandbox.matchMedia = query => query === "(prefers-reduced-motion: reduce)" ? motionQuery : {matches: false};
  sandbox.__previewMotion = motionQuery;
  function decorate(element) {
    eventTarget(element);
    let html = element.innerHTML;
    Object.defineProperty(element, "innerHTML", {get() {return html;}, set(value) {html = value; this.children = [];}});
    element.appendChild = function(child) { child.parentNode = this; this.children.push(child); if (child.id) elements.set(child.id, child); return child; };
    element.removeChild = function(child) { this.children = this.children.filter(value => value !== child); child.parentNode = null; };
    element.contains = function(child) { return this === child || this.children.some(value => value.contains(child)); };
    const attributes = {};
    element.setAttribute = function(name,value) { attributes[name] = String(value); };
    element.getAttribute = name => attributes[name];
    element.hasAttribute = name => Object.prototype.hasOwnProperty.call(attributes, name);
    element.removeAttribute = name => { delete attributes[name]; };
    element.focus = function() { documentMock.activeElement = this; };
    element.getClientRects = () => [element.getBoundingClientRect()];
    element.querySelectorAll = function(selector) {
      const descendants = this.children.flatMap(child => [child, ...child.querySelectorAll("*")]);
      if (selector === "*") return descendants;
      return descendants.filter(child => !child.disabled && (child.tagName === "BUTTON" || child.hasAttribute("tabindex")));
    };
    if (element.id === "modulePreviewCanvas") element.getContext = () => previewDrawContext;
    if (element.id === "gameCanvas") element.getContext = () => mainDrawContext;
    return element;
  }
  const baseCreate = documentMock.createElement.bind(documentMock);
  documentMock.createElement = tag => { const result = decorate(baseCreate(tag)); result.tagName = tag.toUpperCase(); return result; };
  documentMock.getElementById = id => {
    if (!elements.has(id)) elements.set(id, decorate(createElement(id)));
    return elements.get(id);
  };
  elements.forEach(decorate);
  eventTarget(documentMock);
  const frames = new Map(); let nextFrame = 1;
  sandbox.requestAnimationFrame = callback => { sandbox.frameCallback = callback; const id = nextFrame++; frames.set(id, callback); return id; };
  sandbox.cancelAnimationFrame = id => frames.delete(id);
  sandbox.__previewFrames = frames;
  sandbox.__previewWindowEvents = windowListeners;
`;
const scripts = ["training.js", "training-arena.js", "training-view.js", "module-preview.js", "module-preview-panel.js"].map(file =>
  `vm.runInNewContext(fs.readFileSync(${JSON.stringify(file)}, "utf8"), sandbox, {filename:${JSON.stringify(file)}});`).join("\n");
const captureRenderer = `
  const createPreview = sandbox.DriftModulePreview.create;
  sandbox.DriftModulePreview.create = function(options) {
    const result = createPreview(options); sandbox.__previewRenderer = result; return result;
  };
  const createPanel = sandbox.DriftModulePreviewPanel.create;
  sandbox.__previewIcons = [];
  sandbox.DriftModulePreviewPanel.create = function(options) {
    const drawIcon = options.drawIcon;
    if (typeof drawIcon !== "function") throw new Error("Root must pass its real module glyph callback into the preview panel");
    const wrapped = Object.assign({}, options, {drawIcon(context, type, ...args) {
      const before = Object.assign({}, sandbox.__previewDrawCounts);
      const result = drawIcon(context, type, ...args);
      sandbox.__previewIcons.push({type, previewContext: context === sandbox.__previewDrawContext,
        mainWrites: sandbox.__previewDrawCounts.main - before.main, previewWrites: sandbox.__previewDrawCounts.preview - before.preview});
      return result;
    }});
    const result = createPanel(wrapped); sandbox.__previewPanel = result; return result;
  };
`;
harness = harness.replace(gameLoad, additionalRuntime + scripts + captureRenderer + gameLoad);
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
const api = runtime.__previewIntegration;
const element = id => runtime.document.getElementById(id);
const persistent = () => ({ save: plain(api.save), storage: plain(Object.fromEntries(storageMap)) });
const fire = (target, type = "click", details = {}) => {
  assert.equal(typeof target.listeners[type], "function", (target.id || "element") + " must bind " + type);
  const event = { target, detail: 1, preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() { this.immediateStopped = true; }, ...details };
  target.listeners[type](event);
};
const card = type => api.ui.weaponPicker.children.find(item => item.dataset.module === type);
const snapshotGame = value => JSON.parse(JSON.stringify(value, (key, item) => {
  if (key === "lastFrame" || key === "accumulator") return undefined;
  if (item instanceof Map) return {entries: Array.from(item)};
  if (item instanceof Set) return {values: Array.from(item)};
  return item;
}));

const frames = runtime.__previewFrames;
const gameFrameIds = new Set(frames.keys());
let clock = 1000;
runtime.performance.now = () => clock;
const panel = () => plain(runtime.__previewPanel.snapshot());
const previewFrames = () => Array.from(frames).filter(([id]) => !gameFrameIds.has(id));
function animate(count = 3) {
  for (let step = 0; step < count; step += 1) {
    clock += 33;
    for (const [id, callback] of previewFrames()) { frames.delete(id); callback(clock); }
  }
}
function closePreview() {
  fire(element("modulePreviewClose"));
  assert.equal(api.previewSession(), null);
  assert.equal(panel().open, false);
  assert.equal(previewFrames().length, 0, "Closing the real dialog must stop its animation frame");
}
const telemetry = () => plain(api.telemetry().getDataForTests());
const report = { verification: "VM UI/game integration and schematic canvas; no browser or layout test", checks: [] };

// All cards, including unavailable, unaffordable and owned support modules, open without purchasing.
api.save.fragmentCarryUnits = 347680;
api.storeSave();
storageMap.set("unrelated-preview-sentinel", "leave-intact");
const initial = persistent(), definitions = plain(api.MODULES);
assert.equal(api.openModulePreview("core", "build"), false, "The fixed core is not one of the 18 module previews");
assert.equal(api.openModulePreview("unknown-module", "hangar"), false);
api.renderStarterPicker();
assert.equal(api.ui.weaponPicker.children.length, 18);
for (const type of Object.keys(api.MODULES)) {
  assert.equal(card(type).disabled, false, type + " remains inspectable regardless of purchase eligibility");
  const selection = plain(api.selection());
  const mainDraws = runtime.__previewDrawCounts.main;
  fire(card(type));
  assert.equal(panel().open, true);
  assert.equal(panel().type, type);
  assert.equal(panel().context, "hangar");
  assert.equal(panel().scene.type, type);
  animate();
  assert.equal(runtime.__previewDrawCounts.main, mainDraws, "Previewing " + type + " cannot draw or write styles on the main game canvas");
  assert.deepEqual(plain(api.selection()), selection, "A module preview cannot change the loadout or Build selection");
  assert.deepEqual(persistent(), initial, "Viewing " + type + " cannot write progress, currency, or telemetry storage");
  closePreview();
}
assert.deepEqual(plain(api.MODULES), definitions, "A schematic simulation cannot mutate live module definitions");
assert.deepEqual(Array.from(new Set(runtime.__previewIcons.map(icon => icon.type))).sort(), Object.keys(api.MODULES).concat("core").sort(),
  "All 18 modules and the Core must invoke the actual game's glyph callback");
assert.ok(runtime.__previewIcons.every(icon => icon.previewContext && icon.previewWrites > 0 && icon.mainWrites === 0),
  "Each actual glyph callback must draw only into the provided preview context");
const countsBeforeDefaultGlyph = {...runtime.__previewDrawCounts};
api.drawModuleGlyph({type: "cannon", aim: 0}, 0, 0);
assert.ok(runtime.__previewDrawCounts.main > countsBeforeDefaultGlyph.main);
assert.equal(runtime.__previewDrawCounts.preview, countsBeforeDefaultGlyph.preview, "The unchanged three-argument gameplay call must still use the main canvas");
report.checks.push("All 18 cards preview while locked, poor or owned; no purchase, loadout change, storage write, or shared-definition mutation");
report.checks.push("All 18 actual module glyph callbacks draw on preview canvas only; existing gameplay call still draws on its own canvas");

// Visibility and user pause stop the real dialog's RAF; resume cannot replay hidden time.
fire(card("shield"));
animate();
assert.ok(previewFrames().length > 0);
runtime.document.hidden = true;
fire(runtime.document, "visibilitychange");
assert.equal(previewFrames().length, 0);
const hiddenTime = panel().scene.time;
clock += 60000;
runtime.document.hidden = false;
fire(runtime.document, "visibilitychange");
animate(1);
assert.ok(panel().scene.time - hiddenTime < .1, "Returning to a preview must not simulate the hidden minute");
fire(element("modulePreviewPlayPause"));
assert.equal(previewFrames().length, 0, "The real pause control must stop preview animation");
fire(element("modulePreviewPlayPause"));
assert.ok(previewFrames().length > 0);
runtime.__previewMotion.matches = true;
fire(runtime.__previewMotion, "change", {matches: true});
assert.equal(panel().playing, false);
assert.equal(panel().scene.playing, false);
assert.equal(previewFrames().length, 0);
assert.equal(element("modulePreviewPlayPause").textContent, "Play preview", "A live reduced-motion preference change must update the control immediately");
fire(element("modulePreviewPlayPause"));
assert.equal(panel().playing, true, "The first explicit click must resume from media-triggered pause");
assert.equal(panel().scene.playing, true);
assert.ok(previewFrames().length > 0);
assert.equal(element("modulePreviewPlayPause").textContent, "Pause preview");
closePreview();
runtime.__previewMotion.matches = false;
fire(runtime.__previewMotion, "change", {matches: false});
assert.deepEqual(persistent(), initial);
report.checks.push("Dialog close, visibility hiding and user pause stop RAF; restoring visibility avoids catch-up");
report.checks.push("Changing reduced-motion preference pauses scene and control together; one explicit Play click resumes");

// An eligible but poor card is inspectable, and affordability is checked again at action time.
api.save.progression.totalKills = 15;
api.save.fragments = 3;
api.storeSave(); api.renderStarterPicker();
const poor = persistent();
fire(card("scatter"));
assert.equal(panel().actionKind, "buy");
assert.equal(panel().actionDisabled, true);
assert.equal(api.modulePreviewAction("scatter", "buy"), false);
assert.deepEqual(persistent(), poor);
closePreview();
api.save.fragments = 20;
api.storeSave(); api.renderStarterPicker();
fire(card("scatter"));
const enabledBuy = element("modulePreviewAction");
assert.equal(enabledBuy.disabled, false);
api.save.fragments = 3; api.storeSave();
const changedBalance = persistent();
fire(enabledBuy);
assert.deepEqual(persistent(), changedBalance, "A stale enabled button must revalidate the current balance");
assert.equal(api.save.progression.purchasedModules.includes("scatter"), false);
closePreview();

api.save.fragments = 20; api.storeSave(); api.renderStarterPicker();
fire(card("scatter"));
const buyOnce = element("modulePreviewAction");
const starterBefore = api.save.lastLoadout.selectedWeapon;
animate();
const timeBeforeBuy = panel().scene.time;
fire(buyOnce);
assert.equal(panel().scene.time, timeBeforeBuy, "Updating ownership/actions must not restart the scene");
assert.equal(api.save.fragments, 12);
assert.equal(api.save.fragmentCarryUnits, 347680, "Buying a licence spends whole Fragments only; the saved fractional reward is retained");
assert.equal(api.save.progression.purchasedModules.filter(type => type === "scatter").length, 1);
assert.equal(api.save.lastLoadout.selectedWeapon, starterBefore, "Unlocking a licence cannot silently equip a different starter");
const purchased = persistent();
fire(buyOnce);
fire(buyOnce, "click", {detail: 2});
assert.deepEqual(persistent(), purchased, "Repeated or stale purchase clicks must not spend again or equip the new weapon");
assert.equal(api.modulePreviewAction("scatter", "buy"), false);
assert.equal(api.modulePreviewAction("laser", "buy"), false, "A mismatched type cannot use the open dialog's action");
closePreview();
fire(card("scatter"));
assert.equal(panel().actionKind, "starter");
fire(element("modulePreviewAction"));
assert.equal(api.save.lastLoadout.selectedWeapon, "scatter", "Only the explicit starter action changes the loadout");
closePreview();
report.checks.push("Explicit licence purchase charges once; stale balance/type/double clicks are rejected; starter selection is separate");

// New eligibility stays silent in combat; optional previews remain available through explicit actions.
api.save.progression.totalKills = 29;
api.storeSave();
api.startRun();
const game = api.current();
game.elapsed = 40;
game.recordProgress({kills: 1});
assert.equal(api.current().state, "playing");
assert.equal(api.previewSession(), null);
assert.equal(panel().open, false);
assert.equal(previewFrames().length, 0);
const notification = api.ui.toast.children.find(child => child.className === "toast-preview");
assert.equal(notification, undefined, "New eligibility must not add an in-combat purchase or preview notification");
assert.equal(game.runUnlocks.length, 0, "Currency-only licenses do not fabricate combat discoveries");
const liveBefore = snapshotGame(game), liveSave = plain(api.save), liveTelemetry = telemetry();
assert.equal(api.openModulePreview("reactor", "unlock"), true);
assert.equal(panel().type, "reactor");
assert.equal(game.state, "paused");
assert.equal(panel().actionDisabled, true, "A live run cannot buy a permanent licence from the preview");
assert.equal(api.modulePreviewAction("reactor", "buy"), false);
const pausedTelemetry = telemetry();
assert.equal(api.openModulePreview("cannon", "unlock"), true);
assert.deepEqual(telemetry(), pausedTelemetry, "Switching previews must not nest pause events or overwrite the original run state");
animate(6); game.update(10);
assert.equal(game.elapsed, liveBefore.elapsed);
assert.deepEqual(plain(api.save), liveSave);
for (const code of ["KeyP", "KeyB", "KeyW", "KeyA", "KeyS", "KeyD"]) {
  runtime.__previewWindowEvents.keydown({code, repeat: false, preventDefault() {}});
  assert.equal(game.state, "paused");
  assert.equal(panel().open, true, code + " cannot operate the underlying game while the preview is open");
}
assert.deepEqual(telemetry(), pausedTelemetry, "Schematic frames and blocked game input cannot generate combat/economic events");
runtime.__previewWindowEvents.keydown({code: "Escape", repeat: false, preventDefault() {}});
assert.equal(panel().open, false);
assert.equal(api.current(), game);
assert.deepEqual(snapshotGame(game), liveBefore, "Closing a live preview restores the same ship, enemies, time and state");
assert.deepEqual(plain(api.save), liveSave);
const beforeEvents = liveTelemetry.runs.at(-1).events;
const addedEvents = telemetry().runs.at(-1).events.slice(beforeEvents.length);
assert.equal(addedEvents.length, 2, "A live preview records only its legitimate pause/resume pair");
assert.ok(addedEvents.every(event => event.type === "pause_opened" || event.type === "pause_closed"), JSON.stringify(addedEvents));
assert.equal(addedEvents[0].data.reason, "module_preview");
report.checks.push("Unlocks stay silent in combat; explicit live preview blocks gameplay and restores the exact run, adding only pause/resume telemetry");

// Build and already-paused previews have no telemetry side effects and retain installed selection.
api.openBuild();
api.renderBuildGrid();
const installed = api.ui.buildGrid.children.find(cell => cell.dataset.x === "0" && cell.dataset.y === "-1");
assert.equal(installed.listeners.pointerdown, undefined);
fire(installed);
const buildSelection = plain(api.selection()), buildBefore = snapshotGame(game), buildStorage = persistent(), buildTelemetry = telemetry();
fire(element("buildModulePreview"));
assert.equal(panel().context, "build");
assert.equal(panel().type, "scatter");
assert.equal(panel().actionKind, null);
assert.equal(game.state, "building");
assert.equal(api.placePurchasedModule(1, 0), false);
api.closeBuild(); assert.equal(game.state, "building", "A stale Resume callback cannot close Build under its preview");
animate(); closePreview();
assert.deepEqual(snapshotGame(game), buildBefore);
assert.deepEqual(plain(api.selection()), buildSelection);
assert.deepEqual(persistent(), buildStorage);
assert.deepEqual(telemetry(), buildTelemetry);
api.closeBuild();
fire(api.ui.pauseButton);
const pauseBefore = snapshotGame(game), pauseStorage = persistent(), pauseTelemetry = telemetry();
assert.equal(api.openModulePreview("armor", "unlock"), true);
animate(); closePreview();
assert.deepEqual(snapshotGame(game), pauseBefore);
assert.deepEqual(persistent(), pauseStorage);
assert.deepEqual(telemetry(), pauseTelemetry);
report.checks.push("Build inspector preview retains installed selection and cannot place/move/sell implicitly; existing pause remains paused without extra telemetry");

// Training and game replacement close old dialogs and their RAF without resurrecting an old owner.
api.startTraining();
const training = api.current(), trainingBefore = snapshotGame(training), lessonBefore = plain(api.session().controller.snapshot()), trainingStorage = persistent();
assert.equal(api.openModulePreview("shield", "build"), true);
animate(); training.update(10); closePreview();
assert.equal(api.current(), training);
assert.deepEqual(snapshotGame(training), trainingBefore);
assert.deepEqual(plain(api.session().controller.snapshot()), lessonBefore);
assert.deepEqual(persistent(), trainingStorage);
api.openModulePreview("cannon", "build");
api.leaveTraining();
assert.equal(api.current(), game);
assert.equal(panel().open, false);
assert.equal(previewFrames().length, 0);
api.closeModulePreview();
assert.equal(api.current(), game);
assert.equal(game.state, "paused", "Closing a stale training dialog cannot resume the suspended Survival run");
api.openModulePreview("armor", "unlock");
api.returnToMenu();
assert.equal(panel().open, false);
assert.equal(previewFrames().length, 0);
api.closeModulePreview();
assert.equal(api.current(), null);
report.checks.push("Training preview preserves its exact controller/game/save; leaving training and returning to menu destroy stale preview ownership and RAF");

report.passed = true;
const output = path.join("outputs", "gradual-progression-2026-09-09", "preview-integration-report.json");
fs.mkdirSync(path.dirname(output), {recursive: true});
fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
