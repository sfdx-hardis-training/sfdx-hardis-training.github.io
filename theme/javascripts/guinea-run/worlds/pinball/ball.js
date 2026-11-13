/*
 * The ball of Pipeline Pinball: the guinea pig, rolled up. An agouti coat
 * with a lighter band, the petal ears, the eyes and the pink nose, all on one
 * body that turns as the ball rolls. On the better quality tiers, a few fur
 * shells round it make the coat soft at the edge.
 */

import { BALL_RADIUS } from "./physics.js";

let shared = null;

function sharedParts(THREE) {
  if (shared) {
    shared.users++;
    return shared;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const c = canvas.getContext("2d");
  // Agouti: warm brown with dark tips, a cream band round the middle, flecks
  c.fillStyle = "#9a6a3c";
  c.fillRect(0, 0, 256, 128);
  c.fillStyle = "#f2e2c6";
  c.fillRect(0, 50, 256, 30);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 2600; i++) {
    const y = rnd() * 128;
    const band = y > 50 && y < 80;
    c.fillStyle = band ? (rnd() < 0.5 ? "#e4cfa8" : "#fff6e6") : rnd() < 0.55 ? "#5b3a1e" : "#c8935a";
    c.fillRect(rnd() * 256, y, 1 + rnd() * 2, 2 + rnd() * 4);
  }
  const fur = new THREE.CanvasTexture(canvas);
  fur.colorSpace = THREE.SRGBColorSpace;
  fur.wrapS = THREE.RepeatWrapping;
  shared = {
    users: 1,
    fur,
    sphere: new THREE.SphereGeometry(1, 28, 20),
    coat: new THREE.MeshStandardMaterial({ map: fur, roughness: 0.85 }),
    shell: new THREE.MeshStandardMaterial({ map: fur, roughness: 1, transparent: true, opacity: 0.32, depthWrite: false }),
    ear: new THREE.MeshStandardMaterial({ color: 0xc98a72, roughness: 0.7 }),
    eye: new THREE.MeshStandardMaterial({ color: 0x120a06, roughness: 0.15, metalness: 0.2 }),
    nose: new THREE.MeshStandardMaterial({ color: 0xe79aa0, roughness: 0.6 }),
    dispose() {
      shared.users--;
      if (shared.users > 0) {
        return;
      }
      for (const thing of [shared.fur, shared.sphere, shared.coat, shared.shell, shared.ear, shared.eye, shared.nose]) {
        thing.dispose();
      }
      shared = null;
    }
  };
  return shared;
}

/** One ball: { group (placed by the view), body (turned as it rolls), update(dt), dispose() }. */
export function createBallMesh(THREE, options) {
  const parts = sharedParts(THREE);
  const r = BALL_RADIUS;
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const coat = new THREE.Mesh(parts.sphere, parts.coat);
  coat.scale.setScalar(r);
  coat.castShadow = true;
  body.add(coat);
  const shells = Math.min(3, (options && options.furShells) || 0);
  for (let i = 1; i <= shells; i++) {
    const shell = new THREE.Mesh(parts.sphere, parts.shell);
    shell.scale.setScalar(r * (1 + i * 0.035));
    body.add(shell);
  }
  // The face: the nose on +x of the body, the ears behind the eyes
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(parts.sphere, parts.ear);
    ear.scale.set(r * 0.16, r * 0.26, r * 0.07);
    ear.position.set(r * 0.25, r * 0.78, side * r * 0.5);
    ear.rotation.set(side * 0.5, 0, 0.4);
    body.add(ear);
    const eye = new THREE.Mesh(parts.sphere, parts.eye);
    eye.scale.setScalar(r * 0.11);
    eye.position.set(r * 0.72, r * 0.38, side * r * 0.5);
    body.add(eye);
  }
  const nose = new THREE.Mesh(parts.sphere, parts.nose);
  nose.scale.set(r * 0.1, r * 0.08, r * 0.14);
  nose.position.set(r * 0.98, r * 0.05, 0);
  body.add(nose);
  let disposed = false;
  return {
    group,
    body,
    update() {},
    dispose() {
      if (!disposed) {
        disposed = true;
        parts.dispose();
      }
    }
  };
}
