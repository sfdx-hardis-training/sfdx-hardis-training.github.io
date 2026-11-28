/*
 * The table of Pipeline Pinball, as data: every wall, post, flipper, target,
 * ramp and light, in table units (see physics.js). The physics, the view and
 * the rules all read it from here, so a post moved here moves everywhere.
 *
 * The proportions are an arcade table's, 1 unit for 5 cm: a 27 mm ball,
 * 3 inch flippers with their pivots 7 inches apart, ramp mouths about two
 * balls and a half wide, a playfield a little over twice as long as wide.
 *
 * The table is built at its design size, then stretched (sy): everything from
 * the top of the banks up moves up STRETCH, which opens a band in the middle
 * for the Backups lane, the side bumpers and the Hotfix hole.
 *
 *   top         the Production floor, raised: two small flippers, the Data
 *               Cloud rabbit, the Sales Manager in front of the Release hole
 *               three top lanes (the skill shot) under the arc
 *               three pop bumpers (Apex triggers), the sf hardis terminal and
 *               the monster Flow, the Pull Request scoop
 *               the shots, fanned out from the flippers: the left orbit
 *               (preprod, the spinner), integration, the scoop, production
 *               (closed until a promotion opens it), Validate, uat, the right
 *               orbit
 *   the band    the Backups targets (left wall) and the Code quality ones
 *               (right wall) under the orbit mouths, the Hotfix hole, the
 *               admins who rise in the middle
 *   y 6 to 9.4  the drop targets of Recent Changes (left bank), three checks
 *               and the third flipper (right bank)
 *   y 0 to 6    the slingshots, the inlanes and outlanes, the kickback
 *               (Rollback, left outlane), the flippers; the plunger lane on
 *               the right
 */
import { createPhysics, BALL_RADIUS } from "./physics.js";

// Everything from the top of the banks up moves up this much
const SPLIT = 9.45;
const STRETCH = 2.5;

/** A design y, stretched: the y of the table as built. */
export function sy(y) {
  return y >= SPLIT ? y + STRETCH : y;
}

// The table at its design size
const DESIGN = {
  left: -5,
  right: 6.1,
  laneWall: 5,
  top: 20.55,
  upperBottom: 21.8,
  upperTop: 30.4,
  upperLeft: -3.6,
  upperRight: 3.6,
  upperHeight: 2.2,
  plunger: { x: 5.56, y: 0.6 },
  scoop: { x: -1.55, y: 12.9 },
  release: { x: -2.75, y: 27.6 },
  arc: { x: 0.55, y: 15, r: 5.55 },
  // The left slingshot's corners (the right one mirrors it): top, bottom, the tip over the flipper
  sling: [
    [-3.1, 5.9],
    [-3.1, 4.2],
    [-1.8, 3.5]
  ]
};

/** The table as built, stretched: what the view, the rules and the tests read. */
export const TABLE = Object.assign({}, DESIGN, {
  top: sy(DESIGN.top),
  upperBottom: sy(DESIGN.upperBottom),
  upperTop: sy(DESIGN.upperTop),
  scoop: { x: DESIGN.scoop.x, y: sy(DESIGN.scoop.y) },
  release: { x: DESIGN.release.x, y: sy(DESIGN.release.y) },
  arc: { x: DESIGN.arc.x, y: sy(DESIGN.arc.y), r: DESIGN.arc.r },
  ball: BALL_RADIUS
});

// Under each orbit, a bank turned towards the far flipper sends a ball coming
// down the side wall back into play: the drop targets of Recent Changes on the
// left, three checks on the right. From the wall to the end over the inlane
const BANK_TOP = [-5, 9.4];
const BANK_END = [-3.9, 7.5];
// The right bank ends inside the pivot of the third flipper (mirrored here):
// its face runs on to the top of the flipper, with no step to stop a ball
const RIGHT_BANK_END = [-3.87, 7.8];
const DROPS = [0.1, 0.3, 0.5, 0.7, 0.9];
const STANDUPS = [0.22, 0.5, 0.78];

