import test from 'node:test';
import assert from 'node:assert/strict';
import { createParticlePool } from '../../src/rendering/Effects.js';

test('particle pool reuses released objects', () => {
  const pool = createParticlePool(1);
  const a = pool.acquire();
  pool.release(a);
  const b = pool.acquire();
  assert.equal(a, b);
});
