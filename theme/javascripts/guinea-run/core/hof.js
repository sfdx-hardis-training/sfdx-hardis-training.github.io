/*
 * The Hall of Fame: who leads, world by world and overall.
 *
 * The board is hall-of-fame/hall-of-fame.json at the root of the training
 * repository. The game reads it from GitHub (fresh within minutes), then from
 * the site's own copy, and shows an empty board if neither answers: the game
 * never waits for it.
 *
 * A player sends their scores through a GitHub issue the game fills in. The
 * hall-of-fame workflow checks it and writes the board. The rankings below are
 * also what that workflow and the site page use, so all three agree.
 */
import { TALLY_SET, seal } from "./tally.js";

export const REPOSITORY = "hardisgroupcom/sfdx-hardis-training";
export const BOARD_URL = "https://raw.githubusercontent.com/" + REPOSITORY + "/main/hall-of-fame/hall-of-fame.json";
// Written into every result, so a board entry says which game earned it
export const GAME_VERSION = "2026.10.22";
// Best scores saved before results were signed count until this day (UTC), under a lower cap
export const LEGACY_UNTIL = "2026-12-31";
export const WORLD_COUNT = 10;
// The title of a score issue starts with it: the workflow also knows an issue by it, when the label is missing
export const ISSUE_PREFIX = "[Guinea Run] ";
// After a send, the game waits this long before it offers another: the workflow
// refuses a send that comes too soon after the last one, and the player would
// only see "could not be verified"
export const SEND_PAUSE_MS = 10 * 60000;
const HANDLE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

/** Whether a text is a possible GitHub handle. */
export function isHandle(text) {
  return HANDLE.test(String(text || ""));
}

/** How long before the player may send again, in ms: 0 when they may. sentAt: their last send, 0 if none. */
export function sendWait(sentAt, now) {
  if (!Number.isFinite(sentAt) || sentAt <= 0 || sentAt > now) {
    return 0;
  }
  return Math.max(0, sentAt + SEND_PAUSE_MS - now);
}

/** Whether results without a signature may still be sent at this time. */
export function legacyOpen(now) {
  return now < Date.parse(LEGACY_UNTIL + "T23:59:59Z");
}

/** The players of the overall board, best first: total, then stars, then who sent first (their first time). */
export function rankGeneral(board) {
  return players(board)
    .map((p) => ({ handle: p.handle, badge: p.badge || 0, total: p.total || 0, stars: p.stars || 0, submittedAt: p.firstSubmittedAt || p.submittedAt || "" }))
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total || b.stars - a.stars || a.submittedAt.localeCompare(b.submittedAt));
}

/** The players of one world, best first: score, then stars, then the fastest boss, then who got there first. */
export function rankWorld(board, w) {
  const slow = Number.MAX_SAFE_INTEGER;
  return players(board)
    .filter((p) => p.worlds && p.worlds[w] && p.worlds[w].score > 0)
    .map((p) => {
      const e = p.worlds[w];
      return { handle: p.handle, badge: p.badge || 0, score: e.score, stars: e.stars || 0, bossMs: typeof e.bossMs === "number" ? e.bossMs : null, mode: e.mode || "easy", at: e.at || "" };
    })
    .sort((a, b) => b.score - a.score || b.stars - a.stars || (a.bossMs ?? slow) - (b.bossMs ?? slow) || a.at.localeCompare(b.at));
}

/** The players of Pipeline Pinball, best first: score, then level, then who got there first. */
export function rankPinball(board) {
  return players(board)
    .filter((p) => p.pinball && p.pinball.score > 0)
    .map((p) => ({ handle: p.handle, badge: p.badge || 0, score: p.pinball.score, level: p.pinball.level || 1, missions: p.pinball.missions || 0, ms: p.pinball.ms || 0, at: p.pinball.at || "" }))
    .sort((a, b) => b.score - a.score || b.level - a.level || a.at.localeCompare(b.at));
}

