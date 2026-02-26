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

function createTextureFromCanvas(drawFn, size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.premultiplyAlpha = true;
  return texture;
}

// 采用占位图案用于暂时代替真实贴图，留出接口后续替换为加载图片
function getStageTexture(THREE, stage) {
  const key = `stageTex_${stage}`;
  if (!materialCache.has(key)) {
    const tex = createTextureFromCanvas((ctx, size) => {
      ctx.clearRect(0, 0, size, size);
      const cx = size / 2, cy = size / 2;

      switch(stage) {
        case STRAWBERRY_STAGE.SEED:
          ctx.fillStyle = '#8c6e4e';
          ctx.beginPath(); ctx.arc(cx, cy, size*0.1, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#ffffff'; ctx.font = '20px sans-serif'; ctx.fillText('种子', cx-20, cy+5);
          break;
        case STRAWBERRY_STAGE.SPROUT:
          ctx.fillStyle = '#76c94b';
          ctx.beginPath();
          ctx.moveTo(cx, cy+size*0.3); ctx.lineTo(cx-size*0.3, cy-size*0.1); ctx.lineTo(cx, cy-size*0.3); ctx.lineTo(cx+size*0.3, cy-size*0.1);
          ctx.fill();
          ctx.fillStyle = '#ffffff'; ctx.font = '20px sans-serif'; ctx.fillText('芽', cx-10, cy+5);
          break;
        case STRAWBERRY_STAGE.GROWTH:
          ctx.fillStyle = '#2e822a';
          ctx.beginPath();
          ctx.moveTo(cx, cy+size*0.4); ctx.lineTo(cx-size*0.4, cy); ctx.lineTo(cx, cy-size*0.4); ctx.lineTo(cx+size*0.4, cy);
          ctx.fill();
          ctx.fillStyle = '#ffffff'; ctx.font = '20px sans-serif'; ctx.fillText('大叶', cx-20, cy+5);
          break;
        case STRAWBERRY_STAGE.FLOWER:
          ctx.fillStyle = '#2e822a';
          ctx.beginPath(); ctx.arc(cx, cy+size*0.2, size*0.3, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#ffffff';
          for(let i=0; i<5; i++) {
            const a = i/5*Math.PI*2;
            const px = cx + Math.cos(a)*size*0.15, py = cy-size*0.1 + Math.sin(a)*size*0.15;
            ctx.beginPath(); ctx.arc(px, py, size*0.1, 0, Math.PI*2); ctx.fill();
          }
          ctx.fillStyle = '#ffff00'; ctx.beginPath(); ctx.arc(cx, cy-size*0.1, size*0.08, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#000000'; ctx.font = '20px sans-serif'; ctx.fillText('花', cx-10, cy-size*0.1+5);
          break;
        case STRAWBERRY_STAGE.FRUIT:
          ctx.fillStyle = '#2e822a'; ctx.beginPath(); ctx.arc(cx, cy-size*0.3, size*0.2, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#e82531';
          ctx.beginPath(); ctx.moveTo(cx, cy+size*0.3); ctx.bezierCurveTo(cx-size*0.3, cy+size*0.1, cx-size*0.4, cy-size*0.2, cx, cy-size*0.3);
          ctx.bezierCurveTo(cx+size*0.4, cy-size*0.2, cx+size*0.3, cy+size*0.1, cx, cy+size*0.3); ctx.fill();
          ctx.fillStyle = '#ffffff'; ctx.font = '20px sans-serif'; ctx.fillText('果实', cx-20, cy);
          break;
        case 'withered':
          ctx.fillStyle = '#5a5348';
          ctx.beginPath();
          ctx.moveTo(cx, cy+size*0.3); ctx.lineTo(cx-size*0.3, cy); ctx.lineTo(cx, cy-size*0.3); ctx.lineTo(cx+size*0.3, cy);
          ctx.fill();
          ctx.fillStyle = '#ffffff'; ctx.font = '20px sans-serif'; ctx.fillText('枯萎', cx-20, cy+5);
          break;
      }
    });
    materialCache.set(key, tex);
  }
  return materialCache.get(key);
}

function getSpriteMaterial(THREE, stageKey) {
  const cacheKey = `spriteMat_${stageKey}`;
  if (!materialCache.has(cacheKey)) {
    materialCache.set(cacheKey, new THREE.MeshBasicMaterial({
      map: getStageTexture(THREE, stageKey),
      transparent: true,
      alphaTest: 0.1,
      side: THREE.DoubleSide
    }));
  }
  return materialCache.get(cacheKey);
}

// 统一使用的面片几何体用于 InstancedMesh
function getBillboardGeometry(THREE) {
  const cacheKey = key('billboardGeo');
  if (!geometryCache.has(cacheKey)) {
    const geo = new THREE.PlaneGeometry(1, 1);
    // 底部对齐
    geo.translate(0, 0.5, 0);
    geometryCache.set(cacheKey, geo);
  }
  return geometryCache.get(cacheKey);
}

export function createSeedInstancedMesh(THREE, maxCount) {
  return createInstanced(THREE, getBillboardGeometry(THREE), getSpriteMaterial(THREE, STRAWBERRY_STAGE.SEED), maxCount, { castShadow: true, receiveShadow: false });
}

export function createSproutInstancedMesh(THREE, maxCount) {
  return createInstanced(THREE, getBillboardGeometry(THREE), getSpriteMaterial(THREE, STRAWBERRY_STAGE.SPROUT), maxCount, { castShadow: true, receiveShadow: false });
}

export function createGrowthInstancedMesh(THREE, maxCount) {
  return createInstanced(THREE, getBillboardGeometry(THREE), getSpriteMaterial(THREE, STRAWBERRY_STAGE.GROWTH), maxCount, { castShadow: true, receiveShadow: false });
}

export function createFlowerInstancedMesh(THREE, maxCount) {
  return createInstanced(THREE, getBillboardGeometry(THREE), getSpriteMaterial(THREE, STRAWBERRY_STAGE.FLOWER), maxCount, { castShadow: true, receiveShadow: false });
}

export function createFruitInstancedMesh(THREE, maxCount) {
  return createInstanced(THREE, getBillboardGeometry(THREE), getSpriteMaterial(THREE, STRAWBERRY_STAGE.FRUIT), maxCount, { castShadow: true, receiveShadow: false });
}

export function createWitheredInstancedMesh(THREE, maxCount) {
  return createInstanced(THREE, getBillboardGeometry(THREE), getSpriteMaterial(THREE, 'withered'), maxCount, { castShadow: true, receiveShadow: false });
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
