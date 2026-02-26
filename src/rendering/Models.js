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
    // 带有分段的 Box，用于制作多边形表面
    const geo = new THREE.BoxGeometry(0.96, 0.35, 0.96, 2, 1, 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      // 仅对顶部顶点做抖动
      if (pos.getY(i) > 0) {
        pos.setY(i, pos.getY(i) + (Math.random() - 0.5) * 0.08);
        pos.setX(i, pos.getX(i) + (Math.random() - 0.5) * 0.04);
        pos.setZ(i, pos.getZ(i) + (Math.random() - 0.5) * 0.04);
      }
    }
    geo.computeVertexNormals();
    const flatGeo = geo.toNonIndexed();
    flatGeo.computeVertexNormals();

    // 平移使其底部贴近 0，原先 y是中心点
    flatGeo.translate(0, -0.05, 0);

    geometryCache.set(cacheKey, flatGeo);
  }
  return geometryCache.get(cacheKey);
}

export function getSharedTileMaterial(THREE) {
  const cacheKey = key('tileMat');
  if (!materialCache.has(cacheKey)) {
    materialCache.set(
      cacheKey,
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        flatShading: true,
        roughness: 0.9,
        metalness: 0.02
      })
    );
  }
  return materialCache.get(cacheKey);
}

export function getSharedIndicatorGeometry(THREE) {
  const cacheKey = key('indicatorGeo');
  if (!geometryCache.has(cacheKey)) {
    geometryCache.set(cacheKey, new THREE.CircleGeometry(0.13, 8));
  }
  return geometryCache.get(cacheKey);
}

function getIndicatorMaterial(THREE, name, color) {
  const cacheKey = key(name);
  if (!materialCache.has(cacheKey)) {
    materialCache.set(
      cacheKey,
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
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
  return createInstanced(THREE, visuals.geometries[stage], visuals.materials[stage], maxCount, {
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
        roughness: 0.9,
        metalness: 0,
        flatShading: true
      })
    );
  }

  const visuals = createStageVisualFactory(THREE);
  return createInstanced(THREE, visuals.geometries[STRAWBERRY_STAGE.GROWTH], materialCache.get(cacheKey), maxCount, {
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
