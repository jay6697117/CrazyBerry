const geometryCache = new Map();
const materialCache = new Map();

function key(name) {
  return name;
}

export function getSharedTileGeometry(THREE) {
  const cacheKey = key('tileGeo');
  if (!geometryCache.has(cacheKey)) {
    geometryCache.set(cacheKey, new THREE.BoxGeometry(1, 0.2, 1));
  }
  return geometryCache.get(cacheKey);
}

export function getSharedTileMaterial(THREE) {
  const cacheKey = key('tileMat');
  if (!materialCache.has(cacheKey)) {
    materialCache.set(
      cacheKey,
      new THREE.MeshStandardMaterial({
        color: 0x9c6b40,
        flatShading: true,
        roughness: 0.9,
        metalness: 0.02
      })
    );
  }
  return materialCache.get(cacheKey);
}

export function getSharedCropGeometry(THREE) {
  const cacheKey = key('cropGeo');
  if (!geometryCache.has(cacheKey)) {
    geometryCache.set(cacheKey, new THREE.ConeGeometry(0.28, 0.55, 8));
  }
  return geometryCache.get(cacheKey);
}

export function getSharedCropMaterial(THREE) {
  const cacheKey = key('cropMat');
  if (!materialCache.has(cacheKey)) {
    materialCache.set(
      cacheKey,
      new THREE.MeshStandardMaterial({
        color: 0xcf1f3c,
        flatShading: true,
        roughness: 0.7,
        metalness: 0.0
      })
    );
  }
  return materialCache.get(cacheKey);
}

export function createTileInstancedMesh(THREE, maxCount) {
  const mesh = new THREE.InstancedMesh(getSharedTileGeometry(THREE), getSharedTileMaterial(THREE), maxCount);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}

export function createCropInstancedMesh(THREE, maxCount) {
  const mesh = new THREE.InstancedMesh(getSharedCropGeometry(THREE), getSharedCropMaterial(THREE), maxCount);
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  return mesh;
}
