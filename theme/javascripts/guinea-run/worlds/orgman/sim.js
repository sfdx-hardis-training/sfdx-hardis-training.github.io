/*
 * A game of Org-Man, without a picture: the guinea pig, the admins, the dots,
 * the deployments, the vegetables, the lives and the score. index.js draws it
 * and passes it the keys; the tests and the bot of the check play it alone.
 * No Three.js, nothing random but the random it is given, so a seed replays
 * the same game.
 *
 * Positions are in tiles: a mover stands on tile (tx, ty) and has gone t of
 * the way to the next tile in its direction. It chooses its way only at the
 * centre of a tile (t = 0).
 *
 * out(name, data) hears what happens, for the picture and the sounds:
 *   ready, go, dot, power, blue (on/off), caught, death, lost, vegetable
 *   (show/eaten/gone), extraLife, cleared, over.
 */
import { DIRS, OPPOSITE, PATH, canEnter, cellAt, inTunnel, mazeForLevel, parseMaze, wrapX } from "./maze.js";
import { ADMIN_COUNT, SALES_MANAGER, chooseDir } from "./ghosts.js";
import {
  BASE_SPEED,
  EXTRA_EVERY,
  EXTRA_FIRST,
  LIVES,
  MAX_LIVES,
  POINTS,
  VEGETABLE_AT,
  VEGETABLE_S,
  levelSettings,
  salesManagerIn,
  vegetableFor
} from "./rules.js";

export const READY_S = 2.2;
export const DEATH_S = 1.8;
// Close enough to touch, in tiles
const TOUCH = 0.62;
// Eyes that cannot find the house in this long are put back in it
const EYES_MAX_S = 15;

