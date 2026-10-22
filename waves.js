(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DriftWaves = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";

  var WAVE_COUNT = 20;
  var ENDLESS_WAVE_DURATION = 60;
  var ENDLESS_PRESSURE_STEP = 90;
  var ENDLESS_BOSS_EVERY = 5;
  // A wave ramps half of the way toward the next wave's pressure so difficulty climbs inside it too.
  var IN_WAVE_RAMP = .5;

  // pressureAt reuses the endless spawner's clock (ENEMY_PHASES.at, seconds), so wave N fights the same
  // enemy mix the endless run reaches at that time. Boss waves end on the boss kill, not on duration.
  var WAVE_DEFS = [
    { duration: 30, pressureAt: 0, boss: null },
    { duration: 35, pressureAt: 30, boss: null },
    { duration: 40, pressureAt: 60, boss: null },
    { duration: 45, pressureAt: 100, boss: null },
    { duration: null, pressureAt: 140, boss: "mini" },
    { duration: 45, pressureAt: 180, boss: null },
    { duration: 50, pressureAt: 230, boss: null },
    { duration: 50, pressureAt: 280, boss: null },
    { duration: 55, pressureAt: 330, boss: null },
    { duration: null, pressureAt: 380, boss: "mini" },
    { duration: 55, pressureAt: 450, boss: null },
    { duration: 55, pressureAt: 520, boss: null },
    { duration: 60, pressureAt: 580, boss: null },
    { duration: 60, pressureAt: 650, boss: null },
    { duration: null, pressureAt: 720, boss: "mini" },
    { duration: 60, pressureAt: 800, boss: null },
    { duration: 60, pressureAt: 880, boss: null },
    { duration: 60, pressureAt: 960, boss: null },
    { duration: 60, pressureAt: 1080, boss: null },
    { duration: null, pressureAt: 1200, boss: "final" }
  ];

  function endlessDef(wave) {
    var extra = wave - WAVE_COUNT;
    return {
      duration: extra % ENDLESS_BOSS_EVERY === 0 ? null : ENDLESS_WAVE_DURATION,
      pressureAt: WAVE_DEFS[WAVE_COUNT - 1].pressureAt + extra * ENDLESS_PRESSURE_STEP,
      boss: extra % ENDLESS_BOSS_EVERY === 0 ? "mini" : null
    };
  }

  function get(wave) {
    var index = Math.max(1, Math.floor(wave));
    return index <= WAVE_COUNT ? WAVE_DEFS[index - 1] : endlessDef(index);
  }

  function pressureTime(wave, waveElapsed) {
    var def = get(wave);
    if (!def.duration) return def.pressureAt;
    var progress = Math.min(1, Math.max(0, waveElapsed) / def.duration);
    return def.pressureAt + (get(wave + 1).pressureAt - def.pressureAt) * IN_WAVE_RAMP * progress;
  }

  function isBossWave(wave) {
    return Boolean(get(wave).boss);
  }

  function isFinalWave(wave) {
    return get(wave).boss === "final";
  }

  function clearBonus(wave) {
    return 5 + 2 * wave;
  }

  // Enemies grow with the run so the build has to keep up; rewards grow slower than toughness.
  var ENEMY_HP_PER_WAVE = .08;
  var ENEMY_DAMAGE_PER_WAVE = .04;
  var ENEMY_REWARD_PER_WAVE = .03;

  function enemyScale(wave) {
    var steps = Math.max(0, Math.floor(wave) - 1);
    return {
      hp: 1 + ENEMY_HP_PER_WAVE * steps,
      damage: 1 + ENEMY_DAMAGE_PER_WAVE * steps,
      reward: 1 + ENEMY_REWARD_PER_WAVE * steps
    };
  }

  return {
    WAVE_COUNT: WAVE_COUNT,
    get: get,
    pressureTime: pressureTime,
    isBossWave: isBossWave,
    isFinalWave: isFinalWave,
    clearBonus: clearBonus,
    enemyScale: enemyScale
  };
});
