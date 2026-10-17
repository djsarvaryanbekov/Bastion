"use strict";
const fs=require("node:fs"),path=require("node:path");
const input=path.resolve(process.argv[2]||"outputs/Drift_Bastion_Playtest.html");
const output=path.resolve(process.argv[3]||"outputs/ember-qa/review.html");
if(input===output||path.basename(output)==="Drift_Bastion_Playtest.html")throw Error("Use a separate review HTML filename");
let html=fs.readFileSync(input,"utf8");
const marker="    window.__driftBastion = {";
if(html.split(marker).length!==2)throw Error("Expected one runtime marker");
html=html.replace(marker,`
    (function(){
      var timer=0,frame=0,profiles=[],results=null,inspecting=false;
      var panel=document.createElement("section"),fullStyle="position:fixed;inset:24px;z-index:10000;background:#101b28;border:1px solid #647e91;border-radius:12px;padding:20px;color:#edf5ff;font:16px system-ui;overflow:auto";
      panel.style.cssText=fullStyle;
      panel.innerHTML='<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><strong>Ember activation combo</strong><select id="comboWeapon" aria-label="Combo weapon"><option value="cannon">Auto Cannon</option><option value="scatter">Scatter Array</option><option value="flak">Flak Battery</option></select><button id="comboReplay">Replay comparison</button><button id="comboFlight">Show projectile</button><button id="comboDetach">Remove Ember after launch</button><button id="comboOrdinary">Fire after window</button><button id="comboChecks">Run checks</button><button id="comboRecord">Record comparison</button><button id="comboBuild">Inspect Build</button><button id="comboReturn">Show combat</button></div><p id="comboExplanation">Same adjacency and weapon. Ember fires left; the receiver fires right, so Ember cannot burn the receiver’s target directly.</p><canvas id="comboCanvas" width="1500" height="560" style="display:block;max-width:100%;height:auto"></canvas><output id="comboState" role="status" style="display:block;white-space:pre-wrap;font:12px monospace;height:110px;overflow:auto"></output>';
      document.body.appendChild(panel);
      var select=document.getElementById("comboWeapon"),detail=document.getElementById("comboCanvas"),dc=detail.getContext("2d"),state=document.getElementById("comboState");
      function setup(active){
        var g=new Game({training:true});g.training=false;g.state="paused";g.ship.tiles.clear();
        g.ship.tiles.set("0,0",makeTile("core",0,0,true));
        var weapon=makeTile(select.value,0,-1,false),ember=makeTile("ember",-1,-1,false);
        weapon.cooldown=0;ember.cooldown=active?0:999;g.ship.tiles.set("0,-1",weapon);g.ship.tiles.set("-1,-1",ember);
        var left=g.spawnEnemy("colossus",-180,-42),right=g.spawnEnemy("colossus",select.value==="cannon"?220:200,-42);
        left.hp=left.maxHp=right.hp=right.maxHp=10000;left.rotation=left.visualRotation=0;right.rotation=right.visualRotation=Math.PI;
        left.fireClock=right.fireClock=999;left.hitFlash=right.hitFlash=0;g.rebuildEnemyGrid();
        if(active)g.fireAttack(ember,g.gridToWorld(-1,-1),-1,0,g.weaponDefinitions.ember,left,1);
        var beforeShotBurn=right.burnTimer;
        g.fireAttack(weapon,g.gridToWorld(0,-1),1,0,g.weaponDefinitions[select.value],right,1);
        var births=g.projectiles.filter(function(p){return p.incendiary;}).length;
        var flak=g.effects.find(function(e){return e.weaponType==="flak";});
        weapon.cooldown=ember.cooldown=999;
        return {g:g,weapon:weapon,ember:ember,target:right,births:births,beforeShotBurn:beforeShotBurn,burningFlak:Boolean(flak&&flak.incendiary),detached:false};
      }
      function report(){
        state.textContent=JSON.stringify({build:window.PlaytestTelemetry.getDataForTests().gameBuild,viewport:[innerWidth,innerHeight],weapon:select.value,reducedFlash:save.settings.reducedFlash,frame:frame,profiles:profiles.map(function(p,i){return {case:i?"Ember fired":"Ember idle",active:p.g.hasActiveEmberNeighbor(p.weapon),detached:p.detached,targetBurnBeforeReceiver:p.beforeShotBurn,burningProjectileBirths:p.births,burningFlak:p.burningFlak,burnDps:p.target.burnDamage,burnRemaining:p.target.burnTimer,projectiles:p.g.projectiles.filter(function(shot){return shot.life>0;}).map(function(shot){return {kind:shot.kind,x:shot.x,y:shot.y,incendiary:shot.incendiary};})};}),checks:results});
      }
      function draw(){
        dc.fillStyle="#101b28";dc.fillRect(0,0,1500,560);dc.textAlign="center";
        var activeGame=game,previous=ctx;
        profiles.forEach(function(p,i){
          var cx=375+i*750,cy=300,g=p.g;
          dc.fillStyle=i?"#ff9366":"#9dc4d4";dc.font="bold 25px system-ui";dc.fillText(i?"EMBER FIRED":"EMBER IDLE",cx,40);
          dc.font="17px system-ui";dc.fillStyle="#acbecd";dc.fillText(i?"0.2s activation window":"Adjacency alone gives no bonus",cx,72);
          dc.save();dc.translate(cx-viewWidth/2,cy-viewHeight/2);dc.scale(1.25,1.25);dc.translate(viewWidth/2*(1/1.25-1),viewHeight/2*(1/1.25-1));
          game=g;ctx=dc;g.camera.x=g.camera.y=0;g.camera.zoom=1;
          try{drawEnemies();drawProjectiles(false);drawShip();drawEffects();if(g.attackVfx)g.attackVfx.muzzles(dc,worldToScreen,save.settings.reducedFlash);drawProjectiles(true);}finally{game=activeGame;ctx=previous;dc.restore();}
          dc.font="18px system-ui";dc.fillStyle=p.target.burnDamage?"#ff9366":"#acbecd";
          dc.fillText("Right target: "+p.target.burnDamage.toFixed(0)+" burn/s · "+p.target.burnTimer.toFixed(2)+"s remaining",cx,450);
          dc.fillStyle="#acbecd";dc.fillText(p.g.hasActiveEmberNeighbor(p.weapon)?"Combo active":"Combo inactive",cx,484);
        });report();
      }
      var advance=document.createElement("button");advance.textContent="Advance frame";advance.id="comboAdvance";panel.firstElementChild.appendChild(advance);advance.onclick=function(){clearInterval(timer);step();};
      var flashLabel=document.createElement("label"),flashToggle=document.createElement("input");flashToggle.type="checkbox";flashToggle.checked=save.settings.reducedFlash;flashLabel.appendChild(flashToggle);flashLabel.appendChild(document.createTextNode("Reduced flashes"));panel.firstElementChild.appendChild(flashLabel);flashToggle.onchange=function(){save.settings.reducedFlash=flashToggle.checked;draw();};
      function reset(){clearInterval(timer);frame=0;results=null;profiles=[setup(false),setup(true)];draw();}
      function tickProfile(p){p.g.updateWeapons(1/30);p.g.updateProjectiles(1/30);p.g.updateWeaponStatuses(1/30);p.g.updateEffects(1/30);p.g.backgroundPulse+=1/30;p.g.enemies.forEach(function(enemy){enemy.hitFlash=0;});}
      function step(){profiles.forEach(tickProfile);frame++;draw();}
      function fireRight(p){var count=p.g.projectiles.length;p.g.fireAttack(p.weapon,p.g.gridToWorld(0,-1),1,0,p.g.weaponDefinitions[select.value],p.target,1);return p.g.projectiles.slice(count);}
      function run(done){reset();timer=setInterval(function(){step();if(frame>=66){clearInterval(timer);if(done)done();}},1000/30);}
      function checks(){
        var before=JSON.stringify(save);reset();
        var atBirth=profiles.map(function(p){return select.value==="flak"?p.burningFlak:p.births>0;});
        var isolated=profiles.every(function(p){return p.beforeShotBurn===0;});
        for(var i=0;i<16;i++)step();
        var expired=profiles.every(function(p){return !p.g.hasActiveEmberNeighbor(p.weapon);});
        var burn=profiles.map(function(p){return p.target.burnDamage;});
        var normalAgain=profiles.every(function(p){var shots=fireRight(p);if(select.value!=="flak")return shots.length>0&&shots.every(function(shot){return !shot.incendiary;});return !p.g.effects.filter(function(e){return e.weaponType==="flak";}).slice(-1)[0].incendiary;});
        var detached=setup(true);detached.g.detachTile("-1,-1",false);var sourceGone=!detached.g.hasActiveEmberNeighbor(detached.weapon);
        for(var j=0;j<16;j++)tickProfile(detached);
        var retainedBurn=detached.target.burnDamage===3;
        var afterRemoval=fireRight(detached),ordinaryAfterRemoval=select.value==="flak"?!detached.g.effects.filter(function(e){return e.weaponType==="flak";}).slice(-1)[0].incendiary:afterRemoval.length>0&&afterRemoval.every(function(shot){return !shot.incendiary;});
        results={passed:!atBirth[0]&&atBirth[1]&&isolated&&expired&&burn[0]===0&&burn[1]===3&&normalAgain&&sourceGone&&retainedBurn&&ordinaryAfterRemoval&&before===JSON.stringify(save),atBirth:atBirth,noDirectEmberHit:isolated,expired:expired,burn:burn,normalAfterWindow:normalAgain,sourceRemoved:sourceGone,launchedShotRetainsBurn:retainedBurn,ordinaryAfterRemoval:ordinaryAfterRemoval,saveUnchanged:before===JSON.stringify(save)};draw();
      }
      select.onchange=reset;document.getElementById("comboReplay").onclick=function(){run();};document.getElementById("comboChecks").onclick=checks;
      document.getElementById("comboFlight").onclick=function(){reset();step();step();};
      document.getElementById("comboDetach").onclick=function(){reset();profiles[1].g.detachTile("-1,-1",false);profiles[1].detached=true;step();step();};
      document.getElementById("comboOrdinary").onclick=function(){reset();for(var i=0;i<7;i++)step();profiles.forEach(function(p){p.g.projectiles=[];fireRight(p);});step();step();};
      document.getElementById("comboRecord").onclick=function(){
        reset();var stream=detail.captureStream(30),recorder=new MediaRecorder(stream),chunks=[];
        recorder.ondataavailable=function(e){if(e.data.size)chunks.push(e.data);};
        recorder.onstop=function(){stream.getTracks().forEach(function(t){t.stop();});var a=document.createElement("a");a.href=URL.createObjectURL(new Blob(chunks,{type:recorder.mimeType}));a.download="Drift_Bastion_Ember_"+select.value+".webm";a.textContent="Download "+select.value+" combo recording";a.style.cssText="color:#ff9366;display:block";panel.appendChild(a);};
        recorder.start();run(function(){recorder.stop();});
      };
      document.getElementById("comboBuild").onclick=function(){
        clearInterval(timer);startRun();game=profiles[1].g;game.state="playing";game.matter=1000;selectedBuildModule="ember";openBuild();buildInteraction.selectedKey="-1,-1";renderBuildGrid();
        inspecting=true;detail.style.display="none";document.getElementById("comboExplanation").style.display="none";panel.style.cssText="position:fixed;left:24px;bottom:12px;z-index:10000;padding:10px;background:#101b28;color:#edf5ff;font:13px system-ui;border:1px solid #647e91";state.style.height="38px";
      };
      document.getElementById("comboReturn").onclick=function(){if(inspecting){game.state="paused";ui.buildOverlay.classList.add("hidden");inspecting=false;}detail.style.display="block";document.getElementById("comboExplanation").style.display="block";panel.style.cssText=fullStyle;state.style.height="110px";reset();};
      Promise.all([moduleArt.ready,enemyArt.ready,window.DriftFireVfx.ready]).then(reset);
    })();
`+marker);
const storage='<script>(function(){const values=new Map();Object.defineProperty(window,"localStorage",{value:{getItem(k){return values.has(String(k))?values.get(String(k)):null;},setItem(k,v){values.set(String(k),String(v));},removeItem(k){values.delete(String(k));},clear(){values.clear();},key(i){return Array.from(values.keys())[i]||null;},get length(){return values.size;}},configurable:true});localStorage.setItem("drift-bastion-save-v2",JSON.stringify({version:9,fragments:57,settings:{muted:true,autoPause:false,damageNumbers:false,uiScale:100},training:{completed:true},progression:{schemaVersion:4,purchasedModules:["cannon","armor","scatter","flak","ember"]}}));})();</script>';
html=html.replace("<head>","<head>\n"+storage);fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,html);console.log(output);
