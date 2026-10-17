(function (root) {
  "use strict";

  var TAU = Math.PI * 2;
  var CYAN = "#6ecdec", PALE = "#dcfaff";
  var surfaces = new WeakMap(), emissions = new WeakMap();
  var INTERVAL = .12, LIFETIME = .66;

  function clamp(value) { return Math.max(0, Math.min(1, value)); }
  function noise(seed) {
    var value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return value - Math.floor(value);
  }

  function facet(ctx, x, y, size, angle, opacity, frozen) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(angle);
    ctx.globalAlpha = opacity;
    ctx.fillStyle = frozen ? PALE : "#a9e7f2";
    ctx.beginPath();
    ctx.moveTo(-size, -size * .2);
    ctx.lineTo(-size * .35, -size * .7);
    ctx.lineTo(size * .7, -size * .5);
    ctx.lineTo(size, size * .15);
    ctx.lineTo(size * .1, size * .65);
    ctx.lineTo(-size * .7, size * .5);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = opacity * .7;
    ctx.strokeStyle = PALE;
    ctx.lineWidth = Math.max(.65, size * .08);
    ctx.beginPath();
    ctx.moveTo(-size * .75, -size * .1);
    ctx.lineTo(size * .15, size * .15);
    ctx.lineTo(size * .65, -size * .35);
    ctx.stroke();
    ctx.restore();
  }

  function frostSurface(surface, radius, frozen) {
    if (!surface || !surface.sprite || !(surface.sprite.width > 0)) return null;
    var pair = surfaces.get(surface.sprite);
    if (!pair) { pair = []; surfaces.set(surface.sprite, pair); }
    var index = frozen ? 1 : 0;
    if (pair[index]) return pair[index];
    var canvas = root.document.createElement("canvas");
    canvas.width = surface.sprite.width; canvas.height = surface.sprite.height;
    var ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return null;
    var scale = canvas.width / surface.size;
    ctx.setTransform(scale, 0, 0, scale, canvas.width * .5, canvas.height * .5);
    ctx.fillStyle = frozen ? "rgba(110,205,236,.24)" : "rgba(110,205,236,.10)";
    ctx.fillRect(-surface.half, -surface.half, surface.size, surface.size);
    var count = frozen ? 13 : 8;
    for (var i = 0; i < count; i += 1) {
      var seed = radius * 1.7 + i * 19;
      facet(ctx, (noise(seed) - .5) * radius * 1.35,
        (noise(seed + 1) - .5) * radius * 1.15,
        radius * (.10 + noise(seed + 2) * .12) * (frozen ? 1.25 : 1),
        noise(seed + 3) * TAU, frozen ? .52 : .34, frozen);
    }
    // Clip the frost to the actual cached artwork, including transparent holes.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(surface.sprite, 0, 0);
    pair[index] = canvas;
    return canvas;
  }

  function emit(state, enemy, radius, born, x, y, facing, frozen) {
    var seed = enemy.id * 23.17 + Math.round(born / INTERVAL) * 61;
    var along = (noise(seed) - .5) * radius * .95;
    var across = (noise(seed + 1) - .5) * radius * .55;
    x += Math.cos(facing) * along - Math.sin(facing) * across;
    y += Math.sin(facing) * along + Math.cos(facing) * across;
    for (var i = 0; i < 2; i += 1) {
      var angle = noise(seed + 2 + i * 7) * TAU;
      state.particles.push({ x: x, y: y, born: born, frozen: frozen,
        dx: Math.cos(angle) * 7, dy: Math.sin(angle) * 7 - 5,
        size: Math.min(2.6, Math.max(1.4, radius * .05)) * (.8 + noise(seed + 3 + i * 7) * .4) });
    }
  }

  function particlesFor(enemy, radius, facing, time, frozen) {
    var state = emissions.get(enemy), dt = state ? time - state.time : 0;
    if (!state || state.id !== enemy.id || dt < 0 || dt > LIFETIME ||
        Math.hypot(enemy.x - state.x, enemy.y - state.y) > Math.max(160, radius * 4)) {
      state = { id: enemy.id, time: time, x: enemy.x, y: enemy.y, facing: facing,
        next: Math.floor(time / INTERVAL) + 1, particles: [] };
      emissions.set(enemy, state);
      for (var warm = 4; warm >= 0; warm -= 1) {
        emit(state, enemy, radius, (state.next - 1 - warm) * INTERVAL,
          enemy.x, enemy.y, facing, frozen);
      }
    } else if (dt > 0) {
      var turn = Math.atan2(Math.sin(facing - state.facing), Math.cos(facing - state.facing));
      while (state.next * INTERVAL <= time) {
        var born = state.next * INTERVAL, progress = clamp((born - state.time) / dt);
        emit(state, enemy, radius, born, state.x + (enemy.x - state.x) * progress,
          state.y + (enemy.y - state.y) * progress, state.facing + turn * progress, frozen);
        state.next += 1;
      }
      state.time = time; state.x = enemy.x; state.y = enemy.y; state.facing = facing;
    }
    var live = 0;
    for (var p = 0; p < state.particles.length; p += 1) {
      var particle = state.particles[p];
      if (time - particle.born < LIFETIME) state.particles[live++] = particle;
    }
    state.particles.length = live;
    return state.particles;
  }

  function draw(ctx, enemy, pos, radius, facing, time, elapsed, zoom, detailed, reducedFlash, surface) {
    var frozen = enemy.type !== "boss" && elapsed < (enemy.freezeUntil || 0);
    var chilled = enemy.slowTimer > 0 && enemy.slowFactor < 1;
    if (enemy.dead || (!chilled && !frozen)) { emissions.delete(enemy); return; }
    var slowFade = chilled ? clamp(enemy.slowTimer / .4) : 0;
    var freezeFade = frozen ? clamp((enemy.freezeUntil - elapsed) / .12) : 0;
    var fade = Math.max(slowFade, freezeFade);
    var hitVisibility = 1 - clamp((enemy.hitFlash || 0) / .1) * .7;
    var frost = frostSurface(surface, radius, false);
    ctx.save();
    ctx.shadowBlur = 0; ctx.globalCompositeOperation = "source-over";
    ctx.save(); ctx.translate(pos.x, pos.y); ctx.rotate(facing);
    if (frost) {
      var opacity = fade * hitVisibility * (reducedFlash ? .85 : 1);
      if (freezeFade < 1) {
        ctx.globalAlpha = opacity * (1 - freezeFade);
        ctx.drawImage(frost, -surface.half, -surface.half, surface.size, surface.size);
      }
      if (frozen) {
        ctx.globalAlpha = opacity * freezeFade;
        ctx.drawImage(frostSurface(surface, radius, true), -surface.half, -surface.half, surface.size, surface.size);
      }
    } else {
      for (var mark = 0; mark < (frozen ? 5 : 3); mark += 1) {
        var seed = enemy.id * 9 + mark * 13;
        facet(ctx, (noise(seed) - .5) * radius * .9, (noise(seed + 1) - .5) * radius * .6,
          Math.max(2 / zoom, Math.min(8, radius * .15)), noise(seed + 2) * TAU,
          fade * hitVisibility * (.35 + freezeFade * .2), frozen);
      }
    }
    ctx.restore();
    if (detailed && !reducedFlash) {
      var particles = particlesFor(enemy, radius, facing, time, frozen);
      for (var i = 0; i < particles.length; i += 1) {
        var particle = particles[i], age = clamp((time - particle.born) / LIFETIME);
        ctx.globalAlpha = fade * Math.min(1, age * 12 + .3) * .75;
        ctx.fillStyle = particle.frozen ? PALE : CYAN;
        ctx.beginPath();
        ctx.arc(pos.x + particle.x - enemy.x + particle.dx * age,
          pos.y + particle.y - enemy.y + particle.dy * age,
          Math.max(1.25 / zoom, particle.size) * (1 - age), 0, TAU);
        ctx.fill();
      }
    } else emissions.delete(enemy);
    ctx.restore();
  }

  function shatter(ctx, effect, pos, reducedFlash, quality) {
    var fade = clamp(effect.life / effect.maxLife), age = 1 - fade;
    var count = reducedFlash || quality > 1 ? 3 : quality > 0 ? 5 : 7;
    ctx.save();
    ctx.globalCompositeOperation = "source-over"; ctx.shadowBlur = 0;
    ctx.translate(pos.x, pos.y); ctx.rotate(effect.angle);
    for (var i = 0; i < count; i += 1) {
      var angle = i * TAU / count + .37;
      var reach = effect.radius * (.12 + age * (.52 + noise(i + 1) * .2));
      var size = (2.2 + noise(i + 7) * 2) * (1 - age * .65);
      facet(ctx, Math.cos(angle) * reach, Math.sin(angle) * reach,
        size, angle + age * .8, fade * (reducedFlash ? .45 : .85), true);
    }
    ctx.globalAlpha = fade * (reducedFlash ? .35 : .75);
    ctx.strokeStyle = PALE; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-effect.radius * .25, -3);
    ctx.lineTo(-2, 2); ctx.lineTo(3, -2);
    ctx.lineTo(effect.radius * .3, 4);
    ctx.moveTo(-2, 2); ctx.lineTo(1, effect.radius * .25);
    ctx.stroke(); ctx.restore();
  }

  function blast(ctx, effect, pos, reducedFlash, quality) {
    var fade = clamp(effect.life / effect.maxLife), age = 1 - fade;
    var count = reducedFlash || quality > 1 ? 5 : quality > 0 ? 8 : 12;
    var radius = Math.max(0, effect.maxRadius - 5);
    ctx.save();
    ctx.shadowBlur = 0; ctx.globalCompositeOperation = "source-over";
    ctx.translate(pos.x, pos.y);
    ctx.fillStyle = CYAN;
    ctx.globalAlpha = fade * fade * (reducedFlash ? .10 : .20);
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * (.18 + age * .55), radius * (.14 + age * .48), .3, 0, TAU);
    ctx.fill();
    for (var i = 0; i < count; i += 1) {
      var angle = i * TAU / count + noise(i + 31) * .3;
      var reach = radius * (.12 + age * .78) * (.65 + noise(i + 41) * .35);
      facet(ctx, Math.cos(angle) * reach, Math.sin(angle) * reach,
        (2.2 + noise(i + 51) * 2) * (1 - age * .45), angle + age * .6,
        fade * (reducedFlash ? .40 : .75), true);
    }
    ctx.restore();
  }

  root.DriftColdVfx = { draw: draw, shatter: shatter, blast: blast };
})(window);