/** A point along the left bank (mirrored for the right one), pushed off its face by `off`. */
export function bankPoint(k, off, side) {
  const end = side === -1 ? RIGHT_BANK_END : BANK_END;
  const dx = end[0] - BANK_TOP[0];
  const dy = end[1] - BANK_TOP[1];
  const len = Math.hypot(dx, dy);
  // The face looks up and across the table, towards the other flipper
  const nx = -dy / len;
  const ny = dx / len;
  const x = BANK_TOP[0] + dx * k + nx * off;
  const y = BANK_TOP[1] + dy * k + ny * off;
  return [side === -1 ? -x : x, y];
}
const BANK_LENGTH = Math.hypot(BANK_END[0] - BANK_TOP[0], BANK_END[1] - BANK_TOP[1]);
const ADMINS = [
  [-1.6, 9.2],
  [0.12, 10.1],
  [1.6, 9.2]
];
// Right under the three top lanes, as on the arcade tables: a ball out of a
// lane bounces in the bumpers and back up through the lanes, while the
// flippers move the lit stars along
const BUMPERS = [
  [1.1, 16.15],
  [3.3, 16.15],
  [2.2, 14.95]
];
// Under the arc on the right, where a plunge that is not a full one falls
const LANES = [1.1, 2.2, 3.3];
// The shots fan out from the flippers, as on the arcade tables: from left to
// right the left orbit, the integration ramp, the scoop, the production ramp,
// the uat ramp, the right orbit, each with a clear lane (measured with a ball
// flipped from every point of each flipper). The orbits open level with the
// ramp mouths, as built (after the stretch), between the side wall and their
// inner walls; Backups and Code quality stand on the side walls under them
const ORBIT_MOUTH = 13.0;
const INNER = 3.8;
const SIDE_TARGETS = [10.3, 10.9, 11.5];
const SIDE_X = 4.84;
// The Rollback kick, on the right side (mirrored on the left): up the outlane, over the post, down the inlane
const KICK_PATH = [4.5, 1.4, 0, 4.5, 5.2, 0.3, 4.45, 6.3, 0.9, 4.0, 6.75, 1.1, 3.6, 5.9, 0.3, 3.55, 5.5, 0];
// A saucer low on the left, shot from the right flipper
const HOTFIX = { x: -3.3, y: 10.2 };
// The monster Flow spins by the terminal, where the bumpers throw the ball
const FLOW = { x: -2.55, y: 20.0, r: 0.7 };

