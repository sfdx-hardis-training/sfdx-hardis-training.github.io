/*
 * The physics of Pipeline Pinball: balls rolling on a tilted table, seen from
 * above, in table units (x across, y up the table from the drain, a ball of
 * radius 0.27: 1 unit is 5 cm). No Three.js here: scripts/guinea-run/pinball.test.mjs
 * runs it in Node.
 *
 * Two shapes make the whole table. A capsule is a segment with a radius, which
 * may taper from one end to the other: walls, rails, posts, targets, gates and
 * the flippers. A circle is a capsule of length 0: bumpers and toys. Sensors
 * see a ball cross a line or enter a circle (rollovers, spinners, scoops, the
 * drain), and paths carry a ball off the table and back (ramps, wire rails, the
 * way up to the Production floor).
 *
 * Steps are fixed and short (STEP), so the fastest ball moves a third of its
 * radius per step: it never passes through a wall, a flipper or another ball.
 * Nothing is allocated while the table plays: every object is made at build
 * time, and the events of a frame go into a ring the rules read.
 */

export const STEP = 1 / 720;
// Down the table, in table units per second squared (1 unit is 5 cm, the
// ball 27 mm across): a real table's 6.5 degrees, for a ball that rolls, so
// 5/7 of g sin(6.5): 0.79 m/s2
export const GRAVITY = 16;
// Straight down, for the small hops off the rubbers and the targets
const DROP_GRAVITY = 196;
export const BALL_RADIUS = 0.27;
export const MAX_SPEED = 95;
// A ball on a ramp climbs against a steeper slope than the table's
const RAMP_GRAVITY = 3.2;
const ROLLING_DRAG = 0.12;
// The grid that finds the shapes near a ball
const CELL = 1.5;
const GRID_X0 = -7;
const GRID_Y0 = -3;
const GRID_W = 11;
const GRID_H = 26;
// Room for the biggest ball (the giant one of mission 1) around every shape in the grid
const GRID_MARGIN = 0.9;
const MAX_EVENTS = 256;
const MAX_BALLS = 6;

