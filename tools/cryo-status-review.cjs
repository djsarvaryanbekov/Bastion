"use strict";

const fs = require("node:fs"), path = require("node:path");
if (!process.argv[2] || !process.argv[3]) {
  throw new Error("Usage: node tools/cryo-status-review.cjs <standalone.html> <review.html>");
}
const input = path.resolve(process.argv[2]), output = path.resolve(process.argv[3]);
if (input === output || path.basename(output) === "Drift_Bastion_Playtest.html") {
  throw new Error("Use a separate review HTML filename");
}
let html = fs.readFileSync(input, "utf8");
const marker = "    window.__driftBastion = {";
if (html.split(marker).length !== 2) throw new Error("Expected one runtime marker");

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

function installCryoReview() {
  var STEP = 1 / 60;
  var clock = 0, playing = false, crowd = false, holdMotion = false;
  var tracks = [], actualHit = null;
  var panel = document.createElement("section");
  panel.style.cssText = "position:fixed;left:32px;right:32px;bottom:24px;z-index:10000;display:flex;gap:8px;align-items:center;flex-wrap:wrap;background:#101b28;padding:12px;color:#dae5e9;font:14px system-ui";
  panel.setAttribute("aria-label", "Cryo status review controls");
  panel.innerHTML = '<button id="cryoMixed">Five enemies</button>' +
    '<button id="cryoCold">Cold</button><button id="cryoFreeze">True freeze</button>' +
    '<button id="cryoClean">Clean</button><button id="cryoBurn">Cold + burn</button><button id="cryoBoss">Boss</button>' +
    '<button id="cryoHit">Real Cryo hit</button>' +
    '<button id="cryoProc">Four-hit Freeze proc</button>' +
    '<button id="cryoPlay">Play</button><button id="cryoStep">Advance 0.1s</button>' +
    '<button id="cryoExpire">Expire cold</button><button id="cryoCrowd">80-enemy crowd</button>' +
    '<label><input id="cryoMove" type="checkbox" checked>Movement</label>' +
    '<label><input id="cryoTurn" type="checkbox" checked>Turning</label>' +
    '<label><input id="cryoReduced" type="checkbox">Reduced flashes</label>' +
    '<label>Quality <select id="cryoQuality"><option value="0">High</option><option value="1">Medium</option><option value="2">Low</option></select></label>' +
    '<label>Camera <select id="cryoZoom"><option value="1">100%</option><option value=".55">55%</option><option value=".35">35%</option></select></label>' +
    '<output id="cryoReadout"></output>';
  document.body.appendChild(panel);
  function control(id) { return document.getElementById(id); }
  function isFrozen(enemy) { return clock < (enemy.freezeUntil || 0); }
  function setPlaying(value) {
    playing = value;
    control("cryoPlay").textContent = value ? "Pause" : "Play";
  }
  function report() {
    var frozen = 0, chilled = 0, burning = 0;
    game.enemies.forEach(function (enemy) {
      if (enemy.dead) return;
      if (isFrozen(enemy)) frozen += 1;
      else if (enemy.slowTimer > 0 && enemy.slowFactor < 1) chilled += 1;
      if (enemy.burnTimer > 0) burning += 1;
    });
    control("cryoReadout").textContent = innerWidth + "×" + innerHeight + " · t=" + clock.toFixed(2) +
      "s · " + chilled + " chilled · " + frozen + " frozen · " + burning + " burning" +
      (actualHit ? " · " + actualHit.shots + " real hit(s)" : "");
    panel.dataset.snapshot = JSON.stringify({time:clock,playing:playing,crowd:crowd,chilled:chilled,frozen:frozen,burning:burning,
      quality:save.settings.qualityTier,reducedFlash:save.settings.reducedFlash,zoom:game.camera.zoom,actualHit:actualHit,
      projectiles:game.projectiles.length,enemies:game.enemies.map(function (enemy) {
        return {id:enemy.id,type:enemy.type,x:enemy.x,y:enemy.y,facing:enemy.visualRotation,hp:enemy.hp,
          slowFactor:enemy.slowFactor,slowTimer:enemy.slowTimer,burnTimer:enemy.burnTimer,burnDamage:enemy.burnDamage,
          freezeRemaining:Math.max(0,(enemy.freezeUntil || 0)-clock)};
      })});
  }
  function draw() { game.state = "paused"; render(performance.now()); report(); }
  function setStatus(enemy, status) {
    var frozen = status === "frozen" && enemy.type !== "boss";
    enemy.slowFactor = status === "clean" ? 1 : enemy.type === "boss" ? .8 : frozen ? .25 : .5;
    enemy.slowTimer = status === "clean" ? 0 : frozen ? 4 : 2;
    enemy.freezeUntil = frozen ? clock + .6 : 0;
    enemy.freezeImmuneUntil = frozen ? clock + 3.6 : 0;
    enemy.freezeHitTimes = [];
    enemy.burnTimer = enemy.burnDamage = enemy.burnTickTime = 0;
    enemy.spreadBurn = false;
    enemy.hitFlash = 0;
  }
  function statusAll(status) {
    setPlaying(false);
    actualHit = null;
    game.enemies.forEach(function (enemy) { setStatus(enemy,status); });
    draw();
  }
  function scene(isCrowd, clean) {
    setPlaying(false);
    crowd = isCrowd;
    actualHit = null;
    if (!rangeSession) startRange("cryo"); else rangeSetModule("cryo");
    game.state = "paused";
    game.enemies = []; game.enemyById.clear(); game.enemyGrid.clear();
    game.effects = []; game.particles = []; game.projectiles = [];
    game.gravityFields = []; game.weaponAreas = [];
    game.camera.x = game.camera.y = game.camera.shakeX = game.camera.shakeY = 0;
    game.camera.zoom = Number(control("cryoZoom").value);
    game.ship.x = game.ship.y = game.ship.angle = game.ship.vx = game.ship.vy = 0;
    game.ship.tiles.forEach(function (tile) { tile.cooldown = 999; });
    save.settings.muted = true; save.settings.autoPause = false; save.settings.damageNumbers = false;
    save.settings.qualityTier = Number(control("cryoQuality").value);
    save.settings.reducedFlash = control("cryoReduced").checked;
    clock = game.elapsed = game.backgroundPulse = 0;
    game.separationClock = 999;
    tracks = [];
    var points = [[-300,-155,"hunter"],[-125,145,"brute"],[115,-180,"hunter"],
      [330,65,"colossus"],[-370,115,"colossus"]];
    if (crowd) {
      points = [];
      for (var row = 0; row < 8; row += 1) for (var column = 0; column < 10; column += 1) {
        var x = (column-4.5)*112;
        if (Math.abs(x)<100) x += x<0 ? -55 : 55;
        points.push([x,(row-3.5)*84,(row+column)%13===0 ? "colossus" : (row+column)%3 ? "hunter" : "brute"]);
      }
    }
    points.forEach(function (point,index) {
      var enemy = game.spawnEnemy(point[2],point[0],point[1]);
      enemy.hp = enemy.maxHp = 10000;
      enemy.rotation = enemy.visualRotation = -.8 + index*.65;
      enemy.phaseOffset = index*.7;
      enemy.fireClock = 999; enemy.vx = enemy.vy = 0;
      // Production updateEnemies owns status expiry; controlled tracks own review motion.
      enemy.speed = 0;
      setStatus(enemy, clean ? "clean" : index%5===3 ? "frozen" : "cold");
      tracks.push({enemy:enemy,x:point[0],y:point[1],phase:index*.71,facing:enemy.visualRotation,motionTime:0,turnTime:0});
    });
    game.rebuildEnemyGrid();
    draw();
  }
  function bossScene() {
    scene(false,true);
    game.enemies = []; game.enemyById.clear(); game.enemyGrid.clear();
    game.pendingBossAngle = 0;
    game.spawnBoss();
    var boss = game.boss;
    boss.x = 300; boss.y = -80;
    boss.hp = boss.maxHp = 10000;
    boss.speed = boss.damage = boss.vx = boss.vy = 0;
    boss.fireClock = 999; boss.attackCharge = boss.attackChargeMax = boss.chargeTimer = 0;
    boss.rotation = boss.visualRotation = 0;
    setStatus(boss,"cold");
    tracks = [{enemy:boss,x:boss.x,y:boss.y,phase:0,facing:0,motionTime:0,turnTime:0}];
    game.effects = []; game.particles = []; game.projectiles = [];
    ui.toast.classList.remove("show");
    game.rebuildEnemyGrid();
    draw();
  }
  function tick(dt) {
    clock += dt;
    game.elapsed = game.backgroundPulse = clock;
    var previous = tracks.map(function (track) { return {x:track.enemy.x,y:track.enemy.y}; });
    game.enemies.forEach(function (enemy) { enemy.vx = enemy.vy = 0; });
    game.updateEnemies(dt);
    tracks.forEach(function (track,index) {
      var enemy = track.enemy;
      if (enemy.type === "boss") { enemy.x = previous[index].x; enemy.y = previous[index].y; }
      if (!holdMotion && !isFrozen(enemy) && control("cryoMove").checked) {
        track.motionTime += dt*enemy.slowFactor;
        var horizontal = crowd ? 13 : 45, vertical = crowd ? 9 : 25;
        enemy.x = track.x + (Math.sin(track.motionTime*1.3+track.phase)-Math.sin(track.phase))*horizontal;
        enemy.y = track.y + (Math.cos(track.motionTime*.9+track.phase)-Math.cos(track.phase))*vertical;
      }
      enemy.vx = (enemy.x-previous[index].x)/dt;
      enemy.vy = (enemy.y-previous[index].y)/dt;
      if (!holdMotion && !isFrozen(enemy) && control("cryoTurn").checked) track.turnTime += dt;
      enemy.rotation = enemy.visualRotation = track.facing+track.turnTime*1.1;
    });
    game.rebuildEnemyGrid();
    game.updateProjectiles(dt);
    game.updateWeaponStatuses(dt);
    game.updateEffects(dt);
    game.enemies.forEach(function (enemy) { enemy.hitFlash = 0; });
    draw();
  }
  function advance(seconds) {
    for (var remaining=seconds;remaining>1e-8;) {
      var dt = Math.min(STEP,remaining); tick(dt); remaining -= dt;
    }
  }
  function realHit(proc) {
    scene(false,true);
    var target = game.enemies[0], tile = game.ship.tiles.get("0,-1");
    if (proc) {
      var upgrades = {}, licenses = runUpgrades.trees.cryo.branches.map(function (branch) { return "cryo:"+branch.id; });
      ["base1","base2","deep","deep","freeze"].forEach(function (id) {
        if (!runUpgrades.purchase(upgrades,"cryo",id,1e8,1,undefined,licenses)) throw new Error("Cryo fixture upgrade failed");
      });
      game.upgrades.cryo = upgrades.cryo;
      game.weaponDefinitions.cryo = runUpgrades.resolve(MODULES.cryo,upgrades.cryo);
    }
    var origin = game.gridToWorld(0,-1), dx = target.x-origin.x, dy = target.y-origin.y;
    var distance = Math.hypot(dx,dy), hp = target.hp, shots = proc ? 4 : 1;
    for (var shot=0;shot<shots;shot+=1) {
      game.fireAttack(tile,origin,dx/distance,dy/distance,game.weaponDefinitions.cryo,target,1);
    }
    holdMotion = true;
    for (var frame=0;game.projectiles.length && frame<180;frame+=1) tick(STEP);
    holdMotion = false;
    actualHit = {shots:shots,damageTaken:hp-target.hp,slowFactor:target.slowFactor,slowRemaining:target.slowTimer,
      frozen:isFrozen(target),freezeRemaining:Math.max(0,(target.freezeUntil||0)-clock),
      immunityRemaining:Math.max(0,(target.freezeImmuneUntil||0)-clock),resolved:game.projectiles.length===0};
    draw();
  }
  control("cryoMixed").onclick = function () { scene(false); };
  control("cryoCrowd").onclick = function () { scene(true); };
  control("cryoCold").onclick = function () { statusAll("cold"); };
  control("cryoFreeze").onclick = function () { statusAll("frozen"); };
  control("cryoClean").onclick = function () { statusAll("clean"); };
  control("cryoBurn").onclick = function () {
    statusAll("cold");
    game.enemies.forEach(function (enemy) { enemy.burnTimer = 2.5; enemy.burnDamage = 6; });
    draw();
  };
  control("cryoBoss").onclick = bossScene;
  control("cryoHit").onclick = function () { realHit(false); };
  control("cryoProc").onclick = function () { realHit(true); };
  control("cryoPlay").onclick = function () { setPlaying(!playing); report(); };
  control("cryoStep").onclick = function () { setPlaying(false); advance(.1); };
  control("cryoExpire").onclick = function () {
    setPlaying(false);
    var remaining = game.enemies.reduce(function (max,enemy) {
      return Math.max(max,enemy.slowTimer,(enemy.freezeUntil||0)-clock);
    },0);
    advance(remaining+.1);
  };
  control("cryoReduced").onchange = function () { save.settings.reducedFlash = this.checked; draw(); };
  control("cryoQuality").onchange = function () { save.settings.qualityTier = Number(this.value); draw(); };
  control("cryoZoom").onchange = function () { game.camera.zoom = Number(this.value); draw(); };
  function animate() { requestAnimationFrame(animate); if (playing) tick(STEP); }
  Promise.all([moduleArt.ready,enemyArt.ready]).then(function () {
    scene(false); requestAnimationFrame(animate);
  });
}

html = html.replace("<head>","<head>"+storage);
html = html.replace(marker,"    ("+installCryoReview.toString()+")();\n"+marker);
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,html);
console.log(output);
