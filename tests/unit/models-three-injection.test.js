import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeedInstancedMesh } from '../../src/rendering/Models.js';

function createFakeThree() {
  class FakeCanvasTexture {
    constructor(canvas) {
      this.canvas = canvas;
      this.premultiplyAlpha = false;
    }
  }

  class FakeMeshBasicMaterial {
    constructor(config) {
      this.config = config;
    }
  }

  class FakePlaneGeometry {
    constructor(width, height) {
      this.width = width;
      this.height = height;
      this.translateArgs = [0, 0, 0];
      this.attributes = {
        position: {
          count: 1, getX: () => 0, getY: () => 0, getZ: () => 0,
          setX: () => {}, setY: () => {}, setZ: () => {}, setXYZ: () => {}
        }
      };
    }

    computeVertexNormals() {}
    computeBoundingBox() {}
    computeBoundingSphere() {}
    rotateX() { return this; }
    rotateY() { return this; }
    rotateZ() { return this; }
    translate(x, y, z) {
      this.translateArgs = [x, y, z];
      return this;
    }
    clone() { return this; }
  }

  class FakeInstancedMesh {
    constructor(geometry, material, maxCount) {
      this.geometry = geometry;
      this.material = material;
      this.maxCount = maxCount;
      this.castShadow = false;
      this.receiveShadow = false;
      this.instanceMatrix = {
        usage: null,
        setUsage: (usage) => {
          this.instanceMatrix.usage = usage;
        }
      };
    }
  }

  class FakeMeshStandardMaterial {
    constructor(config) {
      this.config = config;
    }
  }

  return {
    CanvasTexture: FakeCanvasTexture,
    MeshBasicMaterial: FakeMeshBasicMaterial,
    MeshStandardMaterial: FakeMeshStandardMaterial,
    MeshPhysicalMaterial: class extends FakeMeshStandardMaterial {},
    PlaneGeometry: FakePlaneGeometry,
    CapsuleGeometry: class extends FakePlaneGeometry {},
    CylinderGeometry: class extends FakePlaneGeometry {},
    ShapeGeometry: class extends FakePlaneGeometry {},
    LatheGeometry: class extends FakePlaneGeometry {},
    ConeGeometry: class extends FakePlaneGeometry {},
    Shape: class {
      constructor() {}
      moveTo() {}
      bezierCurveTo() {}
      quadraticCurveTo() {}
    },
    InstancedMesh: FakeInstancedMesh,
    DynamicDrawUsage: 'dynamic-draw-usage',
    DoubleSide: 'double-side',
    BufferGeometryUtils: {
      mergeGeometries: (arr, useGroups) => {
        if (useGroups) return [arr[0] || new FakePlaneGeometry(1, 1), new FakePlaneGeometry(1, 1), new FakePlaneGeometry(1, 1)];
        return arr[0] || new FakePlaneGeometry(1, 1);
      }
    },
    Vector2: class {
      constructor(x, y) { this.x = x; this.y = y; }
    }
  };
}

function createFake2dContext() {
  return {
    clearRect() {},
    beginPath() {},
    arc() {},
    fill() {},
    fillText() {},
    moveTo() {},
    lineTo() {},
    bezierCurveTo() {}
  };
}

test('seed instanced mesh uses injected THREE without global THREE', () => {
  const hadDocument = Object.prototype.hasOwnProperty.call(globalThis, 'document');
  const previousDocument = globalThis.document;
  const hadTHREE = Object.prototype.hasOwnProperty.call(globalThis, 'THREE');
  const previousTHREE = globalThis.THREE;

  globalThis.document = {
    createElement(tag) {
      assert.equal(tag, 'canvas');
      return {
        width: 0,
        height: 0,
        getContext(type) {
          assert.equal(type, '2d');
          return createFake2dContext();
        }
      };
    }
  };

  globalThis.THREE = undefined;

  try {
    const THREE = createFakeThree();
    const mesh = createSeedInstancedMesh(THREE, 8);

    assert.equal(mesh.instanceMatrix.usage, THREE.DynamicDrawUsage);
    assert.ok(mesh.material[0] instanceof THREE.MeshStandardMaterial);
    assert.equal(mesh.material[0].config.color, 0xe2c68f);
  } finally {
    if (hadDocument) globalThis.document = previousDocument;
    else delete globalThis.document;

    if (hadTHREE) globalThis.THREE = previousTHREE;
    else delete globalThis.THREE;
  }
});