export function createSim(random, out = () => {}) {
  const sim = {
    random,
    grid: null,
    level: 0,
    score: 0,
    lives: LIVES,
    phase: "idle",
    phaseTime: 0,
    // Game time in play, in seconds (a pause is not counted: nobody calls update then)
    played: 0,
    pig: null,
    admins: [],
    dots: null,
    left: 0,
    eaten: 0,
    settings: null,
    scatter: true,
    wave: 0,
    waveTime: 0,
    blueTime: 0,
    chain: 0,
    caughtTotal: 0,
    perfectPowers: 0,
    caughtThisPower: 0,
    diedThisMaze: false,
    vegetable: null,
    vegetablesShown: 0,
    nextExtra: EXTRA_FIRST,
    clearedMazes: 0,
    mazeTime: 0
  };

  function newGame(level = 1) {
    sim.score = 0;
    sim.lives = LIVES;
    sim.played = 0;
    sim.caughtTotal = 0;
    sim.clearedMazes = 0;
    sim.nextExtra = EXTRA_FIRST;
    startLevel(level);
  }

  function startLevel(level) {
    sim.level = level;
    sim.grid = parseMaze(mazeForLevel(level));
    sim.settings = levelSettings(level);
    sim.dots = new Uint8Array(sim.grid.w * sim.grid.h);
    for (const i of sim.grid.dots) {
      sim.dots[i] = 1;
    }
    for (const i of sim.grid.powers) {
      sim.dots[i] = 2;
    }
    sim.left = sim.grid.dots.length + sim.grid.powers.length;
    sim.eaten = 0;
    sim.perfectPowers = 0;
    sim.caughtThisPower = 0;
    sim.diedThisMaze = false;
    sim.vegetablesShown = 0;
    placeEveryone();
    out("level", level);
  }

  /** Everybody back to the start: a new maze, or after a life lost. The dots stay. */
  function placeEveryone() {
    const g = sim.grid;
    sim.pig = { tx: g.pig.x, ty: g.pig.y, t: 0, dir: 1, want: 1, moving: false };
    const house = g.house;
    sim.admins = [];
    const count = ADMIN_COUNT + (salesManagerIn(sim.level) ? 1 : 0);
    for (let id = 0; id < count; id++) {
      const inside = id === 0 ? null : house[[1, 0, 2, 1][id - 1] ?? 1];
      sim.admins.push({
        id,
        tx: inside ? inside.x : g.gate.x,
        ty: inside ? inside.y : g.gate.y,
        t: 0,
        dir: id === 0 ? 1 : 0,
        mode: inside ? "house" : "active",
        leaveStep: 0,
        blue: false,
        eyesTime: 0,
        releaseAt: id === SALES_MANAGER ? sim.settings.salesManagerRelease : sim.settings.release[id]
      });
    }
    sim.scatter = true;
    sim.wave = 0;
    sim.waveTime = 0;
    sim.blueTime = 0;
    sim.chain = 0;
    sim.mazeTime = 0;
    sim.vegetable = null;
    setPhase("ready");
    out("ready");
  }

  function setPhase(phase) {
    sim.phase = phase;
    sim.phaseTime = 0;
  }

  /** The way the player asked for: 0 up, 1 left, 2 down, 3 right. */
  function steer(dir) {
    const pig = sim.pig;
    if (!pig || dir < 0 || dir > 3) {
      return;
    }
    pig.want = dir;
    // Turning back works at once, even between two tiles
    if (pig.t > 0 && dir === OPPOSITE[pig.dir]) {
      reverse(pig);
    }
  }

  function reverse(mover) {
    if (mover.t > 0) {
      const d = DIRS[mover.dir];
      mover.tx = wrapX(sim.grid, mover.tx + d.x);
      mover.ty += d.y;
      mover.t = 1 - mover.t;
    }
    mover.dir = OPPOSITE[mover.dir];
  }

  /**
   * Moves a mover by a distance in tiles. choose(mover) gives the way at the
   * centre of a tile, or -1 to stop there; arrive(mover) is called at each centre.
   */
  function move(mover, distance, choose, arrive) {
    let left = distance;
    let guard = 0;
    while (left > 1e-9 && guard++ < 16) {
      if (mover.t === 0) {
        const dir = choose(mover);
        if (dir < 0) {
          mover.moving = false;
          return;
        }
        mover.dir = dir;
      }
      mover.moving = true;
      const step = Math.min(left, 1 - mover.t);
      mover.t += step;
      left -= step;
      if (mover.t >= 1 - 1e-9) {
        const d = DIRS[mover.dir];
        mover.tx = wrapX(sim.grid, mover.tx + d.x);
        mover.ty += d.y;
        mover.t = 0;
        arrive(mover);
      }
    }
  }

  function choosePig(pig) {
    const g = sim.grid;
    const want = DIRS[pig.want];
    if (canEnter(g, pig.tx + want.x, pig.ty + want.y, "pig")) {
      return pig.want;
    }
    const d = DIRS[pig.dir];
    return canEnter(g, pig.tx + d.x, pig.ty + d.y, "pig") ? pig.dir : -1;
  }

  function pigArrives(pig) {
    const i = pig.ty * sim.grid.w + pig.tx;
    const what = sim.dots[i];
    if (!what) {
      return;
    }
    sim.dots[i] = 0;
    sim.left -= 1;
    sim.eaten += 1;
    if (what === 1) {
      add(POINTS.dot);
      out("dot", i);
    } else {
      add(POINTS.power);
      powerUp();
      out("power", i);
    }
    if (sim.vegetablesShown < VEGETABLE_AT.length && sim.eaten >= VEGETABLE_AT[sim.vegetablesShown]) {
      sim.vegetablesShown += 1;
      const v = vegetableFor(sim.level);
      sim.vegetable = { name: v.name, points: v.points, time: VEGETABLE_S };
      out("vegetable", { show: true, name: v.name });
    }
    if (sim.left === 0) {
      clearMaze();
    }
  }

  function powerUp() {
    sim.blueTime = sim.settings.frightened;
    sim.chain = 0;
    sim.caughtThisPower = 0;
    for (const a of sim.admins) {
      if (a.mode === "active" || a.mode === "leaving") {
        if (!a.blue && a.mode === "active") {
          reverse(a);
        }
        a.blue = true;
      }
    }
    out("blue", true);
  }

  function adminArrives(a) {
    const g = sim.grid;
    if (a.mode === "leaving") {
      if (a.leaveStep === 0 && a.tx === g.door.x && a.ty === g.door.y + 1) {
        a.leaveStep = 1;
      } else if (a.tx === g.gate.x && a.ty === g.gate.y) {
        a.mode = "active";
        a.dir = 1;
      }
    } else if (a.mode === "eyes") {
      const home = g.house[1] || g.house[0];
      if (a.tx === home.x && a.ty === home.y) {
        a.mode = "leaving";
        a.leaveStep = 1;
        a.blue = false;
      }
    }
  }

  function adminSpeed(a) {
    const s = sim.settings;
    if (a.mode === "eyes") {
      return s.eyes;
    }
    if (a.mode === "leaving") {
      return 0.5;
    }
    if (inTunnel(sim.grid, a.tx, a.ty)) {
      return s.adminTunnel;
    }
    if (a.blue) {
      return s.adminFrightened;
    }
    return a.id === SALES_MANAGER ? s.salesManager : s.admin;
  }

  function add(points) {
    sim.score += points;
    while (sim.score >= sim.nextExtra) {
      sim.nextExtra = sim.nextExtra === EXTRA_FIRST ? EXTRA_EVERY : sim.nextExtra + EXTRA_EVERY;
      if (sim.lives < MAX_LIVES) {
        sim.lives += 1;
        out("extraLife", sim.lives);
      }
    }
  }

  function clearMaze() {
    const bonuses = [];
    if (sim.perfectPowers >= sim.grid.powers.length) {
      add(POINTS.sweep);
      bonuses.push({ key: "omSweep", points: POINTS.sweep });
    }
    if (!sim.diedThisMaze) {
      const clean = POINTS.cleanPerLevel * sim.level;
      add(clean);
      bonuses.push({ key: "omClean", points: clean });
    }
    sim.clearedMazes += 1;
    for (const a of sim.admins) {
      a.blue = false;
    }
    setPhase("cleared");
    out("cleared", { level: sim.level, bonuses });
  }

  /** The next maze, once the picture has shown the cleared one. */
  function nextLevel() {
    if (sim.phase === "cleared") {
      startLevel(sim.level + 1);
    }
  }

  function touch(a) {
    const pig = sim.pig;
    const pd = DIRS[pig.dir];
    const ad = DIRS[a.dir];
    let dx = pig.tx + pd.x * pig.t - (a.tx + ad.x * a.t);
    const dy = pig.ty + pd.y * pig.t - (a.ty + ad.y * a.t);
    // The tunnels wrap: the two ends of a row are neighbours
    if (Math.abs(dx) > sim.grid.w / 2) {
      dx -= Math.sign(dx) * sim.grid.w;
    }
    return dx * dx + dy * dy < TOUCH * TOUCH;
  }

  function collide() {
    for (const a of sim.admins) {
      if (a.mode !== "active" && a.mode !== "leaving") {
        continue;
      }
      if (!touch(a)) {
        continue;
      }
      if (a.blue) {
        let points;
        if (a.id === SALES_MANAGER) {
          points = POINTS.salesManager;
        } else {
          points = POINTS.admins[Math.min(sim.chain, POINTS.admins.length - 1)];
          sim.chain += 1;
          sim.caughtThisPower += 1;
          if (sim.caughtThisPower === ADMIN_COUNT) {
            sim.perfectPowers += 1;
          }
        }
        add(points);
        sim.caughtTotal += 1;
        a.mode = "eyes";
        a.blue = false;
        a.eyesTime = 0;
        out("caught", { id: a.id, points, x: a.tx, y: a.ty });
      } else if (a.mode === "active") {
        sim.lives -= 1;
        sim.diedThisMaze = true;
        setPhase("dying");
        out("death", { by: a.id });
        return;
      }
    }
    const v = sim.vegetable;
    if (v) {
      const f = sim.grid.fruit;
      const pd = DIRS[sim.pig.dir];
      const dx = sim.pig.tx + pd.x * sim.pig.t - f.x;
      const dy = sim.pig.ty + pd.y * sim.pig.t - f.y;
      if (dx * dx + dy * dy < 0.36) {
        add(v.points);
        out("vegetable", { eaten: true, points: v.points, name: v.name });
        sim.vegetable = null;
      }
    }
  }

  function updateWaves(dt) {
    if (sim.blueTime > 0) {
      sim.blueTime -= dt;
      if (sim.blueTime <= 0) {
        sim.blueTime = 0;
        for (const a of sim.admins) {
          a.blue = false;
        }
        out("blue", false);
      }
      return;
    }
    const waves = sim.settings.waves;
    if (sim.wave >= waves.length) {
      return;
    }
    sim.waveTime += dt;
    if (sim.waveTime >= waves[sim.wave]) {
      sim.waveTime = 0;
      sim.wave += 1;
      sim.scatter = sim.wave % 2 === 0;
      // A change of wave turns every admin round
      for (const a of sim.admins) {
        if (a.mode === "active") {
          reverse(a);
        }
      }
    }
  }

  /** One step of the game, dt in seconds (keep it short: 1/120 s). */
  function update(dt) {
    sim.phaseTime += dt;
    if (sim.phase === "idle" || sim.phase === "over" || sim.phase === "cleared") {
      return;
    }
    sim.played += dt;
    if (sim.phase === "ready") {
      if (sim.phaseTime >= READY_S) {
        setPhase("play");
        out("go");
      }
      return;
    }
    if (sim.phase === "dying") {
      if (sim.phaseTime >= DEATH_S) {
        if (sim.lives <= 0) {
          setPhase("over");
          out("over", summary());
        } else {
          out("lost", sim.lives);
          placeEveryone();
        }
      }
      return;
    }
    // Playing
    sim.mazeTime += dt;
    updateWaves(dt);
    const pigSpeed = (sim.blueTime > 0 ? sim.settings.pigFrightened : sim.settings.pig) * BASE_SPEED;
    move(sim.pig, pigSpeed * dt, choosePig, pigArrives);
    if (sim.phase !== "play") {
      return;
    }
    for (const a of sim.admins) {
      if (a.mode === "house") {
        if (sim.mazeTime >= a.releaseAt) {
          a.mode = "leaving";
          // Right under the door already: straight up
          a.leaveStep = a.tx === sim.grid.door.x && a.ty === sim.grid.door.y + 1 ? 1 : 0;
          a.blue = sim.blueTime > 0;
        }
        continue;
      }
      if (a.mode === "eyes") {
        a.eyesTime += dt;
        if (a.eyesTime > EYES_MAX_S) {
          const home = sim.grid.house[1] || sim.grid.house[0];
          a.tx = home.x;
          a.ty = home.y;
          a.t = 0;
          a.mode = "leaving";
          a.leaveStep = 1;
          continue;
        }
      }
      move(a, adminSpeed(a) * BASE_SPEED * dt, (m) => chooseDir(m, sim), adminArrives);
    }
    collide();
    if (sim.vegetable && sim.phase === "play") {
      sim.vegetable.time -= dt;
      if (sim.vegetable.time <= 0) {
        sim.vegetable = null;
        out("vegetable", { gone: true });
      }
    }
  }

  /** What the end card and the Hall of Fame receive. */
  function summary() {
    return { score: sim.score, ms: Math.round(sim.played * 1000), level: sim.level, admins: sim.caughtTotal, mazes: sim.clearedMazes };
  }

  /** Where a mover is, in tiles, as floats (for the picture). */
  function positionOf(mover, into) {
    const d = DIRS[mover.dir];
    into.x = mover.tx + d.x * mover.t;
    into.y = mover.ty + d.y * mover.t;
    return into;
  }

  /** Whether the tile holds a dot (1), a deployment (2) or nothing (0). */
  function dotAt(i) {
    return sim.dots[i];
  }

  /** A check jumps straight to a moment: "blue", "clear" (one dot left), or a level. */
  function jump(what) {
    if (what === "blue") {
      powerUp();
    } else if (what === "clear") {
      const g = sim.grid;
      for (let i = 0; i < sim.dots.length; i++) {
        if (sim.dots[i]) {
          sim.dots[i] = 0;
          out("dot", i);
        }
      }
      // The last one two tiles ahead of the guinea pig, or beside it: eaten in a moment
      const pig = sim.pig;
      const ahead = DIRS[pig.dir];
      const spots = [
        [pig.tx + ahead.x * 2, pig.ty + ahead.y * 2],
        [pig.tx + ahead.x, pig.ty + ahead.y],
        ...DIRS.map((d) => [pig.tx + d.x, pig.ty + d.y])
      ];
      let kept = false;
      for (const [sx, sy] of spots) {
        const x = wrapX(g, sx);
        if (cellAt(g, x, sy) === PATH && !(x === pig.tx && sy === pig.ty)) {
          sim.dots[sy * g.w + x] = 1;
          pig.want = x === wrapX(g, pig.tx + ahead.x) || x === wrapX(g, pig.tx + ahead.x * 2) ? pig.dir : DIRS.findIndex((d) => wrapX(g, pig.tx + d.x) === x && pig.ty + d.y === sy);
          kept = true;
          break;
        }
      }
      sim.left = kept ? 1 : 0;
      sim.eaten = Math.max(sim.eaten, VEGETABLE_AT[VEGETABLE_AT.length - 1]);
      sim.vegetablesShown = VEGETABLE_AT.length;
      out("redraw");
    } else if (typeof what === "number" && what > 1) {
      startLevel(what);
    }
  }

  return { state: sim, newGame, steer, update, nextLevel, summary, positionOf, dotAt, jump };
}
