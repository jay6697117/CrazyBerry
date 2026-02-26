export function computeMoveVector({ input, cameraForward, speed, dt }) {
  const fLen = Math.hypot(cameraForward.x, cameraForward.z) || 1;
  const fx = cameraForward.x / fLen;
  const fz = cameraForward.z / fLen;

  const rx = -fz;
  const rz = fx;

  let x = 0;
  let z = 0;
  if (input.up) {
    x += fx;
    z += fz;
  }
  if (input.down) {
    x -= fx;
    z -= fz;
  }
  if (input.right) {
    x += rx;
    z += rz;
  }
  if (input.left) {
    x -= rx;
    z -= rz;
  }

  const len = Math.hypot(x, z) || 1;
  return {
    x: (x / len) * speed * dt,
    z: (z / len) * speed * dt
  };
}

export class Input {
  constructor(targetWindow = window, targetDocument = document) {
    this.targetWindow = targetWindow;
    this.targetDocument = targetDocument;
    this.movement = {
      up: false,
      down: false,
      left: false,
      right: false
    };
    this.actionQueued = false;
    this.pointer = null;
    this.zoomDelta = 0; // 收集滚轮增量

    this.onKeyDown = (event) => this.#handleKey(event.key, true);
    this.onKeyUp = (event) => this.#handleKey(event.key, false);
    this.onPointerDown = (event) => {
      if (event.button !== 0) return;
      if (event.target instanceof Element) {
        const insideUi = event.target.closest('#toolbar, #shop-modal, #hud, #hint');
        if (insideUi) return;
      }
      this.pointer = { x: event.clientX, y: event.clientY };
    };
    this.onWheel = (event) => {
      if (event.target instanceof Element) {
        const insideUi = event.target.closest('#shop-modal');
        if (insideUi) return;
      }
      this.zoomDelta += event.deltaY;
    };

    this.targetWindow.addEventListener('keydown', this.onKeyDown);
    this.targetWindow.addEventListener('keyup', this.onKeyUp);
    this.targetDocument.addEventListener('pointerdown', this.onPointerDown);
    this.targetDocument.addEventListener('wheel', this.onWheel, { passive: true });
  }

  #handleKey(key, pressed) {
    const lower = key.toLowerCase();
    if (lower === 'w' || key === 'ArrowUp') this.movement.up = pressed;
    if (lower === 's' || key === 'ArrowDown') this.movement.down = pressed;
    if (lower === 'a' || key === 'ArrowLeft') this.movement.left = pressed;
    if (lower === 'd' || key === 'ArrowRight') this.movement.right = pressed;
    if (pressed && (key === ' ' || key === 'Enter')) this.actionQueued = true;
  }

  getMovementState() {
    return this.movement;
  }

  consumeActionKey() {
    const queued = this.actionQueued;
    this.actionQueued = false;
    return queued;
  }

  consumePointer() {
    const value = this.pointer;
    this.pointer = null;
    return value;
  }

  consumeZoomDelta() {
    const delta = this.zoomDelta;
    this.zoomDelta = 0;
    return delta;
  }

  destroy() {
    this.targetWindow.removeEventListener('keydown', this.onKeyDown);
    this.targetWindow.removeEventListener('keyup', this.onKeyUp);
    this.targetDocument.removeEventListener('pointerdown', this.onPointerDown);
    this.targetDocument.removeEventListener('wheel', this.onWheel);
  }
}
