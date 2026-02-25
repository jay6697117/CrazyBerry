export class Player {
  constructor({ THREE = null, speed = 4, headless = false } = {}) {
    this.speed = speed;
    this.headless = headless || !THREE;
    this.position = { x: 0, y: 0.8, z: 0 };

    if (this.headless) {
      this.group = null;
      return;
    }

    this.THREE = THREE;
    this.group = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.2, 0.55, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x4d8f7a, flatShading: true })
    );
    body.position.y = 0.55;

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xf7d9b4, flatShading: true })
    );
    head.position.y = 1.08;

    const hat = new THREE.Mesh(
      new THREE.ConeGeometry(0.34, 0.15, 8),
      new THREE.MeshStandardMaterial({ color: 0xd9b356, flatShading: true })
    );
    hat.position.y = 1.23;

    this.group.add(body, head, hat);
    this.group.position.set(this.position.x, this.position.y, this.position.z);
  }

  translate(dx, dz) {
    this.position.x += dx;
    this.position.z += dz;
    if (this.group) {
      this.group.position.x = this.position.x;
      this.group.position.z = this.position.z;
    }
  }

  setPosition(x, y, z) {
    this.position.x = x;
    this.position.y = y;
    this.position.z = z;

    if (this.group) {
      this.group.position.set(x, y, z);
    }
  }

  faceDirection(dx, dz) {
    if (!this.group) return;
    if (Math.abs(dx) < 0.0001 && Math.abs(dz) < 0.0001) return;
    this.group.rotation.y = Math.atan2(dx, dz);
  }

  getPosition() {
    return { ...this.position };
  }
}
