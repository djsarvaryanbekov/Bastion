"use strict";
const { chromium } = require('playwright'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), { pathToFileURL } = require('node:url');
(async () => {
 const browser = await chromium.launch({headless:true}); const report = {}, errors = [];
 try {
  const page = await browser.newPage({viewport:{width:1600,height:1000}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install();
  await page.goto(pathToFileURL(path.resolve(__dirname,'../outputs/Drift_Bastion_Playtest.html')).href+'?debug=1');
  await page.clock.pauseAt(new Date(Date.now()+1000));
  const tick=()=>page.clock.runFor(200), state=()=>page.evaluate(()=>window.__driftBastion.getState());
  const cell=(x,y)=>page.locator(`.build-cell[data-x="${x}"][data-y="${y}"]`);
  await tick();
  await page.click('#pcFullscreen'); await page.waitForFunction(()=>!!document.fullscreenElement,null,{polling:50}); await tick(); assert.ok(await page.evaluate(()=>!!document.fullscreenElement));
  await page.click('#pcFullscreen'); await page.waitForFunction(()=>!document.fullscreenElement,null,{polling:50}); await tick(); assert.equal(await page.evaluate(()=>!!document.fullscreenElement),false); report.fullscreen=true;
  await page.locator('#pcFullscreen').focus(); await page.keyboard.press('Tab'); assert.notEqual(await page.evaluate(()=>document.activeElement.id),'pcFullscreen');
  await page.click('#menuSettingsButton'); await tick(); await page.locator('#reducedFlashToggle').check();
  assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('reduced-flash')),true);
  await page.keyboard.press('Escape'); await page.click('#startButton'); await page.click('#buildButton'); await tick();
  await page.evaluate(()=>window.__driftBastion.addMatter(100));
  await page.click('#catalog [data-type="armor"]');
  async function clickUnavailable(locator) { const rect=await locator.boundingBox(); await page.mouse.click(rect.x+rect.width/2,rect.y+rect.height/2); }
  const before=await state(); await clickUnavailable(cell(1,-2)); assert.deepEqual(await state(),before); report.invalidPlacement=true;
  await cell(1,0).click(); await cell(2,0).click(); await cell(1,0).click();
  assert.ok(await page.locator('.sell-module-button').isDisabled()); assert.match(await page.locator('#buildModuleDetails').innerText(),/connection/);
  await cell(0,0).click(); assert.equal(await page.locator('.sell-module-button').count(),0);
  await cell(2,0).click(); const money=(await state()).matter; await page.locator('.sell-module-button').click(); assert.equal((await state()).matter,money); report.dismantling=true;
  await page.click('#catalog [data-type="cannon"]');
  const a=await page.locator('#catalog [data-type="cannon"]').boundingBox(), b=await cell(0,1).boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2); await page.mouse.down(); await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:10});
  await tick(); const ghost=await page.locator('.build-drag-ghost').boundingBox();
  assert.ok(Math.abs(ghost.x+ghost.width/2-b.x-b.width/2)<1); assert.ok(Math.abs(ghost.y+ghost.height/2-b.y-b.height/2)<1);
  await page.keyboard.press('Escape'); await page.mouse.up(); assert.equal(await page.locator('.build-drag-ghost').count(),0); assert.equal((await state()).screen,'building'); report.letterboxedGhostAndCancel=true;
  await page.clock.runFor(450);
  await page.locator('#pcCatalogSearch').fill('wasd'); await page.keyboard.press('b'); assert.equal((await state()).screen,'building'); assert.deepEqual((await state()).ship,before.ship); report.editableInputIsolation=true;
  await page.locator('#pcCatalogSearch').fill('');
  await page.click('#catalog [data-type="cannon"]');
  let nextY=1;
  while (await cell(0,nextY).getAttribute('aria-disabled') !== 'true' && nextY < 10) { await cell(0,nextY).click(); nextY++; }
  assert.match(await page.locator('#buildSelection').innerText(),/Available: \d+ Matter/);
  const poor=await state(); await clickUnavailable(cell(0,nextY)); assert.deepEqual(await state(),poor); report.insufficientFunds=true;
  assert.equal(await page.locator('#pcRangeInspector').count(),0);assert.equal(await page.evaluate(()=>window.DriftPCGame.startRange('cannon')),false);report.activeRunRangeBlocked=true;
  await page.click('#closeBuild');await page.click('#pauseButton');await page.click('#pauseHangarButton');await page.clock.runFor(500);await page.click('#pcResultsMenu');await page.click('#pcRangeMenu');await tick();
  const saveBefore=await page.evaluate(()=>localStorage.getItem('drift-bastion-save-v2'));
  await page.selectOption('#pcRangeModule','shield'); await tick(); await page.click('#pcRangeReset'); await page.click('#pcRangeLoadout'); await tick();
  await page.click('#pcRangePause'); await tick(); assert.equal((await state()).screen,'paused');
  await page.click('#pauseSettingsButton'); await page.selectOption('#uiScaleSelect','150');
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await tick();
  await page.click('#pcRangeBuild'); await page.click('#catalog [data-type="armor"]');
  for(let y=1;y<=12;y++) await cell(0,y).click();
  for(const [width,height] of [[1280,720],[1920,1080],[2560,1440]]) {
    await page.setViewportSize({width,height}); await tick(); await cell(0,12).scrollIntoViewIfNeeded();
    assert.ok(await page.locator('.build-grid-wrap').evaluate(e=>e.scrollHeight>e.clientHeight));
    await page.screenshot({path:path.resolve(__dirname,`../outputs/qa/large-ship-${height}-150.png`)});
  }
  report.largeShipScrolling=true;
  await page.click('#closeBuild'); await tick(); await page.click('#pcRangeExit'); await tick();
  assert.equal(await page.evaluate(()=>localStorage.getItem('drift-bastion-save-v2')),saveBefore); assert.equal(await page.locator('#menuOverlay').isVisible(),true); report.rangeResetPause=true;
  assert.equal(await page.locator('#mobileControls').isVisible(),false); assert.equal(await page.locator('#installButton').isVisible(),false);
  assert.deepEqual(errors,[]);report.errors=errors;report.passed=true;
  fs.writeFileSync(path.resolve(__dirname,'../outputs/qa/desktop-report.json'),JSON.stringify(report,null,2)); console.log(report);
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
