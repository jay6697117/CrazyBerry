import { AUTO_FARM_POLICY } from '../utils/Constants.js';

const TASK_PRIORITIES = Object.freeze({
  harvest: 0,
  shovel: 1,
  water: 2,
  seed: 3,
  hoe: 4
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getTaskType(tile, crop, { canSeedNow, allowHoeTask }) {
  if (crop?.harvestable) return 'harvest';
  if (crop?.isWithered) return 'shovel';
  if (tile.soilState === 'tilled' && tile.cropId === null && canSeedNow) return 'seed';
  if (tile.cropId !== null && !tile.wateredToday && !crop?.harvestable && !crop?.isWithered) return 'water';
  if (tile.soilState === 'grass' && allowHoeTask) return 'hoe';
  return null;
}

function compareTasks(left, right) {
  if (left.priority !== right.priority) return left.priority - right.priority;
  if (left.distance !== right.distance) return left.distance - right.distance;
  if (left.row !== right.row) return left.row - right.row;
  return left.col - right.col;
}

export function collectTasks({
  gridSystem,
  cropSystem,
  playerPosition,
  economyState,
  seedPrice,
  timeRatio = 0,
  fieldStats = {},
  strategyState = {}
}) {
  const tasks = [];
  const px = Number(playerPosition?.x ?? 0);
  const pz = Number(playerPosition?.z ?? 0);
  const hasEconomyContext = Boolean(economyState);
  const normalizedSeedPrice = Math.max(1, Math.floor(seedPrice ?? 1));
  const seedCount = Math.max(0, Math.floor(economyState?.seedCount ?? 0));
  const coins = Math.max(0, Math.floor(economyState?.coins ?? 0));
  const totalDebt = Math.max(0, Math.floor(economyState?.loanDebtTotal ?? 0));
  const canSeedNow = !hasEconomyContext || seedCount > 0 || coins >= normalizedSeedPrice;
  const activeCropCount = Math.max(0, Math.floor(fieldStats.activeCropCount ?? 0));
  const tilledEmptyCount = Math.max(0, Math.floor(fieldStats.tilledEmptyCount ?? 0));
  const unwateredGrowingCount = Math.max(0, Math.floor(fieldStats.unwateredGrowingCount ?? 0));
  const clampedTimeRatio = Math.max(0, Math.min(0.9999, Number(timeRatio ?? 0)));
  const waterIsUrgent = (
    unwateredGrowingCount > 0 &&
    clampedTimeRatio >= AUTO_FARM_POLICY.WATER_URGENT_TIME_RATIO
  );
  const debtOutstanding = Boolean(strategyState.debtOutstanding) || totalDebt > 0;
  const highDebtPressure = Boolean(strategyState.highDebtPressure) || debtOutstanding || (
    coins < normalizedSeedPrice &&
    seedCount === 0 &&
    totalDebt > 0
  );
  const targetEmptyBuffer = clamp(
    Math.ceil(activeCropCount * 0.2),
    AUTO_FARM_POLICY.HOE_EMPTY_BUFFER_MIN,
    AUTO_FARM_POLICY.HOE_EMPTY_BUFFER_MAX
  );
  const allowHoeTask = !debtOutstanding && tilledEmptyCount < targetEmptyBuffer;
  const dynamicPriorities = waterIsUrgent
    ? { ...TASK_PRIORITIES }
    : { ...TASK_PRIORITIES, seed: 2, water: 3 };
  if (waterIsUrgent) {
    dynamicPriorities.water = 2;
    dynamicPriorities.seed = 3;
  }

  const seedCandidates = [];
  for (let row = 0; row < gridSystem.rows; row += 1) {
    for (let col = 0; col < gridSystem.cols; col += 1) {
      const tile = gridSystem.getTile(row, col);
      if (!tile) continue;

      const crop = cropSystem.getCrop(`${row},${col}`);
      const type = getTaskType(tile, crop, { canSeedNow, allowHoeTask });
      if (!type) continue;

      const world = gridSystem.tileToWorld(row, col);
      const distance = Math.hypot(world.x - px, world.z - pz);
      const task = {
        type,
        row,
        col,
        worldX: world.x,
        worldZ: world.z,
        priority: dynamicPriorities[type],
        distance
      };

      if (type === 'seed') {
        seedCandidates.push(task);
      } else {
        tasks.push(task);
      }
    }
  }

  seedCandidates.sort(compareTasks);
  if (!highDebtPressure) {
    tasks.push(...seedCandidates);
  } else {
    const maxSeedTasks = Math.max(1, Math.min(AUTO_FARM_POLICY.SEED_MIN_BATCH, targetEmptyBuffer));
    tasks.push(...seedCandidates.slice(0, maxSeedTasks));
  }

  tasks.sort(compareTasks);
  return tasks;
}

export function pickNextTask(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) return null;
  return tasks[0] ?? null;
}

export function computeSeedPurchaseCount({
  tilledEmptyCount,
  seedCount,
  coins,
  seedPrice,
  maxBuyCount
}) {
  const normalizedMissing = Math.max(0, Math.floor(tilledEmptyCount) - Math.floor(seedCount));
  if (normalizedMissing === 0) return 0;

  const normalizedSeedPrice = Math.max(1, Math.floor(seedPrice));
  const affordableCount = Math.max(0, Math.floor(coins / normalizedSeedPrice));
  const cap = Math.max(0, Math.floor(maxBuyCount));

  return Math.max(0, Math.min(normalizedMissing, affordableCount, cap));
}
