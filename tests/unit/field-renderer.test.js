import test from 'node:test';
import assert from 'node:assert/strict';
import { tileIndex } from '../../src/rendering/FieldRenderer.js';

test('tileIndex is stable for row and col', () => {
  assert.equal(tileIndex(0, 0, 6), 0);
  assert.equal(tileIndex(1, 0, 6), 6);
  assert.equal(tileIndex(2, 3, 6), 15);
});
