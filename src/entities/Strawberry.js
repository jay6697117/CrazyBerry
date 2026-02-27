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

// ============== 极致拟真建模辅助函数 ==============

// 修正 UV 和法线的辅助应用
function finalizeGeometry(geo) {
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

// 创建具有锯齿边缘、脉络弯曲的“单片草莓小叶” (Trifoliate leaflet)
function createLeaflet(THREE, size) {
  const shape = new THREE.Shape();
  const width = size * 0.6;
  const length = size;

  shape.moveTo(0, 0);
  // 左侧带有锯齿的贝塞尔曲线近似
  shape.bezierCurveTo(-width * 0.4, length * 0.2, -width, length * 0.6, -width * 0.2, length);
  // 顶部中心
  shape.quadraticCurveTo(0, length * 1.05, width * 0.2, length);
  // 右侧
  shape.bezierCurveTo(width, length * 0.6, width * 0.4, length * 0.2, 0, 0);

  const geo = new THREE.ShapeGeometry(shape, 12); // 分段数足够产生平滑且带微小锯齿（若细分）

  // 加入立体弯曲：中间叶脉下沉，叶尖下垂
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    // Y 其实是平面的长度方向，把它转为实际 3D 的 Z 方向，X 保持，然后构建 Y 给个下垂
    // 草莓叶子中心有一道沟，叶尖会下垂
    const distFromCenter = Math.abs(x) / width;
    const dropZ = -Math.pow(y / length, 2) * size * 0.4; // 叶尖下垂
    const veinDip = -Math.pow(1 - distFromCenter, 2) * size * 0.1; // 叶脉凹陷

    // 我们原先是在 XY 绘制，现在把 Y 旋转到 Z 轴上，X 保持，Z(深度)赋予弯曲
    pos.setXYZ(i, x, dropZ + veinDip, -y);
  }

  return finalizeGeometry(geo);
}

// 创建三出复叶（中央一片，两侧各一片附体）
function createTrifoliateLeaf(THREE, size, stemLength) {
  // 茎
  const stem = new THREE.CylinderGeometry(size * 0.05, size * 0.08, stemLength, 5);
  stem.translate(0, stemLength / 2, 0);
  // 倾斜茎
  stem.rotateX(Math.PI / 6);

  // 中心小叶
  const centerLeaf = createLeaflet(THREE, size);
  centerLeaf.translate(0, stemLength * Math.cos(Math.PI / 6), -stemLength * Math.sin(Math.PI / 6));

  // 左小叶
  const leftLeaf = createLeaflet(THREE, size * 0.85);
  leftLeaf.rotateZ(Math.PI / 4);
  leftLeaf.rotateY(-Math.PI / 8);
  leftLeaf.translate(0, stemLength * Math.cos(Math.PI / 6), -stemLength * Math.sin(Math.PI / 6));

  // 右小叶
  const rightLeaf = createLeaflet(THREE, size * 0.85);
  rightLeaf.rotateZ(-Math.PI / 4);
  rightLeaf.rotateY(Math.PI / 8);
  rightLeaf.translate(0, stemLength * Math.cos(Math.PI / 6), -stemLength * Math.sin(Math.PI / 6));

  const groupGeo = THREE.BufferGeometryUtils.mergeGeometries([stem, centerLeaf, leftLeaf, rightLeaf], false);
  return groupGeo;
}

// 构建草莓叶座 (Rosette)
function createPlantRosette(THREE, count, baseSize, heightScale) {
  const leaves = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() * 0.5 - 0.25);
    const size = baseSize * (0.8 + Math.random() * 0.4);
    const stemL = size * 1.5 * heightScale;

    const leafGeo = createTrifoliateLeaf(THREE, size, stemL);

    // 随机倾斜并且绕着中心旋转
    const dipAngle = Math.PI / 6 + Math.random() * Math.PI / 6;
    leafGeo.rotateX(dipAngle);
    leafGeo.rotateY(angle);

    leaves.push(leafGeo);
  }
  return THREE.BufferGeometryUtils.mergeGeometries(leaves, false);
}

