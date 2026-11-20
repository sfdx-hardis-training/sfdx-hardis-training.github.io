/*
 * The musical runs of Guinea Run (worlds 6 and 8), in the style of the
 * musical levels of a well-known platformer: the guinea pig runs on its own,
 * to the music, and the player only jumps. Everything is placed on the beat,
 * so jumping in time feels like playing the song, and every collectable sings
 * a note of the chord being played.
 *
 * The song is the clock. The guinea pig runs a fixed number of units per beat
 * (UNITS_PER_BEAT), so a run beat is a place on the track as much as a moment
 * of the song. A stop (a manual action, a choice) holds the guinea pig while
 * the song goes on, and the run starts again on the next bar; a hit sends it
 * back to its last checkpoint, also on a bar, so the level and the music never
 * drift apart.
 *
 * A level is a list of events placed in run beats, written with createLevel():
 * blocks to jump, gaps, coins on the ground or on the arc of a jump, power-ups,
 * springs, signs, arches, checkpoints, zones of colour, music sections, stops,
 * fog, soft zones (where a mistake costs nothing) and scripts. A jump lasts
 * exactly one beat: a block placed "at" a beat is jumped on that beat, and the
 * guinea pig lands on the next one.
 *
 *   const L = createLevel();
 *   L.riff(2, "x.x.", { block: look, coin });   // bar 2: jumps on beats 1 and 3
 *   const run = createMusicalRun(ctx, { song, level: L, callbacks });
 *   // in the world: run.update(dt, time), run.action(name), run.dispose()
 *
 * What it gives the player to see the beat: a ring that closes on the spot
 * to jump from, a glowing footprint there, a wood block on the beat of every
 * jump, and a world that bounces to the music.
 */
import { createMusic } from "../core/music.js";
import { SLDS, rounded, glyph } from "../core/painter.js";

export const UNITS_PER_BEAT = 3;
const JUMP_H = 2.3;
const COYOTE_S = 0.11;
const BUFFER_S = 0.17;
// Generous hit boxes: the guinea pig is 1.3 long, it collides as 0.6
const PIG_HALF = 0.3;
const PIG_TALL = 0.7;
const FOOT = 0.34;
const RING_BEATS = 2;
const BLOCK_W = 0.95;
const COACH_GAP_S = 3.2;
const PERFECT_BEAT = 0.1;
const GAP_FROM = 0.2;
const GAP_TO = 0.8;
const STREAK_STEP = 8;
// After a respawn the tempo stays a step lower for this many beats (four bars)
const MERCY_BEATS = 16;
// The run clip of the guinea pig model lasts this long, and plays at
// 0.7 + speed * 0.06 (guinea-pig.js): the speed passed makes two strides a beat
const RUN_CLIP_S = 0.333;
const STRIDES_PER_BEAT = 2;
// Scenery and coins are drawn this far from the camera, and no further
const SCENERY_RANGE = 34;
// The salesforce items already face this camera (it looks from +Z): no turn
const ITEM_FACE = 0;
// The bonus vegetables, as in world 0: one model of the vegetables pack each,
// glowing a little in its own colour, 15 points and a happy wheek
const VEGETABLES = [
  { model: "fennel", key: "fennel", color: 0x7bc96f },
  { model: "carrot", key: "carrot", color: 0xff8a3d },
  { model: "bell-pepper", key: "bellPepper", color: 0xe8473b },
  { model: "cucumber", key: "cucumber", color: 0x3e9b4f },
  { model: "romaine", key: "romaine", color: 0x8cd17d },
  { model: "parsley", key: "parsley", color: 0x2e844a }
];
const VEG_H = 0.75;
const VEG_POINTS = 15;
// Vegetables come in short rows of one kind; the name shows over the first of each kind
const VEG_ROW = 3;
// A block thrown by a boss (def.thrower) leaves its hand this many beats before
// it is jumped, and lands this many beats before: thrown on a beat, landed on a beat
const THROW_BEATS = 3;
const LAND_BEATS = 1;
const THROW_ARC = 1.6;

export const MUSICAL_TEXTS = {
  en: {
    mu_start: "Jump on the beat, when the ring closes!",
    mu_startTouch: "Tap to jump, when the ring closes!",
    mu_hit: "Back to the checkpoint: jump when the ring closes",
    mu_manual: "Jump to press the button!",
    mu_choice: "Jump when the right answer lights up",
    mu_choiceTouch: "Jump when the right answer lights up, or tap it",
    mu_streak: "Streak x{{n}}",
    mu_perfect: "On the beat!",
    mu_soft: "In the preprod org, a mistake costs nothing",
    mu_checkpoint: "Checkpoint",
    mu_faster: "Faster!",
    mu_mercy: "A little slower, for a few bars",
    mu_vegetables: "Vegetables: {{n}}",
    mu_coachVeg: "Yum! Vegetables are bonus points",
    mu_veg_fennel: "Fennel",
    mu_veg_carrot: "Carrot",
    mu_veg_bellPepper: "Bell pepper",
    mu_veg_cucumber: "Cucumber",
    mu_veg_romaine: "Romaine",
    mu_veg_parsley: "Parsley"
  },
  fr: {
    mu_start: "Sautez sur le temps, quand l'anneau se referme !",
    mu_startTouch: "Touchez pour sauter, quand l'anneau se referme !",
    mu_hit: "Retour au checkpoint : sautez quand l'anneau se referme",
    mu_manual: "Sautez pour appuyer sur le bouton !",
    mu_choice: "Sautez quand la bonne réponse s'allume",
    mu_choiceTouch: "Sautez quand la bonne réponse s'allume, ou touchez-la",
    mu_streak: "Série x{{n}}",
    mu_perfect: "Pile sur le temps !",
    mu_soft: "Dans l'org preprod, une erreur ne coûte rien",
    mu_checkpoint: "Checkpoint",
    mu_faster: "Plus vite !",
    mu_mercy: "Un peu plus lent, quelques mesures",
    mu_vegetables: "Légumes : {{n}}",
    mu_coachVeg: "Miam ! Les légumes, ce sont des points bonus",
    mu_veg_fennel: "Fenouil",
    mu_veg_carrot: "Carotte",
    mu_veg_bellPepper: "Poivron",
    mu_veg_cucumber: "Concombre",
    mu_veg_romaine: "Romaine",
    mu_veg_parsley: "Persil"
  }
};

export const MUSICAL_CSS = `
.guinea-run .gr-mu-choice {
  position: absolute;
  top: 160px;
  left: 50%;
  width: min(640px, calc(100vw - 24px));
  transform: translateX(-50%);
  padding: 12px 14px 14px;
  border: 3px solid #fe9339;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 6px 24px rgba(3, 45, 96, 0.35);
  color: #032d60;
  pointer-events: auto;
  animation: gr-card-in 0.3s ease-out;
}
.guinea-run:not([data-state="playing"]) .gr-mu-choice {
  visibility: hidden;
}
.guinea-run .gr-mu-prompt {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.25;
}
.guinea-run .gr-mu-detail {
  margin: 0 0 10px;
  color: #444444;
  font-size: 15px;
}
.guinea-run .gr-mu-hint {
  margin: 8px 0 0;
  color: #444444;
  font-size: 13px;
  text-align: center;
}
.guinea-run .gr-mu-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 8px;
}
.guinea-run .gr-mu-option {
  min-height: 52px;
  padding: 8px 10px;
  border: 3px solid #c9c9c9;
  border-radius: 12px;
  background: #f3f3f3;
  color: #032d60;
  font: inherit;
  font-size: 16px;
  font-weight: 800;
  overflow-wrap: anywhere;
  cursor: pointer;
  touch-action: manipulation;
  transition: transform 0.08s, background 0.08s;
}
.guinea-run .gr-mu-option.is-lit {
  border-color: #032d60;
  background: #ffd84d;
  transform: scale(1.06);
}
.guinea-run .gr-mu-option.is-off {
  opacity: 0.45;
  text-decoration: line-through;
  cursor: default;
}
.guinea-run .gr-mu-option.is-right {
  border-color: #2e844a;
  background: #2e844a;
  color: #ffffff;
}
.guinea-run .gr-mu-meter {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  margin: 6px auto 0;
  padding: 4px 12px;
  border-radius: 999px;
  background: #032d60;
  color: #ffffff;
  font-size: 15px;
  font-weight: 800;
}
.guinea-run .gr-mu-veg {
  display: inline-flex;
  align-items: center;
  margin: 6px 0 0 6px;
  padding: 4px 12px;
  border-radius: 999px;
  background: #fff1d6;
  color: #8a4b00;
  font-size: 15px;
  font-weight: 800;
  white-space: nowrap;
}
@media (max-width: 600px) {
  .guinea-run .gr-mu-choice {
    top: auto;
    bottom: 178px;
  }
  .guinea-run .gr-mu-prompt {
    font-size: 16px;
  }
}
`;

/* ---------- Writing a level ---------- */

/**
 * The end of the "Good to know" message both musical worlds write: Quick
 * Deploy missed, too few components collected, then the first two reasons.
 */
export function endMissedInfo(lines, run, stats, t) {
  if (!run.powerTaken("quick")) {
    lines.push(t("info_quick"));
  }
  // The bonus vegetables when the track has some, every pickup otherwise
  const got = stats.vegTotal ? stats.vegetables : stats.got;
  const total = stats.vegTotal || stats.coins;
  if (got < total * 0.9) {
    lines.push(t("info_coins", { got, total }));
  }
  return lines.slice(0, 2).join(" ");
}

/** The world object a musical run gives the shell. */
export function musicalWorld(run, isFinished, cleanUp) {
  return {
    start() {
      run.start();
    },
    update(dt, time) {
      if (isFinished()) {
        return;
      }
      run.update(dt, time);
    },
    action(name) {
      run.action(name);
    },
    idleCamera(time) {
      run.idleCamera(time);
    },
    dispose() {
      run.dispose();
      cleanUp();
    }
  };
}

/** The builder of a level: every method adds events placed in run beats (4 per bar). */
export function createLevel() {
  const events = [];
  const add = (event) => {
    events.push(event);
    return event;
  };
  const L = {
    events,
    /**
     * A block to jump over, jumped on beat `at`. look: { id, color, glyph, sign, title, tip, group, hidden, h },
     * and for its sign signEvery (on every block of the look), signHeight, signAnchor (0 to 1: the share of it left of the block).
     * extra: { convert: coin } turns it into that coin (convert()), { thrown: true } has it thrown by def.thrower.
     */
    block(at, look, extra) {
      return add(Object.assign({ type: "block", at, look }, extra));
    },
    /** A gap in the track, jumped on beat `at`. */
    gap(at, look) {
      return add({ type: "gap", at, look });
    },
    coin(beat, y, coin) {
      return add({ type: "coin", beat, y, coin });
    },
    /** Three coins on the arc of a jump taken on beat `at`. */
    arc(at, coin) {
      for (const p of [0.25, 0.5, 0.75]) {
        L.coin(at + p, jumpHeight(p) + 0.45, coin);
      }
      add({ type: "target", at, bonus: true });
    },
    /**
     * A power-up at the top of a jump on beat `at` (or on the ground with ground: true).
     * power: { id, model, color, glyph, sign }, and optionally y (its height) and size.
     */
    power(at, power, ground) {
      const y = power.y !== undefined ? power.y : ground ? 0.6 : JUMP_H + 0.45;
      add({ type: "power", beat: ground ? at : at + 0.5, y, power });
      if (!ground) {
        add({ type: "target", at, bonus: true });
      }
    },
    /** A spring: jump from it and the jump lasts two beats, twice as high. */
    spring(at) {
      return add({ type: "spring", at });
    },
    /** Victor's note, high up. */
    note(beat, y) {
      return add({ type: "note", beat, y });
    },
    sign(beat, text, options) {
      return add(Object.assign({ type: "sign", beat, text }, options));
    },
    /** An arch over the track with a big sign: the start of a part. */
    arch(beat, text, options) {
      return add(Object.assign({ type: "arch", beat, text }, options));
    },
    checkpoint(at) {
      return add({ type: "checkpoint", at });
    },
    zone(at, color) {
      return add({ type: "zone", at, color });
    },
    music(at, section) {
      return add({ type: "music", at, section });
    },
    /** From that bar on, the song plays faster: pace 1.1 is the tempo of the song plus 10 %. */
    tempo(at, pace) {
      return add({ type: "tempo", at, pace });
    },
    /** A manual action: a button to bump before a barrier on beat `at` (a bar). */
    manual(at, def) {
      return add(Object.assign({ type: "manual", at }, def));
    },
    /** A choice at a barrier on beat `at` (a bar): rounds of options lit one per beat. */
    choice(at, def) {
      return add(Object.assign({ type: "choice", at }, def));
    },
    script(at, run) {
      return add({ type: "script", at, run });
    },
    fog(from, to) {
      return add({ type: "fog", from, to });
    },
    soft(from, to) {
      return add({ type: "soft", from, to });
    },
    end(at, def) {
      return add(Object.assign({ type: "end", at }, def));
    },
    /**
     * One bar, a character per beat: x a block, X a block with coins above,
     * g a gap, G a gap with coins above, o coins on an arc (a jump for fun),
     * - a coin on the ground, = two coins on the ground, s a spring, . nothing.
     */
    riff(bar, pattern, o) {
      [...pattern].forEach((ch, i) => {
        const at = bar * 4 + i;
        if (ch === "x" || ch === "X") {
          L.block(at, o.block);
        }
        if (ch === "g" || ch === "G") {
          L.gap(at, o.gap || o.block);
        }
        if (ch === "X" || ch === "G" || ch === "o") {
          L.arc(at, o.coin);
        }
        if (ch === "-" || ch === "=") {
          L.coin(at, 0.55, o.coin);
        }
        if (ch === "=") {
          L.coin(at + 0.5, 0.55, o.coin);
        }
        if (ch === "s") {
          L.spring(at);
        }
      });
    }
  };
  return L;
}

