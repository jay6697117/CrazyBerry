import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GRID_ROWS,
  GRID_COLS,
  DAY_DURATION_SECONDS,
  CROP_STAGE_THRESHOLDS
} from '../../src/utils/Constants.js';

test('constants match design contract', () => {
  assert.equal(GRID_ROWS, 6);
  assert.equal(GRID_COLS, 6);
  assert.equal(DAY_DURATION_SECONDS, 300);
  assert.deepEqual(CROP_STAGE_THRESHOLDS, [0, 1, 3, 6, 8]);
});
