'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const output=path.resolve(__dirname,'../outputs/qa/build-ux');fs.mkdirSync(output,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true}),errors=[],captures=[];try{
for(const [width,height] of [[1280,720],[1920,1080],[2560,1440]])for(const uiScale of [100,125,150]){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(uiScale=>localStorage.setItem('drift-bastion-save-v2',JSON.stringify({version:9,fragments:2000,settings:{uiScale,muted:true},progression:{schemaVersion:4,purchasedModules:['scatter','shield'],branchLicenses:[]},training:{completed:true}})),uiScale);
 await page.clock.install();await page.goto(pathToFileURL(path.resolve(__dirname,'../outputs/Drift_Bastion_Playtest.html')).href+'?debug=1');await page.evaluate(()=>window.DriftModuleArt.ready);await page.clock.pauseAt(new Date(Date.now()+1000));
 const tick=()=>page.clock.runFor(200),state=()=>page.evaluate(()=>window.__driftBastion.getState());
 async function shot(name){await tick();await page.screenshot({path:path.join(output,`${height}-${uiScale}-${name}.png`)});captures.push(`${width}x${height}@${uiScale} ${name}`);}
 await page.click('#startButton');await page.evaluate(()=>window.__driftBastion.addMatter(4));await page.click('#buildButton');await page.click('#catalog [data-type="scatter"]');await tick();
 assert.match(await page.locator('#pcBuildGuide').innerText(),/Choose a \+ beside the ship/);
 assert.doesNotMatch(await page.locator('#pcBuildGuide').innerText(),/Need|SHORT|earn Matter/);
 assert.match(await page.locator('#buildSelection').innerText(),/Available: 4 Matter/);await shot('placement-guide');
 await page.evaluate(()=>window.__driftBastion.addMatter(100));await tick();
 const cell=page.locator('.build-cell[data-x="1"][data-y="0"]');await cell.hover();assert.equal(await page.locator('.pc-placement-ghost').count(),1);await shot('hover');
 await page.hover('.build-header');assert.equal(await page.locator('.pc-placement-ghost').count(),0);await cell.focus();assert.equal(await page.locator('.pc-placement-ghost').count(),0);await shot('no-hover');
 await cell.hover();const blur=await page.evaluate(()=>{window.dispatchEvent(new Event('blur'));return {count:document.querySelectorAll('.pc-placement-ghost').length,state:window.DriftPCGame.buildState()};});assert.equal(await page.locator('.pc-placement-ghost').count(),0,JSON.stringify(blur));await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await page.hover('.build-header');const before=await state();await page.click('#pcUpgradesTab');await tick();
 assert.equal(await page.locator('.pc-family-card').count(),1);assert.equal(await page.locator('#catalog').isVisible(),false);assert.equal(await page.locator('.research-workspace').filter({visible:true}).count(),1);
 assert.equal((await state()).matter,before.matter);assert.equal((await state()).modules,before.modules);assert.equal(await page.locator('.pc-tree-hint').isVisible(),false);assert.match(await page.locator('.pc-family-card.selected').innerText(),/Cannon/);await shot('installed-selector');
 await page.click('#pcLayoutTab');await page.click('#catalog [data-type="shield"]');await cell.click();await cell.click();await tick();
 await page.click('#pcOpenFamilyTree');await tick();assert.equal(await page.locator('.pc-family-card').count(),2);assert.match(await page.locator('.pc-family-card.selected').innerText(),/Shield/);
 await page.click('.pc-family-card[data-family="cannon"]');await tick();assert.match(await page.locator('#upgradeList .research-header').innerText(),/Auto Cannon/);assert.equal(await page.locator('.pc-placement-ghost').count(),0);
 // Reproduce multiple installed weapons, no purchased upgrades, and zero remaining Matter.
 await page.click('#pcLayoutTab');
 for(const [type,x,y] of [['cannon',1,-1],['scatter',2,-1],['scatter',2,0],['cannon',2,1]]){
   await page.click(`#catalog [data-type="${type}"]`);
   const price=await page.evaluate(()=>window.DriftPCGame.buildState().price),wallet=(await state()).matter;
   if(price>wallet)await page.evaluate(amount=>window.__driftBastion.addMatter(amount),price-wallet);
   await page.locator(`.build-cell[data-x="${x}"][data-y="${y}"]`).click();
 }
 assert.equal((await state()).matter,0);
 await page.click('#catalog [data-type="armor"]');await page.click('#pcUpgradesTab');await tick();
 assert.equal(await page.locator('.pc-family-card').count(),3);
 assert.match(await page.locator('.pc-family-card[data-family="cannon"]').innerText(),/3 installed copies/);
 assert.match(await page.locator('.pc-family-card[data-family="scatter"]').innerText(),/2 installed copies/);
 const unpurchased=await state();
 for(const family of ['cannon','scatter','shield']){
   await page.click(`.pc-family-card[data-family="${family}"]`);await tick();
   assert.ok(await page.locator('#upgradeList .research-node').count()>2);
   assert.equal(await page.locator('.pc-tree-hint').isVisible(),false);
 }
 await page.click('.pc-family-card[data-family="cannon"]');await tick();
 await page.locator('#upgradeList .research-node').filter({hasText:'Fire rate'}).click();
 assert.match(await page.locator('#upgradeList .research-state').innerText(),/Requires Damage/);
 await shot('multiple-weapons-prerequisite');
 await page.click('.research-prerequisite');assert.match(await page.locator('#upgradeList .research-node.selected').innerText(),/Damage/);
 await page.locator('#upgradeList .research-node').filter({hasText:'Twin volley 1'}).click();
 assert.match(await page.locator('#upgradeList .research-warning').innerText(),/Hangar license.*64 Fragments/);
 await shot('branch-license');
 assert.deepEqual((await state()).upgrades,unpurchased.upgrades);assert.equal((await state()).matter,0);
 await context.close();
}
assert.deepEqual(errors,[]);const report={passed:true,checks:['hover exit','keyboard focus does not create ghost','window blur clears ghost','concise placement guidance without currency prompts','uninstalled selection opens an installed tree','multiple weapon families and repeated copies with no upgrades and zero Matter','named prerequisite and navigation to it','specific Hangar license and Fragment cost','inspection never spends or buys upgrades','inspector upgrade shortcut','nine resolution and text combinations'],captures,errors};fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(report);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
