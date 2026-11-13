(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DriftMissileBlastVfx = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";

  // Missile Pod blast, matched to Nova Drift's explosions as they move in its launch trailer at 20 fps
  // (research/missile-blast-2026-11-12/REFERENCES.md, video/thumbs/blast-20fps.jpg).
  //   - A faint see-through sphere at the damage radius, brighter at its rim, that keeps growing a little
  //     while it fades.
  //   - A hot blob simulated as metaballs: lobes drift apart and stay fused like liquid, burn white-yellow,
  //     then cool to a pink puff. It is computed on a small grid each frame and drawn scaled up.
  //   - A smaller bright sphere that swells around the cooling blob.
  //   - A flickering four-point sparkle and a few specks thrown out with drag.
  // Everything derives from age and the blast's world position, so nothing is stored per blast.
  var TAU = Math.PI * 2;
  var SPRITE = 512;
  var SPHERE_STOPS = [[0, 232, 26, 46, .26], [.7, 238, 36, 50, .32], [.9, 255, 76, 66, .5], [.97, 255, 124, 96, .74], [1, 255, 124, 96, 0]];
  var INNER_STOPS = [[0, 255, 62, 74, .42], [.8, 255, 78, 84, .5], [.95, 255, 150, 132, .82], [1, 255, 150, 132, 0]];
  var GLOW_STOPS = [[0, 255, 210, 130, .75], [.4, 255, 130, 72, .42], [1, 255, 60, 60, 0]];
  var SPARKLE_REACH = .62;

  // Blob simulation: lobes start together and drift apart; the field is the sum of r^2/d^2.
  var BLOB_GRID = 72;
  var BLOB_EXTENT = .62;
  var BLOB_LOBES = 4;
  var BLOB_LIFE = .7;
  // Lobes leave mostly along one direction, so the blob stretches and splits unevenly, never symmetric.
  var LOBE_HEADINGS = [0, .55, -.85, 2.9];
  var DEBRIS_COUNT = 9;
  var art = null, blobCanvas = null, blobContext = null, blobImage = null;

  function clamp(value) { return Math.max(0, Math.min(1, value)); }
  function easeOut(value) { var t = clamp(value); return 1 - (1 - t) * (1 - t) * (1 - t); }
  function mix(a, b, t) { return a + (b - a) * t; }

  function hash(x, y, salt) {
    var h = (Math.round(x * 7) * 374761393 + Math.round(y * 7) * 668265263 + salt * 1274126177) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function newCanvas(size) {
    var canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    return canvas;
  }

  function paintRadial(stops) {
    var canvas = newCanvas(SPRITE), context = canvas.getContext("2d"), c = SPRITE / 2, r = SPRITE / 2 - 2;
    var fill = context.createRadialGradient(c, c, 0, c, c, r);
    stops.forEach(function (stop) { fill.addColorStop(stop[0], "rgba(" + stop[1] + "," + stop[2] + "," + stop[3] + "," + stop[4] + ")"); });
    context.fillStyle = fill;
    context.beginPath(); context.arc(c, c, r, 0, TAU); context.fill();
    return canvas;
  }

  function paintSparkle() {
    var canvas = newCanvas(SPRITE), context = canvas.getContext("2d"), c = SPRITE / 2;
    context.globalCompositeOperation = "lighter";
    [[0, 1, .012], [Math.PI / 2, 1, .012], [Math.PI / 4, .45, .008], [Math.PI * 3 / 4, .45, .008]].forEach(function (spike) {
      for (var side = -1; side <= 1; side += 2) {
        var length = c * spike[1] * side;
        var endX = c + Math.cos(spike[0]) * length, endY = c + Math.sin(spike[0]) * length;
        var gradient = context.createLinearGradient(c, c, endX, endY);
        gradient.addColorStop(0, "rgba(255,252,236,.95)");
        gradient.addColorStop(1, "rgba(255,220,160,0)");
        context.strokeStyle = gradient;
        context.lineWidth = SPRITE * spike[2];
        context.lineCap = "round";
        context.beginPath(); context.moveTo(c, c); context.lineTo(endX, endY); context.stroke();
      }
    });
    return canvas;
  }

  function sprites() {
    if (!art && typeof document !== "undefined") {
      art = { sphere: paintRadial(SPHERE_STOPS), inner: paintRadial(INNER_STOPS), glow: paintRadial(GLOW_STOPS), sparkle: paintSparkle() };
      blobCanvas = newCanvas(BLOB_GRID);
      // A CPU-backed context: its pixels are rewritten every frame, which a GPU canvas handles badly.
      blobContext = blobCanvas.getContext("2d", { willReadFrequently: true });
      blobImage = blobContext.createImageData(BLOB_GRID, BLOB_GRID);
    }
    return art;
  }

  function stamp(ctx, image, x, y, radius, angle) {
    if (!angle) {
      ctx.drawImage(image, x - radius, y - radius, radius * 2, radius * 2);
      return;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.drawImage(image, -radius, -radius, radius * 2, radius * 2);
    ctx.restore();
  }

  // Hot colour by field strength and cooling: white core, yellow, orange edge; cooling turns it pink-white.
  function blobColor(field, cool, out) {
    var heat = clamp((field - 1) / .7);
    var hotR = 255, hotG = mix(150, 252, heat), hotB = mix(70, 236, heat * heat);
    var coolR = 255, coolG = mix(150, 228, heat), coolB = mix(150, 222, heat);
    out[0] = mix(hotR, coolR, cool);
    out[1] = mix(hotG, coolG, cool);
    out[2] = mix(hotB, coolB, cool);
    // Inside the surface the blob is solid; just outside it a short soft edge.
    out[3] = field >= 1 ? 1 : clamp((field - .86) / .14);
  }

  var lobeX = new Float64Array(BLOB_LOBES), lobeY = new Float64Array(BLOB_LOBES), lobeR = new Float64Array(BLOB_LOBES);
  var color = [0, 0, 0, 0];

  // Simulates the blob for this moment into the shared grid, in units of the blast radius.
  function simulateBlob(age, seedX, seedY) {
    var t = clamp(age / BLOB_LIFE);
    var drift = easeOut(t / .8);
    for (var i = 0; i < BLOB_LOBES; i += 1) {
      var angle = hash(seedX, seedY, 19) * TAU + LOBE_HEADINGS[i] + (hash(seedX, seedY, 20 + i) - .5) * .5;
      // The main lobe barely moves; the others pull away until they separate.
      var reach = (i === 0 ? .06 : .17 + .14 * hash(seedX, seedY, 30 + i)) * drift;
      lobeX[i] = Math.cos(angle) * reach;
      lobeY[i] = Math.sin(angle) * reach;
      // Lobes start large and fused, then shrink at different rates.
      var size = (i === 0 ? .17 : .1 + .045 * hash(seedX, seedY, 40 + i)) * (1.12 - .82 * t * (.75 + .5 * hash(seedX, seedY, 50 + i)));
      lobeR[i] = size * size;
    }
    var cool = clamp((t - .4) / .35);
    var data = blobImage.data, cell = BLOB_EXTENT * 2 / BLOB_GRID, index = 0;
    for (var gy = 0; gy < BLOB_GRID; gy += 1) {
      var y = -BLOB_EXTENT + (gy + .5) * cell;
      for (var gx = 0; gx < BLOB_GRID; gx += 1) {
        var x = -BLOB_EXTENT + (gx + .5) * cell, field = 0;
        for (var lobe = 0; lobe < BLOB_LOBES; lobe += 1) {
          var dx = x - lobeX[lobe], dy = y - lobeY[lobe];
          field += lobeR[lobe] / (dx * dx + dy * dy + 1e-4);
        }
        blobColor(field, cool, color);
        data[index] = color[0]; data[index + 1] = color[1]; data[index + 2] = color[2];
        data[index + 3] = Math.round(color[3] * 255);
        index += 4;
      }
    }
    blobContext.putImageData(blobImage, 0, 0);
    return 1 - Math.pow(clamp((t - .55) / .45), 1.3);
  }

  function drawDebris(ctx, pos, age, radius, seedX, seedY) {
    var alpha = 1 - clamp((age - .15) / .5);
    if (alpha <= 0) return;
    ctx.fillStyle = "#ff8a6a";
    for (var i = 0; i < DEBRIS_COUNT; i += 1) {
      var angle = hash(seedX, seedY, 60 + i) * TAU;
      // Fast at first, slowed by drag: distance follows 1 - e^(-k t).
      var travel = radius * (.35 + .5 * hash(seedX, seedY, 70 + i)) * (1 - Math.exp(-age * 7));
      var size = 2 + hash(seedX, seedY, 80 + i) * 2.5;
      ctx.globalAlpha = alpha;
      ctx.fillRect(pos.x + Math.cos(angle) * travel - size / 2, pos.y + Math.sin(angle) * travel - size / 2, size, size);
    }
  }

  // age runs 0..1 over the effect's life; radius is the damage radius in the canvas units of pos;
  // seedX/seedY (the blast's world position) make each blast's blob and debris different.
  function draw(ctx, pos, age, radius, reducedFlash, seedX, seedY) {
    var images = sprites();
    if (!images) return false;
    seedX = seedX || 0; seedY = seedY || 0;
    var flash = reducedFlash ? .55 : 1;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    // Big sphere: reaches the damage radius almost at once, keeps swelling a little, fades in the second half.
    ctx.globalAlpha = 1 - Math.pow(clamp((age - .4) / .6), 1.2);
    stamp(ctx, images.sphere, pos.x, pos.y, radius * (.9 + .1 * easeOut(age / .07) + .06 * easeOut(age)));
    // Inner sphere swells around the cooling blob.
    var inner = clamp((age - .12) / .1) * (1 - clamp((age - .42) / .25));
    if (inner > 0) {
      ctx.globalAlpha = inner;
      stamp(ctx, images.inner, pos.x, pos.y, radius * (.22 + .3 * easeOut((age - .12) / .4)));
    }
    drawDebris(ctx, pos, age, radius, seedX, seedY);
    if (age < BLOB_LIFE) {
      var blobAlpha = simulateBlob(age, seedX, seedY);
      var heat = 1 - clamp(age / .3);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = heat * flash;
      stamp(ctx, images.glow, pos.x, pos.y, radius * .8);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = blobAlpha * (reducedFlash ? .8 : 1);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(blobCanvas, pos.x - radius * BLOB_EXTENT, pos.y - radius * BLOB_EXTENT, radius * BLOB_EXTENT * 2, radius * BLOB_EXTENT * 2);
      var sparkle = 1 - clamp(age / .22);
      if (sparkle > 0) {
        ctx.globalCompositeOperation = "lighter";
        // Flicker and a slow turn, as the reference sparkle shimmers frame to frame.
        ctx.globalAlpha = sparkle * flash * (.75 + .25 * Math.sin(age * 90 + seedX));
        stamp(ctx, images.sparkle, pos.x, pos.y, radius * SPARKLE_REACH, hash(seedX, seedY, 7) * TAU + age * 1.6);
      }
    }
    ctx.restore();
    return true;
  }

  return Object.freeze({ draw: draw });
});
