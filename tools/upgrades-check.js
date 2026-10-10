'use strict';
const assert=require('node:assert/strict'),U=require('../run-upgrades');
for(const type of ['bad','__proto__','constructor',null]){assert.deepEqual(U.options(type,null,1,[]),[]);assert.equal(U.purchase({},type,'base1',999,1),null);}
for(const count of [0,-1,1.5,NaN,Infinity,'4',null,{},[],true,421]){assert.deepEqual(U.options('cannon',null,count,[]),[]);assert.equal(U.purchase({},'cannon','base1',999,count),null);}
for(const state of [{level:-1},{level:6},{level:NaN},{level:3,path:[]},{level:3,path:['fan']},{level:5,path:['twin','impact']}]){assert.deepEqual(U.options('cannon',state,1,[]),[]);assert.equal(U.investment('cannon',state),0);}
for(const wallet of [-1,NaN,Infinity,7,'999'])assert.equal(U.purchase({},'cannon','base1',wallet,1),null);
const family={};assert.ok(U.purchase(family,'cannon','base1',8,1,0));const before=JSON.stringify(family);assert.equal(U.purchase(family,'cannon','base1',999,1,0),null);assert.equal(JSON.stringify(family),before);assert.equal(U.purchase(family,'cannon','base2',17,1,1),null);assert.equal(JSON.stringify(family),before);assert.ok(U.purchase(family,'cannon','base2',18,1,1));
assert.ok(U.options('cannon',family.cannon,1,[]).every(o=>o.locked));assert.equal(U.purchase(family,'cannon','twin',999,1,2,[]),null);assert.ok(U.purchase(family,'cannon','twin',36,1,2,['cannon:twin']));assert.equal(U.purchase(family,'cannon','pierce',999,1,3,['cannon:pierce']),null);
assert.equal(U.purchase(Object.freeze({}),'cannon','base1',999,1),null);assert.equal(U.purchase(Object.freeze({cannon:undefined}),'cannon','base1',999,1),null);
const base=Object.freeze({id:'cannon',damage:12,cooldown:.5,hp:50});const stats=U.resolve(base,family.cannon);stats.damage=999;assert.equal(base.damage,12);assert.equal(U.resolve(base,family.cannon).damage,12*1.15*.75);
console.log('Upgrade guards passed: malformed paths/types/counts, atomic rejected purchases, stale clicks, branch exclusivity, required licenses and immutable base stats.');