// 构建一朵五瓣白花
function createFlower(THREE, size) {
  const parts = [];

  // 花被/萼片 (Sepals) - 绿色底座
  const sepalPoints = [];
  for(let i=0; i<=10; i++) {
    const r = i%2 === 0 ? size * 0.5 : size * 0.1;
    const a = (i/10) * Math.PI * 2;
    sepalPoints.push(new THREE.Vector2(Math.cos(a)*r, Math.sin(a)*r));
  }
  const sepalShape = new THREE.Shape(sepalPoints);
  const sepalGeo = new THREE.ShapeGeometry(sepalShape);
  sepalGeo.rotateX(-Math.PI/2);
  sepalGeo.translate(0, -0.01, 0);

  // 白花瓣 (Petals)
  const petals = [];
  for (let i = 0; i < 5; i++) {
    const petalShape = new THREE.Shape();
    petalShape.moveTo(0, 0);
    petalShape.bezierCurveTo(size*0.3, size*0.2, size*0.4, size*0.8, 0, size);
    petalShape.bezierCurveTo(-size*0.4, size*0.8, -size*0.3, size*0.2, 0, 0);
    const pGeo = new THREE.ShapeGeometry(petalShape, 8);
    // 花瓣微卷
    const pos = pGeo.attributes.position;
    for (let j = 0; j < pos.count; j++) pos.setZ(j, Math.pow(pos.getY(j)/size, 2) * size * 0.2);
    pGeo.rotateX(-Math.PI/2);
    pGeo.rotateY((i / 5) * Math.PI * 2);
    petals.push(pGeo);
  }
  const petalGroup = THREE.BufferGeometryUtils.mergeGeometries(petals, false);

  // 黄色花托 (Receptacle)
  const centerGeo = new THREE.ConeGeometry(size * 0.25, size * 0.2, 16);
  centerGeo.translate(0, size * 0.1, 0);

  // 这里返回数组，便于后续按材质组拆分合并：[0: 萼片(绿), 1: 花瓣(白), 2: 花心(黄)]
  return [sepalGeo, petalGroup, centerGeo];
}

// 极其逼真的聚合果草莓本身 (有下垂变形与种子凹坑)
function createRealisticStrawberry(THREE, size) {
  const points = [];
  const segments = 32;
  // 勾勒“上宽下尖”的心形轮廓
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const y = -t * size; // 从顶部0向下生长
    let r = Math.sin(Math.pow(t, 0.7) * Math.PI) * (size * 0.6); // 顶部丰满，底部渐收
    points.push(new THREE.Vector2(Math.max(0.001, r), y));
  }
  const geo = new THREE.LatheGeometry(points, 32);

  // 通过数学制造种子的凹痕
  const pos = geo.attributes.position;
  // 草莓种子呈斐波那契螺旋排列
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = pos.getY(i);
    if (Math.abs(y) < 0.01 || Math.abs(y) > size * 0.95) continue; // 避开顶部和极尖

    // 转换为极坐标和高度度量
    const angle = Math.atan2(z, x);
    const heightNorm = Math.abs(y) / size;

    // 交错频率凹陷 (模拟种子的小孔)
    const frequency = 25;
    const noise = Math.sin(heightNorm * frequency * Math.PI) * Math.cos((angle + heightNorm * Math.PI) * frequency * 0.5);

    if (noise > 0.7) { // 强烈的下陷坑
      const depth = 0.9 + 0.1 * (1 - noise);
      pos.setX(i, x * depth);
      pos.setZ(i, z * depth);
    }
  }

  // 顶部绿叶萼片
  const sepalPoints = [];
  for(let i=0; i<=10; i++) {
    const r = i%2 === 0 ? size * 0.7 : size * 0.2;
    const a = (i/10) * Math.PI * 2;
    sepalPoints.push(new THREE.Vector2(Math.cos(a)*r, Math.sin(a)*r));
  }
  const sepalGeo = new THREE.ShapeGeometry(new THREE.Shape(sepalPoints));
  sepalGeo.rotateX(-Math.PI/2);
  sepalGeo.translate(0, 0.01, 0); // 浮在顶部

  finalizeGeometry(geo);

  // 返回 [0:萼片(绿), 1:果实(红)]
  return [sepalGeo, geo];
}

