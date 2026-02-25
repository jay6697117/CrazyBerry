import { GRID_MAX_ROWS } from '../utils/Constants.js';
import { createCropInstancedMesh, createTileInstancedMesh } from './Models.js';

export function tileIndex(row, col, cols) {
  return row * cols + col;
}

const TILE_COLORS = {
  grass: 0x7fb65c,
  tilled: 0x7a4f2f
};

const CROP_STAGE_COLORS = {
  1: 0xa09f4f,
  2: 0x6dbb5b,
  3: 0x43a447,
  4: 0xf7f0d4,
  5: 0xc81d3b,
  withered: 0x5a5348
};

export class FieldRenderer {
  constructor({ THREE, scene, gridSystem, cropSystem }) {
    this.THREE = THREE;
    this.scene = scene;
    this.gridSystem = gridSystem;
    this.cropSystem = cropSystem;

    this.maxCount = GRID_MAX_ROWS * this.gridSystem.cols;
    this.tileMesh = createTileInstancedMesh(THREE, this.maxCount);
    this.cropMesh = createCropInstancedMesh(THREE, this.maxCount);

    this.tileMesh.count = this.gridSystem.rows * this.gridSystem.cols;
    this.cropMesh.count = this.gridSystem.rows * this.gridSystem.cols;

    this.scene.add(this.tileMesh, this.cropMesh);

    this.dummy = new THREE.Object3D();
    this.tileColor = new THREE.Color();
    this.cropColor = new THREE.Color();
  }

  refreshAll() {
    const { rows, cols } = this.gridSystem;
    const activeCount = rows * cols;
    this.tileMesh.count = activeCount;
    this.cropMesh.count = activeCount;

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

        const crop = this.cropSystem.getCrop(`${row},${col}`);
        if (!crop) {
          this.dummy.position.set(world.x, -100, world.z);
          this.dummy.scale.set(0.001, 0.001, 0.001);
          this.dummy.updateMatrix();
          this.cropMesh.setMatrixAt(index, this.dummy.matrix);
          continue;
        }

        const stageScale = 0.4 + crop.stage * 0.18;
        this.dummy.position.set(world.x, 0.45, world.z);
        this.dummy.rotation.set(Math.PI, 0, 0);
        this.dummy.scale.set(stageScale, stageScale, stageScale);
        this.dummy.updateMatrix();
        this.cropMesh.setMatrixAt(index, this.dummy.matrix);

        this.cropColor.setHex(crop.isWithered ? CROP_STAGE_COLORS.withered : CROP_STAGE_COLORS[crop.stage]);
        this.cropMesh.setColorAt(index, this.cropColor);
      }
    }

    this.tileMesh.instanceMatrix.needsUpdate = true;
    this.cropMesh.instanceMatrix.needsUpdate = true;
    if (this.tileMesh.instanceColor) this.tileMesh.instanceColor.needsUpdate = true;
    if (this.cropMesh.instanceColor) this.cropMesh.instanceColor.needsUpdate = true;
  }
}
