import test from 'node:test';
import assert from 'node:assert/strict';
import { createStageVisualFactory, resolveStageFromGrowthDays, STRAWBERRY_STAGE } from '../../src/entities/Strawberry.js';

function createFakeThree() {
  class FakeGeometry {
    constructor(name, ...args) {
      this.name = name;
      this.args = args;
      this.attributes = {
        position: {
          count: 2,
          getX: () => 0,
          getY: () => 0,
          getZ: () => 0,
          setX: () => {},
          setY: () => {},
          setZ: () => {},
          setXYZ: () => {}
        }
      };
    }
    toNonIndexed() { return this; }
    computeVertexNormals() {}
    computeBoundingBox() {}
    computeBoundingSphere() {}
    rotateX() { return this; }
    rotateY() { return this; }
    rotateZ() { return this; }
    translate() { return this; }
    clone() { return this; }
  }

  class FakeMaterial {
    constructor(config) {
      this.config = config;
    }
  }

  return {
    PlaneGeometry: class extends FakeGeometry {
      constructor(...args) {
        super('plane', ...args);
      }
    },
    ShapeGeometry: class extends FakeGeometry {
      constructor(...args) {
        super('shape', ...args);
      }
    },
    ConeGeometry: class extends FakeGeometry {
      constructor(...args) {
        super('cone', ...args);
      }
    },
    Shape: class {
      constructor(points) { this.points = points; }
      moveTo() {}
      bezierCurveTo() {}
      quadraticCurveTo() {}
    },
    CapsuleGeometry: class extends FakeGeometry {
      constructor(...args) {
        super('capsule', ...args);
      }
    },
    CylinderGeometry: class extends FakeGeometry {
      constructor(...args) {
        super('cylinder', ...args);
      }
    },
    LatheGeometry: class extends FakeGeometry {
      constructor(...args) {
        super('lathe', ...args);
      }
    },
    Vector2: class {
      constructor(x, y) { this.x = x; this.y = y; }
    },
    Vector2: class {
      constructor(x, y) { this.x = x; this.y = y; }
    },
    CanvasTexture: class {
      constructor() {}
    },
    MeshBasicMaterial: class extends FakeMaterial {},
    MeshStandardMaterial: class extends FakeMaterial {},
    MeshPhysicalMaterial: class extends FakeMaterial {},
    BufferGeometryUtils: {
      mergeGeometries: (arr, useGroups) => {
        if (useGroups) return [arr[0] || new FakeGeometry('merged'), new FakeGeometry('merged'), new FakeGeometry('merged')];
        return arr[0] || new FakeGeometry('merged');
      }
    },
    DoubleSide: 'double-side'
  };
}

test('growth days map to deterministic strawberry stages', () => {
  assert.equal(resolveStageFromGrowthDays(0), STRAWBERRY_STAGE.SEED);
  assert.equal(resolveStageFromGrowthDays(1), STRAWBERRY_STAGE.SPROUT);
  assert.equal(resolveStageFromGrowthDays(3), STRAWBERRY_STAGE.GROWTH);
  assert.equal(resolveStageFromGrowthDays(6), STRAWBERRY_STAGE.FLOWER);
  assert.equal(resolveStageFromGrowthDays(8), STRAWBERRY_STAGE.FRUIT);
});

test('stage visual factory reuses geometry and material handles', () => {
  const THREE = createFakeThree();
  const first = createStageVisualFactory(THREE);
  const second = createStageVisualFactory(THREE);

  assert.equal(first, second);
  assert.equal(first[STRAWBERRY_STAGE.SEED].geometry, second[STRAWBERRY_STAGE.SEED].geometry);
  assert.equal(first[STRAWBERRY_STAGE.FRUIT].materials[1], second[STRAWBERRY_STAGE.FRUIT].materials[1]);
  assert.notEqual(first[STRAWBERRY_STAGE.SEED].geometry, first[STRAWBERRY_STAGE.SPROUT].geometry);
});
