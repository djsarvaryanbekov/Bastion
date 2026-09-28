'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
  const file = path.resolve(process.argv[2] || 'outputs/Drift_Bastion_Playtest.html');
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  const passed = [];
  async function scenario(name, fragments, rank, check) {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    try {
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(({ fragments, rank }) => {
        localStorage.setItem('drift-bastion-save-v2', JSON.stringify({
          version: 9, fragments, settings: { muted: true }, training: { completed: true },
          campaign: { schemaVersion: 2, selectedCore: 'standard', coreRanks: { standard: { modules: rank } } }
        }));
      }, { fragments, rank });
      await page.clock.install();
      await page.goto(pathToFileURL(file).href + '?debug=1');
      await page.clock.pauseAt(new Date(Date.now() + 1000));
      await page.locator('#hangarMenuButton').click();
      await page.locator('#hangarUpgradeTab').click();
      const rows = page.locator('#metaList .systems-selector');
      const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('drift-bastion-save-v2')));
      const readRank = async () => (await state()).campaign?.coreRanks?.standard?.modules || 0;
      const pair = async (gap) => {
        const box = await rows.first().boundingBox();
        await page.mouse.click(box.x + 25, box.y + 25, { clickCount: 1 });
        await page.clock.runFor(gap);
        await page.mouse.down({ clickCount: 2 });
        await page.mouse.up({ clickCount: 2 });
      };
      await check({ page, rows, state, readRank, pair });
      passed.push(name);
    } finally { await context.close(); }
  }
  try {
    await scenario('Fast native double-click buys exactly one rank at displayed price', 5000, 0, async ({ rows, state, readRank }) => {
      await rows.first().click();
      const price = Number((await rows.page().locator('#metaList .systems-action').innerText()).match(/\d+/)[0]);
      const before = (await state()).fragments;
      await rows.first().dblclick({ delay: 40 });
      assert.equal(await readRank(), 1);
      assert.equal((await state()).fragments, before - price);
    });
    await scenario('Clicks 350 ms apart inspect without spending', 5000, 0, async ({ pair, readRank, state }) => {
      await pair(350);
      assert.equal(await readRank(), 0);
      assert.equal((await state()).fragments, 5000);
    });
    await scenario('Clicks 200 ms apart buy one rank', 5000, 0, async ({ pair, readRank }) => {
      await pair(200);
      assert.equal(await readRank(), 1);
    });
    await scenario('Different rows and repeated keyboard activation only inspect', 5000, 0, async ({ rows, readRank, state }) => {
      await rows.nth(0).click();
      await rows.nth(1).click();
      await rows.nth(0).focus();
      await rows.nth(0).press('Enter');
      await rows.nth(0).press('Enter');
      assert.equal(await readRank(), 0);
      assert.equal((await state()).fragments, 5000);
    });
    await scenario('Insufficient funds remain inspectable without purchase', 0, 0, async ({ rows, readRank, state }) => {
      await rows.first().dblclick({ delay: 40 });
      assert.equal(await readRank(), 0);
      assert.equal((await state()).fragments, 0);
    });
    await scenario('Maximum rank cannot purchase', 5000, 25, async ({ rows, readRank, state }) => {
      await rows.first().dblclick({ delay: 40 });
      assert.equal(await readRank(), 25);
      assert.equal((await state()).fragments, 5000);
    });
    await scenario('Normal purchase button still buys one rank', 5000, 0, async ({ page, readRank }) => {
      await page.locator('#metaList .systems-action').click();
      assert.equal(await readRank(), 1);
    });
    assert.deepEqual(errors, []);
    const report = { passed: true, file, checks: passed, errors };
    const output = path.resolve('outputs/qa/fast-upgrade-click-report.json');
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
