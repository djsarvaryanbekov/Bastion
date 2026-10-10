const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../../../..');
const experiment=path.join(root,'outputs/experiments/2026-10-09-attack-vfx-v2');
const output=path.join(experiment,'qa');
fs.mkdirSync(output,{recursive:true});
(async()=>{
  const browser=await chromium.launch({headless:true});
  const errors=[],report={viewport:'1920x1080 at normal scale',screens:[],mechanics:{}};
  try {
    const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
    page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>localStorage.setItem('drift-bastion-save-v2','original-profile-sentinel'));
    await page.clock.install();
    await page.goto(pathToFileURL(path.join(experiment,'Drift_Bastion_Playtest.html')).href);
    await page.waitForFunction(()=>window.AttackVfxLab?.ready);
    await page.clock.pauseAt(new Date(Date.now()+100));
    for(const [type,time] of [['scatter',620],['cannon',650],['missile',1100],['cryo',1250],['ember',430],['gravity',800],['pulse',440],['flak',450]]) {
      await page.evaluate(type=>window.AttackVfxLab.select(type),type);
      await page.clock.runFor(time);
      const state=await page.evaluate(()=>{
        const lab=window.AttackVfxLab,g=lab.game();
        return {type:lab.events[0]?.type,events:lab.events.slice(),projectiles:g.projectiles.filter(p=>p.life>0).map(p=>({kind:p.kind,vx:p.vx,vy:p.vy,friendly:p.friendly})),effects:g.effects.map(e=>({type:e.type,radius:e.radius})),slowed:g.enemies.filter(e=>!e.dead&&e.slowTimer>0).length,burning:g.enemies.filter(e=>!e.dead&&e.burnTimer>0).length,fields:g.gravityFields.length};
      });
      assert.equal(state.type,type,`${type} must actually fire`);
      if(type==='scatter') {assert.equal(state.events[0].shots,5);assert.equal(new Set(state.projectiles.filter(p=>p.kind==='scatter').map(p=>Math.atan2(p.vy,p.vx).toFixed(4))).size,5);report.mechanics.shotgunFiveDistinctPellets=true;}
      if(type==='cryo') {assert.ok(state.slowed>0);report.mechanics.realCryoSlow=true;}
      if(type==='ember') {assert.ok(state.burning>0);report.mechanics.realEmberBurn=true;}
      if(type==='gravity')assert.equal(state.fields,1);
      await page.screenshot({path:path.join(output,`${type}-1920x1080.png`)});
      report.screens.push({type,state});
      // Rendering and switching the visual comparison must not mutate simulation state.
      const parity=await page.evaluate(()=>{
        const lab=window.AttackVfxLab,g=lab.game(),vfx=window.DriftAttackVfx;
        const snapshot=()=>JSON.stringify({enemies:g.enemies.map(e=>[e.x,e.y,e.hp,e.slowTimer,e.burnTimer]),shots:g.projectiles.map(p=>[p.x,p.y,p.vx,p.vy,p.life,p.damage]),matter:g.matter,kills:g.kills});
        const before=snapshot();vfx.setEnabled(false);lab.render(performance.now());vfx.setEnabled(true);lab.render(performance.now());return before===snapshot();
      });
      assert.ok(parity,`${type} renderer mutates gameplay`);
    }
    await page.evaluate(()=>window.AttackVfxLab.select('gravity'));
    await page.clock.runFor(400);
    const gravityBefore=await page.evaluate(()=>{const g=window.AttackVfxLab.game(),f=g.gravityFields[0],e=g.enemies[1];return Math.hypot(e.x-f.x,e.y-f.y);});
    await page.clock.runFor(300);
    const gravityAfter=await page.evaluate(()=>{const g=window.AttackVfxLab.game(),f=g.gravityFields[0],e=g.enemies[1];return Math.hypot(e.x-f.x,e.y-f.y);});
    assert.ok(gravityAfter<gravityBefore,'Gravity must actually pull nearby enemies');
    report.mechanics.realGravityPull={before:gravityBefore,after:gravityAfter};
    const flak=await page.evaluate(()=>{
      const lab=window.AttackVfxLab;lab.select('flak');const g=lab.game(),bridge=window.__attackVfxBridge;
      g.projectiles.length=0;const origin=g.gridToWorld(0,-1),target={x:origin.x,y:origin.y-200};
      const shots=[0,30,60,160].map(offset=>g.spawnProjectile(false,'enemyShot',target.x+offset,target.y,0,90,3,4,4,'#ff7359'));
      g.fireAttack(g.ship.tiles.get('0,-1'),origin,0,-1,g.weaponDefinitions.flak,target,1);
      return shots.map(p=>p.life);
    });
    assert.deepEqual(flak.slice(0,3),[0,0,0]);assert.ok(flak[3]>0);
    report.mechanics.realFlakInterception=true;
    await page.clock.runFor(70);
    await page.screenshot({path:path.join(output,'flak-1920x1080.png')});
    await page.evaluate(()=>window.AttackVfxLab.select('missile'));
    await page.clock.runFor(450);
    const missileBefore=await page.evaluate(()=>{const g=window.AttackVfxLab.game(),p=g.projectiles.find(p=>p.kind==='missile');g.enemyById.get(p.targetId).x+=100;return Math.atan2(p.vy,p.vx);});
    await page.clock.runFor(350);
    const missileAfter=await page.evaluate(()=>{const p=window.AttackVfxLab.game().projectiles.find(p=>p.kind==='missile');return Math.atan2(p.vy,p.vx);});
    assert.ok(Math.abs(missileAfter-missileBefore)>.04);report.mechanics.realHomingTurn=true;
    // Muzzle cosmetics expire while paused combat objects remain untouched.
    await page.evaluate(()=>{const lab=window.AttackVfxLab;lab.select('cannon');lab.game().ship.tiles.forEach(t=>t.cooldown=999);window.DriftAttackVfx.shoot('cannon',{x:0,y:0},0,-1);window.DriftAttackVfx.update(.2);});
    assert.equal(await page.evaluate(()=>window.DriftAttackVfx.stats().muzzles),0);
    const sheets=await page.evaluate(async()=>{
      const result=[];
      for(const sheet of window.ATTACK_VFX_SHEETS){
        const image=new Image();image.src=sheet.data;await image.decode();
        const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
        const context=canvas.getContext('2d');context.drawImage(image,0,0);
        const pixels=context.getImageData(0,0,image.width,image.height).data;
        let min=255,max=0,edge=0;const cell=image.width/sheet.frames;
        for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){
          const alpha=pixels[(y*image.width+x)*4+3];min=Math.min(min,alpha);max=Math.max(max,alpha);
          if(y===0||y===image.height-1||x%cell===0||x%cell===cell-1)edge=Math.max(edge,alpha);
        }
        result.push({type:sheet.module,frames:sheet.frames,minAlpha:min,maxAlpha:max,frameEdgeAlpha:edge});
      }
      for(let i=0;i<200;i++)window.DriftAttackVfx.shoot('scatter',{x:0,y:0},0,-1);
      if(window.DriftAttackVfx.stats().muzzles>64)throw new Error('Unbounded muzzle feedback');
      window.DriftAttackVfx.update(.2);
      window.__attackVfxBridge.save.settings.reducedFlash=true;
      window.AttackVfxLab.render(performance.now());
      window.__attackVfxBridge.save.settings.reducedFlash=false;
      return result;
    });
    for(const sheet of sheets){assert.equal(sheet.minAlpha,0);assert.ok(sheet.maxAlpha>0);assert.equal(sheet.frameEdgeAlpha,0,`${sheet.type} frame clipping`);}
    report.sheets=sheets;
    const profile=await page.evaluate(()=>localStorage.getItem('drift-bastion-save-v2'));
    assert.equal(profile,'original-profile-sentinel');
    report.mechanics.renderersDoNotMutateCombat=true;report.mechanics.originalSaveUntouched=true;report.errors=errors;
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
    console.log('PASS: eight moving attack previews; actual shotgun, homing, slow, burn, pull and interception; original save untouched.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
