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
  // The sparkle, specks and inner sphere of the reference were dropped as too busy over a full fight.
  // Everything derives from age and the blast's world position, so nothing is stored per blast.
  var TAU = Math.PI * 2;
  var SPRITE = 512;
  var SPHERE_STOPS = [[0, 232, 26, 46, .26], [.7, 238, 36, 50, .32], [.9, 255, 76, 66, .5], [.97, 255, 124, 96, .74], [1, 255, 124, 96, 0]];
  var GLOW_STOPS = [[0, 255, 210, 130, .75], [.4, 255, 130, 72, .42], [1, 255, 60, 60, 0]];

  // Blob simulation: lobes start together and drift apart; the field is the sum of r^2/d^2.
  var BLOB_GRID = 72;
  var BLOB_EXTENT = .62;
  var BLOB_LOBES = 4;
  var BLOB_LIFE = .7;
  // Lobes leave mostly along one direction, so the blob stretches and splits unevenly, never symmetric.
  var LOBE_HEADINGS = [0, .55, -.85, 2.9];
  // Kept faint and compact: many blasts overlap in late waves.
  var SPHERE_OPACITY = .5;
  var GLOW_OPACITY = .45;
  var BLOB_SCALE = .7;
  var BLOB_OPACITY = .85;
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

  function sprites() {
    if (!art && typeof document !== "undefined") {
      art = { sphere: paintRadial(SPHERE_STOPS), glow: paintRadial(GLOW_STOPS) };
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
    ctx.globalAlpha = SPHERE_OPACITY * (1 - Math.pow(clamp((age - .4) / .6), 1.2));
    stamp(ctx, images.sphere, pos.x, pos.y, radius * (.9 + .1 * easeOut(age / .07) + .06 * easeOut(age)));
    if (age < BLOB_LIFE) {
      var blobAlpha = simulateBlob(age, seedX, seedY);
      var heat = 1 - clamp(age / .3);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = heat * flash * GLOW_OPACITY;
      stamp(ctx, images.glow, pos.x, pos.y, radius * .8 * BLOB_SCALE);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = blobAlpha * BLOB_OPACITY * (reducedFlash ? .8 : 1);
      ctx.imageSmoothingEnabled = true;
      var blobRadius = radius * BLOB_EXTENT * BLOB_SCALE;
      ctx.drawImage(blobCanvas, pos.x - blobRadius, pos.y - blobRadius, blobRadius * 2, blobRadius * 2);
    }
    ctx.restore();
    return true;
  }

  return Object.freeze({ draw: draw });
});
