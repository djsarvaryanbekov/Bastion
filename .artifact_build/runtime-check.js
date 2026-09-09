"use strict";

const fs = require("fs");
const vm = require("vm");
let downloadClicks = 0;

function createClassList() {
  const values = new Set();
  return {
    add(...items) { items.forEach((item) => values.add(item)); },
    remove(...items) { items.forEach((item) => values.delete(item)); },
    toggle(item, force) {
      if (force === true) values.add(item);
      else if (force === false) values.delete(item);
      else if (values.has(item)) values.delete(item);
      else values.add(item);
      return values.has(item);
    },
    contains(item) { return values.has(item); }
  };
}

function createElement(id) {
  return {
    id,
    classList: createClassList(),
    style: { setProperty(name, value) { this[name] = value; } },
    dataset: {},
    value: "0",
    checked: false,
    disabled: false,
    textContent: "",
    innerHTML: "",
    children: [],
    listeners: {},
    appendChild(child) { this.children.push(child); return child; },
    click() { downloadClicks += 1; },
    remove() {},
    addEventListener(type, callback) { this.listeners[type] = callback; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 116, height: 116 }; },
    setPointerCapture() {},
    setAttribute() {},
    getContext: id === "gameCanvas" || id === "canvas" ? () => context2d : undefined
  };
}

const gradient = { addColorStop() {} };
const context2d = new Proxy({
  createRadialGradient() { return gradient; },
  measureText(value) { return { width: String(value).length * 8 }; }
}, {
  get(target, property) {
    if (property in target) return target[property];
    return () => {};
  },
  set(target, property, value) {
    target[property] = value;
    return true;
  }
});

const elements = new Map();
const documentMock = {
  body: createElement("body"),
  documentElement: createElement("html"),
  fullscreenElement: null,
  listeners: {},
  addEventListener(type, callback) { this.listeners[type] = callback; },
  removeEventListener(type, callback) { if (this.listeners[type] === callback) delete this.listeners[type]; },
  elementFromPoint() { return this.pointerElement || null; },
  getElementById(id) {
    if (!elements.has(id)) elements.set(id, createElement(id));
    return elements.get(id);
  },
  createElement(tag) { return createElement(tag); },
  querySelectorAll() { return []; }
};

const storage = new Map();
const sandbox = {
  console,
  document: documentMock,
  innerWidth: 1280,
  innerHeight: 720,
  location: { search: process.env.BALANCE_SECONDS ? "" : "?debug=1" },
  navigator: { userAgent: "Drift Bastion Runtime Check", language: "en", maxTouchPoints: 0, hardwareConcurrency: 4 },
  localStorage: {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); }
  },
  performance: { now: () => 1000 },
  requestAnimationFrame(callback) { sandbox.frameCallback = callback; return 1; },
  cancelAnimationFrame() {},
  setTimeout,
  clearTimeout,
  URLSearchParams,
  Map,
  Set,
  Math,
  Date
};
sandbox.Blob = function Blob(parts, options) { this.parts = parts; this.type = options && options.type; };
sandbox.URL = { createObjectURL() { return "blob:test"; }, revokeObjectURL() {} };
sandbox.window = sandbox;
sandbox.window.devicePixelRatio = 1;
const windowListeners = {};
sandbox.window.addEventListener = (type, callback) => { windowListeners[type] = callback; };
sandbox.window.matchMedia = () => ({ matches: false });

let fullscreenRequests = 0;
documentMock.documentElement.requestFullscreen = () => {
  fullscreenRequests += 1;
  return Promise.resolve();
};

