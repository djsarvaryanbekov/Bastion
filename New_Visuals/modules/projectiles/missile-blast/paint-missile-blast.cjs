'use strict';
// Paints the Missile Pod blast sheets: 8 frames of 256 px, top-down, filled raster art (no outline rings).
// At its widest every variant reaches 118 px from the centre of a 256 px cell, and the game draws the cell
// so that 118 px equals the blast's real damage radius. Usage: node paint-missile-blast.cjs
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('../../../../node_modules/playwright');

const OUT = __dirname;
const CELL = 256, FRAMES = 8, EDGE = 118;

function painter(variant, CELL, FRAMES, EDGE) {
  const canvas = document.createElement('canvas');
  canvas.width = CELL * FRAMES; canvas.height = CELL;
  const ctx = canvas.getContext('2d');
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const easeOut = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
  const mixColor = (a, b, t) => 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')';
  // Rim lobes are fixed per variant so the edge keeps its shape from frame to frame.
  const lobes = Array.from({ length: 22 }, (_, i) => ({ angle: i / 22 * Math.PI * 2 + rand() * .2, size: .14 + rand() * .1, reach: .9 + rand() * .1 }));
  const shards = Array.from({ length: 18 }, (_, i) => ({ angle: i / 18 * Math.PI * 2 + (rand() - .5) * .25, reach: .82 + rand() * .18, width: 2 + rand() * 2.5 }));

  function blob(x, y, r, inner, outer, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, inner); g.addColorStop(.55, inner); g.addColorStop(1, outer);
    ctx.globalAlpha = alpha; ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  for (let frame = 0; frame < FRAMES; frame += 1) {
    // Frame centres, so the first frame already shows the blast and the last one is not empty.
    const p = (frame + .5) / FRAMES;
    const cx = frame * CELL + CELL / 2, cy = CELL / 2;
    ctx.save();
    ctx.beginPath(); ctx.rect(frame * CELL, 0, CELL, CELL); ctx.clip();
    const grow = easeOut(p / .28);
    const fade = 1 - .85 * Math.max(0, (p - .35) / .65);
    const cool = Math.max(0, (p - .2) / .8);
    const hot = mixColor([255, 214, 120], [120, 62, 40], cool);
    const deep = mixColor([255, 120, 40], [52, 44, 46], cool);
    if (variant === 'A') {
      // Fireball: a body of fire fills the whole radius, then cools into smoke in place.
      const r = EDGE * grow;
      lobes.forEach(l => {
        const lr = r * l.size * 1.6, d = r * l.reach - lr * .55;
        blob(cx + Math.cos(l.angle) * d, cy + Math.sin(l.angle) * d, lr, deep, 'rgba(0,0,0,0)', .85 * fade);
      });
      blob(cx, cy, r * .86, hot, 'rgba(255,120,40,0)', .95 * fade);
      if (p < .3) blob(cx, cy, r * .45, '#fff6dc', 'rgba(255,246,220,0)', 1 - p / .3);
    } else if (variant === 'B') {
      // Heat disc: a clear burning edge exactly at the radius over a soft filled disc.
      const r = EDGE * grow;
      blob(cx, cy, r, 'rgba(255,170,70,.32)', 'rgba(255,140,50,.5)', fade);
      for (let i = 0; i < 64; i += 1) {
        const a = i / 64 * Math.PI * 2, wobble = .93 + .07 * Math.sin(i * 1.7 + 1.3);
        blob(cx + Math.cos(a) * r * wobble * .94, cy + Math.sin(a) * r * wobble * .94, 9 + 4 * Math.sin(i * 2.3), hot, 'rgba(255,110,30,0)', .8 * fade);
      }
      if (p < .3) blob(cx, cy, EDGE * .5, '#fff6dc', 'rgba(255,246,220,0)', 1 - p / .3);
    } else {
      // Shrapnel: a hot core and fragments that fly out and stop at the radius, over a faint scorch.
      blob(cx, cy, EDGE, 'rgba(255,150,60,.12)', 'rgba(255,150,60,.22)', fade * grow);
      const travel = easeOut(p / .35);
      shards.forEach(s => {
        const tip = EDGE * s.reach * travel, tail = Math.max(0, tip - 26);
        const g = ctx.createLinearGradient(cx + Math.cos(s.angle) * tail, cy + Math.sin(s.angle) * tail, cx + Math.cos(s.angle) * tip, cy + Math.sin(s.angle) * tip);
        g.addColorStop(0, 'rgba(255,150,60,0)'); g.addColorStop(1, hot);
        ctx.globalAlpha = fade; ctx.strokeStyle = g; ctx.lineWidth = s.width; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(s.angle) * tail, cy + Math.sin(s.angle) * tail); ctx.lineTo(cx + Math.cos(s.angle) * tip, cy + Math.sin(s.angle) * tip); ctx.stroke();
      });
      blob(cx, cy, EDGE * .5 * easeOut(p / .2), hot, 'rgba(255,120,40,0)', .95 * fade);
      if (p < .3) blob(cx, cy, EDGE * .35, '#fff6dc', 'rgba(255,246,220,0)', 1 - p / .3);
    }
    ctx.restore();
  }
  return canvas.toDataURL('image/png');
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent('<html><body style="background:#0b1a2e"></body></html>');
  for (const variant of ['A', 'B', 'C']) {
    const url = await page.evaluate(({ source, variant, CELL, FRAMES, EDGE }) => (0, eval)('(' + source + ')')(variant, CELL, FRAMES, EDGE), { source: painter.toString(), variant, CELL, FRAMES, EDGE });
    fs.writeFileSync(path.join(OUT, 'missile-blast-' + variant + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  }
  await browser.close();
  console.log('painted A, B, C');
})().catch(e => { console.error(e); process.exitCode = 1; });
