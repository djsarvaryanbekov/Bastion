'use strict';
const assert=require('node:assert/strict');
const U=require('../run-upgrades'),P=require('../progression'),C=require('../campaign');
const fs=require('fs');
const source=fs.readFileSync('game.js','utf8');
const baseText=source.slice(source.indexOf('    var MODULES = ')+18,source.indexOf('\n    var WEAPON_TYPES'));
// The MODULES slice calls tr() for localized names; English identity is enough for balance math.
const defs=Function('tr','return '+baseText.replace(/;\s*$/,''))(text=>text);
const licenses=Object.entries(U.trees).flatMap(([type,tree])=>tree.branches.map(b=>type+':'+b.id));
let routes=0,states=0;
for(const [type,tree] of Object.entries(U.trees)){
 const walk=(state)=>{
  states++;const options=U.options(type,state,1,licenses);
  for(const option of options){
   const upgrades={[type]:state};const result=U.purchase(upgrades,type,option.id,1e9,1,option.rank,licenses);
   assert.ok(result);const next=upgrades[type];
   assert.equal(U.investment(type,next),U.investment(type,state)+option.unitCost);
   const before=U.resolve(defs[type],state),after=U.resolve(defs[type],next);
   for(const value of Object.values(after))if(typeof value==='number')assert.ok(Number.isFinite(value));
   for(const n of [1,2,10,37,100]){
    const opt=U.options(type,state,n,licenses).find(x=>x.id===option.id);assert.equal(opt.cost,n*option.unitCost);
    const beforeCost=Array.from({length:n},(_,i)=>Math.ceil(defs[type].baseCost*Math.pow(defs[type].scale,i))).reduce((a,b)=>a+b,0);
    assert.equal(beforeCost+n*U.investment(type,next),beforeCost+n*U.investment(type,state)+opt.cost);
   }
   assert.deepEqual(U.options(type,next,0,licenses),[]);
   walk(next);
  }
  if(!options.length)routes++;
 };
 walk(undefined);
}
let state={};for(const id of ['base1','base2'])assert.ok(U.purchase(state,'cannon',id,10000,1,undefined,[]));
assert.equal(U.purchase(state,'cannon','twin',1000,1,undefined,[]),null);
assert.ok(U.purchase(state,'cannon','twin',1000,1,undefined,['cannon:twin']));
assert.ok(U.purchase(state,'cannon','twin',1000,1,undefined,['cannon:twin']));
assert.equal(U.purchase(state,'cannon','focus',1000,1,undefined,['cannon:twin']),null);
assert.ok(U.purchase(state,'cannon','focus',1000,1,undefined,['cannon:twin','cannon:focus']));
assert.equal(U.investment('cannon',state.cannon),188);
assert.equal(U.resolve(defs.cannon,state.cannon).shots,4);
assert.ok(Math.abs(U.resolve(defs.cannon,state.cannon).damage/U.resolve(defs.cannon,state.cannon).cooldown*4-88.872)<1e-8);
assert.equal(P.definitions.reduce((sum,d)=>sum+d.cost,0),476);
assert.equal(P.status(P.normalize(null),'scatter').cost,8);
assert.equal(P.status(P.normalize(null),'scatter').available,true);
assert.equal(P.status(P.normalize(null),'drive').available,false);
for(const [killsByMinute,elapsed,expected] of [[[5000],59,10],[[10000],59,10],[[10000,500],61,11],[[0,10000],119,10],[[500],.5,1]]){
 const r=P.settleRunReward({killsByMinute,elapsed,bosses:0});assert.equal(r.sources.kills,expected);assert.ok(Math.abs(r.sources.time-elapsed/60)<1e-8);
}
assert.equal(P.settleRunReward({killsByMinute:[0],elapsed:180,bosses:1}).fragments,11);
assert.equal(P.settleRunReward({elapsed:0,bosses:0},600).carryUnits,600);
assert.equal(P.settleRunReward({elapsed:600,bosses:3,completed:true}).sources.bosses,36);
const saved=P.normalize({schemaVersion:4,purchasedModules:['scatter','drive'],branchLicenses:licenses});
assert.equal(saved.branchLicenses.length,licenses.length);assert.ok(saved.purchasedModules.includes('scatter'));assert.ok(!saved.purchasedModules.includes('drive'));
const core=C.normalize({purchasedCores:['striker'],selectedCore:'striker',coreRanks:{striker:{damage:25,modules:7},standard:{damage:2}}});
assert.equal(core.coreRanks.striker.damage,25);assert.equal(core.coreRanks.standard.damage,2);assert.equal(core.coreRanks.striker.modules,7);
console.log(JSON.stringify({passed:true,families:Object.keys(U.trees).length,routes,states,licenses:licenses.length}));
