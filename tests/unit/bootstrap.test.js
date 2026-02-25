import test from 'node:test';
import assert from 'node:assert/strict';
import { bootstrapGame } from '../../src/main.js';

test('bootstrapGame exposes lifecycle methods', async () => {
  const game = await bootstrapGame({ headless: true, autoStart: false });
  assert.equal(typeof game.init, 'function');
  assert.equal(typeof game.start, 'function');
  assert.equal(typeof game.getSnapshot, 'function');
  game.stop();
});
