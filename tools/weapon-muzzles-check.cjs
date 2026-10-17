"use strict";
const fs=require("node:fs"),vm=require("node:vm");
const {assert,game,enemy,tile,makeTile,upgrades,runtime}=require("./balance-fixture");
const muzzles=require("../weapon-muzzles"),feedback=require("../weapon-feedback");
const near=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-6,`${message||"coordinate"}: ${a} != ${b}`);
const same=(a,b)=>{near(a.x,b.x);near(a.y,b.y);};
const audit=JSON.parse(fs.readFileSync("module-art-audit.json","utf8"));
// Independent source-pixel measurements cross-check the imported pivots and scale.
const sourcePorts={cannon:[[627,310]],missile:[[275,402],[434,402],[820,402],[980,402]],
  rail:[[627,123]],scatter:[[112,565]],cryo:[[627,183]],laser:[[627,205]],arc:[[627,360]],
  flak:[[673,170],[844,170]],ember:[[627,166]],mine:[[627,340]]};
for(const [type,points]of Object.entries(sourcePorts)) {
  const data=audit[type],sourceFacing=(type==="scatter"?180:-90)*Math.PI/180;
  assert.equal(muzzles.count(type),points.length);
  points.forEach((p,i)=>{
    const expected={x:(p[0]-data.pivot[0])*data.tileScale,y:(p[1]-data.pivot[1])*data.tileScale};
    same(muzzles.point(type,{x:0,y:0},sourceFacing,1,0,i),expected);
    for(const angle of [0,.73,Math.PI,-Math.PI/2]) {
      const origin={x:123,y:-71},recoil=.12,size=42;
      const start=muzzles.point(type,{x:0,y:0},0,size,0,i);
      const rotated={x:origin.x+Math.cos(angle)*(start.x-recoil*size)-Math.sin(angle)*start.y,
        y:origin.y+Math.sin(angle)*(start.x-recoil*size)+Math.cos(angle)*start.y};
      same(muzzles.point(type,origin,angle,size,recoil,i),rotated);
    }
  });
}
vm.runInNewContext(fs.readFileSync("attack-vfx.js","utf8"),runtime);
function setup(type,angle=.7,facing=-1.2,ids=[]) {
  const g=game();g.ship.tiles.clear();g.ship.tiles.set("0,0",makeTile("core",0,0,true));
  g.ship.x=123;g.ship.y=-71;g.ship.angle=angle;
  const emitter=tile(g,type,0,-1);emitter.cooldown=0;
  const def=ids.length?upgrades(g,type,ids):g.weaponDefinitions[type];
  const origin=g.gridToWorld(0,-1),nx=Math.cos(facing),ny=Math.sin(facing);
  const target=enemy(g,origin.x+nx*120,origin.y+ny*120,1e8);g.rebuildEnemyGrid();
  g.attackVfx=runtime.DriftAttackVfx.create();
  return {g,emitter,def,origin,nx,ny,target};
}
let shots=0;
for(const type of ["cannon","scatter","rail","missile","cryo","mine"]) {
  for(const angle of [0,.7,Math.PI])for(const facing of [0,-1.2,Math.PI/2]) {
    const s=setup(type,angle,facing);s.g.updateWeapons(0);
    assert.ok(s.g.projectiles.length>0);
    const expected=s.g.weaponMuzzle(s.emitter,s.origin,s.nx,s.ny,0);
    for(const p of s.g.projectiles)same(p,expected);
    if(type!=="mine") {
      assert.equal(s.g.attackVfx.muzzleFlashes.length,1,"One physical muzzle must not flash per pellet");
      same(s.g.attackVfx.muzzleFlashes[0],expected);
      near(s.emitter.aim+s.g.ship.angle,facing,"Turret must face its firing vector");
    }
    if(type==="mine")same(expected,muzzles.point(type,s.origin,angle-Math.PI/2,42,0,0));
    shots+=s.g.projectiles.length;
  }
}
// Missile launches cycle through all four tubes, even across separate volleys.
const missile=setup("missile");
for(let shot=0;shot<8;shot++) {
  missile.emitter.cooldown=0;missile.g.updateWeapons(0);
  const p=missile.g.projectiles[shot];
  same(p,missile.g.weaponMuzzle(missile.emitter,missile.origin,missile.nx,missile.ny,shot%4));
}
assert.equal(missile.emitter.muzzleCycle,0);
const salvo=setup("missile",.8,.2,["base1","base2","salvo","salvo","distribute"]);
salvo.g.updateWeapons(0);assert.equal(salvo.g.projectiles.length,4);assert.equal(salvo.g.attackVfx.muzzleFlashes.length,4);
for(let i=0;i<4;i++)same(salvo.g.projectiles[i],salvo.g.weaponMuzzle(salvo.emitter,salvo.origin,salvo.nx,salvo.ny,i));
const scatter=setup("scatter",.3,.8,["base1","base2","cone","cone","double"]);
scatter.g.updateWeapons(0);assert.equal(scatter.g.projectiles.length,11);assert.equal(scatter.g.attackVfx.muzzleFlashes.length,1);

