"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const {createRequire}=require("node:module");
const sourcePath=process.argv[2]||"game.js";
let gameSource=fs.readFileSync(sourcePath,"utf8");
if(/\.html?$/i.test(sourcePath)){
  const scripts=Array.from(gameSource.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi),match=>match[1])
    .filter(script=>script.includes("function updateBuildPreview(")&&script.includes("window.__driftBastion"));
  assert.equal(scripts.length,1,"Expected one actual game runtime in standalone HTML");gameSource=scripts[0];
}
const harness=fs.readFileSync("tools/build-interaction-check.js","utf8"),stop=harness.indexOf('let game = fresh("shield");');
assert.ok(stop>0,"Build DOM harness marker missing");
const projectRequire=createRequire(path.resolve("tools/build-interaction-check.js"));
const facade={...fs,readFileSync(file,encoding){return file==="game.js"?gameSource:fs.readFileSync(file,encoding);}};
const context={console,setTimeout,clearTimeout,URLSearchParams,require(name){return name==="fs"||name==="node:fs"?facade:projectRequire(name);}};
vm.runInNewContext(harness.slice(0,stop)+"\nglobalThis.fixture={api,document,fresh,selectCatalog,cellAt};",context);
const fixture=context.fixture,api=fixture.api,document=fixture.document;
api.save.progression.purchasedModules.push("rail","cryo","missile");api.save.settings.muted=true;
const checks=[];
function check(name,run){try{run();checks.push({name,passed:true});}catch(error){checks.push({name,passed:false,error:error.message});}}
function scene(type,parts){
  const g=fixture.fresh(type);g.ship.tiles.clear();g.ship.tiles.set("0,0",api.makeTile("core",0,0,true,1,true));
  parts.forEach(([part,x,y])=>g.ship.tiles.set(`${x},${y}`,api.makeTile(part,x,y,false,1,true)));
  api.catalog();api.render();fixture.selectCatalog(type);return g;
}
function preview(g,x,y){
  const before=JSON.stringify({tiles:Array.from(g.ship.tiles),matter:g.matter,upgrades:g.upgrades,save:api.save});
  api.preview(x,y);const cell=Number.isInteger(x)&&Number.isInteger(y)?fixture.cellAt(x,y):null;
  assert.equal(JSON.stringify({tiles:Array.from(g.ship.tiles),matter:g.matter,upgrades:g.upgrades,save:api.save}),before,
    "Preview cannot install modules, spend Matter, or change saves");
  return {status:document.getElementById("buildPreviewStatus").textContent,
    hidden:document.getElementById("buildPreviewStatus").classList.contains("is-empty"),
    ghost:Boolean(cell&&cell.dataset.pcGhost==="1"),benefits:cell?cell.dataset.supportBenefits:null,
    aria:cell?cell.getAttribute("aria-label"):null};
}
function installed(g,key){api.interaction.selectedKey=key;api.render();return document.getElementById("buildModuleDetails").innerHTML;}
function linkedStatus(state){assert.match(state.status,/Shatter linked.*\+25%.*chilled\/frozen/i);assert.equal(state.hidden,false);}
function unlinkedStatus(state){assert.match(state.status,/Shatter unlinked.*edge-adjacent Cryo.*\+25%.*chilled\/frozen/i);assert.equal(state.hidden,false);}
function unlinkedDetails(text){assert.match(text,/Shatter unlinked.*place Cryo.*edge/i);}
function missileLinkedStatus(state){assert.match(state.status,/Cold payload linked.*25%.*1s/i);assert.equal(state.hidden,false);}
function missileUnlinkedStatus(state){assert.match(state.status,/Cold payload unlinked.*edge-adjacent Cryo.*25%.*1s/i);assert.equal(state.hidden,false);}

