"use strict";

const fs = require("node:fs");
const path = require("node:path");

if (!process.argv[2] || !process.argv[3]) {
  throw new Error("Usage: node tools/cryo-combo-review.cjs <standalone.html> <review.html>");
}
const input = path.resolve(process.argv[2]), output = path.resolve(process.argv[3]);
if (input === output || path.basename(output) === "Drift_Bastion_Playtest.html") {
  throw new Error("Use a separate review filename");
}
let html = fs.readFileSync(input, "utf8");
const marker = "    window.__driftBastion = {";
if (html.split(marker).length !== 2) throw new Error("Expected exactly one game runtime marker");
const storage = `<script>(function(){
  var values=new Map();
  Object.defineProperty(window,"localStorage",{configurable:true,value:{
    getItem:function(key){return values.has(String(key))?values.get(String(key)):null;},
    setItem:function(key,value){values.set(String(key),String(value));},
    removeItem:function(key){values.delete(String(key));},clear:function(){values.clear();},
    key:function(index){return Array.from(values.keys())[index]||null;},
    get length(){return values.size;}
  }});
  localStorage.setItem("drift-bastion-save-v2",JSON.stringify({version:9,
    settings:{muted:true,autoPause:false,damageNumbers:false,qualityTier:0,uiScale:100},
    training:{completed:true}}));
})();</script>`;