function ignitedWeapon(type,ids=[]) {
  const s=setup(type,.3,.8,ids);
  s.ember=tile(s.g,"ember",-1,-1);s.ember.cooldown=999;
  const origin=s.g.gridToWorld(-1,-1);
  s.g.fireAttack(s.ember,origin,-1,0,s.g.weaponDefinitions.ember,{x:origin.x-100,y:origin.y},1);
  return s;
}
for(const type of ["cannon","scatter"]) {
  const ordinary=setup(type);ordinary.g.updateWeapons(0);
  assert.equal(ordinary.g.attackVfx.muzzleFlashes[0].incendiary,false);
  assert.ok(ordinary.g.projectiles.every(p=>!p.incendiary));
  const hot=ignitedWeapon(type);hot.g.updateWeapons(0);
  assert.equal(hot.g.attackVfx.muzzleFlashes.length,1,"Incendiary projectiles share one physical muzzle flash");
  const hotFlash=hot.g.attackVfx.muzzleFlashes[0];
  assert.equal(hotFlash.incendiary,true);
  assert.ok(hot.g.projectiles.every(p=>p.incendiary));
  // Cosmetic state belongs to the shot, even if the heat source expires or is removed.
  hot.g.updateWeapons(.2);hot.g.attackVfx.update(.01);
  assert.equal(hot.g.hasActiveEmberNeighbor(hot.emitter),false);
  assert.equal(hotFlash.incendiary,true,"Ember expiry cannot recolor an existing shot");
  assert.ok(hot.g.projectiles.every(p=>p.incendiary),"Ember expiry cannot remove a launched projectile's burn");
  hot.ember.emberActiveTime=.2;hot.g.detachTile("-1,-1",false);hot.g.attackVfx.update(.01);
  assert.equal(hotFlash.incendiary,true,"Ember removal cannot recolor an existing shot");
  assert.ok(hot.g.projectiles.every(p=>p.incendiary),"Ember removal cannot remove a launched projectile's burn");
  hot.g.fireAttack(hot.emitter,hot.origin,hot.nx,hot.ny,hot.def,hot.target,1);
  assert.equal(hot.g.attackVfx.muzzleFlashes.length,2);
  assert.equal(hot.g.attackVfx.muzzleFlashes[1].incendiary,false,"Shots after source loss use ordinary muzzle feedback");
  assert.equal(hot.g.projectiles.at(-1).incendiary,false,"Future shots after source loss are ordinary");
}
for(const [ids,shots] of [[["base1","base2","twin"],2],[["base1","base2","twin","twin"],3]]) {
  const hot=ignitedWeapon("cannon",ids);hot.g.updateWeapons(0);
  assert.equal(hot.g.projectiles.length,shots);
  assert.ok(hot.g.projectiles.every(p=>p.incendiary));
  assert.equal(hot.g.attackVfx.muzzleFlashes.length,1,"Twin/Triple Cannon volleys flash once at their single physical barrel");
  assert.equal(hot.g.attackVfx.muzzleFlashes[0].incendiary,true);
}
for(const delay of [.15,.21]) {
  const s=ignitedWeapon("scatter",["base1","base2","cone","cone","double"]);
  s.g.updateWeapons(0);const firstVolley=s.g.projectiles.length;
  s.g.updateWeapons(delay);
  assert.equal(s.g.projectiles.length,firstVolley*2);
  assert.equal(s.g.attackVfx.muzzleFlashes.length,2,"Each delayed volley flashes once, regardless of pellet count");
  assert.equal(s.g.attackVfx.muzzleFlashes[0].incendiary,true);
  assert.equal(s.g.attackVfx.muzzleFlashes[1].incendiary,delay<.2,
    "A delayed volley snapshots the activation window at its own launch");
}

