"use strict";

// Card rules: folding, stacking caps, offer validity, eligibility and rarity weights.
const assert = require("node:assert/strict");
const Cards = require("../cards");

function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const WEAPONS = ["cannon", "laser", "missile", "scatter", "arc", "rail", "flak", "pulse", "cryo", "mine", "ember", "gravity"];
const ids = new Set(Cards.CARD_DEFS.map(def => def.id));
assert.equal(ids.size, Cards.CARD_DEFS.length, "Card ids are unique");
assert.equal(Cards.CARD_DEFS.length, 39, "20 stat cards plus 10 rule, 4 duo and 5 doctrine cards");
const kinds = def => def.kind || "stat";
assert.equal(Cards.CARD_DEFS.filter(def => kinds(def) === "rule").length, 10);
assert.equal(Cards.CARD_DEFS.filter(def => kinds(def) === "duo").length, 4);
assert.equal(Cards.CARD_DEFS.filter(def => kinds(def) === "doctrine").length, 5);

// Every card renders English text with all placeholders resolved.
for (const def of Cards.CARD_DEFS) {
  const pick = def.family ? { id: def.id, family: "cannon" } : { id: def.id };
  const info = Cards.describe(pick, () => "Auto Cannon");
  assert.ok(info.name && info.text, def.id + " has a name and text");
  assert.ok(!/[{}]/.test(info.name + info.text), def.id + " has no unresolved placeholders: " + info.text);
}

// Folding adds per key; family cards stay on their family.
const mods = Cards.fold([{ id: "calibration", family: "cannon" }, { id: "calibration", family: "cannon" }, { id: "fireControl" }, { id: "glassCannon" }]);
assert.ok(Math.abs(mods.family.cannon.damage - .4) < 1e-9);
assert.ok(Math.abs(mods.global.damage - .38) < 1e-9);
assert.ok(Math.abs(mods.global.hullHp - -.2) < 1e-9);
assert.equal(mods.family.scatter, undefined);

// applyDefinition returns a modified copy and leaves the base untouched.
const base = { damage: 10, cooldown: 1, range: 100, burnDuration: 2, burnDamage: 4 };
const applied = Cards.applyDefinition("ember", base, Cards.fold([{ id: "calibration", family: "ember" }, { id: "overclock", family: "ember" }, { id: "optics", family: "ember" }, { id: "longBurn" }]));
assert.equal(base.damage, 10);
assert.ok(Math.abs(applied.damage - 12) < 1e-9);
assert.ok(Math.abs(applied.burnDamage - 4.8) < 1e-9);
assert.ok(Math.abs(applied.cooldown - 1 / 1.15) < 1e-9);
assert.ok(Math.abs(applied.range - 112) < 1e-9);
assert.ok(Math.abs(applied.burnDuration - 2.8) < 1e-9);

// Offers: three distinct, eligible, below max stacks, deterministic with a seeded rng.
const installed = ["core", "cannon", "armor"];
const available = ["cannon", "armor", "scatter", "missile", "repair"];
for (let wave = 1; wave <= 25; wave += 1) {
  for (let seed = 1; seed <= 40; seed += 1) {
    const offer = Cards.roll({ wave, picks: [], installed, available, weapons: WEAPONS, rng: seeded(seed * 97 + wave) });
    assert.equal(offer.length, 3);
    assert.equal(new Set(offer.map(Cards.pickKey)).size, 3, "Offer cards are distinct");
    for (const pick of offer) {
      const def = Cards.CARD_DEFS.find(entry => entry.id === pick.id);
      if (def.family) assert.ok(installed.includes(pick.family) || available.includes(pick.family), "Family card targets a usable weapon");
      if (def.requires) assert.ok(installed.includes(def.requires) || available.includes(def.requires), def.id + " requirement met");
    }
  }
}
const sameA = Cards.roll({ wave: 4, picks: [], installed, available, weapons: WEAPONS, rng: seeded(7) });
const sameB = Cards.roll({ wave: 4, picks: [], installed, available, weapons: WEAPONS, rng: seeded(7) });
assert.deepEqual(sameA, sameB, "Seeded rolls are deterministic");

