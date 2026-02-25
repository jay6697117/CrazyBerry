import { ECONOMY, GRID_ROWS } from '../utils/Constants.js';

export class ShopSystem {
  constructor({ coins = ECONOMY.START_COINS } = {}) {
    this.coins = coins;
    this.seedCount = 0;
    this.normalStrawberry = 0;
    this.premiumStrawberry = 0;
    this.farmRows = GRID_ROWS;
    this.wateringCanLevel = 1;
    this.totalHarvested = 0;
  }

  addHarvest({ quantity, quality }) {
    if (quality === 'premium') {
      this.premiumStrawberry += quantity;
    } else {
      this.normalStrawberry += quantity;
    }
    this.totalHarvested += quantity;
  }

  consumeSeed(count = 1) {
    if (this.seedCount < count) return false;
    this.seedCount -= count;
    return true;
  }

  buySeed(count = 1) {
    const total = ECONOMY.SEED_PRICE * count;
    if (this.coins < total) return false;
    this.coins -= total;
    this.seedCount += count;
    return true;
  }

  sellStrawberry({ normalCount, premiumCount }) {
    if (normalCount > this.normalStrawberry) return false;
    if (premiumCount > this.premiumStrawberry) return false;

    this.normalStrawberry -= normalCount;
    this.premiumStrawberry -= premiumCount;
    this.coins += normalCount * ECONOMY.SELL_NORMAL + premiumCount * ECONOMY.SELL_PREMIUM;
    return true;
  }

  buyWateringCanUpgrade() {
    if (this.coins < ECONOMY.WATERING_CAN_UPGRADE_PRICE) return false;
    this.coins -= ECONOMY.WATERING_CAN_UPGRADE_PRICE;
    this.wateringCanLevel += 1;
    return true;
  }

  buyFarmExpansion() {
    if (this.coins < ECONOMY.FARM_EXPANSION_PRICE) return false;
    this.coins -= ECONOMY.FARM_EXPANSION_PRICE;
    this.farmRows += 1;
    return true;
  }

  getEconomyState() {
    return {
      coins: this.coins,
      seedCount: this.seedCount,
      normalStrawberry: this.normalStrawberry,
      premiumStrawberry: this.premiumStrawberry,
      farmRows: this.farmRows,
      wateringCanLevel: this.wateringCanLevel,
      totalHarvested: this.totalHarvested
    };
  }

  snapshot() {
    return this.getEconomyState();
  }

  restore(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return false;
    this.coins = snapshot.coins ?? this.coins;
    this.seedCount = snapshot.seedCount ?? this.seedCount;
    this.normalStrawberry = snapshot.normalStrawberry ?? this.normalStrawberry;
    this.premiumStrawberry = snapshot.premiumStrawberry ?? this.premiumStrawberry;
    this.farmRows = snapshot.farmRows ?? this.farmRows;
    this.wateringCanLevel = snapshot.wateringCanLevel ?? this.wateringCanLevel;
    this.totalHarvested = snapshot.totalHarvested ?? this.totalHarvested;
    return true;
  }
}