function installCryoComboReview() {
  var STEP = 1 / 120, playing = false, mode = "clean", targets = [], result = null;
  var panel = document.createElement("section");
  panel.setAttribute("aria-label", "Cryo combo review controls");
  panel.style.cssText = "position:fixed;left:24px;right:24px;bottom:16px;z-index:10000;display:flex;gap:7px;align-items:center;flex-wrap:wrap;background:#101b28;padding:11px;color:#dae5e9;font:14px system-ui;border:1px solid #3b6670";
  panel.innerHTML = '<button id="comboClean">Clean Rail</button><button id="comboCold">Real Cryo → Rail</button>' +
    '<button id="comboFrozen">Four-hit Freeze → Rail</button><button id="comboDiagonal">Diagonal Cryo → Rail</button>' +
    '<button id="comboMixed">Mixed piercing</button><button id="comboBoss">Boss chill → Rail</button>' +
    '<button id="comboLost">Source lost in flight</button><button id="comboBuild">Build layout</button>' +
    '<button id="comboPricing">Pricing before upgrade</button><button id="comboPriceUpgraded">Pricing after upgrade</button>' +
    '<button id="comboCombat">Combat view</button><button id="comboPlay">Play</button><button id="comboStep">Advance 0.1s</button>' +
    '<label><input id="comboReduced" type="checkbox">Reduced flashes</label>' +
    '<label>Quality <select id="comboQuality"><option value="0">High</option><option value="1">Medium</option><option value="2">Low</option></select></label>' +
    '<label>Camera <select id="comboZoom"><option value="1">100%</option><option value=".55">55%</option><option value=".35">35%</option></select></label>' +
    '<output id="comboReadout" style="flex-basis:100%;line-height:1.5"></output>';
  document.body.appendChild(panel);
  function control(id) { return document.getElementById(id); }
  function cold(enemy) {
    return enemy.slowTimer > 0 && enemy.slowFactor < 1 ||
      enemy.type !== "boss" && game.elapsed < (enemy.freezeUntil || 0);
  }
  function report() {
    var rail = game.ship.tiles.get("0,-1");
    control("comboReadout").textContent = innerWidth + "×" + innerHeight + " · " + mode +
      " · edge link " + (rail && game.hasCryoNeighbor(rail) ? "ON" : "OFF") +
      (result ? " · " + result.damage.map(function (value) { return value.toFixed(2); }).join(" / ") +
        " damage · launch shatter " + (result.shatter ? "ON" : "OFF") : "") +
      " · " + game.effects.filter(function (effect) { return effect.type === "cryoShatter"; }).length + " shatter cues";
    panel.dataset.snapshot = JSON.stringify({width:innerWidth,height:innerHeight,mode:mode,time:game.elapsed,
      playing:playing,link:Boolean(rail && game.hasCryoNeighbor(rail)),quality:save.settings.qualityTier,
      reducedFlash:save.settings.reducedFlash,zoom:game.camera.zoom,result:result,
      tiles:Array.from(game.ship.tiles.values()).map(function (tile) { return {type:tile.type,x:tile.x,y:tile.y}; }),
      projectiles:game.projectiles.map(function (shot) { return {kind:shot.kind,damage:shot.damage,shatter:shot.shatter,x:shot.x,y:shot.y}; }),
      effects:game.effects.filter(function (effect) { return effect.type === "cryoShatter"; }).map(function (effect) {
        return {type:effect.type,x:effect.x,y:effect.y,life:effect.life,maxLife:effect.maxLife,radius:effect.radius};
      }),
      enemies:targets.map(function (enemy) { return {id:enemy.id,type:enemy.type,hp:enemy.hp,x:enemy.x,y:enemy.y,
        cold:cold(enemy),slowFactor:enemy.slowFactor,slowTimer:enemy.slowTimer,
        frozen:enemy.type!=="boss"&&game.elapsed<(enemy.freezeUntil||0),freezeRemaining:Math.max(0,(enemy.freezeUntil||0)-game.elapsed)}; })});
  }
  function draw() { if (game.state !== "building") game.state = "paused"; render(performance.now()); report(); }
  function setPlaying(value) { playing=value;control("comboPlay").textContent=value?"Pause":"Play"; }
  function add(type,x,y) {
    var tile=makeTile(type,x,y,type==="core",1,true);
    tile.cooldown=999;game.ship.tiles.set(keyOf(x,y),tile);game.applyFamilyTileStats(tile,true);
    return tile;
  }
  function addTarget(type,x,status) {
    var enemy;
    if (type === "boss") { game.spawnBoss();enemy=game.boss;enemy.x=x;enemy.y=-42; }
    else enemy=game.spawnEnemy(type,x,-42);
    enemy.hp=enemy.maxHp=10000;enemy.speed=enemy.damage=enemy.vx=enemy.vy=0;
    enemy.fireClock=999;enemy.attackCharge=enemy.attackChargeMax=enemy.chargeTimer=0;
    enemy.rotation=enemy.visualRotation=Math.PI;
    enemy.slowFactor=status==="cold"?(type==="boss"?.8:.5):1;
    enemy.slowTimer=status==="cold"?2:0;
    enemy.freezeUntil=status==="frozen"?game.elapsed+.6:0;
    enemy.freezeImmuneUntil=status==="frozen"?game.elapsed+3.6:0;
    targets.push(enemy);return enemy;
  }
  function scene(nextMode) {
    setPlaying(false);mode=nextMode;result=null;
    if (!rangeSession) startRange("rail"); else rangeSetModule("rail");
    ui.buildOverlay.classList.add("hidden");ui.pauseOverlay.classList.add("hidden");
    game.state="paused";game.elapsed=1;game.backgroundPulse=1;
    game.enemies=[];game.enemyById.clear();game.enemyGrid.clear();
    game.projectiles=[];game.effects=[];game.particles=[];game.gravityFields=[];game.weaponAreas=[];
    game.ship.x=game.ship.y=game.ship.angle=game.ship.vx=game.ship.vy=0;
    game.camera.x=game.camera.y=game.camera.shakeX=game.camera.shakeY=0;
    game.camera.zoom=Number(control("comboZoom").value);
    game.ship.tiles.forEach(function (tile) { tile.cooldown=999; });
    add("cryo",-1,nextMode==="diagonal"?-2:-1);
    save.settings.muted=true;save.settings.autoPause=false;save.settings.damageNumbers=false;
    save.settings.reducedFlash=control("comboReduced").checked;
    save.settings.qualityTier=Number(control("comboQuality").value);
    game.separationClock=999;targets=[];
    if (nextMode === "mixed") {
      addTarget("colossus",170,"cold");addTarget("colossus",340,"clean");addTarget("colossus",510,"frozen");
    } else addTarget(nextMode==="boss"?"boss":"colossus",280,"clean");
    game.rebuildEnemyGrid();ui.toast.classList.remove("show");draw();
  }
  function tick(dt) {
    game.elapsed+=dt;game.backgroundPulse=game.elapsed;
    var positions=targets.map(function (enemy) { enemy.vx=enemy.vy=0;return {x:enemy.x,y:enemy.y}; });
    game.updateEnemies(dt);
    targets.forEach(function (enemy,index) {
      enemy.x=positions[index].x;enemy.y=positions[index].y;enemy.vx=enemy.vy=0;
      enemy.rotation=enemy.visualRotation=Math.PI;
    });
    game.rebuildEnemyGrid();game.updateProjectiles(dt);game.updateWeaponStatuses(dt);game.updateEffects(dt);
    targets.forEach(function (enemy) { enemy.hitFlash=0; });
  }
  function advance(seconds) {
    for(var remaining=seconds;remaining>1e-8;) { var dt=Math.min(STEP,remaining);tick(dt);remaining-=dt; }
    draw();
  }
  function launch(tile,enemy) {
    var origin=game.gridToWorld(tile.x,tile.y),dx=enemy.x-origin.x,dy=enemy.y-origin.y,length=Math.hypot(dx,dy);
    game.fireAttack(tile,origin,dx/length,dy/length,game.weaponDefinitions[tile.type],enemy,1);
    return game.projectiles[game.projectiles.length-1];
  }
  function cryoHit(freeze) {
    if (freeze) {
      var data={},licenses=runUpgrades.trees.cryo.branches.map(function (branch) { return "cryo:"+branch.id; });
      ["base1","base2","deep","deep","freeze"].forEach(function (id) {
        if (!runUpgrades.purchase(data,"cryo",id,1e8,1,undefined,licenses)) throw new Error("Cryo upgrade fixture failed");
      });
      game.upgrades.cryo=data.cryo;game.weaponDefinitions.cryo=runUpgrades.resolve(MODULES.cryo,data.cryo);
    }
    var tile=Array.from(game.ship.tiles.values()).find(function (tile) { return tile.type==="cryo"; });
    for(var shot=0;shot<(freeze?4:1);shot+=1) {
      launch(tile,targets[0]);
      for(var frame=0;game.projectiles.length&&frame<240;frame+=1) tick(STEP);
    }
  }
  function railHit(removeSource) {
    var before=targets.map(function (enemy) { return enemy.hp; });
    var shot=launch(game.ship.tiles.get("0,-1"),targets[0]);
    if (removeSource) game.detachTile("-1,-1",false);
    for(var frame=0;frame<240;frame+=1) {
      tick(STEP);
      if (targets.every(function (enemy,index) { return enemy.hp<before[index]; })) break;
    }
    result={damage:targets.map(function (enemy,index) { return before[index]-enemy.hp; }),
      baseDamage:shot.damage,shatter:shot.shatter,kind:shot.kind};
    draw();
  }
  function paidBuild(type) {
    game.testRange=false;game.training=false;game.matter=10000;
    save.progression.purchasedModules=Object.keys(MODULES);
    selectedBuildModule=type;game.state="playing";openBuild();
  }
  function pricing(upgraded) {
    scene(upgraded?"paid pricing after upgrade":"paid pricing before upgrade");
    game.ship.tiles.clear();add("core",0,0);
    [[0,-1],[1,0],[-1,0],[0,1]].forEach(function (point) {add("cannon",point[0],point[1]);});
    game.purchasedCounts.cannon=4;paidBuild("cannon");
    if (upgraded && !buyRunUpgrade("cannon","base1")) throw new Error("Paid Cannon upgrade fixture failed");
    buildInteraction.selectedKey=null;renderBuildGrid();report();
  }
  control("comboClean").onclick=function () {scene("clean");railHit(false);};
  control("comboCold").onclick=function () {scene("real chill");cryoHit(false);railHit(false);};
  control("comboFrozen").onclick=function () {scene("real Freeze");cryoHit(true);railHit(false);};
  control("comboDiagonal").onclick=function () {scene("diagonal");cryoHit(false);railHit(false);};
  control("comboMixed").onclick=function () {scene("mixed");railHit(false);};
  control("comboBoss").onclick=function () {scene("boss");cryoHit(false);railHit(false);};
  control("comboLost").onclick=function () {scene("lost source");cryoHit(false);railHit(true);};
  control("comboBuild").onclick=function () {
    scene("build layout");paidBuild("rail");
    buildInteraction.selectedKey="0,-1";renderBuildGrid();report();
  };
  control("comboPricing").onclick=function () {pricing(false);};
  control("comboPriceUpgraded").onclick=function () {pricing(true);};
  control("comboCombat").onclick=function () {ui.buildOverlay.classList.add("hidden");game.state="paused";draw();};
  control("comboPlay").onclick=function () {setPlaying(!playing);report();};
  control("comboStep").onclick=function () {setPlaying(false);advance(.1);};
  control("comboReduced").onchange=function () {save.settings.reducedFlash=this.checked;draw();};
  control("comboQuality").onchange=function () {save.settings.qualityTier=Number(this.value);draw();};
  control("comboZoom").onchange=function () {game.camera.zoom=Number(this.value);draw();};
  function animate() {requestAnimationFrame(animate);if(playing){tick(1/60);draw();}}
  Promise.all([moduleArt.ready,enemyArt.ready]).then(function () {scene("clean");requestAnimationFrame(animate);});
}

html = html.replace("<head>", "<head>" + storage);
html = html.replace(marker, "    (" + installCryoComboReview.toString() + ")();\n" + marker);
fs.mkdirSync(path.dirname(output), {recursive:true});
fs.writeFileSync(output, html);
console.log(output);