// Cards without their module never appear.
for (let seed = 1; seed <= 200; seed += 1) {
  const offer = Cards.roll({ wave: 10, picks: [], installed: ["core", "cannon"], available: ["cannon"], weapons: WEAPONS, rng: seeded(seed) });
  assert.ok(!offer.some(pick => ["medic", "capacitors", "longBurn", "deepFreeze"].includes(pick.id)), "Module-specific cards need their module");
}

// Max stacks are respected.
const maxedDividend = [{ id: "dividend" }];
for (let seed = 1; seed <= 200; seed += 1) {
  const offer = Cards.roll({ wave: 15, picks: maxedDividend, installed, available, weapons: WEAPONS, rng: seeded(seed) });
  assert.ok(!offer.some(pick => pick.id === "dividend"), "Maxed unique cards are excluded");
}

// A single installed weapon must not flood offers with its own family cards.
let familyOnlyOffers = 0;
for (let seed = 1; seed <= 2000; seed += 1) {
  const offer = Cards.roll({ wave: 1, picks: [], installed: ["core", "cannon"], available: ["cannon", "armor"], weapons: WEAPONS, rng: seeded(seed) });
  if (offer.every(pick => pick.family)) familyOnlyOffers += 1;
}
assert.ok(familyOnlyOffers / 2000 < .1, "Offers made only of weapon cards stay rare: " + familyOnlyOffers);

// Guaranteed rare slot after boss waves.
for (let seed = 1; seed <= 200; seed += 1) {
  const offer = Cards.roll({ wave: 5, picks: [], installed, available, weapons: WEAPONS, guaranteeRare: true, rng: seeded(seed) });
  const rarities = offer.map(pick => Cards.CARD_DEFS.find(def => def.id === pick.id).rarity);
  assert.ok(rarities.some(rarity => rarity !== "common"), "Boss rewards include a rare or epic card");
}

// Rarity weights move from early to late values and stay positive.
const early = Cards.rarityWeights(1);
const late = Cards.rarityWeights(30);
assert.deepEqual(early, { common: 75, rare: 22, epic: 3, duo: 22 });
assert.deepEqual(late, { common: 50, rare: 35, epic: 15, duo: 35 });
assert.equal(Cards.rerollCost(3, 0), 6);
assert.equal(Cards.rerollCost(3, 2), 12);

// Retired epics still fold (old picks) but are never offered.
const retired = Cards.CARD_DEFS.filter(def => def.retired).map(def => def.id);
assert.deepEqual(retired.sort(), ["glassCannon", "overtime", "volatile"]);
const fullShip = ["core", "cannon", "rail", "missile", "ember", "cryo", "bulkhead", "pulse", "arc", "laser", "gravity", "repair", "shield"];
const allPairs = [Cards.pairKey("ember", "cryo"), Cards.pairKey("pulse", "arc"), Cards.pairKey("laser", "cryo"), Cards.pairKey("rail", "gravity")];
for (let seed = 1; seed <= 400; seed += 1) {
  const offer = Cards.roll({ wave: 18, picks: [], installed: fullShip, available: fullShip, weapons: WEAPONS, pairs: allPairs, seenDuos: ["thermalShock", "stormSurge", "coldLens", "lensing"], rng: seeded(seed) });
  assert.ok(!offer.some(pick => retired.includes(pick.id)), "Retired cards are never offered");
  assert.ok(!offer.some(pick => Cards.BY_ID[pick.id].kind === "doctrine"), "Doctrines never appear in normal offers");
}

// Rule cards need their families installed; being purchasable is not enough.
for (let seed = 1; seed <= 300; seed += 1) {
  const offer = Cards.roll({ wave: 12, picks: [], installed: ["core", "cannon"], available: fullShip, weapons: WEAPONS, rng: seeded(seed) });
  assert.ok(!offer.some(pick => ["wideIgnition", "coldSteel", "bulkheadRelay", "openShatter"].includes(pick.id)), "Rule cards need installed families");
}
let coldSteelSeen = false;
for (let seed = 1; seed <= 600 && !coldSteelSeen; seed += 1) {
  const offer = Cards.roll({ wave: 15, picks: [], installed: ["core", "cannon", "rail"], available: [], weapons: WEAPONS, rng: seeded(seed) });
  coldSteelSeen = offer.some(pick => pick.id === "coldSteel");
}
assert.ok(coldSteelSeen, "Cold Steel is offered once Cannon and Rail are installed");

