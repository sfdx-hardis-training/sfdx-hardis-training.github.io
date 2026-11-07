/*
 * What Pipeline Pinball looks like: the cabinet, the painted playfield, every
 * wall and toy of layout.js in 3D, the lights the rules switch, the guinea pig
 * rolled into a ball, and the camera at the flipper end that follows the play.
 *
 * Table units are scene units: the table point (x, y) is (x, 0, -y) in the
 * table group, which leans back like a real cabinet. Walls, posts and lights
 * are instanced, one draw per kind; nothing is allocated per frame.
 */
import { TABLE, sy } from "./layout.js";
import { BALL_RADIUS } from "./physics.js";
import { createBallMesh } from "./ball.js";
import { paintField, paintUpper, paintApron, paintSign, paintBumperCap, paintFlow, paintTerminal, shapePoints } from "./art.js";

const LEAN = 0.11;
const WALL_HEIGHT = { wall: 0.5, rubber: 0.4, rail: 0.3, post: 0.45, gate: 0.3, diverter: 0.42, sling: 0.42, upper: 0.45 };
// As on the arcade: brushed stainless guides, chrome posts, black rubbers; the
// mouths of the ramps are their own coloured plastic (RAMP_TINT)
const WALL_LOOK = {
  wall: { color: 0xaeb8c2, metalness: 0.85, roughness: 0.32 },
  upper: { color: 0xaeb8c2, metalness: 0.85, roughness: 0.32 },
  post: { color: 0xe8eef4, metalness: 0.95, roughness: 0.14 },
  gate: { color: 0xe8eef4, metalness: 0.95, roughness: 0.14 },
  rubber: { color: 0x141418, metalness: 0, roughness: 0.75 },
  sling: { color: 0xd8001a, metalness: 0, roughness: 0.55 },
  diverter: { color: 0x2e844a, metalness: 0.2, roughness: 0.35 }
};
const RAMP_TINT = { integration: 0x1b96ff, uat: 0x06a59a, production: 0x45c65a };
const FLASH_DECAY = 6;
// A ball this close to the edge of the screen counts as out of sight (table units)
const SIGHT_MARGIN = 0.8;
// The admins' faces: the raid admins, the author of the monster Flow; faded while a ball is behind one
const FACE_R = 0.7;
const FACE_HEIGHT = 1.25;
const FLOW_FACE_R = 0.6;
const FLOW_FACE_HEIGHT = 1.9;
const FACE_FADED = 0.25;

