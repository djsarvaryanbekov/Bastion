'use strict';
const {assert,U,MODULES,game,enemy,tile}=require('./balance-fixture');
let configurations=0;
for(const type of ['cannon','scatter','missile','laser','rail','arc','cryo','flak','pulse','mine','ember','gravity']){
 const licenses=U.trees[type].branches.map(b=>type+':'+b.id);
 function walk(state){
  const g=game();g.ship.tiles.clear();const emitter=tile(g,type,0,0);emitter.cooldown=0;
  const def=U.resolve(MODULES[type],state);g.weaponDefinitions[type]=def;const target=enemy(g,110,0,100000);g.rebuildEnemyGrid();
  g.updateWeapons(0);
  assert.equal(emitter.cooldown,def.cooldown);
  for(let frame=0;frame<120;frame++){
   g.elapsed+=1/30;g.updateWeaponStatuses(1/30);g.rebuildEnemyGrid();g.updateProjectiles(1/30);
   // Advance pending bursts / sustained beam with a long reload to isolate one attack cycle.
   emitter.cooldown=100;g.updateWeapons(1/30);
  }
  assert.ok(target.hp<100000,type+' '+U.label(type,state)+' must cause actual combat damage');assert.ok(Number.isFinite(target.hp));assert.ok(g.projectiles.length<=900);assert.ok(g.gravityFields.length<=1);assert.ok(g.weaponAreas.length<=1);
  configurations++;
  for(const option of U.options(type,state,1,licenses))walk(U.nextState(type,state,option));
 }
 walk(undefined);
}
console.log(JSON.stringify({passed:true,actualFiringConfigurations:configurations,checks:['Every weapon base and reachable tree stage fires','Delayed bursts and sustained beams','Actual collision or area damage','Bounded persistent effects']}));
