/*
 * What a player has done, kept in their browser: which worlds are open, the
 * best score and stars of each (with the result the Hall of Fame receives),
 * the badges, Victor's notes found, the GitHub handle of the player and the
 * scores they sent to the Hall of Fame, the deployment actions plan declared
 * in world 3, which the runners read, and the best game of Pipeline Pinball, the bonus table. A pinball game in
 * progress is saved apart, by core/checkpoint.js.
 *
 * Every access is wrapped: a browser that blocks storage still plays, it just
 * forgets between visits. With ?guinea-unlock=all every world is open and
 * nothing is written, so a check never changes a real player's progress.
 */

const KEY = "guinea-run-progress-v1";

function empty() {
  return { v: 1, unlocked: 0, worlds: {}, badges: [], notes: {}, plan: null, finished: false };
}

export function createProgress(options) {
  const volatile = Boolean(options && options.volatile);
  let state = empty();
  // Read even when volatile: a check can set a plan or a progress and play it,
  // without the game ever writing over it
  {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.v === 1) {
          state = Object.assign(empty(), parsed);
        }
      }
    } catch {
      state = empty();
    }
  }
  if (options && options.unlockAll) {
    state.unlocked = 99;
  }

  function save() {
    if (volatile) {
      return;
    }
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // Storage refused: the game goes on without remembering
    }
  }

  return {
    get unlocked() {
      return state.unlocked;
    },
    get badges() {
      return state.badges.slice();
    },
    get plan() {
      return state.plan;
    },
    get finished() {
      return state.finished;
    },
    world(id) {
      return state.worlds[id] || { best: 0, stars: 0 };
    },
    hasNote(id) {
      return Boolean(state.notes[id]);
    },
    notesFound() {
      return Object.keys(state.notes).length;
    },
    /**
     * Records a finished world, opens the next one, and returns whether the
     * score is a new best. record: the result of this run for the Hall of
     * Fame, kept with a new best only (its signature comes later, setRecord).
     */
    complete(id, score, stars, next, record) {
      const previous = state.worlds[id] || { best: 0, stars: 0 };
      const newBest = score > previous.best;
      state.worlds[id] = { best: Math.max(previous.best, score), stars: Math.max(previous.stars, stars) };
      if (newBest && record) {
        state.worlds[id].record = record;
      } else if (previous.record) {
        state.worlds[id].record = previous.record;
      }
      if (next !== undefined) {
        state.unlocked = Math.max(state.unlocked, next);
      }
      save();
      return newBest;
    },
    /** The signed result of a world, once its signature is ready, if it is still the best. */
    setRecord(id, record) {
      const entry = state.worlds[id];
      if (entry && entry.best === record.sc) {
        entry.record = record;
        save();
      }
    },
    /** The mode the worlds are played in: easy, normal or hard. */
    get mode() {
      return state.mode || "easy";
    },
    setMode(mode) {
      state.mode = mode;
      save();
    },
    /** The GitHub handle the player sends their scores as. */
    get handle() {
      return state.handle || "";
    },
    setHandle(handle) {
      state.handle = handle;
      save();
    },
    /** The scores sent to the Hall of Fame so far, { worlds: { w: score }, pinball }: the board may not show them yet. */
    get sent() {
      return state.sent || { worlds: {}, pinball: 0 };
    },
    addSent(scores) {
      const sent = this.sent;
      for (const [w, score] of Object.entries(scores.worlds || {})) {
        sent.worlds[w] = Math.max(sent.worlds[w] || 0, score);
      }
      sent.pinball = Math.max(sent.pinball || 0, scores.pinball || 0);
      state.sent = sent;
      save();
    },
    addBadge(level) {
      if (!state.badges.includes(level)) {
        state.badges.push(level);
        state.badges.sort();
        save();
      }
    },
    addNote(id) {
      state.notes[id] = true;
      save();
    },
    setPlan(plan) {
      state.plan = plan;
      save();
    },
    setFinished() {
      state.finished = true;
      save();
    },
    /** Pipeline Pinball: its best score, the signed result of that game, whether its teaser was shown. */
    get bonus() {
      return Object.assign({ best: 0, record: null, teaserSeen: false }, state.bonus || {});
    },
    /** Every world done: the bonus table is open. */
    bonusOpen(worlds) {
      return worlds.every((w) => (state.worlds[w.id] || { stars: 0 }).stars > 0);
    },
    /** Records a finished pinball game, and returns whether it is a new best. record: as complete(). */
    completeBonus(score, record) {
      const bonus = this.bonus;
      const newBest = score > bonus.best;
      if (newBest) {
        bonus.best = score;
        bonus.record = record || null;
      }
      state.bonus = bonus;
      save();
      return newBest;
    },
    setBonusRecord(record) {
      const bonus = this.bonus;
      if (bonus.best === record.sc) {
        bonus.record = record;
        state.bonus = bonus;
        save();
      }
    },
    setTeaserSeen() {
      state.bonus = Object.assign(this.bonus, { teaserSeen: true });
      save();
    },
    reset() {
      // The handle, the mode and what was sent are who the player is, not what they did: they stay
      const { handle, mode, sent } = state;
      state = empty();
      if (sent) {
        state.sent = sent;
      }
      if (handle) {
        state.handle = handle;
      }
      if (mode) {
        state.mode = mode;
      }
      save();
    }
  };
}
