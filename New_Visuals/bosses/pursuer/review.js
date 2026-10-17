"use strict";

class PursuerReview {
  constructor(canvas, data) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.data = data;
    this.image = new Image();
    this.mode = "idle";
    this.phaseTwo = false;
    this.gameplaySize = false;
    this.paused = false;
    this.time = 0;
    this.previousFrame = 0;
    this.stateLabel = document.getElementById("state");
  }

  async start() {
    this.image.src = this.data.source;
    try { await this.image.decode(); }
    catch { this.stateLabel.textContent = "Hull image could not be loaded."; return; }
    document.querySelectorAll("[data-mode]").forEach(button => {
      button.addEventListener("click", () => {
        this.mode = button.dataset.mode;
        this.time = 0;
        document.querySelectorAll("[data-mode]").forEach(control => {
          control.setAttribute("aria-pressed", String(control === button));
        });
      });
    });
    this.bindToggle("phase", "phaseTwo");
    this.bindToggle("size", "gameplaySize");
    this.bindToggle("pause", "paused");
    requestAnimationFrame(timestamp => this.frame(timestamp));
  }

  bindToggle(id, property) {
    const button = document.getElementById(id);
    button.addEventListener("click", () => {
      this[property] = !this[property];
      button.setAttribute("aria-pressed", String(this[property]));
      if (id === "pause") button.textContent = this.paused ? "Resume" : "Pause";
    });
  }

  state() {
    if (this.mode === "idle") return { x: 0, angle: 0, warning: 0, thrust: .12, label: "Idle", shotAge: -1 };
    if (this.mode === "dash") {
      const t = this.time % 4.15;
      const warning = t < 1.15 ? t / 1.15 : 0;
      const dashing = t >= 1.15 && t < 2.05;
      return { x: -144 + Math.min(.9, Math.max(0, t - 1.15)) * 320, angle: Math.PI / 2,
        warning, thrust: dashing ? 1 : t < 1.15 ? .15 + warning * .55 : .12,
        label: t < 1.15 ? "Dash wind-up · 1.15s" : dashing ? "Dash · 0.9s" : "Recovery",
        shotAge: -1 };
    }
    const t = this.time % 2.6;
    return { x: -170, angle: Math.PI / 2, warning: t < .9 ? t / .9 : 0, thrust: .12,
      label: t < .9 ? "Volley wind-up · 0.9s" : "Five-shot volley", shotAge: t >= .9 ? t - .9 : -1 };
  }

  light(x, y, radius, strength) {
    const ctx = this.context;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, `rgba(255,205,120,${strength})`);
    glow.addColorStop(1, "rgba(255,130,55,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  drawHull(state) {
    const ctx = this.context;
    const toWorld = 144 / this.data.size;
    ctx.save();
    ctx.translate(state.x, 0);
    ctx.rotate(state.angle);
    const pulse = this.phaseTwo ? .4 + Math.sin(this.time * 8) * .12 : .18;
    for (const name of ["leftEngine", "rightEngine"]) {
      const anchor = this.data.anchors[name];
      const x = anchor[0] * toWorld;
      const y = anchor[1] * toWorld;
      const length = 4 + state.thrust * 45;
      const flame = ctx.createLinearGradient(x, y, x, y + length);
      flame.addColorStop(0, `rgba(255,220,150,${state.thrust})`);
      flame.addColorStop(.3, `rgba(255,145,70,${state.thrust * .65})`);
      flame.addColorStop(1, "rgba(255,100,40,0)");
      ctx.fillStyle = flame;
      ctx.beginPath();
      ctx.moveTo(x - 4, y - 2);
      ctx.lineTo(x + 4, y - 2);
      ctx.lineTo(x + 1, y + length);
      ctx.lineTo(x - 1, y + length);
      ctx.fill();
    }
    ctx.drawImage(this.image, -72, -72, 144, 144);
    const core = this.data.anchors.core;
    this.light(core[0] * toWorld, core[1] * toWorld, 11, pulse + state.warning * .3);
    if (this.mode === "volley") {
      const emitter = this.data.anchors.emitter;
      const flash = state.shotAge >= 0 ? Math.max(0, 1 - state.shotAge / .1) : state.warning;
      this.light(emitter[0] * toWorld, emitter[1] * toWorld, 7 + flash * 4, flash * .7);
    }
    ctx.restore();
  }

  drawWarnings(state) {
    if (state.warning <= 0) return;
    const ctx = this.context;
    ctx.strokeStyle = `rgba(255,155,85,${.2 + state.warning * .5})`;
    ctx.lineWidth = 1;
    if (this.mode === "dash") {
      ctx.fillStyle = `rgba(255,155,85,${state.warning * .035})`;
      ctx.fillRect(state.x, -78, 288, 156);
      ctx.strokeRect(state.x, -78, 288, 156);
      return;
    }
    ctx.setLineDash([10, 8]);
    for (let i = -2; i <= 2; i++) {
      const angle = i * .18;
      ctx.beginPath();
      ctx.moveTo(state.x + Math.cos(angle) * 72, Math.sin(angle) * 72);
      ctx.lineTo(state.x + Math.cos(angle) * 560, Math.sin(angle) * 560);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  drawShots(state) {
    if (state.shotAge < 0 || state.shotAge > 1.25) return;
    const ctx = this.context;
    ctx.fillStyle = "#ff9b55";
    for (let i = -2; i <= 2; i++) {
      const angle = i * .18;
      const distance = state.shotAge * 320;
      ctx.beginPath();
      ctx.arc(state.x + Math.cos(angle) * distance, Math.sin(angle) * distance, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  frame(timestamp) {
    const dt = this.previousFrame ? Math.min(.05, (timestamp - this.previousFrame) / 1000) : 0;
    this.previousFrame = timestamp;
    if (!this.paused && !document.hidden) this.time += dt;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const ratio = window.devicePixelRatio || 1;
    if (this.canvas.width !== Math.round(width * ratio) || this.canvas.height !== Math.round(height * ratio)) {
      this.canvas.width = Math.round(width * ratio);
      this.canvas.height = Math.round(height * ratio);
    }
    const ctx = this.context;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = "#060d1e";
    ctx.fillRect(0, 0, width, height);
    ctx.translate(width / 2, height / 2);
    const scale = this.gameplaySize ? 1 : 320 / 144;
    ctx.scale(scale, scale);
    const state = this.state();
    this.drawWarnings(state);
    this.drawHull(state);
    this.drawShots(state);
    const label = `${state.label}${this.phaseTwo ? " · Phase 2" : ""}${this.paused ? " · Paused" : ""}`;
    if (this.stateLabel.textContent !== label) this.stateLabel.textContent = label;
    requestAnimationFrame(next => this.frame(next));
  }
}

new PursuerReview(document.getElementById("stage"), window.PursuerPreviewData).start();
