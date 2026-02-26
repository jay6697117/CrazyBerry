const THREE_MODULE_URL = 'https://unpkg.com/three@0.160.0/build/three.module.js';
const COMPOSER_URL = 'https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js';
const RENDER_PASS_URL = 'https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/RenderPass.js';
const BLOOM_PASS_URL = 'https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js';

let threePromise;
let composerLoaders;

export function getRendererPixelRatioCap(devicePixelRatio) {
  return Math.min(devicePixelRatio, 2);
}

export async function loadThreeModule() {
  if (!threePromise) {
    threePromise = import('three');
  }
  return threePromise;
}

export async function loadPostProcessing() {
  if (!composerLoaders) {
    composerLoaders = Promise.all([
      import(COMPOSER_URL),
      import(RENDER_PASS_URL),
      import(BLOOM_PASS_URL)
    ]);
  }
  return composerLoaders;
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

  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa7d48f);

  const camera = new THREE.OrthographicCamera(-12, 12, 8, -8, 0.1, 100);
  camera.position.set(10, 12, 10);
  camera.lookAt(0, 0, 0);

  const hemiLight = new THREE.HemisphereLight(0xfff5e6, 0x87be5c, 0.6);
  scene.add(hemiLight);

  const sun = new THREE.DirectionalLight(0xfff1cc, 1.4);
  sun.position.set(15, 20, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 50;
  sun.shadow.camera.left = -15;
  sun.shadow.camera.right = 15;
  sun.shadow.camera.top = 15;
  sun.shadow.camera.bottom = -15;
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(42, 42),
    new THREE.MeshStandardMaterial({ color: 0x87be5c })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.12;
  ground.receiveShadow = true;
  scene.add(ground);

  // Load post processing and construct composer
  let composer = { render: () => renderer.render(scene, camera) }; // Fallback
  try {
    const [ComposerModule, RenderPassModule, UnrealBloomPassModule] = await loadPostProcessing();
    const effectComposer = new ComposerModule.EffectComposer(renderer);

    const renderPass = new RenderPassModule.RenderPass(scene, camera);
    effectComposer.addPass(renderPass);

    // 分辨率, strength, radius, threshold
    const bloomPass = new UnrealBloomPassModule.UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.45, // 强度
      0.8,  // 范围
      0.65  // 阈值 (只让较亮的部分发光)
    );
    effectComposer.addPass(bloomPass);

    composer = effectComposer;

    // 为了向后兼容已有逻辑，覆写一下 renderer 的 render
    const origRender = renderer.render.bind(renderer);
    renderer.render = function() {
      effectComposer.render();
    };
  } catch(e) {
    console.warn("Post-processing load failed, using basic render.", e);
  }

  const onResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    renderer.setPixelRatio(getRendererPixelRatioCap(window.devicePixelRatio));
    if(composer.setSize) composer.setSize(w, h);
  };

  window.addEventListener('resize', onResize);

  return {
    THREE,
    renderer,
    scene,
    camera,
    sun,
    composer,
    dispose() {
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    }
  };
}
