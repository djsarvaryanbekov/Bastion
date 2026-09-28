'use strict';
const assert=require('node:assert/strict'),P=require('../progression');
const fresh=P.normalize();assert.equal(fresh.schemaVersion,4);assert.deepEqual(fresh.branchLicenses,[]);assert.deepEqual(fresh.purchasedModules,[]);
for(const raw of [null,undefined,'bad',false,[],12])assert.deepEqual(P.normalize(raw),fresh);
assert.equal(P.definitions.length,16);
for(const type of ['cannon','armor'])assert.ok(P.isUnlocked(fresh,type));
for(const d of P.definitions){
 assert.ok(P.canPurchase(fresh,d.type));let p=P.normalize();
 for(const wallet of [-1,NaN,Infinity,d.cost-.1,'999']){const before=JSON.stringify(p);assert.equal(P.purchase(p,d.type,wallet),null);assert.equal(JSON.stringify(p),before);}
 assert.deepEqual(P.purchase(p,d.type,d.cost),{fragments:0,cost:d.cost,type:d.type});assert.ok(P.isUnlocked(p,d.type));assert.equal(P.purchase(p,d.type,9999),null);assert.deepEqual(P.normalize(p),p);
}
for(const type of ['drive','__proto__','constructor','bad'])assert.equal(P.purchase(fresh,type,9999),null);
const p=P.normalize();assert.deepEqual(P.apply(p,{kills:5,elapsed:70,bosses:1,upgrades:2}),[]);assert.equal(p.totalKills,5);assert.equal(p.bestTime,70);assert.equal(p.bossesDefeated,1);assert.equal(p.totalUpgrades,2);
P.apply(p,{elapsed:2,kills:-1});assert.equal(p.bestTime,70);assert.equal(p.totalKills,5);
const raw={schemaVersion:4,purchasedModules:['scatter','scatter','drive','bad'],branchLicenses:['cannon:twin','bad'],bestTime:Infinity};const before=JSON.stringify(raw),clean=P.normalize(raw);assert.equal(JSON.stringify(raw),before);assert.deepEqual(clean.purchasedModules,['scatter']);assert.deepEqual(clean.retiredModules,['drive']);assert.deepEqual(clean.branchLicenses,['cannon:twin']);assert.equal(clean.bestTime,0);
let carry=0,wallet=0;for(let i=0;i<20;i++){const r=P.settleRunReward({elapsed:30,killsByMinute:[15],bosses:0},carry);wallet+=r.fragments;carry=r.carryUnits;}assert.equal(wallet,10);assert.equal(carry,360000);
const capped=P.settleRunReward({elapsed:61,killsByMinute:[10000,1],bosses:1});assert.equal(capped.sources.kills,10.002);assert.equal(capped.sources.bosses,8);
assert.equal(P.settleRunReward({elapsed:60,killsByMinute:[0,500]},0).sources.kills,1,'A kill at exactly 60s belongs to minute 1');
assert.equal(P.settleRunReward({elapsed:59.999,killsByMinute:[0,500]},0).sources.kills,0);
for(const carry of [-1,600000,NaN,Infinity,.5])assert.equal(P.settleRunReward(null,carry).carryUnits,0);
for(const invalid of [null,{},[],{elapsed:Infinity,bosses:NaN,killsByMinute:[Infinity]}]){const r=P.settleRunReward(invalid);assert.ok(Number.isFinite(r.fragments));assert.ok(Number.isFinite(r.carryUnits));}
console.log('Progression checks passed: currency-only licenses, atomic purchases, legacy ownership, retired Drive archive, counters, minute boundaries, cap and fractional carry.');