check("An affordable edge-adjacent Rail ghost visibly previews Shatter",()=>{
  const g=scene("rail",[["cryo",0,-1]]),state=preview(g,1,-1);
  assert.equal(state.ghost,true);assert.match(state.benefits,/cryo:1:false/);linkedStatus(state);
  assert.match(state.aria,/\+25% Rail damage to chilled\/frozen/);
  assert.equal(g.hasCryoNeighbor({type:"rail",x:1,y:-1}),false,"A ghost is not a registered combat emitter");
});
check("Diagonal and unlinked Rail ghosts show the required edge condition",()=>{
  const diagonal=scene("rail",[["cryo",0,-1]]),diagonalState=preview(diagonal,1,0);
  assert.equal(diagonalState.ghost,true);assert.doesNotMatch(diagonalState.benefits,/cryo:/);unlinkedStatus(diagonalState);
  const g=scene("rail",[]),state=preview(g,1,0);
  assert.equal(state.ghost,true);assert.doesNotMatch(state.benefits,/cryo:/);unlinkedStatus(state);
});
check("Two Cryos still preview one non-stacking receiver benefit",()=>{
  const g=scene("rail",[["cryo",0,-1],["cryo",1,0]]),state=preview(g,1,-1);
  linkedStatus(state);assert.match(state.benefits,/cryo:1:false/);assert.doesNotMatch(state.benefits,/cryo:2:/);
});
check("An affordable edge-adjacent Missile ghost previews its Cold payload",()=>{
  const g=scene("missile",[["cryo",0,-1]]),state=preview(g,1,-1);
  assert.equal(state.ghost,true);assert.match(state.benefits,/cryo:1:false/);missileLinkedStatus(state);
  assert.match(state.aria,/25%.*1s/i);
  assert.equal(g.hasCryoNeighbor({type:"missile",x:1,y:-1}),false,"A Missile ghost is not a registered combat emitter");
});
check("Diagonal and unlinked Missile ghosts explain the edge condition",()=>{
  const diagonal=scene("missile",[["cryo",0,-1]]),diagonalState=preview(diagonal,1,0);
  assert.equal(diagonalState.ghost,true);assert.doesNotMatch(diagonalState.benefits,/cryo:/);missileUnlinkedStatus(diagonalState);
  const g=scene("missile",[]),state=preview(g,1,0);
  assert.equal(state.ghost,true);assert.doesNotMatch(state.benefits,/cryo:/);missileUnlinkedStatus(state);
});
check("Extra Cryos do not stack the Missile payload preview",()=>{
  const g=scene("missile",[["cryo",0,-1],["cryo",1,0]]),state=preview(g,1,-1);
  missileLinkedStatus(state);assert.match(state.benefits,/cryo:1:false/);assert.doesNotMatch(state.benefits,/cryo:2:/);
});
check("Leaving hover removes ghost, badge and stale link status",()=>{
  const g=scene("rail",[["cryo",0,-1]]);linkedStatus(preview(g,1,-1));const cleared=preview(g);
  assert.equal(cleared.status,"");assert.equal(cleared.hidden,true);
  assert.notEqual(fixture.cellAt(1,-1).dataset.pcGhost,"1");assert.equal(fixture.cellAt(1,-1).dataset.supportBenefits,"");
});
check("Unlinked and diagonally linked installed Rails explain how to obtain Shatter",()=>{
  for(const cryos of [[],[["cryo",1,0]]]){
    const g=scene("rail",[["rail",0,-1],...cryos]);
    assert.equal(g.hasCryoNeighbor(g.ship.tiles.get("0,-1")),false);unlinkedDetails(installed(g,"0,-1"));
    assert.equal(preview(g,1,-1).ghost,false,"An installed selection cannot silently become a purchase ghost");
  }
});
check("Linked installed Rails show the real conditional bonus without stacking",()=>{
  const g=scene("rail",[["rail",0,-1],["cryo",1,-1],["cryo",-1,-1]]);
  assert.equal(g.hasCryoNeighbor(g.ship.tiles.get("0,-1")),true);
  const text=installed(g,"0,-1");assert.match(text,/Shatter.*\+25%.*chilled\/frozen/);
  assert.doesNotMatch(text,/Shatter unlinked|place Cryo/);
  assert.match(fixture.cellAt(0,-1).dataset.supportBenefits,/cryo:1:false/);
});
check("Existing Cryo placement preview counts only actual edge Rails",()=>{
  const g=scene("cryo",[["rail",0,-1],["rail",2,-1],["rail",2,0]]),state=preview(g,1,-1);
  assert.equal(state.ghost,true);assert.match(state.status,/Preview · Shatter · 2 Rails · \+25%/);
  assert.match(fixture.cellAt(0,-1).dataset.supportBenefits,/cryo:1:false:preview/);
  assert.match(fixture.cellAt(2,-1).dataset.supportBenefits,/cryo:1:false:preview/);
  assert.doesNotMatch(fixture.cellAt(2,0).dataset.supportBenefits,/cryo:/);
});
check("Cryo placement preview counts edge Rails and Missiles, excludes diagonals",()=>{
  const g=scene("cryo",[["rail",0,-1],["missile",2,-1],["missile",2,0]]),state=preview(g,1,-1);
  assert.equal(state.ghost,true);assert.match(state.status,/Preview .*Cryo links.*2/i);
  assert.match(fixture.cellAt(0,-1).dataset.supportBenefits,/cryo:1:false:preview/);
  assert.match(fixture.cellAt(2,-1).dataset.supportBenefits,/cryo:1:false:preview/);
  assert.doesNotMatch(fixture.cellAt(2,0).dataset.supportBenefits,/cryo:/);
});
check("Shield fallback returns after the Rail ghost leaves",()=>{
  const g=scene("rail",[["cryo",0,-1],["shield",1,0]]);linkedStatus(preview(g,1,-1));
  const state=preview(g);assert.match(state.status,/Shield coverage: 3 modules/);assert.equal(state.hidden,false);
  assert.doesNotMatch(state.status,/Shatter linked|Shatter unlinked/);
});
check("Unaffordable and invalid cells never advertise a prospective Rail link",()=>{
  const g=scene("rail",[["cryo",0,-1]]),price=api.price("rail");g.matter=price-1;api.render();
  const short=preview(g,1,-1);assert.equal(short.ghost,false);assert.doesNotMatch(short.benefits,/cryo:/);
  assert.doesNotMatch(short.status,/Shatter linked|Shatter unlinked/);
  g.matter=price;api.render();linkedStatus(preview(g,1,-1));
  const invalid=preview(g,3,3);assert.equal(invalid.ghost,false);assert.doesNotMatch(invalid.status,/Shatter linked|Shatter unlinked/);
});
check("Unaffordable and invalid Missile cells never advertise a prospective Cold payload",()=>{
  const g=scene("missile",[["cryo",0,-1]]),price=api.price("missile");g.matter=price-1;api.render();
  const short=preview(g,1,-1);assert.equal(short.ghost,false);assert.doesNotMatch(short.benefits,/cryo:/);
  assert.doesNotMatch(short.status,/Cold payload linked|Cold payload unlinked/);
  g.matter=price;api.render();missileLinkedStatus(preview(g,1,-1));
  const invalid=preview(g,3,3);assert.equal(invalid.ghost,false);assert.doesNotMatch(invalid.status,/Cold payload linked|Cold payload unlinked/);
});
const report={passed:checks.every(check=>check.passed),source:sourcePath,checks};
console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
