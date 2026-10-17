"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const debris = require("../ship-debris.js");

const tiles = new Map([
  ["1,0", {x:1,y:0}], ["2,0", {x:2,y:0}],
  ["2,1", {x:2,y:1}], ["3,2", {x:3,y:2}]
]);
assert.deepEqual(debris.components(tiles, [...tiles.keys()]).map(group => group.length), [3,1],
  "Diagonal contact must not join disconnected components");
assert.equal(tiles.size, 4, "Grouping is read-only");

const harness = fs.readFileSync(".artifact_build/runtime-check.js", "utf8");
const marker = "let installPromptCalls";
function loadApi(source) {
  const exposure = "    window.__driftBastion = {";
  assert.ok(source.includes(exposure) && harness.includes(marker));
  const instrumented = source.replace(exposure,
    "    window.__shipDebrisTest = {Game:Game, makeTile:makeTile, save:save, telemetry:playtestTelemetry, debris:shipDebris};\n" + exposure);
  // Older baselines have no shipDebris binding.
  const compatible = instrumented.replace("debris:shipDebris", "debris:window.DriftShipDebris");
  const bootstrap = { console, URLSearchParams, setTimeout, clearTimeout,
    process: {env:{BALANCE_SECONDS:"1"}}, require(name) {
      if (name === "fs") return {...fs, readFileSync(file, encoding) {
        return file === "game.js" ? compatible : fs.readFileSync(file, encoding);
      }};
      return require(name);
    }};
  vm.runInNewContext(harness.slice(0, harness.indexOf(marker)) + "\nglobalThis.runtime=sandbox;", bootstrap);
  return bootstrap.runtime.__shipDebrisTest;
}

function sever(api) {
  const game = new api.Game();
  game.effects.length = 0; game.particles.length = 0;
  game.ship.angle = .6; game.ship.vx = 130; game.ship.vy = -40; game.ship.angularVelocity = .5;
  game.matter = 1234; api.save.fragments = 57;
  game.upgrades.cannon = {level:1,path:[],branch:null};
  const lost = [];
  assert.ok(api.telemetry);
  api.telemetry.recordModuleLost = (type, branch) => lost.push([type,branch]);
  const placed = [[1,0,"armor"],[2,0,"cannon"],[3,0,"armor"],[3,-1,"laser"],
    [1,1,"shield"],[1,2,"repair"],[-1,0,"armor"]];
  const original = [];
  for (const [x,y,type] of placed) {
    const tile = api.makeTile(type,x,y,false);
    tile.aim = -.8;
    original.push({tile,position:game.gridToWorld(x,y)});
    game.ship.tiles.set(x+","+y,tile);
  }
  game.destroyTile("1,0");
  const outcome = {tiles:[...game.ship.tiles.keys()].sort(),modulesLost:game.modulesLost,
    matter:game.matter,fragments:api.save.fragments,upgrades:JSON.parse(JSON.stringify(game.upgrades)),lost};
  return {game,outcome,original};
}

const source = fs.readFileSync("game.js","utf8");
const api = loadApi(source);
const result = sever(api);
const {game} = result;
assert.equal(result.outcome.modulesLost,6);
assert.equal(result.outcome.matter,1234);
assert.equal(result.outcome.fragments,57);
assert.equal(result.outcome.lost.filter(entry=>entry[1]).length,5);
assert.deepEqual(result.outcome.tiles,["-1,0","0,-1","0,0"]);
const chunks = game.effects.filter(effect=>effect.type === "shipChunk");
assert.deepEqual(Array.from(chunks,effect=>effect.chunk.tiles.length).sort(),[2,3]);
assert.equal(game.effects.filter(effect=>effect.type === "debris").length,1,
  "Only the destroyed connector keeps the individual debris effect");
for (const effect of chunks) {
  assert.equal(effect.maxLife,3);
  for (const tile of effect.chunk.tiles) {
    const x = effect.x + tile.x*Math.cos(effect.rotation) - tile.y*Math.sin(effect.rotation);
    const y = effect.y + tile.x*Math.sin(effect.rotation) + tile.y*Math.cos(effect.rotation);
    assert.ok(result.original.some(entry=>entry.tile.type===tile.type &&
      Math.hypot(entry.position.x-x,entry.position.y-y)<1e-8), "Release must preserve every module's world position");
    assert.equal(tile.aim,-.8,"Turret aim is captured with the hull");
  }
}
result.original.forEach(entry=>{entry.tile.aim=1;});
assert.ok(chunks.every(effect=>effect.chunk.tiles.every(tile=>tile.aim===-.8)),"Wreckage must not retain mutable tile references");
const start = {x:chunks[0].x,y:chunks[0].y,rotation:chunks[0].rotation};
game.updateEffects(.25);
assert.ok(Math.hypot(chunks[0].x-start.x,chunks[0].y-start.y)>10,"Chunk inherits actual ship motion");
assert.notEqual(chunks[0].rotation,start.rotation);