function captureMuzzles(vfx,reducedFlash) {
  const fills=[],transforms=[],stack=[];
  let path;
  const ctx={globalAlpha:.37,fillStyle:"#123456",shadowBlur:7,globalCompositeOperation:"multiply",
    save(){stack.push([this.globalAlpha,this.fillStyle,this.shadowBlur,this.globalCompositeOperation]);},
    restore(){[this.globalAlpha,this.fillStyle,this.shadowBlur,this.globalCompositeOperation]=stack.pop();},
    translate(x,y){transforms.push(["translate",x,y]);},rotate(angle){transforms.push(["rotate",angle]);},
    beginPath(){path=null;},arc(...values){path={type:"arc",values};},ellipse(...values){path={type:"ellipse",values};},
    fill(){fills.push({...path,color:this.fillStyle,alpha:this.globalAlpha});}};
  vfx.muzzles(ctx,(x,y)=>({x,y}),reducedFlash);
  assert.equal(stack.length,0,"Muzzle drawing must balance its canvas saves");
  assert.deepEqual([ctx.globalAlpha,ctx.fillStyle,ctx.shadowBlur,ctx.globalCompositeOperation],
    [.37,"#123456",7,"multiply"],"Muzzle drawing must restore canvas styles");
  return {fills,transforms};
}
for(const type of ["cannon","scatter"]) {
  const ordinary=setup(type);ordinary.g.updateWeapons(0);
  const visual=ignitedWeapon(type);visual.g.updateWeapons(0);
  const beforeDraw=JSON.stringify({tiles:[...visual.g.ship.tiles.values()],projectiles:visual.g.projectiles,
    enemies:visual.g.enemies,matter:visual.g.matter,flashes:visual.g.attackVfx.muzzleFlashes.map(({type,x,y,angle,life,maxLife,incendiary})=>
      ({type,x,y,angle,life,maxLife,incendiary}))});
  const normalDrawing=captureMuzzles(ordinary.g.attackVfx,false);
  const hotDrawing=captureMuzzles(visual.g.attackVfx,false),quietDrawing=captureMuzzles(visual.g.attackVfx,true);
  assert.ok(normalDrawing.fills.length>0&&normalDrawing.fills.every(p=>p.type==="ellipse"),"Ordinary weapon retains its existing flash");
  assert.ok(hotDrawing.fills.length>0&&hotDrawing.fills.every(p=>p.type==="arc"&&p.values[0]>0),
    "An incendiary flash must emit compact particles forward from its muzzle");
  assert.ok(quietDrawing.fills.length>0&&quietDrawing.fills.length<hotDrawing.fills.length,
    "Reduced flashes must retain a quieter cue with fewer particles");
  assert.ok(quietDrawing.fills.every(p=>p.alpha<hotDrawing.fills[0].alpha),"Reduced flashes lowers muzzle opacity");
  same({x:hotDrawing.transforms[0][1],y:hotDrawing.transforms[0][2]},visual.g.attackVfx.muzzleFlashes[0]);
  near(hotDrawing.transforms[1][1],visual.g.attackVfx.muzzleFlashes[0].angle);
  assert.equal(JSON.stringify({tiles:[...visual.g.ship.tiles.values()],projectiles:visual.g.projectiles,
    enemies:visual.g.enemies,matter:visual.g.matter,flashes:visual.g.attackVfx.muzzleFlashes.map(({type,x,y,angle,life,maxLife,incendiary})=>
      ({type,x,y,angle,life,maxLife,incendiary}))}),beforeDraw,"Muzzle rendering must not mutate combat or cosmetic lifetimes");
  visual.g.state="paused";
  const pausedFlash=JSON.stringify(visual.g.attackVfx.muzzleFlashes.map(({x,y,angle,life,incendiary})=>({x,y,angle,life,incendiary})));
  visual.g.update(1);
  assert.equal(JSON.stringify(visual.g.attackVfx.muzzleFlashes.map(({x,y,angle,life,incendiary})=>({x,y,angle,life,incendiary}))),
    pausedFlash,"Build pause must freeze the muzzle effect");
}

