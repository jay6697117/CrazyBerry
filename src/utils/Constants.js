export const GRID_ROWS = 6;
export const GRID_COLS = 6;
export const GRID_MAX_ROWS = 24;
export const GRID_TILE_SIZE = 1.2;

export const DAY_DURATION_SECONDS = 300;

export const TOOL_TYPES = Object.freeze({
  HOE: 'hoe',
  SEED: 'seed',
  WATER: 'water',
  HAND: 'hand',
  SHOVEL: 'shovel'
});

export const CROP_STAGE_THRESHOLDS = Object.freeze([0, 1, 3, 6, 8]);

export const ECONOMY = Object.freeze({
  START_COINS: 100,
  SEED_PRICE: 10,
  WATERING_CAN_UPGRADE_PRICE: 200,
  FARM_EXPANSION_PRICE: 500,
  SELL_NORMAL: 25,
  SELL_PREMIUM: 50,
  PREMIUM_RATE: 0.2
});

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'crazyberry.save.v1';
