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
  const fruitGeo = new THREE.CylinderGeometry(0.18, 0.05, 0.35, 12, 1);
  const fPos = fruitGeo.attributes.position;
  // 添加微小的随机位移使草莓更自然
  for(let i=0; i<fPos.count; i++) {
    fPos.setY(i, fPos.getY(i) + (Math.random()-0.5)*0.02);
    fPos.setX(i, fPos.getX(i) + (Math.random()-0.5)*0.03);
    fPos.setZ(i, fPos.getZ(i) + (Math.random()-0.5)*0.03);
  }
  fruitGeo.computeVertexNormals();

  // 幼苗与植物底座：多层结构拼凑成一簇
  const leafBaseGeo = new THREE.ConeGeometry(0.15, 0.25, 6);
  leafBaseGeo.rotateX(Math.PI / 12);
  const leafLayer2 = new THREE.ConeGeometry(0.2, 0.3, 7);
  leafLayer2.rotateX(-Math.PI / 6);
  const growthLeaves = new THREE.ConeGeometry(0.28, 0.4, 8);
  growthLeaves.rotateX(-Math.PI / 8);

  // 花期：带有小花瓣的形状
  const flowerGeo = new THREE.CylinderGeometry(0.2, 0.08, 0.08, 8).toNonIndexed();
  const petalPos = flowerGeo.attributes.position;
  for(let i=0; i<petalPos.count; i++) {
    petalPos.setY(i, petalPos.getY(i) + (Math.random()-0.5)*0.04);
  }
  flowerGeo.computeVertexNormals();

  const visuals = {
    geometries: {
      [STRAWBERRY_STAGE.SEED]: createLowPolySphere(THREE, 0.08, 6, 6),
      [STRAWBERRY_STAGE.SPROUT]: leafBaseGeo.toNonIndexed(),
      [STRAWBERRY_STAGE.GROWTH]: growthLeaves.toNonIndexed(),
      [STRAWBERRY_STAGE.FLOWER]: flowerGeo,
      [STRAWBERRY_STAGE.FRUIT]: fruitGeo.toNonIndexed()
    },
    materials: {
      [STRAWBERRY_STAGE.SEED]: new THREE.MeshStandardMaterial({ color: 0x5a3e23, roughness: 0.9, flatShading: true }),
      [STRAWBERRY_STAGE.SPROUT]: new THREE.MeshStandardMaterial({ color: 0x8ced5c, roughness: 0.6, flatShading: true }),
      [STRAWBERRY_STAGE.GROWTH]: new THREE.MeshStandardMaterial({ color: 0x3d9c3a, roughness: 0.7, flatShading: true }),
      [STRAWBERRY_STAGE.FLOWER]: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, flatShading: true }),
      [STRAWBERRY_STAGE.FRUIT]: new THREE.MeshStandardMaterial({ color: 0xff2a40, roughness: 0.2, metalness: 0.15, flatShading: true })
    }
  };

  stageVisualCache.set(THREE, visuals);
  return visuals;
}
