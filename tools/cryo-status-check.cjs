"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const harness = fs.readFileSync(".artifact_build/runtime-check.js", "utf8").split("let installPromptCalls")[0];
const source = fs.readFileSync("game.js", "utf8");
const coldSource = fs.readFileSync("cold-vfx.js", "utf8");
const baseline = process.argv[2] && fs.readFileSync(process.argv[2], "utf8");
const marker = "    window.__driftBastion = {";
const checks = [];
const near = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-8, `${message}: ${a} != ${b}`);

function load(gameSource, instrument) {
  const bridge = `
    window.coldStatusTest={Game,makeTile,save,MODULES,upgrades:runUpgrades,ctx,drawEnemies,
      get cache(){return enemySpriteCache;},setArt:function(art){enemyArt=art;},
      activate:function(instance){game=instance;},cold:[],events:[],images:0,phase:"sprites"};
  ` + (instrument ? `
    var originalCold=window.DriftColdVfx.draw,originalBurn=fireVfx.burn;
    window.DriftColdVfx.draw=function(ctx,enemy,pos,radius,facing,time,elapsed,zoom,detailed,reducedFlash,surface){
      var test=window.coldStatusTest;test.phase="cold";test.events.push("cold");
      test.cold.push({enemy:enemy,pos:{x:pos.x,y:pos.y},radius,facing,time,elapsed,zoom,detailed,reducedFlash,surface,images:test.images});
      return originalCold.apply(this,arguments);
    };
    fireVfx.burn=function(){window.coldStatusTest.phase="burn";window.coldStatusTest.events.push("burn");return originalBurn.apply(this,arguments);};
  ` : "");
  assert.equal(gameSource.split(marker).length, 2, "Game fixture marker remains unique");
  const instrumented = gameSource.replace(marker, bridge + marker);
  const bootstrap = { console, setTimeout, clearTimeout, URLSearchParams, process: { env: { BALANCE_SECONDS: "1" } },
    require(name) {
      if (name === "fs") return { ...fs, readFileSync(file, encoding) {
        return file === "game.js" ? instrumented : fs.readFileSync(file, encoding);
      } };
      return require(name);
    } };
  vm.runInNewContext(harness + "\nglobalThis.runtime=sandbox;", bootstrap);
  return { api: bootstrap.runtime.coldStatusTest, runtime: bootstrap.runtime };
}

const { api, runtime } = load(source, true);
const previous = baseline ? load(baseline, false).api : null;
const sprite = {};
api.ctx.drawImage = image => { if (image === sprite && api.phase === "sprites") api.images += 1; };
api.ctx.stroke = function(){if(this.strokeStyle==="#8ac7ff")api.oldBlueArcs=(api.oldBlueArcs||0)+1;};
function fresh() {
  const g = new api.Game();g.enemies=[];g.enemyById.clear();g.enemyGrid.clear();g.operation=null;
  api.activate(g);api.save.settings.reducedFlash=false;api.save.settings.qualityTier=0;
  api.setArt(null);api.cache.colossus={sprite,half:60,size:120};
  return g;
}
function chill(g, x=100, y=0) {
  const enemy=g.spawnEnemy("colossus",x,y);enemy.slowTimer=2;enemy.slowFactor=.5;return enemy;
}
function render() {
  api.cold.length=0;api.events.length=0;api.images=0;api.oldBlueArcs=0;api.phase="sprites";api.drawEnemies();return api.cold;
}

