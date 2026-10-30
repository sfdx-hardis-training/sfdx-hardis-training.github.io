/*
 * The rules of Org-Man as numbers: how fast everybody runs at each level, how
 * long the admins stay blue, what everything is worth, and the most a maze can
 * possibly give. No Three.js: the game, the tests and the Hall of Fame check
 * (scripts/guinea-run/verify-submission.mjs) read the same table, so a score
 * no maze could give is refused.
 */
import { MAZES, parseMaze, mazeForLevel } from "./maze.js";

// Tiles a second at full speed
export const BASE_SPEED = 8;
export const LIVES = 3;
export const MAX_LIVES = 5;
// An extra life at the first, then every step
export const EXTRA_FIRST = 10000;
export const EXTRA_EVERY = 100000;

export const POINTS = {
  dot: 10,
  power: 50,
  // An admin caught while blue: twice the one before, four in a row
  admins: [200, 400, 800, 1600],
  salesManager: 5000,
  // All four admins caught at every deployment of a maze
  sweep: 12000,
  // A maze cleared without losing a life, times its level
  cleanPerLevel: 1000
};

// What the vegetable of a level is worth, and which one it is (the vegetables pack)
const VEGETABLES = [
  { name: "carrot", points: 100 },
  { name: "romaine", points: 300 },
  { name: "bell-pepper", points: 500 },
  { name: "bell-pepper", points: 500 },
  { name: "cucumber", points: 700 },
  { name: "cucumber", points: 700 },
  { name: "fennel", points: 1000 },
  { name: "fennel", points: 1000 },
  { name: "parsley", points: 2000 },
  { name: "parsley", points: 2000 },
  { name: "carrot", points: 3000 },
  { name: "carrot", points: 3000 }
];
const LAST_VEGETABLE = { name: "carrot", points: 5000 };
// A vegetable shows up when this many dots are eaten, and stays this long
export const VEGETABLE_AT = [60, 130];
export const VEGETABLE_S = 9.5;
// The Sales Manager joins every few mazes
export const SALES_MANAGER_EVERY = 4;

/** The vegetable of a level: { name, points }. */
export function vegetableFor(level) {
  return VEGETABLES[level - 1] || LAST_VEGETABLE;
}

/** Whether the Sales Manager plays this maze. */
export function salesManagerIn(level) {
  return level % SALES_MANAGER_EVERY === 0;
}

/**
 * How a level plays: speeds (share of BASE_SPEED), how long the admins stay
 * blue (s), and the scatter and chase waves (s, the last one never ends).
 */
export function levelSettings(level) {
  const l = Math.max(1, level);
  const early = l === 1;
  const middle = l >= 2 && l <= 4;
  const pig = early ? 0.8 : middle ? 0.86 : l < 21 ? 0.92 : 0.9;
  // The mazes are smaller than an arcade one: the admins start slow and catch up level by level
  const admin = Math.min(0.9, 0.62 + (l - 1) * 0.03);
  const frightened = [6, 5, 4, 3.5, 3, 2.5, 2.5, 2, 2, 1.8, 1.6, 1.5, 1.4, 1.3, 1.2][l - 1] ?? 1;
  const waves = early ? [9, 15, 9, 15, 7, 20, 7] : middle ? [8, 18, 8, 18, 6, 25, 3] : [6, 20, 6, 20, 5, 30, 1];
  return {
    pig,
    pigFrightened: Math.min(1, pig + 0.08),
    admin,
    adminFrightened: early ? 0.5 : 0.55,
    adminTunnel: early ? 0.4 : 0.48,
    eyes: 1.6,
    salesManager: admin * 1.12,
    frightened,
    // The last seconds of blue blink
    blink: Math.min(2, frightened * 0.4),
    waves,
    // When each admin leaves the house, in seconds after the maze starts
    release: early ? [0, 4, 10, 16] : middle ? [0, 3, 7, 11] : [0, 2, 4, 6],
    salesManagerRelease: 8
  };
}

/**
 * The most a maze can give at a level: every dot and deployment, every admin
 * caught four in a row at each deployment (and the Sales Manager on his
 * mazes), both vegetables, the sweep and the clean maze bonus.
 */
export function maxMazeScore(level) {
  const grid = parseMaze(mazeForLevel(level));
  const caught = POINTS.admins.reduce((a, b) => a + b, 0);
  return (
    grid.dots.length * POINTS.dot +
    grid.powers.length * POINTS.power +
    grid.powers.length * (caught + (salesManagerIn(level) ? POINTS.salesManager : 0)) +
    VEGETABLE_AT.length * vegetableFor(level).points +
    POINTS.sweep +
    POINTS.cleanPerLevel * level
  );
}

/**
 * The most a game can score having reached a level (that level included,
 * cleared or not): the ceiling the Hall of Fame holds a result to.
 */
export function maxScoreThrough(level) {
  let total = 0;
  for (let l = 1; l <= level; l++) {
    total += maxMazeScore(l);
  }
  return total;
}

/** The number of dots and deployments of every maze, for the tests. */
export function mazeSizes() {
  return MAZES.map((m) => {
    const g = parseMaze(m);
    return { id: m.id, dots: g.dots.length, powers: g.powers.length };
  });
}
