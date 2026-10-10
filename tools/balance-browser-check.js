'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true}),errors=[],report=[];fs.mkdirSync('outputs/balance-qa',{recursive:true});
 try{
  for(const profile of [{name:'desktop',width:1280,height:800,scale:100},{name:'mobile',width:390,height:844,scale:100},{name:'small-large-text',width:360,height:640,scale:150}]){
   const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},isMobile:profile.width<600,hasTouch:profile.width<600});const page=await context.newPage();page.on('pageerror',e=>errors.push(profile.name+': '+e.message));
   await page.addInitScript(({scale})=>{if(!localStorage.getItem('balance-seed')){localStorage.setItem('balance-seed','yes');localStorage.setItem('drift-bastion-save-v2',JSON.stringify({version:9,fragments:300,progression:{schemaVersion:4,purchasedModules:['shield'],branchLicenses:[]},campaign:{purchasedCores:[],selectedCore:'standard',coreRanks:{standard:{modules:0,damage:0,matter:0,drive:0}}},settings:{uiScale:scale,muted:true},training:{completed:true}}));}},{scale:profile.scale});
   await page.clock.install();await page.goto(pathToFileURL(path.resolve('outputs/Drift_Bastion_Playtest.html')).href+'?debug=1');
   await page.locator('#hangarMenuButton').click();await page.locator('#hangarUpgradeTab').click();
   await page.locator('[data-branch="cannon:focus"]').click();
   assert.equal(await page.locator('[data-unlock-branch="cannon:focus"]').isDisabled(),true);
   await page.locator('[data-branch="cannon:twin"]').click();await page.locator('[data-unlock-branch="cannon:twin"]').click();
   await page.locator('[data-branch="cannon:focus"]').click();await page.locator('[data-unlock-branch="cannon:focus"]').click();
   assert.equal((await page.evaluate(()=>window.__driftBastion.getState())).fragments,156);
   await page.screenshot({path:'outputs/balance-qa/'+profile.name+'-hangar.png'});
   await page.locator('#closeHangar').click();await page.locator('#startButton').click();await page.evaluate(()=>window.__driftBastion.addMatter(2000));await page.locator(profile.width < 600 ? '#mobileBuildButton' : '#buildButton').click();
   const cell=(x,y)=>page.locator('.build-cell[data-x="'+x+'"][data-y="'+y+'"]');await cell(0,-1).click();
   for(const choice of ['base1','base2','twin'])await page.locator('[data-weapon="cannon"][data-choice="'+choice+'"]').click();
   assert.equal((await page.evaluate(()=>window.__driftBastion.getState())).upgrades.cannon.level,3);
   await page.locator('#catalog [data-type="cannon"]').click();await cell(1,0).click();if(profile.width<600)await cell(1,0).click();
   assert.equal((await page.evaluate(()=>window.__driftBastion.getState())).modules,3);
   await cell(1,0).click();assert.match(await page.locator('[data-choice="twin"] b').innerText(),/90 Matter/);await page.locator('[data-choice="twin"]').click();await page.locator('[data-choice="focus"]').click();
   const state=await page.evaluate(()=>window.__driftBastion.getState());assert.deepEqual(state.upgrades.cannon.path,['twin','focus']);assert.equal(state.matter,2000-8-18-36-87-90-162);
   await page.screenshot({path:'outputs/balance-qa/'+profile.name+'-build.png'});
   await page.locator('#catalog [data-type="shield"]').click();await cell(-1,0).click();if(profile.width<600)await cell(-1,0).click();
   await page.locator('#closeBuild').click();await page.clock.runFor(1000);assert.equal((await page.evaluate(()=>window.__driftBastion.getState())).screen,'playing');
   await page.screenshot({path:'outputs/balance-qa/'+profile.name+'-combat.png'});
   await page.reload();assert.ok((await page.evaluate(()=>window.__driftBastion.getState())).progression.branchLicenses.includes('cannon:focus'));
   report.push({...profile,passed:true});await context.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync('outputs/balance-qa/browser-report.json',JSON.stringify({passed:true,report,errors},null,2));console.log(JSON.stringify({passed:true,report,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
