"use strict";
const fs = require("node:fs"), vm = require("node:vm"), assert = require("node:assert/strict");
const harness = fs.readFileSync(".artifact_build/runtime-check.js", "utf8");
const marker = "    window.__driftBastion = {";
const source = fs.readFileSync("game.js", "utf8").replace(marker, `
    window.burnIndicatorTest = {Game, makeTile, save, ctx,
      get enemySpriteCache(){return enemySpriteCache;}, drawEnemies, drawShip, worldToScreen,
      burns:[], ignitions:[], images:0, setArt:function(art){enemyArt=art;}, activate:function(g){game=g;}};
    var originalBurn = fireVfx.burn, originalIgnition = fireVfx.ignition;
    fireVfx.burn = function(ctx, enemy, pos, radius, facing, time, zoom, detailed, reducedFlash) {
      window.burnIndicatorTest.burns.push({pos:{x:pos.x,y:pos.y},radius,zoom,detailed,reducedFlash,images:window.burnIndicatorTest.images});
      originalBurn.apply(this,arguments);
    };
    fireVfx.ignition = function(){window.burnIndicatorTest.ignitions.push([...arguments].slice(1));originalIgnition.apply(this,arguments);};
` + marker);
const bootstrap = {console, setTimeout, clearTimeout, URLSearchParams, process:{env:{BALANCE_SECONDS:"1"}},
  require(name) {
    if (name === "fs") return {...fs, readFileSync(p,e){return p === "game.js" ? source : fs.readFileSync(p,e);}};
    return require(name);
  }};
vm.runInNewContext(harness.slice(0, harness.indexOf("let installPromptCalls")) + "\nglobalThis.runtime=sandbox;", bootstrap);
const api = bootstrap.runtime.burnIndicatorTest;
const sprite = {};
api.ctx.drawImage = function(image){if(image === sprite) api.images++;};
function fresh() {
  const g = new api.Game(); g.enemies=[]; g.enemyById.clear(); api.activate(g);
  api.burns.length=0; api.ignitions.length=0; api.images=0; return g;
}
function render() {api.burns.length=0; api.images=0; api.drawEnemies(); return api.burns;}
const g = fresh(); api.enemySpriteCache.colossus={sprite, half:60, size:120};
for(const x of [100,200]) {const e=g.spawnEnemy("colossus",x,0); e.burnTimer=1; e.burnDamage=3;}
api.save.settings.reducedFlash=true;
let burns=render(); assert.equal(burns.length,2);
assert.ok(burns.every(b=>b.images===2), "Fire must draw above every enemy sprite");
assert.ok(burns.every(b=>b.radius===60), "Hull fire uses actual artwork bounds");
api.setArt({available(){return true;},displaySize(){return 122;}}); api.enemySpriteCache.colossus.half=100;
assert.ok(render().every(b=>b.radius===61), "Padded caches cannot inflate hull fire");
api.setArt(null); api.enemySpriteCache.colossus.half=60;
g.camera.zoom=.35; assert.ok(render().every(b=>b.zoom===.35), "Hull heat receives zoom compensation");
g.enemies[0].burnTimer=0; g.enemies[1].dead=true; assert.equal(render().length,0);
g.enemies[0].burnTimer=1; api.enemySpriteCache.colossus=null; assert.equal(render().length,1);
const crowd=fresh(); api.enemySpriteCache.colossus={sprite,half:60,size:120};
for(let i=0;i<100;i++) {const e=crowd.spawnEnemy("colossus",100,0); e.burnTimer=1; e.burnDamage=3;}
api.save.settings.reducedFlash=false;
for(const [quality,details] of [[0,32],[1,16],[2,0]]) {
  api.save.settings.qualityTier=quality; burns=render();
  assert.equal(burns.length,100, "Every burning enemy retains steady heat on its hull");
  assert.equal(burns.filter(b=>b.detailed).length,details, "Animated fire respects the quality budget");
}
api.save.settings.qualityTier=0; api.save.settings.reducedFlash=true;
assert.equal(render().filter(b=>b.detailed).length,0, "Reduced flashes removes animated hull fire");
for(const type of ["cannon","scatter","flak"]) {
  const ship=fresh(); ship.ship.tiles.clear(); ship.ship.tiles.set("0,0",api.makeTile("core",0,0,true));
  const receiver=api.makeTile(type,0,-1,false), ember=api.makeTile("ember",-1,-1,false);
  ship.ship.tiles.set("0,-1",receiver); ship.ship.tiles.set("-1,-1",ember); receiver.cooldown=ember.cooldown=999;
  api.drawShip(); assert.equal(api.ignitions.length,0);
  ship.fireAttack(ember,ship.gridToWorld(-1,-1),-1,0,ship.weaponDefinitions.ember,{x:-100,y:-42},1);
  const snapshot=()=>JSON.stringify({tiles:[...ship.ship.tiles.values()],projectiles:ship.projectiles,enemies:ship.enemies,matter:ship.matter,save:api.save});
  const before=snapshot(); api.drawShip();
  assert.equal(api.ignitions.length,type==="flak"?1:0,
    "Cannon and Scatter must not gain floating readiness dots; Flak retains its active-combo cue");
  assert.equal(snapshot(),before,"Drawing the combo cue must preserve combat and saves");
  ship.updateWeapons(.2); api.ignitions.length=0; api.drawShip(); assert.equal(api.ignitions.length,0);
  ember.emberActiveTime=.2; ship.detachTile("-1,-1",false); api.drawShip(); assert.equal(api.ignitions.length,0);
}
console.log(JSON.stringify({passed:true,checks:["Fire above artwork","Imported/fallback hull bounds","Zoom compensation","Expiry/death","Quality budgets","Reduced flashes","Scatter readiness dots suppressed","Flak real ignition only","Expiry and source loss","Rendering preserves combat and save"]}));