// Follow the actual equipment while the ship moves, aims and settles its kick.
const follow=setup("cannon");follow.g.updateWeapons(0);
follow.g.ship.x+=17;follow.g.ship.y-=9;follow.g.ship.angle+=.4;follow.emitter.aim+=.2;
feedback.settle(follow.emitter,.08);follow.g.attackVfx.update(.01);
let direction=follow.emitter.aim+follow.g.ship.angle;
let expected=follow.g.weaponMuzzle(follow.emitter,follow.g.gridToWorld(0,-1),Math.cos(direction),Math.sin(direction),0);
same(follow.g.attackVfx.muzzleFlashes[0],expected);
follow.g.ship.tiles.delete("0,-1");follow.g.attackVfx.update(.01);
assert.equal(follow.g.attackVfx.muzzleFlashes[0].source,null,"Detached modules cannot drag their old muzzle flash");
same(follow.g.attackVfx.muzzleFlashes[0],expected);
for(const type of ["cannon","scatter","missile","rail","cryo"]) {
  const dry=setup(type);dry.g.spawnProjectile=()=>null;dry.g.updateWeapons(0);
  assert.equal(dry.g.attackVfx.muzzleFlashes.length,0);assert.equal(dry.emitter.muzzleCycle||0,0);
  near(feedback.offset(dry.emitter),0);
}

// A turning hull must not move a delayed burst away from its barrel direction.
const burst=setup("rail",0,0,["base1","base2","magazine"]);burst.g.updateWeapons(0);
burst.g.ship.angle=1.1;burst.g.updateWeapons(.2);
near(burst.emitter.aim+burst.g.ship.angle,0);
same(burst.g.projectiles[1],burst.g.weaponMuzzle(burst.emitter,burst.g.gridToWorld(0,-1),1,0,0));

for(const type of ["laser","arc","flak","ember"]) {
  const s=setup(type);s.g.updateWeapons(0);
  const expected=s.g.weaponMuzzle(s.emitter,s.origin,s.nx,s.ny,0);
  if(type==="arc")same(s.g.effects.find(e=>e.type==="arc").points[0],expected);
  else if(type==="ember") {
    const cone=s.g.effects.find(e=>e.type==="flameCone");same(cone,s.origin);
    same({x:cone.muzzleX,y:cone.muzzleY},expected);
    const before=s.target.hp;
    s.g.fireEmberCone(s.origin,s.nx,s.ny,s.def,1,{x:9999,y:9999});
    near(before-s.target.hp,s.def.damage,"Visual origin must not move flame damage bounds");
  } else same(s.g.effects.find(e=>e.type==="beam"),expected);
}
const beam=setup("laser",.2,-.4,["base1","base2","lasting","lasting"]);
assert.ok(beam.def.beamDuration);
{
  beam.g.updateWeapons(0);beam.g.ship.x+=10;beam.g.ship.angle+=.8;beam.g.updateWeapons(1/30);
  const b=beam.emitter.activeBeam;
  near(beam.emitter.aim+beam.g.ship.angle,Math.atan2(b.ny,b.nx));
  same(beam.g.effects.filter(e=>e.type==="beam").at(-1),beam.g.weaponMuzzle(beam.emitter,beam.g.gridToWorld(0,-1),b.nx,b.ny,0));
}
const budget=runtime.DriftAttackVfx.create();
for(let i=0;i<200;i++)budget.shoot("cannon",{x:0,y:0},1,0);
assert.equal(budget.muzzleFlashes.length,64);budget.update(.1);assert.equal(budget.muzzleFlashes.length,0);
for(const type of ["cannon","scatter","rail","cryo","missile"]) {
  const close=setup(type,0,0);close.target.x=close.origin.x+12;close.target.y=close.origin.y;
  close.g.rebuildEnemyGrid();close.g.updateWeapons(0);
  const hp=close.target.hp;
  close.g.updateProjectiles(1/30);
  assert.ok(close.target.hp<hp,type+" must hit enemies between the mount and muzzle");
  assert.ok(close.g.projectiles.every(p=>p.launchX===null&&p.launchY===null));
  if(type==="rail") {
    close.target.x+=500;const behind=enemy(close.g,close.origin.x,close.origin.y,10000);
    close.g.rebuildEnemyGrid();close.g.updateProjectiles(1/30);
    assert.equal(behind.hp,10000,"The launch sweep must not repeat on later frames");
  }
}
const pooled=setup("rail");pooled.g.projectilePool.push({launchX:123,launchY:456});
const reused=pooled.g.spawnProjectile(false,"enemy",0,0,1,0,1,1,1,"#fff");
assert.equal(reused.launchX,null);assert.equal(reused.launchY,null);

