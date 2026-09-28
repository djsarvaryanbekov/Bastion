'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const harness=fs.readFileSync('.artifact_build/runtime-check.js','utf8');
const source=fs.readFileSync('game.js','utf8').replace('    window.__driftBastion = {','    window.upgradeUITest = { Game, buyRunUpgrade, use: value => { game=value; } };\n    window.__driftBastion = {');
const bootstrap={console,setTimeout,clearTimeout,URLSearchParams,process:{env:{BALANCE_SECONDS:'1'}},require(name){if(name==='fs')return {...fs,readFileSync(p,e){return p==='game.js'?source:fs.readFileSync(p,e);}};return require(name);}};
vm.runInNewContext(harness.slice(0,harness.indexOf('let installPromptCalls'))+'\nglobalThis.runtime=sandbox;',bootstrap);
const api=bootstrap.runtime.upgradeUITest;const g=new api.Game();api.use(g);g.state='building';g.matter=100;const gun=[...g.ship.tiles.values()].find(t=>t.type==='cannon');assert(gun);gun.flash=0;assert(api.buyRunUpgrade('cannon','base1',0));assert.equal(gun.flash,0);assert.equal(gun.upgradeFlash,.65);assert.equal(g.matter,92);g.applyDamageToTile('0,-1',1);assert(gun.flash>0);console.log('PASS: upgrade cyan timer, damage red timer, exact charge');
