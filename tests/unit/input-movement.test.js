import test from 'node:test';
import assert from 'node:assert/strict';
import { computeMoveVector } from '../../src/utils/Input.js';

test('movement uses camera-relative forward and right', () => {
  const move = computeMoveVector({
    input: { up: true, right: true, down: false, left: false },
    cameraForward: { x: 0.7, y: 0, z: 0.7 },
    speed: 4,
    dt: 0.25
  });

  assert.ok(Math.hypot(move.x, move.z) > 0);
  assert.ok(move.z > 0);
});
