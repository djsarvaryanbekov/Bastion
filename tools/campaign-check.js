'use strict';
const assert=require('node:assert/strict'),C=require('../campaign');
const fresh=C.normalize();for(const raw of [null,undefined,'bad',false,[],12])assert.deepEqual(C.normalize(raw),fresh);
assert.deepEqual(C.cores.map(c=>c.cost),[0,64,80,96]);
for(const core of C.cores){assert.ok(C.isCoreAvailable(fresh,core.id));assert.throws(()=>{core.cost=999;});}
for(const core of C.cores.slice(1)){
 const state=C.normalize();for(const wallet of [NaN,Infinity,-1,core.cost-.1,'999']){const before=JSON.stringify(state);assert.equal(C.purchaseCore(state,core.id,wallet),null);assert.equal(JSON.stringify(state),before);}
 assert.deepEqual(C.purchaseCore(state,core.id,core.cost),{fragments:0,cost:core.cost});assert.equal(C.purchaseCore(state,core.id,9999),null);state.selectedCore=core.id;state.coreRanks[core.id].damage=25;assert.deepEqual(C.normalize(state),state);assert.equal(state.coreRanks.standard.damage,0);
}
for(const id of ['bad','__proto__','constructor',null]){assert.equal(C.getCore(id),null);assert.equal(C.purchaseCore(fresh,id,999),null);}
const malformed=C.normalize({purchasedCores:['striker','striker','bad'],selectedCore:'salvager',coreRanks:{standard:{damage:Infinity,modules:999,matter:-1,drive:'5'}}});assert.deepEqual(malformed.purchasedCores,['striker']);assert.equal(malformed.selectedCore,'standard');assert.deepEqual(malformed.coreRanks.standard,{modules:25,damage:0,drive:5,matter:0});
const archived={completed:['sector1-1','sector1-1','bad'],mastered:['sector1-1'],purchasedCores:['striker'],selectedCore:'striker'};const before=JSON.stringify(archived);const migrated=C.normalize(archived);assert.equal(JSON.stringify(archived),before);assert.deepEqual(migrated.completed,['sector1-1']);assert.ok(C.isCoreOwned(migrated,'striker'));
assert.deepEqual(C.cores.map(c=>[c.moduleHpMultiplier,c.speedMultiplier,c.cooldownMultiplier,c.matterMultiplier]),[[1,1,1,1],[.75,1,.85,1],[1.35,.85,1,1],[1,1,1.1,1.2]]);
console.log('Core checks passed: unchanged identities, currency-only unlocks, independent capped ranks, atomic spending, detached migration and archived history.');