export function createView(THREE, ctx, table, options) {
  const t = ctx.t;
  const root = ctx.root;
  const engine = ctx.engine;
  const camera = ctx.camera;
  const tier = engine.tier;
  const disposables = [];
  const keep = (thing) => {
    disposables.push(thing);
    return thing;
  };

  const group = new THREE.Group();
  group.rotation.x = LEAN;
  root.add(group);
  const upper = new THREE.Group();
  upper.position.y = TABLE.upperHeight;
  group.add(upper);

  // An arcade at night: what the chrome and the plastics reflect, a dim room,
  // and the table lit by its own lamps (on the better quality tiers)
  const roomTexture = keep(paintRoom(THREE));
  engine.scene.environment = roomTexture;
  engine.hemi.intensity = 0.55;
  engine.sun.intensity = 1.3;
  const lamps = [];
  if (tier >= 1) {
    for (const [x, y, hue] of [
      [-2.2, 4.5, 0xffd8a8],
      [2.2, 4.5, 0xffd8a8],
      [0, 11.5, 0xfff0dd],
      [0, 18.5, 0xffe2c0]
    ]) {
      const lamp = new THREE.PointLight(hue, 5, 9, 1.8);
      lamp.position.set(x, 3.2, -y);
      group.add(lamp);
      lamps.push(lamp);
    }
  }

  const tmp = new THREE.Object3D();
  const color = new THREE.Color();
  const vec = new THREE.Vector3();

  /* ---------- The playfield and the cabinet ---------- */

  const fieldW = TABLE.right - TABLE.left + 0.4;
  const fieldY0 = -1.6;
  const fieldY1 = TABLE.top + 0.3;
  const fieldTexture = keep(paintField(THREE, t, table.lights, tier));
  // The playfield under its clear coat: a little shine, the lamps reflected in it
  const field = new THREE.Mesh(keep(new THREE.PlaneGeometry(fieldW, fieldY1 - fieldY0)), keep(new THREE.MeshStandardMaterial({ map: fieldTexture, roughness: 0.38, metalness: 0.02, envMapIntensity: 0.3 })));
  field.rotation.x = -Math.PI / 2;
  field.position.set((TABLE.left + TABLE.right) / 2, 0, -(fieldY0 + fieldY1) / 2);
  field.receiveShadow = true;
  group.add(field);

  const wood = keep(new THREE.MeshStandardMaterial({ color: 0x101016, roughness: 0.35, metalness: 0.3 }));
  const chrome = keep(new THREE.MeshStandardMaterial({ color: 0xe6edf3, roughness: 0.18, metalness: 0.9 }));
  const cabinetRed = keep(new THREE.MeshStandardMaterial({ color: 0xb3121b, roughness: 0.45, metalness: 0.2 }));
  const box = keep(new THREE.BoxGeometry(1, 1, 1));
  // The cabinet, as on the arcade: black side rails capped with chrome, red sides, a lockdown bar
  const cabinetTop = TABLE.arc.y + 5.4;
  for (const [x0, x1, y0, y1, h, material] of [
    [TABLE.left - 0.75, TABLE.left - 0.1, fieldY0 - 0.6, cabinetTop, 1.0, wood],
    [TABLE.right + 0.08, TABLE.right + 0.7, fieldY0 - 0.6, cabinetTop, 1.0, wood],
    [TABLE.left - 0.75, TABLE.right + 0.7, TABLE.arc.y + 4, cabinetTop, 1.0, wood],
    [TABLE.left - 1.15, TABLE.left - 0.75, fieldY0 - 0.6, cabinetTop, 1.25, cabinetRed],
    [TABLE.right + 0.7, TABLE.right + 1.1, fieldY0 - 0.6, cabinetTop, 1.25, cabinetRed],
    [TABLE.left - 0.75, TABLE.left - 0.45, fieldY0 - 0.6, cabinetTop, 1.06, chrome],
    [TABLE.right + 0.4, TABLE.right + 0.7, fieldY0 - 0.6, cabinetTop, 1.06, chrome]
  ]) {
    const m = new THREE.Mesh(box, material);
    m.scale.set(x1 - x0, h, y1 - y0);
    m.position.set((x0 + x1) / 2, h / 2 - 0.15, -(y0 + y1) / 2);
    m.receiveShadow = true;
    group.add(m);
  }
  const lockdown = new THREE.Mesh(box, chrome);
  lockdown.scale.set(TABLE.right - TABLE.left + 2.2, 0.3, 0.6);
  lockdown.position.set((TABLE.left + TABLE.right) / 2, 0.85, -(fieldY0 - 0.45));
  group.add(lockdown);
  const apronTexture = keep(paintApron(THREE, t));
  apronTexture.center.set(0.5, 0.5);
  const apron = new THREE.Mesh(box, [wood, wood, keep(new THREE.MeshStandardMaterial({ map: apronTexture, roughness: 0.6 })), wood, wood, wood]);
  apron.scale.set(TABLE.laneWall - TABLE.left - 0.1, 0.32, 1.9);
  apron.position.set((TABLE.left + TABLE.laneWall) / 2, 0.16, 0.65);
  group.add(apron);

  /* ---------- Walls, posts, rubbers: a box and two round ends per capsule ---------- */

  const kinds = {};
  for (const w of table.walls) {
    // The walls of a ramp's mouth take the colour of its plastic
    const kind = w.kind === "rail" ? "rail-" + (w.shape.ax < -1 ? "integration" : w.shape.ax > 1 ? "uat" : "production") : w.kind;
    (kinds[kind] = kinds[kind] || []).push(w.shape);
  }
  const cylinder = keep(new THREE.CylinderGeometry(1, 1, 1, 16));
  const wallMeshes = [];
  for (const [kind, shapes] of Object.entries(kinds)) {
    let material;
    if (kind.startsWith("rail-")) {
      const tint = RAMP_TINT[kind.slice(5)];
      material = keep(new THREE.MeshStandardMaterial({ color: tint, emissive: tint, emissiveIntensity: 0.22, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.62, depthWrite: false }));
    } else {
      material = keep(new THREE.MeshStandardMaterial(Object.assign({}, WALL_LOOK[kind] || WALL_LOOK.wall)));
    }
    const h = WALL_HEIGHT[kind.startsWith("rail-") ? "rail" : kind] || 0.5;
    const bodies = new THREE.InstancedMesh(box, material, shapes.length);
    const ends = new THREE.InstancedMesh(cylinder, material, shapes.length * 2);
    shapes.forEach((s, i) => {
      placeWall(bodies, i, s, h);
      placePost(ends, i * 2, s.ax, s.ay, s.r, h, s.floor);
      placePost(ends, i * 2 + 1, s.bx, s.by, s.rb, h, s.floor);
    });
    for (const m of [bodies, ends]) {
      m.castShadow = tier > 0;
      m.receiveShadow = true;
      m.instanceMatrix.needsUpdate = true;
      group.add(m);
    }
    wallMeshes.push({ kind, shapes, bodies, ends, h });
  }

  function floorY(floor) {
    return floor === 1 ? TABLE.upperHeight : 0;
  }

  // Black rubber rings round every post and lane guide end
  const ringSpots = [];
  for (const w of table.walls) {
    const s = w.shape;
    if (w.kind === "post") {
      ringSpots.push([s.ax, s.ay, s.r, s.floor], [s.bx, s.by, s.rb, s.floor]);
    } else if (w.kind === "rubber" && s.ax === s.bx && s.ay === s.by) {
      ringSpots.push([s.ax, s.ay, s.r, s.floor]);
    }
  }
  if (ringSpots.length) {
    const rings = new THREE.InstancedMesh(keep(new THREE.TorusGeometry(1, 0.32, 8, 20)), keep(new THREE.MeshStandardMaterial({ color: 0x141418, roughness: 0.8 })), ringSpots.length);
    ringSpots.forEach(([x, y, r, floor], i) => {
      tmp.position.set(x, floorY(floor) + 0.28, -y);
      tmp.rotation.set(Math.PI / 2, 0, 0);
      tmp.scale.setScalar(r + 0.08);
      tmp.updateMatrix();
      rings.setMatrixAt(i, tmp.matrix);
    });
    rings.instanceMatrix.needsUpdate = true;
    group.add(rings);
  }

  function placeWall(mesh, i, s, h) {
    const dx = s.bx - s.ax;
    const dy = s.by - s.ay;
    const len = Math.hypot(dx, dy);
    tmp.position.set((s.ax + s.bx) / 2, floorY(s.floor) + h / 2, -(s.ay + s.by) / 2);
    tmp.rotation.set(0, Math.atan2(dy, dx), 0);
    tmp.scale.set(Math.max(0.001, len), h, (s.r + s.rb));
    tmp.updateMatrix();
    mesh.setMatrixAt(i, tmp.matrix);
  }

  function placePost(mesh, i, x, y, r, h, floor) {
    tmp.position.set(x, floorY(floor) + h / 2, -y);
    tmp.rotation.set(0, 0, 0);
    tmp.scale.set(r, h, r);
    tmp.updateMatrix();
    mesh.setMatrixAt(i, tmp.matrix);
  }

  // The production gate drops into the table when production opens
  const gateEntry = wallMeshes.find((w) => w.kind === "diverter");

  /* ---------- The slingshots' plastics ---------- */

  // Printed plastics over the slingshots, as on the arcade: colour, a white edge, a gloss
  const slingTexture = keep(paintPlastic(THREE));
  const slingMaterial = keep(new THREE.MeshStandardMaterial({ map: slingTexture, roughness: 0.12, metalness: 0.05, transparent: true, opacity: 0.93 }));
  const slingFlash = [];
  for (const side of [-1, 1]) {
    const shape = new THREE.Shape();
    const [a, b, c] = TABLE.sling;
    shape.moveTo(side * -a[0], a[1]);
    shape.lineTo(side * -b[0], b[1]);
    shape.lineTo(side * -c[0], c[1]);
    shape.closePath();
    const geometry = keep(new THREE.ExtrudeGeometry(shape, { depth: 0.46, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.03, bevelSegments: 2 }));
    // The print maps across the triangle, from its top corner
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, (Math.abs(uv.getX(i)) - 1.75) / 1.4, (uv.getY(i) - 3.45) / 2.55);
    }
    const material = slingMaterial.clone();
    keep(material);
    const mesh = new THREE.Mesh(geometry, material);
    // Shape y is table y: laid flat, it lands on -z and the depth goes up
    mesh.rotation.x = -Math.PI / 2;
    group.add(mesh);
    slingFlash.push({ material, flash: 0 });
  }

  /* ---------- Pop bumpers: Apex triggers ---------- */

  const capColors = [0xea001e, 0xffb020, 0x1b96ff];
  const bumperBody = keep(new THREE.MeshStandardMaterial({ color: 0xf3f6fa, roughness: 0.3 }));
  const bumpers = table.parts.bumpers.map((b, index) => {
    const capTexture = keep(paintBumperCap(THREE, capColors[index % capColors.length]));
    const g = new THREE.Group();
    const base = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.58, 0.62, 0.42, 24)), bumperBody);
    base.position.y = 0.21;
    base.castShadow = tier > 0;
    const capMaterial = keep(new THREE.MeshStandardMaterial({ map: capTexture, emissive: capColors[index % capColors.length], emissiveIntensity: 0.15, roughness: 0.25 }));
    const cap = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.66, 0.66, 0.14, 24)), capMaterial);
    cap.position.y = 0.5;
    const ring = new THREE.Mesh(keep(new THREE.TorusGeometry(0.6, 0.05, 6, 24)), chrome);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.32;
    g.add(base, cap, ring);
    g.position.set(b.ax, 0, -b.ay);
    // The side bumpers are smaller
    g.scale.setScalar(b.r / 0.6);
    group.add(g);
    return { group: g, cap, capMaterial, flash: 0 };
  });

  /* ---------- Flippers ---------- */

  // Arcade flippers: a glossy white bat over a red rubber band all round it,
  // and a chrome cap on the pivot
  const flipperMaterial = keep(new THREE.MeshStandardMaterial({ color: 0xfbfbf7, roughness: 0.18, metalness: 0.05 }));
  const flipperRubber = keep(new THREE.MeshStandardMaterial({ color: 0xd8001a, roughness: 0.55 }));
  const flipperStripe = keep(new THREE.MeshStandardMaterial({ color: 0xffb020, roughness: 0.3, emissive: 0xffb020, emissiveIntensity: 0.15 }));
  const capGeometry = keep(new THREE.CylinderGeometry(1, 1, 1, 20));
  const flippers = Object.values(table.parts.flippers).map((f) => {
    const s = f.shape;
    const g = new THREE.Group();
    const rubber = new THREE.Mesh(keep(flipperGeometry(THREE, f.length, s.r + 0.06, s.rb + 0.06, 0.2)), flipperRubber);
    rubber.position.y = 0.04;
    const body = new THREE.Mesh(keep(flipperGeometry(THREE, f.length, s.r, s.rb, 0.3)), flipperMaterial);
    body.position.y = 0.04;
    body.castShadow = tier > 0;
    // A thin coloured stripe along the top, as on the old bats
    const stripe = new THREE.Mesh(keep(flipperGeometry(THREE, f.length * 0.82, s.r * 0.32, s.rb * 0.32, 0.02)), flipperStripe);
    stripe.position.set(f.length * 0.06, 0.38, 0);
    const cap = new THREE.Mesh(capGeometry, chrome);
    cap.scale.set(s.r * 0.55, 0.1, s.r * 0.55);
    cap.position.y = 0.4;
    g.add(rubber, body, stripe, cap);
    g.position.set(s.pivotX, floorY(s.floor) + 0.02, -s.pivotY);
    group.add(g);
    return { f, group: g };
  });

  /* ---------- Targets ---------- */

  const dropMaterial = keep(new THREE.MeshStandardMaterial({ color: 0x0176d3, roughness: 0.4, emissive: 0x0176d3, emissiveIntensity: 0.2 }));
  const drops = table.parts.drops.map((d) => {
    const m = new THREE.Mesh(box, dropMaterial);
    m.scale.set(0.22, 0.5, 0.42);
    m.position.set(d.ax, 0.25, -(d.ay + d.by) / 2);
    m.castShadow = tier > 0;
    group.add(m);
    return { mesh: m, sink: 0 };
  });
  const checkMaterial = keep(new THREE.MeshStandardMaterial({ color: 0x2e844a, roughness: 0.4, emissive: 0x2e844a, emissiveIntensity: 0.25 }));
  for (const c of table.parts.standups.concat(table.parts.upperTargets)) {
    const m = new THREE.Mesh(box, checkMaterial);
    m.scale.set(0.2, 0.46, 0.5);
    m.position.set(c.ax, floorY(c.floor) + 0.23, -(c.ay + c.by) / 2);
    group.add(m);
  }

  // The Backups lane: three round targets on the left wall
  const backupMaterial = keep(new THREE.MeshStandardMaterial({ color: 0x06a59a, roughness: 0.35, emissive: 0x06a59a, emissiveIntensity: 0.3 }));
  for (const b of table.parts.backups) {
    const m = new THREE.Mesh(box, backupMaterial);
    m.scale.set(0.18, 0.42, 0.52);
    m.position.set(b.ax + 0.05, 0.21, -(b.ay + b.by) / 2);
    group.add(m);
  }

  // Code quality: three round targets on the right wall, that sink in when hit
  const qualityFace = keep(new THREE.CylinderGeometry(0.26, 0.26, 0.12, 20));
  const quality = table.parts.quality.map((q) => {
    const material = keep(new THREE.MeshStandardMaterial({ color: 0xffb020, roughness: 0.3, emissive: 0xffb020, emissiveIntensity: 0.2 }));
    const m = new THREE.Mesh(qualityFace, material);
    m.rotation.z = Math.PI / 2;
    m.position.set(q.ax - 0.02, 0.26, -(q.ay + q.by) / 2);
    group.add(m);
    return { mesh: m, material, base: q.ax - 0.02, push: 0 };
  });

  // The monster Flow: a disc that spins in the playfield, until it is refactored into Apex
  /**
   * A round portrait in a white ring, as on the cards. Drawn into a canvas
   * first, as the other worlds do: an SVG handed straight to a texture draws
   * nothing in WebGPU (it has no size of its own). White until it loads.
   */
  function faceMaterial(url) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const c = canvas.getContext("2d");
    c.fillStyle = "#ffffff";
    c.beginPath();
    c.arc(128, 128, 126, 0, Math.PI * 2);
    c.fill();
    const texture = keep(new THREE.CanvasTexture(canvas));
    texture.colorSpace = THREE.SRGBColorSpace;
    // Transparent so that it fades when a ball rolls behind it (fadeFace)
    const material = keep(new THREE.MeshBasicMaterial({ map: texture, alphaTest: 0.5, toneMapped: false, transparent: true }));
    if (url) {
      const portrait = new Image();
      portrait.decoding = "async";
      portrait.onload = () => {
        c.save();
        c.beginPath();
        c.arc(128, 128, 114, 0, Math.PI * 2);
        c.clip();
        c.drawImage(portrait, 14, 14, 228, 228);
        c.restore();
        texture.needsUpdate = true;
      };
      // A portrait that does not load keeps the white disc
      portrait.onerror = () => {};
      portrait.src = url;
    }
    return material;
  }

  const flowTextures = { spin: keep(paintFlow(THREE, false)), apex: keep(paintFlow(THREE, true)) };
  const flowMaterial = keep(new THREE.MeshStandardMaterial({ map: flowTextures.spin, roughness: 0.3, emissive: 0xfe9339, emissiveIntensity: 0.25 }));
  const flowDisc = new THREE.Mesh(keep(new THREE.CylinderGeometry(TABLE.flow.r, TABLE.flow.r, 0.03, 40)), flowMaterial);
  flowDisc.position.set(TABLE.flow.x, 0.02, -TABLE.flow.y);
  group.add(flowDisc);
  let flowFlash = 0;
  // The admin who built the monster Flow, over it until it is refactored into Apex
  const flowFace = new THREE.Group();
  const flowFaceMaterial = faceMaterial(options.flowFaceUrl);
  // On a post, high enough to stand clear of the Flow's own picture
  const flowFacePost = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 8)), keep(new THREE.MeshStandardMaterial({ color: 0x032d60, roughness: 0.5 })));
  flowFacePost.position.y = 0.8;
  const flowFaceDisc = new THREE.Mesh(keep(new THREE.CircleGeometry(FLOW_FACE_R, 32)), flowFaceMaterial);
  flowFaceDisc.position.y = FLOW_FACE_HEIGHT;
  flowFace.add(flowFacePost, flowFaceDisc);
  flowFace.position.set(TABLE.flow.x, 0, -TABLE.flow.y);
  group.add(flowFace);
  let flowFaceSink = 0;
  // The sf hardis terminal: a small screen behind its saucer
  const terminalScreen = new THREE.Mesh(keep(new THREE.PlaneGeometry(1.0, 0.62)), keep(new THREE.MeshBasicMaterial({ map: keep(paintTerminal(THREE)), toneMapped: false })));
  terminalScreen.position.set(TABLE.terminal.x, 0.75, -(TABLE.terminal.y + 0.75));
  terminalScreen.rotation.x = -0.35;
  group.add(terminalScreen);
  let terminalFlash = 0;
  // Validate: a green target
  const validateShape = table.parts.validate;
  const validateMaterial = keep(new THREE.MeshStandardMaterial({ color: 0x2e844a, roughness: 0.35, emissive: 0x45c65a, emissiveIntensity: 0.3 }));
  const validateMesh = new THREE.Mesh(box, validateMaterial);
  validateMesh.scale.set(Math.hypot(validateShape.bx - validateShape.ax, validateShape.by - validateShape.ay) + 0.2, 0.42, 0.18);
  validateMesh.position.set((validateShape.ax + validateShape.bx) / 2, 0.21, -(validateShape.ay + validateShape.by) / 2);
  validateMesh.rotation.y = Math.atan2(validateShape.by - validateShape.ay, validateShape.bx - validateShape.ax);
  group.add(validateMesh);
  let validateFlash = 0;

  /* ---------- The admins who rise, with their faces ---------- */

  // Bigger than the admin's post (0.44, what the ball hits): a face read on a phone
  const disc = keep(new THREE.CircleGeometry(FACE_R, 32));
  const admins = table.parts.admins.map((a, i) => {
    const g = new THREE.Group();
    const post = new THREE.Mesh(cylinder, keep(new THREE.MeshStandardMaterial({ color: 0x032d60, roughness: 0.5 })));
    post.scale.set(0.42, 0.5, 0.42);
    post.position.y = 0.25;
    const face = new THREE.Mesh(disc, faceMaterial(options.faceUrl(i)));
    face.position.y = FACE_HEIGHT;
    g.add(post, face);
    g.position.set(a.ax, -1.2, -a.ay);
    g.visible = false;
    group.add(g);
    return { group: g, face, rise: 0, up: false };
  });

  /* ---------- Scoop, release hole, spinner, plunger ---------- */

  const holeMaterial = keep(new THREE.MeshBasicMaterial({ color: 0x050a14 }));
  for (const [x, y, floor] of [
    [TABLE.scoop.x, TABLE.scoop.y, 0],
    [TABLE.release.x, TABLE.release.y, 1],
    [TABLE.hotfix.x, TABLE.hotfix.y, 0],
    [TABLE.terminal.x, TABLE.terminal.y, 0]
  ]) {
    const h = new THREE.Mesh(keep(new THREE.CircleGeometry(0.42, 24)), holeMaterial);
    h.rotation.x = -Math.PI / 2;
    h.position.set(x, floorY(floor) + 0.012, -y);
    group.add(h);
    const rim = new THREE.Mesh(keep(new THREE.TorusGeometry(0.44, 0.05, 6, 24)), keep(new THREE.MeshStandardMaterial({ color: 0xfe9339, emissive: 0xfe9339, emissiveIntensity: 0.4 })));
    rim.rotation.x = Math.PI / 2;
    rim.position.set(x, floorY(floor) + 0.03, -y);
    group.add(rim);
  }
  const spinner = new THREE.Mesh(box, chrome);
  spinner.scale.set(1.0, 0.42, 0.03);
  spinner.position.set(-4.47, 0.42, -sy(11.2));
  group.add(spinner);
  let spinLeft = 0;
  const plunger = new THREE.Group();
  const rod = new THREE.Mesh(cylinder, chrome);
  rod.scale.set(0.08, 1.4, 0.08);
  rod.rotation.x = Math.PI / 2;
  rod.position.set(0, 0.3, 0.7);
  const knob = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.4, 0.4, 0.14, 18)), keep(new THREE.MeshStandardMaterial({ color: 0xea001e, roughness: 0.4 })));
  knob.rotation.x = Math.PI / 2;
  knob.position.set(0, 0.3, 0);
  plunger.add(rod, knob);
  plunger.position.set(TABLE.plunger.x, 0, -TABLE.plunger.y + 0.1);
  group.add(plunger);

  /* ---------- Ramps and wires ---------- */

  const rampMaterial = keep(new THREE.MeshStandardMaterial({ color: 0xcfe6ff, roughness: 0.2, metalness: 0.75 }));
  const plastic = { integration: 0x1b96ff, uat: 0x06a59a, production: 0x45c65a };
  for (const [name, p] of Object.entries(table.parts.paths)) {
    const pts = [];
    for (let i = 0; i < p.points.length; i += 3) {
      pts.push(new THREE.Vector3(p.points[i], p.points[i + 2] + BALL_RADIUS, -p.points[i + 1]));
    }
    const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    // A ramp that climbs is plastic up to its crest (all the way for the
    // production ramp, which lands on the Production floor); what comes down
    // after it is a wire rail
    let crest = 0;
    if (plastic[name]) {
      let top = -1;
      for (let i = 0; i < p.points.length / 3; i++) {
        if (p.points[i * 3 + 2] > top + 1e-6) {
          top = p.points[i * 3 + 2];
          crest = p.lengths[i] / p.total;
        }
      }
      crest = name === "production" ? 1 : Math.min(1, crest + 0.06);
      const ramp = new THREE.Mesh(keep(rampGeometry(THREE, curve, 0, crest, Math.max(20, Math.round(p.total * crest * 5)))), keep(new THREE.MeshStandardMaterial({ color: plastic[name], emissive: plastic[name], emissiveIntensity: 0.22, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.62, side: THREE.DoubleSide, depthWrite: false })));
      ramp.renderOrder = 2;
      group.add(ramp);
    }
    if (crest < 1) {
      const segments = Math.max(24, Math.round(p.total * (1 - crest) * 4));
      // Two side rails at the ball's sides, one under it
      // A habitrail: two thin rails at the ball's sides
      for (const [side, drop] of [
        [-(BALL_RADIUS + 0.06), -0.05],
        [BALL_RADIUS + 0.06, -0.05]
      ]) {
        const offset = [];
        for (let i = 0; i <= segments; i++) {
          const u = crest + ((1 - crest) * i) / segments;
          const at = curve.getPointAt(u);
          const tangent = curve.getTangentAt(u);
          const sideV = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
          offset.push(at.clone().addScaledVector(sideV, side).add(new THREE.Vector3(0, drop, 0)));
        }
        const rail = new THREE.Mesh(keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(offset), segments, 0.028, 5, false)), rampMaterial);
        rail.castShadow = tier > 1;
        group.add(rail);
      }
    }
    if (plastic[name]) {
      // A printed flag standing on the ramp at its crest, out of the way of the mouth
      const flagTexture = keep(paintSign(THREE, t(name === "integration" ? "pbFieldIntegration" : name === "uat" ? "pbFieldUat" : "pbFieldProduction"), plastic[name]));
      const flag = new THREE.Mesh(keep(new THREE.PlaneGeometry(1.35, 1.7)), keep(new THREE.MeshStandardMaterial({ map: flagTexture, transparent: true, roughness: 0.3, emissive: plastic[name], emissiveIntensity: 0.25, side: THREE.DoubleSide })));
      const crestAt = curve.getPointAt(Math.max(0, crest - 0.08));
      flag.scale.setScalar(0.8);
      flag.position.set(crestAt.x, crestAt.y + 0.9, crestAt.z);
      flag.rotation.x = -0.35;
      group.add(flag);
    }
  }

  /* ---------- The Production floor ---------- */

  const upperTexture = keep(paintUpper(THREE, t, table.lights, tier));
  const upperW = TABLE.upperRight - TABLE.upperLeft + 0.6;
  const upperL = TABLE.upperTop - TABLE.upperBottom;
  const deck = new THREE.Mesh(box, [wood, wood, keep(new THREE.MeshStandardMaterial({ map: upperTexture, roughness: 0.5 })), wood, wood, wood]);
  deck.scale.set(upperW, 0.18, upperL);
  deck.position.set(0, -0.09, -(TABLE.upperBottom + TABLE.upperTop) / 2);
  deck.receiveShadow = true;
  upper.add(deck);
  for (const [x, y] of [
    [TABLE.upperLeft, TABLE.upperBottom + 0.3],
    [TABLE.upperRight, TABLE.upperBottom + 0.3]
  ]) {
    const leg = new THREE.Mesh(cylinder, chrome);
    leg.scale.set(0.12, TABLE.upperHeight, 0.12);
    leg.position.set(x, -TABLE.upperHeight / 2, -y);
    upper.add(leg);
  }
  // The Data Cloud rabbit, and the Sales Manager in front of the Release hole
  const rabbitShape = table.parts.rabbit;
  const rabbit = new THREE.Group();
  const rabbitModel = ctx.models.get("data-cloud", { height: 1.7 });
  if (rabbitModel) {
    rabbit.add(rabbitModel);
  } else {
    const blob = new THREE.Mesh(keep(new THREE.SphereGeometry(0.7, 16, 12)), keep(new THREE.MeshStandardMaterial({ color: 0x1b96ff })));
    blob.position.y = 0.7;
    rabbit.add(blob);
  }
  rabbit.position.set(0, TABLE.upperHeight, -rabbitShape.ay);
  group.add(rabbit);
  let rabbitHop = 0;
  const smShape = table.parts.salesManager;
  const salesManager = new THREE.Group();
  const smMaterial = faceMaterial(options.salesManagerUrl);
  const smPost = new THREE.Mesh(cylinder, keep(new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.5 })));
  smPost.scale.set(0.42, 0.6, 0.42);
  smPost.position.y = 0.3;
  const smFace = new THREE.Mesh(keep(new THREE.CircleGeometry(0.55, 28)), smMaterial);
  smFace.position.y = 1.15;
  smFace.rotation.x = -0.3;
  salesManager.add(smPost, smFace);
  salesManager.position.set(smShape.ax, TABLE.upperHeight, -smShape.ay);
  group.add(salesManager);
  let smShake = 0;

  /* ---------- Toys and dome lights ---------- */

  const toys = [];
  // The Salesforce rocket and the org cloud stand at the back of the Production floor
  const rocket = ctx.models.get("rocket", { height: 2.8 });
  if (rocket) {
    rocket.position.set(2.75, TABLE.upperHeight, -(TABLE.upperTop - 1.2));
    rocket.rotation.y = -0.5;
    group.add(rocket);
    toys.push({ object: rocket, spin: 0, bob: 0.05, base: rocket.position.y });
  }
  const cloud = ctx.models.get("org-cloud", { width: 2.4 });
  if (cloud) {
    cloud.position.set(-2.6, TABLE.upperHeight + 0.9, -(TABLE.upperTop - 1.0));
    group.add(cloud);
    toys.push({ object: cloud, spin: 0, bob: 0.15, base: cloud.position.y });
  }
  // Vegetables float over the orbits, as the asteroids of the arcade tables do
  for (const [name, x, y, h] of [
    ["carrot", -4.5, sy(16.2), 1.7],
    ["bell-pepper", 4.55, sy(15.6), 1.8]
  ]) {
    const veg = ctx.models.get(name, { height: 1.0 });
    if (veg) {
      veg.position.set(x, h, -y);
      group.add(veg);
      toys.push({ object: veg, spin: 0.6, bob: 0.12, base: h });
    }
  }
  // Dome lights on the side rails and over the slingshots
  const domeGeometry = keep(new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2));
  const domes = [
    [TABLE.left - 0.42, sy(17.2), 1.05, 0xea001e],
    [TABLE.right + 0.4, sy(17.2), 1.05, 0xffb020],
    [TABLE.left - 0.42, 9.0, 1.05, 0x1b96ff],
    [TABLE.right + 0.4, 9.0, 1.05, 0xea001e],
    [-3.1, 5.9, 0.48, 0xffb020],
    [3.1, 5.9, 0.48, 0x1b96ff]
  ].map(([x, y, h, hue], i) => {
    const material = keep(new THREE.MeshStandardMaterial({ color: hue, emissive: hue, emissiveIntensity: 0.3, roughness: 0.15, transparent: true, opacity: 0.9 }));
    const dome = new THREE.Mesh(domeGeometry, material);
    dome.scale.setScalar(h > 1 ? 0.28 : 0.2);
    dome.position.set(x, h, -y);
    group.add(dome);
    return { material, phase: i * 1.3 };
  });

  /* ---------- Lights ---------- */

  const lightMeshes = {};
  const lightGeometry = {};
  for (const shape of ["round", "delta", "hex", "star", "chevron", "bulb"]) {
    lightGeometry[shape] = keep(insertGeometry(THREE, shape));
  }
  // An insert adds its light to the print under it: dark, the print shows; lit, it glows
  const lightMaterial = keep(new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  const bulbMaterial = keep(new THREE.MeshBasicMaterial({ toneMapped: false }));
  for (const shape of Object.keys(lightGeometry)) {
    const list = table.lights.map((l, i) => ({ l, i })).filter((x) => x.l.shape === shape);
    if (!list.length) {
      continue;
    }
    const mesh = new THREE.InstancedMesh(lightGeometry[shape], shape === "bulb" ? bulbMaterial : lightMaterial, list.length);
    list.forEach(({ l }, k) => {
      tmp.position.set(l.x, floorY(l.floor) + 0.015, -l.y);
      tmp.rotation.set(-Math.PI / 2, 0, -l.angle);
      tmp.scale.setScalar(l.size);
      tmp.updateMatrix();
      mesh.setMatrixAt(k, tmp.matrix);
      mesh.setColorAt(k, color.setHex(l.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
    lightMeshes[shape] = { mesh, list };
  }

  // What each light follows: a chevron chases towards its shot, a bulb of the
  // general illumination glows warm and flickers with the play
  const lightRole = table.lights.map((l) => {
    const chev = /^chev-(.+)-(\d)$/.exec(l.id);
    if (chev) {
      return { kind: "chevron", parent: table.lights.findIndex((x) => x.id === "shot-" + chev[1]), step: Number(chev[2]) };
    }
    if (l.id.startsWith("gi-")) {
      return { kind: "gi", seed: Math.random() * 10 };
    }
    if (l.id.startsWith("mission")) {
      return { kind: "mission", step: Number(l.id.slice(7)) };
    }
    return { kind: "plain" };
  });
  let showTime = 0;
  let giFlash = 0;

  /* ---------- The balls ---------- */

  const ballMeshes = table.physics.balls.map(() => {
    const m = createBallMesh(THREE, { furShells: tier });
    m.group.visible = false;
    group.add(m.group);
    return m;
  });
  let giant = false;

  /* ---------- The camera ---------- */

  const look = { y: 6, target: 6 };
  // What the view shows of the table (table y), up while it frames the Production floor
  const sight = { up: false, from: -Infinity, to: Infinity };

  function placeCamera(dt) {
    const balls = table.physics.balls;
    // Follow the lowest ball on the table, the one that needs the flippers next;
    // the Production floor when only balls up there are in play
    let low = null;
    let up = null;
    for (const b of balls) {
      if (!b.active) {
        continue;
      }
      if (b.floor === 1 && b.mode === "table") {
        up = up && up.y < b.y ? up : b;
      } else if (!low || b.y < low.y) {
        low = b;
      }
    }
    const aspect = camera.aspect || 1;
    const portrait = aspect < 1;
    // A phone looks down more, so the whole length fits; a wide screen leans
    // back like a player at the cabinet and follows the ball
    const vfov = portrait ? 58 : 46;
    camera.fov = vfov;
    const half = (vfov * Math.PI) / 360;
    const hfov = 2 * Math.atan(Math.tan(half) * aspect);
    const width = TABLE.right - TABLE.left + 1.0;
    // A wide screen sits lower, about 35 degrees off the vertical, as the arcade
    // desktop views do: the ramps and the toys stand up off the playfield
    const pitch = portrait ? 1.18 : 0.96;
    // Far enough for the width, and on a wide screen for the whole length too:
    // the flippers and the top of the table are always in sight there
    let distance = width / 2 / Math.tan(hfov / 2) + 1.0;
    let below = 0;
    let above = 0;
    for (let i = 0; i < 40; i++) {
      // How far the view reaches below and above its centre, on the table
      const height = Math.sin(pitch) * distance;
      const across = Math.cos(pitch) * distance;
      below = across - height / Math.tan(pitch + half);
      above = pitch - half > 0.06 ? height / Math.tan(pitch - half) - across : 40;
      if (portrait || below + above >= TABLE.top + 2.2) {
        break;
      }
      distance *= 1.04;
    }
    const span = below + above;
    // The flippers stay in sight while the ball is in the lower part
    const min = -0.9 + below;
    const max = Math.max(min, TABLE.top + 0.6 - above);
    let target;
    sight.up = Boolean(up && (!low || low.y > 9 || low.mode === "path"));
    if (sight.up) {
      const middle = (TABLE.upperBottom + TABLE.upperTop) / 2 + below - span / 2;
      // A phone centres the upper floor a little low, under the goal line and the buttons, whole
      target = portrait ? middle - span * 0.07 : Math.max(min, Math.min(middle, TABLE.upperTop + 0.6 - above));
    } else if (low) {
      // The ball a quarter of the way up the view
      target = Math.max(min, Math.min(max, low.y - span * 0.28 + below));
    } else {
      target = min;
    }
    look.target = target;
    const k = 1 - Math.exp(-dt * (low && low.y < 4 ? 6 : 3));
    look.y += (look.target - look.y) * k;
    // The part of the table in sight, with a margin for the edges of the screen
    sight.from = look.y - below + SIGHT_MARGIN;
    sight.to = look.y + above - SIGHT_MARGIN;
    vec.set((TABLE.left + TABLE.right) / 2, look.y > 20 ? TABLE.upperHeight : 0, -look.y);
    group.localToWorld(vec);
    const tx = vec.x;
    const ty = vec.y;
    const tz = vec.z;
    camera.position.set(tx, ty + Math.sin(pitch) * distance, tz + Math.cos(pitch) * distance);
    camera.lookAt(tx, ty, tz);
    camera.updateProjectionMatrix();
    engine.aimSun(tx, tz);
  }

  /**
   * A face standing up off the table hides the table just behind it, seen
   * from the player: it fades while a ball rolls there, so no ball is lost
   * behind a face. (x, y) the foot of its post, h the height of the face, r its radius.
   */
  function fadeFace(material, x, y, h, r, dt) {
    // Seen from the player's height, a face at h covers the table about h * 0.45 further up
    const middle = y + h * 0.45;
    let behind = false;
    const balls = table.physics.balls;
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      if (b.active && b.floor === 0 && Math.abs(b.x - x) < r + 0.35 && Math.abs(b.y - middle) < r + 0.45) {
        behind = true;
        break;
      }
    }
    material.opacity += ((behind ? FACE_FADED : 1) - material.opacity) * Math.min(1, dt * 12);
  }

  /* ---------- Each frame ---------- */

  let time = 0;
  const q = new THREE.Quaternion();
  const axis = new THREE.Vector3();

  /**
   * mood: { attract (the ball waits on the plunger), tilted }. Lights follow
   * the rules, then the moments of the game play over them: a light show
   * after a jackpot, a chase while the table waits.
   */
  function update(dt, lights, mood) {
    time += dt;
    showTime = Math.max(0, showTime - dt);
    giFlash = Math.max(0, giFlash - dt * 3);
    const attract = Boolean(mood && mood.attract);
    const tilted = Boolean(mood && mood.tilted);
    const physics = table.physics;
    // Balls
    physics.balls.forEach((b, i) => {
      const m = ballMeshes[i];
      m.group.visible = b.active;
      if (!b.active) {
        return;
      }
      const h = b.mode === "path" ? b.h : floorY(b.floor) + b.h;
      const scale = giant ? 1.5 : 1;
      m.group.position.set(b.x, h + b.r * scale, -b.y);
      m.group.scale.setScalar(scale);
      // Rolling: the distance covered turns it round the axis across the motion
      const dx = b.spinX;
      const dy = b.spinY;
      b.spinX = 0;
      b.spinY = 0;
      const d = Math.hypot(dx, dy);
      if (d > 1e-5) {
        axis.set(-dy, 0, -dx).normalize();
        q.setFromAxisAngle(axis, -d / (b.r * scale));
        m.body.quaternion.premultiply(q);
      }
      m.update(dt);
    });
    // Flippers
    for (const { f, group: g } of flippers) {
      const a = f.side === 1 ? f.angle : Math.PI - f.angle;
      g.rotation.y = a;
    }
    // Plunger
    const pull = physics.plunger ? physics.plunger.pull : 0;
    plunger.position.z = -TABLE.plunger.y + 0.1 + pull * 0.9;
    // Bumpers and slings flash
    for (const b of bumpers) {
      b.flash = Math.max(0, b.flash - dt * FLASH_DECAY);
      b.capMaterial.emissiveIntensity = 0.15 + b.flash * 1.6;
      b.cap.position.y = 0.5 - b.flash * 0.08;
    }
    for (const s of slingFlash) {
      s.flash = Math.max(0, s.flash - dt * FLASH_DECAY);
      s.material.emissive.setHex(0xea001e);
      s.material.emissiveIntensity = s.flash;
    }
    // Drop targets sink, admins rise
    table.parts.drops.forEach((d, i) => {
      const target = d.enabled ? 0 : 1;
      drops[i].sink += (target - drops[i].sink) * Math.min(1, dt * 14);
      drops[i].mesh.position.y = 0.25 - drops[i].sink * 0.5;
    });
    table.parts.admins.forEach((a, i) => {
      const v = admins[i];
      const target = a.enabled ? 1 : 0;
      v.rise += (target - v.rise) * Math.min(1, dt * 8);
      v.group.visible = v.rise > 0.02;
      v.group.position.y = -1.2 + v.rise * 1.2;
      v.group.rotation.y = Math.sin(time * 3 + i) * 0.15;
      if (v.group.visible) {
        // The face turns to the player, read whole from any view
        v.face.lookAt(camera.position);
        fadeFace(v.face.material, a.ax, a.ay, FACE_HEIGHT, FACE_R, dt);
      }
    });
    if (gateEntry) {
      const open = !table.parts.productionGate.enabled;
      const y = open ? -gateEntry.h : 0;
      gateEntry.bodies.position.y += (y - gateEntry.bodies.position.y) * Math.min(1, dt * 8);
      gateEntry.ends.position.y = gateEntry.bodies.position.y;
    }
    if (spinLeft > 0) {
      spinner.rotation.x += dt * 30;
      spinLeft -= dt;
    } else {
      spinner.rotation.x += (Math.round(spinner.rotation.x / Math.PI) * Math.PI - spinner.rotation.x) * Math.min(1, dt * 6);
    }
    // The monster Flow spins while it is on
    if (table.parts.flow.enabled) {
      flowDisc.rotation.y += dt * 4.5;
    }
    // Its author stands over the monster Flow, and sinks once it is refactored into Apex
    flowFaceSink += ((table.parts.flow.enabled ? 0 : 1) - flowFaceSink) * Math.min(1, dt * 3);
    flowFace.visible = flowFaceSink < 0.98;
    if (flowFace.visible) {
      flowFace.position.y = -flowFaceSink * 1.5 + Math.sin(time * 2.4) * 0.06;
      flowFaceDisc.lookAt(camera.position);
      fadeFace(flowFaceMaterial, TABLE.flow.x, TABLE.flow.y, FLOW_FACE_HEIGHT, FLOW_FACE_R, dt);
    }
    flowFlash = Math.max(0, flowFlash - dt * 3);
    flowMaterial.emissiveIntensity = 0.25 + flowFlash;
    terminalFlash = Math.max(0, terminalFlash - dt * 0.8);
    terminalScreen.material.color.setScalar(1 + terminalFlash);
    validateFlash = Math.max(0, validateFlash - dt * 2);
    validateMaterial.emissiveIntensity = 0.3 + validateFlash * 1.4;
    for (const q of quality) {
      q.push = Math.max(0, q.push - dt * 5);
      q.mesh.position.x = q.base + q.push * 0.1;
      q.material.emissiveIntensity = 0.2 + q.push * 1.5;
    }
    for (const toy of toys) {
      toy.object.rotation.y += dt * toy.spin;
      toy.object.position.y = toy.base + Math.sin(time * 1.6 + toy.base) * toy.bob;
    }
    for (const dome of domes) {
      dome.material.emissiveIntensity = tilted ? 0 : showTime > 0 ? (Math.sin(time * 24 + dome.phase) > 0 ? 2.4 : 0.2) : 0.35 + Math.max(0, Math.sin(time * 2.2 + dome.phase)) * 0.9 + giFlash;
    }
    // The rabbit walks and hops, the Sales Manager shakes his head
    rabbit.position.x = rabbitShape.ax;
    rabbitHop = Math.max(0, rabbitHop - dt * 3);
    rabbit.position.y = TABLE.upperHeight + Math.abs(Math.sin(time * 6)) * 0.12 + rabbitHop * 0.6;
    rabbit.rotation.y = rabbitShape.vx > 0 ? -0.6 : 0.6;
    const smUp = smShape.enabled;
    salesManager.position.y += ((smUp ? TABLE.upperHeight : TABLE.upperHeight - 1.6) - salesManager.position.y) * Math.min(1, dt * 6);
    smShake = Math.max(0, smShake - dt * 2.5);
    salesManager.rotation.y = Math.sin(time * 18) * smShake * 0.5;
    // Lights
    for (const { mesh, list } of Object.values(lightMeshes)) {
      list.forEach(({ i, l: place }, k) => {
        const l = lights[i];
        const role = lightRole[i];
        let level = lightLevel(l.mode, time);
        if (role.kind === "chevron") {
          // Three chevrons chase towards a lit shot, one after the other
          const parent = role.parent >= 0 ? lights[role.parent] : null;
          level = parent && parent.mode > 0 ? (((time * 5 - (2 - role.step)) % 3) + 3) % 3 < 1 ? 1.3 : 0.18 : 0.08;
        } else if (role.kind === "gi") {
          level = tilted ? 0.05 : 0.85 + Math.sin(time * 9 + role.seed) * 0.05 + giFlash * 0.8;
        } else if (role.kind === "mission" && attract && l.mode === 0) {
          // The table waits: the mission ring runs round
          level = ((time * 8 - role.step) % 10 + 10) % 10 < 1.6 ? 1 : 0.14;
        }
        if (showTime > 0 && role.kind !== "gi") {
          // A light show: a band of light sweeps up the table, the rest blinks
          const band = (time * 1.6) % 1;
          const at = place.y / 30;
          level = Math.abs(at - band) < 0.07 ? 1.6 : Math.sin(time * 22 + place.x) > 0.3 ? 0.9 : 0.12;
        }
        if (tilted && role.kind !== "gi") {
          level = 0.05;
        }
        // Dark inserts add almost nothing: their print shows
        if (role.kind !== "gi" && level < 0.3) {
          level *= 0.25;
        }
        color.setHex(l.color).multiplyScalar(level * (level > 0.5 ? 1.6 : 1));
        mesh.setColorAt(k, color);
      });
      mesh.instanceColor.needsUpdate = true;
    }
    placeCamera(dt);
  }

  return {
    update,
    placeCamera,
    /** The part of the table in sight: { up, from, to }, read by physics.freezeOutOfSight. */
    get sight() {
      return sight;
    },
    /** Where ball i is in the scene, into out, or null when it is not on the table. */
    ballPoint(i, out) {
      const m = ballMeshes[i];
      return m && m.group.visible ? m.group.getWorldPosition(out) : null;
    },
    /** The point of the scene over a table point, for confetti. */
    worldPoint(x, y, floor, out) {
      out.set(x, floorY(floor || 0) + 0.6, -y);
      return group.localToWorld(out);
    },
    flashBumper(i) {
      if (bumpers[i]) {
        bumpers[i].flash = 1;
      }
      giFlash = Math.max(giFlash, 0.35);
    },
    /** A light show over the whole table, for the big moments. */
    show(seconds) {
      showTime = Math.max(showTime, seconds || 1.8);
      giFlash = 1;
    },
    /** state: "hit" (a ball through it), "apex" (refactored, it stops), "spin" (back for a new ball). */
    flow(state) {
      if (state === "hit") {
        flowFlash = 1;
      } else {
        flowMaterial.map = state === "apex" ? flowTextures.apex : flowTextures.spin;
        flowMaterial.emissive.setHex(state === "apex" ? 0x1b96ff : 0xfe9339);
        flowMaterial.needsUpdate = true;
        flowFlash = 1;
      }
    },
    terminal() {
      terminalFlash = 1.5;
    },
    validate() {
      validateFlash = 1;
    },
    pushQuality(i) {
      if (quality[i]) {
        quality[i].push = 1;
      }
    },
    flashSling(i) {
      if (slingFlash[i]) {
        slingFlash[i].flash = 1;
      }
    },
    spin(n) {
      spinLeft = Math.min(1.5, spinLeft + n * 0.08);
    },
    rabbitHit() {
      rabbitHop = 1;
    },
    salesManagerHit() {
      smShake = 1;
    },
    setGiant(on) {
      giant = on;
    },
    snapCamera() {
      look.y = look.target;
    },
    dispose() {
      engine.scene.environment = null;
      for (const m of ballMeshes) {
        m.dispose();
      }
      for (const thing of disposables) {
        if (thing && thing.dispose) {
          thing.dispose();
        }
      }
      root.remove(group);
    }
  };
}

/* ---------- Geometry ---------- */

function flipperGeometry(THREE, length, r1, r2, height) {
  const shape = new THREE.Shape();
  const a = Math.asin(Math.max(-1, Math.min(1, (r1 - r2) / length)));
  shape.absarc(0, 0, r1, Math.PI / 2 + a, Math.PI * 1.5 - a, false);
  shape.absarc(length, 0, r2, -Math.PI / 2 - a, Math.PI / 2 + a, false);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 10 });
  // Flat on the table: shape y becomes -z (table y), the depth goes up
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

/** How bright a light of the rules is now: off, on, a slow blink, a fast one. */
function lightLevel(mode, time) {
  if (mode === 1) {
    return 1;
  }
  if (mode === 2) {
    return Math.sin(time * 6) > 0 ? 1 : 0.2;
  }
  if (mode === 3) {
    return Math.sin(time * 16) > 0 ? 1.15 : 0.2;
  }
  return 0.14;
}

/**
 * A plastic ramp along a curve, from u0 to u1 of its length: a floor under the
 * ball and a wall on each side. As on the arcade, it starts flat on the
 * playfield with a mouth as wide as the shot (about two balls and a half),
 * narrows to its lane, and its walls rise from nothing at the mouth.
 */
function rampGeometry(THREE, curve, u0, u1, segments) {
  const LANE = BALL_RADIUS + 0.15;
  const MOUTH = 0.6;
  // The flare covers this much of the ramp, from its mouth
  const FLARE = 1.6;
  const FLOOR = -(BALL_RADIUS + 0.03);
  const WALL = 0.32;
  const positions = [];
  const at = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const side = new THREE.Vector3();
  const rows = [];
  for (let i = 0; i <= segments; i++) {
    const u = u0 + ((u1 - u0) * i) / segments;
    curve.getPointAt(u, at);
    curve.getTangentAt(u, tangent);
    side.set(-tangent.z, 0, tangent.x).normalize();
    // Flat on the playfield at the mouth, then the ramp's own height
    const floorY = Math.max(0.005, at.y + FLOOR);
    const along = u * curve.getLength();
    const k = u0 === 0 ? Math.min(1, along / FLARE) : 1;
    const ease = k * k * (3 - 2 * k);
    const HALF = MOUTH + (LANE - MOUTH) * ease;
    const wall = WALL * (0.25 + 0.75 * ease);
    rows.push([
      [at.x - side.x * HALF, floorY + wall, at.z - side.z * HALF],
      [at.x - side.x * HALF, floorY, at.z - side.z * HALF],
      [at.x + side.x * HALF, floorY, at.z + side.z * HALF],
      [at.x + side.x * HALF, floorY + wall, at.z + side.z * HALF]
    ]);
  }
  // Three strips: the left wall, the floor, the right wall
  for (let i = 0; i < segments; i++) {
    for (let k = 0; k < 3; k++) {
      const a = rows[i][k];
      const b = rows[i][k + 1];
      const c = rows[i + 1][k];
      const d = rows[i + 1][k + 1];
      positions.push(...a, ...c, ...b, ...b, ...c, ...d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** A flat insert of any shape of art.js, one unit across. */
function insertGeometry(THREE, shape) {
  const pts = shapePoints(shape);
  if (!pts) {
    return new THREE.CircleGeometry(1, shape === "bulb" ? 12 : 24);
  }
  const outline = new THREE.Shape();
  for (let i = 0; i < pts.length; i += 2) {
    if (i === 0) {
      outline.moveTo(pts[i], pts[i + 1]);
    } else {
      outline.lineTo(pts[i], pts[i + 1]);
    }
  }
  outline.closePath();
  return new THREE.ShapeGeometry(outline);
}

/**
 * The room the table stands in, for reflections: a dark arcade, strip lights
 * on the ceiling, neon glows round the walls.
 */
function paintRoom(THREE) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const c = canvas.getContext("2d");
  const g = c.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#1a1d26");
  g.addColorStop(0.5, "#0b0d14");
  g.addColorStop(1, "#050608");
  c.fillStyle = g;
  c.fillRect(0, 0, 512, 256);
  // Strip lights overhead
  c.fillStyle = "#fff6e8";
  for (let i = 0; i < 6; i++) {
    c.fillRect(20 + i * 85, 18, 52, 10);
  }
  // Neon glows on the walls: red, blue, orange
  for (const [x, color] of [
    [60, "rgba(234,0,30,0.85)"],
    [200, "rgba(27,150,255,0.85)"],
    [340, "rgba(254,147,57,0.85)"],
    [470, "rgba(144,80,233,0.85)"]
  ]) {
    const n = c.createRadialGradient(x, 120, 2, x, 120, 70);
    n.addColorStop(0, color);
    n.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = n;
    c.fillRect(x - 70, 50, 140, 140);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A printed slingshot plastic: Cloudity colours, a white edge, a star burst. */
function paintPlastic(THREE) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const c = canvas.getContext("2d");
  const g = c.createLinearGradient(0, 0, 256, 256);
  g.addColorStop(0, "#ff4d5e");
  g.addColorStop(0.55, "#c2001a");
  g.addColorStop(1, "#5a1aa8");
  c.fillStyle = g;
  c.fillRect(0, 0, 256, 256);
  c.strokeStyle = "rgba(255,255,255,0.9)";
  c.lineWidth = 14;
  c.strokeRect(7, 7, 242, 242);
  c.fillStyle = "rgba(255,255,255,0.35)";
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    c.beginPath();
    c.moveTo(128, 128);
    c.lineTo(128 + Math.cos(a) * 160, 128 + Math.sin(a) * 160);
    c.lineTo(128 + Math.cos(a + 0.12) * 160, 128 + Math.sin(a + 0.12) * 160);
    c.closePath();
    c.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
