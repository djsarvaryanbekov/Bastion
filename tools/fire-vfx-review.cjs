"use strict";
const fs = require("node:fs"), path = require("node:path");
const input = path.resolve(process.argv[2]);
const output = path.resolve(process.argv[3]);
let html = fs.readFileSync(input,"utf8");
const marker = "    window.__driftBastion = {";
if (html.split(marker).length !== 2) throw Error("Expected one runtime marker");
const shim = `<script>(function(){var values=new Map();Object.defineProperty(window,"localStorage",{value:{getItem:function(k){return values.has(k)?values.get(k):null;},setItem:function(k,v){values.set(k,String(v));},removeItem:function(k){values.delete(k);}},configurable:true});localStorage.setItem("drift-bastion-save-v2",JSON.stringify({version:9,settings:{muted:true,autoPause:false},training:{completed:true}}));})();</script>`;
html = html.replace("<head>","<head>"+shim);
html = html.replace(marker, `
    (function(){
      var panel=document.createElement("section");
      panel.style.cssText="position:fixed;left:32px;bottom:50px;z-index:10000;display:flex;gap:8px;align-items:center;flex-wrap:wrap;max-width:calc(100vw - 64px);background:#101b28;padding:12px;color:#dae5e9;font:14px system-ui";
      panel.innerHTML='<button id="fireJet">Ember burst</button><button id="fireHull">Burning hulls</button><button id="fireCrowd">Crowd</button><button id="fireScatter">Ignited Scatter</button><button id="fireFlak">Ignited Flak</button><button id="fireStep">Next frame</button><button id="fireLive">Live range</button><label><input type="checkbox" id="fireReduced">Reduced flashes</label><label>Quality <select id="fireQuality"><option value="0">High</option><option value="1">Medium</option><option value="2">Low</option></select></label><label>Camera <select id="fireZoom"><option value="1">100%</option><option value=".55">55%</option><option value=".35">35%</option></select></label><label>Burst age <select id="fireAge"><option value=".025">25ms</option><option value=".07" selected>70ms</option><option value=".13">130ms</option><option value=".18">180ms</option></select></label><output id="fireReadout"></output>';
      document.body.appendChild(panel);
      var readout=document.getElementById("fireReadout");
      function report(){
        readout.textContent=innerWidth+"×"+innerHeight+" · "+game.enemies.filter(function(e){return e.burnTimer>0&&!e.dead;}).length+" burning · "+(save.settings.reducedFlash?"Reduced":"Full")+" · "+window.PlaytestTelemetry.getDataForTests().gameBuild;
      }
      function scene(crowd,type){
        type=type||"ember";
        if(!rangeSession)startRange(type);else rangeSetModule(type);
        game.state="paused";game.enemies=[];game.enemyById.clear();game.enemyGrid.clear();game.effects=[];game.particles=[];
        game.backgroundPulse=.8;game.camera.x=game.camera.y=0;game.camera.zoom=Number(document.getElementById("fireZoom").value);
        game.ship.tiles.forEach(function(tile){tile.cooldown=999;});
        var points=crowd?[]:[[-55,-158,"hunter"],[5,-176,"brute"],[65,-158,"hunter"],[280,35,"colossus"],[-300,25,"colossus"]];
        if(crowd)for(var r=0;r<8;r++)for(var c=0;c<10;c++)points.push([(c-4.5)*100,(r-3.5)*75-120,(r+c)%3?"hunter":"brute"]);
        points.forEach(function(p){var e=game.spawnEnemy(p[2],p[0],p[1]);e.hp=e.maxHp=10000;e.rotation=e.visualRotation=Math.PI/2;e.hitFlash=0;e.fireClock=999;});
        game.rebuildEnemyGrid();
      }
      function burst(){
        scene(false);var tile=game.ship.tiles.get("0,-1"),origin=game.gridToWorld(0,-1);
        game.fireAttack(tile,origin,0,-1,game.weaponDefinitions.ember,game.enemies[1],1);
        game.updateEffects(Number(document.getElementById("fireAge").value));game.enemies.forEach(function(e){e.hitFlash=0;});game.effects=game.effects.filter(function(e){return e.type==="flameCone";});
        render(performance.now());report();
      }
      function hull(crowd){
        scene(crowd);game.enemies.forEach(function(e){e.burnTimer=2.5;e.burnDamage=6;});render(performance.now());report();
      }
      function combo(type){
        scene(false,type);
        var ember=makeTile("ember",-1,-1,false);game.ship.tiles.set("-1,-1",ember);
        game.fireAttack(ember,game.gridToWorld(-1,-1),-1,0,game.weaponDefinitions.ember,game.enemies[4],1);
        game.fireAttack(game.ship.tiles.get("0,-1"),game.gridToWorld(0,-1),0,-1,game.weaponDefinitions[type],game.enemies[1],1);
        game.updateProjectiles(.025);game.updateEffects(.025);game.effects=game.effects.filter(function(e){return e.type!=="flameCone";});
        game.enemies.forEach(function(e){e.hitFlash=0;});render(performance.now());report();
      }
      document.getElementById("fireJet").onclick=burst;
      document.getElementById("fireAge").onchange=burst;
      document.getElementById("fireHull").onclick=function(){hull(false);};
      document.getElementById("fireCrowd").onclick=function(){hull(true);};
      document.getElementById("fireScatter").onclick=function(){combo("scatter");};
      document.getElementById("fireFlak").onclick=function(){combo("flak");};
      document.getElementById("fireStep").onclick=function(){game.state="paused";game.backgroundPulse+=1/30;game.updateProjectiles(1/30);game.updateEffects(1/30);game.updateWeaponStatuses(1/30);render(performance.now());report();};
      document.getElementById("fireReduced").onchange=function(){save.settings.reducedFlash=this.checked;render(performance.now());report();};
      document.getElementById("fireQuality").onchange=function(){save.settings.qualityTier=Number(this.value);render(performance.now());report();};
      document.getElementById("fireZoom").onchange=function(){game.camera.zoom=Number(this.value);render(performance.now());report();};
      document.getElementById("fireLive").onclick=function(){window.DriftPCGame.rangeScenario("enemy");game.state="playing";report();};
      Promise.all([moduleArt.ready,enemyArt.ready,window.DriftFireVfx.ready]).then(burst);
    })();
`+marker);
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,html);console.log(output);
