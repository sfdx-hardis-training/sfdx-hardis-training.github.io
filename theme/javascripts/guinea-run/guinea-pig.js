/*
 * The guinea pig. Its model is built in Blender by scripts/blender/guinea-pig.py,
 * rigged and animated (idle, run, jump, sit, happy, hit), and loaded from
 * options.modelUrl. Until it has loaded, or if it cannot load, the guinea pig
 * below, built in code, stands in: the game never waits for the file.
 *
 * A guinea pig has no visible neck, so the body and the head are one shape: a
 * lathe profile turned around the long axis, then flattened under the belly
 * and dipped at the nose. Its coat is painted on a canvas (a tricolour American
 * short hair: ginger, black and a white band), and the fur is drawn as shells,
 * copies of the body pushed out a little each time and cut by a strand
 * texture, which is how real-time fur is usually done.
 *
 * It faces -Z, the way the track runs, and its feet touch y = 0 when it stands.
 * A world moves and turns `object`; the shadow stays on the ground, and a hit
 * wobbles an inner group, so it never fights the direction a world set.
 */

const SKIN = 0xe2ad9c;
const FUR_LENGTH = 0.05;
// Height of the body's axis: low, a well-fed guinea pig's belly almost drags
const BODY_Y = 0.375;
// The shadow under it, as wide as its tummy
const SHADOW_X = 1.15;
const SHADOW_Z = 1.5;

