"use strict";

const fs = require("node:fs"), path = require("node:path");
if (!process.argv[2] || !process.argv[3]) throw new Error("Usage: node tools/cryo-missile-review.cjs <standalone.html> <review.html>");
const input = path.resolve(process.argv[2]), output = path.resolve(process.argv[3]);
if (input === output || path.basename(output) === "Drift_Bastion_Playtest.html") throw new Error("Use a separate review filename");
let html = fs.readFileSync(input, "utf8");
const marker = "    window.__driftBastion = {";
if (html.split(marker).length !== 2) throw new Error("Expected exactly one game runtime marker");

const storage = `<script>(function(){var values=new Map();Object.defineProperty(window,"localStorage",{configurable:true,value:{getItem:function(k){return values.has(String(k))?values.get(String(k)):null;},setItem:function(k,v){values.set(String(k),String(v));},removeItem:function(k){values.delete(String(k));},clear:function(){values.clear();},key:function(i){return Array.from(values.keys())[i]||null;},get length(){return values.size;}}});localStorage.setItem("drift-bastion-save-v2",JSON.stringify({version:9,settings:{muted:true,autoPause:false,damageNumbers:false,reducedFlash:false,qualityTier:0,uiScale:100},training:{completed:true},progression:{schemaVersion:4,purchasedModules:["missile","rail","cryo"]}}));})();</script>`;