vm.runInNewContext(fs.readFileSync("telemetry.js", "utf8"), sandbox, { filename: "telemetry.js" });
vm.runInNewContext(fs.readFileSync("progression.js", "utf8"), sandbox, { filename: "progression.js" });
vm.runInNewContext(fs.readFileSync("progression-view.js", "utf8"), sandbox, { filename: "progression-view.js" });
vm.runInNewContext(fs.readFileSync("run-upgrades.js", "utf8"), sandbox, { filename: "run-upgrades.js" });
vm.runInNewContext(fs.readFileSync("campaign.js", "utf8"), sandbox, { filename: "campaign.js" });
vm.runInNewContext(fs.readFileSync("game.js", "utf8"), sandbox, { filename: "game.js" });
if (!sandbox.window.__driftBastion || typeof sandbox.frameCallback !== "function") {
  throw new Error("Game did not initialize its public state and animation loop.");
}
let installPromptCalls = 0;
windowListeners.beforeinstallprompt({
  preventDefault() {},
  prompt() { installPromptCalls += 1; },
  userChoice: Promise.resolve({ outcome: "accepted" })
});
if (documentMock.getElementById("installButton").classList.contains("hidden")) {
  throw new Error("Install Fullscreen did not appear when the browser offered PWA installation.");
}
documentMock.getElementById("installButton").listeners.click();
if (installPromptCalls !== 1 || !documentMock.getElementById("installButton").classList.contains("hidden")) {
  throw new Error("Install Fullscreen did not invoke and consume the browser install prompt.");
}
const storageBeforeLoadout = JSON.stringify(Array.from(storage));
if (!process.env.BALANCE_SECONDS) {
  documentMock.getElementById("menuLoadoutButton").listeners.click();
  documentMock.getElementById("weaponPicker").children.find(button => button.dataset.module === "cannon").listeners.click();
}
if (!process.env.BALANCE_SECONDS && JSON.stringify(Array.from(storage)) !== storageBeforeLoadout) {
  throw new Error("Opening the loadout and inspecting a card must not write a save.");
}
documentMock.getElementById("hangarMenuButton").listeners.click();
if (!documentMock.getElementById("menuOverlay").classList.contains("hidden") || documentMock.getElementById("hangarOverlay").classList.contains("hidden")) {
  throw new Error("Hangar did not replace the start screen.");
}
documentMock.getElementById("hangarWeaponTab").listeners.click();
if (!documentMock.getElementById("hangarUpgradesPanel").classList.contains("hidden") || documentMock.getElementById("hangarWeaponsPanel").classList.contains("hidden")) {
  throw new Error("Hangar armory tab did not switch panels.");
}
documentMock.getElementById("closeHangar").listeners.click();
documentMock.getElementById("menuSettingsButton").listeners.click();
if (documentMock.getElementById("pauseTitle").textContent !== "Settings" || documentMock.getElementById("pauseOverlay").classList.contains("hidden")) {
  throw new Error("Menu settings did not open the settings panel.");
}
documentMock.getElementById("resumeButton").listeners.click();
if (!documentMock.getElementById("pauseOverlay").classList.contains("hidden")) {
  throw new Error("Menu settings did not close cleanly.");
}
sandbox.window.matchMedia = () => ({ matches: true });
documentMock.getElementById("startButton").listeners.click();
const persistedSave = Array.from(storage.values()).map((value) => JSON.parse(value)).find((value) => value && value.lastLoadout);
if (!persistedSave || persistedSave.lastLoadout.selectedWeapon !== "cannon" || persistedSave.lastLoadout.tile.type !== "cannon") {
  throw new Error("Starting the run must preserve the actual owned Cannon selection in both loadout fields.");
}
if (fullscreenRequests !== 1) throw new Error("Mobile Play did not request fullscreen mode.");
if (!sandbox.window.PlaytestTelemetry.getStatus().active) throw new Error("Playtest telemetry did not begin with the run.");
sandbox.window.matchMedia = () => ({ matches: false });
const gameCanvas = documentMock.getElementById("gameCanvas");
const joystickStart = { pointerId: 7, pointerType: "touch", clientX: 420, clientY: 310, preventDefault() {} };
const joystickMove = { pointerId: 7, pointerType: "touch", clientX: 528, clientY: 310, preventDefault() {} };
gameCanvas.listeners.pointerdown(joystickStart);
gameCanvas.listeners.pointermove(joystickMove);
const joystickState = sandbox.window.__driftBastion.getState();
if (!joystickState.mobileInput.active || joystickState.mobileInput.originX !== 420 || joystickState.mobileInput.originY !== 310 || joystickState.mobileInput.x < .9 || joystickState.mobileInput.magnitude < .9) {
  throw new Error("Floating joystick did not originate at the touch point and produce a full-strength rightward vector.");
}
if (documentMock.getElementById("mobileMoveZone").style.left !== "420.0px" || !documentMock.getElementById("mobileMoveZone").classList.contains("active")) {
  throw new Error("Floating joystick visual did not appear at the touch origin.");
}
gameCanvas.listeners.pointerup(joystickMove);
if (sandbox.window.__driftBastion.getState().mobileInput.active) {
  throw new Error("Mobile joystick input remained active after release.");
}
gameCanvas.listeners.pointerdown({ pointerId: 8, pointerType: "mouse", clientX: 200, clientY: 200, preventDefault() {} });
if (sandbox.window.__driftBastion.getState().mobileInput.active) throw new Error("Desktop mouse input incorrectly activated the floating joystick.");
documentMock.getElementById("mobileBuildButton").listeners.click();
if (sandbox.window.__driftBastion.getState().screen !== "building") throw new Error("Mobile build control did not open Build mode.");
documentMock.getElementById("closeBuild").listeners.click();
documentMock.getElementById("mobilePauseButton").listeners.click();
if (sandbox.window.__driftBastion.getState().screen !== "paused") throw new Error("Mobile settings control did not pause combat.");
documentMock.getElementById("resumeButton").listeners.click();
const balanceSeconds = Math.max(0, Number(process.env.BALANCE_SECONDS) || 0);
if (balanceSeconds > 0) {
  let peakEnemies = 0;
  let peakProjectiles = 0;
  let result = sandbox.window.__driftBastion.getState();
  const balanceStartedAt = process.hrtime.bigint();
  for (let frameIndex = 1; frameIndex <= balanceSeconds * 60 && result.screen === "playing"; frameIndex += 1) {
    sandbox.frameCallback(1000 + frameIndex * (1000 / 60));
    result = sandbox.window.__driftBastion.getState();
    peakEnemies = Math.max(peakEnemies, result.activeEnemies || 0);
    peakProjectiles = Math.max(peakProjectiles, result.activeProjectiles || 0);
  }
  const balanceMilliseconds = Number(process.hrtime.bigint() - balanceStartedAt) / 1e6;
  console.log(`Balance simulation ended at ${result.elapsed.toFixed(1)}s with state ${result.screen}, threat ${result.threatLevel}, assaults ${result.assaultIndex}, ambient packs ${result.ambientPacks}, spawned ${result.totalEnemiesSpawned}, peaks E${peakEnemies}/P${peakProjectiles}, simulated in ${balanceMilliseconds.toFixed(1)} ms.`);
  process.exit(0);
}
sandbox.window.__driftBastion.spawnBoss();
sandbox.frameCallback(1017);
const runningState = sandbox.window.__driftBastion.getState();
if (runningState.screen !== "playing" || !runningState.bossSpawned) {
  throw new Error("Combat bootstrap or boss locator scenario failed.");
}
documentMock.getElementById("debugStress").listeners.click();
const stressStartedAt = process.hrtime.bigint();
const stressFrames = Math.max(1, Number(process.env.STRESS_FRAMES) || 120);
for (let frameIndex = 1; frameIndex <= stressFrames; frameIndex += 1) {
  sandbox.frameCallback(1017 + frameIndex * (1000 / 60));
}
const stressMilliseconds = Number(process.hrtime.bigint() - stressStartedAt) / 1e6;
const stressedState = sandbox.window.__driftBastion.getState();
if (stressedState.screen !== "playing") throw new Error("Stress simulation did not remain playable.");
if (!stressedState.pools || stressedState.pools.projectiles < 0 || stressedState.qualityTier < 0) {
  throw new Error("Runtime performance telemetry is unavailable.");
}
documentMock.getElementById("debugKillBoss").listeners.click();
const afterBoss = sandbox.window.__driftBastion.getState();
if (afterBoss.finished || afterBoss.bossesDefeated !== 1 || afterBoss.bossSpawned) {
  throw new Error("Boss defeat must continue survival and schedule the next encounter.");
}
documentMock.getElementById("pauseHangarButton").listeners.click();
const playtestData = sandbox.window.PlaytestTelemetry.getDataForTests();
const recordedRun = playtestData.runs[playtestData.runs.length - 1];
if (!recordedRun || !recordedRun.endedAt || recordedRun.outcome !== "retired" || recordedRun.samples.length < 2) {
  throw new Error("Playtest telemetry did not finalize a banked endless run.");
}
if (!recordedRun.events.some((event) => event.type === "boss_spawned") || !recordedRun.events.some((event) => event.type === "boss_defeated")) {
  throw new Error("Playtest telemetry did not capture the boss milestones.");
}
documentMock.getElementById("resultExportTelemetry").listeners.click();
if (downloadClicks !== 1) throw new Error("Playtest JSON export did not trigger a download.");
sandbox.window.PlaytestTelemetry.beginRun({ starterWeapon: "cannon" }, { elapsed: 0, coreHpRatio: 1 });
if (!sandbox.window.PlaytestTelemetry.shouldSample(4.999)) throw new Error("Telemetry did not accept the five-second boundary sample.");
sandbox.window.PlaytestTelemetry.sample({ elapsed: 4.999, coreHpRatio: 1 });
if (sandbox.window.PlaytestTelemetry.shouldSample(5)) throw new Error("Telemetry duplicated a sample around a floating-point interval boundary.");
sandbox.window.PlaytestTelemetry.abandonRun("test_complete", 5);
console.log(`Runtime bootstrap and stress check passed in ${stressMilliseconds.toFixed(1)} ms (pools E${stressedState.pools.enemies}/P${stressedState.pools.projectiles}/V${stressedState.pools.particles}/F${stressedState.pools.effects}).`);
