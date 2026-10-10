const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const experiment=path.resolve(__dirname,'../../../../outputs/experiments/2026-10-09-attack-vfx-v2');
(async()=>{
  const browser=await chromium.launch({headless:true});
  let context;
  try{
    context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1,recordVideo:{dir:path.join(experiment,'qa/video'),size:{width:1920,height:1080}}});
    const page=await context.newPage(), errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(pathToFileURL(path.join(experiment,'Drift_Bastion_Playtest.html')).href);
    await page.waitForFunction(()=>window.AttackVfxLab?.ready);
    for(const type of ['scatter','cannon','missile','cryo','ember','gravity','pulse','flak']){
      await page.evaluate(type=>window.AttackVfxLab.select(type),type);
      await page.waitForTimeout(3200);
      assert.ok(await page.evaluate(()=>window.AttackVfxLab.events.length>0),`${type} did not fire during recording`);
    }
    assert.deepEqual(errors,[]);
    const video=page.video();
    await context.close();context=null;
    const target=path.join(experiment,'qa/attacks-in-motion-1920x1080.webm');
    await video.saveAs(target);await video.delete();
    console.log(target);
  }finally{await context?.close();await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
