'use strict';
const {assert,U,MODULES,runtime}=require('./balance-fixture');
const view=runtime.DriftUpgradeTreeView;
const before=JSON.stringify({MODULES,trees:U.trees});let count=0;
for(const [type,tree] of Object.entries(U.trees))for(const branch of tree.branches){const steps=view.branchSteps(U,type,branch,MODULES[type]);assert.equal(steps.length,branch.steps.length);steps.forEach((step,i)=>{assert.equal(step.cost,branch.steps[i].cost);assert.ok(step.description.length>0);assert.ok(!step.description.includes('undefined'));assert.ok(!step.description.includes('NaN'));});count++;}
const twin=view.branchSteps(U,'cannon',U.trees.cannon.branches.find(b=>b.id==='twin'),MODULES.cannon);
assert.match(twin[0].description,/Damage: 13.8 → 10.35/);
const route=view.routeSteps(U,'cannon',{level:5,path:['twin','focus']});assert.equal(route.length,5);assert.equal(route[4].name,'Focused volley 1');
assert.equal(JSON.stringify({MODULES,trees:U.trees}),before);console.log('PASS: '+count+' branch descriptions, exact Cannon values, paid route order, no model mutation');
