(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DriftSpaceBackdrop = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";

  // The battlefield backdrop, modelled on Space Scavenger's (research/backgrounds-2026-11-11):
  //   - an even deep-blue field with a mottled pattern of darker and lighter cloud;
  //   - loose clusters of dark rocks built from facets, with soft edges, and a few larger blurred ones behind.
  // Nothing is fixed to the screen: no spotlight or vignette, so there is no glow around the ship.
  // Cloud and near rocks share one slow rate, so they move together as one distant layer.
  // The game draws its own moving stars and grid on top; the backdrop has no stars of its own.
  var TAU = Math.PI * 2;

  // An even tint over the game's navy; it has no centre, so it cannot read as a light around the ship.
  var FIELD_TINT = "rgba(0,24,74,.34)";
  var BACKDROP_PARALLAX = .18;

  // The pattern tile is painted at full resolution: stretching a low-alpha tile produced stripes.
  var CLOUD_TILE = 768;
  var CLOUD_STRETCH = 2;
  var CLOUD_DARK = [0, 2, 10];
  var CLOUD_DARK_ALPHA = .55;
  var CLOUD_LIGHT = [34, 82, 150];
  var CLOUD_LIGHT_ALPHA = .2;

  var ROCK_SPRITE = 128;
  var ROCK_SHAPES = 18;
  // Facet tones from shaded to lit, measured against a field of about rgb(1,19,55).
  var ROCK_DARK = [1, 5, 21];
  var ROCK_LIGHT = [10, 20, 46];
  var LIGHT_X = -.62, LIGHT_Y = -.78;

  var FAR_LAYER = { parallax: .14, cell: 700, chance: .45, minRocks: 1, maxRocks: 2, spread: 220, minSize: 110, maxSize: 190, alpha: .45, blur: 4, salt: 300 };
  var NEAR_LAYER = { parallax: BACKDROP_PARALLAX, cell: 520, chance: .6, minRocks: 2, maxRocks: 7, spread: 170, minSize: 34, maxSize: 88, alpha: 1, blur: 1.1, salt: 500 };

  function hash(x, y, salt) {
    var h = (x * 374761393 + y * 668265263 + salt * 1274126177) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function mix(from, to, amount) {
    return Math.round(from + (to - from) * amount);
  }

  // Value noise that repeats every `period` lattice cells, so the painted tile wraps without a seam.
  function tileNoise(x, y, period, salt) {
    var cellX = Math.floor(x), cellY = Math.floor(y);
    var fx = x - cellX, fy = y - cellY;
    var sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    var x0 = ((cellX % period) + period) % period, x1 = (x0 + 1) % period;
    var y0 = ((cellY % period) + period) % period, y1 = (y0 + 1) % period;
    var top = hash(x0, y0, salt) + (hash(x1, y0, salt) - hash(x0, y0, salt)) * sx;
    var bottom = hash(x0, y1, salt) + (hash(x1, y1, salt) - hash(x0, y1, salt)) * sx;
    return top + (bottom - top) * sy;
  }

  function smoothStep(edge0, edge1, value) {
    var t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  // High noise becomes dark smoke, low noise becomes a lighter blue haze, the middle stays open field.
  function paintClouds(context) {
    var image = context.createImageData(CLOUD_TILE, CLOUD_TILE);
    var data = image.data;
    for (var y = 0; y < CLOUD_TILE; y += 1) {
      for (var x = 0; x < CLOUD_TILE; x += 1) {
        var u = x / CLOUD_TILE, v = y / CLOUD_TILE;
        var value = tileNoise(u * 3, v * 3, 3, 701) * .5 + tileNoise(u * 6, v * 6, 6, 702) * .3 + tileNoise(u * 14, v * 14, 14, 703) * .2;
        var dark = smoothStep(.5, .72, value);
        var light = smoothStep(.44, .26, value);
        var color = dark > 0 ? CLOUD_DARK : CLOUD_LIGHT;
        var alpha = dark > 0 ? dark * CLOUD_DARK_ALPHA : light * CLOUD_LIGHT_ALPHA;
        var index = (y * CLOUD_TILE + x) * 4;
        data[index] = color[0];
        data[index + 1] = color[1];
        data[index + 2] = color[2];
        // Random rounding turns 8-bit steps into invisible grain instead of contour lines.
        data[index + 3] = Math.floor(alpha * 255 + Math.random());
      }
    }
    context.putImageData(image, 0, 0);
  }

  function facetColor(centroidX, centroidY, centerX, centerY, tilt, seed) {
    var dx = centroidX - centerX, dy = centroidY - centerY;
    var length = Math.sqrt(dx * dx + dy * dy) || 1;
    // A facet facing the light is brighter; flatter facets near the top depend less on direction.
    var facing = (dx / length * LIGHT_X + dy / length * LIGHT_Y) * tilt;
    var amount = Math.max(0, Math.min(1, .36 + facing * .5 + (hash(seed, 7, 905) - .5) * .16));
    return "rgb(" + mix(ROCK_DARK[0], ROCK_LIGHT[0], amount) + "," + mix(ROCK_DARK[1], ROCK_LIGHT[1], amount) + "," + mix(ROCK_DARK[2], ROCK_LIGHT[2], amount) + ")";
  }

  function fillFacet(context, ax, ay, bx, by, cx, cy, color) {
    context.fillStyle = color;
    context.strokeStyle = color;
    context.beginPath();
    context.moveTo(ax, ay);
    context.lineTo(bx, by);
    context.lineTo(cx, cy);
    context.closePath();
    context.fill();
    // A hairline in the same tone closes the seams between neighbouring facets.
    context.stroke();
  }

  // One rock: an uneven outline, an uneven inner ring and a peak, joined into flat facets.
  function paintRock(context, shape) {
    var center = ROCK_SPRITE / 2;
    var reach = ROCK_SPRITE * .4;
    var corners = 7 + Math.floor(hash(shape, 1, 901) * 4);
    var turn = hash(shape, 2, 902) * TAU;
    var squash = .82 + hash(shape, 3, 903) * .18;
    var outerX = [], outerY = [], innerX = [], innerY = [];
    for (var i = 0; i < corners; i += 1) {
      var outerAngle = turn + (i + (hash(shape * 31 + i, 4, 904) - .5) * .5) / corners * TAU;
      var outerReach = reach * (.66 + hash(shape * 31 + i, 5, 904) * .34);
      outerX.push(center + Math.cos(outerAngle) * outerReach);
      outerY.push(center + Math.sin(outerAngle) * outerReach * squash);
      var innerAngle = turn + (i + .5) / corners * TAU;
      var innerReach = reach * (.3 + hash(shape * 31 + i, 6, 904) * .22);
      innerX.push(center + Math.cos(innerAngle) * innerReach);
      innerY.push(center + Math.sin(innerAngle) * innerReach * squash);
    }
    var peakX = center + (hash(shape, 8, 906) - .5) * reach * .3;
    var peakY = center + (hash(shape, 9, 906) - .5) * reach * .3;
    context.lineWidth = 1;
    context.lineJoin = "round";
    for (var corner = 0; corner < corners; corner += 1) {
      var next = (corner + 1) % corners;
      fillFacet(context, outerX[corner], outerY[corner], outerX[next], outerY[next], innerX[corner], innerY[corner],
        facetColor((outerX[corner] + outerX[next] + innerX[corner]) / 3, (outerY[corner] + outerY[next] + innerY[corner]) / 3, center, center, 1, shape * 53 + corner));
      fillFacet(context, outerX[next], outerY[next], innerX[next], innerY[next], innerX[corner], innerY[corner],
        facetColor((outerX[next] + innerX[next] + innerX[corner]) / 3, (outerY[next] + innerY[next] + innerY[corner]) / 3, center, center, .8, shape * 59 + corner));
      fillFacet(context, innerX[corner], innerY[corner], innerX[next], innerY[next], peakX, peakY,
        facetColor((innerX[corner] + innerX[next] + peakX) / 3, (innerY[corner] + innerY[next] + peakY) / 3, center, center, .45, shape * 61 + corner));
    }
  }

  function create(options) {
    options = options || {};
    var createCanvas = options.createCanvas || function () { return document.createElement("canvas"); };
    var assets = null, assetsFailed = false;

    function newCanvas(size) {
      var canvas = createCanvas();
      canvas.width = canvas.height = size;
      return canvas;
    }

    // Softens a painted rock; where canvas filters are missing it stays crisp instead of failing.
    function softened(source, blur) {
      var canvas = newCanvas(ROCK_SPRITE);
      var context = canvas.getContext("2d");
      if ("filter" in context) context.filter = "blur(" + blur + "px)";
      context.drawImage(source, 0, 0);
      return canvas;
    }

    function buildAssets() {
      if (assets || assetsFailed) return assets;
      try {
        var clouds = newCanvas(CLOUD_TILE);
        paintClouds(clouds.getContext("2d"));
        var near = [], far = [];
        for (var shape = 0; shape < ROCK_SHAPES; shape += 1) {
          var crisp = newCanvas(ROCK_SPRITE);
          paintRock(crisp.getContext("2d"), shape);
          near.push(softened(crisp, NEAR_LAYER.blur));
          far.push(softened(crisp, FAR_LAYER.blur));
        }
        assets = { clouds: clouds, near: near, far: far };
      } catch (error) {
        // No 2D canvas (test harness): the game keeps its plain background.
        assets = null;
        assetsFailed = true;
      }
      return assets;
    }

    function drawTiled(context, tile, size, offsetX, offsetY, width, height) {
      var startX = -(((offsetX % size) + size) % size);
      var startY = -(((offsetY % size) + size) % size);
      for (var x = startX; x < width; x += size) {
        for (var y = startY; y < height; y += size) context.drawImage(tile, x, y, size, size);
      }
    }

    function drawRocks(context, layer, sprites, width, height, cameraX, cameraY) {
      var reach = layer.spread + layer.maxSize;
      var originX = cameraX * layer.parallax - width / 2;
      var originY = cameraY * layer.parallax - height / 2;
      var firstX = Math.floor((originX - reach) / layer.cell);
      var lastX = Math.floor((originX + width + reach) / layer.cell);
      var firstY = Math.floor((originY - reach) / layer.cell);
      var lastY = Math.floor((originY + height + reach) / layer.cell);
      context.globalAlpha = layer.alpha;
      for (var cellX = firstX; cellX <= lastX; cellX += 1) {
        for (var cellY = firstY; cellY <= lastY; cellY += 1) {
          if (hash(cellX, cellY, layer.salt) > layer.chance) continue;
          var clusterX = cellX * layer.cell - originX + hash(cellX, cellY, layer.salt + 1) * layer.cell;
          var clusterY = cellY * layer.cell - originY + hash(cellX, cellY, layer.salt + 2) * layer.cell;
          var count = layer.minRocks + Math.floor(hash(cellX, cellY, layer.salt + 3) * (layer.maxRocks - layer.minRocks + 1));
          for (var rock = 0; rock < count; rock += 1) {
            var seedX = cellX * 13 + rock, seedY = cellY * 7 - rock;
            var angle = hash(seedX, seedY, layer.salt + 4) * TAU;
            var distance = Math.sqrt(hash(seedX, seedY, layer.salt + 5)) * layer.spread;
            var roll = hash(seedX, seedY, layer.salt + 6);
            var size = layer.minSize + Math.pow(roll, 1.5) * (layer.maxSize - layer.minSize);
            var sprite = sprites[Math.floor(hash(seedX, seedY, layer.salt + 7) * sprites.length)];
            // The sprite's rock fills 80% of its canvas, so it is drawn larger than the rock itself.
            var drawn = size / .8;
            context.drawImage(sprite, clusterX + Math.cos(angle) * distance - drawn / 2, clusterY + Math.sin(angle) * distance - drawn / 2, drawn, drawn);
          }
        }
      }
      context.globalAlpha = 1;
    }

    // Returns false when nothing could be drawn (no 2D canvas), so the caller keeps its plain background.
    function draw(context, width, height, cameraX, cameraY) {
      if (typeof context.drawImage !== "function") return false;
      var built = buildAssets();
      if (!built) return false;
      context.fillStyle = FIELD_TINT;
      context.fillRect(0, 0, width, height);
      var offsetX = cameraX * BACKDROP_PARALLAX, offsetY = cameraY * BACKDROP_PARALLAX;
      drawTiled(context, built.clouds, CLOUD_TILE * CLOUD_STRETCH, offsetX, offsetY, width, height);
      drawRocks(context, FAR_LAYER, built.far, width, height, cameraX, cameraY);
      drawRocks(context, NEAR_LAYER, built.near, width, height, cameraX, cameraY);
      return true;
    }

    return { draw: draw };
  }

  return Object.freeze({ create: create, PARALLAX: BACKDROP_PARALLAX });
});
