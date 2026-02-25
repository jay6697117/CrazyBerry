import { ECONOMY } from '../utils/Constants.js';
import { resolveStageFromGrowthDays, STRAWBERRY_STAGE } from '../entities/Strawberry.js';

export class CropSystem {
  constructor() {
    this.crops = new Map();
  }

  plant(tileKey, dayNumber) {
    this.crops.set(tileKey, {
      plantedDay: dayNumber,
      growthDays: 0,
      stage: STRAWBERRY_STAGE.SEED,
      missedWaterDays: 0,
      harvestable: false,
      isWithered: false
    });
    return true;
  }

  getCrop(tileKey) {
    return this.crops.get(tileKey) ?? null;
  }

  remove(tileKey) {
    return this.crops.delete(tileKey);
  }

  water(tileKey) {
    const crop = this.crops.get(tileKey);
    if (!crop) return false;
    crop.missedWaterDays = 0;
    return true;
  }

  advanceDay(dayNumber, wateredTileKeys) {
    for (const [tileKey, crop] of this.crops.entries()) {
      if (crop.harvestable || crop.isWithered) continue;

      if (wateredTileKeys.has(tileKey)) {
        crop.growthDays += 1;
        crop.missedWaterDays = 0;
      } else {
        crop.missedWaterDays += 1;
      }

      if (crop.missedWaterDays >= 2) {
        crop.isWithered = true;
        continue;
      }

      crop.stage = resolveStageFromGrowthDays(crop.growthDays);
      crop.harvestable = crop.stage === STRAWBERRY_STAGE.FRUIT;
      crop.lastUpdatedDay = dayNumber;
    }
  }

  harvest(tileKey, rng = Math.random) {
    const crop = this.crops.get(tileKey);
    if (!crop || !crop.harvestable || crop.isWithered) return null;
    this.crops.delete(tileKey);

    return {
      quantity: 1,
      quality: rng() < ECONOMY.PREMIUM_RATE ? 'premium' : 'normal'
    };
  }

  snapshot() {
    return Object.fromEntries(this.crops.entries());
  }

  restore(snapshot) {
    this.crops = new Map();
    if (!snapshot || typeof snapshot !== 'object') return false;
    for (const [tileKey, crop] of Object.entries(snapshot)) {
      this.crops.set(tileKey, { ...crop });
    }
    return true;
  }
}
