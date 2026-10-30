/*
 * The 3D part every world shares: the renderer, the scene with its Salesforce
 * sky and its light, the camera, the quality tiers, and the loop.
 *
 * Three.js's WebGPU renderer draws it: WebGPU where the browser has it, WebGL 2
 * everywhere else, the same scene either way. On the high tier a soft bloom
 * makes the lights and the bright colours glow.
 *
 * The loop runs at the screen's rate while a world is being played, and at 15
 * frames per second on the map, an intro card or the pause screen, where only
 * the guinea pig turns slowly. A hidden tab draws nothing at all.
 */
import { TIERS, initialTier, createQualityMonitor, reducedMotion } from "./quality.js";

const IDLE_FRAME_MS = 1000 / 15;
const MAX_DT = 0.25;

/** options.forceWebGL: the WebGL 2 backend even where WebGPU exists (tests, comparisons). */
export async function createEngine(THREE, canvas, overlay, onFrame, options) {
  const motion = !reducedMotion();
  let tier = initialTier();
  const settings = () => TIERS[tier];
  const dropListeners = [];

  const renderer = new THREE.WebGPURenderer({
    canvas,
    antialias: settings().antialias,
    powerPreference: "high-performance",
    forceWebGL: Boolean(options && options.forceWebGL)
  });
  await renderer.init();
  const backend = renderer.backend && renderer.backend.isWebGPUBackend ? "webgpu" : "webgl";
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const sky = skyTexture(THREE);
  const horizon = new THREE.Color(0xd9f1ff);
  scene.background = sky;
  scene.fog = new THREE.Fog(horizon, 35, settings().drawDistance);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 260);
  // The bloom is built only for the tier that uses it, and dropped with it
  let post = null;
  async function buildPost() {
    try {
      const { bloom } = await import("../vendor/BloomNode.js");
      // RenderPipeline since r183, PostProcessing before
      const Pipeline = THREE.RenderPipeline || THREE.PostProcessing;
      const pipeline = new Pipeline(renderer);
      const scenePass = (THREE.TSL || THREE).pass(scene, camera);
      const color = scenePass.getTextureNode("output");
      // Only what is brighter than white glows: emissive tiles, coins, highlights.
      // A lower threshold veils the whole pastel scene in haze
      pipeline.outputNode = color.add(bloom(color, 0.45, 0.3, 1.05));
      post = pipeline;
    } catch {
      post = null;
    }
  }
  const hemi = new THREE.HemisphereLight(0xeaf6ff, 0xb3a58c, 1.7);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffeccc, 2.6);
  sun.position.set(4, 10, 6);
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 });
  scene.add(sun);
  scene.add(sun.target);

  const quality = createQualityMonitor(tier, (next) => {
    tier = next;
    applyQuality();
    for (const listener of dropListeners) {
      listener(tier);
    }
  });

  let active = false;
  let last = performance.now();
  let lastRender = 0;
  let time = 0;
  let fps = 0;
  let lastSize = { width: 0, height: 0 };
  let resizeListener = null;

  function applyQuality() {
    const s = settings();
    const wantsBloom = s.bloom && !(options && options.noBloom);
    if (wantsBloom && !post) {
      buildPost();
    } else if (!wantsBloom && post) {
      post.dispose && post.dispose();
      post = null;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, s.pixelRatio));
    renderer.shadowMap.enabled = s.shadows;
    sun.castShadow = s.shadows;
    if (scene.fog) {
      scene.fog.far = s.drawDistance;
    }
    scene.traverse((child) => {
      if (child.material) {
        for (const m of Array.isArray(child.material) ? child.material : [child.material]) {
          m.needsUpdate = true;
        }
      }
    });
    resize(true);
  }

  function resize(force) {
    const width = overlay.clientWidth || window.innerWidth;
    const height = overlay.clientHeight || window.innerHeight;
    if (!force && width === lastSize.width && height === lastSize.height) {
      return;
    }
    const previous = lastSize;
    lastSize = { width, height };
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (resizeListener && previous.width > 0) {
      const turned = width > height !== previous.width > previous.height;
      const big = Math.abs(width * height - previous.width * previous.height) / (previous.width * previous.height) > 0.15;
      if (turned || big) {
        resizeListener();
      }
    }
  }

  function frame(now) {
    if (document.hidden) {
      last = now;
      return;
    }
    if (!active && now - lastRender < IDLE_FRAME_MS) {
      return;
    }
    const elapsedMs = now - last;
    const dt = Math.min(elapsedMs / 1000, MAX_DT);
    last = now;
    lastRender = now;
    time += dt;
    resize(false);
    if (active) {
      quality.frame(dt * 1000);
      // The frame rate the player gets, smoothed, for the pause screen
      if (elapsedMs > 0 && elapsedMs < 250) {
        fps = fps ? fps * 0.95 + (1000 / elapsedMs) * 0.05 : 1000 / elapsedMs;
      }
    }
    onFrame(dt, time);
    if (post) {
      post.render();
    } else {
      renderer.render(scene, camera);
    }
  }

  applyQuality();

  return {
    THREE,
    renderer,
    scene,
    camera,
    sun,
    hemi,
    motion,
    get tier() {
      return tier;
    },
    /** The frames per second while a world is played, smoothed. */
    get fps() {
      return fps;
    },
    get settings() {
      return settings();
    },
    get time() {
      return time;
    },
    get portrait() {
      return camera.aspect < 1;
    },
    /** "webgpu" or "webgl": the backend that draws. */
    backend,
    /** Compiles what the scene holds now, so its first frames do not stutter. */
    warm() {
      const compile = renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve();
      return Promise.race([compile.catch(() => {}), new Promise((resolve) => window.setTimeout(resolve, 4000))]);
    },
    start() {
      last = performance.now();
      renderer.setAnimationLoop(frame);
    },
    /** Full speed while a world is played, 15 frames per second otherwise. */
    setActive(value) {
      if (value && !active) {
        last = performance.now();
        quality.reset();
      }
      active = value;
    },
    onQualityDrop(listener) {
      dropListeners.push(listener);
    },
    /** Called when the phone turns or the window changes a lot: the shell pauses. */
    onBigResize(listener) {
      resizeListener = listener;
    },
    resize,
    /** The sky and fog every world starts from. */
    resetLook() {
      camera.clearViewOffset();
      camera.fov = 60;
      camera.updateProjectionMatrix();
      scene.background = sky;
      scene.fog = new THREE.Fog(horizon, 35, settings().drawDistance);
      hemi.intensity = 1.6;
      sun.intensity = 2.4;
      sun.position.set(4, 10, 6);
      sun.target.position.set(0, 0, -4);
    },
    /** Points the sun at a spot, so its shadows follow the guinea pig. */
    aimSun(x, z) {
      sun.position.set(x + 4, 10, z + 6);
      sun.target.position.set(x, 0, z - 4);
    },
    dispose() {
      renderer.setAnimationLoop(null);
      if (post && post.dispose) {
        post.dispose();
      }
      sky.dispose();
      renderer.dispose();
    }
  };
}

/** The sky behind everything, as a vertical gradient. */
function skyTexture(THREE) {
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  // A sunny day: deep blue up high, a warm glow on the horizon
  gradient.addColorStop(0, "#1689f0");
  gradient.addColorStop(0.4, "#4fc3ff");
  gradient.addColorStop(0.72, "#bdeaff");
  gradient.addColorStop(0.92, "#fff0d4");
  gradient.addColorStop(1, "#ffe3b8");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 4, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
