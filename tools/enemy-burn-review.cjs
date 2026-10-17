"use strict";

const fs = require("node:fs");
const path = require("node:path");

if (!process.argv[2] || !process.argv[3]) {
  throw new Error("Usage: node tools/enemy-burn-review.cjs <standalone.html> <review.html>");
}
const input = path.resolve(process.argv[2]);
const output = path.resolve(process.argv[3]);
if (input === output || path.basename(output) === "Drift_Bastion_Playtest.html") {
  throw new Error("The review fixture must use a separate review HTML filename");
}
let html = fs.readFileSync(input, "utf8");
const marker = "    window.__driftBastion = {";
if (html.split(marker).length !== 2) throw new Error("Expected one runtime marker");

const storageShim = `<script>(function(){
  var values = new Map();
  Object.defineProperty(window, "localStorage", {configurable:true,value:{
    getItem:function(key){return values.has(key)?values.get(key):null;},
    setItem:function(key,value){values.set(key,String(value));},
    removeItem:function(key){values.delete(key);},
    clear:function(){values.clear();},
    key:function(index){return Array.from(values.keys())[index]||null;},
    get length(){return values.size;}
  }});
  localStorage.setItem("drift-bastion-save-v2",JSON.stringify({version:9,
    settings:{muted:true,autoPause:false,damageNumbers:false,qualityTier:0,uiScale:100},
    training:{completed:true}}));
})();</script>`;

