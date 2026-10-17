"use strict";
const fs = require("node:fs");
const path = require("node:path");
const input = path.resolve(process.argv[2] || "outputs/Drift_Bastion_Playtest.html");
const output = path.resolve(process.argv[3] || "outputs/ship-debris-qa/review.html");
const marker = "    window.__driftBastion = {";
let html = fs.readFileSync(input,"utf8");
if (html.split(marker).length !== 2) throw new Error("Expected one runtime exposure marker");
html = html.replace(marker, `
    (function () {
      var freezeTimer = 0;
      var panel = document.createElement("div");
      panel.id = "breakawayReview";
      panel.style.cssText = "position:fixed;left:24px;bottom:24px;z-index:10000;display:flex;align-items:center;gap:10px;padding:12px;background:#111c28;border:1px solid #e7be67;border-radius:10px;color:#f4efdf;font:14px system-ui";
      panel.innerHTML = '<button id="reviewSeed">Reset test ship</button><button id="reviewBreak">Break connection</button><button id="reviewMotion">Resume effects</button><button id="reviewFlash" aria-pressed="false">Reduced flashes</button><output id="reviewState" role="status">Start Play, then reset the test ship.</output>';
      document.body.appendChild(panel);
      document.getElementById("reviewFlash").setAttribute("aria-pressed",String(save.settings.reducedFlash));
      var output = document.getElementById("reviewState");
      function state() {
        if (!game) return;
        var chunks = game.effects.filter(function (effect) { return effect.type === "shipChunk"; });
        var cached = chunks.filter(function (effect) { return effect.chunk && effect.chunk.texture; }).length;
        output.textContent = JSON.stringify({tiles:game.ship.tiles.size,lost:game.modulesLost,
          chunks:chunks.length,sizes:chunks.map(function(effect){return effect.chunk.tiles.length;}),
          cached:cached,matter:game.matter,fragments:save.fragments,frozen:game.state!=="playing",
          reducedFlash:save.settings.reducedFlash});
      }
      document.getElementById("reviewSeed").onclick = function () {
        if (!game) return;
        clearTimeout(freezeTimer);
        game.state="paused"; game.effects.length=0; game.particles.length=0;
        game.enemies.length=0; game.enemyById.clear(); game.rebuildEnemyGrid();
        game.projectiles.length=0; game.ship.tiles.clear();
        game.ship.x=0;game.ship.y=0;game.ship.angle=-.25;
        game.ship.vx=0;game.ship.vy=0;game.ship.angularVelocity=0;
        game.camera.x=0;game.camera.y=0;game.camera.zoom=1;
        game.matter=345;game.modulesLost=0;game.elapsed=10;
        game.updateSpawner=function(){};
        var mainTypes=["armor","cannon","shield","scatter","repair"];
        for(var y=-2;y<=2;y++)for(var x=-2;x<=0;x++){
          var type=x===0&&y===0?"core":mainTypes[(x+y+10)%mainTypes.length];
          var tile=makeTile(type,x,y,type==="core");tile.aim=-Math.PI/2;
          game.ship.tiles.set(x+","+y,tile);
        }
        game.ship.tiles.set("1,0",makeTile("armor",1,0,false));
        var branchTypes=["rail","armor","cannon","shield","scatter","repair","missile","armor","laser"];
        var index=0;
        for(var by=-1;by<=1;by++)for(var bx=2;bx<=4;bx++){
          var branch=makeTile(branchTypes[index++],bx,by,false);branch.aim=-.75;
          game.ship.tiles.set(bx+","+by,branch);
        }
        game.boss=null;game.bossSpawned=false;game.finished=false;
        state();render(performance.now());
      };
      document.getElementById("reviewBreak").onclick=function(){
        if(!game||!game.ship.tiles.has("1,0"))return;
        clearTimeout(freezeTimer);game.state="playing";
        game.ship.vx=110;game.ship.vy=-15;game.ship.angularVelocity=.18;
        game.destroyTile("1,0");state();
        freezeTimer=setTimeout(function(){game.state="paused";state();},1400);
      };
      document.getElementById("reviewMotion").onclick=function(){
        if(!game)return;clearTimeout(freezeTimer);game.state=game.state==="playing"?"paused":"playing";state();
      };
      document.getElementById("reviewFlash").onclick=function(){
        save.settings.reducedFlash=!save.settings.reducedFlash;
        this.setAttribute("aria-pressed",String(save.settings.reducedFlash));state();
      };
      setInterval(state,100);
    })();
` + marker);
const saveKey = html.match(/var SAVE_KEY = "([^"]+)"/);
if (!saveKey) throw new Error("Save key not found in supplied standalone HTML");
const bootstrap = '<script>(function(){const values=new Map();const isolated={getItem(key){return values.has(String(key))?values.get(String(key)):null;},setItem(key,value){values.set(String(key),String(value));},removeItem(key){values.delete(String(key));},clear(){values.clear();},key(index){return Array.from(values.keys())[index]||null;},get length(){return values.size;}};Object.defineProperty(window,"localStorage",{value:isolated,configurable:true});localStorage.setItem('+JSON.stringify(saveKey[1])+',JSON.stringify({version:9,fragments:57,settings:{muted:true,reducedFlash:false},training:{completed:true}}));})();</script>';
html=html.replace("<head>","<head>\n"+bootstrap);
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,html);
console.log(output);
