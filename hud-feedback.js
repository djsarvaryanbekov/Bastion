(function () {
  "use strict";

  // Makes HUD values react when they change instead of silently swapping text.
  // Matter: the number rolls to the new value, pops on gain, and a "+N" tick sums the gains of the last moment.
  // Core HP: the lost part stays visible as a light trail that drains after a beat, and the panel jolts sideways.

  var MATTER_ROLL_RATE = 14;          // per second; higher catches up faster (large wave rewards roll, single kills snap)
  var MATTER_POP_SECONDS = .22;       // one bump: grows, then settles back
  var MATTER_POP_MIN = .14;           // bump size for a single kill
  var MATTER_POP_MAX = .25;           // bump size for a lump; larger would reach the "+N" tick beside the number
  var MATTER_POP_PER_UNIT = .012;
  var DELTA_HOLD_SECONDS = .3;        // gains inside this time add into one tick (user: .75 s lingered too long)
  var DELTA_FADE_SECONDS = .2;
  var DELTA_RISE_PX = 10;

  var TRAIL_HOLD_SECONDS = .38;       // the lost HP stays visible this long before it drains
  var TRAIL_DRAIN_PER_SECOND = .85;   // share of the bar drained per second
  var HIT_JOLT_SECONDS = .2;
  var HIT_JOLT_MIN_PX = 3;
  var HIT_JOLT_MAX_PX = 8;
  var HIT_JOLT_PX_PER_SHARE = 60;     // a hit taking 10% of max HP jolts 6 px
  var HIT_JOLT_FREQUENCY = 46;        // radians per second
  var HIT_TINT_SECONDS = .32;
  var HEAL_GLOW_SECONDS = .5;

  function create(elements) {
    var matterValue = elements.matterValue;
    var matterDelta = elements.matterDelta;
    var healthShell = elements.healthShell;
    var healthFill = elements.healthFill;
    var healthTrail = elements.healthTrail;
    var hpText = elements.hpText;
    var hpMax = elements.hpMax;
    if (!matterValue || !matterDelta || !healthShell || !healthFill || !healthTrail || !hpText || !hpMax) {
      throw new Error("HUD feedback is missing a required element.");
    }

    var runToken = null;
    var shownMatter = 0;
    var lastMatter = 0;
    var popTime = 0;
    var popSize = 0;
    var deltaSum = 0;
    var deltaAge = Infinity;
    var lastHp = 0;
    var lastMaxHp = 1;
    var trailRatio = 1;
    var trailHold = 0;
    var jolt = 0;
    var joltAmplitude = 0;
    var tint = 0;
    var heal = 0;
    var written = { matter: "", matterTransform: "", delta: "", deltaOpacity: "", deltaTransform: "", fill: "", trail: "", hp: "", hpMax: "", shell: "", tint: -1, heal: -1 };

    function write(key, value, apply) {
      if (written[key] === value) return;
      written[key] = value;
      apply(value);
    }

    function snap(matter, hp, maxHp) {
      shownMatter = lastMatter = Math.floor(matter);
      popTime = popSize = 0;
      deltaSum = 0;
      deltaAge = Infinity;
      lastHp = hp;
      lastMaxHp = maxHp;
      trailRatio = maxHp > 0 ? hp / maxHp : 1;
      trailHold = 0;
      jolt = tint = heal = 0;
    }

    function trackMatter(dt, matter) {
      var whole = Math.floor(matter);
      var change = whole - lastMatter;
      lastMatter = whole;
      if (change !== 0) {
        // A spend right after gains starts a new tick, so "+12" never turns into a confusing "+3".
        if (deltaAge > DELTA_HOLD_SECONDS + DELTA_FADE_SECONDS || (deltaSum > 0) !== (change > 0)) deltaSum = 0;
        deltaSum += change;
        deltaAge = 0;
        // A steady kill stream restarts the bump only once the last one is past its peak, so it pulses instead of sticking big.
        if (change > 0 && popTime <= MATTER_POP_SECONDS / 2) {
          popTime = MATTER_POP_SECONDS;
          popSize = Math.max(MATTER_POP_MIN, Math.min(MATTER_POP_MAX, change * MATTER_POP_PER_UNIT + MATTER_POP_MIN));
        }
      } else {
        deltaAge += dt;
      }
      var gap = whole - shownMatter;
      shownMatter = Math.abs(gap) < 1 ? whole : shownMatter + gap * Math.min(1, dt * MATTER_ROLL_RATE);
      popTime = Math.max(0, popTime - dt);
    }

    function popScale() {
      if (popTime <= 0) return 0;
      return popSize * Math.sin(Math.PI * Math.min(1, (1 - popTime / MATTER_POP_SECONDS) * 1.15 + .15));
    }

    function trackHealth(dt, hp, maxHp, shake) {
      var ratio = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
      if (maxHp !== lastMaxHp) trailRatio = Math.max(trailRatio, ratio);
      if (hp < lastHp - .01 && maxHp > 0) {
        var share = (lastHp - hp) / maxHp;
        var amplitude = Math.max(HIT_JOLT_MIN_PX, Math.min(HIT_JOLT_MAX_PX, share * HIT_JOLT_PX_PER_SHARE)) * shake;
        joltAmplitude = jolt > 0 ? Math.max(joltAmplitude, amplitude) : amplitude;
        jolt = HIT_JOLT_SECONDS;
        tint = HIT_TINT_SECONDS;
        // Only a hit on a caught-up trail starts a new hold; under steady fire the trail keeps draining
        // instead of freezing at the first hit and turning most of the bar cream.
        if (trailRatio - lastHp / maxHp < .005) trailHold = TRAIL_HOLD_SECONDS;
      } else if (hp > lastHp + .5) {
        heal = HEAL_GLOW_SECONDS;
      }
      lastHp = hp;
      lastMaxHp = maxHp;
      if (trailRatio < ratio) trailRatio = ratio;
      else if (trailHold > 0) trailHold = Math.max(0, trailHold - dt);
      else trailRatio = Math.max(ratio, trailRatio - TRAIL_DRAIN_PER_SECOND * dt);
      jolt = Math.max(0, jolt - dt);
      tint = Math.max(0, tint - dt);
      heal = Math.max(0, heal - dt);
      return ratio;
    }

    function render(hp, maxHp, ratio) {
      write("matter", String(Math.round(shownMatter)), function (value) { matterValue.textContent = value; });
      var pop = popScale();
      write("matterTransform", pop > .005 ? "scale(" + (1 + pop).toFixed(3) + ")" : "", function (value) { matterValue.style.transform = value; });

      var deltaVisible = deltaSum !== 0 && deltaAge < DELTA_HOLD_SECONDS + DELTA_FADE_SECONDS;
      var fade = deltaAge <= DELTA_HOLD_SECONDS ? 1 : 1 - (deltaAge - DELTA_HOLD_SECONDS) / DELTA_FADE_SECONDS;
      write("delta", deltaVisible ? (deltaSum > 0 ? "+" : "−") + Math.abs(deltaSum) : "", function (value) {
        matterDelta.textContent = value;
        matterDelta.classList.toggle("spend", value.charAt(0) === "−");
      });
      write("deltaOpacity", deltaVisible ? fade.toFixed(2) : "0", function (value) { matterDelta.style.opacity = value; });
      write("deltaTransform", deltaVisible ? "translateY(" + (-(1 - fade) * DELTA_RISE_PX).toFixed(1) + "px)" : "", function (value) { matterDelta.style.transform = value; });

      write("fill", (ratio * 100).toFixed(2) + "%", function (value) { healthFill.style.width = value; });
      write("trail", (trailRatio * 100).toFixed(2) + "%", function (value) { healthTrail.style.width = value; });
      write("hp", String(Math.ceil(hp)), function (value) { hpText.textContent = value; });
      write("hpMax", " / " + Math.ceil(maxHp), function (value) { hpMax.textContent = value; });
      var offset = jolt > 0 ? Math.sin((HIT_JOLT_SECONDS - jolt) * HIT_JOLT_FREQUENCY) * joltAmplitude * (jolt / HIT_JOLT_SECONDS) : 0;
      // The separate translate property stacks with any transform the layout uses (the phone build centres this panel).
      write("shell", Math.abs(offset) > .2 ? offset.toFixed(1) + "px 0" : "", function (value) { healthShell.style.translate = value; });
      var tinted = tint > 0 ? 1 : 0;
      write("tint", tinted, function (value) { healthShell.classList.toggle("hp-hit", value === 1); });
      var healed = heal > 0 ? 1 : 0;
      write("heal", healed, function (value) { healthShell.classList.toggle("hp-heal", value === 1); });
    }

    return {
      // token identifies the run; a new run snaps every value instead of rolling from the last run's numbers.
      update: function (dt, token, matter, hp, maxHp, shakeScale) {
        if (token !== runToken) {
          runToken = token;
          snap(matter, hp, maxHp);
        }
        trackMatter(dt, matter);
        var ratio = trackHealth(dt, hp, maxHp, shakeScale);
        render(hp, maxHp, ratio);
      }
    };
  }

  window.DriftHudFeedback = { create: create };
})();
