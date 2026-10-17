"use strict";
const fs=require("node:fs"),path=require("node:path");
if(!process.argv[2]||!process.argv[3])throw Error("Usage: node tools/module-collision-review.cjs <candidate.html> <review.html>");
const input=path.resolve(process.argv[2]),output=path.resolve(process.argv[3]);
if(input===output||path.basename(output)==="Drift_Bastion_Playtest.html")throw Error("Use a separate review HTML filename");
let html=fs.readFileSync(input,"utf8");
const marker="    window.__driftBastion = {";
if(html.split(marker).length!==2)throw Error("Expected one runtime marker");
const storage=`<script>(function(){var values=new Map();Object.defineProperty(window,"localStorage",{configurable:true,value:{
getItem:function(k){return values.has(String(k))?values.get(String(k)):null;},setItem:function(k,v){values.set(String(k),String(v));},
removeItem:function(k){values.delete(String(k));},clear:function(){values.clear();},key:function(i){return Array.from(values.keys())[i]||null;},get length(){return values.size;}}});
localStorage.setItem("drift-bastion-save-v2",JSON.stringify({version:9,settings:{muted:true,autoPause:false,damageNumbers:false,qualityTier:0,uiScale:100},training:{completed:true}}));})();</script>`;

function installCollisionReview(){
  var panel=document.createElement("section"),results=null;
  panel.setAttribute("aria-label","Module collision review controls");
  panel.style.cssText="position:fixed;left:32px;right:32px;bottom:24px;z-index:10000;background:#101b28;padding:12px;color:#dae5e9;font:14px system-ui;display:flex;flex-wrap:wrap;gap:8px;align-items:center";
  panel.innerHTML='<label>Scenario <select id="collisionScenario" aria-label="Collision scenario">'+
    '<option value="fast">Fast blocker</option><option value="corner">Square corner</option><option value="hole">Open hole</option>'+
    '<option value="sniper">Two-tile sniper</option><option value="armor">Armor stops sniper</option>'+
    '<option value="placement">Placement overlap</option><option value="mercy">Hit mercy</option><option value="shield">Shield mercy</option></select></label>'+
    '<button id="collisionReset">Reset scene</button><button id="collisionFire">Fire</button><button id="collisionStep">Advance 0.033s</button>'+
    '<button id="collisionRun">Run scenario</button><button id="collisionAfter">Fire after grace</button><button id="collisionAll">Run all checks</button>'+
    '<label>Rotation <select id="collisionAngle"><option value="0">0°</option><option value=".7853981633974483">45°</option><option value="1.5707963267948966">90°</option></select></label>'+
    '<label><input id="collisionReduced" type="checkbox">Reduced flashes</label><output id="collisionReadout"></output>';
  document.body.appendChild(panel);
  function control(id){return document.getElementById(id);}
  function selected(){return control("collisionScenario").value;}
  function near(a,b){return Math.abs(a-b)<1e-7;}
  function snapshot(){return {scenario:selected(),viewport:[innerWidth,innerHeight],elapsed:game.elapsed,
    rotation:game.ship.angle,projectiles:game.projectiles.map(function(p){return {kind:p.kind,x:p.x,y:p.y,life:p.life};}),
    tiles:Array.from(game.ship.tiles.entries()).map(function(entry){var t=entry[1];return {key:entry[0],type:t.type,hp:t.hp,maxHp:t.maxHp,
      shield:t.shield,maxShield:t.maxShield,shieldDelay:t.shieldDelay,repairDelay:t.repairDelay,
      placementRemaining:Math.max(0,t.placementProtectedUntil-game.elapsed),hitRemaining:Math.max(0,t.projectileHitProtectedUntil-game.elapsed)};})};}
  function draw(){
    game.state="paused";render(performance.now());
    var state=snapshot();panel.dataset.snapshot=JSON.stringify({state:state,checks:results});
    control("collisionReadout").textContent=innerWidth+"×"+innerHeight+" · t="+game.elapsed.toFixed(3)+" · "+
      state.tiles.map(function(t){return t.type+" "+t.hp.toFixed(1)+(t.maxShield?" shield "+t.shield.toFixed(1):"");}).join(" · ")+
      (results?" · checks "+(results.passed?"PASS":"FAIL"):"");
  }
  function add(type,x,y){var tile=makeTile(type,x,y,type==="core",1,true);tile.cooldown=999;game.ship.tiles.set(keyOf(x,y),tile);return tile;}
  function resetScene(id){
    results=null;
    if(!rangeSession)startRange("cannon");else rangeSetModule("cannon");
    game.state="paused";game.elapsed=10;game.backgroundPulse=0;game.matter=1000;
    game.enemies=[];game.enemyById.clear();game.enemyGrid.clear();game.effects=[];game.particles=[];game.projectiles=[];
    game.gravityFields=[];game.weaponAreas=[];
    game.ship.tiles.clear();game.ship.x=game.ship.y=game.ship.vx=game.ship.vy=0;
    game.ship.angle=Number(control("collisionAngle").value);
    game.camera.x=game.camera.y=game.camera.shakeX=game.camera.shakeY=0;game.camera.zoom=1;
    game.ambientSpawnClock=game.assaultClock=game.nextBossAt=999;
    save.settings.muted=true;save.settings.damageNumbers=false;save.settings.autoPause=false;
    save.settings.reducedFlash=control("collisionReduced").checked;
    add("core",0,0);
    if(id==="fast"||id==="armor")add("armor",0,-1);
    if(id==="sniper"){add("cannon",0,-1);add("cannon",0,-2);}
    if(id==="mercy"||id==="shield")add("cannon",0,-1);
    if(id==="shield")add("shield",1,0);
    if(id==="hole"){add("cannon",1,0);add("armor",0,1);}
    if(id==="placement"){
      game.state="building";selectedBuildModule="cannon";buildInteraction.selectedKey=null;
      if(!placePurchasedModule(1,0))throw Error("Actual placement failed");
      game.ship.tiles.get("1,0").cooldown=999;add("shield",0,1);game.state="paused";
    }
    draw();
  }
  function world(x,y){var cos=Math.cos(game.ship.angle),sin=Math.sin(game.ship.angle);return {x:x*cos-y*sin,y:x*sin+y*cos};}
  function fire(){
    var id=selected(),x=id==="corner"?20:id==="hole"||id==="placement"?42:0;
    var y=id==="placement"?0:id==="hole"?28:-150,point=world(x,y);
    var velocity=world(0,id==="placement"?0:9000),count=id==="mercy"||id==="shield"?2:1;
    for(var i=0;i<count;i++)game.spawnProjectile(false,id==="sniper"||id==="armor"?"sniperShot":"bolterShot",
      point.x,point.y,velocity.x,velocity.y,id==="sniper"||id==="armor"?24:12,3,5,"#ff637c");
    draw();
  }
  function advance(seconds){
    for(var remaining=seconds;remaining>1e-8;){var dt=Math.min(1/60,remaining);
      game.elapsed+=dt;game.backgroundPulse+=dt;game.updateShields(dt);game.updateSupportModules(dt);
      game.updateProjectiles(dt);game.updateEffects(dt);remaining-=dt;
    }draw();
  }
  function evaluate(id){
    var core=game.ship.tiles.get("0,0"),front=game.ship.tiles.get("0,-1"),shield=game.ship.tiles.get("1,0");
    if(id==="fast")return near(front.hp,front.maxHp-12)&&near(core.hp,core.maxHp)&&game.projectiles.length===0;
    if(id==="corner")return near(core.hp,core.maxHp-12)&&game.projectiles.length===0;
    if(id==="hole")return Array.from(game.ship.tiles.values()).every(function(t){return t.hp===t.maxHp;})&&game.projectiles.length===1;
    if(id==="sniper"){var outer=game.ship.tiles.get("0,-2");return near(outer.hp,outer.maxHp-24)&&near(front.hp,front.maxHp-15.6)&&near(core.hp,core.maxHp)&&game.projectiles.length===0;}
    if(id==="armor")return near(front.hp,front.maxHp-24)&&near(core.hp,core.maxHp)&&game.projectiles.length===0;
    if(id==="placement"){var placed=game.ship.tiles.get("1,0"),field=game.ship.tiles.get("0,1");return near(placed.hp,placed.maxHp)&&near(field.shield,field.maxShield)&&near(core.hp,core.maxHp)&&game.projectiles.length===0&&placed.projectileHitProtectedUntil===0;}
    if(id==="mercy")return near(front.hp,front.maxHp-12)&&near(core.hp,core.maxHp)&&game.projectiles.length===0;
    return near(front.hp,front.maxHp)&&near(shield.shield,shield.maxShield-12)&&near(core.hp,core.maxHp)&&game.projectiles.length===0;
  }
  function run(){
    var id=selected();resetScene(id);fire();
    var pausePreserved=true;
    if(id==="placement"){
      game.update(30);pausePreserved=game.elapsed===10&&game.projectiles.length===1;
      game.state="playing";game.update(1/30);game.state="paused";
    }else advance(1/30);
    results={passed:evaluate(id)&&pausePreserved,scenario:id,pausePreserved:pausePreserved};draw();return results.passed;
  }
  control("collisionScenario").onchange=function(){resetScene(selected());};
  control("collisionAngle").onchange=function(){resetScene(selected());};
  control("collisionReset").onclick=function(){resetScene(selected());};
  control("collisionFire").onclick=fire;
  control("collisionStep").onclick=function(){advance(1/30);};
  control("collisionRun").onclick=run;
  control("collisionAfter").onclick=function(){advance(.4);fire();advance(1/30);};
  control("collisionReduced").onchange=function(){save.settings.reducedFlash=this.checked;draw();};
  control("collisionAll").onclick=function(){
    var cases=[];
    ["fast","corner","hole","sniper","armor","placement","mercy","shield"].forEach(function(id){control("collisionScenario").value=id;cases.push({scenario:id,passed:run()});});
    results={passed:cases.every(function(result){return result.passed;}),cases:cases};draw();
  };
  Promise.all([moduleArt.ready,enemyArt.ready]).then(function(){resetScene(selected());});
}
html=html.replace("<head>","<head>"+storage);
html=html.replace(marker,"    ("+installCollisionReview.toString()+")();\n"+marker);
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,html);console.log(output);
