"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

(async () => {
  const output = path.resolve("outputs/matter-economy-qa");
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const errors = [], transactions = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem("drift-bastion-save-v2", JSON.stringify({
      version: 9, fragments: 57, settings: { muted: true, uiScale: 100 }, training: { completed: true },
      progression: { schemaVersion: 4, purchasedModules: ["scatter", "shield"], branchLicenses: ["cannon:twin"] }
    })));
    await page.clock.install();
    await page.goto(pathToFileURL(path.resolve("outputs/Drift_Bastion_Playtest.html")).href + "?debug=1");
    await page.evaluate(() => window.DriftModuleArt.ready);
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    const state = () => page.evaluate(() => window.__driftBastion.getState());
    const tick = () => page.clock.runFor(200);
    await page.click("#startButton");
    await page.evaluate(() => window.__driftBastion.addMatter(1000));
    await page.click("#buildButton");
    await page.click('#catalog [data-type="cannon"]');
    for (const [x, y, price] of [[1, 0, 25], [1, -1, 36]]) {
      assert.equal(await page.evaluate(() => window.DriftPCGame.buildState().price), price);
      assert.equal(await page.locator('#catalog [data-type="cannon"] .catalog-cost').innerText(), String(price));
      assert.match(await page.locator("#buildSelection").innerText(), new RegExp(price + " MATTER"));
      const before = await state();
      await page.click(`.build-cell[data-x="${x}"][data-y="${y}"]`);
      const after = await state();
      assert.equal(after.matter, before.matter - price);
      assert.equal(after.modules, before.modules + 1);
      transactions.push({ action: "copy", price });
    }
    await page.click("#pcUpgradesTab");
    await tick();
    for (const [name, cost] of [["Damage", 24], ["Fire rate", 54], ["Twin volley 1", 108]]) {
      const before = await state();
      await page.locator("#upgradeList .research-node").filter({ hasText: name }).click();
      await tick();
      assert.equal((await state()).matter, before.matter, "Inspecting an upgrade never purchases it");
      const buy = page.locator("#upgradeList button.research-purchase");
      assert.equal(await buy.innerText(), `Upgrade · ${cost} Matter`);
      await buy.click();
      await tick();
      assert.equal((await state()).matter, before.matter - cost);
      transactions.push({ action: name, cost, copies: 3 });
    }
    await page.click("#pcLayoutTab");
    await page.click('#catalog [data-type="cannon"]');
    assert.equal(await page.evaluate(() => window.DriftPCGame.buildState().price), 115,
      "Future copies include the full paid upgrade investment");
    await page.click('.build-cell[data-x="2"][data-y="0"]');
    assert.equal((await state()).matter, 638);
    await page.click("#pcUpgradesTab");
    await tick();
    await page.locator("#upgradeList .research-node").filter({ hasText: "Twin volley 2" }).click();
    await tick();
    assert.equal(await page.locator("#upgradeList button.research-purchase").innerText(), "Upgrade · 180 Matter");
    await page.locator("#upgradeList button.research-purchase").click();
    await tick();
    assert.equal((await state()).matter, 458);
    await page.locator("#upgradeList .research-node").filter({ hasText: "Focused volley" }).click();
    await tick();
    assert.match(await page.locator("#upgradeList .research-detail").innerText(), /80 Fragments/);
    assert.match(await page.locator("#upgradeList .research-detail").innerText(), /324 Matter · 4 copies/);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("drift-bastion-save-v2")).fragments),
      57, "Matter purchases preserve the permanent wallet");
    await page.screenshot({ path: path.join(output, "later-upgrade-prices-1080.png") });

    await page.click("#pcLayoutTab");
    await page.click('#catalog [data-type="shield"]');
    assert.equal(await page.evaluate(() => window.DriftPCGame.buildState().price), 37);
    await page.click('.build-cell[data-x="-1"][data-y="0"]');
    assert.equal((await state()).matter, 421);
    for (const [type, x, y] of [["shield", -1, -1], ["shield", -1, 1], ["scatter", 0, 1],
      ["scatter", 1, 1], ["scatter", 0, 2], ["scatter", 1, 2]]) {
      await page.click(`#catalog [data-type="${type}"]`);
      await page.click(`.build-cell[data-x="${x}"][data-y="${y}"]`);
    }
    await page.click('#catalog [data-type="cannon"]');
    const fifthPrice = await page.evaluate(() => window.DriftPCGame.buildState().price);
    const unavailable = await state();
    assert.ok(unavailable.matter < fifthPrice);
    assert.equal(await page.locator('.build-cell[data-x="2"][data-y="1"]').isDisabled(), true);
    assert.equal((await state()).matter, unavailable.matter);
    assert.equal((await state()).modules, unavailable.modules);
    assert.match(await page.locator("#buildSelection").innerText(), new RegExp(fifthPrice + " MATTER"));
    assert.deepEqual(errors, []);
    const report = { passed: true, viewport: "1920x1080", scale: 100, transactions,
      checks: ["Displayed copy prices equal debits", "Family upgrades price all living copies", "Inspection is free",
        "Paid investment follows future copies", "Fragment license costs and wallet preserved", "Unaffordable attachment is disabled"], errors };
    fs.writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
