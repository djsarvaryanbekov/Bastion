'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const harness=fs.readFileSync('.artifact_build/runtime-check.js','utf8');
const marker='let installPromptCalls';
const source=fs.readFileSync('game.js','utf8');
const patched=source.replace('    window.__driftBastion = {','    window.balanceTest = {Game,makeTile,save,MODULES,ENEMY_DEFS,metaCost,selectedCoreRanks};\n    window.__driftBastion = {');
const bootstrap={console,setTimeout,clearTimeout,URLSearchParams,process:{env:{BALANCE_SECONDS:'1'}},require(name){if(name==='fs')return {...fs,readFileSync(p,e){return p==='game.js'?patched:fs.readFileSync(p,e);}};return require(name);}};
vm.runInNewContext(harness.slice(0,harness.indexOf(marker))+'\nglobalThis.runtime=sandbox;',bootstrap);
const {Game,makeTile,save,MODULES,ENEMY_DEFS,metaCost}=bootstrap.runtime.balanceTest;
const U=require('../run-upgrades');
function game(){let g=new Game();g.enemies=[];g.enemyById.clear();g.enemyGrid.clear();g.projectiles=[];return g;}
function enemy(g,x=100,y=0,hp=10000){const e=g.spawnEnemy('scout',x,y);e.hp=e.maxHp=hp;return e;}
function upgrades(g,type,ids){const data={};const licenses=U.trees[type].branches.map(b=>type+':'+b.id);for(const id of ids)assert.ok(U.purchase(data,type,id,1e8,1,undefined,licenses));g.upgrades[type]=data[type];g.weaponDefinitions[type]=U.resolve(MODULES[type],data[type]);return g.weaponDefinitions[type];}
function tile(g,type,x,y){const t=makeTile(type,x,y,false,1,false);g.ship.tiles.set(x+','+y,t);g.applyFamilyTileStats(t,true);return t;}

module.exports={assert,Game,makeTile,save,MODULES,ENEMY_DEFS,metaCost,U,game,enemy,upgrades,tile,runtime:bootstrap.runtime};
