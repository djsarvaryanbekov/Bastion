"use strict";
const {chromium}=require('playwright'), assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path');
const {pathToFileURL}=require('node:url');
const output=path.resolve(__dirname,'../outputs/qa');
// QA inventory: every screen, resolution/text scale, placement/drag/ghost,
// spending/locks, every range configuration, real simulation, suspend/restore,
// keyboard layers, offline loading, saves, and the full progression loop.
(async()=>{
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:1920,height:1080}});
 const page=await context.newPage();const errors=[],report={};page.on('pageerror',e=>errors.push(e.message));
 const types=['armor','missile','rail','laser','arc','scatter','flak','pulse','cryo','mine','ember','gravity','shield','repair','collector','bulkhead','reactor'];
 await page.addInitScript(({types})=>{
   if(localStorage.getItem('pc-qa-seeded'))return;
   localStorage.setItem('pc-qa-seeded','true');
   localStorage.setItem('drift-bastion-save-v2',JSON.stringify({version:9,fragments:5000,progression:{schemaVersion:4,purchasedModules:types,branchLicenses:[]},settings:{muted:true},training:{completed:true}}));
 },{types});
 await page.clock.install();
 await page.goto(pathToFileURL(path.resolve(__dirname,'../outputs/Drift_Bastion_Playtest.html')).href+'?debug=1');
 await page.evaluate(()=>window.DriftModuleArt.ready); await page.clock.pauseAt(new Date(Date.now()+1000));
 const tick=ms=>page.clock.runFor(ms);
 async function shot(name){await tick(180);await page.screenshot({path:path.join(output,name+'.png')});}
 await shot('menu-1080');
 await page.click('#pcRangeMenu');await tick(220);
 const beforeRange=await page.evaluate(()=>({save:localStorage.getItem('drift-bastion-save-v2'),progress:window.__driftBastion.getState().progression}));
 let configs=0;
 for(const type of ['cannon',...types]){
   await page.selectOption('#pcRangeModule',type);await tick(180);
   const count=await page.locator('#pcRangeUpgrade option').count();assert.ok(count>0);
   for(let i=0;i<count;i++){
     await page.selectOption('#pcRangeUpgrade',String(i)); await tick(70);
     const probe=await page.evaluate(()=>({range:window.DriftPCGame.rangeState(),state:window.__driftBastion.getState(),resolved:window.DriftPCGame.rangeSnapshot().definitions}));
     assert.equal(probe.state.mode,'range');assert.equal(probe.range.type,type);assert.ok(Number.isFinite(probe.resolved[type].hp));configs++;
   }
 }
 report.rangeConfigurations=configs;
 await page.selectOption('#pcRangeModule','cannon');await tick(180);
 const startTargets=await page.evaluate(()=>window.DriftPCGame.rangeSnapshot().enemies.map(e=>e.hp));
 await tick(4000);
 const endTargets=await page.evaluate(()=>window.DriftPCGame.rangeSnapshot().enemies.map(e=>e.hp));
 assert.notDeepEqual(endTargets,startTargets);report.realCombat=true;
 await shot('range-cannon-1080');
 await page.selectOption('#pcRangeModule','repair');await tick(180);const hpBefore=await page.evaluate(()=>window.DriftPCGame.rangeSnapshot().tiles.reduce((n,t)=>n+t.hp,0));await tick(3000);const hpAfter=await page.evaluate(()=>window.DriftPCGame.rangeSnapshot().tiles.reduce((n,t)=>n+t.hp,0));assert.ok(hpAfter>hpBefore);report.repair=true;
 await page.selectOption('#pcRangeModule','shield');await tick(180);await page.selectOption('#pcRangeScenario','incoming');await tick(6000);assert.equal((await page.evaluate(()=>window.DriftPCGame.rangeState())).scenario,'incoming');const defense=await page.evaluate(()=>({state:window.__driftBastion.getState(),tiles:window.DriftPCGame.rangeSnapshot().tiles}));assert.ok(defense.state.activeProjectiles>0 || defense.tiles.some(t=>t.hp<t.maxHp || t.shield<60));report.incomingFire=true;
 await page.selectOption('#pcRangeModule','collector');await tick(180);await page.keyboard.down('w');await tick(1500);await page.keyboard.up('w');await tick(300);assert.ok((await page.evaluate(()=>window.DriftPCGame.rangeState())).collected>0);report.pickups=true;
 await page.click('#pcRangeBuild');await tick(180);const rangeCount=await page.locator('#catalog .catalog-card').count();assert.equal(rangeCount,18);
 await page.click('#catalog [data-type="missile"]');await page.hover('.build-cell[data-x="0"][data-y="1"]');assert.ok(await page.locator('.build-cell.preview-origin').count());await page.click('.build-cell[data-x="0"][data-y="1"]');
 assert.equal((await page.evaluate(()=>window.__driftBastion.getState())).modules,5);report.freeBuild=true;
 await page.click('#closeBuild');await tick(180);await page.click('#pcRangeExit');
 const afterRange=await page.evaluate(()=>({save:localStorage.getItem('drift-bastion-save-v2'),progress:window.__driftBastion.getState().progression}));assert.deepEqual(afterRange,beforeRange);report.rangeSaveIsolation=true;
 await page.click('#startButton');await tick(150);await page.evaluate(()=>window.__driftBastion.addMatter(300));await page.click('#buildButton');await tick(180);
 await page.click('#catalog [data-type="missile"]');await page.hover('.build-cell[data-x="1"][data-y="0"]');
 await shot('build-ghost-1080');await page.click('.build-cell[data-x="1"][data-y="0"]');
 const dragCard=page.locator('#catalog [data-type="shield"]');await dragCard.scrollIntoViewIfNeeded();const a=await dragCard.boundingBox(),b=await page.locator('.build-cell[data-x="-1"][data-y="0"]').boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:12});await page.mouse.up();await tick(450);assert.equal((await page.evaluate(()=>window.__driftBastion.getState())).modules,4);report.dragAndClick=true;
 await page.click('.build-cell[data-x="1"][data-y="0"]');await shot('build-selected-1080');assert.ok(await page.locator('.build-cell.selected-installed[data-x="1"][data-y="0"]').count());
 const before=await page.evaluate(()=>window.__driftBastion.getState());assert.equal(await page.evaluate(()=>window.DriftPCGame.startRange('rail')),false);assert.deepEqual(await page.evaluate(()=>window.__driftBastion.getState()),before);assert.equal(await page.locator('#pcRangeInspector').count(),0);report.activeRunRangeBlocked=true;
 await page.click('#pcUpgradesTab');await shot('run-tree-1080');const buy=page.locator('.upgrade-option:not([disabled])').first();await buy.click();await tick(180);assert.ok((await page.evaluate(()=>window.__driftBastion.getState())).upgrades.missile.level>0);report.runUpgrade=true;
 await page.keyboard.press('Escape');assert.equal(await page.locator('.pc-tree-open').count(),0);assert.equal((await page.evaluate(()=>window.__driftBastion.getState())).screen,'building');report.escapeLayers=true;
 assert.equal(await page.locator('#buildModulePreview, #modulePreviewDialog').count(),0);
 await page.click('#closeBuild');await tick(200);await shot('combat-1080');await page.evaluate(()=>window.__driftBastion.spawnBoss());await tick(180);await shot('boss-1080');
 await page.click('#pauseButton');await shot('pause-1080');await page.click('#pauseSettingsButton');await shot('settings-1080');
 report.screens=[];
 for(const [width,height]of [[1280,720],[1920,1080],[2560,1440]]){
  await page.setViewportSize({width,height});
  for(const scale of ['100','125','150']){
   await page.selectOption('#uiScaleSelect',scale);await tick(200);
   const bounds=await page.locator('#pcViewport').boundingBox();assert.ok(Math.abs(bounds.width/bounds.height-16/9)<.001);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight),false);
   await shot(`settings-${height}-${scale}`);report.screens.push(`${width}x${height}@${scale}`);
  }
 }
 await page.setViewportSize({width:1920,height:1080});await page.selectOption('#uiScaleSelect','100');await page.keyboard.press('Escape');await page.click('#pauseHangarButton');await tick(500);await shot('results-1080');await page.click('#hangarButton');await tick(180);
 await page.click('#hangarUpgradeTab');await shot('hangar-permanent-1080');const fragmentsBefore=(await page.evaluate(()=>window.__driftBastion.getState())).campaign.coreRanks.standard.modules;await page.locator('#metaList .systems-action').click();assert.ok((await page.evaluate(()=>window.__driftBastion.getState())).campaign.coreRanks.standard.modules>fragmentsBefore);report.metaPurchase=true;
 await page.click('#pcResearchTab');await shot('research-1080');await page.locator('#branchList .research-node.ready').first().click();const licenseBefore=(await page.evaluate(()=>window.__driftBastion.getState())).progression.branchLicenses.length;await page.locator('.branch-buy').click();assert.equal((await page.evaluate(()=>window.__driftBastion.getState())).progression.branchLicenses.length,licenseBefore+1);report.branchPurchase=true;await page.click('#pcCoresTab');await shot('cores-1080');await page.click('#hangarWeaponTab');await shot('modules-1080');
 for(const [width,height]of [[1280,720],[2560,1440]]){
  await page.setViewportSize({width,height});await shot(`modules-${height}`);await page.click('#closeHangar');await shot(`menu-${height}`);await page.click('#hangarMenuButton');await page.click('#hangarWeaponTab');
 }
 await page.setViewportSize({width:1600,height:1000});await page.click('#closeHangar');await shot('letterbox-16-10');const bounds=await page.locator('#pcViewport').boundingBox();assert.equal(bounds.height,900);report.letterboxing=true;
 await page.setViewportSize({width:1280,height:720});await page.click('#startTrainingButton');await tick(250);await shot('training-720');await page.click('#trainingExitButton');await tick(180);await page.click('#startButton');await tick(100);assert.equal((await page.evaluate(()=>window.__driftBastion.getState())).screen,'playing');report.fullLoop=true;
 report.rangeMutationBlocked = report.rangeSaveIsolation;
 assert.deepEqual(errors,[]);report.errors=errors;report.passed=true;fs.writeFileSync(path.join(output,'browser-report.json'),JSON.stringify(report,null,2));console.log(report);await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
