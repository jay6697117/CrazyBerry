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

function createLowPolySphere(THREE, radius, heightSegments, widthSegments) {
  const geo = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
  const pos = geo.attributes.position;
  // 给顶点加一点随机噪声
  for(let i=0; i<pos.count; i++) {
    pos.setXYZ(i,
      pos.getX(i) + (Math.random()-0.5)*radius*0.15,
      pos.getY(i) + (Math.random()-0.5)*radius*0.15,
      pos.getZ(i) + (Math.random()-0.5)*radius*0.15
    );
  }
  return geo.toNonIndexed();
}

export function createStageVisualFactory(THREE) {
  if (stageVisualCache.has(THREE)) {
    return stageVisualCache.get(THREE);
  }

  // 构建自定义形状
  // 果实：顶部宽，底部尖
  const fruitGeo = new THREE.CylinderGeometry(0.18, 0.05, 0.45, 7, 1);
  const fPos = fruitGeo.attributes.position;
  for(let i=0; i<fPos.count; i++) {
    fPos.setY(i, fPos.getY(i) + (Math.random()-0.5)*0.05);
    fPos.setX(i, fPos.getX(i) + (Math.random()-0.5)*0.05);
    fPos.setZ(i, fPos.getZ(i) + (Math.random()-0.5)*0.05);
  }
  fruitGeo.computeVertexNormals();

  const visuals = {
    geometries: {
      [STRAWBERRY_STAGE.SEED]: createLowPolySphere(THREE, 0.1, 4, 4),
      [STRAWBERRY_STAGE.SPROUT]: new THREE.ConeGeometry(0.12, 0.3, 5).toNonIndexed(),
      [STRAWBERRY_STAGE.GROWTH]: createLowPolySphere(THREE, 0.25, 5, 5),
      // 花朵：简单的 5 边形圆盘稍微旋转
      [STRAWBERRY_STAGE.FLOWER]: new THREE.CylinderGeometry(0.2, 0.1, 0.08, 5).toNonIndexed(),
      [STRAWBERRY_STAGE.FRUIT]: fruitGeo.toNonIndexed()
    },
    materials: {
      [STRAWBERRY_STAGE.SEED]: new THREE.MeshStandardMaterial({ color: 0x8a6036, roughness: 0.9, flatShading: true }),
      [STRAWBERRY_STAGE.SPROUT]: new THREE.MeshStandardMaterial({ color: 0x93d96c, roughness: 0.7, flatShading: true }),
      [STRAWBERRY_STAGE.GROWTH]: new THREE.MeshStandardMaterial({ color: 0x48a846, roughness: 0.8, flatShading: true }),
      [STRAWBERRY_STAGE.FLOWER]: new THREE.MeshStandardMaterial({ color: 0xfffbee, roughness: 0.6, flatShading: true }),
      [STRAWBERRY_STAGE.FRUIT]: new THREE.MeshStandardMaterial({ color: 0xed3e4c, roughness: 0.4, metalness: 0.1, flatShading: true })
    }
  };

  stageVisualCache.set(THREE, visuals);
  return visuals;
}
