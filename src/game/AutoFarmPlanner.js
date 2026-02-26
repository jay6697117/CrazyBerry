const TASK_PRIORITIES = Object.freeze({
  harvest: 0,
  shovel: 1,
  seed: 2,
  water: 3,
  hoe: 4
});

function getTaskType(tile, crop) {
  if (crop?.harvestable) return 'harvest';
  if (crop?.isWithered) return 'shovel';
  if (tile.soilState === 'tilled' && tile.cropId === null) return 'seed';
  if (tile.cropId !== null && !tile.wateredToday && !crop?.harvestable && !crop?.isWithered) return 'water';
  if (tile.soilState === 'grass') return 'hoe';
  return null;
}

function compareTasks(left, right) {
  if (left.priority !== right.priority) return left.priority - right.priority;
  if (left.distance !== right.distance) return left.distance - right.distance;
  if (left.row !== right.row) return left.row - right.row;
  return left.col - right.col;
}

export function collectTasks({ gridSystem, cropSystem, playerPosition }) {
  const tasks = [];
  const px = Number(playerPosition?.x ?? 0);
  const pz = Number(playerPosition?.z ?? 0);

  for (let row = 0; row < gridSystem.rows; row += 1) {
    for (let col = 0; col < gridSystem.cols; col += 1) {
      const tile = gridSystem.getTile(row, col);
      if (!tile) continue;

      const crop = cropSystem.getCrop(`${row},${col}`);
      const type = getTaskType(tile, crop);
      if (!type) continue;

      const world = gridSystem.tileToWorld(row, col);
      const distance = Math.hypot(world.x - px, world.z - pz);
      tasks.push({
        type,
        row,
        col,
        worldX: world.x,
        worldZ: world.z,
        priority: TASK_PRIORITIES[type],
        distance
      });
    }
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
