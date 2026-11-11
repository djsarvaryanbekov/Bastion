(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DriftSpaceBackdrop = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";

  // The battlefield backdrop, modelled on Space Scavenger's (research/backgrounds-2026-11-11):
  //   - a deep blue field with dark smoky clouds and near-black corners;
  //   - a dense dust of tiny pale stars;
  //   - clusters of dark rocks built from facets, each facet lit a little differently, with soft edges;
  //   - a few larger, darker, blurrier rocks behind them.
  // Everything moves only with the camera, at a fraction of its speed, so it reads as distant.
  // The game draws its own grid on top.
  var TAU = Math.PI * 2;

  var FIELD_WASH = [0, 24, 74];
  var FIELD_WASH_ALPHA = .5;
  var VIGNETTE_COLOR = [0, 1, 6];
  var VIGNETTE_ALPHA = .5;

  // Clouds are painted once at low resolution and stretched, which is what makes them soft.
  var CLOUD_TILE = 256;
  var CLOUD_STRETCH = 8;
  var CLOUD_PARALLAX = .07;
  var CLOUD_COLOR = [0, 0, 0];
  var CLOUD_MAX_ALPHA = .42;

  var DUST_TILE = 1024;
  var DUST_PARALLAX = .09;
  var DUST_COUNT = 1200;

  var ROCK_SPRITE = 128;
  var ROCK_SHAPES = 18;
  // Facet tones from shaded to lit, measured against a field of about rgb(1,19,55).
  var ROCK_DARK = [1, 5, 21];
  var ROCK_LIGHT = [10, 20, 46];
  var LIGHT_X = -.62, LIGHT_Y = -.78;

  var FAR_LAYER = { parallax: .11, cell: 560, chance: .7, minRocks: 1, maxRocks: 3, spread: 240, minSize: 120, maxSize: 210, alpha: .5, blur: 4, salt: 300 };
  var NEAR_LAYER = { parallax: .18, cell: 360, chance: .9, minRocks: 4, maxRocks: 10, spread: 200, minSize: 36, maxSize: 96, alpha: 1, blur: 1.1, salt: 500 };

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

  function paintClouds(context) {
    var image = context.createImageData(CLOUD_TILE, CLOUD_TILE);
    var data = image.data;
    for (var y = 0; y < CLOUD_TILE; y += 1) {
      for (var x = 0; x < CLOUD_TILE; x += 1) {
        var u = x / CLOUD_TILE, v = y / CLOUD_TILE;
        var value = tileNoise(u * 4, v * 4, 4, 701) * .55 + tileNoise(u * 8, v * 8, 8, 702) * .3 + tileNoise(u * 16, v * 16, 16, 703) * .15;
        // Only the upper part of the noise becomes cloud, leaving open blue between the patches.
        var density = Math.max(0, Math.min(1, (value - .46) / .3));
        density = density * density * (3 - 2 * density);
        var index = (y * CLOUD_TILE + x) * 4;
        data[index] = CLOUD_COLOR[0];
        data[index + 1] = CLOUD_COLOR[1];
        data[index + 2] = CLOUD_COLOR[2];
        data[index + 3] = Math.round(density * CLOUD_MAX_ALPHA * 255);
      }
    }
    context.putImageData(image, 0, 0);
  }

  function paintDust(context) {
    context.clearRect(0, 0, DUST_TILE, DUST_TILE);
    for (var i = 0; i < DUST_COUNT; i += 1) {
      var x = hash(i, 1, 801) * DUST_TILE;
      var y = hash(i, 2, 802) * DUST_TILE;
      var kind = hash(i, 3, 803);
      var brightness = hash(i, 4, 804);
      // Most specks are barely there; a few are clear points of light.
      var alpha = .1 + brightness * brightness * .55;
      var size = brightness > .93 ? 2.2 : (brightness > .6 ? 1.5 : 1);
      context.fillStyle = kind < .68 ? "rgba(150,196,232," + alpha + ")" : (kind < .9 ? "rgba(92,214,204," + alpha + ")" : "rgba(236,244,255," + alpha + ")");
      context.fillRect(x, y, size, size);
    }
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
    var wash = null, vignette = null, fieldWidth = 0, fieldHeight = 0;

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
        var dust = newCanvas(DUST_TILE);
        paintDust(dust.getContext("2d"));
        var near = [], far = [];
        for (var shape = 0; shape < ROCK_SHAPES; shape += 1) {
          var crisp = newCanvas(ROCK_SPRITE);
          paintRock(crisp.getContext("2d"), shape);
          near.push(softened(crisp, NEAR_LAYER.blur));
          far.push(softened(crisp, FAR_LAYER.blur));
        }
        assets = { clouds: clouds, dust: dust, near: near, far: far };
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

    // A screen-sized layer of one colour whose alpha follows a radial falloff.
    // Canvas gradients are dithered with a fixed pattern; stacked on the game's own gradient they add up
    // to visible stripes. Random per-pixel rounding here turns that into fine, invisible grain.
    function paintFalloff(width, height, color, centerY, alphaAt) {
      var canvas = createCanvas();
      canvas.width = width;
      canvas.height = height;
      var context = canvas.getContext("2d");
      var image = context.createImageData(width, height);
      var data = image.data;
      var centerX = width * .5;
      centerY *= height;
      var index = 0;
      for (var y = 0; y < height; y += 1) {
        var dy = y - centerY;
        for (var x = 0; x < width; x += 1) {
          var dx = x - centerX;
          data[index] = color[0];
          data[index + 1] = color[1];
          data[index + 2] = color[2];
          data[index + 3] = Math.floor(alphaAt(Math.sqrt(dx * dx + dy * dy)) * 255 + Math.random());
          index += 4;
        }
      }
      context.putImageData(image, 0, 0);
      return canvas;
    }

    function prepareField(width, height) {
      if (wash && fieldWidth === width && fieldHeight === height) return;
      var washRadius = Math.max(width, height) * .62;
      wash = paintFalloff(width, height, FIELD_WASH, .46, function (distance) {
        var t = Math.min(1, distance / washRadius);
        return t < .6 ? FIELD_WASH_ALPHA * (1 - t / .6 * .55) : FIELD_WASH_ALPHA * .45 * (1 - (t - .6) / .4);
      });
      var vignetteStart = Math.min(width, height) * .42;
      var vignetteEnd = Math.max(width, height) * .72;
      vignette = paintFalloff(width, height, VIGNETTE_COLOR, .5, function (distance) {
        return VIGNETTE_ALPHA * Math.max(0, Math.min(1, (distance - vignetteStart) / (vignetteEnd - vignetteStart)));
      });
      fieldWidth = width;
      fieldHeight = height;
    }

    // Returns false when nothing could be drawn (no 2D canvas), so the caller keeps its plain background.
    function draw(context, width, height, cameraX, cameraY) {
      if (typeof context.drawImage !== "function") return false;
      var built = buildAssets();
      if (!built) return false;
      prepareField(Math.round(width), Math.round(height));
      context.drawImage(wash, 0, 0, width, height);
      drawTiled(context, built.clouds, CLOUD_TILE * CLOUD_STRETCH, cameraX * CLOUD_PARALLAX, cameraY * CLOUD_PARALLAX, width, height);
      drawTiled(context, built.dust, DUST_TILE, cameraX * DUST_PARALLAX, cameraY * DUST_PARALLAX, width, height);
      drawRocks(context, FAR_LAYER, built.far, width, height, cameraX, cameraY);
      drawRocks(context, NEAR_LAYER, built.near, width, height, cameraX, cameraY);
      context.drawImage(vignette, 0, 0, width, height);
      return true;
    }

    return { draw: draw };
  }

  return Object.freeze({ create: create });
});