export function createGuineaPig(THREE, options) {
  const shells = options && options.furShells !== undefined ? options.furShells : 8;
  const outer = new THREE.Group();
  const group = new THREE.Group();
  group.scale.setScalar(1.15);
  outer.add(group);
  // Everything that bounces and squashes, above the feet
  const body = new THREE.Group();
  body.position.y = BODY_Y;
  group.add(body);
  const disposables = [];
  const keep = (thing) => {
    disposables.push(thing);
    return thing;
  };

  // The body and the head, one piece
  const geometry = keep(bodyGeometry(THREE));
  const coat = keep(coatTexture(THREE));
  const skin = new THREE.Mesh(geometry, keep(new THREE.MeshStandardMaterial({ map: coat, roughness: 0.95 })));
  skin.castShadow = true;
  body.add(skin);

  // The fur, in shells
  const strands = keep(strandTexture(THREE));
  for (let i = 1; i <= shells; i++) {
    const f = i / shells;
    const shell = new THREE.Mesh(
      keep(shellGeometry(THREE, geometry, f * FUR_LENGTH)),
      keep(
        new THREE.MeshStandardMaterial({
          map: coat,
          alphaMap: strands,
          alphaTest: 0.08 + 0.85 * f,
          roughness: 1,
          // The inner shells are in the shade of the outer ones
          color: new THREE.Color().setScalar(0.62 + 0.38 * f)
        })
      )
    );
    body.add(shell);
  }

  // Eyes on the sides of the head, black, round and glossy
  const eyeMaterial = keep(new THREE.MeshPhysicalMaterial({ color: 0x080608, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.03 }));
  const eyeGeometry = keep(new THREE.SphereGeometry(0.052, 20, 14));
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    const at = surfacePoint(THREE, 0.66, side, 0.35);
    eye.position.set(at.x * 0.93, at.y, at.z);
    eye.scale.set(0.8, 1, 1.1);
    body.add(eye);
  }

  // Petal ears, thin and drooping outwards
  const earGeometry = keep(new THREE.SphereGeometry(1, 18, 12));
  const earMaterial = keep(new THREE.MeshStandardMaterial({ color: 0xc08e7c, roughness: 0.75, side: THREE.DoubleSide }));
  const ears = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    // On the top corner of the head, folding over its edge and hanging down
    pivot.position.copy(surfacePoint(THREE, 0.44, side, 0.7));
    const ear = new THREE.Mesh(earGeometry, earMaterial);
    ear.scale.set(0.12, 0.014, 0.085);
    ear.position.set(side * 0.11, 0.01, 0);
    ear.castShadow = true;
    pivot.add(ear);
    pivot.rotation.set(0.15, side * 0.25, side * -0.95);
    pivot.userData.side = side;
    body.add(pivot);
    return pivot;
  });

  // The nose, split lip and whiskers
  const nose = new THREE.Mesh(keep(new THREE.SphereGeometry(0.03, 12, 8)), keep(new THREE.MeshStandardMaterial({ color: 0xa8646f, roughness: 0.5 })));
  nose.position.set(0, middle(S_NOSE) - BODY_Y + 0.02, -S_NOSE - 0.005);
  nose.scale.set(1.5, 0.8, 0.6);
  body.add(nose);
  const lip = new THREE.Mesh(keep(new THREE.BoxGeometry(0.008, 0.05, 0.01)), keep(new THREE.MeshBasicMaterial({ color: 0x5a3a36 })));
  lip.position.set(0, middle(S_NOSE) - BODY_Y - 0.035, -S_NOSE + 0.01);
  body.add(lip);
  body.add(whiskers(THREE, keep));

  // Four small pink feet, the front ones shorter
  const footGeometry = keep(new THREE.SphereGeometry(1, 14, 10));
  const footMaterial = keep(new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.7 }));
  const feet = [
    [0.18, -0.4],
    [-0.18, -0.4],
    [0.24, 0.5],
    [-0.24, 0.5]
  ].map(([x, z], i) => {
    const foot = new THREE.Mesh(footGeometry, footMaterial);
    foot.scale.set(0.065, 0.035, i < 2 ? 0.075 : 0.1);
    foot.position.set(x, 0.035, z);
    foot.userData.z = z;
    foot.castShadow = true;
    group.add(foot);
    return foot;
  });

  // A soft shadow on the track, so it never looks like it floats
  const shadow = new THREE.Mesh(keep(new THREE.CircleGeometry(0.6, 32)), keep(shadowMaterial(THREE)));
  keep(shadow.material.map);
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(SHADOW_X, SHADOW_Z, 1);
  shadow.renderOrder = 1;

  // The companions of the change ride on its back: small tiles, added by the
  // worlds as the story collects them (the layout, the permission set...)
  const riders = new THREE.Group();
  riders.position.set(0, 0.86, 0.05);
  body.add(riders);
  const riderGeometry = keep(new THREE.BoxGeometry(0.2, 0.2, 0.05));

  // Every material, to turn the guinea pig into a ghost and back
  const materials = [];
  group.traverse((child) => {
    if (child.material && !materials.includes(child.material)) {
      materials.push(child.material);
    }
  });
  for (const m of materials) {
    m.userData.opacity = m.opacity;
    m.userData.transparent = m.transparent;
  }

  let phase = 0;
  let air = 0;
  let sitting = false;
  let ghost = false;
  let disposed = false;

  // The Blender model, once loaded: an animation mixer plays its clips
  const rig = { model: null, mixer: null, actions: {}, playing: null, lastHit: 0, wasAirborne: false };
  if (options && options.modelUrl) {
    loadModel(THREE, options.modelUrl)
      .then((gltf) => {
        if (disposed) {
          return;
        }
        useModel(gltf);
      })
      .catch(() => {
        // The guinea pig built in code stays: nothing is lost but the looks
      });
  }

  function useModel(gltf) {
    const model = gltf.scene;
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        // A skinned mesh moves outside its bind-pose bounds
        child.frustumCulled = false;
        keep(child.geometry);
        for (const m of Array.isArray(child.material) ? child.material : [child.material]) {
          if (!materials.includes(m)) {
            keep(m);
            m.userData.opacity = m.opacity;
            m.userData.transparent = m.transparent;
            materials.push(m);
          }
        }
      }
    });
    // The parts built in code step aside; the riders stay on its back
    for (const child of body.children) {
      child.visible = child === riders;
    }
    for (const foot of feet) {
      foot.visible = false;
    }
    // Blender's -Y comes out of the exporter as +Z: half a turn puts the nose
    // on -Z, where the game has always pointed it
    model.rotation.y = Math.PI;
    group.add(model);
    rig.model = model;
    rig.mixer = new THREE.AnimationMixer(model);
    for (const clip of gltf.animations) {
      const action = rig.mixer.clipAction(clip);
      if (clip.name === "jump" || clip.name === "happy" || clip.name === "hit") {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = clip.name === "jump";
      }
      rig.actions[clip.name] = action;
    }
    play("idle");
    if (ghost) {
      pig.setGhost(true);
    }
  }

  /** Cross-fades to a clip; a one-shot clip restarts each time. */
  function play(name, fade) {
    const next = rig.actions[name];
    if (!next || (rig.playing === next && next.loop !== THREE.LoopOnce)) {
      return;
    }
    next.reset().fadeIn(fade === undefined ? 0.15 : fade).play();
    if (rig.playing && rig.playing !== next) {
      rig.playing.fadeOut(fade === undefined ? 0.15 : fade);
    }
    rig.playing = next;
  }

  function animateModel(dt, state) {
    const busy = rig.playing && rig.playing.loop === THREE.LoopOnce && rig.playing.isRunning() && rig.playing !== rig.actions.jump;
    if (sitting) {
      if (!busy) {
        play("sit", 0.3);
      }
    } else if (state.airborne) {
      if (!rig.wasAirborne) {
        play("jump", 0.08);
      }
    } else if (!busy) {
      if (state.running) {
        play("run");
        rig.actions.run.timeScale = 0.7 + (state.speed || 0) * 0.06;
      } else {
        play("idle", 0.3);
      }
    }
    rig.wasAirborne = Boolean(state.airborne) && !sitting;
    // A duck flattens it; the clips keep playing underneath
    const flat = state.ducking && !sitting ? 0.62 : 1;
    rig.model.scale.y += (flat - rig.model.scale.y) * Math.min(1, dt * 18);
    rig.mixer.update(dt);
  }

  const pig = {
    object: outer,
    shadow,
    /** A happy popcorn hop, for a good moment (the model only). */
    hop() {
      if (rig.model && !sitting) {
        play("happy", 0.08);
      }
    },
    /** Invisible to everybody: what a field no permission grants looks like. */
    setGhost(on) {
      ghost = on;
      for (const m of materials) {
        m.transparent = on ? true : m.userData.transparent;
        m.opacity = on ? 0.18 : m.userData.opacity;
        m.depthWrite = !on;
        m.needsUpdate = true;
      }
      shadow.visible = !on;
    },
    /** Sitting at a desk, front paws up: the puzzle worlds. */
    setSitting(on) {
      sitting = on;
    },
    /** The small tiles on its back, given as THREE materials. */
    setRiders(list) {
      riders.clear();
      (list || []).forEach((material, i) => {
        const tile = new THREE.Mesh(riderGeometry, material);
        tile.position.set((i - (list.length - 1) / 2) * 0.22, 0, 0);
        tile.rotation.x = -0.35;
        riders.add(tile);
      });
    },
    /**
     * state.running: is it moving, state.airborne: off the ground,
     * state.ducking: flattened under a bar, state.speed: metres per second,
     * state.height: how high it is.
     */
    animate(dt, state) {
      if (rig.model) {
        animateModel(dt, state);
        const lift = Math.max(0, Math.min(state.height || 0, 2));
        const size = 1 - lift * 0.25;
        shadow.scale.set(SHADOW_X * size, SHADOW_Z * size, 1);
        shadow.material.opacity = 0.5 * (1 - lift * 0.3);
        return;
      }
      if (sitting) {
        // Up on its back legs, nose high, front paws off the ground. The nose
        // is on -Z, so a positive turn round X lifts it
        phase += dt * 2;
        body.rotation.x = 0.5;
        body.rotation.z = 0;
        body.position.y = BODY_Y + 0.14 + Math.sin(phase) * 0.01;
        body.scale.set(1, 1, 1);
        feet.forEach((foot, i) => {
          foot.position.y = i < 2 ? 0.42 : 0.035;
          foot.position.z = foot.userData.z * (i < 2 ? 0.6 : 0.8);
        });
        return;
      }
      phase += dt * (state.running ? 7 + state.speed * 0.8 : 1.6);
      air = state.airborne ? air + dt : 0;
      const gallop = state.running && !state.airborne ? Math.sin(phase) : 0;
      const breathe = state.running ? 0 : Math.sin(phase) * 0.015;
      // A gallop stretches and gathers the body; a duck flattens it
      const flat = state.ducking ? 0.62 : 1;
      body.scale.set(state.ducking ? 1.12 : 1 + breathe, flat * (1 - gallop * 0.04 + breathe), (state.ducking ? 1.08 : 1) * (1 + gallop * 0.05));
      body.position.y = BODY_Y * flat + Math.abs(gallop) * 0.05;
      // In the air it does what guinea pigs do when they are happy: popcorn
      body.rotation.z = state.airborne ? Math.sin(air * 9) * 0.28 : 0;
      body.rotation.x = state.airborne ? -0.18 : gallop * 0.03;
      for (const ear of ears) {
        const side = ear.userData.side;
        const flop = state.airborne ? Math.sin(air * 18) * 0.3 : gallop * 0.12;
        ear.rotation.z = side * (-0.95 - flop);
      }
      feet.forEach((foot, i) => {
        const front = i < 2;
        // A bound: the front pair and the back pair move in turn
        const step = state.running && !state.airborne ? Math.sin(phase + (front ? 0 : Math.PI)) : 0;
        foot.position.y = 0.035 + Math.max(step, 0) * 0.07 + (state.airborne ? 0.06 : 0);
        foot.position.z = foot.userData.z + step * 0.08;
      });
      // The shadow shrinks and fades as it goes up
      const lift = Math.max(0, Math.min(state.height || 0, 2));
      const size = 1 - lift * 0.25;
      shadow.scale.set(SHADOW_X * size, SHADOW_Z * size, 1);
      shadow.material.opacity = 0.5 * (1 - lift * 0.3);
    },
    /** A short shake when it hits something. */
    hitWobble(amount) {
      group.rotation.y = Math.sin(amount * 30) * 0.3 * amount;
      // A new hit plays the model's hit clip once
      if (rig.model && amount > rig.lastHit + 0.05 && !sitting) {
        play("hit", 0.05);
      }
      rig.lastHit = amount;
    },
    dispose() {
      disposed = true;
      if (rig.mixer) {
        rig.mixer.stopAllAction();
      }
      for (const thing of disposables) {
        thing.dispose();
      }
    }
  };
  return pig;
}

