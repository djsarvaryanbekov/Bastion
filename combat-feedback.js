(function (root) {
  "use strict";
  function limit(quality) { return quality > 1 ? 70 : quality > 0 ? 100 : 140; }

  function impact(game, x, y, angle, shielded, quality, reducedFlash) {
    if (game.effects.length > limit(quality) - 5) return;
    var color = shielded ? "#70dcd4" : "#f3b486";
    var count = quality > 0 ? 2 : 3;
    for (var i = 0; i < count; i++) {
      var direction = angle + (Math.random() - .5) * 1.8;
      var speed = 90 + Math.random() * 95;
      var spark = game.spawnEffect("hitSpark", x, y, .12 + Math.random() * .10, color);
      spark.vx = Math.cos(direction) * speed;
      spark.vy = Math.sin(direction) * speed;
      spark.angle = direction;
      spark.width = reducedFlash ? 4 : 7;
    }
    if (shielded) {
      var ripple = game.spawnEffect("shockwave", x, y, .19, color);
      ripple.maxRadius = 16;
      ripple.width = reducedFlash ? 1 : 2;
    }
  }

  function destruction(game, enemy, quality, reducedFlash, art) {
    var heavy = enemy.type === "boss" || enemy.type === "core";
    var space = Math.max(0, limit(quality) - game.effects.length);
    if (!space) return;
    var blast = game.spawnEffect("shockwave", enemy.x, enemy.y, heavy ? .8 : .32, heavy ? "#efbd79" : "#ea9874");
    blast.maxRadius = enemy.radius * (heavy ? 2.7 : 1.8);
    blast.width = heavy ? 3 : 1.5;
    var count = enemy.type === "core" ? 0 : Math.min(quality > 0 ? 2 : 3, Math.max(0, space - 1));
    var facing = Number.isFinite(enemy.visualRotation) ? enemy.visualRotation : enemy.rotation || 0;
    var span = art && art.displaySize(enemy.type, enemy.radius) || enemy.radius * 2.4;
    for (var i = 0; i < count; i++) {
      var direction = facing + i / count * Math.PI * 2 + .3;
      var fragment = game.spawnEffect("wreck", enemy.x, enemy.y, heavy ? 1.45 : .9, enemy.color || "#a36f5e");
      fragment.enemyType = enemy.type;
      fragment.fragment = i;
      fragment.fragmentCount = count;
      fragment.radius = enemy.radius;
      fragment.width = span;
      fragment.rotation = facing;
      fragment.spin = (i % 2 ? -1 : 1) * (heavy ? .8 : 1.8);
      fragment.vx = (enemy.vx || 0) * .25 + Math.cos(direction) * (heavy ? 100 : 65);
      fragment.vy = (enemy.vy || 0) * .25 + Math.sin(direction) * (heavy ? 100 : 65);
    }
    if (!reducedFlash && space > count + 1) {
      var smoke = game.spawnEffect("blastSmoke", enemy.x, enemy.y, heavy ? .8 : .45, "#293542");
      smoke.maxRadius = enemy.radius * 1.1;
    }
  }

  function update(effect, dt) {
    if (effect.type !== "hitSpark" && effect.type !== "wreck") return;
    effect.x += effect.vx * dt;
    effect.y += effect.vy * dt;
    effect.rotation += effect.spin * dt;
    var damping = Math.exp(-(effect.type === "wreck" ? 1.4 : 4) * dt);
    effect.vx *= damping; effect.vy *= damping;
  }

  function draw(context, effect, x, y, alpha, reducedFlash, art) {
    if (effect.type !== "hitSpark" && effect.type !== "shockwave" && effect.type !== "wreck" && effect.type !== "blastSmoke") return false;
    context.save();
    context.shadowBlur = 0;
    context.globalCompositeOperation = "source-over";
    context.globalAlpha = alpha * (reducedFlash ? .65 : .9);
    if (effect.type === "hitSpark") {
      context.strokeStyle = effect.color;
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x - Math.cos(effect.angle) * effect.width, y - Math.sin(effect.angle) * effect.width);
      context.stroke();
    } else if (effect.type === "shockwave") {
      var progress = 1 - alpha;
      context.lineWidth = effect.width * (.5 + alpha);
      context.strokeStyle = effect.color;
      context.beginPath();
      context.arc(x, y, Math.max(1, effect.maxRadius * (1 - Math.pow(1 - progress, 3))), 0, Math.PI * 2);
      context.stroke();
    } else if (effect.type === "blastSmoke") {
      context.globalAlpha = Math.sin(alpha * Math.PI) * .22;
      context.fillStyle = effect.color;
      context.beginPath();
      context.arc(x, y, Math.max(1, effect.maxRadius * (1.2 - alpha * .6)), 0, Math.PI * 2);
      context.fill();
    } else {
      context.globalAlpha = Math.min(1, alpha * 1.4);
      context.translate(x, y); context.rotate(effect.rotation);
      var size = effect.width;
      context.beginPath();
      context.rect(-size / 2 + effect.fragment * size / effect.fragmentCount, -size / 2, size / effect.fragmentCount, size);
      context.clip();
      if (!art || !art.draw(context, effect.enemyType, 0, 0, effect.radius, 0)) {
        context.fillStyle = "#36414c"; context.strokeStyle = effect.color; context.lineWidth = 2;
        context.fillRect(-size * .43, -size * .36, size * .86, size * .72);
        context.strokeRect(-size * .43, -size * .36, size * .86, size * .72);
      }
    }
    context.restore();
    return true;
  }
  root.DriftCombatFeedback = { impact:impact, destruction:destruction, update:update, draw:draw };
})(window);
