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

export const AUTO_FARM_POLICY = Object.freeze({
  LOAN_DAILY_RATE: 0.05,
  LOAN_BASE_LIMIT: 620,
  LOAN_PER_EXTRA_ROW: 180,
  OPERATING_CASH_RESERVE: 20,
  SEED_MIN_BATCH: 2,
  EXPANSION_UTILIZATION_THRESHOLD: 0.85,
  EXPANSION_STREAK_DAYS: 2,
  MAX_DEBT_TO_REVENUE: 0.65,
  WATER_URGENT_TIME_RATIO: 0.45,
  HOE_EMPTY_BUFFER_MIN: 2,
  HOE_EMPTY_BUFFER_MAX: GRID_COLS
});

export const WEATHER_CYCLE = Object.freeze([
  { code: 'sunny', icon: '☀️' },
  { code: 'cloudy', icon: '☁️' },
  { code: 'rainy', icon: '🌧️' }
]);

export const ACTION_SOUND_TYPES = Object.freeze({
  WATER: 'water',
  HARVEST: 'harvest',
  TILL: 'till',
  PLANT: 'plant'
});

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'crazyberry.save.v1';
