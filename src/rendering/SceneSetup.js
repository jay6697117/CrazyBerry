const THREE_MODULE_URL = 'https://unpkg.com/three@0.160.0/build/three.module.js';

let threePromise;

export function getRendererPixelRatioCap(devicePixelRatio) {
  return Math.min(devicePixelRatio, 2);
}

export async function loadThreeModule() {
  if (!threePromise) {
    threePromise = import(THREE_MODULE_URL);
  }
  return threePromise;
}

function createFallbackRenderer(canvas) {
  let animationLoop = null;
  let rafId = null;

  const tick = (timeMs) => {
    if (!animationLoop) return;
    animationLoop(timeMs);
    if (typeof window !== 'undefined' && window.requestAnimationFrame) {
      rafId = window.requestAnimationFrame(tick);
    } else {
      rafId = setTimeout(() => tick(performance.now()), 16);
    }
  };

  return {
    domElement: canvas,
    shadowMap: { enabled: false },
    setSize() {},
    setPixelRatio() {},
    render() {},
    setAnimationLoop(callback) {
      animationLoop = callback;

      if (rafId !== null) {
        if (typeof rafId === 'number' && typeof window !== 'undefined' && window.cancelAnimationFrame) {
          window.cancelAnimationFrame(rafId);
        } else {
          clearTimeout(rafId);
        }
        rafId = null;
      }

      if (!animationLoop) return;
      tick(performance.now());
    },
    dispose() {
      if (rafId !== null) {
        if (typeof rafId === 'number' && typeof window !== 'undefined' && window.cancelAnimationFrame) {
          window.cancelAnimationFrame(rafId);
        } else {
          clearTimeout(rafId);
        }
      }
      rafId = null;
      animationLoop = null;
    }
  };
}

export async function createSceneSetup(canvas) {
  const THREE = await loadThreeModule();

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  } catch (error) {
    console.warn('WebGL unavailable, using fallback renderer.', error);
    renderer = createFallbackRenderer(canvas);
  }

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(getRendererPixelRatioCap(window.devicePixelRatio));
  if (renderer.shadowMap) renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa7d48f);

  const camera = new THREE.OrthographicCamera(-12, 12, 8, -8, 0.1, 100);
  camera.position.set(10, 12, 10);
  camera.lookAt(0, 0, 0);

  const ambient = new THREE.AmbientLight(0xffffff, 0.45);
  const sun = new THREE.DirectionalLight(0xfff1cc, 1.0);
  sun.position.set(8, 14, 6);
  scene.add(ambient, sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(42, 42),
    new THREE.MeshStandardMaterial({ color: 0x87be5c })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.12;
  ground.receiveShadow = true;
  scene.add(ground);

  const onResize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(getRendererPixelRatioCap(window.devicePixelRatio));
  };

  window.addEventListener('resize', onResize);

  return {
    THREE,
    renderer,
    scene,
    camera,
    sun,
    dispose() {
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    }
  };
}
