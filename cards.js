(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DriftCards = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";

  var tr = (typeof window !== "undefined" && window.tr) || function (text, vars) { return vars ? text.replace(/\{(\w+)\}/g, function (match, name) { return name in vars ? String(vars[name]) : match; }) : text; };

  var OFFER_SIZE = 3;
  var DIVIDEND_CAP = 25;
  var VOLATILE_RADIUS = 60;
  var RARITIES = ["common", "rare", "epic", "duo"];
  // Doctrines are rule changers offered only after boss waves; scarcity is what lets them be strong.
  var DOCTRINE_CAP = 3;
  // Provisional playtest values for rule, duo and doctrine cards; game.js reads them from here.
  var TUNING = {
    bulkheadRelay: .12,
    openShatter: .25,
    thermalShockDamage: 40, thermalShockRadius: 70, thermalShockCooldown: 1,
    stormSurgeTargets: 4, stormSurgeDamage: .6, stormSurgeChains: 3,
    coldLensDuration: 1.5, coldLensSlowFactor: .6, coldLensChill: .6, coldLensWidth: 14, coldLensRefresh: .25,
    lensingSplit: 3, lensingDamage: .5, lensingSpread: .22,
    castawayLife: 8, castawayRate: .5, castawayMax: 6,
    leanHullCap: 14, leanHullPer: .06, leanHullMax: .6,
    combinedArmsPer: .08, combinedArmsMax: 4,
    flagshipBase: .6, flagshipPer: .1, flagshipPenalty: .2,
    marketMin: .5, marketMax: 1.6, marketOfferSize: 4,
    arcSpineDps: 24, arcSpineWidth: 14, arcSpineTick: .2,
    strutCorePenalty: .1,
    conduitInterval: 4, conduitStep: .2, conduitPerCell: .1,
    latticeInterval: 12, latticeWindow: 3, latticeWarning: 1,
    outriderEcho: .6, outriderDelay: .15, outriderMinDistance: 2,
    returnMultiplier: 3, returnMax: 6, returnRange: 520,
    layoutRefresh: .25
  };
  // Rarity weights ease from early to late runs so rare and epic picks appear more often as waves climb.
  var EARLY_WEIGHTS = { common: 75, rare: 22, epic: 3, duo: 22 };
  var LATE_WEIGHTS = { common: 50, rare: 35, epic: 15, duo: 35 };
  var LATE_WEIGHT_WAVE = 15;
  var INSTALLED_FAMILY_WEIGHT = 2;
  // Weapon cards are the bread-and-butter picks, so each counts slightly more than a single generic card.
  var FAMILY_CARD_WEIGHT = 1.5;

  function percent(value) { return Math.round(Math.abs(value) * 100); }

  // family: true cards are offered once per weapon type and modify only that type's definition.
  // requires: the card is offered only when that module type is installed or available.
  // installed / installedAny: rule cards need those families on the ship, so they are never dead offers.
  // pair: duo cards enter the pool once both families are edge-adjacent; their first sighting is guaranteed.
  // doctrine cards appear only in the post-boss Doctrine pick. retired: still folds old picks, never offered.
  // icon: a module type (shown with its module art) or a symbol key drawn by the card UI.
  // minWeapons: the card needs at least that many weapon modules on the ship.
  var CARD_DEFS = [
    { id: "calibration", rarity: "common", maxStacks: 5, family: true, effects: [{ key: "damage", add: .20 }],
      name: function (v) { return tr("{module} Calibration", v); },
      text: function (v) { return tr("{module} damage +{percent}%", v); } },
    { id: "overclock", rarity: "common", maxStacks: 5, family: true, effects: [{ key: "fireRate", add: .15 }],
      name: function (v) { return tr("{module} Overclock", v); },
      text: function (v) { return tr("{module} fire rate +{percent}%", v); } },
    { id: "optics", rarity: "common", maxStacks: 3, family: true, effects: [{ key: "range", add: .12 }],
      name: function (v) { return tr("{module} Optics", v); },
      text: function (v) { return tr("{module} range +{percent}%", v); } },
    { id: "plating", icon: "plate", rarity: "common", maxStacks: 4, effects: [{ key: "hullHp", add: .15 }],
      name: function () { return tr("Hardened Plating"); },
      text: function (v) { return tr("Module HP +{percent}%", v); } },
    { id: "ablative", icon: "plate", rarity: "rare", maxStacks: 3, effects: [{ key: "damageTaken", add: -.08 }],
      name: function () { return tr("Ablative Hull"); },
      text: function (v) { return tr("Hull damage taken −{percent}%", v); } },
    { id: "medic", icon: "repair", rarity: "common", maxStacks: 3, requires: "repair", effects: [{ key: "repair", add: .25 }],
      name: function () { return tr("Field Medic"); },
      text: function (v) { return tr("Repair Array healing +{percent}%", v); } },
    { id: "capacitors", icon: "shield", rarity: "common", maxStacks: 3, requires: "shield", effects: [{ key: "shield", add: .25 }],
      name: function () { return tr("Shield Capacitors"); },
      text: function (v) { return tr("Shield Node capacity +{percent}%", v); } },
    { id: "thrusters", icon: "thrust", rarity: "common", maxStacks: 3, effects: [{ key: "drive", add: .10 }],
      name: function () { return tr("Thrusters"); },
      text: function (v) { return tr("Thrust, speed and turn +{percent}%", v); } },
    { id: "fireControl", icon: "damage", rarity: "rare", maxStacks: 3, effects: [{ key: "damage", add: .08 }],
      name: function () { return tr("Fire Control"); },
      text: function (v) { return tr("All weapon damage +{percent}%", v); } },
    { id: "servos", icon: "rate", rarity: "rare", maxStacks: 3, effects: [{ key: "fireRate", add: .07 }],
      name: function () { return tr("Servo Loaders"); },
      text: function (v) { return tr("All weapon fire rate +{percent}%", v); } },
    { id: "siphonMatrix", icon: "matter", rarity: "common", maxStacks: 3, effects: [{ key: "matter", add: .12 }],
      name: function () { return tr("Siphon Matrix"); },
      text: function (v) { return tr("Matter from kills +{percent}%", v); } },
    { id: "dividend", icon: "matter", rarity: "rare", maxStacks: 1, effects: [{ key: "dividend", add: .10 }],
      name: function () { return tr("Dividend"); },
      text: function (v) { return tr("Wave clear: +{percent}% of unspent Matter (max {cap})", v); } },
    { id: "salvage", icon: "matter", rarity: "common", maxStacks: 3, effects: [{ key: "waveClearMatter", add: 8 }],
      name: function () { return tr("Salvage Crew"); },
      text: function (v) { return tr("Wave clear: +{amount} Matter", v); } },
    { id: "longBurn", icon: "ember", rarity: "rare", maxStacks: 2, requires: "ember", effects: [{ key: "burnDuration", add: .40 }],
      name: function () { return tr("Long Burn"); },
      text: function (v) { return tr("Ember burn duration +{percent}%", v); } },
    { id: "deepFreeze", icon: "cryo", rarity: "rare", maxStacks: 2, requires: "cryo", effects: [{ key: "slowDuration", add: 1 }],
      name: function () { return tr("Deep Freeze"); },
      text: function (v) { return tr("Cryo slow lasts +{seconds}s", v); } },
    { id: "giantSlayer", icon: "target", rarity: "rare", maxStacks: 2, effects: [{ key: "bossDamage", add: .20 }],
      name: function () { return tr("Giant Slayer"); },
      text: function (v) { return tr("Damage to bosses +{percent}%", v); } },
    { id: "emergencyWeld", icon: "weld", rarity: "rare", maxStacks: 2, effects: [{ key: "waveStartRepair", add: .15 }],
      name: function () { return tr("Emergency Weld"); },
      text: function (v) { return tr("Wave start: repair {percent}% hull", v); } },
    { id: "volatile", icon: "burst", rarity: "epic", maxStacks: 1, retired: true, effects: [{ key: "volatile", add: .30 }, { key: "damageTaken", add: .10 }],
      name: function () { return tr("Volatile Hulls"); },
      text: function (v) { return tr("Enemies explode on death for {percent}% of their HP · you take +{penalty}% damage", v); } },
    { id: "glassCannon", icon: "damage", rarity: "epic", maxStacks: 1, retired: true, effects: [{ key: "damage", add: .30 }, { key: "hullHp", add: -.20 }],
      name: function () { return tr("Glass Cannon"); },
      text: function (v) { return tr("All weapon damage +{percent}% · module HP −{penalty}%", v); } },
    { id: "overtime", icon: "clock", rarity: "epic", maxStacks: 1, retired: true, effects: [{ key: "overtime", add: 10 }, { key: "overtimeMatter", add: .40 }],
      name: function () { return tr("Overtime"); },
      text: function (v) { return tr("Waves last +{seconds}s · +{percent}% Matter during overtime", v); } },

    // Rule rewrites change what counts as a neighbor or combo, not a number.
    { id: "wideIgnition", icon: "ember", kind: "rule", rarity: "rare", maxStacks: 1, installed: ["ember"], effects: [{ key: "wideIgnition", add: 1 }],
      name: function () { return tr("Wide Ignition"); },
      text: function () { return tr("Ember also ignites diagonal Cannon, Scatter and Flak neighbors"); } },
    { id: "coldSteel", icon: "cannon", kind: "rule", rarity: "rare", maxStacks: 1, installed: ["cannon"], installedAny: ["rail", "missile"], effects: [{ key: "coldSteel", add: 1 }],
      name: function () { return tr("Cold Steel"); },
      text: function () { return tr("Cannons count as Cryo for adjacent Rails and Missiles"); } },
    { id: "bulkheadRelay", icon: "bulkhead", kind: "rule", rarity: "rare", maxStacks: 1, installed: ["bulkhead"], effects: [{ key: "bulkheadRelay", add: TUNING.bulkheadRelay }],
      name: function () { return tr("Bulkhead Relay"); },
      text: function (v) { return tr("Bulkheads also give weapons in their 3×3 +{percent}% fire rate", v); } },
    { id: "openShatter", icon: "cryo", kind: "rule", rarity: "rare", maxStacks: 1, installed: ["cryo"], effects: [{ key: "openShatter", add: TUNING.openShatter }],
      name: function () { return tr("Open Shatter"); },
      text: function (v) { return tr("Every weapon deals +{percent}% damage to chilled or frozen enemies", v); } },

    // Duos are earned by placing both families edge-adjacent and go dormant while the pair is broken.
    { id: "thermalShock", kind: "duo", rarity: "duo", maxStacks: 1, pair: ["ember", "cryo"], effects: [{ key: "thermalShock", add: TUNING.thermalShockDamage }],
      name: function () { return tr("Thermal Shock"); },
      text: function (v) { return tr("Enemies burning and chilled at once burst for {amount} damage nearby", v); } },
    { id: "stormSurge", kind: "duo", rarity: "duo", maxStacks: 1, pair: ["pulse", "arc"], effects: [{ key: "stormSurge", add: TUNING.stormSurgeTargets }],
      name: function () { return tr("Storm Surge"); },
      text: function (v) { return tr("Pulse waves arc into up to {amount} enemies hit; each arc jumps twice", v); } },
    { id: "coldLens", kind: "duo", rarity: "duo", maxStacks: 1, pair: ["laser", "cryo"], effects: [{ key: "coldLens", add: TUNING.coldLensDuration }],
      name: function () { return tr("Cold Lens"); },
      text: function (v) { return tr("Laser beams leave a {seconds}s frost line that chills enemies crossing it", v); } },
    { id: "lensing", kind: "duo", rarity: "duo", maxStacks: 1, pair: ["rail", "gravity"], effects: [{ key: "lensing", add: TUNING.lensingSplit }],
      name: function () { return tr("Lensing"); },
      text: function (v) { return tr("Rail slugs passing through a gravity field split into {amount}", v); } },

    // Layout cards: the ship's shape decides where the effect happens.
    { id: "arcSpine", icon: "spine", kind: "rule", rarity: "epic", maxStacks: 1, minWeapons: 2, effects: [{ key: "arcSpine", add: TUNING.arcSpineDps }],
      name: function () { return tr("Arc Spine"); },
      text: function (v) { return tr("An arc joins your two farthest-apart weapons and deals {amount} damage/s to enemies crossing it", v); } },
    { id: "hollowStrut", icon: "armor", kind: "rule", rarity: "rare", maxStacks: 1, installed: ["armor"], effects: [{ key: "hollowStrut", add: 1 }, { key: "strutCore", add: -TUNING.strutCorePenalty }],
      name: function () { return tr("Hollow Strut"); },
      text: function (v) { return tr("Armor Tiles can't be hit and keep modules attached, but no longer block shots · core HP −{penalty}%", v); } },
    { id: "coreConduit", icon: "conduit", kind: "rule", rarity: "epic", maxStacks: 1, minWeapons: 1, effects: [{ key: "coreConduit", add: TUNING.conduitInterval }],
      name: function () { return tr("Core Conduit"); },
      text: function (v) { return tr("Every {seconds}s a spark runs from the core along its row and column, branches at Reactors and fires each weapon it passes", v); } },
    { id: "phaseLattice", icon: "lattice", kind: "rule", rarity: "epic", maxStacks: 1, installedAny: ["ember", "cryo", "reactor", "bulkhead"], effects: [{ key: "phaseLattice", add: TUNING.latticeInterval }],
      vars: function () { return { window: TUNING.latticeWindow }; },
      name: function () { return tr("Phase Lattice"); },
      text: function (v) { return tr("Every {seconds}s, all modules count as adjacent for {window}s", v); } },
    { id: "outrider", icon: "outrider", kind: "rule", rarity: "rare", maxStacks: 1, minWeapons: 2, effects: [{ key: "outrider", add: TUNING.outriderEcho }],
      vars: function () { return { cells: TUNING.outriderMinDistance }; },
      name: function () { return tr("Outrider"); },
      text: function (v) { return tr("Your weapon farthest from the core (at least {cells} cells out) fires every attack twice; the echo deals {percent}%", v); } },
    { id: "returnToSender", icon: "flak", kind: "rule", rarity: "rare", maxStacks: 1, installed: ["flak"], effects: [{ key: "returnToSender", add: TUNING.returnMultiplier }],
      name: function () { return tr("Return to Sender"); },
      text: function (v) { return tr("Enemy shots destroyed by Flak fly back as shrapnel for {amount}× their damage", v); } },

    // Doctrines: one pick after boss waves; most change a rule and carry a cost.
    { id: "castaway", icon: "wreck", kind: "doctrine", rarity: "doctrine", maxStacks: 1, effects: [{ key: "castaway", add: TUNING.castawayLife }],
      name: function () { return tr("Castaway Protocol"); },
      text: function (v) { return tr("Weapons you lose drift and keep firing at half rate for {seconds}s", v); } },
    { id: "grayMarket", icon: "market", kind: "doctrine", rarity: "doctrine", maxStacks: 1, effects: [{ key: "grayMarket", add: 1 }],
      name: function () { return tr("Gray Market"); },
      text: function () { return tr("Module prices change every break (×0.5–×1.6) · card offers show 4 cards"); } },
    { id: "leanHull", icon: "lean", kind: "doctrine", rarity: "doctrine", maxStacks: 1, effects: [{ key: "leanHull", add: TUNING.leanHullPer }],
      vars: function () { return { cap: TUNING.leanHullCap }; },
      name: function () { return tr("Lean Hull"); },
      text: function (v) { return tr("Weapons gain +{percent}% damage and fire rate per module below {cap} · 1 free reroll each break", v); } },
    { id: "combinedArms", icon: "arms", kind: "doctrine", rarity: "doctrine", maxStacks: 1, excludes: "flagship", effects: [{ key: "combinedArms", add: TUNING.combinedArmsPer }],
      name: function () { return tr("Combined Arms"); },
      text: function (v) { return tr("Each weapon fires {percent}% faster per different weapon type on its edges · bans Flagship", v); } },
    { id: "flagship", icon: "crown", kind: "doctrine", rarity: "doctrine", maxStacks: 1, excludes: "combinedArms", effects: [{ key: "flagship", add: TUNING.flagshipBase }],
      vars: function () { return { per: percent(TUNING.flagshipPer), penalty: percent(TUNING.flagshipPenalty) }; },
      name: function () { return tr("Flagship"); },
      text: function (v) { return tr("Your most surrounded weapon deals +{percent}% (+{per}% per neighbor); other weapons −{penalty}% · bans Combined Arms", v); } }
  ];

  var BY_ID = {};
  CARD_DEFS.forEach(function (def) { BY_ID[def.id] = def; });

  function pickKey(pick) {
    return pick.family ? pick.id + ":" + pick.family : pick.id;
  }

  function stacksOf(picks, key) {
    return picks.reduce(function (count, pick) { return count + (pickKey(pick) === key ? 1 : 0); }, 0);
  }

  function emptyMods() {
    return { global: {}, family: {} };
  }

  function fold(picks) {
    var mods = emptyMods();
    (picks || []).forEach(function (pick) {
      var def = BY_ID[pick.id];
      if (!def) return;
      var bucket = def.family ? (mods.family[pick.family] = mods.family[pick.family] || {}) : mods.global;
      def.effects.forEach(function (effect) { bucket[effect.key] = (bucket[effect.key] || 0) + effect.add; });
    });
    return mods;
  }

  function globalMod(mods, key) {
    return mods && mods.global[key] || 0;
  }

  // Returns a copy; base definitions from run-upgrades stay untouched.
  function applyDefinition(type, def, mods) {
    if (!mods) return def;
    var out = Object.assign({}, def);
    var family = mods.family[type] || {};
    if (family.damage && out.damage !== undefined) out.damage *= 1 + family.damage;
    if (family.damage && out.burnDamage !== undefined) out.burnDamage *= 1 + family.damage;
    if (family.fireRate && out.cooldown) out.cooldown /= 1 + family.fireRate;
    if (family.range && out.range) out.range *= 1 + family.range;
    if (type === "ember" && out.burnDuration) out.burnDuration *= 1 + globalMod(mods, "burnDuration");
    if (type === "cryo" && out.slowDuration) out.slowDuration += globalMod(mods, "slowDuration");
    if (type === "shield" && out.shield) out.shield *= 1 + globalMod(mods, "shield");
    if (type === "repair" && out.repairAmount) out.repairAmount *= 1 + globalMod(mods, "repair");
    return out;
  }

  function kindOf(def) {
    return def.kind || "stat";
  }

  function pairKey(a, b) {
    return a < b ? a + "+" + b : b + "+" + a;
  }

  function hasPick(picks, id) {
    return (picks || []).some(function (pick) { return pick.id === id; });
  }

  function doctrineCount(picks) {
    return (picks || []).reduce(function (count, pick) { return count + (BY_ID[pick.id] && kindOf(BY_ID[pick.id]) === "doctrine" ? 1 : 0); }, 0);
  }

  function describe(pick, moduleName) {
    var def = BY_ID[pick.id];
    var first = def.effects[0];
    var second = def.effects[1];
    var vars = {
      module: def.family ? moduleName(pick.family) : "",
      percent: percent(first.add),
      amount: first.add,
      seconds: first.add,
      cap: DIVIDEND_CAP,
      penalty: second ? percent(second.add) : 0
    };
    if (def.vars) Object.assign(vars, def.vars());
    return { name: def.name(vars), text: def.text(vars), rarity: def.rarity, maxStacks: def.maxStacks, kind: kindOf(def), pair: def.pair || null, icon: def.icon || "" };
  }

  function rarityWeights(wave) {
    var t = Math.min(1, Math.max(0, (wave - 1) / (LATE_WEIGHT_WAVE - 1)));
    var weights = {};
    RARITIES.forEach(function (rarity) { weights[rarity] = EARLY_WEIGHTS[rarity] + (LATE_WEIGHTS[rarity] - EARLY_WEIGHTS[rarity]) * t; });
    return weights;
  }

  // options: { wave, picks, installed: [types], available: [types], weapons: [weapon types], pairs: [pairKey],
  //            seenDuos: [ids], guaranteeRare, doctrine, size, rng }
  function candidates(options) {
    var installed = options.installed || [];
    var available = options.available || [];
    var pairs = options.pairs || [];
    var usable = function (type) { return installed.indexOf(type) >= 0 || available.indexOf(type) >= 0; };
    var onShip = function (type) { return installed.indexOf(type) >= 0; };
    var list = [];
    CARD_DEFS.forEach(function (def) {
      if (def.retired || kindOf(def) === "doctrine") return;
      if (def.requires && !usable(def.requires)) return;
      if (def.installed && !def.installed.every(onShip)) return;
      if (def.installedAny && !def.installedAny.some(onShip)) return;
      if (def.pair && pairs.indexOf(pairKey(def.pair[0], def.pair[1])) < 0) return;
      // Duos and module cards never point at a module the player has not licensed.
      if (def.pair && !def.pair.every(usable)) return;
      if (def.minWeapons && (options.weaponCount || 0) < def.minWeapons) return;
      var families = def.family ? (options.weapons || []).filter(usable) : [null];
      var familyWeight = function (family) { return installed.indexOf(family) >= 0 ? INSTALLED_FAMILY_WEIGHT : 1; };
      var familyTotal = families.reduce(function (sum, family) { return sum + (family ? familyWeight(family) : 0); }, 0);
      families.forEach(function (family) {
        var pick = family ? { id: def.id, family: family } : { id: def.id };
        if (stacksOf(options.picks || [], pickKey(pick)) >= def.maxStacks) return;
        // A family card keeps one card's total weight, split across eligible weapons (installed ones count double).
        var weight = family ? FAMILY_CARD_WEIGHT * familyWeight(family) / familyTotal : 1;
        list.push({ pick: pick, rarity: def.rarity, kind: kindOf(def), weight: weight });
      });
    });
    return list;
  }

  function doctrineCandidates(picks) {
    return CARD_DEFS.filter(function (def) {
      if (kindOf(def) !== "doctrine" || def.retired || hasPick(picks, def.id)) return false;
      return !(picks || []).some(function (pick) { return BY_ID[pick.id] && BY_ID[pick.id].excludes === def.id; });
    }).map(function (def) { return { pick: { id: def.id }, rarity: def.rarity, kind: "doctrine", weight: 1 }; });
  }

  function weightedPick(eligible, weights, rng) {
    var total = eligible.reduce(function (sum, entry) { return sum + entry.weight * weights[entry.rarity]; }, 0);
    var roll = rng() * total;
    for (var i = 0; i < eligible.length; i += 1) {
      roll -= eligible[i].weight * weights[eligible[i].rarity];
      if (roll <= 0) return eligible[i];
    }
    return eligible[eligible.length - 1];
  }

  function roll(options) {
    var rng = options.rng || Math.random;
    var size = options.size || OFFER_SIZE;
    var weights = rarityWeights(options.wave || 1);
    weights.doctrine = 1;
    var pool = options.doctrine ? doctrineCandidates(options.picks) : candidates(options);
    var offer = [];
    var take = function (entry) {
      offer.push(entry.pick);
      var key = pickKey(entry.pick);
      pool = pool.filter(function (other) { return pickKey(other.pick) !== key; });
    };
    // An earned duo is shown at least once, because ~19 picks at 1-of-3 would otherwise hide it.
    var seen = options.seenDuos || [];
    var unseenDuos = options.doctrine ? [] : pool.filter(function (entry) { return entry.kind === "duo" && seen.indexOf(entry.pick.id) < 0; });
    if (unseenDuos.length) take(unseenDuos[Math.floor(rng() * unseenDuos.length) % unseenDuos.length]);
    while (offer.length < size && pool.length) {
      var rareOnly = options.guaranteeRare && !options.doctrine && !offer.length && pool.some(function (entry) { return entry.rarity !== "common"; });
      take(weightedPick(rareOnly ? pool.filter(function (entry) { return entry.rarity !== "common"; }) : pool, weights, rng));
    }
    return offer;
  }

  function rerollCost(wave, rerolls) {
    return 3 + wave + 3 * rerolls;
  }

  function skipReward(wave) {
    return 4 + wave;
  }

  return {
    CARD_DEFS: CARD_DEFS,
    BY_ID: BY_ID,
    DIVIDEND_CAP: DIVIDEND_CAP,
    DOCTRINE_CAP: DOCTRINE_CAP,
    VOLATILE_RADIUS: VOLATILE_RADIUS,
    TUNING: TUNING,
    pairKey: pairKey,
    hasPick: hasPick,
    doctrineCount: doctrineCount,
    skipReward: skipReward,
    emptyMods: emptyMods,
    fold: fold,
    globalMod: globalMod,
    applyDefinition: applyDefinition,
    describe: describe,
    rarityWeights: rarityWeights,
    roll: roll,
    rerollCost: rerollCost,
    pickKey: pickKey,
    stacksOf: stacksOf
  };
});
