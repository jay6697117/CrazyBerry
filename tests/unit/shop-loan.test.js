import test from 'node:test';
import assert from 'node:assert/strict';
import { ShopSystem } from '../../src/game/ShopSystem.js';

test('loan borrowing respects dynamic limit', () => {
  const shop = new ShopSystem({ coins: 0 });

  const firstBorrow = shop.borrowCoins(500);
  assert.equal(firstBorrow, 500);
  assert.equal(shop.getEconomyState().coins, 500);

  const secondBorrow = shop.borrowCoins(200);
  assert.equal(secondBorrow, 120);

  const loanState = shop.getLoanState();
  assert.equal(loanState.principal, 620);
  assert.equal(loanState.totalDebt, 620);
  assert.equal(shop.getEconomyState().coins, 620);

  const deniedBorrow = shop.borrowCoins(1);
  assert.equal(deniedBorrow, 0);
});

test('loan interest accrues daily and repayment clears interest before principal', () => {
  const shop = new ShopSystem({ coins: 0 });

  shop.borrowCoins(100);
  const day1Interest = shop.accrueLoanInterest(1);
  const day2to3Interest = shop.accrueLoanInterest(2);
  assert.equal(day1Interest, 5);
  assert.equal(day2to3Interest, 10);

  shop.coins = 200;
  const partialRepay = shop.repayLoan(12);
  assert.equal(partialRepay, 12);

  let loanState = shop.getLoanState();
  assert.equal(loanState.interest, 3);
  assert.equal(loanState.principal, 100);

  const fullRepay = shop.repayLoan(999);
  assert.equal(fullRepay, 103);

  loanState = shop.getLoanState();
  assert.equal(loanState.interest, 0);
  assert.equal(loanState.principal, 0);
  assert.equal(shop.getEconomyState().coins, 85);
});

test('loan fields survive snapshot and restore', () => {
  const source = new ShopSystem({ coins: 0 });
  source.borrowCoins(80);
  source.accrueLoanInterest(1);

  const snapshot = source.snapshot();
  const restored = new ShopSystem({ coins: 0 });
  assert.equal(restored.restore(snapshot), true);

  const economy = restored.getEconomyState();
  assert.equal(economy.loanPrincipal, 80);
  assert.equal(economy.loanInterestAccrued, 4);
  assert.equal(economy.loanDebtTotal, 84);
});
