(function (root, factory) {
  "use strict";

  var progression = factory();
  if (typeof module === "object" && module.exports) module.exports = progression;
  if (root) root.DriftProgression = progression;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";

  var MAX_PROGRESS = 1000000000;
  // Whole credit units retain sub-Fragment rewards without save-time float drift.
  var REWARD_SCALE = 600000;
  var WEAPONS = ["cannon", "scatter", "flak", "laser", "missile", "cryo", "arc", "pulse", "rail", "mine", "ember", "gravity"];
  var MODULE_TYPES = WEAPONS.concat(["armor", "shield", "repair", "reactor", "collector", "bulkhead"]);
  var DEFAULT_TYPES = ["cannon", "armor"];
  var COUNTERS = ["totalKills", "bossesDefeated", "totalUpgrades", "contractsCompleted"];
  var DEFINITIONS = [
  {
    "type": "scatter",
    "stat": "totalKills",
    "target": 0,
    "cost": 8,
    "text": "Available for 8 Fragments"
  },
  {
    "type": "shield",
    "stat": "totalKills",
    "target": 0,
    "cost": 16,
    "text": "Available for 16 Fragments"
  },
  {
    "type": "flak",
    "stat": "totalKills",
    "target": 0,
    "cost": 20,
    "text": "Available for 20 Fragments"
  },
  {
    "type": "missile",
    "stat": "totalKills",
    "target": 0,
    "cost": 24,
    "text": "Available for 24 Fragments"
  },
  {
    "type": "collector",
    "stat": "totalKills",
    "target": 0,
    "cost": 24,
    "text": "Available for 24 Fragments"
  },
  {
    "type": "repair",
    "stat": "totalKills",
    "target": 0,
    "cost": 24,
    "text": "Available for 24 Fragments"
  },
  {
    "type": "ember",
    "stat": "totalKills",
    "target": 0,
    "cost": 28,
    "text": "Available for 28 Fragments"
  },
  {
    "type": "bulkhead",
    "stat": "totalKills",
    "target": 0,
    "cost": 28,
    "text": "Available for 28 Fragments"
  },
  {
    "type": "laser",
    "stat": "totalKills",
    "target": 0,
    "cost": 32,
    "text": "Available for 32 Fragments"
  },
  {
    "type": "cryo",
    "stat": "totalKills",
    "target": 0,
    "cost": 32,
    "text": "Available for 32 Fragments"
  },
  {
    "type": "gravity",
    "stat": "totalKills",
    "target": 0,
    "cost": 36,
    "text": "Available for 36 Fragments"
  },
  {
    "type": "reactor",
    "stat": "totalKills",
    "target": 0,
    "cost": 36,
    "text": "Available for 36 Fragments"
  },
  {
    "type": "arc",
    "stat": "totalKills",
    "target": 0,
    "cost": 40,
    "text": "Available for 40 Fragments"
  },
  {
    "type": "pulse",
    "stat": "totalKills",
    "target": 0,
    "cost": 40,
    "text": "Available for 40 Fragments"
  },
  {
    "type": "rail",
    "stat": "totalKills",
    "target": 0,
    "cost": 44,
    "text": "Available for 44 Fragments"
  },
  {
    "type": "mine",
    "stat": "totalKills",
    "target": 0,
    "cost": 44,
    "text": "Available for 44 Fragments"
  }
];
  // Old gates are migration data only: earned access must survive the new pacing.
  var LEGACY_GOALS = [
    ["scatter", "totalKills", 15, 0], ["shield", "bestTime", 30, 0],
    ["drive", "totalKills", 30, 0], ["flak", "totalKills", 45, 0],
    ["missile", "bestTime", 45, 0], ["collector", "totalKills", 60, 0],
    ["repair", "bestTime", 60, 0], ["ember", "totalKills", 75, 1],
    ["laser", "totalKills", 75, 3], ["bulkhead", "totalKills", 90, 3],
    ["cryo", "totalKills", 150, 3], ["gravity", "totalUpgrades", 2, 5],
    ["reactor", "totalUpgrades", 2, 6], ["arc", "totalUpgrades", 3, 6],
    ["pulse", "bossesDefeated", 1, 9], ["rail", "bossesDefeated", 2, 12],
    ["mine", "totalKills", 350, 12]
  ];
  DEFINITIONS.forEach(Object.freeze);
  Object.freeze(DEFINITIONS);

  function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function boundedNumber(value, integer) {
    if (typeof value !== "number" && typeof value !== "string") return 0;
    var number = Number(value);
    if (!Number.isFinite(number)) return 0;
    number = Math.min(MAX_PROGRESS, Math.max(0, number));
    return integer ? Math.floor(number) : number;
  }

  function validModules(value) {
    if (!Array.isArray(value)) return [];
    var result = [];
    value.forEach(function (type) {
      if (MODULE_TYPES.indexOf(type) >= 0 && result.indexOf(type) < 0) result.push(type);
    });
    return result;
  }

  function definitionFor(type) {
    return DEFINITIONS.find(function (definition) { return definition.type === type; });
  }

  function goalComplete(progress, definition) {
    if (!isRecord(progress)) return false;
    return boundedNumber(progress[definition.stat], definition.stat !== "bestTime") >= definition.target ||
      (Array.isArray(progress.legacyEligibleModules) && progress.legacyEligibleModules.indexOf(definition.type) >= 0);
  }

  function normalize(raw, legacySave) {
    var hasProgression = isRecord(raw);
    var source = hasProgression ? raw : {};
    var hasPurchasesSchema = source.schemaVersion === 2 || source.schemaVersion === 3 || source.schemaVersion === 4;
    var progress = {
      schemaVersion: 4,
      retiredModules: (Array.isArray(source.retiredModules) && source.retiredModules.indexOf("drive") >= 0 || Array.isArray(source.purchasedModules) && source.purchasedModules.indexOf("drive") >= 0) ? ["drive"] : [],
      branchLicenses: Array.isArray(source.branchLicenses) ? source.branchLicenses.filter(function (key) { return typeof key === "string" && /^[a-z]+:[a-z]+$/.test(key); }) : [],
      purchasedModules: hasPurchasesSchema ? validModules(source.purchasedModules) : [],
      // Retain previously earned challenges without treating automatic unlocks as purchases.
      legacyEligibleModules: validModules(hasPurchasesSchema ? source.legacyEligibleModules : source.unlockedWeapons),
      totalKills: boundedNumber(source.totalKills, true),
      bestTime: boundedNumber(source.bestTime, false),
      bossesDefeated: boundedNumber(source.bossesDefeated, true),
      totalUpgrades: boundedNumber(source.totalUpgrades, true),
      contractsCompleted: boundedNumber(source.contractsCompleted, true)
    };

    if (!hasProgression && isRecord(legacySave)) {
      // Old saves only tracked a best kill count, so it is a lower bound for lifetime kills.
      progress.totalKills = boundedNumber(legacySave.bestKills, true);
      progress.bestTime = boundedNumber(legacySave.bestTime, false);
      progress.bossesDefeated = boundedNumber(legacySave.victories, true);
    }

    if (!hasPurchasesSchema && isRecord(legacySave)) {
      var loadout = isRecord(legacySave.lastLoadout) ? legacySave.lastLoadout : {};
      var selectedWeapon = loadout.selectedWeapon;
      if (WEAPONS.indexOf(selectedWeapon) >= 0 && selectedWeapon !== "mine" && !isUnlocked(progress, selectedWeapon)) {
        progress.purchasedModules.push(selectedWeapon);
      }
    }

    if (source.schemaVersion !== 4) {
      // Some old saves have the authoritative clear count only in their campaign.
      var completed = isRecord(legacySave) && isRecord(legacySave.campaign) && Array.isArray(legacySave.campaign.completed) ? legacySave.campaign.completed : [];
      var legacyClears = 0;
      while (legacyClears < 15 && completed.indexOf("sector" + (Math.floor(legacyClears / 3) + 1) + "-" + (legacyClears % 3 + 1)) >= 0) legacyClears += 1;
      progress.contractsCompleted = Math.max(progress.contractsCompleted, legacyClears);
      LEGACY_GOALS.forEach(function (goal) {
        var existedBeforeCampaign = goal[0] !== "ember" && goal[0] !== "gravity";
        var gateMet = source.schemaVersion === 2 && existedBeforeCampaign || progress.contractsCompleted >= goal[3];
        if (gateMet && progress[goal[1]] >= goal[2] && progress.legacyEligibleModules.indexOf(goal[0]) < 0) progress.legacyEligibleModules.push(goal[0]);
      });
    }

    return progress;
  }

  // Counts are event deltas; elapsed is the current run's total survival time.
  function apply(progress, delta) {
    if (!isRecord(progress)) throw new TypeError("A progression object is required.");
    delta = isRecord(delta) ? delta : {};
    var eligibleBefore = DEFINITIONS.filter(function (definition) { return goalComplete(progress, definition); });
    COUNTERS.forEach(function (counter) {
      progress[counter] = boundedNumber(progress[counter], true);
    });
    progress.totalKills = boundedNumber(progress.totalKills + boundedNumber(delta.kills, true), true);
    progress.bossesDefeated = boundedNumber(progress.bossesDefeated + boundedNumber(delta.bosses, true), true);
    progress.totalUpgrades = boundedNumber(progress.totalUpgrades + boundedNumber(delta.upgrades, true), true);
    progress.bestTime = Math.max(boundedNumber(progress.bestTime, false), boundedNumber(delta.elapsed, false));
    return DEFINITIONS.filter(function (definition) {
      return !isUnlocked(progress, definition.type) && eligibleBefore.indexOf(definition) < 0 && goalComplete(progress, definition);
    }).map(function (definition) { return definition.type; });
  }

  function isUnlocked(progress, type) {
    if (DEFAULT_TYPES.indexOf(type) >= 0) return true;
    return MODULE_TYPES.indexOf(type) >= 0 && isRecord(progress) && Array.isArray(progress.purchasedModules) && progress.purchasedModules.indexOf(type) >= 0;
  }

  function objective(progress, type) {
    var definition = definitionFor(type);
    if (!definition) return null;
    var current = isRecord(progress) ? boundedNumber(progress[definition.stat], definition.stat !== "bestTime") : 0;
    var complete = goalComplete(progress, definition);
    return {
      text: definition.text,
      current: complete ? definition.target : Math.min(current, definition.target),
      target: definition.target,
      complete: complete
    };
  }

  function canPurchase(progress, type) {
    var definition = definitionFor(type);
    return Boolean(definition && !isUnlocked(progress, type) && goalComplete(progress, definition));
  }

  function purchase(progress, type, fragments) {
    if (!Number.isFinite(fragments) || fragments < 0 || !canPurchase(progress, type)) return null;
    var cost = definitionFor(type).cost;
    if (fragments < cost) return null;
    var purchased = validModules(progress.purchasedModules);
    purchased.push(type);
    progress.purchasedModules = purchased;
    return { fragments: fragments - cost, cost: cost, type: type };
  }

  function status(progress, type) {
    var known = MODULE_TYPES.indexOf(type) >= 0;
    var definition = definitionFor(type);
    var owned = isUnlocked(progress, type);
    var complete = definition ? goalComplete(progress, definition) : known;
    return {
      owned: owned,
      available: known && !owned && complete,
      goalComplete: complete,
      cost: definition ? definition.cost : (known ? 0 : null),
      objective: objective(progress, type)
    };
  }

  function nextObjective(progress) {
    var nearest = null;
    for (var i = 0; i < DEFINITIONS.length; i += 1) {
      var type = DEFINITIONS[i].type;
      if (isUnlocked(progress, type)) continue;
      var next = objective(progress, type);
      var candidate = { type: type, text: next.text, current: next.current, target: next.target, available: next.complete, cost: DEFINITIONS[i].cost };
      if (candidate.available) return candidate;
      if (!nearest || candidate.current / candidate.target > nearest.current / nearest.target) nearest = candidate;
    }
    return nearest;
  }

  function settleRunReward(snapshot, carryUnits) {
    carryUnits = Number.isInteger(carryUnits) && carryUnits >= 0 && carryUnits < REWARD_SCALE ? carryUnits : 0;
    snapshot = isRecord(snapshot) ? snapshot : {};
    var milliseconds = Math.floor(boundedNumber(snapshot.elapsed, false) * 1000);
    var bosses = boundedNumber(snapshot.bosses, true);
    var minutes = Array.isArray(snapshot.killsByMinute) ? snapshot.killsByMinute : [];
    var killUnits = 0;
    minutes.forEach(function (count, minute) {
      if (minute * 60000 <= milliseconds) killUnits += Math.min(5000, boundedNumber(count, true)) * 1200;
    });
    var survivalUnits = milliseconds * 10;
    var bossReward = 0;
    for (var boss = 0; boss < Math.min(bosses, 5); boss += 1) bossReward += 8 + 4 * boss;
    bossReward += Math.max(0, bosses - 5) * 24;
    var earnedUnits = killUnits + survivalUnits + bossReward * REWARD_SCALE;
    var totalUnits = carryUnits + earnedUnits;
    return {
      fragments: Math.floor(totalUnits / REWARD_SCALE),
      carryUnits: totalUnits % REWARD_SCALE,
      earnedUnits: earnedUnits,
      sources: { kills: killUnits / REWARD_SCALE, time: survivalUnits / REWARD_SCALE, bosses: bossReward },
      scale: REWARD_SCALE
    };
  }

  function runReward(snapshot) {
    return settleRunReward(snapshot).fragments;
  }

  return Object.freeze({
    normalize: normalize,
    apply: apply,
    isUnlocked: isUnlocked,
    canPurchase: canPurchase,
    purchase: purchase,
    status: status,
    objective: objective,
    nextObjective: nextObjective,
    runReward: runReward,
    settleRunReward: settleRunReward,
    definitions: DEFINITIONS
  });
});
