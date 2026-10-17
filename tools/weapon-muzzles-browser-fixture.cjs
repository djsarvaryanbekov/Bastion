"use strict";
const fs=require("node:fs"),path=require("node:path");
const input=path.resolve(process.argv[2]||"outputs/Drift_Bastion_Playtest.html");
const output=path.resolve(process.argv[3]||"outputs/muzzle-qa/review.html");
let html=fs.readFileSync(input,"utf8");
const marker="    window.__driftBastion = {";
if(html.split(marker).length!==2)throw Error("Expected one runtime marker");
html=html.replace(marker,`
    (function(){
      var timer=0,hull=0,facing=-Math.PI/2,steps=0,births=[],flashBirths=[];
      var panel=document.createElement("section");
      panel.style.cssText="position:fixed;left:24px;bottom:24px;z-index:10000;width:670px;padding:14px;background:#101b28;border:1px solid #9ec3d0;border-radius:12px;color:#eef8ff;font:14px system-ui";
      panel.innerHTML='<div style="display:flex;flex-wrap:wrap;gap:8px"><select aria-label="Weapon" id="muzzleWeapon"></select><button id="muzzleIdle">Reset</button><button id="muzzleFire">Fire and hold</button><button id="muzzleStep">Advance frame</button><button id="muzzleHull">Turn hull</button><button id="muzzleAim">Turn aim</button><button id="muzzleRecord">Record demo</button></div><canvas id="muzzleDetail" width="640" height="420" style="width:640px;height:420px;display:block"></canvas><output id="muzzleState" role="status" style="display:block;overflow-wrap:anywhere">Start run to inspect the firing origins.</output>';
      document.body.appendChild(panel);
      var select=document.getElementById("muzzleWeapon"),output=document.getElementById("muzzleState");
      var detail=document.getElementById("muzzleDetail"),dc=detail.getContext("2d");
      output.style.cssText+=";height:96px;overflow:auto;font:11px monospace";
      ["cannon","scatter","missile","rail","cryo","mine","laser","arc","flak","ember"].forEach(function(type){var option=document.createElement("option");option.value=type;option.textContent=MODULES[type].name;select.appendChild(option);});
      function emitter(){return game&&game.ship.tiles.get("0,-1");}
      function preview(){
        if(!game||!emitter())return;
        dc.fillStyle="#101b28";dc.fillRect(0,0,640,420);
        var origin=game.gridToWorld(0,-1),previous=ctx;
        dc.save();dc.translate(320,205);dc.scale(3,3);dc.translate(-viewWidth/2-origin.x,-viewHeight/2-origin.y);
        try{ctx=dc;drawGravityFields();drawEnemies();drawProjectiles(false);drawShip();drawEffects();if(game.attackVfx)game.attackVfx.muzzles(dc,worldToScreen,save.settings.reducedFlash);drawProjectiles(true);}finally{ctx=previous;dc.restore();}
        dc.fillStyle="#9ec3d0";dc.font="15px system-ui";dc.fillText(MODULES[select.value].name+" — actual renderer, 3× detail",12,402);
      }
      function report(){
        if(!game||!emitter())return;
        output.textContent=JSON.stringify({build:playtestTelemetry.getDataForTests().gameBuild,weapon:select.value,viewport:[innerWidth,innerHeight],hull:hull,facing:facing,steps:steps,births:births,flashBirths:flashBirths,projectiles:game.projectiles.length,flashes:game.attackVfx?game.attackVfx.muzzleFlashes.length:0});
        preview();
      }
      function setup(){
        if(!game)return;clearInterval(timer);steps=0;births=[];flashBirths=[];
        game.state="paused";game.finished=false;game.elapsed=10;
        game.effects.length=0;game.particles.length=0;game.projectiles.length=0;game.enemies.length=0;game.enemyById.clear();game.enemyGrid.clear();game.ship.tiles.clear();
        game.ship.x=0;game.ship.y=0;game.ship.angle=hull;game.ship.vx=0;game.ship.vy=0;game.ship.angularVelocity=0;
        game.camera.x=0;game.camera.y=0;game.camera.zoom=1;game.camera.targetZoom=1;
        game.weaponFeedback=window.DriftWeaponFeedback.create();game.attackVfx=window.DriftAttackVfx.create();
        game.ship.tiles.set("0,0",makeTile("core",0,0,true));var tile=makeTile(select.value,0,-1,false);tile.cooldown=0;tile.aim=facing-hull;game.ship.tiles.set("0,-1",tile);
        game.weaponDefinitions[select.value]=runUpgrades.resolve(MODULES[select.value]);
        var origin=game.gridToWorld(0,-1),target=game.spawnEnemy("colossus",origin.x+Math.cos(facing)*120,origin.y+Math.sin(facing)*120);target.hp=target.maxHp=1e8;target.fireClock=9999;game.rebuildEnemyGrid();report();render(performance.now());
      }
      function fire(){
        setup();if(!game)return;game.updateWeapons(0);
        var tile=emitter(),origin=game.gridToWorld(0,-1),points=[];
        for(var port=0;port<window.DriftWeaponMuzzles.count(tile.type);port++)points.push(game.weaponMuzzle(tile,origin,Math.cos(facing),Math.sin(facing),port));
        births=game.projectiles.map(function(p){return {kind:p.kind,x:p.x,y:p.y,muzzleError:Math.min.apply(null,points.map(function(point){return Math.hypot(point.x-p.x,point.y-p.y);} ))};});
        flashBirths=game.attackVfx.muzzleFlashes.map(function(f){return {x:f.x,y:f.y};});report();render(performance.now());
      }
      function step(){if(!game)return;game.updateMovement(1/30);game.updateWeapons(1/30);game.updateProjectiles(1/30);game.updateEffects(1/30);steps++;report();render(performance.now());}
      select.onchange=setup;document.getElementById("muzzleIdle").onclick=setup;document.getElementById("muzzleFire").onclick=fire;document.getElementById("muzzleStep").onclick=step;
      document.getElementById("muzzleHull").onclick=function(){hull+=.7;fire();};document.getElementById("muzzleAim").onclick=function(){facing+=.65;fire();};
      document.getElementById("muzzleRecord").onclick=function(){
        setup();if(!game)return;var stream=detail.captureStream(30),recorder=new MediaRecorder(stream),chunks=[],buttons=panel.querySelectorAll("button,select");buttons.forEach(function(b){b.disabled=true;});
        recorder.ondataavailable=function(e){if(e.data.size)chunks.push(e.data);};
        recorder.onstop=function(){stream.getTracks().forEach(function(t){t.stop();});buttons.forEach(function(b){b.disabled=false;});var link=document.createElement("a");link.href=URL.createObjectURL(new Blob(chunks,{type:recorder.mimeType}));link.download="Drift_Bastion_Muzzle_"+select.value+".webm";link.textContent="Download muzzle demo";link.style.color="#a8e4ff";panel.appendChild(link);};
        recorder.start();timer=setInterval(function(){if(steps===0||steps===35||steps===70||steps===105)emitter().cooldown=0;step();if(steps>=125){clearInterval(timer);recorder.stop();}},1000/30);
      };
      setInterval(report,100);
    })();
`+marker);
const saveKey=html.match(/var SAVE_KEY = "([^"]+)"/);
if(!saveKey)throw Error("No save key");
const storage='<script>(function(){const values=new Map();const isolated={getItem(key){return values.has(String(key))?values.get(String(key)):null;},setItem(key,value){values.set(String(key),String(value));},removeItem(key){values.delete(String(key));},clear(){values.clear();},key(index){return Array.from(values.keys())[index]||null;},get length(){return values.size;}};Object.defineProperty(window,"localStorage",{value:isolated,configurable:true});localStorage.setItem('+JSON.stringify(saveKey[1])+',JSON.stringify({version:9,fragments:57,settings:{muted:true,reducedFlash:false},training:{completed:true}}));})();</script>';
html=html.replace("<head>","<head>\n"+storage);fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,html);console.log(output);