/** Builds an empty world; the layout adds its shapes, then calls build(). */
export function createPhysics() {
  const shapes = [];
  const moving = [];
  const sensors = [];
  // Spinning discs in the playfield: a ball rolling over one is swept round it
  const fields = [];
  const paths = [];
  const flippers = [];
  const balls = [];
  const grid = [];
  for (let i = 0; i < GRID_W * GRID_H; i++) {
    grid.push([]);
  }
  const events = [];
  for (let i = 0; i < MAX_EVENTS; i++) {
    events.push({ type: "", tag: "", value: 0, ball: null });
  }
  let eventCount = 0;
  let plunger = null;
  let built = false;
  let gravity = GRAVITY;
  let time = 0;
  let leftover = 0;
  // Bumpers and slingshots fire; a tilt switches them off, as on a real table
  let kicks = true;
  // A coil never fires twice exactly the same: a small variation on every kick
  let jitter = () => 0;

  for (let i = 0; i < MAX_BALLS; i++) {
    balls.push({
      id: i,
      active: false,
      // "table", "path" (on a ramp) or "held" (in a scoop, by the rules)
      mode: "table",
      x: 0,
      y: 0,
      h: 0,
      // The speed of a hop, straight up
      hv: 0,
      vx: 0,
      vy: 0,
      r: BALL_RADIUS,
      floor: 0,
      path: null,
      s: 0,
      v: 0,
      // A sensor just left is not seen again for a moment (a ball sitting on a line)
      lastSensor: null,
      lastSensorAt: -1,
      // The spinning disc the ball is on, if any
      field: null,
      // The hole holding it, while it is held
      holder: null,
      // Out of sight while the view shows the Production floor: it waits, still
      frozen: false,
      // The view rolls the guinea pig from these
      spinX: 0,
      spinY: 0,
      contact: 0
    });
  }

  function emit(type, tag, value, ball) {
    if (eventCount >= MAX_EVENTS) {
      return;
    }
    const e = events[eventCount++];
    e.type = type;
    e.tag = tag;
    e.value = value;
    e.ball = ball;
  }

  /**
   * A capsule from (ax, ay) to (bx, by). options: r (its radius at a), rb (at
   * b, for a taper), floor (0 the table, 1 the Production floor), bounce
   * (restitution), kick (a speed added along the normal at a hit: bumpers and
   * slingshots), kickMin (the impact speed a slingshot needs), kickProfile
   * (a slingshot: the kick is strongest in the middle of its band, nothing at
   * its ends), falloff (the bounce softens as the impact gets harder, as a
   * rubber does: bounce / (1 + falloff x impact speed)), hop (a ball hit hard
   * jumps a little off it: the share of the impact speed), oneWay ({ x, y },
   * the only direction a ball may cross it), tag (named in the hit events),
   * moving (its position changes while the table plays).
   */
  function capsule(ax, ay, bx, by, options) {
    const o = options || {};
    const shape = {
      ax,
      ay,
      bx,
      by,
      r: o.r === undefined ? 0.08 : o.r,
      rb: o.rb === undefined ? (o.r === undefined ? 0.08 : o.r) : o.rb,
      floor: o.floor || 0,
      bounce: o.bounce === undefined ? 0.5 : o.bounce,
      friction: o.friction === undefined ? 0.02 : o.friction,
      kick: o.kick || 0,
      kickMin: o.kickMin || 0,
      kickProfile: Boolean(o.kickProfile),
      falloff: o.falloff || 0,
      hop: o.hop || 0,
      oneWayX: o.oneWay ? o.oneWay.x : 0,
      oneWayY: o.oneWay ? o.oneWay.y : 0,
      tag: o.tag || "",
      enabled: o.enabled !== false,
      moving: Boolean(o.moving),
      // The speed of a moving shape, which a hit passes to the ball
      vx: 0,
      vy: 0,
      // For a flipper: the pivot and the angular speed
      pivotX: 0,
      pivotY: 0,
      omega: 0,
      lastHit: -1
    };
    shapes.push(shape);
    if (shape.moving) {
      moving.push(shape);
    }
    return shape;
  }

  function circle(x, y, r, options) {
    return capsule(x, y, x, y, Object.assign({}, options, { r, rb: r }));
  }

  /** A polyline of capsules through points [x0, y0, x1, y1, ...]. */
  function wall(points, options) {
    const out = [];
    for (let i = 0; i + 3 < points.length; i += 2) {
      out.push(capsule(points[i], points[i + 1], points[i + 2], points[i + 3], options));
    }
    return out;
  }

  /** An arc of capsules round (cx, cy), from angle a0 to a1 (radians), in n pieces. */
  function arc(cx, cy, radius, a0, a1, n, options) {
    const points = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      points.push(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
    }
    return wall(points, options);
  }

  /**
   * A line sensor from a to b. A ball crossing it emits "cross" with its tag,
   * and the side it came from: value > 0 when it crossed along the normal
   * (the left of a to b), < 0 the other way. options: floor, tag, path (a ball
   * crossing along the normal goes onto that path), minSpeed (for a path).
   */
  function line(ax, ay, bx, by, options) {
    const o = options || {};
    const dx = bx - ax;
    const dy = by - ay;
    const length = Math.hypot(dx, dy) || 1;
    const sensor = { kind: "line", ax, ay, bx, by, nx: -dy / length, ny: dx / length, length, floor: o.floor || 0, tag: o.tag || "", path: o.path || null, enabled: o.enabled !== false };
    sensors.push(sensor);
    return sensor;
  }

  /**
   * A spinning disc at (x, y): a ball rolling over it is swept round it,
   * strength the speed it pushes to, and emits "enter" with its tag as it
   * comes on. enabled: false stops it.
   */
  function disc(x, y, r, options) {
    const o = options || {};
    const field = { ax: x, ay: y, r, strength: o.strength || 14, floor: o.floor || 0, tag: o.tag || "", enabled: o.enabled !== false };
    fields.push(field);
    return field;
  }

  /**
   * A round sensor: a ball whose centre enters it emits "enter"; with
   * capture, it is held there. maxSpeed: a saucer in the open playfield, which
   * a ball faster than this rattles over (as on the arcade, only a ball that
   * arrives gently stays in).
   */
  function hole(x, y, r, options) {
    const o = options || {};
    const sensor = { kind: "hole", ax: x, ay: y, r, floor: o.floor || 0, tag: o.tag || "", capture: Boolean(o.capture), maxSpeed: o.maxSpeed || Infinity, enabled: o.enabled !== false, holding: null };
    sensors.push(sensor);
    return sensor;
  }

  /**
   * A path off the table: points [x, y, h, ...] (h the height above the
   * floor, for the climb and the view). A ball that enters with too little
   * speed rolls back down and leaves where it came in. options: tag,
   * exitFloor (the floor it lands on), friction (speed lost per second).
   */
  function path(points, options) {
    const o = options || {};
    const n = points.length / 3;
    const lengths = new Float64Array(n);
    for (let i = 1; i < n; i++) {
      lengths[i] = lengths[i - 1] + Math.hypot(points[i * 3] - points[i * 3 - 3], points[i * 3 + 1] - points[i * 3 - 2], points[i * 3 + 2] - points[i * 3 - 1]);
    }
    const p = {
      points: Float64Array.from(points),
      lengths,
      total: lengths[n - 1],
      tag: o.tag || "",
      exitFloor: o.exitFloor || 0,
      entryFloor: o.entryFloor || 0,
      friction: o.friction === undefined ? 4 : o.friction,
      // A wire holds the ball back as it rolls, and the guide at its end drops
      // it out no faster than exitMax: a ball back from a ramp reaches the
      // inlane slowly, as on a real table
      drag: o.drag === undefined ? 0.35 : o.drag,
      exitMax: o.exitMax === undefined ? Infinity : o.exitMax
    };
    paths.push(p);
    return p;
  }

  /**
   * A flipper turning round (px, py). side: 1 for the left one (its tip to the
   * right), -1 for the right one. rest and up are angles of the tip from the
   * pivot, in radians, for the left flipper; the right one mirrors them.
   */
  function flipper(px, py, length, options) {
    const o = options || {};
    const side = o.side || 1;
    // A rubber ring all round the bat: lively for a ball that drops on it, deader for a hard one
    const shape = capsule(px, py, px, py, { r: o.r || 0.34, rb: o.rb || 0.18, floor: o.floor || 0, bounce: 0.55, falloff: 0.0075, friction: 0.12, tag: o.tag || "", moving: true });
    shape.pivotX = px;
    shape.pivotY = py;
    const f = {
      shape,
      side,
      length,
      rest: o.rest === undefined ? -0.5 : o.rest,
      up: o.up === undefined ? 0.52 : o.up,
      angle: o.rest === undefined ? -0.5 : o.rest,
      omega: 0,
      // As a coil does: the bat speeds up all the way, up in about 30 ms,
      // and falls back on its spring in about 70 ms (radians per second, and
      // per second squared)
      upSpeed: o.upSpeed || 75,
      upAccel: o.upAccel || 2000,
      downSpeed: o.downSpeed || 16,
      downAccel: o.downAccel || 600,
      held: false,
      enabled: true
    };
    place(f);
    flippers.push(f);
    return f;
  }

  function place(f) {
    const a = f.side === 1 ? f.angle : Math.PI - f.angle;
    f.shape.bx = f.shape.pivotX + Math.cos(a) * f.length;
    f.shape.by = f.shape.pivotY + Math.sin(a) * f.length;
    // The angular speed of the right flipper turns the other way round
    f.shape.omega = f.omega * f.side;
  }

  /** The plunger at the bottom of a lane: a bar at y, between x0 and x1. */
  function setPlunger(x0, x1, y) {
    const shape = capsule(x0, y, x1, y, { r: 0.1, bounce: 0.1, moving: true, tag: "plunger" });
    // The launch speed for a pull: a soft or middle pull drops the ball in
    // the top lanes (the skill shot), a full one sends it round the orbit
    plunger = { shape, x: (x0 + x1) / 2, y, pull: 0, held: false, travel: 0.9, curve: [0, 20, 0.22, 27.1, 0.78, 28.85, 1, 40] };
    return plunger;
  }

  function launchSpeed(pull) {
    const c = plunger.curve;
    for (let i = 0; i + 3 < c.length; i += 2) {
      if (pull <= c[i + 2]) {
        return c[i + 1] + ((pull - c[i]) / (c[i + 2] - c[i])) * (c[i + 3] - c[i + 1]);
      }
    }
    return c[c.length - 1];
  }

  /**
   * Moves every y of the table through fn: shapes, flipper pivots, sensors,
   * paths (their lengths again). The layout builds the table at its design
   * size, then stretches it; call build() after.
   */
  function transformY(fn) {
    for (const f of fields) {
      f.ay = fn(f.ay);
    }
    for (const s of shapes) {
      s.ay = fn(s.ay);
      s.by = fn(s.by);
      s.pivotY = fn(s.pivotY);
    }
    for (const s of sensors) {
      s.ay = fn(s.ay);
      s.by = fn(s.by);
    }
    for (const p of paths) {
      const n = p.points.length / 3;
      for (let i = 0; i < n; i++) {
        p.points[i * 3 + 1] = fn(p.points[i * 3 + 1]);
      }
      for (let i = 1; i < n; i++) {
        p.lengths[i] = p.lengths[i - 1] + Math.hypot(p.points[i * 3] - p.points[i * 3 - 3], p.points[i * 3 + 1] - p.points[i * 3 - 2], p.points[i * 3 + 2] - p.points[i * 3 - 1]);
      }
      p.total = p.lengths[n - 1];
    }
    for (const f of flippers) {
      place(f);
    }
  }

  function build() {
    for (const list of grid) {
      list.length = 0;
    }
    for (const shape of shapes) {
      if (shape.moving) {
        continue;
      }
      const r = Math.max(shape.r, shape.rb) + GRID_MARGIN;
      const x0 = cellX(Math.min(shape.ax, shape.bx) - r);
      const x1 = cellX(Math.max(shape.ax, shape.bx) + r);
      const y0 = cellY(Math.min(shape.ay, shape.by) - r);
      const y1 = cellY(Math.max(shape.ay, shape.by) + r);
      for (let cy = y0; cy <= y1; cy++) {
        for (let cx = x0; cx <= x1; cx++) {
          grid[cy * GRID_W + cx].push(shape);
        }
      }
    }
    built = true;
  }

  function cellX(x) {
    return Math.max(0, Math.min(GRID_W - 1, Math.floor((x - GRID_X0) / CELL)));
  }

  function cellY(y) {
    return Math.max(0, Math.min(GRID_H - 1, Math.floor((y - GRID_Y0) / CELL)));
  }

  /* ---------- The balls ---------- */

  /** A ball on the table at (x, y), or null when every ball is in play. */
  function addBall(x, y, vx, vy, floor) {
    for (const ball of balls) {
      if (!ball.active) {
        ball.active = true;
        ball.mode = "table";
        ball.x = x;
        ball.y = y;
        ball.h = 0;
        ball.hv = 0;
        ball.vx = vx || 0;
        ball.vy = vy || 0;
        ball.r = BALL_RADIUS;
        ball.floor = floor || 0;
        ball.path = null;
        ball.lastSensor = null;
        ball.contact = 0;
        ball.holder = null;
        ball.frozen = false;
        return ball;
      }
    }
    return null;
  }

  function removeBall(ball) {
    letGo(ball);
    ball.frozen = false;
    ball.active = false;
    ball.mode = "table";
    ball.path = null;
  }

  /** The rules hold a ball (a scoop, a lock): it waits, still, until release(). */
  function hold(ball, x, y, sensor) {
    letGo(ball);
    if (sensor) {
      sensor.holding = ball;
      ball.holder = sensor;
    }
    ball.mode = "held";
    ball.x = x;
    ball.y = y;
    ball.vx = 0;
    ball.vy = 0;
  }

  function release(ball, vx, vy) {
    letGo(ball);
    ball.mode = "table";
    ball.vx = vx;
    ball.vy = vy;
    // Still over the hole it was held in: not caught again on the way out
    ball.lastSensorAt = time;
  }

  /** A ball onto a path from its start, at a speed: a ball served by the rules (a lock let go, a wire rail). */
  function sendOnPath(ball, p, speed) {
    letGo(ball);
    ball.mode = "path";
    ball.path = p;
    ball.s = 0;
    ball.v = speed;
    pathPoint(ball);
  }

  /** The hole holding a ball is free again: it can catch the next one. */
  function letGo(ball) {
    if (ball.holder) {
      if (ball.holder.holding === ball) {
        ball.holder.holding = null;
      }
      ball.holder = null;
    }
  }

  /**
   * While the view shows the Production floor, a ball below it, out of sight,
   * waits where it is until the view comes back to it: no ball is lost where
   * the player cannot see it. sight: { up, from, to }, the table y the view
   * shows; up while it frames the Production floor.
   */
  function freezeOutOfSight(sight) {
    for (const ball of balls) {
      if (!ball.active) {
        continue;
      }
      if (ball.floor === 1 && ball.mode === "table") {
        ball.frozen = false;
        continue;
      }
      const out = ball.y < sight.from || ball.y > sight.to;
      ball.frozen = out && (sight.up || ball.frozen);
    }
  }

  /* ---------- One step ---------- */

  function step() {
    time += STEP;
    for (const f of flippers) {
      stepFlipper(f);
    }
    if (plunger) {
      const target = plunger.y - plunger.pull * plunger.travel;
      const s = plunger.shape;
      s.vy = (target - s.ay) / STEP;
      s.ay = target;
      s.by = target;
    }
    for (const ball of balls) {
      if (!ball.active) {
        continue;
      }
      if (ball.frozen || ball.mode === "held") {
        continue;
      }
      if (ball.mode === "path") {
        stepPath(ball);
        continue;
      }
      stepBall(ball);
    }
    collideBalls();
    if (plunger) {
      plunger.shape.vy = 0;
    }
  }

  function stepFlipper(f) {
    const up = f.held && f.enabled;
    const target = up ? f.up : f.rest;
    if (f.angle < target) {
      f.omega = Math.max(0, f.omega);
      f.omega = Math.min(up ? f.upSpeed : f.downSpeed, f.omega + (up ? f.upAccel : f.downAccel) * STEP);
      f.angle = Math.min(target, f.angle + f.omega * STEP);
    } else if (f.angle > target) {
      f.omega = Math.min(0, f.omega);
      f.omega = Math.max(-(up ? f.upSpeed : f.downSpeed), f.omega - (up ? f.upAccel : f.downAccel) * STEP);
      f.angle = Math.max(target, f.angle + f.omega * STEP);
    } else {
      f.omega = 0;
    }
    if (f.angle === target) {
      // The flipper stops dead at its stop: it pushes no more
      f.omega = 0;
    }
    place(f);
  }

  function stepBall(ball) {
    const px = ball.x;
    const py = ball.y;
    ball.vy -= gravity * STEP;
    const drag = 1 - ROLLING_DRAG * STEP;
    ball.vx *= drag;
    ball.vy *= drag;
    ball.x += ball.vx * STEP;
    ball.y += ball.vy * STEP;
    ball.contact = Math.max(0, ball.contact - STEP);
    // A small hop off a rubber or a target: up, then back on the playfield with a tiny bounce
    if (ball.h > 0 || ball.hv > 0) {
      ball.h += ball.hv * STEP;
      ball.hv -= DROP_GRAVITY * STEP;
      if (ball.h <= 0) {
        ball.h = 0;
        ball.hv = ball.hv < -6 ? -ball.hv * 0.3 : 0;
      }
    }
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      const dx = ball.x - f.ax;
      const dy = ball.y - f.ay;
      const d2 = dx * dx + dy * dy;
      if (!f.enabled || f.floor !== ball.floor || d2 > f.r * f.r) {
        if (ball.field === f) {
          ball.field = null;
        }
        continue;
      }
      if (ball.field !== f) {
        ball.field = f;
        emit("enter", f.tag, Math.hypot(ball.vx, ball.vy), ball);
      }
      // Pulled along the turn of the disc, a little outwards
      const d = Math.sqrt(d2) || 1;
      const tx = -dy / d;
      const ty = dx / d;
      const along = ball.vx * tx + ball.vy * ty;
      const k = Math.min(1, 9 * STEP);
      ball.vx += tx * (f.strength - along) * k + (dx / d) * 6 * STEP;
      ball.vy += ty * (f.strength - along) * k + (dy / d) * 6 * STEP;
    }
    const cell = grid[cellY(ball.y) * GRID_W + cellX(ball.x)];
    for (let i = 0; i < cell.length; i++) {
      collide(ball, cell[i]);
    }
    for (let i = 0; i < moving.length; i++) {
      collide(ball, moving[i]);
    }
    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed > MAX_SPEED) {
      ball.vx *= MAX_SPEED / speed;
      ball.vy *= MAX_SPEED / speed;
    }
    // Rolling, for the view: the distance covered, across and along
    ball.spinX += ball.x - px;
    ball.spinY += ball.y - py;
    checkSensors(ball, px, py);
    if (ball.active && ball.mode === "table" && ball.y < -1.2) {
      removeBall(ball);
      emit("drain", "", 0, ball);
    }
  }

  function collide(ball, shape) {
    if (!shape.enabled || shape.floor !== ball.floor) {
      return;
    }
    const abx = shape.bx - shape.ax;
    const aby = shape.by - shape.ay;
    const len2 = abx * abx + aby * aby;
    let t = len2 > 0 ? ((ball.x - shape.ax) * abx + (ball.y - shape.ay) * aby) / len2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const cx = shape.ax + abx * t;
    const cy = shape.ay + aby * t;
    let dx = ball.x - cx;
    let dy = ball.y - cy;
    const reach = ball.r + shape.r + (shape.rb - shape.r) * t;
    const d2 = dx * dx + dy * dy;
    if (d2 >= reach * reach) {
      return;
    }
    // A one-way gate lets a ball through in its direction
    if ((shape.oneWayX || shape.oneWayY) && ball.vx * shape.oneWayX + ball.vy * shape.oneWayY > 0) {
      return;
    }
    let d = Math.sqrt(d2);
    let depth = reach - d;
    if (d < 1e-6) {
      // Dead centre: push it up the table
      dx = 0;
      dy = 1;
      d = 1;
      depth = reach;
    }
    const nx = dx / d;
    const ny = dy / d;
    ball.x += nx * depth;
    ball.y += ny * depth;
    // The speed of the surface where it is hit: a flipper turning, a toy moving
    let sx = shape.vx;
    let sy = shape.vy;
    if (shape.omega) {
      sx = -shape.omega * (cy - shape.pivotY);
      sy = shape.omega * (cx - shape.pivotX);
    }
    let rx = ball.vx - sx;
    let ry = ball.vy - sy;
    const vn = rx * nx + ry * ny;
    if (vn < 0) {
      const bounce = shape.falloff ? shape.bounce / (1 + shape.falloff * -vn) : shape.bounce;
      rx -= (1 + bounce) * vn * nx;
      ry -= (1 + bounce) * vn * ny;
      // A little grip along the surface, on an impact only: a ball rolling
      // along a wall or a flipper keeps rolling
      if (-vn > 1.5) {
        const tx = -ny;
        const ty = nx;
        const vt = rx * tx + ry * ty;
        rx -= vt * shape.friction * tx;
        ry -= vt * shape.friction * ty;
      }
      ball.vx = rx + sx;
      ball.vy = ry + sy;
      if (shape.hop && -vn > 8 && ball.h === 0) {
        ball.hv = -vn * shape.hop;
      }
      if (shape.kick && kicks && -vn >= shape.kickMin) {
        // A slingshot's band pushes hardest in its middle
        const along = shape.kickProfile ? 1 - (2 * t - 1) * (2 * t - 1) : 1;
        const kick = shape.kick * (1 + jitter()) * Math.max(0.3, along);
        ball.vx += nx * kick;
        ball.vy += ny * kick;
      }
      // One event per hit, not one per step of a ball resting on it
      if (shape.tag && (-vn > 2 || shape.kick) && time - shape.lastHit > 0.08) {
        shape.lastHit = time;
        emit("hit", shape.tag, -vn, ball);
      }
      ball.contact = 0.05;
    }
  }

  function checkSensors(ball, px, py) {
    for (let i = 0; i < sensors.length; i++) {
      const s = sensors[i];
      if (!s.enabled || s.floor !== ball.floor) {
        continue;
      }
      if (s.kind === "hole") {
        const dx = ball.x - s.ax;
        const dy = ball.y - s.ay;
        if (dx * dx + dy * dy < s.r * s.r) {
          if (ball.vx * ball.vx + ball.vy * ball.vy > s.maxSpeed * s.maxSpeed) {
            // Too fast: it rattles over the rim and goes on, a little slower
            ball.vx *= 0.97;
            ball.vy *= 0.97;
            continue;
          }
          if (ball.lastSensor === s && time - ball.lastSensorAt < 0.3) {
            ball.lastSensorAt = time;
            continue;
          }
          ball.lastSensor = s;
          ball.lastSensorAt = time;
          if (s.capture && s.holding && s.holding !== ball && s.holding.active && s.holding.mode === "held") {
            // A ball already sits in it: one ball per hole, as on the arcade
            continue;
          }
          if (s.capture) {
            hold(ball, s.ax, s.ay, s);
          }
          emit("enter", s.tag, Math.hypot(ball.vx, ball.vy), ball);
          if (!ball.active || ball.mode !== "table") {
            return;
          }
        }
        continue;
      }
      // A line: the side the centre was on, then and now
      const before = (px - s.ax) * s.nx + (py - s.ay) * s.ny;
      const after = (ball.x - s.ax) * s.nx + (ball.y - s.ay) * s.ny;
      if ((before < 0) === (after < 0)) {
        continue;
      }
      // Within the length of the line
      const along = ((ball.x - s.ax) * (s.bx - s.ax) + (ball.y - s.ay) * (s.by - s.ay)) / s.length;
      if (along < -ball.r * 0.5 || along > s.length + ball.r * 0.5) {
        continue;
      }
      const forward = after > before ? 1 : -1;
      if (s.path && forward > 0) {
        const speed = ball.vx * s.nx + ball.vy * s.ny;
        sendOnPath(ball, s.path, Math.max(0, speed));
        emit("ramp", s.path.tag, speed, ball);
        return;
      }
      emit("cross", s.tag, forward * Math.hypot(ball.vx, ball.vy), ball);
    }
  }

  function stepPath(ball) {
    const p = ball.path;
    const i = segmentAt(p, ball.s);
    const pts = p.points;
    const seg = p.lengths[i + 1] - p.lengths[i] || 1;
    const dy = (pts[i * 3 + 4] - pts[i * 3 + 1]) / seg;
    const dh = (pts[i * 3 + 5] - pts[i * 3 + 2]) / seg;
    ball.v -= (gravity * dy + gravity * RAMP_GRAVITY * dh) * STEP;
    // Rolling friction slows a moving ball, it never holds a stopped one on a slope
    if (Math.abs(ball.v) > 1) {
      ball.v -= Math.sign(ball.v) * p.friction * STEP;
    }
    ball.v -= ball.v * p.drag * STEP;
    ball.s += ball.v * STEP;
    if (ball.s <= 0 && ball.v <= 0) {
      // Not enough speed: it rolls back where it came from. A deflector
      // under the entrance plate turns it towards the middle of the table,
      // so a missed ramp comes back to the flippers instead of the drain
      const back = Math.max(4, -ball.v);
      const ex = pts[3] - pts[0] + (pts[0] > 0.5 ? 0.45 : pts[0] < -0.5 ? -0.45 : 0) * Math.hypot(pts[3] - pts[0], pts[4] - pts[1]);
      const ey = pts[4] - pts[1];
      const el = Math.hypot(ex, ey) || 1;
      ball.mode = "table";
      ball.path = null;
      ball.floor = p.entryFloor;
      ball.x = pts[0] - (ex / el) * 0.05;
      ball.y = pts[1] - (ey / el) * 0.05;
      ball.h = 0;
      ball.hv = 0;
      ball.vx = (-ex / el) * back;
      ball.vy = (-ey / el) * back;
      emit("rampBack", p.tag, 0, ball);
      return;
    }
    if (ball.s >= p.total) {
      const n = pts.length / 3;
      const ex = pts[(n - 1) * 3] - pts[(n - 2) * 3];
      const ey = pts[(n - 1) * 3 + 1] - pts[(n - 2) * 3 + 1];
      const el = Math.hypot(ex, ey) || 1;
      const speed = Math.min(p.exitMax, Math.max(3, ball.v));
      ball.mode = "table";
      ball.path = null;
      ball.floor = p.exitFloor;
      ball.x = pts[(n - 1) * 3];
      ball.y = pts[(n - 1) * 3 + 1];
      ball.h = 0;
      ball.vx = (ex / el) * speed;
      ball.vy = (ey / el) * speed;
      ball.lastSensor = null;
      emit("rampDone", p.tag, speed, ball);
      return;
    }
    const px = ball.x;
    const py = ball.y;
    pathPoint(ball);
    ball.spinX += ball.x - px;
    ball.spinY += ball.y - py;
  }

  function segmentAt(p, s) {
    const n = p.lengths.length;
    let i = 0;
    while (i < n - 2 && p.lengths[i + 1] < s) {
      i++;
    }
    return i;
  }

  function pathPoint(ball) {
    const p = ball.path;
    const s = Math.max(0, Math.min(p.total, ball.s));
    const i = segmentAt(p, s);
    const seg = p.lengths[i + 1] - p.lengths[i] || 1;
    const k = (s - p.lengths[i]) / seg;
    const pts = p.points;
    ball.x = pts[i * 3] + (pts[i * 3 + 3] - pts[i * 3]) * k;
    ball.y = pts[i * 3 + 1] + (pts[i * 3 + 4] - pts[i * 3 + 1]) * k;
    ball.h = pts[i * 3 + 2] + (pts[i * 3 + 5] - pts[i * 3 + 2]) * k;
  }

  /**
   * Two balls on the table bounce off each other. A ball held in a hole, or
   * waiting out of sight, stands still like a post: the other one bounces off
   * it, so a second ball never drops into a hole already holding one.
   */
  function collideBalls() {
    for (let i = 0; i < balls.length; i++) {
      const a = balls[i];
      const aMoving = ballMoving(a);
      if (!aMoving && !ballStill(a)) {
        continue;
      }
      for (let j = i + 1; j < balls.length; j++) {
        const b = balls[j];
        const bMoving = ballMoving(b);
        if ((!bMoving && !ballStill(b)) || (!aMoving && !bMoving) || b.floor !== a.floor) {
          continue;
        }
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const reach = a.r + b.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= reach * reach || d2 < 1e-12) {
          continue;
        }
        const d = Math.sqrt(d2);
        const nx = dx / d;
        const ny = dy / d;
        if (!aMoving || !bMoving) {
          // One of them stands still: only the other moves, and bounces off
          const mover = aMoving ? a : b;
          const sign = aMoving ? -1 : 1;
          mover.x += sign * nx * (reach - d);
          mover.y += sign * ny * (reach - d);
          const vn = (mover.vx * nx + mover.vy * ny) * sign;
          if (vn < 0) {
            mover.vx -= sign * nx * vn * 1.5;
            mover.vy -= sign * ny * vn * 1.5;
          }
          continue;
        }
        const push = (reach - d) / 2;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
        const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (vn < 0) {
          const j2 = -0.95 * vn;
          a.vx -= nx * j2;
          a.vy -= ny * j2;
          b.vx += nx * j2;
          b.vy += ny * j2;
        }
      }
    }
  }

  function ballMoving(ball) {
    return ball.active && ball.mode === "table" && !ball.frozen;
  }

  function ballStill(ball) {
    return ball.active && (ball.mode === "held" || (ball.mode === "table" && ball.frozen));
  }

  return {
    shapes,
    sensors,
    paths,
    flippers,
    balls,
    capsule,
    circle,
    wall,
    arc,
    line,
    hole,
    path,
    flipper,
    disc,
    fields,
    setPlunger,
    transformY,
    build,
    addBall,
    removeBall,
    hold,
    release,
    sendOnPath,
    freezeOutOfSight,
    get plunger() {
      return plunger;
    },
    get time() {
      return time;
    },
    /** fn() returns the variation of a kick, a small fraction around 0. */
    setJitter(fn) {
      jitter = fn;
    },
    /** Bumpers and slingshots on or off (off while the table is tilted). */
    setKicks(on) {
      kicks = on;
    },
    /** Down the table: the levels make it steeper. */
    setGravity(g) {
      gravity = g;
    },
    get gravity() {
      return gravity;
    },
    /**
     * Runs the table for dt seconds, in fixed steps. The rest of a step is
     * kept for the next call, so the table runs at the same pace at any
     * frame rate. Returns the events since the last call to events().
     */
    advance(dt) {
      if (!built) {
        build();
      }
      leftover += dt;
      while (leftover >= STEP) {
        leftover -= STEP;
        step();
      }
    },
    /** The events of the steps run since the last read: { type, tag, value, ball }, then cleared. */
    readEvents(handler) {
      const n = eventCount;
      eventCount = 0;
      for (let i = 0; i < n; i++) {
        handler(events[i]);
      }
    },
    /** A push of the table: every ball on it moves a little. */
    nudge(dx, dy) {
      for (const ball of balls) {
        if (ball.active && ball.mode === "table" && !ball.frozen) {
          ball.vx += dx;
          ball.vy += dy;
        }
      }
    },
    /** Pulls the plunger (0 to 1), or lets it go: a ball resting on it is launched. */
    pullPlunger(amount) {
      if (plunger) {
        plunger.pull = Math.max(0, Math.min(1, amount));
      }
    },
    releasePlunger() {
      if (!plunger) {
        return null;
      }
      const pull = plunger.pull;
      plunger.pull = 0;
      const s = plunger.shape;
      s.ay = plunger.y;
      s.by = plunger.y;
      let launched = null;
      for (const ball of balls) {
        if (ball.active && ball.mode === "table" && ball.floor === 0 && Math.abs(ball.x - plunger.x) < 0.6 && ball.y < plunger.y + ball.r + 0.6 && ball.y > plunger.y - plunger.travel - 0.2) {
          ball.y = plunger.y + ball.r + s.r + 0.01;
          ball.vy = launchSpeed(pull);
          ball.vx = 0;
          launched = ball;
        }
      }
      return launched;
    },
    /** Is a ball resting on the plunger? */
    ballOnPlunger() {
      if (!plunger) {
        return null;
      }
      for (const ball of balls) {
        if (ball.active && ball.mode === "table" && ball.floor === 0 && Math.abs(ball.x - plunger.x) < 0.6 && ball.y < plunger.y + 1.2 && (Math.abs(ball.vy) < 2 || ball.frozen)) {
          return ball;
        }
      }
      return null;
    },
    activeBalls() {
      let n = 0;
      for (const ball of balls) {
        if (ball.active) {
          n++;
        }
      }
      return n;
    }
  };
}
