(function (root, factory) {
  "use strict";
  var api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.DriftModulePreview = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";

  var TYPES = ["cannon", "laser", "missile", "scatter", "arc", "rail", "flak", "pulse", "cryo", "mine", "ember", "gravity", "shield", "repair", "reactor", "collector", "armor", "bulkhead"];
  var WIDTH = 540, HEIGHT = 300, UNIT = .55, TILE = 36;
  var LIMITS = { enemies: 8, projectiles: 64, effects: 48 };
  var SPEEDS = { cannon: 560, missile: 180, scatter: 520, rail: 900, cryo: 500, mine: 220 };
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function number(value) { return String(Math.round(value * 100) / 100); }
  function percent(value) { return number(value * 100) + "%"; }

  function describe(type, definitions) {
    var def = definitions && definitions[type];
    if (!def || TYPES.indexOf(type) < 0) return null;
    var stats = [];
    function stat(label, value) { stats.push({ label: label, value: String(value) }); }
    if (def.cooldown) { stat("Reload", number(def.cooldown) + " s"); stat("Range", def.range); stat(type === "gravity" ? "Field damage" : "Damage", type === "gravity" ? def.damage + "/s" : def.damage); }
    if (type === "scatter") stat("Pellets", def.pellets);
    if (type === "arc") stat("Chain targets", def.chains);
    if (type === "cryo") stat("Slow", percent(1 - def.slowFactor) + " for " + def.slowDuration + " s");
    if (type === "ember") stat("Burn", def.burnDuration + " s");
    if (type === "gravity") stat("Field", def.fieldDuration + " s");
    if (type === "shield") { stat("Charge", def.shield); stat("Coverage", def.shieldRadius + " cells"); stat("Recharge", "+" + def.rechargeRate + "/s after " + def.rechargeDelay + " s"); }
    if (type === "repair") { stat("Repair", "+" + def.repairAmount + " HP / " + def.repairInterval + " s"); stat("Safe delay", def.repairDelay + " s"); stat("Coverage", def.repairRadius + " cells"); }
    if (type === "reactor") stat("Adjacent fire rate", "+" + percent(def.cooldownBonus));
    if (type === "drive") stat("Thrust, speed, turn", "+" + percent(def.driveBonus));
    if (type === "collector") stat("Kill income", "+" + percent(def.matterBonus));
    if (type === "bulkhead") stat("Adjacent damage", "−" + percent(def.damageReduction));
    if (type === "armor" || type === "bulkhead") stat("Hull", def.hp);
    return { title: def.name, summary: def.summary, stats: stats };
  }

  function createScene(type, definitions) {
    var def = copy(definitions[type]);
    var scene = { type: type, def: def, time: 0, shotClock: .35, incomingClock: .25, supportClock: 0,
      modules: [], enemies: [], projectiles: [], effects: [], field: null, nextId: 1, emptyTime: 0,
      charge: def.shield || 0, chargeDelay: 0, cycleShots: 0, cycleTime: 0,
      counters: { shots: 0, hits: 0, kills: 0, intercepted: 0, slowed: 0, burnDamage: 0, pulled: 0,
        absorbed: 0, recharged: 0, repaired: 0, reduced: 0, income: 0, boostedShots: 0, normalShots: 0 } };
    function tile(kind, x, y, label) {
      var config = definitions[kind] || { hp: 100, color: "#effaff", glyph: "▲" };
      var module = { type: kind, x: x, y: y, hp: config.hp, maxHp: config.hp, color: config.color,
        glyph: config.glyph, label: label || "", cooldown: .35, flash: 0 };
      scene.modules.push(module); return module;
    }
    var support = TYPES.indexOf(type) >= 12;
    var origin = type === "pulse" ? { x: 270, y: 150 } : { x: support ? 220 : 98, y: 150 };
    tile("core", origin.x - TILE, origin.y);
    scene.main = tile(type, origin.x, origin.y);
    if (["shield", "repair", "bulkhead"].indexOf(type) >= 0) tile("cannon", origin.x + TILE, origin.y);
    if (type === "shield") tile("armor", origin.x, origin.y + TILE);
    if (type === "repair") scene.modules.forEach(function (module) { if (module !== scene.main) module.hp *= .45; });
    if (type === "reactor") {
      tile("cannon", 256, 150, "Adjacent");
      tile("core", 220, 235);
      tile("cannon", 256, 235, "No reactor");
    }
    if (type === "drive") {
      scene.modules[0].x = 62; scene.modules[0].y = 95;
      scene.main.x = 98; scene.main.y = 95;
      tile("core", 62, 215, "No drive");
    }
    if (type === "collector") tile("cannon", 256, 150);
    scene.weapon = definitions.cannon ? copy(definitions.cannon) : null;
    populate(scene);
    return scene;
  }

  function populate(scene) {
    var type = scene.type, origin = scene.main;
    var offsets = [[140, 0], [175, -40], [200, 40]];
    if (type === "laser" || type === "rail") offsets = [[130, 0], [200, 0], [260, 0]];
    if (type === "scatter") offsets = [[105, 0], [115, -16], [115, 16]];
    if (type === "arc") offsets = [[125, -8], [155, 40], [190, -10], [230, 38]];
    if (type === "ember") offsets = [[65, 0], [80, -26], [90, 35]];
    if (type === "gravity" || type === "missile") offsets = [[145, 0], [175, -24], [178, 23]];
    if (type === "pulse") offsets = [[80, 0], [0, -80], [-75, 35], [35, 80]];
    if (type === "mine" || type === "cryo") offsets = [[150, 0], [185, 38]];
    if (type === "reactor") offsets = [[225, 0], [225, 85]];
    if (type === "collector") offsets = [[175, 0], [215, 28]];
    if (TYPES.indexOf(type) >= 12 && type !== "reactor" && type !== "collector") offsets = [];
    if (["shield", "armor", "bulkhead"].indexOf(type) >= 0) offsets = [[240, 0]];
    scene.enemies = offsets.slice(0, LIMITS.enemies).map(function (offset, index) {
      var hp = type === "collector" ? 24 : Math.max(42, (scene.def.damage || 12) * 1.6);
      return { id: scene.nextId++, x: origin.x + offset[0], y: origin.y + offset[1], homeY: origin.y + offset[1],
        hp: hp, maxHp: hp, radius: 11, slow: 0, burn: 0, flash: 0, index: index };
    });
  }

  function effect(scene, kind, x, y, properties) {
    if (scene.effects.length >= LIMITS.effects) scene.effects.shift();
    var item = Object.assign({ kind: kind, x: x, y: y, life: .45, maxLife: .45, color: scene.def.color }, properties || {});
    item.maxLife = item.life; scene.effects.push(item); return item;
  }

  function hit(scene, enemy, amount) {
    if (enemy.hp <= 0) return;
    enemy.hp = Math.max(0, enemy.hp - amount); enemy.flash = .2; scene.counters.hits += 1;
    if (enemy.hp <= 0) {
      scene.counters.kills += 1;
      effect(scene, "burst", enemy.x, enemy.y, { radius: 24, color: "#ff897c" });
      if (scene.type === "collector") {
        scene.counters.income += 10 * (1 + scene.def.matterBonus);
        effect(scene, "income", enemy.x, enemy.y, { x2: scene.main.x, y2: scene.main.y, life: .9, text: "+" + percent(scene.def.matterBonus) + " Matter" });
      }
    }
  }

  function blast(scene, point, radius, amount) {
    effect(scene, "ring", point.x, point.y, { radius: radius });
    scene.enemies.forEach(function (enemy) { if (distance(point, enemy) <= radius) hit(scene, enemy, amount); });
  }

  function projectile(scene, origin, target, kind, damage, angleOffset) {
    if (scene.projectiles.length >= LIMITS.projectiles) return;
    var angle = Math.atan2(target.y - origin.y, target.x - origin.x) + (angleOffset || 0);
    var speed = (SPEEDS[kind] || 180) * UNIT;
    scene.projectiles.push({ kind: kind, x: origin.x + Math.cos(angle) * 17, y: origin.y + Math.sin(angle) * 17,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, speed: speed, damage: damage,
      target: target.id, life: kind === "mine" ? 6 : 3.5, age: 0, hits: [], trail: [], hostile: false });
  }

  function fire(scene, origin, target, type, def) {
    scene.counters.shots += 1; origin.flash = .18;
    if (type === "laser") {
      var angle = Math.atan2(target.y - origin.y, target.x - origin.x);
      var end = { x: origin.x + Math.cos(angle) * def.range * UNIT, y: origin.y + Math.sin(angle) * def.range * UNIT };
      effect(scene, "beam", origin.x, origin.y, { x2: end.x, y2: end.y, life: .18, width: 4 });
      scene.enemies.forEach(function (enemy) {
        var dx = enemy.x - origin.x, dy = enemy.y - origin.y;
        var along = dx * Math.cos(angle) + dy * Math.sin(angle);
        if (along > 0 && along <= def.range * UNIT && Math.abs(dx * Math.sin(angle) - dy * Math.cos(angle)) <= enemy.radius + 6) hit(scene, enemy, def.damage);
      });
    } else if (type === "arc") {
      var points = [{ x: origin.x, y: origin.y }], visited = [], current = target;
      for (var link = 0; current && link < def.chains; link += 1) {
        points.push({ x: current.x, y: current.y }); visited.push(current.id);
        hit(scene, current, def.damage * Math.pow(.82, link));
        var from = current;
        current = scene.enemies.filter(function (enemy) { return enemy.hp > 0 && visited.indexOf(enemy.id) < 0 && distance(enemy, from) <= def.jumpRange * UNIT; })
          .sort(function (a, b) { return distance(a, from) - distance(b, from); })[0];
      }
      effect(scene, "arc", origin.x, origin.y, { points: points, life: .32 });
    } else if (type === "pulse") blast(scene, origin, def.range * UNIT, def.damage);
    else if (type === "ember") {
      var facing = Math.atan2(target.y - origin.y, target.x - origin.x);
      effect(scene, "cone", origin.x, origin.y, { angle: facing, spread: def.coneAngle, radius: def.range * UNIT, life: .35 });
      scene.enemies.forEach(function (enemy) {
        var delta = Math.atan2(enemy.y - origin.y, enemy.x - origin.x) - facing;
        if (distance(origin, enemy) <= def.range * UNIT && Math.abs(Math.atan2(Math.sin(delta), Math.cos(delta))) <= def.coneAngle) {
          hit(scene, enemy, def.damage); enemy.burn = def.burnDuration;
        }
      });
    } else if (type === "gravity") {
      scene.field = { x: target.x, y: target.y, life: def.fieldDuration, radius: def.fieldRadius * UNIT };
      effect(scene, "beam", origin.x, origin.y, { x2: target.x, y2: target.y, width: 2 });
    } else if (type === "flak") {
      effect(scene, "beam", origin.x, origin.y, { x2: target.x, y2: target.y, width: 2 });
      blast(scene, target, def.blastRadius * UNIT, def.damage);
      scene.projectiles.forEach(function (shot) {
        if (shot.hostile && shot.life > 0 && distance(shot, target) <= def.blastRadius * UNIT) { shot.life = 0; scene.counters.intercepted += 1; }
      });
    } else if (type === "scatter") {
      for (var pellet = 0; pellet < def.pellets; pellet += 1) projectile(scene, origin, target, type, def.damage, (pellet - (def.pellets - 1) / 2) * def.spread / Math.max(1, def.pellets - 1));
    } else projectile(scene, origin, target, type, def.damage);
  }

  function updateShots(scene, dt) {
    scene.projectiles.forEach(function (shot) {
      if (shot.life <= 0) return;
      shot.life -= dt; shot.age += dt;
      if (shot.kind === "missile") {
        shot.trail.push({ x: shot.x, y: shot.y }); if (shot.trail.length > 24) shot.trail.shift();
        var target = scene.enemies.find(function (enemy) { return enemy.id === shot.target && enemy.hp > 0; });
        if (target) {
          var range = Math.max(1, distance(shot, target)), steering = 1 - Math.exp(-5 * dt);
          shot.vx += ((target.x - shot.x) / range * shot.speed - shot.vx) * steering;
          shot.vy += ((target.y - shot.y) / range * shot.speed - shot.vy) * steering;
        }
      }
      if (shot.kind === "mine") { shot.vx *= Math.exp(-2.4 * dt); shot.vy *= Math.exp(-2.4 * dt); }
      shot.x += shot.vx * dt; shot.y += shot.vy * dt;
      if (shot.hostile) {
        if (shot.x > shot.stopX) return;
        shot.life = 0;
        if (scene.type === "flak") { effect(scene, "burst", scene.main.x, scene.main.y, { radius: 20, color: "#ff897c" }); return; }
        var module = scene.modules[shot.moduleIndex], damage = shot.damage;
        if (scene.type === "shield") scene.chargeDelay = scene.def.rechargeDelay;
        if (scene.type === "shield" && scene.charge > 0) {
          var absorbed = Math.min(scene.charge, damage); scene.charge -= absorbed; damage -= absorbed;
          scene.counters.absorbed += absorbed;
          effect(scene, "ring", scene.main.x, scene.main.y, { radius: scene.def.shieldRadius * TILE, text: "Blocked" });
        }
        if (scene.type === "bulkhead") { scene.counters.reduced += damage * scene.def.damageReduction; damage *= 1 - scene.def.damageReduction; }
        module.hp = Math.max(1, module.hp - damage); module.flash = .25;
        if (damage > 0) effect(scene, "burst", module.x, module.y, { radius: 20, color: "#ff897c" });
        return;
      }
      scene.enemies.forEach(function (enemy) {
        if (shot.life <= 0 || enemy.hp <= 0 || shot.hits.indexOf(enemy.id) >= 0) return;
        if (shot.kind === "mine" && shot.age < .35) return;
        var radius = shot.kind === "mine" ? 64 * UNIT : enemy.radius + 5;
        if (distance(shot, enemy) > radius) return;
        if (shot.kind === "missile" || shot.kind === "mine") {
          blast(scene, shot, (scene.def.blastRadius || 74) * UNIT, shot.damage); shot.life = 0;
        } else {
          hit(scene, enemy, shot.damage); shot.hits.push(enemy.id);
          if (shot.kind === "cryo") { enemy.slow = scene.def.slowDuration; scene.counters.slowed += 1; }
          if (shot.kind !== "rail") shot.life = 0;
        }
      });
    });
    scene.projectiles = scene.projectiles.filter(function (shot) { return shot.life > 0 && shot.x < WIDTH + 20 && shot.x > -20 && shot.y > -20 && shot.y < HEIGHT + 20; });
  }

  function incoming(scene, dt) {
    if (["flak", "shield", "armor", "bulkhead"].indexOf(scene.type) < 0) return;
    scene.incomingClock -= dt; scene.cycleTime += dt;
    if (scene.type === "shield" && scene.cycleShots >= 4) {
      if (scene.charge >= scene.def.shield && scene.projectiles.every(function (shot) { return !shot.hostile; })) { scene.cycleShots = 0; scene.incomingClock = 1; }
      return;
    }
    if (scene.incomingClock > 0 || scene.projectiles.length >= LIMITS.projectiles) return;
    var shooter = scene.enemies.find(function (enemy) { return enemy.hp > 0; });
    if (!shooter) return;
    scene.incomingClock = scene.type === "flak" ? .6 : 1.2; scene.cycleShots += 1;
    var moduleIndex = scene.type === "armor" || scene.type === "flak" ? 1 : 2;
    var target = scene.modules[moduleIndex] || scene.main;
    scene.projectiles.push({ kind: "hostile", hostile: true, x: shooter.x - 12,
      y: scene.type === "flak" ? shooter.y : target.y, vx: -100, vy: 0,
      stopX: target.x + 17, moduleIndex: moduleIndex, damage: 20, life: 5, age: 0, hits: [] });
    if (scene.type !== "shield" && target.hp < 25) target.hp = target.maxHp;
  }

  function updateSupport(scene, dt) {
    var type = scene.type, def = scene.def;
    if (type === "shield") {
      var recharge = Math.max(0, dt - scene.chargeDelay);
      scene.chargeDelay = Math.max(0, scene.chargeDelay - dt);
      var recovered = Math.min(def.shield - scene.charge, def.rechargeRate * recharge);
      scene.charge += recovered; scene.counters.recharged += recovered;
    }
    if (type === "repair") {
      scene.supportClock -= dt;
      if (scene.time < def.repairDelay || scene.supportClock > 0) return;
      scene.supportClock = def.repairInterval;
      scene.modules.forEach(function (module) {
        if (distance(module, scene.main) > def.repairRadius * TILE || module.hp >= module.maxHp) return;
        var amount = Math.min(def.repairAmount, module.maxHp - module.hp);
        module.hp += amount; module.flash = .25; scene.counters.repaired += amount;
      });
      effect(scene, "ring", scene.main.x, scene.main.y, { radius: def.repairRadius * TILE, text: "+" + def.repairAmount + " HP" });
      if (scene.modules.every(function (module) { return module.hp >= module.maxHp; })) {
        scene.modules[0].hp = scene.modules[0].maxHp * .45; scene.supportClock = def.repairDelay;
      }
    }
    if (type === "drive") {
      var travel = scene.time % 8 * 36;
      scene.modules[0].x = 62 + travel * (1 + def.driveBonus);
      scene.main.x = 98 + travel * (1 + def.driveBonus);
      scene.modules[2].x = 62 + travel;
    }
  }

  function advance(scene, dt) {
    scene.time += dt;
    scene.effects.forEach(function (item) { item.life -= dt; });
    scene.effects = scene.effects.filter(function (item) { return item.life > 0; });
    scene.modules.forEach(function (module) { module.flash = Math.max(0, module.flash - dt); });
    scene.enemies.forEach(function (enemy) {
      if (enemy.hp <= 0) return;
      enemy.flash = Math.max(0, enemy.flash - dt);
      if (enemy.burn > 0) { var burning = Math.min(dt, enemy.burn); enemy.burn -= burning; scene.counters.burnDamage += scene.def.burnDamage * burning; hit(scene, enemy, scene.def.burnDamage * burning); }
      var slowed = enemy.slow > 0; enemy.slow = Math.max(0, enemy.slow - dt);
      if (scene.type === "cryo" || scene.type === "mine") enemy.x = Math.max(scene.main.x + 30, enemy.x - 28 * (slowed ? scene.def.slowFactor : 1) * dt);
      if (scene.type === "missile") enemy.y = enemy.homeY + Math.sin(scene.time * 1.3 + enemy.index) * 20;
      if (scene.field && scene.field.life > 0 && distance(enemy, scene.field) < scene.field.radius) {
        var range = Math.max(1, distance(enemy, scene.field)), pull = Math.min(Math.max(0, range - 8), scene.def.pullStrength * UNIT * dt);
        enemy.x += (scene.field.x - enemy.x) / range * pull; enemy.y += (scene.field.y - enemy.y) / range * pull;
        scene.counters.pulled += pull; hit(scene, enemy, scene.def.damage * dt);
      }
    });
    if (scene.field) { scene.field.life -= dt; if (scene.field.life <= 0) scene.field = null; }
    incoming(scene, dt); updateSupport(scene, dt);
    var weapons = scene.type === "reactor" || scene.type === "collector" ? scene.modules.filter(function (module) { return module.type === "cannon"; }) : [scene.main];
    weapons.forEach(function (module) {
      var type = module.type, def = type === "cannon" && scene.type !== "cannon" ? scene.weapon : scene.def;
      if (!def || !def.cooldown) return;
      var boosted = scene.type === "reactor" && Math.max(Math.abs(module.x - scene.main.x), Math.abs(module.y - scene.main.y)) === TILE;
      module.cooldown -= dt * (boosted ? 1 + scene.def.cooldownBonus : 1);
      if (module.cooldown > 0) return;
      var targets = type === "flak" ? scene.projectiles.filter(function (shot) { return shot.hostile && shot.life > 0; }) : [];
      if (!targets.length) targets = scene.enemies.filter(function (enemy) { return enemy.hp > 0; });
      targets = targets.filter(function (target) { return distance(module, target) <= def.range * UNIT; }).sort(function (a, b) { return distance(module, a) - distance(module, b); });
      if (!targets.length) return;
      module.cooldown = def.cooldown;
      fire(scene, module, targets[0], type, def);
      if (scene.type === "reactor") scene.counters[boosted ? "boostedShots" : "normalShots"] += 1;
    });
    updateShots(scene, dt);
    if (scene.enemies.length && scene.enemies.every(function (enemy) { return enemy.hp <= 0; })) {
      scene.emptyTime += dt;
      if (scene.emptyTime >= 1.2) { populate(scene); scene.emptyTime = 0; }
    }
  }

  function renderScene(context, scene, width, height, drawIcon) {
    var scale = Math.min(width / WIDTH, height / HEIGHT);
    context.fillStyle = "#07131e"; context.fillRect(0, 0, width, height);
    context.save(); context.translate((width - WIDTH * scale) / 2, (height - HEIGHT * scale) / 2); context.scale(scale, scale);
    context.lineWidth = 1; context.strokeStyle = "#203442";
    for (var gridX = 0; gridX < WIDTH; gridX += TILE) { context.beginPath(); context.moveTo(gridX, 0); context.lineTo(gridX, HEIGHT); context.stroke(); }
    for (var gridY = 0; gridY < HEIGHT; gridY += TILE) { context.beginPath(); context.moveTo(0, gridY); context.lineTo(WIDTH, gridY); context.stroke(); }
    function circle(x, y, radius, color, fill) { context.beginPath(); context.arc(x, y, radius, 0, Math.PI * 2); context[fill ? "fillStyle" : "strokeStyle"] = color; context[fill ? "fill" : "stroke"](); }
    function label(text, x, y, color, align) { context.fillStyle = color || "#adc2cd"; context.font = "600 " + Math.max(14, 11 / scale) + "px system-ui"; context.textAlign = align || "center"; context.fillText(text, x, y); }
    var def = scene.def, origin = scene.main;
    if (scene.type === "shield" || scene.type === "repair") {
      var radius = (def.shieldRadius || def.repairRadius) * TILE;
      circle(origin.x, origin.y, radius, "#70ffc214", true);
      context.setLineDash(scene.type === "shield" && scene.charge <= 0 ? [5, 6] : []);
      circle(origin.x, origin.y, radius, def.color); context.setLineDash([]);
    }
    if (scene.type === "reactor" || scene.type === "bulkhead") {
      context.fillStyle = def.color + "20";
      (scene.type === "reactor" ? [[TILE,0],[-TILE,0],[0,TILE],[0,-TILE],[TILE,TILE],[-TILE,TILE],[TILE,-TILE],[-TILE,-TILE]] : [[TILE,0],[-TILE,0],[0,TILE],[0,-TILE]]).forEach(function (offset) { context.fillRect(origin.x + offset[0] - 18, origin.y + offset[1] - 18, 36, 36); });
    }
    // Static guide remains legible when reduced motion pauses the first frame.
    if (scene.time === 0 && scene.enemies.length) {
      context.setLineDash([5, 6]); context.strokeStyle = def.color; context.beginPath(); context.moveTo(origin.x + 20, origin.y);
      context.lineTo(scene.enemies[0].x - 15, scene.enemies[0].y); context.stroke(); context.setLineDash([]);
    }
    if (scene.field) {
      circle(scene.field.x, scene.field.y, scene.field.radius, "#c8a2ff20", true); circle(scene.field.x, scene.field.y, scene.field.radius, def.color);
      for (var orbit = 0; orbit < 3; orbit += 1) { var angle = scene.time * 2 + orbit * Math.PI * 2 / 3; circle(scene.field.x + Math.cos(angle) * 20, scene.field.y + Math.sin(angle) * 20, 3, def.color, true); }
    }
    scene.effects.forEach(function (item) {
      context.globalAlpha = clamp(item.life / item.maxLife, 0, 1); context.strokeStyle = item.color; context.fillStyle = item.color;
      if (item.kind === "beam" || item.kind === "arc") {
        context.lineWidth = item.width || 3; context.beginPath(); context.moveTo(item.x, item.y);
        if (item.points) item.points.slice(1).forEach(function (point, index) { var previous = item.points[index]; context.lineTo((previous.x + point.x) / 2, (previous.y + point.y) / 2 + (index % 2 ? 8 : -8)); context.lineTo(point.x, point.y); });
        else context.lineTo(item.x2, item.y2);
        context.stroke();
      } else if (item.kind === "cone") {
        context.beginPath(); context.moveTo(item.x, item.y); context.arc(item.x, item.y, item.radius, item.angle - item.spread, item.angle + item.spread); context.closePath(); context.globalAlpha *= .35; context.fill();
      } else if (item.kind === "income") {
        var t = 1 - item.life / item.maxLife; circle(item.x + (item.x2 - item.x) * t, item.y + (item.y2 - item.y) * t, 5, item.color, true);
        label(item.text, scene.main.x, 95, item.color);
      } else { context.lineWidth = 3; circle(item.x, item.y, Math.max(2, item.radius * (1 - item.life / item.maxLife)), item.color); }
      context.globalAlpha = 1; context.lineWidth = 1;
    });
    scene.modules.forEach(function (module) {
      context.fillStyle = module.flash > 0 ? "#456473" : "#132937"; context.strokeStyle = module.color; context.lineWidth = module === scene.main ? 2 : 1;
      context.fillRect(module.x - 16, module.y - 16, 32, 32); context.strokeRect(module.x - 16, module.y - 16, 32, 32);
      if (drawIcon) { context.save(); drawIcon(context, module.type, module.x, module.y, 22, module.color); context.restore(); }
      else label(module.type === "core" ? "▲" : module.glyph, module.x, module.y + 6, module.color);
      context.fillStyle = "#253a44"; context.fillRect(module.x - 15, module.y + 20, 30, 3);
      context.fillStyle = module.hp < module.maxHp * .5 ? "#ff897c" : "#70ffc2"; context.fillRect(module.x - 15, module.y + 20, 30 * module.hp / module.maxHp, 3);
      if (module.label) label(module.label, module.x, module.y - 28);
    });
    scene.enemies.forEach(function (enemy) {
      if (enemy.hp <= 0) return;
      context.fillStyle = enemy.flash > 0 ? "#fff1d9" : enemy.slow > 0 ? "#8ac7ff" : "#ef756f";
      context.beginPath(); context.moveTo(enemy.x - 12, enemy.y); context.lineTo(enemy.x + 10, enemy.y - 10); context.lineTo(enemy.x + 6, enemy.y); context.lineTo(enemy.x + 10, enemy.y + 10); context.closePath(); context.fill();
      if (enemy.burn > 0) circle(enemy.x, enemy.y, 17, "#ff7547");
      if (enemy.slow > 0) label("Slow", enemy.x, enemy.y - 24, "#8ac7ff");
      context.fillStyle = "#58302d"; context.fillRect(enemy.x - 13, enemy.y + 15, 26, 3); context.fillStyle = "#ffad8c"; context.fillRect(enemy.x - 13, enemy.y + 15, 26 * enemy.hp / enemy.maxHp, 3);
    });
    scene.projectiles.forEach(function (shot) {
      var color = shot.hostile ? "#ff897c" : def.color;
      if (shot.trail && shot.trail.length) {
        context.strokeStyle = color; context.lineWidth = 1; context.globalAlpha = .45;
        context.beginPath(); context.moveTo(shot.trail[0].x, shot.trail[0].y);
        shot.trail.slice(1).forEach(function (point) { context.lineTo(point.x, point.y); }); context.stroke(); context.globalAlpha = 1;
      }
      if (shot.kind === "mine") { circle(shot.x, shot.y, 6, color, true); context.setLineDash([3, 4]); circle(shot.x, shot.y, 64 * UNIT, color); context.setLineDash([]); }
      else {
        var length = shot.kind === "rail" ? 25 : shot.kind === "missile" ? 14 : 8;
        var angle = Math.atan2(shot.vy, shot.vx); context.strokeStyle = color; context.lineWidth = shot.kind === "rail" ? 4 : 3; context.beginPath(); context.moveTo(shot.x, shot.y); context.lineTo(shot.x - Math.cos(angle) * length, shot.y - Math.sin(angle) * length); context.stroke();
      }
    });
    var status = "Your ship";
    if (scene.type === "shield") status = "Shield " + Math.ceil(scene.charge) + " / " + def.shield + (scene.chargeDelay > 0 ? " · Waiting " + Math.ceil(scene.chargeDelay) + "s" : scene.charge < def.shield ? " · Recharging" : " · Ready");
    if (scene.type === "repair") status = scene.time < def.repairDelay ? "Quiet for " + def.repairDelay + "s before repair" : "+" + def.repairAmount + " HP repair pulses";
    if (scene.type === "drive") status = "+" + percent(def.driveBonus) + " thrust, speed and turn";
    if (scene.type === "bulkhead") status = "Adjacent hull takes " + percent(def.damageReduction) + " less damage";
    if (scene.type === "armor") status = "Outer armor takes the hit";
    if (scene.type === "reactor") status = "+" + percent(def.cooldownBonus) + " fire rate next to the reactor";
    if (scene.type === "flak") status = "Intercepted shots: " + scene.counters.intercepted;
    label(status, WIDTH / 2, 282, def.color);
    context.restore();
  }

  function create(options) {
    options = options || {};
    var canvas = options.canvas, definitions = options.definitions;
    if (!canvas || !canvas.getContext || !definitions) throw new Error("Module preview needs a canvas and module definitions.");
    var context = canvas.getContext("2d");
    if (!context) throw new Error("Module preview canvas is unavailable.");
    var scene = null, visible = false, playing = false, destroyed = false, frameId = null, lastTime = null;
    var document = root.document;
    var media = root.matchMedia ? root.matchMedia("(prefers-reduced-motion: reduce)") : null;
    function hidden() { return Boolean(document && document.hidden); }
    function cancel() { if (frameId !== null && root.cancelAnimationFrame) root.cancelAnimationFrame(frameId); frameId = null; lastTime = null; }
    function draw() {
      if (!scene || destroyed) return;
      var width = Math.max(1, canvas.clientWidth || 540), height = Math.max(1, canvas.clientHeight || 300);
      var dpr = clamp(root.devicePixelRatio || 1, 1, 2);
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) { canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderScene(context, scene, width, height, options.drawIcon);
    }
    function step(dt) {
      if (!scene || !visible || !playing || destroyed || hidden() || !Number.isFinite(dt) || dt <= 0) return;
      var remaining = Math.min(dt, .1);
      while (remaining > .00001) { var tick = Math.min(remaining, 1 / 60); advance(scene, tick); remaining -= tick; }
    }
    function schedule() { if (visible && playing && !destroyed && !hidden() && frameId === null && root.requestAnimationFrame) frameId = root.requestAnimationFrame(frame); }
    function frame(timestamp) {
      frameId = null;
      if (!visible || !playing || destroyed || hidden()) { lastTime = null; return; }
      if (lastTime !== null) step((timestamp - lastTime) / 1000);
      lastTime = timestamp; draw(); schedule();
    }
    function show(type) {
      if (destroyed || !describe(type, definitions)) return false;
      cancel(); scene = createScene(type, definitions); visible = true; playing = !(media && media.matches); draw(); schedule(); return true;
    }
    function hide() { visible = false; playing = false; cancel(); }
    function setPlaying(value) { if (destroyed) return; playing = Boolean(value); cancel(); draw(); schedule(); }
    function visibilityChanged() { cancel(); if (!hidden()) { draw(); schedule(); } }
    function motionChanged(event) { if (event.matches) setPlaying(false); }
    function snapshot() {
      if (!scene) return { type: null, visible: visible, playing: playing, time: 0 };
      var state = copy(scene); state.visible = visible; state.playing = playing; delete state.def; delete state.weapon; return state;
    }
    if (document && document.addEventListener) document.addEventListener("visibilitychange", visibilityChanged);
    if (media && media.addEventListener) media.addEventListener("change", motionChanged);
    var observer = root.ResizeObserver ? new root.ResizeObserver(draw) : null;
    if (observer) observer.observe(canvas);
    return { show: show, hide: hide, setPlaying: setPlaying, step: step, draw: draw, snapshot: snapshot,
      describe: function (type) { return describe(type || (scene && scene.type), definitions); },
      destroy: function () { hide(); destroyed = true; scene = null; if (observer) observer.disconnect(); if (document && document.removeEventListener) document.removeEventListener("visibilitychange", visibilityChanged); if (media && media.removeEventListener) media.removeEventListener("change", motionChanged); } };
  }
  return { create: create, describe: describe };
});
