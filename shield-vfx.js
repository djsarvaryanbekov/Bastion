(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DriftShieldVfx = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";

  function canAbsorb(node, definition) {
    return node.shield > 0 || (node.reserveCharge > 0 && node.reserveLife > 0) ||
      (definition.reserveCapacity > 0 && !(node.reserveCooldown > 0));
  }

  function create() {
    var source = null, radius = -1;
    var nodes = [], offsets = [], cells = new Map();
    var hull = [], contours = [], hit = 0;

    function stateAt(x, y) {
      var cell = cells.get(x + "," + y);
      return cell ? cell.state : 0;
    }

    function update(tiles, definition) {
      var nextRadius = definition.shieldRadius;
      var dirty = source !== tiles || radius !== nextRadius;
      var count = 0, hullCount = 0;
      hit = 0;
      tiles.forEach(function (tile) {
        var part = hull[hullCount];
        if (!part) part = hull[hullCount] = {};
        if (part.tile !== tile || part.x !== tile.x || part.y !== tile.y) dirty = true;
        part.tile = tile; part.x = tile.x; part.y = tile.y;
        hullCount += 1;
        if (tile.type !== "shield") return;
        var active = canAbsorb(tile, definition);
        var node = nodes[count];
        if (!node) node = nodes[count] = {};
        if (node.tile !== tile || node.x !== tile.x || node.y !== tile.y || node.active !== active) dirty = true;
        node.tile = tile; node.x = tile.x; node.y = tile.y; node.active = active;
        if (active) hit = Math.max(hit, Math.max(0, 1 - (definition.rechargeDelay - (tile.shieldDelay || 0)) / .25));
        count += 1;
      });
      if (hull.length !== hullCount) dirty = true;
      hull.length = hullCount;
      if (nodes.length !== count) dirty = true;
      nodes.length = count;
      if (!dirty) return;
      source = tiles;
      if (radius !== nextRadius) {
        radius = nextRadius;
        offsets.length = 0;
        // Coverage uses tile centers, exactly as damage absorption and Build preview do.
        var extent = Math.floor(radius);
        for (var y = -extent; y <= extent; y += 1) {
          for (var x = -extent; x <= extent; x += 1) {
            if (x * x + y * y <= radius * radius) offsets.push({ x: x, y: y });
          }
        }
      }
      cells.clear();
      nodes.forEach(function (node) {
        offsets.forEach(function (offset) {
          var x = node.x + offset.x, y = node.y + offset.y;
          var key = x + "," + y;
          var cell = cells.get(key);
          if (!cell) { cell = { x: x, y: y, state: 1 }; cells.set(key, cell); }
          if (node.active) cell.state = 2;
        });
      });
      var protectedHull = new Map();
      hull.forEach(function (part) {
        if (stateAt(part.x, part.y) === 2) protectedHull.set(part.x + "," + part.y, part);
      });
      contours = traceHull(protectedHull);
    }

    function barrierPath(context, size) {
      context.beginPath();
      contours.forEach(function (points) {
        var bevel = size * .13;
        points.forEach(function (point, index) {
          var previous = points[(index + points.length - 1) % points.length];
          var next = points[(index + 1) % points.length];
          var x = point.x * size / 2, y = point.y * size / 2;
          var enterX = x + Math.sign(previous.x - point.x) * bevel;
          var enterY = y + Math.sign(previous.y - point.y) * bevel;
          if (index === 0) context.moveTo(enterX, enterY);
          else context.lineTo(enterX, enterY);
          context.lineTo(x + Math.sign(next.x - point.x) * bevel, y + Math.sign(next.y - point.y) * bevel);
        });
        context.closePath();
      });
    }

    function drawFields(context, size) {
      if (!contours.length) return;
      context.save();
      barrierPath(context, size);
      context.setLineDash([]);
      context.lineJoin = "round";
      context.shadowColor = "#69dbe9";
      context.shadowBlur = 4;
      context.lineWidth = 3;
      context.strokeStyle = "rgba(105,219,233,.12)";
      context.stroke();
      context.restore();
    }

    function drawSurface(context, size, elapsed, reducedFlash) {
      if (!contours.length) return;
      context.save();
      context.shadowBlur = 0;
      context.lineJoin = "round";
      barrierPath(context, size);
      var impact = reducedFlash ? 0 : hit;
      context.fillStyle = "rgba(105,219,233," + (.035 + impact * .045) + ")";
      context.fill();
      context.setLineDash([]);
      context.strokeStyle = "rgba(126,226,238," + (.48 + impact * .25) + ")";
      context.lineWidth = 1.1;
      context.stroke();
      if (!reducedFlash) {
        context.setLineDash([size * .45, size * 2.6]);
        context.lineDashOffset = -elapsed * size * .55;
        context.lineWidth = 1.3;
        context.strokeStyle = "rgba(204,250,255,.5)";
        context.stroke();
      }
      context.restore();
    }

    return { update: update, coverageAt: stateAt, drawFields: drawFields, drawSurface: drawSurface };
  }

  // Trace only exposed hull edges, so adjacent protected modules share one barrier.
  function traceHull(parts) {
    var edges = [], starts = new Map();
    function edge(x, y, endX, endY, direction) {
      var segment = { x: x, y: y, endX: endX, endY: endY, direction: direction, used: false };
      edges.push(segment);
      var key = x + "," + y;
      if (!starts.has(key)) starts.set(key, []);
      starts.get(key).push(segment);
    }
    parts.forEach(function (part) {
      var x = part.x * 2, y = part.y * 2;
      if (!parts.has(part.x + "," + (part.y - 1))) edge(x - 1, y - 1, x + 1, y - 1, 0);
      if (!parts.has((part.x + 1) + "," + part.y)) edge(x + 1, y - 1, x + 1, y + 1, 1);
      if (!parts.has(part.x + "," + (part.y + 1))) edge(x + 1, y + 1, x - 1, y + 1, 2);
      if (!parts.has((part.x - 1) + "," + part.y)) edge(x - 1, y + 1, x - 1, y - 1, 3);
    });
    var loops = [];
    edges.forEach(function (first) {
      if (first.used) return;
      var points = [], current = first;
      while (current && !current.used) {
        current.used = true;
        points.push({ x: current.x, y: current.y, direction: current.direction });
        if (current.endX === first.x && current.endY === first.y) break;
        var options = starts.get(current.endX + "," + current.endY) || [];
        var next = null, priority = 5;
        options.forEach(function (candidate) {
          if (candidate.used) return;
          var turn = (candidate.direction - current.direction + 4) % 4;
          var rank = turn === 1 ? 0 : (turn === 0 ? 1 : (turn === 3 ? 2 : 3));
          if (rank < priority) { priority = rank; next = candidate; }
        });
        current = next;
      }
      loops.push(points.filter(function (point, index) {
        return point.direction !== points[(index + points.length - 1) % points.length].direction;
      }));
    });
    return loops;
  }

  return { create: create };
});
