'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const output=path.resolve(__dirname,'../outputs/qa/upgrade-details');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true}),errors=[],captures=[];
 try {
  for(const [width,height,uiScale] of [[1280,720,100],[1280,720,150],[1920,1080,100],[2560,1440,100]]){
   const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage();
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(uiScale=>localStorage.setItem('drift-bastion-save-v2',JSON.stringify({version:9,fragments:2000,settings:{uiScale,muted:true},progression:{schemaVersion:4,purchasedModules:['scatter'],branchLicenses:[]},training:{completed:true}})),uiScale);
   await page.clock.install();await page.goto(pathToFileURL(path.resolve(__dirname,'../outputs/Drift_Bastion_Playtest.html')).href+'?debug=1');
   await page.evaluate(()=>window.DriftModuleArt.ready);await page.clock.pauseAt(new Date(Date.now()+1000));
   const tick=()=>page.clock.runFor(200),state=()=>page.evaluate(()=>window.__driftBastion.getState());
   await page.click('#startButton');await page.evaluate(()=>window.__driftBastion.addMatter(1000));await page.click('#buildButton');
   await page.click('#catalog [data-type="scatter"]');
   for(const [x,y] of [[1,0],[1,1],[0,1]])await page.click(`.build-cell[data-x="${x}"][data-y="${y}"]`);
   await page.click('#pcUpgradesTab');await tick();
   for(const cost of [30,63]){
    const before=await state();await page.locator('#upgradeList .research-node').filter({hasText:cost===30?'Damage':'Fire rate'}).click();
    const buy=page.locator('#upgradeList button.research-purchase');assert.equal(await buy.innerText(),`Upgrade · ${cost} Matter`);
    await buy.click();await tick();assert.equal((await state()).matter,before.matter-cost);
   }
   await page.locator('#upgradeList .research-node').filter({hasText:'Buckshot 1'}).click();await tick();
   const detail=page.locator('#upgradeList .research-detail');
   assert.match(await detail.innerText(),/64 Fragments/);assert.match(await detail.innerText(),/39 × 3 copies = 117 Matter/);
   assert.ok((await detail.innerText()).split(/\s+/).length<55);
   assert.equal(await detail.locator('.upgrade-option').count(),0,'Locked data must not masquerade as a purchase button');
   assert.equal(await detail.locator('button').count(),0);
   assert.equal(await detail.locator('.research-stat-row').count(),3);
   const name=`${width}x${height}-${uiScale}.png`;await page.screenshot({path:path.join(output,name)});captures.push(name);
   const beforeRange=await state();assert.equal(await page.evaluate(()=>window.DriftPCGame.startRange('scatter')),false);assert.deepEqual(await state(),beforeRange);
   await context.close();
  }
  assert.deepEqual(errors,[]);const report={passed:true,captures,checks:['real upgrade buttons purchase for all three copies','locked branch is plain status and stat rows','no duplicate title or fake purchase action','compact copy','range entry blocked during a run'],errors};
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(report);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