// The shape of the Blender model (scripts/blender/guinea-pig.py), measured on
// photos: s runs from the rump to the nose; each curve gives, at s, a height
// above the floor or a half width; cap() rounds off the two ends
const S_RUMP = -0.84;
const S_NOSE = 0.94;
const RUMP_CAP = 0.42;
const NOSE_CAP = 0.09;
const TOP = [[-0.84, 0.97], [-0.6, 1.0], [-0.3, 1.01], [0, 0.99], [0.25, 0.95], [0.44, 0.9], [0.6, 0.81], [0.75, 0.72], [0.88, 0.63], [0.94, 0.58]];
const BOTTOM = [[-0.84, 0.12], [-0.62, 0.04], [-0.3, 0.03], [0.2, 0.03], [0.42, 0.05], [0.56, 0.1], [0.68, 0.18], [0.8, 0.29], [0.9, 0.38], [0.94, 0.42]];
const HALF = [[-0.84, 0.62], [-0.5, 0.61], [-0.2, 0.6], [0.1, 0.57], [0.35, 0.5], [0.5, 0.45], [0.66, 0.38], [0.8, 0.28], [0.9, 0.19], [0.94, 0.15]];

/** Catmull-Rom through [s, value] points, flat beyond the first and the last. */
function curve(points, s) {
  if (s <= points[0][0]) {
    return points[0][1];
  }
  const last = points.length - 1;
  if (s >= points[last][0]) {
    return points[last][1];
  }
  let i = 0;
  while (s > points[i + 1][0]) {
    i += 1;
  }
  const p0 = points[Math.max(i - 1, 0)][1];
  const p1 = points[i][1];
  const p2 = points[i + 1][1];
  const p3 = points[Math.min(i + 2, last)][1];
  const t = (s - points[i][0]) / (points[i + 1][0] - points[i][0]);
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
}

