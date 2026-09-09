"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const harness = fs.readFileSync("tools/enemy-pressure-check.js", "utf8");
const marker = "const results =";
assert.ok(harness.includes(marker));
const bootstrap = { require, console, setTimeout, clearTimeout, URLSearchParams };
vm.runInNewContext(harness.slice(0, harness.indexOf(marker)) + "\nglobalThis.makeRuntime = runtime;", bootstrap);

function fixture(covers, shieldCharge) {
  const api = bootstrap.makeRuntime(31);
  const game = api.create();
  game.operation = null;
  game.ship.tiles.clear();
  const core = api.makeTile("core", 0, 0, true);
  game.ship.tiles.set("0,0", core);
  const tiles = covers.map((cover, index) => {
    const tile = api.makeTile(cover.type, 0, -1 - index, false);
    if (cover.hp !== undefined) tile.hp = cover.hp;
    game.ship.tiles.set("0," + tile.y, tile);
    return tile;
  });
  let shield = null;
  if (shieldCharge !== undefined) {
    shield = api.makeTile("shield", 1, 0, false);
    shield.shield = shieldCharge;
    game.ship.tiles.set("1,0", shield);
  }
  return { game, core, tiles, shield };
}

function fire(probe, kind = "sniperShot", damage = 24, speed = 400) {
  probe.game.fireEnemyProjectile(0, -150, 0, 1, damage, speed, kind, "#57a7ff", 5);
  const shot = probe.game.projectiles[probe.game.projectiles.length - 1];
  let frames = 0;
  while (probe.game.projectiles.length && frames < 180) {
    probe.game.updateProjectiles(1 / 30);
    assert.ok(Number.isFinite(shot.damage) && shot.damage >= 0);
    assert.ok(Number.isFinite(shot.x) && Number.isFinite(shot.y) && Number.isFinite(shot.life));
    frames += 1;
  }
  assert.equal(probe.game.projectiles.length, 0, "Sniper shots must stop or expire within their finite lifetime.");
  return shot;
}

function close(actual, expected, message) { assert.ok(Math.abs(actual - expected) < .00001, message + ": " + actual + " versus " + expected); }

const weaponWall = fixture([{ type: "cannon" }]);
fire(weaponWall);
close(weaponWall.tiles[0].hp, 26, "The outer weapon takes the primary hit once");
close(weaponWall.core.hp, weaponWall.core.maxHp - 15.6, "Only the attenuated second hit reaches the core");

const twoLayers = fixture([{ type: "cannon" }, { type: "cannon" }]);
fire(twoLayers);
close(twoLayers.tiles[1].hp, 26, "The outermost weapon takes full damage");
close(twoLayers.tiles[0].hp, 34.4, "The second weapon takes attenuated damage");
close(twoLayers.core.hp, twoLayers.core.maxHp, "Two distinct tiles are the absolute penetration limit");

["armor", "bulkhead"].forEach((type) => {
  const blocker = fixture([{ type }]);
  fire(blocker);
  close(blocker.core.hp, blocker.core.maxHp, "Dedicated protection stops the piercing shot");
  const brokenBlocker = fixture([{ type, hp: 1 }]);
  fire(brokenBlocker, "sniperShot", 50);
  close(brokenBlocker.core.hp, brokenBlocker.core.maxHp, "Dedicated protection still blocks the shot that destroys it");
});

const fullShield = fixture([{ type: "cannon" }], 60);
fire(fullShield);
close(fullShield.shield.shield, 36, "The shield absorbs the primary hit");
close(fullShield.tiles[0].hp, 50, "A fully shielded weapon takes no damage");
close(fullShield.core.hp, fullShield.core.maxHp, "Full shield absorption stops penetration");

const partialShield = fixture([{ type: "cannon" }], 10);
fire(partialShield);
close(partialShield.tiles[0].hp, 36, "Only unabsorbed damage reaches the weapon");
close(partialShield.core.hp, partialShield.core.maxHp - 9.1, "Penetration attenuates the unabsorbed portion, not the original shot");

const brokenWeapon = fixture([{ type: "cannon", hp: 1 }], 10);
fire(brokenWeapon);
close(brokenWeapon.core.hp, brokenWeapon.core.maxHp - 9.1, "A destroyed weapon does not discard the unabsorbed penetration energy");

const slowShot = fixture([{ type: "cannon" }]);
fire(slowShot, "sniperShot", 24, 60);
close(slowShot.tiles[0].hp, 26, "Crossing the same tile over several frames must never apply repeated damage");
close(slowShot.core.hp, slowShot.core.maxHp - 15.6, "The later distinct tile still receives one attenuated hit");

const regularShot = fixture([{ type: "cannon" }]);
fire(regularShot, "bolterShot");
close(regularShot.core.hp, regularShot.core.maxHp, "Ordinary enemy shots retain their existing physical blocking");

const poolProbe = fixture([{ type: "cannon" }]);
const firstShot = fire(poolProbe);
assert.equal(firstShot.hitIds.size, 0, "Expired pooled shots must clear tile identities");
poolProbe.tiles[0].hp = poolProbe.tiles[0].maxHp;
poolProbe.core.hp = poolProbe.core.maxHp;
const reusedShot = fire(poolProbe);
assert.equal(reusedShot, firstShot, "The existing projectile pool must be reused");
close(poolProbe.core.hp, poolProbe.core.maxHp - 15.6, "A reused shot must not skip a previously hit tile");

const expired = fixture([{ type: "cannon" }]);
expired.game.spawnProjectile(false, "sniperShot", 1000, 1000, 0, 0, 24, 5, .01, "#57a7ff");
expired.game.updateProjectiles(1 / 30);
assert.equal(expired.game.projectiles.length, 0);
close(expired.core.hp, expired.core.maxHp, "An expired projectile cannot apply a late hit");

const warning = fixture([]);
warning.game.enemies.forEach((enemy) => { enemy.dead = true; });
warning.game.compactEnemies();
const sniper = warning.game.spawnEnemy("sniper", 0, -300);
sniper.fireClock = 0;
warning.game.updateEnemies(1 / 30);
close(sniper.attackChargeMax, .78, "The existing sniper windup is preserved");
for (let frame = 0; frame < 23; frame += 1) warning.game.updateEnemies(1 / 30);
assert.equal(warning.game.projectiles.length, 0, "The sniper cannot fire before its advertised windup");
warning.game.updateEnemies(1 / 30);
assert.equal(warning.game.projectiles.length, 1);

console.log(JSON.stringify({ passed: true, penetrationLimit: 2, remainingDamage: .65,
  realDamage: { weaponWallCoreDamage: 15.6, partialShieldCoreDamage: 9.1, armorCoreDamage: 0, fullShieldCoreDamage: 0 },
  covered: ["Two-tile limit", "Armor and Aegis blockers", "Full and partial shields", "Destroyed first tile", "No repeated hits", "Pool reuse", "Finite lifetime", "Existing windup", "Ordinary shots unchanged"] }, null, 2));
