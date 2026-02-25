import { TOOL_TYPES } from '../utils/Constants.js';

export class ToolAdvisor {
  recommend(tile, crop) {
    if (!tile) return TOOL_TYPES.HAND;
    if (tile.soilState === 'grass') return TOOL_TYPES.HOE;
    if (tile.soilState === 'tilled' && tile.cropId === null) return TOOL_TYPES.SEED;
    if (crop?.isWithered) return TOOL_TYPES.SHOVEL;
    if (crop?.harvestable) return TOOL_TYPES.HAND;
    return TOOL_TYPES.WATER;
  }
}
