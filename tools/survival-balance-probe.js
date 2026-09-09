"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { performance } = require("node:perf_hooks");

function runtime(seed) {
  const harness = fs.readFileSync(".artifact_build/runtime-check.js", "utf8");
  const marker = "let installPromptCalls";
  const source = fs.readFileSync("game.js", "utf8");
  const exposure = "    window.__driftBastion = {";
  assert.ok(harness.includes(marker) && source.includes(exposure));
  const instrumented = source.replace(exposure, `
    window.__balanceProbe = {
      create: function () { game = new Game(); return game; },
      save: save,
      steer: function (angle) {
        mobileInput.active = true; mobileInput.magnitude = 1;
        mobileInput.x = Math.sin(angle); mobileInput.y = -Math.cos(angle);
      },
      modulePrice: modulePrice,
      options: function () { return runUpgrades.options("cannon", game.upgrades.cannon, upgradePricingCopies("cannon")); },
      buyModule: function (type, x, y) {
        var before = game.matter;
        openBuild(); selectedBuildModule = type; placePurchasedModule(x, y); closeBuild();
        return before - game.matter;
      },
      buyUpgrade: function (choice) {
        var before = game.matter;
        openBuild(); var purchased = buyRunUpgrade("cannon", choice.id, choice.rank); closeBuild();
        return purchased ? before - game.matter : 0;
      }
    };
` + exposure);
  const seededMath = Object.create(Math);
  seededMath.random = function () { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const bootstrap = {
    console, setTimeout, clearTimeout, URLSearchParams, Math: seededMath,
    process: { env: { BALANCE_SECONDS: "1" } },
    require(name) {
      if (name === "fs") return { ...fs, readFileSync(path, encoding) {
        return path === "game.js" ? instrumented : fs.readFileSync(path, encoding);
      } };
      return require(name);
    }
  };
  vm.runInNewContext(harness.slice(0, harness.indexOf(marker)) + "\nglobalThis.runtime = sandbox;", bootstrap);
  return bootstrap.runtime.__balanceProbe;
}

function placement(game, type) {
  const candidates = new Map();
  game.ship.tiles.forEach((tile) => {
    for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
      const x = tile.x + dx;
      const y = tile.y + dy;
      const key = x + "," + y;
      if (game.ship.tiles.has(key) || Math.abs(x) > 3 || Math.abs(y) > 3) continue;
      const radius = Math.abs(x) + Math.abs(y);
      const desiredRadius = type === "armor" ? 3 : 1;
      candidates.set(key, { x, y, priority: Math.abs(radius - desiredRadius) * 10 + y * .1 + Math.abs(x) * .05 });
    }
  });
  return Array.from(candidates.values()).sort((left, right) => left.priority - right.priority)[0];
}

function invest(api, game, purchases) {
  let cannons = 0;
  let armor = 0;
  game.ship.tiles.forEach((tile) => { if (tile.type === "cannon") cannons += 1; if (tile.type === "armor") armor += 1; });
  const rank = game.upgrades.cannon ? game.upgrades.cannon.level : 0;
  const options = api.options();
  const nextUpgrade = options.find((option) => option.id === "pierce") || options[0];
  let action;
  if (cannons === 0) action = { type: "cannon" };
  else if (rank === 0) action = { upgrade: nextUpgrade };
  else if (cannons < 3) action = { type: "cannon" };
  else if (rank < 2) action = { upgrade: nextUpgrade };
  else if (armor < 3) action = { type: "armor" };
  else if (rank < 4) action = { upgrade: nextUpgrade };
  else if (cannons < 5) action = { type: "cannon" };
  else if (rank < 7) action = { upgrade: nextUpgrade };
  else if (armor < 5) action = { type: "armor" };
  else if (rank < 9) action = { upgrade: nextUpgrade };
  else if (cannons < 8) action = { type: "cannon" };
  if (!action) return;
  if (action.upgrade) {
    if (action.upgrade.cost > game.matter) return;
    const spent = api.buyUpgrade(action.upgrade);
    assert.equal(spent, action.upgrade.cost, "The ordinary purchase path must debit the advertised upgrade price.");
    purchases.push({ elapsed: Number(game.elapsed.toFixed(2)), upgrade: action.upgrade.id,
      level: game.upgrades.cannon.level + 1, spent });
  } else if (action.type) {
    const price = api.modulePrice(action.type);
    if (price > game.matter) return;
    const target = placement(game, action.type);
    if (!target) return;
    const countBefore = game.ship.tiles.size;
    const spent = api.buyModule(action.type, target.x, target.y);
    assert.equal(spent, price, "The ordinary placement path must debit the advertised module price.");
    assert.equal(game.ship.tiles.size, countBefore + 1, "The module must be attached through a legal Build location.");
    purchases.push({ elapsed: Number(game.elapsed.toFixed(2)), module: action.type, x: target.x, y: target.y, spent });
  }
}

