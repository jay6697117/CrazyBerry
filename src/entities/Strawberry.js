import { CROP_STAGE_THRESHOLDS } from '../utils/Constants.js';

export const STRAWBERRY_STAGE = Object.freeze({
  SEED: 1,
  SPROUT: 2,
  GROWTH: 3,
  FLOWER: 4,
  FRUIT: 5
});

const stageVisualCache = new WeakMap();

export function resolveStageFromGrowthDays(growthDays) {
  if (growthDays >= CROP_STAGE_THRESHOLDS[4]) return STRAWBERRY_STAGE.FRUIT;
  if (growthDays >= CROP_STAGE_THRESHOLDS[3]) return STRAWBERRY_STAGE.FLOWER;
  if (growthDays >= CROP_STAGE_THRESHOLDS[2]) return STRAWBERRY_STAGE.GROWTH;
  if (growthDays >= CROP_STAGE_THRESHOLDS[1]) return STRAWBERRY_STAGE.SPROUT;
  return STRAWBERRY_STAGE.SEED;
}

export function createStageVisualFactory(THREE) {
  if (stageVisualCache.has(THREE)) {
    return stageVisualCache.get(THREE);
  }

  const visuals = {
    geometries: {
      [STRAWBERRY_STAGE.SEED]: new THREE.SphereGeometry(0.13, 8, 6),
      [STRAWBERRY_STAGE.SPROUT]: new THREE.ConeGeometry(0.14, 0.38, 8),
      [STRAWBERRY_STAGE.GROWTH]: new THREE.IcosahedronGeometry(0.25, 0),
      [STRAWBERRY_STAGE.FLOWER]: new THREE.CircleGeometry(0.23, 8),
      [STRAWBERRY_STAGE.FRUIT]: new THREE.ConeGeometry(0.2, 0.42, 8)
    },
    materials: {
      [STRAWBERRY_STAGE.SEED]: new THREE.MeshStandardMaterial({ color: 0xbd9052, roughness: 0.85, metalness: 0.01 }),
      [STRAWBERRY_STAGE.SPROUT]: new THREE.MeshStandardMaterial({ color: 0x67b45a, roughness: 0.8, metalness: 0.01 }),
      [STRAWBERRY_STAGE.GROWTH]: new THREE.MeshStandardMaterial({ color: 0x2f8a41, roughness: 0.76, metalness: 0.01 }),
      [STRAWBERRY_STAGE.FLOWER]: new THREE.MeshStandardMaterial({ color: 0xf6f1dc, roughness: 0.7, metalness: 0.01, side: THREE.DoubleSide }),
      [STRAWBERRY_STAGE.FRUIT]: new THREE.MeshStandardMaterial({ color: 0xc91d3c, roughness: 0.62, metalness: 0.03 })
    }
  };

  stageVisualCache.set(THREE, visuals);
  return visuals;
}
