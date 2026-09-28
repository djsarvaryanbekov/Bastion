'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url'),{chromium}=require('playwright');
(async()=>{const file=path.resolve(process.argv[2]||'outputs/Drift_Bastion_Playtest.html'),url=pathToFileURL(file).href,out=path.resolve('outputs/experiments/2026-09-15-lmb-hints');const b=await chromium.launch({headless:true});try{
 const p=await b.newPage({viewport:{width:1280,height:800}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.clock.install();await p.goto(url);await p.locator('#startButton').click();const state=()=>p.evaluate(()=>window.__driftBastion.getState());
 assert.equal(await p.locator('#survivalHud,#survivalProgress').count(),0);assert(await p.locator('#controlHint').isVisible());assert.match(await p.locator('#controlHint').innerText(),/LMB/);assert.equal(await p.locator('#controlHint').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');assert((await p.locator('#controlHint').boundingBox()).y<180);await p.screenshot({path:path.join(out,'hint.png')});
 await p.mouse.move(1050,400);await p.mouse.down({button:'right'});await p.clock.runFor(200);await p.mouse.up({button:'right'});assert(await p.locator('#controlHint').isVisible());assert.equal((await state()).ship.vx,0);
 const before=await state();await p.mouse.down({button:'left'});await p.clock.runFor(600);assert((await state()).ship.x>before.ship.x+10);assert.equal(await p.locator('#controlHint').isVisible(),false);await p.mouse.up({button:'left'});const stop=await state();assert.equal(stop.ship.vx,0);await p.clock.runFor(200);assert.equal((await state()).ship.x,stop.ship.x);
 await p.locator('#pauseButton').click();await p.locator('#resumeButton').click();assert.equal(await p.locator('#controlHint').isVisible(),false);
 for(const key of ['w','a','s','d','b','p']) {await p.goto(url);await p.locator('#startButton').click();assert(await p.locator('#controlHint').isVisible());await p.keyboard.press(key);assert.equal(await p.locator('#controlHint').isVisible(),false,key);}
 await p.goto(url);await p.locator('#startButton').click();await p.locator('#buildButton').click();assert.equal(await p.locator('#controlHint').isVisible(),false);
 for(const viewport of [{width:1280,height:800},{width:390,height:844}]) {
  await p.setViewportSize(viewport);await p.goto(url);await p.locator('#menuSettingsButton').click();await p.locator('#uiScaleSelect').selectOption('150');
  const body=await p.locator('#settingsContent').boundingBox(),footer=await p.locator('.pause-actions').boundingBox();assert(body.height>100);assert(body.y+body.height<=footer.y+1,'Settings cannot overlap footer');
  for(const id of ['volumeSlider','shakeSlider','uiScaleSelect','qualitySelect','fpsLimitSelect']){const control=p.locator('#'+id);await control.scrollIntoViewIfNeeded();const rect=await control.boundingBox();assert(rect.y>=body.y-1 && rect.y+rect.height<=body.y+body.height+1,id+' fits scrollport');}
  await p.screenshot({path:path.join(out,'settings-'+viewport.width+'.png')});await p.locator('#resumeButton').click();assert.equal(await p.locator('#pauseOverlay').isVisible(),false);
 }
 assert.deepEqual(errors,[]);console.log('PASS: LMB movement/release, RMB ignored, hint top/transparent/dismissal, no Endless HUD, desktop/mobile Settings at 150%, no errors');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
