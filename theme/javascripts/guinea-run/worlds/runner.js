/*
 * The runner the runner worlds share: a track high in a sunny Salesforce sky,
 * three coloured lanes, the guinea pig running down it.
 *
 * A world describes its track as data and the runner plays it:
 * - sections: the parts of the track, each with a name (shown as a Path),
 *   a colour, a length, and the obstacles, metadata and power-ups it brings
 * - obstacles: what each kind is called, what beats it (change lane, jump,
 *   duck, jump a gap), a short name for its face and the fix for it
 * - items and powers: what can be picked up
 * - gates(index): what stands at the end of a section, if anything: three
 *   doors (some open, some closed, or a quiz), or a manual stop
 * - script: moments set at a distance, for the bosses and the twists
 * - clear: stretches [from, to] where the runner lays no row of its own (an
 *   arena), startAt: where the track starts (a retry at a boss)
 *
 * hold(true) makes the guinea pig run on the spot: the scenery keeps
 * scrolling, the distance waits, so a world can play a fight in place and
 * move its own things towards the guinea pig at runner.speed.
 *
 * Readability rule: what is drawn in 3D carries a glyph and one to three
 * words. The full error goes in the toast when it is hit, the tip in the
 * "Why?" box, and the doors of a gate are repeated as big chips in the HUD
 * while the gate comes closer, with the question above them.
 *
 * Everything the player meets is a Salesforce or sfdx-hardis thing from the
 * salesforce pack: CI runners and record bars as obstacles, scratch orgs,
 * permission sets and failed checks as power-ups, the Cloudity logo on the
 * gates. The Kenney islands and trees stay far away, as scenery, with org
 * clouds floating over them. Repeats are instanced. When a pack did not
 * load, the runner falls back on the shapes it builds itself.
 *
 * The guinea pig stays at z = 0 and the world comes to it: an object placed at
 * distance `at` is drawn at z = -(at - distance).
 *
 * update() returns what happened as events, and handle() turns the common ones
 * into points, lost attempts and power-up effects. A world calls handle() for
 * the events it does not treat itself.
 */
import { SLDS, rounded, fitText, font, wrapLines, glyph } from "../core/painter.js";

export const LANES = [-2.2, 0, 2.2];

const JUMP_SPEED = 7.5;
const GRAVITY = 22;
const FAST_FALL_SPEED = -12;
const DUCK_TIME = 0.75;
const LANE_SPEED = 14;
const HIT_INVULNERABLE = 2;
// Every runner world starts this much slower than its first section says:
// they are there to teach, a player who is not a gamer must finish them
const EASY_SPEED = 0.85;
// Then the pace climbs with progress along the track, never with time spent:
// pace = 1 + PACE_GAIN * ease(progress) + PACE_STEP per section passed, so
// about +35 % at the end. A mistake takes MERCY_DROP off for a few seconds
const PACE_GAIN = 0.32;
const PACE_STEP = 0.03;
const MERCY_DROP = 0.14;
const MERCY_TIME = 5;
// The pace levels the coach calls out ("Faster!")
const PACE_CUES = [1.1, 1.2, 1.3];
// The camera widens a little with the pace, so the speed is felt
const FOV_PER_PACE = 8;
const QUICK_BOOST = 1.35;
const INPUT_BUFFER_S = 0.15;
const SEGMENT_LENGTH = 20;
const STOP_DISTANCE = 3.5;
// How far ahead a gate shows its doors in the HUD, and an obstacle is taught
const GATE_PANEL_AT = 60;
// A gate with three answers to choose from gives DECIDE_TIME seconds, from
// the moment its question and doors show in the HUD to the doors. The run
// eases down to a calm speed for that stretch (DECIDE_SLOW of the pace there,
// within DECIDE_SPEED m/s, so the doors show inside the shortest horizon),
// nothing else is on the track, then the pace comes back smoothly. A long
// question (or language) gets up to DECIDE_LONGEST seconds to be read
const DECIDE_TIME = 10;
const DECIDE_LONGEST = 14;
const DECIDE_SLOW = 0.65;
const DECIDE_SPEED = [4.5, 6.5];
const DECIDE_EASE = 2.5;
const RECOVER_EASE = 1.2;
// The clear track before the doors show, and after them
const DECIDE_LEAD = 4;
const DECIDE_AFTER = 12;
const TEACH_AT = 30;
const STREAK_STEP = 10;
// Signs and badges further than this are too small to read: not drawn.
// Small objects further than DRAW_SMALL are deep in the fog: not drawn either
const LABEL_DISTANCE = 46;
const DRAW_SMALL = 66;

const THEMES = {
  error: { color: SLDS.error, dark: 0xba0517, glyph: "error" },
  warning: { color: SLDS.warningDark, dark: 0xb35c00, glyph: "warning" },
  lock: { color: "#5867E8", dark: 0x3a49da, glyph: "lock" },
  info: { color: SLDS.brand, dark: 0x014486, glyph: "gear" },
  purple: { color: SLDS.purple, dark: 0x7526e3, glyph: "bolt" }
};
// The doors of a quiz, one colour per lane, the same in 3D and in the HUD
const DOOR_COLORS = ["#0176D3", "#9050E9", "#06A59A"];
const HAPPY = [0xffb400, 0x1b96ff, 0x2e844a, 0xe3066a, 0x9050e9, 0xff5d2d, 0x06a59a];
const MOVE_COLORS = { jump: "#2E844A", gap: "#2E844A", duck: "#DD7A01", lane: "#EA001E" };

/** The runner's own words, merged into the TEXTS of each runner world. */
export const RUNNER_TEXTS = {
  en: {
    r_teach_jump: "Jump over it: Up arrow or Space!",
    r_teach_jump_touch: "Jump over it: swipe up!",
    r_teach_duck: "Duck under it: Down arrow!",
    r_teach_duck_touch: "Duck under it: swipe down!",
    r_teach_lane: "It blocks the lane: move with Left and Right!",
    r_teach_lane_touch: "It blocks the lane: swipe left or right!",
    r_teach_gap: "A hole in the track: jump!",
    r_teach_gap_touch: "A hole in the track: swipe up!",
    r_teach_door: "Steer into the lane of your answer!",
    r_right: "Right door!",
    r_streak: "{{n}} in a row!",
    r_faster: "Faster!",
    r_youHere: "you"
  },
  fr: {
    r_teach_jump: "Sautez par-dessus : flèche Haut ou Espace !",
    r_teach_jump_touch: "Sautez par-dessus : swipe vers le haut !",
    r_teach_duck: "Baissez-vous : flèche Bas !",
    r_teach_duck_touch: "Baissez-vous : swipe vers le bas !",
    r_teach_lane: "Il bloque la voie : changez avec Gauche et Droite !",
    r_teach_lane_touch: "Il bloque la voie : swipe à gauche ou à droite !",
    r_teach_gap: "Un trou dans la piste : sautez !",
    r_teach_gap_touch: "Un trou dans la piste : swipe vers le haut !",
    r_teach_door: "Prenez la voie de votre réponse !",
    r_right: "Bonne porte !",
    r_streak: "{{n}} d'affilée !",
    r_faster: "Plus vite !",
    r_youHere: "vous"
  }
};

/**
 * config: { sections, obstacles, items, powers, gates(index), script, speed,
 * spacing, firstRowAt, clear, startAt }. See the header of this file.
 */
