import test from 'node:test';
import assert from 'node:assert/strict';
import { GridSystem } from '../../src/game/GridSystem.js';
import { CropSystem } from '../../src/game/CropSystem.js';
import { collectTasks, pickNextTask, computeSeedPurchaseCount } from '../../src/game/AutoFarmPlanner.js';

test('collectTasks sorts by priority: harvest > shovel > seed > water > hoe', () => {
  const grid = new GridSystem({ rows: 2, cols: 3, tileSize: 1 });
  const crops = new CropSystem();

  grid.tillTile(0, 0);
  grid.plantTile(0, 0, 'strawberry');
  crops.plant('0,0', 1);
  const harvestCrop = crops.getCrop('0,0');
  harvestCrop.stage = 5;
  harvestCrop.harvestable = true;

  grid.tillTile(0, 1);
  grid.plantTile(0, 1, 'strawberry');
  crops.plant('0,1', 1);
  const witheredCrop = crops.getCrop('0,1');
  witheredCrop.isWithered = true;
  witheredCrop.harvestable = false;

  grid.tillTile(0, 2);

  grid.tillTile(1, 0);
  grid.plantTile(1, 0, 'strawberry');
  crops.plant('1,0', 1);

  const tasks = collectTasks({
    gridSystem: grid,
    cropSystem: crops,
    playerPosition: { x: 0, z: 0 },
    economyState: { seedCount: 1, coins: 0 },
    seedPrice: 10
  });

  assert.equal(tasks[0].type, 'harvest');
  assert.equal(tasks[1].type, 'shovel');
  assert.equal(tasks[2].type, 'seed');
  assert.equal(tasks[3].type, 'water');
  assert.equal(tasks[4].type, 'hoe');
});

test('pickNextTask chooses nearest when priorities are equal', () => {
  const grid = new GridSystem({ rows: 1, cols: 3, tileSize: 1.2 });
  const crops = new CropSystem();

  const tasks = collectTasks({
    gridSystem: grid,
    cropSystem: crops,
    playerPosition: { x: 1.15, z: 0 },
    economyState: { seedCount: 1, coins: 0 },
    seedPrice: 10
  });

  const next = pickNextTask(tasks);
  assert.ok(next);
  assert.equal(next.type, 'hoe');
  assert.equal(next.row, 0);
  assert.equal(next.col, 2);
});

test('collectTasks skips seed tasks when no seeds and coins are below seed price', () => {
  const grid = new GridSystem({ rows: 1, cols: 2, tileSize: 1.2 });
  const crops = new CropSystem();

  grid.tillTile(0, 0); // seed candidate
  grid.tillTile(0, 1);
  grid.plantTile(0, 1, 'strawberry'); // water candidate
  crops.plant('0,1', 1);

  const tasks = collectTasks({
    gridSystem: grid,
    cropSystem: crops,
    playerPosition: { x: 0, z: 0 },
    economyState: { seedCount: 0, coins: 5 },
    seedPrice: 10
  });

  assert.equal(tasks[0].type, 'water');
  assert.equal(tasks.some((task) => task.type === 'seed'), false);
});

test('computeSeedPurchaseCount applies demand, budget, and max-buy constraints', () => {
  assert.equal(
    computeSeedPurchaseCount({ tilledEmptyCount: 5, seedCount: 1, coins: 100, seedPrice: 10, maxBuyCount: 99 }),
    4
  );
  assert.equal(
    computeSeedPurchaseCount({ tilledEmptyCount: 8, seedCount: 0, coins: 25, seedPrice: 10, maxBuyCount: 99 }),
    2
  );
  assert.equal(
    computeSeedPurchaseCount({ tilledEmptyCount: 8, seedCount: 0, coins: 100, seedPrice: 10, maxBuyCount: 3 }),
    3
  );
  assert.equal(
    computeSeedPurchaseCount({ tilledEmptyCount: 2, seedCount: 5, coins: 100, seedPrice: 10, maxBuyCount: 99 }),
    0
  );
});
