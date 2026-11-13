"use strict";
// Phase 1 — UI walk. Visits every screen, audits every visible control, screenshots each screen.
// Usage: node qa-ui.cjs [--viewport=1920x1080@1] [--languages]
const fs = require("node:fs");
const path = require("node:path");
const q = require("./qa-lib.cjs");

const arg = process.argv.find(a => a.startsWith("--viewport="));
const [size, dprText] = (arg ? arg.split("=")[1] : "1920x1080@1").split("@");
const [width, height] = size.split("x").map(Number);
const dpr = Number(dprText || 1);
const tag = `${width}x${height}@${dpr}`;
const shots = path.join(q.OUT, "screens", (process.env.QA_TAG ? process.env.QA_TAG + "-" : "") + tag);
fs.mkdirSync(shots, { recursive: true });

const results = { viewport: tag, steps: [], screens: {}, failures: [] };

(async () => {
  const file = q.instrumentedCopy();
  const browser = await q.launch();
  const { page, log } = await q.newPage(browser, { width, height, dpr, save: { fragments: 3000, training: { version: 1, completed: true } } });
  const settle = (ms = 350) => page.waitForTimeout(ms);
  const state = () => page.evaluate(() => window.__driftBastion.getState());
  const g = (fn, arg) => page.evaluate(fn, arg);

  async function screen(name) {
    await settle();
    const audit = await q.auditControls(page);
    await page.screenshot({ path: path.join(shots, name + ".png") });
    results.screens[name] = { controls: audit.controls, issues: audit.issues };
    return audit;
  }
  async function step(name, fn) {
    const t0 = Date.now();
    try { await fn(); results.steps.push({ name, ok: true, ms: Date.now() - t0 }); }
    catch (e) { results.steps.push({ name, ok: false, error: e.message.split("\n")[0] }); results.failures.push(name + ": " + e.message.split("\n")[0]); }
  }
  async function click(sel) { await page.locator(sel).first().click({ timeout: 4000 }); await settle(200); }
  async function visible(sel) { return page.locator(sel).first().isVisible(); }
  function expect(cond, msg) { if (!cond) throw new Error(msg); }

  await page.goto(q.url(file) + "?debug=1");
  await page.addStyleTag({ content: "#debugBar{display:none!important}" });
  await page.evaluate(() => window.DriftModuleArt && window.DriftModuleArt.ready);
  await q.installDrivers(page);

  await step("menu", async () => { await screen("01-menu"); expect(await visible("#startButton"), "Start missing"); });

  await step("settings", async () => {
    await click("#menuSettingsButton");
    await screen("02-settings");
    await page.locator("#volumeSlider").fill("30");
    await page.locator("#shakeSlider").fill("50");
    for (const id of ["#reducedFlashToggle", "#damageNumbersToggle", "#autoPauseToggle"]) { await page.locator(id).click(); await page.locator(id).click(); }
    for (const v of ["1", "2", "0"]) await page.locator("#qualitySelect").selectOption(v);
    for (const v of ["30", "0"]) await page.locator("#fpsLimitSelect").selectOption(v);
    const saved = await g(() => JSON.parse(localStorage.getItem("drift-bastion-save-v2")).settings);
    expect(Math.abs(saved.masterVolume - 0.3) < 0.01, "volume not saved: " + saved.masterVolume);
    for (const scale of ["125", "150"]) {
      await page.locator("#uiScaleSelect").selectOption(scale);
      await screen("02-settings-ui" + scale);
    }
    await page.locator("#uiScaleSelect").selectOption("100");
    await page.keyboard.press("Escape"); await settle();
    expect(!(await visible("#volumeSlider")), "Escape did not close settings");
  });

  await step("hangar", async () => {
    await click("#hangarMenuButton");
    await click("#hangarWeaponTab");
    await screen("03-hangar-modules");
    const scroll = await g(() => {
      const list = document.querySelector("#hangarWeaponsPanel .pick-button") && document.querySelector("#hangarWeaponsPanel .pick-button").parentElement;
      const inspector = document.querySelector("#hangarModuleDetails");
      return { listScrolls: list ? list.scrollHeight > list.clientHeight : null, inspectorOverflow: inspector ? inspector.scrollHeight > inspector.clientHeight + 1 : null };
    });
    results.hangarScroll = scroll;
    const cards = page.locator("#hangarWeaponsPanel .pick-button:visible");
    const count = await cards.count();
    results.hangarModuleCards = count;
    for (let i = 0; i < count; i++) { await cards.nth(i).click(); }
    await screen("03-hangar-module-last");
    for (const [tab, name] of [["#pcCoresTab", "cores"], ["#hangarUpgradeTab", "permanent"], ["#pcResearchTab", "research"]]) {
      if (await page.locator(tab).count()) { await click(tab); await screen("03-hangar-" + name); }
    }
    await click("#closeHangar");
    expect(await visible("#startButton"), "Hangar close did not return to menu");
  });

  await step("range", async () => {
    await click("#pcRangeMenu");
    await screen("04-range");
    await click("#pcRangeBuild");
    await screen("04-range-build");
    await click('.build-cell[data-x="0"][data-y="-1"]');
    await click("#pcUpgradesTab");
    await screen("04-range-tree");
    await page.keyboard.press("Escape"); await page.keyboard.press("Escape"); await settle();
    await click("#pcRangeExit");
    expect(await visible("#startButton"), "Range exit did not return to menu");
  });

  await step("waves-hud", async () => {
    await click("#startButton");
    const s = await state();
    expect(s.screen === "playing", "Run did not start: " + s.screen);
    await g(() => window.__qaAdvance(6));
    await screen("05-waves-hud");
    const ws = await g(() => window.__driftBastion.waveState());
    results.wave1 = ws;
    expect(ws && ws.wave === 1, "Not on wave 1");
  });

  await step("pause", async () => {
    await click("#pauseButton");
    await screen("06-pause");
    await click("#pauseSettingsButton");
    await screen("06-pause-settings");
    await page.keyboard.press("Escape"); await settle();
    await click("#resumeButton");
    expect((await state()).screen === "playing", "Resume failed");
    await page.keyboard.press("Escape"); await settle();
    expect((await state()).screen === "paused", "Escape did not pause");
    await page.keyboard.press("Escape"); await settle();
    expect((await state()).screen === "playing", "Escape did not resume");
  });

  await step("build-blocked-midwave", async () => {
    await page.keyboard.press("b"); await settle();
    expect((await state()).screen === "playing", "Build opened mid-wave in Waves mode");
  });

  await step("card-break", async () => {
    const st = await g(() => window.__qaClearWave());
    expect(st === "intermission", "Wave clear did not reach intermission: " + st);
    await screen("07-card-break");
    const cards = page.locator("#cardChoices button, #cardChoices .card, #cardChoices [data-index]");
    const n = await cards.count();
    results.cardCount = n;
    expect(n >= 1, "No cards offered");
    await cards.nth(0).click(); await settle(150);
    if (n > 1) { await cards.nth(1).click(); await settle(150); }
    await screen("07-card-selected");
    const before = await g(() => window.__driftBastion.waveState());
    await click("#cardRerollButton");
    const after = await g(() => window.__driftBastion.waveState());
    results.reroll = { matterBefore: before.matter, matterAfter: after.matter, offerChanged: JSON.stringify(before.offer) !== JSON.stringify(after.offer) };
    for (const key of ["1", "2", "3"]) { await page.keyboard.press(key); await settle(80); }
  });

  await step("break-build", async () => {
    await g(() => window.__driftBastion.addMatter(80));
    await click("#waveBuildButton");
    expect((await state()).screen === "building", "Build did not open in break");
    await screen("08-build");
    const cards = page.locator("#catalog .catalog-card");
    results.buildCatalog = await cards.count();
    await page.locator('#catalog .catalog-card[data-type="armor"]').click();
    const modulesBefore = (await state()).modules;
    await click('.build-cell[data-x="1"][data-y="0"]'); await settle(300);
    await screen("08-build-placed");
    results.buildPlaced = (await state()).modules - modulesBefore;
    await click('.build-cell[data-x="1"][data-y="0"]');
    await click("#pcUpgradesTab");
    await screen("08-build-tree");
    await click("#pcLayoutTab");
    await click("#closeBuild");
    expect((await state()).screen === "intermission", "Closing build did not return to break: " + (await state()).screen);
  });

  await step("next-wave", async () => {
    await click("#nextWaveButton");
    const ws = await g(() => window.__driftBastion.waveState());
    expect(ws.wave === 2 && ws.state === "playing", "Wave 2 did not start");
    expect(ws.picks.length === 1, "Card not applied on Start wave: " + ws.picks.length);
  });

  await step("boss-wave", async () => {
    await g(() => window.__driftBastion.setInvulnerable(true));
    await g(() => window.__qaClearWave());
    await g(() => window.__qaJumpToWave(5));
    await g(() => window.__qaAdvance(40));
    const s = await state();
    results.bossWave5 = { bossSpawned: s.bossSpawned, variant: s.bossVariant, screen: s.screen };
    expect(s.bossSpawned, "Boss did not spawn on wave 5 within 40s");
    await screen("09-boss-hud");
    await g(() => window.__qaClearWave());
    await screen("09-doctrine-break");
    results.doctrineAfterBoss = (await g(() => window.__driftBastion.waveState())).doctrine;
  });

  await step("victory", async () => {
    await g(() => window.__qaJumpToWave(20));
    await g(() => window.__qaAdvance(40));
    await g(() => window.__qaClearWave());
    await settle(600);
    expect(await visible("#milestoneOverlay"), "Victory overlay not shown after wave 20");
    await screen("10-victory");
    await click("#continueSurvivalButton");
    const ws = await g(() => window.__driftBastion.waveState());
    results.continueEndless = ws && { wave: ws.wave, state: ws.state };
    expect(ws && ws.state === "intermission", "Continue endless did not open a break");
    await screen("10-continue-break");
    await click("#waveEndRunButton");
    await settle(800);
    await screen("11-results");
    expect(await visible("#resultOverlay"), "Results not shown");
    await click("#pcResultsMenu");
  });

  await step("endless-and-death", async () => {
    await click("#startEndlessButton");
    await g(() => window.__qaAdvance(10));
    await screen("12-endless-hud");
    await page.keyboard.press("b"); await settle();
    expect((await state()).screen === "building", "B did not open Build in Endless");
    await screen("12-endless-build");
    await page.keyboard.press("Escape"); await settle();
    await g(() => { const game = window.__qa.game(); game.ship.tiles.forEach(t => { t.hp = 1; t.shield = 0; }); });
    await g(() => { const game = window.__qa.game(); for (let i = 0; i < 40; i++) game.spawnEnemy("brute", game.ship.x + 60 * Math.cos(i), game.ship.y + 60 * Math.sin(i)); });
    await g(() => window.__qaAdvance(20));
    await settle(1500);
    const s = await state();
    results.death = { screen: s.screen, finished: s.finished, fragments: (await g(() => window.__qa.save().fragments)) };
    expect(s.finished, "Ship did not die");
    await screen("13-death-results");
    await click("#pcResultsMenu");
  });

  await step("training", async () => {
    await click("#startTrainingButton");
    await screen("14-training");
    await click("#trainingExitButton");
    await settle();
    expect(await visible("#startButton"), "Training exit failed");
  });

  await step("fullscreen-and-loadout", async () => {
    await click("#menuLoadoutButton");
    await screen("15-loadout");
    await page.keyboard.press("Escape"); await settle();
  });

  if (process.argv.includes("--languages")) {
    results.languages = {};
    const langs = await g(() => window.BastionI18n.languages.map(l => l.code));
    for (const code of langs) {
      await step("lang-" + code, async () => {
        await g(c => localStorage.setItem("bastion-language", c), code);
        await page.reload(); await page.evaluate(() => window.DriftModuleArt && window.DriftModuleArt.ready);
        await q.installDrivers(page);
        const menu = await screen("lang-" + code + "-menu");
        await click("#startButton");
        await g(() => window.__qaClearWave());
        const cards = await screen("lang-" + code + "-cards");
        await click("#waveBuildButton");
        const build = await screen("lang-" + code + "-build");
        await click("#closeBuild");
        await click("#waveEndRunButton"); await settle(600);
        const res = await screen("lang-" + code + "-results");
        if (await page.locator("#pcResultsMenu").isVisible()) await click("#pcResultsMenu");
        results.languages[code] = [menu, cards, build, res].reduce((n, a) => n + a.issues.length, 0);
      });
    }
    await g(() => localStorage.setItem("bastion-language", "en"));
  }

  results.errors = log;
  results.crashed = await page.locator("#crashOverlay").isVisible().catch(() => false);
  q.writeJson(`ui-${process.env.QA_TAG ? process.env.QA_TAG + "-" : ""}${tag}${process.argv.includes("--languages") ? "-langs" : ""}.json`, results);
  const issueCount = Object.values(results.screens).reduce((n, s) => n + s.issues.length, 0);
  console.log(`${tag}: ${results.steps.filter(s => s.ok).length}/${results.steps.length} steps ok, ${Object.keys(results.screens).length} screens, ${issueCount} control issues, ` +
    `${log.pageErrors.length} page errors, ${log.consoleErrors.length} console errors`);
  results.failures.forEach(f => console.log("FAIL " + f));
  await browser.close().catch(() => {});
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