/** The height where the cross-section is widest: low on the body, halfway up the head. */
function middle(s) {
  const bottom = curve(BOTTOM, s);
  return bottom + (0.42 + 0.08 * smooth(0.3, 0.7, s)) * (curve(TOP, s) - bottom);
}

/** 1 along the body, falling to 0 at the two ends: a round rump, a rounded nose. */
function cap(s) {
  const rump = Math.min(Math.max((s - S_RUMP) / RUMP_CAP, 0), 1);
  const nose = Math.min(Math.max((S_NOSE - s) / NOSE_CAP, 0), 1);
  return Math.sqrt(1 - (1 - rump) ** 2) * Math.sqrt(1 - (1 - nose) ** 2);
}

/**
 * The point of the body at s, in the direction (dx, dy) of its cross-section,
 * written into out: x across, y the height above the floor, z = -s.
 */
function shapePoint(s, dx, dy, out) {
  const rho = cap(s);
  // A loaf, not a tube: squarer than a circle under the flanks; the head stays round
  const loaf = 1 - smooth(0.3, 0.75, s);
  const e = 2 / (2 + (dy < 0 ? 0.8 : 0.35) * loaf);
  const sx = Math.sign(dx) * Math.abs(dx) ** e;
  const sy = Math.sign(dy) * Math.abs(dy) ** e;
  let x = sx * rho * curve(HALF, s);
  // Full flanks that bulge before they turn under the belly, and full cheeks
  x *= 1 + 0.04 * (1 - smooth(0, 0.65, Math.abs(sy + 0.2))) * loaf;
  x *= 1 + 0.08 * smooth(0.35, 0.5, s) * (1 - smooth(0.62, 0.78, s));
  const mid = middle(s);
  const y = mid + sy * rho * (sy > 0 ? curve(TOP, s) - mid : mid - curve(BOTTOM, s));
  return out.set(x, y, -s);
}

