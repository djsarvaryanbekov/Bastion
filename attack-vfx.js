(function (root) {
  "use strict";

  var TAU = Math.PI * 2;
  var MAX_MUZZLES = 64;
  var TRAIL_SAMPLES = 10;
  var projectileTypes = ["cannon", "scatter", "missile", "cryo"];
  var sheets = Object.create(null);
  var ready = Promise.all((root.ATTACK_VFX_SHEETS || []).map(function (spec) {
    var image = new root.Image();
    var entry = { spec: spec, image: image, loaded: false };
    sheets[spec.module] = entry;
    image.src = spec.data;
    // A failed sheet keeps the procedural renderer available for that attack.
    return image.decode().then(function () {
      entry.loaded = image.naturalWidth > 0;
      return { module: spec.module, loaded: entry.loaded };
    }, function () {
      return { module: spec.module, loaded: false };
    });
  }));

  function clamp(value) { return Math.max(0, Math.min(1, value)); }
  function available(type) { return Boolean(sheets[type] && sheets[type].loaded); }

  function stamp(ctx, type, frame, x, y, width, height, angle) {
    var entry = sheets[type];
    var spec = entry.spec;
    var cell = entry.image.naturalWidth / spec.frames;
    frame = Math.max(0, Math.min(spec.frames - 1, Math.floor(frame)));
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((angle || 0) + Math.PI / 2);
    ctx.drawImage(entry.image, frame * cell, 0, cell, entry.image.naturalHeight,
      -spec.anchor[0] / spec.width * width, -spec.anchor[1] / spec.height * height, width, height);
    ctx.restore();
  }

  function radialStamp(ctx, type, frame, x, y, size) {
    stamp(ctx, type, frame, x, y, size, size, -Math.PI / 2);
  }

  function AttackVfx() {
    // Each run owns its cosmetics, including a run suspended by the Test Range.
    this.trails = new WeakMap();
    this.muzzleFlashes = [];
    this.enabled = true;
  }

  AttackVfx.prototype.shoot = function (type, origin, nx, ny) {
    if (projectileTypes.indexOf(type) < 0) return;
    if (this.muzzleFlashes.length >= MAX_MUZZLES) this.muzzleFlashes.shift();
    this.muzzleFlashes.push({
      type: type, x: origin.x + nx * 20, y: origin.y + ny * 20,
      angle: Math.atan2(ny, nx), life: .09, maxLife: .09
    });
  };

  AttackVfx.prototype.update = function (dt) {
    var write = 0;
    for (var i = 0; i < this.muzzleFlashes.length; i += 1) {
      var muzzle = this.muzzleFlashes[i];
      muzzle.life -= dt;
      if (muzzle.life > 0) this.muzzleFlashes[write++] = muzzle;
    }
    this.muzzleFlashes.length = write;
  };

  AttackVfx.prototype.resetProjectile = function (projectile) {
    this.trails.delete(projectile);
  };

  AttackVfx.prototype.sampleProjectiles = function (projectiles) {
    for (var i = 0; i < projectiles.length; i += 1) {
      var projectile = projectiles[i];
      if (projectile.kind !== "missile" || projectile.life <= 0) continue;
      var trail = this.trails.get(projectile);
      if (!trail) {
        trail = { x: new Float32Array(TRAIL_SAMPLES), y: new Float32Array(TRAIL_SAMPLES), count: 0, head: 0 };
        this.trails.set(projectile, trail);
      }
      trail.x[trail.head] = projectile.x;
      trail.y[trail.head] = projectile.y;
      trail.head = (trail.head + 1) % TRAIL_SAMPLES;
      trail.count = Math.min(TRAIL_SAMPLES, trail.count + 1);
    }
  };

  AttackVfx.prototype.projectile = function (ctx, projectile, pos, time, quality, reducedFlash) {
    if (!this.enabled || projectileTypes.indexOf(projectile.kind) < 0 || !available(projectile.kind)) return false;
    var angle = Math.atan2(projectile.vy, projectile.vx);
    var frame = Math.floor(time * 24) % sheets[projectile.kind].spec.frames;
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = reducedFlash ? .78 : 1;
    if (projectile.kind === "missile") {
      var trail = this.trails.get(projectile);
      if (trail && trail.count > 1) {
        var limit = quality > 0 ? 5 : TRAIL_SAMPLES;
        for (var i = 1; i < Math.min(limit, trail.count); i += 1) {
          var index = (trail.head - 1 - i + TRAIL_SAMPLES) % TRAIL_SAMPLES;
          var freshness = 1 - i / TRAIL_SAMPLES;
          var next = (index + 1) % TRAIL_SAMPLES;
          ctx.globalAlpha = freshness * .22;
          ctx.strokeStyle = "#b1a69b";
          ctx.lineWidth = 2 + (1 - freshness) * 3;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(pos.x + trail.x[index] - projectile.x, pos.y + trail.y[index] - projectile.y);
          ctx.lineTo(pos.x + trail.x[next] - projectile.x, pos.y + trail.y[next] - projectile.y);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = reducedFlash ? .78 : 1;
      stamp(ctx, "missile", frame, pos.x, pos.y, 18, 27, angle);
    } else if (projectile.kind === "cryo") {
      stamp(ctx, "cryo", frame, pos.x, pos.y, 23, 23, angle);
    } else if (projectile.kind === "scatter") {
      stamp(ctx, "scatter", frame, pos.x, pos.y, 12, 12, angle);
    } else {
      stamp(ctx, "cannon", frame, pos.x, pos.y, 18, 18, angle);
    }
    ctx.restore();
    return true;
  };

  AttackVfx.prototype.effect = function (ctx, effect, pos, reducedFlash) {
    if (!this.enabled || (effect.type !== "flameCone" && effect.type !== "ring")) return false;
    var type = effect.type === "flameCone" ? "ember" : effect.weaponType;
    if (["ember", "pulse", "flak", "missile"].indexOf(type) < 0 || !available(type === "missile" ? "flak" : type)) return false;
    var alpha = clamp(effect.life / effect.maxLife);
    var age = 1 - alpha;
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = alpha * (reducedFlash ? .65 : 1);
    if (type === "ember") {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = clamp(effect.life / (effect.maxLife * .35)) * (reducedFlash ? .6 : 1);
      // The texture cannot imply damage outside the actual flame cone.
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.arc(pos.x, pos.y, effect.radius, effect.angle - effect.width, effect.angle + effect.width);
      ctx.closePath();
      ctx.clip();
      var reach = effect.radius * (.5 + .5 * Math.min(1, age * 5));
      stamp(ctx, "ember", Math.min(7, Math.floor(age * 8)), pos.x, pos.y,
        reach * 2 * Math.sin(effect.width), reach * 128 / 116, effect.angle);
    } else if (type === "pulse") {
      var radius = Math.max(5, effect.radius);
      var scale = radius * 256 / 104;
      radialStamp(ctx, "pulse", age * 6, pos.x, pos.y, scale);
      ctx.globalAlpha = alpha * .22;
      radialStamp(ctx, "pulse", age * 6, pos.x, pos.y, scale * .88);
    } else if (type === "flak") {
      radialStamp(ctx, "flak", age * 8, pos.x, pos.y, Math.min(150, effect.maxRadius * 1.2));
    } else {
      var blastRadius = Math.max(5, effect.radius);
      radialStamp(ctx, "flak", age * 8, pos.x, pos.y, Math.min(effect.maxRadius * 2, blastRadius * 2.3));
    }
    ctx.restore();
    return true;
  };

  AttackVfx.prototype.field = function (ctx, field, pos, reducedFlash, quality) {
    if (!this.enabled || !available("gravity")) return false;
    var age = field.maxLife - field.life;
    var fade = clamp(age / .13) * clamp(field.life / .25);
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = "#c8a2ff";
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = fade * .35;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, field.radius, 0, TAU);
    ctx.stroke();
    var count = quality > 0 ? 8 : 14;
    for (var i = 0; i < count; i += 1) {
      var progress = (age * .85 + i / count) % 1;
      var radius = field.radius * (1 - progress);
      var angle = i * 2.39996 + progress * .9;
      var x = pos.x + Math.cos(angle) * radius;
      var y = pos.y + Math.sin(angle) * radius;
      ctx.globalAlpha = fade * Math.sin(progress * Math.PI) * (reducedFlash ? .5 : .9);
      stamp(ctx, "gravity", Math.floor(age * 16 + i) % 4, x, y, 24, 36, angle + Math.PI + .35);
    }
    ctx.globalAlpha = fade * .8;
    ctx.fillStyle = "#111e2d";
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#d4bdff";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 6 + Math.sin(age * 10) * .6, age * 2, age * 2 + Math.PI * 1.6);
    ctx.stroke();
    ctx.restore();
    return true;
  };

  AttackVfx.prototype.muzzles = function (ctx, screen, reducedFlash) {
    if (!this.enabled) return;
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = "source-over";
    for (var i = 0; i < this.muzzleFlashes.length; i += 1) {
      var muzzle = this.muzzleFlashes[i];
      var pos = screen(muzzle.x, muzzle.y);
      var alpha = muzzle.life / muzzle.maxLife;
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(muzzle.angle);
      ctx.globalAlpha = alpha * (reducedFlash ? .5 : .9);
      ctx.fillStyle = muzzle.type === "cryo" ? "#d8f6ff" : muzzle.type === "cannon" ? "#d4faff" : "#ffe1b3";
      ctx.beginPath();
      ctx.ellipse(2, 0, muzzle.type === "scatter" ? 11 : 7, muzzle.type === "scatter" ? 5 : 2.7, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  };

  root.DriftAttackVfx = { ready: ready, create: function () { return new AttackVfx(); } };
})(window);