/** Height of a normal jump, at a phase of it from 0 (take-off) to 1 (landing). */
export function jumpHeight(phase) {
  return 4 * JUMP_H * phase * (1 - phase);
}

function hexOf(css) {
  return parseInt(String(css).replace("#", ""), 16);
}

/* ---------- Playing it ---------- */

/**
 * def: { song, level (from createLevel), palette: [colours of the hills and
 * bars], callbacks: { onPower(power), onCoin(coin), onHit(look), onManual(stop,
 * landed), onChoice(stop, round, option, right), onEnd(), onEndAction(name),
 * onSoftHit(look) } }.
 *
 * A boss that throws the blocks of the level: def.thrower(vector) writes where a
 * thrown block leaves from (blocks added with { thrown: true }), and
 * callbacks.onThrow(look, block) / onLand(look, block) say when it flies and lands.
 */
export function createMusicalRun(ctx, def) {
  const { THREE, root, pig, paint, hud, engine, sound, t } = ctx;
  const camera = ctx.camera;
  // The mode makes the song faster, and the whole run with it: everything here is counted in beats
  const song = Object.assign({}, def.song, { bpm: def.song.bpm * ctx.speed });
  const music = createMusic(sound, song);
  // The tempo climbs (tempo events), so a beat is not always as long: a jump
  // lasts one beat at the tempo of the moment, and so does everything placed on the beat
  const spbNow = () => music.secondsPerBeat;
  const U = UNITS_PER_BEAT;
  const gravity = () => (8 * JUMP_H) / (spbNow() * spbNow());
  const jumpSpeed = () => (4 * JUMP_H) / spbNow();
  const pace = () => music.bpm / song.bpm;
  // Faster means a beat is shorter: the hit boxes and the edges of the gaps
  // forgive more, so the windows to jump stay as long in seconds
  const forgiveness = () => Math.max(0.7, 1 - 0.6 * (pace() - 1));
  const calls = def.callbacks || {};
  const shadows = engine.settings.shadows;
  const own = [];
  const keep = (thing) => {
    own.push(thing);
    return thing;
  };
  const events = def.level.events.slice().sort((a, b) => key(a) - key(b));
  function key(e) {
    return e.at !== undefined ? e.at : e.beat !== undefined ? e.beat : e.from;
  }
  const endEvent = events.find((e) => e.type === "end");
  const endBeat = endEvent ? endEvent.at : 64;
  const X = (beat) => beat * U;

  /* ---------- Shared pieces ---------- */

  const box = paint.geometry("mu-box", () => new THREE.BoxGeometry(1, 1, 1));
  const coinGeometry = paint.geometry("mu-coin", () => new THREE.CylinderGeometry(0.34, 0.34, 0.08, 20));
  const markerGeometry = paint.geometry("mu-marker", () => new THREE.CircleGeometry(0.42, 24));
  const ringGeometry = paint.geometry("mu-ring", () => new THREE.TorusGeometry(1, 0.07, 8, 40));
  const postGeometry = paint.geometry("mu-post", () => new THREE.CylinderGeometry(0.12, 0.14, 1, 10));
  const springGeometry = paint.geometry("mu-spring", () => new THREE.CylinderGeometry(0.55, 0.65, 0.18, 20));
  const gold = paint.plain(0xffb400, { roughness: 0.3, metalness: 0.3, emissive: 0x402800 });

  /** The front of a block: its colour and a white glyph, square. */
  function faceMaterial(id, css, glyphName) {
    return paint.material("mu-face-" + id + css + glyphName, 128, 128, (c, w, h) => {
      c.fillStyle = css;
      c.fillRect(0, 0, w, h);
      rounded(c, 10, 10, w - 20, h - 20, 18);
      c.lineWidth = 6;
      c.strokeStyle = "rgba(255,255,255,0.85)";
      c.stroke();
      glyph(c, glyphName || "error", w / 2, h / 2, w * 0.62, SLDS.white);
    }, { emissive: 0x222222, roughness: 0.45 });
  }
  const ghostMaterial = keep(new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, depthWrite: false }));

  /* ---------- The track ---------- */

  const zones = events.filter((e) => e.type === "zone");
  const gaps = events.filter((e) => e.type === "gap").map((e) => ({ event: e, from: e.at + GAP_FROM, to: e.at + GAP_TO, look: e.look }));
  const softZones = events.filter((e) => e.type === "soft");
  const fogZones = events.filter((e) => e.type === "fog");
  const zoneColor = (beat) => {
    let color = 0x0176d3;
    for (const z of zones) {
      if (z.at <= beat) {
        color = z.color;
      }
    }
    return color;
  };
  const inGap = (beat) => gaps.some((g) => beat > g.from && beat < g.to);
  const isSoft = (beat) => softZones.some((z) => beat >= z.from && beat < z.to);

  const QUARTER = 0.25;
  const firstQuarter = -24 * 4;
  const lastQuarter = (endBeat + 16) * 4;
  const tiles = [];
  for (let q = firstQuarter; q < lastQuarter; q++) {
    const beat = q * QUARTER + QUARTER / 2;
    if (!inGap(beat)) {
      tiles.push(q);
    }
  }
  const trackMaterial = keep(new THREE.MeshStandardMaterial({ roughness: 0.55, emissive: 0xffffff, emissiveIntensity: 0 }));
  const track = keep(new THREE.InstancedMesh(box, trackMaterial, tiles.length));
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const white = new THREE.Color(0xffffff);
  tiles.forEach((q, i) => {
    const beat = q * QUARTER;
    dummy.position.set(X(beat + QUARTER / 2), -0.5, 0);
    dummy.scale.set(U * QUARTER * 0.985, 1, 3.2);
    dummy.updateMatrix();
    track.setMatrixAt(i, dummy.matrix);
    color.setHex(zoneColor(beat));
    const inBeat = ((q % 4) + 4) % 4;
    const inBar = ((q % 16) + 16) % 16;
    // Light tiles with a stronger stripe on each beat, and white on each bar
    if (inBar === 0) {
      color.copy(white);
    } else if (inBeat === 0) {
      color.lerp(white, 0.15);
    } else {
      color.lerp(white, 0.62);
    }
    track.setColorAt(i, color);
  });
  track.receiveShadow = true;
  root.add(track);
  const base = new THREE.Mesh(box, paint.plain(0x0b5cab, { roughness: 0.8, emissive: 0x041a33 }));
  // Deep enough that a tall phone screen never sees under it
  base.scale.set(X(lastQuarter * QUARTER - firstQuarter * QUARTER), 16, 3.4);
  base.position.set(X((lastQuarter * QUARTER + firstQuarter * QUARTER) / 2), -9.05, 0);
  root.add(base);

  /* ---------- The scenery: hills, clouds and an equalizer that dances ---------- */

  const palette = (def.palette || [0x06a59a, 0x9050e9, 0x2e844a, 0xfe9339, 0x1b96ff, 0xe3066a]).slice();
  const sphere = paint.geometry("mu-sphere", () => new THREE.SphereGeometry(1, 18, 12));
  const length = X(endBeat + 40) + 60;
  const hillCount = Math.ceil(length / 16);
  const hills = keep(new THREE.InstancedMesh(sphere, keep(new THREE.MeshStandardMaterial({ roughness: 0.9 })), hillCount * 2));
  for (let i = 0; i < hillCount * 2; i++) {
    const far = i % 2 === 1;
    const r = (far ? 14 : 8) + ((i * 37) % 7);
    dummy.position.set(-60 + Math.floor(i / 2) * 16 + (far ? 8 : 0), -3 - (far ? 2 : 0), far ? -46 : -26);
    dummy.scale.set(r * 1.3, r * (far ? 0.55 : 0.5), r * 0.6);
    dummy.updateMatrix();
    hills.setMatrixAt(i, dummy.matrix);
    color.setHex(palette[i % palette.length]).lerp(white, far ? 0.35 : 0.1);
    hills.setColorAt(i, color);
  }
  root.add(hills);
  const cloudCount = Math.ceil(length / 24);
  const clouds = keep(new THREE.InstancedMesh(sphere, keep(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.35 })), cloudCount));
  for (let i = 0; i < cloudCount; i++) {
    dummy.position.set(-50 + i * 24 + ((i * 13) % 9), 10 + ((i * 7) % 5), -34);
    dummy.scale.set(4 + (i % 3), 1.3, 1.5);
    dummy.updateMatrix();
    clouds.setMatrixAt(i, dummy.matrix);
  }
  root.add(clouds);
  // The equalizer: groups of three bars behind the track, on the beat
  const EQ_GAP = 4.5;
  const eqGroups = Math.ceil(length / EQ_GAP);
  const eq = keep(new THREE.InstancedMesh(box, keep(new THREE.MeshStandardMaterial({ roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 0.12 })), eqGroups * 3));
  eq.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < eqGroups * 3; i++) {
    color.setHex(palette[Math.floor(i / 3) % palette.length]);
    eq.setColorAt(i, color);
    const h = 1.6 + (i % 3) * 0.4;
    dummy.position.set(-60 + Math.floor(i / 3) * EQ_GAP + (i % 3) * 1.05, h / 2 - 0.2, -8);
    dummy.scale.set(0.85, h, 0.85);
    dummy.updateMatrix();
    eq.setMatrixAt(i, dummy.matrix);
  }
  root.add(eq);

  /* ---------- Kenney models: one InstancedMesh per mesh of a model ---------- */

  const models = ctx.models || null;
  const matrix = new THREE.Matrix4();
  const scratch = new THREE.Vector3();
  const holder = new THREE.Object3D();
  /** Many copies of a model, drawn as one InstancedMesh per mesh of it; null without the model. */
  function instanced(name, options, count, tune) {
    const copy = models && count > 0 ? models.get(name, options) : null;
    if (!copy) {
      return null;
    }
    copy.updateMatrixWorld(true);
    const parts = [];
    copy.traverse((child) => {
      if (!child.isMesh) {
        return;
      }
      let material = child.material;
      if (tune) {
        material = keep(material.clone());
        tune(material);
      }
      const mesh = keep(new THREE.InstancedMesh(child.geometry, material, count));
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.castShadow = options.shadows !== false && shadows;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      root.add(mesh);
      parts.push({ mesh, local: child.matrixWorld.clone() });
    });
    if (!parts.length) {
      return null;
    }
    return {
      dirty: false,
      set(i, x, y, z, scale, turn, stretch) {
        holder.position.set(x, y, z);
        holder.rotation.set(0, turn || 0, 0);
        holder.scale.set(scale, scale * (stretch || 1), scale);
        holder.updateMatrix();
        for (const part of parts) {
          matrix.multiplyMatrices(holder.matrix, part.local);
          part.mesh.setMatrixAt(i, matrix);
        }
        this.dirty = true;
      },
      commit() {
        if (this.dirty) {
          this.dirty = false;
          for (const part of parts) {
            part.mesh.instanceMatrix.needsUpdate = true;
          }
        }
      }
    };
  }
  // Flat coloured models (the nature and space packs) are baked into one geometry
  // with vertex colours and drawn with this one material: one shader for all of
  // them, which keeps the warm-up short on a software renderer, and one draw call
  // per model instead of one per part
  const bakedMaterial = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }));
  const black = new THREE.Color(0x000000);
  // Pickups glow: their own colour, pushed above 1 so the bloom of the high tier catches it
  const glowMaterial = (() => {
    const TSL = THREE.TSL;
    if (THREE.MeshStandardNodeMaterial && TSL && TSL.vertexColor) {
      const m = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.35 });
      m.emissiveNode = TSL.vertexColor().mul(0.65);
      return keep(m);
    }
    return keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, emissive: 0x333333 }));
  })();
  const bakedGeometries = new Map();
  function bakedGeometry(name, options) {
    const key = name + JSON.stringify(options);
    if (bakedGeometries.has(key)) {
      return bakedGeometries.get(key);
    }
    const copy = models ? models.get(name, options) : null;
    if (!copy) {
      return null;
    }
    copy.updateMatrixWorld(true);
    const positions = [];
    const normals = [];
    const colors = [];
    let textured = false;
    copy.traverse((child) => {
      if (!child.isMesh) {
        return;
      }
      const material = Array.isArray(child.material) ? child.material[0] : child.material;
      textured = textured || Boolean(material.map);
      const geometry = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone();
      geometry.applyMatrix4(child.matrixWorld);
      if (!geometry.attributes.normal) {
        geometry.computeVertexNormals();
      }
      const p = geometry.attributes.position;
      const n = geometry.attributes.normal;
      const c = material.color || white;
      const e = material.emissive || black;
      const r = Math.min(1, c.r + e.r);
      const g = Math.min(1, c.g + e.g);
      const b = Math.min(1, c.b + e.b);
      for (let i = 0; i < p.count; i++) {
        positions.push(p.getX(i), p.getY(i), p.getZ(i));
        normals.push(n.getX(i), n.getY(i), n.getZ(i));
        colors.push(r, g, b);
      }
      geometry.dispose();
    });
    if (textured || !positions.length) {
      bakedGeometries.set(key, null);
      return null;
    }
    const merged = keep(new THREE.BufferGeometry());
    merged.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    merged.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    merged.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    merged.computeBoundingSphere();
    bakedGeometries.set(key, merged);
    return merged;
  }
  /** Many copies of a flat coloured model as one InstancedMesh; falls back on instanced() for a textured one. */
  function baked(name, options, count, material) {
    const geometry = count > 0 ? bakedGeometry(name, options) : null;
    if (!geometry) {
      return instanced(name, options, count);
    }
    const mesh = keep(new THREE.InstancedMesh(geometry, material || bakedMaterial, count));
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = options.shadows !== false && shadows;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    return {
      mesh,
      dirty: false,
      set(i, x, y, z, scale, turn, stretch) {
        holder.position.set(x, y, z);
        holder.rotation.set(0, turn || 0, 0);
        holder.scale.set(scale, scale * (stretch || 1), scale);
        holder.updateMatrix();
        mesh.setMatrixAt(i, holder.matrix);
        this.dirty = true;
      },
      commit() {
        if (this.dirty) {
          this.dirty = false;
          mesh.instanceMatrix.needsUpdate = true;
        }
      }
    };
  }
  /**
   * A pool of copies of a flat coloured model, as one InstancedMesh that only
   * holds the copies near the camera: begin(), add() each copy in view, end().
   * The track is long; drawing only what is near keeps a software renderer fast.
   */
  function pool(name, options, capacity, material) {
    const geometry = capacity > 0 ? bakedGeometry(name, options) : null;
    if (!geometry) {
      return null;
    }
    const mesh = keep(new THREE.InstancedMesh(geometry, material || bakedMaterial, capacity));
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.count = 0;
    root.add(mesh);
    let used = 0;
    return {
      mesh,
      begin() {
        used = 0;
      },
      add(x, y, z, scale, turn, stretch) {
        if (used >= capacity) {
          return;
        }
        holder.position.set(x, y, z);
        holder.rotation.set(0, turn || 0, 0);
        holder.scale.set(scale, scale * (stretch || 1), scale);
        holder.updateMatrix();
        mesh.setMatrixAt(used, holder.matrix);
        used += 1;
      },
      end() {
        mesh.count = used;
        mesh.instanceMatrix.needsUpdate = true;
      }
    };
  }
  /** A single copy of a model, or null. */
  function single(name, options) {
    const copy = models ? models.get(name, options) : null;
    if (copy) {
      root.add(copy);
    }
    return copy;
  }

  // A lawn behind the track, for the trees and the props to stand on
  const lawn = new THREE.Mesh(box, paint.plain(def.lawn || 0xbdeccb, { roughness: 1 }));
  lawn.scale.set(length + 60, 0.2, 13);
  lawn.position.set(length / 2 - 60, -0.12, -8.2);
  lawn.receiveShadow = true;
  root.add(lawn);

  // The scenery: rows of trees, bushes and props behind the track, bouncing on the beat
  const scenery = [];
  // One glowing pool per model, shared by the coins and the power-ups that use it
  const glowPools = new Map();
  const COIN_H = 0.62;
  function glowPool(name) {
    if (!glowPools.has(name)) {
      glowPools.set(name, pool(name, { height: COIN_H, shadows: false }, 44, glowMaterial));
    }
    return glowPools.get(name);
  }
  /** The pool of one vegetable: its own colours, glowing a little in its colour, like world 0. */
  function vegPool(veg) {
    const key = "veg:" + veg.model;
    if (!glowPools.has(key)) {
      const material = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, emissive: veg.color, emissiveIntensity: 0.3 }));
      glowPools.set(key, pool(veg.model, { height: VEG_H, shadows: false }, 24, material));
    }
    return glowPools.get(key);
  }
  (def.scenery || []).forEach((layer, l) => {
    const byName = new Map();
    for (let x = -40, i = 0; x < length; x += layer.every, i++) {
      const name = layer.names[(i * 7 + l) % layer.names.length];
      const jitter = ((i * 53 + l * 17) % 10) / 10;
      const list = byName.get(name) || [];
      list.push({ x: x + jitter * layer.every * 0.4, y: (layer.y || 0) + jitter * (layer.rise || 0), z: layer.z - jitter * (layer.depth || 0), s: 1 - jitter * 0.25, turn: (layer.face || 0) + (jitter - 0.5) * (layer.turn === undefined ? 1.2 : layer.turn) });
      byName.set(name, list);
    }
    for (const [name, list] of byName) {
      const capacity = Math.ceil((2 * SCENERY_RANGE) / (layer.every * layer.names.length)) + 3;
      const copies = pool(name, { height: layer.height, shadows: false }, capacity);
      if (copies) {
        scenery.push({ copies, list, bounce: layer.bounce === undefined ? 0.06 : layer.bounce, float: Boolean(layer.y) });
      }
    }
  });

  /* ---------- What is on the track ---------- */

  const blocks = [];
  const coins = [];
  const powers = [];
  const targets = [];
  const signs = [];
  const springs = [];
  const stops = [];
  const checkpoints = [{ at: 0, section: def.song.start || "intro" }];
  const triggers = [];
  const markerNeed = keep(new THREE.MeshBasicMaterial({ color: 0xffd84d, transparent: true, opacity: 0.9, toneMapped: false }));
  const markerBonus = keep(new THREE.MeshBasicMaterial({ color: 0xff7ad9, transparent: true, opacity: 0.75, toneMapped: false }));
  const signSeen = new Set();
  let coinOrder = 0;

  function addSign(text, x, y, options) {
    const o = Object.assign({ height: 0.55 }, options);
    const sprite = paint.sign(o.name || "mu-sign", text, { color: o.color || SLDS.brand, glyph: o.glyph || null, height: o.height });
    sprite.position.set(x, y, o.z === undefined ? 0.6 : o.z);
    const entry = { sprite, base: sprite.scale.clone(), x };
    signs.push(entry);
    root.add(sprite);
    return entry;
  }

  function addTarget(at, bonus, owner) {
    const marker = new THREE.Mesh(markerGeometry, bonus ? markerBonus : markerNeed);
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(X(at), 0.015, 0.75);
    marker.scale.set(1, 0.6, 1);
    root.add(marker);
    const target = { at, bonus, owner, marker, cued: false };
    targets.push(target);
    return target;
  }

  function addCoin(beat, y, coin, hidden) {
    // Its mesh comes later (buildCoins), once every coin of the level is known
    const entry = { beat, y, x: X(beat), coin, mesh: null, slot: null, got: false, missed: false, hidden: Boolean(hidden), order: coinOrder++ };
    coins.push(entry);
    return entry;
  }

  /**
   * The coins as instanced models, one InstancedMesh per model whatever kind of
   * coin uses it; a kind can take a list of models in turn (the components of a
   * package). Without the pack, the painted coins.
   */
  function buildCoins() {
    const counters = new Map();
    const byModel = new Map();
    let vegCount = 0;
    const vegNamed = new Set();
    for (const c of coins) {
      if (c.coin.vegetable) {
        // A short row of one kind, then the next kind; the first of each kind carries its name
        const veg = VEGETABLES[Math.floor(vegCount / VEG_ROW) % VEGETABLES.length];
        vegCount += 1;
        c.veg = veg;
        c.pool = vegPool(veg);
        if (!c.pool) {
          const face = paint.coin("mu-coin-" + c.coin.id, c.coin.color, c.coin.glyph || "star", "");
          c.mesh = new THREE.Mesh(coinGeometry, [gold, face, face]);
          c.mesh.rotation.order = "YXZ";
          c.mesh.rotation.x = Math.PI / 2;
          c.mesh.position.set(c.x, c.y, 0);
          root.add(c.mesh);
          showCoin(c, !c.hidden, 0, 0);
        }
        if (!c.hidden && !vegNamed.has(veg.key)) {
          vegNamed.add(veg.key);
          c.sign = addSign(t("mu_veg_" + veg.key), c.x, c.y + 0.85, { color: "#" + veg.color.toString(16).padStart(6, "0"), height: 0.4, name: "mu-veg", z: 0.2 });
        }
        continue;
      }
      const wanted = (def.coinModels && def.coinModels[c.coin.id]) || "coin-gold";
      const names = Array.isArray(wanted) ? wanted : [wanted];
      const n = counters.get(c.coin.id) || 0;
      counters.set(c.coin.id, n + 1);
      const name = names[n % names.length];
      const list = byModel.get(name) || [];
      list.push(c);
      byModel.set(name, list);
    }
    for (const [name, list] of byModel) {
      // At most this many of one model are ever near the camera at once
      const copies = glowPool(name);
      for (const c of list) {
        if (copies) {
          c.pool = copies;
        } else {
          const face = paint.coin("mu-coin-" + c.coin.id, c.coin.color, c.coin.glyph || "star", "");
          c.mesh = new THREE.Mesh(coinGeometry, [gold, face, face]);
          c.mesh.rotation.order = "YXZ";
          c.mesh.rotation.x = Math.PI / 2;
          c.mesh.position.set(c.x, c.y, 0);
          root.add(c.mesh);
          showCoin(c, !c.hidden, 0, 0);
        }
      }
    }
  }

  function showCoin(c, on, time, pulse) {
    if (c.veg) {
      // A vegetable spins, as in world 0
      if (c.pool) {
        if (on) {
          c.pool.add(c.x, c.y - VEG_H / 2 + pulse * 0.05, 0, 1 + pulse * 0.15, time * 2.2 + c.order);
        }
      } else {
        c.mesh.visible = on;
        c.mesh.rotation.y = time * 2.2 + c.order;
      }
      return;
    }
    const turn = Math.sin(time * 3 + c.order) * 0.6;
    if (c.mesh) {
      c.mesh.visible = on;
      c.mesh.rotation.y = turn;
      c.mesh.scale.setScalar(1 + pulse * 0.18);
    } else if (c.pool && on) {
      c.pool.add(c.x, c.y - 0.31 + pulse * 0.05, 0, 1 + pulse * 0.18, ITEM_FACE + turn);
    }
  }

  for (const e of events) {
    switch (e.type) {
      case "block": {
        const look = e.look;
        const h = look.h || 0.95;
        // One material, the glyph tile on every face: one render object per block, not six
        const normal = faceMaterial(look.id, look.color, look.glyph);
        const mesh = new THREE.Mesh(box, look.hidden ? ghostMaterial : normal);
        mesh.scale.set(BLOCK_W, h, 1.1);
        mesh.position.set(X(e.at + 0.5), h / 2, 0);
        mesh.castShadow = shadows;
        root.add(mesh);
        const block = { event: e, look, h, x: X(e.at + 0.5), mesh, normal, dead: false, hidden: Boolean(look.hidden), squash: 0, sign: null, convert: null, popped: 0 };
        if (look.sign && (look.signEvery || !signSeen.has(look.id))) {
          signSeen.add(look.id);
          block.sign = addSign(look.sign, block.x, h + 0.55, Object.assign({ color: look.color, glyph: look.glyph, name: "mu-block" }, look.signHeight ? { height: look.signHeight } : null));
          block.sign.sprite.visible = !block.hidden;
          // A long label can hang towards the guinea pig, where a phone has room for it
          // (moved, not anchored: the sprites of the WebGPU renderer keep their centre)
          if (look.signAnchor) {
            block.signShift = look.signAnchor - 0.5;
            block.sign.sprite.position.x = block.x - block.signShift * block.sign.sprite.scale.x;
          }
        }
        if (e.convert) {
          block.convert = addCoin(e.at + 0.5, 0.55, e.convert, true);
        }
        if (e.thrown) {
          // Out of sight until it leaves the thrower's hand (flyThrown)
          block.thrown = { state: "held", from: new THREE.Vector3() };
          mesh.visible = false;
          if (block.sign) {
            block.sign.sprite.visible = false;
          }
        }
        block.target = addTarget(e.at, false, block);
        block.target.marker.visible = !block.hidden;
        blocks.push(block);
        break;
      }
      case "gap": {
        const gap = gaps.find((g) => g.event === e);
        gap.target = addTarget(e.at, false, gap);
        if (e.look && e.look.sign && !signSeen.has("gap-" + e.look.id)) {
          signSeen.add("gap-" + e.look.id);
          addSign(e.look.sign, X(e.at + 0.5), -0.55, { color: e.look.color, glyph: e.look.glyph, name: "mu-gap", z: 1.75 });
        }
        break;
      }
      case "target":
        if (!targets.some((x) => Math.abs(x.at - e.at) < 0.01)) {
          addTarget(e.at, e.bonus, null);
        }
        break;
      case "coin":
        addCoin(e.beat, e.y, e.coin, false);
        break;
      case "power": {
        const p = e.power;
        const copies = p.model ? glowPool(p.model) : null;
        let mesh = null;
        if (!copies) {
          const face = paint.coin("mu-power-" + p.id, p.color, p.glyph || "bolt", "");
          mesh = new THREE.Mesh(coinGeometry, [gold, face, face]);
          mesh.rotation.order = "YXZ";
          mesh.rotation.x = Math.PI / 2;
          mesh.scale.setScalar(1.7);
          mesh.position.set(X(e.beat), e.y, 0);
          root.add(mesh);
        }
        const entry = { beat: e.beat, x: X(e.beat), y: e.y, power: p, mesh, pool: copies, size: p.size || 1.05, got: false, sign: null };
        if (p.sign) {
          entry.sign = addSign(p.sign, X(e.beat), e.y + entry.size, { color: p.color, glyph: p.glyph, name: "mu-power" });
        }
        powers.push(entry);
        break;
      }
      case "note": {
        const copies = glowPool("note");
        if (copies) {
          powers.push({ beat: e.beat, x: X(e.beat), y: e.y, power: { id: "note", note: true }, mesh: null, pool: copies, size: 0.9, got: false, sign: null });
          break;
        }
        const mesh = new THREE.Mesh(box, [paint.plain(0xf2c94c), paint.plain(0xf2c94c), paint.plain(0xf2c94c), paint.plain(0xf2c94c), faceMaterial("note", "#F2C94C", "note"), paint.plain(0xf2c94c)]);
        mesh.scale.set(0.7, 0.7, 0.08);
        mesh.position.set(X(e.beat), e.y, 0);
        root.add(mesh);
        powers.push({ beat: e.beat, x: X(e.beat), y: e.y, power: { id: "note", note: true }, mesh, got: false, sign: null });
        break;
      }
      case "spring": {
        let mesh = single("spring", { width: 1.2 });
        if (mesh) {
          mesh.position.set(X(e.at), 0, 0);
        } else {
          mesh = new THREE.Mesh(springGeometry, paint.plain(0xe3066a, { roughness: 0.3, emissive: 0x330018 }));
          mesh.position.set(X(e.at), 0.09, 0);
          root.add(mesh);
        }
        springs.push({ at: e.at, mesh, base: mesh.scale.clone() });
        addTarget(e.at, true, null);
        break;
      }
      case "sign":
        addSign(e.text, X(e.beat), e.y || 2.2, { color: e.color, glyph: e.glyph, height: e.height || 0.6, z: e.z === undefined ? -1.2 : e.z, name: "mu-free" });
        break;
      case "arch": {
        const postMaterial = paint.plain(hexOf(e.color || SLDS.brand), { roughness: 0.4 });
        for (const z of [-1.55, 1.55]) {
          const post = new THREE.Mesh(postGeometry, postMaterial);
          post.scale.y = 3.6;
          post.position.set(X(e.beat), 1.8, z);
          root.add(post);
        }
        const bar = new THREE.Mesh(box, postMaterial);
        bar.scale.set(0.3, 0.3, 3.4);
        bar.position.set(X(e.beat), 3.6, 0);
        root.add(bar);
        addSign(e.text, X(e.beat), 4.25, { color: e.color, glyph: e.glyph, height: 0.75, z: 0, name: "mu-arch" });
        break;
      }
      case "checkpoint": {
        // With a model of the world's choice, every checkpoint is drawn by one InstancedMesh (buildCheckpoints)
        if (def.checkpointModel && bakedGeometry(def.checkpointModel, { height: 1.1 })) {
          checkpoints.push({ at: e.at, passed: false, wave: 0, slot: true });
          break;
        }
        const model = single("flag", { height: 1.9 });
        if (model) {
          model.position.set(X(e.at), 0, -1.3);
          checkpoints.push({ at: e.at, flag: model, base: model.scale.clone(), passed: false, wave: 0 });
          break;
        }
        const flag = new THREE.Mesh(postGeometry, paint.plain(0xffffff));
        flag.scale.set(0.6, 1.6, 0.6);
        flag.position.set(X(e.at), 0.8, -1.3);
        root.add(flag);
        const cloth = new THREE.Mesh(box, paint.plain(0xc9c9c9, { emissive: 0x111111 }));
        cloth.scale.set(0.7, 0.42, 0.05);
        cloth.position.set(X(e.at) + 0.38, 1.4, -1.3);
        root.add(cloth);
        checkpoints.push({ at: e.at, cloth, passed: false });
        break;
      }
      case "manual":
      case "choice":
        stops.push(buildStop(e));
        break;
      case "music":
      case "script":
      case "tempo":
        triggers.push({ event: e, done: false });
        break;
      default:
        break;
    }
  }
  checkpoints.sort((a, b) => a.at - b.at);
  // The section each checkpoint starts with
  for (const cp of checkpoints) {
    let section = def.song.start || "intro";
    for (const e of events) {
      if (e.type === "music" && e.at <= cp.at) {
        section = e.section;
      }
    }
    cp.section = section;
  }
  targets.sort((a, b) => a.at - b.at);
  buildCoins();
  const marks = checkpoints.filter((cp) => cp.slot);
  const checkMarks = marks.length ? baked(def.checkpointModel, { height: 1.1, shadows: false }, marks.length) : null;
  if (checkMarks && checkMarks.mesh) {
    root.add(checkMarks.mesh);
  }
  marks.forEach((cp, i) => {
    cp.slot = checkMarks ? i : null;
    if (checkMarks) {
      checkMarks.set(i, X(cp.at), 0.9, -1.3, 1, ITEM_FACE);
    }
  });
  if (checkMarks) {
    checkMarks.commit();
  }
  // Spikes at the bottom of every gap: what a fall lands on
  const pits = def.pitModel ? baked(def.pitModel, { height: 0.8, shadows: false }, gaps.length) : null;
  if (pits) {
    if (pits.mesh) {
      root.add(pits.mesh);
    }
    gaps.forEach((g, i) => pits.set(i, X((g.from + g.to) / 2), -1.05, 0, 1, ITEM_FACE));
    pits.commit();
  }

  /** A barrier across the track, and what opens it. */
  function buildStop(e) {
    const isManual = e.type === "manual";
    const wallColor = isManual ? "#FE9339" : "#EA001E";
    const wall = new THREE.Mesh(box, faceMaterial(isManual ? "wall-manual" : "wall-choice", wallColor, isManual ? "warning" : "error"));
    wall.scale.set(0.5, 2.6, 2.6);
    wall.position.set(X(e.at) + 0.9, 1.3, 0);
    wall.castShadow = shadows;
    root.add(wall);
    const stop = { event: e, at: e.at, type: e.type, wall, done: false, open: 0, sign: null, button: null, round: 0 };
    stop.sign = addSign(e.header, X(e.at) + 0.9, 3.25, { color: wallColor, glyph: isManual ? "warning" : "error", name: "mu-stop", height: 0.6, z: 1.5 });
    if (isManual) {
      // The button hangs over the track before the barrier: bump it on the way
      const bx = X(e.at - 1.5);
      const button = new THREE.Mesh(box, faceMaterial("button", "#0176D3", "check"));
      button.scale.set(2.2, 0.55, 1.3);
      button.position.set(bx, 1.75, 0);
      button.castShadow = shadows;
      root.add(button);
      stop.button = { mesh: button, x: bx, y: 1.75, home: { x: bx, y: 1.75 }, squash: 0 };
      stop.buttonSign = addSign(e.button, bx, 2.65, { color: SLDS.brand, glyph: "check", name: "mu-button", height: 0.55, z: 0.9 });
      stop.target = addTarget(e.at - 2, false, stop);
    }
    return stop;
  }

  /* ---------- Rings, fog, the end ---------- */

  const rings = [0, 1, 2].map(() => {
    const material = keep(new THREE.MeshBasicMaterial({ color: 0xffd84d, transparent: true, opacity: 0, toneMapped: false, depthWrite: false }));
    const mesh = new THREE.Mesh(ringGeometry, material);
    mesh.visible = false;
    mesh.renderOrder = 3;
    root.add(mesh);
    return { mesh, material };
  });

  const fogTexture = paint.texture("mu-fog", 256, 128, (c, w, h) => {
    for (let i = 0; i < 9; i++) {
      const x = (i * 71) % w;
      const y = h * 0.3 + ((i * 37) % (h * 0.5));
      const r = 40 + ((i * 23) % 40);
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(236,228,255,0.95)");
      g.addColorStop(1, "rgba(236,228,255,0)");
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    }
  });
  const fogMaterial = keep(new THREE.MeshBasicMaterial({ map: fogTexture, color: 0xc9bfe8, transparent: true, opacity: 0, depthWrite: false }));
  const fogPlane = paint.geometry("mu-fog-plane", () => new THREE.PlaneGeometry(1, 1));
  const fogs = [0, 1, 2].map((i) => {
    const mesh = new THREE.Mesh(fogPlane, fogMaterial);
    mesh.scale.set(34, 7, 1);
    mesh.position.set(0, 1.2 + i * 0.9, 2.2 + i * 0.3);
    mesh.visible = false;
    mesh.renderOrder = 4;
    root.add(mesh);
    return mesh;
  });

  // The finish: models stacked (a rocket, a hangar...), or a white block without the pack
  const finish = new THREE.Group();
  finish.position.set(X(endBeat) + 3.6, 0, -1);
  root.add(finish);
  let finishTop = 0;
  const finishParts = (def.finish || []).map((part) => {
    const options = part.width ? { width: part.width } : { height: part.height };
    const geometry = bakedGeometry(part.name, options);
    if (geometry) {
      const mesh = new THREE.Mesh(geometry, bakedMaterial);
      mesh.castShadow = shadows;
      return mesh;
    }
    return models ? models.get(part.name, options) : null;
  });
  if (finishParts.length && finishParts.every(Boolean)) {
    def.finish.forEach((part, i) => {
      const model = finishParts[i];
      model.position.set(part.x || 0, part.stack ? finishTop : part.y || 0, part.z || 0);
      if (part.turn !== undefined) {
        model.rotation.y = part.turn;
      } else if (model.isMesh) {
        model.rotation.y = ITEM_FACE;
      }
      if (part.stack) {
        finishTop += new THREE.Box3().setFromObject(model).getSize(scratch).y;
      }
      finish.add(model);
    });
  } else if (endEvent) {
    finishTop = 3.4;
    const home = new THREE.Mesh(box, [paint.plain(0xffffff), paint.plain(0xffffff), paint.plain(0x1b96ff), paint.plain(0xffffff), faceMaterial("end", endEvent.color || SLDS.brand, endEvent.glyph || "cloud"), paint.plain(0xffffff)]);
    home.scale.set(3.4, 3.4, 3);
    home.position.set(0, 1.7, 0);
    home.castShadow = shadows;
    finish.add(home);
  }
  // The finish line: an item that stays when the finish takes off (the Cloudity logo)
  if (def.finishLine) {
    const geometry = bakedGeometry(def.finishLine.name, { height: def.finishLine.height || 1.4 });
    if (geometry) {
      // An arch over the finish line, the logo standing on it
      const at = X(endBeat) - 2.2;
      const archMaterial = paint.plain(0x032d60, { roughness: 0.4 });
      for (const z of [-1.55, 1.55]) {
        const post = new THREE.Mesh(postGeometry, archMaterial);
        post.scale.y = 3.6;
        post.position.set(at, 1.8, z);
        root.add(post);
      }
      const bar = new THREE.Mesh(box, archMaterial);
      bar.scale.set(0.3, 0.3, 3.4);
      bar.position.set(at, 3.6, 0);
      root.add(bar);
      const line = new THREE.Mesh(geometry, glowMaterial);
      line.rotation.y = ITEM_FACE;
      line.position.set(at, 3.75, 0);
      root.add(line);
    }
  }
  // The reward of a badge world, hidden until the world is done (celebrate())
  let reward = null;
  if (def.reward) {
    const geometry = bakedGeometry(def.reward.name, { height: def.reward.height || 1.6 });
    if (geometry) {
      reward = new THREE.Mesh(geometry, glowMaterial);
      reward.rotation.y = ITEM_FACE;
      reward.position.set(X(endBeat) + (def.reward.x || 0), def.reward.y || 2.6, def.reward.z || 0.6);
      reward.scale.setScalar(0.001);
      root.add(reward);
    }
  }
  if (endEvent) {
    if (endEvent.text) {
      addSign(endEvent.text, X(endEvent.at) + 3.6, Math.max(4.2, finishTop + 0.9), { color: endEvent.color || SLDS.brand, glyph: endEvent.glyph || "cloud", height: 0.75, z: 1.4, name: "mu-end" });
    }
  }

  /* ---------- The run ---------- */

  // The paces of the tempo events, and the pace a beat of the run is played at
  const paces = Array.from(new Set(events.filter((e) => e.type === "tempo").map((e) => e.pace).concat([1]))).sort((a, b) => a - b);
  function paceAt(beat) {
    let value = 1;
    for (const e of events) {
      if (e.type === "tempo" && e.at <= beat) {
        value = e.pace;
      }
    }
    return value;
  }
  const run = { pace: 1, mercyUntil: -1, mode: "ready", offset: 0, beat: 0, prev: 0, stop: null, resumeAt: 0, rewindUntil: 0, rewindFrom: 0, cp: checkpoints[0], inv: 0, section: def.song.start || "intro", choiceStart: 0, lit: -1 };
  const player = { y: 0, vy: 0, grounded: true, coyote: 0, buffer: 0, floaty: false, squash: 0, jumps: 0, wobble: 0, pressBeat: -10 };
  const stats = { coins: coins.filter((c) => !c.hidden).length, got: 0, hits: 0, perfect: 0, streak: 0, best: 0, vegetables: 0, vegTotal: coins.filter((c) => c.veg && !c.hidden).length };
  // The vegetables eaten so far, beside the goal; the kinds already named in a toast
  const vegEaten = new Set();
  let vegCard = null;
  if (stats.vegTotal) {
    vegCard = document.createElement("span");
    vegCard.className = "gr-mu-veg";
    hud.extra.appendChild(vegCard);
  }
  let camX = 0;
  let camY = 2;
  let shake = 0;
  let launchAt = null;
  let rewardAt = null;
  let frames = 0;
  let presses = 0;
  // The next target written by the last step, and the last one the autoplay jumped for
  let jumpAt = NaN;
  let autoDone = -1;
  const frustum = new THREE.Frustum();
  const viewProjection = new THREE.Matrix4();
  const sphere3 = new THREE.Sphere();
  const runAnimSpeed = () => Math.max(0, ((STRIDES_PER_BEAT * RUN_CLIP_S) / spbNow() - 0.7) / 0.06);
  let lookUp = 0;
  let lastCoach = -10;
  let lastPortrait = null;
  let choiceUi = null;
  let hopBeat = -1;
  const data = {};

  function setData(name, value) {
    const v = String(value);
    if (data[name] !== v) {
      data[name] = v;
      ctx.setData(name, v);
    }
  }

  function coach(text, ms, force) {
    if (!text || (!force && engine.time - lastCoach < COACH_GAP_S)) {
      return;
    }
    lastCoach = engine.time;
    hud.coach(text, ms);
  }

  /** Where the guinea pig can stand at a run beat, from a height: the top, or null over a gap. */
  function surface(beat, fromY) {
    if (fromY < -0.3) {
      return null;
    }
    const foot = (FOOT * pace()) / U;
    if (inGap(beat) && inGap(beat - foot) && inGap(beat + foot)) {
      return null;
    }
    return 0;
  }

  function jump() {
    const onSpring = player.grounded && springs.some((s) => Math.abs(s.at - run.beat) < 0.38);
    player.vy = jumpSpeed();
    player.floaty = onSpring;
    player.grounded = false;
    player.coyote = 0;
    player.buffer = 0;
    player.jumps += 1;
    music.hop();
    if (onSpring) {
      sound.play("power");
      sound.play("wheek");
      ctx.fx.burst(pig.object.position.x, 0.3, 0, { count: 18, colors: [0xe3066a, 0xff7ad9, 0xffd84d], speed: 3, up: 4, life: 0.8 });
    } else if (player.jumps % 4 === 1) {
      sound.play("wheek");
    }
    // Right on the beat of a jump that mattered: a sparkle and a few points
    const target = targets.find((x) => !x.bonus && Math.abs(x.at - run.beat) < PERFECT_BEAT);
    if (target && run.mode === "run") {
      stats.perfect += 1;
      ctx.points(5);
      ctx.fx.burst(pig.object.position.x, 0.2, 0.3, { count: 6, colors: [0xffd84d, 0xffffff], speed: 1.6, up: 2, life: 0.5 });
    }
  }

  function stepPlayer(dt) {
    const canMove = run.mode === "run" || run.mode === "stop" || run.mode === "resume" || run.mode === "end";
    if (!canMove) {
      return;
    }
    if (player.grounded) {
      const top = run.mode === "run" ? surface(run.beat, player.y) : 0;
      if (top === null) {
        player.grounded = false;
        player.coyote = COYOTE_S;
        player.vy = 0;
      } else {
        player.y = top;
      }
    }
    if (player.buffer > 0 && (player.grounded || player.coyote > 0)) {
      jump();
    }
    if (!player.grounded) {
      const fromY = player.y;
      player.vy -= (player.floaty ? gravity() / 2 : gravity()) * dt;
      player.y += player.vy * dt;
      const top = run.mode === "run" ? surface(run.beat, fromY) : 0;
      if (player.vy <= 0 && top !== null && player.y <= top) {
        player.y = top;
        player.vy = 0;
        player.grounded = true;
        player.floaty = false;
        player.squash = 1;
      }
    }
    player.coyote = Math.max(0, player.coyote - dt);
    player.buffer = Math.max(0, player.buffer - dt);
  }

  /* ---------- Touching things ---------- */

  function collide() {
    const x = X(run.beat);
    const y = player.y;
    if (run.inv <= 0) {
      for (const b of blocks) {
        if (b.dead || Math.abs(b.x - x) > (PIG_HALF + BLOCK_W * 0.4) * forgiveness()) {
          continue;
        }
        if (y < b.h && y + PIG_TALL > 0) {
          if (player.vy < 0 && y > b.h - 0.35) {
            // Landing on top of a block is not a mistake: a bounce
            player.vy = jumpSpeed() * 0.55;
            player.y = b.h;
            b.squash = 1;
            ctx.points(5);
            ctx.fx.burst(b.x, b.h, 0, { count: 8, speed: 2, up: 2, life: 0.6 });
          } else {
            hit(b.look, b);
            return;
          }
        }
      }
      if (!player.grounded && y < -0.75 && inGap(run.beat)) {
        const gap = gaps.find((g) => run.beat > g.from - 0.2 && run.beat < g.to + 0.2);
        hit(gap ? gap.look : null, null);
        return;
      }
    }
    for (const c of coins) {
      if (c.got || c.hidden) {
        continue;
      }
      if (Math.abs(c.x - x) < 0.55 && Math.abs(c.y - (y + 0.45)) < 0.8) {
        collectCoin(c);
      } else if (!c.missed && c.x < x - 1.2) {
        c.missed = true;
        stats.streak = 0;
      }
    }
    for (const p of powers) {
      if (!p.got && Math.abs(p.x - x) < 0.8 && Math.abs(p.y - (y + 0.45)) < 1.0) {
        p.got = true;
        if (p.mesh) {
          p.mesh.visible = false;
        }
        if (p.sign) {
          p.sign.sprite.visible = false;
        }
        ctx.fx.burst(p.x, p.y, 0, { count: 26, speed: 4, up: 4, life: 1 });
        if (p.power.note) {
          ctx.foundNote();
        } else {
          sound.play("power");
          if (calls.onPower) {
            calls.onPower(p.power);
          }
        }
      }
    }
    // The button of a manual action, bumped from below or landed on
    for (const s of stops) {
      if (s.type !== "manual" || s.done || !s.button || run.mode !== "run") {
        continue;
      }
      const b = s.button;
      if (Math.abs(b.x - x) < 1.1 + PIG_HALF && y + PIG_TALL > b.y - 0.3 && y < b.y + 0.4) {
        if (player.vy > 0) {
          player.vy = -1;
        } else {
          player.vy = jumpSpeed() * 0.5;
          player.y = b.y + 0.3;
        }
        pressManual(s, true);
      }
    }
  }

  function collectCoin(c) {
    c.got = true;
    showCoin(c, false, 0, 0);
    stats.got += 1;
    stats.streak += 1;
    stats.best = Math.max(stats.best, stats.streak);
    const multiplier = 1 + Math.min(3, Math.floor(stats.streak / STREAK_STEP));
    music.note(c.order);
    if (c.veg) {
      eatVegetable(c, multiplier);
    } else {
      ctx.points(10 * multiplier);
    }
    if (stats.streak % STREAK_STEP === 0) {
      ctx.fx.burst(c.x, c.y, 0, { count: 30, speed: 4.5, up: 5, life: 1.1 });
      hud.toast(t("mu_streak", { n: multiplier }), "good");
    }
    if (calls.onCoin) {
      calls.onCoin(c.coin, c);
    }
  }

  /** A vegetable: 15 points, a happy wheek, its name the first time each kind is eaten. */
  function eatVegetable(c, multiplier) {
    stats.vegetables += 1;
    ctx.points(VEG_POINTS * multiplier);
    sound.play("wheek");
    if (c.sign) {
      c.sign.sprite.visible = false;
    }
    if (!vegEaten.has(c.veg.key)) {
      vegEaten.add(c.veg.key);
      hud.toast(t("mu_veg_" + c.veg.key) + " +" + VEG_POINTS * multiplier, "good");
    }
    if (stats.vegetables === 1) {
      coach(t("mu_coachVeg"), 2000);
    }
    renderVegetables();
  }

  function renderVegetables() {
    if (vegCard) {
      vegCard.textContent = t("mu_vegetables", { n: stats.vegetables });
    }
    setData("vegetables", stats.vegetables);
  }

  function hit(look, block) {
    if (isSoft(run.beat)) {
      // A rehearsal: the guinea pig bounces off and goes on
      player.vy = jumpSpeed() * 0.75;
      player.grounded = false;
      player.y = Math.max(player.y, 0);
      run.inv = 0.6;
      player.wobble = 1;
      if (block) {
        block.dead = true;
        block.popped = 1;
      }
      ctx.points(-20);
      sound.play("wrong");
      coach(t("mu_soft"), 2400);
      if (calls.onSoftHit) {
        calls.onSoftHit(look);
      }
      return;
    }
    stats.hits += 1;
    player.wobble = 1;
    shake = engine.motion ? 0.35 : 0;
    ctx.loseAttempt(look ? look.title : "", look ? look.tip : "");
    if (!ctx.playing) {
      return;
    }
    if (calls.onHit) {
      calls.onHit(look);
    }
    coach(t("mu_hit"), 2600, true);
    rewind();
  }

  /** Back to the last checkpoint, on a bar of the song. withMercy false: no mistake was made, the tempo stays. */
  function rewind(withMercy) {
    run.mode = "rewind";
    run.rewindFrom = X(run.beat);
    run.rewindFromY = player.y;
    run.rewindStart = music.beat;
    run.rewindUntil = Math.ceil((music.beat + 2) / 4) * 4;
    music.setSection("break", Math.floor(music.beat / 4));
    music.setSection(run.cp.section, run.rewindUntil / 4);
    music.fill(run.rewindUntil, 1);
    // Mercy: back at the checkpoint, the tempo drops a step for a few bars, then climbs again
    run.pace = paceAt(run.cp.at);
    const mercy = withMercy === false ? run.pace : Math.max(1, paces.filter((x) => x < run.pace - 0.001).pop() || 1);
    music.setTempo(song.bpm * mercy, run.rewindUntil);
    run.mercyUntil = mercy < run.pace ? run.rewindUntil + MERCY_BEATS : -1;
    if (run.mercyUntil > 0) {
      hud.toast(t("mu_mercy"), "good");
    }
    stats.streak = 0;
  }

  function respawn() {
    run.offset = run.rewindUntil - run.cp.at;
    run.beat = run.cp.at;
    run.prev = run.cp.at - 0.001;
    run.mode = "run";
    run.inv = 1.2;
    run.section = run.cp.section;
    player.y = 0;
    player.vy = 0;
    player.grounded = true;
    player.buffer = 0;
    for (const c of coins) {
      if (!c.got && c.beat >= run.cp.at) {
        c.missed = false;
      }
    }
    for (const target of targets) {
      if (target.at >= run.cp.at) {
        target.cued = false;
      }
    }
    for (const trigger of triggers) {
      if ((trigger.event.type === "music" || trigger.event.type === "tempo") && trigger.event.at > run.cp.at) {
        trigger.done = false;
      }
    }
  }

  /* ---------- Stops ---------- */

  function enterStop(stop) {
    run.mode = "stop";
    run.stop = stop;
    run.beat = stop.at;
    music.setSection("break", Math.floor(music.beat / 4));
    if (stop.type === "manual") {
      coach(t("mu_manual"), 2600, true);
    } else {
      openChoice(stop);
    }
  }

  function pressManual(stop, onTheWay) {
    if (stop.done) {
      return;
    }
    stop.done = true;
    stop.button.squash = 1;
    sound.play("gate");
    ctx.fx.burst(stop.button.mesh.position.x, stop.button.mesh.position.y, 0, { count: 30, colors: [0x0176d3, 0x1b96ff, 0xffffff, 0x2e844a], speed: 4, up: 4, life: 1 });
    if (pig.hop) {
      pig.hop();
    }
    if (calls.onManual) {
      calls.onManual(stop, onTheWay);
    }
    if (run.mode === "stop" && run.stop === stop) {
      resume();
    }
  }

  function resume() {
    run.mode = "resume";
    run.resumeAt = Math.ceil((music.beat + 1) / 4) * 4;
    music.setSection(run.section, run.resumeAt / 4);
    music.fill(run.resumeAt, 1);
  }

  function openChoice(stop) {
    const e = stop.event;
    stop.round = 0;
    choiceUi = document.createElement("div");
    choiceUi.className = "gr-mu-choice";
    hud.layer.appendChild(choiceUi);
    // How to answer is written in the card: a coach would cover the question
    showRound(stop);
    void e;
  }

  function showRound(stop) {
    const round = stop.event.rounds[stop.round];
    choiceUi.replaceChildren();
    const prompt = document.createElement("p");
    prompt.className = "gr-mu-prompt";
    prompt.textContent = round.prompt;
    choiceUi.appendChild(prompt);
    if (round.detail) {
      const detail = document.createElement("p");
      detail.className = "gr-mu-detail";
      detail.textContent = round.detail;
      choiceUi.appendChild(detail);
    }
    const row = document.createElement("div");
    row.className = "gr-mu-options";
    choiceUi.appendChild(row);
    round.buttons = round.options.map((option, i) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "gr-mu-option";
      button.textContent = option.label;
      button.addEventListener("click", () => pick(stop, i));
      row.appendChild(button);
      option.off = false;
      return button;
    });
    const hint = document.createElement("p");
    hint.className = "gr-mu-hint";
    hint.textContent = t(hud.touch ? "mu_choiceTouch" : "mu_choice");
    choiceUi.appendChild(hint);
    run.choiceStart = Math.ceil(music.beat);
    run.lit = -1;
    setData("ok", round.options.findIndex((o) => o.ok));
  }

  /** Which option is lit at a beat of the song: one per beat, the disabled ones skipped. */
  function litAt(songBeat) {
    const round = run.stop.event.rounds[run.stop.round];
    if (!round) {
      return -1;
    }
    const open = round.options.map((o, i) => (o.off ? -1 : i)).filter((i) => i >= 0);
    if (songBeat < run.choiceStart || !open.length) {
      return -1;
    }
    const beatsEach = pace() >= 1.12 ? 2 : 1;
    return open[Math.floor((songBeat - run.choiceStart) / beatsEach) % open.length];
  }

  function pick(stop, index) {
    if (run.mode !== "stop" || run.stop !== stop || !ctx.playing || index < 0) {
      return;
    }
    const round = stop.event.rounds[stop.round];
    // Between two rounds the next one is not on screen yet: a press there does nothing
    if (!round || !round.buttons || run.lit === -2) {
      return;
    }
    const option = round.options[index];
    if (!option || option.off) {
      return;
    }
    if (option.ok) {
      round.buttons[index].classList.add("is-right");
      if (pig.hop) {
        pig.hop();
      }
      ctx.collect(150, round.lesson || option.label);
      sound.play("wheek");
      if (calls.onChoice) {
        calls.onChoice(stop, round, option, true);
      }
      stop.round += 1;
      if (stop.round < stop.event.rounds.length) {
        const next = stop;
        run.lit = -2;
        window.setTimeout(() => {
          if (choiceUi && run.stop === next && run.mode === "stop") {
            showRound(next);
          }
        }, 700);
      } else {
        stop.done = true;
        window.setTimeout(() => {
          if (choiceUi) {
            choiceUi.remove();
            choiceUi = null;
          }
        }, 600);
        run.lit = -2;
        resume();
      }
    } else {
      option.off = true;
      round.buttons[index].classList.add("is-off");
      round.buttons[index].classList.remove("is-lit");
      round.buttons[index].disabled = true;
      player.wobble = 1;
      ctx.loseAttempt(option.title || option.label, option.tip);
      if (calls.onChoice) {
        calls.onChoice(stop, round, option, false);
      }
    }
  }

  function updateChoice() {
    if (run.mode !== "stop" || !run.stop || run.stop.type !== "choice" || !choiceUi || run.lit === -2) {
      return;
    }
    const lit = litAt(music.beat);
    if (lit !== run.lit) {
      run.lit = lit;
      const round = run.stop.event.rounds[run.stop.round];
      round.buttons.forEach((b, i) => b.classList.toggle("is-lit", i === lit));
      setData("lit", lit);
    }
  }

  /* ---------- Events on the way ---------- */

  function fireTriggers() {
    for (const trigger of triggers) {
      const e = trigger.event;
      if (trigger.done) {
        continue;
      }
      // A section starts on its bar: it is asked for one beat before
      const when = e.type === "music" ? e.at - 1 : e.at;
      if (run.beat >= when && run.prev < when + 8) {
        trigger.done = true;
        if (e.type === "music") {
          run.section = e.section;
          music.setSection(e.section, Math.round((e.at + run.offset) / 4));
        } else if (e.type === "tempo") {
          const before = run.pace;
          run.pace = e.pace;
          run.mercyUntil = -1;
          music.setTempo(song.bpm * e.pace, Math.round((e.at + run.offset) / 4) * 4);
          if (e.pace > before + 0.001) {
            hud.toast(t("mu_faster"), "power");
          }
        } else if (e.run) {
          e.run(api);
        }
      }
    }
    for (const cp of checkpoints) {
      if (!cp.passed && cp.at > 0 && run.beat >= cp.at) {
        cp.passed = true;
        run.cp = cp;
        if (cp.cloth) {
          cp.cloth.material = paint.plain(0x2e844a, { emissive: 0x0a2a12 });
        }
        cp.wave = 1;
        ctx.fx.burst(X(cp.at), 1.8, -1.3, { count: 16, speed: 3, up: 3, life: 0.8 });
        sound.play("click");
      }
    }
  }

  function cueJumps() {
    if (run.mode !== "run") {
      return;
    }
    for (const target of targets) {
      if (target.cued || target.bonus) {
        continue;
      }
      const ahead = target.at - run.beat;
      if (ahead > 0 && ahead < 0.6) {
        target.cued = true;
        const owner = target.owner;
        if (owner && owner.dead) {
          continue;
        }
        music.cue(target.at + run.offset, Boolean(owner && owner.hidden));
      }
    }
  }

  /* ---------- What is seen ---------- */

  function placeRings() {
    let used = 0;
    const portrait = engine.portrait;
    for (const target of targets) {
      const ahead = target.at - run.beat;
      if (ahead < -0.2) {
        target.marker.visible = false;
        continue;
      }
      if (ahead > RING_BEATS + 0.5) {
        break;
      }
      const owner = target.owner;
      const gone = owner && owner.dead;
      const hiddenNow = owner && owner.hidden && ahead > 1.1;
      target.marker.visible = !gone && !hiddenNow;
      if (gone || hiddenNow || used >= rings.length || run.mode !== "run") {
        continue;
      }
      const ring = rings[used++];
      const k = Math.max(0, Math.min(1, ahead / RING_BEATS));
      ring.mesh.visible = true;
      ring.mesh.position.set(X(target.at), 0.5, 0.75);
      ring.mesh.scale.setScalar(0.3 + 1.5 * k);
      ring.material.color.setHex(target.bonus ? 0xff7ad9 : ahead < 0.14 ? 0xffffff : 0xffd84d);
      ring.material.opacity = Math.min(1, (1 - k) * 1.6 + 0.15);
      target.marker.scale.set(1 + (1 - k) * 0.4, 0.6 + (1 - k) * 0.25, 1);
    }
    for (; used < rings.length; used++) {
      rings[used].mesh.visible = false;
    }
    void portrait;
  }

  function placeWorld(dt, time) {
    const x = X(run.beat);
    const pulse = engine.motion ? music.pulse : 0;
    const near = (px) => Math.abs(px - camX) < 30;
    for (const b of blocks) {
      if (!near(b.x)) {
        b.mesh.visible = false;
        continue;
      }
      if (b.thrown && flyThrown(b)) {
        continue;
      }
      if (b.popped > 0) {
        b.popped = Math.max(0, b.popped - dt * 3);
        b.mesh.scale.set(BLOCK_W * (1 + (1 - b.popped) * 0.6), b.h * b.popped, 1.1);
        b.mesh.visible = b.popped > 0.02;
        continue;
      }
      if (b.dead) {
        b.mesh.visible = false;
        continue;
      }
      b.mesh.visible = true;
      b.squash = Math.max(0, b.squash - dt * 4);
      const s = 1 + pulse * 0.07 - b.squash * 0.25;
      b.mesh.scale.set(BLOCK_W * (1 + b.squash * 0.15), b.h * s, 1.1);
      b.mesh.position.y = (b.h * s) / 2;
      if (b.hidden && b.mesh.material === ghostMaterial) {
        // In the fog a wall shows itself late, unless the log revealed it
        const ahead = b.event.at - run.beat;
        if (ahead < 1.1) {
          b.mesh.material = b.normal;
          if (b.sign) {
            b.sign.sprite.visible = true;
          }
        }
      }
    }
    for (const copies of glowPools.values()) {
      if (copies) {
        copies.begin();
      }
    }
    for (const c of coins) {
      if (!c.got && !c.hidden && Math.abs(c.x - camX) < SCENERY_RANGE) {
        showCoin(c, true, time, pulse);
      }
    }
    // The scenery near the camera bounces on the beat
    for (const layer of scenery) {
      layer.copies.begin();
      for (let i = 0; i < layer.list.length; i++) {
        const item = layer.list[i];
        if (item.x > camX + SCENERY_RANGE) {
          break;
        }
        if (item.x > camX - SCENERY_RANGE) {
          layer.copies.add(item.x, item.y + (layer.float ? Math.sin(time + i) * 0.15 : 0), item.z, item.s, item.turn, 1 + pulse * layer.bounce);
        }
      }
      layer.copies.end();
    }
    for (const cp of checkpoints) {
      if (checkMarks && cp.slot !== null && cp.slot !== undefined && cp.slot !== true && near(X(cp.at))) {
        cp.wave = Math.max(0, cp.wave - dt * 1.5);
        checkMarks.set(cp.slot, X(cp.at), 0.9 + Math.sin(cp.wave * 10) * cp.wave * 0.4, -1.3, 1 + pulse * 0.06 + cp.wave * 0.3, ITEM_FACE + cp.wave * 6);
      }
      if (cp.flag && near(X(cp.at))) {
        cp.wave = Math.max(0, cp.wave - dt * 1.5);
        cp.flag.scale.copy(cp.base).multiplyScalar(1 + pulse * 0.05 + Math.sin(cp.wave * 12) * cp.wave * 0.15);
      }
    }
    for (const p of powers) {
      if (p.got) {
        continue;
      }
      if (p.pool) {
        if (Math.abs(p.x - camX) < SCENERY_RANGE) {
          p.pool.add(p.x, p.y - p.size / 2 + Math.sin(time * 3) * 0.1, 0, (p.size / COIN_H) * (1 + pulse * 0.12), ITEM_FACE + Math.sin(time * 2) * 0.7);
        }
      } else {
        p.mesh.rotation.y = time * 2;
        p.mesh.position.y = p.y + Math.sin(time * 3) * 0.1;
      }
    }
    for (const copies of glowPools.values()) {
      if (copies) {
        copies.end();
      }
    }
    for (const s of springs) {
      s.mesh.scale.copy(s.base).multiply(scratch.set(1 + pulse * 0.12, 1 - pulse * 0.3, 1 + pulse * 0.12));
    }
    for (const s of stops) {
      if (s.done && s.open < 1) {
        s.open = Math.min(1, s.open + dt * 2.5);
        s.wall.position.y = 1.3 - s.open * 2.8;
        if (s.sign) {
          s.sign.sprite.visible = s.open < 0.6;
        }
      }
      if (s.button) {
        const b = s.button;
        // While the guinea pig waits at the barrier, the button comes over it
        const waiting = run.mode === "stop" && run.stop === s && !s.done;
        const wantX = waiting ? x : b.home.x;
        const wantY = waiting ? 2.55 : b.home.y;
        b.x += (wantX - b.x) * Math.min(1, dt * 6);
        b.y += (wantY - b.y) * Math.min(1, dt * 6);
        b.squash = Math.max(0, b.squash - dt * 3);
        b.mesh.position.set(b.x, b.y + Math.sin(time * 4) * 0.04, 0);
        b.mesh.scale.set(2.2 * (1 + b.squash * 0.2), 0.55 * (1 - b.squash * 0.45), 1.3);
        if (s.done) {
          b.mesh.material = faceMaterial("button-done", "#2E844A", "check");
        }
        s.buttonSign.sprite.position.set(b.x, b.y + 0.9, 0.9);
        s.buttonSign.sprite.visible = !s.done;
        if (waiting && player.y + PIG_TALL > b.y - 0.35 && player.vy > 0) {
          player.vy = -2;
          pressManual(s, false);
        }
      }
    }
    // The equalizer: only the bars near the camera move
    const firstGroup = Math.max(0, Math.floor((camX - 30 + 60) / EQ_GAP));
    const lastGroup = Math.min(eqGroups - 1, Math.ceil((camX + 30 + 60) / EQ_GAP));
    const beat = music.beat;
    for (let g = firstGroup; g <= lastGroup; g++) {
      for (let k = 0; k < 3; k++) {
        const i = g * 3 + k;
        const level = 0.5 + 0.5 * Math.sin(beat * Math.PI * (k === 1 ? 1 : 0.5) + g * 1.3 + k);
        const h = 1.2 + k * 0.4 + (engine.motion ? level * 1.6 + music.pulse * (k === 0 ? 1.4 : 0.6) : 0.8);
        dummy.position.set(-60 + g * EQ_GAP + k * 1.05, h / 2 - 0.2, -8);
        dummy.scale.set(0.85, h, 0.85);
        dummy.updateMatrix();
        eq.setMatrixAt(i, dummy.matrix);
      }
    }
    eq.instanceMatrix.needsUpdate = true;
    if (checkMarks) {
      checkMarks.commit();
    }
    trackMaterial.emissiveIntensity = engine.motion ? music.pulse * 0.08 : 0;
    // The fog of a zone, around the guinea pig while it is in it
    let fog = 0;
    for (const z of fogZones) {
      const into = Math.min(run.beat - z.from, z.to - run.beat);
      fog = Math.max(fog, Math.max(0, Math.min(1, (into + 2) / 3)));
    }
    fogMaterial.opacity = fog * 0.32;
    fogs.forEach((mesh, i) => {
      mesh.visible = fog > 0.01;
      mesh.position.x = camX + Math.sin(time * 0.3 + i * 2) * 2 + (i - 1) * 6;
    });
    engine.hemi.intensity = 1.6 - fog * 0.5;
    // Signs grow on a portrait screen, so their words stay readable
    const portrait = engine.portrait;
    if (portrait !== lastPortrait) {
      lastPortrait = portrait;
      for (const s of signs) {
        s.sprite.scale.copy(s.base).multiplyScalar(portrait ? 1.5 : 1);
      }
    }
  }

  /**
   * A block thrown by the boss: held until THROW_BEATS before its beat, then in
   * the air, landed LAND_BEATS before it, and from there drawn as any block.
   * Returns true while it is not on the track yet. A rewind takes it back to the hand.
   */
  function flyThrown(b) {
    const th = b.thrown;
    if (b.dead) {
      if (b.sign) {
        b.sign.sprite.visible = false;
      }
      return false;
    }
    const ahead = b.event.at - run.beat;
    if (ahead > THROW_BEATS) {
      th.state = "held";
      b.mesh.visible = false;
      if (b.sign) {
        b.sign.sprite.visible = false;
      }
      return true;
    }
    if (ahead > LAND_BEATS) {
      if (th.state !== "flying") {
        th.state = "flying";
        if (def.thrower) {
          def.thrower(th.from);
        } else {
          th.from.set(b.x + 4, 5, -2);
        }
        if (calls.onThrow) {
          calls.onThrow(b.look, b);
        }
      }
      // From the hand to its place on the track, over a little arc, spinning into place
      const k = (THROW_BEATS - ahead) / (THROW_BEATS - LAND_BEATS);
      const s = 0.55 + 0.45 * k;
      const spin = (1 - k) * (1 - k) * Math.PI * 2;
      const x = th.from.x + (b.x - th.from.x) * k;
      const y = th.from.y * (1 - k) + THROW_ARC * 4 * k * (1 - k);
      const z = th.from.z * (1 - k);
      b.mesh.visible = true;
      b.mesh.position.set(x, y + (b.h * s) / 2, z);
      b.mesh.rotation.set(spin * 0.5, 0, spin);
      b.mesh.scale.set(BLOCK_W * s, b.h * s, 1.1 * s);
      if (b.sign) {
        b.sign.sprite.visible = true;
        b.sign.sprite.position.set(x - (b.signShift || 0) * b.sign.sprite.scale.x, y + b.h * s + 0.55, z + 0.6);
      }
      return true;
    }
    if (th.state !== "landed") {
      th.state = "landed";
      b.mesh.position.set(b.x, b.h / 2, 0);
      b.mesh.rotation.set(0, 0, 0);
      b.squash = 1;
      if (b.sign) {
        b.sign.sprite.visible = true;
        b.sign.sprite.position.set(b.x, b.h + 0.55, 0.6);
      }
      ctx.fx.burst(b.x, 0.1, 0, { count: 8, colors: [0xffffff, b.look.burst || 0x7473b5], speed: 2.5, up: 2, life: 0.5 });
      if (calls.onLand) {
        calls.onLand(b.look, b);
      }
    }
    if (b.sign && b.signShift) {
      // A phone turned meanwhile changes the width of the sign
      b.sign.sprite.position.x = b.x - b.signShift * b.sign.sprite.scale.x;
    }
    return false;
  }

  function placePig(dt, time) {
    let x = X(run.beat);
    let y = player.y;
    if (run.mode === "rewind") {
      // Flying back to the checkpoint, on an arc, with the song going on
      const k = Math.min(1, (music.beat - run.rewindStart) / Math.max(0.5, run.rewindUntil - run.rewindStart));
      const e = k * k * (3 - 2 * k);
      x = run.rewindFrom + (X(run.cp.at) - run.rewindFrom) * e;
      y = (run.rewindFromY || 0) * (1 - e) + Math.sin(Math.PI * e) * 2.5;
    }
    pig.object.position.set(x, y, 0);
    player.squash = Math.max(0, player.squash - dt * 5);
    const s = player.squash;
    const stretch = player.grounded ? 0 : Math.min(0.12, Math.abs(player.vy) * 0.008);
    pig.object.scale.set(1 + s * 0.12 - stretch * 0.5, 1 - s * 0.16 + stretch, 1 + s * 0.12 - stretch * 0.5);
    if (player.wobble > 0) {
      player.wobble = Math.max(0, player.wobble - dt * 1.6);
      pig.hitWobble(player.wobble);
    }
    const overGround = run.mode !== "rewind" && surface(run.beat, 0) !== null;
    pig.shadow.visible = overGround;
    pig.shadow.position.set(x, 0.012, 0.05);
    const running = run.mode === "run" && player.grounded;
    pig.state = { running, airborne: !player.grounded || run.mode === "rewind", ducking: false, speed: running ? runAnimSpeed() : 0, height: Math.max(0, y) };
    // Blink while it cannot be hurt
    pig.object.visible = run.inv <= 0 || Math.floor(time * 12) % 2 === 0;
  }

  function placeCamera(dt) {
    const portrait = engine.portrait;
    // A little wider as the song speeds up: the speed is felt
    const fov = Math.round(((portrait ? 62 : 44) + (pace() - 1) * 12) * 2) / 2;
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    const px = pig.object.position.x;
    const lead = portrait ? 2.1 : 5;
    const wantX = px + lead;
    camX = run.mode === "rewind" ? camX + (wantX - camX) * Math.min(1, dt * 5) : wantX;
    const wantY = 2 + Math.max(0, pig.object.position.y - 1.6) * 0.65;
    camY += (wantY - camY) * Math.min(1, dt * 4);
    shake = Math.max(0, shake - dt);
    const jitter = shake > 0 ? (Math.random() - 0.5) * shake : 0;
    const distance = portrait ? 14 : 12.5;
    // On a phone a choice sits at the bottom of the screen: the scene moves up
    const choosing = portrait && run.mode === "stop" && run.stop && run.stop.type === "choice";
    lookUp += ((choosing ? -2.6 : 0) - lookUp) * Math.min(1, dt * 4);
    camera.position.set(camX + jitter, camY + (portrait ? 1.2 : 0.9) + lookUp, distance);
    camera.lookAt(camX, camY + (portrait ? 1 : 0.75) + lookUp, 0);
    engine.aimSun(px, 0);
  }

  /** About how many draw calls a frame makes: the meshes and sprites in view, one per material. */
  function countDraws() {
    camera.updateMatrixWorld();
    viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(viewProjection);
    let n = 0;
    engine.scene.traverseVisible((o) => {
      if (!o.isMesh && !o.isSprite) {
        return;
      }
      if (o.isInstancedMesh || !o.frustumCulled) {
        n += o.isInstancedMesh && o.count === 0 ? 0 : 1;
        return;
      }
      if (o.isSprite) {
        sphere3.center.setFromMatrixPosition(o.matrixWorld);
        sphere3.radius = o.scale.x;
      } else {
        if (!o.geometry.boundingSphere) {
          o.geometry.computeBoundingSphere();
        }
        sphere3.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld);
      }
      if (frustum.intersectsSphere(sphere3)) {
        n += Array.isArray(o.material) ? new Set(o.material).size : 1;
      }
    });
    return n;
  }

  function writeData() {
    setData("mode", run.mode);
    setData("pace", pace().toFixed(2));
    setData("beat", run.beat.toFixed(2));
    setData("y", player.y.toFixed(1));
    const next = targets.find((x) => !x.bonus && x.at > run.beat - 0.05 && !(x.owner && x.owner.dead) && !(x.owner && x.owner.done));
    setData("jumpat", next ? next.at : "none");
    jumpAt = next ? next.at : NaN;
    setData("stopped", run.mode === "stop" ? "yes" : "no");
    setData("stopkind", run.mode === "stop" && run.stop ? run.stop.type : "");
    frames += 1;
    if (frames % 60 === 0) {
      setData("calls", countDraws());
    }
  }

  /* ---------- What a world can use ---------- */

  const api = {
    music,
    stats,
    get beat() {
      return run.beat;
    },
    get mode() {
      return run.mode;
    },
    get playing() {
      return ctx.playing;
    },
    coach,
    /** The walls of a group appear, before the guinea pig reaches them. */
    reveal(group) {
      for (const b of blocks) {
        if (b.look.group === group && b.hidden) {
          b.hidden = false;
          b.mesh.material = b.normal;
          if (b.sign) {
            b.sign.sprite.visible = true;
          }
          b.target.marker.visible = true;
        }
      }
    },
    /** The blocks of a group, still ahead, turn into coins. */
    convert(group) {
      let n = 0;
      for (const b of blocks) {
        if (b.look.group === group && !b.dead && b.x > X(run.beat) + 0.4) {
          b.dead = true;
          b.popped = 1;
          n += 1;
          ctx.fx.burst(b.x, b.h, 0, { count: 10, colors: [0x2e844a, 0x45c65a, 0xffffff], speed: 3, up: 4, life: 0.8 });
          if (b.convert) {
            b.convert.hidden = false;
            showCoin(b.convert, true, 0, 0);
            stats.coins += 1;
          }
        }
      }
      return n;
    },
    /** How many blocks of a group are still standing. */
    standing(group) {
      return blocks.filter((b) => b.look.group === group && !b.dead).length;
    },
    coinsOf(id) {
      const list = coins.filter((c) => c.coin.id === id && !c.hidden);
      return { total: list.length, got: list.filter((c) => c.got).length };
    },
    powerTaken(id) {
      return powers.some((p) => p.power.id === id && p.got);
    },
    /** The power-ups of that id at or after the last checkpoint come back: a boss round played again. */
    rearm(id) {
      for (const p of powers) {
        if (p.got && p.power.id === id && p.beat >= run.cp.at) {
          p.got = false;
          if (p.mesh) {
            p.mesh.visible = true;
          }
          if (p.sign) {
            p.sign.sprite.visible = true;
          }
        }
      }
    },
    /** The run beat of the last checkpoint passed. */
    get checkpoint() {
      return run.cp.at;
    },
    /**
     * For the checks (window.__guineaRun.wN.autoplay): a jump on the exact beat
     * of the next target, the one written at the end of the last step (one
     * behind it is not written yet), whatever the frame rate. Call it before update().
     */
    autoJump() {
      if (run.mode !== "run") {
        return;
      }
      if (Number.isFinite(jumpAt) && jumpAt !== autoDone && jumpAt > run.beat - 0.05 && jumpAt - run.beat < 0.1) {
        autoDone = jumpAt;
        api.action("jump");
      }
    },
    /** Back to the last checkpoint with no mistake made (a boss still standing plays its round again). */
    again() {
      if (run.mode !== "run") {
        return false;
      }
      rewind(false);
      return true;
    },
    x: X
  };

  // The intro card shows the start, the guinea pig facing the way to go
  pig.object.rotation.set(0, -Math.PI / 2, 0);
  pig.shadow.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
  placePig(0, 0);
  placeWorld(0, 0);
  placeRings();
  placeCamera(1);
  setData("jumps", 0);
  renderVegetables();
  writeData();

  return Object.assign(api, {
    start() {
      music.start();
      music.setSection(def.song.start || "intro", 0);
      run.mode = "run";
      run.offset = 0;
      // guinea-at=N (for checks): start at the last checkpoint before run beat N
      const at = Number(ctx.params && ctx.params.startAt) || 0;
      if (at > 0) {
        const cp = checkpoints.filter((c) => c.at <= at).pop();
        run.cp = cp;
        run.offset = -cp.at;
        run.beat = cp.at;
        run.prev = cp.at;
        run.section = cp.section;
        music.setSection(cp.section, 0);
        run.pace = paceAt(cp.at);
        music.setTempo(song.bpm * run.pace, 0);
        for (const c of checkpoints) {
          c.passed = c.at <= cp.at;
        }
        for (const trigger of triggers) {
          if (trigger.event.at <= cp.at) {
            trigger.done = true;
            if (trigger.event.type === "script") {
              trigger.event.run(api);
            }
          }
        }
        for (const target of targets) {
          target.cued = target.at < cp.at;
        }
      }
      coach(t(hud.touch ? "mu_startTouch" : "mu_start"), 3000, true);
    },
    update(dt, time) {
      if (!ctx.playing) {
        return;
      }
      music.update(dt);
      run.prev = run.beat;
      run.inv = Math.max(0, run.inv - dt / spbNow());
      if (run.mode === "run") {
        run.beat = music.beat - run.offset;
        const stop = stops.find((s) => !s.done && run.prev <= s.at + 0.001 && run.beat >= s.at);
        if (stop) {
          enterStop(stop);
        } else if (run.beat >= endBeat) {
          run.beat = endBeat;
          run.mode = "end";
          music.setSection(def.song.end || "lounge", Math.floor(music.beat / 4) + 1);
          if (calls.onEnd) {
            calls.onEnd();
          }
          if (!ctx.playing) {
            return;
          }
        }
      } else if (run.mode === "resume" && music.beat >= run.resumeAt) {
        run.offset = run.resumeAt - run.stop.at;
        run.stop = null;
        run.mode = "run";
        run.beat = music.beat - run.offset;
      } else if (run.mode === "rewind" && music.beat >= run.rewindUntil) {
        respawn();
      }
      // The end of the mercy: the tempo of the part comes back on a bar
      if (run.mercyUntil > 0 && music.beat >= run.mercyUntil - 1) {
        music.setTempo(song.bpm * run.pace, run.mercyUntil);
        run.mercyUntil = -1;
        hud.toast(t("mu_faster"), "power");
      }
      if (run.mode === "run") {
        fireTriggers();
        if (!ctx.playing) {
          return;
        }
        cueJumps();
      }
      if (run.mode === "end" && player.grounded && Math.floor(music.beat) !== hopBeat) {
        // At the end, a little happy hop on each beat
        hopBeat = Math.floor(music.beat);
        player.vy = jumpSpeed() * 0.45;
        player.grounded = false;
      }
      stepPlayer(dt);
      if (run.mode === "run") {
        collide();
        if (!ctx.playing) {
          return;
        }
      }
      updateChoice();
      placeWorld(dt, time);
      placeRings();
      placePig(dt, time);
      placeCamera(dt);
      writeData();
    },
    action(name) {
      if (run.mode === "end") {
        if (calls.onEndAction) {
          calls.onEndAction(name);
        }
        return;
      }
      if (name !== "jump" && name !== "tap" && name !== "confirm") {
        return;
      }
      // Every press counts here, even one the guinea pig cannot use yet (in the
      // air, flying back to a checkpoint): what a check reads to see the world react
      presses += 1;
      setData("jumps", presses);
      if (run.mode === "stop" && run.stop && run.stop.type === "choice") {
        // The press counts for what is lit: what the player sees
        pick(run.stop, litAt(music.beat));
      }
      if (run.mode === "run" || run.mode === "stop" || run.mode === "resume") {
        player.buffer = BUFFER_S;
        player.pressBeat = run.beat;
      }
    },
    /** The world is over: the last chord. */
    finale() {
      music.finale();
    },
    /** The finish takes off (a rocket): played on the result screen, in idleCamera. */
    launch() {
      launchAt = engine.time;
    },
    /** The reward (the badge) grows in over the finish. */
    celebrate() {
      rewardAt = engine.time;
    },
    idleCamera(time) {
      const portrait = engine.portrait;
      if (reward && rewardAt !== null) {
        const k = Math.min(1, (engine.time - rewardAt) / 0.8);
        reward.scale.setScalar(Math.max(0.001, k * (1 + Math.sin(engine.time * 4) * 0.04)));
        reward.rotation.y = ITEM_FACE + Math.sin(engine.time * 1.5) * 0.5;
      }
      if (launchAt !== null) {
        const k = Math.max(0, engine.time - launchAt - 0.6);
        finish.position.y = 0.8 * k * k;
        if (k > 0 && Math.floor(engine.time * 20) % 2 === 0 && finish.position.y < 40) {
          ctx.fx.burst(finish.position.x, finish.position.y, finish.position.z, { count: 4, colors: [0xffb400, 0xff5d2d, 0xffffff], speed: 1.5, up: -3, life: 0.6 });
        }
      }
      camera.fov = portrait ? 62 : 44;
      camera.updateProjectionMatrix();
      const px = pig.object.position.x;
      const sway = Math.sin(time * 0.4) * 0.8;
      // While the finish takes off, the camera looks up after it
      const up = launchAt === null ? 0 : Math.min(finish.position.y * 0.6, 5);
      camera.position.set(px + 2.5 + sway, (portrait ? 3.4 : 2.6) + up * 0.4, portrait ? 13 : 10.5);
      camera.lookAt(px + 2.5, (portrait ? 2.2 : 1.2) + up, 0);
      engine.aimSun(px, 0);
    },
    dispose() {
      music.dispose();
      if (vegCard) {
        vegCard.remove();
        vegCard = null;
      }
      if (choiceUi) {
        choiceUi.remove();
        choiceUi = null;
      }
      pig.object.scale.set(1, 1, 1);
      pig.object.visible = true;
      pig.shadow.rotation.set(-Math.PI / 2, 0, 0);
      pig.shadow.visible = true;
      for (const thing of own) {
        thing.dispose();
      }
    }
  });
}

