(function () {
    "use strict";

    var TAU = Math.PI * 2;
    var TILE_SIZE = 42;
    var FIXED_STEP = 1 / 30;
    var MAX_SIMULATION_STEPS = 3;
    var SPATIAL_CELL_SIZE = 110;
    var ASSAULT_FIRST_DELAY = 4;
    var MAX_ACTIVE_ENEMIES = 420;
    var MAX_ACTIVE_PROJECTILES = 900;
    var SIMPLE_PROJECTILE_RENDER_BUDGETS = [180, 120, 80];
    var SAVE_VERSION = 8;
    var SAVE_KEY = "drift-bastion-save-v2";
    var SAVE_BACKUP_KEY = SAVE_KEY + "-backup";
    var LEGACY_SAVE_KEY = "drift-bastion-save-v1";
    var DEBUG = new URLSearchParams(location.search).get("debug") === "1";
    var playtestTelemetry = window.PlaytestTelemetry || null;
    var progression = window.DriftProgression;
    var progressionView = window.DriftProgressionView;
    var runUpgrades = window.DriftRunUpgrades;
    var campaign = window.DriftCampaign;
    var trainingApi = window.DriftTraining || null;
    var trainingArenaApi = window.DriftTrainingArena || null;
    var trainingViewApi = window.DriftTrainingView || null;
    var META_PURCHASE_CAP = 3;
    var CORE_COLORS = { standard: "#ffffff", striker: "#ff9b6a", bulwark: "#8ac7ff", salvager: "#a8ff70" };
    var SHOT_COLORS = { hostile: "#ff7359", hostileCore: "#fff1cf", hostileRim: "#29151d" };

    var MODULES = {
      armor: {
        id: "armor", name: "Armor Tile", glyph: "A", color: "#7fa4b7",
        baseCost: 8, scale: 1.18, hp: 120, mass: 1.35,
        summary: "Blocks shots and links modules.",
        description: "Heavy structural link. No active system."
      },
      cannon: {
        id: "cannon", name: "Auto Cannon", glyph: "C", color: "#65e8ff",
        baseCost: 20, scale: 1.22, hp: 50, mass: 1,
        range: 400, cooldown: .5, damage: 12,
        summary: "Steady fire at nearby enemies.",
        description: "Reliable kinetic fire at the nearest visible target."
      },
      laser: {
        id: "laser", name: "Piercing Laser", glyph: "L", color: "#a987ff",
        baseCost: 33, scale: 1.22, hp: 40, mass: 1.1,
        range: 500, cooldown: 1.05, damage: 18,
        summary: "Cuts through enemies in a line.",
        description: "Fixed-length beam. Every enemy on the line takes damage."
      },
      missile: {
        id: "missile", name: "Missile Pod", glyph: "M", color: "#ffd96a",
        baseCost: 42, scale: 1.22, hp: 45, mass: 1.2,
        range: 520, cooldown: 1.7, damage: 32,
        summary: "Homing shots with splash damage.",
        description: "Slow homing projectile with a small blast radius."
      },
      scatter: {
        id: "scatter", name: "Scatter Array", glyph: "V", color: "#ff9b6a",
        baseCost: 24, scale: 1.21, hp: 48, mass: 1,
        range: 250, cooldown: .8, damage: 6, pellets: 5, spread: .28,
        summary: "Wide burst, strongest up close.",
        description: "Five-shot cone. Brutal up close, weak at long range."
      },
      arc: {
        id: "arc", name: "Arc Emitter", glyph: "Z", color: "#70ffc2",
        baseCost: 37, scale: 1.23, hp: 42, mass: 1.15,
        range: 350, cooldown: 1.15, damage: 14, chains: 4, jumpRange: 145,
        summary: "Lightning jumps between enemies.",
        description: "Lightning jumps through clustered enemies with falloff."
      },
      rail: {
        id: "rail", name: "Rail Lance", glyph: "R", color: "#ff8ee8",
        baseCost: 52, scale: 1.24, hp: 46, mass: 1.3,
        range: 650, cooldown: 2.6, damage: 85,
        summary: "Heavy piercing shots. Long reload.",
        description: "High-speed piercing slug. Heavy damage and knockback."
      },
      flak: {
        id: "flak", name: "Flak Battery", glyph: "F", color: "#ffb15c",
        baseCost: 29, scale: 1.21, hp: 48, mass: 1.05,
        range: 360, cooldown: 1.1, damage: 7, blastRadius: 125,
        summary: "Clears enemy shots. Low damage.",
        description: "Wide anti-projectile airburst. Clears hostile shots, but deals very low damage to enemies."
      },
      pulse: {
        id: "pulse", name: "Pulse Nova", glyph: "P", color: "#54f4ff",
        baseCost: 39, scale: 1.23, hp: 50, mass: 1.2,
        range: 220, cooldown: 2.0, damage: 24,
        summary: "Blasts every enemy around it.",
        description: "Radial shockwave. Hits every nearby enemy at once."
      },
      cryo: {
        id: "cryo", name: "Cryo Projector", glyph: "K", color: "#8ac7ff",
        baseCost: 34, scale: 1.21, hp: 44, mass: 1.1,
        range: 430, cooldown: 1.1, damage: 9, slowFactor: .5, slowDuration: 2,
        summary: "Slows enemies with freezing shots.",
        description: "Freezing bolt halves enemy speed for two seconds."
      },
      mine: {
        id: "mine", name: "Mine Layer", glyph: "X", color: "#ff6f91",
        baseCost: 26, scale: 1.20, hp: 50, mass: 1.1,
        range: 300, cooldown: 2.4, damage: 55, blastRadius: 90,
        summary: "Mines explode near enemies.",
        description: "Deploys proximity mines into approaching lanes."
      },
      ember: {
        id: "ember", name: "Ember Projector", glyph: "E", color: "#ff7547",
        baseCost: 32, scale: 1.21, hp: 46, mass: 1.1,
        range: 190, cooldown: .7, damage: 8, coneAngle: .65, burnDamage: 6, burnDuration: 2.5,
        summary: "Close flame cone. Burns enemies.",
        description: "Hits a short cone and burns for 2.5s. Repeated flames refresh the burn."
      },
      gravity: {
        id: "gravity", name: "Gravity Well", glyph: "G", color: "#c8a2ff",
        baseCost: 45, scale: 1.22, hp: 42, mass: 1.2,
        range: 380, cooldown: 3, damage: 6, fieldDuration: 2, fieldRadius: 105, pullStrength: 100,
        summary: "Pulls groups into a damaging field.",
        description: "Places a 2s field at a target. Pulls enemies together; bosses resist the pull."
      },
      shield: {
        id: "shield", name: "Shield Node", glyph: "S", color: "#70ffc2",
        baseCost: 37, scale: 1.22, hp: 55, mass: 1.2,
        shield: 60, shieldRadius: 2.3, rechargeDelay: 6, rechargeRate: 4,
        summary: "Shields nearby modules.",
        description: "Regenerating local shield protecting nearby tiles."
      },
      drive: {
        id: "drive", name: "Drive Node", glyph: "D", color: "#ff8ee8",
        baseCost: 26, scale: 1.18, hp: 60, mass: 1.1,
        driveBonus: .12,
        summary: "Move and turn faster.",
        description: "+12% thrust, top speed, and rotation."
      },
      repair: {
        id: "repair", name: "Repair Array", glyph: "+", color: "#7dff9b",
        baseCost: 32, scale: 1.20, hp: 50, mass: 1.15,
        repairAmount: 5, repairInterval: 1.5, repairRadius: 1.5, repairDelay: 3,
        summary: "Repairs nearby tiles out of danger.",
        description: "Repairs nearby tiles after 3s without damage. Overlapping repair areas do not stack."
      },
      reactor: {
        id: "reactor", name: "Reactor Link", glyph: "O", color: "#ffe06a",
        baseCost: 45, scale: 1.23, hp: 45, mass: 1.25,
        cooldownBonus: .25,
        summary: "Adjacent weapons fire faster.",
        description: "Adjacent weapons recharge 25% faster."
      },
      collector: {
        id: "collector", name: "Matter Siphon", glyph: "$", color: "#a8ff70",
        baseCost: 24, scale: 1.20, hp: 38, mass: .9,
        matterBonus: .10,
        summary: "Earn more Matter from kills.",
        description: "+10% Matter from every kill. Stacks globally."
      },
      bulkhead: {
        id: "bulkhead", name: "Aegis Bulkhead", glyph: "B", color: "#9bb4c8",
        baseCost: 13, scale: 1.18, hp: 170, mass: 1.7,
        damageReduction: .12,
        summary: "Reduces damage to adjacent tiles.",
        description: "Adjacent tiles take 12% less damage, up to 48%."
      }
    };

    var WEAPON_TYPES = ["cannon", "laser", "missile", "scatter", "arc", "rail", "flak", "pulse", "cryo", "mine", "ember", "gravity"];
    // Mines need room and timing to matter, so they stay an in-run purchase.
    var START_WEAPONS = WEAPON_TYPES.filter(function (type) { return type !== "mine"; });

    var META_DEFS = [
      { id: "core", name: "Legacy Core Integrity", description: "Previously purchased core HP is retained.", max: 10, legacy: true },
      { id: "modules", name: "Reinforced Modules", description: "+5% module HP per rank", bonusPercent: 5, unit: "module HP", max: 10 },
      { id: "matter", name: "Matter Converter", description: "+5% Matter income per rank", bonusPercent: 5, unit: "Matter income", max: 10 },
      { id: "drive", name: "Drive Tuning", description: "+3% movement per rank", bonusPercent: 3, unit: "movement", max: 10 },
      { id: "damage", name: "Weapon Calibration", description: "+4% weapon damage per rank", bonusPercent: 4, unit: "weapon damage", max: 10 }
    ];

    var ENEMY_DEFS = {
      scout: { name: "Scout", hp: 12, speed: 132, radius: 12, damage: 4, reward: 1, color: "#ff4f67", sides: 20, directChase: true },
      drone: { name: "Swarm Drone", hp: 9, speed: 165, radius: 8, damage: 3, reward: 1, color: "#ff5e75", sides: 0, directChase: true },
      hunter: { name: "Hunter", hp: 22, speed: 250, radius: 11, damage: 7, reward: 2, color: "#ff9b55", sides: 3, turnRate: .48 },
      raptor: { name: "Raptor", hp: 48, speed: 340, radius: 14, damage: 16, reward: 4, color: "#ff3ea5", sides: 3, turnRate: .22 },
      orbiter: { name: "Orbiter", hp: 34, speed: 118, radius: 13, damage: 9, reward: 2, color: "#54dfff", sides: 4 },
      brute: { name: "Brute", hp: 62, speed: 102, radius: 19, damage: 18, reward: 3, color: "#a987ff", sides: 24, directChase: true },
      bulwark: { name: "Bulwark", hp: 85, speed: 74, radius: 21, damage: 18, reward: 4, color: "#9b83ff", sides: 6, shield: 45, directChase: true },
      bolter: { name: "Bolt Drone", hp: 22, speed: 78, radius: 12, damage: 5, reward: 2, color: "#72d8ff", sides: 4 },
      gunner: { name: "Gunner", hp: 40, speed: 64, radius: 14, damage: 9, reward: 3, color: "#65e8ff", sides: 4 },
      bomber: { name: "Bomber", hp: 38, speed: 104, radius: 15, damage: 26, reward: 3, color: "#ffd45c", sides: 5, blastRadius: 2.25 },
      splitter: { name: "Splitter", hp: 56, speed: 88, radius: 16, damage: 21, reward: 4, color: "#ffd96a", sides: 6, directChase: true },
      sniper: { name: "Sniper", hp: 46, speed: 58, radius: 16, damage: 24, reward: 5, color: "#57a7ff", sides: 4 },
      colossus: { name: "Colossus", hp: 170, speed: 70, radius: 28, damage: 50, reward: 8, color: "#f56fff", sides: 28, directChase: true },
      mini: { name: "Shard", hp: 10, speed: 205, radius: 7, damage: 7, reward: 1, color: "#ffca68", sides: 3, directChase: true }
    };

    var ENEMY_PHASES = [
      { level: 1, at: 0, packetSize: 3, ambientInterval: 4.8, squadSize: 7, directions: 3, assaultInterval: 18, heavySquads: 0,
        assaultRanged: 0, ambientRangedChance: 0, rangedPool: [], heavyPool: [], pool: [["drone", 60], ["scout", 40]] },
      { level: 2, at: 40, packetSize: 4, ambientInterval: 4.4, squadSize: 10, directions: 3, assaultInterval: 18, heavySquads: 0,
        assaultRanged: 0, ambientRangedChance: 0, rangedPool: [], heavyPool: [], pool: [["drone", 65], ["scout", 25], ["hunter", 10]] },
      { level: 3, at: 90, packetSize: 5, ambientInterval: 4, squadSize: 12, directions: 3, assaultInterval: 17, heavySquads: 1,
        assaultRanged: 1, ambientRangedChance: .08, rangedPool: [["bolter", 100]], heavyPool: [["brute", 100]], pool: [["drone", 60], ["scout", 30], ["hunter", 10]] },
      { level: 4, at: 150, packetSize: 6, ambientInterval: 3.7, squadSize: 16, directions: 3, assaultInterval: 17, heavySquads: 1,
        assaultRanged: 1, ambientRangedChance: .10, rangedPool: [["bolter", 100]], heavyPool: [["brute", 85], ["bulwark", 15]], pool: [["drone", 58], ["scout", 27], ["hunter", 10], ["orbiter", 5]] },
      { level: 5, at: 225, packetSize: 8, ambientInterval: 3.4, squadSize: 18, directions: 4, assaultInterval: 16, heavySquads: 1,
        assaultRanged: 1, ambientRangedChance: .12, rangedPool: [["bolter", 100]], heavyPool: [["brute", 70], ["bulwark", 30]], pool: [["drone", 55], ["scout", 25], ["hunter", 10], ["orbiter", 7], ["splitter", 3]] },
      { level: 6, at: 300, packetSize: 9, ambientInterval: 3.1, squadSize: 20, directions: 4, assaultInterval: 15, heavySquads: 1,
        assaultRanged: 2, ambientRangedChance: .14, rangedPool: [["bolter", 70], ["gunner", 30]], heavyPool: [["brute", 60], ["bulwark", 40]], pool: [["drone", 50], ["scout", 27], ["hunter", 10], ["orbiter", 5], ["splitter", 5], ["bomber", 3]] },
      { level: 7, at: 390, packetSize: 10, ambientInterval: 2.8, squadSize: 22, directions: 4, assaultInterval: 14, heavySquads: 2,
        assaultRanged: 2, ambientRangedChance: .16, rangedPool: [["bolter", 35], ["gunner", 65]], heavyPool: [["brute", 62], ["bulwark", 35], ["colossus", 3]], pool: [["drone", 48], ["scout", 26], ["hunter", 10], ["raptor", 4], ["orbiter", 5], ["splitter", 4], ["bomber", 3]] },
      { level: 8, at: 480, packetSize: 12, ambientInterval: 2.5, squadSize: 23, directions: 5, assaultInterval: 13, heavySquads: 2,
        assaultRanged: 2, ambientRangedChance: .18, rangedPool: [["gunner", 75], ["sniper", 25]], heavyPool: [["brute", 55], ["bulwark", 40], ["colossus", 5]], pool: [["drone", 46], ["scout", 24], ["hunter", 10], ["raptor", 7], ["orbiter", 5], ["splitter", 4], ["bomber", 4]] },
      { level: 9, at: 540, packetSize: 14, ambientInterval: 2.2, squadSize: 25, directions: 5, assaultInterval: 12, heavySquads: 2,
        assaultRanged: 3, ambientRangedChance: .20, rangedPool: [["gunner", 60], ["sniper", 40]], heavyPool: [["brute", 50], ["bulwark", 44], ["colossus", 6]], pool: [["drone", 48], ["scout", 24], ["hunter", 8], ["raptor", 6], ["orbiter", 5], ["splitter", 5], ["bomber", 4]] }
    ];

    var BOSS_SPAWN_TIME = 120;
    var BOSS_WARNING_LEAD = 5;
    var BOSS_REPEAT_INTERVAL = 180;
    var SURVIVAL_DURATION = 600;
    var SURVIVAL_BOSS_TIMES = [120, 330, 570];
    var BOSS_RECOVERY_SECONDS = 8;
    var BOSS_BASE_HP = 850;

    function isWeaponType(type) {
      return WEAPON_TYPES.indexOf(type) >= 0;
    }

    function isStarterWeapon(type) {
      return START_WEAPONS.indexOf(type) >= 0;
    }

    var canvas = document.getElementById("gameCanvas");
    var ctx = canvas.getContext("2d", { alpha: false });
    var ui = {
      hud: document.getElementById("hud"),
      hudMatter: document.getElementById("hudMatter"),
      hudKills: document.getElementById("hudKills"),
      hudTime: document.getElementById("hudTime"),
      hudModules: document.getElementById("hudModules"),
      hudHpText: document.getElementById("hudHpText"),
      healthFill: document.getElementById("healthFill"),
      bossHud: document.getElementById("bossHud"),
      bossFill: document.getElementById("bossFill"),
      bossName: document.getElementById("bossName"),
      buildButton: document.getElementById("buildButton"),
      muteButton: document.getElementById("muteButton"),
      pauseButton: document.getElementById("pauseButton"),
      mobileControls: document.getElementById("mobileControls"),
      mobileMoveZone: document.getElementById("mobileMoveZone"),
      moveJoystick: document.getElementById("moveJoystick"),
      joystickKnob: document.getElementById("joystickKnob"),
      mobileBuildButton: document.getElementById("mobileBuildButton"),
      mobilePauseButton: document.getElementById("mobilePauseButton"),
      menu: document.getElementById("menuOverlay"),
      weaponPicker: document.getElementById("weaponPicker"),
      starterBrief: document.getElementById("starterBrief"),
      startButton: document.getElementById("startButton"),
      installButton: document.getElementById("installButton"),
      menuSettingsButton: document.getElementById("menuSettingsButton"),
      menuFragmentCount: document.getElementById("menuFragmentCount"),
      menuLoadoutButton: document.getElementById("menuLoadoutButton"),
      startWeaponGlyph: document.getElementById("startWeaponGlyph"),
      startWeaponName: document.getElementById("startWeaponName"),
      startWeaponRole: document.getElementById("startWeaponRole"),
      hangarMenuButton: document.getElementById("hangarMenuButton"),
      hangarOverlay: document.getElementById("hangarOverlay"),
      closeHangar: document.getElementById("closeHangar"),
      hangarUpgradeTab: document.getElementById("hangarUpgradeTab"),
      hangarWeaponTab: document.getElementById("hangarWeaponTab"),
      hangarUpgradesPanel: document.getElementById("hangarUpgradesPanel"),
      hangarWeaponsPanel: document.getElementById("hangarWeaponsPanel"),
      fragmentCount: document.getElementById("fragmentCount"),
      metaList: document.getElementById("metaList"),
      bestRun: document.getElementById("bestRun"),
      victoryCount: document.getElementById("victoryCount"),
      buildOverlay: document.getElementById("buildOverlay"),
      buildMatter: document.getElementById("buildMatter"),
      catalog: document.getElementById("catalog"),
      buildSelection: document.getElementById("buildSelection"),
      buildGrid: document.getElementById("buildGrid"),
      buildHint: document.getElementById("buildHint"),
      closeBuild: document.getElementById("closeBuild"),
      pauseOverlay: document.getElementById("pauseOverlay"),
      pauseEyebrow: document.getElementById("pauseEyebrow"),
      pauseTitle: document.getElementById("pauseTitle"),
      resumeButton: document.getElementById("resumeButton"),
      restartButton: document.getElementById("restartButton"),
      pauseHangarButton: document.getElementById("pauseHangarButton"),
      volumeSlider: document.getElementById("volumeSlider"),
      volumeValue: document.getElementById("volumeValue"),
      shakeSlider: document.getElementById("shakeSlider"),
      shakeValue: document.getElementById("shakeValue"),
      reducedFlashToggle: document.getElementById("reducedFlashToggle"),
      damageNumbersToggle: document.getElementById("damageNumbersToggle"),
      autoPauseToggle: document.getElementById("autoPauseToggle"),
      qualitySelect: document.getElementById("qualitySelect"),
      fpsLimitSelect: document.getElementById("fpsLimitSelect"),
      saveStatus: document.getElementById("saveStatus"),
      telemetryStatus: document.getElementById("telemetryStatus"),
      exportTelemetryButton: document.getElementById("exportTelemetryButton"),
      clearTelemetryButton: document.getElementById("clearTelemetryButton"),
      resultOverlay: document.getElementById("resultOverlay"),
      resultTitle: document.getElementById("resultTitle"),
      resultSubtitle: document.getElementById("resultSubtitle"),
      resultKills: document.getElementById("resultKills"),
      resultTime: document.getElementById("resultTime"),
      resultFragments: document.getElementById("resultFragments"),
      resultExportTelemetry: document.getElementById("resultExportTelemetry"),
      hangarButton: document.getElementById("hangarButton"),
      damageVignette: document.getElementById("damageVignette"),
      dangerBanner: document.getElementById("dangerBanner"),
      toast: document.getElementById("toast"),
      debugBar: document.getElementById("debugBar"),
      debugMatter: document.getElementById("debugMatter"),
      debugBoss: document.getElementById("debugBoss"),
      debugKillBoss: document.getElementById("debugKillBoss"),
      debugStress: document.getElementById("debugStress"),
      debugDamage: document.getElementById("debugDamage"),
      debugStats: document.getElementById("debugStats")
    };
    ["hudBossProgress", "buildUpgradePanel", "upgradeList",
      "resultBosses", "resultUnlocks", "resultObjectiveText", "resultObjectiveProgress", "uiScaleSelect",
      "survivalHud", "survivalProgress", "bankRunButton", "startRunMode",
      "milestoneOverlay", "milestoneReward", "finishSurvivalButton", "continueSurvivalButton",
      "corePicker",
      "replayOnboardingButton", "debugToolsToggle", "resetProgressButton", "resetProgressConfirm",
      "confirmResetProgress", "cancelResetProgress", "progressActionStatus", "resetProgressMessage", "startTrainingButton"
    ].forEach(function (id) { ui[id] = document.getElementById(id); });

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function lerp(a, b, t) {
      return a + (b - a) * t;
    }

    function spatialKey(x, y) {
      return x * 65536 + y;
    }

    function distanceSquared(ax, ay, bx, by) {
      var dx = bx - ax;
      var dy = by - ay;
      return dx * dx + dy * dy;
    }

    function keyOf(x, y) {
      return x + "," + y;
    }

    function parseKey(key) {
      var parts = key.split(",");
      return { x: Number(parts[0]), y: Number(parts[1]) };
    }

    function formatTime(seconds) {
      var total = Math.max(0, Math.floor(seconds));
      var minutes = Math.floor(total / 60);
      var secs = total % 60;
      return String(minutes).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
    }

    function telemetrySample() {
      if (!game) return null;
      var friendlyProjectiles = 0;
      for (var i = 0; i < game.projectiles.length; i += 1) {
        if (game.projectiles[i].friendly) friendlyProjectiles += 1;
      }
      var core = game.ship.tiles.get("0,0");
      var moduleHp = 0, moduleMaxHp = 0, shield = 0, shieldMax = 0, shieldModules = 0, activeShieldModules = 0;
      game.ship.tiles.forEach(function (tile) {
        if (tile.type !== "core") { moduleHp += tile.hp; moduleMaxHp += tile.maxHp; }
        if (tile.type === "shield") { shield += tile.shield; shieldMax += tile.maxShield; shieldModules += 1; if (tile.shield > 0) activeShieldModules += 1; }
      });
      var bossState = game.bossSpawned ? "alive" : (game.bossDefeated ? "defeated" : "not_spawned");
      return {
        elapsed: game.elapsed,
        matter: game.matter,
        kills: game.kills,
        modules: game.ship.tiles.size,
        coreHp: core ? core.hp : 0,
        coreMaxHp: core ? core.maxHp : 0,
        moduleHp: moduleHp, moduleMaxHp: moduleMaxHp,
        shield: shield, shieldMax: shieldMax, shieldModules: shieldModules, activeShieldModules: activeShieldModules,
        bossHp: game.boss && !game.boss.dead ? Math.max(0, game.boss.hp) : 0,
        bossMaxHp: game.boss && !game.boss.dead ? game.boss.maxHp : 0,
        bossShield: game.boss && !game.boss.dead ? game.boss.shield || 0 : 0,
        bossMaxShield: game.boss && !game.boss.dead ? game.boss.maxShield || 0 : 0,
        coreHpRatio: core ? core.hp / core.maxHp : 0,
        enemies: game.enemies.length, enemiesVisible: game.visibleEnemyCount(),
        friendlyProjectiles: friendlyProjectiles,
        hostileProjectiles: game.projectiles.length - friendlyProjectiles,
        totalEnemiesSpawned: game.totalEnemiesSpawned,
        threatLevel: game.threatLevel(),
        assaultIndex: game.assaultIndex,
        ambientPacks: game.ambientPacksSpawned,
        bossState: bossState,
        bossHpRatio: game.boss && game.boss.maxHp ? Math.max(0, game.boss.hp / game.boss.maxHp) : 0,
        simulationFps: smoothedFps,
        renderFps: smoothedRenderFps,
        minimumSimulationFps: Number.isFinite(telemetryMinimumSimulationFps) ? telemetryMinimumSimulationFps : smoothedFps,
        minimumRenderFps: Number.isFinite(telemetryMinimumRenderFps) ? telemetryMinimumRenderFps : smoothedRenderFps,
        qualityTier: currentQualityTier()
      };
    }

    function updateTelemetryStatus() {
      if (!playtestTelemetry || !ui.telemetryStatus) return;
      var status = playtestTelemetry.getStatus();
      var kilobytes = Math.max(1, Math.ceil(status.bytes / 1024));
      var runLabel = status.active
        ? "1 ACTIVE · " + status.completedRuns + " COMPLETE"
        : status.completedRuns + (status.completedRuns === 1 ? " RUN" : " RUNS");
      ui.telemetryStatus.textContent = runLabel + " · " + kilobytes + " KB · " + (status.storageAvailable ? "LOCAL ONLY" : "MEMORY ONLY — EXPORT NOW");
      ui.telemetryStatus.classList.toggle("error", !status.storageAvailable);
      ui.exportTelemetryButton.disabled = status.runs === 0;
      ui.resultExportTelemetry.disabled = status.runs === 0;
    }

    function exportTelemetry() {
      if (!playtestTelemetry) return;
      var status = playtestTelemetry.getStatus();
      if (!status.runs) {
        showToast("NO PLAYTEST RUNS YET");
        return;
      }
      playtestTelemetry.exportLog();
      showToast("PLAYTEST LOG EXPORTED");
      updateTelemetryStatus();
    }

    var clearTelemetryConfirmTimer = 0;
    function clearTelemetry() {
      if (!playtestTelemetry) return;
      if (ui.clearTelemetryButton.dataset.confirm !== "yes") {
        ui.clearTelemetryButton.dataset.confirm = "yes";
        ui.clearTelemetryButton.textContent = "Confirm";
        clearTimeout(clearTelemetryConfirmTimer);
        clearTelemetryConfirmTimer = setTimeout(function () {
          ui.clearTelemetryButton.dataset.confirm = "";
          ui.clearTelemetryButton.textContent = "Clear";
        }, 2600);
        return;
      }
      clearTimeout(clearTelemetryConfirmTimer);
      ui.clearTelemetryButton.dataset.confirm = "";
      ui.clearTelemetryButton.textContent = "Clear";
      playtestTelemetry.clearCompleted();
      updateTelemetryStatus();
      showToast("COMPLETED PLAYTEST LOGS CLEARED");
    }

    function metaCost(level) {
      return 5 * Math.pow(level + 1, 2);
    }

    function runFragmentReward(kills, elapsed, bosses, completed) {
      return progression.runReward({ kills: kills, elapsed: elapsed, bosses: bosses, completed: completed === true });
    }

    function settleFragmentReward(run) {
      return progression.settleRunReward({ kills: run.kills, elapsed: run.elapsed, bosses: run.bossesDefeated,
        completed: run.survivalCompleted === true }, save.fragmentCarryUnits);
    }

    function defaultSave() {
      return {
        version: SAVE_VERSION,
        fragments: 0,
        fragmentCarryUnits: 0,
        meta: { core: 0, modules: 0, matter: 0, drive: 0, damage: 0 },
        bestTime: 0,
        bestKills: 0,
        victories: 0,
        guidance: { step: 0, complete: false },
        onboarding: { version: 1, step: "move", family: null },
        training: { version: 1, completed: false },
        progression: progression.normalize(null),
        campaign: campaign.normalize(null),
        settings: {
          muted: false,
          masterVolume: .8,
          shakeIntensity: .75,
          reducedFlash: false,
          damageNumbers: true,
          autoPause: true,
          qualityTier: 0,
          fpsLimit: 0,
          uiScale: 100
        },
        lastLoadout: {
          selectedWeapon: "cannon",
          tile: { x: 0, y: -1, type: "cannon" }
        },
        updatedAt: 0
      };
    }

    function sanitizeSave(parsed) {
      var clean = defaultSave();
      parsed = parsed && typeof parsed === "object" ? parsed : {};
      clean.fragments = Math.max(0, Number(parsed.fragments) || 0);
      clean.fragmentCarryUnits = progression.settleRunReward(null, parsed.fragmentCarryUnits).carryUnits;
      clean.bestTime = Math.max(0, Number(parsed.bestTime) || 0);
      clean.bestKills = Math.max(0, Number(parsed.bestKills) || 0);
      clean.victories = Math.max(0, Number(parsed.victories) || 0);
      clean.updatedAt = Math.max(0, Number(parsed.updatedAt) || 0);
      var guidance = parsed.guidance && typeof parsed.guidance === "object" ? parsed.guidance : {};
      clean.guidance.step = Math.floor(clamp(Number(guidance.step) || 0, 0, 4));
      clean.guidance.complete = guidance.complete === true || clean.guidance.step === 4;
      clean.progression = progression.normalize(parsed.progression, parsed);
      clean.campaign = campaign.normalize(parsed.campaign, clean.progression);
      META_DEFS.forEach(function (def) {
        clean.meta[def.id] = Math.round(clamp(Number(parsed.meta && parsed.meta[def.id]) || 0, 0, def.max));
      });

      var sourceSettings = parsed.settings && typeof parsed.settings === "object" ? parsed.settings : {};
      clean.settings.muted = Boolean(sourceSettings.muted !== undefined ? sourceSettings.muted : parsed.muted);
      clean.settings.masterVolume = clamp(Number(sourceSettings.masterVolume), 0, 1);
      if (!Number.isFinite(clean.settings.masterVolume)) clean.settings.masterVolume = .8;
      clean.settings.shakeIntensity = clamp(Number(sourceSettings.shakeIntensity), 0, 1);
      if (!Number.isFinite(clean.settings.shakeIntensity)) clean.settings.shakeIntensity = .75;
      clean.settings.reducedFlash = Boolean(sourceSettings.reducedFlash);
      clean.settings.damageNumbers = sourceSettings.damageNumbers !== false;
      clean.settings.autoPause = sourceSettings.autoPause !== false;
      var requestedQualityTier = Math.round(Number(sourceSettings.qualityTier));
      if ([0, 1, 2].indexOf(requestedQualityTier) < 0) requestedQualityTier = sourceSettings.performanceMode ? 2 : 0;
      clean.settings.qualityTier = requestedQualityTier;
      var requestedFpsLimit = Math.round(Number(sourceSettings.fpsLimit) || 0);
      clean.settings.fpsLimit = [0, 30, 15, 10, 7, 5].indexOf(requestedFpsLimit) >= 0 ? requestedFpsLimit : 0;
      clean.settings.uiScale = [100, 125, 150].indexOf(Number(sourceSettings.uiScale)) >= 0 ? Number(sourceSettings.uiScale) : 100;

      var sourceLoadout = parsed.lastLoadout && typeof parsed.lastLoadout === "object" ? parsed.lastLoadout : {};
      if (isStarterWeapon(sourceLoadout.selectedWeapon) && progression.isUnlocked(clean.progression, sourceLoadout.selectedWeapon)) clean.lastLoadout.selectedWeapon = sourceLoadout.selectedWeapon;
      clean.lastLoadout.tile = { x: 0, y: -1, type: clean.lastLoadout.selectedWeapon };
      if (parsed.onboarding && typeof parsed.onboarding === "object") clean.onboarding = Object.assign({}, parsed.onboarding);
      clean.training.completed = Boolean(parsed.training && parsed.training.version === 1 && parsed.training.completed === true);
      return clean;
    }

    var saveStorageStatus = "LOCAL SAVE READY";
    var saveNeedsMigration = false;

    function loadSave() {
      var candidates = [
        { key: SAVE_KEY, label: "primary" },
        { key: SAVE_BACKUP_KEY, label: "backup" },
        { key: LEGACY_SAVE_KEY, label: "legacy" }
      ];
      try {
        for (var i = 0; i < candidates.length; i += 1) {
          var raw = localStorage.getItem(candidates[i].key);
          if (!raw) continue;
          try {
            var parsedCandidate = JSON.parse(raw);
            var clean = sanitizeSave(parsedCandidate);
            var hasLegacyPerformanceSetting = parsedCandidate.settings && Object.prototype.hasOwnProperty.call(parsedCandidate.settings, "performanceMode") && !Object.prototype.hasOwnProperty.call(parsedCandidate.settings, "qualityTier");
            saveNeedsMigration = candidates[i].key !== SAVE_KEY || Number(parsedCandidate.version) !== SAVE_VERSION || hasLegacyPerformanceSetting;
            if (candidates[i].label === "backup") saveStorageStatus = "RESTORED FROM BACKUP";
            return clean;
          } catch (candidateError) {
            console.warn("Ignored invalid " + candidates[i].label + " save data.");
          }
        }
        return defaultSave();
      } catch (error) {
        saveStorageStatus = "LOCAL SAVE UNAVAILABLE";
        console.warn("Local save storage is unavailable.");
        return defaultSave();
      }
    }

    function storeSave() {
      if (game && game.training) return true;
      try {
        save.version = SAVE_VERSION;
        save.updatedAt = Date.now();
        var serialized = JSON.stringify(save);
        var previous = localStorage.getItem(SAVE_KEY);
        if (previous && previous !== serialized) {
          try {
            JSON.parse(previous);
            localStorage.setItem(SAVE_BACKUP_KEY, previous);
          } catch (invalidPreviousSave) {
            console.warn("Corrupt primary save was replaced without overwriting its backup.");
          }
        }
        localStorage.setItem(SAVE_KEY, serialized);
        if (localStorage.getItem(SAVE_KEY) !== serialized) throw new Error("Save verification failed.");
        saveStorageStatus = "PROGRESS SAVED LOCALLY";
        updateSaveStatus();
        return true;
      } catch (error) {
        saveStorageStatus = "LOCAL SAVE FAILED";
        updateSaveStatus(true);
        console.warn("Progress could not be saved.");
        return false;
      }
    }

    function AudioEngine() {
      this.context = null;
      this.masterGain = null;
      this.muted = false;
      this.volume = .8;
      this.activeVoices = 0;
      this.maxVoices = 18;
      this.nextImpactAt = 0;
    }

    AudioEngine.prototype.ensure = function () {
      if (this.muted) return;
      if (!this.context) {
        var AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.context = new AudioContextClass();
          this.masterGain = this.context.createGain();
          this.masterGain.gain.value = this.volume;
          this.masterGain.connect(this.context.destination);
        }
      }
      if (this.context && this.context.state === "suspended") this.context.resume();
    };

    AudioEngine.prototype.setVolume = function (value) {
      this.volume = clamp(Number(value) || 0, 0, 1);
      if (this.masterGain && this.context) {
        this.masterGain.gain.setTargetAtTime(this.volume, this.context.currentTime, .015);
      }
    };

    AudioEngine.prototype.tone = function (frequency, duration, volume, type, slide) {
      if (this.muted) return;
      this.ensure();
      if (!this.context || this.activeVoices >= this.maxVoices) return;
      var now = this.context.currentTime;
      var oscillator = this.context.createOscillator();
      var gain = this.context.createGain();
      oscillator.type = type || "sine";
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency + (slide || 0)), now + duration);
      gain.gain.setValueAtTime(Math.max(.0001, volume), now);
      gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      oscillator.connect(gain);
      gain.connect(this.masterGain || this.context.destination);
      this.activeVoices += 1;
      var engine = this;
      oscillator.addEventListener("ended", function () {
        engine.activeVoices = Math.max(0, engine.activeVoices - 1);
        oscillator.disconnect();
        gain.disconnect();
      }, { once: true });
      oscillator.start(now);
      oscillator.stop(now + duration);
    };

    AudioEngine.prototype.impact = function (strength, critical) {
      if (performance.now() < this.nextImpactAt) return;
      this.nextImpactAt = performance.now() + (critical ? 70 : 115);
      var intensity = clamp(strength, .2, 1.5);
      this.tone(critical ? 58 : 82, .12 + intensity * .045, .025 + intensity * .025, "sawtooth", -28);
      if (critical) this.tone(150, .08, .018, "square", -90);
    };

    var save = loadSave();
    var audio = new AudioEngine();
    audio.muted = save.settings.muted;
    audio.setVolume(save.settings.masterVolume);
    var selectedStarter = isStarterWeapon(save.lastLoadout.selectedWeapon) ? save.lastLoadout.selectedWeapon : "cannon";
    var starterTiles = new Map();
    starterTiles.set("0,-1", selectedStarter);
    var selectedBuildModule = "armor";
    var keys = Object.create(null);
    var mobileInput = {
      active: false,
      pointerId: null,
      originX: 0,
      originY: 0,
      x: 0,
      y: 0,
      magnitude: 0
    };
    var toastTimer = 0;
    var game = null;
    var trainingSession = null;
    var modulePreviewSession = null;
    var modulePreviewPanel = null;
    var modulePreviewNew = new Set();
    var dpr = 1;
    var viewWidth = innerWidth;
    var viewHeight = innerHeight;
    var stars = [];
    var backgroundGradient = null;

    function currentQualityTier() {
      return save.settings.qualityTier;
    }

    function moduleAvailable(type) {
      return game && game.training ? ["cannon", "armor", "shield"].indexOf(type) >= 0 : progression.isUnlocked(save.progression, type);
    }

    function trainingEvent(name, details) {
      if (trainingSession && game && game.training) trainingSession.controller.event(name, details || {});
    }

    function trainingShipState() {
      if (!game || !game.training) return;
      trainingEvent("ship_state", { cannonCopies: installedModuleCopies("cannon"), cannonLevel: game.upgrades.cannon ? game.upgrades.cannon.level : 0 });
    }

    function updateTrainingView() {
      if (!trainingSession || !game || !game.training) return;
      var state = trainingSession.controller.snapshot();
      var selected = selectedBuildTile();
      var upgradeOptions = runUpgrades.options("cannon", game.upgrades.cannon, upgradePricingCopies("cannon"));
      var cannonDef = game.weaponDefinitions.cannon || MODULES.cannon;
      var presentation = trainingApi.presentation(state, {
        inBuild: game.state === "building", selectedCatalogType: selectedBuildModule,
        selectedTileType: selected ? selected.type : null, matter: game.matter,
        cannonCost: modulePrice("cannon"), cannonUpgradeCost: upgradeOptions.length ? upgradeOptions[0].cost : null,
        cannonRateBonusPercent: Math.round((MODULES.cannon.cooldown / cannonDef.cooldown - 1) * 100),
        touch: Boolean(window.matchMedia && window.matchMedia("(pointer: coarse)").matches),
        pendingPlacement: Boolean(buildInteraction.pendingCellKey), inputEngaged: false, paused: game.state === "paused"
      });
      trainingSession.view.render({ active: state.active, inBuild: game.state === "building", stageId: state.stageId,
        title: state.title, buildLabel: presentation.buildLabel, buildHighlighted: presentation.buildHighlighted,
        highlightTarget: presentation.highlightTarget,
        action: presentation.action, progressText: presentation.progressText, status: trainingSession.failed ? "failed" : state.status,
        completed: state.status === "complete", paused: game.state === "paused" && !trainingSession.failed,
        matter: Math.floor(game.matter), allowBuild: !trainingSession.failed && state.status !== "complete", canReturnToRun: Boolean(trainingSession.previousGame && !trainingSession.previousGame.finished) });
    }

    function openTrainingBuild() {
      if (!trainingSession || !game || !game.training) return;
      var state = trainingSession.controller.snapshot();
      if (state.stageId !== "combat") {
        clearBuildInteraction();
        selectedBuildModule = "cannon";
      }
      openBuild();
    }

    function enterTrainingStage(state, reason) {
      if (!trainingSession || !game || !game.training) return;
      clearBuildInteraction();
      game.state = state.completed ? "training_complete" : "playing";
      game.finished = false;
      trainingSession.failed = false;
      if (reason !== "advance") {
        game.accumulator = 0;
        game.lastFrame = performance.now();
        game.ship.vx = 0; game.ship.vy = 0; game.ship.angularVelocity = 0;
      }
      ui.buildOverlay.classList.add("hidden");
      ui.pauseOverlay.classList.add("hidden");
      trainingSession.arena.prepare(game, state, reason);
      trainingShipState();
      updateHud();
    }

    function startTraining() {
      if (!trainingApi || !trainingArenaApi || !trainingViewApi || (game && game.training)) return;
      closeModulePreview();
      resetMobileInput();
      keys = Object.create(null);
      clearBuildInteraction();
      var previousGame = game;
      if (previousGame && !previousGame.finished && previousGame.state === "playing") {
        previousGame.state = "paused";
        if (playtestTelemetry) playtestTelemetry.recordPause(true, previousGame.elapsed, "training");
      }
      var session = { previousGame: previousGame, previousModule: selectedBuildModule, telemetry: playtestTelemetry, debug: DEBUG, completed: false, failed: false };
      playtestTelemetry = null;
      DEBUG = false;
      game = new Game({ training: true });
      game.matter = 30;
      selectedBuildModule = "cannon";
      trainingSession = session;
      session.arena = trainingArenaApi.create({ replacementPrice: function () { return modulePrice("cannon"); },
        makeTile: function (type, x, y) { return makeTile(type, x, y, type === "core", 1, true); } });
      session.controller = trainingApi.create({ onStage: enterTrainingStage, onChange: updateTrainingView,
        onComplete: function () { session.completed = true; game.state = "training_complete"; game.accumulator = 0; updateTrainingView(); } });
      session.view = trainingViewApi.create({ onExit: leaveTraining, onReturn: leaveTraining,
        onOpenBuild: openTrainingBuild, onPause: function () { openPause("training"); }, onRetry: function () { session.controller.retry(); } });
      settingsOpenedFromMenu = false;
      [ui.menu, ui.hangarOverlay, ui.resultOverlay, ui.milestoneOverlay, ui.buildOverlay, ui.pauseOverlay, ui.debugBar, ui.bossHud].forEach(function (element) { element.classList.add("hidden"); });
      ui.hud.classList.remove("hidden");
      audio.ensure();
      session.controller.start({ cannonCopies: 1, cannonLevel: 0 });
      updateHud();
    }

    function leaveTraining() {
      if (!trainingSession) return;
      closeModulePreview();
      var session = trainingSession;
      clearBuildInteraction();
      session.controller.stop();
      session.view.destroy();
      trainingSession = null;
      game = session.previousGame;
      playtestTelemetry = session.telemetry;
      DEBUG = session.debug;
      selectedBuildModule = session.previousModule;
      resetMobileInput();
      keys = Object.create(null);
      [ui.buildOverlay, ui.pauseOverlay, ui.resultOverlay, ui.milestoneOverlay].forEach(function (element) { element.classList.add("hidden"); });
      if (session.completed) { save.training = { version: 1, completed: true }; storeSave(); }
      if (game && !game.finished) {
        game.lastFrame = performance.now();
        game.accumulator = 0;
        ui.hud.classList.remove("hidden");
        ui.menu.classList.add("hidden");
        ui.debugBar.classList.toggle("hidden", !DEBUG);
        ui.bossHud.classList.toggle("hidden", !game.bossSpawned);
        // The suspended run remains paused until the player resumes it.
        game.state = "paused";
        settingsOpenedFromMenu = false;
        ui.pauseEyebrow.textContent = "RUN PRESERVED";
        ui.pauseTitle.textContent = "Paused";
        ui.resumeButton.textContent = "Resume [P]";
        ui.restartButton.classList.add("hidden");
        ui.pauseHangarButton.classList.remove("hidden");
        ui.pauseHangarButton.textContent = "End run & bank";
        ui.pauseOverlay.classList.remove("hidden");
        syncSettingsUi();
        updateHud();
      } else {
        game = null;
        settingsOpenedFromMenu = false;
        ui.hud.classList.add("hidden");
        ui.debugBar.classList.add("hidden");
        ui.bossHud.classList.add("hidden");
        ui.menu.classList.remove("hidden");
        renderStarterSelection();
        renderMetaShop();
        renderCores();
      }
    }

    function failTrainingLesson() {
      if (!trainingSession || !game || !game.training) return;
      game.state = "paused";
      game.accumulator = 0;
      trainingSession.failed = true;
      updateTrainingView();
    }


    if (saveNeedsMigration) storeSave();

    function makeStars() {
      stars = [];
      var count = Math.max(80, Math.floor(viewWidth * viewHeight / 11000));
      var qualityTier = currentQualityTier();
      if (qualityTier > 0) count = Math.max(qualityTier > 1 ? 45 : 60, Math.floor(count * (qualityTier > 1 ? .5 : .72)));
      for (var i = 0; i < count; i += 1) {
        stars.push({
          x: Math.random() * viewWidth,
          y: Math.random() * viewHeight,
          size: Math.random() * 1.5 + .35,
          alpha: Math.random() * .48 + .12,
          depth: Math.random() * .7 + .15
        });
      }
    }

    function resize() {
      var qualityTier = currentQualityTier();
      dpr = Math.min(qualityTier > 1 ? 1 : (qualityTier > 0 ? 1.25 : 1.5), window.devicePixelRatio || 1);
      viewWidth = innerWidth;
      viewHeight = innerHeight;
      canvas.width = Math.floor(viewWidth * dpr);
      canvas.height = Math.floor(viewHeight * dpr);
      canvas.style.width = viewWidth + "px";
      canvas.style.height = viewHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      backgroundGradient = ctx.createRadialGradient(
        viewWidth * .5, viewHeight * .45, 0,
        viewWidth * .5, viewHeight * .45, Math.max(viewWidth, viewHeight) * .75
      );
      backgroundGradient.addColorStop(0, "#0a1730");
      backgroundGradient.addColorStop(.55, "#060d1e");
      backgroundGradient.addColorStop(1, "#030611");
      makeStars();
      buildEnemySpriteCache();
    }

    function showToast(message, previewType) {
      ui.toast.textContent = message;
      if (previewType) {
        var previewButton = document.createElement("button");
        previewButton.className = "toast-preview";
        previewButton.textContent = "Preview";
        previewButton.setAttribute("aria-label", "Preview " + MODULES[previewType].name);
        previewButton.addEventListener("click", function () { openModulePreview(previewType, "unlock"); });
        ui.toast.appendChild(previewButton);
      }
      ui.toast.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () {
        ui.toast.classList.remove("show");
      }, previewType ? 6000 : 1500);
    }

    function modulePreviewState(type, context) {
      var state = progression.status(save.progression, type);
      var activeRun = Boolean(game && !game.finished);
      if (context === "build") {
        var level = game && game.upgrades[type] ? game.upgrades[type].level + 1 : 1;
        return { status: isWeaponType(type) ? "This run: Lv" + level + ". Preview shows the base weapon." : "Preview only. Return to Build to attach this module.", actionKind: null };
      }
      if (state.owned) {
        var canSelect = isStarterWeapon(type) && !activeRun;
        return { status: "Unlocked · Buy copies in Build with Matter.", actionKind: canSelect ? "starter" : null,
          actionLabel: selectedStarter === type ? "Starting weapon selected" : "Use as starting weapon", actionDisabled: selectedStarter === type };
      }
      var explanation = state.available ? (save.fragments >= state.cost ? "Unlock for every run. Buy copies in Build with Matter." : "Goal complete · Need " + Math.ceil(state.cost - save.fragments) + " more Fragments") : state.objective.text;
      var balance = " · " + Math.floor(save.fragments) + " Fragments available";
      return { status: explanation + (activeRun ? " · Buy in Hangar after this run." : balance), actionKind: "buy",
        actionLabel: "Unlock · " + state.cost + " Fragments", actionDisabled: activeRun || !state.available || save.fragments < state.cost };
    }

    function modulePreviewAction(type, kind) {
      if (!modulePreviewSession || modulePreviewSession.type !== type) return false;
      var state = modulePreviewState(type, modulePreviewSession.context);
      if (state.actionKind !== kind || state.actionDisabled) return false;
      var changed = false;
      if (kind === "buy") changed = buyModuleUnlock(type);
      else if (kind === "starter") { selectStarter(type); changed = selectedStarter === type; }
      if (modulePreviewPanel) modulePreviewPanel.refresh();
      return changed;
    }

    function restoreModulePreview() {
      var session = modulePreviewSession;
      modulePreviewSession = null;
      if (!session) return;
      if (game && game === session.owner && !game.finished && session.previousState === "playing" && game.state === "paused") {
        game.state = "playing";
        game.accumulator = 0;
        game.lastFrame = performance.now();
        if (playtestTelemetry) playtestTelemetry.recordPause(false, game.elapsed, "module_preview");
      }
      if (game) updateHud();
      if (session.context === "hangar" && ui.weaponPicker.querySelector) {
        var card = ui.weaponPicker.querySelector('[data-module="' + session.type + '"]');
        if (card && card.focus) card.focus({ preventScroll: true });
      } else if (session.context === "result") {
        // A purchase can remove the offer which originally opened the preview.
        var resultTarget = ui.resultUnlocks.children[0] || ui.hangarButton;
        if (resultTarget && resultTarget.focus) resultTarget.focus({ preventScroll: true });
      }
    }

    function openModulePreview(type, context) {
      if (!Object.prototype.hasOwnProperty.call(MODULES, type) || !window.DriftModulePreviewPanel || !window.DriftModulePreview) return false;
      if (buildInteraction && buildInteraction.drag) return false;
      if (!modulePreviewPanel) modulePreviewPanel = window.DriftModulePreviewPanel.create({ definitions: MODULES,
        drawIcon: function (context, type, x, y) { drawModuleGlyph({ type: type, aim: 0 }, x, y, context); },
        getState: modulePreviewState, onAction: modulePreviewAction, onClose: restoreModulePreview });
      if (!modulePreviewSession) {
        modulePreviewSession = { owner: game, previousState: game ? game.state : null, type: type, context: context || "hangar" };
        resetMobileInput();
        keys = Object.create(null);
        if (game && !game.finished && game.state === "playing") {
          game.state = "paused";
          game.accumulator = 0;
          if (playtestTelemetry) playtestTelemetry.recordPause(true, game.elapsed, "module_preview");
        }
      } else { modulePreviewSession.type = type; modulePreviewSession.context = context || "hangar"; }
      modulePreviewNew.delete(type);
      if (ui.weaponPicker.querySelector) {
        var badge = ui.weaponPicker.querySelector('[data-module="' + type + '"] .new-unlock');
        if (badge) badge.remove();
      }
      modulePreviewPanel.open(type, modulePreviewSession.context);
      if (game) updateHud();
      return true;
    }

    function closeModulePreview() {
      if (modulePreviewPanel && modulePreviewPanel.isOpen()) modulePreviewPanel.close();
      else restoreModulePreview();
    }

    function updateSaveStatus(isError) {
      if (!ui || !ui.saveStatus) return;
      ui.saveStatus.textContent = saveStorageStatus;
      ui.saveStatus.classList.toggle("error", Boolean(isError) || saveStorageStatus.indexOf("FAILED") >= 0 || saveStorageStatus.indexOf("UNAVAILABLE") >= 0);
    }

    function syncLoadoutToSave() {
      starterTiles.clear();
      starterTiles.set("0,-1", selectedStarter);
      save.lastLoadout.selectedWeapon = selectedStarter;
      save.lastLoadout.tile = { x: 0, y: -1, type: selectedStarter };
      storeSave();
    }

    function modulePrice(type) {
      var def = MODULES[type];
      return Math.ceil(def.baseCost * Math.pow(def.scale, installedModuleCopies(type)));
    }

    function moduleCategory(type) {
      if (WEAPON_TYPES.indexOf(type) >= 0) return "weapon";
      if (type === "armor" || type === "bulkhead") return "structure";
      return "system";
    }

    function moduleRole(type) {
      var roles = {
        armor: "Hull", cannon: "Kinetic", laser: "Pierce", missile: "Splash",
        scatter: "Close range", arc: "Chain", rail: "Heavy", flak: "Defense",
        pulse: "Crowd", cryo: "Control", mine: "Trap", ember: "Burn", gravity: "Pull", shield: "Barrier",
        drive: "Mobility", repair: "Repair", reactor: "Fire rate",
        collector: "Economy", bulkhead: "Guard"
      };
      return roles[type] || "Module";
    }

    function moduleStats(type) {
      var def = MODULES[type];
      var stats = [];
      if (def.damage !== undefined) stats.push((def.fieldDuration ? "DPS " : "DMG ") + def.damage);
      if (def.cooldown) stats.push("RATE " + (1 / def.cooldown).toFixed(1) + "/S");
      if (def.range) stats.push("RANGE " + def.range);
      if (def.blastRadius) stats.push("BLAST " + def.blastRadius);
      if (def.burnDamage) stats.push("BURN " + def.burnDamage + "/S");
      if (def.fieldRadius) stats.push("FIELD " + def.fieldRadius);
      if (!stats.length) stats.push("HP " + def.hp);
      if (type === "shield") stats.push("SHIELD " + def.shield);
      if (type === "drive") stats.push("SPEED +" + Math.round(def.driveBonus * 100) + "%");
      if (type === "repair") stats.push("PULSE " + def.repairAmount + " / " + def.repairInterval + "S");
      if (type === "reactor") stats.push("RATE +" + Math.round(def.cooldownBonus * 100) + "%");
      if (type === "collector") stats.push("MATTER +" + Math.round(def.matterBonus * 100) + "%");
      if (type === "bulkhead") stats.push("RESIST " + Math.round(def.damageReduction * 100) + "%");
      return stats.slice(0, 4);
    }

    function statLineHtml(type) {
      return '<div class="stat-line">' + moduleStats(type).map(function (stat) {
        return "<span>" + stat + "</span>";
      }).join("") + "</div>";
    }

    function moduleIconHtml(type) {
      var paths = {
        armor: '<rect x="-11" y="-11" width="22" height="22"/><path d="M-8-8 8 8M8-8-8 8"/>',
        cannon: '<rect x="-8" y="-2" width="16" height="12"/><path d="M-3-2v-12h6v12"/>',
        scatter: '<path d="M-10 8h20V0H-10ZM-7 0-10-12M0 0v-14M7 0 10-12"/>',
        laser: '<path d="m0-6 9 8-9 9-9-9ZM0-6v-9M-5-12H5"/>',
        missile: '<path d="M-5 8V-6L0-13 5-6V8ZM-5 4-10 11H10L5 4"/>',
        arc: '<path d="M3-13-7 0H1L-3 13 8-2H0Z"/>',
        rail: '<path d="M-8 10H8V-1H-8ZM-3-1v-14M3-1v-14M-6-12H6"/>',
        flak: '<rect x="-9" y="-1" width="18" height="12"/><path d="M-5-1v-12M5-1v-12M-8-13h6M2-13h6"/>',
        pulse: '<circle r="5"/><circle r="12"/><path d="M0-15v4M0 11v4M-15 0h4M11 0h4"/>',
        cryo: '<path d="M0-13V13M-11-6 11 6M-11 6 11-6M-4-10 0-6 4-10M-4 10 0 6 4 10"/>',
        mine: '<circle r="8"/><path d="M0-8v-6M0 8v6M-8 0h-6M8 0h6M-6-6-10-10M6 6 10 10M-6 6-10 10M6-6 10-10"/>',
        ember: '<path d="M-7 12H7V2H-7ZM-7-2-11-12M0-2V-15M7-2 11-12M-3-6 0-11 3-6"/>',
        gravity: '<circle cy="2" r="9"/><circle cy="2" r="3"/><path d="M0-15V-8M-12-9-7-5M12-9 7-5"/>',
        shield: '<path d="M0-12 11-7V1Q11 9 0 14Q-11 9-11 1V-7Z"/>',
        drive: '<path d="M-10 2 0-12 10 2M-8 10 0-1 8 10"/>',
        repair: '<path d="M-4-12H4V-4H12V4H4V12H-4V4H-12V-4H-4Z"/>',
        reactor: '<path d="M0-13 11-6V6L0 13-11 6V-6ZM2-8-4 1H2L-2 8"/>',
        collector: '<path d="M-11-9V2a11 11 0 0 0 22 0V-9H5V2a5 5 0 0 1-10 0V-9ZM-11-3H-5M5-3H11"/>',
        bulkhead: '<rect x="-12" y="-10" width="24" height="20"/><path d="M-7-10V10M7-10V10M-7 0H7"/>'
      };
      return '<svg class="module-icon" viewBox="-16 -16 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (paths[type] || "") + '</svg>';
    }

    function moduleGlyphHtml(type) {
      return '<span class="module-glyph" style="color:' + MODULES[type].color + '">' + moduleIconHtml(type) + '</span>';
    }

    function renderStarterPicker() {
      ui.weaponPicker.innerHTML = "";
      var moduleOrder = ["cannon", "armor"].concat(progression.definitions.map(function (definition) { return definition.type; }));
      moduleOrder.sort(function (a, b) {
        function rank(type) { var state = progression.status(save.progression, type); return state.owned ? 0 : (state.available ? 1 : 2); }
        return rank(a) - rank(b);
      });
      moduleOrder.forEach(function (type) {
        var def = MODULES[type];
        var state = progression.status(save.progression, type);
        var objective = state.objective;
        var canSelect = state.owned && isStarterWeapon(type);
        var canBuy = state.available && save.fragments >= state.cost;
        var button = document.createElement("button");
        button.dataset.module = type;
        button.className = "pick-button" + (selectedStarter === type ? " selected" : "") + (state.owned ? " owned" : (state.available ? " available" : " locked"));
        button.disabled = false;
        button.title = def.description;
        button.innerHTML = moduleGlyphHtml(type) + '<strong>' + def.name + '</strong><span class="pick-role">' + def.summary + '</span>';
        if (modulePreviewNew.has(type)) button.innerHTML += '<span class="new-unlock">NEW</span>';
        if (state.owned) {
          button.innerHTML += '<span class="ownership-state">' + (selectedStarter === type ? "Starting weapon · Preview" : "Unlocked · Preview") + '</span>';
        } else {
          if (!state.available && objective) {
            var definition = progression.definitions.find(function (item) { return item.type === type; });
            var labels = { totalKills: "Total kills", bestTime: "Best survival", bossesDefeated: "Bosses defeated", totalUpgrades: "Weapon upgrades" };
            var progressLabel = labels[definition.stat];
            var count = definition.stat === "bestTime" ? formatTime(objective.current) + " / " + formatTime(objective.target) : Math.floor(objective.current) + " / " + objective.target;
            button.innerHTML += '<span class="unlock-requirement">' + progressLabel + ': ' + count + '</span>';
          }
          button.innerHTML += '<span class="module-unlock-cost">' + state.cost + ' Fragments · Preview</span>';
          if (state.available && !canBuy) button.innerHTML += '<span class="unlock-requirement">Need ' + Math.ceil(state.cost - save.fragments) + ' more Fragments</span>';
        }
        button.setAttribute("aria-haspopup", "dialog");
        button.addEventListener("click", function () {
          openModulePreview(type, "hangar");
        });
        ui.weaponPicker.appendChild(button);
      });
    }

    function buyModuleUnlock(type) {
      if (game && game.training) return false;
      if (game && !game.finished) return false;
      var result = progression.purchase(save.progression, type, save.fragments);
      if (!result) return false;
      save.fragments = result.fragments;
      storeSave();
      renderStarterPicker();
      renderStarterSelection();
      renderMetaShop();
      showToast(MODULES[type].name + " unlocked for future runs");
      audio.tone(330, .16, .045, "sine", 360);
      return true;
    }

    function renderStarterSelection() {
      var def = MODULES[selectedStarter];
      ui.starterBrief.innerHTML = moduleGlyphHtml(selectedStarter) + '<div><span class="module-role">Starting weapon</span><strong>' + def.name + '</strong></div><div class="loadout-core"><span class="module-role">Core</span><strong>' + campaign.getCore(save.campaign.selectedCore).name.replace(" Core", "") + '</strong></div>';
      ui.startWeaponGlyph.innerHTML = moduleIconHtml(selectedStarter);
      ui.startWeaponGlyph.style.color = def.color;
      ui.startWeaponGlyph.style.borderColor = def.color;
      ui.startWeaponName.textContent = def.name;
      ui.startWeaponRole.textContent = campaign.getCore(save.campaign.selectedCore).name;
    }

    function selectStarter(type) {
      if (game && game.training) return;
      if (!isStarterWeapon(type) || !progression.isUnlocked(save.progression, type)) return;
      selectedStarter = type;
      syncLoadoutToSave();
      renderStarterPicker();
      renderStarterSelection();
    }

    function renderObjectives() {
      var model = progressionView.buildResultModel(progression, save.progression, save.fragments,
        game ? game.runUnlocks : [], MODULES);
      var heading = document.getElementById("resultUnlockHeading");
      var goalCard = document.getElementById("resultObjectiveCard");
      document.getElementById("resultBankedBalance").textContent = Math.floor(save.fragments) + " Fragments in Hangar";
      var carriedReward = progression.settleRunReward(null, save.fragmentCarryUnits);
      var carryPercent = Math.floor(carriedReward.carryUnits / carriedReward.scale * 100);
      document.getElementById("resultFragmentProgress").textContent = carriedReward.carryUnits > 0
        ? "Next Fragment: " + (carryPercent > 0 ? carryPercent : "<1") + "% · saved" : "";
      document.getElementById("resultProgressHint").textContent = "Licenses and permanent upgrades stay. Matter and weapon levels start fresh next run.";
      heading.textContent = model.affordableCount > model.offers.length ? "You can buy · " + model.affordableCount + " modules in Hangar" : "You can buy for your next run";
      heading.classList.toggle("hidden", !model.offers.length);
      ui.resultUnlocks.innerHTML = "";
      ui.resultUnlocks.classList.toggle("hidden", !model.offers.length);
      model.offers.forEach(function (offer) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "result-purchase-card";
        button.dataset.preview = offer.type;
        button.setAttribute("aria-haspopup", "dialog");
        button.innerHTML = moduleGlyphHtml(offer.type) + '<span class="result-purchase-copy"><strong>' + MODULES[offer.type].name +
          '</strong><span>' + offer.cost + ' Fragments' + (offer.newlyAvailable ? ' · Discovered this run' : '') +
          '</span></span><span class="result-purchase-action">Preview →</span>';
        button.addEventListener("click", function () { openModulePreview(offer.type, "result"); });
        ui.resultUnlocks.appendChild(button);
      });
      goalCard.classList.toggle("hidden", !model.goal);
      document.getElementById("resultObjectiveLabel").textContent = model.goal ? model.goal.label : "";
      ui.resultObjectiveText.textContent = model.goal ? model.goal.text : "";
      ui.resultObjectiveProgress.max = model.goal ? model.goal.max : 1;
      ui.resultObjectiveProgress.value = model.goal ? model.goal.value : 0;
      ui.resultObjectiveProgress.setAttribute("aria-label", model.goal ? model.goal.text : "");
      var ownedCount = Object.keys(MODULES).filter(function (type) { return progression.isUnlocked(save.progression, type); }).length;
      document.getElementById("hangarStatusSummary").classList.remove("hidden");
      document.getElementById("hangarStatusSummary").textContent = ownedCount + " unlocked · " + model.affordableCount + " affordable · Preview any module";
    }

    Game.prototype.recordProgress = function (delta) {
      if (this !== game || this.training) return;
      var unlocked = progression.apply(save.progression, delta);
      if (!unlocked.length) return;
      Array.prototype.push.apply(this.runUnlocks, unlocked);
      unlocked.forEach(function (type) { modulePreviewNew.add(type); });
      storeSave();
      renderObjectives();
    };

    function renderCores() {
      ui.startRunMode.textContent = "Survival · 10 min + continue";
      ui.startButton.disabled = false;
      ui.startWeaponRole.textContent = campaign.getCore(save.campaign.selectedCore).name;
      ui.corePicker.innerHTML = "";
      campaign.cores.forEach(function (core) {
        var owned = campaign.isCoreOwned(save.campaign, core.id);
        var available = campaign.isCoreAvailable(save.campaign, core.id, save.progression);
        var selectedCore = save.campaign.selectedCore === core.id;
        var button = document.createElement("button");
        button.className = "core-card" + (selectedCore ? " selected" : "");
        button.dataset.core = core.id;
        button.style.borderLeft = "3px solid " + CORE_COLORS[core.id];
        button.disabled = !owned && (!available || save.fragments < core.cost);
        button.setAttribute("aria-pressed", String(selectedCore));
        button.innerHTML = "<strong>" + core.name + "</strong><small>" + core.description + '</small><span class="core-state">' +
          (owned ? (selectedCore ? "Selected" : "Equip") : (available ? "Unlock · " + core.cost + " Fragments" : campaign.coreRequirementText(core.id) + " · " + core.cost + " F")) + "</span>";
        button.addEventListener("click", function () {
          if (game && !game.finished) return;
          if (!campaign.isCoreOwned(save.campaign, core.id)) {
            var purchase = campaign.purchaseCore(save.campaign, core.id, save.fragments, save.progression);
            if (!purchase) return;
            save.fragments = purchase.fragments;
          }
          save.campaign.selectedCore = core.id;
          storeSave();
          renderMetaShop();
          renderStarterPicker();
          renderStarterSelection();
        });
        ui.corePicker.appendChild(button);
      });
    }

    function renderMetaShop() {
      ui.fragmentCount.textContent = Math.floor(save.fragments);
      ui.menuFragmentCount.textContent = Math.floor(save.fragments);
      ui.bestRun.textContent = "BEST " + formatTime(save.bestTime);
      ui.victoryCount.textContent = save.progression.bossesDefeated + " BOSSES DEFEATED";
      renderObjectives();
      ui.metaList.innerHTML = "";
      META_DEFS.forEach(function (def) {
        var level = save.meta[def.id];
        var cost = metaCost(level);
        var button = document.createElement("button");
        button.className = "meta-card" + (def.legacy && !level ? " hidden" : "");
        button.disabled = def.legacy || level >= META_PURCHASE_CAP || save.fragments < cost;
        var effect = def.legacy ? def.description : progressionView.buildMetaComparison(level, META_PURCHASE_CAP, def.bonusPercent, def.unit).text;
        button.innerHTML = "<strong>" + def.name + " &nbsp; " + level + "/" + Math.max(level, META_PURCHASE_CAP) + '</strong><small class="meta-effect">' + effect +
          '</small><small class="meta-scope">Every run</small><span class="meta-price">' + (def.legacy ? "RETAINED" : (level >= META_PURCHASE_CAP ? "MAX" : "Buy · " + cost + " F")) + "</span>";
        button.addEventListener("click", function () {
          if ((game && !game.finished) || def.legacy || save.meta[def.id] >= META_PURCHASE_CAP) return;
          var currentCost = metaCost(save.meta[def.id]);
          if (save.fragments < currentCost) return;
          save.fragments -= currentCost;
          save.meta[def.id] += 1;
          storeSave();
          audio.tone(330, .16, .045, "sine", 360);
          renderMetaShop();
          renderStarterPicker();
        });
        ui.metaList.appendChild(button);
      });
      renderCores();
    }

    function makeTile(type, x, y, isCore, durabilityMultiplier, neutralStats) {
      var def = isCore ? { hp: 350 + (neutralStats ? 0 : save.meta.core * 10), mass: 1.5 } : MODULES[type];
      var hpMultiplier = (isCore ? 1 : 1 + (neutralStats ? 0 : save.meta.modules * .05)) * (durabilityMultiplier || 1);
      var maxHp = def.hp * hpMultiplier;
      return {
        type: isCore ? "core" : type,
        x: x,
        y: y,
        hp: maxHp,
        maxHp: maxHp,
        mass: def.mass,
        cooldown: Math.random() * .18,
        shield: type === "shield" ? def.shield : 0,
        maxShield: type === "shield" ? def.shield : 0,
        shieldDelay: 0,
        repairDelay: 0,
        repairCooldown: 0,
        supportClock: Math.random() * .6,
        aim: -Math.PI / 2,
        aimTargetId: 0,
        flash: 0
      };
    }

    function Game(options) {
      this.training = Boolean(options && options.training);
      this.state = "playing";
      this.coreDef = campaign.getCore(this.training ? "standard" : save.campaign.selectedCore);
      this.survivalCompleted = false;
      this.continued = false;
      this.ship = {
        x: 0, y: 0, angle: 0,
        vx: 0, vy: 0, angularVelocity: 0,
        tiles: new Map()
      };
      this.ship.tiles.set("0,0", makeTile("core", 0, 0, true, 1, this.training));
      var startingCore = this.ship.tiles.get("0,0");
      startingCore.maxHp *= this.coreDef.hpMultiplier;
      startingCore.hp = startingCore.maxHp;
      this.purchasedCounts = {};
      Object.keys(MODULES).forEach(function (type) { this.purchasedCounts[type] = 0; }, this);
      (this.training ? new Map([["0,-1", "cannon"]]) : starterTiles).forEach(function (type, key) {
        var coord = parseKey(key);
        this.ship.tiles.set(key, makeTile(type, coord.x, coord.y, false, this.training ? 1 : 1.5 * this.coreDef.moduleHpMultiplier, this.training));
        this.purchasedCounts[type] += 1;
      }, this);
      // Family upgrades survive losses; destroying copies must not discount those upgrades.
      this.upgradeFleetSizes = Object.assign({}, this.purchasedCounts);
      this.matter = 0;
      this.upgrades = {};
      this.weaponDefinitions = {};
      WEAPON_TYPES.forEach(function (type) { this.weaponDefinitions[type] = runUpgrades.resolve(MODULES[type]); }, this);
      this.runUnlocks = [];
      this.progressSaveAt = 5;
      this.kills = 0;
      this.modulesLost = 0;
      this.elapsed = 0;
      this.ambientSpawnClock = 3.6 + Math.random() * 1.2;
      this.assaultClock = ASSAULT_FIRST_DELAY;
      this.assaultIndex = 0;
      this.ambientPacksSpawned = 0;
      this.totalEnemiesSpawned = 0;
      this.enemyId = 1;
      this.enemies = [];
      this.projectiles = [];
      this.particles = [];
      this.effects = [];
      this.gravityFields = [];
      this.camera = { x: 0, y: 0, shakeX: 0, shakeY: 0, zoom: 1, targetZoom: 1 };
      this.boss = null;
      this.bossSpawned = false;
      this.bossWarningShown = false;
      this.pendingBossAngle = null;
      this.bossDefeated = false;
      this.bossesDefeated = 0;
      this.nextBossAt = BOSS_SPAWN_TIME;
      this.recoveryUntil = 0;
      this.finished = false;
      this.accumulator = 0;
      this.lastFrame = performance.now();
      this.enemyGrid = new Map();
      this.enemyGridBuckets = [];
      this.enemyGridBucketCount = 0;
      this.enemyById = new Map();
      this.nearbyBuffer = [];
      this.shieldBuffer = [];
      this.enemyPool = [];
      this.projectilePool = [];
      this.particlePool = [];
      this.effectPool = [];
      this.backgroundPulse = 0;
      this.shakeTrauma = 0;
      this.damageVignette = 0;
      this.damageWarningTimer = 0;
      this.damageWarningText = "";
      this.coreWarningStage = 0;
      this.telegraphSoundClock = 0;
      this.separationClock = 0;
      if (!this.training) this.spawnAssaultWave(true);
    }

    Game.prototype.gridToWorld = function (gx, gy) {
      var lx = gx * TILE_SIZE;
      var ly = gy * TILE_SIZE;
      var cos = Math.cos(this.ship.angle);
      var sin = Math.sin(this.ship.angle);
      return {
        x: this.ship.x + lx * cos - ly * sin,
        y: this.ship.y + lx * sin + ly * cos
      };
    };

    Game.prototype.shipMass = function () {
      var total = 0;
      this.ship.tiles.forEach(function (tile) { total += tile.mass || 1; });
      return total;
    };

    Game.prototype.driveMultiplier = function () {
      var drives = 0;
      this.ship.tiles.forEach(function (tile) {
        if (tile.type === "drive") drives += 1;
      });
      return (1 + drives * MODULES.drive.driveBonus) * (1 + (this.training ? 0 : save.meta.drive * .03)) * this.coreDef.speedMultiplier;
    };

    Game.prototype.isAdjacentToShip = function (x, y) {
      return this.ship.tiles.has(keyOf(x + 1, y)) ||
        this.ship.tiles.has(keyOf(x - 1, y)) ||
        this.ship.tiles.has(keyOf(x, y + 1)) ||
        this.ship.tiles.has(keyOf(x, y - 1));
    };

    Game.prototype.findTarget = function (tile, range) {
      var origin = this.gridToWorld(tile.x, tile.y);
      var best = null;
      var bestDistance = range * range;
      if (!this.enemyGrid || this.enemyGrid.size === 0) {
        for (var i = 0; i < this.enemies.length; i += 1) {
          var fallbackEnemy = this.enemies[i];
          if (fallbackEnemy.dead) continue;
          var fallbackDistance = distanceSquared(origin.x, origin.y, fallbackEnemy.x, fallbackEnemy.y);
          if (fallbackDistance < bestDistance) {
            best = fallbackEnemy;
            bestDistance = fallbackDistance;
          }
        }
        return best;
      }

      var gridX = Math.floor(origin.x / SPATIAL_CELL_SIZE);
      var gridY = Math.floor(origin.y / SPATIAL_CELL_SIZE);
      var cellRadius = Math.ceil(range / SPATIAL_CELL_SIZE);
      for (var offsetY = -cellRadius; offsetY <= cellRadius; offsetY += 1) {
        for (var offsetX = -cellRadius; offsetX <= cellRadius; offsetX += 1) {
          var bucket = this.enemyGrid.get(spatialKey(gridX + offsetX, gridY + offsetY));
          if (!bucket) continue;
          for (var bucketIndex = 0; bucketIndex < bucket.length; bucketIndex += 1) {
            var enemy = bucket[bucketIndex];
            if (enemy.dead) continue;
            var d2 = distanceSquared(origin.x, origin.y, enemy.x, enemy.y);
            if (d2 < bestDistance) {
              best = enemy;
              bestDistance = d2;
            }
          }
        }
      }
      return best;
    };

    Game.prototype.spawnEnemy = function (type, x, y) {
      var def = ENEMY_DEFS[type];
      if (!def || (type !== "boss" && this.enemies.length >= MAX_ACTIVE_ENEMIES)) return null;
      if (x === undefined || y === undefined) {
        var angle = Math.random() * TAU;
        var radius = Math.max(viewWidth, viewHeight) * .53 + 90 + Math.random() * 70;
        x = this.ship.x + Math.cos(angle) * radius;
        y = this.ship.y + Math.sin(angle) * radius;
      }
      var enemy = this.enemyPool.pop() || {};
      var clearedBosses = Math.min(this.bossesDefeated || 0, 10);
      var heavyBody = type === "brute" || type === "bulwark" || type === "colossus";
      var heavyGrowth = heavyBody ? 1 + Math.min(Math.max(this.elapsed || 0, 0), 1200) / 600 * .12 : 1;
      var healthScale = (1 + clearedBosses * .15) * heavyGrowth;
      var pressureScale = Math.min(clearedBosses, 5);
      enemy.id = this.enemyId++;
      enemy.type = type;
      enemy.trainingTarget = null;
      enemy.x = x;
      enemy.y = y;
      enemy.vx = 0;
      enemy.vy = 0;
      enemy.hp = def.hp * healthScale;
      enemy.maxHp = enemy.hp;
      enemy.shield = def.shield || 0;
      enemy.maxShield = def.shield || 0;
      enemy.speed = def.speed * (1 + pressureScale * .03);
      enemy.radius = def.radius;
      enemy.damage = def.damage * (1 + pressureScale * .12);
      enemy.reward = def.reward;
      enemy.color = def.color;
      enemy.sides = def.sides;
      enemy.fireClock = 1 + Math.random();
      enemy.attackCharge = 0;
      enemy.attackChargeMax = 0;
      enemy.lockedAimX = 0;
      enemy.lockedAimY = 0;
      enemy.age = 0;
      enemy.orbitDirection = Math.random() < .5 ? -1 : 1;
      enemy.phaseOffset = Math.random() * TAU;
      enemy.turnRate = def.turnRate || 0;
      enemy.directChase = Boolean(def.directChase);
      enemy.rotation = Math.random() * TAU;
      enemy.hitFlash = 0;
      enemy.slowTimer = 0;
      enemy.slowFactor = 1;
      enemy.burnTimer = 0;
      enemy.burnDamage = 0;
      enemy.burnTickTime = 0;
      enemy.pendingDamageNumber = 0;
      enemy.damageNumberClock = 0;
      enemy.dead = false;
      this.enemies.push(enemy);
      this.enemyById.set(enemy.id, enemy);
      this.totalEnemiesSpawned = (this.totalEnemiesSpawned || 0) + 1;
      return enemy;
    };

    Game.prototype.currentEnemyPhase = function () {
      var phase = ENEMY_PHASES[0];
      for (var i = 1; i < ENEMY_PHASES.length; i += 1) {
        if (this.elapsed < ENEMY_PHASES[i].at) break;
        phase = ENEMY_PHASES[i];
      }
      return phase;
    };

    Game.prototype.threatLevel = function () {
      return this.currentEnemyPhase().level;
    };

    Game.prototype.endlessPressureStep = function () {
      return Math.min(5, Math.floor(Math.max(0, (this.elapsed || 0) - 600) / 120));
    };

    Game.prototype.chooseEnemyType = function (phase) {
      phase = phase || this.currentEnemyPhase();
      return this.chooseEnemyTypeFromPool(phase.pool);
    };

    Game.prototype.chooseEnemyTypeFromPool = function (pool) {
      var total = 0;
      for (var i = 0; i < pool.length; i += 1) total += pool[i][1];
      var roll = Math.random() * total;
      for (var p = 0; p < pool.length; p += 1) {
        roll -= pool[p][1];
        if (roll <= 0) return pool[p][0];
      }
      return pool[pool.length - 1][0];
    };

    Game.prototype.offscreenSpawnDistance = function (angle, margin) {
      var zoom = Math.max(.35, this.camera.zoom || 1);
      var halfWidth = viewWidth / (2 * zoom);
      var halfHeight = viewHeight / (2 * zoom);
      var absCos = Math.abs(Math.cos(angle));
      var absSin = Math.abs(Math.sin(angle));
      var horizontalEdge = absCos < .001 ? Infinity : halfWidth / absCos;
      var verticalEdge = absSin < .001 ? Infinity : halfHeight / absSin;
      return Math.min(horizontalEdge, verticalEdge) + (margin || 120);
    };

    Game.prototype.offscreenRingDistance = function (margin) {
      var zoom = Math.max(.35, this.camera.zoom || 1);
      var halfWidth = viewWidth / (2 * zoom);
      var halfHeight = viewHeight / (2 * zoom);
      return Math.sqrt(halfWidth * halfWidth + halfHeight * halfHeight) + (margin || 120);
    };

    Game.prototype.spawnAmbientPack = function (phase) {
      phase = phase || this.currentEnemyPhase();
      var packetSize = Math.min(phase.packetSize + this.endlessPressureStep(), MAX_ACTIVE_ENEMIES - this.enemies.length);
      if (packetSize <= 0) return;
      var angle = Math.random() * TAU;
      if (this.elapsed >= 90 && Math.hypot(this.ship.vx || 0, this.ship.vy || 0) > 80 && Math.random() < .5) {
        // Offscreen packs can approach the flight path; a course change still opens an escape.
        angle = Math.atan2(this.ship.vy, this.ship.vx) + (Math.random() - .5) * 1.6;
      }
      var outwardX = Math.cos(angle);
      var outwardY = Math.sin(angle);
      var lateralX = -outwardY;
      var lateralY = outwardX;
      var packMargin = 115 + Math.random() * 80 + Math.max(0, (packetSize - 1) * 15 - 100);
      var distance = this.offscreenSpawnDistance(angle, packMargin);
      var packType = this.chooseEnemyType(phase);
      var rangedPool = phase.rangedPool;
      for (var memberIndex = 0; memberIndex < packetSize; memberIndex += 1) {
        var type = packType;
        if (memberIndex === packetSize - 1 && rangedPool.length && Math.random() < phase.ambientRangedChance) {
          type = this.chooseEnemyTypeFromPool(rangedPool);
        }
        var lateral = (memberIndex - (packetSize - 1) / 2) * 30 + (Math.random() - .5) * 10;
        var depth = Math.abs(memberIndex - (packetSize - 1) / 2) * 12 + Math.random() * 14;
        this.spawnEnemy(type,
          this.camera.x + outwardX * (distance + depth) + lateralX * lateral,
          this.camera.y + outwardY * (distance + depth) + lateralY * lateral);
      }
      this.ambientPacksSpawned += 1;
    };

    Game.prototype.spawnAssaultWave = function (openingWave) {
      var phase = this.currentEnemyPhase();
      var available = MAX_ACTIVE_ENEMIES - this.enemies.length;
      if (available < 4) return false;
      var surge = !openingWave && this.elapsed >= 90 && this.assaultIndex % 3 === 0;
      var squadSize = phase.squadSize + this.endlessPressureStep() * 2;
      if (surge) squadSize = Math.ceil(squadSize * 1.2);
      var directions = phase.directions;
      var formations = ["wedge", "line", "block", "ring", "column"];
      if (this.assaultPhaseLevel !== phase.level) {
        this.assaultGroupIndex = 0;
        this.assaultPhaseLevel = phase.level;
      }
      var firstGroup = openingWave ? 0 : (this.assaultGroupIndex || 0);
      var groupCount = openingWave ? 3 : 1;
      var openingCorner = Math.atan2(-viewHeight, viewWidth);
      var openingSide = Math.random() < .5 ? 1 : -1;
      for (var group = 0; group < groupCount && available >= 4; group += 1) {
        var side = firstGroup + group;
        var heavy = !openingWave && side % 2 === 1 && Math.floor(side / 2) < phase.heavySquads;
        var requestedMembers = openingWave ? (group === 0 ? 8 : (group === 1 ? 16 : 20)) : (heavy ? Math.ceil(squadSize * .65) : squadSize);
        var members = Math.min(available, requestedMembers);
        // One shared origin keeps each formation cohesive while its approach direction varies.
        var sideAngle = Math.random() * TAU;
        if (openingWave) {
          var onRight = (group % 2 === 0 ? openingSide : -openingSide) > 0;
          sideAngle = onRight ? openingCorner : -Math.PI - openingCorner;
        }
        var spawnDistance = openingWave
          ? Math.max(260, this.offscreenSpawnDistance(sideAngle, -55 + group * 240))
          : this.offscreenRingDistance(140 + Math.random() * 45);
        var outward = { x: Math.cos(sideAngle), y: Math.sin(sideAngle) };
        var sideLateral = { x: -outward.y, y: outward.x };
        var formation = openingWave ? "ring" : (heavy ? "block" : formations[Math.floor(Math.random() * formations.length)]);
        var columns = Math.ceil(Math.sqrt(members));
        var packType = openingWave ? "drone" : this.chooseEnemyType(phase);
        var rangedCount = heavy || openingWave ? 0 : Math.min(phase.assaultRanged, members);
        var colossi = 0;
        for (var slotIndex = 0; slotIndex < members; slotIndex += 1) {
          var type = heavy ? this.chooseEnemyTypeFromPool(phase.heavyPool) : packType;
          if (type === "colossus") {
            if (colossi >= 2) type = "brute";
            else colossi += 1;
          }
          if (slotIndex >= members - rangedCount) type = this.chooseEnemyTypeFromPool(phase.rangedPool);
          var lateral = 0;
          var radial = 0;
          if (formation === "wedge") {
            if (slotIndex > 0) {
              var wedgeRank = Math.ceil(slotIndex / 2);
              lateral = (slotIndex % 2 === 0 ? 1 : -1) * wedgeRank * 30;
              radial = wedgeRank * 23;
            }
          } else if (formation === "line") {
            lateral = (slotIndex - (members - 1) / 2) * 32;
            radial = Math.abs(slotIndex - (members - 1) / 2) % 2 * 12;
          } else if (formation === "block") {
            var blockRow = Math.floor(slotIndex / columns);
            var blockColumn = slotIndex % columns;
            var membersInRow = Math.min(columns, members - blockRow * columns);
            lateral = (blockColumn - (membersInRow - 1) / 2) * (heavy ? 48 : 30);
            radial = blockRow * (heavy ? 46 : 30);
          } else if (formation === "ring") {
            var ringAngle = slotIndex / members * TAU;
            lateral = Math.cos(ringAngle) * Math.min(100, 24 + members * 3);
            radial = 34 + Math.sin(ringAngle) * 30;
          } else {
            lateral = (slotIndex % 2 === 0 ? -1 : 1) * 18;
            radial = Math.floor(slotIndex / 2) * 30;
          }
          var distanceFromShip = spawnDistance + radial;
          this.spawnEnemy(type,
            (openingWave ? this.ship.x : this.camera.x) + outward.x * distanceFromShip + sideLateral.x * lateral,
            (openingWave ? this.ship.y : this.camera.y) + outward.y * distanceFromShip + sideLateral.y * lateral);
        }
        available -= members;
      }
      if (openingWave) {
        this.assaultIndex += 1;
        this.assaultGroupIndex = 0;
        this.ambientSpawnClock = 1.2;
      } else {
        this.assaultGroupIndex = (firstGroup + 1) % directions;
        if (this.assaultGroupIndex === 0) {
          this.assaultIndex += 1;
        }
      }
      return true;
    };

    Game.prototype.visibleEnemyCount = function () {
      var zoom = Math.max(.35, this.camera.zoom || 1);
      var halfWidth = viewWidth / (2 * zoom), halfHeight = viewHeight / (2 * zoom), count = 0;
      this.enemies.forEach(function (enemy) {
        if (!enemy.dead && Math.abs(enemy.x - this.camera.x) <= halfWidth + enemy.radius &&
            Math.abs(enemy.y - this.camera.y) <= halfHeight + enemy.radius) count += 1;
      }, this);
      return count;
    };

    Game.prototype.spawnBoss = function () {
      if (this.training) return;
      if (this.finished || (this.boss && !this.boss.dead)) return;
      this.bossSpawned = true;
      var angle = this.pendingBossAngle === null
        ? Math.floor(Math.random() * 4) * Math.PI / 2 + (Math.random() - .5) * .18
        : this.pendingBossAngle;
      this.pendingBossAngle = null;
      var encounterLevel = Math.min(this.bossesDefeated || 0, 1000);
      var sectorIndex = 0;
      var variantIndex = ((this.bossesDefeated || 0) + sectorIndex) % 3;
      var variant = ["ring", "pursuer", "storm"][variantIndex];
      var hp = Math.min(100000000, Math.round(BOSS_BASE_HP * (1 + encounterLevel * .18 + encounterLevel * encounterLevel * .02) * (1 + sectorIndex * .12)));
      var attackDamage = 18 * Math.min(4, 1 + encounterLevel * .08);
      this.compactEnemies();
      if (this.enemies.length >= MAX_ACTIVE_ENEMIES) {
        var farthest = this.enemies.reduce(function (a, b) {
          return distanceSquared(a.x, a.y, this.ship.x, this.ship.y) > distanceSquared(b.x, b.y, this.ship.x, this.ship.y) ? a : b;
        }.bind(this));
        farthest.dead = true;
        this.compactEnemies();
      }
      var boss = {
        id: this.enemyId++,
        type: "boss",
        x: this.ship.x + Math.cos(angle) * 620,
        y: this.ship.y + Math.sin(angle) * 620,
        vx: 0, vy: 0,
        hp: hp, maxHp: hp,
        speed: 105 + Math.min(encounterLevel, 5) * 3,
        radius: 72,
        damage: attackDamage,
        reward: 45 + Math.min(encounterLevel, 5) * 15,
        encounter: (this.bossesDefeated || 0) + 1,
        shotDamage: attackDamage,
        shotCount: variant === "storm" ? 12 + Math.min(6, Math.floor(encounterLevel / 3) * 2) : 8 + Math.min(encounterLevel, 4),
        variant: variant,
        displayName: ["Siege Ring", "Pursuer", "Storm Ring"][variantIndex],
        fanShotCount: variant === "pursuer" ? 5 : 3,
        fanSpread: variant === "pursuer" ? .18 : .2,
        color: ["#ff637c", "#ff9b55", "#a987ff"][variantIndex],
        sides: 12,
        fireClock: 3.2,
        attackCharge: 0,
        attackChargeMax: 0,
        attackIndex: 0,
        attackPattern: variant === "storm" ? "radial" : "aimed",
        lockedAimX: 0,
        lockedAimY: 0,
        volleyAngle: 0,
        chargeAimX: 0,
        chargeAimY: 0,
        chargeTimer: 0,
        chargeSpeed: 320,
        chargeDuration: .9,
        rotation: 0,
        hitFlash: 0,
        pendingDamageNumber: 0,
        damageNumberClock: 0,
        age: 0,
        slowTimer: 0,
        slowFactor: 1,
        burnTimer: 0,
        burnDamage: 0,
        burnTickTime: 0,
        dead: false
      };
      this.boss = boss;
      this.enemies.push(boss);
      this.enemyById.set(boss.id, boss);
      ui.bossHud.classList.remove("hidden");
      if (playtestTelemetry) playtestTelemetry.recordBossSpawn(this.elapsed, hp, { id: boss.id, variant: boss.variant });
      this.flashEffect(this.ship.x, this.ship.y, "#ff637c", 320);
      audio.tone(90, .7, .08, "sawtooth", -25);
      showToast("BOSS " + boss.encounter + " · " + boss.displayName.toUpperCase() + " — WATCH THE ATTACK LANES");
    };

    Game.prototype.updateMovement = function (dt) {
      var ship = this.ship;
      var mass = this.shipMass();
      var massFactor = clamp(1 / (1 + .035 * Math.max(0, mass - 4)), .52, 1);
      var drive = this.driveMultiplier();
      var maxSpeed = 230 * massFactor * drive;
      var acceleration = 430 * massFactor * drive;
      var turnRate = 2.45 * clamp(massFactor + .08, .58, 1) * drive;
      var mobileSteering = mobileInput.active && mobileInput.magnitude > .08;
      var thrust = 0;
      var thrustX = 0;
      var thrustY = 0;
      var targetAngular = 0;
      if (mobileSteering) {
        var desiredAngle = Math.atan2(mobileInput.x, -mobileInput.y);
        var angleDelta = Math.atan2(Math.sin(desiredAngle - ship.angle), Math.cos(desiredAngle - ship.angle));
        targetAngular = clamp(angleDelta * 7.5, -turnRate * 1.55, turnRate * 1.55);
        thrust = mobileInput.magnitude;
        thrustX = mobileInput.x;
        thrustY = mobileInput.y;
      } else {
        var turnInput = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
        targetAngular = turnInput * turnRate;
        thrust = (keys.KeyW ? 1 : 0) - (keys.KeyS ? .58 : 0);
      }
      ship.angularVelocity = lerp(ship.angularVelocity, targetAngular, 1 - Math.exp(-(mobileSteering ? 14 : 10) * dt));
      ship.angle += ship.angularVelocity * dt;
      if (thrust !== 0) {
        var fx = mobileSteering ? thrustX : Math.sin(ship.angle);
        var fy = mobileSteering ? thrustY : -Math.cos(ship.angle);
        ship.vx += fx * acceleration * thrust * dt;
        ship.vy += fy * acceleration * thrust * dt;
        var driveParticleChance = currentQualityTier() > 1 ? .16 : (currentQualityTier() > 0 ? .24 : .35);
        if (Math.random() < driveParticleChance) this.emitDriveParticles(thrust);
      }
      var damping = Math.exp(-1.42 * dt);
      ship.vx *= damping;
      ship.vy *= damping;
      var speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
      if (speed > maxSpeed) {
        ship.vx = ship.vx / speed * maxSpeed;
        ship.vy = ship.vy / speed * maxSpeed;
      }
      ship.x += ship.vx * dt;
      ship.y += ship.vy * dt;
      this.updateCameraFraming(dt);
    };

    Game.prototype.updateCameraFraming = function (dt) {
      var minX = 0;
      var maxX = 0;
      var minY = 0;
      var maxY = 0;
      this.ship.tiles.forEach(function (tile) {
        minX = Math.min(minX, tile.x);
        maxX = Math.max(maxX, tile.x);
        minY = Math.min(minY, tile.y);
        maxY = Math.max(maxY, tile.y);
      });

      var localCenterX = (minX + maxX) * TILE_SIZE * .5;
      var localCenterY = (minY + maxY) * TILE_SIZE * .5;
      var halfWidth = (maxX - minX + 1) * TILE_SIZE * .5;
      var halfHeight = (maxY - minY + 1) * TILE_SIZE * .5;
      var cos = Math.cos(this.ship.angle);
      var sin = Math.sin(this.ship.angle);
      var frameCenterX = this.ship.x + localCenterX * cos - localCenterY * sin;
      var frameCenterY = this.ship.y + localCenterX * sin + localCenterY * cos;
      var rotatedHalfWidth = Math.abs(cos) * halfWidth + Math.abs(sin) * halfHeight;
      var rotatedHalfHeight = Math.abs(sin) * halfWidth + Math.abs(cos) * halfHeight;
      var availableWidth = Math.max(220, viewWidth - 150);
      var availableHeight = Math.max(180, viewHeight - 210);
      var paddedWidth = rotatedHalfWidth * 2 + 150;
      var paddedHeight = rotatedHalfHeight * 2 + 150;
      this.camera.targetZoom = clamp(Math.min(availableWidth / paddedWidth, availableHeight / paddedHeight), .42, 1);
      this.camera.zoom = lerp(this.camera.zoom, this.camera.targetZoom, 1 - Math.exp(-3 * dt));
      this.camera.x = lerp(this.camera.x, frameCenterX + this.ship.vx * .22, 1 - Math.exp(-4 * dt));
      this.camera.y = lerp(this.camera.y, frameCenterY + this.ship.vy * .22, 1 - Math.exp(-4 * dt));
    };

    Game.prototype.addShake = function (amount) {
      if (save.settings.shakeIntensity <= 0) return;
      this.shakeTrauma = clamp(this.shakeTrauma + amount * save.settings.shakeIntensity, 0, 18);
    };

    Game.prototype.triggerShipImpact = function (tile, amount) {
      var isCore = tile.type === "core";
      var intensity = clamp(amount / 18 + (isCore ? .45 : 0), .2, 1.5);
      this.addShake(isCore ? 2.4 + intensity * 4.2 : .7 + intensity * 1.3);
      if (isCore) {
        this.damageVignette = Math.max(this.damageVignette, clamp(.2 + intensity * .34, 0, save.settings.reducedFlash ? .42 : .9));
        this.damageWarningTimer = Math.max(this.damageWarningTimer, .85);
        this.damageWarningText = "CORE IMPACT";
      }
      audio.impact(intensity, isCore);
    };

    Game.prototype.updateFeedback = function (dt) {
      this.shakeTrauma *= Math.exp(-10 * dt);
      if (this.shakeTrauma < .05) this.shakeTrauma = 0;
      this.camera.shakeX = (Math.random() * 2 - 1) * this.shakeTrauma;
      this.camera.shakeY = (Math.random() * 2 - 1) * this.shakeTrauma;
      this.damageVignette = Math.max(0, this.damageVignette - dt * 1.8);
      this.damageWarningTimer = Math.max(0, this.damageWarningTimer - dt);
      this.telegraphSoundClock = Math.max(0, this.telegraphSoundClock - dt);
    };

    Game.prototype.spawnParticle = function (x, y, vx, vy, life, size, color) {
      var particle = this.particlePool.pop() || {};
      particle.x = x;
      particle.y = y;
      particle.vx = vx;
      particle.vy = vy;
      particle.life = life;
      particle.maxLife = life;
      particle.size = size;
      particle.color = color;
      this.particles.push(particle);
    };

    Game.prototype.spawnEffect = function (type, x, y, life, color) {
      var effect = this.effectPool.pop() || {};
      effect.type = type;
      effect.x = x;
      effect.y = y;
      effect.life = life;
      effect.maxLife = life;
      effect.color = color;
      effect.radius = 0;
      effect.maxRadius = 0;
      effect.x2 = 0;
      effect.y2 = 0;
      effect.width = 0;
      effect.value = 0;
      effect.angle = 0;
      effect.vx = 0;
      effect.vy = 0;
      effect.rotation = 0;
      effect.spin = 0;
      effect.glyph = "";
      effect.points = null;
      this.effects.push(effect);
      return effect;
    };

    Game.prototype.emitDriveParticles = function (thrust) {
      var rearAngle = this.ship.angle + (thrust > 0 ? Math.PI / 2 : -Math.PI / 2);
      var emitted = false;
      this.ship.tiles.forEach(function (tile) {
        if (tile.type !== "drive" || Math.random() > .55) return;
        var pos = this.gridToWorld(tile.x, tile.y);
        this.spawnParticle(pos.x, pos.y, Math.cos(rearAngle) * (50 + Math.random() * 70) - this.ship.vx * .15, Math.sin(rearAngle) * (50 + Math.random() * 70) - this.ship.vy * .15, .35, 2 + Math.random() * 2, "#ff8ee8");
        emitted = true;
      }, this);
      if (!emitted && Math.random() < .18) {
        this.spawnParticle(this.ship.x, this.ship.y, Math.cos(rearAngle) * 55, Math.sin(rearAngle) * 55, .25, 1.5, "#65e8ff");
      }
    };

    Game.prototype.updateShields = function (dt) {
      this.ship.tiles.forEach(function (tile) {
        tile.flash = Math.max(0, tile.flash - dt);
        tile.repairDelay = Math.max(0, tile.repairDelay - dt);
        tile.repairCooldown = Math.max(0, (tile.repairCooldown || 0) - dt);
        if (tile.type !== "shield") return;
        var rechargeTime = Math.max(0, dt - tile.shieldDelay);
        tile.shieldDelay = Math.max(0, tile.shieldDelay - dt);
        if (rechargeTime > 0) tile.shield = Math.min(tile.maxShield, tile.shield + MODULES.shield.rechargeRate * rechargeTime);
      });
    };

    Game.prototype.updateSupportModules = function (dt) {
      this.ship.tiles.forEach(function (module) {
        if (module.type !== "repair") return;
        module.supportClock -= dt;
        if (module.supportClock > 0) return;
        var repaired = false;
        this.ship.tiles.forEach(function (target) {
          var dx = module.x - target.x;
          var dy = module.y - target.y;
          var radius = MODULES.repair.repairRadius;
          if (dx * dx + dy * dy > radius * radius || target.hp >= target.maxHp || target.repairDelay > 0 || target.repairCooldown > 0) return;
          target.hp = Math.min(target.maxHp, target.hp + MODULES.repair.repairAmount);
          target.repairCooldown = MODULES.repair.repairInterval;
          repaired = true;
        });
        module.supportClock = repaired ? MODULES.repair.repairInterval : .2;
        if (repaired && this.effects.length < 120) {
          var origin = this.gridToWorld(module.x, module.y);
          var repairEffect = this.spawnEffect("ring", origin.x, origin.y, .35, MODULES.repair.color);
          repairEffect.radius = 4;
          repairEffect.maxRadius = 42;
        }
      }, this);
    };

    Game.prototype.countAdjacentType = function (tile, type) {
      var count = 0;
      var neighbor = this.ship.tiles.get(keyOf(tile.x + 1, tile.y));
      if (neighbor && neighbor.type === type) count += 1;
      neighbor = this.ship.tiles.get(keyOf(tile.x - 1, tile.y));
      if (neighbor && neighbor.type === type) count += 1;
      neighbor = this.ship.tiles.get(keyOf(tile.x, tile.y + 1));
      if (neighbor && neighbor.type === type) count += 1;
      neighbor = this.ship.tiles.get(keyOf(tile.x, tile.y - 1));
      if (neighbor && neighbor.type === type) count += 1;
      return count;
    };

    Game.prototype.weaponCooldownRate = function (tile) {
      return (1 + this.countAdjacentType(tile, "reactor") * MODULES.reactor.cooldownBonus) / this.coreDef.cooldownMultiplier;
    };

    Game.prototype.matterIncomeMultiplier = function () {
      var collectors = 0;
      this.ship.tiles.forEach(function (tile) {
        if (tile.type === "collector") collectors += 1;
      });
      return (1 + (this.training ? 0 : save.meta.matter * .05) + collectors * MODULES.collector.matterBonus) * this.coreDef.matterMultiplier;
    };

    Game.prototype.bulkheadReduction = function (target) {
      return Math.min(.48, this.countAdjacentType(target, "bulkhead") * MODULES.bulkhead.damageReduction);
    };

    Game.prototype.updateSpawner = function (dt) {
      if (this.training) return;
      var bossTime = this.nextBossAt === undefined ? (DEBUG ? 45 : BOSS_SPAWN_TIME) : this.nextBossAt;
      var bossWarningLead = DEBUG ? 3 : BOSS_WARNING_LEAD;
      if (!this.bossSpawned && !this.bossWarningShown && this.elapsed >= bossTime - bossWarningLead) {
        this.bossWarningShown = true;
        this.pendingBossAngle = Math.floor(Math.random() * 4) * Math.PI / 2 + (Math.random() - .5) * .18;
        var warningRing = this.spawnEffect("ring", this.ship.x, this.ship.y, 1.1, "#ff637c");
        warningRing.radius = 30;
        warningRing.maxRadius = 520;
        var directionWarning = this.spawnEffect("directionWarning", this.ship.x, this.ship.y, bossWarningLead, "#ff637c");
        directionWarning.angle = this.pendingBossAngle;
        showToast("BOSS IN " + bossWarningLead + "s — SWARM EASING");
        audio.tone(105, .45, .055, "sawtooth", 45);
      }
      if (!this.bossSpawned && this.elapsed >= bossTime) {
        this.spawnBoss();
      }
      // Boss entry gives room to dodge; leaving it alive must not suppress the swarm indefinitely.
      var bossPressure = this.boss ? .3 + .7 * clamp((this.boss.age - 30) / 60, 0, 1) : .3;
      var pressureRate = this.bossSpawned ? bossPressure : this.elapsed < (this.recoveryUntil || 0) ? .3 :
        (this.bossWarningShown ? .5 : 1);
      var phase = this.currentEnemyPhase();
      this.ambientSpawnClock -= dt * pressureRate;
      if (this.ambientSpawnClock <= 0) {
        this.spawnAmbientPack(phase);
        var ambientInterval = Math.max(1.6, phase.ambientInterval - this.endlessPressureStep() * .1);
        this.ambientSpawnClock = ambientInterval * (.88 + Math.random() * .24);
      }

      this.assaultClock -= dt * pressureRate;
      if (this.assaultClock <= 0) {
        this.spawnAssaultWave(false);
        this.assaultClock = Math.max(10, phase.assaultInterval - this.endlessPressureStep() * .4) / phase.directions * (.85 + Math.random() * .3);
      }
    };

    Game.prototype.findImpactedTile = function (x, y, radius, ignoredKeys) {
      var bestKey = null;
      var bestDistance = Infinity;
      var worldX = x - this.ship.x;
      var worldY = y - this.ship.y;
      var cos = Math.cos(this.ship.angle);
      var sin = Math.sin(this.ship.angle);
      var localX = worldX * cos + worldY * sin;
      var localY = -worldX * sin + worldY * cos;
      var centerGridX = Math.round(localX / TILE_SIZE);
      var centerGridY = Math.round(localY / TILE_SIZE);
      var limit = radius + TILE_SIZE * .48;
      var limitSquared = limit * limit;
      var searchRadius = Math.max(1, Math.ceil(limit / TILE_SIZE));
      for (var offsetY = -searchRadius; offsetY <= searchRadius; offsetY += 1) {
        for (var offsetX = -searchRadius; offsetX <= searchRadius; offsetX += 1) {
          var gridX = centerGridX + offsetX;
          var gridY = centerGridY + offsetY;
          var key = keyOf(gridX, gridY);
          if (!this.ship.tiles.has(key) || (ignoredKeys && ignoredKeys.has(key))) continue;
          var tileLocalX = gridX * TILE_SIZE;
          var tileLocalY = gridY * TILE_SIZE;
          var dx = localX - tileLocalX;
          var dy = localY - tileLocalY;
          var d2 = dx * dx + dy * dy;
          if (d2 <= limitSquared && d2 < bestDistance) {
            bestDistance = d2;
            bestKey = key;
          }
        }
      }
      return bestKey;
    };

    Game.prototype.updateEnemies = function (dt) {
      var steering45 = 1 - Math.exp(-4.5 * dt);
      var steering3 = 1 - Math.exp(-3 * dt);
      var steering5 = 1 - Math.exp(-5 * dt);
      var steering4 = 1 - Math.exp(-4 * dt);
      for (var i = 0; i < this.enemies.length; i += 1) {
        var enemy = this.enemies[i];
        if (enemy.dead) continue;
        if (enemy.type === "boss") {
          this.updateBoss(enemy, dt);
          continue;
        }
        var dx = this.ship.x - enemy.x;
        var dy = this.ship.y - enemy.y;
        var dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        var nx = dx / dist;
        var ny = dy / dist;
        enemy.age += dt;
        enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
        enemy.damageNumberClock = Math.max(0, enemy.damageNumberClock - dt);
        enemy.slowTimer = Math.max(0, enemy.slowTimer - dt);
        if (enemy.slowTimer <= 0) enemy.slowFactor = 1;
        var effectiveSpeed = enemy.speed * enemy.slowFactor;
        if (enemy.type === "orbiter") {
          var orbitStrength = dist > 115 ? .82 : .28;
          var radialStrength = dist > 210 ? .58 : .92;
          var orbitX = nx * radialStrength - ny * enemy.orbitDirection * orbitStrength;
          var orbitY = ny * radialStrength + nx * enemy.orbitDirection * orbitStrength;
          var orbitLength = Math.max(1, Math.sqrt(orbitX * orbitX + orbitY * orbitY));
          enemy.vx = lerp(enemy.vx, orbitX / orbitLength * effectiveSpeed, steering45);
          enemy.vy = lerp(enemy.vy, orbitY / orbitLength * effectiveSpeed, steering45);
        } else if (enemy.type === "bolter" || enemy.type === "gunner" || enemy.type === "sniper") {
          var preferredDistance = enemy.type === "sniper" ? 455 : (enemy.type === "gunner" ? 305 : 280);
          var direction = dist > preferredDistance + 45 ? 1 : (dist < preferredDistance - 55 ? -1 : 0);
          enemy.vx = lerp(enemy.vx, nx * effectiveSpeed * direction, steering3);
          enemy.vy = lerp(enemy.vy, ny * effectiveSpeed * direction, steering3);
          if (enemy.attackCharge > 0) {
            enemy.attackCharge -= dt;
            if (enemy.attackCharge <= 0) this.releaseRangedAttack(enemy);
          } else {
            enemy.fireClock -= dt;
            if (enemy.fireClock <= 0 && dist < (enemy.type === "sniper" ? 690 : (enemy.type === "gunner" ? 520 : 470))) {
              enemy.attackChargeMax = enemy.type === "sniper" ? .78 : (enemy.type === "gunner" ? .42 : .5);
              enemy.attackCharge = enemy.attackChargeMax;
              var shotSpeed = enemy.type === "sniper" ? 400 : (enemy.type === "gunner" ? 325 : 290);
              var aimLead = Math.min(enemy.type === "sniper" ? 1.2 : .85, enemy.attackChargeMax + dist / shotSpeed * .5);
              var aimX = dx + this.ship.vx * aimLead;
              var aimY = dy + this.ship.vy * aimLead;
              var aimLength = Math.max(1, Math.sqrt(aimX * aimX + aimY * aimY));
              enemy.lockedAimX = aimX / aimLength;
              enemy.lockedAimY = aimY / aimLength;
              if (this.telegraphSoundClock <= 0 && dist < Math.max(viewWidth, viewHeight) * .8) {
                audio.tone(enemy.type === "sniper" ? 760 : 420, enemy.type === "sniper" ? .13 : .07, .018, "sine", enemy.type === "sniper" ? 220 : 90);
                this.telegraphSoundClock = .1;
              }
            }
          }
        } else if (enemy.type === "bomber") {
          var weave = Math.sin(enemy.age * 5 + enemy.phaseOffset) * .42;
          var bomberX = nx - ny * weave;
          var bomberY = ny + nx * weave;
          var bomberLength = Math.max(1, Math.sqrt(bomberX * bomberX + bomberY * bomberY));
          enemy.vx = lerp(enemy.vx, bomberX / bomberLength * effectiveSpeed, steering5);
          enemy.vy = lerp(enemy.vy, bomberY / bomberLength * effectiveSpeed, steering5);
        } else if (enemy.turnRate > 0) {
          var desiredHeading = Math.atan2(ny, nx);
          var currentHeading = enemy.vx * enemy.vx + enemy.vy * enemy.vy > 1
            ? Math.atan2(enemy.vy, enemy.vx)
            : desiredHeading;
          var headingDelta = Math.atan2(Math.sin(desiredHeading - currentHeading), Math.cos(desiredHeading - currentHeading));
          var maxTurn = enemy.turnRate * dt;
          currentHeading += clamp(headingDelta, -maxTurn, maxTurn);
          enemy.vx = Math.cos(currentHeading) * effectiveSpeed;
          enemy.vy = Math.sin(currentHeading) * effectiveSpeed;
        } else if (enemy.directChase) {
          enemy.vx = nx * effectiveSpeed;
          enemy.vy = ny * effectiveSpeed;
        } else {
          enemy.vx = lerp(enemy.vx, nx * effectiveSpeed, steering4);
          enemy.vy = lerp(enemy.vy, ny * effectiveSpeed, steering4);
        }
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
        if (enemy.sides === 3) {
          enemy.rotation = Math.atan2(enemy.vy, enemy.vx);
        } else {
          enemy.rotation += dt * (enemy.type === "colossus" ? .32 : .75);
        }
        var hitKey = this.findImpactedTile(enemy.x, enemy.y, enemy.radius);
        if (hitKey) {
          if (enemy.type === "bomber") this.explodeBomberOnShip(enemy, hitKey);
          else this.applyDamageToTile(hitKey, enemy.damage);
          enemy.dead = true;
          this.burst(enemy.x, enemy.y, enemy.color, 8, 80);
          audio.tone(110, .1, .025, "sawtooth", -35);
        }
      }
      this.rebuildEnemyGrid();
      this.separationClock -= dt;
      if (this.separationClock <= 0) {
        this.resolveEnemyOverlaps();
        this.separationClock = this.enemies.length > 220 ? .05 : (1 / 30);
      }
      this.compactEnemies();
    };

    Game.prototype.releaseRangedAttack = function (enemy) {
      enemy.attackCharge = 0;
      enemy.fireClock = enemy.type === "sniper" ? 2.1 : (enemy.type === "gunner" ? 1.4 : 1.8);
      if (enemy.type === "sniper") {
        this.fireEnemyProjectile(enemy.x, enemy.y, enemy.lockedAimX, enemy.lockedAimY, enemy.damage, 400, "sniperShot", enemy.color, 5);
        audio.tone(190, .09, .026, "square", -55);
        return;
      }
      if (enemy.type === "bolter") {
        this.fireEnemyProjectile(enemy.x, enemy.y, enemy.lockedAimX, enemy.lockedAimY, enemy.damage, 290, "bolterShot", enemy.color, 3);
        audio.tone(280, .06, .018, "square", -45);
        return;
      }
      var baseAngle = Math.atan2(enemy.lockedAimY, enemy.lockedAimX);
      for (var shot = -1; shot <= 1; shot += 1) {
        var shotAngle = baseAngle + shot * .14;
        this.fireEnemyProjectile(enemy.x, enemy.y, Math.cos(shotAngle), Math.sin(shotAngle), enemy.damage, 325, "gunnerShot", enemy.color, 3.5);
      }
    };

    Game.prototype.explodeBomberOnShip = function (enemy, hitKey) {
      var centerTile = this.ship.tiles.get(hitKey);
      if (!centerTile) return;
      var affected = [];
      this.ship.tiles.forEach(function (tile, key) {
        var dx = tile.x - centerTile.x;
        var dy = tile.y - centerTile.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= ENEMY_DEFS.bomber.blastRadius) affected.push({ key: key, distance: distance });
      });
      for (var i = 0; i < affected.length; i += 1) {
        var falloff = 1 - affected[i].distance / ENEMY_DEFS.bomber.blastRadius * .55;
        this.applyDamageToTile(affected[i].key, enemy.damage * falloff);
      }
      var bomberEffect = this.spawnEffect("ring", enemy.x, enemy.y, .38, enemy.color);
      bomberEffect.radius = 8;
      bomberEffect.maxRadius = TILE_SIZE * ENEMY_DEFS.bomber.blastRadius;
    };

    Game.prototype.updateBoss = function (boss, dt) {
      boss.damageNumberClock = Math.max(0, boss.damageNumberClock - dt);
      var dx = this.ship.x - boss.x;
      var dy = this.ship.y - boss.y;
      var dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      var nx = dx / dist;
      var ny = dy / dist;
      var desired = dist > 205 ? 1 : (dist < 135 ? -.3 : 0);
      boss.slowTimer = Math.max(0, boss.slowTimer - dt);
      if (boss.slowTimer <= 0) boss.slowFactor = 1;
      var charging = boss.chargeTimer > 0;
      var movementTime = charging ? Math.min(dt, boss.chargeTimer) : dt;
      if (charging) {
        boss.chargeTimer = Math.max(0, boss.chargeTimer - dt);
        boss.vx = boss.chargeAimX * boss.chargeSpeed * boss.slowFactor;
        boss.vy = boss.chargeAimY * boss.chargeSpeed * boss.slowFactor;
      } else if (boss.attackCharge > 0 && boss.attackPattern === "charge") {
        // Hold position during a windup so the preview remains a usable dodge cue.
        boss.vx *= Math.exp(-9 * dt);
        boss.vy *= Math.exp(-9 * dt);
      } else {
        // Catch up outside fighting range, then slow down so dodging stays predictable.
        var catchUpSpeed = 300 * clamp((dist - 240) / 300, 0, 1);
        var effectiveSpeed = (boss.speed + catchUpSpeed) * boss.slowFactor;
        boss.vx = lerp(boss.vx, nx * effectiveSpeed * desired - ny * 10, 1 - Math.exp(-2 * dt));
        boss.vy = lerp(boss.vy, ny * effectiveSpeed * desired + nx * 10, 1 - Math.exp(-2 * dt));
      }
      boss.x += boss.vx * movementTime;
      boss.y += boss.vy * movementTime;
      boss.rotation += dt * .55;
      boss.hitFlash = Math.max(0, boss.hitFlash - dt);
      boss.age += dt;
      if (charging) {
        // Charge recovery begins once the dash has finished.
      } else if (boss.attackCharge > 0) {
        boss.attackCharge -= dt;
        if (boss.attackCharge <= 0) {
          boss.attackCharge = 0;
          boss.fireClock = boss.variant === "storm" ? 1.35 : 1.7;
          if (boss.attackPattern === "charge") {
            boss.chargeTimer = boss.chargeDuration;
            boss.fireClock = 2.1;
          } else if (boss.attackPattern === "aimed") {
            var aimAngle = Math.atan2(boss.lockedAimY, boss.lockedAimX);
            var fanHalf = (boss.fanShotCount - 1) / 2;
            for (var fanShot = -fanHalf; fanShot <= fanHalf; fanShot += 1) {
              var fanAngle = aimAngle + fanShot * boss.fanSpread;
              this.fireEnemyProjectile(boss.x, boss.y, Math.cos(fanAngle), Math.sin(fanAngle), boss.shotDamage, 320, "bossShot", boss.color, 4);
            }
          } else {
            for (var i = 0; i < boss.shotCount; i += 1) {
              if (boss.variant === "storm" && (i <= 1 || i === boss.shotCount - 1)) continue;
              var angle = boss.volleyAngle + i / boss.shotCount * TAU;
              this.fireEnemyProjectile(boss.x, boss.y, Math.cos(angle), Math.sin(angle), boss.shotDamage * .7, 185, "bossShot", boss.color, 4);
            }
          }
          boss.attackIndex += 1;
          audio.tone(80, .2, .045, "square", 35);
        }
      } else {
        boss.fireClock -= dt;
        if (boss.fireClock <= 0 && dist < 520) {
          boss.fireClock = 0;
          if (boss.variant === "storm") boss.attackPattern = "radial";
          else if (boss.variant === "pursuer") boss.attackPattern = boss.attackIndex % 2 === 0 ? "aimed" : "charge";
          else boss.attackPattern = boss.attackIndex % 2 === 0 ? "aimed" : "radial";
          var bossLead = Math.min(.65, dist / 320 * .55);
          var targetX = dx + this.ship.vx * bossLead;
          var targetY = dy + this.ship.vy * bossLead;
          var targetLength = Math.max(1, Math.sqrt(targetX * targetX + targetY * targetY));
          boss.lockedAimX = targetX / targetLength;
          boss.lockedAimY = targetY / targetLength;
          boss.chargeAimX = boss.lockedAimX;
          boss.chargeAimY = boss.lockedAimY;
          boss.volleyAngle = boss.rotation;
          boss.attackChargeMax = boss.attackPattern === "charge" ? 1.15 : (boss.variant === "storm" ? 1 : .9);
          boss.attackCharge = boss.attackChargeMax;
          audio.tone(112, .18, .028, "sawtooth", 95);
        }
      }
      var hitKey = this.findImpactedTile(boss.x, boss.y, boss.radius);
      if (hitKey) this.applyDamageToTile(hitKey, boss.damage * dt * (charging ? 2 : 1));
    };

    Game.prototype.spawnProjectile = function (friendly, kind, x, y, vx, vy, damage, radius, life, color, targetId, slowFactor, slowDuration, triggerRadius, blastRadius, armTime) {
      if (this.projectiles.length >= MAX_ACTIVE_PROJECTILES) return null;
      var projectile = this.projectilePool.pop() || {};
      projectile.friendly = friendly;
      projectile.kind = kind;
      projectile.x = x;
      projectile.y = y;
      projectile.vx = vx;
      projectile.vy = vy;
      projectile.damage = damage;
      projectile.radius = radius;
      projectile.life = life;
      projectile.color = color;
      projectile.targetId = targetId || 0;
      projectile.slowFactor = slowFactor || 1;
      projectile.slowDuration = slowDuration || 0;
      projectile.triggerRadius = triggerRadius || 0;
      projectile.blastRadius = blastRadius || 0;
      projectile.armTime = armTime || 0;
      if (projectile.hitIds) projectile.hitIds.clear();
      if ((kind === "rail" || kind === "sniperShot") && !projectile.hitIds) projectile.hitIds = new Set();
      this.projectiles.push(projectile);
      return projectile;
    };

    Game.prototype.fireEnemyProjectile = function (x, y, nx, ny, damage, speed, kind, color, radius) {
      speed = speed || 230;
      this.spawnProjectile(false, kind || "enemy", x, y, nx * speed, ny * speed, damage, radius || 4, 5, color || "#ff637c");
    };

    Game.prototype.rebuildEnemyGrid = function () {
      for (var bucketIndex = 0; bucketIndex < this.enemyGridBucketCount; bucketIndex += 1) {
        this.enemyGridBuckets[bucketIndex].length = 0;
      }
      this.enemyGrid.clear();
      this.enemyGridBucketCount = 0;
      for (var i = 0; i < this.enemies.length; i += 1) {
        var enemy = this.enemies[i];
        if (enemy.dead) continue;
        var gx = Math.floor(enemy.x / SPATIAL_CELL_SIZE);
        var gy = Math.floor(enemy.y / SPATIAL_CELL_SIZE);
        var key = spatialKey(gx, gy);
        var bucket = this.enemyGrid.get(key);
        if (!bucket) {
          bucket = this.enemyGridBuckets[this.enemyGridBucketCount] || [];
          bucket.length = 0;
          this.enemyGridBuckets[this.enemyGridBucketCount] = bucket;
          this.enemyGridBucketCount += 1;
          this.enemyGrid.set(key, bucket);
        }
        bucket.push(enemy);
      }
    };

    Game.prototype.collectNearbyEnemies = function (x, y, cellRadius) {
      var result = this.nearbyBuffer;
      result.length = 0;
      var gx = Math.floor(x / SPATIAL_CELL_SIZE);
      var gy = Math.floor(y / SPATIAL_CELL_SIZE);
      for (var oy = -cellRadius; oy <= cellRadius; oy += 1) {
        for (var ox = -cellRadius; ox <= cellRadius; ox += 1) {
          var bucket = this.enemyGrid.get(spatialKey(gx + ox, gy + oy));
          if (!bucket) continue;
          for (var bucketIndex = 0; bucketIndex < bucket.length; bucketIndex += 1) result.push(bucket[bucketIndex]);
        }
      }
      return result;
    };

    Game.prototype.nearbyEnemies = function (x, y) {
      return this.collectNearbyEnemies(x, y, 1);
    };

    Game.prototype.radiusCandidates = function (x, y, radius) {
      if (!this.enemyGrid || this.enemyGrid.size === 0 || !this.collectNearbyEnemies) return this.enemies;
      return this.collectNearbyEnemies(x, y, Math.ceil(radius / SPATIAL_CELL_SIZE));
    };

    Game.prototype.resolveEnemyOverlaps = function () {
      var collisionPadding = 1.5;
      if (!this.enemyGrid || this.enemyGrid.size === 0) this.rebuildEnemyGrid();
      for (var i = 0; i < this.enemies.length; i += 1) {
        var enemy = this.enemies[i];
        if (enemy.dead) continue;
        var gridX = Math.floor(enemy.x / SPATIAL_CELL_SIZE);
        var gridY = Math.floor(enemy.y / SPATIAL_CELL_SIZE);
        for (var offsetY = -1; offsetY <= 1; offsetY += 1) {
          for (var offsetX = -1; offsetX <= 1; offsetX += 1) {
            var bucket = this.enemyGrid.get(spatialKey(gridX + offsetX, gridY + offsetY));
            if (!bucket) continue;
            for (var n = 0; n < bucket.length; n += 1) {
              var other = bucket[n];
              if (other.dead || other.id <= enemy.id) continue;
              var dx = other.x - enemy.x;
              var dy = other.y - enemy.y;
              var minimumDistance = enemy.radius + other.radius + collisionPadding;
              var distanceSquaredBetween = dx * dx + dy * dy;
              if (distanceSquaredBetween >= minimumDistance * minimumDistance) continue;

              var distanceBetween = Math.sqrt(distanceSquaredBetween);
              var nx;
              var ny;
              if (distanceBetween < .001) {
                var fallbackAngle = ((enemy.id * 97 + other.id * 53) % 360) * Math.PI / 180;
                nx = Math.cos(fallbackAngle);
                ny = Math.sin(fallbackAngle);
                distanceBetween = 0;
              } else {
                nx = dx / distanceBetween;
                ny = dy / distanceBetween;
              }

              var overlap = minimumDistance - distanceBetween;
              var enemyMass = enemy.radius * enemy.radius;
              var otherMass = other.radius * other.radius;
              var totalMass = enemyMass + otherMass;
              // Boss movement belongs to its attack controller; the crowd yields around it.
              var enemyShare = enemy.type === "boss" ? 0 : (other.type === "boss" ? 1 : otherMass / totalMass);
              var otherShare = other.type === "boss" ? 0 : (enemy.type === "boss" ? 1 : enemyMass / totalMass);
              enemy.x -= nx * overlap * enemyShare;
              enemy.y -= ny * overlap * enemyShare;
              other.x += nx * overlap * otherShare;
              other.y += ny * overlap * otherShare;
            }
          }
        }
      }
    };

    Game.prototype.compactEnemies = function () {
      var writeIndex = 0;
      for (var readIndex = 0; readIndex < this.enemies.length; readIndex += 1) {
        var enemy = this.enemies[readIndex];
        if (enemy.dead) {
          this.enemyById.delete(enemy.id);
          if (enemy.type !== "boss" && this.enemyPool.length < 600) this.enemyPool.push(enemy);
          continue;
        }
        this.enemies[writeIndex++] = enemy;
      }
      this.enemies.length = writeIndex;
    };

    Game.prototype.compactProjectiles = function () {
      var writeIndex = 0;
      for (var readIndex = 0; readIndex < this.projectiles.length; readIndex += 1) {
        var projectile = this.projectiles[readIndex];
        if (projectile.life <= 0) {
          if (projectile.hitIds) projectile.hitIds.clear();
          if (this.projectilePool.length < 1200) this.projectilePool.push(projectile);
          continue;
        }
        this.projectiles[writeIndex++] = projectile;
      }
      this.projectiles.length = writeIndex;
    };

    Game.prototype.updateProjectiles = function (dt) {
      var missileSteering = 1 - Math.exp(-5 * dt);
      var mineDamping = Math.exp(-4.5 * dt);
      for (var i = 0; i < this.projectiles.length; i += 1) {
        var projectile = this.projectiles[i];
        projectile.life -= dt;
        if (projectile.life <= 0) continue;
        if (projectile.kind === "missile") {
          var target = this.enemyById.get(projectile.targetId) || null;
          if (target && target.dead) target = null;
          if (target) {
            var tdx = target.x - projectile.x;
            var tdy = target.y - projectile.y;
            var td = Math.max(1, Math.sqrt(tdx * tdx + tdy * tdy));
            var desiredVx = tdx / td * 280;
            var desiredVy = tdy / td * 280;
            projectile.vx = lerp(projectile.vx, desiredVx, missileSteering);
            projectile.vy = lerp(projectile.vy, desiredVy, missileSteering);
          }
        } else if (projectile.kind === "mine") {
          projectile.armTime = Math.max(0, projectile.armTime - dt);
          projectile.vx *= mineDamping;
          projectile.vy *= mineDamping;
        }
        projectile.x += projectile.vx * dt;
        projectile.y += projectile.vy * dt;
        if (projectile.friendly) {
          var nearby = this.nearbyEnemies(projectile.x, projectile.y);
          if (projectile.kind === "mine") {
            if (projectile.armTime > 0) continue;
            for (var mineTargetIndex = 0; mineTargetIndex < nearby.length; mineTargetIndex += 1) {
              var mineTarget = nearby[mineTargetIndex];
              var triggerRadius = projectile.triggerRadius + mineTarget.radius;
              if (!mineTarget.dead && distanceSquared(projectile.x, projectile.y, mineTarget.x, mineTarget.y) <= triggerRadius * triggerRadius) {
                this.explodeBlast(projectile, projectile.blastRadius, projectile.color, 18);
                projectile.life = 0;
                break;
              }
            }
            continue;
          }
          for (var n = 0; n < nearby.length; n += 1) {
            var enemy = nearby[n];
            var radius = enemy.radius + projectile.radius;
            if (!enemy.dead && distanceSquared(projectile.x, projectile.y, enemy.x, enemy.y) <= radius * radius) {
              if (projectile.kind === "missile") {
                this.explodeMissile(projectile);
                projectile.life = 0;
                break;
              } else if (projectile.kind === "cryo") {
                this.damageEnemy(enemy, projectile.damage);
                if (!enemy.dead) {
                  enemy.slowFactor = Math.min(enemy.slowFactor, projectile.slowFactor);
                  enemy.slowTimer = Math.max(enemy.slowTimer, projectile.slowDuration);
                }
                this.burst(projectile.x, projectile.y, projectile.color, 6, 65);
                projectile.life = 0;
                break;
              } else if (projectile.kind === "rail") {
                if (projectile.hitIds.has(enemy.id)) continue;
                projectile.hitIds.add(enemy.id);
                this.damageEnemy(enemy, projectile.damage);
                if (!enemy.dead && enemy.type !== "boss") {
                  var railSpeed = Math.max(1, Math.sqrt(projectile.vx * projectile.vx + projectile.vy * projectile.vy));
                  enemy.vx += projectile.vx / railSpeed * 125;
                  enemy.vy += projectile.vy / railSpeed * 125;
                }
                this.burst(projectile.x, projectile.y, projectile.color, 5, 95);
              } else {
                this.damageEnemy(enemy, projectile.damage);
                this.burst(projectile.x, projectile.y, projectile.color, 3, 55);
                projectile.life = 0;
                break;
              }
            }
          }
        } else {
          var piercingShot = projectile.kind === "sniperShot";
          var tileKey = this.findImpactedTile(projectile.x, projectile.y, projectile.radius, piercingShot ? projectile.hitIds : null);
          if (tileKey) {
            var hitTile = this.ship.tiles.get(tileKey);
            var hpBeforeImpact = hitTile.hp;
            var canPenetrate = piercingShot && projectile.hitIds.size === 0 &&
              hitTile.type !== "armor" && hitTile.type !== "bulkhead" && hitTile.type !== "core";
            var shieldsBeforeImpact = 0;
            var hullReduction = canPenetrate ? this.bulkheadReduction(hitTile) : 0;
            if (canPenetrate) {
              this.ship.tiles.forEach(function (tile) {
                if (tile.type !== "shield" || tile.shield <= 0) return;
                var shieldDx = tile.x - hitTile.x;
                var shieldDy = tile.y - hitTile.y;
                if (shieldDx * shieldDx + shieldDy * shieldDy <= MODULES.shield.shieldRadius * MODULES.shield.shieldRadius) {
                  shieldsBeforeImpact += tile.shield;
                }
              });
            }
            if (piercingShot) projectile.hitIds.add(tileKey);
            this.applyDamageToTile(tileKey, projectile.damage);
            this.burst(projectile.x, projectile.y, projectile.color, 4, 55);
            if (canPenetrate && hitTile.hp < hpBeforeImpact) {
              // applyDamageToTile leaves its participating shields in this buffer,
              // including any detached nodes, so lost capacity is not counted as absorption.
              var shieldsAfterImpact = 0;
              for (var shieldIndex = 0; shieldIndex < this.shieldBuffer.length; shieldIndex += 1) {
                shieldsAfterImpact += this.shieldBuffer[shieldIndex].shield;
              }
              var shieldAbsorption = Math.max(0, shieldsBeforeImpact - shieldsAfterImpact);
              projectile.damage = Math.max(0, projectile.damage - shieldAbsorption) * (1 - hullReduction) * .65;
              if (projectile.damage <= 0) projectile.life = 0;
            } else {
              projectile.life = 0;
            }
          }
        }
      }
      this.compactProjectiles();
    };

    Game.prototype.explodeBlast = function (projectile, radius, color, particleCount) {
      var candidates = this.radiusCandidates ? this.radiusCandidates(projectile.x, projectile.y, radius) : this.enemies;
      for (var i = 0; i < candidates.length; i += 1) {
        var enemy = candidates[i];
        if (enemy.dead) continue;
        var d2 = distanceSquared(projectile.x, projectile.y, enemy.x, enemy.y);
        if (d2 > radius * radius) continue;
        var falloff = 1 - Math.sqrt(d2) / radius * .5;
        this.damageEnemy(enemy, projectile.damage * falloff);
      }
      var blastEffect = this.spawnEffect("ring", projectile.x, projectile.y, .28, color);
      blastEffect.radius = 5;
      blastEffect.maxRadius = radius;
      this.burst(projectile.x, projectile.y, color, particleCount, 150);
      if (distanceSquared(projectile.x, projectile.y, this.ship.x, this.ship.y) < 420 * 420) this.addShake(1.2);
      audio.tone(75, .14, .04, "sawtooth", -25);
    };

    Game.prototype.explodeMissile = function (projectile) {
      this.explodeBlast(projectile, projectile.blastRadius || 74, "#ffd96a", 12);
    };

    Game.prototype.findNearestHostileProjectile = function (origin, range) {
      var nearest = null;
      var nearestDistance = range * range;
      for (var i = 0; i < this.projectiles.length; i += 1) {
        var projectile = this.projectiles[i];
        if (projectile.friendly || projectile.life <= 0) continue;
        var d2 = distanceSquared(origin.x, origin.y, projectile.x, projectile.y);
        if (d2 >= nearestDistance) continue;
        nearest = projectile;
        nearestDistance = d2;
      }
      return nearest;
    };

    Game.prototype.fireFlakAirburst = function (origin, target, def, damageMultiplier) {
      var impactX = target.x;
      var impactY = target.y;
      var damage = def.damage * damageMultiplier;
      var candidates = this.radiusCandidates ? this.radiusCandidates(impactX, impactY, def.blastRadius) : this.enemies;
      for (var i = 0; i < candidates.length; i += 1) {
        var enemy = candidates[i];
        if (enemy.dead) continue;
        var enemyDistanceSquared = distanceSquared(impactX, impactY, enemy.x, enemy.y);
        if (enemyDistanceSquared > def.blastRadius * def.blastRadius) continue;
        var falloff = 1 - Math.sqrt(enemyDistanceSquared) / def.blastRadius * .4;
        this.damageEnemy(enemy, damage * falloff);
      }
      for (var p = 0; p < this.projectiles.length; p += 1) {
        var projectile = this.projectiles[p];
        if (projectile.friendly || projectile.life <= 0) continue;
        if (distanceSquared(impactX, impactY, projectile.x, projectile.y) <= def.blastRadius * def.blastRadius) {
          projectile.life = 0;
        }
      }
      var flakBeam = this.spawnEffect("beam", origin.x, origin.y, .07, def.color);
      flakBeam.x2 = impactX;
      flakBeam.y2 = impactY;
      flakBeam.width = 2;
      var flakRing = this.spawnEffect("ring", impactX, impactY, .24, def.color);
      flakRing.radius = 5;
      flakRing.maxRadius = def.blastRadius;
      this.burst(impactX, impactY, def.color, 12, 150);
    };

    Game.prototype.fireWeaponVolley = function (origin, nx, ny, def, kind, speed, radius, life, damageMultiplier, targetId) {
      var shots = def.shots || 1;
      var direction = Math.atan2(ny, nx);
      for (var shot = 0; shot < shots; shot += 1) {
        var offset = shot - (shots - 1) / 2;
        // Parallel cannon barrels keep even-sized volleys on a small distant target.
        var cannonVolley = def.id === "cannon";
        var angle = direction + (cannonVolley ? 0 : offset * .14);
        // Keep an aimed cryo bolt when an upgrade adds an even number of fan shots.
        if (kind === "cryo") angle = direction + (shot === 0 ? 0 : Math.ceil(shot / 2) * (shot % 2 ? -1 : 1) * .14);
        var vx = Math.cos(angle);
        var vy = Math.sin(angle);
        var muzzleOffset = cannonVolley ? offset * 6 : 0;
        this.spawnProjectile(true, kind, origin.x + vx * 18 - ny * muzzleOffset, origin.y + vy * 18 + nx * muzzleOffset,
          vx * speed, vy * speed, def.damage * damageMultiplier, radius, life, def.color,
          targetId, def.slowFactor, def.slowDuration, 0, def.blastRadius);
      }
    };

    Game.prototype.updateWeapons = function (dt) {
      var damageMultiplier = 1 + (this.training ? 0 : save.meta.damage * .04);
      this.ship.tiles.forEach(function (tile) {
        if (!isWeaponType(tile.type)) return;
        tile.cooldown -= dt * this.weaponCooldownRate(tile);
        var readyToFire = !(tile.cooldown > 0);
        if (tile.type === "pulse" && !readyToFire) return;
        var def = this.weaponDefinitions ? this.weaponDefinitions[tile.type] : MODULES[tile.type];
        var origin = this.gridToWorld(tile.x, tile.y);
        var target = tile.type === "flak" ? this.findNearestHostileProjectile(origin, def.range) : null;
        if (!target && !readyToFire && tile.aimTargetId) {
          target = this.enemyById.get(tile.aimTargetId);
          if (target && (target.dead || distanceSquared(origin.x, origin.y, target.x, target.y) >= def.range * def.range)) target = null;
        }
        if (!target) target = this.findTarget(tile, def.range);
        tile.aimTargetId = target && target.id || 0;
        if (tile.type !== "pulse") {
          // Hull-relative aim follows ship turns while idle; firing still uses the target vector below.
          var desiredAim = target ? Math.atan2(target.y - origin.y, target.x - origin.x) - this.ship.angle : -Math.PI / 2;
          var aimDelta = Math.atan2(Math.sin(desiredAim - tile.aim), Math.cos(desiredAim - tile.aim));
          tile.aim += aimDelta * (target ? 1 : 1 - Math.exp(-10 * dt));
          tile.aim = Math.atan2(Math.sin(tile.aim), Math.cos(tile.aim));
        }
        if (!readyToFire || !target) return;
        var dx = target.x - origin.x;
        var dy = target.y - origin.y;
        var distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        var nx = dx / distance;
        var ny = dy / distance;
        tile.cooldown = def.cooldown;
        if (tile.type === "cannon") {
          this.fireWeaponVolley(origin, nx, ny, def, def.projectileKind || "cannon", 560, 3, 1.4, damageMultiplier);
          this.burst(origin.x + nx * 18, origin.y + ny * 18, def.color, 2, 35);
          audio.tone(250, .035, .018, "square", -35);
        } else if (tile.type === "laser") {
          this.firePiercingBeam(origin, nx, ny, def.range, def.damage * damageMultiplier, def.color, def.beamWidth || 11, .13);
          audio.tone(520, .1, .024, "sawtooth", 210);
        } else if (tile.type === "missile") {
          this.fireWeaponVolley(origin, nx, ny, def, "missile", 180, 5, 3.4, damageMultiplier, target.id);
          audio.tone(170, .08, .02, "triangle", 45);
        } else if (tile.type === "scatter") {
          for (var pellet = 0; pellet < def.pellets; pellet += 1) {
            var pelletAngle = Math.atan2(ny, nx) + (pellet - (def.pellets - 1) / 2) * def.spread / (def.pellets - 1);
            var pelletX = Math.cos(pelletAngle);
            var pelletY = Math.sin(pelletAngle);
            this.spawnProjectile(true, "scatter", origin.x + pelletX * 18, origin.y + pelletY * 18, pelletX * 520, pelletY * 520, def.damage * damageMultiplier, 2.5, def.range / 520, def.color);
          }
          this.burst(origin.x + nx * 18, origin.y + ny * 18, def.color, 5, 65);
          audio.tone(150, .07, .025, "square", -45);
        } else if (tile.type === "arc") {
          this.fireArc(origin, target, def, damageMultiplier);
          audio.tone(430, .12, .025, "sawtooth", 390);
        } else if (tile.type === "rail") {
          this.spawnProjectile(true, "rail", origin.x + nx * 22, origin.y + ny * 22, nx * 900, ny * 900, def.damage * damageMultiplier, 4, def.range / 900, def.color);
          this.burst(origin.x + nx * 20, origin.y + ny * 20, def.color, 6, 95);
          audio.tone(110, .16, .04, "square", 470);
        } else if (tile.type === "flak") {
          this.fireFlakAirburst(origin, target, def, damageMultiplier);
          audio.tone(205, .07, .022, "square", -60);
        } else if (tile.type === "pulse") {
          this.firePulse(origin, def, damageMultiplier);
          audio.tone(145, .18, .035, "sine", 380);
        } else if (tile.type === "cryo") {
          this.fireWeaponVolley(origin, nx, ny, def, "cryo", 500, 4, def.range / 500, damageMultiplier);
          audio.tone(360, .09, .02, "triangle", -120);
        } else if (tile.type === "mine") {
          this.spawnProjectile(true, "mine", origin.x + nx * 18, origin.y + ny * 18, nx * 220, ny * 220, def.damage * damageMultiplier, 6, 6, def.color, 0, 1, 0, 64, def.blastRadius, .35);
          audio.tone(190, .06, .018, "triangle", 45);
        } else if (tile.type === "ember") {
          this.fireEmberCone(origin, nx, ny, def, damageMultiplier);
          audio.tone(95, .13, .02, "sawtooth", 45);
        } else if (tile.type === "gravity") {
          this.placeGravityField(tile, origin, target, def, damageMultiplier);
          audio.tone(220, .18, .022, "sine", -100);
        }
      }, this);
    };

    Game.prototype.fireEmberCone = function (origin, nx, ny, def, damageMultiplier) {
      var facing = Math.atan2(ny, nx);
      var candidates = this.radiusCandidates(origin.x, origin.y, def.range);
      for (var i = 0; i < candidates.length; i += 1) {
        var enemy = candidates[i];
        if (enemy.dead) continue;
        var dx = enemy.x - origin.x;
        var dy = enemy.y - origin.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > def.range) continue;
        var angle = Math.atan2(dy, dx) - facing;
        var angleDelta = Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle)));
        if (angleDelta > def.coneAngle) continue;
        this.damageEnemy(enemy, def.damage * damageMultiplier);
        if (enemy.dead) continue;
        enemy.burnDamage = Math.max(enemy.burnTimer > 0 ? enemy.burnDamage : 0, def.burnDamage * damageMultiplier);
        enemy.burnTimer = Math.max(enemy.burnTimer || 0, def.burnDuration);
      }
      var flame = this.spawnEffect("flameCone", origin.x, origin.y, .2, def.color);
      flame.angle = facing;
      flame.width = def.coneAngle;
      flame.radius = def.range;
    };

    Game.prototype.placeGravityField = function (tile, origin, target, def, damageMultiplier) {
      // One live field per emitter bounds overlap even when its reload becomes very short.
      var field = null;
      for (var i = 0; i < this.gravityFields.length; i += 1) {
        if (this.gravityFields[i].sourceTile === tile) { field = this.gravityFields[i]; break; }
      }
      if (!field) { field = {}; this.gravityFields.push(field); }
      field.sourceTile = tile;
      field.x = target.x;
      field.y = target.y;
      field.life = def.fieldDuration;
      field.maxLife = def.fieldDuration;
      field.radius = def.fieldRadius;
      field.pullStrength = def.pullStrength;
      field.damage = def.damage * damageMultiplier;
      field.tickTime = 0;
      field.color = def.color;
      var link = this.spawnEffect("beam", origin.x, origin.y, .12, def.color);
      link.x2 = field.x;
      link.y2 = field.y;
      link.width = 2;
    };

    Game.prototype.updateWeaponStatuses = function (dt) {
      var fields = this.gravityFields || [];
      for (var f = 0; f < fields.length; f += 1) {
        var field = fields[f];
        field.stepTime = Math.min(dt, field.life);
        field.life = Math.max(0, field.life - dt);
        field.tickTime += field.stepTime;
        field.tickDamage = 0;
        if (field.tickTime >= .25 || field.life <= 0) {
          field.tickDamage = field.damage * field.tickTime;
          field.tickTime = 0;
        }
      }
      for (var i = 0; i < this.enemies.length; i += 1) {
        var enemy = this.enemies[i];
        if (enemy.dead) continue;
        if (enemy.burnTimer > 0) {
          enemy.burnTickTime += Math.min(dt, enemy.burnTimer);
          enemy.burnTimer = Math.max(0, enemy.burnTimer - dt);
          if (enemy.burnTickTime >= .25 || enemy.burnTimer <= 0) {
            this.damageEnemy(enemy, enemy.burnDamage * enemy.burnTickTime);
            enemy.burnTickTime = 0;
          }
          if (enemy.burnTimer <= 0) enemy.burnDamage = 0;
        }
        if (enemy.dead) continue;
        var strongestPull = 0;
        var pullX = 0;
        var pullY = 0;
        for (var fieldIndex = 0; fieldIndex < fields.length; fieldIndex += 1) {
          var activeField = fields[fieldIndex];
          var dx = activeField.x - enemy.x;
          var dy = activeField.y - enemy.y;
          var distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > activeField.radius) continue;
          if (activeField.tickDamage > 0) this.damageEnemy(enemy, activeField.tickDamage);
          // Pull never replaces movement or attacks; multiple wells cannot multiply its strength.
          var resistance = enemy.type === "boss" ? 0 : 1;
          var pull = Math.min(Math.max(0, distance - 8), activeField.pullStrength * resistance * activeField.stepTime);
          if (pull > strongestPull) {
            strongestPull = pull;
            pullX = dx / distance * pull;
            pullY = dy / distance * pull;
          }
          if (enemy.dead) break;
        }
        if (!enemy.dead) { enemy.x += pullX; enemy.y += pullY; }
      }
      var write = 0;
      for (var fieldWrite = 0; fieldWrite < fields.length; fieldWrite += 1) {
        if (fields[fieldWrite].life > 0) fields[write++] = fields[fieldWrite];
      }
      fields.length = write;
    };

    Game.prototype.firePulse = function (origin, def, damageMultiplier) {
      var hitCount = 0;
      var candidates = this.radiusCandidates(origin.x, origin.y, def.range);
      for (var i = 0; i < candidates.length; i += 1) {
        var enemy = candidates[i];
        if (enemy.dead) continue;
        var d2 = distanceSquared(origin.x, origin.y, enemy.x, enemy.y);
        if (d2 > def.range * def.range) continue;
        var falloff = 1 - Math.sqrt(d2) / def.range * .35;
        this.damageEnemy(enemy, def.damage * damageMultiplier * falloff);
        hitCount += 1;
      }
      var pulseEffect = this.spawnEffect("ring", origin.x, origin.y, .35, def.color);
      pulseEffect.radius = 8;
      pulseEffect.maxRadius = def.range;
      if (hitCount > 0) this.burst(origin.x, origin.y, def.color, Math.min(18, 4 + hitCount), 120);
    };

    Game.prototype.firePiercingBeam = function (origin, nx, ny, range, damage, color, width, life) {
      for (var i = 0; i < this.enemies.length; i += 1) {
        var enemy = this.enemies[i];
        if (enemy.dead) continue;
        var rx = enemy.x - origin.x;
        var ry = enemy.y - origin.y;
        var projection = rx * nx + ry * ny;
        if (projection < 0 || projection > range) continue;
        var perpendicular = Math.abs(rx * ny - ry * nx);
        if (perpendicular <= enemy.radius + width) this.damageEnemy(enemy, damage);
      }
      var beamEffect = this.spawnEffect("beam", origin.x, origin.y, life, color);
      beamEffect.x2 = origin.x + nx * range;
      beamEffect.y2 = origin.y + ny * range;
      beamEffect.width = width;
    };

    Game.prototype.fireArc = function (origin, firstTarget, def, damageMultiplier) {
      var points = [{ x: origin.x, y: origin.y }];
      var hitIds = new Set();
      var current = firstTarget;
      var damage = def.damage * damageMultiplier;
      for (var chain = 0; chain < def.chains && current; chain += 1) {
        hitIds.add(current.id);
        points.push({ x: current.x, y: current.y });
        this.damageEnemy(current, damage * Math.pow(.82, chain));
        var next = null;
        var bestDistance = def.jumpRange * def.jumpRange;
        var nearby = this.radiusCandidates(current.x, current.y, def.jumpRange);
        for (var i = 0; i < nearby.length; i += 1) {
          var candidate = nearby[i];
          if (candidate.dead || hitIds.has(candidate.id)) continue;
          var d2 = distanceSquared(current.x, current.y, candidate.x, candidate.y);
          if (d2 < bestDistance) {
            bestDistance = d2;
            next = candidate;
          }
        }
        current = next;
      }
      var arcEffect = this.spawnEffect("arc", origin.x, origin.y, .18, def.color);
      arcEffect.points = points;
    };

    Game.prototype.damageEnemy = function (enemy, amount) {
      if (!enemy || enemy.dead || !Number.isFinite(amount) || amount <= 0) return;
      var hpBefore = Math.max(0, enemy.hp);
      var shieldBefore = Math.max(0, enemy.shield || 0);
      if (enemy.shield > 0) {
        var absorbed = Math.min(enemy.shield, amount);
        enemy.shield -= absorbed;
        amount -= absorbed;
        enemy.hitFlash = .10;
        if (this.effects.length < (currentQualityTier() > 1 ? 65 : (currentQualityTier() > 0 ? 90 : 120))) {
          var shieldHitEffect = this.spawnEffect("ring", enemy.x, enemy.y, .16, "#c5b8ff");
          shieldHitEffect.radius = enemy.radius;
          shieldHitEffect.maxRadius = enemy.radius + 12;
        }
        if (amount <= 0) {
          if (this === game && playtestTelemetry && playtestTelemetry.recordOutgoingDamage) playtestTelemetry.recordOutgoingDamage(enemy.type, 0, shieldBefore - enemy.shield, this.elapsed, enemy.id);
          return;
        }
      }
      enemy.hp -= amount;
      if (this === game && playtestTelemetry && playtestTelemetry.recordOutgoingDamage) playtestTelemetry.recordOutgoingDamage(enemy.type, Math.min(hpBefore, amount), shieldBefore - (enemy.shield || 0), this.elapsed, enemy.id);
      enemy.hitFlash = .10;
      if (save.settings.damageNumbers && amount >= 3.5) {
        enemy.pendingDamageNumber += amount;
        if (enemy.damageNumberClock <= 0 && this.effects.length < (currentQualityTier() > 1 ? 65 : (currentQualityTier() > 0 ? 90 : 120))) {
          var damageText = this.spawnEffect("damageText", enemy.x + (Math.random() - .5) * 12, enemy.y - enemy.radius, .58, enemy.pendingDamageNumber >= 50 ? "#ffd96a" : "#ffffff");
          damageText.value = Math.max(1, Math.round(enemy.pendingDamageNumber));
          enemy.pendingDamageNumber = 0;
          enemy.damageNumberClock = .12;
        }
      }
      if (enemy.hp <= 0) this.killEnemy(enemy);
    };

    Game.prototype.killEnemy = function (enemy) {
      if (enemy.dead) return;
      enemy.dead = true;
      this.recordProgress({ kills: 1, elapsed: this.elapsed });
      if (enemy.type === "boss") {
        this.bossDefeated = true;
        this.bossesDefeated += 1;
        this.recordProgress({ bosses: 1 });
        this.bossSpawned = false;
        this.bossWarningShown = false;
        this.pendingBossAngle = null;
        // Fixed arrival targets leave room for the swarm to develop between encounters.
        this.nextBossAt = this.bossesDefeated < SURVIVAL_BOSS_TIMES.length
          ? Math.max(SURVIVAL_BOSS_TIMES[this.bossesDefeated], this.elapsed + BOSS_RECOVERY_SECONDS + 30)
          : (this.continued ? this.elapsed + BOSS_REPEAT_INTERVAL : Infinity);
        this.recoveryUntil = this.elapsed + BOSS_RECOVERY_SECONDS;
        this.ambientSpawnClock = 1.5;
        this.assaultClock = ASSAULT_FIRST_DELAY;
        this.addShake(14);
        this.damageVignette = Math.max(this.damageVignette, save.settings.reducedFlash ? .25 : .42);
        this.burst(enemy.x, enemy.y, "#ffd96a", 55, 260);
        var bossDeathEffect = this.spawnEffect("ring", enemy.x, enemy.y, 1.1, "#ffd96a");
        bossDeathEffect.radius = 10;
        bossDeathEffect.maxRadius = 280;
        this.kills += 1;
        this.matter += enemy.reward;
        this.ship.tiles.forEach(function (tile) {
          tile.hp = Math.min(tile.maxHp, tile.hp + tile.maxHp * .12);
          tile.repairDelay = 0;
          if (tile.maxShield) tile.shield = Math.min(tile.maxShield, tile.shield + tile.maxShield * .3);
        });
        var core = this.ship.tiles.get("0,0");
        this.coreWarningStage = core && core.hp / core.maxHp <= .25 ? 2 : (core && core.hp / core.maxHp <= .5 ? 1 : 0);
        for (var projectileIndex = 0; projectileIndex < this.projectiles.length; projectileIndex += 1) {
          if (!this.projectiles[projectileIndex].friendly) this.projectiles[projectileIndex].life = 0;
        }
        ui.bossHud.classList.add("hidden");
        if (playtestTelemetry) {
          playtestTelemetry.recordEnemyKill("boss", enemy.reward);
          playtestTelemetry.recordBossDefeat(this.elapsed, { id: enemy.id });
        }
        audio.tone(70, .9, .1, "sawtooth", 420);
        showToast("BOSS DEFEATED · +" + enemy.reward + " MATTER · 12% REPAIR");
        return;
      }
      this.kills += 1;
      var rewardMultiplier = this.matterIncomeMultiplier();
      var earnedMatter = enemy.reward * rewardMultiplier;
      this.matter += earnedMatter;
      if (this.training && enemy.trainingTarget) {
        trainingShipState();
        trainingEvent("target_destroyed", { id: enemy.trainingTarget.id, group: enemy.trainingTarget.group, upgraded: Boolean(this.upgrades.cannon && this.upgrades.cannon.level > 0) });
      }
      if (playtestTelemetry) playtestTelemetry.recordEnemyKill(enemy.type, earnedMatter);
      this.burst(enemy.x, enemy.y, enemy.color, 8, 120);
      if (enemy.type === "splitter") {
        for (var i = 0; i < 2; i += 1) {
          var angle = i * Math.PI + Math.random() * .5;
          this.spawnEnemy("mini", enemy.x + Math.cos(angle) * 12, enemy.y + Math.sin(angle) * 12);
        }
      }
      audio.tone(180 + Math.random() * 70, .045, .012, "sine", 80);
    };

    Game.prototype.applyDamageToTile = function (targetKey, amount) {
      var target = this.ship.tiles.get(targetKey);
      if (!target || this.finished || !Number.isFinite(amount) || amount <= 0) return;
      var remaining = amount;
      var shieldAbsorbed = 0;
      var shields = this.shieldBuffer;
      shields.length = 0;
      this.ship.tiles.forEach(function (tile) {
        if (tile.type !== "shield") return;
        var dx = tile.x - target.x;
        var dy = tile.y - target.y;
        if (dx * dx + dy * dy > MODULES.shield.shieldRadius * MODULES.shield.shieldRadius) return;
        // Hits inside this field interrupt its recovery even when its charge is empty.
        tile.shieldDelay = MODULES.shield.rechargeDelay;
        shields.push(tile);
      });
      shields.sort(function (a, b) { return b.shield - a.shield; });
      for (var i = 0; i < shields.length && remaining > 0; i += 1) {
        var shield = shields[i];
        var absorbed = Math.min(shield.shield, remaining);
        shield.shield -= absorbed;
        shield.shieldDelay = MODULES.shield.rechargeDelay;
        if (shield.shield <= 0) shield.flash = Math.max(shield.flash, .35);
        remaining -= absorbed;
        shieldAbsorbed += absorbed;
      }
      if (remaining <= 0) {
        if (playtestTelemetry) playtestTelemetry.recordDamage(target.type, 0, shieldAbsorbed);
        var shieldedPos = this.gridToWorld(target.x, target.y);
        if (this.effects.length < (currentQualityTier() > 1 ? 65 : (currentQualityTier() > 0 ? 90 : 120))) {
          var shieldBlockEffect = this.spawnEffect("ring", shieldedPos.x, shieldedPos.y, .16, "#70ffc2");
          shieldBlockEffect.radius = 8;
          shieldBlockEffect.maxRadius = 38;
        }
        audio.impact(.22, false);
        return;
      }
      remaining *= 1 - this.bulkheadReduction(target);
      var removedHp = Math.min(target.hp, remaining);
      target.hp = Math.max(0, target.hp - remaining);
      if (playtestTelemetry) playtestTelemetry.recordDamage(target.type, removedHp, shieldAbsorbed);
      target.repairDelay = MODULES.repair.repairDelay;
      target.flash = Math.max(target.flash, .24 + clamp(remaining / 40, 0, .18));
      var impactPos = this.gridToWorld(target.x, target.y);
      if (save.settings.damageNumbers && this.effects.length < (currentQualityTier() > 1 ? 65 : (currentQualityTier() > 0 ? 90 : 120))) {
        var shipDamageText = this.spawnEffect("shipDamageText", impactPos.x + (Math.random() - .5) * 10, impactPos.y - 16, .62, target.type === "core" ? "#ffffff" : "#ff8799");
        shipDamageText.value = Math.max(1, Math.round(remaining));
      }
      this.triggerShipImpact(target, remaining);
      if (target.type === "core") {
        var healthRatio = target.hp / target.maxHp;
        var nextStage = healthRatio <= .25 ? 2 : (healthRatio <= .5 ? 1 : 0);
        if (nextStage > this.coreWarningStage) {
          this.coreWarningStage = nextStage;
          showToast(nextStage === 2 ? "CORE CRITICAL — 25%" : "CORE INTEGRITY BELOW 50%");
          audio.tone(nextStage === 2 ? 74 : 96, .42, .06, "square", -28);
        }
      }
      if (target.hp <= 0) this.destroyTile(targetKey);
    };

    Game.prototype.destroyTile = function (targetKey) {
      var target = this.ship.tiles.get(targetKey);
      if (!target) return;
      if (target.type === "core") {
        var corePos = this.gridToWorld(0, 0);
        this.addShake(18);
        this.damageVignette = save.settings.reducedFlash ? .42 : 1;
        this.burst(corePos.x, corePos.y, "#ffffff", 42, 240);
        this.finishRun(false);
        return;
      }
      this.detachTile(targetKey, false);
      this.addShake(6);
      var reachable = new Set(["0,0"]);
      var queue = [{ x: 0, y: 0 }];
      var offsets = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      while (queue.length > 0) {
        var current = queue.shift();
        for (var i = 0; i < offsets.length; i += 1) {
          var nx = current.x + offsets[i][0];
          var ny = current.y + offsets[i][1];
          var nextKey = keyOf(nx, ny);
          if (!reachable.has(nextKey) && this.ship.tiles.has(nextKey)) {
            reachable.add(nextKey);
            queue.push({ x: nx, y: ny });
          }
        }
      }
      var detached = [];
      this.ship.tiles.forEach(function (tile, key) {
        if (!reachable.has(key)) detached.push(key);
      });
      for (var d = 0; d < detached.length; d += 1) this.detachTile(detached[d], true);
      audio.tone(95, .18, .045, "sawtooth", -40);
    };

    Game.prototype.detachTile = function (key, branch) {
      var tile = this.ship.tiles.get(key);
      if (!tile) return;
      var pos = this.gridToWorld(tile.x, tile.y);
      this.ship.tiles.delete(key);
      this.modulesLost += 1;
      if (playtestTelemetry) playtestTelemetry.recordModuleLost(tile.type, branch);
      this.burst(pos.x, pos.y, branch ? "#a987ff" : "#65e8ff", branch ? 12 : 8, branch ? 150 : 100);
      var debrisEffect = this.spawnEffect("debris", pos.x, pos.y, .85, MODULES[tile.type].color);
      debrisEffect.vx = (pos.x - this.ship.x) * .7 + (Math.random() - .5) * 90;
      debrisEffect.vy = (pos.y - this.ship.y) * .7 + (Math.random() - .5) * 90;
      debrisEffect.rotation = this.ship.angle;
      debrisEffect.spin = (Math.random() - .5) * 4;
      debrisEffect.glyph = MODULES[tile.type].glyph;
    };

    Game.prototype.burst = function (x, y, color, count, speed) {
      var qualityTier = currentQualityTier();
      var particleLimit = qualityTier > 1 ? 200 : (qualityTier > 0 ? 300 : 420);
      var requested = qualityTier > 1 ? Math.ceil(count * .55) : (qualityTier > 0 ? Math.ceil(count * .75) : count);
      var allowed = Math.min(requested, Math.max(0, particleLimit - this.particles.length));
      for (var i = 0; i < allowed; i += 1) {
        var angle = Math.random() * TAU;
        var velocity = speed * (.25 + Math.random() * .75);
        var life = .25 + Math.random() * .45;
        this.spawnParticle(x, y, Math.cos(angle) * velocity, Math.sin(angle) * velocity, life, 1 + Math.random() * 2.5, color);
      }
    };

    Game.prototype.flashEffect = function (x, y, color, radius) {
      var effect = this.spawnEffect("ring", x, y, .65, color);
      effect.radius = 5;
      effect.maxRadius = radius;
    };

    Game.prototype.updateEffects = function (dt) {
      var particleDamping = Math.exp(-2.8 * dt);
      var ringExpansion = 1 - Math.exp(-7 * dt);
      var debrisDamping = Math.exp(-1.6 * dt);
      var particleWrite = 0;
      for (var i = 0; i < this.particles.length; i += 1) {
        var particle = this.particles[i];
        particle.life -= dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vx *= particleDamping;
        particle.vy *= particleDamping;
        if (particle.life > 0) this.particles[particleWrite++] = particle;
        else if (this.particlePool.length < 700) this.particlePool.push(particle);
      }
      var qualityTier = currentQualityTier();
      var maxParticles = qualityTier > 1 ? 200 : (qualityTier > 0 ? 300 : 420);
      if (particleWrite > maxParticles) {
        var particleStart = particleWrite - maxParticles;
        for (var droppedParticle = 0; droppedParticle < particleStart; droppedParticle += 1) {
          if (this.particlePool.length < 700) this.particlePool.push(this.particles[droppedParticle]);
        }
        for (var particleIndex = 0; particleIndex < maxParticles; particleIndex += 1) {
          this.particles[particleIndex] = this.particles[particleStart + particleIndex];
        }
        particleWrite = maxParticles;
      }
      this.particles.length = particleWrite;
      var effectWrite = 0;
      for (var e = 0; e < this.effects.length; e += 1) {
        var effect = this.effects[e];
        effect.life -= dt;
        if (effect.type === "ring") effect.radius = lerp(effect.radius, effect.maxRadius, ringExpansion);
        if (effect.type === "damageText" || effect.type === "shipDamageText") effect.y -= 30 * dt;
        if (effect.type === "debris") {
          effect.x += effect.vx * dt;
          effect.y += effect.vy * dt;
          effect.rotation += effect.spin * dt;
          effect.vx *= debrisDamping;
          effect.vy *= debrisDamping;
        }
        if (effect.life > 0) this.effects[effectWrite++] = effect;
        else {
          effect.points = null;
          if (this.effectPool.length < 240) this.effectPool.push(effect);
        }
      }
      var maxEffects = qualityTier > 1 ? 70 : (qualityTier > 0 ? 100 : 140);
      if (effectWrite > maxEffects) {
        var effectStart = effectWrite - maxEffects;
        for (var droppedEffect = 0; droppedEffect < effectStart; droppedEffect += 1) {
          this.effects[droppedEffect].points = null;
          if (this.effectPool.length < 240) this.effectPool.push(this.effects[droppedEffect]);
        }
        for (var effectIndex = 0; effectIndex < maxEffects; effectIndex += 1) {
          this.effects[effectIndex] = this.effects[effectStart + effectIndex];
        }
        effectWrite = maxEffects;
      }
      this.effects.length = effectWrite;
    };

    Game.prototype.update = function (dt) {
      if (this.state !== "playing" || this.finished) return;
      this.elapsed += dt;
      if (this.elapsed >= this.progressSaveAt) {
        this.recordProgress({ elapsed: this.elapsed });
        this.progressSaveAt = this.elapsed + 5;
        if (this === game && !this.training) storeSave();
      }
      this.backgroundPulse += dt;
      this.updateMovement(dt);
      this.updateFeedback(dt);
      this.updateShields(dt);
      this.updateSupportModules(dt);
      this.updateSpawner(dt);
      this.updateWeaponStatuses(dt);
      this.updateEnemies(dt);
      if (this.finished) return;
      this.updateProjectiles(dt);
      if (this.finished) return;
      this.updateWeapons(dt);
      this.updateEffects(dt);
      if (this.training && trainingSession && this === game && this.state === "playing") {
        trainingShipState();
        // Transitions can replace enemies, so advance only after all combat iteration ends.
        trainingSession.controller.advance();
        if (this.state === "playing") trainingSession.arena.update(this, dt, trainingSession.controller.snapshot());
      }
      this.checkSurvival();
    };

    Game.prototype.checkSurvival = function () {
      if (this.training) return;
      if (this.finished || this.survivalCompleted || this.elapsed < SURVIVAL_DURATION || this.bossesDefeated < SURVIVAL_BOSS_TIMES.length) return;
      var core = this.ship.tiles.get("0,0");
      if (!core || core.hp <= 0) return;
      this.survivalCompleted = true;
      this.state = "milestone";
      this.accumulator = 0;
      this.recoveryUntil = this.elapsed + BOSS_RECOVERY_SECONDS;
      if (this !== game) return;
      resetMobileInput();
      keys = Object.create(null);
      ui.milestoneReward.textContent = settleFragmentReward(this).fragments + " Fragments to bank";
      ui.milestoneOverlay.classList.remove("hidden");
      if (playtestTelemetry) playtestTelemetry.event("survival_complete", this.elapsed, { bosses: this.bossesDefeated });
      updateHud();
    };

    function continueSurvival() {
      if (!game || game.finished || game.state !== "milestone") return;
      game.continued = true;
      game.nextBossAt = game.elapsed + BOSS_REPEAT_INTERVAL;
      game.recoveryUntil = game.elapsed + BOSS_RECOVERY_SECONDS;
      game.state = "playing";
      game.lastFrame = performance.now();
      game.accumulator = 0;
      ui.milestoneOverlay.classList.add("hidden");
      if (playtestTelemetry) playtestTelemetry.event("survival_continue", game.elapsed, { bosses: game.bossesDefeated });
      showToast("CONTINUING · Same ship, upgrades and Matter · 8s respite");
      updateHud();
    }

    Game.prototype.finishRun = function (victory, retired) {
      if (this.training) { failTrainingLesson(); return; }
      if (this.finished) return;
      this.finished = true;
      this.state = "result";
      resetMobileInput();
      this.recordProgress({ elapsed: this.elapsed });
      var carryBefore = save.fragmentCarryUnits;
      var reward = settleFragmentReward(this);
      var fragments = reward.fragments;
      ui.milestoneOverlay.classList.add("hidden");
      save.fragments += fragments;
      save.fragmentCarryUnits = reward.carryUnits;
      save.bestTime = Math.max(save.bestTime, this.elapsed);
      save.bestKills = Math.max(save.bestKills, this.kills);
      save.victories += this.bossesDefeated;
      if (playtestTelemetry) {
        playtestTelemetry.finishRun({
          outcome: retired ? (this.survivalCompleted ? "survived" : "retired") : "death",
          elapsed: this.elapsed,
          kills: this.kills,
          matter: this.matter,
          modules: this.ship.tiles.size,
          fragments: fragments,
          fragmentReward: { earnedUnits: reward.earnedUnits, carryBeforeUnits: carryBefore,
            carryAfterUnits: reward.carryUnits, scale: reward.scale }
        }, telemetrySample());
      }
      storeSave();
      ui.resultTitle.textContent = retired ? (this.survivalCompleted ? "SURVIVAL COMPLETE" : "RUN BANKED") : "CORE LOST";
      ui.resultSubtitle.textContent = this.survivalCompleted ? "10-minute milestone earned · completion bonus included." : "Fragments earned from survival, kills and bosses. Spend them in Hangar.";
      ui.resultKills.textContent = this.kills;
      ui.resultTime.textContent = formatTime(this.elapsed);
      ui.resultFragments.textContent = "+" + fragments;
      ui.resultBosses.textContent = this.bossesDefeated;
      renderObjectives();
      updateTelemetryStatus();
      ui.toast.classList.remove("show");
      var completedGame = this;
      setTimeout(function () {
        if (game === completedGame && game.state === "result") ui.resultOverlay.classList.remove("hidden");
      }, 300);
      updateHud();
    };

    function buildModuleName(type) {
      var names = { armor: "Armor", cannon: "Cannon", laser: "Laser", missile: "Missile", scatter: "Scatter", arc: "Arc", rail: "Rail",
        flak: "Flak", pulse: "Pulse", cryo: "Cryo", mine: "Mine", ember: "Ember", gravity: "Gravity", shield: "Shield", drive: "Drive",
        repair: "Repair", reactor: "Reactor", collector: "Siphon", bulkhead: "Bulkhead" };
      return names[type] || MODULES[type].name;
    }

    function createCatalog(focusType) {
      var scrollLeft = ui.catalog.scrollLeft;
      var scrollTop = ui.catalog.scrollTop;
      ui.catalog.innerHTML = "";
      var available = Object.keys(MODULES).filter(moduleAvailable);
      if (available.length && available.indexOf(selectedBuildModule) < 0) selectedBuildModule = available[0];
      var focusButton = null;
      [{ key: "weapon", name: "Weapons" }, { key: "system", name: "Systems" }, { key: "structure", name: "Hull" }].forEach(function (category) {
        var types = available.filter(function (type) { return moduleCategory(type) === category.key; });
        if (!types.length) return;
        var group = document.createElement("section");
        group.className = "catalog-group";
        group.dataset.category = category.key;
        group.setAttribute("aria-label", category.name);
        var heading = document.createElement("h4");
        heading.className = "catalog-group-title";
        heading.textContent = category.name;
        group.appendChild(heading);
        var items = document.createElement("div");
        items.className = "catalog-group-items";
        types.forEach(function (type) {
          var def = MODULES[type];
          var price = modulePrice(type);
          var affordable = game && game.matter >= price;
          var selectedForPurchase = !buildInteraction.selectedKey && selectedBuildModule === type;
          var button = document.createElement("button");
          button.className = "catalog-card" + (selectedForPurchase ? " selected" : "") + (affordable ? "" : " unaffordable");
          button.disabled = !game;
          button.dataset.type = type;
          button.setAttribute("aria-pressed", selectedForPurchase ? "true" : "false");
          button.setAttribute("aria-label", def.name + ", " + price + " Matter" + (affordable ? "" : ", not enough Matter"));
          button.title = def.name + " · " + def.summary;
          button.innerHTML = moduleGlyphHtml(type) + '<strong>' + buildModuleName(type) + '</strong><span class="catalog-cost">' + price + "</span>";
          if (typeof wireCatalogDrag === "function") wireCatalogDrag(button, type);
          button.addEventListener("click", function () {
            selectedBuildModule = type;
            audio.tone(370, .045, .02, "sine", 60);
            createCatalog(type);
            renderBuildGrid();
          });
          items.appendChild(button);
          if (type === focusType) focusButton = button;
        });
        group.appendChild(items);
        ui.catalog.appendChild(group);
      });
      ui.catalog.scrollLeft = scrollLeft;
      ui.catalog.scrollTop = scrollTop;
      if (focusButton && focusButton.focus) focusButton.focus({ preventScroll: true });
    }

    function installedModuleCopies(type) {
      var copies = 0;
      if (game) game.ship.tiles.forEach(function (tile) { if (tile.type === type) copies += 1; });
      return copies;
    }

    function upgradePricingCopies(type) {
      if (!game) return 0;
      return Math.max(installedModuleCopies(type), game.upgradeFleetSizes[type] || 0);
    }

    function buyRunUpgrade(type, choice, expectedRank) {
      if (modulePreviewSession) return false;
      if (!game || game.state !== "building") return false;
      var copies = installedModuleCopies(type);
      if (!copies) return false;
      var result = runUpgrades.purchase(game.upgrades, type, choice, game.matter, upgradePricingCopies(type), expectedRank);
      if (!result) return false;
      game.matter = result.matter;
      if (playtestTelemetry && playtestTelemetry.recordUpgrade) playtestTelemetry.recordUpgrade(type, choice, result.option.cost, game.elapsed, { level: game.upgrades[type].level + 1, branch: game.upgrades[type].branch });
      game.weaponDefinitions[type] = runUpgrades.resolve(MODULES[type], game.upgrades[type]);
      game.recordProgress({ upgrades: 1 });
      trainingEvent("weapon_upgraded", { type: type, copies: copies, level: game.upgrades[type].level });
      game.ship.tiles.forEach(function (tile) {
        if (tile.type === type) { tile.cooldown = 0; tile.flash = .65; }
      });
      showToast(game.training ? (copies === 1 ? "Cannon upgraded" : "All " + copies + " Cannons upgraded") : MODULES[type].name + " · " + runUpgrades.label(type, game.upgrades[type]) + (copies === 1 ? " · Weapon upgraded" : " · All " + copies + " copies upgraded"));
      storeSave();
      audio.tone(330, .16, .045, "sine", 360);
      createCatalog();
      renderBuildGrid();
      updateHud();
      return true;
    }

    function renderRunUpgrades() {
      if (!game) return;
      ui.upgradeList.innerHTML = "";
      var tile = selectedBuildTile();
      var type = tile ? tile.type : selectedBuildModule;
      var copies = isWeaponType(type) ? installedModuleCopies(type) : 0;
      ui.buildUpgradePanel.classList.toggle("hidden", !copies);
      if (!copies) return;
        var def = game.weaponDefinitions[type];
        var card = document.createElement("article");
        card.className = "upgrade-card";
        card.innerHTML = '<header><strong class="upgrade-scope-title">' + buildModuleName(type) + ' upgrades</strong><span class="upgrade-level">' + runUpgrades.label(type, game.upgrades[type]) + '</span><small class="upgrade-scope-note">All ' + copies + ' ' + (copies === 1 ? 'copy' : 'copies') + ' + future copies · This run</small></header>';
        var choices = runUpgrades.options(type, game.upgrades[type], upgradePricingCopies(type));
        if (!choices.length) card.innerHTML += '<p class="upgrade-delta">' + (game.upgrades[type] && game.upgrades[type].level === runUpgrades.MAX_RANK ? "Maximum level reached." : "Upgrade unavailable.") + '</p>';
        var actions = document.createElement("div");
        actions.className = "upgrade-actions";
        choices.forEach(function (choice) {
          var button = document.createElement("button");
          button.className = "upgrade-option";
          button.dataset.weapon = type;
          button.dataset.choice = choice.id;
          button.disabled = game.matter < choice.cost;
          var description = choice.id === "tune" ? "Shots/s " + Number((1 / def.cooldown).toFixed(2)) + " → " + Number((1.25 / def.cooldown).toFixed(2)) : choice.description;
          if (choice.id === "calibrate") {
            var nextDef = runUpgrades.resolve(MODULES[type], { level: choice.rank + 1, branch: game.upgrades[type].branch });
            var changes = choice.milestone ? [choice.description] : [];
            if (nextDef.damage !== def.damage) changes.push((type === "gravity" ? "DPS " : "Damage ") + Number(def.damage.toFixed(2)) + " → " + Number(nextDef.damage.toFixed(2)));
            if (type === "ember" && nextDef.burnDamage !== def.burnDamage) changes.push("Burn " + Number(def.burnDamage.toFixed(2)) + " → " + Number(nextDef.burnDamage.toFixed(2)) + "/s");
            if (type === "flak" || type === "gravity") {
              var radiusKey = type === "gravity" ? "fieldRadius" : "blastRadius";
              if (nextDef[radiusKey] !== def[radiusKey]) changes.push("Radius " + Math.round(def[radiusKey]) + " → " + Math.round(nextDef[radiusKey]));
            }
            if (type === "cryo" && nextDef.slowDuration !== def.slowDuration) changes.push("Slow " + Number(def.slowDuration.toFixed(2)) + " → " + Number(nextDef.slowDuration.toFixed(2)) + "s");
            description = changes.join(" · ");
          }
          if (choice.milestone) button.classList.add("milestone-upgrade");
          button.innerHTML = '<strong>' + choice.name + '</strong><span class="upgrade-delta">' + description + '</span><b>' + choice.cost + ' Matter</b>';
          button.addEventListener("click", function (event) {
            if (!buyRunUpgrade(type, choice.id, choice.rank)) return;
            if (event && event.detail === 0 && ui.upgradeList.querySelector) {
              var nextOption = ui.upgradeList.querySelector(".upgrade-option:not(:disabled)") || ui.buildGrid.querySelector(".selected-installed") || ui.catalog.querySelector(".selected");
              if (nextOption) nextOption.focus({ preventScroll: true });
            }
          });
          actions.appendChild(button);
        });
        card.appendChild(actions);
        ui.upgradeList.appendChild(card);
      ui.buildMatter.textContent = Math.floor(game.matter);
    }

    var buildInteraction = { owner: null, selectedKey: null, drag: null, preview: null, pendingCellKey: null, suppressClickUntil: 0 };

    function clearBuildInteraction() {
      var drag = buildInteraction.drag;
      if (drag && drag.ghost && drag.ghost.parentNode) drag.ghost.parentNode.removeChild(drag.ghost);
      document.removeEventListener("pointermove", moveBuildPointer);
      document.removeEventListener("pointerup", releaseBuildPointer);
      document.removeEventListener("pointercancel", cancelBuildPointer);
      buildInteraction.drag = null;
      buildInteraction.selectedKey = null;
      buildInteraction.preview = null;
      buildInteraction.pendingCellKey = null;
      buildInteraction.owner = game;
    }

    function buildLayoutConnected(removeKey) {
      if (!game || !game.ship.tiles.has("0,0") || removeKey === "0,0") return false;
      var keys = new Set();
      game.ship.tiles.forEach(function (tile, key) { if (key !== removeKey) keys.add(key); });
      var reached = new Set(["0,0"]);
      var queue = [{ x: 0, y: 0 }];
      var offsets = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (var index = 0; index < queue.length; index += 1) {
        for (var side = 0; side < offsets.length; side += 1) {
          var x = queue[index].x + offsets[side][0];
          var y = queue[index].y + offsets[side][1];
          var nextKey = keyOf(x, y);
          if (!keys.has(nextKey) || reached.has(nextKey)) continue;
          reached.add(nextKey);
          queue.push({ x: x, y: y });
        }
      }
      return reached.size === keys.size;
    }

    function moduleSellRefund(tile) {
      if (!tile || tile.type === "core" || !Number.isFinite(tile.paidMatter) || tile.paidMatter <= 0) return 0;
      return Math.floor(tile.paidMatter * .6 * clamp(tile.hp / tile.maxHp, 0, 1));
    }

    function moduleSaleBlockReason(sourceKey) {
      if (!game) return "";
      var tile = game.ship.tiles.get(sourceKey);
      if (!tile || tile.type === "core") return "The core cannot be sold.";
      if (!buildLayoutConnected(sourceKey)) return "Other modules need this connection. Sell the outer modules first.";
      if (!isWeaponType(tile.type)) return "";
      var weaponCount = 0;
      game.ship.tiles.forEach(function (installed) { if (isWeaponType(installed.type)) weaponCount += 1; });
      if (weaponCount > 1) return "";
      var replacementPrice = Infinity;
      WEAPON_TYPES.forEach(function (type) {
        if (!moduleAvailable(type)) return;
        var countAfterSale = installedModuleCopies(type) - (type === tile.type ? 1 : 0);
        replacementPrice = Math.min(replacementPrice, Math.ceil(MODULES[type].baseCost * Math.pow(MODULES[type].scale, countAfterSale)));
      });
      return game.matter + moduleSellRefund(tile) >= replacementPrice ? "" : "Keep one weapon or save enough Matter for a replacement.";
    }

    function finishBuildChange() {
      trainingShipState();
      updateHud();
      createCatalog();
      renderBuildGrid();
    }

    function sellInstalledModule(sourceKey) {
      if (modulePreviewSession) return false;
      if (!game || game.state !== "building") return false;
      var tile = game.ship.tiles.get(sourceKey);
      if (!tile || tile.type === "core") return false;
      var blockReason = moduleSaleBlockReason(sourceKey);
      if (blockReason) {
        showToast("CANNOT SELL · " + blockReason);
        return false;
      }
      var refund = moduleSellRefund(tile);
      game.ship.tiles.delete(sourceKey);
      game.matter += refund;
      trainingEvent("module_sold", { type: tile.type, refund: refund, paid: tile.paidMatter || 0 });
      // Selling is a planned edit, not combat damage or a disconnected branch loss.
      game.gravityFields = game.gravityFields.filter(function (field) { return field.sourceTile !== tile; });
      buildInteraction.selectedKey = null;
      buildInteraction.preview = null;
      if (playtestTelemetry && typeof playtestTelemetry.recordSale === "function") playtestTelemetry.recordSale(tile.type, refund, game.elapsed, { x: tile.x, y: tile.y });
      showToast(MODULES[tile.type].name + " sold · +" + refund + " Matter");
      finishBuildChange();
      return true;
    }

    function validPlacement(x, y, type) {
      return Boolean(game && Number.isInteger(x) && Number.isInteger(y) && Object.prototype.hasOwnProperty.call(MODULES, type) &&
        !game.ship.tiles.has(keyOf(x, y)) && game.isAdjacentToShip(x, y));
    }

    function placePurchasedModule(x, y) {
      if (modulePreviewSession) return false;
      if (!game || game.state !== "building" || buildInteraction.selectedKey) return false;
      var type = selectedBuildModule;
      if (!moduleAvailable(type)) return false;
      var price = modulePrice(type);
      if (game.matter < price) {
        showToast("NOT ENOUGH MATTER");
        return false;
      }
      if (!validPlacement(x, y, type)) {
        showToast("INVALID CONNECTION");
        return false;
      }
      game.matter -= price;
      game.purchasedCounts[type] += 1;
      var tile = makeTile(type, x, y, false, game.coreDef.moduleHpMultiplier, game.training);
      tile.paidMatter = price;
      game.ship.tiles.set(keyOf(x, y), tile);
      if (isWeaponType(type)) game.upgradeFleetSizes[type] = Math.max(game.upgradeFleetSizes[type] || 0, installedModuleCopies(type));
      trainingEvent("module_placed", { type: type, x: x, y: y, paid: price, copies: installedModuleCopies(type), coversCore: type === "shield" && x * x + y * y <= MODULES.shield.shieldRadius * MODULES.shield.shieldRadius });
      if (playtestTelemetry) playtestTelemetry.recordPurchase(type, price, game.elapsed, { x: x, y: y });
      game.flashEffect(game.ship.x, game.ship.y, MODULES[type].color, 90);
      audio.tone(250, .12, .045, "square", 280);
      buildInteraction.selectedKey = null;
      buildInteraction.pendingCellKey = null;
      finishBuildChange();
      return true;
    }

    function selectedBuildTile() {
      return game && buildInteraction.selectedKey ? game.ship.tiles.get(buildInteraction.selectedKey) : null;
    }

    function shieldBuildDescription(tile) {
      var def = MODULES.shield;
      var capacity = tile ? Math.ceil(tile.shield) + "/" + tile.maxShield : String(def.shield);
      var delay = def.rechargeDelay;
      var rate = def.rechargeRate;
      var status = tile && tile.shieldDelay > 0 ? " · Recharges in " + tile.shieldDelay.toFixed(1) + "s" : "";
      return "Shield " + capacity + " shared" + status + " · +" + rate + "/s, " + delay + "s without hits in range";
    }

    function renderBuildModuleDetails() {
      var details = document.getElementById("buildModuleDetails");
      if (!details) return;
      var tile = selectedBuildTile();
      details.innerHTML = "";
      details.classList.toggle("hidden", !tile);
      if (!tile) return;
      var name = tile.type === "core" ? "Core" : MODULES[tile.type].name;
      details.innerHTML = '<div class="installed-module-heading"><span class="module-role">Installed</span><strong>' + name + '</strong></div><span> Hull ' + Math.ceil(tile.hp) + '/' + Math.ceil(tile.maxHp) + '</span>';
      if (tile.type === "shield") details.innerHTML += '<p class="build-shield-stats">' + shieldBuildDescription(tile) + '</p>';
      if (tile.type === "core") { details.innerHTML += '<p>The core stays at the center.</p>'; return; }
      var blockReason = moduleSaleBlockReason(buildInteraction.selectedKey);
      var canSell = !blockReason;
      var refund = moduleSellRefund(tile);
      var actions = document.createElement("div");
      actions.className = "build-detail-actions";
      var sell = document.createElement("button");
      sell.className = "sell-module-button";
      sell.textContent = refund > 0 ? "Sell · +" + refund + " Matter" : "Remove";
      sell.disabled = !canSell;
      sell.setAttribute("aria-label", refund > 0 ? "Sell " + name + " for " + refund + " Matter" : "Remove " + name + ", no refund");
      var selectedKey = buildInteraction.selectedKey;
      sell.addEventListener("click", function () { sellInstalledModule(selectedKey); });
      actions.appendChild(sell);
      details.appendChild(actions);
      var note = document.createElement("p");
      note.textContent = blockReason || (tile.paidMatter > 0 ? "Refund: 60% × hull condition." : "Free starter · no refund.");
      details.appendChild(note);
    }

    function updateBuildPreview(x, y) {
      if (!game || game.state !== "building") return;
      var drag = buildInteraction.drag;
      var hovered = Number.isInteger(x) && Number.isInteger(y) ? game.ship.tiles.get(keyOf(x, y)) : null;
      var selected = selectedBuildTile();
      var origin = null;
      if (drag && drag.active) {
        if (drag.type === "shield" && Number.isInteger(x) && Number.isInteger(y)) origin = { x: x, y: y };
      } else if (hovered && hovered.type === "shield") origin = { x: hovered.x, y: hovered.y, tile: hovered };
      else if (selected && selected.type === "shield") origin = { x: selected.x, y: selected.y, tile: selected };
      else if (!selected && !hovered && Number.isInteger(x) && Number.isInteger(y) && selectedBuildModule === "shield") {
        origin = { x: x, y: y };
      }
      buildInteraction.preview = origin;
      var protectedCount = 0;
      var radiusSquared = MODULES.shield.shieldRadius * MODULES.shield.shieldRadius;
      Array.prototype.forEach.call(ui.buildGrid.children, function (cell) {
        var gx = Number(cell.dataset.x);
        var gy = Number(cell.dataset.y);
        var key = keyOf(gx, gy);
        var inRadius = origin && (gx - origin.x) * (gx - origin.x) + (gy - origin.y) * (gy - origin.y) <= radiusSquared;
        var occupied = game.ship.tiles.has(key);
        cell.classList.toggle("shield-range", Boolean(inRadius));
        cell.classList.toggle("shield-covered", Boolean(inRadius && occupied));
        cell.classList.toggle("preview-origin", Boolean((origin && gx === origin.x && gy === origin.y) || buildInteraction.pendingCellKey === key));
        if (inRadius && occupied) protectedCount += 1;
      });
      var status = document.getElementById("buildPreviewStatus");
      if (!status) return;
      status.textContent = origin ? "Protects " + protectedCount + " " + (protectedCount === 1 ? "module" : "modules") + " · " + shieldBuildDescription(origin.tile) :
        (selectedBuildModule === "shield" && !selected ? "Hover a cell or drag the shield to preview its coverage." : "");
      if (origin && selected && selected.type === "shield" && origin.tile === selected) {
        status.textContent = "Protects " + protectedCount + " modules · " + MODULES.shield.shieldRadius + "-cell radius";
      }
      if (buildInteraction.pendingCellKey) status.textContent = "Tap again to attach" + (origin ? " · Protects " + protectedCount + " modules · Shield " + MODULES.shield.shield : " the module.");
      status.classList.toggle("is-empty", !status.textContent);
    }

    function buildCellAtPointer(event) {
      var element = document.elementFromPoint(event.clientX, event.clientY);
      var cell = element && element.closest ? element.closest(".build-cell") : null;
      return cell && ui.buildGrid.contains(cell) ? cell : null;
    }

    function beginBuildPointer(event, type) {
      if (!game || game.state !== "building" || (event.button !== undefined && event.button !== 0) || buildInteraction.drag) return;
      if (!moduleAvailable(type)) return;
      buildInteraction.drag = { owner: game, pointerId: event.pointerId, type: type,
        pointerType: event.pointerType, startX: event.clientX, startY: event.clientY, active: false, ghost: null, target: null };
      document.addEventListener("pointermove", moveBuildPointer, { passive: false });
      document.addEventListener("pointerup", releaseBuildPointer);
      document.addEventListener("pointercancel", cancelBuildPointer);
    }

    function scrollBuildViewport(drag, event) {
      var viewport = ui.buildGrid.closest(".build-grid-wrap");
      if (!viewport) return;
      var bounds = viewport.getBoundingClientRect();
      var insetX = Math.min(24, bounds.width * .1);
      var insetY = Math.min(24, bounds.height * .1);
      var inside = event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
      var cell = inside ? buildCellAtPointer(event) : null;
      var validTarget = false;
      if (cell) {
        var x = Number(cell.dataset.x), y = Number(cell.dataset.y);
        validTarget = validPlacement(x, y, drag.type) && game.matter >= modulePrice(drag.type);
      }
      var directionX = inside && !validTarget ? (event.clientX < bounds.left + insetX ? -1 : (event.clientX > bounds.right - insetX ? 1 : 0)) : 0;
      var directionY = inside && !validTarget ? (event.clientY < bounds.top + insetY ? -1 : (event.clientY > bounds.bottom - insetY ? 1 : 0)) : 0;
      if (!directionX && !directionY) { drag.edgeScroll = null; return; }
      if (!drag.edgeScroll || drag.edgeScroll.x !== directionX || drag.edgeScroll.y !== directionY) {
        drag.edgeScroll = { x: directionX, y: directionY, since: performance.now() };
        return;
      }
      // Crossing a compact grid must not move a destination out from under the held module.
      if (performance.now() - drag.edgeScroll.since < 220) return;
      viewport.scrollLeft += directionX * 8;
      viewport.scrollTop += directionY * 8;
    }

    function moveBuildPointer(event) {
      var drag = buildInteraction.drag;
      if (!drag || event.pointerId !== drag.pointerId) return;
      if (drag.owner !== game || game.state !== "building") { cancelBuildPointer(); return; }
      if (!drag.active && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 8) return;
      if (!drag.active && drag.pointerType === "touch" &&
          Math.abs(event.clientX - drag.startX) > Math.abs(event.clientY - drag.startY) * 1.2) {
        // A sideways catalog swipe belongs to its native scroll container.
        cancelBuildPointer();
        return;
      }
      event.preventDefault();
      if (!drag.active) {
        drag.active = true;
        selectedBuildModule = drag.type;
        buildInteraction.selectedKey = null;
        buildInteraction.pendingCellKey = null;
        // Keep the grid in place under the pointer; selecting details can change its layout.
        Array.prototype.forEach.call(ui.buildGrid.children, function (cell) {
          var x = Number(cell.dataset.x), y = Number(cell.dataset.y);
          var key = keyOf(x, y);
          var available = validPlacement(x, y, drag.type) && game.matter >= modulePrice(drag.type);
          cell.classList.toggle("valid", Boolean(available && !game.ship.tiles.has(key)));
          cell.classList.remove("selected-installed");
          if (!game.ship.tiles.has(key)) {
            cell.dataset.action = "attach";
            cell.innerHTML = "<span>" + (available ? "+" : "·") + "</span>";
          }
        });
        drag.ghost = document.createElement("div");
        drag.ghost.className = "build-drag-ghost";
        drag.ghost.innerHTML = moduleIconHtml(drag.type);
        drag.ghost.setAttribute("aria-hidden", "true");
        document.body.appendChild(drag.ghost);
      }
      drag.ghost.style.left = event.clientX + "px";
      drag.ghost.style.top = event.clientY + "px";
      scrollBuildViewport(drag, event);
      drag.target = buildCellAtPointer(event);
      Array.prototype.forEach.call(ui.buildGrid.children, function (cell) { cell.classList.remove("drop-valid", "drop-invalid"); });
      if (!drag.target) { updateBuildPreview(); return; }
      var x = Number(drag.target.dataset.x);
      var y = Number(drag.target.dataset.y);
      var valid = validPlacement(x, y, drag.type) && game.matter >= modulePrice(drag.type);
      drag.target.classList.add(valid ? "drop-valid" : "drop-invalid");
      updateBuildPreview(x, y);
    }

    function releaseBuildPointer(event) {
      var drag = buildInteraction.drag;
      if (!drag || event.pointerId !== drag.pointerId) return;
      var cell = drag.active ? buildCellAtPointer(event) : null;
      var wasActive = drag.active;
      var type = drag.type;
      clearBuildInteraction();
      if (!wasActive) return;
      buildInteraction.suppressClickUntil = performance.now() + 350;
      if (!game || drag.owner !== game || game.state !== "building") return;
      if (cell) {
        var x = Number(cell.dataset.x);
        var y = Number(cell.dataset.y);
        selectedBuildModule = type;
        placePurchasedModule(x, y);
      }
      renderBuildGrid();
    }

    function cancelBuildPointer() {
      clearBuildInteraction();
      if (game && game.state === "building") renderBuildGrid();
    }

    function wireCatalogDrag(button, type) {
      button.style.touchAction = "pan-x";
      button.addEventListener("pointerdown", function (event) { beginBuildPointer(event, type); });
      button.addEventListener("click", function (event) {
        if ((buildInteraction.drag && buildInteraction.drag.active) || performance.now() < buildInteraction.suppressClickUntil) { event.preventDefault(); event.stopImmediatePropagation(); return; }
        buildInteraction.selectedKey = null;
        buildInteraction.pendingCellKey = null;
      }, true);
    }

    var buildViewportFocus = null;

    function centerBuildSelection() {
      if (!ui.buildGrid.querySelector || !ui.buildGrid.closest || (buildInteraction.drag && buildInteraction.drag.active)) return;
      var viewport = ui.buildGrid.closest(".build-grid-wrap");
      if (!viewport || !viewport.clientWidth || !viewport.clientHeight) return;
      var selectedKey = buildInteraction.selectedKey || "0,0";
      var signature = selectedKey + ":" + viewport.clientWidth + ":" + viewport.clientHeight;
      if (buildViewportFocus && buildViewportFocus.owner === game && buildViewportFocus.signature === signature) return;
      buildViewportFocus = { owner: game, signature: signature };
      var tile = game.ship.tiles.get(selectedKey);
      var coreCell = ui.buildGrid.querySelector('.build-cell[data-x="0"][data-y="0"]');
      var selectedCell = tile && ui.buildGrid.querySelector('.build-cell[data-x="' + tile.x + '"][data-y="' + tile.y + '"]');
      if (!coreCell || !selectedCell) return;
      var core = coreCell.getBoundingClientRect();
      var selected = selectedCell.getBoundingClientRect();
      var target = { left: Math.min(core.left, selected.left), right: Math.max(core.right, selected.right),
        top: Math.min(core.top, selected.top), bottom: Math.max(core.bottom, selected.bottom) };
      if (target.right - target.left > viewport.clientWidth - 8 || target.bottom - target.top > viewport.clientHeight - 8) target = selected;
      var bounds = viewport.getBoundingClientRect();
      viewport.scrollLeft += (target.left + target.right) / 2 - bounds.left - viewport.clientLeft - viewport.clientWidth / 2;
      viewport.scrollTop += (target.top + target.bottom) / 2 - bounds.top - viewport.clientTop - viewport.clientHeight / 2;
    }

    function renderBuildGrid() {
      if (!game) return;
      if (buildInteraction.owner !== game) clearBuildInteraction();
      if (buildInteraction.selectedKey && !game.ship.tiles.has(buildInteraction.selectedKey)) buildInteraction.selectedKey = null;
      var installedSelection = selectedBuildTile();
      ui.buildSelection.classList.toggle("hidden", Boolean(installedSelection));
      var readyFamilies = Object.create(null);
      game.ship.tiles.forEach(function (tile) {
        if (!isWeaponType(tile.type) || Object.prototype.hasOwnProperty.call(readyFamilies, tile.type)) return;
        readyFamilies[tile.type] = runUpgrades.options(tile.type, game.upgrades[tile.type], upgradePricingCopies(tile.type)).some(function (option) { return option.cost <= game.matter; });
      });
      var selected = MODULES[selectedBuildModule];
      var selectedPrice = modulePrice(selectedBuildModule);
      var canAffordSelected = game.matter >= selectedPrice;
      var missingMatter = Math.ceil(selectedPrice - game.matter);
      ui.buildSelection.innerHTML = moduleGlyphHtml(selectedBuildModule) + '<div><span class="module-role">Buy one copy</span><strong>' + selected.name + '</strong><p>' + selected.summary + '</p></div><div class="selection-price' + (canAffordSelected ? '' : ' short') + '">' + selectedPrice + ' MATTER<small>' + (canAffordSelected ? 'READY TO ATTACH' : 'SHORT ' + missingMatter) + '</small></div>';
      ui.buildSelection.title = selected.description;
      var minX = 0;
      var maxX = 0;
      var minY = 0;
      var maxY = 0;
      game.ship.tiles.forEach(function (tile) {
        minX = Math.min(minX, tile.x);
        maxX = Math.max(maxX, tile.x);
        minY = Math.min(minY, tile.y);
        maxY = Math.max(maxY, tile.y);
      });
      minX -= 1;
      maxX += 1;
      minY -= 1;
      maxY += 1;
      var columns = maxX - minX + 1;
      ui.buildGrid.style.gridTemplateColumns = "repeat(" + columns + ", 48px)";
      ui.buildGrid.innerHTML = "";
      for (var y = minY; y <= maxY; y += 1) {
        for (var x = minX; x <= maxX; x += 1) {
          var button = document.createElement("button");
          button.className = "build-cell";
          var key = keyOf(x, y);
          var tile = game.ship.tiles.get(key);
          if (tile) {
            button.classList.add("occupied");
            if (tile.type === "core") button.classList.add("core");
            var glyph = tile.type === "core" ? "▲" : moduleIconHtml(tile.type);
            button.setAttribute("aria-label", tile.type === "core" ? "Core" : MODULES[tile.type].name);
            var color = tile.type === "core" ? "#ffffff" : MODULES[tile.type].color;
            button.innerHTML = '<span style="color:' + color + '">' + glyph + '</span><span class="cell-hp"><i style="width:' + clamp(tile.hp / tile.maxHp * 100, 0, 100) + '%"></i></span>';
            if (readyFamilies[tile.type]) {
              button.classList.add("upgrade-available");
              button.innerHTML += '<span class="cell-upgrade-marker" aria-hidden="true">↑</span>';
              button.title = MODULES[tile.type].name + " · Upgrade available";
            }
            button.classList.toggle("selected-installed", key === buildInteraction.selectedKey);
            (function (tileKey, tileType) {
              button.addEventListener("click", function (event) {
                if ((buildInteraction.drag && buildInteraction.drag.active) || performance.now() < buildInteraction.suppressClickUntil) return;
                buildInteraction.selectedKey = tileKey;
                buildInteraction.pendingCellKey = null;
                if (tileType !== "core") selectedBuildModule = tileType;
                createCatalog();
                renderBuildGrid();
                if (event && event.detail === 0 && ui.buildGrid.querySelector) {
                  var selectedCell = ui.buildGrid.querySelector(".selected-installed");
                  if (selectedCell) selectedCell.focus({ preventScroll: true });
                }
              });
            })(key, tile.type);
          } else {
            var structurallyValid = !installedSelection && validPlacement(x, y, selectedBuildModule);
            var placeable = structurallyValid && canAffordSelected;
            button.setAttribute("aria-label", (installedSelection ? "Select a catalog module to attach" : (placeable ? "Attach " + selected.name : "Unavailable attachment")) + " at " + x + ", " + y);
            button.classList.add(placeable ? "valid" : (structurallyValid ? "unaffordable" : "blocked"));
            button.dataset.action = installedSelection ? "none" : "attach";
            button.innerHTML = "<span>" + (placeable ? "+" : (structurallyValid ? "$" : "·")) + "</span>";
            button.setAttribute("aria-disabled", String(!placeable));
            (function (gx, gy) {
              button.addEventListener("click", function (event) {
                if ((buildInteraction.drag && buildInteraction.drag.active) || performance.now() < buildInteraction.suppressClickUntil) return;
                if (buildInteraction.selectedKey) {
                  ui.buildHint.textContent = "Select a module in the catalog to buy and attach it.";
                  return;
                }
                var targetKey = keyOf(gx, gy);
                var touchInput = event.pointerType === "touch" || (window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
                var previewable = validPlacement(gx, gy, selectedBuildModule) && game.matter >= modulePrice(selectedBuildModule);
                if (touchInput && previewable && buildInteraction.pendingCellKey !== targetKey) {
                  buildInteraction.pendingCellKey = targetKey;
                  updateBuildPreview(gx, gy);
                  updateTrainingView();
                  ui.buildHint.textContent = "Tap this cell again to attach " + MODULES[selectedBuildModule].name + ".";
                  return;
                }
                buildInteraction.pendingCellKey = null;
                placePurchasedModule(gx, gy);
              });
            })(x, y);
          }
          button.dataset.x = String(x);
          button.dataset.y = String(y);
          (function (gx, gy) {
            button.addEventListener("pointerenter", function () { if (!buildInteraction.drag || !buildInteraction.drag.active) updateBuildPreview(gx, gy); });
            button.addEventListener("focus", function () { updateBuildPreview(gx, gy); });
          })(x, y);
          ui.buildGrid.appendChild(button);
        }
      }
      ui.buildHint.textContent = installedSelection
        ? (installedSelection.type === "core" ? "Select an installed module to inspect, upgrade or sell it." : "Inspect, upgrade or sell this module. Select the catalog to add another.")
        : canAffordSelected
        ? "Drag " + selected.name + " to the ship, or select a + cell."
        : "Selected for inspection. Earn " + missingMatter + " more Matter to attach " + selected.name + ".";
      ui.buildMatter.textContent = Math.floor(game.matter);
      renderBuildModuleDetails();
      var previewButton = document.getElementById("buildModulePreview");
      var previewTile = selectedBuildTile();
      var previewType = previewTile ? previewTile.type : selectedBuildModule;
      if (previewButton) {
        previewButton.classList.toggle("hidden", previewType === "core");
        previewButton.setAttribute("aria-label", "Preview " + (MODULES[previewType] ? MODULES[previewType].name : "module"));
      }
      renderRunUpgrades();
      updateBuildPreview();
      centerBuildSelection();
      trainingShipState();
      updateTrainingView();
    }

    function openBuild() {
      if (modulePreviewSession) return;
      if (!game || game.state !== "playing" || game.finished) return;
      resetMobileInput();
      game.state = "building";
      if (playtestTelemetry) playtestTelemetry.recordBuild(true, game.elapsed, { matter: game.matter, modules: game.ship.tiles.size });
      if (!moduleAvailable(selectedBuildModule)) selectedBuildModule = "cannon";
      ui.buildOverlay.classList.remove("hidden");
      createCatalog();
      renderBuildGrid();
      updateHud();
      audio.tone(210, .08, .025, "sine", 80);
    }

    function closeBuild() {
      if (modulePreviewSession) return;
      if (!game || game.state !== "building") return;
      if (typeof clearBuildInteraction === "function") clearBuildInteraction();
      requestMobileFullscreen();
      game.state = "playing";
      if (playtestTelemetry) playtestTelemetry.recordBuild(false, game.elapsed, { matter: game.matter, modules: game.ship.tiles.size });
      game.lastFrame = performance.now();
      game.accumulator = 0;
      ui.buildOverlay.classList.add("hidden");
      updateHud();
      audio.tone(300, .06, .02, "sine", 100);
    }

    function syncSettingsUi() {
      ui.resetProgressButton.disabled = Boolean(game && game.training);
      ui.replayOnboardingButton.disabled = Boolean(game && game.training);
      ui.debugToolsToggle.disabled = Boolean(game && game.training);
      ui.debugToolsToggle.checked = DEBUG;
      ui.resetProgressConfirm.classList.add("hidden");
      ui.progressActionStatus.textContent = "";
      ui.volumeSlider.value = Math.round(save.settings.masterVolume * 100);
      ui.volumeValue.textContent = ui.volumeSlider.value + "%";
      ui.shakeSlider.value = Math.round(save.settings.shakeIntensity * 100);
      ui.shakeValue.textContent = ui.shakeSlider.value + "%";
      ui.reducedFlashToggle.checked = save.settings.reducedFlash;
      ui.damageNumbersToggle.checked = save.settings.damageNumbers;
      ui.autoPauseToggle.checked = save.settings.autoPause;
      ui.qualitySelect.value = String(save.settings.qualityTier);
      ui.fpsLimitSelect.value = String(save.settings.fpsLimit);
      ui.uiScaleSelect.value = String(save.settings.uiScale);
      document.documentElement.style.setProperty("--ui-scale", String(save.settings.uiScale / 100));
      document.body.classList.toggle("reduced-flash", save.settings.reducedFlash);
      updateSaveStatus(false);
    }

    function applySettingsFromUi() {
      var previousQualityTier = save.settings.qualityTier;
      save.settings.masterVolume = clamp(Number(ui.volumeSlider.value) / 100, 0, 1);
      save.settings.shakeIntensity = clamp(Number(ui.shakeSlider.value) / 100, 0, 1);
      save.settings.reducedFlash = ui.reducedFlashToggle.checked;
      save.settings.damageNumbers = ui.damageNumbersToggle.checked;
      save.settings.autoPause = ui.autoPauseToggle.checked;
      var requestedQualityTier = Math.round(Number(ui.qualitySelect.value));
      save.settings.qualityTier = [0, 1, 2].indexOf(requestedQualityTier) >= 0 ? requestedQualityTier : 0;
      var requestedFpsLimit = Math.round(Number(ui.fpsLimitSelect.value) || 0);
      save.settings.fpsLimit = [0, 30, 15, 10, 7, 5].indexOf(requestedFpsLimit) >= 0 ? requestedFpsLimit : 0;
      var scale = Number(ui.uiScaleSelect.value);
      save.settings.uiScale = [100, 125, 150].indexOf(scale) >= 0 ? scale : 100;
      document.documentElement.style.setProperty("--ui-scale", String(save.settings.uiScale / 100));
      audio.setVolume(save.settings.masterVolume);
      document.body.classList.toggle("reduced-flash", save.settings.reducedFlash);
      ui.volumeValue.textContent = Math.round(save.settings.masterVolume * 100) + "%";
      ui.shakeValue.textContent = Math.round(save.settings.shakeIntensity * 100) + "%";
      storeSave();
      lastRenderAt = 0;
      if (previousQualityTier !== save.settings.qualityTier) resize();
    }

    var settingsOpenedFromMenu = false;
    var deferredInstallPrompt = null;

    function setDebugTools(enabled) {
      DEBUG = enabled === true;
      ui.debugToolsToggle.checked = DEBUG;
      ui.debugBar.classList.toggle("hidden", !DEBUG || !game || game.finished);
      if (playtestTelemetry && game && !game.finished) playtestTelemetry.event("debug_tools", game.elapsed, { enabled: DEBUG });
    }

    function debugActionAllowed(action, details) {
      if (!DEBUG || !game || game.finished || game.training) return false;
      if (playtestTelemetry) playtestTelemetry.event("debug_action", game.elapsed, Object.assign({ action: action }, details || {}));
      return true;
    }

    function grantDebugMatter(amount) {
      amount = Number(amount);
      if (!Number.isFinite(amount) || amount <= 0 || !debugActionAllowed("grant_matter", { amount: amount })) return;
      game.matter += amount;
      if (game.state === "building") finishBuildChange();
      else updateHud();
    }

    function resetProgress() {
      if (game && game.training) { ui.progressActionStatus.textContent = "Exit training before resetting progress."; return false; }
      var fresh = defaultSave();
      fresh.settings = Object.assign({}, save.settings);
      fresh.updatedAt = Date.now();
      var serialized = JSON.stringify(fresh);
      var storageKeys = [SAVE_KEY, SAVE_BACKUP_KEY, LEGACY_SAVE_KEY];
      var previousValues;
      try {
        previousValues = storageKeys.map(function (key) { return localStorage.getItem(key); });
        localStorage.setItem(SAVE_KEY, serialized);
        localStorage.setItem(SAVE_BACKUP_KEY, serialized);
        localStorage.removeItem(LEGACY_SAVE_KEY);
        if (localStorage.getItem(SAVE_KEY) !== serialized || localStorage.getItem(SAVE_BACKUP_KEY) !== serialized || localStorage.getItem(LEGACY_SAVE_KEY) !== null) throw new Error("Reset verification failed");
      } catch (error) {
        if (previousValues) storageKeys.forEach(function (key, index) {
          try {
            if (previousValues[index] === null) localStorage.removeItem(key);
            else localStorage.setItem(key, previousValues[index]);
          } catch (restoreError) { /* Keep the in-memory profile intact when storage is unavailable. */ }
        });
        ui.progressActionStatus.textContent = "Reset failed: local storage unavailable. Progress kept.";
        return false;
      }
      if (game && !game.finished) {
        if (playtestTelemetry) playtestTelemetry.finishRun({ outcome: "progress_reset", elapsed: game.elapsed, kills: game.kills, matter: game.matter, modules: game.ship.tiles.size, fragments: 0 }, telemetrySample());
        game.finished = true;
      }
      clearBuildInteraction();
      game = null;
      Object.keys(save).forEach(function (key) { delete save[key]; });
      Object.assign(save, fresh);
      selectedStarter = save.lastLoadout.selectedWeapon;
      selectedBuildModule = selectedStarter;
      settingsOpenedFromMenu = false;
      keys = Object.create(null);
      ui.resetProgressConfirm.classList.add("hidden");
      returnToMenu();
      saveStorageStatus = "PROGRESS RESET";
      updateSaveStatus();
      showToast("PROGRESS RESET");
      return true;
    }

    function isInstalledDisplayMode() {
      var standalone = typeof navigator !== "undefined" && navigator.standalone === true;
      var appDisplay = window.matchMedia && (
        window.matchMedia("(display-mode: fullscreen)").matches ||
        window.matchMedia("(display-mode: standalone)").matches
      );
      return Boolean(standalone || appDisplay);
    }

    function syncInstallButton() {
      ui.installButton.classList.toggle("hidden", !deferredInstallPrompt || isInstalledDisplayMode());
    }

    function installFullscreenApp() {
      if (!deferredInstallPrompt) {
        requestMobileFullscreen();
        return;
      }
      var promptEvent = deferredInstallPrompt;
      deferredInstallPrompt = null;
      syncInstallButton();
      promptEvent.prompt();
      if (promptEvent.userChoice && typeof promptEvent.userChoice.catch === "function") {
        promptEvent.userChoice.catch(function () {});
      }
    }

    function setHangarTab(tab) {
      var showArmory = tab === "armory";
      ui.hangarUpgradeTab.classList.toggle("selected", !showArmory);
      ui.hangarWeaponTab.classList.toggle("selected", showArmory);
      ui.hangarUpgradesPanel.classList.toggle("hidden", showArmory);
      ui.hangarWeaponsPanel.classList.toggle("hidden", !showArmory);
    }

    function openHangar(tab) {
      closeModulePreview();
      ui.menu.classList.add("hidden");
      ui.hangarOverlay.classList.remove("hidden");
      setHangarTab(tab || "upgrades");
      renderMetaShop();
      renderStarterPicker();
      renderStarterSelection();
      renderCores();
    }

    function closeHangar() {
      closeModulePreview();
      ui.hangarOverlay.classList.add("hidden");
      ui.menu.classList.remove("hidden");
      renderStarterSelection();
      renderCores();
    }

    function openMenuSettings() {
      settingsOpenedFromMenu = true;
      ui.pauseEyebrow.textContent = "GAME OPTIONS";
      ui.pauseTitle.textContent = "Settings";
      ui.resumeButton.textContent = "Close";
      ui.restartButton.classList.add("hidden");
      ui.pauseHangarButton.classList.add("hidden");
      ui.pauseOverlay.classList.remove("hidden");
      syncSettingsUi();
    }

    function openPause(reason) {
      if (modulePreviewSession) return;
      if (!game || game.state !== "playing" || game.finished) return;
      resetMobileInput();
      settingsOpenedFromMenu = false;
      game.state = "paused";
      if (playtestTelemetry) playtestTelemetry.recordPause(true, game.elapsed, reason || "manual");
      keys = Object.create(null);
      ui.pauseEyebrow.textContent = reason || "COMBAT SUSPENDED";
      ui.pauseTitle.textContent = "Paused";
      ui.resumeButton.textContent = "Resume [P]";
      ui.pauseHangarButton.textContent = game.training ? "Exit training" : "End run & bank";
      ui.restartButton.classList.toggle("hidden", !game.training);
      ui.pauseHangarButton.classList.remove("hidden");
      ui.pauseOverlay.classList.remove("hidden");
      syncSettingsUi();
      audio.tone(190, .07, .02, "sine", -45);
      if (game.training) updateTrainingView();
    }

    function closePause() {
      if (modulePreviewSession) return;
      if (settingsOpenedFromMenu) {
        settingsOpenedFromMenu = false;
        ui.pauseOverlay.classList.add("hidden");
        ui.restartButton.classList.add("hidden");
        ui.pauseHangarButton.classList.remove("hidden");
        return;
      }
      if (!game || game.state !== "paused") return;
      if (game.training && trainingSession && trainingSession.failed) return;
      requestMobileFullscreen();
      game.state = "playing";
      if (playtestTelemetry) playtestTelemetry.recordPause(false, game.elapsed);
      game.lastFrame = performance.now();
      game.accumulator = 0;
      ui.pauseOverlay.classList.add("hidden");
      audio.tone(290, .06, .02, "sine", 90);
      updateTrainingView();
    }

    function requestRestart() {
      if (game && game.training && trainingSession) trainingSession.controller.retry();
    }

    function requestMobileFullscreen() {
      if (!window.matchMedia || !window.matchMedia("(hover: none) and (pointer: coarse)").matches) return;
      if (document.fullscreenElement || document.webkitFullscreenElement) return;
      var root = document.documentElement;
      if (!root) return;
      var request = root.requestFullscreen || root.webkitRequestFullscreen;
      if (typeof request !== "function") return;
      try {
        var pending = root.requestFullscreen
          ? request.call(root, { navigationUI: "hide" })
          : request.call(root);
        if (pending && typeof pending.catch === "function") pending.catch(function () {});
      } catch (error) {
        // Fullscreen is optional when the browser or embedding page rejects it.
      }
    }

    function startRun() {
      closeModulePreview();
      if (game && game.training) { leaveTraining(); return; }
      if (typeof clearBuildInteraction === "function") clearBuildInteraction();
      requestMobileFullscreen();
      audio.ensure();
      resetMobileInput();
      if (game && !game.finished) game.finishRun(false, true);
      game = new Game();
      selectedBuildModule = selectedStarter;
      syncLoadoutToSave();
      resetTelemetryFpsWindow();
      if (playtestTelemetry) {
        playtestTelemetry.beginRun({
          starterWeapon: selectedStarter,
          mode: "survival",
          targetSeconds: SURVIVAL_DURATION,
          coreId: game.coreDef.id,
          modulesLost: game.modulesLost,
          metaLevels: save.meta,
          fragments: save.fragments,
          fragmentCarryUnits: save.fragmentCarryUnits,
          purchasedModules: save.progression.purchasedModules,
          purchasedCores: save.campaign.purchasedCores,
          debugTools: DEBUG,
          settings: save.settings,
          initialModules: game.ship.tiles.size
        }, telemetrySample());
      }
      ui.menu.classList.add("hidden");
      ui.hangarOverlay.classList.add("hidden");
      ui.milestoneOverlay.classList.add("hidden");
      ui.resultOverlay.classList.add("hidden");
      ui.buildOverlay.classList.add("hidden");
      ui.pauseOverlay.classList.add("hidden");
      ui.hud.classList.remove("hidden");
      ui.bossHud.classList.add("hidden");
      if (DEBUG) ui.debugBar.classList.remove("hidden");
      updateTelemetryStatus();
      updateHud();
    }

    function returnToMenu() {
      closeModulePreview();
      if (game && game.training) { leaveTraining(); return; }
      resetMobileInput();
      if (game && !game.finished) game.finishRun(false, true);
      game = null;
      ui.milestoneOverlay.classList.add("hidden");
      ui.resultOverlay.classList.add("hidden");
      ui.buildOverlay.classList.add("hidden");
      ui.pauseOverlay.classList.add("hidden");
      ui.hud.classList.add("hidden");
      ui.debugBar.classList.add("hidden");
      ui.bossHud.classList.add("hidden");
      ui.hangarOverlay.classList.add("hidden");
      ui.menu.classList.remove("hidden");
      renderMetaShop();
      renderStarterPicker();
      renderStarterSelection();
      renderCores();
      updateTelemetryStatus();
    }

    function exitToHangar() {
      closeModulePreview();
      if (game && game.training) { leaveTraining(); return; }
      if (game && !game.finished) {
        ui.pauseOverlay.classList.add("hidden");
        ui.buildOverlay.classList.add("hidden");
        game.finishRun(false, true);
        return;
      }
      returnToMenu();
      openHangar("armory");
    }

    function updateHud() {
      if (!game) return;
      ui.survivalHud.classList.toggle("hidden", game.finished);
      ui.survivalProgress.textContent = game.survivalCompleted ? (game.continued ? "EXTENDED SURVIVAL" : "SURVIVAL COMPLETE") :
        (game.elapsed >= SURVIVAL_DURATION ? "Defeat the final boss" : "SURVIVAL · " + formatTime(Math.max(0, SURVIVAL_DURATION - game.elapsed)) + " to 10 min");
      ui.bankRunButton.classList.toggle("hidden", !game.continued || game.finished);
      var core = game.ship.tiles.get("0,0");
      ui.hudMatter.textContent = Math.floor(game.matter);
      ui.hudKills.textContent = game.kills;
      ui.hudTime.textContent = formatTime(game.elapsed);
      ui.hudModules.textContent = game.ship.tiles.size;
      ui.hudBossProgress.textContent = game.bossSpawned ? "BOSS " + (game.bossesDefeated + 1) :
        (Number.isFinite(game.nextBossAt) ? "BOSS " + (game.bossesDefeated + 1) + " IN " + formatTime(Math.max(0, game.nextBossAt - game.elapsed)) : "HOLD UNTIL 10:00");
      if (core) {
        var healthRatio = core.hp / core.maxHp;
        ui.hudHpText.textContent = Math.ceil(core.hp) + " / " + Math.ceil(core.maxHp);
        ui.healthFill.style.width = clamp(healthRatio * 100, 0, 100) + "%";
        ui.hud.classList.toggle("core-danger", healthRatio <= .5);
        ui.hud.classList.toggle("core-critical", healthRatio <= .25);
      }
      if (game.boss && !game.boss.dead) {
        ui.bossName.textContent = game.boss.displayName || "Siege Ring";
        ui.bossFill.style.width = clamp(game.boss.hp / game.boss.maxHp * 100, 0, 100) + "%";
      }
      ui.muteButton.textContent = audio.muted ? "MUTED" : "SOUND";
      updateTrainingView();
    }

    var screenPointA = { x: 0, y: 0 };
    var screenPointB = { x: 0, y: 0 };
    function worldToScreen(x, y, output) {
      var cameraX = game ? game.camera.x + game.camera.shakeX : 0;
      var cameraY = game ? game.camera.y + game.camera.shakeY : 0;
      output = output || screenPointA;
      output.x = x - cameraX + viewWidth / 2;
      output.y = y - cameraY + viewHeight / 2;
      if (game && game.training) output.y += Math.min(90, viewHeight * .14);
      return output;
    }

    function isScreenVisibleAtZoom(pos, margin) {
      var zoom = game && game.camera ? game.camera.zoom : 1;
      var transformedX = viewWidth / 2 + (pos.x - viewWidth / 2) * zoom;
      var transformedY = viewHeight / 2 + (pos.y - viewHeight / 2) * zoom;
      return transformedX >= -margin && transformedX <= viewWidth + margin && transformedY >= -margin && transformedY <= viewHeight + margin;
    }

    function drawBackground(time) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = game && game.training ? "#081b1d" : backgroundGradient;
      ctx.fillRect(0, 0, viewWidth, viewHeight);
      var cameraX = game ? game.camera.x : Math.sin(time * .00008) * 120;
      var cameraY = game ? game.camera.y : Math.cos(time * .00006) * 90;
      for (var i = 0; i < stars.length; i += 1) {
        var star = stars[i];
        var sx = (star.x - cameraX * star.depth * .08) % viewWidth;
        var sy = (star.y - cameraY * star.depth * .08) % viewHeight;
        if (sx < 0) sx += viewWidth;
        if (sy < 0) sy += viewHeight;
        ctx.globalAlpha = star.alpha;
        ctx.fillStyle = i % 7 === 0 ? "#65e8ff" : "#b9d8e6";
        ctx.fillRect(sx, sy, star.size, star.size);
      }
      ctx.globalAlpha = 1;
      var grid = 84;
      var offsetX = ((-cameraX * .22) % grid + grid) % grid;
      var offsetY = ((-cameraY * .22) % grid + grid) % grid;
      ctx.strokeStyle = "rgba(101,232,255,.045)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var x = offsetX; x < viewWidth; x += grid) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, viewHeight);
      }
      for (var y = offsetY; y < viewHeight; y += grid) {
        ctx.moveTo(0, y);
        ctx.lineTo(viewWidth, y);
      }
      ctx.stroke();
    }

    function polygonPath(context, x, y, radius, sides, rotation) {
      context.beginPath();
      for (var i = 0; i < sides; i += 1) {
        var angle = rotation + i / sides * TAU;
        var px = x + Math.cos(angle) * radius;
        var py = y + Math.sin(angle) * radius;
        if (i === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      }
      context.closePath();
    }

    function enemyPath(context, enemy, x, y, radiusMultiplier) {
      var radius = enemy.radius * (radiusMultiplier || 1);
      if (enemy.sides === 0 || enemy.sides >= 18) {
        context.beginPath();
        context.arc(x, y, radius, 0, TAU);
      } else {
        polygonPath(context, x, y, radius, enemy.sides, enemy.rotation);
      }
    }

    var enemySpriteCache = Object.create(null);

    function drawEnemySpriteDetails(context, type, x, y, radius, rotation) {
      context.globalAlpha = .9;
      context.lineWidth = 1.5;
      if (type === "drone" || type === "brute" || type === "colossus") {
        context.beginPath();
        context.arc(x, y, radius * .46, 0, TAU);
        context.stroke();
      } else if (type === "hunter" || type === "raptor") {
        polygonPath(context, x, y, radius * .5, 3, rotation);
        context.stroke();
      } else if (type === "orbiter") {
        context.beginPath();
        context.moveTo(x - radius * .5, y + radius * .42);
        context.lineTo(x + radius * .5, y - radius * .42);
        context.stroke();
      } else if (type === "bulwark") {
        polygonPath(context, x, y, radius * .48, 6, -rotation);
        context.stroke();
      } else if (type === "bomber" || type === "gunner" || type === "sniper") {
        context.beginPath();
        context.moveTo(x - radius * .52, y);
        context.lineTo(x + radius * .52, y);
        context.moveTo(x, y - radius * .52);
        context.lineTo(x, y + radius * .52);
        context.stroke();
      } else if (type === "bolter" || type === "splitter") {
        context.beginPath();
        context.moveTo(x - radius * .52, y);
        context.lineTo(x + radius * .52, y);
        context.stroke();
      }
    }

    function buildEnemySpriteCache() {
      enemySpriteCache = Object.create(null);
      Object.keys(ENEMY_DEFS).forEach(function (type) {
        var def = ENEMY_DEFS[type];
        var frameCount = def.sides === 3 ? 16 : (def.sides > 0 && def.sides < 18 ? 8 : 1);
        var displaySize = Math.ceil((def.radius + 10) * 2);
        var frames = [];
        for (var frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
          var sprite = document.createElement("canvas");
          sprite.width = Math.ceil(displaySize * dpr);
          sprite.height = Math.ceil(displaySize * dpr);
          var spriteContext = sprite.getContext("2d", { alpha: true });
          spriteContext.setTransform(dpr, 0, 0, dpr, 0, 0);
          var center = displaySize * .5;
          var rotation = frameIndex / frameCount * TAU;
          var spriteEnemy = { radius: def.radius, sides: def.sides, rotation: rotation };
          spriteContext.strokeStyle = def.color;
          spriteContext.fillStyle = def.color;
          spriteContext.globalAlpha = .12;
          enemyPath(spriteContext, spriteEnemy, center, center, 1);
          spriteContext.fill();
          spriteContext.globalAlpha = .24;
          spriteContext.lineWidth = 5;
          spriteContext.stroke();
          spriteContext.globalAlpha = 1;
          spriteContext.lineWidth = 2;
          enemyPath(spriteContext, spriteEnemy, center, center, 1);
          spriteContext.stroke();
          drawEnemySpriteDetails(spriteContext, type, center, center, def.radius, rotation);
          frames.push(sprite);
        }
        enemySpriteCache[type] = { frames: frames, size: displaySize, half: displaySize * .5 };
      });
    }

    function cachedEnemySprite(enemy) {
      var cached = enemySpriteCache[enemy.type];
      if (!cached) return null;
      var frameCount = cached.frames.length;
      if (frameCount === 1) return cached.frames[0];
      var normalizedRotation = ((enemy.rotation % TAU) + TAU) % TAU;
      var frameIndex = Math.round(normalizedRotation / TAU * frameCount) % frameCount;
      return cached.frames[frameIndex];
    }

    function drawBossAttackTelegraph(enemy, pos, progress) {
      ctx.strokeStyle = SHOT_COLORS.hostile;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, enemy.radius + 18 - progress * 13, 0, TAU);
      ctx.stroke();
      if (enemy.attackPattern === "charge") {
        var endX = pos.x + enemy.chargeAimX * 288;
        var endY = pos.y + enemy.chargeAimY * 288;
        var sideX = -enemy.chargeAimY * (enemy.radius + 6);
        var sideY = enemy.chargeAimX * (enemy.radius + 6);
        ctx.beginPath();
        ctx.moveTo(pos.x + sideX, pos.y + sideY);
        ctx.lineTo(endX + sideX, endY + sideY);
        ctx.lineTo(endX - sideX, endY - sideY);
        ctx.lineTo(pos.x - sideX, pos.y - sideY);
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = SHOT_COLORS.hostile;
        ctx.globalAlpha *= .16;
        ctx.fill();
        return;
      }
      if (enemy.attackPattern === "aimed") {
        var aim = Math.atan2(enemy.lockedAimY, enemy.lockedAimX);
        ctx.setLineDash([10, 8]);
        for (var shot = 0; shot < enemy.fanShotCount; shot += 1) {
          var angle = aim + (shot - (enemy.fanShotCount - 1) / 2) * enemy.fanSpread;
          ctx.beginPath();
          ctx.moveTo(pos.x + Math.cos(angle) * enemy.radius, pos.y + Math.sin(angle) * enemy.radius);
          ctx.lineTo(pos.x + Math.cos(angle) * 560, pos.y + Math.sin(angle) * 560);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        return;
      }
      for (var spoke = 0; spoke < enemy.shotCount; spoke += 1) {
        if (enemy.variant === "storm" && (spoke <= 1 || spoke === enemy.shotCount - 1)) continue;
        var spokeAngle = enemy.volleyAngle + spoke / enemy.shotCount * TAU;
        ctx.beginPath();
        ctx.moveTo(pos.x + Math.cos(spokeAngle) * (enemy.radius + 4), pos.y + Math.sin(spokeAngle) * (enemy.radius + 4));
        ctx.lineTo(pos.x + Math.cos(spokeAngle) * (enemy.radius + 38), pos.y + Math.sin(spokeAngle) * (enemy.radius + 38));
        ctx.stroke();
      }
    }

    function drawGravityFields() {
      if (!game || !game.gravityFields.length) return;
      ctx.save();
      ctx.lineWidth = 1.5;
      for (var i = 0; i < game.gravityFields.length; i += 1) {
        var field = game.gravityFields[i];
        var pos = worldToScreen(field.x, field.y);
        if (!isScreenVisibleAtZoom(pos, field.radius)) continue;
        ctx.strokeStyle = field.color;
        ctx.fillStyle = field.color;
        ctx.globalAlpha = .06;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, field.radius, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = .55;
        ctx.stroke();
        var phase = (field.maxLife - field.life) * 1.6;
        for (var ring = 0; ring < 2; ring += 1) {
          var inward = 1 - (phase + ring * .5) % 1;
          ctx.globalAlpha = .18 + inward * .3;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 8 + (field.radius - 8) * inward, 0, TAU);
          ctx.stroke();
        }
        ctx.globalAlpha = .9;
        polygonPath(ctx, pos.x, pos.y, 7, 4, Math.PI / 4 + phase);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawEnemies() {
      if (!game) return;
      var qualityTier = currentQualityTier();
      var simplifiedEffects = qualityTier > 0;
      var minimalGeometry = qualityTier > 1;
      for (var i = 0; i < game.enemies.length; i += 1) {
        var enemy = game.enemies[i];
        if (enemy.dead) continue;
        var pos = worldToScreen(enemy.x, enemy.y);
        if (!isScreenVisibleAtZoom(pos, enemy.type === "boss" ? 420 : 120)) continue;
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        if (enemy.burnTimer > 0) {
          ctx.strokeStyle = MODULES.ember.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (var spark = -1; spark <= 1; spark += 1) {
            var sparkX = pos.x + spark * 6;
            var sparkY = pos.y - enemy.radius - 5;
            ctx.moveTo(sparkX - 2, sparkY);
            ctx.lineTo(sparkX, sparkY - 5 - Math.sin(game.elapsed * 12 + spark) * 2);
          }
          ctx.stroke();
        }
        if (enemy.attackCharge > 0 && enemy.attackChargeMax > 0) {
          var chargeProgress = 1 - enemy.attackCharge / enemy.attackChargeMax;
          ctx.globalAlpha = .25 + chargeProgress * .65;
          ctx.strokeStyle = SHOT_COLORS.hostile;
          ctx.shadowBlur = 0;
          ctx.lineWidth = enemy.type === "sniper" ? 1.5 : 2;
          if (enemy.type === "boss") {
            drawBossAttackTelegraph(enemy, pos, chargeProgress);
          } else {
            var telegraphLength = enemy.type === "sniper" ? 700 : 520;
            ctx.setLineDash(enemy.type === "sniper" ? [14, 8] : [5, 8]);
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            ctx.lineTo(pos.x + enemy.lockedAimX * telegraphLength, pos.y + enemy.lockedAimY * telegraphLength);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, enemy.radius + 12 - chargeProgress * 8, 0, TAU);
            ctx.stroke();
            if (enemy.type === "sniper") {
              ctx.save();
              ctx.font = "700 10px ui-monospace, monospace";
              ctx.textAlign = "center";
              ctx.textBaseline = "bottom";
              ctx.fillStyle = SHOT_COLORS.hostileCore;
              ctx.fillText("PIERCING", pos.x, pos.y - enemy.radius - 14);
              ctx.restore();
            }
          }
          ctx.globalAlpha = 1;
        }
        if (enemy.type !== "boss") {
          var cachedSprite = cachedEnemySprite(enemy);
          if (cachedSprite) {
            var cachedGeometry = enemySpriteCache[enemy.type];
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
            ctx.drawImage(cachedSprite, Math.round(pos.x - cachedGeometry.half), Math.round(pos.y - cachedGeometry.half), cachedGeometry.size, cachedGeometry.size);
            if (enemy.hitFlash > 0) {
              ctx.globalAlpha = clamp(enemy.hitFlash / .1, 0, 1);
              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 2;
              enemyPath(ctx, enemy, pos.x, pos.y, 1);
              ctx.stroke();
            }
            if (enemy.shield > 0) {
              ctx.globalAlpha = .45 + enemy.shield / enemy.maxShield * .35;
              ctx.strokeStyle = "#c5b8ff";
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(pos.x, pos.y, enemy.radius + 7, 0, TAU);
              ctx.stroke();
            }
            if (enemy.slowFactor < 1) {
              ctx.strokeStyle = "#8ac7ff";
              ctx.globalAlpha = .7;
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(pos.x, pos.y, enemy.radius + 5, -Math.PI * .5, Math.PI * .85);
              ctx.stroke();
            }
            continue;
          }
        }
        ctx.shadowBlur = simplifiedEffects ? 0 : (enemy.type === "boss" ? 16 : 0);
        ctx.shadowColor = enemy.color;
        ctx.strokeStyle = enemy.color;
        ctx.fillStyle = enemy.color;
        ctx.globalAlpha = enemy.type === "boss" ? .10 : .12;
        enemyPath(ctx, enemy, pos.x, pos.y, 1);
        ctx.fill();
        if (!minimalGeometry || enemy.type === "boss") {
          ctx.globalAlpha = enemy.type === "boss" ? .42 : .22;
          ctx.lineWidth = enemy.type === "boss" ? 8 : 6;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.lineWidth = enemy.type === "boss" ? 3 : 2;
        ctx.strokeStyle = enemy.hitFlash > 0 ? "#ffffff" : enemy.color;
        enemyPath(ctx, enemy, pos.x, pos.y, 1);
        ctx.stroke();
        if (enemy.type === "boss") {
          polygonPath(ctx, pos.x, pos.y, enemy.radius * .62, 6, -enemy.rotation * 1.3);
          ctx.strokeStyle = "#ffd96a";
          ctx.stroke();
          for (var n = 0; n < 6; n += 1) {
            var a = enemy.rotation + n / 6 * TAU;
            ctx.fillStyle = "#ffd96a";
            ctx.beginPath();
            ctx.arc(pos.x + Math.cos(a) * enemy.radius * .8, pos.y + Math.sin(a) * enemy.radius * .8, 3, 0, TAU);
            ctx.fill();
          }
        } else if (minimalGeometry) {
          // Color and silhouette remain readable while secondary decoration is skipped.
        } else if (enemy.type === "drone") {
          ctx.globalAlpha = .95;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, enemy.radius * .48, 0, TAU);
          ctx.stroke();
        } else if (enemy.type === "raptor") {
          ctx.globalAlpha = .95;
          ctx.lineWidth = 2;
          polygonPath(ctx, pos.x, pos.y, enemy.radius * .52, 3, enemy.rotation);
          ctx.stroke();
          var raptorBackX = -Math.cos(enemy.rotation);
          var raptorBackY = -Math.sin(enemy.rotation);
          var raptorSideX = -raptorBackY;
          var raptorSideY = raptorBackX;
          ctx.globalAlpha = .42;
          ctx.lineWidth = 3;
          for (var trailSide = -1; trailSide <= 1; trailSide += 2) {
            ctx.beginPath();
            ctx.moveTo(pos.x + raptorBackX * 11 + raptorSideX * trailSide * 4, pos.y + raptorBackY * 11 + raptorSideY * trailSide * 4);
            ctx.lineTo(pos.x + raptorBackX * 34 + raptorSideX * trailSide * 7, pos.y + raptorBackY * 34 + raptorSideY * trailSide * 7);
            ctx.stroke();
          }
          ctx.globalAlpha = .95;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(pos.x - Math.cos(enemy.rotation) * 8, pos.y - Math.sin(enemy.rotation) * 8);
          ctx.lineTo(pos.x - Math.cos(enemy.rotation) * 25, pos.y - Math.sin(enemy.rotation) * 25);
          ctx.stroke();
        } else if (enemy.type === "orbiter") {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, enemy.radius * .48, -Math.PI * .7, Math.PI * .7);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(pos.x - 8, pos.y + 7);
          ctx.lineTo(pos.x + 8, pos.y - 7);
          ctx.stroke();
        } else if (enemy.type === "bulwark") {
          if (enemy.shield > 0) {
            ctx.globalAlpha = .45 + enemy.shield / enemy.maxShield * .35;
            ctx.strokeStyle = "#c5b8ff";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, enemy.radius + 7, 0, TAU);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
          polygonPath(ctx, pos.x, pos.y, enemy.radius * .48, 6, -enemy.rotation);
          ctx.stroke();
        } else if (enemy.type === "bomber") {
          var pulse = 3.5 + Math.sin(enemy.age * 8 + enemy.phaseOffset) * 1.5;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, pulse, 0, TAU);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(pos.x - 9, pos.y);
          ctx.lineTo(pos.x + 9, pos.y);
          ctx.moveTo(pos.x, pos.y - 9);
          ctx.lineTo(pos.x, pos.y + 9);
          ctx.stroke();
        } else if (enemy.type === "bolter") {
          ctx.beginPath();
          ctx.moveTo(pos.x - 7, pos.y);
          ctx.lineTo(pos.x + 7, pos.y);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 2.5, 0, TAU);
          ctx.fill();
        } else if (enemy.type === "gunner" || enemy.type === "sniper") {
          ctx.beginPath();
          ctx.moveTo(pos.x - 8, pos.y);
          ctx.lineTo(pos.x + 8, pos.y);
          ctx.moveTo(pos.x, pos.y - 8);
          ctx.lineTo(pos.x, pos.y + 8);
          ctx.stroke();
        } else if (enemy.type === "splitter") {
          ctx.beginPath();
          ctx.moveTo(pos.x - 7, pos.y);
          ctx.lineTo(pos.x + 7, pos.y);
          ctx.stroke();
        } else if (enemy.type === "brute" || enemy.type === "colossus") {
          ctx.globalAlpha = .65;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, enemy.radius * .48, 0, TAU);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        if (enemy.slowFactor < 1) {
          ctx.strokeStyle = "#8ac7ff";
          ctx.globalAlpha = .7;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, enemy.radius + 5, -Math.PI * .5, Math.PI * .85);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        ctx.shadowBlur = 0;
        if (enemy.type === "boss") {
          var width = 100;
          ctx.fillStyle = "rgba(0,0,0,.55)";
          ctx.fillRect(pos.x - width / 2, pos.y + enemy.radius + 8, width, 3);
          ctx.fillStyle = enemy.color;
          ctx.fillRect(pos.x - width / 2, pos.y + enemy.radius + 8, width * clamp(enemy.hp / enemy.maxHp, 0, 1), 3);
        }
      }
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
    }

    function drawModuleGlyph(tile, x, y, targetContext) {
      var glyphContext = targetContext || ctx;
      if (tile.type === "core") {
        glyphContext.save();
        glyphContext.translate(x, y);
        glyphContext.beginPath();
        glyphContext.moveTo(0, -13);
        glyphContext.lineTo(9, 1);
        glyphContext.lineTo(4, -1);
        glyphContext.lineTo(4, 9);
        glyphContext.lineTo(-4, 9);
        glyphContext.lineTo(-4, -1);
        glyphContext.lineTo(-9, 1);
        glyphContext.closePath();
        glyphContext.stroke();
        glyphContext.fillStyle = "rgba(255,255,255,.16)";
        glyphContext.fill();
        glyphContext.fillStyle = "#ff8ee8";
        glyphContext.fillRect(-6, 11, 12, 2);
        glyphContext.restore();
        return;
      }
      var def = MODULES[tile.type];
      glyphContext.strokeStyle = def.color;
      glyphContext.fillStyle = def.color;
      glyphContext.lineWidth = 2;
      if (tile.type === "armor") {
        glyphContext.beginPath();
        glyphContext.moveTo(x - 9, y - 9);
        glyphContext.lineTo(x + 9, y + 9);
        glyphContext.moveTo(x + 9, y - 9);
        glyphContext.lineTo(x - 9, y + 9);
        glyphContext.stroke();
      } else if (tile.type === "shield") {
        glyphContext.beginPath();
        glyphContext.arc(x, y, 10, Math.PI * .12, Math.PI * .88);
        glyphContext.arc(x, y, 6, Math.PI * .12, Math.PI * .88);
        glyphContext.stroke();
      } else if (tile.type === "drive") {
        glyphContext.beginPath();
        glyphContext.moveTo(x - 8, y + 7);
        glyphContext.lineTo(x, y - 8);
        glyphContext.lineTo(x + 8, y + 7);
        glyphContext.moveTo(x - 5, y + 10);
        glyphContext.lineTo(x, y + 3);
        glyphContext.lineTo(x + 5, y + 10);
        glyphContext.stroke();
      } else if (tile.type === "repair") {
        glyphContext.fillRect(x - 3, y - 10, 6, 20);
        glyphContext.fillRect(x - 10, y - 3, 20, 6);
      } else if (tile.type === "reactor") {
        polygonPath(glyphContext, x, y, 10, 6, Math.PI / 6);
        glyphContext.stroke();
        glyphContext.beginPath();
        glyphContext.arc(x, y, 3, 0, TAU);
        glyphContext.fill();
      } else if (tile.type === "collector") {
        glyphContext.beginPath();
        glyphContext.arc(x, y - 2, 9, Math.PI, 0);
        glyphContext.lineTo(x + 4, y + 8);
        glyphContext.lineTo(x - 4, y + 8);
        glyphContext.closePath();
        glyphContext.stroke();
      } else if (tile.type === "bulkhead") {
        glyphContext.strokeRect(x - 10, y - 9, 20, 18);
        glyphContext.beginPath();
        glyphContext.moveTo(x - 4, y - 9);
        glyphContext.lineTo(x - 4, y + 9);
        glyphContext.moveTo(x + 4, y - 9);
        glyphContext.lineTo(x + 4, y + 9);
        glyphContext.stroke();
      } else {
        glyphContext.save();
        glyphContext.translate(x, y);
        glyphContext.rotate(tile.aim);
        if (tile.type === "cannon") {
          glyphContext.strokeRect(-7, -7, 14, 14);
          glyphContext.fillRect(3, -2, 13, 4);
        } else if (tile.type === "laser") {
          glyphContext.beginPath();
          glyphContext.moveTo(-8, -7);
          glyphContext.lineTo(8, 0);
          glyphContext.lineTo(-8, 7);
          glyphContext.stroke();
        } else if (tile.type === "missile") {
          glyphContext.beginPath();
          glyphContext.moveTo(12, 0);
          glyphContext.lineTo(-7, -7);
          glyphContext.lineTo(-3, 0);
          glyphContext.lineTo(-7, 7);
          glyphContext.closePath();
          glyphContext.stroke();
        } else if (tile.type === "scatter") {
          glyphContext.beginPath();
          glyphContext.moveTo(12, 0);
          glyphContext.lineTo(-7, -9);
          glyphContext.moveTo(12, 0);
          glyphContext.lineTo(-7, 0);
          glyphContext.moveTo(12, 0);
          glyphContext.lineTo(-7, 9);
          glyphContext.stroke();
        } else if (tile.type === "arc") {
          glyphContext.beginPath();
          glyphContext.moveTo(-9, -8);
          glyphContext.lineTo(2, -2);
          glyphContext.lineTo(-2, 2);
          glyphContext.lineTo(9, 8);
          glyphContext.stroke();
        } else if (tile.type === "rail") {
          glyphContext.strokeRect(-9, -5, 14, 10);
          glyphContext.fillRect(1, -1.5, 16, 3);
        } else if (tile.type === "flak") {
          glyphContext.strokeRect(-8, -7, 12, 14);
          glyphContext.fillRect(2, -5, 14, 3);
          glyphContext.fillRect(2, 2, 14, 3);
        } else if (tile.type === "pulse") {
          glyphContext.beginPath();
          glyphContext.arc(0, 0, 5, 0, TAU);
          glyphContext.arc(0, 0, 10, 0, TAU);
          glyphContext.stroke();
        } else if (tile.type === "cryo") {
          glyphContext.beginPath();
          for (var spoke = 0; spoke < 3; spoke += 1) {
            var spokeAngle = spoke * Math.PI / 3;
            glyphContext.moveTo(Math.cos(spokeAngle) * -10, Math.sin(spokeAngle) * -10);
            glyphContext.lineTo(Math.cos(spokeAngle) * 14, Math.sin(spokeAngle) * 14);
          }
          glyphContext.stroke();
        } else if (tile.type === "mine") {
          glyphContext.beginPath();
          glyphContext.arc(2, 0, 7, 0, TAU);
          glyphContext.moveTo(9, 0);
          glyphContext.lineTo(16, 0);
          glyphContext.moveTo(2, -7);
          glyphContext.lineTo(2, -12);
          glyphContext.moveTo(2, 7);
          glyphContext.lineTo(2, 12);
          glyphContext.stroke();
        } else if (tile.type === "ember") {
          glyphContext.strokeRect(-9, -6, 10, 12);
          glyphContext.beginPath();
          glyphContext.moveTo(2, -4); glyphContext.lineTo(13, -9);
          glyphContext.moveTo(2, 0); glyphContext.lineTo(16, 0);
          glyphContext.moveTo(2, 4); glyphContext.lineTo(13, 9);
          glyphContext.stroke();
        } else if (tile.type === "gravity") {
          glyphContext.beginPath();
          glyphContext.arc(-2, 0, 9, 0, TAU);
          glyphContext.arc(-2, 0, 3, 0, TAU);
          glyphContext.moveTo(7, 0); glyphContext.lineTo(16, 0);
          glyphContext.moveTo(11, -5); glyphContext.lineTo(16, 0); glyphContext.lineTo(11, 5);
          glyphContext.stroke();
        }
        glyphContext.restore();
      }
    }

    function drawShip() {
      if (!game) return;
      var simplifiedEffects = currentQualityTier() > 0;
      var shipScreen = worldToScreen(game.ship.x, game.ship.y);
      ctx.save();
      ctx.translate(shipScreen.x, shipScreen.y);
      ctx.rotate(game.ship.angle);
      game.ship.tiles.forEach(function (tile) {
        if (tile.type !== "shield") return;
        var offline = tile.shield <= 0;
        ctx.setLineDash(offline ? [5, 6] : []);
        var alpha = .05 + tile.shield / tile.maxShield * .08;
        ctx.strokeStyle = "rgba(112,255,194," + (.32 + alpha) + ")";
        ctx.fillStyle = "rgba(112,255,194," + alpha + ")";
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 0;
        ctx.shadowColor = "#70ffc2";
        ctx.beginPath();
        ctx.arc(tile.x * TILE_SIZE, tile.y * TILE_SIZE, MODULES.shield.shieldRadius * TILE_SIZE, 0, TAU);
        if (!offline) ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
      });
      game.ship.tiles.forEach(function (tile) {
        var x = tile.x * TILE_SIZE;
        var y = tile.y * TILE_SIZE;
        var color = tile.type === "core" ? CORE_COLORS[game.coreDef.id] : MODULES[tile.type].color;
        var damageGlow = clamp(tile.flash / .42, 0, 1);
        var damageAlpha = damageGlow * (save.settings.reducedFlash ? .24 : .46);
        ctx.shadowBlur = simplifiedEffects ? 0 : (tile.flash > 0 ? 12 : (tile.type === "core" ? 8 : 0));
        ctx.shadowColor = tile.flash > 0 ? "#ff3f5f" : color;
        ctx.fillStyle = tile.flash > 0 ? "rgba(255,40,72," + damageAlpha + ")" : "rgba(21,64,89,.34)";
        ctx.strokeStyle = tile.flash > 0 ? "#ff8799" : color;
        ctx.lineWidth = tile.type === "core" ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.roundRect(x - TILE_SIZE * .46, y - TILE_SIZE * .46, TILE_SIZE * .92, TILE_SIZE * .92, 5);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        drawModuleGlyph(tile, x, tile.type === "shield" ? y - 4 : y);
        if (tile.type === "shield") {
          // Keep charge inside its own tile so adjacent hull and field fills cannot cover it.
          ctx.fillStyle = "#11252e";
          ctx.fillRect(x - 16, y + 9, 32, 5);
          ctx.strokeStyle = tile.shield <= 0 ? "#ffb15c" : "#70ffc2";
          ctx.lineWidth = 1;
          ctx.strokeRect(x - 16, y + 9, 32, 5);
          ctx.fillStyle = "#70ffc2";
          ctx.fillRect(x - 15, y + 10, 30 * clamp(tile.shield / tile.maxShield, 0, 1), 3);
        }
        if (tile.hp < tile.maxHp) {
          ctx.fillStyle = "rgba(0,0,0,.7)";
          ctx.fillRect(x - 15, y + 15, 30, 2);
          ctx.fillStyle = tile.hp / tile.maxHp < .35 ? "#ff637c" : "#70ffc2";
          ctx.fillRect(x - 15, y + 15, 30 * clamp(tile.hp / tile.maxHp, 0, 1), 2);
        }
      });
      ctx.restore();
    }

    var projectileCircleBatches = Object.create(null);
    var projectileCircleBatchKeys = [];

    function queueProjectileCircle(color, x, y, radius) {
      var batch = projectileCircleBatches[color];
      if (!batch) {
        batch = [];
        projectileCircleBatches[color] = batch;
      }
      if (batch.length === 0) projectileCircleBatchKeys.push(color);
      batch.push(Math.round(x), Math.round(y), radius);
    }

    function resetProjectileCircleBatches() {
      for (var i = 0; i < projectileCircleBatchKeys.length; i += 1) {
        projectileCircleBatches[projectileCircleBatchKeys[i]].length = 0;
      }
      projectileCircleBatchKeys.length = 0;
    }

    function drawProjectileCircleBatches() {
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      for (var batchIndex = 0; batchIndex < projectileCircleBatchKeys.length; batchIndex += 1) {
        var color = projectileCircleBatchKeys[batchIndex];
        var batch = projectileCircleBatches[color];
        ctx.fillStyle = color;
        ctx.beginPath();
        for (var pointIndex = 0; pointIndex < batch.length; pointIndex += 3) {
          ctx.moveTo(batch[pointIndex] + batch[pointIndex + 2], batch[pointIndex + 1]);
          ctx.arc(batch[pointIndex], batch[pointIndex + 1], batch[pointIndex + 2], 0, TAU);
        }
        ctx.fill();
      }
    }

    function drawHostileProjectile(projectile, pos) {
      var angle = Math.atan2(projectile.vy, projectile.vx);
      var piercing = projectile.kind === "sniperShot";
      var trail = piercing ? 22 : (projectile.kind === "bossShot" ? 12 : 9);
      var trailWidth = piercing ? 2.5 : 1.5;
      ctx.globalAlpha = .72;
      ctx.shadowBlur = 0;
      ctx.lineWidth = trailWidth + 1.5;
      ctx.strokeStyle = SHOT_COLORS.hostileRim;
      ctx.beginPath();
      ctx.moveTo(pos.x - Math.cos(angle) * trail, pos.y - Math.sin(angle) * trail);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.lineWidth = trailWidth;
      ctx.strokeStyle = projectile.color;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = projectile.color;
      ctx.strokeStyle = SHOT_COLORS.hostileRim;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, projectile.radius, 0, TAU);
      ctx.fill();
      ctx.stroke();
      if (piercing) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, projectile.radius + 2, 0, TAU);
        ctx.stroke();
      }
    }

    function drawProjectiles(hostilePass) {
      if (!game) return;
      if (!hostilePass) resetProjectileCircleBatches();
      var simpleProjectileBudget = SIMPLE_PROJECTILE_RENDER_BUDGETS[currentQualityTier()];
      var simpleProjectilesQueued = 0;
      for (var i = 0; i < game.projectiles.length; i += 1) {
        var projectile = game.projectiles[i];
        if (projectile.life <= 0 || (hostilePass ? projectile.friendly : !projectile.friendly)) continue;
        var pos = worldToScreen(projectile.x, projectile.y);
        if (!isScreenVisibleAtZoom(pos, 50)) continue;
        if (hostilePass) {
          drawHostileProjectile(projectile, pos);
          continue;
        }
        if (projectile.kind === "cannon" || projectile.kind === "scatter") {
          if (simpleProjectilesQueued < simpleProjectileBudget) {
            queueProjectileCircle(projectile.color, pos.x, pos.y, projectile.radius);
            simpleProjectilesQueued += 1;
          }
          continue;
        }
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        ctx.strokeStyle = projectile.color;
        ctx.fillStyle = projectile.color;
        ctx.shadowBlur = 0;
        ctx.shadowColor = projectile.color;
        if (projectile.kind === "missile") {
          var angle = Math.atan2(projectile.vy, projectile.vx);
          polygonPath(ctx, pos.x, pos.y, 6, 3, angle);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(pos.x - Math.cos(angle) * 7, pos.y - Math.sin(angle) * 7);
          ctx.lineTo(pos.x - Math.cos(angle) * 15, pos.y - Math.sin(angle) * 15);
          ctx.stroke();
        } else if (projectile.kind === "rail") {
          var railAngle = Math.atan2(projectile.vy, projectile.vx);
          ctx.shadowBlur = 0;
          ctx.lineWidth = 7;
          ctx.globalAlpha = .28;
          ctx.beginPath();
          ctx.moveTo(pos.x - Math.cos(railAngle) * 34, pos.y - Math.sin(railAngle) * 34);
          ctx.lineTo(pos.x + Math.cos(railAngle) * 8, pos.y + Math.sin(railAngle) * 8);
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (projectile.kind === "cryo") {
          polygonPath(ctx, pos.x, pos.y, 5, 6, 0);
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.stroke();
        } else if (projectile.kind === "mine") {
          ctx.globalAlpha = projectile.armTime > 0 ? .45 : .95;
          polygonPath(ctx, pos.x, pos.y, 7, 8, game.backgroundPulse * 1.8);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 2.5, 0, TAU);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, projectile.radius, 0, TAU);
          ctx.fill();
        }
      }
      if (!hostilePass) drawProjectileCircleBatches();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
    }

    function drawEffects() {
      if (!game) return;
      var simplifiedEffects = currentQualityTier() > 0;
      ctx.save();
      ctx.globalCompositeOperation = simplifiedEffects ? "source-over" : "lighter";
      for (var i = 0; i < game.particles.length; i += 1) {
        var particle = game.particles[i];
        var pos = worldToScreen(particle.x, particle.y);
        if (!isScreenVisibleAtZoom(pos, 20)) continue;
        ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
        ctx.fillStyle = particle.color;
        ctx.fillRect(pos.x - particle.size / 2, pos.y - particle.size / 2, particle.size, particle.size);
      }
      for (var e = 0; e < game.effects.length; e += 1) {
        var effect = game.effects[e];
        var alpha = clamp(effect.life / effect.maxLife, 0, 1);
        var effectPos = worldToScreen(effect.x, effect.y);
        if (effect.type === "directionWarning") {
          var edgeDistance = Math.min(viewWidth, viewHeight) * .39;
          var warningScale = game.camera.zoom || 1;
          var warningX = viewWidth / 2 + Math.cos(effect.angle) * edgeDistance / warningScale;
          var warningY = viewHeight / 2 + Math.sin(effect.angle) * edgeDistance / warningScale;
          var warningPulse = .55 + Math.sin(game.backgroundPulse * 10) * .25;
          ctx.globalAlpha = Math.max(.25, alpha) * warningPulse;
          ctx.strokeStyle = SHOT_COLORS.hostile;
          ctx.fillStyle = SHOT_COLORS.hostile;
          ctx.shadowBlur = simplifiedEffects ? 0 : 18;
          ctx.lineWidth = 3 / warningScale;
          polygonPath(ctx, warningX, warningY, 18 / warningScale, 3, effect.angle + Math.PI);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(warningX, warningY, (26 + (1 - alpha) * 9) / warningScale, 0, TAU);
          ctx.stroke();
          continue;
        }
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = effect.color;
        ctx.fillStyle = effect.color;
        ctx.shadowBlur = simplifiedEffects ? 0 : 14;
        ctx.shadowColor = effect.color;
        if (effect.type === "flameCone") {
          ctx.globalAlpha = alpha * .12;
          ctx.beginPath();
          ctx.moveTo(effectPos.x, effectPos.y);
          ctx.arc(effectPos.x, effectPos.y, effect.radius, effect.angle - effect.width, effect.angle + effect.width);
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha = alpha * .75;
          ctx.lineWidth = 2;
          for (var flameRay = -1; flameRay <= 1; flameRay += 1) {
            var flameAngle = effect.angle + flameRay * effect.width * .7;
            ctx.beginPath();
            ctx.moveTo(effectPos.x + Math.cos(flameAngle) * 16, effectPos.y + Math.sin(flameAngle) * 16);
            ctx.lineTo(effectPos.x + Math.cos(flameAngle) * effect.radius * .9, effectPos.y + Math.sin(flameAngle) * effect.radius * .9);
            ctx.stroke();
          }
        } else if (effect.type === "ring") {
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(effectPos.x, effectPos.y, effect.radius, 0, TAU);
          ctx.stroke();
        } else if (effect.type === "beam") {
          var end = worldToScreen(effect.x2, effect.y2, screenPointB);
          ctx.globalAlpha = alpha * .38;
          ctx.lineWidth = Math.max(5, effect.width || 5);
          ctx.beginPath();
          ctx.moveTo(effectPos.x, effectPos.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = Math.max(1.5, (effect.width || 5) * .22);
          ctx.beginPath();
          ctx.moveTo(effectPos.x, effectPos.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();
        } else if (effect.type === "arc") {
          ctx.lineWidth = 5;
          ctx.globalAlpha = alpha * .30;
          ctx.beginPath();
          for (var pointIndex = 0; pointIndex < effect.points.length; pointIndex += 1) {
            var point = worldToScreen(effect.points[pointIndex].x, effect.points[pointIndex].y, screenPointB);
            if (pointIndex === 0) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
          }
          ctx.stroke();
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (effect.type === "damageText" || effect.type === "shipDamageText") {
          ctx.shadowBlur = 0;
          ctx.font = (effect.type === "shipDamageText" || effect.value >= 50 ? "800 16px" : "700 12px") + " ui-monospace, monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText((effect.type === "shipDamageText" ? "−" : "") + String(effect.value), effectPos.x, effectPos.y);
        } else if (effect.type === "debris") {
          ctx.save();
          ctx.translate(effectPos.x, effectPos.y);
          ctx.rotate(effect.rotation);
          ctx.strokeRect(-15, -15, 30, 30);
          ctx.font = "800 12px ui-monospace, monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(effect.glyph, 0, 0);
          ctx.restore();
        }
      }
      ctx.restore();
    }

    function drawScreenFeedback() {
      if (!game) {
        ui.damageVignette.style.opacity = "0";
        ui.dangerBanner.classList.remove("show");
        return;
      }
      ui.damageVignette.style.opacity = String(clamp(game.damageVignette, 0, 1));
      ui.dangerBanner.textContent = game.damageWarningText || "CORE IMPACT";
      ui.dangerBanner.classList.toggle("show", game.damageWarningTimer > 0 && game.state === "playing");
    }

    function drawBossLocator() {
      if (!game || !game.boss || game.boss.dead) return;
      var boss = game.boss;
      var basePosition = worldToScreen(boss.x, boss.y);
      var zoom = game.camera.zoom || 1;
      var screenX = viewWidth / 2 + (basePosition.x - viewWidth / 2) * zoom;
      var screenY = viewHeight / 2 + (basePosition.y - viewHeight / 2) * zoom;
      var safeLeft = 44;
      var safeRight = viewWidth - 44;
      var safeTop = 104;
      var safeBottom = viewHeight - 62;
      var onScreen = screenX >= safeLeft && screenX <= safeRight && screenY >= safeTop && screenY <= safeBottom;
      var locatorX = clamp(screenX, safeLeft, safeRight);
      var locatorY = clamp(screenY, safeTop, safeBottom);
      var direction = Math.atan2(screenY - viewHeight / 2, screenX - viewWidth / 2);
      var distance = Math.round(Math.sqrt(distanceSquared(game.ship.x, game.ship.y, boss.x, boss.y)) / TILE_SIZE);

      ctx.save();
      ctx.strokeStyle = "#ff637c";
      ctx.fillStyle = "#ff637c";
      ctx.shadowColor = "#ff637c";
      ctx.shadowBlur = currentQualityTier() > 0 ? 0 : 12;
      ctx.lineWidth = 2;
      ctx.globalAlpha = .92;
      if (onScreen) {
        ctx.beginPath();
        ctx.arc(locatorX, locatorY, boss.radius * zoom + 11, 0, TAU);
        ctx.stroke();
      } else {
        polygonPath(ctx, locatorX, locatorY, 12, 3, direction);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.font = "800 10px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText("BOSS · " + distance, locatorX, locatorY - (onScreen ? boss.radius * zoom + 14 : 15));
      ctx.restore();
    }

    function render(time) {
      drawBackground(time);
      if (game) {
        var zoom = game.camera.zoom || 1;
        ctx.save();
        ctx.translate(viewWidth / 2, viewHeight / 2);
        ctx.scale(zoom, zoom);
        ctx.translate(-viewWidth / 2, -viewHeight / 2);
        drawGravityFields();
        drawEnemies();
        drawProjectiles(false);
        drawShip();
        if (game.training && trainingSession) trainingSession.arena.draw(ctx, game, worldToScreen);
        drawEffects();
        drawProjectiles(true);
        ctx.restore();
        drawBossLocator();
      }
      drawScreenFeedback();
    }

    var lastHudUpdate = 0;
    var previousRaf = performance.now();
    var smoothedFps = 60;
    var lastRenderAt = 0;
    var smoothedRenderFps = 60;
    var telemetryMinimumSimulationFps = Infinity;
    var telemetryMinimumRenderFps = Infinity;
    function resetTelemetryFpsWindow() {
      telemetryMinimumSimulationFps = Infinity;
      telemetryMinimumRenderFps = Infinity;
    }
    function shouldRenderFrame(now) {
      var fpsLimit = save.settings.fpsLimit;
      if (!fpsLimit) {
        if (lastRenderAt > 0) smoothedRenderFps = lerp(smoothedRenderFps, 1000 / Math.max(1, now - lastRenderAt), .08);
        lastRenderAt = now;
        return true;
      }
      var interval = 1000 / fpsLimit;
      if (lastRenderAt > 0 && now - lastRenderAt < interval) return false;
      if (lastRenderAt > 0) smoothedRenderFps = lerp(smoothedRenderFps, 1000 / Math.max(1, now - lastRenderAt), .25);
      lastRenderAt = now;
      return true;
    }

    function frame(now) {
      requestAnimationFrame(frame);
      var rafDelta = Math.max(1, now - previousRaf);
      previousRaf = now;
      smoothedFps = lerp(smoothedFps, 1000 / rafDelta, .08);
      telemetryMinimumSimulationFps = Math.min(telemetryMinimumSimulationFps, smoothedFps);
      if (game) {
        var delta = Math.min(FIXED_STEP * MAX_SIMULATION_STEPS, (now - game.lastFrame) / 1000);
        game.lastFrame = now;
        if (game.state === "playing" && !game.finished) {
          game.accumulator += delta;
          var simulationSteps = 0;
          while (game.accumulator >= FIXED_STEP && simulationSteps < MAX_SIMULATION_STEPS) {
            game.update(FIXED_STEP);
            game.accumulator -= FIXED_STEP;
            simulationSteps += 1;
          }
          if (game.accumulator >= FIXED_STEP) game.accumulator %= FIXED_STEP;
        } else {
          game.accumulator = 0;
        }
        if (now - lastHudUpdate > 100) {
          updateHud();
          if (DEBUG) {
            var limitLabel = save.settings.fpsLimit ? " L" + save.settings.fpsLimit : "";
            ui.debugStats.textContent = "R" + Math.round(smoothedRenderFps) + limitLabel + " S" + Math.round(smoothedFps) + " Q" + currentQualityTier() + " E" + game.enemies.length + " P" + game.projectiles.length;
          }
          lastHudUpdate = now;
        }
      }
      var rendered = shouldRenderFrame(now);
      if (rendered) {
        render(now);
        telemetryMinimumRenderFps = Math.min(telemetryMinimumRenderFps, smoothedRenderFps);
      }
      if (game && playtestTelemetry && playtestTelemetry.shouldSample(game.elapsed)) {
        playtestTelemetry.sample(telemetrySample());
        resetTelemetryFpsWindow();
      }
    }

    function buyMetaForTests(id) {
      if (game && game.training) return false;
      var def = META_DEFS.find(function (item) { return item.id === id; });
      if (!DEBUG || !def || def.legacy || save.meta[id] >= META_PURCHASE_CAP) return false;
      var cost = metaCost(save.meta[id]);
      if (save.fragments < cost) return false;
      save.fragments -= cost;
      save.meta[id] += 1;
      storeSave();
      renderMetaShop();
      return true;
    }

    function runSelfTests() {
      var failures = [];
      function expect(condition, message) {
        if (!condition) failures.push(message);
      }
      expect(keyOf(-2, 3) === "-2,3", "Grid keys must remain stable.");
      var sanitizedProbe = sanitizeSave({
        version: 1,
        fragments: -20,
        settings: { masterVolume: 4, shakeIntensity: -3, damageNumbers: false },
        lastLoadout: { selectedWeapon: "invalid", tile: { x: 4, y: 4, type: "cannon" } }
      });
      expect(sanitizedProbe.version === SAVE_VERSION && sanitizedProbe.fragments === 0, "Save migration must sanitize progression.");
      expect(sanitizedProbe.settings.masterVolume === 1 && sanitizedProbe.settings.shakeIntensity === 0 && sanitizedProbe.settings.damageNumbers === false, "Save settings must be clamped and preserved.");
      expect(sanitizeSave({ settings: { fpsLimit: 7 } }).settings.fpsLimit === 7 && sanitizeSave({ settings: { fpsLimit: 12 } }).settings.fpsLimit === 0, "FPS readability limits must be allow-listed.");
      expect(sanitizeSave({ settings: { qualityTier: 1 } }).settings.qualityTier === 1 && sanitizeSave({ settings: { qualityTier: 8 } }).settings.qualityTier === 0, "Manual quality tiers must be allow-listed.");
      expect(sanitizeSave({ settings: { performanceMode: true } }).settings.qualityTier === 2, "Legacy performance mode must migrate to low quality.");
      expect(FIXED_STEP === 1 / 30 && MAX_SIMULATION_STEPS === 3, "Simulation must use the bounded thirty-Hz fixed step.");
      var previousFpsLimit = save.settings.fpsLimit;
      var previousLastRenderAt = lastRenderAt;
      save.settings.fpsLimit = 5;
      lastRenderAt = 0;
      expect(shouldRenderFrame(1000) && !shouldRenderFrame(1100) && shouldRenderFrame(1200), "Forced FPS must throttle rendering at the selected cadence.");
      save.settings.fpsLimit = previousFpsLimit;
      lastRenderAt = previousLastRenderAt;
      expect(sanitizedProbe.lastLoadout.selectedWeapon === "cannon" && sanitizedProbe.lastLoadout.tile.x === 0 && sanitizedProbe.lastLoadout.tile.y === -1, "Invalid loadouts must fall back safely.");
      expect(metaCost(0) === 5 && metaCost(2) === 45, "Meta cost curve is incorrect.");
      expect(Math.ceil(MODULES.cannon.baseCost * Math.pow(MODULES.cannon.scale, 2)) === 30, "Module cost curve is incorrect.");
      expect(WEAPON_TYPES.length === 12, "Weapon catalog must contain twelve distinct weapons.");
      expect(START_WEAPONS.length === 11 && !isStarterWeapon("mine"), "Starter armory must include every weapon except the tactical mine.");
      expect(Object.keys(MODULES).length === 19, "Build catalog must contain nineteen modules.");
      expect(Object.keys(ENEMY_DEFS).length === 14, "Enemy catalog must contain fourteen geometric archetypes.");
      for (var phaseIndex = 0; phaseIndex < ENEMY_PHASES.length; phaseIndex += 1) {
        var phase = ENEMY_PHASES[phaseIndex];
        var poolWeight = 0;
        for (var poolIndex = 0; poolIndex < phase.pool.length; poolIndex += 1) {
          poolWeight += phase.pool[poolIndex][1];
          expect(!!ENEMY_DEFS[phase.pool[poolIndex][0]], "Every phase entry must reference an enemy definition.");
        }
        expect(poolWeight === 100, "Every enemy phase pool must total one hundred percent.");
        var rangedPoolWeight = 0;
        for (var rangedPoolIndex = 0; rangedPoolIndex < phase.rangedPool.length; rangedPoolIndex += 1) {
          rangedPoolWeight += phase.rangedPool[rangedPoolIndex][1];
          expect(!!ENEMY_DEFS[phase.rangedPool[rangedPoolIndex][0]], "Every ranged phase entry must reference an enemy definition.");
        }
        expect((phase.assaultRanged === 0 && rangedPoolWeight === 0) || rangedPoolWeight === 100, "Every active ranged pool must total one hundred percent.");
        expect(phase.assaultRanged >= 0 && phase.assaultRanged <= 3, "Assault ranged slots must stay bounded.");
        var heavyPoolWeight = 0;
        for (var heavyIndex = 0; heavyIndex < phase.heavyPool.length; heavyIndex += 1) {
          heavyPoolWeight += phase.heavyPool[heavyIndex][1];
          expect(!!ENEMY_DEFS[phase.heavyPool[heavyIndex][0]], "Heavy fronts must use existing enemy definitions.");
        }
        expect(phase.heavySquads ? heavyPoolWeight === 100 : heavyPoolWeight === 0, "Active heavy fronts need a complete weighted pool.");
        if (phaseIndex > 0) {
          expect(phase.level === ENEMY_PHASES[phaseIndex - 1].level + 1, "Threat phases must unlock in order.");
          expect(phase.at > ENEMY_PHASES[phaseIndex - 1].at && phase.packetSize >= ENEMY_PHASES[phaseIndex - 1].packetSize, "Pressure must develop across the run.");
          expect(phase.ambientRangedChance >= ENEMY_PHASES[phaseIndex - 1].ambientRangedChance, "Ranged ambient pressure must not decrease between phases.");
        }
      }
      var directorProbe = Object.create(Game.prototype);
      directorProbe.elapsed = 0;
      directorProbe.ship = { x: 0, y: 0, tiles: new Map([["0,0", {}], ["0,-1", {}]]) };
      directorProbe.camera = { zoom: 1 };
      directorProbe.enemies = [];
      directorProbe.enemyPool = [];
      directorProbe.enemyById = new Map();
      directorProbe.enemyId = 1;
      directorProbe.ambientPacksSpawned = 0;
      directorProbe.totalEnemiesSpawned = 0;
      directorProbe.assaultIndex = 0;
      expect(directorProbe.threatLevel() === 1, "Threat must begin at level one.");
      directorProbe.elapsed = 30;
      expect(directorProbe.threatLevel() === 1, "The first useful build window must retain the opening enemy roster.");
      directorProbe.ship.tiles.set("1,0", {});
      directorProbe.ship.tiles.set("-1,0", {});
      directorProbe.ship.tiles.set("0,1", {});
      directorProbe.ship.tiles.set("1,1", {});
      expect(directorProbe.threatLevel() === 1, "Buying modules must not silently accelerate the enemy roster.");
      directorProbe.elapsed = 90;
      expect(directorProbe.threatLevel() === 3 && directorProbe.currentEnemyPhase().heavySquads === 1, "Heavy groups must enter after the opening build window.");
      directorProbe.elapsed = 480;
      expect(directorProbe.threatLevel() === 8 && directorProbe.currentEnemyPhase().heavySquads === 2, "Late fronts must still gain bodies and approach directions.");
      directorProbe.elapsed = 0;
      directorProbe.ship.tiles = new Map([["0,0", {}], ["0,-1", {}]]);
      directorProbe.spawnAssaultWave(true);
      expect(directorProbe.enemies.length === 44 && directorProbe.assaultIndex === 1, "The opening swarm must have a near-edge group and deeper approaching groups.");
      var visibleOpeningEnemies = 0;
      for (var spawnedIndex = 0; spawnedIndex < directorProbe.enemies.length; spawnedIndex += 1) {
        var spawnedEnemy = directorProbe.enemies[spawnedIndex];
        if (Math.abs(spawnedEnemy.x) < viewWidth / 2 && Math.abs(spawnedEnemy.y) < viewHeight / 2) visibleOpeningEnemies += 1;
        expect(spawnedEnemy.y < 0 && distanceSquared(0, 0, spawnedEnemy.x, spawnedEnemy.y) > 250 * 250, "Opening bodies must approach from the forward half-space at a safe distance.");
      }
      expect(visibleOpeningEnemies > 0 && visibleOpeningEnemies < 12, "The opening must show a distant group without placing the full swarm on top of the player.");
      directorProbe.spawnAmbientPack(ENEMY_PHASES[0]);
      expect(directorProbe.enemies.length === 47, "Ambient pressure must add a cohesive three-enemy opening pack.");
      directorProbe.enemies.length = MAX_ACTIVE_ENEMIES;
      expect(directorProbe.spawnEnemy("drone", 0, 0) === null && directorProbe.enemies.length === MAX_ACTIVE_ENEMIES, "The active enemy cap must prevent runaway swarm cost.");
      var bossTimingProbe = Object.create(Game.prototype);
      bossTimingProbe.elapsed = 42;
      bossTimingProbe.ship = { x: 0, y: 0, tiles: new Map([["0,0", {}], ["0,-1", {}]]) };
      bossTimingProbe.kills = 0;
      bossTimingProbe.bossWarningShown = false;
      bossTimingProbe.bossSpawned = false;
      bossTimingProbe.assaultClock = 1;
      bossTimingProbe.ambientSpawnClock = 999;
      bossTimingProbe.pendingBossAngle = null;
      bossTimingProbe.spawnEffect = function () { return {}; };
      bossTimingProbe.spawnBoss = function () { this.bossSpawned = true; };
      bossTimingProbe.spawnAmbientPack = function () {};
      bossTimingProbe.spawnAssaultWave = function () {};
      bossTimingProbe.updateSpawner(0);
      expect(bossTimingProbe.bossWarningShown && bossTimingProbe.assaultClock === 1, "Boss warning must retain pending approach groups while their clocks slow down.");
      expect(ENEMY_DEFS.drone.sides === 0 && ENEMY_DEFS.bulwark.shield > 0, "Reference-inspired enemy silhouettes are incomplete.");
      expect(ENEMY_DEFS.hunter.speed === 250 && ENEMY_DEFS.hunter.turnRate === .48 && ENEMY_DEFS.mini.speed === 205, "Triangle interceptor tuning is incorrect.");
      expect(ENEMY_DEFS.raptor.speed === 340 && ENEMY_DEFS.raptor.turnRate === .22 && ENEMY_DEFS.raptor.damage === 16, "Raptor elite tuning is incorrect.");
      expect(ENEMY_DEFS.drone.directChase && ENEMY_DEFS.scout.directChase && ENEMY_DEFS.brute.directChase, "Core swarm bodies must steer directly at the ship.");
      expect(ENEMY_DEFS.bolter.damage === 5 && ENEMY_PHASES[2].rangedPool[0][0] === "bolter" && ENEMY_PHASES[4].rangedPool[0][0] === "bolter", "Early ranged phases must use the single-shot Bolt Drone.");
      expect(ENEMY_DEFS.gunner.damage === 9 && ENEMY_PHASES[5].rangedPool.some(function (entry) { return entry[0] === "gunner"; }) && ENEMY_PHASES[7].rangedPool.some(function (entry) { return entry[0] === "sniper"; }), "Advanced ranged enemies must enter in later phases.");
      expect(BOSS_SPAWN_TIME === 120 && BOSS_WARNING_LEAD === 5, "Boss arrival telegraph timing is incorrect.");
      expect(MODULES.flak.damage === 7 && MODULES.flak.cooldown === 1.1 && MODULES.flak.blastRadius === 125 && MODULES.flak.damage < MODULES.missile.damage * .25, "Flak must have a wide defensive blast and very low enemy damage.");
      var internalWeaponProbe = Object.create(Game.prototype);
      var internalTile = { x: 0, y: 0 };
      internalWeaponProbe.ship = { x: 0, y: 0, angle: 0, tiles: new Map() };
      internalWeaponProbe.ship.tiles.set(keyOf(0, 0), internalTile);
      internalWeaponProbe.ship.tiles.set(keyOf(1, 0), { x: 1, y: 0 });
      internalWeaponProbe.ship.tiles.set(keyOf(-1, 0), { x: -1, y: 0 });
      internalWeaponProbe.ship.tiles.set(keyOf(0, 1), { x: 0, y: 1 });
      internalWeaponProbe.ship.tiles.set(keyOf(0, -1), { x: 0, y: -1 });
      internalWeaponProbe.enemies = [{ id: 1, x: 0, y: -80, dead: false }];
      expect(internalWeaponProbe.findTarget(internalTile, 100) === internalWeaponProbe.enemies[0], "Internal weapons must target through friendly hull tiles.");
      var previousGame = game;
      game = Object.create(Game.prototype);
      game.ship = { tiles: new Map([["1,0", { x: 1, y: 0 }], ["-1,0", { x: -1, y: 0 }], ["0,1", { x: 0, y: 1 }], ["0,-1", { x: 0, y: -1 }]]) };
      expect(validPlacement(0, 0, "missile"), "Weapons must be placeable inside a fully enclosed hull slot.");
      game = previousGame;
      var flakProbeEnemy = { x: 8, y: 0, hp: 30, dead: false };
      var flakProbeShot = { x: 0, y: 0, friendly: false, life: 1 };
      var flakProbe = {
        enemies: [flakProbeEnemy], projectiles: [flakProbeShot], effects: [], effectPool: [],
        damageEnemy: function (enemy, amount) { enemy.hp -= amount; },
        burst: function () {},
        spawnEffect: Game.prototype.spawnEffect
      };
      Game.prototype.fireFlakAirburst.call(flakProbe, { x: -20, y: 0 }, flakProbeShot, MODULES.flak, 1);
      expect(flakProbeShot.life === 0 && flakProbeEnemy.hp < 30, "Flak must intercept hostile shots and damage nearby enemies.");
      var rangedShotProbe = { projectiles: [], fireEnemyProjectile: function () { this.projectiles.push(Array.prototype.slice.call(arguments)); } };
      Game.prototype.releaseRangedAttack.call(rangedShotProbe, { type: "bolter", x: 0, y: 0, lockedAimX: 1, lockedAimY: 0, damage: ENEMY_DEFS.bolter.damage, color: ENEMY_DEFS.bolter.color });
      expect(rangedShotProbe.projectiles.length === 1 && rangedShotProbe.projectiles[0][6] === "bolterShot", "Bolt Drone must fire exactly one projectile per attack.");
      var impactProbe = { damageVignette: 0, damageWarningTimer: 0, damageWarningText: "", addShake: function () {} };
      Game.prototype.triggerShipImpact.call(impactProbe, { type: "armor" }, 12);
      expect(impactProbe.damageWarningTimer === 0 && impactProbe.damageVignette === 0, "Normal module damage must remain local instead of showing a screen warning.");
      var repairProbe = Object.create(Game.prototype);
      var repairA = { type: "repair", x: 0, y: 0, hp: 50, maxHp: 50, supportClock: 0, repairDelay: 0 };
      var repairB = { type: "repair", x: 1, y: 0, hp: 50, maxHp: 50, supportClock: 0, repairDelay: 0 };
      var damagedTile = { type: "armor", x: 0, y: 1, hp: 50, maxHp: 100, supportClock: 0, repairDelay: 0 };
      repairProbe.ship = { x: 0, y: 0, angle: 0, tiles: new Map([["0,0", repairA], ["1,0", repairB], ["0,1", damagedTile]]) };
      repairProbe.effects = [];
      repairProbe.effectPool = [];
      repairProbe.updateSupportModules(.01);
      expect(damagedTile.hp === 55 && repairA.supportClock === MODULES.repair.repairInterval, "Overlapping repair arrays must not stack healing on one tile.");
      repairProbe.updateSupportModules(.01);
      expect(damagedTile.hp === 55, "Repair pulses must respect the target's shared interval.");
      repairProbe.updateShields(1.5);
      repairProbe.updateSupportModules(1.5);
      expect(damagedTile.hp === 60, "Repair must resume after the shared target interval expires.");
      var projectilePoolProbe = { projectiles: [], projectilePool: [] };
      var firstProjectile = Game.prototype.spawnProjectile.call(projectilePoolProbe, true, "rail", 0, 0, 1, 0, 10, 3, 1, "#fff");
      firstProjectile.life = 0;
      Game.prototype.compactProjectiles.call(projectilePoolProbe);
      var reusedProjectile = Game.prototype.spawnProjectile.call(projectilePoolProbe, true, "cannon", 5, 6, 2, 3, 4, 2, 2, "#0ff");
      expect(reusedProjectile === firstProjectile && reusedProjectile.kind === "cannon" && reusedProjectile.x === 5, "Expired projectile objects must be reset and reused.");
      projectilePoolProbe.projectiles.length = MAX_ACTIVE_PROJECTILES;
      expect(Game.prototype.spawnProjectile.call(projectilePoolProbe, true, "cannon", 0, 0, 0, 0, 1, 1, 1, "#fff") === null, "The projectile cap must prevent runaway update and render cost.");
      var effectPoolProbe = { effects: [], effectPool: [], particles: [], particlePool: [] };
      var firstEffect = Game.prototype.spawnEffect.call(effectPoolProbe, "ring", 0, 0, .1, "#fff");
      firstEffect.radius = 5;
      Game.prototype.updateEffects.call(effectPoolProbe, .2);
      var reusedEffect = Game.prototype.spawnEffect.call(effectPoolProbe, "beam", 3, 4, .2, "#0ff");
      expect(reusedEffect === firstEffect && reusedEffect.type === "beam" && reusedEffect.radius === 0, "Expired effect objects must be reset and reused.");
      var enemyPoolProbe = { enemyId: 1, enemies: [], enemyPool: [], enemyById: new Map() };
      Game.prototype.spawnEnemy.call(enemyPoolProbe, "scout", 0, 0);
      var firstEnemy = enemyPoolProbe.enemies[0];
      firstEnemy.dead = true;
      Game.prototype.compactEnemies.call(enemyPoolProbe);
      Game.prototype.spawnEnemy.call(enemyPoolProbe, "drone", 10, 20);
      expect(enemyPoolProbe.enemies[0] === firstEnemy && firstEnemy.type === "drone" && firstEnemy.x === 10, "Defeated enemy objects must be reset and reused.");
      var collisionProbe = Object.create(Game.prototype);
      collisionProbe.ship = { x: 0, y: 0, angle: Math.PI / 2, tiles: new Map([["1,0", { x: 1, y: 0 }]]) };
      expect(collisionProbe.findImpactedTile(0, TILE_SIZE, 2) === "1,0", "Local-space ship collision lookup must support rotated ships.");
      var spatialProbe = Object.create(Game.prototype);
      spatialProbe.ship = { x: 0, y: 0, angle: 0 };
      spatialProbe.enemies = [{ id: 1, x: 45, y: 0, dead: false }, { id: 2, x: 900, y: 0, dead: false }];
      spatialProbe.enemyGrid = new Map();
      spatialProbe.enemyGridBuckets = [];
      spatialProbe.enemyGridBucketCount = 0;
      spatialProbe.nearbyBuffer = [];
      spatialProbe.rebuildEnemyGrid();
      var firstSpatialBucket = spatialProbe.enemyGridBuckets[0];
      expect(spatialProbe.findTarget({ x: 0, y: 0 }, 100) === spatialProbe.enemies[0], "Weapon targeting must find nearby enemies through the spatial grid.");
      spatialProbe.rebuildEnemyGrid();
      expect(spatialProbe.enemyGridBuckets[0] === firstSpatialBucket, "Spatial buckets must be reused between simulation passes.");
      var cameraProbe = Object.create(Game.prototype);
      var cameraTiles = new Map();
      for (var cameraTileX = -15; cameraTileX <= 15; cameraTileX += 1) cameraTiles.set(keyOf(cameraTileX, 0), { x: cameraTileX, y: 0 });
      cameraProbe.ship = { x: 0, y: 0, vx: 0, vy: 0, angle: 0, tiles: cameraTiles };
      cameraProbe.camera = { x: 0, y: 0, zoom: 1, targetZoom: 1 };
      cameraProbe.updateCameraFraming(1);
      expect(cameraProbe.camera.targetZoom < 1, "Long ships must automatically zoom the combat camera out.");
      var separationProbe = Object.create(Game.prototype);
      separationProbe.enemyGrid = new Map();
      separationProbe.enemyGridBuckets = [];
      separationProbe.enemyGridBucketCount = 0;
      separationProbe.enemies = [
        { id: 1, x: 0, y: 0, radius: 10, dead: false },
        { id: 2, x: 0, y: 0, radius: 10, dead: false }
      ];
      separationProbe.resolveEnemyOverlaps();
      var probeDx = separationProbe.enemies[1].x - separationProbe.enemies[0].x;
      var probeDy = separationProbe.enemies[1].y - separationProbe.enemies[0].y;
      expect(Math.sqrt(probeDx * probeDx + probeDy * probeDy) >= 21.49, "Enemy separation must prevent visible overlap.");
      expect(MODULES.cryo.slowFactor === .5 && MODULES.cryo.slowDuration === 2, "Cryo control values are incorrect.");
      expect(MODULES.bulkhead.damageReduction * 4 === .48, "Bulkhead resistance cap is inconsistent.");
      expect(SIMPLE_PROJECTILE_RENDER_BUDGETS[0] === 180 && SIMPLE_PROJECTILE_RENDER_BUDGETS[2] === 80, "Manual quality tiers must keep deterministic projectile render budgets.");
      resetProjectileCircleBatches();
      queueProjectileCircle("#test", 10.2, 11.7, 3);
      expect(projectileCircleBatchKeys.length === 1 && projectileCircleBatches["#test"].length === 3, "Projectile batching must register a color on its first frame.");
      resetProjectileCircleBatches();
      queueProjectileCircle("#test", 20.4, 21.6, 2);
      expect(projectileCircleBatchKeys.length === 1 && projectileCircleBatches["#test"].length === 3, "Projectile batching must re-register reused colors on later frames.");
      resetProjectileCircleBatches();
      expect(runFragmentReward(250, 360, 1) === 11, "Fragment reward formula is incorrect.");
      if (failures.length) throw new Error("Self tests failed: " + failures.join(" "));
      clearTimeout(toastTimer);
      ui.toast.classList.remove("show");
      ui.toast.textContent = "";
      console.info("Drift Bastion self-tests passed.");
    }

    ui.startButton.addEventListener("click", startRun);
    ui.installButton.addEventListener("click", installFullscreenApp);
    ui.menuSettingsButton.addEventListener("click", openMenuSettings);
    ui.hangarMenuButton.addEventListener("click", function () { openHangar("upgrades"); });
    ui.menuLoadoutButton.addEventListener("click", function () { openHangar("armory"); });
    ui.closeHangar.addEventListener("click", closeHangar);
    ui.hangarUpgradeTab.addEventListener("click", function () { setHangarTab("upgrades"); });
    ui.hangarWeaponTab.addEventListener("click", function () { setHangarTab("armory"); });
    ui.bankRunButton.addEventListener("click", function () {
      if (game && !game.finished && game.continued) game.finishRun(true, true);
    });
    ui.finishSurvivalButton.addEventListener("click", function () {
      if (game && game.state === "milestone") game.finishRun(true, true);
    });
    ui.continueSurvivalButton.addEventListener("click", continueSurvival);
    ui.buildButton.addEventListener("click", openBuild);
    ui.pauseButton.addEventListener("click", function () { openPause(); });
    ui.mobileBuildButton.addEventListener("click", openBuild);
    ui.mobilePauseButton.addEventListener("click", function () { openPause(); });
    ui.closeBuild.addEventListener("click", closeBuild);
    document.getElementById("buildModulePreview").addEventListener("click", function () {
      var selected = selectedBuildTile();
      openModulePreview(selected ? selected.type : selectedBuildModule, "build");
    });
    ui.resumeButton.addEventListener("click", closePause);
    ui.restartButton.addEventListener("click", requestRestart);
    ui.pauseHangarButton.addEventListener("click", exitToHangar);
    ui.hangarButton.addEventListener("click", exitToHangar);
    ui.exportTelemetryButton.addEventListener("click", exportTelemetry);
    ui.resultExportTelemetry.addEventListener("click", exportTelemetry);
    ui.clearTelemetryButton.addEventListener("click", clearTelemetry);
    ui.muteButton.addEventListener("click", function () {
      audio.muted = !audio.muted;
      save.settings.muted = audio.muted;
      storeSave();
      if (!audio.muted) audio.tone(420, .07, .03, "sine", 80);
      syncSettingsUi();
      updateHud();
    });
    ui.volumeSlider.addEventListener("input", function () {
      var previewVolume = clamp(Number(ui.volumeSlider.value) / 100, 0, 1);
      ui.volumeValue.textContent = Math.round(previewVolume * 100) + "%";
      audio.setVolume(previewVolume);
    });
    ui.shakeSlider.addEventListener("input", function () {
      ui.shakeValue.textContent = ui.shakeSlider.value + "%";
    });
    ui.volumeSlider.addEventListener("change", applySettingsFromUi);
    ui.shakeSlider.addEventListener("change", applySettingsFromUi);
    ui.reducedFlashToggle.addEventListener("change", applySettingsFromUi);
    ui.damageNumbersToggle.addEventListener("change", applySettingsFromUi);
    ui.autoPauseToggle.addEventListener("change", applySettingsFromUi);
    ui.qualitySelect.addEventListener("change", applySettingsFromUi);
    ui.fpsLimitSelect.addEventListener("change", applySettingsFromUi);
    ui.uiScaleSelect.addEventListener("change", applySettingsFromUi);
    ui.debugToolsToggle.addEventListener("change", function () { setDebugTools(ui.debugToolsToggle.checked); });
    ui.replayOnboardingButton.addEventListener("click", startTraining);
    ui.startTrainingButton.addEventListener("click", startTraining);
    ui.resetProgressButton.addEventListener("click", function () {
      ui.resetProgressMessage.textContent = (game && !game.finished ? "End this run and reset " : "Reset ") + "Fragments, purchases and records? Settings and playtest logs stay.";
      ui.resetProgressConfirm.classList.remove("hidden");
      ui.progressActionStatus.textContent = "";
      if (ui.cancelResetProgress.focus) ui.cancelResetProgress.focus();
    });
    ui.cancelResetProgress.addEventListener("click", function () {
      ui.resetProgressConfirm.classList.add("hidden");
      if (ui.resetProgressButton.focus) ui.resetProgressButton.focus();
    });
    ui.confirmResetProgress.addEventListener("click", resetProgress);
    ui.debugMatter.addEventListener("click", function () {
      grantDebugMatter(100);
    });
    ui.debugBoss.addEventListener("click", function () {
      if (DEBUG && game && !game.bossSpawned && debugActionAllowed("spawn_boss")) game.spawnBoss();
    });
    ui.debugKillBoss.addEventListener("click", function () {
      if (DEBUG && game && game.boss && !game.boss.dead && debugActionAllowed("kill_boss")) game.damageEnemy(game.boss, game.boss.hp);
    });
    ui.debugStress.addEventListener("click", function () {
      if (!debugActionAllowed("stress")) return;
      for (var i = 0; i < 250; i += 1) {
        var angle = Math.random() * TAU;
        var radius = 260 + Math.random() * 520;
        game.spawnEnemy(game.chooseEnemyType(), game.ship.x + Math.cos(angle) * radius, game.ship.y + Math.sin(angle) * radius);
      }
      for (var p = 0; p < 500; p += 1) {
        var shotAngle = Math.random() * TAU;
        var shotRadius = Math.random() * 300;
        game.spawnProjectile(true, "cannon", game.ship.x + Math.cos(shotAngle) * shotRadius, game.ship.y + Math.sin(shotAngle) * shotRadius, Math.cos(shotAngle) * 240, Math.sin(shotAngle) * 240, 1, 2, 3, "#a987ff");
      }
    });
    ui.debugDamage.addEventListener("click", function () {
      if (!debugActionAllowed("break_tile")) return;
      var candidates = [];
      game.ship.tiles.forEach(function (tile, key) {
        if (tile.type !== "core") candidates.push(key);
      });
      if (candidates.length) game.destroyTile(candidates[Math.floor(Math.random() * candidates.length)]);
    });

    window.addEventListener("keydown", function (event) {
      if (modulePreviewSession) {
        if (["KeyW", "KeyA", "KeyS", "KeyD", "KeyB", "KeyP", "Escape"].indexOf(event.code) >= 0) event.preventDefault();
        if (event.code === "Escape") closeModulePreview();
        return;
      }
      if (["KeyW", "KeyA", "KeyS", "KeyD", "KeyB", "KeyP", "Escape"].indexOf(event.code) >= 0) event.preventDefault();
      keys[event.code] = true;
      if (event.repeat) return;
      if (event.code === "KeyB") {
        if (game && game.state === "playing") openBuild();
        else if (game && game.state === "building") closeBuild();
      } else if ((event.code === "KeyP" || event.code === "Escape") && settingsOpenedFromMenu) {
        closePause();
      } else if ((event.code === "KeyP" || event.code === "Escape") && game) {
        if (game.state === "building") closeBuild();
        else if (game.state === "paused") closePause();
        else if (game.state === "playing") openPause();
      }
    });

    window.addEventListener("keyup", function (event) {
      keys[event.code] = false;
    });

    function setJoystickVisual(x, y) {
      ui.joystickKnob.style.transform = "translate(" + x.toFixed(1) + "px, " + y.toFixed(1) + "px)";
    }

    function resetMobileInput(pointerId) {
      if (pointerId !== undefined && mobileInput.pointerId !== pointerId) return;
      mobileInput.active = false;
      mobileInput.pointerId = null;
      mobileInput.originX = 0;
      mobileInput.originY = 0;
      mobileInput.x = 0;
      mobileInput.y = 0;
      mobileInput.magnitude = 0;
      ui.mobileMoveZone.classList.remove("active");
      ui.moveJoystick.classList.remove("active");
      setJoystickVisual(0, 0);
    }

    function updateMobileInput(event) {
      if (mobileInput.pointerId !== event.pointerId) return;
      var bounds = ui.moveJoystick.getBoundingClientRect();
      var dx = event.clientX - mobileInput.originX;
      var dy = event.clientY - mobileInput.originY;
      var distance = Math.sqrt(dx * dx + dy * dy);
      var travel = Math.max(1, bounds.width * .32);
      var strength = clamp(distance / travel, 0, 1);
      if (distance < 7) {
        mobileInput.x = 0;
        mobileInput.y = 0;
        mobileInput.magnitude = 0;
        setJoystickVisual(0, 0);
        return;
      }
      mobileInput.x = dx / distance;
      mobileInput.y = dy / distance;
      mobileInput.magnitude = strength;
      setJoystickVisual(mobileInput.x * travel * strength, mobileInput.y * travel * strength);
      event.preventDefault();
    }

    function supportsFloatingJoystick(event) {
      if (event.pointerType === "touch" || event.pointerType === "pen") return true;
      return Boolean(window.matchMedia && window.matchMedia("(hover: none) and (pointer: coarse)").matches);
    }

    canvas.addEventListener("pointerdown", function (event) {
      if (!supportsFloatingJoystick(event)) return;
      if (!game || game.state !== "playing" || game.finished || mobileInput.active) return;
      mobileInput.active = true;
      mobileInput.pointerId = event.pointerId;
      mobileInput.originX = event.clientX;
      mobileInput.originY = event.clientY;
      ui.mobileMoveZone.style.left = event.clientX.toFixed(1) + "px";
      ui.mobileMoveZone.style.top = event.clientY.toFixed(1) + "px";
      ui.mobileMoveZone.classList.add("active");
      ui.moveJoystick.classList.add("active");
      if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
      audio.ensure();
      updateMobileInput(event);
    });
    canvas.addEventListener("pointermove", updateMobileInput);
    canvas.addEventListener("pointerup", function (event) { resetMobileInput(event.pointerId); });
    canvas.addEventListener("pointercancel", function (event) { resetMobileInput(event.pointerId); });
    canvas.addEventListener("lostpointercapture", function (event) { resetMobileInput(event.pointerId); });
    canvas.addEventListener("contextmenu", function (event) { event.preventDefault(); });

    window.addEventListener("blur", function () {
      keys = Object.create(null);
      resetMobileInput();
      if (save.settings.autoPause && game && game.state === "playing" && !game.finished) openPause("FOCUS LOST — AUTO-PAUSED");
    });

    window.addEventListener("pagehide", function () {
      storeSave();
      if (playtestTelemetry) playtestTelemetry.flush();
    });

    window.addEventListener("beforeinstallprompt", function (event) {
      event.preventDefault();
      deferredInstallPrompt = event;
      syncInstallButton();
    });

    window.addEventListener("appinstalled", function () {
      deferredInstallPrompt = null;
      syncInstallButton();
    });

    window.addEventListener("resize", resize);

    window.__driftBastion = {
      getState: function () {
        if (!game) return { screen: "menu", fragments: save.fragments, progression: JSON.parse(JSON.stringify(save.progression)), campaign: JSON.parse(JSON.stringify(save.campaign)), telemetry: playtestTelemetry ? playtestTelemetry.getStatus() : null };
        return {
          screen: game.state,
          mode: game.training ? "training" : "survival",
          training: game.training,
          lesson: game.training && trainingSession ? trainingSession.controller.snapshot() : null,
          survivalCompleted: game.survivalCompleted,
          continued: game.continued,
          coreId: game.coreDef.id,
          campaign: JSON.parse(JSON.stringify(save.campaign)),
          coreMaxHp: game.ship.tiles.get("0,0") ? game.ship.tiles.get("0,0").maxHp : 0,
          matter: game.matter,
          kills: game.kills,
          elapsed: game.elapsed,
          modules: game.ship.tiles.size,
          threatLevel: game.threatLevel(),
          assaultIndex: game.assaultIndex,
          activeEnemies: game.enemies.length,
          activeProjectiles: game.projectiles.length,
          ambientPacks: game.ambientPacksSpawned,
          totalEnemiesSpawned: game.totalEnemiesSpawned,
          qualityTier: currentQualityTier(),
          ship: {
            x: game.ship.x,
            y: game.ship.y,
            vx: game.ship.vx,
            vy: game.ship.vy,
            angle: game.ship.angle
          },
          mobileInput: {
            active: mobileInput.active,
            originX: mobileInput.originX,
            originY: mobileInput.originY,
            x: mobileInput.x,
            y: mobileInput.y,
            magnitude: mobileInput.magnitude
          },
          pools: {
            enemies: game.enemyPool.length,
            projectiles: game.projectilePool.length,
            particles: game.particlePool.length,
            effects: game.effectPool.length
          },
          bossSpawned: game.bossSpawned,
          bossesDefeated: game.bossesDefeated,
          nextBossAt: game.nextBossAt,
          coreHp: game.ship.tiles.get("0,0") ? game.ship.tiles.get("0,0").hp : 0,
          bossHp: game.boss && !game.boss.dead ? game.boss.hp : 0,
          bossVariant: game.boss && !game.boss.dead ? game.boss.variant : null,
          bossAttackPattern: game.boss && !game.boss.dead ? game.boss.attackPattern : null,
          bossAttackCharge: game.boss && !game.boss.dead ? game.boss.attackCharge : 0,
          upgrades: JSON.parse(JSON.stringify(game.upgrades)),
          progression: JSON.parse(JSON.stringify(save.progression)),
          finished: game.finished,
          telemetry: playtestTelemetry ? playtestTelemetry.getStatus() : null
        };
      },
      addMatter: function (amount) {
        grantDebugMatter(amount);
      },
      spawnBoss: function () {
        if (DEBUG && game && !game.bossSpawned && debugActionAllowed("spawn_boss")) game.spawnBoss();
      },
      buyMeta: buyMetaForTests
    };

    resize();
    syncSettingsUi();
    renderStarterPicker();
    renderStarterSelection();
    renderMetaShop();
    updateTelemetryStatus();
    syncInstallButton();
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("./service-worker.js").catch(function () {});
    }
    if (DEBUG) runSelfTests();
    requestAnimationFrame(frame);
  })();
