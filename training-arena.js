(function (root) {
  "use strict";

  function create(options) {
    var current = null;

    function clearEnemies(game, clearShots) {
      game.enemies.length = 0;
      game.enemyById.clear();
      game.enemyGrid.clear();
      game.enemyPool.length = 0;
      if (clearShots) game.projectiles.length = 0;
    }

    function spawnMissingEnemies(game, lesson) {
      var setup = lesson.setup || {};
      var completedIds = lesson.progress.destroyedIds || [];
      var spawned = false;
      (setup.targets || []).forEach(function (target, index) {
        if (completedIds.indexOf(target.id) >= 0) return;
        if (game.enemies.some(function (enemy) { return !enemy.dead && enemy.trainingTarget && enemy.trainingTarget.id === target.id; })) return;
        var type = lesson.stageId === "upgrades" && index === 1 ? "bolter" : "drone";
        var enemy = game.spawnEnemy(type, game.ship.x + target.x, game.ship.y + target.y);
        enemy.trainingTarget = { id: target.id, group: setup.targetGroup };
        enemy.hp = enemy.maxHp = target.hp;
        enemy.speed = 22;
        enemy.damage = 3;
        enemy.reward = 8;
        enemy.fireClock = 1.5;
        spawned = true;
      });
      if (spawned) game.rebuildEnemyGrid();
    }

    function restoreShip(game) {
      var core = game.ship.tiles.get("0,0");
      if (!core || core.hp <= 0) {
        game.ship.tiles.clear();
        game.ship.tiles.set("0,0", options.makeTile("core", 0, 0));
        game.ship.tiles.set("0,-1", options.makeTile("cannon", 0, -1));
        game.purchasedCounts.cannon = Math.max(1, game.purchasedCounts.cannon);
      }
      game.ship.tiles.forEach(function (tile) {
        tile.hp = tile.maxHp;
        if (tile.maxShield) { tile.shield = tile.maxShield; tile.shieldDelay = 0; }
      });
      game.matter = Math.max(game.matter, options.replacementPrice());
      game.gravityFields.length = 0;
    }

    function prepare(game, lesson, reason) {
      current = lesson;
      clearEnemies(game, reason !== "advance");
      game.trainingWorld = { stageId: lesson.stageId };
      if (reason === "retry") restoreShip(game);
      if (!lesson.completed) spawnMissingEnemies(game, lesson);
    }

    function update(game, dt, lesson) {
      if (!current || lesson.completed || game.state !== "playing") return;
      // A learner may sell or lose the last gun. Keep the next purchase possible.
      var hasWeapon = Array.from(game.ship.tiles.values()).some(function (tile) { return tile.type === "cannon"; });
      if (!hasWeapon) game.matter = Math.max(game.matter, options.replacementPrice());
      // Enemies killed before the relevant purchase return, so free play never empties the arena.
      spawnMissingEnemies(game, lesson);
    }

    function draw(context, game, screen) {
      if (!game.trainingWorld) return;
      context.save();
      context.fillStyle = "#edc275";
      context.font = "11px system-ui";
      context.textAlign = "center";
      game.enemies.forEach(function (enemy) {
        if (!enemy.trainingTarget || enemy.dead) return;
        var point = screen(enemy.x, enemy.y);
        context.fillText("+8 MATTER", point.x, point.y - enemy.radius - 14);
      });
      context.restore();
    }

    return { prepare: prepare, update: update, draw: draw };
  }

  root.DriftTrainingArena = { create: create };
})(typeof window !== "undefined" ? window : globalThis);
