import test from 'node:test';
import assert from 'node:assert/strict';
import { GridSystem } from '../../src/game/GridSystem.js';
import { CropSystem } from '../../src/game/CropSystem.js';

test('crop reaches stage 5 after enough watered days', () => {
  const grid = new GridSystem({ rows: 1, cols: 1 });
  const crop = new CropSystem();

  grid.tillTile(0, 0);
  grid.plantTile(0, 0, 'strawberry');
  crop.plant('0,0', 1);

  for (let day = 2; day <= 10; day += 1) {
    crop.advanceDay(day, new Set(['0,0']));
  }

  assert.equal(crop.getCrop('0,0').stage, 5);
  assert.equal(crop.getCrop('0,0').harvestable, true);
});

test('crop withers after two dry days', () => {
  const crop = new CropSystem();
  crop.plant('0,1', 1);
  crop.advanceDay(2, new Set());
  crop.advanceDay(3, new Set());
  assert.equal(crop.getCrop('0,1').isWithered, true);
});
