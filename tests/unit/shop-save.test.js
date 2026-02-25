import test from 'node:test';
import assert from 'node:assert/strict';
import { ShopSystem } from '../../src/game/ShopSystem.js';
import { SaveSystem } from '../../src/game/SaveSystem.js';

test('buy sell and save restore work', () => {
  const shop = new ShopSystem({ coins: 100 });
  assert.equal(shop.buySeed(2), true);
  shop.addHarvest({ quantity: 1, quality: 'normal' });
  assert.equal(shop.sellStrawberry({ normalCount: 1, premiumCount: 0 }), true);
  assert.equal(shop.getEconomyState().coins, 105);

  const mem = new Map();
  const save = new SaveSystem({
    storage: {
      getItem: (key) => mem.get(key) ?? null,
      setItem: (key, value) => mem.set(key, value),
      removeItem: (key) => mem.delete(key)
    }
  });

  save.save({ version: 1, dayNumber: 3 });
  assert.equal(save.load().dayNumber, 3);
});