function simulate(seed) {
  const api = runtime(seed);
  assert.ok(Object.values(api.save.meta).every((value) => value === 0));
  assert.equal(api.save.progression.purchasedModules.length, 0);
  const game = api.create();
  const purchases = [];
  const snapshots = [];
  const bossDefeats = [];
  let nextBuildAt = 2;
  let nextSnapshotAt = 30;
  let maxActiveEnemies = 0;
  let spentMatter = 0;
  const wallStart = performance.now();
  while (!game.finished && game.state !== "milestone" && game.elapsed < 600) {
    // A broad, steady turn changes the facing direction while avoiding the tiny circles of held A/D.
    api.steer(game.elapsed * .065);
    if (game.elapsed >= nextBuildAt) {
      invest(api, game, purchases);
      nextBuildAt = game.elapsed + 2;
    }
    const previousBosses = game.bossesDefeated;
    game.update(1 / 30);
    assert.ok(game.matter >= 0 && Number.isFinite(game.ship.tiles.get("0,0").hp));
    assert.ok(game.enemies.length <= 420 && game.projectiles.length <= 900);
    maxActiveEnemies = Math.max(maxActiveEnemies, game.enemies.length);
    if (game.bossesDefeated > previousBosses) bossDefeats.push(Number(game.elapsed.toFixed(2)));
    if (game.elapsed >= nextSnapshotAt) {
      snapshots.push({ elapsed: Number(game.elapsed.toFixed(2)), kills: game.kills, coreHp: Number(game.ship.tiles.get("0,0").hp.toFixed(2)),
        modules: game.ship.tiles.size, cannonLevel: (game.upgrades.cannon ? game.upgrades.cannon.level : 0) + 1,
        matter: Number(game.matter.toFixed(2)), activeEnemies: game.enemies.length, bosses: game.bossesDefeated });
      nextSnapshotAt += 30;
    }
  }
  spentMatter = purchases.reduce((sum, purchase) => sum + purchase.spent, 0);
  const installed = {};
  game.ship.tiles.forEach((tile) => { installed[tile.type] = (installed[tile.type] || 0) + 1; });
  return { seed, simulatedSeconds: Number(game.elapsed.toFixed(2)), computationSeconds: Number(((performance.now() - wallStart) / 1000).toFixed(2)),
    outcome: game.finished ? "core_lost" : (game.survivalCompleted ? "survival_complete" : "600_second_limit"),
    coreHp: Number(game.ship.tiles.get("0,0").hp.toFixed(2)), kills: game.kills, bosses: game.bossesDefeated,
    cannonLevel: (game.upgrades.cannon ? game.upgrades.cannon.level : 0) + 1, installed, maxActiveEnemies,
    spentMatter, finalMatter: Number(game.matter.toFixed(2)), bossDefeats, purchases, snapshots };
}

const report = {
  method: "Two fresh-save 600-second CPU simulations using actual game update, movement, damage, paid Build placement and paid family upgrades. Deterministic broad-turn steering and a simple Cannon/Armor purchase policy; simulation pauses do not consume run time, matching Build.",
  configuration: { seeds: [11, 43], targetSeconds: 600, core: "standard", metaRanks: 0, licenses: ["cannon", "armor"], cannonBranch: "pierce", damageOverride: false, grantedMatter: 0 },
  limitations: "This is a bounded scripted economic/combat probe, not human playtesting or a winning-build proof. Its simple policy has no threat avoidance, boss telegraph reaction, repair license, or meta progression. Results must not be used to tune difficulty merely until the bot wins.",
  followUp: {
    status: "Recommendation only; no economy or health adjustment applied.",
    concern: "Density increases Matter income and Piercing Cannon scales efficiently through crowds. This purchase policy levels five cannons before expanding to eight, then deliberately stops buying; excess Matter therefore combines rising income with the policy cap.",
    candidateToTest: "If broader playtests confirm excessive late income, compare normal-kill payout multipliers 1 before 180s, 0.55 at 180-300s, 0.30 at 300-480s, and 0.20 thereafter. Preserve boss rewards and first-two-minute income. Apply at payout with actual earned-Matter telemetry; keep weapon-cleave comparison separate.",
    caution: "A fixed-kill arithmetic estimate gives about 1218/921 total Matter for these seeds, but lower firepower changes kills and survival. This estimate is not a validated balance change or a reason to force bot losses."
  },
  results: [11, 43].map(simulate)
};
fs.mkdirSync("outputs/survival-2026-09-08", { recursive: true });
fs.writeFileSync("outputs/survival-2026-09-08/balance-report.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report.results.map(({ purchases, snapshots, ...summary }) => summary), null, 2));