const calls=[];
const art={drawBase(context,type){calls.push("base:"+type);return true;},
  drawEquipment(context,type){calls.push("equipment:"+type);return true;}};
const drawing=new Proxy({}, {get(target,key){return key in target ? target[key] : ()=>{};},
  set(target,key,value){target[key]=value;return true;}});
api.debris.draw(drawing,chunks[0],0,0,art,false);
const count=chunks[0].chunk.tiles.length;
assert.ok(calls.slice(0,count).every(call=>call.startsWith("base:")));
assert.ok(calls.slice(count).every(call=>call.startsWith("equipment:")));
const texture=chunks[0].chunk.texture;
assert.ok(texture.width<=512 && texture.height<=512,"Cached texture size is bounded");
api.debris.draw(drawing,chunks[0],0,0,art,true);
assert.equal(calls.length,count*2,"Subsequent frames reuse one cached image");
game.updateEffects(3.1);
assert.equal(game.effects.length,0);
assert.equal(texture.width,1,"Expired texture storage is released before pooling");
assert.ok(game.effectPool.every(effect=>!effect.chunk));
assert.equal(game.spawnEffect("ring",0,0,1,"#fff").chunk,null,"Pooled effects cannot retain old chunks");

const truncated=sever(api).game;
const first=truncated.effects.find(effect=>effect.type==="shipChunk");
api.debris.draw(drawing,first,0,0,art,false);
const droppedTexture=first.chunk.texture;
truncated.effects=[first];
for(let i=0;i<140;i++)truncated.spawnEffect("ring",0,0,1,"#fff");
truncated.updateEffects(.01);
assert.equal(truncated.effects.length,140);
assert.equal(first.chunk,null,"Effect-budget eviction also releases chunk storage");
assert.equal(droppedTexture.width,1);

const capped=sever(api).game;
capped.effects=Array.from({length:8},()=>({type:"shipChunk"}));
assert.equal(api.debris.spawn(capped,["0,-1","0,0"],{x:1,y:0},40,{},0).size,0,"Active chunk count is bounded");

for(const [quality,maxSide,maxChunks] of [[0,512,8],[1,384,5],[2,256,3]]){
  const longTiles=new Map(Array.from({length:400},(_,x)=>[x+",0",{type:"armor",x,y:0,mass:1,aim:0}]));
  const fixture={ship:{tiles:longTiles,x:0,y:0,vx:50,vy:0,angle:0,angularVelocity:0},effects:[],
    gridToWorld(x,y){return {x:x*40,y:y*40};},spawnEffect(type,x,y,life,color){
      const effect={type,x,y,life,maxLife:life,color};this.effects.push(effect);return effect;
    }};
  assert.equal(api.debris.spawn(fixture,[...longTiles.keys()],{x:-1,y:0},40,{},quality).size,400);
  api.debris.draw(drawing,fixture.effects[0],0,0,null,true);
  const image=fixture.effects[0].chunk.texture;
  assert.ok(image.width<=maxSide&&image.height<=maxSide,"Extreme branch textures respect every quality budget");
  api.debris.release(fixture.effects[0]);
  fixture.effects=Array.from({length:maxChunks},()=>({type:"shipChunk"}));
  assert.equal(api.debris.spawn(fixture,[...longTiles.keys()],{x:-1,y:0},40,{},quality).size,0);
}

if(process.env.DEBRIS_BASELINE){
  const baseline=sever(loadApi(fs.readFileSync(process.env.DEBRIS_BASELINE,"utf8")));
  assert.deepEqual(result.outcome,baseline.outcome,"Gameplay removal, telemetry, upgrades and both currencies must match the baseline");
}
console.log(JSON.stringify({passed:true,chunkSizes:[2,3],lifetime:3,checks:["Cardinal components","Release positions and aim","Inherited motion","One cached image per chunk","Platform/equipment order","Expiry and eviction release","Pool reuse","Effect budgets","Module losses and economy"]}));
