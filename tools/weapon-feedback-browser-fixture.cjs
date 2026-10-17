"use strict";
const fs=require("node:fs"),path=require("node:path");
const input=path.resolve(process.argv[2]||"outputs/Drift_Bastion_Playtest.html");
const output=path.resolve(process.argv[3]||"outputs/weapon-feedback-qa/review.html");
let html=fs.readFileSync(input,"utf8");
const marker="    window.__driftBastion = {";
if(html.split(marker).length!==2)throw new Error("Expected one runtime marker");
html=html.replace(marker,`
    (function(){
      var timer=0,steps=0,lastShot=null,audioResult=null,heavy=false;
      var panel=document.createElement("section");
      panel.style.cssText="position:fixed;left:24px;bottom:24px;z-index:10000;width:550px;padding:14px;background:#101b28;border:1px solid #a2cbd8;border-radius:12px;color:#eef8ff;font:14px system-ui";
      panel.innerHTML='<div style="display:flex;flex-wrap:wrap;gap:8px"><button id="recoilSeed">Base weapons</button><button id="recoilHeavy">Heavy upgrades</button><button id="recoilHold">Fire and hold</button><button id="recoilRun">Play volley</button><button id="recoilRecord">Record demo</button><button id="recoilAudio">Check audio</button></div><canvas id="recoilDetail" width="520" height="230" style="width:520px;height:230px;display:block"></canvas><output id="recoilState" role="status" style="display:block;overflow-wrap:anywhere">Start Play, then choose base weapons or heavy upgrades.</output>';
      document.body.appendChild(panel);
      var output=document.getElementById("recoilState"),detail=document.getElementById("recoilDetail"),dc=detail.getContext("2d");
      function report(){
        if(!game)return;
        var kicks=[];
        game.ship.tiles.forEach(function(t){if(isWeaponType(t.type))kicks.push({type:t.type,pixels:+(window.DriftWeaponFeedback.offset(t)*TILE_SIZE).toFixed(3)});});
        output.textContent=JSON.stringify({build:playtestTelemetry.getDataForTests().gameBuild,mode:heavy?"heavy":"base",viewport:[innerWidth,innerHeight],frozen:game.state!=="playing",steps:steps,velocity:[+game.ship.vx.toFixed(4),+game.ship.vy.toFixed(4)],projectiles:game.projectiles.length,kicks:kicks,lastShot:lastShot,audio:audioResult});
        dc.fillStyle="#101b28";dc.fillRect(0,0,520,230);dc.fillStyle="#9ec3d0";dc.font="14px system-ui";
        [heavy?"rail":"cannon","missile","scatter"].forEach(function(type,i){
          var t=Array.from(game.ship.tiles.values()).find(function(t){return t.type===type;});if(!t)return;
          var x=85+i*170,y=155;
          moduleArt.drawBase(dc,type,x,y,112);drawModuleGlyph(t,x,y,dc,112);
          dc.fillText((heavy?["Rail Lance","Heavy missile","Double blast"]:["Auto Cannon","Base missile","Base Scatter"])[i],x-48,220);
        });
      }
      function setup(){
        if(!game)return;clearInterval(timer);steps=0;game.state="paused";game.finished=false;
        game.effects.length=0;game.particles.length=0;game.enemies.length=0;game.enemyById.clear();game.enemyGrid.clear();game.projectiles.length=0;game.ship.tiles.clear();
        game.ship.x=0;game.ship.y=0;game.ship.angle=0;game.ship.vx=0;game.ship.vy=0;game.ship.angularVelocity=0;
        game.camera.x=0;game.camera.y=0;game.camera.zoom=1;game.camera.targetZoom=1;
        game.updateSpawner=function(){};game.updateEnemies=function(){};
        game.weaponFeedback=window.DriftWeaponFeedback.create();
        [["core",0,0],["armor",-1,0],["armor",1,0],[heavy?"rail":"cannon",-1,-1],["missile",0,-1],["scatter",1,-1]].forEach(function(a){var t=makeTile(a[0],a[1],a[2],a[0]==="core");t.cooldown=0;game.ship.tiles.set(a[1]+","+a[2],t);});
        var routes={rail:["base1","base2","magazine"],missile:["base1","base2","heavy"],scatter:["base1","base2","cone","cone","double"]};
        ["cannon","rail","missile","scatter"].forEach(function(type){game.weaponDefinitions[type]=runUpgrades.resolve(MODULES[type]);});
        if(heavy)Object.keys(routes).forEach(function(type){var data={},licenses=runUpgrades.trees[type].branches.map(function(b){return type+":"+b.id;});routes[type].forEach(function(id){runUpgrades.purchase(data,type,id,1e8,1,undefined,licenses);});game.weaponDefinitions[type]=runUpgrades.resolve(MODULES[type],data[type]);});
        var e=game.spawnEnemy("brute",0,-220);e.hp=e.maxHp=1e8;game.rebuildEnemyGrid();
        game.boss=null;game.bossSpawned=false;game.elapsed=10;lastShot=null;report();render(performance.now());
      }
      function shoot(){setup();if(!game)return;game.updateWeapons(0);lastShot={velocity:[game.ship.vx,game.ship.vy],projectiles:game.projectiles.length};report();render(performance.now());}
      document.getElementById("recoilSeed").onclick=function(){heavy=false;setup();};
      document.getElementById("recoilHeavy").onclick=function(){heavy=true;setup();};
      document.getElementById("recoilHold").onclick=shoot;
      function step(){game.updateMovement(1/30);game.updateWeapons(1/30);game.updateProjectiles(1/30);game.updateEffects(1/30);steps++;report();render(performance.now());}
      document.getElementById("recoilRun").onclick=function(){shoot();if(!game)return;
        // Controlled steps keep the review independent of background-tab RAF throttling.
        timer=setInterval(function(){step();if(steps>=27)clearInterval(timer);},1000/30);
      };
      document.getElementById("recoilRecord").onclick=function(){
        setup();if(!game)return;
        var stream=detail.captureStream(30),recorder=new MediaRecorder(stream),chunks=[];
        var controls=panel.querySelectorAll("button");controls.forEach(function(b){b.disabled=true;});
        recorder.ondataavailable=function(event){if(event.data.size)chunks.push(event.data);};
        recorder.onstop=function(){
          stream.getTracks().forEach(function(track){track.stop();});controls.forEach(function(b){b.disabled=false;});
          var link=document.createElement("a");link.href=URL.createObjectURL(new Blob(chunks,{type:recorder.mimeType}));link.download="Drift_Bastion_Weapon_Kick.webm";link.textContent="Download demo";link.style.color="#a8e4ff";panel.appendChild(link);
        };
        recorder.start();
        timer=setInterval(function(){step();if(steps>=100){clearInterval(timer);recorder.stop();}},1000/30);
      };
      document.getElementById("recoilAudio").onclick=async function(){
        var results=[];
        for(var kind of ["rail","missile","scatter"]){
          var offline=new OfflineAudioContext(2,24000,48000),engine=window.DriftCombatAudio.create();
          engine.context=offline;engine.masterGain=offline.createGain();engine.masterGain.gain.value=.8;engine.masterGain.connect(offline.destination);
          if(kind==="rail")engine.tone(110,.16,.04,"square",470);
          if(kind==="missile")engine.tone(170,.08,.02,"triangle",45);
          if(kind==="scatter")engine.tone(150,.07,.025,"square",-45);
          engine.heavyShot(kind);var voices=engine.activeVoices;
          var buffer=await offline.startRendering(),samples=buffer.getChannelData(0),peak=0,power=0,tail=0;
          for(var i=0;i<samples.length;i++){var value=samples[i];peak=Math.max(peak,Math.abs(value));power+=value*value;if(i>22000)tail=Math.max(tail,Math.abs(value));}
          results.push({kind:kind,voices:voices,remaining:engine.activeVoices,peak:peak,rms:Math.sqrt(power/samples.length),tail:tail});
        }
        audioResult=results;report();
      };
      setInterval(report,80);
    })();
`+marker);
const saveKey=html.match(/var SAVE_KEY = "([^"]+)"/);
if(!saveKey)throw new Error("No save key");
const bootstrap='<script>(function(){const values=new Map();const isolated={getItem(key){return values.has(String(key))?values.get(String(key)):null;},setItem(key,value){values.set(String(key),String(value));},removeItem(key){values.delete(String(key));},clear(){values.clear();},key(index){return Array.from(values.keys())[index]||null;},get length(){return values.size;}};Object.defineProperty(window,"localStorage",{value:isolated,configurable:true});localStorage.setItem('+JSON.stringify(saveKey[1])+',JSON.stringify({version:9,fragments:57,settings:{muted:true,reducedFlash:false},training:{completed:true}}));})();</script>';
html=html.replace("<head>","<head>\n"+bootstrap);
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,html);console.log(output);
