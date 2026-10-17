(function (root) {
  "use strict";
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

  function AudioEngine() {
    this.context = null;
    this.masterGain = null;
    this._muted = false;
    this.focused = true;
    this.sources = new Set();
    this.volume = .8;
    this.activeVoices = 0;
    this.maxVoices = 18;
    this.nextImpactAt = 0;
    this.nextHeavyShotAt = 0;
  }

  AudioEngine.prototype.ensure = function () {
    if (this.muted || !this.focused || this.volume <= 0) return;
    if (!this.context) {
      var AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.context = new AudioContextClass();
        this.masterGain = this.context.createGain();
        this.masterGain.gain.value = this.volume;
        this.masterGain.connect(this.context.destination);
      }
    }
    if (this.context && this.context.state === "suspended") this.context.resume().catch(function () {});
  };

  AudioEngine.prototype.setVolume = function (value) {
    this.volume = clamp(Number(value) || 0, 0, 1);
    if (!this.volume) this.stop();
    if (this.masterGain && this.context) {
      this.masterGain.gain.setTargetAtTime(this.muted || !this.focused ? 0 : this.volume, this.context.currentTime, .015);
    }
  };

  AudioEngine.prototype.tone = function (frequency, duration, volume, type, slide) {
    if (this.muted || !this.focused || this.volume <= 0) return;
    this.ensure();
    if (!this.context || this.activeVoices >= this.maxVoices) return;
    var now = this.context.currentTime;
    var oscillator = this.context.createOscillator();
    var gain = this.context.createGain();
    oscillator.type = type || "sine";
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency + (slide || 0)), now + duration);
    gain.gain.setValueAtTime(Math.max(.0001, volume), now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.masterGain || this.context.destination);
    this.activeVoices += 1;
    this.sources.add(oscillator);
    var engine = this;
    oscillator.addEventListener("ended", function () {
      engine.activeVoices = Math.max(0, engine.activeVoices - 1);
      engine.sources.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
    }, { once: true });
    oscillator.start(now);
    oscillator.stop(now + duration);
  };

  AudioEngine.prototype.impact = function (strength, critical) {
    if (performance.now() < this.nextImpactAt) return;
    this.nextImpactAt = performance.now() + (critical ? 70 : 115);
    var intensity = clamp(strength, .2, 1.5);
    this.tone(critical ? 58 : 82, .12 + intensity * .045, .025 + intensity * .025, "sawtooth", -28);
    if (critical) this.tone(150, .08, .018, "square", -90);
  };

  AudioEngine.prototype.heavyShot = function (kind) {
    if (this.muted || !this.focused || this.volume <= 0 || performance.now() < this.nextHeavyShotAt) return;
    this.ensure();
    if (!this.context || this.activeVoices > this.maxVoices - 2) return;
    this.nextHeavyShotAt = performance.now() + 90;
    var rail = kind === "rail";
    this.tone(rail ? 72 : 88, rail ? .18 : .13, .025, "sine", -35);
    this.tone(rail ? 420 : 260, .045, .012, "triangle", -170);
  };

  Object.defineProperty(AudioEngine.prototype, "muted", {
    get: function () { return this._muted; },
    set: function (value) {
      this._muted = Boolean(value);
      if (this._muted) this.stop();
      this.setVolume(this.volume);
    }
  });
  AudioEngine.prototype.stop = function () {
    this.sources.forEach(function (source) { try { source.stop(); } catch (_) {} });
    this.nextImpactAt = 0;
    this.nextHeavyShotAt = 0;
  };
  AudioEngine.prototype.setFocused = function (focused) {
    this.focused = Boolean(focused);
    if (!this.focused) this.stop();
    this.setVolume(this.volume);
  };

  root.DriftCombatAudio = { create: function () { return new AudioEngine(); } };
})(window);
