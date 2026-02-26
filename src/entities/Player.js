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

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdfa077, roughness: 0.5, metalness: 0.1 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x3c5a7a, roughness: 0.8, metalness: 0 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.9, metalness: 0 });
    const hatMat = new THREE.MeshStandardMaterial({ color: 0xd4a350, roughness: 0.9, metalness: 0 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x30251c, roughness: 0.7, metalness: 0.2 });

    const offsetY = -0.6;

    const shoeGeo = new THREE.CapsuleGeometry(0.06, 0.08, 16, 16);
    shoeGeo.rotateX(Math.PI / 2);
    const shoeLeft = new THREE.Mesh(shoeGeo, shoeMat);
    shoeLeft.position.set(-0.1, 0.04 + offsetY, 0.03);
    const shoeRight = new THREE.Mesh(shoeGeo, shoeMat);
    shoeRight.position.set(0.1, 0.04 + offsetY, 0.03);

    const legGeo = new THREE.CapsuleGeometry(0.06, 0.18, 16, 16);
    const legLeft = new THREE.Mesh(legGeo, pantsMat);
    legLeft.position.set(-0.08, 0.2 + offsetY, 0);
    const legRight = new THREE.Mesh(legGeo, pantsMat);
    legRight.position.set(0.08, 0.2 + offsetY, 0);

    const bodyGeo = new THREE.CapsuleGeometry(0.15, 0.2, 16, 16);
    const shirt = new THREE.Mesh(bodyGeo, shirtMat);
    shirt.position.set(0, 0.45 + offsetY, 0);

    const pantsTopGeo = new THREE.SphereGeometry(0.155, 32, 16, 0, Math.PI * 2, Math.PI/2, Math.PI/2);
    const pantsTop = new THREE.Mesh(pantsTopGeo, pantsMat);
    pantsTop.position.set(0, 0.45 + offsetY, 0);

    const suspenderGeo = new THREE.TorusGeometry(0.155, 0.015, 8, 16, Math.PI);
    suspenderGeo.rotateY(Math.PI / 2);

    const suspenderL = new THREE.Mesh(suspenderGeo, pantsMat);
    suspenderL.position.set(-0.06, 0.45 + offsetY, 0);

    const suspenderR = new THREE.Mesh(suspenderGeo, pantsMat);
    suspenderR.position.set(0.06, 0.45 + offsetY, 0);

    const headGeo = new THREE.SphereGeometry(0.15, 32, 32);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.set(0, 0.75 + offsetY, 0);

    const noseGeo = new THREE.SphereGeometry(0.03, 16, 16);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.position.set(0, 0.72 + offsetY, 0.14);

    const armGeo = new THREE.CapsuleGeometry(0.045, 0.15, 16, 16);
    const armLeft = new THREE.Mesh(armGeo, skinMat);
    armLeft.position.set(-0.2, 0.45 + offsetY, 0);
    armLeft.rotation.z = Math.PI / 8;

    const armRight = new THREE.Mesh(armGeo, skinMat);
    armRight.position.set(0.2, 0.45 + offsetY, 0);
    armRight.rotation.z = -Math.PI / 8;

    const hatGroup = new THREE.Group();
    const brimGeo = new THREE.TorusGeometry(0.25, 0.015, 16, 32);
    const brimCenterGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.01, 32, 1);

    const bPos = brimGeo.attributes.position;
    for(let i=0; i<bPos.count; i++) {
        const x = bPos.getX(i);
        const y = bPos.getY(i);
        bPos.setY(i, y + Math.cos(x*10) * 0.02);
    }
    brimGeo.rotateX(Math.PI / 2);

    const brim = new THREE.Mesh(brimGeo, hatMat);
    const brimCenter = new THREE.Mesh(brimCenterGeo, hatMat);

    const topGeo = new THREE.SphereGeometry(0.16, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const cone = new THREE.Mesh(topGeo, hatMat);
    cone.scale.y = 0.8;

    hatGroup.add(brim, brimCenter, cone);
    hatGroup.position.set(0, 0.86 + offsetY, 0);
    hatGroup.rotation.x = -0.15;

    const toolGroup = new THREE.Group();
    const handleGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.6, 16);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x8a5b33, roughness: 0.9 });
    const handle = new THREE.Mesh(handleGeo, handleMat);

    const bladeGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.2, 32, 1, false, 0, Math.PI);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.scale.set(1, 1, 0.2);
    blade.position.y = -0.3;
    blade.rotation.y = Math.PI / 2;
    blade.rotation.x = Math.PI / 8;

    toolGroup.add(handle, blade);
    toolGroup.position.set(0.25, 0.45 + offsetY, 0.2);
    toolGroup.rotation.x = -Math.PI / 4;
    toolGroup.rotation.z = Math.PI / 6;
    toolGroup.visible = false;
    this.shovelMesh = toolGroup;

    this.group.add(
      shoeLeft, shoeRight,
      legLeft, legRight,
      shirt, pantsTop, suspenderL, suspenderR,
      head, nose,
      armLeft, armRight,
      hatGroup,
      this.shovelMesh
    );

    this.group.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
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

  setTool(tool) {
    if (this.headless || !this.shovelMesh) return;
    // 当玩家携带铲子等主要动作工具时显示它
    this.shovelMesh.visible = tool === 'shovel' || tool === 'hoe' || tool === 'water';
  }

  getPosition() {
    return { ...this.position };
  }
}
