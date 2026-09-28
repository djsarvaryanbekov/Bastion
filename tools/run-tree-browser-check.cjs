const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const file = path.resolve(process.argv[2] || 'outputs/Drift_Bastion_Playtest.html');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install();
    const html = fs.readFileSync(file, 'utf8').replace('    window.__driftBastion = {',
      '    window.__treeTest = { getGame: () => game, save: save, render: renderRunUpgrades, definitions: MODULES };\n    window.__driftBastion = {');
    await page.route('**/Drift_Bastion_Playtest.html', route => route.fulfill({ contentType: 'text/html', body: html }));
    await page.goto(pathToFileURL(file).href);
    await page.locator('#startButton').click();
    await page.locator('#buildButton').click();
    await page.locator('.build-cell[data-x="0"][data-y="-1"]').click();
    await page.evaluate(() => { __treeTest.getGame().matter = 1000; __treeTest.render(); });
    assert.equal(await page.locator('.run-tree [data-tree-choice="fan"]').count(), 1);
    assert.equal(await page.locator('.run-tree [data-tree-choice="impact"]').count(), 1);
    await page.locator('button.upgrade-option[data-choice="base1"]').click();
    await page.locator('button.upgrade-option[data-choice="base2"]').click();
    assert.equal(await page.locator('article.upgrade-option.upgrade-locked').count(), 2);
    const twin = await page.locator('.upgrade-option[data-choice="twin"]').boundingBox();
    const pierce = await page.locator('.upgrade-option[data-choice="pierce"]').boundingBox();
    assert.ok(pierce.y > twin.y + twin.height, 'Branches split vertically');
    assert.equal(twin.x, pierce.x, 'Sibling branches share a column');
    await page.screenshot({ path: path.join(path.dirname(file), 'run-tree-desktop.png') });
    await page.evaluate(() => { __treeTest.save.progression.branchLicenses.push('cannon:twin'); __treeTest.render(); });
    await page.locator('button.upgrade-option[data-choice="twin"]').click();
    assert.equal(await page.locator('.run-other-route [data-tree-choice="pierce"]').count(), 2);
    assert.equal(await page.locator('button.upgrade-option[data-choice="twin"]').count(), 1);
    const audit = await page.evaluate(() => {
      const U = DriftRunUpgrades;
      let count = 0;
      for (const type of Object.keys(U.trees)) {
        const target = document.createElement('div');
        DriftUpgradeTreeView.renderRunTree(target, { upgrades: U, type, state: null, copies: 1, licenses: [], base: __treeTest.definitions[type], createChoice(choice) { const el = document.createElement('button'); el.textContent = choice.name; return el; } });
        if (/undefined|NaN/.test(target.textContent)) throw new Error(type + ' invalid text');
        count++;
      }
      return count;
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(path.dirname(file), 'run-tree-mobile.png') });
    assert.ok(await page.locator('#closeBuild').isVisible());
    assert.ok(await page.locator('.run-upgrade-track').evaluate(el => el.scrollWidth > el.clientWidth));
    assert.deepEqual(errors, []);
    console.log('PASS: branching geometry, full future tree, purchase flow, locked branches, chosen route, all ' + audit + ' module trees, mobile scrolling; no browser errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