{
  const g=fresh();
  for(const x of [100,200]){const enemy=chill(g,x);enemy.burnTimer=1;enemy.burnDamage=3;}
  let calls=render();assert.equal(calls.length,2);
  assert.equal(api.oldBlueArcs,0,"Cold status no longer draws the detached blue arc");
  assert.ok(calls.every(call=>call.images===2),"Frost draws above every enemy sprite");
  assert.equal(JSON.stringify(api.events),JSON.stringify(["cold","cold","burn","burn"]),"Burn remains above the entire frost pass");
  assert.ok(calls.every(call=>call.radius===60&&call.surface===api.cache.colossus),"Frost receives actual cached hull bounds and silhouette");
  api.setArt({available(){return true;},displaySize(){return 122;}});api.cache.colossus.half=100;
  assert.ok(render().every(call=>call.radius===61),"Transparent cache padding cannot inflate the frost radius");
  api.setArt(null);api.cache.colossus.half=60;
  g.camera.zoom=.35;assert.ok(render().every(call=>call.zoom===.35),"Frost receives the distant-camera scale");
  g.enemies[0].slowTimer=0;g.enemies[0].freezeUntil=0;g.enemies[1].dead=true;
  assert.equal(render().length,0,"Expired chill and dead enemies receive no frost");
  g.enemies[0].freezeUntil=.6;g.enemies[0].slowFactor=1;g.elapsed=.59;
  assert.equal(render().length,1,"A real active freeze remains visible without a chill timer");
  g.elapsed=.6;assert.equal(render().length,0,"Freeze ends at its actual elapsed-time boundary");
  g.enemies[0].slowTimer=1;g.enemies[0].slowFactor=.5;
  assert.equal(render().length,1,"After freeze expires a remaining chill still receives frost");
  g.enemies[0].x=1e6;assert.equal(render().length,0,"Offscreen enemies do not consume the cold detail budget");
  checks.push("Sprite/frost/burn layering","Artwork and padded-cache bounds","Expiry, death, offscreen and freeze/chill transition");
}

{
  const g=fresh();for(let i=0;i<100;i++)chill(g,100,0);
  for(const [quality,details]of [[0,32],[1,16],[2,0]]) {
    api.save.settings.qualityTier=quality;const calls=render();
    assert.equal(calls.length,100,"Every cold enemy retains a cue at every quality tier");
    assert.equal(calls.filter(call=>call.detailed).length,details,"Only the permitted cold effects animate");
  }
  api.save.settings.qualityTier=0;api.save.settings.reducedFlash=true;
  const calls=render();assert.equal(calls.length,100);assert.ok(calls.every(call=>!call.detailed&&call.reducedFlash));
  checks.push("32/16/0 cold detail budgets","Reduced flashes preserve every status cue");
}

{
  const g=fresh();const enemy=chill(g);api.cache.colossus=null;
  assert.equal(render().length,1,"Fallback enemy geometry also receives frost");
  g.spawnBoss();g.boss.x=250;g.boss.y=0;g.boss.slowTimer=2;g.boss.slowFactor=.8;
  assert.equal(render().length,2,"Chilled bosses receive their own fallback frost cue");
  enemy.slowTimer=0;enemy.slowFactor=.5;g.boss.slowTimer=0;g.boss.slowFactor=1;g.boss.freezeUntil=100;
  assert.equal(render().length,0,"Stale slowFactor and unsupported boss freeze timers cannot advertise a cold status");
  checks.push("Fallback and boss eligibility");
}

{
  const g=fresh();const enemy=Object.freeze(chill(g));g.state="paused";
  const snapshot=()=>JSON.stringify({enemies:g.enemies,tiles:[...g.ship.tiles],projectiles:g.projectiles,
    elapsed:g.elapsed,time:g.backgroundPulse,matter:g.matter,save:api.save});
  const before=snapshot(),random=runtime.Math.random;
  runtime.Math.random=()=>{throw new Error("Cold rendering consumed combat RNG");};
  try {render();render();} finally {runtime.Math.random=random;}
  assert.equal(snapshot(),before,"Frost rendering preserves frozen enemies, combat and saves");
  assert.equal(api.cold[0].enemy,enemy);
  const timer=enemy.slowTimer,elapsed=g.elapsed;g.update(1);
  near(enemy.slowTimer,timer,"Pause freezes chill duration");near(g.elapsed,elapsed,"Pause freezes freeze-proc time");
  checks.push("No gameplay/save writes or combat RNG","Paused status timers");
}