/** Builds the table: { physics, parts, walls, lights }. */
export function buildTable() {
  const p = createPhysics();
  const walls = [];
  const keep = (list, kind) => {
    for (const s of Array.isArray(list) ? list : [list]) {
      walls.push({ shape: s, kind });
    }
    return list;
  };
  const T = DESIGN;

  // The cabinet: left wall, the arc over the top, the outer wall of the plunger lane
  keep(p.capsule(T.left, -1.5, T.left, T.arc.y, { r: 0.12, bounce: 0.45 }), "wall");
  keep(p.arc(T.arc.x, T.arc.y, T.arc.r, Math.PI, 0, 28, { r: 0.12, bounce: 0.4, friction: 0.01 }), "wall");
  keep(p.capsule(T.right, T.arc.y, T.right, -1.5, { r: 0.08, bounce: 0.4 }), "wall");
  // The plunger lane: its inner wall, and a gate that lets the ball out, not back
  keep(p.capsule(T.laneWall, -1.5, T.laneWall, 13.6, { r: 0.1, bounce: 0.4 }), "wall");
  keep(p.capsule(6.02, 14.45, 5.05, 13.72, { r: 0.06, bounce: 0.2, oneWay: { x: 0, y: 1 } }), "gate");
  p.setPlunger(5.12, 5.98, T.plunger.y);

  // The orbits: an inner wall on each side makes a lane up to the arc
  keep(p.capsule(-INNER, 10.8, -INNER, 14.7, { r: 0.1 }), "wall");
  keep(p.arc(-INNER + 0.8, 14.7, 0.8, Math.PI, Math.PI / 2, 5, { r: 0.1 }), "wall");
  keep(p.capsule(INNER, 10.8, INNER, 14.2, { r: 0.1 }), "wall");
  keep(p.arc(INNER - 0.8, 14.2, 0.8, 0, Math.PI / 2, 5, { r: 0.1 }), "wall");
  const spinner = p.line(-INNER, 11.2, T.left, 11.2, { tag: "spinner" });
  const orbitLeft = p.line(T.left, 14.2, -INNER, 14.2, { tag: "orbitLeft" });
  const orbitRight = p.line(INNER, 13.0, T.laneWall, 13.0, { tag: "orbitRight" });

  // The top lanes, under the arc: three rollovers, lit for the skill shot
  for (const [x, top] of [
    [0.55, 18.7],
    [1.65, 18.6],
    [2.75, 18.45],
    [3.85, 17.9]
  ]) {
    keep(p.capsule(x, 17.4, x, top, { r: 0.08, bounce: 0.5 }), "post");
  }
  const lanes = LANES.map((x, i) => p.line(x + 0.47, 17.9, x - 0.47, 17.9, { tag: "lane" + i }));

  // Apex triggers: the pop bumpers
  const bumpers = BUMPERS.map(([x, y], i) => p.circle(x, y, 0.6, { bounce: 0.6, kick: 15, tag: "bumper" + i }));

  // The Pull Request scoop, with its back wall
  keep(p.arc(T.scoop.x, T.scoop.y, 0.62, -0.25, Math.PI + 0.25, 8, { r: 0.08, bounce: 0.2 }), "wall");
  // One roof over the scoop and the production chute, peaked over the chute:
  // a ball on it rolls off one side or the other, it never rests in a corner
  keep(p.wall([-2.28, 13.2, 0, 14.1, 0.66, 13.72], { r: 0.08, bounce: 0.35 }), "wall");
  const scoop = p.hole(T.scoop.x, T.scoop.y, 0.32, { tag: "scoop", capture: true });

  // The ramps: their mouths, and the paths over the table
  const integrationPath = p.path(
    [-3.0, 10.9, 0, -3.0, 12.6, 0.9, -3.15, 14.2, 1.7, -3.7, 15.0, 1.9, -4.6, 15.2, 2.0, -5.4, 14.6, 2.1, -5.45, 9.5, 2.0, -5.35, 7.2, 1.7, -4.3, 6.3, 0.8, -3.6, 5.9, 0.3, -3.55, 5.5, 0],
    { tag: "integration", exitMax: 9 }
  );
  // No walls at the mouth: the plastic ramp starts flat on the playfield
  // A mouth about two balls and a half wide, as on the arcade
  p.line(-3.6, 10.9, -2.4, 10.9, { path: integrationPath, tag: "integrationMouth" });

  const uatPath = p.path(
    [3.0, 10.9, 0, 3.0, 12.6, 0.9, 3.15, 14.2, 1.7, 3.7, 15.0, 1.9, 4.6, 15.2, 2.0, 6.45, 14.6, 2.1, 6.5, 9.5, 2.0, 6.4, 7.2, 1.7, 4.4, 6.3, 0.9, 3.6, 5.9, 0.3, 3.55, 5.5, 0],
    { tag: "uat", exitMax: 9 }
  );
  p.line(2.4, 10.9, 3.6, 10.9, { path: uatPath, tag: "uatMouth" });

  // The production ramp climbs to the Production floor; a gate closes its mouth until it is lit
  const productionPath = p.path(
    [0, 12.75, 0, 0, 14.6, 0.9, 0.15, 17.4, 1.9, 0.6, 20.0, 2.5, 1.6, 21.6, 2.6, 2.6, 22.6, 2.4, 2.75, 23.4, 2.2, 2.4, 24.2, 2.2],
    { tag: "production", exitFloor: 1, exitMax: 14 }
  );
  keep(p.wall([-0.66, 13.7, -0.66, 12.55], { r: 0.08, bounce: 0.3 }), "rail");
  keep(p.wall([0.66, 13.7, 0.66, 12.55], { r: 0.08, bounce: 0.3 }), "rail");
  const productionGate = keep(p.capsule(-0.58, 12.45, 0.58, 12.45, { r: 0.1, bounce: 0.45, tag: "productionGate" }), "diverter");
  p.line(-0.58, 12.75, 0.58, 12.75, { path: productionPath, tag: "productionMouth" });

  // The two banks: a solid wedge from the wall, its face turned to the middle
  for (const side of [1, -1]) {
    const [tx, ty] = bankPoint(0, 0, side);
    const [ex, ey] = bankPoint(1, 0, side);
    keep(p.wall([tx, ty, ex, ey, side * -5, 7.1], { r: 0.1, bounce: 0.45 }), "wall");
  }
  // Recent Changes: five drop targets along the left bank
  const half = (0.16 / BANK_LENGTH);
  const drops = DROPS.map((k, i) => {
    // Flush with the bank: a ball rolling down it does not knock them over, a shot does
    const [ax, ay] = bankPoint(k - half, 0.04, 1);
    const [bx, by] = bankPoint(k + half, 0.04, 1);
    return p.capsule(ax, ay, bx, by, { r: 0.12, bounce: 0.35, tag: "drop" + i });
  });
  // Three checks along the right bank
  const standups = STANDUPS.map((k, i) => {
    const [ax, ay] = bankPoint(k - half * 1.4, 0.04, -1);
    const [bx, by] = bankPoint(k + half * 1.4, 0.04, -1);
    return p.capsule(ax, ay, bx, by, { r: 0.1, bounce: 0.4, tag: "check" + i });
  });
  // The admins who rise in the middle, with their change sets
  const admins = ADMINS.map(([x, y], i) => p.circle(x, y, 0.44, { bounce: 0.45, tag: "admin" + i, enabled: false }));

  // The inlanes, the outlanes, the slingshots
  for (const side of [-1, 1]) {
    // The inlane guide ends over the flipper's pivot: the ball rolls on to the bat
    keep(p.wall([side * 4.0, 6.4, side * 4.0, 3.5, side * 2.3, 2.75], { r: 0.1, bounce: 0.45, falloff: 0.0025 }), "wall");
    // The post at the top of the inlane guide: a rubber that keeps some balls out of the outlane
    keep(p.circle(side * 4.0, 6.52, 0.18, { bounce: 0.9, falloff: 0.0075, hop: 0.2 }), "rubber");
    const [a, b, c] = T.sling;
    keep(p.capsule(side * -a[0], a[1], side * -b[0], b[1], { r: 0.12, bounce: 0.9, falloff: 0.0125 }), "rubber");
    keep(p.capsule(side * -b[0], b[1], side * -c[0], c[1], { r: 0.12, bounce: 0.9, falloff: 0.0125 }), "rubber");
  }
  const [sa, , sc] = T.sling;
  // The slingshots kick hardest in the middle of the band, about 1 m/s
  const sling = { r: 0.14, bounce: 0.9, falloff: 0.0125, kick: 22, kickMin: 4, kickProfile: true, hop: 0.15 };
  const slings = [
    keep(p.capsule(sc[0], sc[1], sa[0], sa[1], Object.assign({ tag: "slingL" }, sling)), "sling"),
    keep(p.capsule(-sa[0], sa[1], -sc[0], sc[1], Object.assign({ tag: "slingR" }, sling)), "sling")
  ];
  p.line(-4.0, 4.6, T.left, 4.6, { tag: "outlaneL" });
  p.line(T.laneWall, 4.6, 4.0, 4.6, { tag: "outlaneR" });
  p.line(-3.1, 4.6, -4.0, 4.6, { tag: "inlaneL" });
  p.line(4.0, 4.6, 3.1, 4.6, { tag: "inlaneR" });
  // Rollback, in both outlanes: the lane is closed over its top by the bank,
  // so the kick lifts the ball up the lane and over the inlane post, onto the
  // inlane and its flipper (a path, not drawn: the ball hops back into play)
  const kickback = p.line(-4.0, 1.4, T.left, 1.4, { tag: "kickback" });
  const kickbackR = p.line(T.laneWall, 1.4, 4.0, 1.4, { tag: "kickbackR" });
  const kickPath = (side) => p.path(KICK_PATH.map((v, i) => (i % 3 === 0 ? v * side : v)), { tag: side < 0 ? "kickback" : "kickbackR", exitMax: 9 });
  const kickPaths = { left: kickPath(-1), right: kickPath(1) };

  // Arcade flippers: about three balls long, their pivots close to the middle
  // As measured on the arcade: pivots 7 inches apart, the bats 31 degrees
  // down at rest and 21 up, the tips under two balls apart
  const left = p.flipper(-2.05, 2.4, 1.65, { side: 1, rest: -0.54, up: 0.37, r: 0.24, rb: 0.12, tag: "flipper" });
  const right = p.flipper(2.05, 2.4, 1.65, { side: -1, rest: -0.54, up: 0.37, r: 0.24, rb: 0.12, tag: "flipper" });
  // A third, small flipper at the foot of the right bank, as on the arcade
  // tables: a ball rolling down the bank lands on it, and it shoots across to
  // the integration ramp, the scoop and the left orbit
  const third = p.flipper(3.75, 7.75, 1.1, { side: -1, rest: -0.5, up: 0.45, r: 0.2, rb: 0.11, tag: "flipper" });

  /* ---------- The Production floor ---------- */
  const U = { floor: 1 };
  keep(p.capsule(T.upperLeft, 24.4, T.upperLeft, 27.4, Object.assign({ r: 0.12 }, U)), "upper");
  keep(p.capsule(T.upperRight, 24.4, T.upperRight, 27.4, Object.assign({ r: 0.12 }, U)), "upper");
  keep(p.arc(0, 27.4, T.upperRight, Math.PI, 0, 18, Object.assign({ r: 0.12 }, U)), "upper");
  keep(p.wall([T.upperLeft, 24.4, -1.92, 23.3], Object.assign({ r: 0.1 }, U)), "upper");
  keep(p.wall([T.upperRight, 24.4, 1.92, 23.3], Object.assign({ r: 0.1 }, U)), "upper");
  const upperLeft = p.flipper(-1.7, 23.05, 1.15, { side: 1, rest: -0.5, up: 0.42, r: 0.2, rb: 0.11, floor: 1, tag: "flipper" });
  const upperRight = p.flipper(1.7, 23.05, 1.15, { side: -1, rest: -0.5, up: 0.42, r: 0.2, rb: 0.11, floor: 1, tag: "flipper" });
  // The Data Cloud rabbit walks across the top; the Sales Manager stands in front of the Release hole
  const rabbit = p.circle(0, 27.4, 0.72, Object.assign({ bounce: 0.75, kick: 6, tag: "rabbit", moving: true }, U));
  const salesManager = p.circle(-2.05, 26.75, 0.42, Object.assign({ bounce: 0.5, tag: "salesManager" }, U));
  keep(p.arc(T.release.x, T.release.y, 0.6, Math.PI * 0.35, Math.PI * 1.45, 6, Object.assign({ r: 0.08 }, U)), "upper");
  // A slope from the top arc to the back of the Release hole: no corner for a ball to rest in
  keep(p.wall([-3.4, 28.58, -2.45, 28.18], Object.assign({ r: 0.08 }, U)), "upper");
  // Wide enough that a ball in its mouth drops in, even with the Sales Manager beside it
  const release = p.hole(T.release.x, T.release.y, 0.45, Object.assign({ tag: "release", capture: true }, U));
  const upperTargets = [25.3, 26.3].map((y, i) => p.capsule(3.45, y - 0.25, 3.45, y + 0.25, Object.assign({ r: 0.1, bounce: 0.4, tag: "upperCheck" + i }, U)));
  p.line(3.6, 21.9, -3.6, 21.9, Object.assign({ tag: "upperDrain" }, U));
  // Back down from the Production floor: a wire to the bumpers
  const downPath = p.path([0, 22.0, 2.2, 1.6, 21.6, 2.2, 3.0, 20.3, 2.2, 3.3, 18.6, 1.9, 2.9, 17.3, 1.6, 1.4, 17.0, 0.9, 0.3, 16.0, 0.2, 0, 15.6, 0], { tag: "down", exitMax: 9 });
  // After the Release hole: the long way down to the left inlane
  const releasePath = p.path([T.release.x, T.release.y, 2.2, -3.4, 26.4, 2.4, -3.9, 23.4, 2.6, -5.35, 19.0, 2.3, -5.4, 14.6, 2.1, -5.45, 9.5, 2.0, -5.35, 7.2, 1.7, -4.3, 6.3, 0.8, -3.6, 5.9, 0.3, -3.55, 5.5, 0], { tag: "releaseWire", exitMax: 9 });

  // Stretch the table, then build what lives in the band it opens
  p.transformY(sy);
  // The admins who rise in the middle of the band
  admins[0].ay = admins[0].by = 10.4;
  admins[1].ay = admins[1].by = 10.0;
  admins[2].ay = admins[2].by = 10.4;
  // Spaced so that the gap between two of them is wider than the ball: no ball rests between them
  // and none on the centre line, where a slow ball could rest exactly on top of it
  admins[0].ax = admins[0].bx = -1.45;
  admins[1].ax = admins[1].bx = 0.1;
  admins[2].ax = admins[2].bx = 1.65;
  // The inner walls of the orbits come down to their mouths
  keep(p.capsule(-INNER, ORBIT_MOUTH, -INNER, sy(10.8), { r: 0.1, bounce: 0.45, falloff: 0.0025 }), "wall");
  keep(p.capsule(INNER, ORBIT_MOUTH, INNER, sy(10.8), { r: 0.1, bounce: 0.45, falloff: 0.0025 }), "wall");
  // The Backups lane: three targets on the left wall, under the orbit
  const backups = SIDE_TARGETS.map((y, i) => p.capsule(-SIDE_X, y - 0.2, -SIDE_X, y + 0.2, { r: 0.1, bounce: 0.45, hop: 0.2, tag: "backup" + i }));
  // Code quality: three round targets to push in on the right wall, under the orbit
  const quality = SIDE_TARGETS.map((y, i) => p.capsule(SIDE_X, y - 0.2, SIDE_X, y + 0.2, { r: 0.1, bounce: 0.45, hop: 0.2, tag: "quality" + i }));
  // The shots fan out from the flippers with nothing in their way, as on the
  // arcade tables: the toys stand between them or above them.
  // The monster Flow: a disc by the terminal, where the bumpers throw the ball, that spins it off its line
  const flow = p.disc(FLOW.x, FLOW.y, FLOW.r, { tag: "flow", strength: 16 });
  // Validate: a standup between the production and the uat shots, the first half of a Quick deploy
  const validate = p.capsule(1.3, 13.85, 1.85, 14.0, { r: 0.1, bounce: 0.45, hop: 0.2, tag: "validate" });
  // The sf hardis terminal: a saucer high on the left, fed by the bumpers; it types a command
  const terminal = p.hole(-1.6, 18.6, 0.36, { tag: "terminal", capture: true, maxSpeed: 34 });
  // The Hotfix hole, by the Backups lane, and its wire loop over the left side to the left inlane
  const hotfix = p.hole(HOTFIX.x, HOTFIX.y, 0.3, { tag: "hotfix", capture: true, maxSpeed: 30 });
  const hotfixPath = p.path(
    [HOTFIX.x, HOTFIX.y, 0, -4.0, 11.6, 0.8, -4.35, 12.8, 1.3, -4.6, 16.4, 2.3, -3.7, 19.3, 2.8, -2.2, 20.2, 2.9, -1.2, 19.4, 2.8, -1.9, 18.3, 2.7, -3.4, 18.6, 2.6, -5.35, 18.0, 2.2, -5.4, 17.1, 2.1, -5.45, 12.0, 2.0, -5.35, 7.2, 1.7, -4.3, 6.3, 0.8, -3.6, 5.9, 0.3, -3.55, 5.5, 0],
    { tag: "hotfix", exitMax: 9 }
  );
  p.build();

  const lights = buildLights();
  return {
    physics: p,
    walls,
    lights,
    parts: {
      flippers: { left, right, third, upperLeft, upperRight },
      bumpers,
      slings,
      drops,
      standups,
      admins,
      rabbit,
      salesManager,
      productionGate,
      upperTargets,
      scoop,
      release,
      kickback,
      kickbackR,
      kickPaths,
      spinner,
      orbitLeft,
      orbitRight,
      lanes,
      backups,
      quality,
      hotfix,
      flow,
      validate,
      terminal,
      paths: { integration: integrationPath, uat: uatPath, production: productionPath, down: downPath, release: releasePath, hotfix: hotfixPath }
    }
  };
}

