"use strict";
// Shared helpers for the 2026-11-13 full QA pass. Tests run on an instrumented COPY of the main HTML
// (one hook exposing the live game object); the main HTML and the user's save are never touched.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "../..");
const OUT = __dirname;
// QA_HTML points every phase at a candidate build instead of the main HTML.
const MAIN_HTML = process.env.QA_HTML ? path.resolve(process.env.QA_HTML) : path.join(ROOT, "outputs/Drift_Bastion_Playtest.html");
const SAVE_KEY = "drift-bastion-save-v2";
const HOOK = "window.__qa = { game: function () { return game; }, MODULES: MODULES, ENEMY_DEFS: ENEMY_DEFS, " +
  "startNextWave: startNextWave, openBuild: openBuild, closeBuild: closeBuild, save: function () { return save; }, " +
  "modulePrice: modulePrice, buy: function (type, x, y) { selectedBuildModule = type; return placePurchasedModule(x, y); } };\n    ";

function instrumentedCopy(source = MAIN_HTML, name = "Drift_Bastion_QA.html") {
  const html = fs.readFileSync(source, "utf8");
  const marker = "window.__driftBastion = {";
  if (html.split(marker).length !== 2) throw new Error("Hook marker not found exactly once in " + source);
  const dir = path.join(os.tmpdir(), "bastion-qa-2026-11-13");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  fs.writeFileSync(file, html.replace(marker, HOOK + marker));
  return file;
}

function url(file, query = "") { return pathToFileURL(file).href + query; }

async function launch(options = {}) {
  return chromium.launch(Object.assign({ headless: true }, options));
}

// Fresh context = isolated localStorage. Seeds a muted save so audio never plays.
async function newPage(browser, { width = 1920, height = 1080, dpr = 1, save = {} } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr, locale: "en-US" });
  const page = await context.newPage();
  const log = { pageErrors: [], consoleErrors: [], consoleWarnings: [] };
  page.on("pageerror", e => log.pageErrors.push(e.message));
  page.on("console", m => {
    if (m.type() === "error") log.consoleErrors.push(m.text());
    if (m.type() === "warning") log.consoleWarnings.push(m.text());
  });
  const seed = Object.assign({ version: 9, settings: { muted: true, autoPause: false } }, save);
  await page.addInitScript(([key, value]) => { localStorage.setItem(key, value); }, [SAVE_KEY, JSON.stringify(seed)]);
  return { context, page, log };
}

// Visible-control audit: off-screen, covered by another element, clipped text, zero-size.
async function auditControls(page) {
  return page.evaluate(() => {
    const selector = "button, a[href], input, select, summary, [role=button], .catalog-card, .build-cell, .research-node";
    const issues = [];
    const controls = [];
    const vw = innerWidth, vh = innerHeight;
    for (const el of document.querySelectorAll(selector)) {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || el.closest(".hidden")) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (Number(style.opacity) === 0) continue;
      const label = (el.id ? "#" + el.id : el.className ? "." + String(el.className).split(" ")[0] : el.tagName) +
        " '" + (el.innerText || el.value || el.getAttribute("aria-label") || "").trim().slice(0, 40).replace(/\s+/g, " ") + "'";
      controls.push(label);
      // Elements inside a scroll container may legitimately sit outside the viewport.
      let scroller = el.parentElement, scrolled = false;
      while (scroller && scroller !== document.body) {
        const s = getComputedStyle(scroller);
        if (/(auto|scroll)/.test(s.overflowY + s.overflowX)) { scrolled = true; break; }
        scroller = scroller.parentElement;
      }
      if (!scrolled && (r.right < 1 || r.bottom < 1 || r.left > vw - 1 || r.top > vh - 1)) { issues.push({ kind: "offscreen", label }); continue; }
      if (!scrolled && (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1)) issues.push({ kind: "partly-offscreen", label, rect: [r.left, r.top, r.right, r.bottom].map(Math.round) });
      if (r.width < 8 || r.height < 8) issues.push({ kind: "tiny", label, size: [Math.round(r.width), Math.round(r.height)] });
      const cx = Math.min(vw - 1, Math.max(0, r.left + r.width / 2)), cy = Math.min(vh - 1, Math.max(0, r.top + r.height / 2));
      const hit = document.elementFromPoint(cx, cy);
      if (!scrolled && hit && hit !== el && !el.contains(hit) && !hit.contains(el)) {
        const hitLabel = hit.id ? "#" + hit.id : hit.tagName + "." + String(hit.className).split(" ")[0];
        // HUD buttons sitting under a modal overlay are expected, not a layout fault.
        const modal = hit.closest("[id$=Overlay]") || document.querySelector("#buildOverlay:not(.hidden)");
        const hudUnderModal = el.closest("#hud, #bossHud") && modal && !modal.contains(el);
        if (hit.tagName !== "CANVAS" && !hudUnderModal) issues.push({ kind: "covered", label, by: hitLabel });
      }
      if (el.tagName === "BUTTON" && (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2) && style.overflow !== "visible")
        issues.push({ kind: "text-clipped", label, scroll: [el.scrollWidth, el.clientWidth, el.scrollHeight, el.clientHeight] });
    }
    const pageOverflow = document.documentElement.scrollWidth > vw + 1 || document.documentElement.scrollHeight > vh + 1;
    if (pageOverflow) issues.push({ kind: "page-scrollbars", size: [document.documentElement.scrollWidth, document.documentElement.scrollHeight] });
    return { controls: controls.length, controlLabels: controls, issues };
  });
}

// In-page game drivers (run through page.evaluate). They use the live game object, so no debug bar is shown.
const DRIVERS = `
window.__qaAdvance = function (seconds) {
  var g = window.__qa.game(); var steps = Math.ceil(seconds * 30);
  for (var i = 0; i < steps && g.state === "playing" && !g.finished; i += 1) g.update(1 / 30);
  return g.state;
};
window.__qaClearWave = function () {
  var g = window.__qa.game();
  if (g.boss && !g.boss.dead) g.damageEnemy(g.boss, g.boss.hp + (g.boss.shield || 0) + 1, g.boss.x, g.boss.y);
  g.beginSweep(); g.beginWaveClear();
  for (var i = 0; i < 300 && g.state === "playing" && !g.finished; i += 1) g.update(1 / 30);
  return g.state;
};
window.__qaJumpToWave = function (wave) {
  var g = window.__qa.game(); if (g.state !== "intermission") return false;
  g.wave = wave - 1; g.cardPicked = true; window.__qa.startNextWave(); return g.wave;
};
`;

async function installDrivers(page) { await page.evaluate(DRIVERS); }

function writeJson(name, data) {
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 2));
}

module.exports = { ROOT, OUT, MAIN_HTML, SAVE_KEY, instrumentedCopy, url, launch, newPage, auditControls, installDrivers, writeJson };
