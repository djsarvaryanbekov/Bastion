'use strict';
const assert=require('node:assert/strict'),P=require('../progression'),V=require('../progression-view');
const p=P.normalize(),defs={flak:{name:'Flak Battery'},collector:{name:'Matter Siphon'}};
const model=(wallet,state=p,types=[])=>V.buildResultModel(P,state,wallet,types,defs);
assert.equal(model(0).availableCount,12);assert.equal(model(0).goal.max,20);assert.equal(model(19).affordableCount,0);assert.equal(model(20).affordableCount,1);assert.equal(model(24).affordableCount,3);
assert.deepEqual(model(24).offers.map(o=>o.type),['flak','collector','repair']);assert.equal(model(1000).offers.length,3);
assert.equal(model(2.5).goal.text,'Flak Battery · 17.5 more Fragments (20 total)');
P.purchase(p,'flak',20);assert.equal(model(0).goal.type,'collector');assert.equal(model(24).offers[0].type,'collector');
const all=P.normalize({schemaVersion:4,purchasedModules:P.definitions.map(d=>d.type)});assert.deepEqual(model(1000,all),{availableCount:0,affordableCount:0,offers:[],availableNewTypes:[],goal:null});
for(const invalid of [-1,NaN,Infinity,{},[],null]){assert.equal(model(invalid).affordableCount,0);assert.ok(!/NaN|Infinity/.test(model(invalid).goal.text));}
const before=JSON.stringify(p);const detached=model(1000);detached.offers[0].cost=999;assert.equal(JSON.stringify(p),before);assert.equal(model(1000).offers[0].cost,24);
for(const stat of ['HP','damage','movement','Matter']){assert.equal(V.buildMetaComparison(0,25,1,stat).text,'+0% → +1% '+stat);assert.equal(V.buildMetaComparison(24,25,1,stat).nextPercent,25);assert.equal(V.buildMetaComparison(25,25,1,stat).maxed,true);}
console.log('Progression view passed: affordable result offers, all 12 licenses available, savings goals, detached results, invalid input and 25-rank comparisons.');