/**
 * The inserts of the playfield the rules light, as on an arcade table: a
 * delta in front of each shot, chevrons chasing towards it, the honeycomb of
 * the ten missions over the flippers with Release day under it, the ladder of
 * the missions done up the middle, round inserts for the targets, the locks
 * and the lanes, warm bulbs. Each one { id, x, y, floor, size, shape ("round",
 * "delta", "hex", "star", "chevron", "bulb"), angle, color, label (a text key
 * painted under it) }. The playfield is painted with a bezel under each one.
 */
function buildLights() {
  const lights = [];
  const add = (id, x, y, options) => {
    lights.push(Object.assign({ id, x, y, floor: 0, size: 0.32, shape: "round", angle: 0, color: 0x0176d3, label: "" }, options));
  };
  // The shots, from left to right: a big delta for each
  add("shot-preprod", -4.45, 10.05, { shape: "delta", color: 0x9050e9, size: 0.4 });
  add("shot-integration", -3.0, 9.95, { shape: "delta", color: 0x1b96ff, size: 0.52 });
  add("shot-scoop", -1.55, 11.85, { shape: "delta", angle: 0.2, color: 0xfe9339, size: 0.44 });
  add("shot-production", 0, 11.65, { shape: "delta", color: 0x45c65a, size: 0.5 });
  add("shot-uat", 3.0, 9.95, { shape: "delta", color: 0x06a59a, size: 0.52 });
  add("shot-orbitRight", 4.45, 10.05, { shape: "delta", color: 0x9050e9, size: 0.4 });
  // The promotion steps in front of the production ramp
  ["integration", "uat", "preprod"].forEach((name, i) => add("promo-" + name, -0.5 + i * 0.5, 10.95, { size: 0.17, color: 0x45c65a }));
  // The locks of Deploy to all orgs, beside the integration ramp
  [0, 1, 2].forEach((i) => add("lock" + i, -2.3, 8.2 + i * 0.45, { size: 0.19, color: 0xfe9339 }));
  // Chasing chevrons that lead to a lit shot
  for (const [shot, x, y] of [
    ["integration", -3.0, 9.95],
    ["uat", 3.0, 9.95],
    ["scoop", -1.55, 11.85]
  ]) {
    for (let k = 0; k < 3; k++) {
      add("chev-" + shot + "-" + k, x, y - 0.62 - k * 0.42, { shape: "chevron", size: 0.26, color: 0xffb020 });
    }
  }
  // The general illumination: warm bulbs round the top arc and along the bottom
  for (let i = 0; i < 11; i++) {
    const a = Math.PI * (0.06 + (0.88 * i) / 10);
    add("gi-" + i, TABLE.arc.x + Math.cos(a) * (TABLE.arc.r - 0.45), TABLE.arc.y + Math.sin(a) * (TABLE.arc.r - 0.45), { shape: "bulb", size: 0.12, color: 0xffd28a });
  }
  for (let i = 0; i < 4; i++) {
    add("gi-a" + i, [-4.5, -3.55, 3.55, 4.5][i], 1.9, { shape: "bulb", size: 0.1, color: 0xffd28a });
  }
  DROPS.forEach((k, i) => {
    const [x, y] = bankPoint(k, 0.72, 1);
    add("drop" + i, x, y, { size: 0.17, color: 0x1b96ff });
  });
  STANDUPS.forEach((k, i) => {
    const [x, y] = bankPoint(k, 0.72, -1);
    add("check" + i, x, y, { size: 0.19, color: 0x45c65a });
  });
  // The stars of the top lanes, in the lanes themselves, over the bumpers
  LANES.forEach((x, i) => add("lane" + i, x, 18.15, { shape: "star", size: 0.36, color: 0xffb020 }));
  add("kickback", -4.5, 2.6, { size: 0.24, color: 0xea001e, label: "pbFieldRollback" });
  add("kickbackR", 4.5, 2.6, { size: 0.24, color: 0xea001e, label: "pbFieldRollback" });
  add("ballSave", 0, 2.3, { size: 0.4, color: 0x06a59a, label: "pbFieldShootAgain", labelAt: "inside" });
  add("extraBall", -1.25, 6.3, { size: 0.24, shape: "star", color: 0xfe9339, label: "pbFieldExtraBall", labelAt: "above" });
  add("note", 1.25, 6.3, { size: 0.24, shape: "star", color: 0xdd7a01, label: "pbFieldNote", labelAt: "above" });
  // The honeycomb of the ten missions, over the flippers, Release day under it
  const rows = [
    [5.55, [-0.78, 0, 0.78]],
    [4.87, [-1.17, -0.39, 0.39, 1.17]],
    [4.19, [-0.78, 0, 0.78]]
  ];
  let mission = 0;
  for (const [y, xs] of rows) {
    for (const x of xs) {
      add("mission" + mission, x, y, { shape: "hex", size: 0.38, color: 0x9050e9, label: "pbShort" + mission });
      mission++;
    }
  }
  add("missionWizard", 0, 3.51, { shape: "hex", size: 0.38, color: 0xffb020, label: "pbNameWizard" });
  // The ladder up the middle: the missions done on this level
  for (let i = 0; i < 6; i++) {
    add("ladder" + i, 0, 6.85 + i * 0.47, { shape: "delta", size: 0.3, color: 0xea001e });
  }
  // The Production floor
  add("rabbit", 0, 25.4, { floor: 1, size: 0.3, color: 0x1b96ff });
  add("release", -2.2, 25.7, { floor: 1, shape: "delta", angle: 0.55, size: 0.36, color: 0x45c65a });
  // Stretched with the table; a chevron follows the shot it leads to
  for (const l of lights) {
    l.y = /^chev-(integration|uat)-/.test(l.id) || /^lock/.test(l.id) ? l.y + STRETCH : sy(l.y);
  }
  // The band, placed as built
  SIDE_TARGETS.forEach((y, i) => add("backup" + i, -SIDE_X + 0.5, y, { size: 0.16, color: 0x06a59a }));
  SIDE_TARGETS.forEach((y, i) => add("quality" + i, SIDE_X - 0.5, y, { size: 0.16, color: 0xffb020 }));
  add("shot-hotfix", HOTFIX.x + 0.65, HOTFIX.y - 0.55, { shape: "delta", angle: 0.85, size: 0.3, color: 0xea001e, label: "pbFieldHotfix", labelAt: "below" });
  TABLE.hotfix = HOTFIX;
  TABLE.terminal = { x: -1.6, y: 18.6 };
  TABLE.flow = FLOW;
  add("shot-terminal", -1.6, 17.75, { shape: "delta", size: 0.3, color: 0x2e844a, label: "pbFieldTerminal", labelAt: "below" });
  add("validate", 1.55, 13.4, { size: 0.15, color: 0x45c65a, label: "pbFieldValidate", labelAt: "below" });
  return lights;
}
