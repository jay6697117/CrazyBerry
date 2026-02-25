import { GridTile } from '../entities/GridTile.js';
import { GRID_COLS, GRID_ROWS, GRID_TILE_SIZE } from '../utils/Constants.js';

export class GridSystem {
  constructor({ rows = GRID_ROWS, cols = GRID_COLS, tileSize = GRID_TILE_SIZE } = {}) {
    this.rows = rows;
    this.cols = cols;
    this.tileSize = tileSize;
    this.tiles = [];
    this.#buildTiles(rows, cols);
  }

  #buildTiles(rows, cols) {
    this.tiles = Array.from({ length: rows }, (_, row) =>
      Array.from({ length: cols }, (_, col) => new GridTile(row, col))
    );
  }

  getTile(row, col) {
    return this.tiles[row]?.[col] ?? null;
  }

  tillTile(row, col) {
    const tile = this.getTile(row, col);
    if (!tile) return false;
    tile.soilState = 'tilled';
    return true;
  }

  plantTile(row, col, cropId) {
    const tile = this.getTile(row, col);
    if (!tile || tile.soilState !== 'tilled' || tile.cropId) return false;
    tile.cropId = cropId;
    tile.wateredToday = false;
    return true;
  }

  waterTile(row, col) {
    const tile = this.getTile(row, col);
    if (!tile || !tile.cropId) return false;
    tile.wateredToday = true;
    return true;
  }

  clearTile(row, col) {
    const tile = this.getTile(row, col);
    if (!tile) return false;
    tile.cropId = null;
    tile.wateredToday = false;
    if (tile.soilState === 'grass') tile.soilState = 'tilled';
    return true;
  }

  resetWaterFlags() {
    for (const row of this.tiles) {
      for (const tile of row) {
        tile.wateredToday = false;
      }
    }
  }

  getWateredTileKeys() {
    const result = new Set();
    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        const tile = this.tiles[row][col];
        if (tile.wateredToday && tile.cropId) {
          result.add(`${row},${col}`);
        }
      }
    }
    return result;
  }

  expandRows(extraRows = 1) {
    const rowsToAdd = Math.max(0, Math.floor(extraRows));
    if (rowsToAdd === 0) return false;

    const startRow = this.rows;
    for (let row = startRow; row < startRow + rowsToAdd; row += 1) {
      this.tiles[row] = Array.from({ length: this.cols }, (_, col) => new GridTile(row, col));
    }

    this.rows += rowsToAdd;
    return true;
  }

  tileToWorld(row, col) {
    const x = (col - (this.cols - 1) / 2) * this.tileSize;
    const z = (row - (this.rows - 1) / 2) * this.tileSize;
    return { x, z };
  }

  worldToTile(x, z) {
    const col = Math.round(x / this.tileSize + (this.cols - 1) / 2);
    const row = Math.round(z / this.tileSize + (this.rows - 1) / 2);
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return null;
    return { row, col };
  }

  snapshot() {
    return {
      rows: this.rows,
      cols: this.cols,
      tileSize: this.tileSize,
      tiles: this.tiles.map((row) =>
        row.map((tile) => ({
          soilState: tile.soilState,
          cropId: tile.cropId,
          wateredToday: tile.wateredToday
        }))
      )
    };
  }

  restore(snapshot) {
    if (!snapshot || !Array.isArray(snapshot.tiles)) return false;
    this.rows = snapshot.rows;
    this.cols = snapshot.cols;
    this.tileSize = snapshot.tileSize ?? this.tileSize;
    this.#buildTiles(this.rows, this.cols);

    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        const source = snapshot.tiles[row]?.[col];
        if (!source) continue;
        const tile = this.tiles[row][col];
        tile.soilState = source.soilState;
        tile.cropId = source.cropId;
        tile.wateredToday = Boolean(source.wateredToday);
      }
    }

    return true;
  }
}