function installCryoMissileReview() {
  var STEP = 1 / 120, mode = "linked flight", results = null, targets = [], saveBefore = "", errors = [];
  window.addEventListener("error", function (event) { errors.push(event.message || "window error"); });
  window.addEventListener("unhandledrejection", function (event) { errors.push(String(event.reason || "unhandled rejection")); });
  var panel = document.createElement("section");
  panel.setAttribute("aria-label", "Cryo Missile review controls");
  panel.style.cssText = "position:fixed;left:18px;right:18px;bottom:14px;z-index:10000;display:flex;gap:7px;flex-wrap:wrap;align-items:center;background:#101b28;border:1px solid #4c7f91;padding:10px;color:#e4f5fb;font:14px system-ui";
  panel.innerHTML = '<strong>Cryo + Missile</strong><button id="cryoMissileFlight">Linked Missile flight</button><button id="cryoMissileBlast">Linked blast</button><button id="cryoMissileDiagonal">Diagonal blast</button><button id="cryoMissileCluster">Cluster blast</button><button id="cryoMissileMixed">Missile → Rail</button><button id="cryoMissileBoss">Boss</button><button id="cryoMissileBuildLinked">Build linked Missile</button><button id="cryoMissileBuildUnlinked">Build unlinked Missile</button><button id="cryoMissileCryoBuild">Cryo mixed preview</button><button id="cryoMissileExpire">Expire</button><button id="cryoMissileStep">Advance 0.1s</button><label><input id="cryoMissileReduced" type="checkbox">Reduced flashes</label><label>Quality <select id="cryoMissileQuality"><option value="0">High</option><option value="1">Medium</option><option value="2">Low</option></select></label><output id="cryoMissileReadout" style="flex-basis:100%;font:12px ui-monospace,monospace"></output>';
  document.body.appendChild(panel);
  function control(id) { return document.getElementById(id); }
  function cold(enemy) { return enemy.slowTimer > 0 && enemy.slowFactor < 1; }
  function paint() { if (game.state !== "building") game.state = "paused"; render(performance.now()); report(); }
  function tile(type, x, y) { var value = makeTile(type, x, y, type === "core", 1, true); value.cooldown = 999; game.ship.tiles.set(keyOf(x, y), value); return value; }
  function target(type, x, y) {
    var enemy;
    if (type === "boss") { game.spawnBoss(); enemy = game.boss; enemy.x = x; enemy.y = y; }
    else enemy = game.spawnEnemy(type || "colossus", x, y);
    enemy.hp = enemy.maxHp = 1000; enemy.speed = enemy.damage = enemy.vx = enemy.vy = 0;
    enemy.fireClock = 999; enemy.rotation = enemy.visualRotation = Math.PI; enemy.hitFlash = 0;
    targets.push(enemy); return enemy;
  }
  function ordinaryBlastTargets() {
    game.enemies=[]; game.enemyById.clear(); game.enemyGrid.clear(); targets=[];
    target("scout",180,-42); target("hunter",205,-5); target("drone",200,-76);
    game.rebuildEnemyGrid();
  }
  function reset(next, diagonal) {
    mode = next; results = null; targets = [];
    if (!rangeSession) startRange("missile"); else rangeSetModule("missile");
    ui.buildOverlay.classList.add("hidden"); ui.pauseOverlay.classList.add("hidden"); game.state = "paused"; game.elapsed = 1;
    game.enemies = []; game.enemyById.clear(); game.enemyGrid.clear(); game.boss = null; game.bossSpawned = false; ui.bossHud.classList.add("hidden"); game.projectiles = []; game.effects = []; game.particles = []; game.gravityFields = []; game.weaponAreas = [];
    game.ship.tiles.clear(); game.ship.x = game.ship.y = game.ship.vx = game.ship.vy = game.ship.angle = 0; game.camera.x = game.camera.y = game.camera.shakeX = game.camera.shakeY = 0; game.camera.zoom = 1;
    tile("core", 0, 0); tile("missile", 0, -1); tile("cryo", diagonal ? -1 : -1, diagonal ? -2 : -1);
    save.settings.muted = true; save.settings.reducedFlash = control("cryoMissileReduced").checked; save.settings.qualityTier = Number(control("cryoMissileQuality").value);
    target(next === "boss" ? "boss" : "colossus", 170, -42); game.rebuildEnemyGrid(); saveBefore = JSON.stringify(save.progression); paint();
  }
  function advanceRaw(seconds) {
    for (var left = seconds; left > 1e-8; ) { var dt = Math.min(STEP, left); game.elapsed += dt; game.backgroundPulse += dt; game.updateEnemies(dt); game.rebuildEnemyGrid(); game.updateProjectiles(dt); game.updateWeaponStatuses(dt); game.updateEffects(dt); targets.forEach(function (enemy) { enemy.hitFlash = 0; }); left -= dt; }
  }
  function step(seconds) { advanceRaw(seconds); paint(); }
  function fire(type) {
    var weapon = Array.from(game.ship.tiles.values()).find(function(entry){return entry.type===type;}), victim = targets[0], origin = game.gridToWorld(weapon.x, weapon.y), dx = victim.x - origin.x, dy = victim.y - origin.y, length = Math.hypot(dx, dy);
    game.fireAttack(weapon, origin, dx / length, dy / length, game.weaponDefinitions[weapon.type], victim, 1);
    return game.projectiles[game.projectiles.length - 1];
  }
  function resolveMissile() { for (var frame=0;frame<480 && game.projectiles.some(function(p){return p.kind==="missile"&&p.life>0;});frame+=1) advanceRaw(STEP); advanceRaw(.06); paint(); }
  function snapshot() {
    return {viewport:[innerWidth,innerHeight],state:game.state,mode:mode,time:game.elapsed,quality:save.settings.qualityTier,reducedFlashes:save.settings.reducedFlash,
      linkedMissile:(function(){var missile=Array.from(game.ship.tiles.values()).find(function(t){return t.type==="missile";});return Boolean(missile&&game.hasCryoNeighbor(missile));})(), saveUnchanged:saveBefore === JSON.stringify(save.progression), errors:errors.slice(), results:results,
      projectiles:game.projectiles.map(function(p){return {kind:p.kind,coldPayload:p.coldPayload,x:p.x,y:p.y,life:p.life,clusterCount:p.clusterCount};}),
      enemies:targets.map(function(e){return {type:e.type,hp:e.hp,slowFactor:e.slowFactor,slowTimer:e.slowTimer,cold:cold(e),freezeUntil:e.freezeUntil||0};}),
      effects:game.effects.map(function(e){return {type:e.type,coldPayload:Boolean(e.coldPayload),x:e.x,y:e.y,life:e.life,maxLife:e.maxLife};})};
  }
  function report() { var state = snapshot(); panel.dataset.snapshot = JSON.stringify(state); control("cryoMissileReadout").textContent = innerWidth+"×"+innerHeight+" · "+mode+" · link "+(state.linkedMissile?"ON":"OFF")+" · "+state.enemies.map(function(e){return e.type+" HP "+e.hp.toFixed(0)+" slow "+e.slowFactor+"/"+e.slowTimer.toFixed(2);}).join(" · ")+(results?" · "+(results.passed?"PASS":"CHECK"):""); }
  function linkedFlight() { reset("linked flight", false); var shot = fire("missile"); results = {passed:Boolean(shot && shot.coldPayload),coldPayload:shot && shot.coldPayload}; paint(); }
  function linkedBlast() { reset("linked blast", false); ordinaryBlastTargets(); fire("missile"); resolveMissile(); var e=targets[0]; results={passed:targets.every(function(entry){return cold(entry);})&&e.slowFactor===.75&&e.slowTimer>0&&e.slowTimer<=1.01,slowFactor:e.slowFactor,slowTimer:e.slowTimer,freezeUntil:e.freezeUntil||0}; paint(); }
  function diagonalBlast() { reset("diagonal blast", true); fire("missile"); resolveMissile(); var e=targets[0]; results={passed:!cold(e),slowFactor:e.slowFactor,slowTimer:e.slowTimer}; paint(); }
  function enableCluster() { var data={},licenses=runUpgrades.trees.missile.branches.map(function(branch){return "missile:"+branch.id;}); ["base1","base2","heavy","heavy","cluster"].forEach(function(id){if(!runUpgrades.purchase(data,"missile",id,1e8,1,undefined,licenses))throw Error("Missile Cluster fixture upgrade failed");}); game.upgrades.missile=data.missile;game.weaponDefinitions.missile=runUpgrades.resolve(MODULES.missile,data.missile); }
  function clusterBlast() { reset("cluster blast", false); enableCluster(); ordinaryBlastTargets(); fire("missile"); resolveMissile(); results={passed:targets.every(function(e){return cold(e);}),slows:targets.map(function(e){return e.slowFactor;})}; paint(); }
  function mixed() { reset("Missile to Rail", false); game.ship.tiles.clear();tile("core",0,0);tile("cryo",0,-1);tile("missile",-1,-1);tile("rail",1,-1);game.rebuildEnemyGrid();var before=targets[0].hp;fire("missile");resolveMissile();var rail=fire("rail");advanceRaw(.3);results={passed:Boolean(rail&&rail.shatter)&&targets[0].hp<before,missileLink:game.hasCryoNeighbor(Array.from(game.ship.tiles.values()).find(function(t){return t.type==="missile";})),railShatter:rail&&rail.shatter,damage:before-targets[0].hp};paint(); }
  function boss() { reset("boss", false); fire("missile"); resolveMissile(); var e=targets[0]; results={passed:cold(e)&&e.slowFactor===.8&&e.slowTimer>0,slowFactor:e.slowFactor,slowTimer:e.slowTimer}; paint(); }
  function build(which,linked) { reset(which === "cryo" ? "Cryo mixed preview" : (linked ? "Build linked Missile" : "Build unlinked Missile"), false); game.ship.tiles.clear();tile("core",0,0);if(which==="cryo"){tile("rail",0,-1);tile("missile",2,-1);selectedBuildModule="cryo";}else{tile("cryo",0,-1);selectedBuildModule="missile";}game.matter=10000;game.state="playing";openBuild();renderBuildGrid();updateBuildPreview(1,which==="cryo"?-1:(linked?-1:0));paint(); }
  control("cryoMissileFlight").onclick=linkedFlight; control("cryoMissileBlast").onclick=linkedBlast; control("cryoMissileDiagonal").onclick=diagonalBlast; control("cryoMissileCluster").onclick=clusterBlast; control("cryoMissileMixed").onclick=mixed; control("cryoMissileBoss").onclick=boss;
  control("cryoMissileBuildLinked").onclick=function(){build("missile",true);}; control("cryoMissileBuildUnlinked").onclick=function(){build("missile",false);}; control("cryoMissileCryoBuild").onclick=function(){build("cryo");}; control("cryoMissileExpire").onclick=function(){step(1.1);}; control("cryoMissileStep").onclick=function(){step(.1);};
  control("cryoMissileReduced").onchange=function(){save.settings.reducedFlash=this.checked;paint();}; control("cryoMissileQuality").onchange=function(){save.settings.qualityTier=Number(this.value);paint();};
  Promise.all([moduleArt && moduleArt.ready,enemyArt && enemyArt.ready]).then(linkedFlight);
}

html = html.replace("<head>", "<head>" + storage);
html = html.replace(marker, "    (" + installCryoMissileReview.toString() + ")();\n" + marker);
fs.mkdirSync(path.dirname(output), {recursive:true});
fs.writeFileSync(output, html);
console.log(output);