// Duos: only with their pair adjacent; the first sighting takes a guaranteed slot.
for (let seed = 1; seed <= 200; seed += 1) {
  const without = Cards.roll({ wave: 8, picks: [], installed: fullShip, available: fullShip, weapons: WEAPONS, pairs: [], rng: seeded(seed) });
  assert.ok(!without.some(pick => Cards.BY_ID[pick.id].kind === "duo"), "Duos need their pair adjacent");
  const fresh = Cards.roll({ wave: 8, picks: [], installed: fullShip, available: fullShip, weapons: WEAPONS, pairs: [Cards.pairKey("cryo", "ember")], seenDuos: [], rng: seeded(seed) });
  assert.equal(fresh[0].id, "thermalShock", "An unseen earned duo takes the first slot");
  const owned = Cards.roll({ wave: 8, picks: [{ id: "thermalShock" }], installed: fullShip, available: fullShip, weapons: WEAPONS, pairs: [Cards.pairKey("cryo", "ember")], seenDuos: [], rng: seeded(seed) });
  assert.ok(!owned.some(pick => pick.id === "thermalShock"), "An owned duo is not offered again");
}
let seenDuoAppears = 0;
for (let seed = 1; seed <= 400; seed += 1) {
  const offer = Cards.roll({ wave: 8, picks: [], installed: fullShip, available: fullShip, weapons: WEAPONS, pairs: [Cards.pairKey("cryo", "ember")], seenDuos: ["thermalShock"], rng: seeded(seed) });
  if (offer[0].id === "thermalShock") seenDuoAppears += 1;
}
assert.ok(seenDuoAppears < 200, "A seen duo returns to the weighted pool: " + seenDuoAppears);

// Doctrine offers: three doctrines, exclusions respected, nothing owned repeats.
for (let seed = 1; seed <= 200; seed += 1) {
  const offer = Cards.roll({ wave: 5, doctrine: true, picks: [], rng: seeded(seed) });
  assert.equal(offer.length, 3);
  assert.ok(offer.every(pick => Cards.BY_ID[pick.id].kind === "doctrine"), "Doctrine offers hold only doctrines");
  const later = Cards.roll({ wave: 10, doctrine: true, picks: [{ id: "flagship" }, { id: "castaway" }], rng: seeded(seed) });
  assert.ok(!later.some(pick => ["flagship", "castaway", "combinedArms"].includes(pick.id)), "Owned and excluded doctrines stay out");
}
assert.equal(Cards.doctrineCount([{ id: "flagship" }, { id: "calibration", family: "cannon" }, { id: "leanHull" }]), 2);
assert.equal(Cards.DOCTRINE_CAP, 3);

// Weapon-count gates: layout cards need enough weapons on the ship.
for (let seed = 1; seed <= 300; seed += 1) {
  const offer = Cards.roll({ wave: 18, picks: [], installed: ["core", "cannon"], available: ["cannon"], weapons: WEAPONS, weaponCount: 1, rng: seeded(seed) });
  assert.ok(!offer.some(pick => ["arcSpine", "outrider"].includes(pick.id)), "Arc Spine and Outrider need two weapons");
}
// Duos never name an unlicensed module, even if a pair were somehow adjacent.
for (let seed = 1; seed <= 200; seed += 1) {
  const offer = Cards.roll({ wave: 8, picks: [], installed: ["core", "cannon"], available: ["cannon", "armor"], weapons: WEAPONS, pairs: [Cards.pairKey("ember", "cryo")], rng: seeded(seed) });
  assert.ok(!offer.some(pick => pick.id === "thermalShock"), "Duos need both families licensed");
}

// Gray Market's larger offer and the skip reward.
const four = Cards.roll({ wave: 9, picks: [], installed, available, weapons: WEAPONS, size: 4, rng: seeded(3) });
assert.equal(four.length, 4);
assert.equal(new Set(four.map(Cards.pickKey)).size, 4);
assert.equal(Cards.skipReward(1), 5);
assert.equal(Cards.skipReward(10), 14);

// Doctrine text uses its own numbers, not the dividend cap.
assert.ok(/below 14/.test(Cards.describe({ id: "leanHull" }, () => "").text));
assert.ok(/\+60% \(\+10% per neighbor\).*−20%/.test(Cards.describe({ id: "flagship" }, () => "").text));

console.log(JSON.stringify({ passed: true, cards: Cards.CARD_DEFS.length }));
