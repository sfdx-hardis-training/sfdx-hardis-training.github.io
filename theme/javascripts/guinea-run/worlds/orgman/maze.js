/*
 * The mazes of Org-Man, the second bonus of Guinea Run: four Setup screens of
 * an org, drawn as grids. They are this game's own, made for it.
 *
 * One character per tile:
 *   #  wall          .  metadata to eat     o  a deployment (the power-up)
 *   (space) a path with nothing on it      -  the door of the house
 *   h  inside the house                    G  where the admins come out
 *   P  where the guinea pig starts          F  where the vegetables show up
 * A path on the left or right edge is a tunnel to the other side.
 *
 * No Three.js here: the game, the checks and the tests read the same grids.
 */

export const WALL = 0;
export const PATH = 1;
export const DOOR = 2;
export const HOUSE = 3;

// Directions: up, left, down, right, in grid steps (y grows down the screen)
export const DIRS = [
  { x: 0, y: -1 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 1, y: 0 }
];
export const OPPOSITE = [2, 3, 0, 1];

// The house, the tunnel and the rows round them are the same in every maze, so
// the admins leave it the same way: rows 6 to 12
const MIDDLE = [
  "#####.###.#.###.#####",
  "#####.#   G   #.#####",
  "#####.# ##-## #.#####",
  "     .  #hhh#  .     ",
  "#####.# ##### #.#####",
  "#####.#   F   #.#####",
  "#####.#.#####.#.#####"
];

export const MAZES = [
  {
    id: "objects",
    color: 0x0176d3,
    rows: [
      "#####################",
      "#.........#.........#",
      "#o###.###.#.###.###o#",
      "#...................#",
      "#.###.#.#####.#.###.#",
      "#.....#...#...#.....#",
      ...MIDDLE,
      "#.........#.........#",
      "#.###.###.#.###.###.#",
      "#o..#.....P.....#..o#",
      "###.#.#.#####.#.#.###",
      "#.....#...#...#.....#",
      "#.#######.#.#######.#",
      "#...................#",
      "#####################"
    ]
  },
  {
    id: "flows",
    color: 0x9050e9,
    rows: [
      "#####################",
      "#...#.....#.....#...#",
      "#o#.#.###.#.###.#.#o#",
      "#.#.....#...#.....#.#",
      "#.#####.#.#.#.#####.#",
      "#.........#.........#",
      ...MIDDLE,
      "#.....#.......#.....#",
      "#.###.#.#####.#.###.#",
      "#o..#.....P.....#..o#",
      "###.#.###.#.###.#.###",
      "#.....#...#...#.....#",
      "#.###.#.#####.#.###.#",
      "#...................#",
      "#####################"
    ]
  },
  {
    id: "permissions",
    color: 0x06a59a,
    rows: [
      "#####################",
      "#o........#........o#",
      "#.##.####.#.####.##.#",
      "#.##.............##.#",
      "#.##.#.#######.#.##.#",
      "#...................#",
      ...MIDDLE,
      "#.........#.........#",
      "#.##.####.#.####.##.#",
      "#..#......P......#..#",
      "##.#.#.#######.#.#.##",
      "#o...#.........#...o#",
      "#.##.###.###.###.##.#",
      "#...................#",
      "#####################"
    ]
  },
  {
    id: "deployments",
    color: 0xdd7a01,
    rows: [
      "#####################",
      "#.......#...#.......#",
      "#o#####.#.#.#.#####o#",
      "#.....#...#...#.....#",
      "#.###...#####...###.#",
      "#.....#.......#.....#",
      ...MIDDLE,
      "#.....#.......#.....#",
      "#.##.###.###.###.##.#",
      "#o........P........o#",
      "##.##.###.#.###.##.##",
      "#.....#...#...#.....#",
      "#.#.###.#####.###.#.#",
      "#...................#",
      "#####################"
    ]
  }
];

/** The maze a level plays: they come round in turn. */
export function mazeForLevel(level) {
  return MAZES[(Math.max(1, level) - 1) % MAZES.length];
}

/**
 * A maze as numbers: cells (WALL, PATH, DOOR, HOUSE), the tiles of the dots
 * and the deployments, the starts, the house and the corners the admins go
 * back to when they scatter.
 */
export function parseMaze(maze) {
  const h = maze.rows.length;
  const w = maze.rows[0].length;
  const cells = new Uint8Array(w * h);
  const dots = [];
  const powers = [];
  let pig = null;
  let gate = null;
  let fruit = null;
  let door = null;
  const house = [];
  for (let y = 0; y < h; y++) {
    const row = maze.rows[y];
    if (row.length !== w) {
      throw new Error(`Maze ${maze.id}: row ${y} is ${row.length} wide, not ${w}`);
    }
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      const i = y * w + x;
      if (ch === "#") {
        cells[i] = WALL;
      } else if (ch === "-") {
        cells[i] = DOOR;
        door = { x, y };
      } else if (ch === "h") {
        cells[i] = HOUSE;
        house.push({ x, y });
      } else {
        cells[i] = PATH;
        if (ch === ".") {
          dots.push(i);
        } else if (ch === "o") {
          powers.push(i);
        } else if (ch === "P") {
          pig = { x, y };
        } else if (ch === "G") {
          gate = { x, y };
        } else if (ch === "F") {
          fruit = { x, y };
        }
      }
    }
  }
  if (!pig || !gate || !fruit || !door || house.length === 0) {
    throw new Error(`Maze ${maze.id}: a start, the gate, the fruit spot, the door or the house is missing`);
  }
  const corners = [
    { x: w - 2, y: -3 },
    { x: 1, y: -3 },
    { x: w - 1, y: h + 1 },
    { x: 0, y: h + 1 }
  ];
  return { id: maze.id, color: maze.color, w, h, cells, dots, powers, pig, gate, fruit, door, house, corners };
}

/** The x of a tile once the tunnels wrap it round. */
export function wrapX(grid, x) {
  return ((x % grid.w) + grid.w) % grid.w;
}

/** What a tile is; off the grid above or below is a wall, left and right wrap. */
export function cellAt(grid, x, y) {
  if (y < 0 || y >= grid.h) {
    return WALL;
  }
  return grid.cells[y * grid.w + wrapX(grid, x)];
}

/**
 * Whether a mover may enter a tile. The guinea pig walks paths only; an admin
 * also crosses the door when it leaves the house or goes back as eyes.
 */
export function canEnter(grid, x, y, mover) {
  const c = cellAt(grid, x, y);
  if (c === PATH) {
    return true;
  }
  if (mover === "pig") {
    return false;
  }
  if (c === DOOR) {
    return mover === "leaving" || mover === "eyes";
  }
  if (c === HOUSE) {
    return mover === "eyes" || mover === "leaving" || mover === "home";
  }
  return false;
}

/** Whether a tile is a tunnel: a path on a row whose edge is open. */
export function inTunnel(grid, x, y) {
  return cellAt(grid, 0, y) === PATH && (x <= 4 || x >= grid.w - 5) && cellAt(grid, x, y) === PATH;
}
