/*
 * The player of the check, and of the tests that measure a game. It counts how
 * many steps every admin that is not blue needs to reach each tile, and walks
 * only through the tiles it reaches first, with a margin: to the nearest dot,
 * to a blue admin while the blue lasts, to a vegetable on the way. Cornered,
 * it heads for the tile where the admins are furthest behind it. It plays
 * well, not perfectly: what it scores in a minute says what a good player
 * can, for the Hall of Fame limits.
 */
import { DIRS, OPPOSITE, canEnter, wrapX } from "./maze.js";
import { BASE_SPEED } from "./rules.js";

const MARGIN = 1.2;
const CHASE_STEPS = 10;

export function createAutoplay(sim) {
  const s = sim.state;
  let size = 0;
  let admin = null;
  let pigSteps = null;
  let first = null;
  let queue = null;

  function ensure(n) {
    if (size !== n) {
      size = n;
      admin = new Float32Array(n);
      pigSteps = new Float32Array(n);
      first = new Int8Array(n);
      queue = new Int32Array(n * 2);
    }
  }

  /** Steps from every admin that is not blue to every tile (they walk the paths, as the guinea pig). */
  function adminDistances(g) {
    admin.fill(Infinity);
    let tail = 0;
    for (const a of s.admins) {
      if (a.mode === "leaving" && !a.blue) {
        // About to come out of the house: a threat from the gate
        const gate = g.gate.y * g.w + g.gate.x;
        const cost = Math.abs(a.tx - g.gate.x) + Math.abs(a.ty - g.gate.y);
        if (cost < admin[gate]) {
          admin[gate] = cost;
          queue[tail++] = gate;
        }
        continue;
      }
      if (a.mode !== "active" || a.blue) {
        continue;
      }
      const d = DIRS[a.dir];
      // Where it is, and the tile it is about to reach
      const here = a.ty * g.w + wrapX(g, a.tx);
      const next = (a.ty + d.y) * g.w + wrapX(g, a.tx + d.x);
      for (const [i, cost] of [
        [here, a.t],
        [next, 1 - a.t]
      ]) {
        if (i >= 0 && i < size && cost < admin[i]) {
          admin[i] = cost;
          queue[tail++] = i;
        }
      }
    }
    let head = 0;
    while (head < tail) {
      const i = queue[head++];
      const x = i % g.w;
      const y = Math.floor(i / g.w);
      for (let dir = 0; dir < 4; dir++) {
        const d = DIRS[dir];
        const nx = wrapX(g, x + d.x);
        const ny = y + d.y;
        if (!canEnter(g, nx, ny, "pig")) {
          continue;
        }
        const n = ny * g.w + nx;
        if (admin[n] > admin[i] + 1) {
          admin[n] = admin[i] + 1;
          queue[tail++] = n;
        }
      }
    }
  }

  /**
   * Steps from the guinea pig to each tile, and the first way taken there. Between
   * two tiles it can go on (to the next tile) or turn back (to the one it left).
   * safe: only through the tiles it reaches before any admin, by MARGIN steps.
   */
  function pigDistances(g, ratio, safe) {
    pigSteps.fill(-1);
    let head = 0;
    let tail = 0;
    const pig = s.pig;
    const here = pig.ty * g.w + pig.tx;
    const starts = [];
    if (pig.t > 0) {
      // Planned from the tile it is going to: the way chosen is the turn taken there
      const d = DIRS[pig.dir];
      starts.push([(pig.ty + d.y) * g.w + wrapX(g, pig.tx + d.x), 1 - pig.t, -1]);
    } else {
      starts.push([here, 0, -1]);
    }
    for (const [i, cost, dir] of starts) {
      pigSteps[i] = cost;
      first[i] = dir;
      queue[tail++] = i;
    }
    while (head < tail) {
      const i = queue[head++];
      const x = i % g.w;
      const y = Math.floor(i / g.w);
      for (let dir = 0; dir < 4; dir++) {
        const d = DIRS[dir];
        const nx = wrapX(g, x + d.x);
        const ny = y + d.y;
        if (!canEnter(g, nx, ny, "pig")) {
          continue;
        }
        const n = ny * g.w + nx;
        if (pigSteps[n] >= 0) {
          continue;
        }
        const steps = pigSteps[i] + 1;
        if (safe && steps / ratio + MARGIN >= admin[n]) {
          continue;
        }
        pigSteps[n] = steps;
        first[n] = first[i] < 0 ? dir : first[i];
        queue[tail++] = n;
      }
    }
  }

  /** The first way towards the nearest reached tile that wanted() likes, or null. */
  function nearest(wanted, maxSteps = Infinity) {
    let best = -1;
    let bestSteps = Infinity;
    for (let i = 0; i < size; i++) {
      const steps = pigSteps[i];
      if (steps >= 0 && first[i] >= 0 && steps < bestSteps && steps <= maxSteps && wanted(i)) {
        best = i;
        bestSteps = steps;
      }
    }
    return best < 0 ? null : first[best];
  }

  /** Cornered: the way to the reachable tile where the admins are furthest behind the guinea pig. */
  function escape(g, ratio) {
    pigDistances(g, ratio, false);
    let best = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < size; i++) {
      if (pigSteps[i] < 0 || first[i] < 0) {
        continue;
      }
      const score = Math.min(admin[i], 40) - pigSteps[i] / ratio;
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    return best < 0 ? -1 : first[best];
  }

  return {
    /** Steers the guinea pig; call it every step of the game. */
    step() {
      if (s.phase !== "play") {
        return;
      }
      const g = s.grid;
      ensure(g.w * g.h);
      adminDistances(g);
      const pigSpeed = (s.blueTime > 0 ? s.settings.pigFrightened : s.settings.pig) * BASE_SPEED;
      const adminSpeed = Math.max(s.settings.admin, s.settings.salesManager) * BASE_SPEED;
      const ratio = pigSpeed / adminSpeed;
      const pig = s.pig;
      if (pig.t > 0) {
        const d = DIRS[pig.dir];
        const ahead = (pig.ty + d.y) * g.w + wrapX(g, pig.tx + d.x);
        if ((1 - pig.t) / ratio + MARGIN >= admin[ahead] && pig.t < 0.5) {
          // An admin gets there first: back the way it came, once
          sim.steer(OPPOSITE[pig.dir]);
          return;
        }
      }
      pigDistances(g, ratio, true);
      let dir = null;
      if (s.blueTime > 1.2) {
        const blue = new Set();
        for (const a of s.admins) {
          if (a.blue && a.mode === "active") {
            blue.add(a.ty * g.w + wrapX(g, a.tx));
          }
        }
        if (blue.size) {
          dir = nearest((i) => blue.has(i), CHASE_STEPS);
        }
      }
      if (dir === null && s.vegetable) {
        const f = g.fruit.y * g.w + g.fruit.x;
        dir = nearest((i) => i === f, 14);
      }
      if (dir === null) {
        // A deployment first when an admin is close
        const close = s.admins.some((a) => a.mode === "active" && !a.blue && Math.abs(a.tx - s.pig.tx) + Math.abs(a.ty - s.pig.ty) < 6);
        if (close) {
          dir = nearest((i) => s.dots[i] === 2, 12);
        }
      }
      if (dir === null) {
        dir = nearest((i) => s.dots[i] > 0);
      }
      if (dir === null) {
        dir = escape(g, ratio);
      }
      // Between two tiles the plan is the turn taken at the next one: a way
      // back there is a U-turn at that tile, not a reverse now
      if (dir !== null && dir >= 0 && !(pig.t > 0 && dir === OPPOSITE[pig.dir])) {
        sim.steer(dir);
      }
    }
  };
}
