/*
 * The 3D models of Guinea Run: the Salesforce and sfdx-hardis items built by
 * scripts/blender/salesforce-items.py (salesforce: org-cloud, custom-field,
 * permission-set, flow, apex, package-xml, check-pass, cloudity-logo...), and
 * the vegetables of scripts/blender/vegetables.py (bonus pickups), the Data
 * Cloud rabbit of scripts/blender/data-cloud.py (world 8's boss), and
 * the Kenney scenery packs built by scripts/blender/kenney-packs.py (office,
 * platform, nature), loaded
 * once per page and shared by every world that names them.
 *
 * A world declares the packs it needs (export const MODELS = ["office"]); the
 * shell loads them behind the loading card, then the world asks for copies:
 *
 *   const desk = ctx.models.get("desk", { height: 0.75 });
 *   if (desk) { root.add(desk); } else { ...the world's own shape... }
 *
 * get() returns null when the pack could not load, so a world always keeps a
 * way to draw itself. Copies share geometry and materials: they are never
 * disposed by a world, only when the game closes.
 */

const PACKS = ["salesforce", "vegetables", "data-cloud", "office", "platform", "nature"];

export function createModels(THREE, base) {
  const loaded = new Map();
  const nodes = new Map();
  const geometries = new Set();
  let loader = null;

  function loadPack(name) {
    if (!PACKS.includes(name)) {
      return Promise.resolve(null);
    }
    if (!loaded.has(name)) {
      loader =
        loader ||
        import("../vendor/GLTFLoader.js").then(({ GLTFLoader }) => new GLTFLoader());
      loaded.set(
        name,
        loader
          .then((gltf) => gltf.loadAsync(base + "models/" + name + ".glb"))
          .then((gltf) => {
            gltf.scene.traverse((child) => {
              if (child.isMesh) {
                geometries.add(child.geometry);
              }
            });
            for (const node of gltf.scene.children) {
              node.position.set(0, 0, 0);
              node.traverse((child) => {
                if (child.isMesh) {
                  child.castShadow = true;
                  child.receiveShadow = true;
                }
              });
              nodes.set(node.name, node);
            }
            return gltf;
          })
          .catch(() => null)
      );
    }
    return loaded.get(name);
  }

  return {
    /** Loads the packs a world needs; never rejects. */
    load(names) {
      return Promise.all((names || []).map(loadPack));
    },
    /** Is this model available right now? */
    has(name) {
      return nodes.has(name);
    },
    /**
     * A copy of a model, standing on y = 0 and centred on its footprint.
     * options: { height } scales it to that height, { width } to that width,
     * { scale } by a factor; { shadows: false } for small things.
     */
    get(name, options) {
      const node = nodes.get(name);
      if (!node) {
        return null;
      }
      const copy = node.clone(true);
      const o = options || {};
      if (o.height || o.width) {
        const size = new THREE.Box3().setFromObject(node).getSize(new THREE.Vector3());
        const factor = o.height ? o.height / Math.max(size.y, 1e-3) : o.width / Math.max(size.x, 1e-3);
        copy.scale.multiplyScalar(factor);
      } else if (o.scale) {
        copy.scale.multiplyScalar(o.scale);
      }
      if (o.shadows === false) {
        copy.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = false;
          }
        });
      }
      return copy;
    },
    /** How many geometries the loaded packs hold: they stay for the session, on purpose. */
    get geometryCount() {
      return geometries.size;
    },
    /** The names a pack holds, once loaded (for tests and for choosing). */
    names() {
      return Array.from(nodes.keys());
    },
    dispose() {
      for (const promise of loaded.values()) {
        promise.then((gltf) => {
          if (!gltf) {
            return;
          }
          gltf.scene.traverse((child) => {
            if (child.isMesh) {
              child.geometry.dispose();
              for (const m of Array.isArray(child.material) ? child.material : [child.material]) {
                if (m.map) {
                  m.map.dispose();
                }
                m.dispose();
              }
            }
          });
        });
      }
      loaded.clear();
      nodes.clear();
      geometries.clear();
    }
  };
}