/** A point on the body at s, on one side, t from -1 (under it) to 1 (on top), around the body group. */
function surfacePoint(THREE, s, side, t) {
  const p = shapePoint(s, side * Math.sqrt(Math.max(1 - t * t, 0)), t, new THREE.Vector3());
  p.y -= BODY_Y;
  return p;
}

/** The body and the head as one closed surface, nose forward along -Z. */
function bodyGeometry(THREE) {
  // A lathe only for its rings and its UVs (u around, v from the rump to the
  // nose, as the coat texture expects); every vertex is then put on the shape
  const rings = [];
  for (let i = 0; i <= 48; i++) {
    const z = -Math.cos((i / 48) * Math.PI);
    rings.push(new THREE.Vector2(i === 0 || i === 48 ? 0 : 0.5, S_RUMP + ((z + 1) / 2) * (S_NOSE - S_RUMP)));
  }
  const geometry = new THREE.LatheGeometry(rings, 48);
  // The lathe turns around Y: lay it along Z, nose forward
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i);
    const ring = Math.hypot(v.x, v.y);
    const dx = ring > 1e-6 ? v.x / ring : 0;
    const dy = ring > 1e-6 ? v.y / ring : 0;
    shapePoint(-v.z, dx, dy, v);
    position.setXYZ(i, v.x, v.y - BODY_Y, v.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function smooth(edge0, edge1, x) {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}

/** The body pushed out along its normals, combed back and a little down. */
function shellGeometry(THREE, base, offset) {
  const geometry = base.clone();
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  for (let i = 0; i < position.count; i++) {
    // The hair of the face is short, so the eyes and the nose show
    const length = offset * (1 - 0.75 * smooth(0.3, 0.6, -position.getZ(i)));
    position.setXYZ(
      i,
      position.getX(i) + normal.getX(i) * length,
      position.getY(i) + normal.getY(i) * length - length * 0.25,
      position.getZ(i) + normal.getZ(i) * length + length * 0.4
    );
  }
  return geometry;
}

/**
 * The coat, on the lathe's UVs: u goes around the body (0 on the back, 0.25 on
 * the right side, 0.5 under the belly, 0.75 on the left), v from the rump (0)
 * to the nose (1).
 */
function coatTexture(THREE) {
  const W = 1024;
  const H = 512;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  // The canvas top is v = 1, the nose
  const X = (u) => u * W;
  const Y = (v) => (1 - v) * H;
  // A patch with an irregular edge. It is drawn three times, one texture
  // width apart, because u wraps round the body: a patch on the back that
  // crosses u = 0 would otherwise end on a straight line
  const blob = (color, u, v, ru, rv, wobble) => {
    ctx.fillStyle = color;
    for (const wrap of [-1, 0, 1]) {
      ctx.beginPath();
      const steps = 28;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const k = 1 + Math.sin(a * 3 + u * 10) * (wobble || 0.12) + Math.sin(a * 5 + v * 7) * 0.06;
        const x = X(u + wrap) + Math.cos(a) * ru * W * k;
        const y = Y(v) + Math.sin(a) * rv * H * k;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.fill();
    }
  };
  // Ginger all over, a little lighter under the belly
  ctx.fillStyle = "#c27434";
  ctx.fillRect(0, 0, W, H);
  blob("#d99a5e", 0.5, 0.5, 0.16, 0.6, 0.05);
  // Black on the left of the rump and round the right eye
  blob("#2b1e17", 0.78, 0.27, 0.15, 0.14);
  blob("#2b1e17", 0.97, 0.24, 0.07, 0.1);
  blob("#2b1e17", 0.19, 0.8, 0.07, 0.075);
  // The white band round the middle, and the white blaze down the face
  ctx.fillStyle = "#f3ede3";
  ctx.beginPath();
  for (let i = 0; i <= 64; i++) {
    const u = i / 64;
    const y = Y(0.56 + Math.sin(u * 13) * 0.02);
    if (i === 0) {
      ctx.moveTo(X(u), y);
    } else {
      ctx.lineTo(X(u), y);
    }
  }
  for (let i = 64; i >= 0; i--) {
    const u = i / 64;
    ctx.lineTo(X(u), Y(0.4 + Math.sin(u * 11 + 1) * 0.025));
  }
  ctx.fill();
  blob("#f3ede3", 0, 0.82, 0.035, 0.12, 0.08);
  blob("#f3ede3", 1, 0.82, 0.035, 0.12, 0.08);
  ctx.fillStyle = "#f3ede3";
  ctx.fillRect(0, 0, W, Y(0.93));
  // Every column of the texture meets at the tip of the rump: fade it to one
  // colour there, or the patches pinch into a star where the camera looks most
  const rump = ctx.createLinearGradient(0, Y(0), 0, Y(0.14));
  rump.addColorStop(0, "rgba(160, 96, 46, 1)");
  rump.addColorStop(0.45, "rgba(160, 96, 46, 0.8)");
  rump.addColorStop(1, "rgba(160, 96, 46, 0)");
  ctx.fillStyle = rump;
  ctx.fillRect(0, Y(0.14), W, H - Y(0.14));
  // Hair: thousands of short strokes running back from the nose, so the
  // patches have soft edges and the coat has a grain
  const painted = ctx.getImageData(0, 0, W, H).data;
  for (let i = 0; i < 14000; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const at = ((y | 0) * W + (x | 0)) * 4;
    const pixel = [painted[at], painted[at + 1], painted[at + 2]];
    const shade = 0.8 + Math.random() * 0.4;
    ctx.strokeStyle = "rgba(" + Math.min(255, pixel[0] * shade) + "," + Math.min(255, pixel[1] * shade) + "," + Math.min(255, pixel[2] * shade) + ",0.55)";
    ctx.lineWidth = 1 + Math.random();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 4, y + 6 + Math.random() * 8);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** One strand per texel cluster, each a random height: a shell keeps the ones taller than it. */
function strandTexture(THREE) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 16000; i++) {
    const level = Math.floor(80 + Math.random() * 175);
    ctx.fillStyle = "rgb(" + level + "," + level + "," + level + ")";
    ctx.fillRect(Math.floor(Math.random() * size), Math.floor(Math.random() * size), 1, 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 3);
  return texture;
}

function whiskers(THREE, keep) {
  const points = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const start = new THREE.Vector3(side * 0.12, 0.1 + i * 0.012, -0.86);
      const end = start.clone().add(new THREE.Vector3(side * (0.26 + Math.random() * 0.1), (i - 2) * 0.05, 0.08 + i * 0.03));
      points.push(start, end);
    }
  }
  const geometry = keep(new THREE.BufferGeometry().setFromPoints(points));
  return new THREE.LineSegments(geometry, keep(new THREE.LineBasicMaterial({ color: 0xf5f1ea, transparent: true, opacity: 0.85 })));
}

function shadowMaterial(THREE) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  gradient.addColorStop(0, "rgba(0,0,0,0.9)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  return new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, opacity: 0.5 });
}

/** The model file, loaded once per page and shared by every guinea pig. */
const modelCache = new Map();
function loadModel(THREE, url) {
  if (!modelCache.has(url)) {
    modelCache.set(
      url,
      import("./vendor/GLTFLoader.js").then(({ GLTFLoader }) => new GLTFLoader().loadAsync(url))
    );
  }
  // Each guinea pig gets its own copy of the scene, sharing the geometry
  return Promise.all([modelCache.get(url), import("./vendor/SkeletonUtils.js")]).then(([gltf, utils]) => ({
    scene: utils.clone(gltf.scene),
    animations: gltf.animations
  }));
}
