"use strict";
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { pathToFileURL } = require('node:url');
const output = path.resolve(__dirname, '../outputs/qa/layouts');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [], report = [];
  try {
    for (const [width, height] of [[1280,720], [1920,1080], [2560,1440]]) {
      for (const uiScale of [100,125,150]) {
        const context = await browser.newContext({ viewport:{width,height} });
        const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
        await page.addInitScript(uiScale => localStorage.setItem('drift-bastion-save-v2', JSON.stringify({
          version:9, fragments:2000, settings:{uiScale,muted:true}, training:{completed:true}
        })), uiScale);
        await page.clock.install();
        await page.goto(pathToFileURL(path.resolve(__dirname,'../outputs/Drift_Bastion_Playtest.html')).href+'?debug=1');
        await page.evaluate(() => window.DriftModuleArt.ready);
        await page.clock.pauseAt(new Date(Date.now()+1000));
        async function capture(screen) {
          await page.clock.runFor(200);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight),false);
          if(screen==='build') {
            const alignment=await page.locator('#catalog .catalog-card').first().evaluate(card=>{const a=card.getBoundingClientRect(),b=card.querySelector('.module-glyph').getBoundingClientRect();return Math.abs(a.y+a.height/2-b.y-b.height/2);});
            assert.ok(alignment<1,`Catalog center offset ${alignment}`);
          }
          if(screen==='module-detail') {
            const detail=await page.locator('#hangarModuleDetails').boundingBox();assert.ok(detail&&detail.width>200&&detail.height>200,'Module details clipped');
          }
          await page.screenshot({ path:path.join(output,`${height}-${uiScale}-${screen}.png`) });
          report.push(`${width}x${height}@${uiScale}: ${screen}`);
        }
        await capture('menu');
        await page.click('#hangarMenuButton'); await page.click('#hangarWeaponTab'); await capture('modules');
        await page.click('#pcCoresTab'); await capture('cores');
        await page.click('#hangarUpgradeTab'); await capture('permanent'); await page.click('#pcResearchTab'); await capture('research'); await page.click('#hangarWeaponTab'); await page.locator('#weaponPicker button').first().click(); await capture('module-detail');
        await page.click('#closeHangar'); await page.click('#pcRangeMenu'); await capture('range');
        await page.click('#pcRangeBuild'); await capture('build');
        await page.click('.build-cell[data-x="0"][data-y="-1"]'); await page.click('#pcUpgradesTab'); await capture('tree');
        const node = page.locator('#upgradeList .research-node.locked').first();
        await node.click(); assert.equal(await node.getAttribute('aria-pressed'),'true');
        await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await page.clock.runFor(200);
        await page.click('#pcRangeExit'); await page.click('#startButton'); await page.click('#pauseButton'); await capture('pause');
        await page.click('#pauseSettingsButton'); await capture('settings');
        await page.keyboard.press('Escape'); await page.click('#pauseHangarButton'); await page.clock.runFor(500); await capture('results');
        await page.click('#pcResultsMenu'); await page.click('#startTrainingButton'); await capture('training');
        await context.close();
      }
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({passed:true,screens:report,errors},null,2));
    console.log(`PASS: ${report.length} screen / resolution / text-size combinations`);
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
