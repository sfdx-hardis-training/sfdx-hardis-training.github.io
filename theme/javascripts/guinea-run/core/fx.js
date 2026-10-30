/*
 * Confetti and sparkles: one pool of small quads drawn as a single
 * InstancedMesh, so a burst costs one draw call however many there are.
 *
 *   const fx = createFx(THREE, scene, reduced);
 *   fx.burst(x, y, z, { count: 24, colors: [0xffb400, 0x1b96ff], speed: 4 });
 *   fx.update(dt);   // every frame
 *   fx.dispose();
 */

const POOL = 220;
const HAPPY = [0xffb400, 0x1b96ff, 0x2e844a, 0xe3066a, 0x9050e9, 0xff5d2d, 0x06a59a];
export const SPARK_TINTS = [0xc787c2, 0x7ca263, 0xdf019b];

export function createFx(THREE, scene, reduced) {
  const geometry = new THREE.PlaneGeometry(0.12, 0.07);
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false });
  const mesh = new THREE.InstancedMesh(geometry, material, POOL);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.count = 0;
  scene.add(mesh);
  const parts = [];
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  let next = 0;

  return {
    /** A burst of confetti at a point. */
    burst(x, y, z, options) {
      const o = Object.assign({ count: 20, colors: HAPPY, speed: 4, up: 4, life: 1.1 }, options);
      const count = reduced ? Math.ceil(o.count / 3) : o.count;
      for (let i = 0; i < count; i++) {
        const slot = next;
        next = (next + 1) % POOL;
        const angle = Math.random() * Math.PI * 2;
        const speed = o.speed * (0.4 + Math.random() * 0.6);
        parts[slot] = {
          x,
          y,
          z,
          vx: Math.cos(angle) * speed,
          vy: o.up * (0.5 + Math.random()),
          vz: Math.sin(angle) * speed,
          spin: (Math.random() - 0.5) * 14,
          turn: Math.random() * 6,
          life: o.life * (0.7 + Math.random() * 0.5),
          age: 0
        };
        color.setHex(o.colors[Math.floor(Math.random() * o.colors.length)]);
        mesh.setColorAt(slot, color);
      }
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    },
    update(dt) {
      let highest = 0;
      for (let i = 0; i < POOL; i++) {
        const p = parts[i];
        if (!p) {
          continue;
        }
        p.age += dt;
        if (p.age >= p.life) {
          parts[i] = null;
          dummy.scale.setScalar(0);
        } else {
          p.vy -= 9 * dt;
          p.vx *= 1 - dt * 1.5;
          p.vz *= 1 - dt * 1.5;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          p.turn += p.spin * dt;
          dummy.position.set(p.x, p.y, p.z);
          dummy.rotation.set(p.turn, p.turn * 0.7, 0);
          dummy.scale.setScalar(1 - Math.pow(p.age / p.life, 3));
          highest = i + 1;
        }
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.count = highest;
      mesh.instanceMatrix.needsUpdate = true;
    },
    clear() {
      parts.length = 0;
      mesh.count = 0;
    },
    dispose() {
      scene.remove(mesh);
      geometry.dispose();
      material.dispose();
      mesh.dispose();
    }
  };
}
