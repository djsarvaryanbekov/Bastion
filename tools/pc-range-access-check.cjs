'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({headless:true}),errors=[],checks=[];
 try{
  const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('drift-bastion-save-v2',JSON.stringify({version:9,settings:{muted:true},training:{completed:true}})));
  await page.clock.install();await page.goto(pathToFileURL(path.resolve(__dirname,'../outputs/Drift_Bastion_Playtest.html')).href+'?debug=1');await page.clock.pauseAt(new Date(Date.now()+1000));
  const tick=()=>page.clock.runFor(200),state=()=>page.evaluate(()=>window.__driftBastion.getState());
  async function blocked(label){
   const before=await state();assert.equal(await page.evaluate(()=>window.DriftPCGame.canEnterRange()),false);
   assert.equal(await page.evaluate(()=>window.DriftPCGame.startRange('scatter')),false);assert.deepEqual(await state(),before);
   assert.equal(await page.evaluate(()=>window.DriftPCGame.rangeState()),null);checks.push(label);
  }
  await page.click('#pcRangeMenu');await tick();assert.equal((await state()).mode,'range');await page.click('#pcRangeExit');await tick();assert.equal(await page.locator('#menuOverlay').isVisible(),true);checks.push('menu range and return');
  await page.click('#hangarMenuButton');await page.click('#hangarWeaponTab');await page.locator('#weaponPicker button').first().click();await tick();assert.equal(await page.locator('#modulePreviewDialog').count(),0);
  await page.locator('#hangarModuleDetails .armory-detail-action').last().click();await tick();assert.equal((await state()).mode,'range');await page.click('#pcRangeExit');await tick();assert.equal(await page.locator('#hangarOverlay').isVisible(),true);checks.push('Hangar module inspection and range return');
  await page.click('#closeHangar');await page.click('#startButton');await blocked('combat blocked');
  await page.click('#pauseButton');await blocked('pause blocked');await page.keyboard.press('Escape');
  await page.click('#buildButton');await tick();await blocked('Build blocked');assert.equal(await page.locator('#pcRangeInspector').count(),0);
  await page.click('#pcUpgradesTab');await tick();assert.equal(await page.locator('.research-range').count(),0);await blocked('upgrade tree blocked');
  await page.click('#pcLayoutTab');assert.equal(await page.locator('#buildModulePreview').count(),0);await blocked('in-run range blocked');
  await page.click('#closeBuild');await page.click('#pauseButton');await page.click('#pauseHangarButton');await page.clock.runFor(500);await blocked('results blocked');
  await page.click('#pcResultsMenu');await page.click('#startTrainingButton');await tick();await blocked('training blocked');
  assert.deepEqual(errors,[]);const report={passed:true,checks,errors};fs.writeFileSync(path.resolve(__dirname,'../outputs/qa/range-access-report.json'),JSON.stringify(report,null,2));console.log(report);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
