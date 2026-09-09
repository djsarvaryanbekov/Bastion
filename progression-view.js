(function (root, factory) {
  "use strict";
  var view = factory();
  if (typeof module === "object" && module.exports) module.exports = view;
  if (root) root.DriftProgressionView = view;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";

  function nonNegative(value) {
    if (typeof value !== "number" && typeof value !== "string") return 0;
    var number = Number(value);
    return Number.isFinite(number) ? Math.min(1000000000, Math.max(0, number)) : 0;
  }

  function displayNumber(value) {
    return String(Math.round(value * 100) / 100);
  }

  function moduleName(definitions, type) {
    var definition = definitions && definitions[type];
    return definition && typeof definition.name === "string" ? definition.name : type;
  }

  // The progression API remains the authority for ownership, legacy rights and gates.
  function buildResultModel(progressionApi, progress, fragments, newTypes, moduleDefinitions) {
    var wallet = nonNegative(fragments);
    var newlyAvailable = new Set(Array.isArray(newTypes) ? newTypes : []);
    var available = [];
    var nearest = null;
    progressionApi.definitions.forEach(function (definition, index) {
      var state = progressionApi.status(progress, definition.type);
      if (state.owned) return;
      if (state.available && Number.isFinite(state.cost) && state.cost >= 0) {
        available.push({ type: definition.type, cost: state.cost, newlyAvailable: newlyAvailable.has(definition.type), order: index });
        return;
      }
      var objective = state.objective;
      if (!objective) return;
      var target = nonNegative(objective.target);
      var current = Math.min(nonNegative(objective.current), target);
      if (target > 0 && (!nearest || current / target > nearest.value / nearest.max)) {
        nearest = { type: definition.type, label: "More modules", text: objective.text, value: current, max: target };
      }
    });

    var affordable = available.filter(function (offer) { return offer.cost <= wallet; });
    affordable.sort(function (a, b) {
      return Number(b.newlyAvailable) - Number(a.newlyAvailable) || a.cost - b.cost || a.order - b.order;
    });
    var goal = null;
    if (!affordable.length && available.length) {
      var cheapest = available.reduce(function (best, offer) { return offer.cost < best.cost ? offer : best; });
      goal = {
        type: cheapest.type,
        label: "Save for a module",
        text: moduleName(moduleDefinitions, cheapest.type) + " · " + displayNumber(cheapest.cost - wallet) + " more Fragments (" + displayNumber(cheapest.cost) + " total)",
        value: wallet,
        max: cheapest.cost
      };
    } else if (!affordable.length) {
      goal = nearest;
    }
    return {
      availableCount: available.length,
      affordableCount: affordable.length,
      offers: affordable.slice(0, 3).map(function (offer) {
        return { type: offer.type, cost: offer.cost, newlyAvailable: offer.newlyAvailable };
      }),
      availableNewTypes: available.filter(function (offer) { return offer.newlyAvailable; }).map(function (offer) { return offer.type; }),
      goal: goal
    };
  }

  function buildMetaComparison(rank, cap, bonusPercent, unit) {
    rank = Math.floor(nonNegative(rank));
    cap = Math.floor(nonNegative(cap));
    bonusPercent = nonNegative(bonusPercent);
    unit = typeof unit === "string" ? unit.trim() : "";
    var maxed = rank >= cap;
    var nextRank = maxed ? rank : rank + 1;
    var currentPercent = rank * bonusPercent;
    var nextPercent = nextRank * bonusPercent;
    var suffix = unit ? " " + unit : "";
    var currentText = "+" + displayNumber(currentPercent) + "%" + suffix;
    var nextText = "+" + displayNumber(nextPercent) + "%" + suffix;
    return {
      rank: rank,
      cap: cap,
      nextRank: nextRank,
      currentPercent: currentPercent,
      nextPercent: nextPercent,
      currentText: currentText,
      nextText: nextText,
      text: maxed ? currentText + (rank > cap ? " · Retained" : " · Max") : "+" + displayNumber(currentPercent) + "% → " + nextText,
      maxed: maxed
    };
  }

  return Object.freeze({ buildResultModel: buildResultModel, buildMetaComparison: buildMetaComparison });
});
