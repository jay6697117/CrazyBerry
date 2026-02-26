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

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdfa077, flatShading: true }); // 晒黑的皮肤
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x3c5a7a, flatShading: true }); // 蓝色工装裤
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, flatShading: true }); // 白汗衫
    const hatMat = new THREE.MeshStandardMaterial({ color: 0xd4a350, flatShading: true }); // 草帽
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x4a3b2c, flatShading: true }); // 棕色鞋子

    // 为了让脚底更贴近地面 (地形 y=0.125 左右)，将模型整体下移 0.6
    const offsetY = -0.6;

    const shoeGeo = new THREE.BoxGeometry(0.14, 0.1, 0.18);
    const shoeLeft = new THREE.Mesh(shoeGeo, shoeMat);
    shoeLeft.position.set(-0.1, 0.05 + offsetY, 0.02);
    const shoeRight = new THREE.Mesh(shoeGeo, shoeMat);
    shoeRight.position.set(0.1, 0.05 + offsetY, 0.02);

    const pantsGeo = new THREE.BoxGeometry(0.28, 0.3, 0.18);
    const pants = new THREE.Mesh(pantsGeo, pantsMat);
    pants.position.set(0, 0.25 + offsetY, 0);

    const shirtGeo = new THREE.BoxGeometry(0.3, 0.35, 0.2);
    const shirt = new THREE.Mesh(shirtGeo, shirtMat);
    shirt.position.set(0, 0.575 + offsetY, 0);

    const suspenderGeo = new THREE.BoxGeometry(0.06, 0.36, 0.21);
    const suspenderL = new THREE.Mesh(suspenderGeo, pantsMat);
    suspenderL.position.set(-0.08, 0.575 + offsetY, 0);
    const suspenderR = new THREE.Mesh(suspenderGeo, pantsMat);
    suspenderR.position.set(0.08, 0.575 + offsetY, 0);

    const headGeo = new THREE.BoxGeometry(0.28, 0.3, 0.28);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.set(0, 0.9 + offsetY, 0);

    const noseGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.position.set(0, 0.88 + offsetY, 0.15);

    const armGeo = new THREE.BoxGeometry(0.1, 0.3, 0.1);
    const armLeft = new THREE.Mesh(armGeo, skinMat);
    armLeft.position.set(-0.21, 0.6 + offsetY, 0);
    const armRight = new THREE.Mesh(armGeo, skinMat);
    armRight.position.set(0.21, 0.6 + offsetY, 0);

    const hatGroup = new THREE.Group();
    const brimGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.05, 12);
    const brim = new THREE.Mesh(brimGeo, hatMat);
    const topGeo = new THREE.CylinderGeometry(0.16, 0.18, 0.15, 12);
    const cone = new THREE.Mesh(topGeo, hatMat);
    cone.position.y = 0.1;
    hatGroup.add(brim, cone);
    hatGroup.position.set(0, 1.05 + offsetY, 0);
    hatGroup.rotation.x = -0.1; // 稍微后倾

    // 新增手持的铲子模型
    const toolGroup = new THREE.Group();
    const handleGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x8a5b33, roughness: 0.9 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    const bladeGeo = new THREE.BoxGeometry(0.15, 0.2, 0.02);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.8, roughness: 0.3 });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = -0.3;
    toolGroup.add(handle, blade);
    toolGroup.position.set(0.2, 0.6 + offsetY, 0.15); // 放在右手前方
    toolGroup.rotation.x = -Math.PI / 4; // 倾斜拿着
    toolGroup.rotation.z = Math.PI / 12;
    toolGroup.visible = false;
    this.shovelMesh = toolGroup;

    this.group.add(
      shoeLeft, shoeRight,
      pants,
      shirt, suspenderL, suspenderR,
      head, nose,
      armLeft, armRight,
      hatGroup,
      this.shovelMesh
    );

    // 开启阴影
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
