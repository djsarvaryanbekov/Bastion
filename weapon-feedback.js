(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DriftWeaponFeedback = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";
  var KICK_DURATION = .30;
  var KICK_HOLD = .04;
  var MAX_IMPULSE = 8;
  var IMPULSE_REFILL = 6;
  var PROFILES = {
    cannon: { kick: .10, impulse: 0 },
    rail: { kick: .16, impulse: 18 },
    missile: { kick: .065, impulse: 0 },
    heavyMissile: { kick: .09, impulse: 9 },
    scatter: { kick: .10, impulse: 0 },
    doubleScatter: { kick: .14, impulse: 6 },
    flak: { kick: .08, impulse: 0 }
  };

  function profile(tile, def) {
    if (tile.type === "rail") return "rail";
    // The Heavy Warhead path and its Cluster descendant use radius 100+.
    if (tile.type === "missile") return def.blastRadius >= 100 ? "heavyMissile" : "missile";
    if (tile.type === "scatter") return def.burstCount > 1 ? "doubleScatter" : "scatter";
    if (tile.type === "cannon" || tile.type === "flak") return tile.type;
    return null;
  }

  function Feedback() {
    this.budget = MAX_IMPULSE;
    this.mass = 3;
    this.x = 0;
    this.y = 0;
  }
  Feedback.prototype.begin = function (dt, mass) {
    this.budget = Math.min(MAX_IMPULSE, this.budget + Math.max(0, dt) * IMPULSE_REFILL);
    this.mass = Math.max(3, mass);
    this.x = 0;
    this.y = 0;
  };
  Feedback.prototype.fire = function (tile, def, nx, ny) {
    var kind = profile(tile, def);
    if (!kind) return null;
    var weight = PROFILES[kind];
    tile.weaponKick = weight.kick;
    tile.weaponKickTime = KICK_DURATION;
    this.x -= nx * weight.impulse / this.mass;
    this.y -= ny * weight.impulse / this.mass;
    return weight.impulse > 0 ? kind : null;
  };
  Feedback.prototype.flush = function (ship) {
    // Sum the broadside first so opposing guns cancel, then cap its net impulse.
    var length = Math.hypot(this.x, this.y);
    if (length > 0) {
      var impulse = Math.min(length, this.budget);
      ship.vx += this.x / length * impulse;
      ship.vy += this.y / length * impulse;
      this.budget -= impulse;
    }
    this.x = 0;
    this.y = 0;
  };
  function settle(tile, dt) {
    if (tile.weaponKickTime > 0) tile.weaponKickTime = Math.max(0, tile.weaponKickTime - dt);
  }
  function offset(tile) {
    var remaining = Math.min(1, (tile.weaponKickTime || 0) / (KICK_DURATION - KICK_HOLD));
    return (tile.weaponKick || 0) * remaining * remaining;
  }
  function shotOffset(tile, def) {
    var kind = profile(tile, def);
    return kind ? PROFILES[kind].kick : offset(tile);
  }
  return { create: function () { return new Feedback(); }, profile: profile, settle: settle, offset: offset, shotOffset: shotOffset };
});