// 供主程序调用：按需合并为 Multi-Material 的 InstancedMesh 几何体
// 它返回 { geometry: BufferGeometry, materials: Array }
export function createStageVisualFactory(THREE) {
  if (stageVisualCache.has(THREE)) return stageVisualCache.get(THREE);

  // 通用共用材质
  const matLeave = new THREE.MeshStandardMaterial({ color: 0x24681f, roughness: 0.8 }); // 墨绿
  const matSprout = new THREE.MeshStandardMaterial({ color: 0x76c94b, roughness: 0.5, transparent: true, opacity: 0.9 }); // 嫩绿
  const matFlowerWhite = new THREE.MeshStandardMaterial({ color: 0xfdfdfd, roughness: 0.9 });
  const matFlowerYellow = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.6 });
  const matFruitRed = new THREE.MeshPhysicalMaterial({
    color: 0xe61219, roughness: 0.2, metalness: 0.05,
    clearcoat: 1.0, clearcoatRoughness: 0.1
  });
  // 将种子的颜色设置得更亮一些，类似浅黄色/浅卡其色，方便与深色土壤区分
  const matSeedSoil = new THREE.MeshStandardMaterial({ color: 0xe2c68f, roughness: 0.9 });

  // 1. 种子阶段：为了在宏观视角能清楚看到，这里将种子进行了夸张的放大，并呈现三颗聚堆的形态
  const singleSeedGeo = new THREE.CapsuleGeometry(0.12, 0.2, 8, 8);
  singleSeedGeo.rotateX(Math.PI/2);

  const s1 = singleSeedGeo.clone().translate(0, 0, 0.15);
  const s2 = singleSeedGeo.clone().rotateY(Math.PI * 0.6).translate(0.12, 0, -0.05);
  const s3 = singleSeedGeo.clone().rotateY(-Math.PI * 0.6).translate(-0.12, 0, -0.05);

  const seedGeo = THREE.BufferGeometryUtils.mergeGeometries([s1, s2, s3], false);
  const visualSeed = { geometry: seedGeo, materials: [matSeedSoil] };

  // 2. 幼苗阶段 (嫩绿小复叶)
  const sproutGeo = createPlantRosette(THREE, 3, 0.25, 0.8);
  const visualSprout = { geometry: sproutGeo, materials: [matSprout] };

  // 3. 生长阶段 (大丛的墨绿叶片)
  const growthGeo = createPlantRosette(THREE, 5, 0.3, 1.0);
  const visualGrowth = { geometry: growthGeo, materials: [matLeave] };

  // 4. 开花阶段
  const flowerLeaves = createPlantRosette(THREE, 6, 0.32, 1.0);
  const fParts = createFlower(THREE, 0.12);
  // 花茎
  const fStem = new THREE.CylinderGeometry(0.01, 0.015, 0.3);
  fStem.translate(0, 0.15, 0);
  fStem.rotateX(Math.PI/8);
  fParts.forEach(p => { p.rotateX(Math.PI/8); p.translate(0, 0.3*Math.cos(Math.PI/8), 0.3*Math.sin(Math.PI/8)); });

  const greenPartsF = THREE.BufferGeometryUtils.mergeGeometries([flowerLeaves, fStem, fParts[0]], false);
  // 按照 [绿, 白, 黄] 合并
  const flowerMultiGeo = THREE.BufferGeometryUtils.mergeGeometries([greenPartsF, fParts[1], fParts[2]], true);
  const visualFlower = { geometry: flowerMultiGeo, materials: [matLeave, matFlowerWhite, matFlowerYellow] };

  // 5. 结果阶段
  const fruitLeaves = createPlantRosette(THREE, 7, 0.35, 1.1);
  const rParts = createRealisticStrawberry(THREE, 0.2);
  const rStem = new THREE.CylinderGeometry(0.012, 0.02, 0.35);
  rStem.translate(0, 0.175, 0);
  rStem.rotateX(Math.PI/4); // 沉甸甸下垂
  rParts.forEach(p => { p.rotateX(Math.PI/4); p.translate(0, 0.35*Math.cos(Math.PI/4), 0.35*Math.sin(Math.PI/4)); });

  const greenPartsR = THREE.BufferGeometryUtils.mergeGeometries([fruitLeaves, rStem, rParts[0]], false);
  const fruitMultiGeo = THREE.BufferGeometryUtils.mergeGeometries([greenPartsR, rParts[1]], true);
  const visualFruit = { geometry: fruitMultiGeo, materials: [matLeave, matFruitRed] };

  const visuals = {
    [STRAWBERRY_STAGE.SEED]: visualSeed,
    [STRAWBERRY_STAGE.SPROUT]: visualSprout,
    [STRAWBERRY_STAGE.GROWTH]: visualGrowth,
    [STRAWBERRY_STAGE.FLOWER]: visualFlower,
    [STRAWBERRY_STAGE.FRUIT]: visualFruit
  };

  stageVisualCache.set(THREE, visuals);
  return visuals;
}
