'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');const {chromium}=require('playwright');
(async()=>{
 const file=path.resolve(process.argv[2]||'outputs/Drift_Bastion_Playtest.html');
 const out=path.resolve('outputs/experiments/2026-09-15-pause-branches');fs.mkdirSync(out,{recursive:true});
 const instrumented=fs.readFileSync(file,'utf8').replace('    window.__driftBastion = {','    window.__pauseBranchQA = { get:()=>game, save, makeTile, MODULES, runUpgrades, render:renderBuildGrid, catalog:createCatalog };\n    window.__driftBastion = {');
 const fixture=path.join(out,'branch-fixture.html');fs.writeFileSync(fixture,instrumented);
 const b=await chromium.launch({headless:true});try{
  const p=await b.newPage({viewport:{width:1280,height:800}});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.clock.install();
  await p.goto(pathToFileURL(file).href);await p.locator('#startButton').click();await p.locator('#pauseButton').click();assert.equal(await p.locator('#bankRunButton').count(),0);assert.equal(await p.locator('#settingsContent').isVisible(),false);assert.equal(await p.locator('#pauseHangarButton').innerText(),'End run');
  await p.screenshot({path:path.join(out,'pause.png')});
  await p.locator('#pauseSettingsButton').click();assert.equal(await p.locator('#pauseTitle').textContent(),'Settings');assert.equal(await p.locator('#pauseHangarButton').isVisible(),false);await p.locator('#uiScaleSelect').selectOption('125');await p.screenshot({path:path.join(out,'settings.png')});await p.keyboard.press('Escape');assert.equal(await p.locator('#pauseTitle').textContent(),'Paused');assert.equal((await p.evaluate(()=>window.__driftBastion.getState())).screen,'paused');await p.locator('#resumeButton').click();assert.equal((await p.evaluate(()=>window.__driftBastion.getState())).screen,'playing');
  await p.goto(pathToFileURL(fixture).href);await p.locator('#startButton').click();await p.locator('#buildButton').click();
  await p.evaluate(()=>{const a=window.__pauseBranchQA,g=a.get();g.matter=100;for(const x of [-1,1])g.ship.tiles.set(x+',0',a.makeTile('cannon',x,0,false,1,false));a.render();});
  assert.equal(await p.locator('.upgrade-option b').innerText(),'24 Matter');
  await p.evaluate(()=>{const a=window.__pauseBranchQA,g=a.get();g.destroyTile('1,0');a.render();});
  assert.equal(await p.locator('.upgrade-option b').innerText(),'16 Matter');await p.locator('button.upgrade-option').click();assert.equal(await p.evaluate(()=>window.__pauseBranchQA.get().matter),84);
  await p.locator('button.upgrade-option').click();assert.equal(await p.locator('button.upgrade-option').count(),0);assert.equal(await p.locator('.upgrade-locked').count(),2);assert.match(await p.locator('#upgradeList').innerText(),/64 Fragments/);assert.equal(await p.locator('.cell-upgrade-marker').count(),0);await p.screenshot({path:path.join(out,'locked-branches.png')});
  await p.evaluate(()=>{const a=window.__pauseBranchQA,g=a.get();a.save.progression.branchLicenses=a.runUpgrades.trees.cannon.branches.map(b=>'cannon:'+b.id);g.matter=47;a.render();});assert.match(await p.locator('#upgradeList').innerText(),/Need 1 more Matter/);assert.equal(await p.locator('button.upgrade-option:disabled').count(),2);
  await p.evaluate(()=>{const a=window.__pauseBranchQA,g=a.get();for(let i=0;i<8;i++){const options=a.runUpgrades.options('cannon',g.upgrades.cannon,2,a.save.progression.branchLicenses);if(!options.length)break;a.runUpgrades.purchase(g.upgrades,'cannon',options[0].id,10000,2,options[0].rank,a.save.progression.branchLicenses);}g.weaponDefinitions.cannon=a.runUpgrades.resolve(a.MODULES.cannon,g.upgrades.cannon);a.render();});assert.match(await p.locator('#upgradeList').innerText(),/MAX/);assert.equal(await p.locator('.upgrade-option').count(),0);
  await p.setViewportSize({width:390,height:844});await p.locator('#closeBuild').click();await p.locator('#mobilePauseButton').click();await p.locator('#pauseSettingsButton').click();assert.equal(await p.locator('#settingsContent').isVisible(),true);await p.locator('#resumeButton').scrollIntoViewIfNeeded();await p.screenshot({path:path.join(out,'settings-mobile.png')});await p.locator('#resumeButton').click();assert.equal(await p.locator('#pauseTitle').textContent(),'Paused');assert.deepEqual(errors,[]);
  console.log('PASS: pause/settings navigation, no HUD end-run, surviving-copy display and charge, locked Fragment branches, shortage, MAX, mobile settings, no browser errors');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
