import test from 'node:test';
import assert from 'node:assert/strict';
import { ToolAdvisor } from '../../src/game/ToolAdvisor.js';

test('tool recommendation matches tile and crop states', () => {
  const advisor = new ToolAdvisor();
  assert.equal(advisor.recommend({ soilState: 'grass', cropId: null }, null), 'hoe');
  assert.equal(advisor.recommend({ soilState: 'tilled', cropId: null }, null), 'seed');
  assert.equal(advisor.recommend({ soilState: 'tilled', cropId: 's' }, { isWithered: true }), 'shovel');
  assert.equal(advisor.recommend({ soilState: 'tilled', cropId: 's' }, { harvestable: true, isWithered: false }), 'hand');
});
