(function (root, factory) {
  "use strict";
  var campaign = factory();
  if (typeof module === "object" && module.exports) module.exports = campaign;
  if (root) root.DriftCampaign = campaign;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";

  var tr = (typeof window !== "undefined" && window.tr) || function (text, vars) { return vars ? text.replace(/\{(\w+)\}/g, function (match, name) { return name in vars ? String(vars[name]) : match; }) : text; };
  var CORES = [
    { id: "standard", name: tr("Standard Core"), description: tr("Balanced hull and systems."), requiredTime: 0, requiredBosses: 0, cost: 0, hpMultiplier: 1, moduleHpMultiplier: 1, speedMultiplier: 1, cooldownMultiplier: 1, matterMultiplier: 1 },
    { id: "striker", name: tr("Striker Core"), description: tr("Weapons recharge 15% sooner. All installed modules have 25% less HP."), requiredTime: 0, requiredBosses: 0, cost: 64, hpMultiplier: 1, moduleHpMultiplier: .75, speedMultiplier: 1, cooldownMultiplier: .85, matterMultiplier: 1 },
    { id: "bulwark", name: tr("Bulwark Core"), description: tr("+35% HP for all installed modules. -15% movement speed."), requiredTime: 0, requiredBosses: 0, cost: 80, hpMultiplier: 1, moduleHpMultiplier: 1.35, speedMultiplier: .85, cooldownMultiplier: 1, matterMultiplier: 1 },
    { id: "salvager", name: tr("Salvager Core"), description: tr("+20% Matter from regular enemies. Reloads take 10% longer."), requiredTime: 0, requiredBosses: 0, cost: 96, hpMultiplier: 1, moduleHpMultiplier: 1, speedMultiplier: 1, cooldownMultiplier: 1.1, matterMultiplier: 1.2 }
  ];
  var LEGACY_CORE_CLEARS = { striker: 3, bulwark: 6, salvager: 9 };
  var LEGACY_OPERATION_IDS = [];
  for (var index = 0; index < 15; index += 1) LEGACY_OPERATION_IDS.push("sector" + (Math.floor(index / 3) + 1) + "-" + (index % 3 + 1));
  CORES.forEach(Object.freeze);
  Object.freeze(CORES);

  function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function number(value) {
    if (typeof value !== "number" && typeof value !== "string") return 0;
    var parsed = Number(value);
    return Number.isFinite(parsed) ? Math.min(1000000000, Math.max(0, parsed)) : 0;
  }

  function getCore(id) {
    return CORES.find(function (core) { return core.id === id; }) || null;
  }

  function has(list, value) {
    return Array.isArray(list) && list.indexOf(value) >= 0;
  }

  function validIds(list, lookup) {
    if (!Array.isArray(list)) return [];
    return list.filter(function (id, index) { return lookup(id) && list.indexOf(id) === index; });
  }

  function isCoreOwned(state, id) {
    return id === "standard" || Boolean(getCore(id) && isRecord(state) && has(state.purchasedCores, id));
  }

  function isCoreAvailable(state, id, progressionState) {
    var core = getCore(id);
    if (!core) return false;
    if (isCoreOwned(state, id) || isRecord(state) && has(state.legacyEligibleCores, id)) return true;
    var progress = isRecord(progressionState) ? progressionState : {};
    return number(progress.bestTime) >= core.requiredTime || Math.floor(number(progress.bossesDefeated)) >= core.requiredBosses;
  }

  function normalize(raw, progressionState) {
    raw = isRecord(raw) ? raw : {};
    var completed = validIds(raw.completed, function (id) { return has(LEGACY_OPERATION_IDS, id); });
    var state = {
      schemaVersion: 2,
      // Retain the old history as an archive; it never blocks a Survival launch.
      completed: completed,
      mastered: validIds(raw.mastered, function (id) { return has(completed, id); }),
      purchasedCores: validIds(raw.purchasedCores, getCore),
      legacyEligibleCores: validIds(raw.legacyEligibleCores, getCore),
      selectedCore: "standard",
      coreRanks: {},
      legacyBonuses: {}
    };
    if (raw.schemaVersion !== 2) {
      var legacyClears = 0;
      while (legacyClears < LEGACY_OPERATION_IDS.length && has(completed, LEGACY_OPERATION_IDS[legacyClears])) legacyClears += 1;
      CORES.forEach(function (core) {
        if (core.id !== "standard" && legacyClears >= LEGACY_CORE_CLEARS[core.id] && !has(state.legacyEligibleCores, core.id)) state.legacyEligibleCores.push(core.id);
      });
    }
    CORES.forEach(function(core) {
      var source = isRecord(raw.coreRanks) && isRecord(raw.coreRanks[core.id]) ? raw.coreRanks[core.id] : {};
      state.coreRanks[core.id] = {};
      state.legacyBonuses[core.id] = {};
      ["modules", "damage", "drive", "matter"].forEach(function(stat) {
        state.coreRanks[core.id][stat] = Math.min(25, Math.floor(number(source[stat])));
        state.legacyBonuses[core.id][stat] = Math.min(1,number(raw.legacyBonuses && raw.legacyBonuses[core.id] && raw.legacyBonuses[core.id][stat]));
      });
    });
    if (isCoreOwned(state, raw.selectedCore)) state.selectedCore = raw.selectedCore;
    return state;
  }

  function coreRequirementText(id) {
    var core = getCore(id);
    if (!core) return tr("Unknown core");
    if (core.id === "standard") return tr("Always available");
    return tr("Unlock for {cost} Fragments", { cost: core.cost });
  }

  function purchaseCore(state, id, fragments, progressionState) {
    if (!isRecord(state) || !Number.isFinite(fragments) || fragments < 0) return null;
    var core = getCore(id);
    var clean = normalize(state, progressionState);
    if (!core || isCoreOwned(clean, id) || !isCoreAvailable(clean, id, progressionState) || fragments < core.cost) return null;
    clean.purchasedCores.push(id);
    state.purchasedCores = clean.purchasedCores;
    return { fragments: fragments - core.cost, cost: core.cost };
  }

  return Object.freeze({
    cores: CORES,
    normalize: normalize,
    getCore: getCore,
    isCoreOwned: isCoreOwned,
    isCoreAvailable: isCoreAvailable,
    coreRequirementText: coreRequirementText,
    purchaseCore: purchaseCore
  });
});