/** The players of Org-Man, best first: score, then the maze reached, then who got there first. */
export function rankOrgman(board) {
  return players(board)
    .filter((p) => p.orgman && p.orgman.score > 0)
    .map((p) => ({ handle: p.handle, badge: p.badge || 0, score: p.orgman.score, level: p.orgman.level || 1, admins: p.orgman.admins || 0, ms: p.orgman.ms || 0, at: p.orgman.at || "" }))
    .sort((a, b) => b.score - a.score || b.level - a.level || a.at.localeCompare(b.at));
}

/** The ranking of a bonus board by its id. */
export function rankBonus(board, id) {
  return id === "orgman" ? rankOrgman(board) : rankPinball(board);
}

/** The rank (1-based) of a handle in a ranked list, or 0. */
export function rankOf(list, handle) {
  const key = String(handle || "").toLowerCase();
  const i = list.findIndex((p) => p.handle.toLowerCase() === key);
  return i + 1;
}

// A score that would enter this top of a board is worth an invitation to send it
export const INVITE_TOP = 5;

/**
 * The boards where the player's scores would enter the top 5, and are not on
 * the board yet: what the game invites them to send.
 * mine: { worlds: { w: score }, pinball: score, orgman: score }, the scores the player can send.
 * sent: the same shape, what they sent already (their board entry may lag).
 * handle: theirs, or "": their own entry is not a rival.
 * boards: the boards to look at, world ids, "all", "pinball" and "orgman".
 * Returns [{ board, rank }] in the order of boards. A tie goes to whoever was
 * there first, so a score must beat the fifth one.
 */
export function topInvites(board, mine, sent, handle, boards) {
  const key = String(handle || "").toLowerCase();
  const others = players(board).filter((p) => p.handle.toLowerCase() !== key);
  const own = players(board).find((p) => key && p.handle.toLowerCase() === key) || {};
  const ownWorld = (w) => (own.worlds && own.worlds[w] ? own.worlds[w].score || 0 : 0);
  const worldScore = (w) => (mine.worlds && mine.worlds[w]) || 0;
  const isNew = (score, before) => score > 0 && score > before;
  const rankAmong = (score, scores) => 1 + scores.filter((s) => s >= score).length;
  const invites = [];
  for (const name of boards) {
    let rank = 0;
    if (name === "pinball" || name === "orgman") {
      const score = mine[name] || 0;
      if (isNew(score, Math.max(own[name] ? own[name].score || 0 : 0, (sent && sent[name]) || 0))) {
        rank = rankAmong(score, others.filter((p) => p[name] && p[name].score > 0).map((p) => p[name].score));
      }
    } else if (name === "all") {
      // Each world counts the higher of the new score and the board entry, as the workflow merges them
      let total = 0;
      let fresh = false;
      for (let w = 0; w < WORLD_COUNT; w++) {
        total += Math.max(worldScore(w), ownWorld(w));
        fresh = fresh || isNew(worldScore(w), Math.max(ownWorld(w), (sent && sent.worlds && sent.worlds[w]) || 0));
      }
      if (fresh) {
        rank = rankAmong(total, others.filter((p) => p.total > 0).map((p) => p.total));
      }
    } else {
      const score = worldScore(name);
      if (isNew(score, Math.max(ownWorld(name), (sent && sent.worlds && sent.worlds[name]) || 0))) {
        rank = rankAmong(score, others.filter((p) => p.worlds && p.worlds[name] && p.worlds[name].score > 0).map((p) => p.worlds[name].score));
      }
    }
    if (rank > 0 && rank <= INVITE_TOP) {
      invites.push({ board: name, rank });
    }
  }
  return invites;
}

/**
 * The score Pipeline Pinball must pass to enter the top 5, and beat what the
 * player already has there; 0 while the board has fewer than 5 other players
 * (any score enters it then, a flash would come at the first points).
 */
export function pinballTarget(board, sent, handle) {
  return bonusTarget(board, sent, handle, "pinball");
}

