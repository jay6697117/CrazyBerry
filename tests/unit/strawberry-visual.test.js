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
  }

  class FakeMaterial {
    constructor(config) {
      this.config = config;
    }
  }

  return {
    SphereGeometry: class extends FakeGeometry {
      constructor(...args) {
        super('sphere', ...args);
      }
    },
    ConeGeometry: class extends FakeGeometry {
      constructor(...args) {
        super('cone', ...args);
      }
    },
    CylinderGeometry: class extends FakeGeometry {
      constructor(...args) {
        super('cylinder', ...args);
      }
    },
    Material: FakeMaterial,
    MeshStandardMaterial: class extends FakeMaterial {},
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
  assert.equal(first.geometries[STRAWBERRY_STAGE.SEED], second.geometries[STRAWBERRY_STAGE.SEED]);
  assert.equal(first.materials[STRAWBERRY_STAGE.FRUIT], second.materials[STRAWBERRY_STAGE.FRUIT]);
  assert.notEqual(first.geometries[STRAWBERRY_STAGE.SEED], first.geometries[STRAWBERRY_STAGE.SPROUT]);
});
