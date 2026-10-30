/*
 * How the admins of Org-Man chase the guinea pig. Each one has its habit:
 *
 *   0 Hotfix in prod      goes straight for the guinea pig
 *   1 Click in Setup      aims four tiles ahead of where it is going
 *   2 Sandbox refresh     works from the first admin: it doubles the line from
 *                         him to two tiles ahead of the guinea pig
 *   3 Profile tweak       comes close, then loses interest and goes back to
 *                         its corner
 *   4 the Sales Manager   comes straight at the guinea pig, and never rests
 *
 * At each crossing an admin takes the way that brings it closest to its
 * target, never turning back. While it scatters, its target is its corner;
 * while it is blue, it wanders. No Three.js here.
 */
import { DIRS, OPPOSITE, canEnter, wrapX } from "./maze.js";

export const ADMIN_COUNT = 4;
export const SALES_MANAGER = 4;
// Ties go up, left, down, right, so two runs of the same seed always agree
const ORDER = [0, 1, 2, 3];

/** The tile an admin heads for now. */
export function targetOf(admin, sim) {
  const { grid, pig, admins } = sim;
  if (admin.mode === "eyes") {
    return grid.house[1] || grid.house[0];
  }
  if (admin.mode === "leaving") {
    return admin.leaveStep === 0 ? { x: grid.door.x, y: grid.door.y + 1 } : grid.gate;
  }
  if (sim.scatter && admin.id !== SALES_MANAGER) {
    return grid.corners[admin.id];
  }
  const p = { x: pig.tx, y: pig.ty };
  const d = DIRS[pig.dir];
  switch (admin.id) {
    case 1:
      return { x: p.x + d.x * 4, y: p.y + d.y * 4 };
    case 2: {
      const lead = { x: p.x + d.x * 2, y: p.y + d.y * 2 };
      const first = admins[0];
      return { x: lead.x * 2 - first.tx, y: lead.y * 2 - first.ty };
    }
    case 3: {
      const dx = admin.tx - p.x;
      const dy = admin.ty - p.y;
      return dx * dx + dy * dy > 64 ? p : grid.corners[3];
    }
    default:
      return p;
  }
}

/**
 * The way an admin takes at the centre of a tile: towards its target, or at
 * random while it is blue. Turning back only when there is nothing else.
 */
export function chooseDir(admin, sim) {
  const { grid } = sim;
  const mover = admin.mode === "eyes" ? "eyes" : admin.mode === "leaving" ? "leaving" : "admin";
  const back = OPPOSITE[admin.dir];
  const open = [];
  for (const dir of ORDER) {
    const d = DIRS[dir];
    if (canEnter(grid, admin.tx + d.x, admin.ty + d.y, mover)) {
      open.push(dir);
    }
  }
  if (open.length === 0) {
    return -1;
  }
  // Leaving the house may turn back: inside it every tile is a dead end
  const choices = mover !== "leaving" && open.length > 1 ? open.filter((dir) => dir !== back) : open;
  if (admin.blue && admin.mode === "active") {
    return choices[Math.floor(sim.random() * choices.length) % choices.length];
  }
  const target = targetOf(admin, sim);
  let best = choices[0];
  let bestDistance = Infinity;
  for (const dir of choices) {
    const d = DIRS[dir];
    const x = admin.tx + d.x;
    const y = admin.ty + d.y;
    // Through a tunnel, the distance counts the short way round
    const dxRaw = Math.abs(wrapX(grid, x) - target.x);
    const dx = mover === "admin" ? Math.min(dxRaw, Math.abs(grid.w - dxRaw)) : dxRaw;
    const dy = y - target.y;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = dir;
    }
  }
  return best;
}
