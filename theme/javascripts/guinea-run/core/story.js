/*
 * The worlds of Guinea Run, in the order the change of US-014 travels: from a
 * laptop with nothing installed to production, then the watch over
 * production once it is there. Each world is a module of ../worlds/, loaded
 * only when it is played. The last one ends on the credits.
 *
 * The names, rules and pitches shown on the map live in ../texts.js. What each
 * world quotes from the labs lives in its own module (QUOTES), and
 * scripts/verify/check-easter-egg.mjs checks every quote is still in its lab.
 * When a lab listed here is reworded, re-read the world that names it.
 */

// par: the seconds of game time to beat the boss for the full speed bonus.
// 1.3 times the median of the boss's own autoplay (3 seeds on a computer, one
// on a phone, measured on 2026-10-22), except world 1, whose autoplay jumps
// straight over the admin to the axe in 4 s (12 s leaves a human the time to
// get past him), and world 9, which has no autoplay (45 s for 32 hits).
// A change to a boss changes its par: measure it again.
export const WORLDS = [
  { id: 0, module: "world-0-setup.js", style: "runner", glyph: "gear", labs: ["1.1"], par: 54 },
  { id: 1, module: "world-1-org.js", style: "platformer", glyph: "org", labs: ["1.3", "1.4"], par: 12 },
  { id: 2, module: "world-2-commit.js", style: "sorting", glyph: "box", labs: ["1.5", "2.8"], par: 37 },
  { id: 3, module: "world-3-pull-request.js", style: "puzzle", glyph: "branch", labs: ["1.6", "2.2", "2.3", "2.4"], badge: 1, par: 35 },
  { id: 4, module: "world-4-checks.js", style: "defense", glyph: "shield", labs: ["2.5", "3.2"], par: 19 },
  { id: 5, module: "world-5-conflict.js", style: "merge", glyph: "fork", labs: ["2.7", "3.4"], badge: 2, par: 29 },
  { id: 6, module: "world-6-integration.js", style: "musical", glyph: "bolt", labs: ["3.3"], par: 26 },
  { id: 7, module: "world-7-promotion.js", style: "runner", glyph: "delta", labs: ["3.5", "3.10"], par: 64 },
  { id: 8, module: "world-8-production.js", style: "musical", glyph: "star", labs: ["3.6"], badge: 3, par: 24 },
  { id: 9, module: "world-9-monitoring.js", style: "shooter", glyph: "eye", labs: ["3.8"], par: 45 }
];

/**
 * The bonuses: Pipeline Pinball, the table, and Org-Man, the maze. Both open
 * once every world is done. They are not WORLDS, so they never change the
 * world count, the credits or the total of the Hall of Fame: each has its own
 * card, its own board.
 */
export const BONUSES = [
  { id: "pinball", module: "pinball/index.js", style: "pinball", glyph: "star", labs: ["1.6", "3.5", "3.6"] },
  { id: "orgman", module: "orgman/index.js", style: "maze", glyph: "eye", labs: ["3.8", "3.7"] }
];

/** Pipeline Pinball, the first bonus. */
export const BONUS = BONUSES[0];

/** A bonus by its id ("pinball", "orgman"), or null. */
export function bonusOf(id) {
  return BONUSES.find((b) => b.id === id) || null;
}

/**
 * How fast the game runs, and what its points are worth. Easy is the pace of
 * the course. A world runs speed times faster (the musical runs take it as
 * the tempo of their song), and its score at the end is multiplied by mult.
 */
export const MODES = [
  { id: "easy", speed: 1, mult: 1 },
  { id: "normal", speed: 1.5, mult: 1.5 },
  { id: "hard", speed: 2, mult: 2 }
];

/** A mode by its id, Easy for anything else. */
export function modeOf(id) {
  return MODES.find((m) => m.id === id) || MODES[0];
}

/** The deployment actions of Labs 2.3 and 2.4, and where each belongs. */
export const DEPLOYMENT_ACTIONS = [
  { id: "deliverability", type: "manual", label: "Set Email Deliverability to All Email", when: "pre", order: 1, lab: "2.4" },
  { id: "backfill", type: "apex", label: "Backfill Customer Tier on existing accounts", when: "post", order: 1, lab: "2.3" },
  { id: "refdata", type: "data", label: "Load the customer tier reference data", when: "post", order: 2, lab: "2.4" },
  { id: "schedule", type: "schedule-batch", label: "Schedule the nightly customer tier recalculation", when: "post", order: 3, lab: "2.4" }
];

/**
 * A plan as world 3 saves it: { pre: [ids in order], post: [ids in order] }.
 * Returns, per action, whether the player put it at the right place, which is
 * what the gates of the runners are built from. With no plan yet, every
 * action counts as right, so a world opened directly still plays.
 */
export function judgePlan(plan) {
  const result = {};
  for (const action of DEPLOYMENT_ACTIONS) {
    if (!plan) {
      result[action.id] = { ok: true, when: action.when };
      continue;
    }
    const where = (plan.pre || []).includes(action.id) ? "pre" : (plan.post || []).includes(action.id) ? "post" : "none";
    let ok = where === action.when;
    if (ok && where === "post") {
      // The data must be loaded before the batch that reads it is scheduled
      const list = plan.post;
      if (action.id === "schedule" && list.includes("refdata") && list.indexOf("schedule") < list.indexOf("refdata")) {
        ok = false;
      }
    }
    result[action.id] = { ok, when: where === "none" ? action.when : where };
  }
  return result;
}
