import test from 'node:test';
import assert from 'node:assert/strict';
import { getRendererPixelRatioCap } from '../../src/rendering/SceneSetup.js';

test('renderer pixel ratio is capped to 2', () => {
  assert.equal(getRendererPixelRatioCap(1), 1);
  assert.equal(getRendererPixelRatioCap(2.7), 2);
});