export function createRunner(ctx, config) {
  const { THREE, root, pig, paint, t, random } = ctx;
  const engine = ctx.engine;
  const camera = ctx.camera;
  const sections = config.sections;
  let total = sections.reduce((sum, s) => sum + s.length, 0);
  const starts = [];
  sections.reduce((sum, s, i) => {
    starts[i] = sum;
    return sum + s.length;
  }, 0);
  const sectionColors = sections.map((s) => new THREE.Color(s.color));
  const speedConfig = Object.assign({ start: 9, step: 1.6, ramp: 1.4 }, config.speed);
  const spacing = (config.spacing || [10, 17]).map((gap) => gap + 2);
  const touch = Boolean(ctx.hud.touch);

  let distance = Math.max(0, Math.min(config.startAt || ctx.params.startAt || 0, total - 30));
  // What the scenery has scrolled: the distance, plus what was run on the spot (hold)
  let scroll = distance;
  let held = false;
  const clear = config.clear || [];
  let sectionIndex = sectionAt(distance);
  let nextRowAt = Math.max(distance + (config.firstRowAt || 30), 0);
  let gatesSpawned = sectionIndex;
  let noObstacleUntil = 0;
  // Stretches with no obstacle: the run-up to a gate, to read and steer
  const quiet = [];
  // Stretches with nothing at all: a choice between three doors, [from, to]
  const choices = [];
  // The choice being made now: { gate, elapsed }, and the speed actually run
  // while it calms the run and while the pace comes back (-1: the pace's own)
  let choice = null;
  let runSpeed = -1;
  let lastSpeed = 0;
  // True while the runner lays its own rows: what falls in a choice is dropped
  let laying = false;
  let objects = [];
  let scriptIndex = 0;
  let fog = false;
  let stopped = null;
  // Inputs are stamped with the game clock, not the frame clock: a slow frame
  // must not age a key press out of the buffer before the next update sees it
  let clock = 0;
  let ended = false;
  let shake = 0;
  let speedFactor = 1;
  let coachUntil = -10;
  let streak = 0;
  // Mercy after a mistake: 1 right after it, back to 0 in MERCY_TIME seconds
  let mercy = 0;
  let cue = 0;
  let paceShown = "";
  // The start speed: the first section's, made easy. The sections after it
  // do not set their own speed any more, the pace curve does
  const startSpeed = (sections[0].speed || speedConfig.start) * EASY_SPEED;
  const taught = new Set();
  const script = (config.script || []).slice().sort((a, b) => a.at - b.at);
  while (scriptIndex < script.length && script[scriptIndex].at < distance) {
    scriptIndex += 1;
  }

  const player = { lane: 1, x: 0, y: 0, vy: 0, duck: 0, invulnerable: 0, quick: 0, hit: 0, buffer: [] };
  // Materials the runner makes itself (the painter frees its own)
  const own = [];

  /* ---------- Models ---------- */

  const models = ctx.models || null;
  const modelSizes = new Map();
  const work = new THREE.Matrix4();

  /**
   * A copy of a Kenney model fitted to a box: give w, h and/or d, the missing
   * ones follow the others. null when its pack did not load.
   */
  function fitModel(name, box) {
    const copy = models ? models.get(name, { shadows: false }) : null;
    if (!copy) {
      return null;
    }
    let size = modelSizes.get(name);
    if (!size) {
      size = new THREE.Box3().setFromObject(copy).getSize(new THREE.Vector3());
      modelSizes.set(name, size);
    }
    const fx = box.w ? box.w / Math.max(size.x, 1e-3) : 0;
    const fy = box.h ? box.h / Math.max(size.y, 1e-3) : 0;
    const fz = box.d ? box.d / Math.max(size.z, 1e-3) : 0;
    const given = [fx, fy, fz].filter(Boolean);
    const mean = given.reduce((a, b) => a + b, 0) / Math.max(given.length, 1) || 1;
    // Scaled and turned through a holder: some models carry a turn of their
    // own (standing up), and their local axes are not the world's
    const holder = new THREE.Group();
    holder.add(copy);
    holder.scale.set(fx || mean, fy || mean, fz || mean);
    if (box.turn) {
      holder.rotation.y = box.turn;
    }
    return holder;
  }

  /**
   * One InstancedMesh per mesh of a model, for the things that repeat. Each
   * part keeps the mesh's place inside the model. null when the pack is missing.
   */
  function instancedModel(name, count, height) {
    const copy = models ? models.get(name, { height, shadows: false }) : null;
    if (!copy) {
      return null;
    }
    copy.updateMatrixWorld(true);
    const parts = [];
    copy.traverse((child) => {
      if (child.isMesh) {
        const mesh = new THREE.InstancedMesh(child.geometry, child.material, count);
        // The instances move every frame: a bounding sphere computed once would cull them wrongly
        mesh.frustumCulled = false;
        root.add(mesh);
        parts.push({ mesh, local: child.matrixWorld.clone() });
      }
    });
    return parts;
  }

  function setInstance(parts, i, m) {
    for (const part of parts) {
      work.multiplyMatrices(m, part.local);
      part.mesh.setMatrixAt(i, work);
    }
  }

  function instancesDone(parts) {
    for (const part of parts) {
      part.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  /** The materials of a model, glowing: cloned once per look, freed by the runner. */
  function glowModel(model, color, intensity) {
    return glow(model, color, intensity);
  }

  function glow(model, color, intensity) {
    model.traverse((child) => {
      if (child.isMesh) {
        child.material = glowMaterial(child.material, color, intensity);
      }
    });
    return model;
  }

  function glowMaterial(material, color, intensity) {
    const key = "glow:" + material.uuid + color + intensity;
    let found = own.find((m) => m.userData.key === key);
    if (!found) {
      found = material.clone();
      found.emissive = new THREE.Color(color);
      found.emissiveIntensity = intensity;
      found.userData.key = key;
      own.push(found);
    }
    return found;
  }

  /* ---------- Scenery ---------- */

  const scenery = buildScenery();

  function buildScenery() {
    // Three pastel lanes with white dashes and soft chevrons pointing ahead
    const trackTexture = paint.texture("track-lanes", 256, 128, (c, w, h) => {
      const lanes = ["#8ECBFF", "#94E6B4", "#FFB3D1"];
      for (let i = 0; i < 3; i++) {
        c.fillStyle = lanes[i];
        c.fillRect((i * w) / 3, 0, w / 3 + 1, h);
      }
      c.fillStyle = "rgba(255,255,255,0.75)";
      for (let i = 0; i < 3; i++) {
        const x = ((i + 0.5) * w) / 3;
        c.beginPath();
        c.moveTo(x - 18, 84);
        c.lineTo(x, 66);
        c.lineTo(x + 18, 84);
        c.lineTo(x + 18, 96);
        c.lineTo(x, 78);
        c.lineTo(x - 18, 96);
        c.closePath();
        c.fill();
      }
      c.fillStyle = SLDS.white;
      for (const x of [w / 3, (2 * w) / 3]) {
        c.fillRect(x - 3, 0, 6, h / 2);
      }
      c.fillRect(0, 0, 6, h);
      c.fillRect(w - 6, 0, 6, h);
    });
    trackTexture.wrapS = THREE.RepeatWrapping;
    trackTexture.wrapT = THREE.RepeatWrapping;
    trackTexture.repeat.set(1, 4);
    const top = paint.plain(0xffffff, { map: trackTexture, roughness: 0.8 });
    const edge = new THREE.MeshStandardMaterial({ color: sections[0].color, roughness: 0.5 });
    // Three draw calls a slab, not six: the sides, the top, then the rest
    const slabGeometry = paint.geometry("r-slab", () => {
      const geometry = new THREE.BoxGeometry(6.6, 0.4, SEGMENT_LENGTH);
      geometry.clearGroups();
      geometry.addGroup(0, 12, 0);
      geometry.addGroup(12, 6, 1);
      geometry.addGroup(18, 18, 0);
      return geometry;
    });
    const segments = [];
    for (let i = 0; i < Math.ceil(140 / SEGMENT_LENGTH) + 1; i++) {
      const slab = new THREE.Mesh(slabGeometry, [edge, top]);
      slab.position.y = -0.2;
      slab.receiveShadow = true;
      root.add(slab);
      segments.push(slab);
    }
    // The two branch lines along the track, and a commit every ten metres
    const rail = new THREE.MeshStandardMaterial({ color: sections[0].color, roughness: 0.4 });
    const railGeometry = paint.geometry("rail", () => new THREE.CylinderGeometry(0.07, 0.07, 200, 8));
    for (const side of [-1, 1]) {
      const line = new THREE.Mesh(railGeometry, rail);
      line.rotation.x = Math.PI / 2;
      line.position.set(side * 3.55, 0.12, -60);
      root.add(line);
    }
    const nodeMaterial = new THREE.MeshStandardMaterial({ color: sections[0].color, roughness: 0.3 });
    const nodes = new THREE.InstancedMesh(
      paint.geometry("node", () => new THREE.SphereGeometry(0.2, 12, 8)),
      nodeMaterial,
      32
    );
    root.add(nodes);
    // A pennant on a white pole at every commit: one mesh for all the poles,
    // one for all the flags
    const poles = new THREE.InstancedMesh(
      paint.geometry("pole", () => new THREE.CylinderGeometry(0.035, 0.035, 1.3, 6).translate(0, 0.65, 0)),
      paint.plain(0xffffff, { roughness: 0.5 }),
      32
    );
    root.add(poles);
    const flagMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, side: THREE.DoubleSide });
    const flags = new THREE.InstancedMesh(
      paint.geometry("pennant", () => {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(0.55, -0.17);
        shape.lineTo(0, -0.36);
        shape.closePath();
        return new THREE.ShapeGeometry(shape);
      }),
      flagMaterial,
      32
    );
    const color = new THREE.Color();
    for (let i = 0; i < 32; i++) {
      flags.setColorAt(i, color.setHex(HAPPY[i % HAPPY.length]));
    }
    root.add(flags);

    // A seeded random, so the sky is the same on every attempt
    const sceneRandom = (() => {
      let s = 7;
      return () => {
        s = (s * 16807) % 2147483647;
        return s / 2147483647;
      };
    })();
    // Clouds all around and below: one mesh for every puff
    const puffs = [];
    for (let i = 0; i < 18; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const below = i % 3 === 0;
      const cx = side * (below ? 4 + sceneRandom() * 10 : 9 + sceneRandom() * 22);
      const cy = below ? -7 - sceneRandom() * 6 : -3 + sceneRandom() * 9;
      const offset = (i / 18) * 220;
      const count = 5 + Math.floor(sceneRandom() * 3);
      for (let p = 0; p < count; p++) {
        const r = 1.2 + sceneRandom() * 1.6;
        puffs.push({ x: cx + (p - count / 2) * 1.4 + sceneRandom(), y: cy + sceneRandom() * 0.8, dz: (sceneRandom() - 0.5) * 2, offset, sx: r * 1.3, sy: r * 0.8, sz: r });
      }
    }
    const clouds = new THREE.InstancedMesh(
      paint.geometry("cloud", () => new THREE.SphereGeometry(1, 14, 10)),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }),
      puffs.length
    );
    root.add(clouds);
    // Floating islands with a lawn and round trees, far on both sides
    const islands = [];
    for (let i = 0; i < 10; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      islands.push({ x: side * (13 + sceneRandom() * 14), y: -3 + sceneRandom() * 5, offset: (i / 10) * 240, s: 1.6 + sceneRandom() * 1.8 });
    }
    for (const island of islands) {
      island.turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), sceneRandom() * Math.PI * 2);
    }
    // The Kenney grass block with a tree, a bush and flowers on top; the
    // code-built cone, lawn and round trees when the packs are missing
    const kenney = {
      block: instancedModel("block-grass-large", islands.length, 1),
      tree: instancedModel("tree", Math.ceil(islands.length / 2), 1.7),
      pine: instancedModel("tree-pine", Math.floor(islands.length / 2), 1.9),
      bush: instancedModel("plant", islands.length, 0.55),
      flowers: instancedModel("flowers", islands.length, 0.26)
    };
    const withModels = Boolean(kenney.block && kenney.tree && kenney.pine && kenney.bush && kenney.flowers);
    // An org cloud floats over every island (nothing to pick up: the sky of Salesforce)
    const orgClouds = withModels ? instancedModel("org-cloud", islands.length, 1.1) : null;
    let rocks = null;
    let lawns = null;
    let trees = null;
    const treeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, flatShading: true });
    if (!withModels) {
      for (const parts of Object.values(kenney)) {
        for (const part of parts || []) {
          root.remove(part.mesh);
          part.mesh.dispose();
        }
      }
      rocks = new THREE.InstancedMesh(
        paint.geometry("island-rock", () => new THREE.ConeGeometry(1, 1.6, 7).rotateX(Math.PI).translate(0, -0.8, 0)),
        paint.plain(0xd99a6c, { roughness: 0.9, flatShading: true }),
        islands.length
      );
      lawns = new THREE.InstancedMesh(
        paint.geometry("island-lawn", () => new THREE.CylinderGeometry(1.08, 1.0, 0.3, 10).translate(0, 0.12, 0)),
        paint.plain(0x7ed957, { roughness: 0.8 }),
        islands.length
      );
      trees = new THREE.InstancedMesh(
        paint.geometry("island-tree", () => new THREE.IcosahedronGeometry(0.42, 0).translate(0, 0.62, 0)),
        treeMaterial,
        islands.length * 2
      );
      const treeColors = [0x2e844a, 0x06a59a, 0xff7eb6, 0xffb400, 0x45c65a];
      for (let i = 0; i < islands.length * 2; i++) {
        trees.setColorAt(i, color.setHex(treeColors[i % treeColors.length]));
      }
      root.add(rocks, lawns, trees);
    }
    // Balloons drifting up beside the track
    const balloonList = [];
    for (let i = 0; i < 14; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      balloonList.push({ x: side * (8 + sceneRandom() * 5), y: 2.5 + sceneRandom() * 5, offset: (i / 14) * 160, phase: sceneRandom() * 6 });
    }
    const balloonMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.05 });
    // Small scratch org clouds drift beside the track; balloons without the pack
    const scratchClouds = instancedModel("scratch-cloud", balloonList.length, 0.8);
    const balloons = new THREE.InstancedMesh(
      paint.geometry("balloon", () => new THREE.SphereGeometry(0.45, 14, 10).scale(1, 1.18, 1)),
      balloonMaterial,
      balloonList.length
    );
    for (let i = 0; i < balloonList.length; i++) {
      balloons.setColorAt(i, color.setHex(HAPPY[(i * 3) % HAPPY.length]));
    }
    if (scratchClouds) {
      balloons.visible = false;
    } else {
      root.add(balloons);
    }
    const instanced = [nodes, poles, flags, clouds, balloons].concat(withModels ? [] : [rocks, lawns, trees]);
    if (withModels) {
      for (const parts of Object.values(kenney)) {
        for (const part of parts) {
          instanced.push(part.mesh);
        }
      }
    }
    for (const parts of [orgClouds, scratchClouds]) {
      for (const part of parts || []) {
        instanced.push(part.mesh);
      }
    }
    return {
      segments,
      edge,
      rail,
      nodes,
      poles,
      flags,
      clouds,
      puffs,
      islands,
      withModels,
      kenney,
      orgClouds,
      scratchClouds,
      rocks,
      lawns,
      trees,
      balloons,
      balloonList,
      instanced,
      disposables: [edge, rail, nodeMaterial, flagMaterial, clouds.material, treeMaterial, balloonMaterial]
    };
  }

  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const identity = new THREE.Quaternion();
  // The salesforce models face -Z: half a turn shows their face to the camera
  const turnBack = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
  const euler = new THREE.Euler();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();

  function placeScenery(time) {
    const offset = scroll % SEGMENT_LENGTH;
    scenery.segments.forEach((slab, i) => {
      slab.position.z = 10 - i * SEGMENT_LENGTH + offset;
    });
    const loop = 160;
    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 2; j++) {
        const side = j === 0 ? -1 : 1;
        const z = 10 - ((i * 10 + loop - (scroll % loop)) % loop);
        const n = i * 2 + j;
        matrix.makeTranslation(side * 3.55, 0.12, z);
        scenery.nodes.setMatrixAt(n, matrix);
        matrix.makeTranslation(side * 3.55, 0.2, z);
        scenery.poles.setMatrixAt(n, matrix);
        // The flags point out of the track and flap a little
        euler.set(0, (side < 0 ? Math.PI : 0) + Math.sin(time * 5 + n) * 0.35, 0);
        quaternion.setFromEuler(euler);
        position.set(side * 3.55, 1.5, z);
        scale.set(1, 1, 1);
        matrix.compose(position, quaternion, scale);
        scenery.flags.setMatrixAt(n, matrix);
      }
    }
    scenery.nodes.instanceMatrix.needsUpdate = true;
    scenery.poles.instanceMatrix.needsUpdate = true;
    scenery.flags.instanceMatrix.needsUpdate = true;
    scenery.puffs.forEach((p, i) => {
      const z = 30 - ((p.offset + 220 - ((scroll * 0.6) % 220)) % 220) + p.dz;
      position.set(p.x, p.y, z);
      scale.set(p.sx, p.sy, p.sz);
      matrix.compose(position, identity, scale);
      scenery.clouds.setMatrixAt(i, matrix);
    });
    scenery.clouds.instanceMatrix.needsUpdate = true;
    if (scenery.withModels) {
      placeIslands(time);
    } else {
      placeShapeIslands(time);
    }
    scenery.balloonList.forEach((b, i) => {
      const z = 10 - ((b.offset + 160 - (scroll % 160)) % 160);
      position.set(b.x + Math.sin(time * 0.7 + b.phase) * 0.3, b.y + Math.sin(time * 1.3 + b.phase) * 0.35, z);
      scale.set(1, 1, 1);
      matrix.compose(position, scenery.scratchClouds ? turnBack : identity, scale);
      if (scenery.scratchClouds) {
        setInstance(scenery.scratchClouds, i, matrix);
      } else {
        scenery.balloons.setMatrixAt(i, matrix);
      }
    });
    if (scenery.scratchClouds) {
      instancesDone(scenery.scratchClouds);
    } else {
      scenery.balloons.instanceMatrix.needsUpdate = true;
    }
    const target = sectionColors[sectionIndex];
    scenery.edge.color.lerp(target, 0.05);
    scenery.rail.color.lerp(target, 0.05);
    scenery.nodes.material.color.lerp(target, 0.05);
  }

  /** The floating Kenney islands: the grass block, then what grows on it, all turning with it. */
  function placeIslands(time) {
    const k = scenery.kenney;
    scenery.islands.forEach((island, i) => {
      const z = -4 - ((island.offset + 240 - ((scroll * 0.5) % 240)) % 240);
      const bob = Math.sin(time * 0.8 + i) * 0.25;
      const s = island.s * 1.1;
      // The block hangs under the lawn line at island.y
      position.set(island.x, island.y + bob - s, z);
      scale.set(s, s, s);
      matrix.compose(position, island.turn, scale);
      setInstance(k.block, i, matrix);
      // What grows on it, placed on the lawn in the island's own frame
      const tree = i % 2 === 0 ? k.tree : k.pine;
      placeOn(island, bob, -0.4, 0.1, s);
      setInstance(tree, Math.floor(i / 2), matrix);
      placeOn(island, bob, 0.5, 0.35, s);
      setInstance(k.bush, i, matrix);
      placeOn(island, bob, 0.3, -0.5, s);
      setInstance(k.flowers, i, matrix);
      if (scenery.orgClouds) {
        position.set(island.x, island.y + bob + s * 1.6 + Math.sin(time * 1.1 + i) * 0.2, z);
        scale.set(s * 0.8, s * 0.8, s * 0.8);
        matrix.compose(position, turnBack, scale);
        setInstance(scenery.orgClouds, i, matrix);
      }
    });
    if (scenery.orgClouds) {
      instancesDone(scenery.orgClouds);
    }
    for (const parts of Object.values(k)) {
      instancesDone(parts);
    }
  }

  /** Sets `matrix` to a spot (dx, dz in island widths) on an island's lawn. */
  function placeOn(island, bob, dx, dz, s) {
    position.set(dx * s, 0, dz * s).applyQuaternion(island.turn);
    position.x += island.x;
    position.y = island.y + bob;
    position.z += -4 - ((island.offset + 240 - ((scroll * 0.5) % 240)) % 240);
    scale.set(s, s, s);
    matrix.compose(position, island.turn, scale);
  }

  function placeShapeIslands(time) {
    scenery.islands.forEach((island, i) => {
      const z = -4 - ((island.offset + 240 - ((scroll * 0.5) % 240)) % 240);
      const bob = Math.sin(time * 0.8 + i) * 0.25;
      position.set(island.x, island.y + bob, z);
      scale.set(island.s, island.s, island.s);
      matrix.compose(position, identity, scale);
      scenery.rocks.setMatrixAt(i, matrix);
      scenery.lawns.setMatrixAt(i, matrix);
      for (let k = 0; k < 2; k++) {
        position.set(island.x + (k === 0 ? -0.35 : 0.4) * island.s, island.y + bob + 0.1 * island.s, z + (k === 0 ? 0.2 : -0.3) * island.s);
        const s = island.s * (k === 0 ? 1 : 0.75);
        scale.set(s, s, s);
        matrix.compose(position, identity, scale);
        scenery.trees.setMatrixAt(i * 2 + k, matrix);
      }
    });
    scenery.rocks.instanceMatrix.needsUpdate = true;
    scenery.lawns.instanceMatrix.needsUpdate = true;
    scenery.trees.instanceMatrix.needsUpdate = true;
  }

  /* ---------- Instanced pickups ---------- */

  // Items the world marks `instanced` (many copies of one model, like the
  // vegetables) are drawn by one InstancedMesh per mesh of their model; each
  // object of the track only keeps its place and its sign
  const POOL_SIZE = 40;
  const pools = {};
  const poolMeshes = [];
  for (const [kind, def] of Object.entries(config.items || {})) {
    if (!def.model || !def.instanced) {
      continue;
    }
    const height = def.big ? 0.95 : 0.75;
    const parts = instancedModel(def.model, POOL_SIZE, height);
    if (!parts) {
      continue;
    }
    for (const part of parts) {
      part.mesh.count = 0;
      part.mesh.material = glowMaterial(part.mesh.material, def.glow || def.color, def.glowIntensity || 0.35);
      poolMeshes.push(part.mesh);
    }
    pools[kind] = { parts, half: height / 2, n: 0 };
  }

  /** Writes the instances of every pool from the items on the track: one pass a frame. */
  function drawPools(time) {
    for (const kind in pools) {
      pools[kind].n = 0;
    }
    for (const object of objects) {
      const pool = object.pool;
      if (!pool || object.removed || !object.mesh.visible || object.detail === 0 || pool.n >= POOL_SIZE) {
        continue;
      }
      euler.set(0, time * 2.2 + object.at, 0);
      quaternion.setFromEuler(euler);
      position.set(object.mesh.position.x, object.mesh.position.y - pool.half, object.mesh.position.z);
      scale.set(1, 1, 1);
      matrix.compose(position, quaternion, scale);
      setInstance(pool.parts, pool.n, matrix);
      pool.n += 1;
    }
    for (const kind in pools) {
      const pool = pools[kind];
      for (const part of pool.parts) {
        part.mesh.count = pool.n;
        part.mesh.instanceMatrix.needsUpdate = true;
      }
    }
  }

  // Kinds whose name sign shows only the first time one comes (config.labelOnce)
  const labelled = new Set();

  /* ---------- Objects of the track ---------- */

  const shapes = {
    wall: paint.geometry("r-wall", () => new THREE.BoxGeometry(1.9, 1.6, 0.4)),
    wallFace: paint.geometry("r-wall-face", () => new THREE.PlaneGeometry(1.8, 1.5)),
    low: paint.geometry("r-low", () => new THREE.BoxGeometry(1.9, 0.55, 0.3)),
    lowFace: paint.geometry("r-low-face", () => new THREE.PlaneGeometry(1.84, 0.5)),
    // On a Kenney body the face is a plaque that leaves the model visible around it
    wallPlaque: paint.geometry("r-wall-plaque", () => new THREE.PlaneGeometry(1.5, 1.25)),
    lowPlaque: paint.geometry("r-low-plaque", () => new THREE.PlaneGeometry(1.4, 0.38)),
    bar: paint.geometry("r-bar", () => new THREE.BoxGeometry(2.05, 0.5, 0.14)),
    barFace: paint.geometry("r-bar-face", () => new THREE.PlaneGeometry(2.0, 0.46)),
    post: paint.geometry("post", () => new THREE.BoxGeometry(0.12, 1.3, 0.12)),
    hole: paint.geometry("hole", () => new THREE.BoxGeometry(1.75, 0.06, 2.2)),
    stripe: paint.geometry("stripe", () => new THREE.BoxGeometry(1.95, 0.06, 0.18)),
    // A thin box drawn in one call: its picture shows on every face
    tile: paint.geometry("r-tile", () => new THREE.BoxGeometry(0.7, 0.7, 0.12)),
    bigTile: paint.geometry("r-tile-big", () => new THREE.BoxGeometry(0.92, 0.92, 0.14)),
    halo: paint.geometry("r-halo", () => new THREE.TorusGeometry(0.66, 0.05, 8, 32)),
    portal: paint.geometry("r-portal", () => new THREE.TorusGeometry(0.92, 0.13, 10, 40)),
    portalGlow: paint.geometry("r-portal-glow", () => new THREE.CircleGeometry(0.9, 32)),
    coin: paint.geometry("coin", () => new THREE.CylinderGeometry(0.44, 0.44, 0.09, 36)),
    ring: paint.geometry("ring", () => new THREE.TorusGeometry(0.5, 0.035, 8, 36)),
    door: paint.geometry("r-door", () => new THREE.BoxGeometry(1.95, 2.5, 0.12)),
    doorFace: paint.geometry("r-door-face", () => new THREE.PlaneGeometry(1.85, 2.4)),
    gatePost: paint.geometry("gate-post", () => new THREE.BoxGeometry(0.26, 3.3, 0.3)),
    ball: paint.geometry("gate-ball", () => new THREE.SphereGeometry(0.26, 12, 8)),
    lintel: paint.geometry("lintel", () => new THREE.BoxGeometry(7.1, 0.34, 0.34)),
    banner: paint.geometry("banner", () => new THREE.PlaneGeometry(6.8, 0.85)),
    plaque: paint.geometry("plaque", () => new THREE.PlaneGeometry(1.9, 0.92)),
    arrow: paint.geometry("arrow", () => new THREE.PlaneGeometry(1.4, 2.6)),
    billboard: paint.geometry("billboard", () => new THREE.PlaneGeometry(3.2, 0.9))
  };
  const white = paint.plain(0xffffff, { roughness: 0.5 });
  const postMaterial = paint.plain(0xffffff, { roughness: 0.5 });
  const gateYellow = paint.plain(0xffb400, { roughness: 0.45 });
  const brand = paint.plain(0x0176d3, { roughness: 0.45 });
  const holeMaterial = paint.plain(0x0a1a33, { roughness: 1 });
  const stripes = paint.material("stripes", 256, 32, (c, w, h) => {
    c.fillStyle = SLDS.warning;
    c.fillRect(0, 0, w, h);
    c.fillStyle = SLDS.navy;
    for (let x = -h; x < w; x += 32) {
      c.beginPath();
      c.moveTo(x, h);
      c.lineTo(x + 16, h);
      c.lineTo(x + 16 + h, 0);
      c.lineTo(x + h, 0);
      c.fill();
    }
  });
  const arrowMaterial = paint.material(
    "arrow",
    128,
    256,
    (c, w) => {
      c.fillStyle = "rgba(46, 132, 74, 0.85)";
      for (let i = 0; i < 3; i++) {
        const y = 30 + i * 80;
        c.beginPath();
        c.moveTo(w / 2, y);
        c.lineTo(w - 12, y + 50);
        c.lineTo(w - 40, y + 50);
        c.lineTo(w / 2, y + 22);
        c.lineTo(40, y + 50);
        c.lineTo(12, y + 50);
        c.closePath();
        c.fill();
      }
    },
    { transparent: true, depthWrite: false }
  );

  /** An unlit picture, so a face reads the same in any light: crisp text. */
  function flat(name, width, height, draw, extra) {
    const key = "flat:" + name;
    let found = own.find((m) => m.userData.key === key);
    if (!found) {
      found = new THREE.MeshBasicMaterial(Object.assign({ map: paint.texture(key, width, height, draw), toneMapped: false }, extra));
      found.userData.key = key;
      own.push(found);
    }
    return found;
  }

  /** The round badge over an obstacle that says what beats it: an arrow, no words. */
  function badge(move) {
    const key = "badge:" + move;
    let found = own.find((m) => m.userData.key === key);
    if (!found) {
      const map = paint.texture(key, 128, 128, (c, w, h) => {
        c.beginPath();
        c.arc(w / 2, h / 2, w / 2 - 6, 0, Math.PI * 2);
        c.fillStyle = MOVE_COLORS[move] || SLDS.brand;
        c.fill();
        c.lineWidth = 8;
        c.strokeStyle = SLDS.white;
        c.stroke();
        c.fillStyle = SLDS.white;
        c.save();
        c.translate(w / 2, h / 2);
        if (move === "lane") {
          // Left and right: change lane
          for (const side of [-1, 1]) {
            c.beginPath();
            c.moveTo(side * 40, 0);
            c.lineTo(side * 14, -22);
            c.lineTo(side * 14, 22);
            c.closePath();
            c.fill();
          }
          c.fillRect(-16, -7, 32, 14);
        } else {
          if (move === "duck") {
            c.rotate(Math.PI);
          }
          c.beginPath();
          c.moveTo(0, -40);
          c.lineTo(30, -6);
          c.lineTo(11, -6);
          c.lineTo(11, 36);
          c.lineTo(-11, 36);
          c.lineTo(-11, -6);
          c.lineTo(-30, -6);
          c.closePath();
          c.fill();
        }
        c.restore();
      });
      found = new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, toneMapped: false });
      found.userData.key = key;
      own.push(found);
    }
    const sprite = new THREE.Sprite(found);
    sprite.scale.set(0.62, 0.62, 1);
    sprite.renderOrder = 2;
    return sprite;
  }

  /** The face of an obstacle: its colour, a glyph and one to three big words. */
  function obstacleFace(kind, theme, text, shape) {
    const sizes = { wall: [512, 428], low: [512, 140], bar: [512, 118] };
    const [W, H] = sizes[shape];
    return flat("face:" + shape + kind + text, W, H, (c, w, h) => {
      rounded(c, 3, 3, w - 6, h - 6, Math.min(36, h / 4));
      c.fillStyle = theme.color;
      c.fill();
      c.lineWidth = 10;
      c.strokeStyle = SLDS.white;
      c.stroke();
      c.fillStyle = SLDS.white;
      c.textBaseline = "middle";
      if (shape === "wall") {
        c.beginPath();
        c.arc(w / 2, 118, 78, 0, Math.PI * 2);
        c.fill();
        glyph(c, theme.glyph, w / 2, 118, 96, theme.color);
        c.fillStyle = SLDS.white;
        c.textAlign = "center";
        font(c, 76, "800");
        const lines = wrapLines(c, text, w - 60).slice(0, 2);
        lines.forEach((line, i) => fitText(c, line, w / 2, (lines.length === 1 ? 300 : 262) + i * 82, w - 50, 76, "800"));
      } else {
        const r = h * 0.34;
        c.beginPath();
        c.arc(h * 0.5, h / 2, r, 0, Math.PI * 2);
        c.fill();
        glyph(c, theme.glyph, h * 0.5, h / 2, r * 1.25, theme.color);
        c.fillStyle = SLDS.white;
        c.textAlign = "center";
        const left = h * 0.95;
        fitText(c, text, left + (w - left - 16) / 2, h / 2 + 3, w - left - 24, h * 0.6, "800");
      }
    });
  }

  /**
   * Only the walls cast a shadow: every caster is drawn twice, and the shadow
   * of a low hurdle or a coin is barely seen on the light track.
   */
  function shadows(group, cast) {
    if (cast && engine.settings.shadows && group.children[0]) {
      group.children[0].traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
        }
      });
    }
    return group;
  }

  /** The words on an obstacle: its short name, never the whole error. */
  function shortText(def) {
    if (def.short) {
      return t(def.short);
    }
    return def.detail || t(def.title);
  }

  function obstacleMesh(kind) {
    const def = config.obstacles[kind];
    const theme = THEMES[def.theme || "error"];
    const text = shortText(def);
    const body = paint.plain(theme.dark, { roughness: 0.45 });
    const group = new THREE.Group();
    switch (def.move) {
      case "jump": {
        // A low record bar, the same height as the hurdle it stands for
        const fence = fitModel("record", { w: 1.95, h: 0.55, d: 0.3, turn: Math.PI });
        const block = fence || new THREE.Mesh(shapes.low, body);
        block.position.y = fence ? 0 : 0.28;
        const face = new THREE.Mesh(fence ? shapes.lowPlaque : shapes.lowFace, obstacleFace(kind, theme, text, "low"));
        face.position.set(0, fence ? 0.3 : 0.28, fence ? 0.17 : 0.152);
        const hint = badge("jump");
        hint.position.y = 0.98;
        group.add(block, face, hint);
        break;
      }
      case "duck": {
        const bar = new THREE.Mesh(shapes.bar, body);
        bar.position.y = 1.0;
        const face = new THREE.Mesh(shapes.barFace, obstacleFace(kind, theme, text, "bar"));
        face.position.set(0, 1.0, 0.072);
        group.add(bar, face);
        for (const x of [-0.98, 0.98]) {
          const post = new THREE.Mesh(shapes.post, postMaterial);
          post.position.set(x, 0.6, 0);
          group.add(post);
        }
        const hint = badge("duck");
        hint.position.y = 1.62;
        group.add(hint);
        break;
      }
      case "gap": {
        const hole = new THREE.Mesh(shapes.hole, holeMaterial);
        hole.position.y = 0.01;
        group.add(hole);
        for (const z of [-1.1, 1.1]) {
          const edge = new THREE.Mesh(shapes.stripe, stripes);
          edge.position.set(0, 0.04, z);
          group.add(edge);
        }
        const sign = paint.sign("gap", text, { color: theme.color, glyph: theme.glyph, height: 0.42 });
        sign.position.set(0, 1.45, 0);
        const hint = badge("gap");
        hint.position.set(0, 0.75, 0);
        group.add(sign, hint);
        break;
      }
      default: {
        // A CI runner rack blocks the lane
        const crate = fitModel("ci-runner", { w: 1.9, h: 1.64, d: 0.8, turn: Math.PI });
        const block = crate || new THREE.Mesh(shapes.wall, body);
        block.position.y = crate ? 0 : 0.82;
        const face = new THREE.Mesh(crate ? shapes.wallPlaque : shapes.wallFace, obstacleFace(kind, theme, text, "wall"));
        face.position.set(0, 0.82, crate ? 0.42 : 0.202);
        const hint = badge("lane");
        hint.position.y = 2.02;
        group.add(block, face, hint);
      }
    }
    return shadows(group, def.move === "lane");
  }

  function itemMesh(kind, withLabel) {
    const def = config.items[kind];
    const group = new THREE.Group();
    if (pools[kind]) {
      if (def.label && withLabel !== false) {
        const sign = paint.sign("item", def.label, { color: def.color, height: 0.4, glyph: def.signGlyph || null });
        sign.position.y = 0.72;
        group.add(sign);
      }
      return group;
    }
    // A salesforce model when the world names one (def.model), the glyph tile otherwise
    let tile = def.model ? fitModel(def.model, { h: def.big ? 0.95 : 0.75 }) : null;
    if (tile) {
      glow(tile, def.glow || def.color, def.glowIntensity || 0.35);
      const spin = new THREE.Group();
      tile.position.y = -(def.big ? 0.47 : 0.37);
      spin.add(tile);
      tile = spin;
    } else {
      tile = new THREE.Mesh(def.big ? shapes.bigTile : shapes.tile, paint.tile(kind, def.color, def.glyph));
    }
    group.add(tile);
    if (def.big) {
      const halo = new THREE.Mesh(shapes.halo, paint.plain(0xffd84d, { emissive: 0xffb400, emissiveIntensity: 1.5 }));
      group.add(halo);
    }
    if (def.label && withLabel !== false) {
      const sign = paint.sign("item", def.label, { color: def.color, height: def.big ? 0.5 : 0.36, glyph: def.signGlyph || null });
      sign.position.y = def.big ? 0.95 : 0.7;
      group.add(sign);
    }
    return group;
  }

  // What each power-up looks like: a fresh scratch org gives an attempt back,
  // a permission set protects, a failed check is the trap, a package.xml
  // pulls the components in, a Lightning bolt for the rest. A world can name
  // its own model (def.model) when another fits its story better
  const POWER_MODELS = {
    attempt: ["scratch-cloud", 0x06a59a, 1.3],
    shield: ["permission-set", 0x06a59a, 1.3],
    trap: ["check-fail", 0xea001e, 0.6],
    magnet: ["package-xml", 0x1b96ff, 1.2],
    custom: ["record", 0x1b96ff, 1.2]
  };

  function powerMesh(kind) {
    const def = config.powers[kind];
    const group = new THREE.Group();
    const look = def.model ? [def.model, def.glow || 0xffb400, 1.2] : POWER_MODELS[def.effect] || ["lwc", 0xffb400, 1.3];
    let body = fitModel(look[0], { h: 0.8 });
    if (body) {
      body.position.y = -0.4;
      if (look[2]) {
        glow(body, look[1], look[2]);
      }
    } else {
      const face = paint.coin(kind, def.color, def.glyph, "");
      body = new THREE.Mesh(shapes.coin, [paint.plain(0xffb020, { metalness: 0.6, roughness: 0.3, emissive: 0x3a2400 }), face, face]);
      body.rotation.x = Math.PI / 2;
    }
    const ring = new THREE.Mesh(shapes.ring, paint.plain(new THREE.Color(def.color).getHex(), { emissive: new THREE.Color(def.color).getHex(), emissiveIntensity: 1.4 }));
    // The body and its ring turn together; the sign stays still
    const spin = new THREE.Group();
    spin.add(body, ring);
    group.add(spin);
    const label = def.short ? t(def.short) : def.label;
    if (label) {
      const sign = paint.sign("power", label, { color: def.color, glyph: "star", height: 0.42 });
      sign.position.y = 0.85;
      group.add(sign);
    }
    return shadows(group);
  }

  /** The face of a door: a colour, a glyph and its short answer, in big letters. */
  function doorFace(text, color, icon) {
    return flat("door:" + color + icon + text, 384, 498, (c, w, h) => {
      rounded(c, 4, 4, w - 8, h - 8, 34);
      c.fillStyle = color;
      c.fill();
      c.lineWidth = 12;
      c.strokeStyle = SLDS.white;
      c.stroke();
      c.fillStyle = SLDS.white;
      c.beginPath();
      c.arc(w / 2, 96, 58, 0, Math.PI * 2);
      c.fill();
      glyph(c, icon, w / 2, 96, 72, color);
      c.fillStyle = SLDS.white;
      c.textAlign = "center";
      c.textBaseline = "middle";
      font(c, 66, "800");
      const lines = wrapLines(c, text, w - 44).slice(0, 4);
      const lineHeight = 72;
      const top = 300 - ((lines.length - 1) * lineHeight) / 2;
      lines.forEach((line, i) => fitText(c, line, w / 2, top + i * lineHeight, w - 36, 66, "800"));
    });
  }

  function doorLook(door) {
    return door.look || (door.ok ? "open" : "closed");
  }

  function doorColor(door, lane) {
    const look = doorLook(door);
    if (look === "open") {
      return SLDS.success;
    }
    if (look === "quiz") {
      return DOOR_COLORS[lane];
    }
    return look === "trap" ? SLDS.purple : SLDS.error;
  }

  /** A gate: three doors, two yellow posts, a banner, the Cloudity plaque. spec.doors[lane] = { text, short, ok, look } */
  function gateMesh(spec) {
    const group = new THREE.Group();
    const panels = [];
    const spinners = [];
    spec.doors.forEach((door, lane) => {
      const x = LANES[lane];
      const look = doorLook(door);
      const words = door.short || door.text;
      if (look === "open") {
        const sign = paint.sign("door-open", words, { color: SLDS.success, glyph: "check", height: 0.55 });
        sign.position.set(x, 2.55, 0.1);
        group.add(sign);
        const arrow = new THREE.Mesh(shapes.arrow, arrowMaterial);
        arrow.rotation.x = -Math.PI / 2;
        arrow.position.set(x, 0.02, 3);
        group.add(arrow);
        // A glowing green ring: the way through
        const ring = new THREE.Mesh(shapes.portal, paint.plain(0x45c65a, { emissive: 0x45c65a, emissiveIntensity: 1.6, roughness: 0.3 }));
        ring.position.set(x, 1.3, 0);
        const glow = new THREE.Mesh(shapes.portalGlow, paint.plain(0xb6f5c2, { emissive: 0x45c65a, emissiveIntensity: 0.8, transparent: true, opacity: 0.45, depthWrite: false }));
        glow.position.set(x, 1.3, -0.02);
        group.add(ring, glow);
        spinners.push(ring);
        // The right way through: a glowing passed check in the middle of the ring
        const pass = fitModel("check-pass", { h: 0.8, turn: Math.PI });
        if (pass) {
          glowModel(pass, 0x45c65a, 1.2);
          pass.position.set(x, 0.9, 0);
          group.add(pass);
        }
        panels.push(null);
      } else {
        const icon = look === "quiz" ? "branch" : look === "trap" ? "loop" : "error";
        const panel = new THREE.Group();
        const slab = new THREE.Mesh(shapes.door, white);
        const face = new THREE.Mesh(shapes.doorFace, doorFace(words, doorColor(door, lane), icon));
        face.position.z = 0.065;
        panel.add(slab, face);
        panel.position.set(x, 1.25, 0);
        group.add(panel);
        panels.push(panel);
      }
    });
    for (const x of [-3.35, -1.1, 1.1, 3.35]) {
      const post = new THREE.Mesh(shapes.gatePost, x === -3.35 || x === 3.35 ? gateYellow : white);
      post.position.set(x, 1.65, 0);
      group.add(post);
      if (x === -3.35 || x === 3.35) {
        const ball = new THREE.Mesh(shapes.ball, brand);
        ball.position.set(x, 3.55, 0);
        group.add(ball);
      }
    }
    const lintel = new THREE.Mesh(shapes.lintel, brand);
    lintel.position.set(0, 3.4, 0);
    group.add(lintel);
    const bannerText = spec.sign || null;
    if (Array.isArray(spec.banner)) {
      const banner = new THREE.Mesh(shapes.banner, paint.path("gate", spec.banner, spec.bannerIndex || 0));
      banner.position.set(0, 4.05, 0);
      group.add(banner);
    } else if (bannerText) {
      const banner = new THREE.Mesh(shapes.banner, paint.label("banner", bannerText, { width: 1024, height: 128, size: 72, bg: SLDS.navy, fg: SLDS.white }));
      banner.position.set(0, 4.05, 0);
      group.add(banner);
    }
    const top = bannerText || Array.isArray(spec.banner) ? 4.55 : 3.7;
    const logo3d = fitModel("cloudity-logo", { h: 1.1, turn: Math.PI });
    if (logo3d) {
      glow(logo3d, 0x1b96ff, 0.5);
      logo3d.position.set(0, top, 0);
      group.add(logo3d);
      spinners.push(null);
      group.userData.logo = logo3d;
    } else {
      const logo = new THREE.Mesh(shapes.plaque, paint.plaque());
      logo.position.set(0, top + 0.5, 0);
      group.add(logo);
    }
    group.userData.panels = panels;
    group.userData.spinners = spinners;
    return group;
  }

  /** A manual stop: a big sign across the track, waiting for "Mark as done". */
  function stopMesh(spec) {
    const group = new THREE.Group();
    for (const x of [-3.35, 3.35]) {
      const post = new THREE.Mesh(shapes.gatePost, gateYellow);
      post.position.set(x, 1.65, 0);
      group.add(post);
    }
    const board = new THREE.Mesh(
      paint.geometry("stop-board", () => new THREE.PlaneGeometry(6.4, 2.2)),
      flat(
        "stop:" + spec.title + spec.button,
        1024,
        352,
        (c, w, h) => {
          rounded(c, 4, 4, w - 8, h - 8, 30);
          c.fillStyle = SLDS.white;
          c.fill();
          rounded(c, 4, 4, w - 8, 100, 30);
          c.fillStyle = SLDS.warningDark;
          c.fill();
          c.fillRect(4, 60, w - 8, 44);
          c.lineWidth = 8;
          c.strokeStyle = SLDS.warningDark;
          rounded(c, 4, 4, w - 8, h - 8, 30);
          c.stroke();
          glyph(c, "warning", 70, 54, 62, SLDS.white);
          c.fillStyle = SLDS.white;
          c.textAlign = "left";
          c.textBaseline = "middle";
          fitText(c, spec.header, 120, 56, w - 150, 54, "800");
          c.fillStyle = SLDS.navy;
          c.textAlign = "center";
          fitText(c, spec.title, w / 2, 170, w - 60, 56, "800");
          rounded(c, w / 2 - 250, 232, 500, 92, 46);
          c.fillStyle = SLDS.brand;
          c.fill();
          c.fillStyle = SLDS.white;
          fitText(c, spec.button, w / 2, 280, 460, 50, "800");
        },
        { side: THREE.DoubleSide }
      )
    );
    board.position.set(0, 2.0, 0);
    group.add(board);
    return shadows(group);
  }

  /** A sign by the side of the track, never in the way. */
  function signMesh(text, look) {
    const group = new THREE.Group();
    const style = look === "log" ? { bg: SLDS.navy, fg: "#7CFC9A", mono: true, size: 40 } : look === "warning" ? { bg: SLDS.warningDark, fg: SLDS.white, size: 46 } : { bg: SLDS.white, fg: SLDS.navy, size: 46 };
    const board = new THREE.Mesh(shapes.billboard, paint.label("side", text, Object.assign({ width: 1024, height: 288 }, style)));
    board.position.y = 1.8;
    group.add(board);
    const post = new THREE.Mesh(shapes.post, postMaterial);
    post.scale.y = 1.1;
    post.position.y = 0.7;
    group.add(post);
    return group;
  }

  function add(object) {
    object.row = laying;
    object.small = object.type === "obstacle" || object.type === "item" || object.type === "power";
    object.detail = 2;
    object.mesh.position.x = object.x;
    object.mesh.position.z = -(object.at - distance);
    root.add(object.mesh);
    objects.push(object);
    return object;
  }

  /* ---------- The doors in the HUD ---------- */

  // While a gate comes closer, its question and its three answers are shown
  // as big chips, one per lane, in the colour of their door
  let doorsPanel = null;
  let doorsGate = null;
  let doorsLane = -1;

  function showDoors(gate) {
    if (!doorsPanel) {
      doorsPanel = document.createElement("div");
      doorsPanel.className = "gr-run-doors";
      ctx.hud.layer.appendChild(doorsPanel);
    }
    doorsPanel.textContent = "";
    // An older spec gives its question as a text banner
    const question = gate.spec.question || (typeof gate.spec.banner === "string" ? gate.spec.banner : "");
    if (question) {
      const q = document.createElement("div");
      q.className = "gr-run-q";
      q.textContent = question;
      doorsPanel.appendChild(q);
    }
    const row = document.createElement("div");
    row.className = "gr-run-row";
    gate.spec.doors.forEach((door, lane) => {
      const chip = document.createElement("div");
      chip.className = "gr-run-door";
      chip.style.setProperty("--door", doorColor(door, lane));
      const strong = document.createElement("b");
      strong.textContent = door.short || door.text;
      chip.appendChild(strong);
      if (door.short && door.text && door.short !== door.text) {
        const span = document.createElement("span");
        span.textContent = door.text;
        chip.appendChild(span);
      }
      row.appendChild(chip);
    });
    doorsPanel.appendChild(row);
    doorsPanel.hidden = false;
    doorsGate = gate;
    doorsLane = -1;
  }

  function hideDoors() {
    if (doorsPanel) {
      doorsPanel.hidden = true;
    }
    doorsGate = null;
  }

  function markDoorLane() {
    if (!doorsGate || !doorsPanel) {
      return;
    }
    const lane = nearestLane();
    if (lane === doorsLane) {
      return;
    }
    doorsLane = lane;
    const chips = doorsPanel.querySelectorAll(".gr-run-door");
    chips.forEach((chip, i) => chip.classList.toggle("is-here", i === lane));
  }

  const runner = {
    LANES,
    get distance() {
      return distance;
    },
    get total() {
      return total;
    },
    get sectionIndex() {
      return sectionIndex;
    },
    get lane() {
      return player.lane;
    },
    get speed() {
      return lastSpeed;
    },
    /**
     * A spot out of every choice for a thing to come at `at`: just before the
     * choice when that is not before `earliest`, else just after it.
     */
    freeSpot(at, earliest) {
      for (const [from, to] of choices) {
        if (at > from && at < to) {
          return from - 2 >= (earliest || 0) ? from - 2 : to + 2;
        }
      }
      return at;
    },
    /** True while a choice between three doors runs: its doors are shown. */
    get choosing() {
      return Boolean(choice);
    },
    get stopped() {
      return Boolean(stopped);
    },
    /** The pace now: 1 at the start, about 1.35 at the end, lower for a while after a mistake. */
    get pace() {
      return pace();
    },
    /** A mistake the world counted itself: the pace drops a notch for a few seconds. */
    mercy() {
      mercy = 1;
    },
    player,

    spawnObstacle(kind, lane, spot) {
      const at = clearOfChoices(spot);
      if (at === null) {
        return null;
      }
      const def = config.obstacles[kind];
      const object = add({ type: "obstacle", kind, def, lane, x: LANES[lane], at, mesh: obstacleMesh(kind), depth: def.move === "gap" ? 2.2 : 0.6 });
      if (def.hidden && fog) {
        object.mesh.visible = false;
      }
      return object;
    },
    /** options: { label: false } leaves the name off (rows of the same item). */
    spawnItem(kind, lane, spot, y, options) {
      const at = clearOfChoices(spot);
      if (at === null) {
        return null;
      }
      let label = options && options.label;
      if (config.labelOnce && config.labelOnce.includes(kind)) {
        label = !labelled.has(kind);
        labelled.add(kind);
      }
      const mesh = itemMesh(kind, label);
      const height = y === undefined ? 0.85 : y;
      mesh.position.y = height;
      return add({ type: "item", kind, def: config.items[kind], lane, x: LANES[lane], at, y: height, mesh, depth: 1, pool: pools[kind] || null });
    },
    spawnPower(kind, lane, spot) {
      const at = clearOfChoices(spot);
      if (at === null) {
        return null;
      }
      const mesh = powerMesh(kind);
      mesh.position.y = 1;
      return add({ type: "power", kind, def: config.powers[kind], lane, x: LANES[lane], at, y: 1, mesh, depth: 1 });
    },
    /** spec: { doors: [3 x { text, short, ok, look, tip }], question, sign, coach, id } */
    /** spec.choice: false for doors that are not a choice (no decision stretch). */
    spawnGate(spec, at) {
      calmBefore(at);
      const gate = add({ type: "gate", kind: "gate", spec, x: 0, at, mesh: gateMesh(spec), depth: 0.4 });
      gate.panelAt = GATE_PANEL_AT;
      if (spec.choice !== false) {
        gate.decide = decideTime(spec);
        gate.panelAt = gate.decide * decideSpeed(at);
        clearForChoice(at - gate.panelAt - DECIDE_LEAD, at + DECIDE_AFTER);
      }
      return gate;
    },
    /** No obstacle from 30 m before `at` to 8 m after: a run-up to something to read or catch. */
    calm(at) {
      calmBefore(at);
    },
    /** spec: { header, title, hint, button, id } */
    spawnStop(spec, at) {
      calmBefore(at);
      return add({ type: "stop", kind: "stop", spec, x: 0, at, mesh: stopMesh(spec), depth: 0.4 });
    },
    spawnSign(text, at, side, look) {
      return add({ type: "sign", kind: "sign", x: side < 0 ? -5.2 : 5.2, at, mesh: signMesh(text, look), depth: 0, done: true });
    },
    /** The obstacles of the next metres vanish: delta deployment, a fresh session. */
    clearAhead(metres) {
      noObstacleUntil = distance + metres;
      for (const object of objects) {
        if (object.type === "obstacle" && object.at < noObstacleUntil && object.at > distance) {
          remove(object);
        }
      }
      objects = objects.filter((object) => !object.removed);
    },
    /** Pulls the next items to the guinea pig's lane. */
    magnet(metres, kinds) {
      for (const object of objects) {
        if (object.type === "item" && !object.done && object.at > distance && object.at < distance + metres && (!kinds || kinds.includes(object.kind))) {
          object.lane = player.lane;
          object.x = LANES[player.lane];
          object.mesh.position.x = object.x;
          object.y = 0.85;
        }
      }
    },
    setFog(on) {
      fog = on;
      for (const object of objects) {
        if (object.type === "obstacle" && object.def.hidden) {
          object.mesh.visible = !on;
        }
      }
      scene().fog.near = on ? 8 : clearFogNear();
      scene().fog.far = on ? 40 : engine.settings.drawDistance;
    },
    setQuick(seconds) {
      player.quick = seconds;
    },
    setInvulnerable(seconds) {
      player.invulnerable = Math.max(player.invulnerable, seconds);
    },
    setSpeedFactor(value) {
      speedFactor = value;
    },
    /** More track at the end: the last section goes on for `metres` more. */
    extend(metres) {
      sections[sections.length - 1].length += metres;
      total += metres;
      ended = false;
    },
    /**
     * Running on the spot: the guinea pig runs and the scenery scrolls, but
     * the distance waits (a boss fight). Keep the track ahead clear (clear).
     */
    hold(on) {
      held = Boolean(on);
    },
    get held() {
      return held;
    },
    /** Lets the guinea pig go again after a manual stop. */
    release() {
      if (stopped) {
        stopped.done = true;
        stopped.mesh.visible = false;
        ctx.fx.burst(0, 2, -STOP_DISTANCE, { count: 40, speed: 5, up: 5 });
        stopped = null;
      }
    },
    shake(amount) {
      shake = engine.motion ? amount : 0;
    },
    /**
     * A big instruction in the middle of the screen, at most one at a time:
     * returns false when another is still showing (force shows it anyway).
     */
    coach(text, ms, force) {
      if (!text || (!force && clock < coachUntil)) {
        return false;
      }
      const length = ms || 2600;
      ctx.hud.coach(text, length);
      coachUntil = clock + length / 1000 + 0.6;
      return true;
    },
    /** A Kenney model fitted to { w, h, d }, or null: see fitModel. */
    model(name, box) {
      return fitModel(name, box);
    },
    /** A small happy hop, for a good move. */
    hop() {
      if (player.y <= 0.001) {
        player.vy = 4.6;
      }
    },
    /** Confetti at a door, a hop and a sound: a gate passed the right way. */
    celebrate(lane, points) {
      const x = LANES[lane === undefined ? player.lane : lane];
      ctx.fx.burst(x, 1.6, -0.5, { count: 46, speed: 5, up: 6, life: 1.4 });
      ctx.sound.play("gate");
      runner.hop();
      if (pig.hop) {
        pig.hop();
      }
      if (points) {
        ctx.points(points);
      }
      runner.coach(say("r_right"), 1600, true);
    },
    /** A bad pick: the streak of good moves starts again. */
    breakStreak() {
      streak = 0;
    },

    action(name) {
      if (stopped) {
        if (name === "confirm" || name === "jump" || name === "tap") {
          return "release";
        }
        return null;
      }
      player.buffer.push({ action: name === "tap" ? "jump" : name, time: clock });
      return null;
    },

    update(dt, time) {
      const events = [];
      if (ended) {
        return events;
      }
      applyBuffer();
      clock += dt;
      stepPlayer(dt);
      const moving = !stopped;
      lastSpeed = moving ? runningSpeed(dt) : 0;
      scroll += lastSpeed * dt;
      if (!held) {
        distance += lastSpeed * dt;
      }
      const section = sectionAt(distance);
      if (section !== sectionIndex) {
        sectionIndex = section;
        updatePath();
        events.push({ type: "section", index: section });
      }
      while (scriptIndex < script.length && script[scriptIndex].at <= distance) {
        events.push({ type: "script", step: script[scriptIndex] });
        scriptIndex += 1;
      }
      spawnAhead();
      placeScenery(time);
      collide(events, time);
      objects = objects.filter((object) => !object.removed);
      drawPools(time);
      markDoorLane();
      showPace();
      placeCamera(dt);
      pig.state = { running: moving, airborne: player.y > 0.01, ducking: player.duck > 0, speed: lastSpeed, height: player.y };
      pig.object.position.set(player.x, player.y, 0);
      pig.shadow.position.set(player.x, 0.012, 0.05);
      pig.hitWobble(player.hit);
      // Blink while it cannot be hit after a hit
      pig.object.visible = !(player.invulnerable > 0 && player.quick === 0 && Math.floor(time * 12) % 2 === 0);
      ctx.setData("lane", player.lane);
      if (!ended && distance >= total) {
        ended = true;
        hideDoors();
        endChoice();
        // The result card orbits the guinea pig: nothing tall stays around it
        for (const object of objects) {
          if ((object.type === "gate" || object.type === "stop") && object.at - distance < 4) {
            object.mesh.visible = false;
          }
        }
        events.push({ type: "end" });
      }
      return events;
    },

    /** The common answers to events: points, attempts, power-ups. */
    handle(event) {
      switch (event.type) {
        case "hit":
          player.invulnerable = HIT_INVULNERABLE;
          player.hit = 0.6;
          mercy = 1;
          runner.shake(0.35);
          ctx.loseAttempt(t(event.def.title), event.def.tip ? t(event.def.tip) : "");
          break;
        case "item":
          ctx.collect(event.def.points || 10, event.def.label || t(event.def.title || ""));
          break;
        case "power":
          ctx.sound.play("power");
          applyPower(event);
          break;
        case "gate":
          if (event.ok) {
            runner.celebrate(event.lane, 100);
          } else {
            runner.wrongDoor(event);
          }
          break;
        default:
          break;
      }
    },
    /** A wrong door: a red puff, a shake and one attempt. The tip says why. */
    wrongDoor(event) {
      player.invulnerable = HIT_INVULNERABLE;
      player.hit = 0.6;
      mercy = 1;
      runner.shake(0.35);
      streak = 0;
      ctx.fx.burst(LANES[event.lane], 1.4, -0.5, { count: 24, colors: [0xea001e, 0xfe9339, 0x444444], speed: 3.5, up: 3 });
      ctx.loseAttempt(event.door.short || event.door.text, event.door.tip || (event.gate.spec.tip ? event.gate.spec.tip : ""));
    },

    dispose() {
      for (const object of objects) {
        root.remove(object.mesh);
      }
      objects = [];
      for (const thing of scenery.disposables) {
        thing.dispose();
      }
      for (const mesh of scenery.instanced) {
        mesh.dispose();
      }
      for (const mesh of poolMeshes) {
        root.remove(mesh);
        mesh.dispose();
      }
      for (const material of own) {
        material.dispose();
      }
      if (doorsPanel) {
        doorsPanel.remove();
        doorsPanel = null;
      }
      ctx.hud.setPath([], 0);
      if (typeof window !== "undefined" && window.__guineaTrack && window.__guineaTrack.player === player) {
        delete window.__guineaTrack;
      }
    }
  };

  function scene() {
    return ctx.scene;
  }

  function clearFogNear() {
    return Math.max(35, engine.settings.drawDistance * 0.6);
  }

  /** A word of the runner, or nothing when the world did not take RUNNER_TEXTS. */
  function say(key, vars) {
    const text = t(key, vars);
    return text === key ? "" : text;
  }

  /** No obstacle in the run-up to a gate or a stop, so it can be read and steered at. */
  function calmBefore(at) {
    quiet.push([at - 30, at + 8]);
    for (const object of objects) {
      if (object.type === "obstacle" && object.at > at - 30 && object.at < at + 8) {
        remove(object);
      }
    }
    objects = objects.filter((object) => !object.removed);
  }

  /** The seconds a choice lasts: its question and its doors read, most of them at least. */
  function decideTime(spec) {
    const question = spec.question || (typeof spec.banner === "string" ? spec.banner : "");
    const text = [question, ...(spec.doors || []).map((door) => door.text || door.short || "")].join(" ");
    // Most of a line's reading time (1.6 s + 60 ms a character), as the doors are read while steering
    return Math.min(DECIDE_LONGEST, Math.max(DECIDE_TIME, 0.8 * (1.6 + 0.06 * text.length)));
  }

  /** The calm speed of the choice at a gate: its pace slowed, kept readable. */
  function decideSpeed(at) {
    return Math.min(DECIDE_SPEED[1], Math.max(DECIDE_SPEED[0], startSpeed * basePace(at) * DECIDE_SLOW));
  }

  /**
   * Nothing on the track in a choice: the rows already laid there go, what a
   * world placed there itself (a tool, a story) moves on to just after it.
   */
  function clearForChoice(from, to) {
    choices.push([from, to]);
    const inside = objects.filter((object) => (object.type === "obstacle" || object.type === "item" || object.type === "power") && !object.done && object.at > from && object.at < to);
    // What moves keeps its place relative to the rest (a note over its hurdle)
    let first = Infinity;
    for (const object of inside) {
      if (object.row) {
        remove(object);
      } else {
        first = Math.min(first, object.at);
      }
    }
    for (const object of inside) {
      if (!object.removed) {
        object.at += to + 2 - first;
      }
    }
    objects = objects.filter((object) => !object.removed);
  }

  /** Where a thing can go: out of every choice. null for a row of the runner's own. */
  function clearOfChoices(at) {
    for (const [from, to] of choices) {
      if (at > from && at < to) {
        return laying ? null : to + 2;
      }
    }
    return at;
  }

  /**
   * The speed run this frame. In a choice it aims at the doors in what is
   * left of DECIDE_TIME, eased so the run calms down smoothly; after it the
   * pace comes back the same way.
   */
  function runningSpeed(dt) {
    const normal = currentSpeed() * (player.quick > 0 ? QUICK_BOOST : 1) * speedFactor;
    if (choice) {
      if (runSpeed < 0) {
        runSpeed = lastSpeed || normal;
      }
      const left = Math.max(0, choice.gate.at - distance);
      const want = Math.max(1.5, left / Math.max(0.35, (choice.gate.decide || DECIDE_TIME) - choice.elapsed));
      runSpeed += (want - runSpeed) * Math.min(1, dt * DECIDE_EASE);
      choice.elapsed += dt;
      return runSpeed;
    }
    if (runSpeed >= 0) {
      runSpeed += (normal - runSpeed) * Math.min(1, dt * RECOVER_EASE);
      if (Math.abs(normal - runSpeed) > 0.05) {
        return runSpeed;
      }
      runSpeed = -1;
    }
    return normal;
  }

  function startChoice(gate) {
    choice = { gate, elapsed: 0 };
    ctx.setData("choice", "on");
  }

  /** The doors are reached: data-choice-seconds says how long the choice lasted. */
  function endChoice() {
    if (!choice) {
      return;
    }
    ctx.setData("choice-seconds", choice.elapsed.toFixed(1));
    choice = null;
    ctx.setData("choice", "off");
  }

  function applyPower(event) {
    const def = event.def;
    const label = def.label;
    switch (def.effect) {
      case "clear":
        runner.clearAhead(def.metres || 80);
        ctx.hud.toast(t(def.toast || "") || label, "power");
        break;
      case "attempt":
        if (!ctx.gainAttempt()) {
          ctx.points(50);
        }
        ctx.hud.toast(t(def.toast || "") || label, "power");
        break;
      case "quick":
        runner.setQuick(def.seconds || 4);
        ctx.hud.toast(t(def.toast || "") || label, "power");
        break;
      case "shield":
        runner.setInvulnerable(def.seconds || 6);
        ctx.hud.toast(t(def.toast || "") || label, "power");
        break;
      case "magnet":
        runner.magnet(def.metres || 120, def.kinds);
        ctx.hud.toast(t(def.toast || "") || label, "power");
        break;
      case "reveal":
        runner.setFog(false);
        ctx.hud.toast(t(def.toast || "") || label, "power");
        break;
      case "trap":
        player.hit = 0.6;
        mercy = 1;
        streak = 0;
        ctx.loseAttempt(t(def.toast || "") || label, def.tip ? t(def.tip) : "");
        break;
      case "empty":
        ctx.hud.toast(t(def.toast || "") || label, "bad");
        break;
      default:
        ctx.collect(def.points || 30, label);
    }
    if (def.effect !== "trap" && def.effect !== "empty") {
      const at = pig.object.position;
      ctx.fx.burst(at.x, at.y + 1, at.z, { count: 26, colors: [0xffb400, 0xffd84d, new THREE.Color(def.color).getHex()], speed: 4, up: 4 });
    }
  }

  function currentSpeed() {
    return startSpeed * pace();
  }

  /**
   * The pace from progress alone: an ease-in curve, plus a small step per
   * section. A world can ask for more (config.paceGain) and keep its start
   * calm (config.paceCalm: the share of the track at the gentle pace).
   */
  const paceGain = config.paceGain || PACE_GAIN;
  const paceCalm = config.paceCalm || 0;
  function basePace(at) {
    const raw = Math.min(1, Math.max(0, at / total));
    const p = raw <= paceCalm ? 0 : (raw - paceCalm) / (1 - paceCalm);
    return 1 + paceGain * (0.4 * p + 0.6 * p * p) + (raw <= paceCalm ? 0 : PACE_STEP * sectionAt(at));
  }

  function pace() {
    return Math.max(0.88, basePace(distance) - MERCY_DROP * mercy);
  }

  /** "Faster!" when the pace passes a level, and data-pace for the checks. */
  function showPace() {
    const now = pace();
    const text = now.toFixed(2);
    if (text !== paceShown) {
      paceShown = text;
      ctx.setData("pace", text);
    }
    if (cue < PACE_CUES.length && basePace(distance) >= PACE_CUES[cue] && !stopped && !choice && runner.coach(say("r_faster"), 1300)) {
      cue += 1;
      ctx.sound.play("combo");
      ctx.fx.burst(player.x, 1.2, -1, { count: 22, colors: [0xffb400, 0xff5d2d, 0xffd84d], speed: 4, up: 3 });
    }
  }

  function sectionAt(d) {
    for (let i = sections.length - 1; i >= 0; i--) {
      if (d >= starts[i]) {
        return i;
      }
    }
    return 0;
  }

  function updatePath() {
    if (config.path !== false) {
      ctx.hud.setPath(
        sections.map((s) => s.name),
        sectionIndex
      );
    }
  }

  function applyBuffer() {
    const now = clock;
    player.buffer = player.buffer.filter((entry) => now - entry.time < INPUT_BUFFER_S);
    const remaining = [];
    for (const entry of player.buffer) {
      const grounded = player.y <= 0.001;
      switch (entry.action) {
        case "left":
          player.lane = Math.max(0, player.lane - 1);
          break;
        case "right":
          player.lane = Math.min(LANES.length - 1, player.lane + 1);
          break;
        case "jump":
          if (grounded) {
            player.vy = JUMP_SPEED;
            player.duck = 0;
            ctx.sound.play("wheek");
          } else {
            remaining.push(entry);
          }
          break;
        case "duck":
          if (!grounded) {
            // Down in the air drops faster, and ducks on landing
            player.vy = Math.min(player.vy, FAST_FALL_SPEED);
          }
          player.duck = DUCK_TIME;
          break;
        default:
          break;
      }
    }
    player.buffer = remaining;
  }

  function stepPlayer(dt) {
    const targetX = LANES[player.lane];
    const dx = targetX - player.x;
    player.x += Math.sign(dx) * Math.min(Math.abs(dx), LANE_SPEED * dt);
    if (player.y > 0 || player.vy > 0) {
      player.vy -= GRAVITY * dt;
      player.y = Math.max(0, player.y + player.vy * dt);
      if (player.y === 0) {
        player.vy = 0;
      }
    }
    player.duck = Math.max(0, player.duck - dt);
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.quick = Math.max(0, player.quick - dt);
    player.hit = Math.max(0, player.hit - dt);
    mercy = Math.max(0, mercy - dt / MERCY_TIME);
  }

  /** One row of the track: what the guinea pig meets at that distance. */
  function addRow(at) {
    const index = sectionAt(at);
    const section = sections[index];
    const end = starts[index] + section.length;
    const hasGate = Boolean(config.gates && config.gates(index));
    const nearEdge = (hasGate && at > end - 32) || (index > 0 && at < starts[index] + 22);
    const pick = (list) => list[Math.floor(random() * list.length)];
    const lanes = [0, 1, 2].sort(() => random() - 0.5);
    const kinds = section.obstacles || [];
    const items = section.items || [];

    if (choices.some(([from, to]) => at > from - 6 && at < to)) {
      // A choice: nothing at all, not even a row of rewards
      return;
    }
    if (clear.some(([from, to]) => at > from && at < to)) {
      // A stretch the world keeps for itself
      return;
    }
    const calm = quiet.some(([from, to]) => at > from && at < to);
    if (nearEdge || calm || at < noObstacleUntil || !kinds.length) {
      if (items.length) {
        const kind = pick(items);
        for (let i = 0; i < 4; i++) {
          runner.spawnItem(kind, lanes[0], at + i * 2.2, undefined, { label: i === 0 });
        }
      }
      return;
    }
    if (section.powers && section.powers.length && random() < (section.powerChance || 0.08)) {
      runner.spawnPower(pick(section.powers), lanes[2], at);
    }
    const doubles = random() < (section.doubles || 0);
    const first = pick(kinds);
    runner.spawnObstacle(first, lanes[0], at);
    if (doubles) {
      // Two obstacles: at most one of them blocks the whole lane
      let second = pick(kinds);
      if (config.obstacles[first].move === "lane" && config.obstacles[second].move === "lane") {
        second = kinds.find((k) => config.obstacles[k].move !== "lane") || null;
      }
      if (second) {
        runner.spawnObstacle(second, lanes[1], at);
      }
    }
    if (!items.length) {
      return;
    }
    if (config.obstacles[first].move === "jump" && random() < 0.6) {
      // An arc of rewards over a hurdle, for the ones who jump
      const kind = pick(items);
      runner.spawnItem(kind, lanes[0], at - 1.8, 1.35, { label: false });
      runner.spawnItem(kind, lanes[0], at, 1.95, { label: false });
      runner.spawnItem(kind, lanes[0], at + 1.8, 1.35, { label: false });
    } else if (!doubles || random() < 0.5) {
      const lane = doubles ? lanes[2] : lanes[1];
      const kind = pick(items);
      for (let i = 0; i < 3; i++) {
        runner.spawnItem(kind, lane, at - 4 + i * 2.2, undefined, { label: i === 0 });
      }
    }
  }

  function spawnAhead() {
    const horizon = distance + engine.settings.drawDistance;
    while (gatesSpawned < sections.length && starts[gatesSpawned] + sections[gatesSpawned].length < horizon) {
      const index = gatesSpawned;
      const spec = config.gates ? config.gates(index) : null;
      if (spec) {
        const at = starts[index] + sections[index].length;
        if (spec.type === "stop") {
          runner.spawnStop(spec, at);
        } else {
          runner.spawnGate(Object.assign({ index }, spec), at);
        }
      }
      gatesSpawned += 1;
    }
    while (nextRowAt < horizon && nextRowAt < total - 20) {
      laying = true;
      addRow(nextRowAt);
      laying = false;
      const index = sectionAt(nextRowAt);
      // The gap grows with the pace the guinea pig will have there, so the
      // time to react never shrinks (above a second even at the end); later
      // sections are only a little denser
      const gap = Math.max(spacing[0], spacing[1] - index * 0.8 - random() * 4);
      nextRowAt += gap * basePace(nextRowAt);
    }
  }

  function remove(object) {
    root.remove(object.mesh);
    object.removed = true;
  }

  function obstacleHits(object) {
    const move = object.def.move;
    if (Math.abs(object.x - player.x) >= (move === "gap" ? 0.6 : 1)) {
      return false;
    }
    switch (move) {
      case "jump":
        return player.y < 0.45;
      case "duck":
        return player.y + (player.duck > 0 ? 0.5 : 0.95) > 0.72;
      case "gap":
        return player.y < 0.05;
      default:
        return true;
    }
  }

  function nearestLane() {
    return LANES.reduce((best, x, i) => (Math.abs(x - player.x) < Math.abs(LANES[best] - player.x) ? i : best), 0);
  }

  /** The first time a kind of move comes up, the coach says which key beats it. */
  function teach(move) {
    if (taught.has(move)) {
      return;
    }
    const text = say("r_teach_" + move + (touch ? "_touch" : ""));
    if (!text || runner.coach(text, 2400)) {
      taught.add(move);
    }
  }

  function collide(events, time) {
    for (const object of objects) {
      const dz = object.at - distance;
      object.mesh.position.z = -dz;
      // 0: not drawn, 1: without its labels, 2: everything
      const detail = object.small && dz >= DRAW_SMALL ? 0 : dz >= LABEL_DISTANCE ? 1 : 2;
      if (object.detail !== detail) {
        object.detail = detail;
        for (const child of object.mesh.children) {
          child.visible = detail === 2 || (detail === 1 && !child.isSprite);
        }
      }
      if (object.type === "item" || object.type === "power") {
        // Only the tile turns: its name, a sprite, always faces the camera
        if (!object.pool && object.mesh.children[0]) {
          object.mesh.children[0].rotation.y = time * 2.2 + object.at;
        }
        object.mesh.position.y = object.y + Math.sin(time * 4 + object.at) * 0.08;
      }
      if (object.done) {
        // A gate behind the guinea pig would fill the camera: it goes at once
        if (object.type === "gate" && dz < -0.4) {
          object.mesh.visible = false;
        }
        if (dz < -12) {
          remove(object);
        }
        continue;
      }
      if (object.type === "stop") {
        if (dz <= STOP_DISTANCE && !stopped) {
          stopped = object;
          if (object.spec.hint) {
            runner.coach(object.spec.hint, 3200, true);
          }
          events.push({ type: "stop", stop: object });
        }
        continue;
      }
      if (object.type === "gate") {
        for (const ring of object.mesh.userData.spinners) {
          if (ring) {
            ring.rotation.z = time * 1.5;
            ring.scale.setScalar(1 + Math.sin(time * 5) * 0.05);
          }
        }
        const logo = object.mesh.userData.logo;
        if (logo) {
          logo.rotation.y = Math.PI + Math.sin(time * 1.2) * 0.35;
        }
        if (dz < object.panelAt && !object.shown && dz > 0) {
          object.shown = true;
          showDoors(object);
          if (object.spec.choice !== false) {
            startChoice(object);
          }
          events.push({ type: "gateNear", gate: object });
          if (object.spec.coach) {
            runner.coach(object.spec.coach, 2800, true);
          } else if (!taught.has("door")) {
            taught.add("door");
            runner.coach(say("r_teach_door"), 2600, true);
          }
        }
        if (dz <= 0) {
          object.done = true;
          const lane = nearestLane();
          const door = object.spec.doors[lane];
          const ok = Boolean(door.ok) || (player.quick > 0 && !object.spec.quiz);
          // The door the guinea pig goes through flies open
          const panel = object.mesh.userData.panels[lane];
          if (panel) {
            panel.visible = false;
          }
          if (doorsGate === object) {
            hideDoors();
          }
          if (choice && choice.gate === object) {
            endChoice();
          }
          events.push({ type: "gate", gate: object, door, lane, ok });
        }
        continue;
      }
      if (object.type === "obstacle" && !stopped && dz < TEACH_AT && dz > 4 && object.mesh.visible) {
        teach(object.def.move);
      }
      const reach = object.depth / 2 + (object.type === "obstacle" ? 0.3 : 0.6);
      if (Math.abs(dz) > reach) {
        if (dz < -12) {
          remove(object);
        }
        continue;
      }
      if (object.type === "obstacle") {
        if (!object.mesh.visible && !object.def.hidden) {
          continue;
        }
        if (obstacleHits(object)) {
          object.done = true;
          if (player.invulnerable > 0 || player.quick > 0) {
            object.mesh.visible = false;
            ctx.fx.burst(object.x, 0.8, 0, { count: 14, speed: 3, up: 3 });
          } else {
            streak = 0;
            ctx.fx.burst(player.x, 0.9, 0, { count: 18, colors: [0xea001e, 0xfe9339, 0xffffff], speed: 3, up: 3 });
            events.push({ type: "hit", kind: object.kind, def: object.def, object });
          }
        }
      } else if (Math.abs(object.x - player.x) < 1.1 && Math.abs(object.y - (player.y + 0.5)) < 1.15) {
        object.done = true;
        object.mesh.visible = false;
        if (object.type === "item" && !object.def.bad) {
          streak += 1;
          if (streak % STREAK_STEP === 0 && !choice) {
            // A streak: a bigger burst and a cheer
            ctx.fx.burst(player.x, 1.4, 0, { count: 50, speed: 5, up: 6, life: 1.4 });
            ctx.sound.play("combo");
            runner.coach(say("r_streak", { n: streak }), 1400);
          }
        }
        events.push({ type: object.type, kind: object.kind, def: object.def, object });
      }
    }
  }

  const eye = new THREE.Vector3(0, 4.1, 6.9);
  const focus = new THREE.Vector3(0, 0.5, -9);
  const wantedEye = new THREE.Vector3();
  const wantedFocus = new THREE.Vector3();

  function placeCamera(dt) {
    const portrait = engine.portrait;
    const follow = player.x * 0.55;
    // A little higher and further back than straight behind: the guinea pig
    // is seen whole, and the track ahead has room
    wantedEye.set(follow, portrait ? 5.0 : 4.1, portrait ? 8.2 : 6.9);
    wantedFocus.set(follow * 0.6, 0.5, -9);
    const ease = Math.min(1, dt * 5);
    eye.lerp(wantedEye, ease);
    focus.lerp(wantedFocus, ease);
    shake = Math.max(0, shake - dt);
    const jitter = shake > 0 ? (Math.random() - 0.5) * shake : 0;
    // The pace felt: the calm of a choice narrows the camera back too
    const felt = runSpeed >= 0 ? Math.min(pace(), runSpeed / startSpeed) : pace();
    const fov = Math.round(((portrait ? 72 : 60) + FOV_PER_PACE * Math.max(0, felt - 1)) * 10) / 10;
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    camera.position.set(eye.x + jitter, eye.y, eye.z);
    camera.lookAt(focus);
    engine.aimSun(focus.x, 0);
  }

  // The fog starts half way to the horizon: on a short low tier horizon the
  // default start leaves the next obstacles washed out
  if (ctx.scene.fog) {
    ctx.scene.fog.near = clearFogNear();
  }

  // Ready for the intro card: the track is drawn before the first step
  ctx.setData("pace", "1.00");
  ctx.setData("choice", "off");
  // A run started further down the track (guinea-at) does not call out the levels behind it
  while (cue < PACE_CUES.length && basePace(distance) >= PACE_CUES[cue]) {
    cue += 1;
  }
  // The playtest bots read the track, on test pages only (guinea-unlock=all, guinea-test=1)
  if (typeof location !== "undefined" && /[?&]guinea-(unlock=all|test=1)/.test(location.search)) {
    window.__guineaTrack = { objects: () => objects, player, distance: () => distance };
  }
  spawnAhead();
  placeScenery(0);
  updatePath();
  pig.object.position.set(0, 0, 0);
  return runner;
}

