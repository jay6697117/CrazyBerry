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

function createRosetteLeaves(THREE, radius, height, numLeaves, droop) {
  const geo = new THREE.CylinderGeometry(radius, 0.02, height, 32, 5, false);
  geo.translate(0, height / 2, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = pos.getY(i);
    const dist = Math.sqrt(x * x + z * z);
    if (dist < 0.01 && y < 0.01) continue;
    const angle = Math.atan2(z, x);
    const leafWave = Math.cos(angle * numLeaves);
    const leafShape = Math.max(0, leafWave);
    const newDist = dist * (0.2 + 0.8 * Math.pow(leafShape, 1.5));
    const ratio = dist > 0 ? newDist / dist : 0;
    if (dist > 0) {
      pos.setX(i, x * ratio);
      pos.setZ(i, z * ratio);
    }
    pos.setY(i, y - (newDist * droop * leafShape) + (Math.random() - 0.5) * 0.015);
  }
  geo.computeVertexNormals();
  return geo;
}

function createStrawberryFruit(THREE) {
  const points = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const y = t * 0.35;
    let r = Math.sin(t * Math.PI) * 0.18;
    if (t > 0.4) r += (t - 0.4) * 0.15;
    points.push(new THREE.Vector2(r === 0 ? 0.001 : r, y));
  }
  const geo = new THREE.LatheGeometry(points, 32);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < 0.02 || y > 0.33) continue;
    const noise = Math.sin(pos.getX(i) * 60) * Math.cos(pos.getZ(i) * 60) * Math.sin(y * 50);
    if (noise > 0.6) {
      pos.setX(i, pos.getX(i) * 0.95);
      pos.setZ(i, pos.getZ(i) * 0.95);
    }
  }
  geo.translate(0, -0.15, 0);
  geo.computeVertexNormals();
  return geo;
}

export function createStageVisualFactory(THREE) {
  if (stageVisualCache.has(THREE)) return stageVisualCache.get(THREE);

  const seedGeo = new THREE.CapsuleGeometry(0.04, 0.06, 8, 16);
  seedGeo.rotateX(Math.PI / 2);

  const flowerGeo = createRosetteLeaves(THREE, 0.18, 0.05, 5, 0.1);

  const visuals = {
    geometries: {
      [STRAWBERRY_STAGE.SEED]: seedGeo,
      [STRAWBERRY_STAGE.SPROUT]: createRosetteLeaves(THREE, 0.25, 0.15, 3, 0.4),
      [STRAWBERRY_STAGE.GROWTH]: createRosetteLeaves(THREE, 0.4, 0.3, 5, 0.5),
      [STRAWBERRY_STAGE.FLOWER]: flowerGeo,
      [STRAWBERRY_STAGE.FRUIT]: createStrawberryFruit(THREE)
    },
    materials: {
      [STRAWBERRY_STAGE.SEED]: new THREE.MeshStandardMaterial({ color: 0xddbc82, roughness: 0.9 }),
      [STRAWBERRY_STAGE.SPROUT]: new THREE.MeshStandardMaterial({ color: 0x76c94b, roughness: 0.6 }),
      [STRAWBERRY_STAGE.GROWTH]: new THREE.MeshStandardMaterial({ color: 0x2e822a, roughness: 0.7 }),
      [STRAWBERRY_STAGE.FLOWER]: new THREE.MeshStandardMaterial({ color: 0xfffcf0, roughness: 0.3 }),
      [STRAWBERRY_STAGE.FRUIT]: new THREE.MeshPhysicalMaterial({
        color: 0xee1122,
        roughness: 0.25,
        metalness: 0.05,
        clearcoat: 0.8,
        clearcoatRoughness: 0.2
      })
    }
  };

  stageVisualCache.set(THREE, visuals);
  return visuals;
}