async function checkCannonProjectileRenderer() {
  // A decoded atlas fixture exercises dispatch and canvas state without browser/image I/O.
  const root={ATTACK_VFX_SHEETS:[{module:"cannon",frames:4,width:18,height:18,anchor:[9,9],data:"test-cannon"}],
    Image:class {constructor(){this.naturalWidth=72;this.naturalHeight=18;}decode(){return Promise.resolve();}}};
  vm.runInNewContext(fs.readFileSync("attack-vfx.js","utf8"),{window:root,Promise,WeakMap,Float32Array});
  await root.DriftAttackVfx.ready;
  const vfx=root.DriftAttackVfx.create();
  function capture(incendiary,reducedFlash) {
    const styles={globalAlpha:.37,shadowBlur:7,globalCompositeOperation:"multiply",
      strokeStyle:"#123456",lineWidth:6,lineCap:"butt"};
    const stack=[],strokes=[],stamps=[],transforms=[];let path=[];
    const ctx={...styles,
      save(){stack.push(Object.fromEntries(Object.keys(styles).map(key=>[key,this[key]])));},
      restore(){assert.ok(stack.length);Object.assign(this,stack.pop());},
      translate(x,y){transforms.push(["translate",x,y]);},rotate(angle){transforms.push(["rotate",angle]);},
      beginPath(){path=[];},moveTo(x,y){path.push([x,y]);},lineTo(x,y){path.push([x,y]);},
      stroke(){strokes.push({path:path.map(point=>[...point]),color:this.strokeStyle,width:this.lineWidth,alpha:this.globalAlpha});},
      drawImage(...args){stamps.push(args);}};
    const projectile=Object.freeze({kind:"cannon",incendiary,vx:320,vy:-160,x:20,y:30,life:1,damage:12});
    const before=JSON.stringify(projectile),pos={x:123,y:-71};
    assert.equal(vfx.projectile(ctx,projectile,pos,.125,0,reducedFlash),true);
    assert.equal(stack.length,0,"Projectile drawing balances all canvas saves");
    for(const [key,value]of Object.entries(styles))assert.equal(ctx[key],value,"Projectile drawing restores "+key);
    assert.equal(JSON.stringify(projectile),before,"Projectile drawing preserves launch/combat metadata");
    same({x:transforms[0][1],y:transforms[0][2]},pos);
    near(transforms[1][1],Math.atan2(projectile.vy,projectile.vx)+(incendiary?0:Math.PI/2),"Tracer faces projectile velocity");
    return {strokes,stamps};
  }
  const plain=capture(false,false),hot=capture(true,false),quiet=capture(true,true);
  assert.equal(plain.stamps.length,1,"An ordinary Cannon round retains its existing atlas artwork");
  assert.equal(plain.strokes.length,0);
  assert.equal(hot.stamps.length,0,"An ignited Cannon round cannot stamp the cold projectile artwork");
  assert.ok(hot.strokes.length>0&&hot.strokes.every(stroke=>stroke.path.length>=2&&stroke.width>0),
    "Ignited Cannon rounds draw a finite directional tracer");
  for(const stroke of hot.strokes)for(const point of stroke.path)assert.ok(point.every(Number.isFinite));
  assert.equal(quiet.stamps.length,0);
  assert.equal(quiet.strokes.length,hot.strokes.length);
  assert.ok(quiet.strokes.every((stroke,index)=>stroke.alpha<hot.strokes[index].alpha),
    "Reduced flashes lowers ignited Cannon tracer opacity");
}
checkCannonProjectileRenderer().then(()=>{
  console.log(JSON.stringify({passed:true,projectilesChecked:shots,sourceAnchors:Object.keys(sourcePorts).length,checks:["Imported art pivots and muzzles","World rotation and recoil","Actual projectile births","Four missile tubes","One flash per physical muzzle","Cannon/Scatter launch snapshots and source loss","One flash per Twin/Triple Cannon volley","Delayed incendiary volleys","Quiet forward muzzle particles","Warm Cannon tracer vs ordinary atlas","Projectile canvas state and metadata purity","Canvas and render purity","Paused muzzle lifetime","Live flash attachment and detachment","Delayed bursts on turning hulls","Beam and flame visual origins","Failed spawns and bounded flashes"]}));
}).catch(error=>{console.error(error);process.exitCode=1;});
