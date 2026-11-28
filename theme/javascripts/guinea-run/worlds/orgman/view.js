/*
 * What Org-Man looks like: the maze as a Setup screen seen from above, the
 * metadata to eat, the rockets of the deployments, the vegetables, the guinea
 * pig and the admins, each a ghost body under its own face.
 *
 * The walls and the dots are instanced meshes; nothing is allocated while it
 * plays. A face is a disc that always turns to the camera, so it reads at
 * phone size.
 */
import { WALL, DOOR, DIRS } from "./maze.js";
import { SALES_MANAGER } from "./ghosts.js";

// The admins' bodies, in their order (ghosts.js), then the Sales Manager's suit
const BODY_COLORS = [0xe8413b, 0xf28ac0, 0x34c6e0, 0xf5a03a, 0x2b2f3a];
const BLUE = 0x2348d0;
const BLINK = 0xf2f4ff;
const FACE_PX = 160;

export function createView(THREE, ctx, options) {
  const root = new THREE.Group();
  ctx.root.add(root);
  const disposables = [];
  const keep = (thing) => {
    disposables.push(thing);
    return thing;
  };
  const camera = ctx.camera;
  const point = new THREE.Vector3();
  let grid = null;

  /* ---------- The maze ---------- */

  const floorMaterial = keep(new THREE.MeshStandardMaterial({ color: 0x0c1a33, roughness: 0.95 }));
  const wallMaterial = keep(new THREE.MeshStandardMaterial({ color: 0x0176d3, roughness: 0.45, metalness: 0.1, emissive: 0x0176d3, emissiveIntensity: 0.18 }));
  // The top of the walls, lighter: the corridors read as one line, not as tiles
  const topMaterial = keep(new THREE.MeshStandardMaterial({ color: 0x7fc0ff, roughness: 0.6, emissive: 0x7fc0ff, emissiveIntensity: 0.12 }));
  const doorMaterial = keep(new THREE.MeshStandardMaterial({ color: 0xf28ac0, emissive: 0xf28ac0, emissiveIntensity: 0.5 }));
  const wallGeometry = keep(new THREE.BoxGeometry(1, 0.42, 1));
  const dotGeometry = keep(new THREE.SphereGeometry(0.1, 10, 8));
  const dotMaterial = keep(new THREE.MeshStandardMaterial({ color: 0xbfe3ff, emissive: 0x7fc4ff, emissiveIntensity: 0.9, roughness: 0.3 }));
  let floor = null;
  let walls = null;
  let door = null;
  let dots = null;
  // The instance of each dot tile, -1 elsewhere
  let dotIndex = null;
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  const matrix = new THREE.Matrix4();
  const powers = [];

  function tileToWorld(x, y, into) {
    return into.set(x - (grid.w - 1) / 2, 0, y - (grid.h - 1) / 2);
  }

  function clearMaze() {
    for (const mesh of [floor, walls, door, dots]) {
      if (mesh) {
        root.remove(mesh);
        if (mesh.geometry && mesh.geometry.type === "PlaneGeometry") {
          mesh.geometry.dispose();
        }
        if (mesh.isInstancedMesh) {
          mesh.dispose();
        }
      }
    }
    for (const p of powers) {
      root.remove(p.object);
    }
    powers.length = 0;
  }

  /** Builds a maze: its walls in its colour, its dots and its rockets. */
  function buildMaze(newGrid, dotsState) {
    clearMaze();
    grid = newGrid;
    wallMaterial.color.setHex(grid.color);
    wallMaterial.emissive.setHex(grid.color);
    const top = new THREE.Color(grid.color).lerp(new THREE.Color(0xffffff), 0.22);
    topMaterial.color.copy(top);
    topMaterial.emissive.copy(top);
    floor = new THREE.Mesh(new THREE.PlaneGeometry(grid.w + 0.6, grid.h + 0.6), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01;
    floor.receiveShadow = true;
    root.add(floor);
    let wallCount = 0;
    for (let i = 0; i < grid.cells.length; i++) {
      if (grid.cells[i] === WALL) {
        wallCount++;
      }
    }
    // A box's faces: +x, -x, +y (the top), -y, +z, -z
    walls = new THREE.InstancedMesh(wallGeometry, [wallMaterial, wallMaterial, topMaterial, wallMaterial, wallMaterial, wallMaterial], wallCount);
    let w = 0;
    for (let y = 0; y < grid.h; y++) {
      for (let x = 0; x < grid.w; x++) {
        if (grid.cells[y * grid.w + x] !== WALL) {
          continue;
        }
        tileToWorld(x, y, point);
        matrix.makeTranslation(point.x, 0.21, point.z);
        walls.setMatrixAt(w, matrix);
        w++;
      }
    }
    walls.castShadow = true;
    walls.receiveShadow = true;
    walls.instanceMatrix.needsUpdate = true;
    root.add(walls);
    tileToWorld(grid.door.x, grid.door.y, point);
    door = new THREE.Mesh(wallGeometry, doorMaterial);
    door.scale.set(1, 0.25, 0.25);
    door.position.set(point.x, 0.12, point.z);
    root.add(door);
    dotIndex = new Int32Array(grid.w * grid.h).fill(-1);
    dots = new THREE.InstancedMesh(dotGeometry, dotMaterial, Math.max(1, grid.dots.length));
    grid.dots.forEach((tile, k) => {
      dotIndex[tile] = k;
    });
    root.add(dots);
    for (const tile of grid.powers) {
      const object = ctx.models.get("rocket", { height: 0.8, shadows: false }) || fallbackPower();
      tileToWorld(tile % grid.w, Math.floor(tile / grid.w), point);
      object.position.set(point.x, 0.05, point.z);
      root.add(object);
      powers.push({ tile, object });
    }
    redrawDots(dotsState);
  }

  // Without the models pack, a big glowing dot stands for a rocket
  const powerGeometry = keep(new THREE.SphereGeometry(0.28, 14, 10));
  function fallbackPower() {
    const mesh = new THREE.Mesh(powerGeometry, dotMaterial);
    mesh.position.y = 0.28;
    const group = new THREE.Group();
    group.add(mesh);
    return group;
  }

  /** Shows the dots and rockets still in the maze. */
  function redrawDots(state) {
    for (const tile of grid.dots) {
      const k = dotIndex[tile];
      if (state(tile)) {
        tileToWorld(tile % grid.w, Math.floor(tile / grid.w), point);
        matrix.makeTranslation(point.x, 0.18, point.z);
        dots.setMatrixAt(k, matrix);
      } else {
        dots.setMatrixAt(k, hidden);
      }
    }
    dots.instanceMatrix.needsUpdate = true;
    for (const p of powers) {
      p.object.visible = Boolean(state(p.tile));
    }
  }

  function eatDot(tile) {
    const k = dotIndex ? dotIndex[tile] : -1;
    if (k >= 0) {
      dots.setMatrixAt(k, hidden);
      dots.instanceMatrix.needsUpdate = true;
    }
    for (const p of powers) {
      if (p.tile === tile) {
        p.object.visible = false;
      }
    }
  }

  /* ---------- The admins ---------- */

  // A ghost: a dome on a straight body, the hem in waves
  const profile = [];
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * (Math.PI / 2);
    profile.push(new THREE.Vector2(Math.cos(a) * 0.38, 0.5 + Math.sin(a) * 0.38));
  }
  profile.reverse();
  profile.push(new THREE.Vector2(0.38, 0.1), new THREE.Vector2(0.4, 0.02));
  const bodyGeometry = keep(new THREE.LatheGeometry(profile.map((p) => new THREE.Vector2(p.x, p.y)), 20));
  const faceGeometry = keep(new THREE.CircleGeometry(0.37, 32));
  const ringGeometry = keep(new THREE.RingGeometry(0.37, 0.43, 32));
  const eyeGeometry = keep(new THREE.SphereGeometry(0.11, 10, 8));
  const pupilGeometry = keep(new THREE.SphereGeometry(0.055, 8, 6));
  const eyeMaterial = keep(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }));
  const pupilMaterial = keep(new THREE.MeshBasicMaterial({ color: 0x1b3a8c }));
  const admins = [];

  function faceTexture(url) {
    const canvas = document.createElement("canvas");
    canvas.width = FACE_PX;
    canvas.height = FACE_PX;
    const texture = keep(new THREE.CanvasTexture(canvas));
    texture.colorSpace = THREE.SRGBColorSpace;
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      const g = canvas.getContext("2d");
      g.save();
      g.beginPath();
      g.arc(FACE_PX / 2, FACE_PX / 2, FACE_PX / 2, 0, Math.PI * 2);
      g.clip();
      g.drawImage(image, 0, 0, FACE_PX, FACE_PX);
      g.restore();
      texture.needsUpdate = true;
    };
    image.src = url;
    return texture;
  }

  function makeAdmin(id) {
    const group = new THREE.Group();
    const color = BODY_COLORS[id];
    const bodyMaterial = keep(new THREE.MeshStandardMaterial({ color, roughness: 0.5, emissive: color, emissiveIntensity: 0.15 }));
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    // Wider than the face, so the colour of the ghost shows round it from above
    body.scale.set(1.2, 1.15, 1.2);
    body.castShadow = true;
    group.add(body);
    // The face, turned to the camera every frame, ringed in the colour of the body
    const faceMaterial = keep(new THREE.MeshBasicMaterial({ map: faceTexture(id === SALES_MANAGER ? options.salesManagerUrl : options.faceUrl(id)), toneMapped: false }));
    const face = new THREE.Mesh(faceGeometry, faceMaterial);
    const ringMaterial = keep(new THREE.MeshBasicMaterial({ color, toneMapped: false }));
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    const badge = new THREE.Group();
    badge.add(face, ring);
    badge.position.y = 0.98;
    group.add(badge);
    const eyes = new THREE.Group();
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      eye.position.set(side * 0.14, 0.45, 0);
      const pupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
      pupil.position.set(side * 0.14, 0.45, -0.08);
      eyes.add(eye, pupil);
    }
    eyes.visible = false;
    group.add(eyes);
    if (id === SALES_MANAGER) {
      group.scale.setScalar(1.15);
    }
    root.add(group);
    return { id, group, body, bodyMaterial, color, badge, face, faceMaterial, ring, ringMaterial, eyes, bob: id * 1.3 };
  }

  function setAdmins(count) {
    while (admins.length < count) {
      admins.push(makeAdmin(admins.length === 4 ? SALES_MANAGER : admins.length));
    }
    admins.forEach((a, i) => (a.group.visible = i < count));
  }

  /* ---------- The vegetable ---------- */

  let vegetable = null;
  const vegetables = new Map();

  function showVegetable(name) {
    hideVegetable();
    if (!vegetables.has(name)) {
      vegetables.set(name, ctx.models.get(name, { height: 0.75, shadows: false }));
    }
    vegetable = vegetables.get(name);
    if (vegetable) {
      tileToWorld(grid.fruit.x, grid.fruit.y, point);
      vegetable.position.set(point.x, 0.05, point.z);
      root.add(vegetable);
    }
  }

  function hideVegetable() {
    if (vegetable) {
      root.remove(vegetable);
      vegetable = null;
    }
  }

  /* ---------- The camera ---------- */

  const look = { margin: 1 };
  function placeCamera() {
    if (!grid) {
      return;
    }
    const aspect = camera.aspect || 1;
    const portrait = aspect < 1;
    camera.fov = portrait ? 50 : 42;
    const half = (camera.fov * Math.PI) / 360;
    const pitch = portrait ? 1.32 : 1.12;
    // Room for the top bar above and, on a phone, the pads below
    const width = grid.w + 1;
    const depth = grid.h + (portrait ? 5.5 : 2.6);
    const hfov = 2 * Math.atan(Math.tan(half) * aspect);
    const byWidth = width / 2 / Math.tan(hfov / 2);
    const byDepth = (depth / 2) * Math.sin(pitch) / Math.tan(half) + depth * 0.15;
    const distance = Math.max(byWidth, byDepth) * look.margin;
    // A phone shifts the maze a little up, over the pads
    const tz = portrait ? 1.2 : 0.4;
    camera.position.set(0, Math.sin(pitch) * distance, tz + Math.cos(pitch) * distance);
    camera.lookAt(0, 0, tz);
    camera.updateProjectionMatrix();
    ctx.engine.aimSun(0, 0);
  }

  /* ---------- Each frame ---------- */

  const pos = { x: 0, y: 0 };
  let clock = 0;

  function update(dt, sim, flags) {
    clock += dt;
    const faceScale = (camera.aspect || 1) < 1 ? 1.75 : 1.25;
    const s = sim.state;
    // Rockets turn on their spot, and pulse
    const pulse = 1 + Math.sin(clock * 6) * 0.08;
    for (const p of powers) {
      p.object.rotation.y = clock * 1.6;
      p.object.scale.setScalar(pulse);
    }
    if (vegetable) {
      vegetable.rotation.y = clock * 2;
      vegetable.position.y = 0.05 + Math.abs(Math.sin(clock * 4)) * 0.12;
    }
    const blinking = s.blueTime > 0 && s.blueTime < s.settings.blink && Math.floor(clock * 6) % 2 === 0;
    s.admins.forEach((a, i) => {
      const view = admins[i];
      if (!view) {
        return;
      }
      sim.positionOf(a, pos);
      tileToWorld(pos.x, pos.y, point);
      // The house bobs them up and down while they wait
      const bob = a.mode === "house" ? Math.sin(clock * 5 + view.bob) * 0.12 : Math.sin(clock * 8 + view.bob) * 0.03;
      view.group.position.set(point.x, bob, point.z);
      view.group.visible = !flags.hideAdmins;
      const eyesOnly = a.mode === "eyes";
      view.body.visible = !eyesOnly;
      view.badge.visible = !eyesOnly;
      view.eyes.visible = eyesOnly;
      if (eyesOnly) {
        view.eyes.rotation.y = Math.atan2(-DIRS[a.dir].x, -DIRS[a.dir].y);
      }
      const color = a.blue ? (blinking ? BLINK : BLUE) : view.color;
      view.bodyMaterial.color.setHex(color);
      view.bodyMaterial.emissive.setHex(color);
      view.ringMaterial.color.setHex(color);
      // Blue: the face greys under a blue wash, still recognisable
      view.faceMaterial.color.setHex(a.blue ? 0x9fb4ff : 0xffffff);
      view.badge.quaternion.copy(camera.quaternion);
      // A phone draws the maze small: the faces grow past their tile so they still read
      view.badge.scale.setScalar(faceScale);
    });
    placeCamera();
  }

  function worldOf(x, y, into) {
    return tileToWorld(x, y, into);
  }

  return {
    buildMaze,
    redrawDots,
    eatDot,
    setAdmins,
    showVegetable,
    hideVegetable,
    update,
    placeCamera,
    worldOf,
    dispose() {
      clearMaze();
      hideVegetable();
      for (const a of admins) {
        root.remove(a.group);
      }
      ctx.root.remove(root);
      for (const thing of disposables) {
        if (thing && thing.dispose) {
          thing.dispose();
        }
      }
    }
  };
}
