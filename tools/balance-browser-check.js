'use strict';
require("./english-browser-locale.cjs");
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),{chromium}=require('playwright');
// Fragments buy permanent branch licenses in the Hangar; Matter buys ranks per installed copy during a run.
(async()=>{
 const browser=await chromium.launch({headless:true}),errors=[],report=[];fs.mkdirSync('outputs/balance-qa',{recursive:true});
 try{
  for(const profile of [{name:'desktop-1080',width:1920,height:1080,scale:100},{name:'desktop-720-large-text',width:1280,height:720,scale:150}]){
   const context=await browser.newContext({viewport:{width:profile.width,height:profile.height}});const page=await context.newPage();page.on('pageerror',e=>errors.push(profile.name+': '+e.message));
   await page.addInitScript(({scale})=>{if(!localStorage.getItem('balance-seed')){localStorage.setItem('balance-seed','yes');localStorage.setItem('drift-bastion-save-v2',JSON.stringify({version:9,fragments:300,progression:{schemaVersion:4,purchasedModules:['shield'],branchLicenses:[]},campaign:{purchasedCores:[],selectedCore:'standard',coreRanks:{standard:{modules:0,damage:0,matter:0,drive:0}}},settings:{uiScale:scale,muted:true},training:{completed:true}}));}},{scale:profile.scale});
   await page.clock.install();await page.goto(pathToFileURL(path.resolve('outputs/Drift_Bastion_Playtest.html')).href+'?debug=1');
   const state=()=>page.evaluate(()=>window.__driftBastion.getState());
   await page.locator('#hangarMenuButton').click();await page.locator('#pcResearchTab').click();
   const hangarNode=id=>page.locator('#hangarOverlay [data-research-node="'+id+'"]');
   await hangarNode('focus').click();
   assert.equal(await page.locator('[data-unlock-branch="cannon:focus"]').isDisabled(),true,'Specialization needs its parent license');
   await hangarNode('twin').click();await page.locator('[data-unlock-branch="cannon:twin"]').click();
   await hangarNode('focus').click();await page.locator('[data-unlock-branch="cannon:focus"]').click();
   assert.equal((await state()).fragments,300-64-80);
   await page.screenshot({path:'outputs/balance-qa/'+profile.name+'-hangar.png'});
   await page.locator('#closeHangar').click();await page.locator('#startEndlessButton').click();await page.evaluate(()=>window.__driftBastion.addMatter(2000));await page.locator('#buildButton').click();
   const cell=(x,y)=>page.locator('.build-cell[data-x="'+x+'"][data-y="'+y+'"]');
   const spent=[];
   async function buyRank(route){
    await page.locator('#upgradeList [data-research-node^="'+route+':"]').click();
    const purchase=page.locator('#upgradeList .research-purchase');
    const price=Number(/(\d+) Matter/.exec(await purchase.innerText())[1]),before=(await state()).matter;
    await purchase.click();assert.equal((await state()).matter,before-price,route+' charges its shown price');spent.push(price);return price;
   }
   await cell(0,-1).click();await page.locator('#pcUpgradesTab').click();
   for(const route of ['base1','base1/base2','base1/base2/twin'])await buyRank(route);
   assert.equal((await state()).upgrades.cannon.level,3);
   await page.locator('#pcLayoutTab').click();await page.locator('#catalog [data-type="cannon"]').click();
   const copyPrice=(await state()).matter;await cell(1,0).click();spent.push(copyPrice-(await state()).matter);
   assert.equal((await state()).modules,3);
   await cell(1,0).click();await page.locator('#pcUpgradesTab').click();
   assert.equal(await buyRank('base1/base2/twin/twin'),2*45,'Rank price scales with installed copies');
   await buyRank('base1/base2/twin/twin/focus');
   const run=await state();
   assert.deepEqual(spent,[8,18,36,87,90,162]);assert.equal(run.matter,2000-8-18-36-87-90-162);
   assert.equal(run.upgrades.cannon.level,5);
   await page.screenshot({path:'outputs/balance-qa/'+profile.name+'-build.png'});
   await page.locator('#pcLayoutTab').click();await page.locator('#catalog [data-type="shield"]').click();await cell(-1,0).click();
   await page.locator('#closeBuild').click();await page.clock.runFor(1000);assert.equal((await state()).screen,'playing');
   await page.screenshot({path:'outputs/balance-qa/'+profile.name+'-combat.png'});
   await page.reload();assert.ok((await state()).progression.branchLicenses.includes('cannon:focus'));
   report.push({...profile,spent,passed:true});await context.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync('outputs/balance-qa/browser-report.json',JSON.stringify({passed:true,report,errors},null,2));console.log(JSON.stringify({passed:true,report,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
