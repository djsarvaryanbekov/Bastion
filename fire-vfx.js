(function (root) {
  "use strict";

  var TAU = Math.PI * 2;
  var YELLOW = "#ffdd55", ORANGE = "#db401c";
  var colors = [];
  for (var step = 0; step < 32; step += 1) {
    var t = step / 31;
    var cooling = Math.max(0, (t - .72) / .28);
    var heat = Math.min(1, t / .72);
    colors.push("rgb(" + Math.round((255 - 36 * heat) * (1 - cooling) + 100 * cooling) + "," +
      Math.round((221 - 157 * heat) * (1 - cooling) + 94 * cooling) + "," +
      Math.round((85 - 57 * heat) * (1 - cooling) + 90 * cooling) + ")");
  }

  function clamp(value) { return Math.max(0, Math.min(1, value)); }
  function fraction(value) { return value - Math.floor(value); }

  // Local deterministic variation keeps drawing independent of combat RNG.
  function noise(seed) { return fraction(Math.sin(seed * 127.1 + 311.7) * 43758.5453); }

  function dot(ctx, x, y, radius, color, opacity) {
    if (!(radius > 0) || !(opacity > 0)) return;
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fill();
  }

  function begin(ctx) {
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = "source-over";
  }

  var burns = new WeakMap();
  var BURN_INTERVAL = .09, BURN_LIFETIME = .58;

  function emitBurn(state, enemy, radius, time, x, y, facing) {
    var seed = enemy.id * 17.17 + Math.round(time / BURN_INTERVAL) * 71;
    var angle = facing + noise(seed) * TAU;
    var reach = radius * (.12 + noise(seed + 1) * .42);
    var size = Math.min(6, Math.max(2.8, radius * .105));
    x += Math.cos(angle) * reach;
    y += Math.sin(angle) * reach;
    for (var i = 0; i < 3; i += 1) {
      var direction = noise(seed + 3 + i * 7) * TAU;
      var spread = 5 + noise(seed + 4 + i * 7) * 8;
      state.particles.push({
        born: time, x: x, y: y,
        dx: Math.cos(direction) * spread, dy: Math.sin(direction) * spread - 14,
        size: size * (.7 + noise(seed + 5 + i * 7) * .6),
        life: BURN_LIFETIME * (.8 + noise(seed + 6 + i * 7) * .2)
      });
    }
  }

  function burnParticles(enemy, radius, facing, time) {
    var state = burns.get(enemy);
    var elapsed = state ? time - state.time : 0;
    // Pooled enemies, time resets and offscreen gaps cannot inherit old trails.
    if (!state || state.id !== enemy.id || elapsed < 0 || elapsed > BURN_LIFETIME ||
        Math.hypot(enemy.x - state.x, enemy.y - state.y) > Math.max(160, radius * 4)) {
      state = { id: enemy.id, time: time, x: enemy.x, y: enemy.y, facing: facing,
        next: Math.floor(time / BURN_INTERVAL) + 1, particles: [] };
      burns.set(enemy, state);
      // Stagger birth ages so newly visible fire reads immediately, even paused.
      for (var warm = 4; warm >= 0; warm -= 1) {
        emitBurn(state, enemy, radius, (state.next - 1 - warm) * BURN_INTERVAL,
          enemy.x, enemy.y, facing);
      }
    } else if (elapsed > 0) {
      var turn = Math.atan2(Math.sin(facing - state.facing), Math.cos(facing - state.facing));
      while (state.next * BURN_INTERVAL <= time) {
        var born = state.next * BURN_INTERVAL;
        var progress = clamp((born - state.time) / elapsed);
        emitBurn(state, enemy, radius, born,
          state.x + (enemy.x - state.x) * progress,
          state.y + (enemy.y - state.y) * progress, state.facing + turn * progress);
        state.next += 1;
      }
      state.time = time; state.x = enemy.x; state.y = enemy.y; state.facing = facing;
    }
    var live = 0;
    for (var p = 0; p < state.particles.length; p += 1) {
      var particle = state.particles[p];
      if (time - particle.born < particle.life) state.particles[live++] = particle;
    }
    state.particles.length = live;
    return state.particles;
  }

  function hullFlame(ctx, x, y, size, age, opacity, lean) {
    // Rounded overlapping lobes churn into a smaller cinder as the fire cools.
    if (age >= .65) {
      dot(ctx, x, y, size, colors[Math.floor(age * 23)], opacity);
      return;
    }
    lean = Math.max(-size * .4, Math.min(size * .4, lean));
    ctx.globalAlpha = opacity;
    ctx.fillStyle = colors[Math.floor(.43 * 23 + age * 12)];
    ctx.beginPath();
    ctx.arc(x, y, size, 0, TAU);
    ctx.moveTo(x + lean + size * .65, y - size * .8);
    ctx.arc(x + lean, y - size * .8, size * .65, 0, TAU);
    ctx.fill();
    ctx.fillStyle = colors[Math.floor(age * 23)];
    ctx.beginPath();
    ctx.arc(x, y - size * .1, size * .55, 0, TAU);
    ctx.moveTo(x + lean * .6 + size * .36, y - size * .8);
    ctx.arc(x + lean * .6, y - size * .8, size * .36, 0, TAU);
    ctx.fill();
  }

  function burn(ctx, enemy, pos, radius, facing, time, zoom, detailed, reducedFlash) {
    if (enemy.dead || !(enemy.burnTimer > 0)) { burns.delete(enemy); return; }
    var fade = clamp(enemy.burnTimer / .25);
    var seed = enemy.id * 17.17;
    begin(ctx);
    if (detailed && !reducedFlash) {
      var particles = burnParticles(enemy, radius, facing, time);
      for (var i = 0; i < particles.length; i += 1) {
        var particle = particles[i];
        var age = clamp((time - particle.born) / particle.life);
        var size = Math.max(particle.size, 1.7 / zoom) * Math.pow(1 - age, .8);
        var alpha = Math.min(1, age * 15 + .25) * Math.min(1, (1 - age) * 4) * fade;
        hullFlame(ctx, pos.x + particle.x - enemy.x + particle.dx * age,
          pos.y + particle.y - enemy.y + particle.dy * age,
          size, age, alpha * .92, particle.dx * .08);
      }
    } else {
      burns.delete(enemy);
      // A few overlapping warm lobes retain the status without flashing or trails.
      var quietSize = Math.max(1.7 / zoom, Math.min(4.6, radius * .09));
      for (var mark = 0; mark < 3; mark += 1) {
        var angle = facing + noise(seed + mark) * TAU;
        var distance = radius * (.18 + noise(seed + mark + 9) * .28);
        var x = pos.x + Math.cos(angle) * distance, y = pos.y + Math.sin(angle) * distance;
        dot(ctx, x - quietSize * .5, y + quietSize * .25, quietSize, ORANGE, fade * .65);
        dot(ctx, x + quietSize * .45, y, quietSize * .8, "#ed7128", fade * .8);
        dot(ctx, x, y - quietSize * .45, quietSize * .65, "#ffbd48", fade * .85);
      }
    }
    ctx.restore();
  }

  function cone(ctx, effect, pos, reducedFlash, quality) {
    var age = 1 - clamp(effect.life / effect.maxLife);
    var fade = clamp(effect.life / (effect.maxLife * .2));
    var dx = Number.isFinite(effect.muzzleX) ? effect.muzzleX - effect.x : 0;
    var dy = Number.isFinite(effect.muzzleY) ? effect.muzzleY - effect.y : 0;
    var reach = Math.max(1, effect.radius - Math.hypot(dx, dy));
    var seed = effect.x * .37 + effect.y * .71 + effect.angle * 31 + (effect.value || 0) * 97;
    var sections = quality > 1 ? 10 : quality > 0 ? 14 : 18;
    var front = clamp(.12 + age * 5);
    var tail = clamp((age - .52) / .48);
    var flow = age * 9;
    var cos = Math.cos(effect.angle), sin = Math.sin(effect.angle);
    var opacity = fade * (reducedFlash ? .28 : .58);
    begin(ctx);
    // Both the muzzle offset and upgraded gameplay cone bound the spray.
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.arc(pos.x, pos.y, effect.radius, effect.angle - effect.width, effect.angle + effect.width);
    ctx.closePath();
    ctx.clip();
    // Overlapping puffs keep a connected jet; only its cooled tips break apart.
    for (var i = sections - 1; i >= 0; i -= 1) {
      var progress = (i + fraction(flow)) / sections;
      if (progress > front || progress < tail) continue;
      var particleSeed = seed + (i - Math.floor(flow)) * 19.19;
      var distance = progress * reach;
      var width = 3 + distance * Math.tan(Math.min(effect.width, 1.2)) * .42 * Math.pow(1 - progress, .35);
      var envelope = Math.min(1, (front - progress) * sections + .35) *
        Math.min(1, (progress - tail) * sections + .35);
      var heat = clamp(progress * .5 + Math.max(0, age - .65) * .7);
      var size = Math.min(Math.max((3.5 + width * .3) * (.8 + noise(particleSeed) * .4), reach / sections * .52),
        (1 - progress) * reach * .8 + 1);
      for (var lane = -1; lane <= 1; lane += 1) {
        var lateral = lane * width * .5 + Math.sin(progress * 12 - flow + lane * 2 + seed) * width * .12;
        dot(ctx, pos.x + dx + cos * distance - sin * lateral,
          pos.y + dy + sin * distance + cos * lateral,
          size * (lane ? .8 : 1), colors[Math.floor(clamp(heat + (lane ? .12 : .03)) * 31)],
          opacity * envelope * (lane ? .65 : 1));
      }
      if (progress < .65 && age < .8) {
        dot(ctx, pos.x + dx + cos * distance, pos.y + dy + sin * distance,
          size * .5, colors[Math.floor(heat * 20)], opacity * envelope * .75);
      }
    }
    // A short hot tongue belongs to emission, rather than a bead left at the nozzle.
    var nozzle = clamp(age * 15 + .4) * clamp((.62 - age) * 8);
    for (var tongue = 0; tongue < 4; tongue += 1) {
      var forward = tongue * 4 + 1;
      dot(ctx, pos.x + dx + cos * forward, pos.y + dy + sin * forward,
        3.8 - tongue * .55, tongue < 2 ? YELLOW : "#ffc04a", opacity * nozzle);
    }
    var tips = quality > 1 ? 3 : quality > 0 ? 5 : 8;
    for (var tip = 0; tip < tips; tip += 1) {
      var tipSeed = seed + tip * 37.7;
      var phase = age * 1.45 - noise(tipSeed) * .45;
      if (phase < 0 || phase >= 1) continue;
      var angle = effect.angle + (noise(tipSeed + 1) * 2 - 1) * effect.width * .88;
      var tipDistance = reach * phase;
      dot(ctx, pos.x + dx + Math.cos(angle) * tipDistance,
        pos.y + dy + Math.sin(angle) * tipDistance,
        (2 + noise(tipSeed + 2) * 2) * (1 - phase * .6), colors[Math.floor(phase * 31)],
        opacity * Math.min(1, phase * 8) * (1 - phase));
    }
    ctx.restore();
  }

  function ignition(ctx, x, y, zoom, time, reducedFlash) {
    begin(ctx);
    for (var side = -1; side <= 1; side += 2) {
      var yOffset = reducedFlash ? 0 : Math.sin(time * 12 + side) * 3;
      dot(ctx, x + side * 17, y + yOffset, 2.8 / zoom, ORANGE, .85);
      dot(ctx, x + side * 17, y + yOffset, 1.3 / zoom, YELLOW, .85);
    }
    ctx.restore();
  }

  function pellet(ctx, projectile, pos, time, reducedFlash) {
    var angle = Math.atan2(projectile.vy, projectile.vx) + Math.PI;
    begin(ctx);
    for (var i = 3; i >= 0; i -= 1) {
      var distance = i * 4;
      dot(ctx, pos.x + Math.cos(angle) * distance, pos.y + Math.sin(angle) * distance,
        2.8 - i * .45, i ? ORANGE : YELLOW, (1 - i * .2) * (reducedFlash ? .6 : .95));
    }
    ctx.restore();
  }

  function airburst(ctx, effect, pos, reducedFlash) {
    var fade = clamp(effect.life / effect.maxLife);
    var age = 1 - fade;
    begin(ctx);
    for (var i = 0; i < 20; i += 1) {
      var angle = noise(i + effect.x) * TAU;
      var radius = effect.maxRadius * Math.pow(age, .6) * (.25 + noise(i + 80) * .45);
      dot(ctx, pos.x + Math.cos(angle) * radius, pos.y + Math.sin(angle) * radius,
        (3 + noise(i + 30) * 4) * fade, colors[Math.floor(age * 31)], fade * (reducedFlash ? .4 : .9));
    }
    ctx.restore();
  }

  root.DriftFireVfx = { burn: burn, cone: cone, ignition: ignition, pellet: pellet, airburst: airburst };
})(window);
