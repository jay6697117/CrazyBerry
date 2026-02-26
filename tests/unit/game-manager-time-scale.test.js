import test from 'node:test';
import assert from 'node:assert/strict';
import { GameManager } from '../../src/game/GameManager.js';

test('auto farm update scales automation delta with time multiplier', async () => {
  const game = await new GameManager({ headless: true }).init();

  try {
    game.setAutoFarmEnabled(true, 'debug');
    game.timeMultiplier = 32;

    game.timeSystem.update = () => ({ dayAdvanced: false, phase: 'morning' });

    let receivedDelta = null;
    game.runAutoFarm = (deltaSeconds) => {
      receivedDelta = deltaSeconds;
    };

    game.update(0.1);

    assert.ok(typeof receivedDelta === 'number');
    assert.equal(Number(receivedDelta.toFixed(4)), 3.2);
  } finally {
    game.stop();
  }
});

test('speed guard keeps 32x when there are active crops to recover with', async () => {
  const game = await new GameManager({ headless: true, rng: () => 0.99 }).init();

  try {
    const cropTiles = [
      [0, 0], [0, 1], [0, 2], [0, 3],
      [1, 0], [1, 1], [1, 2],
      [2, 0], [2, 1], [2, 2]
    ];

    for (const [row, col] of cropTiles) {
      game.gridSystem.tillTile(row, col);
      game.gridSystem.plantTile(row, col, 'strawberry');
      game.cropSystem.plant(`${row},${col}`, game.timeSystem.getDayNumber());
    }

    game.setAutoFarmEnabled(true, 'debug');
    game.timeMultiplier = 32;
    game.update(0.1);

    assert.equal(game.timeMultiplier, 32);
  } finally {
    game.stop();
  }
});

test('speed guard drops to 1x when farm is unrecoverable', async () => {
  const game = await new GameManager({ headless: true, rng: () => 0.99 }).init();

  try {
    game.shopSystem.coins = 0;
    game.shopSystem.seedCount = 0;
    game.setAutoFarmEnabled(true, 'debug');
    game.timeMultiplier = 32;
    game.update(0.1);

    assert.equal(game.timeMultiplier, 1);
    assert.ok(game.autoLastSpeedGuardDay >= 1);
  } finally {
    game.stop();
  }
});