/* ---------- A boss of a musical run (worlds 6 and 8) ---------- */

/**
 * The rounds of a boss that throws the blocks of the level (def.thrower), from
 * the bar after o.bar: a round of o.roundBars bars per entry of o.rounds, a
 * string per bar, a character per beat: x a block thrown (o.look(n), the n-th
 * thrown), c a power-up on the ground (o.power(n), the n-th power-up). A round
 * after the first starts at a checkpoint, so nothing lands on a guinea pig
 * that just came back. Returns the power-ups placed, { beat, x, got }, for
 * createBossBlaster, and the run beat where the rounds end.
 */
export function bossRounds(L, o) {
  const powers = [];
  let thrown = 0;
  o.rounds.forEach((round, r) => {
    const from = (o.bar + 1 + r * o.roundBars) * 4;
    if (r > 0) {
      L.checkpoint(from);
    }
    [...round.join("")].forEach((ch, i) => {
      if (ch === "x") {
        L.block(from + i, o.look(thrown), { thrown: true });
        thrown += 1;
      } else if (ch === "c") {
        L.power(from + i, Object.assign({ n: powers.length }, o.power(powers.length)), true);
        powers.push({ beat: from + i, x: (from + i) * UNITS_PER_BEAT, got: false });
      }
    });
  });
  return { powers, end: (o.bar + 1 + o.rounds.length * o.roundBars) * 4 };
}

