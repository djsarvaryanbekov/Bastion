(function (root, factory) {
  "use strict";
  var handling = factory();
  if (typeof module === "object" && module.exports) module.exports = handling;
  if (root) root.DriftShipHandling = handling;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";

  var MAX_TURN_PENALTY = .28;
  var MAX_RESPONSE_PENALTY = .45;
  var MIN_COMPACT_RADIUS_SQUARED = 1.5;
  var SPREAD_ALLOWANCE = 3;

  function measure(tiles, result) {
    result = result || {};
    var mass = 0, weightedX = 0, weightedY = 0, polarMoment = 0;
    tiles.forEach(function (tile) {
      var tileMass = tile.mass || 1;
      mass += tileMass;
      weightedX += tileMass * tile.x;
      weightedY += tileMass * tile.y;
      polarMoment += tileMass * (tile.x * tile.x + tile.y * tile.y);
    });

    var radiusSquared = mass > 0 ? polarMoment / mass : 0;
    // A filled, centered square grows naturally. Penalize extra spread, not mass twice.
    var compactRadiusSquared = Math.max(MIN_COMPACT_RADIUS_SQUARED, (tiles.size - 1) / 6);
    var spread = Math.max(0, Math.min(1,
      (radiusSquared - compactRadiusSquared) / (compactRadiusSquared + SPREAD_ALLOWANCE)));
    result.mass = mass;
    result.centerX = mass > 0 ? weightedX / mass : 0;
    result.centerY = mass > 0 ? weightedY / mass : 0;
    result.polarMoment = polarMoment;
    result.spread = spread;
    result.turnMultiplier = 1 - MAX_TURN_PENALTY * spread;
    result.responseMultiplier = 1 - MAX_RESPONSE_PENALTY * spread;
    return result;
  }

  return Object.freeze({ measure: measure });
});
