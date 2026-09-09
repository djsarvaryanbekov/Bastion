(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.DriftRunUpgrades = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  // Saves retain the original zero-based state.level; players see levels 1 through 10.
  var MAX_RANK = 9;
  var MAX_LEVEL = MAX_RANK + 1;
  var LATER_PRICES = [14, 28, 20, 24, 40, 32, 56];
  var MILESTONE_RANKS = [4, 7, 9];

  // Resolved once on purchase; combat reads the cached definition without allocations.
  var branches = {
    cannon: [
      { id: "twin", name: "Twin shot", description: "Two rounds per shot. Each deals 70% damage.", values: { shots: 2 }, multipliers: { damage: .7 } },
      { id: "pierce", name: "Piercing rounds", description: "Rounds pass through enemy lines.", values: { projectileKind: "rail" }, multipliers: { range: 1.25 } }
    ],
    scatter: [
      { id: "cone", name: "Buckshot", description: "Nine pellets in a wider close-range cone.", values: { pellets: 9 }, multipliers: { spread: 1.8, damage: .8 } },
      { id: "focus", name: "Flechettes", description: "Tight spread and 70% more reach.", multipliers: { spread: .35, range: 1.7, damage: 1.15 } }
    ],
    missile: [
      { id: "salvo", name: "Missile salvo", description: "Three homing missiles. Each deals 50% damage.", values: { shots: 3 }, multipliers: { damage: .5 } },
      { id: "heavy", name: "Heavy warhead", description: "Double damage and wider blast. Fires 25% slower.", values: { blastRadius: 115 }, multipliers: { damage: 2, cooldown: 1.25 } }
    ],
    laser: [
      { id: "wide", name: "Wide beam", description: "A wider beam catches more enemy lines.", values: { beamWidth: 28 }, multipliers: { damage: 1.25 } },
      { id: "rapid", name: "Rapid pulse", description: "Fires twice as often at 75% damage.", multipliers: { cooldown: .5, damage: .75 } }
    ],
    cryo: [
      { id: "deep", name: "Deep freeze", description: "Enemies move at 25% speed for 4 seconds.", values: { slowFactor: .25, slowDuration: 4 } },
      { id: "hail", name: "Hailstorm", description: "Three slowing bolts fan across enemy groups.", values: { shots: 3 }, multipliers: { damage: .7 } }
    ],
    arc: [
      { id: "chain", name: "Chain storm", description: "Lightning jumps through up to eight enemies.", values: { chains: 8 }, multipliers: { jumpRange: 1.35 } },
      { id: "surge", name: "Power surge", description: "Double damage across two targets.", values: { chains: 2 }, multipliers: { damage: 2 } }
    ],
    rail: [
      { id: "velocity", name: "Longshot", description: "50% more reach and damage. Fires 20% slower.", multipliers: { range: 1.5, damage: 1.5, cooldown: 1.2 } },
      { id: "rapid", name: "Repeat fire", description: "Fires twice as often at 75% damage.", multipliers: { cooldown: .5, damage: .75 } }
    ],
    flak: [
      { id: "screen", name: "Wide screen", description: "50% wider area clears more hostile shots.", multipliers: { blastRadius: 1.5 } },
      { id: "rapid", name: "Rapid intercept", description: "Intercepts hostile shots 60% more often.", multipliers: { cooldown: .625 } }
    ],
    pulse: [
      { id: "wide", name: "Wide nova", description: "50% wider shockwave at 80% damage.", multipliers: { range: 1.5, damage: .8 } },
      { id: "rapid", name: "Pulse engine", description: "Shockwaves fire 60% more often.", multipliers: { cooldown: .625 } }
    ],
    mine: [
      { id: "wide", name: "Demolition", description: "50% wider blast with 50% more damage.", multipliers: { blastRadius: 1.5, damage: 1.5 } },
      { id: "rapid", name: "Minefield", description: "Lays mines twice as often.", multipliers: { cooldown: .5 } }
    ],
    ember: [
      { id: "searing", name: "Searing flame", description: "75% stronger burn, lasting 20% longer. Direct damage drops 15%.", multipliers: { burnDamage: 1.75, burnDuration: 1.2, damage: .85 } },
      { id: "focused", name: "Focused flame", description: "60% more direct damage and 30% more reach in a narrower cone.", multipliers: { damage: 1.6, range: 1.3, coneAngle: .6 } }
    ],
    gravity: [
      { id: "well", name: "Deep well", description: "30% wider fields last 30% longer. Fires 15% slower.", multipliers: { fieldRadius: 1.3, fieldDuration: 1.3, cooldown: 1.15 } },
      { id: "crush", name: "Crushing field", description: "Double field damage and 35% stronger pull in a 20% smaller area.", multipliers: { damage: 2, pullStrength: 1.35, fieldRadius: .8 } }
    ]
  };

  // These changes use existing weapon behavior. Counts stay bounded per emitter.
  var milestones = {
    cannon: [
      { name: "Expanded volley", description: "+1 round per volley.", add: { shots: 1 } },
      { name: "Long barrels", description: "+25% targeting reach.", multiply: { range: 1.25 } },
      { name: "Barrage", description: "+1 round per volley.", add: { shots: 1 } }
    ],
    scatter: [
      { name: "Loaded chambers", description: "+2 pellets per shot.", add: { pellets: 2 } },
      { name: "Long choke", description: "+25% pellet reach.", multiply: { range: 1.25 } },
      { name: "Broadside", description: "+2 pellets per shot.", add: { pellets: 2 } }
    ],
    missile: [
      { name: "Warhead assembly", description: "Salvo: 3 → 4 missiles. Heavy: blast radius 115 → 150.",
        branches: { salvo: { description: "3 → 4 homing missiles per volley.", add: { shots: 1 } }, heavy: { description: "Blast radius 115 → 150.", set: { blastRadius: 150 } } } },
      { name: "Blast cycle", description: "Salvo: blast radius 74 → 96. Heavy: +25% fire rate.",
        branches: { salvo: { description: "Blast radius 74 → 96 for each missile.", set: { blastRadius: 96 } }, heavy: { description: "+25% heavy missile fire rate.", multiply: { cooldown: .8 } } } },
      { name: "Missile storm", description: "Salvo: 4 → 5 missiles. Heavy: blast radius 150 → 190.",
        branches: { salvo: { description: "4 → 5 homing missiles per volley.", add: { shots: 1 } }, heavy: { description: "Blast radius 150 → 190.", set: { blastRadius: 190 } } } }
    ],
    laser: [
      { name: "Beam aperture", description: "+50% beam width; hits a wider enemy line.", multiply: { beamWidth: 1.5 } },
      { name: "Long beam", description: "+30% beam length.", multiply: { range: 1.3 } },
      { name: "Continuous pulses", description: "+25% beam fire rate.", multiply: { cooldown: .8 } }
    ],
    cryo: [
      { name: "Ice volley", description: "+1 freezing bolt per volley.", add: { shots: 1 } },
      { name: "Lingering frost", description: "+50% slow duration and +20% bolt reach.", multiply: { slowDuration: 1.5, range: 1.2 } },
      { name: "Whiteout", description: "+1 freezing bolt per volley.", add: { shots: 1 } }
    ],
    arc: [
      { name: "Extra conductors", description: "Chain: 8 → 10 targets. Surge: 2 → 3 targets.",
        branches: { chain: { description: "8 → 10 lightning targets per attack.", add: { chains: 2 } }, surge: { description: "2 → 3 lightning targets per attack.", add: { chains: 1 } } } },
      { name: "Leaping current", description: "+35% jump distance between enemies.", multiply: { jumpRange: 1.35 } },
      { name: "Storm network", description: "Chain: 10 → 12 targets. Surge: 3 → 4 targets.",
        branches: { chain: { description: "10 → 12 lightning targets per attack.", add: { chains: 2 } }, surge: { description: "3 → 4 lightning targets per attack.", add: { chains: 1 } } } }
    ],
    rail: [
      { name: "Fast chamber", description: "+25% piercing shot fire rate.", multiply: { cooldown: .8 } },
      { name: "Long rail", description: "+30% piercing shot reach.", multiply: { range: 1.3 } },
      { name: "Rail barrage", description: "+25% piercing shot fire rate.", multiply: { cooldown: .8 } }
    ],
    flak: [
      { name: "Wider screen", description: "+25% interception blast radius.", multiply: { blastRadius: 1.25 } },
      { name: "Rapid defense", description: "+25% interception fire rate.", multiply: { cooldown: .8 } },
      { name: "Defensive canopy", description: "+25% interception blast radius.", multiply: { blastRadius: 1.25 } }
    ],
    pulse: [
      { name: "Expanding nova", description: "+25% shockwave radius.", multiply: { range: 1.25 } },
      { name: "Pulse rhythm", description: "+25% shockwave fire rate.", multiply: { cooldown: .8 } },
      { name: "Full nova", description: "+25% shockwave radius.", multiply: { range: 1.25 } }
    ],
    mine: [
      { name: "Blast casing", description: "+25% mine blast radius.", multiply: { blastRadius: 1.25 } },
      { name: "Mine conveyor", description: "+25% mine laying rate.", multiply: { cooldown: .8 } },
      { name: "Demolition zone", description: "+25% mine blast radius.", multiply: { blastRadius: 1.25 } }
    ],
    ember: [
      { name: "Flame curtain", description: "+35% flame cone width.", multiply: { coneAngle: 1.35 } },
      { name: "Reaching flame", description: "+25% flame reach.", multiply: { range: 1.25 } },
      { name: "Firestorm", description: "+25% flame fire rate and +40% burn duration.", multiply: { cooldown: .8, burnDuration: 1.4 } }
    ],
    gravity: [
      { name: "Wider well", description: "+25% gravity field radius.", multiply: { fieldRadius: 1.25 } },
      { name: "Persistent field", description: "+50% field duration; one live field per emitter.", multiply: { fieldDuration: 1.5 } },
      { name: "Gravity basin", description: "+25% gravity field radius and pull strength.", multiply: { fieldRadius: 1.25, pullStrength: 1.25 } }
    ]
  };

  function applyMilestone(def, milestone, branch) {
    var change = milestone.branches ? milestone.branches[branch] : milestone;
    Object.keys(change.set || {}).forEach(function (key) { def[key] = change.set[key]; });
    Object.keys(change.add || {}).forEach(function (key) { def[key] = (def[key] || (key === "shots" ? 1 : 0)) + change.add[key]; });
    Object.keys(change.multiply || {}).forEach(function (key) {
      var value = def[key] === undefined && key === "beamWidth" ? 11 : def[key];
      def[key] = value * change.multiply[key];
    });
  }

  function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function branchFor(type, id) {
    return branches[type].find(function (branch) { return branch.id === id; });
  }

  function rank(type, state) {
    if (!Object.prototype.hasOwnProperty.call(branches, type)) return -1;
    if (state === undefined || state === null) return 0;
    if (!isRecord(state) || !Object.prototype.hasOwnProperty.call(state, "level") || !Number.isInteger(state.level) || state.level < 0 || state.level > MAX_RANK) return -1;
    if (state.level < 2) return state.branch == null ? state.level : -1;
    return Object.prototype.hasOwnProperty.call(state, "branch") && branchFor(type, state.branch) ? state.level : -1;
  }

  function copyCount(copies) {
    if (copies === undefined) return 1;
    if (!Number.isInteger(copies) || copies < 1) return 0;
    return Math.min(copies, 420);
  }

  function options(type, state, copies) {
    var count = copyCount(copies);
    var currentRank = rank(type, state);
    if (!count || currentRank < 0 || currentRank === MAX_RANK) return [];
    if (currentRank === 0) return [{ id: "tune", name: "Fire rate", description: "+25% fire rate for every installed copy.", cost: Math.ceil((16 + 6 * (count - 1)) * 1.25), rank: currentRank }];
    if (currentRank >= 2) {
      var milestoneIndex = MILESTONE_RANKS.indexOf(currentRank + 1);
      var milestone = milestoneIndex >= 0 ? milestones[type][milestoneIndex] : null;
      var description = milestone ? milestone.description : (type === "ember" ? "+12% of Lv3 damage and burn DPS." : "+12% of Lv3 damage.");
      if (milestone && milestone.branches) description = milestone.branches[state.branch].description;
      return [{ id: "calibrate", name: milestone ? milestone.name : "Power tuning", description: description,
        milestone: !!milestone, cost: Math.ceil(LATER_PRICES[currentRank - 2] * (1 + .25 * (count - 1)) * 1.25), rank: currentRank }];
    }
    return branches[type].map(function (branch) {
      return { id: branch.id, name: branch.name, description: branch.description, milestone: true, cost: Math.ceil((38 + 10 * (count - 1)) * 1.25), rank: currentRank };
    });
  }

  function purchase(upgrades, type, choice, matter, copies, expectedRank) {
    if (!isRecord(upgrades) || !Object.prototype.hasOwnProperty.call(branches, type) || !Number.isFinite(matter) || matter < 0) return null;
    var property = Object.getOwnPropertyDescriptor(upgrades, type);
    if (property ? !property.writable : (!Object.isExtensible(upgrades) || type in upgrades)) return null;
    var state = property ? property.value : undefined;
    var currentRank = rank(type, state);
    if (expectedRank !== undefined && expectedRank !== currentRank) return null;
    var option = options(type, state, copies).find(function (item) { return item.id === choice; });
    if (!option || matter < option.cost) return null;
    upgrades[type] = { level: currentRank + 1, branch: currentRank < 1 ? null : (currentRank === 1 ? choice : state.branch) };
    return { matter: matter - option.cost, option: option };
  }

  function resolve(base, state) {
    var def = Object.assign({}, base);
    var currentRank = rank(base.id, state);
    if (currentRank < 1) return def;
    def.cooldown *= .8;
    if (currentRank < 2) return def;
    var branch = branchFor(base.id, state.branch);
    Object.keys(branch.values || {}).forEach(function (key) { def[key] = branch.values[key]; });
    Object.keys(branch.multipliers || {}).forEach(function (key) { def[key] *= branch.multipliers[key]; });
    var powerRanks = currentRank - 2;
    for (var i = 0; i < MILESTONE_RANKS.length; i += 1) {
      if (currentRank < MILESTONE_RANKS[i]) break;
      applyMilestone(def, milestones[base.id][i], state.branch);
      powerRanks -= 1;
    }
    def.damage *= 1 + .12 * powerRanks;
    if (base.id === "ember") def.burnDamage *= 1 + .12 * powerRanks;
    return def;
  }

  function label(type, state) {
    var currentRank = rank(type, state);
    if (currentRank < 0) return "Upgrade unavailable";
    var text = "Lv" + (currentRank + 1) + "/" + MAX_LEVEL;
    if (currentRank === 0) return text;
    return text + " · " + (currentRank === 1 ? "Tuned" : branchFor(type, state.branch).name);
  }

  return { MAX_RANK: MAX_RANK, MAX_LEVEL: MAX_LEVEL, options: options, purchase: purchase, resolve: resolve, label: label };
});
