import { createStageVisualFactory, STRAWBERRY_STAGE } from '../entities/Strawberry.js';

const geometryCache = new Map();
const materialCache = new Map();

function key(name) {
  return name;
}

function createInstanced(THREE, geometry, material, maxCount, { castShadow, receiveShadow }) {
  const mesh = new THREE.InstancedMesh(geometry, material, maxCount);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  return mesh;
}

export function getSharedTileGeometry(THREE) {
  const cacheKey = key('tileGeo');
  if (!geometryCache.has(cacheKey)) {
    const geo = new THREE.BoxGeometry(0.96, 0.35, 0.96, 6, 1, 6);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) > 0) {
        const ridge = Math.sin(pos.getX(i) * Math.PI * 4) * 0.04;
        const noise = (Math.random() - 0.5) * 0.05;
        pos.setY(i, pos.getY(i) + ridge + noise);
        pos.setX(i, pos.getX(i) + (Math.random() - 0.5) * 0.02);
        pos.setZ(i, pos.getZ(i) + (Math.random() - 0.5) * 0.02);
      }
    }
    geo.computeVertexNormals();
    geo.translate(0, -0.05, 0);

    geometryCache.set(cacheKey, geo);
  }
  return geometryCache.get(cacheKey);
}

export function getSharedTileMaterial(THREE) {
  const cacheKey = key('tileMat');
  if (!materialCache.has(cacheKey)) {
    materialCache.set(
      cacheKey,
      new THREE.MeshStandardMaterial({
        color: 0x3d2817,
        roughness: 1.0,
        metalness: 0.0
      })
    );
  }
  return materialCache.get(cacheKey);
}

export function getSharedIndicatorGeometry(THREE) {
  const cacheKey = key('indicatorGeo');
  if (!geometryCache.has(cacheKey)) {
    const geo = new THREE.TorusGeometry(0.18, 0.05, 16, 32);
    geometryCache.set(cacheKey, geo);
  }
  return geometryCache.get(cacheKey);
}

function getIndicatorMaterial(THREE, name, color) {
  const cacheKey = key(name);
  if (!materialCache.has(cacheKey)) {
    materialCache.set(
      cacheKey,
      new THREE.MeshPhysicalMaterial({
        color,
        transmission: 0.5,
        opacity: 0.9,
        transparent: true,
        roughness: 0.2,
        metalness: 0.1,
        emissive: color,
        emissiveIntensity: 0.6
      })
    );
  }
  return materialCache.get(cacheKey);
}

export function createTileInstancedMesh(THREE, maxCount) {
  return createInstanced(THREE, getSharedTileGeometry(THREE), getSharedTileMaterial(THREE), maxCount, {
    castShadow: false,
    receiveShadow: true
  });
}

function createStageMesh(THREE, stage, maxCount) {
  const visuals = createStageVisualFactory(THREE);
  const visual = visuals[stage];
  return createInstanced(THREE, visual.geometry, visual.materials, maxCount, {
    castShadow: true,
    receiveShadow: false
  });
}

export function createSeedInstancedMesh(THREE, maxCount) {
  return createStageMesh(THREE, STRAWBERRY_STAGE.SEED, maxCount);
}

export function createSproutInstancedMesh(THREE, maxCount) {
  return createStageMesh(THREE, STRAWBERRY_STAGE.SPROUT, maxCount);
}

export function createGrowthInstancedMesh(THREE, maxCount) {
  return createStageMesh(THREE, STRAWBERRY_STAGE.GROWTH, maxCount);
}

export function createFlowerInstancedMesh(THREE, maxCount) {
  return createStageMesh(THREE, STRAWBERRY_STAGE.FLOWER, maxCount);
}

export function createFruitInstancedMesh(THREE, maxCount) {
  return createStageMesh(THREE, STRAWBERRY_STAGE.FRUIT, maxCount);
}

export function createWitheredInstancedMesh(THREE, maxCount) {
  const cacheKey = key('witheredMat');
  if (!materialCache.has(cacheKey)) {
    materialCache.set(
      cacheKey,
      new THREE.MeshStandardMaterial({
        color: 0x5a5348,
        roughness: 1.0,
        metalness: 0
      })
    );
  }

  const visuals = createStageVisualFactory(THREE);
  const growthGeo = visuals[STRAWBERRY_STAGE.GROWTH].geometry;

  // Withered uses growth geometry but completely overwritten with withered brown material
  return createInstanced(THREE, growthGeo, [materialCache.get(cacheKey)], maxCount, {
    castShadow: false,
    receiveShadow: false
  });
}

export function createWaterIndicatorMesh(THREE, maxCount) {
  return createInstanced(
    THREE,
    getSharedIndicatorGeometry(THREE),
    getIndicatorMaterial(THREE, 'waterIndicatorMat', 0x67d2f9),
    maxCount,
    { castShadow: false, receiveShadow: false }
  );
}

export function createSoonIndicatorMesh(THREE, maxCount) {
  return createInstanced(
    THREE,
    getSharedIndicatorGeometry(THREE),
    getIndicatorMaterial(THREE, 'soonIndicatorMat', 0xf5cc5f),
    maxCount,
    { castShadow: false, receiveShadow: false }
  );
}

export function createReadyIndicatorMesh(THREE, maxCount) {
  return createInstanced(
    THREE,
    getSharedIndicatorGeometry(THREE),
    getIndicatorMaterial(THREE, 'readyIndicatorMat', 0x7fe67d),
    maxCount,
    { castShadow: false, receiveShadow: false }
  );
}
