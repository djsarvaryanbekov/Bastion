(function (root) {
  "use strict";
  // A range owns only temporary arena state. Combat remains in Game.
  function create(options) {
    var scene = "stationary", refill = 0, pickups = [], earned = 0;
    var scenarios = [
      { id: "stationary", name: "Stationary targets" },
      { id: "moving", name: "Moving formation" },
      { id: "enemy", name: "Enemy formation" },
      { id: "incoming", name: "Incoming fire" },
      { id: "boss", name: "Boss encounter" },
      { id: "repair", name: "Damaged hull" },
      { id: "salvage", name: "Resource collection" }
    ];
    function clear(game) {
      game.enemies.length = 0; game.enemyById.clear(); game.enemyGrid.clear();
      game.projectiles.length = 0; game.gravityFields.length = 0;
      game.weaponAreas.length = 0; game.effects.length = 0; game.particles.length = 0;
      game.boss = null; game.bossSpawned = false; game.bossDefeated = false; game.pendingBossAngle = null;
      var bossHud = document.getElementById("bossHud");
      if (bossHud) bossHud.classList.add("hidden");
      pickups = []; refill = 0;
    }
    function spawn(game) {
      if (scene === "repair" || scene === "salvage") return;
      if (scene === "boss") {
        game.spawnBoss();
        if (game.boss) {
          game.boss.hp = game.boss.maxHp = Math.min(game.boss.maxHp, 1800);
          game.boss.fireClock = 2.2;
        }
        game.rebuildEnemyGrid();
        return;
      }
      var count = scene === "incoming" ? 3 : 6;
      for (var i = 0; i < count; i++) {
        var x = game.ship.x + (i % 3 - 1) * 66;
        var y = game.ship.y - 145 - Math.floor(i / 3) * 62;
        var types = scene === "enemy" ? ["scout", "hunter", "bolter", "gunner", "brute", "sniper"] : null;
        var enemy = game.spawnEnemy(types ? types[i % types.length] : (scene === "incoming" ? "bolter" : "drone"), x, y);
        enemy.hp = enemy.maxHp = scene === "incoming" ? 500 : 180;
        enemy.speed = scene === "stationary" ? 0 : (scene === "enemy" ? Math.max(18, enemy.speed * .5) : 22);
        enemy.damage = 3; enemy.reward = 8;
        if (scene === "stationary") { enemy.rangeAnchor = { x: x, y: y }; enemy.fireClock = 9999; }
      }
      game.rebuildEnemyGrid();
    }
    function reset(game, id) {
      scene = scenarios.some(function (entry) { return entry.id === id; }) ? id : "stationary";
      clear(game); earned = 0;
      game.ship.tiles.forEach(function (tile) {
        tile.hp = tile.maxHp; tile.repairDelay = 0; tile.repairCooldown = 0; tile.supportClock = 0;
        if (tile.maxShield) tile.shield = tile.maxShield;
        if (scene === "repair" && tile.type !== "repair") tile.hp *= .35;
      });
      if (scene === "salvage") {
        for (var i = 0; i < 7; i++) pickups.push({ x: game.ship.x + (i - 3) * 50, y: game.ship.y - 160 });
      }
      spawn(game);
    }
    function update(game, dt) {
      game.enemies.forEach(function (enemy) {
        if (enemy.rangeAnchor && !enemy.dead) { enemy.x = enemy.rangeAnchor.x; enemy.y = enemy.rangeAnchor.y; }
      });
      if (scene === "salvage") {
        pickups = pickups.filter(function (pickup) {
          if (Math.hypot(pickup.x - game.ship.x, pickup.y - game.ship.y) > 55) return true;
          var amount = 8 * game.matterIncomeMultiplier();
          game.matter += amount; earned += amount;
          game.flashEffect(pickup.x, pickup.y, "#edbd70", 28);
          return false;
        });
      }
      if (!game.enemies.some(function (enemy) { return !enemy.dead; })) {
        refill += dt;
        if (refill > 1.5) { spawn(game); refill = 0; }
      }
    }
    function draw(ctx, game, screen) {
      ctx.save(); ctx.fillStyle = "#edbd70";
      pickups.forEach(function (pickup) {
        var pos = screen(pickup.x, pickup.y);
        ctx.beginPath(); ctx.moveTo(pos.x, pos.y - 9); ctx.lineTo(pos.x + 7, pos.y);
        ctx.lineTo(pos.x, pos.y + 9); ctx.lineTo(pos.x - 7, pos.y); ctx.closePath(); ctx.fill();
      });
      ctx.restore();
    }
    return { scenarios: scenarios, reset: reset, update: update, draw: draw,
      snapshot: function () { return { scenario: scene, pickups: pickups.length, collected: earned }; } };
  }
  root.DriftTestRange = { create: create };
})(window);
