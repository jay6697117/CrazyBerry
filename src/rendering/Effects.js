export function createParticlePool(size) {
  const free = Array.from({ length: size }, () => ({}));
  const used = new Set();

  return {
    acquire() {
      const item = free.pop() ?? {};
      used.add(item);
      return item;
    },
    release(item) {
      if (!used.has(item)) return;
      used.delete(item);
      free.push(item);
    }
  };
}

function createParticleSlots(size) {
  return Array.from({ length: size }, () => ({
    active: false,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    life: 0,
    maxLife: 0,
    scale: 1
  }));
}

function spawnFromSlots(slots, count, init) {
  let spawned = 0;
  for (let i = 0; i < slots.length && spawned < count; i += 1) {
    if (slots[i].active) continue;
    init(slots[i], spawned);
    slots[i].active = true;
    spawned += 1;
  }
}

export function createNoopEffects() {
  return {
    spawnWaterSplash() {},
    spawnHarvestSparkle() {},
    update() {}
  };
}

export class EffectsSystem {
  constructor({ THREE, scene, poolSize = 96 } = {}) {
    this.THREE = THREE;
    this.scene = scene;
    this.poolSize = poolSize;
    this.dummy = new THREE.Object3D();

    this.waterSlots = createParticleSlots(poolSize);
    this.sparkleSlots = createParticleSlots(poolSize);

    this.waterMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.03, 6, 4),
      new THREE.MeshBasicMaterial({ color: 0x67d2f9, transparent: true, opacity: 0.9 }),
      poolSize
    );

    this.sparkleMesh = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.04, 0),
      new THREE.MeshBasicMaterial({ color: 0xf5d06f, transparent: true, opacity: 0.95 }),
      poolSize
    );

    this.waterMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.sparkleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.waterMesh, this.sparkleMesh);
  }

  spawnWaterSplash(worldX, worldY, worldZ) {
    spawnFromSlots(this.waterSlots, 7, (slot, index) => {
      const spread = (Math.random() - 0.5) * 0.32;
      slot.x = worldX + spread;
      slot.y = worldY + 0.06;
      slot.z = worldZ + (Math.random() - 0.5) * 0.32;
      slot.vx = spread * 0.9;
      slot.vy = 0.72 + Math.random() * 0.25;
      slot.vz = (Math.random() - 0.5) * 0.2;
      slot.life = 0.42 + index * 0.02;
      slot.maxLife = slot.life;
      slot.scale = 0.65 + Math.random() * 0.45;
    });
  }

  spawnHarvestSparkle(worldX, worldY, worldZ) {
    spawnFromSlots(this.sparkleSlots, 10, (slot) => {
      slot.x = worldX + (Math.random() - 0.5) * 0.3;
      slot.y = worldY + 0.18 + Math.random() * 0.2;
      slot.z = worldZ + (Math.random() - 0.5) * 0.3;
      slot.vx = (Math.random() - 0.5) * 0.14;
      slot.vy = 0.32 + Math.random() * 0.25;
      slot.vz = (Math.random() - 0.5) * 0.14;
      slot.life = 0.5 + Math.random() * 0.16;
      slot.maxLife = slot.life;
      slot.scale = 0.8 + Math.random() * 0.6;
    });
  }

  update(deltaSeconds) {
    this.#updateSlots(this.waterSlots, this.waterMesh, deltaSeconds, {
      gravity: 2.8,
      drag: 0.95,
      floorY: 0.02
    });

    this.#updateSlots(this.sparkleSlots, this.sparkleMesh, deltaSeconds, {
      gravity: 1.2,
      drag: 0.98,
      floorY: 0.16
    });
  }

  #updateSlots(slots, mesh, deltaSeconds, config) {
    let activeCount = 0;

    for (let i = 0; i < slots.length; i += 1) {
      const slot = slots[i];
      if (!slot.active) continue;

      slot.life -= deltaSeconds;
      if (slot.life <= 0) {
        slot.active = false;
        continue;
      }

      slot.vy -= config.gravity * deltaSeconds;
      slot.vx *= config.drag;
      slot.vz *= config.drag;

      slot.x += slot.vx * deltaSeconds;
      slot.y += slot.vy * deltaSeconds;
      slot.z += slot.vz * deltaSeconds;

      if (slot.y < config.floorY) {
        slot.y = config.floorY;
        slot.vy *= -0.22;
      }

      const lifeRatio = slot.life / slot.maxLife;
      const scale = Math.max(0.12, slot.scale * lifeRatio);

      this.dummy.position.set(slot.x, slot.y, slot.z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.set(scale, scale, scale);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(activeCount, this.dummy.matrix);
      activeCount += 1;
    }

    mesh.count = activeCount;
    mesh.instanceMatrix.needsUpdate = true;
  }
}
