'use strict';
const assert=require('node:assert/strict'),P=require('../progression'),V=require('../progression-view');
const p=P.normalize(),defs={scatter:{name:'Scatter Array'},shield:{name:'Shield Node'}};
const model=(wallet,state=p,types=[])=>V.buildResultModel(P,state,wallet,types,defs);
assert.equal(model(0).availableCount,16);assert.equal(model(0).goal.max,8);assert.equal(model(7).affordableCount,0);assert.equal(model(8).affordableCount,1);assert.equal(model(16).affordableCount,2);
assert.deepEqual(model(20).offers.map(o=>o.type),['scatter','shield','flak']);assert.equal(model(1000).offers.length,3);
assert.equal(model(2.5).goal.text,'Scatter Array · 5.5 more Fragments (8 total)');
P.purchase(p,'scatter',8);assert.equal(model(0).goal.type,'shield');assert.equal(model(16).offers[0].type,'shield');
const all=P.normalize({schemaVersion:4,purchasedModules:P.definitions.map(d=>d.type)});assert.deepEqual(model(1000,all),{availableCount:0,affordableCount:0,offers:[],availableNewTypes:[],goal:null});
for(const invalid of [-1,NaN,Infinity,{},[],null]){assert.equal(model(invalid).affordableCount,0);assert.ok(!/NaN|Infinity/.test(model(invalid).goal.text));}
const before=JSON.stringify(p);const detached=model(1000);detached.offers[0].cost=999;assert.equal(JSON.stringify(p),before);assert.equal(model(1000).offers[0].cost,16);
for(const stat of ['HP','damage','movement','Matter']){assert.equal(V.buildMetaComparison(0,25,1,stat).text,'+0% → +1% '+stat);assert.equal(V.buildMetaComparison(24,25,1,stat).nextPercent,25);assert.equal(V.buildMetaComparison(25,25,1,stat).maxed,true);}
console.log('Progression view passed: affordable result offers, all 16 licenses available, savings goals, detached results, invalid input and 25-rank comparisons.');