/** The same for any bonus board: "pinball" or "orgman". */
export function bonusTarget(board, sent, handle, id) {
  const key = String(handle || "").toLowerCase();
  const list = rankBonus(board, id);
  const others = list.filter((p) => p.handle.toLowerCase() !== key);
  if (others.length < INVITE_TOP) {
    return 0;
  }
  const own = list.find((p) => key && p.handle.toLowerCase() === key);
  return Math.max(others[INVITE_TOP - 1].score, own ? own.score : 0, (sent && sent[id]) || 0);
}

/** The scores of results, in the shape topInvites reads. */
export function scoresOf(results) {
  const scores = { worlds: {}, pinball: 0, orgman: 0 };
  for (const r of results) {
    if (r.pin === 1) {
      scores.pinball = Math.max(scores.pinball, r.sc || 0);
    } else if (r.org === 1) {
      scores.orgman = Math.max(scores.orgman, r.sc || 0);
    } else if (typeof r.w === "number") {
      scores.worlds[r.w] = Math.max(scores.worlds[r.w] || 0, r.sc || 0);
    }
  }
  return scores;
}

/** The avatar GitHub serves for a handle. */
export function avatarUrl(handle, size) {
  return "https://github.com/" + encodeURIComponent(handle) + ".png?size=" + (size || 48);
}

/** Reads the board: GitHub first, then the site's copy. Never throws: an empty board at worst. */
export async function loadBoard(siteRoot) {
  const minute = Math.floor(Date.now() / 60000);
  for (const url of [BOARD_URL + "?m=" + minute, siteRoot ? new URL("hall-of-fame/hall-of-fame.json", siteRoot).href : null]) {
    if (!url) {
      continue;
    }
    try {
      const board = await fetchJson(url, 4000);
      if (board && board.players) {
        return { board, ok: true };
      }
    } catch {
      // The next source, or the empty board
    }
  }
  return { board: { players: {} }, ok: false };
}

/**
 * What the player can send: their signed results, and before LEGACY_UNTIL the
 * best scores of worlds finished before results were signed.
 * progress: the progress store. Returns the results, possibly empty.
 */
export function collectResults(progress, now) {
  const results = [];
  for (let w = 0; w < WORLD_COUNT; w++) {
    const e = progress.world(w);
    if (!(e.best > 0)) {
      continue;
    }
    if (e.record && e.record.sg) {
      results.push(e.record);
    } else if (!e.record && legacyOpen(now)) {
      results.push({ w, sc: e.best, st: e.stars, legacy: true });
    }
  }
  // The best game of Pipeline Pinball, on its own board
  const bonus = progress.bonus;
  if (bonus && bonus.record && bonus.record.sg && bonus.record.pin === 1) {
    results.push(bonus.record);
  }
  // The best game of Org-Man, on its own board too
  const maze = progress.bonusOf ? progress.bonusOf("orgman") : null;
  if (maze && maze.record && maze.record.sg && maze.record.org === 1) {
    results.push(maze.record);
  }
  return results;
}

/** The address of the new issue that carries the results, signed for this handle and this hour. */
export async function submissionUrl(handle, results, now) {
  const submission = { f: 1, h: handle, hr: Math.floor(now / 3600000), k: TALLY_SET, r: results };
  submission.sg = await seal(submission);
  const scores = JSON.stringify(submission);
  // The form fills its field from "scores". The GitHub mobile app ignores
  // forms and opens a plain issue with the title and the body: the body holds
  // the same text the form writes, so the workflow reads either one.
  const query = new URLSearchParams({
    template: "guinea-run-score.yml",
    title: ISSUE_PREFIX + handle,
    scores,
    body: "### Scores\n\n```json\n" + scores + "\n```\n"
  });
  return "https://github.com/" + REPOSITORY + "/issues/new?" + query.toString();
}

function players(board) {
  const banned = new Set(((board && board.banned) || []).map((h) => String(h).toLowerCase()));
  return Object.values((board && board.players) || {}).filter((p) => p && p.handle && !banned.has(p.handle.toLowerCase()));
}

async function fetchJson(url, ms) {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), ms) : null;
  try {
    const response = await fetch(url, { cache: "no-store", signal: controller ? controller.signal : undefined });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
