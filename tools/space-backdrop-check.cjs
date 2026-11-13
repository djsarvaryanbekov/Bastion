'use strict';
const assert = require('node:assert/strict');
const backdrop = require('../space-backdrop.js');

function recordingContext() {
  const calls = { drawImage: 0, fill: 0, putImageData: 0 };
  return {
    calls,
    globalAlpha: 1,
    filter: 'none',
    lineWidth: 1,
    drawImage() { calls.drawImage += 1; },
    fill() { calls.fill += 1; },
    stroke() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {},
    fillRect() {}, clearRect() {},
    createImageData(width, height) { return { data: new Uint8ClampedArray(width * height * 4) }; },
    putImageData() { calls.putImageData += 1; }
  };
}

// Without a 2D canvas the backdrop reports that it drew nothing, so the game keeps its own stars.
{
  const broken = backdrop.create({ createCanvas() { throw new Error('no canvas'); } });
  const context = recordingContext();
  assert.equal(broken.draw(context, 1920, 1080, 0, 0), false);
  assert.equal(context.calls.drawImage, 0);
  assert.equal(broken.draw({}, 1920, 1080, 0, 0), false, 'A context that cannot draw images is left alone.');
}

// With a canvas it paints its assets once, then only blits them each frame.
{
  const made = [];
  const working = backdrop.create({
    createCanvas() {
      const context = recordingContext();
      const canvas = { width: 0, height: 0, getContext: () => context, context };
      made.push(canvas);
      return canvas;
    }
  });
  const context = recordingContext();
  assert.equal(working.draw(context, 1920, 1080, 0, 0), true);
  const builtOnce = made.length;
  const firstFrame = context.calls.drawImage;
  assert.ok(builtOnce > 10, 'Clouds and rock sprites are built.');
  assert.ok(firstFrame >= 1, 'Clouds are blitted.');
  assert.equal(working.draw(context, 1920, 1080, 4000, -2500), true);
  assert.equal(made.length, builtOnce, 'Nothing is rebuilt on later frames.');
  assert.equal(context.globalAlpha, 1, 'The backdrop restores the alpha it changed.');
  assert.equal(working.draw(context, 1280, 720, 0, 0), true);
  assert.equal(made.length, builtOnce, 'Nothing is fixed to the screen, so a resize rebuilds nothing.');
}

// The game's stars must all move faster than this layer, or slow ones seem to drift forward against it.
assert.ok(backdrop.PARALLAX > 0 && backdrop.PARALLAX < .22, 'The backdrop stays slower than the slowest star.');

console.log('space-backdrop-check passed');