// Optional task audit; routine regressions do not depend on an experiment backup.
if(previous) {
  const names=Object.getOwnPropertyNames(api.Game.prototype);
  assert.equal(JSON.stringify(names),JSON.stringify(Object.getOwnPropertyNames(previous.Game.prototype)));
  for(const name of names)assert.equal(String(api.Game.prototype[name]),String(previous.Game.prototype[name]),"Gameplay method unchanged: "+name);
  for(const field of ["damage","range","cooldown","slowFactor","slowDuration"])
    assert.equal(api.MODULES.cryo[field],previous.MODULES.cryo[field],"Cryo balance unchanged: "+field);
  assert.equal(JSON.stringify(api.upgrades.trees.cryo),JSON.stringify(previous.upgrades.trees.cryo));
  checks.push("All "+names.length+" gameplay methods and Cryo upgrade/balance definitions preserved");
}

function cryoScenario(test, freeze, boss) {
  const g=new test.Game();g.enemies=[];g.enemyById.clear();g.enemyGrid.clear();g.ship.tiles.clear();g.operation=null;
  const emitter=test.makeTile("cryo",0,-1,false);g.ship.tiles.set("0,-1",emitter);
  let def=g.weaponDefinitions.cryo;
  if(freeze) {
    const data={},licenses=test.upgrades.trees.cryo.branches.map(branch=>"cryo:"+branch.id);
    for(const id of ["base1","base2","deep","deep","freeze"])
      assert.ok(test.upgrades.purchase(data,"cryo",id,1e8,1,undefined,licenses));
    g.upgrades.cryo=data.cryo;def=g.weaponDefinitions.cryo=test.upgrades.resolve(test.MODULES.cryo,data.cryo);
  }
  const origin=g.gridToWorld(0,-1);let target;
  if(boss){g.spawnBoss();target=g.boss;target.x=origin.x+110;target.y=origin.y;}
  else target=g.spawnEnemy("colossus",origin.x+110,origin.y);
  target.hp=target.maxHp=10000;g.rebuildEnemyGrid();
  const history=[];
  for(let shot=0;shot<(freeze?4:1);shot++) {
    g.elapsed=shot*.1;g.fireAttack(emitter,origin,1,0,def,target,1);g.updateProjectiles(.2);
    history.push({hp:target.hp,slowTimer:target.slowTimer,slowFactor:target.slowFactor,
      freezeUntil:target.freezeUntil||0,immune:target.freezeImmuneUntil||0});
  }
  near(target.hp,10000-def.damage*(freeze?4:1),"Cryo direct-hit damage is preserved");
  near(target.slowFactor,boss ? .8 : freeze ? .25 : .5,"Actual Cryo chill strength");
  near(target.slowTimer,freeze?4:2,"Actual Cryo chill duration");
  if(!boss&&freeze) {
    near(history[2].freezeUntil,0,"Three hits do not trigger full freeze");
    near(target.freezeUntil,g.elapsed+.6,"Four Freeze-route hits freeze for 0.6 seconds");
    const position=[target.x,target.y];target.vx=10;target.vy=20;g.updateEnemies(.1);
    assert.equal(JSON.stringify([target.x,target.y]),JSON.stringify(position));
    near(target.vx,0,"A frozen ordinary enemy cannot move");near(target.vy,0,"A frozen ordinary enemy cannot move");
  }
  if(boss){near(target.slowFactor,.8,"Boss cold resistance remains 80% speed");near(target.freezeUntil||0,0,"Cryo cannot hard-freeze bosses");}
  return history;
}
for(const [freeze,boss]of [[false,false],[true,false],[true,true]]) {
  const current=cryoScenario(api,freeze,boss);
  if(previous)assert.equal(JSON.stringify(current),JSON.stringify(cryoScenario(previous,freeze,boss)),"Real Cryo hits match the pre-visual baseline");
}
checks.push("Real base-Cryo impacts","Four-hit Freeze proc and 0.6-second immobilization","Boss cold resistance");

