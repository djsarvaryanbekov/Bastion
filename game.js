(function () {
    "use strict";

    var TAU = Math.PI * 2;
    var TILE_SIZE = 42;
    var MODULE_PROJECTILE_GRACE = .10;
    var MODULE_PLACEMENT_GRACE = .35;
    var moduleArt = window.DriftModuleArt || null;
    var enemyArt = window.DriftEnemyArt || null;
    var shipHandling = window.DriftShipHandling;
    var shieldVfx = window.DriftShieldVfx.create();
    var FIXED_STEP = 1 / 30;
    var MAX_SIMULATION_STEPS = 3;
    var SPATIAL_CELL_SIZE = 110;
    var ASSAULT_FIRST_DELAY = 4;
    var MAX_ACTIVE_ENEMIES = 420;
    var MAX_ACTIVE_PROJECTILES = 900;
    var MAX_ASSAULT_RANGED_ESCORTS = 6;
    var HEAVY_RANGED_ESCORT_START = 480;
    var ADDITIONAL_COPY_COST_SCALE = 1.20;
    var EMBER_BURST_DURATION = .2;
    var EMBER_COMBO_BURN_DAMAGE = 3;
    var EMBER_COMBO_BURN_DURATION = 1.5;
    var CRYO_SHATTER_DAMAGE_MULTIPLIER = 1.25;
    var CRYO_MISSILE_SLOW_FACTOR = .75;
    var CRYO_MISSILE_SLOW_DURATION = 1;
    var EMBER_COMBO_OFFSETS = [[1,0],[-1,0],[0,1],[0,-1]];
    var BURN_FLAME_DETAIL_BUDGETS = [32, 16, 0];
    var fireVfx = window.DriftFireVfx;
    var COLD_DETAIL_BUDGETS = [32, 16, 0];
    var coldVfx = window.DriftColdVfx;
    var SIMPLE_PROJECTILE_RENDER_BUDGETS = [180, 120, 80];
    var SAVE_VERSION = 9;
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
    var META_PURCHASE_CAP = 25;
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
        description: "Reliable kinetic fire at the nearest visible target. Edge-adjacent Ember flame bursts briefly ignite its rounds."
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
        description: "Slow homing projectile with a small blast radius. An edge-adjacent Cryo adds a cold payload: blasts slow survivors by 25% for one second."
      },
      scatter: {
        id: "scatter", name: "Scatter Array", glyph: "V", color: "#ff9b6a",
        baseCost: 24, scale: 1.21, hp: 48, mass: 1,
        range: 250, cooldown: .8, damage: 6, pellets: 5, spread: .28,
        summary: "Wide burst, strongest up close.",
        description: "Five-shot cone. Brutal up close, weak at long range. Edge-adjacent Ember flame bursts briefly ignite its pellets."
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
        description: "High-speed piercing slug. Heavy damage and knockback. An edge-adjacent Cryo enables Shatter rounds: +25% damage to chilled or frozen enemies."
      },
      flak: {
        id: "flak", name: "Flak Battery", glyph: "F", color: "#ffb15c",
        baseCost: 29, scale: 1.21, hp: 48, mass: 1.05,
        range: 360, cooldown: 1.1, damage: 7, blastRadius: 125,
        summary: "Clears enemy shots. Low damage.",
        description: "Wide anti-projectile airburst. Clears hostile shots, but deals very low damage to enemies. Edge-adjacent Ember flame bursts briefly ignite its hits."
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
        description: "Freezing bolt halves enemy speed for two seconds. Edge-adjacent Rail Lances gain Shatter; Missile Pods gain briefly chilling blasts."
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
        description: "Hits a short cone and burns for 2.5s. During each flame burst, edge-adjacent Cannon, Scatter and Flak shots also apply a minor burn."
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
        shield: 60, shieldRadius: 2.3, rechargeDelay: 6, rechargeRate: 3,
        summary: "Shields nearby modules.",
        description: "Regenerating local shield protecting nearby tiles."
      },
      repair: {
        id: "repair", name: "Repair Array", glyph: "+", color: "#7dff9b",
        baseCost: 32, scale: 1.20, hp: 50, mass: 1.15,
        repairAmount: 5, repairInterval: 1.5, repairRadius: 1.5, repairDelay: 2,
        summary: "Repairs nearby tiles out of danger.",
        description: "Repairs nearby tiles, including Repair Arrays, after 2s without hull damage. Overlapping repair areas do not stack."
      },
      reactor: {
        id: "reactor", name: "Reactor Link", glyph: "O", color: "#ffe06a",
        baseCost: 45, scale: 1.23, hp: 45, mass: 1.25,
        cooldownBonus: .25,
        summary: "Adjacent weapons fire faster.",
        description: "Weapons in the surrounding 3×3 area fire 25% faster; bonuses add."
      },
      collector: {
        id: "collector", name: "Matter Siphon", glyph: "$", color: "#a8ff70",
        baseCost: 24, scale: 1.20, hp: 38, mass: .9,
        matterBonus: .10,
        summary: "Earn more Matter from kills.",
        description: "+10% Matter; each further Siphon adds 80% of the previous bonus."
      },
      bulkhead: {
        id: "bulkhead", name: "Aegis Bulkhead", glyph: "B", color: "#9bb4c8",
        baseCost: 13, scale: 1.18, hp: 170, mass: 1.7,
        damageReduction: .12,
        summary: "Protects the surrounding 3×3 area.",
        description: "The eight surrounding tiles take 12% less hull damage, up to 48%. Does not protect itself."
      }
    };

    var WEAPON_TYPES = ["cannon", "laser", "missile", "scatter", "arc", "rail", "flak", "pulse", "cryo", "mine", "ember", "gravity"];
    // Mines need room and timing to matter, so they stay an in-run purchase.
    var START_WEAPONS = WEAPON_TYPES.slice();

    var META_DEFS = [
      { id: "modules", name: "Hull Integrity", bonusPercent: 1, unit: "core and module HP", max: 25 },
      { id: "matter", name: "Matter Converter", bonusPercent: 1, unit: "Matter income", max: 25 },
      { id: "drive", name: "Movement Tuning", bonusPercent: 1, unit: "thrust, speed and turn", max: 25 },
      { id: "damage", name: "Weapon Calibration", bonusPercent: 1, unit: "weapon damage", max: 25 }
    ];

    var ENEMY_DEFS = {
      scout: { name: "Scout", hp: 12, speed: 132, radius: 12, halfLength: 14, halfWidth: 10, damage: 4, reward: 1, color: "#ff4f67", sides: 20, directChase: true },
      drone: { name: "Swarm Drone", hp: 9, speed: 165, radius: 8, halfLength: 10, halfWidth: 7, damage: 3, reward: 1, color: "#ff5e75", sides: 0, directChase: true },
      hunter: { name: "Hunter", hp: 22, speed: 250, radius: 11, halfLength: 15, halfWidth: 8, damage: 7, reward: 2, color: "#ff9b55", sides: 3, turnRate: .48 },
      raptor: { name: "Raptor", hp: 48, speed: 340, radius: 14, halfLength: 18, halfWidth: 10, damage: 16, reward: 4, color: "#ff3ea5", sides: 3, turnRate: .22 },
      orbiter: { name: "Orbiter", hp: 34, speed: 118, radius: 13, halfLength: 14, halfWidth: 14, damage: 9, reward: 2, color: "#54dfff", sides: 4 },
      brute: { name: "Brute", hp: 62, speed: 102, radius: 19, halfLength: 18, halfWidth: 25, damage: 18, reward: 3, color: "#a987ff", sides: 24, directChase: true },
      bulwark: { name: "Bulwark", hp: 85, speed: 74, radius: 21, halfLength: 20, halfWidth: 24, damage: 18, reward: 4, color: "#9b83ff", sides: 6, shield: 45, directChase: true },
      bolter: { name: "Bolt Drone", hp: 22, speed: 78, radius: 12, halfLength: 17, halfWidth: 11, muzzleOffset: 17, damage: 5, reward: 2, color: "#72d8ff", sides: 4 },
      gunner: { name: "Gunner", hp: 40, speed: 64, radius: 14, halfLength: 15, halfWidth: 23, muzzleOffset: 16, damage: 9, reward: 3, color: "#65e8ff", sides: 4 },
      bomber: { name: "Bomber", hp: 38, speed: 104, radius: 15, halfLength: 19, halfWidth: 12, damage: 26, reward: 3, color: "#ffd45c", sides: 5, blastRadius: 2.25 },
      splitter: { name: "Splitter", hp: 56, speed: 88, radius: 16, halfLength: 18, halfWidth: 12, damage: 21, reward: 4, color: "#ffd96a", sides: 6, directChase: true },
      sniper: { name: "Sniper", hp: 46, speed: 58, radius: 16, halfLength: 28, halfWidth: 10, muzzleOffset: 28, damage: 24, reward: 5, color: "#57a7ff", sides: 4 },
      colossus: { name: "Colossus", hp: 170, speed: 70, radius: 28, halfLength: 28, halfWidth: 28, damage: 50, reward: 8, color: "#f56fff", sides: 28, directChase: true },
      mini: { name: "Shard", hp: 10, speed: 205, radius: 7, halfLength: 10, halfWidth: 5, damage: 7, reward: 1, color: "#ffca68", sides: 3, directChase: true }
    };
    var ENEMY_VISUAL_TURN_RATES = {
      scout: 3.4, drone: 4.2, hunter: 3.8, raptor: 3.2, orbiter: 3,
      brute: 2.2, bulwark: 1.8, bolter: 8, gunner: 7.5, bomber: 4,
      splitter: 2.8, sniper: 6.5, colossus: 1.2, mini: 4.5
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
      { level: 8, at: 480, packetSize: 14, ambientInterval: 2.3, squadSize: 26, directions: 5, assaultInterval: 12.5, heavySquads: 2,
        assaultRanged: 3, ambientRangedChance: .20, rangedPool: [["gunner", 75], ["sniper", 25]], heavyPool: [["brute", 55], ["bulwark", 40], ["colossus", 5]], pool: [["drone", 46], ["scout", 24], ["hunter", 10], ["raptor", 7], ["orbiter", 5], ["splitter", 4], ["bomber", 4]] },
      { level: 9, at: 540, packetSize: 16, ambientInterval: 2.1, squadSize: 28, directions: 5, assaultInterval: 12, heavySquads: 2,
        assaultRanged: 4, ambientRangedChance: .22, rangedPool: [["gunner", 60], ["sniper", 40]], heavyPool: [["brute", 50], ["bulwark", 44], ["colossus", 6]], pool: [["drone", 48], ["scout", 24], ["hunter", 8], ["raptor", 6], ["orbiter", 5], ["splitter", 5], ["bomber", 4]] },
      { level:10, at:720, packetSize:20, ambientInterval:1.8, squadSize:32, directions:5, assaultInterval:11, heavySquads:2, assaultRanged:5, ambientRangedChance:.24, rangedPool:[["bolter",40],["gunner",45],["sniper",15]], heavyPool:[["brute",40],["bulwark",40],["colossus",20]], pool:[["drone",35],["scout",15],["hunter",20],["raptor",10],["orbiter",10],["splitter",5],["bomber",5]] },
      { level:11, at:960, packetSize:22, ambientInterval:1.7, squadSize:34, directions:5, assaultInterval:10.5, heavySquads:3, assaultRanged:5, ambientRangedChance:.26, rangedPool:[["bolter",30],["gunner",50],["sniper",20]], heavyPool:[["brute",25],["bulwark",45],["colossus",30]], pool:[["drone",30],["scout",10],["hunter",20],["raptor",15],["orbiter",10],["splitter",10],["bomber",5]] },
      { level:12, at:1200, packetSize:24, ambientInterval:1.6, squadSize:36, directions:6, assaultInterval:10, heavySquads:3, assaultRanged:6, ambientRangedChance:.28, rangedPool:[["bolter",25],["gunner",50],["sniper",25]], heavyPool:[["brute",20],["bulwark",40],["colossus",40]], pool:[["drone",25],["scout",10],["hunter",20],["raptor",20],["orbiter",10],["splitter",10],["bomber",5]] }
    ];

    var BOSS_SPAWN_TIME = 180;
    var BOSS_WARNING_LEAD = 5;
    var BOSS_REPEAT_INTERVAL = 210;
    var SURVIVAL_DURATION = 600;
    var SURVIVAL_BOSS_TIMES = [120, 330, 570];
    var BOSS_RECOVERY_SECONDS = 8;
    var BOSS_BASE_HP = 3200;
    var SURVIVAL_BOSS_HP = [BOSS_BASE_HP, 16000, 42000];

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
      crashOverlay: document.getElementById("crashOverlay"),
      crashSubtitle: document.getElementById("crashSubtitle"),
      crashDetails: document.getElementById("crashDetails"),
      crashCopyButton: document.getElementById("crashCopyButton"),
      crashReloadButton: document.getElementById("crashReloadButton"),
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
      "startRunMode",
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
      return 1 + Math.floor(level / 5);
    }

    function selectedCoreRanks() { return save.campaign.coreRanks[save.campaign.selectedCore]; }
    function coreBonus(stat, neutral) {
      if (neutral) return 0;
      return selectedCoreRanks()[stat] * .01 + (save.campaign.legacyBonuses[save.campaign.selectedCore][stat] || 0);
    }

    function runFragmentReward(kills, elapsed, bosses, completed) {
      return progression.runReward({ kills: kills, elapsed: elapsed, bosses: bosses, completed: completed === true });
    }

    function settleFragmentReward(run) {
      return progression.settleRunReward({ kills: run.kills, elapsed: run.elapsed, bosses: run.bossesDefeated,
        killsByMinute: run.killsByMinute }, save.fragmentCarryUnits);
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
      ["core","modules","matter","drive","damage"].forEach(function (id) {
        clean.meta[id] = Math.round(clamp(Number(parsed.meta && parsed.meta[id]) || 0, 0, 10));
      });

      if (!parsed.campaign || !parsed.campaign.coreRanks) {
        campaign.cores.forEach(function(core) {
          if (!campaign.isCoreOwned(clean.campaign, core.id)) return;
          var legacy = parsed.meta || {};
          var ranks = clean.campaign.coreRanks[core.id];
          ranks.modules = Math.min(25, Math.max(Math.round((Number(legacy.modules) || 0) * 5), Math.ceil((Number(legacy.core) || 0) * 1000 / 350)));
          ranks.damage = Math.min(25, Math.round((Number(legacy.damage) || 0) * 4));
          ranks.drive = Math.min(25, Math.round((Number(legacy.drive) || 0) * 3));
          ranks.matter = Math.min(25, Math.round((Number(legacy.matter) || 0) * 5));
          var retained=clean.campaign.legacyBonuses[core.id];
          retained.modules=Math.max(0,Math.max((Number(legacy.modules)||0)*.05,(Number(legacy.core)||0)*10/350)-ranks.modules*.01);
          retained.damage=Math.max(0,(Number(legacy.damage)||0)*.04-ranks.damage*.01);
          retained.drive=Math.max(0,(Number(legacy.drive)||0)*.03-ranks.drive*.01);
          retained.matter=Math.max(0,(Number(legacy.matter)||0)*.05-ranks.matter*.01);
        });
      }
      if (Number(parsed.version) < 9 && parsed.progression && Array.isArray(parsed.progression.purchasedModules) && parsed.progression.purchasedModules.indexOf("drive") >= 0) clean.fragments += 36;
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
      if (game && game.testRange) return;
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

    var save = loadSave();
    var audio = window.DriftCombatAudio.create();
    var combatFeedback = window.DriftCombatFeedback;
    var shipDebris = window.DriftShipDebris;
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
    var mouseInput = { active: false, pointerId: null, x: 0, y: 0 };
    var selectedHangarModule = "cannon";
    var newModuleBadges = new Set();
    var dpr = 1;
    var viewWidth = innerWidth;
    var viewHeight = innerHeight;
    var stars = [];
    var backgroundGradient = null;

    function currentQualityTier() {
      return save.settings.qualityTier;
    }

    function moduleAvailable(type) {
      if (game && game.testRange) return Boolean(MODULES[type]);
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
        upgradeWorkspaceOpen: document.body.classList.contains("pc-game")
          ? document.querySelector(".build-panel").classList.contains("pc-tree-open") : undefined,
        cannonCost: modulePrice("cannon"), cannonUpgradeCost: upgradeOptions.length ? upgradeOptions[0].cost : null,
        cannonDamageBonusPercent: Math.round((cannonDef.damage / MODULES.cannon.damage - 1) * 100),
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
      audio.stop();
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
        showSettingsPage(false);
        ui.pauseEyebrow.textContent = "RUN PRESERVED";
        ui.pauseTitle.textContent = "Paused";
        ui.resumeButton.textContent = "Resume [P]";
        ui.restartButton.classList.add("hidden");
        ui.pauseHangarButton.classList.remove("hidden");
        ui.pauseHangarButton.textContent = "End run";
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
      var viewport = document.getElementById("pcViewport");
      viewWidth = viewport ? viewport.clientWidth : innerWidth;
      viewHeight = viewport ? viewport.clientHeight : innerHeight;
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

    function showToast(message) {
      ui.toast.classList.remove("success");
      ui.toast.textContent = message;
      ui.toast.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () {
        ui.toast.classList.remove("show");
      }, 1500);
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
      if (game && game.testRange) return 0;
      var def = MODULES[type];
      var copies = installedModuleCopies(type);
      // Keep the first two copies accessible; larger fleets require more investment.
      var additionalCopyScale = Math.pow(ADDITIONAL_COPY_COST_SCALE, Math.max(0, copies - 1));
      return Math.ceil(def.baseCost * Math.pow(def.scale, copies) * additionalCopyScale) + runUpgrades.investment(type, game && game.upgrades[type]);
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
      var artwork = moduleArt && moduleArt.iconHtml(type);
      if (artwork) return artwork;
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

    function renderHangarModuleDetails() {
      var panel = document.getElementById("hangarModuleDetails");
      if (!panel) return;
      var type = selectedHangarModule;
      var def = MODULES[type];
      var state = progression.status(save.progression, type);
      panel.innerHTML = "";
      var art = document.createElement("div");
      art.className = "armory-detail-art";
      art.innerHTML = moduleArt && moduleArt.iconHtml ? moduleArt.iconHtml(type) : moduleGlyphHtml(type);
      var label = document.createElement("span");
      label.className = "eyebrow";
      label.textContent = state.owned ? "UNLOCKED MODULE" : state.available ? "MODULE LICENSE" : "LOCKED MODULE";
      var title = document.createElement("h3");
      title.textContent = def.name;
      var description = document.createElement("p");
      description.className = "armory-detail-description";
      description.textContent = def.description || def.summary;
      var status = document.createElement("p");
      status.className = "armory-detail-status";
      if (state.owned) status.textContent = selectedStarter === type ? "Equipped for your next run" : "Available in Build for Matter";
      else if (!state.available) status.textContent = state.objective ? state.objective.text : "Complete the unlock objective";
      else if (save.fragments < state.cost) status.textContent = "Need " + Math.ceil(state.cost - save.fragments) + " more Fragments";
      [art, label, title, description].forEach(function (node) { panel.appendChild(node); });
      if (status.textContent) panel.appendChild(status);
      var actions = document.createElement("div");
      actions.className = "armory-detail-actions";
      if (state.owned && isStarterWeapon(type) && selectedStarter !== type) {
        var equip = document.createElement("button");
        equip.type = "button"; equip.className = "primary armory-detail-action"; equip.textContent = "Use as starting weapon";
        equip.addEventListener("click", function () { selectStarter(type); renderHangarModuleDetails(); });
        actions.appendChild(equip);
      } else if (!state.owned) {
        var buy = document.createElement("button");
        buy.type = "button"; buy.className = "primary armory-detail-action";
        buy.textContent = "Unlock · " + state.cost + " Fragments";
        buy.disabled = !state.available || save.fragments < state.cost;
        buy.addEventListener("click", function () { if (buyModuleUnlock(type)) renderHangarModuleDetails(); });
        actions.appendChild(buy);
      }
      var range = document.createElement("button");
      range.type = "button"; range.className = "secondary armory-detail-action";
      range.textContent = "Test in range ↗";
      range.addEventListener("click", function () { startRange(type); });
      actions.appendChild(range);
      panel.appendChild(actions);
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
        var button = document.createElement("button");
        button.type = "button";
        button.dataset.module = type;
        button.className = "pick-button" + (selectedHangarModule === type ? " selected" : "") + (state.owned ? " owned" : (state.available ? " available" : " locked"));
        button.setAttribute("aria-pressed", String(selectedHangarModule === type));
        button.title = def.description;
        button.innerHTML = moduleGlyphHtml(type) + '<strong>' + def.name + '</strong><span class="pick-role">' + def.summary + '</span>';
        if (newModuleBadges.has(type)) button.innerHTML += '<span class="new-unlock">NEW</span>';
        if (state.owned) {
          button.innerHTML += '<span class="ownership-state">' + (selectedStarter === type ? "Starting weapon" : "Unlocked") + '</span>';
        } else {
          if (!state.available && objective) {
            var definition = progression.definitions.find(function (item) { return item.type === type; });
            var labels = { totalKills: "Total kills", bestTime: "Best survival", bossesDefeated: "Bosses defeated", totalUpgrades: "Weapon upgrades" };
            var progressLabel = labels[definition.stat];
            var count = definition.stat === "bestTime" ? formatTime(objective.current) + " / " + formatTime(objective.target) : Math.floor(objective.current) + " / " + objective.target;
            button.innerHTML += '<span class="unlock-requirement">' + progressLabel + ': ' + count + '</span>';
          }
          button.innerHTML += '<span class="module-unlock-cost">' + state.cost + ' Fragments</span>';
          if (state.available && save.fragments < state.cost) button.innerHTML += '<span class="unlock-requirement">Need ' + Math.ceil(state.cost - save.fragments) + ' more Fragments</span>';
        }
        button.addEventListener("click", function () {
          selectedHangarModule = type;
          newModuleBadges.delete(type);
          ui.weaponPicker.querySelectorAll(".pick-button").forEach(function (card) {
            var selected = card.dataset.module === type;
            card.classList.toggle("selected", selected);
            card.setAttribute("aria-pressed", String(selected));
            if (selected) { var badge = card.querySelector(".new-unlock"); if (badge) badge.remove(); }
          });
          renderHangarModuleDetails();
        });
        ui.weaponPicker.appendChild(button);
      });
      renderHangarModuleDetails();
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
        button.dataset.module = offer.type;
        button.innerHTML = moduleGlyphHtml(offer.type) + '<span class="result-purchase-copy"><strong>' + MODULES[offer.type].name +
          '</strong><span>' + offer.cost + ' Fragments' + (offer.newlyAvailable ? ' · Discovered this run' : '') +
          '</span></span><span class="result-purchase-action">View in Hangar →</span>';
        button.addEventListener("click", function () { selectedHangarModule = offer.type; exitToHangar(); });
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
      document.getElementById("hangarStatusSummary").textContent = ownedCount + " unlocked · " + model.affordableCount + " affordable";
    }

    Game.prototype.recordProgress = function (delta) {
      if (this !== game || this.training) return;
      var unlocked = progression.apply(save.progression, delta);
      if (!unlocked.length) return;
      Array.prototype.push.apply(this.runUnlocks, unlocked);
      unlocked.forEach(function (type) { newModuleBadges.add(type); });
      storeSave();
      renderObjectives();
    };

    function renderCores() {
      ui.startRunMode.textContent = "";
      ui.startButton.disabled = false;
      ui.startWeaponRole.textContent = campaign.getCore(save.campaign.selectedCore).name;
      ui.corePicker.dataset.restoreFocus = String(Boolean(ui.corePicker.contains && ui.corePicker.contains(document.activeElement)));
      ui.corePicker.innerHTML = "";
      campaign.cores.forEach(function (core) {
        var owned = campaign.isCoreOwned(save.campaign, core.id);
        var available = campaign.isCoreAvailable(save.campaign, core.id, save.progression);
        var selectedCore = save.campaign.selectedCore === core.id;
        var button = document.createElement("button");
        button.className = "core-card" + (selectedCore ? " selected" : "");
        button.dataset.core = core.id;
        button.dataset.reason = game && !game.finished ? "Finish the active run to change cores." : !owned && !available ? campaign.coreRequirementText(core.id) : !owned && save.fragments < core.cost ? "Need " + Math.ceil(core.cost - save.fragments) + " more Fragments." : "";
        button.style.borderLeft = "3px solid " + CORE_COLORS[core.id];
        button.disabled = Boolean(game && !game.finished) || !owned && (!available || save.fragments < core.cost);
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
      if (window.DriftPCSystems) window.DriftPCSystems.cores(ui.corePicker);
    }

    var selectedBranchWeapon = "cannon";
    var selectedShopBranch = null;
    function renderBranchShop() {
      var types = Object.keys(runUpgrades.trees).filter(function (type) { return progression.isUnlocked(save.progression, type) && runUpgrades.trees[type].branches.length; });
      var panel = document.getElementById("branchList");
      if (!types.length) { panel.innerHTML = ""; return; }
      if (types.indexOf(selectedBranchWeapon) < 0) selectedBranchWeapon = types[0];
      var type = selectedBranchWeapon;
      window.DriftUpgradeTreeView.renderShop(panel, {
        upgrades: runUpgrades, definitions: MODULES, types: types, type: type, branch: selectedShopBranch,
        fragments: Math.floor(save.fragments), licenses: save.progression.branchLicenses, activeRun: Boolean(game && !game.finished),
        onType: function (value) { selectedBranchWeapon = value; selectedShopBranch = null; renderBranchShop(); document.getElementById("branchWeaponSelect").focus(); },
        onSelect: function (id) { selectedShopBranch = id; },
        onBuy: function (id) {
          var branch = runUpgrades.trees[type].branches.find(function (entry) { return entry.id === id; });
          if (!branch || game && !game.finished || save.fragments < branch.fragmentCost) return;
          var key = type + ":" + id;
          if (save.progression.branchLicenses.indexOf(key) >= 0) return;
          if (branch.parent && save.progression.branchLicenses.indexOf(type + ":" + branch.parent) < 0) return;
          save.fragments -= branch.fragmentCost;
          save.progression.branchLicenses.push(key);
          storeSave(); renderMetaShop();
        }
      });
    }

    function renderMetaShop() {
      ui.fragmentCount.textContent = Math.floor(save.fragments);
      ui.menuFragmentCount.textContent = Math.floor(save.fragments);
      ui.bestRun.textContent = "BEST " + formatTime(save.bestTime);
      ui.victoryCount.textContent = save.progression.bossesDefeated + " BOSSES DEFEATED";
      renderObjectives();
      ui.metaList.dataset.restoreFocus = String(Boolean(ui.metaList.contains && ui.metaList.contains(document.activeElement)));
      ui.metaList.innerHTML = "";
      META_DEFS.forEach(function (def) {
        var level = selectedCoreRanks()[def.id];
        var cost = metaCost(level);
        var button = document.createElement("button");
        button.dataset.meta = def.id;
        button.dataset.reason = game && !game.finished ? "Finish the active run to calibrate this core." : level >= META_PURCHASE_CAP ? "Maximum rank reached." : save.fragments < cost ? "Need " + Math.ceil(cost - save.fragments) + " more Fragments." : "";
        button.className = "meta-card" + (def.legacy && !level ? " hidden" : "");
        button.disabled = Boolean(game && !game.finished) || def.legacy || level >= META_PURCHASE_CAP || save.fragments < cost;
        var effect = def.legacy ? def.description : progressionView.buildMetaComparison(level, META_PURCHASE_CAP, def.bonusPercent, def.unit).text;
        button.innerHTML = "<strong>" + def.name + " &nbsp; " + level + "/" + Math.max(level, META_PURCHASE_CAP) + '</strong><small class="meta-effect">' + effect +
          '</small><small class="meta-scope">Selected core only</small><span class="meta-price">' + (def.legacy ? "RETAINED" : (level >= META_PURCHASE_CAP ? "MAX" : "Buy · " + cost + " F")) + "</span>";
        button.addEventListener("click", function () {
          if ((game && !game.finished) || def.legacy || selectedCoreRanks()[def.id] >= META_PURCHASE_CAP) return;
          var currentCost = metaCost(selectedCoreRanks()[def.id]);
          if (save.fragments < currentCost) return;
          save.fragments -= currentCost;
          selectedCoreRanks()[def.id] += 1;
          storeSave();
          audio.tone(330, .16, .045, "sine", 360);
          renderMetaShop();
          renderStarterPicker();
        });
        ui.metaList.appendChild(button);
      });
      if (window.DriftPCSystems) window.DriftPCSystems.ranks(ui.metaList);
      renderCores();
      renderBranchShop();
    }

    function makeTile(type, x, y, isCore, durabilityMultiplier, neutralStats) {
      var def = isCore ? { hp: 350, mass: 1.5 } : MODULES[type];
      var hpMultiplier = (1 + coreBonus("modules", neutralStats)) * (durabilityMultiplier || 1);
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
        placementProtectedUntil: 0,
        projectileHitProtectedUntil: 0,
        flash: 0
      };
    }

    function Game(options) {
      this.training = Boolean(options && options.training);
      this.attackVfx = window.DriftAttackVfx ? window.DriftAttackVfx.create() : null;
      this.weaponFeedback = window.DriftWeaponFeedback.create();
      this.state = "playing";
      this.coreDef = campaign.getCore(this.training ? "standard" : save.campaign.selectedCore);
      this.coreRanks = Object.assign({}, selectedCoreRanks());
      this.legacyCoreBonuses = Object.assign({}, save.campaign.legacyBonuses[save.campaign.selectedCore]);
      this.survivalCompleted = false;
      this.continued = true;
      this.ship = {
        x: 0, y: 0, angle: 0,
        vx: 0, vy: 0, angularVelocity: 0,
        tiles: new Map()
      };
      this.handling = {};
      this.ship.tiles.set("0,0", makeTile("core", 0, 0, true, 1, this.training));
      var startingCore = this.ship.tiles.get("0,0");
      startingCore.maxHp *= this.coreDef.hpMultiplier;
      startingCore.hp = startingCore.maxHp;
      this.purchasedCounts = {};
      Object.keys(MODULES).forEach(function (type) { this.purchasedCounts[type] = 0; }, this);
      (this.training ? new Map([["0,-1", "cannon"]]) : starterTiles).forEach(function (type, key) {
        var coord = parseKey(key);
        this.ship.tiles.set(key, makeTile(type, coord.x, coord.y, false, this.training ? 1 : this.coreDef.moduleHpMultiplier, this.training));
        this.purchasedCounts[type] += 1;
      }, this);
      // Family upgrades survive losses; destroying copies must not discount those upgrades.
      this.upgradeFleetSizes = Object.assign({}, this.purchasedCounts);
      this.matter = 0;
      this.upgrades = {};
      this.weaponDefinitions = {};
      Object.keys(MODULES).forEach(function (type) { this.weaponDefinitions[type] = runUpgrades.resolve(MODULES[type]); }, this);
      this.runUnlocks = [];
      this.progressSaveAt = 5;
      this.kills = 0;
      this.killsByMinute = [];
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
      this.weaponAreas = [];
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
      this.projectileHitBuffer = [];
      this.projectileHitCount = 0;
      this.maxEnemyCollisionRadius = 0;
      this.shieldBuffer = [];
      this.enemyPool = [];
      this.projectilePool = [];
      this.particlePool = [];
      this.effectPool = [];
      this.backgroundPulse = 0;
      this.shakeTrauma = 0;
      this.damageVignette = 0;
      this.deathFeedbackTime = 0;
      this.damageWarningTimer = 0;
      this.damageWarningText = "";
      this.coreWarningStage = 0;
      this.telegraphSoundClock = 0;
      this.separationClock = 0;
      if (!this.training) this.spawnAssaultWave(true);
    }

    Game.prototype.coreBonus = function(stat) {
      if (this.training) return 0;
      return (this.coreRanks[stat] || 0)*.01 + (this.legacyCoreBonuses[stat] || 0);
    };
    Game.prototype.applyFamilyTileStats = function(tile, newlyBuilt) {
      var def = this.weaponDefinitions[tile.type];
      if (!def) return;
      var hpRatio = tile.maxHp > 0 ? tile.hp / tile.maxHp : 0;
      var shieldRatio = tile.maxShield > 0 ? tile.shield / tile.maxShield : 0;
      tile.maxHp = def.hp * (1 + this.coreBonus("modules")) * this.coreDef.moduleHpMultiplier;
      tile.hp = tile.maxHp * (newlyBuilt ? 1 : hpRatio);
      if (tile.type === "shield") { tile.maxShield = def.shield; tile.shield = tile.maxShield * (newlyBuilt ? 1 : shieldRatio); }
    };
    Game.prototype.refreshFamilyTiles = function(type, newlyBuilt) {
      this.ship.tiles.forEach(function(tile) { if (tile.type === type) this.applyFamilyTileStats(tile, newlyBuilt); }, this);
    };

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
      return (1 + this.coreBonus("drive")) * this.coreDef.speedMultiplier;
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
      enemy.id = this.enemyId++;
      enemy.type = type;
      enemy.trainingTarget = null;
      enemy.x = x;
      enemy.y = y;
      enemy.vx = 0;
      enemy.vy = 0;
      enemy.hp = def.hp;
      enemy.maxHp = enemy.hp;
      enemy.shield = def.shield || 0;
      enemy.maxShield = enemy.shield;
      enemy.speed = def.speed;
      enemy.radius = def.radius;
      enemy.halfLength = def.halfLength || def.radius;
      enemy.halfWidth = def.halfWidth || def.radius;
      enemy.collisionRadius = Math.hypot(enemy.halfLength, enemy.halfWidth);
      enemy.muzzleOffset = def.muzzleOffset || enemy.halfLength;
      enemy.damage = def.damage;
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
      var initialFacing = this.ship
        ? Math.atan2(this.ship.y - y, this.ship.x - x)
        : 0;
      enemy.rotation = initialFacing;
      enemy.visualRotation = initialFacing;
      enemy.visualTurnRate = ENEMY_VISUAL_TURN_RATES[type] || 3;
      enemy.hitFlash = 0;
      enemy.nextHitFeedbackAt = 0;
      enemy.slowTimer = 0;
      enemy.slowFactor = 1;
      enemy.burnTimer = 0;
      enemy.burnDamage = 0;
      enemy.burnTickTime = 0;
      enemy.freezeHitTimes = []; enemy.freezeUntil = 0; enemy.freezeImmuneUntil = 0; enemy.spreadBurn = false;
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
      return Math.min(10, Math.floor(Math.max(0, (this.elapsed || 0) - 600) / 90));
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
        var heavyEscortCount = this.elapsed >= HEAVY_RANGED_ESCORT_START ? 1 : 0;
        var rangedCount = openingWave ? 0 : Math.min(heavy ? heavyEscortCount : phase.assaultRanged, MAX_ASSAULT_RANGED_ESCORTS, members);
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
      if (this.training && !this.testRange) return;
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
      var endlessEncounter = Math.max(0, encounterLevel - (SURVIVAL_BOSS_HP.length - 1));
      var hp = encounterLevel < SURVIVAL_BOSS_HP.length ? SURVIVAL_BOSS_HP[encounterLevel]
        : Math.min(100000000, Math.round(SURVIVAL_BOSS_HP[SURVIVAL_BOSS_HP.length - 1] *
          (1 + endlessEncounter * .65 + endlessEncounter * endlessEncounter * .12)));
      var attackDamage = 18 * Math.min(4, 1 + encounterLevel * .08);
      this.compactEnemies();
      // The boss has one reserved slot; existing living enemies stay in the arena.
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
        sides: variant === "pursuer" ? 3 : (variant === "storm" ? 8 : 12),
        combatPhase: 1,
        fireClock: 1.2,
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
      var handling = shipHandling.measure(ship.tiles, this.handling);
      var mass = handling.mass;
      var massFactor = clamp(1 / (1 + .035 * Math.max(0, mass - 4)), .52, 1);
      var drive = this.driveMultiplier();
      var maxSpeed = 230 * massFactor * drive;
      var acceleration = 430 * massFactor * drive;
      var turnRate = 2.45 * clamp(massFactor + .08, .58, 1) * drive * handling.turnMultiplier;
      var turnResponse = 10 * handling.responseMultiplier;
      // Match pointer gain to turn response so heavier shapes still settle on their heading.
      var steeringGain = 7.5 * handling.responseMultiplier;
      var mobileSteering = mobileInput.active;
      var mouseSteering = mouseInput.active;
      var mouseX = 0, mouseY = 0, mouseDistance = 0;
      if (mouseSteering) {
        var zoom = this.camera.zoom || 1;
        // Screen-space distances keep the steering feel consistent as the fleet zooms out.
        mouseX = mouseInput.x - (viewWidth / 2 + (ship.x - this.camera.x) * zoom - (this.testRange ? Math.min(140, viewWidth * .12) * zoom : 0));
        mouseY = mouseInput.y - (viewHeight / 2 + (ship.y - this.camera.y) * zoom);
        mouseDistance = Math.hypot(mouseX, mouseY);
      }
      var thrust = 0;
      var targetAngular = 0;
      if (mouseSteering) {
        var mouseDeadZone = 12;
        var mouseFullSpeedDistance = 120;
        if (mouseDistance > mouseDeadZone) {
          var mouseStrength = clamp((mouseDistance - mouseDeadZone) / (mouseFullSpeedDistance - mouseDeadZone), 0, 1);
          thrust = mouseStrength * mouseStrength * (3 - 2 * mouseStrength);
          var mouseAngle = Math.atan2(mouseX, -mouseY);
          var mouseAngleDelta = Math.atan2(Math.sin(mouseAngle - ship.angle), Math.cos(mouseAngle - ship.angle));
          targetAngular = clamp(mouseAngleDelta * steeringGain, -turnRate, turnRate);
          thrust *= Math.max(0, Math.cos(mouseAngleDelta));
        }
      } else if (mobileSteering) {
        var desiredAngle = Math.atan2(mobileInput.x, -mobileInput.y);
        var angleDelta = Math.atan2(Math.sin(desiredAngle - ship.angle), Math.cos(desiredAngle - ship.angle));
        targetAngular = mobileInput.magnitude > .08 ? clamp(angleDelta * steeringGain, -turnRate, turnRate) : 0;
        thrust = mobileInput.magnitude > .08 ? mobileInput.magnitude * Math.max(0, Math.cos(angleDelta)) : 0;
      } else {
        var turnInput = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
        targetAngular = turnInput * turnRate;
        thrust = keys.KeyW && keys.KeyS ? 0 : (keys.KeyW ? 1 : 0) - (keys.KeyS ? .58 : 0);
      }
      ship.angularVelocity = clamp(lerp(ship.angularVelocity, targetAngular, 1 - Math.exp(-turnResponse * dt)), -turnRate, turnRate);
      ship.angle += ship.angularVelocity * dt;
      if (thrust !== 0) {
        // Every input drives the same forward/reverse engine; none can strafe past the turn limit.
        ship.vx += Math.sin(ship.angle) * acceleration * thrust * dt;
        ship.vy -= Math.cos(ship.angle) * acceleration * thrust * dt;
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
      if (shipDebris) shipDebris.release(effect);
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
      effect.moduleType = null;
      effect.weaponType = null;
      effect.coldPayload = false;
      effect.moduleAim = 0;
      effect.enemyType = null;
      effect.fragment = 0;
      effect.fragmentCount = 0;
      effect.points = null;
      effect.chunk = null;
      effect.muzzleX = null;
      effect.muzzleY = null;
      effect.incendiary = false;
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
      var shieldDef = this.weaponDefinitions ? this.weaponDefinitions.shield : MODULES.shield, repairDef = this.weaponDefinitions ? this.weaponDefinitions.repair : MODULES.repair;
      this.ship.tiles.forEach(function (tile) {
        tile.flash = Math.max(0, tile.flash - dt);
        tile.upgradeFlash = Math.max(0, (tile.upgradeFlash || 0) - dt);
        tile.reserveCooldown = Math.max(0,(tile.reserveCooldown || 0)-dt);
        tile.reserveLife = Math.max(0,(tile.reserveLife || 0)-dt);
        if (!tile.reserveLife) tile.reserveCharge = 0;
        tile.repairDelay = Math.max(0, tile.repairDelay - dt);
        tile.repairCooldown = Math.max(0, (tile.repairCooldown || 0) - dt);
        if (tile.type !== "shield") return;
        var rechargeTime = Math.max(0, dt - tile.shieldDelay);
        tile.shieldDelay = Math.max(0, tile.shieldDelay - dt);
        if (rechargeTime > 0) tile.shield = Math.min(tile.maxShield, tile.shield + shieldDef.rechargeRate * rechargeTime);
      });
    };

    Game.prototype.updateSupportModules = function (dt) {
      var shieldDef = this.weaponDefinitions ? this.weaponDefinitions.shield : MODULES.shield, repairDef = this.weaponDefinitions ? this.weaponDefinitions.repair : MODULES.repair;
      this.ship.tiles.forEach(function (module) {
        if (module.type !== "repair") return;
        module.supportClock -= dt;
        if (module.supportClock > 0) return;
        var repaired = false;
        var emergencyTarget = null;
        this.ship.tiles.forEach(function (target) {
          var dx = module.x - target.x;
          var dy = module.y - target.y;
          var radius = repairDef.repairRadius;
          if (dx * dx + dy * dy > radius * radius || target.hp >= target.maxHp || target.repairDelay > 0 || target.repairCooldown > 0) return;
          if (!emergencyTarget || target.hp / target.maxHp < emergencyTarget.hp / emergencyTarget.maxHp) emergencyTarget = target;
          target.hp = Math.min(target.maxHp, target.hp + repairDef.repairAmount);
          target.repairCooldown = repairDef.repairInterval;
          repaired = true;
        });
        if (emergencyTarget && repairDef.emergencyRepair) emergencyTarget.hp = Math.min(emergencyTarget.maxHp, emergencyTarget.hp + repairDef.emergencyRepair);
        module.supportClock = repaired ? repairDef.repairInterval : .2;
        if (repaired && this.effects.length < 120) {
          var origin = this.gridToWorld(module.x, module.y);
          var repairEffect = this.spawnEffect("ring", origin.x, origin.y, .35, repairDef.color);
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

    function receivesEmberCombo(type) {
      return type === "cannon" || type === "scatter" || type === "flak";
    }

    Game.prototype.hasActiveEmberNeighbor = function (tile) {
      if (!receivesEmberCombo(tile.type)) return false;
      for (var i = 0; i < EMBER_COMBO_OFFSETS.length; i += 1) {
        var neighbor = this.ship.tiles.get(keyOf(tile.x + EMBER_COMBO_OFFSETS[i][0], tile.y + EMBER_COMBO_OFFSETS[i][1]));
        if (neighbor && neighbor.type === "ember" && neighbor.emberActiveTime > 1e-6) return true;
      }
      return false;
    };

    Game.prototype.applyEmberComboBurn = function (enemy) {
      if (enemy.dead || (enemy.burnTimer > 0 && enemy.burnDamage > EMBER_COMBO_BURN_DAMAGE)) return;
      if (!(enemy.burnTimer > 0)) enemy.burnTickTime = 0;
      enemy.burnDamage = EMBER_COMBO_BURN_DAMAGE;
      enemy.burnTimer = Math.max(enemy.burnTimer || 0, EMBER_COMBO_BURN_DURATION);
      enemy.spreadBurn = false;
    };

    function receivesCryoCombo(type) {
      return type === "rail" || type === "missile";
    }

    Game.prototype.hasCryoNeighbor = function (tile) {
      return receivesCryoCombo(tile.type) && this.ship.tiles.get(keyOf(tile.x, tile.y)) === tile &&
        this.countAdjacentType(tile, "cryo") > 0;
    };

    Game.prototype.applyMissileChill = function (enemy) {
      if (enemy.dead) return;
      var factor = enemy.type === "boss" ? Math.max(.8, CRYO_MISSILE_SLOW_FACTOR) : CRYO_MISSILE_SLOW_FACTOR;
      var active = enemy.slowTimer > 0;
      // A weak payload must not keep a stronger direct Cryo hit alive.
      if (active && enemy.slowFactor < factor) return;
      enemy.slowTimer = active && enemy.slowFactor === factor ?
        Math.max(enemy.slowTimer, CRYO_MISSILE_SLOW_DURATION) : CRYO_MISSILE_SLOW_DURATION;
      enemy.slowFactor = factor;
    };

    Game.prototype.spawnCryoShatter = function (enemy, x, y, angle) {
      if (this.effects.length >= (currentQualityTier() > 1 ? 65 : (currentQualityTier() > 0 ? 90 : 120))) return;
      var effect = this.spawnEffect("cryoShatter", x, y, .24, MODULES.cryo.color);
      effect.radius = Math.min(32, enemyCollisionRadius(enemy) * .65 + 8);
      effect.angle = angle;
    };

    Game.prototype.weaponCooldownRate = function (tile) {
      var reactors = 0;
      for (var y = -1; y <= 1; y += 1) for (var x = -1; x <= 1; x += 1) {
        if (!x && !y) continue;
        var neighbor = this.ship.tiles.get(keyOf(tile.x + x, tile.y + y));
        if (neighbor && neighbor.type === "reactor") reactors += 1;
      }
      return (1 + reactors * this.weaponDefinitions.reactor.cooldownBonus) / this.coreDef.cooldownMultiplier;
    };

    Game.prototype.matterIncomeMultiplier = function () {
      var collectors = 0;
      this.ship.tiles.forEach(function (tile) {
        if (tile.type === "collector") collectors += 1;
      });
      return (1 + this.coreBonus("matter") + this.weaponDefinitions.collector.matterBonus * (1 - Math.pow(.8, collectors)) / .2) * this.coreDef.matterMultiplier;
    };

    Game.prototype.bulkheadReduction = function (target) {
      var bulkheads = 0;
      for (var y = -1; y <= 1; y += 1) for (var x = -1; x <= 1; x += 1) {
        if (!x && !y) continue;
        var neighbor = this.ship.tiles.get(keyOf(target.x + x, target.y + y));
        if (neighbor && neighbor.type === "bulkhead") bulkheads += 1;
      }
      return Math.min(.48, bulkheads * MODULES.bulkhead.damageReduction);
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
      var bossPressure = .6;
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
      var halfSize = TILE_SIZE / 2;
      var limit = radius + halfSize;
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
          var edgeX = Math.max(0, Math.abs(dx) - halfSize);
          var edgeY = Math.max(0, Math.abs(dy) - halfSize);
          if (edgeX * edgeX + edgeY * edgeY <= radius * radius && d2 < bestDistance) {
            bestDistance = d2;
            bestKey = key;
          }
        }
      }
      return bestKey;
    };

    function sweptCircleHitTime(startX, startY, endX, endY, centerX, centerY, radius) {
      var dx = endX - startX, dy = endY - startY;
      var relativeX = startX - centerX, relativeY = startY - centerY;
      var distanceFromEdge = relativeX * relativeX + relativeY * relativeY - radius * radius;
      if (distanceFromEdge <= 0) return 0;
      var speedSquared = dx * dx + dy * dy;
      if (speedSquared === 0) return -1;
      var projection = relativeX * dx + relativeY * dy;
      var discriminant = projection * projection - speedSquared * distanceFromEdge;
      if (discriminant < 0) return -1;
      var time = (-projection - Math.sqrt(discriminant)) / speedSquared;
      return time >= 0 && time <= 1 ? time : -1;
    }

    function sweptRectangleHitTime(startX, startY, endX, endY, centerX, centerY, halfX, halfY, radius) {
      var extentX = halfX + radius, extentY = halfY + radius;
      var dx = endX - startX, dy = endY - startY;
      var relativeX = startX - centerX, relativeY = startY - centerY;
      var entry = 0, exit = 1;
      if (Math.abs(dx) < 1e-10) {
        if (Math.abs(relativeX) > extentX) return -1;
      } else {
        var x1 = (-extentX - relativeX) / dx, x2 = (extentX - relativeX) / dx;
        entry = Math.max(entry, Math.min(x1, x2));
        exit = Math.min(exit, Math.max(x1, x2));
      }
      if (Math.abs(dy) < 1e-10) {
        if (Math.abs(relativeY) > extentY) return -1;
      } else {
        var y1 = (-extentY - relativeY) / dy, y2 = (extentY - relativeY) / dy;
        entry = Math.max(entry, Math.min(y1, y2));
        exit = Math.min(exit, Math.max(y1, y2));
      }
      if (entry > exit) return -1;
      var hitX = relativeX + dx * entry, hitY = relativeY + dy * entry;
      var edgeX = Math.max(0, Math.abs(hitX) - halfX);
      var edgeY = Math.max(0, Math.abs(hitY) - halfY);
      if (edgeX * edgeX + edgeY * edgeY <= radius * radius + 1e-9) return entry;

      // Only the projectile's circular radius rounds the hull's swept corners.
      var cornerX = hitX < 0 ? -halfX : halfX;
      var cornerY = hitY < 0 ? -halfY : halfY;
      var time = sweptCircleHitTime(relativeX, relativeY, endX - centerX, endY - centerY,
        cornerX, cornerY, radius);
      return time >= entry - 1e-9 && time <= exit + 1e-9 ? Math.max(entry, time) : -1;
    }

    Game.prototype.findProjectileImpact = function (startX, startY, endX, endY, radius, ignoredKeys) {
      var cos = Math.cos(this.ship.angle), sin = Math.sin(this.ship.angle);
      var worldStartX = startX - this.ship.x, worldStartY = startY - this.ship.y;
      var worldEndX = endX - this.ship.x, worldEndY = endY - this.ship.y;
      var localStartX = worldStartX * cos + worldStartY * sin;
      var localStartY = -worldStartX * sin + worldStartY * cos;
      var localEndX = worldEndX * cos + worldEndY * sin;
      var localEndY = -worldEndX * sin + worldEndY * cos;
      var extent = TILE_SIZE / 2 + radius;
      var minX = Math.ceil((Math.min(localStartX, localEndX) - extent) / TILE_SIZE);
      var maxX = Math.floor((Math.max(localStartX, localEndX) + extent) / TILE_SIZE);
      var minY = Math.ceil((Math.min(localStartY, localEndY) - extent) / TILE_SIZE);
      var maxY = Math.floor((Math.max(localStartY, localEndY) + extent) / TILE_SIZE);
      var bestKey = null, bestTime = Infinity;
      for (var gridY = minY; gridY <= maxY; gridY += 1) {
        for (var gridX = minX; gridX <= maxX; gridX += 1) {
          var key = keyOf(gridX, gridY);
          if (!this.ship.tiles.has(key) || (ignoredKeys && ignoredKeys.has(key))) continue;
          var time = sweptRectangleHitTime(localStartX, localStartY, localEndX, localEndY,
            gridX * TILE_SIZE, gridY * TILE_SIZE, TILE_SIZE / 2, TILE_SIZE / 2, radius);
          if (time >= 0 && time < bestTime) { bestTime = time; bestKey = key; }
        }
      }
      return bestKey === null ? null : { key: bestKey, time: bestTime };
    };

    function enemyDirectionalExtent(enemy, axisX, axisY) {
      var halfLength = enemy.halfLength || enemy.radius || 0;
      var halfWidth = enemy.halfWidth || enemy.radius || 0;
      if (halfLength === halfWidth) return halfLength;
      var facing = enemyCollisionFacing(enemy);
      var forwardX = Math.cos(facing);
      var forwardY = Math.sin(facing);
      var sideX = -forwardY;
      var sideY = forwardX;
      return Math.abs(axisX * forwardX + axisY * forwardY) * halfLength +
        Math.abs(axisX * sideX + axisY * sideY) * halfWidth;
    }

    function enemyCollisionRadius(enemy) {
      if (enemy.collisionRadius) return enemy.collisionRadius;
      if (enemy.halfLength === undefined && enemy.halfWidth === undefined) return enemy.radius || 0;
      return Math.hypot(enemy.halfLength || enemy.radius || 0, enemy.halfWidth || enemy.radius || 0);
    }

    function enemyIntersectsCircle(enemy, x, y, radius) {
      var halfLength = enemy.halfLength || enemy.radius || 0;
      var halfWidth = enemy.halfWidth || enemy.radius || 0;
      if (halfLength === halfWidth) return distanceSquared(x, y, enemy.x, enemy.y) <= (halfLength + radius) * (halfLength + radius);
      var facing = enemyCollisionFacing(enemy);
      var forwardX = Math.cos(facing);
      var forwardY = Math.sin(facing);
      var sideX = -forwardY;
      var sideY = forwardX;
      var relativeX = x - enemy.x;
      var relativeY = y - enemy.y;
      var localForward = relativeX * forwardX + relativeY * forwardY;
      var localSide = relativeX * sideX + relativeY * sideY;
      var nearestForward = clamp(localForward, -halfLength, halfLength);
      var nearestSide = clamp(localSide, -halfWidth, halfWidth);
      var deltaForward = localForward - nearestForward;
      var deltaSide = localSide - nearestSide;
      return deltaForward * deltaForward + deltaSide * deltaSide <= radius * radius;
    }

    function enemyProjectileHitTime(enemy, projectile, startX, startY) {
      var halfLength = enemy.halfLength || enemy.radius || 0;
      var halfWidth = enemy.halfWidth || enemy.radius || 0;
      if (halfLength === halfWidth) {
        return sweptCircleHitTime(startX, startY, projectile.x, projectile.y,
          enemy.x, enemy.y, halfLength + projectile.radius);
      }
      var facing = enemyCollisionFacing(enemy), cos = Math.cos(facing), sin = Math.sin(facing);
      var dx = startX - enemy.x, dy = startY - enemy.y;
      var endX = projectile.x - enemy.x, endY = projectile.y - enemy.y;
      return sweptRectangleHitTime(dx * cos + dy * sin, -dx * sin + dy * cos,
        endX * cos + endY * sin, -endX * sin + endY * cos,
        0, 0, halfLength, halfWidth, projectile.radius);
    }

    function enemyMuzzlePosition(enemy, aimX, aimY) {
      var def = ENEMY_DEFS[enemy.type] || {};
      var offset = enemy.muzzleOffset || def.muzzleOffset || enemy.halfLength || def.halfLength || enemy.radius || def.radius || 0;
      return { x: enemy.x + aimX * offset, y: enemy.y + aimY * offset };
    }

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
        var effectiveSpeed = this.elapsed < (enemy.freezeUntil || 0) ? 0 : enemy.speed * enemy.slowFactor;
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
        if (this.elapsed < (enemy.freezeUntil || 0)) { enemy.vx = 0; enemy.vy = 0; }
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
        var velocitySquared = enemy.vx * enemy.vx + enemy.vy * enemy.vy;
        var targetFacing = enemy.rotation;
        if (isRangedEnemy(enemy)) {
          targetFacing = enemy.attackCharge > 0 && (enemy.lockedAimX || enemy.lockedAimY)
            ? Math.atan2(enemy.lockedAimY, enemy.lockedAimX)
            : Math.atan2(ny, nx);
        } else if (velocitySquared > 9) {
          targetFacing = Math.atan2(enemy.vy, enemy.vx);
        }
        enemy.rotation = targetFacing;
        enemy.visualRotation = turnAngleTowards(enemy.visualRotation, targetFacing, enemy.visualTurnRate, dt);
        var hitKey = this.findImpactedTile(enemy.x, enemy.y, enemyCollisionRadius(enemy));
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
        var sniperMuzzle = enemyMuzzlePosition(enemy, enemy.lockedAimX, enemy.lockedAimY);
        this.fireEnemyProjectile(sniperMuzzle.x, sniperMuzzle.y, enemy.lockedAimX, enemy.lockedAimY, enemy.damage, 400, "sniperShot", enemy.color, 5);
        audio.tone(190, .09, .026, "square", -55);
        return;
      }
      if (enemy.type === "bolter") {
        var bolterMuzzle = enemyMuzzlePosition(enemy, enemy.lockedAimX, enemy.lockedAimY);
        this.fireEnemyProjectile(bolterMuzzle.x, bolterMuzzle.y, enemy.lockedAimX, enemy.lockedAimY, enemy.damage, 290, "bolterShot", enemy.color, 3);
        audio.tone(280, .06, .018, "square", -45);
        return;
      }
      var baseAngle = Math.atan2(enemy.lockedAimY, enemy.lockedAimX);
      for (var shot = -1; shot <= 1; shot += 1) {
        var shotAngle = baseAngle + shot * .14;
        var gunnerAimX = Math.cos(shotAngle);
        var gunnerAimY = Math.sin(shotAngle);
        var gunnerMuzzle = enemyMuzzlePosition(enemy, gunnerAimX, gunnerAimY);
        this.fireEnemyProjectile(gunnerMuzzle.x, gunnerMuzzle.y, gunnerAimX, gunnerAimY, enemy.damage, 325, "gunnerShot", enemy.color, 3.5);
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
      var preferredRange = boss.variant === "storm" ? 310 : (boss.variant === "pursuer" ? 175 : 205);
      var desired = dist > preferredRange ? 1 : (dist < preferredRange - 70 ? -.3 : 0);
      boss.slowTimer = Math.max(0, boss.slowTimer - dt);
      if (boss.slowTimer <= 0) boss.slowFactor = 1;
      var charging = boss.chargeTimer > 0;
      var movementTime = charging ? Math.min(dt, boss.chargeTimer) : dt;
      if (charging) {
        boss.chargeTimer = Math.max(0, boss.chargeTimer - dt);
        boss.vx = boss.chargeAimX * boss.chargeSpeed * boss.slowFactor;
        boss.vy = boss.chargeAimY * boss.chargeSpeed * boss.slowFactor;
      } else if (boss.attackCharge > 0 && (boss.attackPattern === "charge" || boss.variant === "storm")) {
        // Lock the origin as well as the direction of the advertised attack.
        boss.vx = 0;
        boss.vy = 0;
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
          boss.combatPhase = boss.hp <= boss.maxHp * .5 ? 2 : 1;
          if (boss.variant === "storm") boss.attackPattern = "radial";
          else if (boss.variant === "pursuer") boss.attackPattern = boss.combatPhase === 2
            ? (boss.attackIndex % 3 === 2 ? "aimed" : "charge")
            : (boss.attackIndex % 2 === 0 ? "charge" : "aimed");
          else boss.attackPattern = boss.attackIndex % 2 === 0 ? "aimed" : "radial";
          // A short dash from outside its reach only gives a fleeing ship free distance.
          if (boss.attackPattern === "charge" && dist > 300) boss.attackPattern = "aimed";
          var bossLead = Math.min(.65, dist / 320 * .55);
          var targetX = dx + this.ship.vx * bossLead;
          var targetY = dy + this.ship.vy * bossLead;
          var targetLength = Math.max(1, Math.sqrt(targetX * targetX + targetY * targetY));
          boss.lockedAimX = targetX / targetLength;
          boss.lockedAimY = targetY / targetLength;
          boss.chargeAimX = boss.lockedAimX;
          boss.chargeAimY = boss.lockedAimY;
          // Storm's opening gap faces the player; phase two moves it one lane per volley.
          boss.volleyAngle = boss.variant === "storm"
            ? (boss.combatPhase === 2 && boss.attackIndex > 0 ? boss.volleyAngle + Math.PI / 3 : Math.atan2(dy, dx))
            : boss.rotation;
          boss.attackChargeMax = boss.attackPattern === "charge" ? 1.15
            : (boss.variant === "storm" ? (boss.combatPhase === 2 ? 1.25 : 1) : .9);
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
      projectile.launchX = null;
      projectile.launchY = null;
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
      projectile.penetration = 0; projectile.secondHitScale = 1; projectile.knockback = 125;
      projectile.freezeHits = 0; projectile.clusterCount = 0; projectile.chainMine = false;
      projectile.mineFragments = false; projectile.sourceTile = null; projectile.detonated = false;
      projectile.incendiary = false;
      projectile.shatter = false;
      projectile.coldPayload = false;
      if (projectile.hitIds) projectile.hitIds.clear();
      if ((kind === "rail" || kind === "sniperShot") && !projectile.hitIds) projectile.hitIds = new Set();
      if (this.attackVfx) this.attackVfx.resetProjectile(projectile);
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
      this.maxEnemyCollisionRadius = 0;
      for (var i = 0; i < this.enemies.length; i += 1) {
        var enemy = this.enemies[i];
        if (enemy.dead) continue;
        this.maxEnemyCollisionRadius = Math.max(this.maxEnemyCollisionRadius, enemyCollisionRadius(enemy));
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

    Game.prototype.collectProjectileHits = function (projectile, startX, startY) {
      var distance = Math.hypot(projectile.x - startX, projectile.y - startY);
      var candidates = this.radiusCandidates((startX + projectile.x) / 2, (startY + projectile.y) / 2,
        distance / 2 + this.maxEnemyCollisionRadius + projectile.radius);
      var hits = this.projectileHitBuffer, count = 0;
      for (var i = 0; i < candidates.length; i += 1) {
        var enemy = candidates[i];
        if (enemy.dead || (projectile.hitIds && projectile.hitIds.has(enemy.id))) continue;
        var time = enemyProjectileHitTime(enemy, projectile, startX, startY);
        if (time < 0) continue;
        var hit = hits[count] || {};
        hit.enemy = enemy; hit.time = time;
        var index = count;
        // Reuse hit records while keeping first contact ahead of later hulls.
        while (index > 0 && hits[index - 1].time > time) {
          hits[index] = hits[index - 1]; index -= 1;
        }
        hits[index] = hit; count += 1;
      }
      this.projectileHitCount = count;
      return hits;
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
              var distanceSquaredBetween = dx * dx + dy * dy;
              var broadphaseDistance = enemyCollisionRadius(enemy) + enemyCollisionRadius(other) + collisionPadding;
              if (distanceSquaredBetween >= broadphaseDistance * broadphaseDistance) continue;

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

              var minimumDistance = enemyDirectionalExtent(enemy, nx, ny) +
                enemyDirectionalExtent(other, nx, ny) + collisionPadding;
              if (distanceBetween >= minimumDistance) continue;

              var overlap = minimumDistance - distanceBetween;
              var enemyMass = enemyCollisionRadius(enemy) * enemyCollisionRadius(enemy);
              var otherMass = enemyCollisionRadius(other) * enemyCollisionRadius(other);
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
        if (this.finished) break;
        var projectile = this.projectiles[i];
        var startX = projectile.x, startY = projectile.y;
        var launchX = projectile.launchX, launchY = projectile.launchY;
        projectile.launchX = null; projectile.launchY = null;
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
          var sweptTravel = projectile.kind === "rail" || projectile.kind === "cryo";
          var pathStartX = Number.isFinite(launchX) ? launchX : startX;
          var pathStartY = Number.isFinite(launchY) ? launchY : startY;
          var nearby = sweptTravel ? this.collectProjectileHits(projectile, pathStartX, pathStartY) :
            this.nearbyEnemies(projectile.x, projectile.y);
          var nearbyCount = sweptTravel ? this.projectileHitCount : nearby.length;
          if (projectile.kind === "mine") {
            if (projectile.armTime > 0) continue;
            for (var mineTargetIndex = 0; mineTargetIndex < nearby.length; mineTargetIndex += 1) {
              var mineTarget = nearby[mineTargetIndex];
              var triggerRadius = projectile.triggerRadius + enemyCollisionRadius(mineTarget);
              if (!mineTarget.dead && distanceSquared(projectile.x, projectile.y, mineTarget.x, mineTarget.y) <= triggerRadius * triggerRadius) {
                this.detonateMine(projectile);
                projectile.life = 0;
                break;
              }
            }
            continue;
          }
          for (var n = 0; n < nearbyCount; n += 1) {
            var enemy = sweptTravel ? nearby[n].enemy : nearby[n];
            if (enemy.dead) continue;
            var launchHit = sweptTravel ? nearby[n].time :
              Number.isFinite(launchX) ? projectileLaunchHit(enemy, projectile, launchX, launchY) : -1;
            if (launchHit >= 0 || enemyIntersectsCircle(enemy, projectile.x, projectile.y, projectile.radius)) {
              var hitX = launchHit >= 0 ? pathStartX + (projectile.x - pathStartX) * launchHit : projectile.x;
              var hitY = launchHit >= 0 ? pathStartY + (projectile.y - pathStartY) * launchHit : projectile.y;
              if (projectile.kind === "missile") {
                projectile.x = hitX; projectile.y = hitY;
                var primaryImpact = null;
                if (enemy.type === "boss") {
                  var contactX = hitX - enemy.x, contactY = hitY - enemy.y;
                  var contactDistance = Math.hypot(contactX, contactY);
                  // Detonate on the hull, not outside blast range at the missile's outer edge.
                  if (contactDistance > enemy.radius) primaryImpact = {
                    x: enemy.x + contactX * enemy.radius / contactDistance,
                    y: enemy.y + contactY * enemy.radius / contactDistance,
                    damage: projectile.damage, coldPayload: projectile.coldPayload
                  };
                }
                this.explodeMissile(projectile, primaryImpact);
                projectile.life = 0;
                break;
              } else if (projectile.kind === "cryo") {
                projectile.x = hitX; projectile.y = hitY;
                this.damageEnemy(enemy, projectile.damage, hitX, hitY);
                if (!enemy.dead) {
                  enemy.slowFactor = Math.min(enemy.slowFactor, enemy.type === "boss" ? Math.max(.8, projectile.slowFactor) : projectile.slowFactor);
                  enemy.slowTimer = Math.max(enemy.slowTimer, projectile.slowDuration);
                  if (projectile.freezeHits && enemy.type !== "boss" && this.elapsed >= (enemy.freezeImmuneUntil || 0)) {
                    enemy.freezeHitTimes = (enemy.freezeHitTimes || []).filter(function(time) { return time > this.elapsed - 4; }, this);
                    enemy.freezeHitTimes.push(this.elapsed);
                    if (enemy.freezeHitTimes.length >= 4) { enemy.freezeUntil = this.elapsed + .6; enemy.freezeImmuneUntil = this.elapsed + 3.6; enemy.freezeHitTimes = []; }
                  }
                }
                this.burst(hitX, hitY, projectile.color, 6, 65);
                projectile.life = 0;
                break;
              } else if (projectile.kind === "rail" || projectile.penetration) {
                if (projectile.hitIds.has(enemy.id)) continue;
                projectile.hitIds.add(enemy.id);
                var shatterHit = projectile.kind === "rail" && projectile.shatter && ((enemy.slowTimer > 0 && enemy.slowFactor < 1) ||
                  (enemy.type !== "boss" && this.elapsed < (enemy.freezeUntil || 0)));
                var hitDamage = projectile.damage * (projectile.hitIds.size > 1 ? projectile.secondHitScale : 1);
                if (shatterHit) hitDamage *= CRYO_SHATTER_DAMAGE_MULTIPLIER;
                this.damageEnemy(enemy, hitDamage, hitX, hitY);
                if (shatterHit) this.spawnCryoShatter(enemy, hitX, hitY, Math.atan2(projectile.vy, projectile.vx));
                if (projectile.incendiary) this.applyEmberComboBurn(enemy);
                if (projectile.penetration && projectile.hitIds.size >= projectile.penetration) projectile.life = 0;
                if (!enemy.dead && enemy.type !== "boss" && projectile.kind === "rail") {
                  var railSpeed = Math.max(1, Math.sqrt(projectile.vx * projectile.vx + projectile.vy * projectile.vy));
                  enemy.vx += projectile.vx / railSpeed * projectile.knockback;
                  enemy.vy += projectile.vy / railSpeed * projectile.knockback;
                }
                this.burst(hitX, hitY, projectile.color, 5, 95);
                if (projectile.life <= 0) break;
              } else {
                this.damageEnemy(enemy, projectile.damage, hitX, hitY);
                if (projectile.incendiary) this.applyEmberComboBurn(enemy);
                this.burst(hitX, hitY, projectile.color, 3, 55);
                projectile.life = 0;
                break;
              }
            }
          }
        } else {
          var piercingShot = projectile.kind === "sniperShot";
          var endX = projectile.x, endY = projectile.y;
          // A fast shot can cross both Sniper targets during one simulation step.
          for (var impactIndex = 0; impactIndex < (piercingShot ? 2 : 1) && projectile.life > 0; impactIndex += 1) {
            var impact = this.findProjectileImpact(startX, startY, endX, endY,
              projectile.radius, piercingShot ? projectile.hitIds : null);
            if (!impact) break;
            var tileKey = impact.key;
            var hitX = startX + (endX - startX) * impact.time;
            var hitY = startY + (endY - startY) * impact.time;
            var hitTile = this.ship.tiles.get(tileKey);
            var hpBeforeImpact = hitTile.hp;
            var canPenetrate = piercingShot && projectile.hitIds.size === 0 &&
              hitTile.type !== "armor" && hitTile.type !== "bulkhead" && hitTile.type !== "core";
            var hullReduction = canPenetrate ? this.bulkheadReduction(hitTile) : 0;
            if (piercingShot) projectile.hitIds.add(tileKey);
            this.applyProjectileDamageToTile(tileKey, projectile.damage);
            this.burst(hitX, hitY, projectile.color, 4, 55);
            if (canPenetrate && hitTile.hp < hpBeforeImpact) {
              var shieldAbsorption = this.lastShieldAbsorbed || 0;
              projectile.damage = Math.max(0, projectile.damage - shieldAbsorption) * (1 - hullReduction) * .65;
              if (projectile.damage <= 0) projectile.life = 0;
            } else {
              projectile.life = 0;
            }
            if (projectile.life <= 0) { projectile.x = hitX; projectile.y = hitY; }
            if (this.finished) break;
          }
        }
      }
      this.compactProjectiles();
      if (this.attackVfx) this.attackVfx.sampleProjectiles(this.projectiles);
    };

    Game.prototype.detonateMine = function(first) {
      var queue = [first];
      for (var index=0; index<queue.length; index+=1) {
        var mine=queue[index]; if (mine.detonated) continue;
        mine.detonated=true; mine.life=0;
        this.explodeBlast(mine,mine.blastRadius,mine.color,18);
        if (mine.chainMine) this.projectiles.forEach(function(other) {
          if (other.kind==='mine' && other.life>0 && !other.detonated && other.sourceTile===mine.sourceTile && distanceSquared(mine.x,mine.y,other.x,other.y)<=120*120) { other.life=0; queue.push(other); }
        });
        if (mine.mineFragments) for(var fragment=0;fragment<8;fragment+=1) {
          var angle=fragment*TAU/8;
          this.spawnProjectile(true,'scatter',mine.x,mine.y,Math.cos(angle)*420,Math.sin(angle)*420,mine.damage*.2,2.5,240/420,mine.color);
        }
      }
    };

    Game.prototype.explodeBlast = function (projectile, radius, color, particleCount, weaponType) {
      var candidates = this.radiusCandidates ? this.radiusCandidates(projectile.x, projectile.y, radius) : this.enemies;
      for (var i = 0; i < candidates.length; i += 1) {
        var enemy = candidates[i];
        if (enemy.dead) continue;
        var d2 = distanceSquared(projectile.x, projectile.y, enemy.x, enemy.y);
        if (d2 > radius * radius) continue;
        var falloff = 1 - Math.sqrt(d2) / radius * .5;
        this.damageEnemy(enemy, projectile.damage * falloff);
        if (weaponType === "missile" && projectile.coldPayload) this.applyMissileChill(enemy);
      }
      var blastEffect = this.spawnEffect("ring", projectile.x, projectile.y, .28, color);
      blastEffect.radius = 5;
      blastEffect.maxRadius = radius;
      blastEffect.weaponType = weaponType || null;
      blastEffect.coldPayload = weaponType === "missile" && Boolean(projectile.coldPayload);
      this.burst(projectile.x, projectile.y, color, particleCount, 150);
      if (distanceSquared(projectile.x, projectile.y, this.ship.x, this.ship.y) < 420 * 420) this.addShake(1.2);
      audio.tone(75, .14, .04, "sawtooth", -25);
    };

    Game.prototype.explodeMissile = function (projectile, primaryImpact) {
      var color = projectile.coldPayload ? MODULES.cryo.color : "#ffd96a";
      if (projectile.clusterCount) {
        for (var child = 0; child < 3; child += 1) {
          this.explodeBlast({
            x: projectile.x + Math.cos(child * TAU / 3) * 45,
            y: projectile.y + Math.sin(child * TAU / 3) * 45,
            damage: projectile.damage * .25,
            coldPayload: projectile.coldPayload
          }, 50, projectile.coldPayload ? color : projectile.color, 6, "missile");
        }
      }
      this.explodeBlast(primaryImpact || projectile, projectile.blastRadius || 74, color, 12, "missile");
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

    Game.prototype.fireFlakAirburst = function (origin, target, def, damageMultiplier, visualStart, incendiary) {
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
        if (incendiary) this.applyEmberComboBurn(enemy);
      }
      for (var p = 0; p < this.projectiles.length; p += 1) {
        var projectile = this.projectiles[p];
        if (projectile.friendly || projectile.life <= 0) continue;
        if (distanceSquared(impactX, impactY, projectile.x, projectile.y) <= def.blastRadius * def.blastRadius) {
          projectile.life = 0;
        }
      }
      var flakStart = visualStart || origin;
      var flakColor = incendiary ? MODULES.ember.color : def.color;
      var flakBeam = this.spawnEffect("beam", flakStart.x, flakStart.y, .07, flakColor);
      flakBeam.x2 = impactX;
      flakBeam.y2 = impactY;
      flakBeam.width = 2;
      var flakRing = this.spawnEffect("ring", impactX, impactY, .24, flakColor);
      flakRing.radius = 5;
      flakRing.maxRadius = def.blastRadius;
      flakRing.weaponType = "flak";
      flakRing.incendiary = Boolean(incendiary);
      this.burst(impactX, impactY, flakColor, 12, 150);
    };

    Game.prototype.weaponMuzzle = function (tile, origin, nx, ny, port, firingDef) {
      var facing = window.DriftWeaponMuzzles.hullFixed(tile.type) ? this.ship.angle - Math.PI / 2 : Math.atan2(ny, nx);
      var recoil = firingDef ? window.DriftWeaponFeedback.shotOffset(tile, firingDef) : window.DriftWeaponFeedback.offset(tile);
      return window.DriftWeaponMuzzles.point(tile.type, origin, facing, TILE_SIZE, recoil, port);
    };

    function projectileLaunchHit(enemy, projectile, x, y) {
      // Sweep only the launch segment so an overhanging barrel has no blind spot.
      var dx = projectile.x - x, dy = projectile.y - y;
      var lengthSquared = dx * dx + dy * dy;
      var t = lengthSquared ? clamp(((enemy.x - x) * dx + (enemy.y - y) * dy) / lengthSquared, 0, 1) : 0;
      return enemyIntersectsCircle(enemy, x + dx * t, y + dy * t, projectile.radius) ? t : -1;
    }

    Game.prototype.flashWeaponMuzzle = function (tile, muzzle, nx, ny, port) {
      if (this.attackVfx) this.attackVfx.shoot(tile.type, muzzle, nx, ny, {
        game: this, tile: tile, port: port || 0,
        incendiary: (tile.type === "cannon" || tile.type === "scatter") && this.hasActiveEmberNeighbor(tile),
        shatter: tile.type === "rail" && this.hasCryoNeighbor(tile),
        coldPayload: tile.type === "missile" && this.hasCryoNeighbor(tile)
      });
    };

    Game.prototype.fireWeaponVolley = function (origin, nx, ny, def, kind, speed, radius, life, damageMultiplier, targetId, sourceTile) {
      var shots = def.shots || 1;
      var fired = 0;
      var tile = sourceTile || { type: def.id, muzzleCycle: 0 };
      var incendiary = tile.type === "cannon" && this.hasActiveEmberNeighbor(tile);
      var coldPayload = kind === "missile" && this.hasCryoNeighbor(tile);
      var flashed = [];
      var direction = Math.atan2(ny, nx);
      for (var shot = 0; shot < shots; shot += 1) {
        var offset = shot - (shots - 1) / 2;
        // Parallel cannon barrels keep even-sized volleys on a small distant target.
        var cannonVolley = def.id === "cannon";
        var angle = direction + (cannonVolley ? offset * (def.volleySpread || 0) : offset * .14);
        // Keep an aimed cryo bolt when an upgrade adds an even number of fan shots.
        if (kind === "cryo") angle = direction + (shot === 0 ? 0 : Math.ceil(shot / 2) * (shot % 2 ? -1 : 1) * .14);
        var vx = Math.cos(angle);
        var vy = Math.sin(angle);
        var port = kind === "missile" ? (tile.muzzleCycle || 0) % window.DriftWeaponMuzzles.count(tile.type) : 0;
        var muzzle = this.weaponMuzzle(tile, origin, nx, ny, port, def);
        if (def.distributeTargets) {
          var targets = this.enemies.filter(function(enemy) { return !enemy.dead && distanceSquared(origin.x,origin.y,enemy.x,enemy.y) <= def.range * def.range; });
          if (targets.length) targetId = targets[shot % targets.length].id;
        }
        var projectile = this.spawnProjectile(true, kind, muzzle.x, muzzle.y,
          vx * speed, vy * speed, def.damage * damageMultiplier, radius, life,
          coldPayload ? MODULES.cryo.color : incendiary ? MODULES.ember.color : def.color,
          targetId, def.slowFactor, def.slowDuration, 0, def.blastRadius);
        if (projectile) {
          fired += 1;
          projectile.launchX = origin.x; projectile.launchY = origin.y;
          projectile.incendiary = incendiary;
          projectile.coldPayload = coldPayload;
          if (!flashed[port]) { this.flashWeaponMuzzle(tile, muzzle, nx, ny, port); flashed[port] = true; }
          if (kind === "missile") tile.muzzleCycle = (port + 1) % window.DriftWeaponMuzzles.count(tile.type);
          projectile.penetration = def.penetration || 0; projectile.secondHitScale = def.secondHitScale || 1;
          projectile.freezeHits = def.freezeHits || 0; projectile.clusterCount = def.clusterCount || 0;
          if (projectile.penetration && !projectile.hitIds) projectile.hitIds = new Set();
        }
      }
      return fired;
    };

    Game.prototype.updateWeapons = function (dt) {
      var damageMultiplier = 1 + this.coreBonus("damage");
      this.weaponFeedback.begin(dt, this.shipMass());
      // Resolve actual Ember discharges first so simultaneous combos ignore placement order.
      this.ship.tiles.forEach(function (tile) {
        if (tile.type !== "ember") return;
        tile.emberActiveTime = Math.max(0, (tile.emberActiveTime || 0) - dt);
        this.updateWeapon(tile, dt, damageMultiplier);
      }, this);
      this.ship.tiles.forEach(function (tile) {
        if (tile.type !== "ember") this.updateWeapon(tile, dt, damageMultiplier);
      }, this);
      this.weaponFeedback.flush(this.ship);
    };

    Game.prototype.updateWeapon = function (tile, dt, damageMultiplier) {
      if (!isWeaponType(tile.type)) return;
      window.DriftWeaponFeedback.settle(tile, dt);
      tile.cooldown -= dt * this.weaponCooldownRate(tile);
      if (tile.activeBeam) {
        var beam = tile.activeBeam, beamStep = Math.min(dt, beam.remaining);
        tile.aim = Math.atan2(beam.ny, beam.nx) - this.ship.angle;
        var beamMuzzle = this.weaponMuzzle(tile, this.gridToWorld(tile.x, tile.y), beam.nx, beam.ny, 0);
        beam.remaining -= beamStep;
        for (var ray = 0; ray < (beam.def.beamCount || 1); ray += 1) {
          var rayAngle = Math.atan2(beam.ny, beam.nx) + ((beam.def.beamCount || 1) > 1 ? (ray ? .12 : -.12) : 0);
          this.firePiercingBeam(beam.origin, Math.cos(rayAngle), Math.sin(rayAngle), beam.def.range, beam.def.damage * beam.multiplier * beamStep / beam.duration, beam.def.color, beam.def.beamWidth || 11, Math.max(.04, beamStep), beamMuzzle);
        }
        if (beam.remaining <= 0) tile.activeBeam = null;
        return;
      }
      if (tile.pendingBurst) {
        var burst = tile.pendingBurst; burst.clock -= dt;
        if (burst.clock <= 0) {
          var burstDef = burst.def.secondWave ? Object.assign({}, burst.def, { damage:burst.def.damage * .7, knockback:burst.def.knockback * .5 }) : burst.def;
          this.fireAttack(tile, this.gridToWorld(tile.x,tile.y), burst.nx,burst.ny,burstDef,burst.target,burst.multiplier);
          burst.remaining -= 1; burst.clock += burst.interval;
          if (!burst.remaining) tile.pendingBurst = null;
        }
        return;
      }
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
      if (tile.type === "gravity" && this.gravityFields.some(function(field) { return field.sourceTile === tile && field.life > 0; })) return;
      var dx = target.x - origin.x;
      var dy = target.y - origin.y;
      var distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      var nx = dx / distance;
      var ny = dy / distance;
      tile.cooldown = def.cooldown;
      this.fireAttack(tile, origin, nx, ny, def, target, damageMultiplier);
      if (def.burstCount > 1) tile.pendingBurst = { remaining: def.burstCount - 1, clock: def.burstInterval, interval: def.burstInterval, nx:nx, ny:ny, def:def, target:target, multiplier:damageMultiplier };
    };

    Game.prototype.fireAttack = function(tile, origin, nx, ny, def, target, damageMultiplier) {
        // Bursts keep their world firing vector while the hull turns underneath.
        if (!window.DriftWeaponMuzzles.hullFixed(tile.type) && tile.type !== "pulse" && tile.type !== "gravity") tile.aim = Math.atan2(ny, nx) - this.ship.angle;
        var muzzle = this.weaponMuzzle(tile, origin, nx, ny, 0, def);
        if (tile.type === "cannon") {
          var cannonFired = this.fireWeaponVolley(origin, nx, ny, def, def.projectileKind || "cannon", 560, 3, 1.4, damageMultiplier, undefined, tile);
          if (cannonFired) this.weaponFeedback.fire(tile, def, nx, ny);
          this.burst(muzzle.x, muzzle.y, def.color, 2, 35);
          audio.tone(250, .035, .018, "square", -35);
        } else if (tile.type === "laser") {
          if (def.beamDuration) tile.activeBeam = { origin: origin, nx: nx, ny: ny, remaining: def.beamDuration, duration: def.beamDuration, def: def, multiplier: damageMultiplier };
          else this.firePiercingBeam(origin, nx, ny, def.range, def.damage * damageMultiplier, def.color, def.beamWidth || 11, .13, muzzle);
          audio.tone(520, .1, .024, "sawtooth", 210);
        } else if (tile.type === "missile") {
          var missilesFired = this.fireWeaponVolley(origin, nx, ny, def, "missile", 180, 5, 3.4, damageMultiplier, target.id, tile);
          audio.tone(170, .08, .02, "triangle", 45);
          if (missilesFired && this.weaponFeedback.fire(tile, def, nx, ny)) audio.heavyShot("missile");
        } else if (tile.type === "scatter") {
          var pelletsFired = 0;
          var incendiary = this.hasActiveEmberNeighbor(tile);
          for (var pellet = 0; pellet < def.pellets; pellet += 1) {
            var pelletAngle = Math.atan2(ny, nx) + (pellet - (def.pellets - 1) / 2) * def.spread / (def.pellets - 1);
            var pelletX = Math.cos(pelletAngle);
            var pelletY = Math.sin(pelletAngle);
            var pelletShot = this.spawnProjectile(true, "scatter", muzzle.x, muzzle.y, pelletX * 520, pelletY * 520, def.damage * damageMultiplier, 2.5, def.range / 520, incendiary ? MODULES.ember.color : def.color);
            if (pelletShot) { pelletsFired += 1; pelletShot.launchX = origin.x; pelletShot.launchY = origin.y; pelletShot.incendiary = incendiary; }
          }
          if (pelletsFired) this.flashWeaponMuzzle(tile, muzzle, nx, ny, 0);
          this.burst(muzzle.x, muzzle.y, def.color, 5, 65);
          audio.tone(150, .07, .025, "square", -45);
          if (pelletsFired && this.weaponFeedback.fire(tile, def, nx, ny)) audio.heavyShot("scatter");
        } else if (tile.type === "arc") {
          this.fireArc(muzzle, target, def, damageMultiplier);
          audio.tone(430, .12, .025, "sawtooth", 390);
        } else if (tile.type === "rail") {
          var shatter = this.hasCryoNeighbor(tile);
          var railColor = shatter ? MODULES.cryo.color : def.color;
          var rail = this.spawnProjectile(true, "rail", muzzle.x, muzzle.y, nx * 900, ny * 900, def.damage * damageMultiplier, 4, def.range / 900, railColor);
          if (rail) { rail.knockback = def.knockback || 125; rail.launchX = origin.x; rail.launchY = origin.y; rail.shatter = shatter; }
          this.burst(muzzle.x, muzzle.y, railColor, 6, 95);
          audio.tone(110, .16, .04, "square", 470);
          if (rail) {
            this.flashWeaponMuzzle(tile, muzzle, nx, ny, 0);
            this.weaponFeedback.fire(tile, def, nx, ny);
            audio.heavyShot("rail");
          }
        } else if (tile.type === "flak") {
          var flakPort = (tile.muzzleCycle || 0) % window.DriftWeaponMuzzles.count(tile.type);
          muzzle = this.weaponMuzzle(tile, origin, nx, ny, flakPort, def);
          this.fireFlakAirburst(origin, target, def, damageMultiplier, muzzle, this.hasActiveEmberNeighbor(tile));
          this.flashWeaponMuzzle(tile, muzzle, nx, ny, flakPort);
          tile.muzzleCycle = (flakPort + 1) % window.DriftWeaponMuzzles.count(tile.type);
          this.weaponFeedback.fire(tile, def, nx, ny);
          if (def.cloudDuration) this.placeWeaponArea(tile, "cloud", target.x,target.y,def.blastRadius,def.cloudDuration,0,def.color);
          audio.tone(205, .07, .022, "square", -60);
        } else if (tile.type === "pulse") {
          this.firePulse(origin, def, damageMultiplier);
          audio.tone(145, .18, .035, "sine", 380);
        } else if (tile.type === "cryo") {
          this.fireWeaponVolley(origin, nx, ny, def, "cryo", 500, 4, def.range / 500, damageMultiplier, undefined, tile);
          audio.tone(360, .09, .02, "triangle", -120);
        } else if (tile.type === "mine") {
          for (var mineIndex = 0; mineIndex < (def.shots || 1); mineIndex += 1) {
            var mineAngle = Math.atan2(ny, nx) + (mineIndex - ((def.shots || 1) - 1) / 2) * .3;
            var mine = this.spawnProjectile(true, "mine", muzzle.x, muzzle.y, Math.cos(mineAngle) * 220, Math.sin(mineAngle) * 220, def.damage * damageMultiplier, 6, 6, def.color, 0, 1, 0, 64, def.blastRadius, .35);
            if (mine) { mine.sourceTile = tile; mine.chainMine = !!def.chainMine; mine.mineFragments = !!def.mineFragments; }
          }
          audio.tone(190, .06, .018, "triangle", 45);
        } else if (tile.type === "ember") {
          this.fireEmberCone(origin, nx, ny, def, damageMultiplier, muzzle);
          tile.emberActiveTime = EMBER_BURST_DURATION;
          if (def.fireTrail) this.placeWeaponArea(tile,"fire",origin.x+nx*def.range*.6,origin.y+ny*def.range*.6,65,2,def.damage*damageMultiplier*.5,def.color);
          audio.tone(95, .13, .02, "sawtooth", 45);
        } else if (tile.type === "gravity") {
          this.placeGravityField(tile, origin, target, def, damageMultiplier);
          audio.tone(220, .18, .022, "sine", -100);
        }
    };

    Game.prototype.fireEmberCone = function (origin, nx, ny, def, damageMultiplier, visualStart) {
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
        if (!(enemy.burnTimer > 0) || def.burnDamage * damageMultiplier >= enemy.burnDamage) enemy.spreadBurn = !!def.spreadBurn;
        enemy.burnDamage = Math.max(enemy.burnTimer > 0 ? enemy.burnDamage : 0, def.burnDamage * damageMultiplier);
        enemy.burnTimer = Math.max(enemy.burnTimer || 0, def.burnDuration);
      }
      var flame = this.spawnEffect("flameCone", origin.x, origin.y, EMBER_BURST_DURATION, def.color);
      flame.value = this.backgroundPulse;
      flame.angle = facing;
      flame.width = def.coneAngle;
      flame.radius = def.range;
      flame.muzzleX = (visualStart || origin).x;
      flame.muzzleY = (visualStart || origin).y;
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
      field.collapseDamage = (def.collapseDamage || 0) * damageMultiplier;
      field.tickTime = 0;
      field.color = def.color;
      var link = this.spawnEffect("beam", origin.x, origin.y, .12, def.color);
      link.x2 = field.x;
      link.y2 = field.y;
      link.width = 2;
    };

    Game.prototype.placeWeaponArea = function(tile,kind,x,y,radius,life,damage,color) {
      var area=this.weaponAreas.find(function(area){return area.sourceTile===tile;});
      if(!area){area={};this.weaponAreas.push(area);}
      Object.assign(area,{sourceTile:tile,kind:kind,x:x,y:y,radius:radius,life:life,damage:damage,color:color,interceptions:6,visualClock:0});
    };
    Game.prototype.updateWeaponAreas = function(dt) {
      var areas=this.weaponAreas || [];
      for(var i=0;i<areas.length;i+=1){
        var area=areas[i];
        if(this.ship.tiles.get(keyOf(area.sourceTile.x,area.sourceTile.y))!==area.sourceTile){area.life=0;continue;}
        var step=Math.min(dt,area.life);area.life-=step;area.visualClock-=step;
        if(area.kind==='cloud'){
          for(var j=0;j<this.projectiles.length&&area.interceptions>0;j+=1){var p=this.projectiles[j];if(!p.friendly&&p.life>0&&distanceSquared(p.x,p.y,area.x,area.y)<=area.radius*area.radius){p.life=0;area.interceptions-=1;}}
          if(!area.interceptions)area.life=0;
        }else{
          // Fire trails may overlap visually; strongest DPS wins for each enemy.
          this.enemies.forEach(function(enemy){
            if(enemy.dead||distanceSquared(enemy.x,enemy.y,area.x,area.y)>area.radius*area.radius)return;
            var strongest=area;
            for(var a=0;a<areas.length;a+=1){var other=areas[a];if(other.kind==='fire'&&other.life>0&&distanceSquared(enemy.x,enemy.y,other.x,other.y)<=other.radius*other.radius&&(other.damage>strongest.damage||other.damage===strongest.damage&&a<i))strongest=other;}
            if(strongest===area)this.damageEnemy(enemy,area.damage*step);
          },this);
        }
        if(area.visualClock<=0){var ring=this.spawnEffect('ring',area.x,area.y,.22,area.color);ring.maxRadius=area.radius;area.visualClock=.2;}
      }
      this.weaponAreas=areas.filter(function(area){return area.life>0;});
    };
    Game.prototype.updateWeaponStatuses = function (dt) {
      this.updateWeaponAreas(dt);
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
          if (enemy.burnTimer <= 0) { enemy.burnDamage = 0; enemy.spreadBurn = false; }
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
        var endingField = fields[fieldWrite];
        if (endingField.life > 0) fields[write++] = endingField;
        else if (endingField.collapseDamage) {
          this.enemies.slice().forEach(function(enemy) { if (!enemy.dead && distanceSquared(endingField.x,endingField.y,enemy.x,enemy.y)<=endingField.radius*endingField.radius) this.damageEnemy(enemy,endingField.collapseDamage); },this);
          var collapseRing=this.spawnEffect("ring",endingField.x,endingField.y,.3,endingField.color); collapseRing.maxRadius=endingField.radius;
        }
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
        if (def.knockback && !enemy.dead) {
          var length = Math.sqrt(d2), push = def.knockback * (enemy.type === "boss" ? .2 : 1);
          if (length > 0) { enemy.x += (enemy.x-origin.x) / length * push; enemy.y += (enemy.y-origin.y) / length * push; }
        }
        hitCount += 1;
      }
      var pulseEffect = this.spawnEffect("ring", origin.x, origin.y, .35, def.color);
      pulseEffect.radius = 8;
      pulseEffect.maxRadius = def.range;
      pulseEffect.weaponType = "pulse";
      if (hitCount > 0) this.burst(origin.x, origin.y, def.color, Math.min(18, 4 + hitCount), 120);
    };

    Game.prototype.firePiercingBeam = function (origin, nx, ny, range, damage, color, width, life, visualStart) {
      for (var i = 0; i < this.enemies.length; i += 1) {
        var enemy = this.enemies[i];
        if (enemy.dead) continue;
        var rx = enemy.x - origin.x;
        var ry = enemy.y - origin.y;
        var projection = rx * nx + ry * ny;
        if (projection < 0 || projection > range) continue;
        var perpendicular = Math.abs(rx * ny - ry * nx);
        if (perpendicular <= enemyDirectionalExtent(enemy, -ny, nx) + width) this.damageEnemy(enemy, damage);
      }
      var beamStart = visualStart || origin;
      var beamEffect = this.spawnEffect("beam", beamStart.x, beamStart.y, life, color);
      beamEffect.x2 = origin.x + nx * range;
      beamEffect.y2 = origin.y + ny * range;
      beamEffect.width = width;
    };

    Game.prototype.fireArc = function(origin, firstTarget, def, multiplier) {
      var damage=def.damage*multiplier, hitIds=new Set([firstTarget.id]);
      this.damageEnemy(firstTarget,damage);
      var points=[{x:origin.x,y:origin.y},{x:firstTarget.x,y:firstTarget.y}];
      var paths=def.forkChain?2:1, hops=def.forkChain?5:def.chains-1;
      for(var path=0;path<paths;path+=1){
        var current=firstTarget;
        if(path)points.push({x:firstTarget.x,y:firstTarget.y});
        for(var hop=1;hop<=hops;hop+=1){
          var next=null,best=def.jumpRange*def.jumpRange;
          var nearby=this.radiusCandidates(current.x,current.y,def.jumpRange);
          for(var i=0;i<nearby.length;i+=1){var candidate=nearby[i];if(candidate.dead||hitIds.has(candidate.id))continue;var d=distanceSquared(current.x,current.y,candidate.x,candidate.y);if(d<best){best=d;next=candidate;}}
          if(!next)break;hitIds.add(next.id);points.push({x:next.x,y:next.y});this.damageEnemy(next,damage*Math.pow(.82,hop));current=next;
        }
      }
      if(def.returnHit&&!firstTarget.dead){this.damageEnemy(firstTarget,damage);points.push({x:firstTarget.x,y:firstTarget.y});}
      var effect=this.spawnEffect('arc',origin.x,origin.y,.18,def.color);effect.points=points;
    };

    Game.prototype.enemyHitFeedback = function (enemy, hitX, hitY) {
      if (this.elapsed < (enemy.nextHitFeedbackAt || 0)) return;
      enemy.nextHitFeedbackAt = this.elapsed + .065;
      var angle = Math.atan2(this.ship.y - enemy.y, this.ship.x - enemy.x);
      var x = Number.isFinite(hitX) ? hitX : enemy.x + Math.cos(angle) * enemy.radius * .8;
      var y = Number.isFinite(hitY) ? hitY : enemy.y + Math.sin(angle) * enemy.radius * .8;
      var shielded = enemy.shield > 0;
      combatFeedback.impact(this, x, y, Math.atan2(y - enemy.y, x - enemy.x), shielded, currentQualityTier(), save.settings.reducedFlash);
    };

    Game.prototype.damageEnemy = function (enemy, amount, hitX, hitY) {
      if (!enemy || enemy.dead || !Number.isFinite(amount) || amount <= 0) return;
      this.enemyHitFeedback(enemy, hitX, hitY);
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
      combatFeedback.destruction(this, enemy, currentQualityTier(), save.settings.reducedFlash, enemyArt);
      if (enemy.spreadBurn) {
        this.enemies.forEach(function(other) {
          if (other.dead || distanceSquared(enemy.x,enemy.y,other.x,other.y)>80*80) return;
          var transferred = enemy.burnDamage*.5;
          if (!(other.burnTimer>0) || transferred >= other.burnDamage) { other.burnDamage=transferred; other.spreadBurn=false; }
          other.burnTimer=Math.max(other.burnTimer || 0,2.5);
        });
      }
      this.recordProgress({ kills: 1, elapsed: this.elapsed });
      if (enemy.type === "boss") {
        this.bossDefeated = true;
        this.bossesDefeated += 1;
        this.recordProgress({ bosses: 1 });
        this.bossSpawned = false;
        this.bossWarningShown = false;
        this.pendingBossAngle = null;
        // Fixed arrival targets leave room for the swarm to develop between encounters.
        this.nextBossAt = this.elapsed + BOSS_REPEAT_INTERVAL;
        this.recoveryUntil = this.elapsed + BOSS_RECOVERY_SECONDS;
        this.ambientSpawnClock = 1.5;
        this.assaultClock = ASSAULT_FIRST_DELAY;
        this.addShake(14);
        this.burst(enemy.x, enemy.y, "#e9b477", 35, 260);
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
      var minute = Math.floor(this.elapsed / 60);
      this.killsByMinute[minute] = (this.killsByMinute[minute] || 0) + 1;
      var rewardMultiplier = this.matterIncomeMultiplier();
      var earnedMatter = enemy.reward * rewardMultiplier;
      this.matter += earnedMatter;
      if (this.training && enemy.trainingTarget) {
        trainingShipState();
        trainingEvent("target_destroyed", { id: enemy.trainingTarget.id, group: enemy.trainingTarget.group, upgraded: Boolean(this.upgrades.cannon && this.upgrades.cannon.level > 0) });
      }
      if (playtestTelemetry) playtestTelemetry.recordEnemyKill(enemy.type, earnedMatter);
      this.burst(enemy.x, enemy.y, "#e9ad82", 5, 120);
      if (enemy.type === "splitter") {
        for (var i = 0; i < 2; i += 1) {
          var angle = i * Math.PI + Math.random() * .5;
          this.spawnEnemy("mini", enemy.x + Math.cos(angle) * 12, enemy.y + Math.sin(angle) * 12);
        }
      }
      audio.tone(180 + Math.random() * 70, .045, .012, "sine", 80);
    };

    Game.prototype.applyProjectileDamageToTile = function (targetKey, amount) {
      this.lastShieldAbsorbed = 0;
      this.shieldBuffer.length = 0;
      var target = this.ship.tiles.get(targetKey);
      if (!target || this.finished || !Number.isFinite(amount) || amount <= 0 ||
          this.elapsed < target.placementProtectedUntil || this.elapsed < target.projectileHitProtectedUntil) return;
      this.applyDamageToTile(targetKey, amount);
      // Ignored hits never extend this window; every other module remains vulnerable.
      target.projectileHitProtectedUntil = this.elapsed + MODULE_PROJECTILE_GRACE;
    };

    Game.prototype.applyDamageToTile = function (targetKey, amount) {
      var shieldDef = this.weaponDefinitions ? this.weaponDefinitions.shield : MODULES.shield, repairDef = this.weaponDefinitions ? this.weaponDefinitions.repair : MODULES.repair;
      var target = this.ship.tiles.get(targetKey);
      this.lastShieldAbsorbed = 0;
      this.shieldBuffer.length = 0;
      if (!target || this.finished || !Number.isFinite(amount) || amount <= 0 ||
          this.elapsed < target.placementProtectedUntil) return;
      var remaining = amount;
      var shieldAbsorbed = 0;
      var shields = this.shieldBuffer;
      this.ship.tiles.forEach(function (tile) {
        if (tile.type !== "shield") return;
        var dx = tile.x - target.x;
        var dy = tile.y - target.y;
        if (dx * dx + dy * dy > shieldDef.shieldRadius * shieldDef.shieldRadius) return;
        // Hits inside this field interrupt its recovery even when its charge is empty.
        tile.shieldDelay = shieldDef.rechargeDelay;
        shields.push(tile);
      });
      shields.sort(function (a, b) { return b.shield - a.shield; });
      for (var i = 0; i < shields.length && remaining > 0; i += 1) {
        var shield = shields[i];
        if (shield.shield <= 0 && shieldDef.reserveCapacity && !(shield.reserveCooldown > 0)) {
          shield.reserveCharge = shieldDef.reserveCapacity; shield.reserveLife = 2; shield.reserveCooldown = 30;
        }
        var absorbed = Math.min(shield.shield, remaining);
        shield.shield -= absorbed;
        shield.shieldDelay = shieldDef.rechargeDelay;
        if (shield.shield <= 0) shield.flash = Math.max(shield.flash, .35);
        remaining -= absorbed;
        shieldAbsorbed += absorbed;
        if (shield.shield <= 0 && shieldDef.reserveCapacity && !(shield.reserveCooldown > 0)) {
          shield.reserveCharge = shieldDef.reserveCapacity; shield.reserveLife = 2; shield.reserveCooldown = 30;
        }
        var reserved = Math.min(shield.reserveCharge || 0, remaining);
        shield.reserveCharge = Math.max(0,(shield.reserveCharge || 0)-reserved);
        remaining -= reserved; shieldAbsorbed += reserved;
      }
      this.lastShieldAbsorbed = shieldAbsorbed;
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
      target.repairDelay = repairDef.repairDelay;
      target.flash = Math.max(target.flash, .24 + clamp(remaining / 40, 0, .18));
      var impactPos = this.gridToWorld(target.x, target.y);
      combatFeedback.impact(this, impactPos.x, impactPos.y, this.ship.angle, false, currentQualityTier(), save.settings.reducedFlash);
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
        this.deathFeedbackTime = 1.5;
        this.addShake(18);
        this.damageVignette = save.settings.reducedFlash ? .42 : 1;
        this.burst(corePos.x, corePos.y, "#efbd79", 24, 220);
        combatFeedback.destruction(this, { type:"core", x:corePos.x, y:corePos.y, radius:32, rotation:this.ship.angle }, currentQualityTier(), save.settings.reducedFlash, enemyArt);
        this.ship.tiles.forEach(function (tile) { this.spawnTileDebris(tile, this.gridToWorld(tile.x, tile.y)); }, this);
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
      var groupedDebris = shipDebris ? shipDebris.spawn(this, detached, target, TILE_SIZE, MODULES, currentQualityTier()) : null;
      for (var d = 0; d < detached.length; d += 1) {
        this.detachTile(detached[d], true, groupedDebris && groupedDebris.has(detached[d]));
      }
      audio.tone(95, .18, .045, "sawtooth", -40);
    };

    Game.prototype.detachTile = function (key, branch, groupedDebris) {
      var tile = this.ship.tiles.get(key);
      if (!tile) return;
      var pos = this.gridToWorld(tile.x, tile.y);
      this.ship.tiles.delete(key);
      this.modulesLost += 1;
      if (playtestTelemetry) playtestTelemetry.recordModuleLost(tile.type, branch);
      if (!groupedDebris) {
        this.burst(pos.x, pos.y, branch ? "#a987ff" : "#65e8ff", branch ? 12 : 8, branch ? 150 : 100);
        this.spawnTileDebris(tile, pos);
      }
    };

    Game.prototype.spawnTileDebris = function (tile, pos) {
      if (this.effects.length >= (currentQualityTier() > 1 ? 70 : currentQualityTier() > 0 ? 100 : 140)) return;
      var definition = tile.type === "core" ? { color:CORE_COLORS[this.coreDef.id], glyph:"◆" } : MODULES[tile.type];
      var debrisEffect = this.spawnEffect("debris", pos.x, pos.y, 1.1, definition.color);
      debrisEffect.vx = (pos.x - this.ship.x) * .7 + (Math.random() - .5) * 90;
      debrisEffect.vy = (pos.y - this.ship.y) * .7 + (Math.random() - .5) * 90;
      debrisEffect.rotation = this.ship.angle;
      debrisEffect.spin = (Math.random() - .5) * 4;
      debrisEffect.glyph = definition.glyph;
      debrisEffect.moduleType = tile.type === "core" && this.coreDef.id !== "standard" ? "core-" + this.coreDef.id : tile.type;
      debrisEffect.moduleAim = tile.aim;
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
        combatFeedback.update(effect, dt);
        if (shipDebris) shipDebris.update(effect, dt);
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
          if (shipDebris) shipDebris.release(effect);
          if (this.effectPool.length < 240) this.effectPool.push(effect);
        }
      }
      var maxEffects = qualityTier > 1 ? 70 : (qualityTier > 0 ? 100 : 140);
      if (effectWrite > maxEffects) {
        var effectStart = effectWrite - maxEffects;
        for (var droppedEffect = 0; droppedEffect < effectStart; droppedEffect += 1) {
          this.effects[droppedEffect].points = null;
          if (shipDebris) shipDebris.release(this.effects[droppedEffect]);
          if (this.effectPool.length < 240) this.effectPool.push(this.effects[droppedEffect]);
        }
        for (var effectIndex = 0; effectIndex < maxEffects; effectIndex += 1) {
          this.effects[effectIndex] = this.effects[effectStart + effectIndex];
        }
        effectWrite = maxEffects;
      }
      this.effects.length = effectWrite;
      if (this.attackVfx) this.attackVfx.update(dt);
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
      if (this.testRange) rangeArena.update(this, dt);
      this.checkSurvival();
    };

    Game.prototype.checkSurvival = function () { /* Endless has no completion timer. */ };

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
      if (this.testRange) { this.state = "paused"; openPause("RANGE HULL LOST"); showToast("Reset loadout to rebuild the range ship."); return; }
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
            carryAfterUnits: reward.carryUnits, scale: reward.scale, sources: reward.sources, killsByMinute: this.killsByMinute }
        }, telemetrySample());
      }
      storeSave();
      ui.resultTitle.textContent = retired ? (this.survivalCompleted ? "SURVIVAL COMPLETE" : "RUN BANKED") : "CORE LOST";
      ui.resultSubtitle.textContent = "Fragments earned from combat time, ordinary kills and bosses. Spend them in Hangar.";
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
      return installedModuleCopies(type);
    }

    function buyRunUpgrade(type, choice, expectedRank) {
      if (!game || game.state !== "building") return false;
      var copies = installedModuleCopies(type);
      if (!copies) return false;
      var result = runUpgrades.purchase(game.upgrades, type, choice, game.testRange ? Number.MAX_SAFE_INTEGER : game.matter, upgradePricingCopies(type), expectedRank, effectiveBranchLicenses());
      if (!result) return false;
      if (!game.testRange) game.matter = result.matter;
      if (playtestTelemetry && playtestTelemetry.recordUpgrade) playtestTelemetry.recordUpgrade(type, choice, result.option.cost, game.elapsed, { level: game.upgrades[type].level + 1, branch: game.upgrades[type].branch, path: game.upgrades[type].path, unitCost: result.option.unitCost, copies: copies });
      game.weaponDefinitions[type] = runUpgrades.resolve(MODULES[type], game.upgrades[type]);
      game.refreshFamilyTiles(type, false);
      game.recordProgress({ upgrades: 1 });
      trainingEvent("weapon_upgraded", { type: type, copies: copies, level: game.upgrades[type].level });
      game.ship.tiles.forEach(function (tile) {
        if (tile.type === type) { tile.cooldown = 0; tile.upgradeFlash = .65; }
      });
      showToast(game.training ? (copies === 1 ? "Cannon upgraded" : "All " + copies + " Cannons upgraded") : MODULES[type].name + " · " + runUpgrades.label(type, game.upgrades[type]) + (copies === 1 ? " · Weapon upgraded" : " · All " + copies + " copies upgraded"));
      storeSave();
      ui.toast.classList.add("success");
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
      var copies = MODULES[type] ? installedModuleCopies(type) : 0;
      ui.buildUpgradePanel.classList.toggle("hidden", !copies);
      if (!copies) return;
        var card = document.createElement("article");
        card.className = "upgrade-card";
        card.innerHTML = '<header><strong class="upgrade-scope-title">' + buildModuleName(type) + ' upgrades</strong><span class="upgrade-level">' + runUpgrades.label(type, game.upgrades[type]) + '</span><small class="upgrade-scope-note">' + copies + ' installed · Includes future copies · This run</small></header>';
        var track = document.createElement("div");
        track.className = "run-upgrade-track";
        track.setAttribute("tabindex", "0");
        track.setAttribute("aria-label", "Upgrade tree; scroll to explore branches and later upgrades");
        var choices = runUpgrades.options(type, game.upgrades[type], upgradePricingCopies(type), effectiveBranchLicenses());
        if (!choices.length) card.innerHTML += '<p class="upgrade-max"><strong>MAX</strong> Route complete. No further upgrades.</p>';
        else if (choices.every(function (choice) { return choice.locked; })) card.innerHTML += '<p class="upgrade-lock-help">Unlock branches in Hangar with Fragments between runs.</p>';
        function createUpgradeChoice(choice) {
          var button = document.createElement(choice.locked ? "article" : "button");
          button.className = "upgrade-option" + (choice.locked ? " upgrade-locked" : "");
          button.dataset.weapon = type;
          button.dataset.choice = choice.id;
          if (!choice.locked) button.disabled = !game.testRange && game.matter < choice.cost;
          var description = runUpgrades.describeChange(MODULES[type], game.upgrades[type], choice);
          if (choice.milestone) button.classList.add("milestone-upgrade");
          var branch = choice.locked ? runUpgrades.trees[type].branches.find(function (entry) { return type + ":" + entry.id === choice.license; }) : null;
          var status = choice.locked ? '<span class="upgrade-status">LOCKED</span>' : '';
          var price = choice.locked ? '<b>Unlock · ' + branch.fragmentCost + ' Fragments in Hangar</b><small>Run upgrade: ' + choice.cost + ' Matter for ' + copies + ' installed ' + (copies === 1 ? 'copy' : 'copies') + '.</small>' : '<b>' + choice.cost + ' Matter</b><small>' + (game.matter < choice.cost ? 'Need ' + Math.ceil(choice.cost - game.matter) + ' more Matter' : 'Upgrade ' + copies + ' installed ' + (copies === 1 ? 'copy' : 'copies')) + '</small>';
          if (game.testRange) price = "<b>Free in test range</b><small>Applies to installed copies</small>";
          button.innerHTML = status + '<strong>' + choice.name.replace(/ [+-][\d.]+%$/, '') + '</strong>' + price + '<span class="upgrade-delta">' + description + '</span>';
          if (choice.locked) return button;
          button.addEventListener("click", function (event) {
            if (!buyRunUpgrade(type, choice.id, choice.rank)) return;
            if (event && event.detail === 0 && ui.upgradeList.querySelector) {
              var nextOption = ui.upgradeList.querySelector("button.upgrade-option:not(:disabled)") || ui.buildGrid.querySelector(".selected-installed") || ui.catalog.querySelector(".selected");
              if (nextOption) nextOption.focus({ preventScroll: true });
            }
          });
          return button;
        }
        window.DriftUpgradeTreeView.renderRunTree(track, {
          upgrades: runUpgrades, type: type, state: game.upgrades[type], copies: upgradePricingCopies(type),
          licenses: effectiveBranchLicenses(), base: MODULES[type], createChoice: createUpgradeChoice,
          matter: game.matter, free: Boolean(game.testRange)
        });
        card.appendChild(track);
        ui.upgradeList.appendChild(card);
        track.scrollTop = Math.max(0, (track.scrollHeight - track.clientHeight) / 2);
      ui.buildMatter.textContent = Math.floor(game.matter);
    }

    var buildInteraction = { owner: null, selectedKey: null, drag: null, preview: null, pendingCellKey: null, suppressClickUntil: 0 };
    var buildHoverSuspended = false;

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

    function moduleSellRefund(tile) { return 0; }

    function moduleSaleBlockReason(sourceKey) {
      if (!game) return "";
      var tile = game.ship.tiles.get(sourceKey);
      if (!tile || tile.type === "core") return "The core cannot be dismantled.";
      if (!buildLayoutConnected(sourceKey)) return "Other modules need this connection. Remove the outer modules first.";
      if (!isWeaponType(tile.type)) return "";
      var weaponCount = 0;
      game.ship.tiles.forEach(function (installed) { if (isWeaponType(installed.type)) weaponCount += 1; });
      if (weaponCount > 1) return "";
      return "Keep at least one weapon installed.";
    }

    function finishBuildChange() {
      trainingShipState();
      updateHud();
      createCatalog();
      renderBuildGrid();
    }

    function sellInstalledModule(sourceKey) {
      if (!game || game.state !== "building") return false;
      var tile = game.ship.tiles.get(sourceKey);
      if (!tile || tile.type === "core") return false;
      var blockReason = moduleSaleBlockReason(sourceKey);
      if (blockReason) {
        showToast("CANNOT DISMANTLE · " + blockReason);
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
      showToast(MODULES[tile.type].name + " dismantled · no Matter refund");
      finishBuildChange();
      return true;
    }

    function validPlacement(x, y, type) {
      return Boolean(game && Number.isInteger(x) && Number.isInteger(y) && Object.prototype.hasOwnProperty.call(MODULES, type) &&
        !game.ship.tiles.has(keyOf(x, y)) && game.isAdjacentToShip(x, y));
    }

    function placePurchasedModule(x, y) {
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
      game.applyFamilyTileStats(tile, true);
      tile.paidMatter = price;
      tile.placementProtectedUntil = game.elapsed + MODULE_PLACEMENT_GRACE;
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
      var def = game ? game.weaponDefinitions.shield : MODULES.shield;
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
      if (receivesEmberCombo(tile.type) && game.countAdjacentType(tile, "ember")) details.innerHTML += '<p>Ember combo · 3 burn/s for 1.5s during adjacent flame bursts.</p>';
      if (tile.type === "rail") details.innerHTML += game.hasCryoNeighbor(tile) ?
        '<p>Shatter linked · +25% Rail damage to chilled/frozen enemies · extra Cryos do not stack.</p>' :
        '<p>Shatter unlinked · place Cryo on an edge for +25% damage to chilled/frozen enemies.</p>';
      if (tile.type === "missile") details.innerHTML += game.hasCryoNeighbor(tile) ?
        '<p>Cold payload linked · blasts slow survivors by 25% for 1s · extra Cryos do not stack.</p>' :
        '<p>Cold payload unlinked · place Cryo on an edge for 25% blast slow for 1s.</p>';
      if (tile.type === "cryo" && game.countAdjacentType(tile, "rail")) details.innerHTML += '<p>Enables Shatter in edge-adjacent Rail Lances.</p>';
      if (tile.type === "cryo" && game.countAdjacentType(tile, "missile")) details.innerHTML += '<p>Enables cold payloads in edge-adjacent Missile Pods: 25% blast slow for 1s.</p>';
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
      note.textContent = blockReason || "Dismantling gives no Matter refund.";
      details.appendChild(note);
    }

    function hasSupportPreview(type) {
      return type === "shield" || type === "repair" || type === "reactor" || type === "bulkhead" || type === "collector" || type === "ember" || type === "cryo";
    }

    function supportCoversCell(origin, x, y, target) {
      var dx = x - origin.x, dy = y - origin.y;
      if (origin.type === "ember") return Math.abs(dx) + Math.abs(dy) === 1 && Boolean(target && receivesEmberCombo(target.type));
      if (origin.type === "cryo") return Math.abs(dx) + Math.abs(dy) === 1 && Boolean(target && receivesCryoCombo(target.type));
      if (origin.type === "reactor") return Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && Boolean(dx || dy) && (!target || isWeaponType(target.type));
      if (origin.type === "bulkhead") return Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && Boolean(dx || dy);
      if (origin.type === "collector") return Boolean(target && isWeaponType(target.type));
      var def = game.weaponDefinitions[origin.type];
      var radius = origin.type === "shield" ? def.shieldRadius : def.repairRadius;
      return dx * dx + dy * dy <= radius * radius;
    }

    function supportPreviewDescription(origin, count) {
      var def = game.weaponDefinitions[origin.type];
      var modules = count + (count === 1 ? " module" : " modules");
      if (origin.type === "ember") return "Flame-burst combo · " + count + " Cannon/Scatter/Flak · 3 burn/s for 1.5s · edge neighbors only";
      if (origin.type === "cryo") {
        var rails = 0, missiles = 0;
        game.ship.tiles.forEach(function (tile) {
          if (!supportCoversCell(origin, tile.x, tile.y, tile)) return;
          if (tile.type === "rail") rails += 1;
          if (tile.type === "missile") missiles += 1;
        });
        if (rails && !missiles) return "Shatter · " + count + (count === 1 ? " Rail" : " Rails") + " · +25% damage to chilled/frozen enemies · edge neighbors only";
        if (!count) return "Cryo links · place Rail or Missile on an edge · bonuses do not stack";
        return "Cryo links · " + rails + " Rail (+25% vs chilled/frozen) · " + missiles + " Missile (25% slow, 1s) · edge neighbors only";
      }
      if (origin.type === "shield") return "Protects " + modules + " · " + shieldBuildDescription(origin.tile);
      if (origin.type === "repair") return "Repairs " + modules + " · +" + def.repairAmount + " HP every " + def.repairInterval + "s after " + def.repairDelay + "s without hull damage";
      if (origin.type === "reactor") return "Boosts " + count + (count === 1 ? " weapon" : " weapons") + " · +" + Math.round(def.cooldownBonus * 100) + "% fire rate · surrounding 3×3";
      if (origin.type === "bulkhead") return "Protects " + modules + " · " + Math.round(def.damageReduction * 100) + "% less hull damage · surrounding 3×3";
      return "Ship-wide Matter bonus · placement has no range limit";
    }

    function receivedSupportBenefits(x, y, target, supports) {
      if (!target) return [];
      var counts = Object.create(null);
      supports.forEach(function (support) {
        if (supportCoversCell(support, x, y, target)) counts[support.type] = (counts[support.type] || 0) + 1;
      });
      return ["shield", "repair", "bulkhead", "reactor", "collector", "ember", "cryo"].filter(function (type) {
        return counts[type];
      }).map(function (type) {
        var offline = type === "shield" && shieldVfx.coverageAt(x, y) === 1;
        if (type === "ember") return { type:type, count:1, offline:false, label:"Ember combo (during flame bursts; does not stack)" };
        if (type === "cryo") return { type:type, count:1, offline:false, label:cryoBenefitLabel(target.type, false) };
        return { type: type, count: counts[type], offline: offline,
          label: MODULES[type].name + (counts[type] > 1 ? " ×" + counts[type] : "") + (offline ? " (recharging)" : "") };
      });
    }

    function cryoBenefitLabel(type, preview) {
      return (type === "missile" ? "Cold payload (25% blast slow for 1s" : "Shatter (+25% Rail damage to chilled/frozen enemies") +
        (preview ? "; includes placement preview)" : "; does not stack)");
    }

    function renderBuildSupportBenefits(cell, benefits) {
      var signature = benefits.map(function (benefit) { return benefit.type + ":" + benefit.count + ":" + benefit.offline + (benefit.preview ? ":preview" : ""); }).join(" ");
      cell.classList.toggle("has-support-benefits", Boolean(benefits.length));
      if (cell.dataset.supportBenefits !== signature) {
        if (cell.supportBenefits && cell.supportBenefits.parentNode === cell) cell.removeChild(cell.supportBenefits);
        cell.supportBenefits = null;
        if (benefits.length) {
          cell.supportBenefits = document.createElement("span");
          cell.supportBenefits.className = "cell-support-benefits";
          cell.supportBenefits.setAttribute("aria-hidden", "true");
          cell.supportBenefits.innerHTML = benefits.map(function (benefit) {
            return '<span class="support-benefit' + (benefit.offline ? ' is-offline' : '') + (benefit.preview ? ' is-preview' : '') + '" data-support-type="' + benefit.type + '" title="' + benefit.label + '"></span>';
          }).join("");
        }
        cell.dataset.supportBenefits = signature;
      }
      // Hover ghosts replace the cell artwork, so reattach its existing badges afterward.
      if (cell.supportBenefits && cell.supportBenefits.parentNode !== cell) cell.appendChild(cell.supportBenefits);
    }

    function updateBuildPreview(x, y) {
      if (!game || game.state !== "building") return;
      var drag = buildInteraction.drag;
      var hovered = Number.isInteger(x) && Number.isInteger(y) ? game.ship.tiles.get(keyOf(x, y)) : null;
      var selected = selectedBuildTile();
      var origin = null;
      if (drag && drag.active) {
        if (hasSupportPreview(drag.type) && Number.isInteger(x) && Number.isInteger(y)) origin = { x: x, y: y, type: drag.type };
      } else if (hovered && hasSupportPreview(hovered.type)) origin = { x: hovered.x, y: hovered.y, tile: hovered, type: hovered.type };
      else if (selected && hasSupportPreview(selected.type)) origin = { x: selected.x, y: selected.y, tile: selected, type: selected.type };
      else if (!selected && !hovered && Number.isInteger(x) && Number.isInteger(y) && hasSupportPreview(selectedBuildModule)) {
        origin = { x: x, y: y, type: selectedBuildModule };
      }
      buildInteraction.preview = origin;
      shieldVfx.update(game.ship.tiles, game.weaponDefinitions.shield);
      var supports = [];
      game.ship.tiles.forEach(function (tile) { if (hasSupportPreview(tile.type)) supports.push(tile); });
      ui.buildGrid.classList.toggle("support-focus", Boolean(origin));
      var protectedCount = 0;
      var installedCoverage = 0;
      var cryoReceiverPreviewText = "";
      Array.prototype.forEach.call(ui.buildGrid.children, function (cell) {
        var gx = Number(cell.dataset.x);
        var gy = Number(cell.dataset.y);
        var key = keyOf(gx, gy);
        var ghost = !selected && !game.ship.tiles.has(key) && gx === x && gy === y && validPlacement(gx, gy, selectedBuildModule) && game.matter >= modulePrice(selectedBuildModule);
        var target = game.ship.tiles.get(key);
        var benefits = receivedSupportBenefits(gx, gy, target || (ghost ? { type: selectedBuildModule } : null), supports);
        if (ghost && selectedBuildModule === "rail") {
          cryoReceiverPreviewText = benefits.some(function (benefit) { return benefit.type === "cryo"; }) ?
            "Shatter linked · +25% vs chilled/frozen · edge neighbor" :
            "Shatter unlinked · add an edge-adjacent Cryo for +25% vs chilled/frozen";
        }
        if (ghost && selectedBuildModule === "missile") {
          cryoReceiverPreviewText = benefits.some(function (benefit) { return benefit.type === "cryo"; }) ?
            "Cold payload linked · 25% blast slow for 1s · edge neighbor" :
            "Cold payload unlinked · add an edge-adjacent Cryo for 25% blast slow for 1s";
        }
        var inRadius = origin && supportCoversCell(origin, gx, gy, target);
        if (inRadius && !origin.tile && (target || ghost)) {
          var previewBenefit = benefits.find(function (benefit) { return benefit.type === origin.type; });
          if (!previewBenefit) {
            previewBenefit = { type: origin.type, count: 0 };
            benefits.push(previewBenefit);
          }
          previewBenefit.count = origin.type === "ember" || origin.type === "cryo" ? 1 : previewBenefit.count + 1;
          previewBenefit.preview = true;
          previewBenefit.offline = false;
          previewBenefit.label = origin.type === "ember" ? "Ember combo (during flame bursts; includes placement preview)" :
            origin.type === "cryo" ? cryoBenefitLabel(target.type, true) :
            MODULES[origin.type].name + (previewBenefit.count > 1 ? " ×" + previewBenefit.count : "") + " (includes placement preview)";
        }
        var shieldPreview = inRadius && origin.type === "shield";
        var occupied = Boolean(target);
        var coverage = shieldVfx.coverageAt(gx, gy);
        var covered = Boolean(coverage || shieldPreview);
        cell.classList.toggle("shield-range", covered);
        cell.classList.toggle("shield-covered", Boolean(covered && occupied));
        cell.classList.toggle("shield-installed-coverage", Boolean(coverage));
        cell.classList.toggle("shield-preview-new", Boolean(shieldPreview && !coverage));
        cell.classList.toggle("shield-offline", coverage === 1);
        cell.classList.toggle("support-range", Boolean(inRadius));
        cell.classList.toggle("support-preview", Boolean(inRadius && !origin.tile));
        cell.dataset.supportType = origin ? origin.type : "";
        cell.dataset.shieldCoverage = coverage ? (coverage === 2 ? "active" : "recharging") : (shieldPreview ? "preview" : "none");
        if (!cell.dataset.baseLabel) cell.dataset.baseLabel = cell.getAttribute("aria-label");
        var coverageLabel = coverage ? (coverage === 2 ? "Shield coverage" : "Shield coverage, recharging") : (shieldPreview ? "New shield coverage preview" : "No shield coverage");
        if (inRadius && origin.type !== "shield") coverageLabel += " · " + MODULES[origin.type].name + (origin.tile ? " support" : " preview");
        if (benefits.length) coverageLabel += " · Receives: " + benefits.map(function (benefit) { return benefit.label; }).join(", ");
        cell.setAttribute("aria-label", cell.dataset.baseLabel + " · " + coverageLabel);
        cell.title = (cell.classList.contains("upgrade-available") ? "Upgrade available · " : "") + coverageLabel;
        cell.classList.toggle("preview-origin", Boolean(ghost || (origin && gx === origin.x && gy === origin.y) || buildInteraction.pendingCellKey === key));
        if (!occupied && !(drag && drag.active)) {
          if (ghost) { cell.innerHTML = '<span class="pc-placement-ghost">' + ((moduleArt && moduleArt.iconHtml(selectedBuildModule, true)) || moduleIconHtml(selectedBuildModule)) + '</span>'; cell.dataset.pcGhost = "1"; }
          else if (cell.dataset.pcGhost) { cell.innerHTML = "<span>" + (cell.classList.contains("valid") ? "+" : "·") + "</span>"; delete cell.dataset.pcGhost; }
        }
        renderBuildSupportBenefits(cell, benefits);
        if (inRadius && occupied) protectedCount += 1;
        if (coverage && occupied) installedCoverage += 1;
      });
      var status = document.getElementById("buildPreviewStatus");
      if (!status) return;
      status.textContent = origin ? supportPreviewDescription(origin, protectedCount) :
        (installedCoverage ? "Shield coverage: " + installedCoverage + " modules" :
          (hasSupportPreview(selectedBuildModule) && !selected ? "Hover a cell or drag the module to preview its support." : ""));
      if (origin && !origin.tile) status.textContent = "Preview · " + status.textContent + (origin.type === "shield" ? " · Gold marks new coverage" : "");
      if (origin && origin.type === "shield" && selected && origin.tile === selected) {
        status.textContent = "Protects " + protectedCount + " modules · " + game.weaponDefinitions.shield.shieldRadius + "-cell radius";
      }
      if (cryoReceiverPreviewText) status.textContent = "Preview · " + cryoReceiverPreviewText;
      if (buildInteraction.pendingCellKey) status.textContent = "Tap again to attach" +
        (cryoReceiverPreviewText ? " · " + cryoReceiverPreviewText : origin ? " · " + supportPreviewDescription(origin, protectedCount) : " the module.");
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
        (document.getElementById("pcViewport") || document.body).appendChild(drag.ghost);
      }
      drag.ghost.style.left = (event.clientX - document.getElementById("pcViewport").getBoundingClientRect().left) + "px";
      drag.ghost.style.top = (event.clientY - document.getElementById("pcViewport").getBoundingClientRect().top) + "px";
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
        readyFamilies[tile.type] = runUpgrades.options(tile.type, game.upgrades[tile.type], upgradePricingCopies(tile.type), effectiveBranchLicenses()).some(function (option) { return !option.locked && (game.testRange || option.cost <= game.matter); });
      });
      var selected = MODULES[selectedBuildModule];
      var selectedPrice = modulePrice(selectedBuildModule);
      var canAffordSelected = game.matter >= selectedPrice;
      var missingMatter = Math.ceil(selectedPrice - game.matter);
      var inheritedUpgradeCost = game.testRange ? 0 : runUpgrades.investment(selectedBuildModule, game.upgrades[selectedBuildModule]);
      var copyPriceBreakdown = inheritedUpgradeCost > 0 ? '<small class="copy-price-breakdown">' +
        (selectedPrice - inheritedUpgradeCost) + ' base + ' + inheritedUpgradeCost + ' upgrades</small>' : '';
      ui.buildSelection.innerHTML = moduleGlyphHtml(selectedBuildModule) + '<div><span class="module-role">Buy one copy</span><strong>' + selected.name + '</strong><p>' + selected.summary + '</p></div><div class="selection-price' + (canAffordSelected ? '' : ' short') + '">' + selectedPrice + ' MATTER' + copyPriceBreakdown + '<small>' + (canAffordSelected ? 'READY TO ATTACH' : 'Available: ' + Math.floor(game.matter) + ' Matter') + '</small></div>';
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
      var buildCellSize = viewWidth >= 1600 ? 88 : 68;
      ui.buildGrid.style.setProperty("--pc-cell", buildCellSize + "px");
      ui.buildGrid.style.gridTemplateColumns = "repeat(" + columns + ", " + buildCellSize + "px)";
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
            var artType = tileArtType(tile);
            var cellArt = moduleArt && moduleArt.iconHtml(artType, true, { angle: tile.aim });
            var glyph = cellArt || (tile.type === "core" ? "▲" : moduleIconHtml(tile.type));
            if (cellArt) button.classList.add("has-module-art");
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
            button.innerHTML = "<span>" + (placeable ? "+" : (structurallyValid ? "+" : "·")) + "</span>";
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
            button.addEventListener("pointerenter", function () { if (!buildHoverSuspended && (!buildInteraction.drag || !buildInteraction.drag.active)) updateBuildPreview(gx, gy); });
            button.addEventListener("pointerleave", function () { if (!buildInteraction.drag || !buildInteraction.drag.active) updateBuildPreview(); });
            // Keyboard focus has its own outline; it must not leave a mouse placement ghost behind.
            button.addEventListener("blur", function () { if (!buildInteraction.drag || !buildInteraction.drag.active) updateBuildPreview(); });
          })(x, y);
          ui.buildGrid.appendChild(button);
        }
      }
      ui.buildHint.textContent = installedSelection
        ? (installedSelection.type === "core" ? "Select an installed module to inspect, upgrade or dismantle it." : "Inspect, upgrade or dismantle this module. Select the catalog to add another.")
        : canAffordSelected
        ? "Drag " + selected.name + " to the ship, or select a + cell."
        : "Selected for inspection. Earn " + missingMatter + " more Matter to attach " + selected.name + ".";
      ui.buildMatter.textContent = Math.floor(game.matter);
      renderBuildModuleDetails();
      renderRunUpgrades();
      updateBuildPreview();
      centerBuildSelection();
      trainingShipState();
      updateTrainingView();
    }

    function openBuild() {
      if (!game || game.state !== "playing" || game.finished) return;
      resetMobileInput();
      dismissControlHint();
      game.state = "building";
      if (playtestTelemetry) playtestTelemetry.recordBuild(true, game.elapsed, { matter: game.matter, modules: game.ship.tiles.size });
      if (!moduleAvailable(selectedBuildModule)) selectedBuildModule = "cannon";
      ui.buildOverlay.classList.remove("hidden");
      createCatalog();
      renderBuildGrid();
      updateHud();
      audio.stop();
      audio.tone(210, .08, .025, "sine", 80);
    }

    function closeBuild() {
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
    var settingsPageOpen = false;
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
      var sections = { armory:["hangarWeaponsPanel","hangarWeaponTab"], cores:["pcCoresPanel","pcCoresTab"], upgrades:["hangarUpgradesPanel","hangarUpgradeTab"], research:["pcResearchPanel","pcResearchTab"] };
      Object.keys(sections).forEach(function (key) {
        var panel=document.getElementById(sections[key][0]), button=document.getElementById(sections[key][1]);
        if(panel) panel.classList.toggle("hidden",key!==tab);
        if(button) { button.classList.toggle("selected",key===tab);button.setAttribute("aria-selected",String(key===tab)); }
      });
    }

    function openHangar(tab) {
      ui.menu.classList.add("hidden");
      ui.hangarOverlay.classList.remove("hidden");
      setHangarTab(tab || "upgrades");
      renderMetaShop();
      renderStarterPicker();
      renderStarterSelection();
      renderCores();
    }

    function closeHangar() {
      ui.hangarOverlay.classList.add("hidden");
      ui.menu.classList.remove("hidden");
      renderStarterSelection();
      renderCores();
    }

    function showSettingsPage(open) {
      settingsPageOpen = open;
      document.getElementById("settingsContent").classList.toggle("hidden", !open);
      document.getElementById("pauseSettingsButton").classList.toggle("hidden", open);
      ui.pauseOverlay.classList.toggle("settings-view", open);
      ui.pauseTitle.textContent = open ? "Settings" : "Paused";
      ui.pauseEyebrow.textContent = open ? "GAME OPTIONS" : "COMBAT SUSPENDED";
      ui.resumeButton.textContent = open ? (settingsOpenedFromMenu ? "Close" : "Back to pause") : "Resume [P]";
      ui.pauseHangarButton.classList.toggle("hidden", open);
      ui.restartButton.classList.toggle("hidden", open || !game || !game.training);
      if (open) syncSettingsUi();
    }

    function openPauseSettings() {
      if (!game || game.state !== "paused" || game.finished) return;
      showSettingsPage(true);
      ui.pauseTitle.setAttribute("tabindex", "-1");
      ui.pauseTitle.focus({ preventScroll: true });
      document.getElementById("settingsContent").scrollTop = 0;
    }

    function openMenuSettings() {
      settingsOpenedFromMenu = true;
      showSettingsPage(true);
      ui.pauseEyebrow.textContent = "GAME OPTIONS";
      ui.pauseTitle.textContent = "Settings";
      document.getElementById("settingsContent").scrollTop = 0;
      ui.resumeButton.textContent = "Close";
      ui.restartButton.classList.add("hidden");
      ui.pauseHangarButton.classList.add("hidden");
      ui.pauseOverlay.classList.remove("hidden");
      syncSettingsUi();
    }

    function openPause(reason) {
      if (!game || game.state !== "playing" || game.finished) return;
      resetMobileInput();
      settingsOpenedFromMenu = false;
      showSettingsPage(false);
      if (!reason || reason === "manual") dismissControlHint();
      game.state = "paused";
      if (playtestTelemetry) playtestTelemetry.recordPause(true, game.elapsed, reason || "manual");
      keys = Object.create(null);
      ui.pauseEyebrow.textContent = reason || "COMBAT SUSPENDED";
      ui.pauseTitle.textContent = "Paused";
      ui.resumeButton.textContent = "Resume [P]";
      ui.pauseHangarButton.textContent = game.testRange ? "Return from range" : game.training ? "Exit training" : "End run";
      if (game.testRange) ui.restartButton.textContent = "Reset loadout";
      ui.restartButton.classList.toggle("hidden", !game.training);
      ui.pauseHangarButton.classList.remove("hidden");
      ui.pauseOverlay.classList.remove("hidden");
      syncSettingsUi();
      audio.stop();
      if (!reason || reason === "manual") audio.tone(190, .07, .02, "sine", -45);
      if (game.training) updateTrainingView();
    }

    function closePause() {
      if (settingsPageOpen && !settingsOpenedFromMenu) {
        showSettingsPage(false);
        document.getElementById("pauseSettingsButton").focus();
        return;
      }
      if (settingsOpenedFromMenu) {
        settingsOpenedFromMenu = false;
        showSettingsPage(false);
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
      if (rangeSession) { rangeSetModule(rangeSession.type); ui.pauseOverlay.classList.add("hidden"); return; }
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

    function dismissControlHint() {
      if (game && game.state === "playing" && !game.finished) document.getElementById("controlHint").classList.add("hidden");
    }

    function startRun() {
      if (rangeSession) { leaveRange(); return; }
      if (game && game.training) { leaveTraining(); return; }
      if (typeof clearBuildInteraction === "function") clearBuildInteraction();
      requestMobileFullscreen();
      audio.ensure();
      audio.stop();
      resetMobileInput();
      if (game && !game.finished) game.finishRun(false, true);
      game = new Game();
      clearCombatPresentation();
      document.getElementById("controlHint").classList.remove("hidden");
      selectedBuildModule = selectedStarter;
      syncLoadoutToSave();
      resetTelemetryFpsWindow();
      if (playtestTelemetry) {
        playtestTelemetry.beginRun({
          starterWeapon: selectedStarter,
          mode: "survival",
          targetSeconds: null,
          coreId: game.coreDef.id,
          modulesLost: game.modulesLost,
          metaLevels: selectedCoreRanks(),
          coreRanks: save.campaign.coreRanks, branchLicenses: save.progression.branchLicenses,
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
      if (rangeSession) { leaveRange(); return; }
      if (game && game.training) { leaveTraining(); return; }
      resetMobileInput();
      if (game && !game.finished) game.finishRun(false, true);
      game = null;
      audio.stop();
      clearCombatPresentation();
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

    function clearCombatPresentation() {
      // The menu owns its backdrop. Never leave a damage flash, warning, or the
      // last combat frame visible while the run itself has been discarded.
      ui.damageVignette.style.opacity = "0";
      ui.dangerBanner.classList.remove("show");
      ui.dangerBanner.textContent = "";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, viewWidth, viewHeight);
    }

    function exitToHangar() {
      if (rangeSession) { leaveRange(); return; }
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
      var core = game.ship.tiles.get("0,0");
      ui.hudMatter.textContent = Math.floor(game.matter);
      ui.hudKills.textContent = game.kills;
      ui.hudTime.textContent = formatTime(game.elapsed);
      ui.hudModules.textContent = game.ship.tiles.size;
      ui.hudBossProgress.textContent = game.bossSpawned ? "BOSS " + (game.bossesDefeated + 1) :
        (Number.isFinite(game.nextBossAt) ? "BOSS " + (game.bossesDefeated + 1) + " IN " + formatTime(Math.max(0, game.nextBossAt - game.elapsed)) : "HOLD UNTIL 10:00");
      if (game.testRange) ui.hudBossProgress.textContent = "TEST RANGE";
      if (core) {
        var healthRatio = core.hp / core.maxHp;
        ui.hudHpText.textContent = Math.ceil(core.hp) + " / " + Math.ceil(core.maxHp);
        ui.healthFill.style.width = clamp(healthRatio * 100, 0, 100) + "%";
        ui.hud.classList.toggle("core-danger", healthRatio <= .5);
        ui.hud.classList.toggle("core-critical", healthRatio <= .25);
      }
      if (game.boss && !game.boss.dead) {
        ui.bossName.textContent = (game.boss.displayName || "Siege Ring") +
          (game.boss.variant !== "ring" && game.boss.combatPhase === 2 ? " — PHASE 2" : "");
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
      if (game && game.testRange) output.x -= Math.min(140, viewWidth * .12);
      else if (game && game.training) output.y += Math.min(90, viewHeight * .14);
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
      var velocityX = game ? game.ship.vx : 0;
      var velocityY = game ? game.ship.vy : 0;
      var speed = Math.hypot(velocityX, velocityY);
      var trailLength = save.settings.reducedFlash ? 0 : Math.min(14, speed * .045);
      for (var i = 0; i < stars.length; i += 1) {
        var star = stars[i];
        var near = i % 3 === 0;
        var parallax = near ? .65 + star.depth * .35 : star.depth * .18;
        var sx = (star.x - cameraX * parallax) % viewWidth;
        var sy = (star.y - cameraY * parallax) % viewHeight;
        if (sx < 0) sx += viewWidth;
        if (sy < 0) sy += viewHeight;
        ctx.globalAlpha = star.alpha;
        ctx.fillStyle = i % 7 === 0 ? "#65e8ff" : "#b9d8e6";
        if (near && trailLength > 1) {
          ctx.strokeStyle = ctx.fillStyle;
          ctx.lineWidth = star.size;
          ctx.beginPath();
          ctx.moveTo(sx + velocityX / speed * trailLength, sy + velocityY / speed * trailLength);
          ctx.lineTo(sx, sy);
          ctx.stroke();
        }
        ctx.fillRect(sx, sy, star.size, star.size);
      }
      ctx.globalAlpha = 1;
      var grid = 84;
      var offsetX = ((-cameraX) % grid + grid) % grid;
      var offsetY = ((-cameraY) % grid + grid) % grid;
      ctx.strokeStyle = "rgba(101,232,255,.065)";
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

    function enemyPath(context, enemy, x, y, radiusMultiplier, rotation) {
      var radius = enemy.radius * (radiusMultiplier || 1);
      if (enemy.sides === 0 || enemy.sides >= 18) {
        context.beginPath();
        context.arc(x, y, radius, 0, TAU);
      } else {
        polygonPath(context, x, y, radius, enemy.sides, rotation === undefined ? enemy.rotation : rotation);
      }
    }

    var enemySpriteCache = Object.create(null);

    function isRangedEnemy(enemy) {
      return enemy && (enemy.type === "bolter" || enemy.type === "gunner" || enemy.type === "sniper");
    }

    function turnAngleTowards(current, target, radiansPerSecond, dt) {
      if (!Number.isFinite(current)) return target;
      var difference = Math.atan2(Math.sin(target - current), Math.cos(target - current));
      return current + clamp(difference, -radiansPerSecond * dt, radiansPerSecond * dt);
    }

    function enemyCollisionFacing(enemy) {
      return enemy && Number.isFinite(enemy.rotation) ? enemy.rotation : 0;
    }

    function enemyVisualFacing(enemy) {
      return enemy && Number.isFinite(enemy.visualRotation)
        ? enemy.visualRotation
        : enemyCollisionFacing(enemy);
    }

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
        var usesEnemyArt = enemyArt && enemyArt.available(type);
        var displaySize = Math.max(
          Math.ceil((def.radius + 10) * 2),
          usesEnemyArt ? Math.ceil(enemyArt.displaySize(type, def.radius) * Math.SQRT2) : 0
        );
        var sprite = document.createElement("canvas");
        sprite.width = Math.ceil(displaySize * dpr);
        sprite.height = Math.ceil(displaySize * dpr);
        var spriteContext = sprite.getContext("2d", { alpha: true });
        spriteContext.setTransform(dpr, 0, 0, dpr, 0, 0);
        var center = displaySize * .5;
        var spriteEnemy = { radius: def.radius, sides: def.sides, rotation: 0 };
        if (usesEnemyArt) {
          enemyArt.draw(spriteContext, type, center, center, def.radius, 0);
        } else {
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
          drawEnemySpriteDetails(spriteContext, type, center, center, def.radius, 0);
        }
        enemySpriteCache[type] = { sprite: sprite, size: displaySize, half: center };
      });
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
      if (enemy.variant === "storm") {
        ctx.strokeStyle = "#70ffc2";
        ctx.setLineDash([10, 8]);
        for (var edge = -1; edge <= 1; edge += 2) {
          var gapEdge = enemy.volleyAngle + edge * 1.5 / enemy.shotCount * TAU;
          ctx.beginPath();
          ctx.moveTo(pos.x + Math.cos(gapEdge) * (enemy.radius + 12), pos.y + Math.sin(gapEdge) * (enemy.radius + 12));
          ctx.lineTo(pos.x + Math.cos(gapEdge) * 450, pos.y + Math.sin(gapEdge) * 450);
          ctx.stroke();
        }
        ctx.setLineDash([]);
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
        if (game.attackVfx && game.attackVfx.field(ctx, field, pos, save.settings.reducedFlash, currentQualityTier())) continue;
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

    function drawColdIndicators() {
      var zoom = Math.max(.35, game.camera.zoom || 1);
      var detailBudget = save.settings.reducedFlash ? 0 : COLD_DETAIL_BUDGETS[currentQualityTier()];
      for (var i = 0; i < game.enemies.length; i += 1) {
        var enemy = game.enemies[i];
        var frozen = enemy.type !== "boss" && game.elapsed < (enemy.freezeUntil || 0);
        if (enemy.dead || (!(enemy.slowTimer > 0 && enemy.slowFactor < 1) && !frozen)) continue;
        var pos = worldToScreen(enemy.x, enemy.y);
        if (!isScreenVisibleAtZoom(pos, enemy.type === "boss" ? 420 : 120)) continue;
        var cached = enemySpriteCache[enemy.type];
        var visualRadius = enemyArt && enemyArt.available(enemy.type)
          ? enemyArt.displaySize(enemy.type, enemy.radius) * .5
          : (cached ? cached.half : enemyCollisionRadius(enemy));
        coldVfx.draw(ctx, enemy, pos, visualRadius, enemyVisualFacing(enemy),
          game.backgroundPulse, game.elapsed, zoom, detailBudget > 0, save.settings.reducedFlash, cached);
        if (detailBudget > 0) detailBudget -= 1;
      }
    }

    function drawBurnIndicators() {
      var zoom = Math.max(.35, game.camera.zoom || 1);
      var detailBudget = save.settings.reducedFlash ? 0 : BURN_FLAME_DETAIL_BUDGETS[currentQualityTier()];
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      for (var i = 0; i < game.enemies.length; i += 1) {
        var enemy = game.enemies[i];
        if (enemy.dead || !(enemy.burnTimer > 0)) continue;
        var pos = worldToScreen(enemy.x, enemy.y);
        if (!isScreenVisibleAtZoom(pos, enemy.type === "boss" ? 420 : 120)) continue;
        var cached = enemySpriteCache[enemy.type];
        var visualRadius = enemyArt && enemyArt.available(enemy.type)
          ? enemyArt.displaySize(enemy.type, enemy.radius) * .5
          : (cached ? cached.half : enemyCollisionRadius(enemy));
        fireVfx.burn(ctx, enemy, pos, visualRadius, enemyVisualFacing(enemy),
          game.backgroundPulse, zoom, detailBudget > 0, save.settings.reducedFlash);
        if (detailBudget > 0) detailBudget -= 1;
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
          }
          ctx.globalAlpha = 1;
        }
        if (enemy.type !== "boss") {
          var cachedGeometry = enemySpriteCache[enemy.type];
          if (cachedGeometry) {
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
            ctx.save();
            ctx.translate(pos.x, pos.y);
            ctx.rotate(enemyVisualFacing(enemy));
            ctx.drawImage(cachedGeometry.sprite, -cachedGeometry.half, -cachedGeometry.half, cachedGeometry.size, cachedGeometry.size);
            ctx.restore();
            if (enemy.hitFlash > 0) {
              ctx.globalAlpha = clamp(enemy.hitFlash / .1, 0, 1);
              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 2;
              enemyPath(ctx, enemy, pos.x, pos.y, 1, enemyVisualFacing(enemy));
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
      drawColdIndicators();
      drawBurnIndicators();
    }

    function tileArtType(tile) {
      return tile.type === "core" && game && game.coreDef.id !== "standard" ? "core-" + game.coreDef.id : tile.type;
    }

    function drawModuleGlyph(tile, x, y, targetContext, size) {
      var glyphContext = targetContext || ctx;
      var kick = window.DriftWeaponFeedback.offset(tile) * (size || TILE_SIZE);
      if (kick) {
        x -= Math.cos(tile.aim) * kick;
        y -= Math.sin(tile.aim) * kick;
      }
      if (moduleArt && moduleArt.drawEquipment(glyphContext, tileArtType(tile), x, y, size || TILE_SIZE, tile.aim)) return;
      if (tile.type === "core") {
        glyphContext.save();
        glyphContext.strokeStyle = game ? CORE_COLORS[game.coreDef.id] : CORE_COLORS.standard;
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
      var core = game.ship.tiles.get("0,0");
      if (!core || core.hp <= 0) return;
      var simplifiedEffects = currentQualityTier() > 0;
      var shipScreen = worldToScreen(game.ship.x, game.ship.y);
      ctx.save();
      ctx.translate(shipScreen.x, shipScreen.y);
      ctx.rotate(game.ship.angle);
      shieldVfx.update(game.ship.tiles, game.weaponDefinitions.shield);
      shieldVfx.drawFields(ctx, TILE_SIZE);
      // Lay down every hull tile before any turret, so neighbors cannot hide barrels.
      game.ship.tiles.forEach(function (tile) {
        if (moduleArt) moduleArt.drawBase(ctx, tileArtType(tile), tile.x * TILE_SIZE, tile.y * TILE_SIZE, TILE_SIZE);
      });
      game.ship.tiles.forEach(function (tile) {
        drawModuleGlyph(tile, tile.x * TILE_SIZE, tile.y * TILE_SIZE);
      });
      // Status overlays stay above all equipment, including adjacent barrel overhang.
      game.ship.tiles.forEach(function (tile) {
        var x = tile.x * TILE_SIZE;
        var y = tile.y * TILE_SIZE;
        var color = tile.type === "core" ? CORE_COLORS[game.coreDef.id] : MODULES[tile.type].color;
        var damageGlow = clamp(tile.flash / .42, 0, 1);
        var damageAlpha = damageGlow * (save.settings.reducedFlash ? .24 : .46);
        var upgrading = tile.upgradeFlash > 0;
        ctx.shadowBlur = simplifiedEffects ? 0 : (tile.flash > 0 || upgrading ? 12 : (tile.type === "core" ? 8 : 0));
        ctx.shadowColor = tile.flash > 0 ? "#ff3f5f" : (upgrading ? "#65e8ff" : color);
        ctx.fillStyle = tile.flash > 0 ? "rgba(255,40,72," + damageAlpha + ")" : (upgrading ? "rgba(101,232,255," + (.15 + .3 * tile.upgradeFlash / .65) + ")" : "rgba(21,64,89,.34)");
        ctx.strokeStyle = tile.flash > 0 ? "#ff8799" : (upgrading ? "#b9f5ff" : color);
        ctx.lineWidth = tile.type === "core" ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.roundRect(x - TILE_SIZE * .46, y - TILE_SIZE * .46, TILE_SIZE * .92, TILE_SIZE * .92, 5);
        if (!moduleArt || !moduleArt.available("platform") || tile.flash > 0 || upgrading) {
          ctx.fill();
          ctx.stroke();
        } else if (tile.type === "core" && game.coreDef.id !== "standard") {
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
        if (tile.type === "shield") {
          // Keep charge inside its own tile so adjacent hull and field fills cannot cover it.
          ctx.fillStyle = "#11252e";
          ctx.fillRect(x - 16, y + 9, 32, 5);
          ctx.strokeStyle = tile.shield <= 0 ? "#cf9b67" : "#65e8ff";
          ctx.lineWidth = 1;
          ctx.strokeRect(x - 16, y + 9, 32, 5);
          ctx.fillStyle = "#65e8ff";
          ctx.fillRect(x - 15, y + 10, 30 * clamp(tile.shield / tile.maxShield, 0, 1), 3);
        }
        if (tile.hp < tile.maxHp) {
          ctx.fillStyle = "rgba(0,0,0,.7)";
          ctx.fillRect(x - 15, y + 15, 30, 2);
          ctx.fillStyle = tile.hp / tile.maxHp < .35 ? "#ff637c" : "#70ffc2";
          ctx.fillRect(x - 15, y + 15, 30 * clamp(tile.hp / tile.maxHp, 0, 1), 2);
        }
      });
      shieldVfx.drawSurface(ctx, TILE_SIZE, game.elapsed, save.settings.reducedFlash);
      var zoom = Math.max(.35, game.camera.zoom || 1);
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.shadowBlur = 0;
      ctx.globalAlpha = save.settings.reducedFlash ? .75 : 1;
      game.ship.tiles.forEach(function (tile) {
        var placementGrace = Math.max(0, (tile.placementProtectedUntil - game.elapsed) / MODULE_PLACEMENT_GRACE);
        var hitGrace = Math.max(0, (tile.projectileHitProtectedUntil - game.elapsed) / MODULE_PROJECTILE_GRACE);
        if (placementGrace > 0 || hitGrace > 0) {
          ctx.save();
          ctx.globalAlpha = (save.settings.reducedFlash ? .45 : .85) * Math.max(placementGrace, hitGrace);
          ctx.strokeStyle = placementGrace > 0 ? "#c1f3ff" : "#fff1cf";
          ctx.lineWidth = 1.5 / zoom;
          ctx.strokeRect(tile.x * TILE_SIZE - 20, tile.y * TILE_SIZE - 20, 40, 40);
          ctx.restore();
        }
        if (tile.type !== "flak") return;
        if (!game.hasActiveEmberNeighbor(tile)) return;
        fireVfx.ignition(ctx, tile.x * TILE_SIZE, tile.y * TILE_SIZE, zoom,
          game.backgroundPulse, save.settings.reducedFlash);
      });
      ctx.restore();
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
            if (projectile.incendiary) {
              fireVfx.pellet(ctx, projectile, pos, game.backgroundPulse, save.settings.reducedFlash);
            }
            if (!game.attackVfx || !game.attackVfx.projectile(ctx, projectile, pos, game.backgroundPulse, currentQualityTier(), save.settings.reducedFlash)) {
              queueProjectileCircle(projectile.color, pos.x, pos.y, projectile.radius);
            }
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
        if (game.attackVfx && game.attackVfx.projectile(ctx, projectile, pos, game.backgroundPulse, currentQualityTier(), save.settings.reducedFlash)) continue;
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
        if (effect.type === "shipChunk" && shipDebris) {
          if (isScreenVisibleAtZoom(effectPos, effect.radius)) {
            shipDebris.draw(ctx, effect, effectPos.x, effectPos.y, moduleArt, save.settings.reducedFlash);
          }
          continue;
        }
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
        if (combatFeedback.draw(ctx, effect, effectPos.x, effectPos.y, alpha, save.settings.reducedFlash, enemyArt)) continue;
        if (effect.type === "flameCone") {
          fireVfx.cone(ctx, effect, effectPos, save.settings.reducedFlash, currentQualityTier());
          continue;
        }
        if (effect.type === "cryoShatter") {
          coldVfx.shatter(ctx, effect, effectPos, save.settings.reducedFlash, currentQualityTier());
          continue;
        }
        if (effect.type === "ring" && effect.coldPayload) {
          coldVfx.blast(ctx, effect, effectPos, save.settings.reducedFlash, currentQualityTier());
          continue;
        }
        if (game.attackVfx && game.attackVfx.effect(ctx, effect, effectPos, save.settings.reducedFlash)) continue;
        if (effect.type === "ring") {
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
          ctx.globalCompositeOperation = "source-over";
          ctx.shadowBlur = 0;
          ctx.translate(effectPos.x, effectPos.y);
          ctx.rotate(effect.rotation);
          if (moduleArt && moduleArt.available(effect.moduleType)) {
            moduleArt.drawBase(ctx, effect.moduleType, 0, 0, TILE_SIZE);
            moduleArt.drawEquipment(ctx, effect.moduleType, 0, 0, TILE_SIZE, effect.moduleAim);
          } else {
            ctx.strokeRect(-15, -15, 30, 30);
            ctx.font = "800 12px ui-monospace, monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(effect.glyph, 0, 0);
          }
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
        if (game.testRange) rangeArena.draw(ctx, game, worldToScreen);
        drawEffects();
        if (game.attackVfx) game.attackVfx.muzzles(ctx, worldToScreen, save.settings.reducedFlash);
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

    var crashed = false;

    // An exception inside the loop would otherwise repeat every frame and freeze the game silently.
    function frame(now) {
      if (crashed) return;
      requestAnimationFrame(frame);
      try {
        stepFrame(now);
      } catch (error) {
        handleCrash(error);
      }
    }

    function crashReport(error) {
      var message = error && error.stack ? String(error.stack) : String(error);
      var lines = message.split("\n").slice(0, 8);
      if (window.PlaytestTelemetry) lines.push("Build: " + window.PlaytestTelemetry.gameBuild);
      lines.push("Run time: " + (game ? formatTime(game.elapsed) : "no run"));
      lines.push("Browser: " + navigator.userAgent);
      return lines.join("\n");
    }

    function handleCrash(error) {
      if (crashed) return;
      crashed = true;
      console.error("Bastion stopped after an unexpected error.", error);
      var saved = false;
      try {
        bankActiveRun();
        saved = storeSave() !== false;
      } catch (saveError) {
        console.error("Run could not be banked after the crash.", saveError);
      }
      try { if (playtestTelemetry) playtestTelemetry.flush(); } catch (telemetryError) { /* Crash screen matters more. */ }
      audio.stop();
      ui.crashSubtitle.textContent = saved ? "Your Fragments are saved." : "Progress could not be saved.";
      ui.crashDetails.textContent = crashReport(error);
      ui.crashOverlay.classList.remove("hidden");
      ui.crashReloadButton.focus();
    }

    function copyCrashReport() {
      var text = ui.crashDetails.textContent;
      var selectReport = function () {
        var range = document.createRange();
        range.selectNodeContents(ui.crashDetails);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      };
      if (!navigator.clipboard) { selectReport(); return; }
      navigator.clipboard.writeText(text).then(function () {
        ui.crashCopyButton.textContent = "Copied";
      }, selectReport);
    }

    function stepFrame(now) {
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
          // Let wreckage settle after death without advancing combat or rewards.
          if ((game.finished && game.state === "result") || game.deathFeedbackTime > 0) {
            game.updateEffects(delta);
            game.updateFeedback(delta);
            game.deathFeedbackTime = Math.max(0, game.deathFeedbackTime - delta);
          }
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
      if (!DEBUG || !def || def.legacy || selectedCoreRanks()[id] >= META_PURCHASE_CAP) return false;
      var cost = metaCost(selectedCoreRanks()[id]);
      if (save.fragments < cost) return false;
      save.fragments -= cost;
      selectedCoreRanks()[id] += 1;
      storeSave();
      renderMetaShop();
      return true;
    }

    function runSelfTests() {
      var failures = [];
      function expect(condition, message) {
        if (!condition) failures.push(message);
      }
      var smoothFacingProbe = turnAngleTowards(0, Math.PI, 2, .25);
      var wrappedFacingProbe = turnAngleTowards(TAU - .1, .1, 1, .05);
      expect(Math.abs(smoothFacingProbe - .5) < .0001 && wrappedFacingProbe > TAU - .1,
        "Enemy visual turning must use a bounded shortest-angle rotation.");
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
      expect(metaCost(0) === 1 && metaCost(24) === 5, "Meta cost curve is incorrect.");
      expect(Math.ceil(MODULES.cannon.baseCost * Math.pow(MODULES.cannon.scale, 2)) === 30, "Module cost curve is incorrect.");
      expect(WEAPON_TYPES.length === 12, "Weapon catalog must contain twelve distinct weapons.");
      expect(START_WEAPONS.length === 12 && isStarterWeapon("mine"), "Starter armory must include every licensed weapon including mines.");
      expect(Object.keys(MODULES).length === 18, "Build catalog must contain eighteen modules.");
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
        expect(phase.assaultRanged >= 0 && phase.assaultRanged <= Math.min(MAX_ASSAULT_RANGED_ESCORTS, Math.floor(phase.squadSize / 4)), "Assault ranged escorts must stay bounded and leave most slots for swarm bodies.");
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
      expect(BOSS_SPAWN_TIME === 180 && BOSS_WARNING_LEAD === 5, "Boss arrival telegraph timing is incorrect.");
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
      expect(rangedShotProbe.projectiles[0][0] === ENEMY_DEFS.bolter.muzzleOffset, "Bolt Drone shots must start at the forward muzzle.");
      var hullProbe = { x: 0, y: 0, vx: 1, vy: 0, rotation: 0, radius: 12, halfLength: 20, halfWidth: 6, collisionRadius: 21 };
      expect(enemyIntersectsCircle(hullProbe, 20, 0, 1) && !enemyIntersectsCircle(hullProbe, 0, 9, 1), "Projectile collision must follow a shaped enemy hull.");
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
      var enemyPoolProbe = Object.assign(Object.create(Game.prototype), { elapsed: 0, enemyId: 1, enemies: [], enemyPool: [], enemyById: new Map() });
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
      for (var cameraTileX = -Math.ceil(viewWidth / TILE_SIZE); cameraTileX <= Math.ceil(viewWidth / TILE_SIZE); cameraTileX += 1) cameraTiles.set(keyOf(cameraTileX, 0), { x: cameraTileX, y: 0 });
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
      expect(runFragmentReward(250, 360, 1) === 14, "Fragment reward formula is incorrect.");
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
    ui.finishSurvivalButton.addEventListener("click", function () {
      if (game && game.state === "milestone") game.finishRun(true, true);
    });
    ui.continueSurvivalButton.addEventListener("click", continueSurvival);
    ui.buildButton.addEventListener("click", openBuild);
    ui.pauseButton.addEventListener("click", function () { openPause(); });
    ui.mobileBuildButton.addEventListener("click", openBuild);
    ui.mobilePauseButton.addEventListener("click", function () { openPause(); });
    ui.closeBuild.addEventListener("click", closeBuild);
    ui.resumeButton.addEventListener("click", closePause);
    document.getElementById("pauseSettingsButton").addEventListener("click", openPauseSettings);
    ui.restartButton.addEventListener("click", requestRestart);
    ui.pauseHangarButton.addEventListener("click", exitToHangar);
    ui.hangarButton.addEventListener("click", exitToHangar);
    ui.crashCopyButton.addEventListener("click", copyCrashReport);
    ui.crashReloadButton.addEventListener("click", function () { window.location.reload(); });
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
      var target = event.target;
      if (event.code !== "Escape" && target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing || event.repeat) return;
      if (event.code === "Escape" && buildInteraction && buildInteraction.drag) { clearBuildInteraction(); renderBuildGrid(); event.preventDefault(); return; }
      if (["KeyW", "KeyA", "KeyS", "KeyD", "KeyB", "KeyP", "Escape"].indexOf(event.code) >= 0) event.preventDefault();
      var movementKey = ["KeyW", "KeyA", "KeyS", "KeyD"].indexOf(event.code) >= 0;
      if (movementKey) {
        if (!game || game.state !== "playing" || game.finished) return;
        if (mouseInput.active || mobileInput.active) resetMobileInput();
        keys[event.code] = true;
      }
      if (["KeyW", "KeyA", "KeyS", "KeyD", "KeyB", "KeyP", "Escape"].indexOf(event.code) >= 0) dismissControlHint();
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
      if (pointerId === undefined) {
        resetMouseInput();
        keys = Object.create(null);
      }
      if (pointerId !== undefined && mobileInput.pointerId !== pointerId) return;
      mobileInput.active = false;
      var capturedPointer = mobileInput.pointerId;
      mobileInput.pointerId = null;
      if (capturedPointer !== null && canvas.hasPointerCapture && canvas.hasPointerCapture(capturedPointer)) canvas.releasePointerCapture(capturedPointer);
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
      dismissControlHint();
      mobileInput.x = dx / distance;
      mobileInput.y = dy / distance;
      mobileInput.magnitude = strength;
      setJoystickVisual(mobileInput.x * travel * strength, mobileInput.y * travel * strength);
      event.preventDefault();
    }

    function resetMouseInput() {
      mouseInput.active = false;
      var pointerId = mouseInput.pointerId;
      mouseInput.pointerId = null;
      if (pointerId !== null && canvas.hasPointerCapture && canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
    }
    canvas.addEventListener("pointerdown", function (event) {
      if (event.pointerType !== "mouse" || event.button !== 0 || !game || game.state !== "playing" || game.finished) return;
      resetMobileInput();
      dismissControlHint();
      mouseInput.active = true;
      mouseInput.pointerId = event.pointerId;
      var canvasBounds = canvas.getBoundingClientRect();
      mouseInput.x = event.clientX - canvasBounds.left; mouseInput.y = event.clientY - canvasBounds.top;
      canvas.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    canvas.addEventListener("pointermove", function (event) {
      if (event.pointerType !== "mouse" || !mouseInput.active || event.pointerId !== mouseInput.pointerId) return;
      if (!(event.buttons & 1)) { resetMouseInput(); return; }
      var canvasBounds = canvas.getBoundingClientRect();
      mouseInput.x = event.clientX - canvasBounds.left; mouseInput.y = event.clientY - canvasBounds.top;
    });
    function endMousePointer(event) {
      if (event.pointerId === mouseInput.pointerId && (event.type !== "pointerup" || event.button === 0)) resetMouseInput();
    }
    window.addEventListener("pointerup", endMousePointer);
    canvas.addEventListener("pointercancel", endMousePointer);
    canvas.addEventListener("lostpointercapture", endMousePointer);

    function supportsFloatingJoystick(event) {
      if (event.pointerType === "mouse") return false;
      if (event.pointerType === "pen") return event.button === 0;
      if (event.pointerType === "touch") return true;
      return Boolean(window.matchMedia && window.matchMedia("(hover: none) and (pointer: coarse)").matches);
    }

    canvas.addEventListener("pointerdown", function (event) {
      if (!supportsFloatingJoystick(event)) return;
      if (!game || game.state !== "playing" || game.finished || mobileInput.active) return;
      resetMobileInput();
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

    function clearUnfocusedInput() {
      audio.setFocused(false);
      keys = Object.create(null);
      resetMobileInput();
      if (save.settings.autoPause && game && game.state === "playing" && !game.finished) openPause("FOCUS LOST — AUTO-PAUSED");
    }
    window.addEventListener("blur", clearUnfocusedInput);
    window.addEventListener("focus", function () { audio.setFocused(true); });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) clearUnfocusedInput();
      else audio.setFocused(true);
    });

    // Closing the window mid-run banks it like "End run" instead of discarding its Fragments.
    function bankActiveRun() {
      if (!game || game.finished || game.training || game.testRange) return;
      var fragmentsBefore = save.fragments;
      var carryBefore = save.fragmentCarryUnits;
      game.finishRun(game.state === "milestone", true);
      // A corrupted run must never overwrite the banked balance with NaN.
      if (!Number.isFinite(save.fragments) || !Number.isFinite(save.fragmentCarryUnits)) {
        save.fragments = fragmentsBefore;
        save.fragmentCarryUnits = carryBefore;
      }
    }

    window.addEventListener("pagehide", function () {
      bankActiveRun();
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

    // PC test sessions reuse Game but never own progression or telemetry.
    var rangeSession = null;
    var rangeArena = window.DriftTestRange.create();
    var allRangeLicenses = Object.keys(runUpgrades.trees).reduce(function (list, type) {
      return list.concat(runUpgrades.trees[type].branches.map(function (branch) { return type + ":" + branch.id; }));
    }, []);
    function effectiveBranchLicenses() { return game && game.testRange ? allRangeLicenses : save.progression.branchLicenses; }
    function rangeConfigurations(type) {
      var result = [{ name: "Base module", state: null }], queue = [null];
      while (queue.length) {
        var state = queue.shift();
        runUpgrades.options(type, state, 1, allRangeLicenses).forEach(function (choice) {
          if (choice.locked) return;
          var next = runUpgrades.nextState(type, state, choice);
          var path = (next.path || []).join(" / ");
          result.push({ name: (path ? path + " · " : "") + choice.name + " · rank " + next.level, state: next });
          queue.push(next);
        });
      }
      return result;
    }
    function rangeDefaultScenario(type) {
      if (type === "repair") return "repair";
      if (type === "collector") return "salvage";
      if (["shield", "flak", "armor", "bulkhead"].indexOf(type) >= 0) return "incoming";
      if (["mine", "cryo", "gravity"].indexOf(type) >= 0) return "moving";
      return "stationary";
    }
    function rangeSetModule(type) {
      if (!rangeSession || !MODULES[type]) return;
      audio.stop();
      game = new Game({ training: true }); game.testRange = true;
      game.ship.tiles.clear();
      game.ship.tiles.set("0,0", makeTile("core", 0, 0, true, 1, true));
      game.ship.tiles.set("0,-1", makeTile(type, 0, -1, false, 1, true));
      game.purchasedCounts[type] = 1;
      if (!isWeaponType(type)) {
        game.ship.tiles.set("1,0", makeTile("cannon", 1, 0, false, 1, true));
        game.purchasedCounts.cannon = 1;
        game.ship.tiles.set("-1,0", makeTile("armor", -1, 0, false, 1, true));
      }
      rangeSession.type = type;
      selectedBuildModule = type;
      clearBuildInteraction();
      rangeArena.reset(game, rangeDefaultScenario(type));
      updateHud();
    }
    function canEnterRange() {
      return !rangeSession && !trainingSession && (!game || game.finished)
        && (!ui.menu.classList.contains("hidden") || !ui.hangarOverlay.classList.contains("hidden"));
    }
    function startRange(type) {
      if (!canEnterRange()) return false;
      var overlayIds = ["menuOverlay", "hangarOverlay", "resultOverlay", "milestoneOverlay", "buildOverlay", "pauseOverlay", "hud", "bossHud", "debugBar"];
      rangeSession = { previousGame: game, previousState: game && game.state, selectedModule: selectedBuildModule,
        selectedKey: buildInteraction.selectedKey, telemetry: playtestTelemetry, debug: DEBUG,
        focus: document.activeElement, settings: settingsOpenedFromMenu,
        workspace: document.querySelector(".build-panel").classList.contains("pc-tree-open"),
        researchSelection: window.DriftPCResearch ? window.DriftPCResearch.captureSelection() : null,
        overlays: overlayIds.map(function (id) { var node = document.getElementById(id); return { node: node, hidden: node.classList.contains("hidden") }; }) };
      if (game && !game.finished) game.state = "paused";
      resetMobileInput(); clearBuildInteraction();
      playtestTelemetry = null; DEBUG = false; settingsOpenedFromMenu = false;
      ui.toast.classList.remove("show");
      rangeSession.overlays.forEach(function (entry) { entry.node.classList.add("hidden"); });
      ui.hud.classList.remove("hidden");
      rangeSetModule(MODULES[type] ? type : selectedStarter);
      audio.ensure();
    }
    function leaveRange() {
      if (!rangeSession) return;
      audio.stop();
      resetMobileInput(); clearBuildInteraction();
      ui.toast.classList.remove("show");
      var session = rangeSession;
      game = session.previousGame; playtestTelemetry = session.telemetry; DEBUG = session.debug;
      selectedBuildModule = session.selectedModule; settingsOpenedFromMenu = session.settings;
      rangeSession = null;
      if (window.DriftPCResearch) window.DriftPCResearch.restoreSelection(session.researchSelection);
      if (game) { game.state = session.previousState; game.accumulator = 0; game.lastFrame = performance.now(); }
      session.overlays.forEach(function (entry) { entry.node.classList.toggle("hidden", entry.hidden); });
      document.querySelector(".build-panel").classList.toggle("pc-tree-open", session.workspace);
      ["pcLayoutTab", "pcUpgradesTab"].forEach(function (id, index) {
        var tab = document.getElementById(id), selected = index === 1 ? session.workspace : !session.workspace;
        if (tab) { tab.classList.toggle("selected", selected); tab.setAttribute("aria-pressed", String(selected)); }
      });
      if (game && game.state === "building") { createCatalog(); buildInteraction.owner = game; buildInteraction.selectedKey = session.selectedKey; renderBuildGrid(); }
      updateHud();
      if (session.focus && session.focus.isConnected) session.focus.focus({ preventScroll: true });
    }
    function rangeUpgrade(state) {
      if (!rangeSession) return;
      var type = rangeSession.type;
      var valid = rangeConfigurations(type).some(function (entry) { return JSON.stringify(entry.state) === JSON.stringify(state); });
      if (!valid) return;
      if (state) game.upgrades[type] = JSON.parse(JSON.stringify(state)); else delete game.upgrades[type];
      game.weaponDefinitions[type] = runUpgrades.resolve(MODULES[type], state);
      game.refreshFamilyTiles(type, false);
      rangeArena.reset(game, rangeArena.snapshot().scenario);
      if (game.state === "building") finishBuildChange();
    }
    window.DriftPCGame = {
      modules: MODULES, configurations: rangeConfigurations, rangeScenarios: rangeArena.scenarios,
      startRange: startRange, canEnterRange: canEnterRange, leaveRange: leaveRange, rangeModule: rangeSetModule, rangeUpgrade: rangeUpgrade,
      rangeScenario: function (id) { if (rangeSession) rangeArena.reset(game, id); },
      rangeState: function () { return rangeSession ? Object.assign({ type: rangeSession.type, screen: game.state, upgrade: game.upgrades[rangeSession.type] || null }, rangeArena.snapshot()) : null; },
      rangeSnapshot: function () { return rangeSession ? { enemies: game.enemies.map(function(e) { return { hp: e.hp, x:e.x, y:e.y }; }), tiles:Array.from(game.ship.tiles.values()).map(function(t) { return { type:t.type,hp:t.hp,maxHp:t.maxHp,shield:t.shield }; }), definitions:JSON.parse(JSON.stringify(game.weaponDefinitions)) } : null; },
      icon: function (type) { return type === "core" ? moduleArt.iconHtml("core") : moduleIconHtml(type); },
      openBuild: openBuild, resize: resize, closeHangar: closeHangar, hangarTab: setHangarTab,
      clearBuildHover: function () { if (!buildInteraction.drag || !buildInteraction.drag.active) updateBuildPreview(); },
      suspendBuildHover: function () { buildHoverSuspended = true; updateBuildPreview(); },
      resumeBuildHover: function () { buildHoverSuspended = false; },
      selectBuildFamily: function (type) {
        if (!game || game.state !== "building") return false;
        var tile = Array.from(game.ship.tiles.values()).find(function (entry) { return entry.type === type && entry.type !== "core"; });
        if (!tile) return false;
        clearBuildInteraction(); buildInteraction.selectedKey = keyOf(tile.x, tile.y); selectedBuildModule = type;
        createCatalog(); renderBuildGrid(); return true;
      },
      buildState: function () {
        if (!game || game.state !== "building") return null;
        var selected = selectedBuildTile(), families = Object.create(null);
        game.ship.tiles.forEach(function (tile) {
          if (tile.type === "core") return;
          if (!families[tile.type]) families[tile.type] = { type:tile.type, count:0, rank:runUpgrades.label(tile.type,game.upgrades[tile.type]) };
          families[tile.type].count++;
        });
        return { type:selected ? selected.type : selectedBuildModule, installed:Boolean(selected),
          families:Object.values(families), dragging:Boolean(buildInteraction.drag && buildInteraction.drag.active), matter:Math.floor(game.matter), price:modulePrice(selectedBuildModule), free:Boolean(game.testRange) };
      },
      closeSettings: function () { showSettingsPage(false); },
      togglePause: function () { if (game && game.state === "paused") closePause(); else openPause(); },
      menu: function () { if (game && !game.finished) return; returnToMenu(); },
      presentation: function () {
        var tile = selectedBuildTile();
        var inputActive = Boolean(game && game.state === "playing" && (
          mouseInput.active || mobileInput.active || keys.KeyW || keys.KeyA || keys.KeyS || keys.KeyD
        ));
        return { module: tile ? tile.type : selectedBuildModule, starter: selectedStarter, core: campaign.getCore(save.campaign.selectedCore).name,
          menuSettings: settingsOpenedFromMenu, inputActive: inputActive };
      },
      statRows: function (type) {
        var def = game && game.testRange ? game.weaponDefinitions[type] : MODULES[type];
        var fields = [["damage", "Damage"], ["cooldown", "Fire interval", "s"], ["range", "Range"], ["hp", "Module health"], ["shots", "Shots"], ["pellets", "Pellets"], ["chains", "Chain targets"], ["shield", "Shield capacity"], ["repairAmount", "Repair HP"], ["matterBonus", "First siphon bonus"], ["cooldownBonus", "Local fire-rate bonus"], ["mass", "Mass"], ["shieldRadius", "Shield radius", " cells"], ["rechargeDelay", "Recharge delay", "s"], ["rechargeRate", "Shield recharge", "/s"], ["repairInterval", "Repair interval", "s"], ["repairRadius", "Repair radius", " cells"], ["repairDelay", "Safe repair delay", "s"], ["damageReduction", "Adjacent damage reduction"], ["blastRadius", "Blast radius"], ["fieldRadius", "Field radius"], ["fieldDuration", "Field duration", "s"], ["pullStrength", "Pull strength"], ["slowFactor", "Enemy speed multiplier"], ["slowDuration", "Slow duration", "s"], ["burnDamage", "Burn damage", "/s"], ["burnDuration", "Burn duration", "s"], ["penetration", "Penetration"], ["burstCount", "Burst shots"], ["burstInterval", "Burst interval", "s"], ["beamWidth", "Beam width"], ["beamCount", "Beam count"], ["beamDuration", "Beam duration", "s"], ["cloudDuration", "Cloud duration", "s"], ["jumpRange", "Chain jump range"], ["clusterCount", "Cluster count"], ["collapseDamage", "Collapse damage"]];
        return fields.filter(function (field) { return def[field[0]] !== undefined; }).map(function (field) {
          var value = def[field[0]]; value = (field[0].includes("Bonus") || field[0] === "damageReduction") ? Math.round(value * 100) + "%" : Number(value.toFixed(2)) + (field[2] || "");
          return "<dt>" + field[1] + "</dt><dd>" + value + "</dd>";
        }).join("");
      },
      drawHero: function (target) {
        var context = target.getContext("2d"); context.clearRect(0,0,800,800);
        var tiles = [{ type:"core",x:0,y:0 },{ type:selectedStarter,x:0,y:-1 }];
        context.save(); context.translate(400,435); context.rotate(-.25); context.scale(1.4,1.4);
        tiles.forEach(function (tile) { moduleArt.drawBase(context, tile.type, tile.x*112, tile.y*112, 106); });
        tiles.forEach(function (tile) { if (!moduleArt.drawEquipment(context,tile.type,tile.x*112,tile.y*112,106,-Math.PI/2)) drawModuleGlyph({type:tile.type,aim:-Math.PI/2},tile.x*112,tile.y*112,context,106); });
        context.restore();
      }
    };

    window.__driftBastion = {
      getState: function () {
        if (!game) return { screen: "menu", fragments: save.fragments, progression: JSON.parse(JSON.stringify(save.progression)), campaign: JSON.parse(JSON.stringify(save.campaign)), telemetry: playtestTelemetry ? playtestTelemetry.getStatus() : null };
        return {
          screen: game.state,
          mode: game.testRange ? "range" : game.training ? "training" : "survival",
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
      spawnEnemy: function (type, x, y) {
        if (!DEBUG || !game || !ENEMY_DEFS[type]) return false;
        return Boolean(game.spawnEnemy(type, x, y));
      },
      buyMeta: buyMetaForTests
    };

    resize();
    if (enemyArt && enemyArt.ready) {
      enemyArt.ready.then(function () { buildEnemySpriteCache(); });
    }
    syncSettingsUi();
    renderStarterPicker();
    renderStarterSelection();
    renderMetaShop();
    updateTelemetryStatus();
    syncInstallButton();
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("./service-worker.js").catch(function () {});
    }
    if (DEBUG) { runSelfTests(); ui.toast.classList.remove("show"); }
    requestAnimationFrame(frame);
  })();
