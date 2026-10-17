const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const file = path.resolve(process.argv[2] || 'outputs/Drift_Bastion_Playtest.html');
const html = fs.readFileSync(file, 'utf8');
const movement = html.match(/Game.prototype.updateMovement = function \(dt\) \{[\s\S]*?\n    \};/)[0];
function simulate({ fps = 60, zoom = 1, offset = 200, initialVelocity = 0, seconds = 1, mode = 'mouse', mass = 4, drive = 1, angle = Math.PI / 2, keys = {} } = {}) {
  const env = {
    Game: function () {}, Math, shipHandling: require('../ship-handling'),
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)), lerp: (a, b, t) => a + (b - a) * t,
    mobileInput: { active: mode === 'touch', x: 1, y: 0, magnitude: 1 }, mouseInput: { active: mode === 'mouse', x: 640 + offset, y: 400 },
    viewWidth: 1280, viewHeight: 800, keys, currentQualityTier: () => 2
  };
  vm.runInNewContext(movement, env);
  const game = new env.Game();
  Object.assign(game, {
    ship: { x: 0, y: 0, vx: initialVelocity, vy: 0, angle, angularVelocity: 0, tiles: new Map([['0,0',{x:0,y:0,mass}]]) },
    camera: { x: 0, y: 0, zoom }, shipMass: () => mass, driveMultiplier: () => drive,
    emitDriveParticles() {}, updateCameraFraming() { this.camera.x = this.ship.x; this.camera.y = this.ship.y; }
  });
  for (let i = 0; i < fps * seconds; i++) game.updateMovement(1 / fps);
  return game.ship;
}
assert.ok(simulate({ initialVelocity: 230, offset: -200, seconds: .4 }).vx > 0, 'Reversing cannot bypass the turn');
assert.equal(simulate({ initialVelocity: 230, offset: 0 }).vx, simulate({ initialVelocity: 230, mode: 'keyboard' }).vx, 'Center uses shared drag');
assert.equal(simulate({ offset: 10 }).vx, 0, 'Dead zone stays still');
assert.ok(simulate({ offset: 35 }).vx < simulate({ offset: 80 }).vx, 'Progressive speed');
assert.equal(simulate({ zoom: .42, offset: 60 }).vx, simulate({ zoom: 1, offset: 60 }).vx, 'Zoom-independent response');
assert.ok(Math.abs(simulate({ fps: 30 }).x - simulate({ fps: 144 }).x) < 5, 'Consistent frame rates');
assert.ok(simulate().vx <= 230, 'Speed cap');
for (const mass of [4, 18, 80]) for (const drive of [1, 1.5]) for (const fps of [30, 60, 144]) {
  const common = { mass, drive, fps };
  const keyboard = simulate({ ...common, mode: 'keyboard', keys: { KeyW: true } });
  for (const mode of ['mouse', 'touch']) {
    const pointer = simulate({ ...common, mode });
    assert.equal(pointer.vx, keyboard.vx, mode + ' acceleration and cap match WASD');
    const turn = simulate({ ...common, mode, angle: 0, seconds: .2 });
    const keyTurn = simulate({ ...common, mode: 'keyboard', angle: 0, seconds: .2, keys: { KeyD: true } });
    assert.equal(turn.angle, keyTurn.angle, mode + ' turn acceleration and cap match D');
    const initial = simulate({ ...common, mode, angle: 0, seconds: 1 / fps });
    assert.ok(Math.hypot(initial.vx, initial.vy) < .001, 'No sideways thrust before turning');
  }
}
assert.equal(simulate({ mode: 'keyboard', keys: { KeyW: true, KeyS: true } }).vx, 0, 'Opposite thrust cancels');
assert.equal(simulate({ mode: 'keyboard', keys: { KeyA: true, KeyD: true } }).angularVelocity, 0, 'Opposite turn cancels');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    // Instrument only the isolated browser response; no user profile or on-disk game changes.
    await page.route('**/Drift_Bastion_Playtest.html', route => route.fulfill({
      contentType: 'text/html', body: html.replace('    window.__driftBastion = {',
        '    window.__mouseTest = { input: mouseInput, mobile: mobileInput, keys: () => keys, save: save, getGame: function() { return game; } };\n    window.__driftBastion = {')
    }));
    await page.goto(pathToFileURL(file).href);
    await page.locator('#startButton').click();
    await page.mouse.move(940, 400);
    await page.mouse.down();
    await page.clock.runFor(1200);
    assert.ok(await page.evaluate(() => window.__mouseTest.getGame().ship.vx > 80));
    await page.mouse.move(340, 400);
    await page.clock.runFor(2200);
    assert.ok(await page.evaluate(() => window.__mouseTest.getGame().ship.vx < -80));
    const beforeRelease = await page.evaluate(() => window.__mouseTest.getGame().ship.vx);
    await page.mouse.up();
    assert.equal(await page.evaluate(() => window.__mouseTest.input.active), false);
    assert.equal(await page.evaluate(() => window.__mouseTest.getGame().ship.vx), beforeRelease, 'Release preserves momentum');
    // Compare both release paths from identical motion, using real input events.
    await page.clock.runFor(200);
    const mouseCoast = await page.evaluate(() => window.__mouseTest.getGame().ship.vx);
    assert.ok(Math.abs(mouseCoast) > 0 && Math.abs(mouseCoast) < Math.abs(beforeRelease));
    await page.keyboard.down('w');
    await page.evaluate(vx => { const ship = window.__mouseTest.getGame().ship; ship.vx = vx; ship.vy = 0; }, beforeRelease);
    await page.keyboard.up('w');
    await page.clock.runFor(200);
    const keyboardCoast = await page.evaluate(() => window.__mouseTest.getGame().ship.vx);
    assert.ok(Math.abs(mouseCoast - keyboardCoast) < .001, 'Mouse and WASD have identical release deceleration');
    await page.mouse.down();
    const beforeTakeover = await page.evaluate(() => window.__mouseTest.getGame().ship.vx);
    await page.keyboard.down('w');
    assert.equal(await page.evaluate(() => window.__mouseTest.input.active), false, 'Keyboard takeover');
    assert.equal(await page.evaluate(() => window.__mouseTest.getGame().ship.vx), beforeTakeover, 'Takeover preserves momentum');
    await page.keyboard.up('w');
    await page.mouse.up();
    await page.keyboard.down('w');
    await page.mouse.down();
    await page.keyboard.down('w');
    assert.equal(await page.evaluate(() => __mouseTest.input.active), true, 'Key repeat cannot steal pointer ownership');
    await page.mouse.up();
    assert.equal(await page.evaluate(() => !!__mouseTest.keys().KeyW), false, 'Old held key cannot reactivate after pointer release');
    await page.keyboard.up('w');
    await page.keyboard.down('w');
    await page.keyboard.press('b');
    assert.equal(await page.evaluate(() => !!__mouseTest.keys().KeyW), false, 'Build clears movement');
    await page.keyboard.down('d');
    await page.keyboard.press('b');
    assert.equal(await page.evaluate(() => !!__mouseTest.keys().KeyD), false, 'Build input cannot leak into flight');
    await page.keyboard.up('w');
    await page.keyboard.up('d');
    await page.keyboard.press('p');
    await page.keyboard.down('w');
    await page.keyboard.press('p');
    assert.equal(await page.evaluate(() => !!__mouseTest.keys().KeyW), false, 'Paused input cannot leak into flight');
    await page.keyboard.up('w');
    await page.evaluate(() => { const input = document.createElement('input'); input.id = 'inputTest'; document.body.appendChild(input); input.focus(); });
    await page.keyboard.press('w');
    await page.keyboard.press('b');
    assert.equal(await page.evaluate(() => __mouseTest.getGame().state), 'playing', 'Editing does not open Build');
    assert.equal(await page.evaluate(() => !!__mouseTest.keys().KeyW), false, 'Typing does not steer');
    await page.evaluate(() => document.getElementById('inputTest').remove());
    await page.keyboard.press('Control+w');
    assert.equal(await page.evaluate(() => !!__mouseTest.keys().KeyW), false, 'Browser shortcut does not steer');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 500, y: 400, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 580, y: 400, id: 1 }] });
    assert.equal(await page.evaluate(() => __mouseTest.mobile.active), true, 'Touch owns movement');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 580, y: 400, id: 1 }, { x: 700, y: 400, id: 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 580, y: 400, id: 1 }] });
    assert.equal(await page.evaluate(() => __mouseTest.mobile.active), true, 'Second finger release cannot cancel movement');
    await page.keyboard.down('a');
    assert.equal(await page.evaluate(() => __mouseTest.mobile.active), false, 'Keyboard takes over touch');
    await page.keyboard.up('a');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.mouse.move(940, 400);
    await page.mouse.down();
    await page.evaluate(() => {
      __mouseTest.save.settings.autoPause = false;
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
      delete document.hidden;
    });
    assert.equal(await page.evaluate(() => __mouseTest.input.active), false, 'Hidden tab clears input even without auto-pause');
    await page.mouse.up();
    await page.mouse.down();
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    assert.equal(await page.evaluate(() => window.__mouseTest.input.active), false, 'Blur clears input');
    await page.mouse.up();
    assert.deepEqual(errors, []);
    console.log('Control checks passed: shared acceleration/turning/drag across masses, drives and frame rates; no strafing; opposite keys; ownership and repeats; menu/editable guards; multitouch; release; focus/visibility loss.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