function installEnemyBurnReview() {
  var FIXTURE_STEP = 1 / 60;
  var BURN_DURATION = 2.5;
  var clock = 0;
  var playing = false;
  var tracks = [];
  var crowd = false;
  var panel = document.createElement("section");
  panel.style.cssText = "position:fixed;left:32px;right:32px;bottom:24px;z-index:10000;display:flex;gap:8px;align-items:center;flex-wrap:wrap;background:#101b28;padding:12px;color:#dae5e9;font:14px system-ui";
  panel.setAttribute("aria-label", "Enemy burn review controls");
  panel.innerHTML = '<button id="burnScene">Five enemies</button>' +
    '<button id="burnCrowd">80-enemy crowd</button>' +
    '<button id="burnPlay">Play</button>' +
    '<button id="burnStep">Advance 0.1s</button>' +
    '<button id="burnReset">Reset burning timer</button>' +
    '<button id="burnExpire">Expire burn</button>' +
    '<label><input id="burnMove" type="checkbox" checked>Movement</label>' +
    '<label><input id="burnTurn" type="checkbox" checked>Turning</label>' +
    '<label><input id="burnReduced" type="checkbox">Reduced flashes</label>' +
    '<label>Quality <select id="burnQuality"><option value="0">High</option><option value="1">Medium</option><option value="2">Low</option></select></label>' +
    '<label>Camera <select id="burnZoom"><option value="1">100%</option><option value=".55">55%</option><option value=".35">35%</option></select></label>' +
    '<output id="burnReadout"></output>';
  document.body.appendChild(panel);

  function control(id) { return document.getElementById(id); }
  function setPlaying(value) {
    playing = value;
    control("burnPlay").textContent = playing ? "Pause" : "Play";
  }
  function report() {
    var burning = game.enemies.filter(function (enemy) { return !enemy.dead && enemy.burnTimer > 0; });
    var remaining = burning.reduce(function (max, enemy) { return Math.max(max, enemy.burnTimer); }, 0);
    control("burnReadout").textContent = innerWidth + "×" + innerHeight + " · t=" + clock.toFixed(2) +
      "s · " + burning.length + "/" + game.enemies.length + " burning · " + remaining.toFixed(2) + "s left";
    panel.dataset.snapshot = JSON.stringify({time:clock,playing:playing,crowd:crowd,burning:burning.length,
      remaining:remaining,quality:save.settings.qualityTier,reducedFlash:save.settings.reducedFlash,zoom:game.camera.zoom,
      enemies:game.enemies.map(function (enemy) { return {id:enemy.id,type:enemy.type,x:enemy.x,y:enemy.y,
        facing:enemy.visualRotation,burnTimer:enemy.burnTimer}; })});
  }
  function draw() {
    game.state = "paused";
    render(performance.now());
    report();
  }
  function resetBurn() {
    game.enemies.forEach(function (enemy) {
      enemy.burnTimer = BURN_DURATION;
      enemy.burnDamage = 6;
      enemy.burnTickTime = 0;
      enemy.spreadBurn = false;
      enemy.hitFlash = 0;
    });
    draw();
  }
  function scene(isCrowd) {
    setPlaying(false);
    crowd = isCrowd;
    if (!rangeSession) startRange("ember");
    else rangeSetModule("ember");
    game.state = "paused";
    game.enemies = [];
    game.enemyById.clear();
    game.enemyGrid.clear();
    game.effects = [];
    game.particles = [];
    game.projectiles = [];
    game.gravityFields = [];
    game.weaponAreas = [];
    game.camera.x = game.camera.y = game.camera.shakeX = game.camera.shakeY = 0;
    game.camera.zoom = Number(control("burnZoom").value);
    game.ship.x = game.ship.y = game.ship.angle = 0;
    game.ship.vx = game.ship.vy = 0;
    game.ship.tiles.forEach(function (tile) { tile.cooldown = 999; });
    save.settings.muted = true;
    save.settings.damageNumbers = false;
    save.settings.autoPause = false;
    save.settings.qualityTier = Number(control("burnQuality").value);
    save.settings.reducedFlash = control("burnReduced").checked;
    clock = 0;
    game.backgroundPulse = 0;
    tracks = [];
    var points = [[-300,-155,"hunter"],[-125,145,"brute"],[115,-180,"hunter"],
      [330,65,"colossus"],[-370,115,"colossus"]];
    if (crowd) {
      points = [];
      for (var row = 0; row < 8; row += 1) {
        for (var column = 0; column < 10; column += 1) {
          var x = (column - 4.5) * 112;
          var y = (row - 3.5) * 84;
          // Leave a visible lane for the player's ship at the center.
          if (Math.abs(x) < 100) x += x < 0 ? -55 : 55;
          points.push([x,y,(row + column) % 13 === 0 ? "colossus" : (row + column) % 3 ? "hunter" : "brute"]);
        }
      }
    }
    points.forEach(function (point, index) {
      var enemy = game.spawnEnemy(point[2],point[0],point[1]);
      enemy.hp = enemy.maxHp = 10000;
      enemy.rotation = enemy.visualRotation = -.8 + index * .65;
      enemy.phaseOffset = index * .7;
      enemy.fireClock = 999;
      enemy.hitFlash = 0;
      enemy.vx = enemy.vy = 0;
      tracks.push({enemy:enemy,x:point[0],y:point[1],phase:index * .71,facing:enemy.visualRotation});
    });
    game.rebuildEnemyGrid();
    resetBurn();
  }
  function tick(dt) {
    clock += dt;
    game.backgroundPulse = clock;
    tracks.forEach(function (track) {
      var enemy = track.enemy;
      var oldX = enemy.x, oldY = enemy.y;
      if (control("burnMove").checked) {
        var horizontal = crowd ? 13 : 45;
        var vertical = crowd ? 9 : 25;
        enemy.x = track.x + (Math.sin(clock * 1.3 + track.phase) - Math.sin(track.phase)) * horizontal;
        enemy.y = track.y + (Math.cos(clock * .9 + track.phase) - Math.cos(track.phase)) * vertical;
      }
      enemy.vx = (enemy.x - oldX) / dt;
      enemy.vy = (enemy.y - oldY) / dt;
      if (control("burnTurn").checked) enemy.rotation = enemy.visualRotation = track.facing + clock * 1.1;
    });
    game.updateWeaponStatuses(dt);
    game.updateEffects(dt);
    game.enemies.forEach(function (enemy) { enemy.hitFlash = 0; });
    game.rebuildEnemyGrid();
    draw();
  }
  function advance(seconds) {
    var remaining = seconds;
    while (remaining > 1e-8) {
      var dt = Math.min(FIXTURE_STEP, remaining);
      tick(dt);
      remaining -= dt;
    }
  }
  control("burnScene").onclick = function () { scene(false); };
  control("burnCrowd").onclick = function () { scene(true); };
  control("burnPlay").onclick = function () { setPlaying(!playing); report(); };
  control("burnStep").onclick = function () { setPlaying(false); advance(.1); };
  control("burnReset").onclick = resetBurn;
  control("burnExpire").onclick = function () {
    setPlaying(false);
    var remaining = game.enemies.reduce(function (max, enemy) { return Math.max(max, enemy.burnTimer); }, 0);
    advance(remaining + .1);
  };
  control("burnReduced").onchange = function () { save.settings.reducedFlash = this.checked; draw(); };
  control("burnQuality").onchange = function () { save.settings.qualityTier = Number(this.value); draw(); };
  control("burnZoom").onchange = function () { game.camera.zoom = Number(this.value); draw(); };
  function animate() {
    requestAnimationFrame(animate);
    if (playing) tick(FIXTURE_STEP);
  }
  Promise.all([moduleArt.ready,enemyArt.ready,window.DriftFireVfx.ready]).then(function () {
    scene(false);
    requestAnimationFrame(animate);
  });
}

html = html.replace("<head>", "<head>" + storageShim);
html = html.replace(marker, "    (" + installEnemyBurnReview.toString() + ")();\n" + marker);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, html);
console.log(output);