/**
 * What a boss power-up gives: the guinea pig fires on its own, on every
 * 1/o.perBeat beat for o.beats beats, each shot flying o.flight beats over an
 * arc to o.aim(out) and calling o.onHit(shot, at) there (shot.color is its
 * colour). A gold ring turns round the next power-up not taken, near the camera.
 * o: { id (of the power-ups), powers (from bossRounds), models and colors of
 * the shots (one of each in turn), beats, perBeat, flight, aim, onHit, onFire }.
 */
export function createBossBlaster(ctx, run, o) {
  const { THREE, pig, camera, engine } = ctx;
  const owned = [];
  const shotGeometry = new THREE.SphereGeometry(0.26, 12, 8);
  owned.push(shotGeometry);
  const shots = [];
  for (let i = 0; i < o.models.length * 2; i++) {
    const kind = i % o.models.length;
    let mesh = ctx.models ? ctx.models.get(o.models[kind], { height: 0.62, shadows: false }) : null;
    if (!mesh) {
      mesh = new THREE.Mesh(shotGeometry, ctx.paint.plain(o.colors[kind], { roughness: 0.4 }));
    }
    mesh.visible = false;
    ctx.root.add(mesh);
    shots.push({ mesh, live: false, beat: 0, from: new THREE.Vector3(), kind, color: o.colors[kind] });
  }
  let nextShot = 0;
  const blaster = { until: -1, next: 0 };
  const target = new THREE.Vector3();
  const haloMaterial = new THREE.MeshBasicMaterial({ color: 0xffb400, transparent: true, opacity: 0.95, toneMapped: false, depthWrite: false });
  const haloGeometry = new THREE.TorusGeometry(0.85, 0.1, 8, 36);
  owned.push(haloMaterial, haloGeometry);
  const halo = new THREE.Mesh(haloGeometry, haloMaterial);
  halo.visible = false;
  ctx.root.add(halo);

  function fire(beat) {
    const shot = shots[nextShot % shots.length];
    nextShot += 1;
    const p = pig.object.position;
    shot.live = true;
    shot.beat = beat;
    shot.from.set(p.x + 0.55, p.y + 0.65, 0.25);
    shot.mesh.visible = true;
    if (o.onFire) {
      o.onFire(shot);
    }
  }

  function flyShots() {
    const beat = run.music.beat;
    for (const shot of shots) {
      if (!shot.live) {
        continue;
      }
      const k = Math.max(0, (beat - shot.beat) / o.flight);
      o.aim(target);
      if (k >= 1) {
        shot.live = false;
        shot.mesh.visible = false;
        o.onHit(shot, target);
        continue;
      }
      const x = shot.from.x + (target.x - shot.from.x) * k;
      const y = shot.from.y + (target.y - shot.from.y) * k + 2.2 * 4 * k * (1 - k);
      const z = shot.from.z + (target.z - shot.from.z) * k;
      shot.mesh.position.set(x, y - 0.31, z);
      shot.mesh.rotation.set(k * 5, k * 8, k * 3);
    }
  }

  return {
    /** The n-th power-up is taken: with fire, the blaster starts on the next half beat. */
    take(n, fire) {
      o.powers[n].got = true;
      if (fire) {
        const beat = run.music.beat;
        blaster.until = beat + o.beats;
        blaster.next = Math.ceil(beat * o.perBeat) / o.perBeat;
      }
    },
    stop() {
      blaster.until = -1;
    },
    /** A hit or a new round sends the guinea pig to the checkpoint: the power-ups from there come back. */
    setBack() {
      blaster.until = -1;
      run.rearm(o.id);
      for (const power of o.powers) {
        if (power.beat >= run.checkpoint) {
          power.got = false;
        }
      }
    },
    /** One step: the blaster fires on the beat while the boss fights, the shots fly, the ring turns. Returns the next power-up. */
    update(time, fighting) {
      if (blaster.until >= 0 && (!fighting || run.mode === "rewind")) {
        blaster.until = -1;
      }
      const beat = run.music.beat;
      while (blaster.until >= 0 && beat >= blaster.next && blaster.next < blaster.until) {
        fire(blaster.next);
        blaster.next += 1 / o.perBeat;
      }
      if (blaster.until >= 0 && beat >= blaster.until) {
        blaster.until = -1;
      }
      flyShots();
      const next = fighting ? o.powers.find((c) => !c.got && c.beat > run.beat - 0.3) : null;
      halo.visible = Boolean(next && next.x - camera.position.x < 14);
      if (halo.visible) {
        const pulse = engine.motion ? run.music.pulse : 0;
        halo.position.set(next.x, 0.85, 0.05);
        halo.rotation.set(0, Math.sin(time * 2) * 0.5, time * 1.5);
        halo.scale.setScalar(1 + pulse * 0.18);
      }
      return next;
    },
    dispose() {
      for (const thing of owned) {
        thing.dispose();
      }
    }
  };
}
