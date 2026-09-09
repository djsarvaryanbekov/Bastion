const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'outputs', 'readability-2026-09-08');
fs.mkdirSync(output, { recursive: true });
const server = http.createServer((req, res) => {
  const requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const relative = requested === '/baseline.html' ? '/.artifact_build/readability-backup-20260908-164031/Drift_Bastion_Playtest.html' : (requested === '/' ? '/index.html' : requested);
  const file = path.resolve(root, '.' + relative);
  if (path.relative(root, file).startsWith('..') || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(file)] || 'application/octet-stream');
  let body = fs.readFileSync(file);
  if (requested === '/baseline.html' || requested === '/game.js') {
    body = body.toString().replace('    window.__driftBastion = {',
      '    window.__visualFixture = { game: function () { return game; }, makeTile: makeTile, render: render };\n    window.__driftBastion = {');
  }
  res.end(body);
});
async function assertCardsFit(page) {
  const overflowing = await page.locator('#weaponPicker .pick-button').evaluateAll(cards => cards
    .filter(card => card.scrollHeight > card.clientHeight + 1 || card.scrollWidth > card.clientWidth + 1)
    .map(card => card.textContent));
  assert.deepEqual(overflowing, [], 'Module text must fit inside each card');
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    for (const version of ['before', 'after']) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.clock.install();
      await page.goto(url + (version === 'before' ? '/baseline.html' : '/') + '?debug=1');
      await page.screenshot({ path: path.join(output, version + '-menu.png') });
      await page.locator('#hangarMenuButton').click();
      await page.screenshot({ path: path.join(output, version + '-hangar.png') });
      if (version === 'after') {
        const initial = await page.locator('#starterBrief').boundingBox();
        assert.equal(await page.locator('#weaponPicker .module-icon').count(), 19);
        await assertCardsFit(page);
        await page.locator('#weaponPicker').hover();
        await page.mouse.wheel(0, 2500);
        await page.clock.runFor(200);
        const scrolled = await page.locator('#starterBrief').boundingBox();
        assert.equal(Math.round(scrolled.y), Math.round(initial.y), 'Loadout must remain visible while modules scroll');
        assert.ok(await page.locator('#weaponPicker').evaluate(element => element.scrollTop > 0));
        await page.screenshot({ path: path.join(output, 'after-hangar-scrolled.png') });
        await page.locator('#closeHangar').click();
        await page.locator('#menuSettingsButton').click();
        await page.locator('#uiScaleSelect').selectOption('150');
        await page.locator('#resumeButton').click();
        await page.setViewportSize({ width: 360, height: 640 });
        await page.locator('#hangarMenuButton').click();
        await page.locator('#weaponPicker').evaluate(element => element.scrollTop = 0);
        await assertCardsFit(page);
        await page.screenshot({ path: path.join(output, 'after-mobile-150.png') });
        const detail = await page.locator('#starterBrief').boundingBox();
        const catalog = await page.locator('#weaponPicker').boundingBox();
        assert.ok(detail.y > 0 && detail.y + detail.height < 640);
        assert.ok(catalog.height >= 120, 'Large text must leave room to browse modules');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.locator('#closeHangar').click();
        await page.locator('#menuSettingsButton').click();
        await page.locator('#uiScaleSelect').selectOption('100');
        await page.locator('#resumeButton').click();
        await page.setViewportSize({ width: 1280, height: 800 });
      } else {
        await page.locator('#closeHangar').click();
      }
      await page.locator('#startButton').click();
      // Deterministic visual fixture, not a balance or ordinary-play simulation.
      await page.evaluate(() => {
        const api = window.__visualFixture;
        const game = api.game();
        game.state = 'paused';
        game.enemies.length = 0;
        game.enemyById.clear();
        game.projectiles.length = 0;
        game.effects.length = 0;
        game.ship.x = game.ship.y = game.camera.x = game.camera.y = 0;
        game.ship.angle = 0;
        game.camera.zoom = 1;
        [['laser', -1, 0], ['missile', 1, 0], ['armor', 0, 1]].forEach(([type, x, y]) => {
          game.ship.tiles.set(x + ',' + y, api.makeTile(type, x, y, false));
        });
        [['gunner', -250, -120], ['bolter', 190, -180], ['sniper', 300, 95]].forEach(([type, x, y]) => {
          const enemy = game.spawnEnemy(type, x, y);
          const angle = Math.atan2(-y, -x);
          for (let i = 1; i <= 5; i++) {
            const t = i / 7;
            game.spawnProjectile(false, type + 'Shot', x * t, y * t,
              Math.cos(angle) * 300, Math.sin(angle) * 300, enemy.damage,
              type === 'sniper' ? 5 : 3.5, 2, enemy.color);
          }
        });
        for (let i = 1; i <= 7; i++) {
          game.spawnProjectile(true, 'cannon', -8 + i * 10, -35 - i * 25, 80, -300, 12, 3, 2, '#d6f4ff');
        }
        game.spawnProjectile(true, 'missile', 120, 110, 140, 100, 32, 5, 3, '#ffd96a');
        game.spawnProjectile(true, 'cryo', -110, 95, -400, 100, 9, 4, 2, '#8ac7ff');
        game.spawnProjectile(true, 'rail', -185, 130, -850, 100, 85, 4, 2, '#ff8ee8');
        game.spawnProjectile(true, 'mine', 30, 160, 0, 0, 55, 6, 5, '#ff6f91');
        game.firePiercingBeam({ x: -32, y: 0 }, -1, -.3, 230, 0, '#a987ff', 8, .2);
        api.render(0);
      });
      await page.locator('#debugBar').evaluate(element => element.style.visibility = 'hidden');
      await page.screenshot({ path: path.join(output, version + '-combat.png') });
      await page.evaluate(() => { window.__visualFixture.game().state = 'playing'; });
      await page.keyboard.press('b');
      await page.screenshot({ path: path.join(output, version + '-build.png') });
      await context.close();
    }
    assert.deepEqual(errors, []);
    console.log('Browser screenshots, 19 module icons, pinned loadout and 360x640 at150% passed.');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
