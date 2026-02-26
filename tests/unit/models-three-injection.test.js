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
    }

    translate(x, y, z) {
      this.translateArgs = [x, y, z];
      return this;
    }
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

  return {
    CanvasTexture: FakeCanvasTexture,
    MeshBasicMaterial: FakeMeshBasicMaterial,
    PlaneGeometry: FakePlaneGeometry,
    InstancedMesh: FakeInstancedMesh,
    DynamicDrawUsage: 'dynamic-draw-usage',
    DoubleSide: 'double-side'
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
    assert.equal(mesh.material.config.side, THREE.DoubleSide);
    assert.ok(mesh.material.config.map instanceof THREE.CanvasTexture);
  } finally {
    if (hadDocument) globalThis.document = previousDocument;
    else delete globalThis.document;

    if (hadTHREE) globalThis.THREE = previousTHREE;
    else delete globalThis.THREE;
  }
});