/** The styles of the door chips, added to the CSS of every runner world. */
export const RUNNER_CSS = `
.guinea-run .gr-run-doors {
  position: absolute;
  left: 50%;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 18px);
  z-index: 4;
  width: min(760px, calc(100vw - 20px));
  transform: translateX(-50%);
  pointer-events: none;
}
.guinea-run.gr-show-buttons .gr-run-doors {
  bottom: calc(env(safe-area-inset-bottom, 0px) + 92px);
}
.guinea-run .gr-run-doors[hidden] {
  display: none;
}
.guinea-run .gr-run-q {
  margin: 0 auto 8px;
  padding: 8px 16px;
  border-radius: 14px;
  background: #032d60;
  box-shadow: 0 4px 0 #001639;
  color: #ffffff;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.3;
  text-align: center;
}
.guinea-run .gr-run-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.guinea-run .gr-run-door {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border: 3px solid #ffffff;
  border-radius: 14px;
  background: var(--door);
  box-shadow: 0 4px 0 rgba(3, 45, 96, 0.45);
  color: #ffffff;
  text-align: center;
  transition: transform 0.15s;
}
.guinea-run .gr-run-door b {
  font-size: 18px;
  line-height: 1.2;
}
.guinea-run .gr-run-door span {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.25;
  opacity: 0.95;
}
.guinea-run .gr-run-door.is-here {
  border-color: #ffd84d;
  box-shadow: 0 0 0 3px #ffb400, 0 6px 0 rgba(3, 45, 96, 0.45);
  transform: translateY(-6px) scale(1.04);
}
@media (max-width: 600px) {
  .guinea-run .gr-run-q {
    margin-bottom: 5px;
    padding: 5px 10px;
    font-size: 14px;
  }
  .guinea-run .gr-run-row {
    gap: 5px;
  }
  .guinea-run .gr-run-door {
    padding: 6px 5px;
  }
  .guinea-run .gr-run-door b {
    font-size: 15px;
  }
  .guinea-run .gr-run-door span {
    display: none;
  }
}
`;
