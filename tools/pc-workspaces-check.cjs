'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({headless:true});const errors=[],report={};
 try {
 const page=await browser.newPage({viewport:{width:1920,height:1080}});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('drift-bastion-save-v2',JSON.stringify({version:9,fragments:5000,settings:{muted:true},progression:{schemaVersion:4,purchasedModules:['armor','missile','rail','laser','arc','scatter','flak','pulse','cryo','mine','ember','gravity','shield','repair','collector','bulkhead','reactor'],branchLicenses:[]},training:{completed:true}})));
 await page.clock.install();await page.goto(pathToFileURL(path.resolve(__dirname,'../outputs/Drift_Bastion_Playtest.html')).href+'?debug=1');await page.clock.pauseAt(new Date(Date.now()+1000));
 const tick=()=>page.clock.runFor(200),state=()=>page.evaluate(()=>window.__driftBastion.getState());
 await page.click('#hangarMenuButton');await page.click('#pcCoresTab');
 for(const [index,id] of ['standard','striker','bulwark','salvager'].entries()) {
  await page.locator('#corePicker .systems-selector').nth(index).click();await page.locator('#corePicker .systems-action').click();assert.equal((await state()).campaign.selectedCore,id);
  await page.click('#hangarUpgradeTab');await page.locator('#metaList .systems-selector').first().click();await page.locator('#metaList .systems-action').click();assert.equal((await state()).campaign.coreRanks[id].modules,1);
  assert.equal(await page.locator('#metaList .systems-selector.selected').evaluate(e=>document.activeElement===e),true);await page.click('#pcCoresTab');
 }
 report.corePurchaseSelectionAndRanks=true;
 await page.click('#pcResearchTab');const families=await page.locator('#branchWeaponSelect option').evaluateAll(options=>options.map(o=>o.value));let branches=0;
 for(const type of families) {
  await page.selectOption('#branchWeaponSelect',type);const nodes=page.locator('#branchList .research-node:not(.owned)');
  for(let i=0;i<await nodes.count();i++) {await nodes.nth(i).click();const content=await page.locator('#branchList .research-detail').innerText();assert.doesNotMatch(content,/undefined|NaN/);assert.match(content,/Matter per copy/);branches++;}
 }
 report.branchInspectors=branches;
 await page.click('#closeHangar');await page.click('#pcRangeMenu');await tick();
 const types=await page.locator('#pcRangeModule option').evaluateAll(options=>options.map(o=>o.value));let trees=0;
 for(const type of types) {
  await page.selectOption('#pcRangeModule',type);await tick();const count=await page.locator('#pcRangeUpgrade option').count();
  for(let i=0;i<count;i++) {
   await page.selectOption('#pcRangeUpgrade',String(i));await tick();const range=await page.evaluate(()=>window.DriftPCGame.rangeState());
   await page.click('#pcRangeBuild');await page.click('#pcUpgradesTab');await tick();
   const nodes=page.locator('#upgradeList .research-node');
   if(await nodes.count()) {
    assert.equal(await page.locator('#upgradeList .research-node.owned').count(),(range.upgrade?.level||0)+1,`${type} config ${i} owned route`);
    const last=nodes.last();await last.click();assert.doesNotMatch(await page.locator('#upgradeList .research-detail').innerText(),/undefined|NaN/);trees++;
    const excluded=page.locator('#upgradeList .research-node.excluded');
    if(await excluded.count()) {await excluded.first().click();assert.match(await page.locator('#upgradeList .research-state').innerText(),/different upgrade route/i);}
    if(!await page.locator('#upgradeList .research-node.ready, #upgradeList .research-node.unaffordable').count()) {
      await page.locator('#upgradeList .research-node.owned').last().click();
      assert.match(await page.locator('#upgradeList .research-state').innerText(),/Route complete/);
    }
   }
   await page.click('#closeBuild');await tick();
  }
 }
 report.resolvedTrees=trees;
 await page.click('#pcRangeExit');await tick();await page.click('#hangarMenuButton');await page.click('#pcResearchTab');
 await page.locator('#branchList .research-node').first().click();await page.locator('#branchList .research-controls button').last().click();
 const oldZoom=await page.locator('#branchList .research-zoom').innerText();await page.locator('#branchList .research-controls button').nth(1).click();assert.notEqual(await page.locator('#branchList .research-zoom').innerText(),oldZoom);report.zoom=true;
 assert.deepEqual(errors,[]);report.errors=errors;report.passed=true;fs.writeFileSync(path.resolve(__dirname,'../outputs/qa/workspaces-report.json'),JSON.stringify(report,null,2));console.log(report);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
