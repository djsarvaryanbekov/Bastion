(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DriftWeaponMuzzles = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";
  // Forward/lateral tile coordinates measured on the current imported artwork.
  // Pixel measurements in tools/weapon-muzzles-check.cjs verify these against
  // module-art-audit.json, so a later art import flags anchors that need updating.
  var ports = {
    cannon: [[.64103856, 0]],
    scatter: [[.64189266, 0]],
    rail: [[1.10471056, 0]],
    missile: [[.21869651, -.28083978], [.21869651, -.15416311],
      [.21869651, .15336640], [.21869651, .28083978]],
    cryo: [[.37159371, 0]],
    laser: [[.50363975, 0]],
    arc: [[.48576, 0]],
    flak: [[.39051761, -.03590243], [.39051761, .07180485]],
    ember: [[.49484802, 0]],
    mine: [[.21899225, 0]]
  };
  var center = [[0, 0]];
  function count(type) { return (ports[type] || center).length; }
  function point(type, origin, angle, size, recoil, index) {
    var points = ports[type] || center;
    var port = points[((index || 0) % points.length + points.length) % points.length];
    var forward = (port[0] - (recoil || 0)) * size;
    var lateral = port[1] * size;
    var cos = Math.cos(angle), sin = Math.sin(angle);
    return { x: origin.x + cos * forward - sin * lateral,
      y: origin.y + sin * forward + cos * lateral };
  }
  return { count: count, point: point, hullFixed: function (type) { return type === "mine"; } };
});
