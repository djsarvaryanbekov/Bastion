(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DriftShipDebris = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";
  var LIFETIME = 3;
  var FADE_SECONDS = .9;
  var DRAG = .28;
  var NEIGHBORS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function components(tiles, keys) {
    var remaining = new Set(keys);
    var groups = [];
    remaining.forEach(function (start) {
      if (!remaining.delete(start)) return;
      var queue = [start], group = [];
      for (var head = 0; head < queue.length; head++) {
        var tile = tiles.get(queue[head]);
        if (!tile) continue;
        group.push(tile);
        for (var i = 0; i < NEIGHBORS.length; i++) {
          var next = (tile.x + NEIGHBORS[i][0]) + "," + (tile.y + NEIGHBORS[i][1]);
          if (remaining.delete(next)) queue.push(next);
        }
      }
      if (group.length) groups.push(group);
    });
    return groups;
  }

  function capture(group, cut, size, definitions) {
    var mass = 0, centerX = 0, centerY = 0;
    group.forEach(function (tile) {
      var weight = tile.mass > 0 ? tile.mass : 1;
      mass += weight; centerX += tile.x * weight; centerY += tile.y * weight;
    });
    centerX /= mass; centerY /= mass;
    var left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
    var radius = 0, seams = [];
    var snapshots = group.map(function (tile) {
      var x = (tile.x - centerX) * size, y = (tile.y - centerY) * size;
      var definition = definitions[tile.type] || { color: "#b9f5ff", glyph: "◆" };
      // Leave room for rotating barrels, including Rail's retained overhang.
      var padding = size * 1.25;
      left = Math.min(left, x - padding); right = Math.max(right, x + padding);
      top = Math.min(top, y - padding); bottom = Math.max(bottom, y + padding);
      radius = Math.max(radius, Math.hypot(x, y) + padding);
      if (Math.abs(tile.x - cut.x) + Math.abs(tile.y - cut.y) === 1) {
        seams.push({ x: x + (cut.x - tile.x) * size / 2, y: y + (cut.y - tile.y) * size / 2,
          dx: cut.x - tile.x, dy: cut.y - tile.y });
      }
      return { x: x, y: y, type: tile.type, aim: tile.aim, color: definition.color, glyph: definition.glyph };
    });
    return { tiles: snapshots, seams: seams, centerX: centerX, centerY: centerY, radius: radius,
      bounds: { left: left, top: top, width: right - left, height: bottom - top }, size: size, texture: null };
  }

  function spawn(game, keys, cut, size, definitions, quality) {
    var captured = new Set();
    if (!keys.length) return captured;
    var limit = quality > 1 ? 70 : quality > 0 ? 100 : 140;
    var maxChunks = quality > 1 ? 3 : quality > 0 ? 5 : 8;
    var active = 0;
    for (var i = 0; i < game.effects.length; i++) if (game.effects[i].type === "shipChunk") active++;
    if (active >= maxChunks || game.effects.length >= limit) return captured;
    var groups = components(game.ship.tiles, keys).sort(function (a, b) { return b.length - a.length; });
    for (var g = 0; g < groups.length && active < maxChunks && game.effects.length < limit; g++) {
      var group = groups[g];
      if (group.length < 2) continue;
      var chunk = capture(group, cut, size, definitions);
      var position = game.gridToWorld(chunk.centerX, chunk.centerY);
      var offsetX = position.x - game.ship.x, offsetY = position.y - game.ship.y;
      var cutPosition = game.gridToWorld(cut.x, cut.y);
      var awayX = position.x - cutPosition.x, awayY = position.y - cutPosition.y;
      var distance = Math.max(1, Math.hypot(awayX, awayY));
      var angular = Number.isFinite(game.ship.angularVelocity) ? game.ship.angularVelocity : 0;
      var effect = game.spawnEffect("shipChunk", position.x, position.y, LIFETIME, "#efbd79");
      effect.chunk = chunk;
      effect.radius = chunk.radius;
      effect.rotation = game.ship.angle;
      // A detached point inherits both translation and the ship's rotation at release.
      effect.vx = game.ship.vx - angular * offsetY + awayX / distance * 24;
      effect.vy = game.ship.vy + angular * offsetX + awayY / distance * 24;
      effect.spin = Math.max(-.85, Math.min(.85, angular * .45 + (chunk.centerX >= cut.x ? .28 : -.28)));
      effect.quality = quality;
      group.forEach(function (tile) { captured.add(tile.x + "," + tile.y); });
      active++;
    }
    return captured;
  }

  function update(effect, dt) {
    if (effect.type !== "shipChunk" || !effect.chunk) return;
    var damping = Math.exp(-DRAG * dt);
    var travel = (1 - damping) / DRAG;
    effect.x += effect.vx * travel; effect.y += effect.vy * travel;
    effect.vx *= damping; effect.vy *= damping;
    effect.rotation += effect.spin * dt;
    effect.spin *= Math.exp(-.16 * dt);
  }

  function texture(chunk, art, quality) {
    if (chunk.texture) return chunk.texture;
    var canvas = document.createElement("canvas");
    var maxSide = quality > 1 ? 256 : quality > 0 ? 384 : 512;
    var bounds = chunk.bounds;
    var scale = Math.min(1, maxSide / bounds.width, maxSide / bounds.height);
    canvas.width = Math.max(1, Math.min(maxSide, Math.ceil(bounds.width * scale)));
    canvas.height = Math.max(1, Math.min(maxSide, Math.ceil(bounds.height * scale)));
    var context = canvas.getContext("2d");
    context.scale(scale, scale); context.translate(-bounds.left, -bounds.top);
    chunk.tiles.forEach(function (tile) {
      if (art && art.drawBase(context, tile.type, tile.x, tile.y, chunk.size)) return;
      context.fillStyle = "#172b37"; context.strokeStyle = tile.color; context.lineWidth = 1;
      context.fillRect(tile.x - chunk.size * .46, tile.y - chunk.size * .46, chunk.size * .92, chunk.size * .92);
      context.strokeRect(tile.x - chunk.size * .46, tile.y - chunk.size * .46, chunk.size * .92, chunk.size * .92);
    });
    // Match the live ship's layering: all platforms, then all equipment.
    chunk.tiles.forEach(function (tile) {
      if (art && art.drawEquipment(context, tile.type, tile.x, tile.y, chunk.size, tile.aim)) return;
      context.fillStyle = tile.color; context.font = "800 12px ui-monospace, monospace";
      context.textAlign = "center"; context.textBaseline = "middle";
      context.fillText(tile.glyph || "", tile.x, tile.y);
    });
    chunk.texture = canvas;
    return canvas;
  }

  function draw(context, effect, x, y, art, reducedFlash) {
    if (effect.type !== "shipChunk" || !effect.chunk) return false;
    var chunk = effect.chunk, bounds = chunk.bounds;
    var image = texture(chunk, art, effect.quality);
    context.save();
    context.globalCompositeOperation = "source-over";
    context.shadowBlur = 0;
    context.globalAlpha = Math.min(1, Math.max(0, effect.life / FADE_SECONDS));
    context.translate(x, y); context.rotate(effect.rotation);
    context.drawImage(image, bounds.left, bounds.top, bounds.width, bounds.height);
    var age = effect.maxLife - effect.life;
    if (age < .6) {
      var progress = age / .6;
      context.globalAlpha *= (1 - progress) * (reducedFlash ? .4 : .75);
      context.strokeStyle = "#ffc18a"; context.lineWidth = reducedFlash ? 1 : 1.5;
      context.beginPath();
      chunk.seams.forEach(function (seam, index) {
        var count = effect.quality > 1 ? 2 : 4;
        for (var spark = 0; spark < count; spark++) {
          var angle = Math.atan2(seam.dy, seam.dx) + (spark - (count - 1) / 2) * .55;
          var distance = progress * (18 + (spark + index) % 3 * 9);
          var sx = seam.x + Math.cos(angle) * distance, sy = seam.y + Math.sin(angle) * distance;
          context.moveTo(sx, sy); context.lineTo(sx + Math.cos(angle) * 3, sy + Math.sin(angle) * 3);
        }
      });
      context.stroke();
    }
    context.restore();
    return true;
  }

  function release(effect) {
    if (!effect.chunk) return;
    if (effect.chunk.texture) { effect.chunk.texture.width = 1; effect.chunk.texture.height = 1; }
    effect.chunk = null;
  }

  return { components: components, spawn: spawn, update: update, draw: draw, release: release };
});