function canvasContext() {
  const initial={globalAlpha:.37,fillStyle:"#123",strokeStyle:"#456",shadowBlur:7,
    globalCompositeOperation:"multiply",lineWidth:3};
  const stack=[],calls=[];
  const target={...initial,calls,
    save(){stack.push(Object.fromEntries(Object.keys(initial).map(key=>[key,this[key]])));},
    restore(){assert.ok(stack.length,"Balanced canvas saves");Object.assign(this,stack.pop());},
    assertRestored(){assert.equal(stack.length,0);for(const [key,value]of Object.entries(initial))assert.equal(this[key],value);}};
  return new Proxy(target,{get(object,key){
    if(key in object)return object[key];
    return (...args)=>{
      for(const value of args)if(typeof value==="number")assert.ok(Number.isFinite(value),"Finite cold geometry: "+key);
      if(key==="arc")assert.ok(args[2]>0,"Cold motes have a positive radius");
      calls.push({op:key,args,alpha:object.globalAlpha,color:object.fillStyle,composite:object.globalCompositeOperation});
    };
  }});
}

{
  const canvases=[];
  const math=Object.create(Math);math.random=()=>{throw new Error("Cold renderer consumed combat RNG");};
  const root={document:{createElement(){const context=canvasContext();const canvas={getContext(){return context;},context};canvases.push(canvas);return canvas;}}};
  vm.runInNewContext(coldSource,{window:root,Math:math});
  const unit={id:17,type:"colossus",x:20,y:30,slowTimer:2,slowFactor:.5,freezeUntil:0,hitFlash:0,dead:false};
  const surface={sprite:{width:240,height:240},half:60,size:120};
  function draw(time=.8,elapsed=0,detailed=true,reducedFlash=false,geometry=surface) {
    const ctx=canvasContext();root.DriftColdVfx.draw(ctx,unit,{x:unit.x,y:unit.y},60,.7,time,elapsed,.35,detailed,reducedFlash,geometry);
    ctx.assertRestored();return ctx.calls;
  }
  const first=draw(),paused=draw();assert.deepEqual(paused,first,"Repeated paused draws produce identical geometry/styles");
  assert.equal(canvases.length,1,"A chilled hull overlay is cached once");
  assert.ok(canvases[0].context.calls.some(call=>call.op==="drawImage"&&call.args[0]===surface.sprite&&call.composite==="destination-in"),
    "Cached frost is clipped through actual sprite alpha");
  unit.freezeUntil=.6;const frozen=draw(.8,.1);assert.equal(canvases.length,2,"A frozen overlay has a separate cached appearance");
  assert.notDeepEqual(frozen,paused,"Full freeze is visually distinct from ordinary chill");
  assert.deepEqual(draw(.8,.6),paused,"Freeze expiry returns to the existing chilled appearance");
  assert.equal(canvases.length,2,"Repeated transitions reuse both overlay variants");
  unit.freezeUntil=0;
  const worldMotes=draw().filter(call=>call.op==="arc");unit.x+=40;unit.y-=20;
  const movedMotes=draw().filter(call=>call.op==="arc");assert.equal(movedMotes.length,worldMotes.length);
  movedMotes.forEach((call,index)=>{
    assert.equal(call.color,worldMotes[index].color);near(call.alpha,worldMotes[index].alpha,"World-space mote opacity");
    call.args.forEach((value,coordinate)=>near(value,worldMotes[index].args[coordinate],"Cold motes remain fixed when the hull moves"));
  });
  for(let step=0;step<=120;step++)assert.ok(draw(.8+step/120).filter(call=>call.op==="arc").length<=12,"Cold emission history remains bounded");
  const quiet=draw(2,0,false,true,{sprite:{}});
  assert.ok(quiet.some(call=>call.op==="fill"),"Fallback/reduced-flash frost still paints a visible hull cue");
  assert.ok(quiet.every(call=>call.op!=="arc"),"Reduced flashes omit drifting motes");
  unit.slowTimer=0;assert.equal(draw().length,0,"Expired status renders no residual hull cue");
  unit.slowTimer=2;unit.dead=true;assert.equal(draw().length,0,"Dead enemies render no cold cue");
  checks.push("Clipped two-variant overlay cache","Frozen/chilled visual distinction","Paused canvas purity and finite 0.35-zoom geometry","World-space cold motes and bounded history","Visible quiet fallback and clean expiry");
}

console.log(JSON.stringify({passed:true,checks}));
