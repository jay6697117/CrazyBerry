import { STRAWBERRY_STAGE } from '../entities/Strawberry.js';
import { GRID_MAX_ROWS } from '../utils/Constants.js';
import {
  createFlowerInstancedMesh,
  createFruitInstancedMesh,
  createGrowthInstancedMesh,
  createReadyIndicatorMesh,
  createSeedInstancedMesh,
  createSoonIndicatorMesh,
  createSproutInstancedMesh,
  createTileInstancedMesh,
  createWaterIndicatorMesh,
  createWitheredInstancedMesh
} from './Models.js';

export function tileIndex(row, col, cols) {
  return row * cols + col;
}

const TILE_COLORS = {
  grass: 0x86cc5b,
  tilled: 0x6e4529
};

const STAGE_SCALE = {
  seed: 3.0,
  sprout: 1.0,
  growth: 1.0,
  flower: 1.0,
  fruit: 1.0,
  withered: 1.0
};

const STAGE_Y = {
  seed: 0.35,
  sprout: 0.32,
  growth: 0.35,
  flower: 0.35,
  fruit: 0.35,
  withered: 0.35
};

function cropStageToKey(crop) {
  if (crop.isWithered) return 'withered';
  if (crop.stage === STRAWBERRY_STAGE.SEED) return 'seed';
  if (crop.stage === STRAWBERRY_STAGE.SPROUT) return 'sprout';
  if (crop.stage === STRAWBERRY_STAGE.GROWTH) return 'growth';
  if (crop.stage === STRAWBERRY_STAGE.FLOWER) return 'flower';
  return 'fruit';
}

export class FieldRenderer {
  constructor({ THREE, scene, gridSystem, cropSystem }) {
    this.THREE = THREE;
    this.scene = scene;
    this.gridSystem = gridSystem;
    this.cropSystem = cropSystem;

    this.maxCount = GRID_MAX_ROWS * this.gridSystem.cols;

    this.tileMesh = createTileInstancedMesh(THREE, this.maxCount);

    this.stageMeshes = {
      seed: createSeedInstancedMesh(THREE, this.maxCount),
      sprout: createSproutInstancedMesh(THREE, this.maxCount),
      growth: createGrowthInstancedMesh(THREE, this.maxCount),
      flower: createFlowerInstancedMesh(THREE, this.maxCount),
      fruit: createFruitInstancedMesh(THREE, this.maxCount),
      withered: createWitheredInstancedMesh(THREE, this.maxCount)
    };

    this.indicatorMeshes = {
      water: createWaterIndicatorMesh(THREE, this.maxCount),
      soon: createSoonIndicatorMesh(THREE, this.maxCount),
      ready: createReadyIndicatorMesh(THREE, this.maxCount)
    };

    this.scene.add(this.tileMesh);
    for (const mesh of Object.values(this.stageMeshes)) {
      this.scene.add(mesh);
    }
    for (const mesh of Object.values(this.indicatorMeshes)) {
      this.scene.add(mesh);
    }

    this.dummy = new THREE.Object3D();
    this.tileColor = new THREE.Color();
  }

  refreshAll() {
    this.refreshTiles();
    this.refreshCropStages();
    this.refreshTileIndicators();
  }

  refreshTiles() {
    const { rows, cols } = this.gridSystem;
    const activeCount = rows * cols;
    this.tileMesh.count = activeCount;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const index = tileIndex(row, col, cols);
        const tile = this.gridSystem.getTile(row, col);
        const world = this.gridSystem.tileToWorld(row, col);

        this.dummy.position.set(world.x, 0, world.z);
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.scale.set(1, 1, 1);
        this.dummy.updateMatrix();
        this.tileMesh.setMatrixAt(index, this.dummy.matrix);

        this.tileColor.setHex(TILE_COLORS[tile.soilState] ?? TILE_COLORS.grass);
        this.tileMesh.setColorAt(index, this.tileColor);
      }
    }

    this.tileMesh.instanceMatrix.needsUpdate = true;
    if (this.tileMesh.instanceColor) this.tileMesh.instanceColor.needsUpdate = true;
  }

  refreshCropStages() {
    const counts = {
      seed: 0,
      sprout: 0,
      growth: 0,
      flower: 0,
      fruit: 0,
      withered: 0
    };

    const { rows, cols } = this.gridSystem;
    const camera = this.scene.parent ? this.scene.parent.children.find(c => c.isCamera) || window.mainCamera : window.mainCamera;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const crop = this.cropSystem.getCrop(`${row},${col}`);
        if (!crop) continue;

        const key = cropStageToKey(crop);
        const mesh = this.stageMeshes[key];
        const slot = counts[key]++;
        const world = this.gridSystem.tileToWorld(row, col);

        this.dummy.position.set(world.x, STAGE_Y[key], world.z);
        // 原生 3D 模型赋予每次种植不同的随机水平朝向，增加自然度
        const randomYRot = (row * cols + col) * 0.5;
        this.dummy.rotation.set(0, randomYRot, 0);

        this.dummy.scale.setScalar(STAGE_SCALE[key]);
        this.dummy.updateMatrix();
        mesh.setMatrixAt(slot, this.dummy.matrix);
      }
    }

    for (const [key, mesh] of Object.entries(this.stageMeshes)) {
      mesh.count = counts[key];
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  refreshTileIndicators() {
    const counts = {
      water: 0,
      soon: 0,
      ready: 0
    };

    const { rows, cols } = this.gridSystem;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const tile = this.gridSystem.getTile(row, col);
        const crop = this.cropSystem.getCrop(`${row},${col}`);
        if (!crop || crop.isWithered) continue;

        let key = null;
        if (crop.harvestable) key = 'ready';
        else if (crop.stage >= STRAWBERRY_STAGE.FLOWER) key = 'soon';
        else if (!tile.wateredToday) key = 'water';

        if (!key) continue;

        const mesh = this.indicatorMeshes[key];
        const slot = counts[key]++;
        const world = this.gridSystem.tileToWorld(row, col);

        this.dummy.position.set(world.x, 0.92, world.z);
        this.dummy.rotation.set(-Math.PI / 2, 0, 0);
        this.dummy.scale.set(1, 1, 1);
        this.dummy.updateMatrix();
        mesh.setMatrixAt(slot, this.dummy.matrix);
      }
    }

    for (const [key, mesh] of Object.entries(this.indicatorMeshes)) {
      mesh.count = counts[key];
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
}
