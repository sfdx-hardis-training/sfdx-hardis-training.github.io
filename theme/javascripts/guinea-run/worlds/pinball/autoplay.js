/*
 * A player for the check: it flips when a ball comes over a flipper, plunges
 * a waiting ball, and lets go. It plays well enough to reach the ramps and the
 * missions, never like a person. scripts/verify/check-easter-egg.mjs runs it
 * through window.__guineaRun.pinball.autoplay(true), and the limits of the
 * Hall of Fame are measured with it.
 */

const HOLD_S = 0.16;
const REST_S = 0.12;

export function createAutoplay(table, random) {
  const physics = table.physics;
  const flips = Object.values(table.parts.flippers).map((f) => ({ f, until: 0, rest: 0 }));
  let plunging = 0;
  let strength = 1;
  let clock = 0;

  /** Is a ball over this flipper, close enough to hit? */
  function ballOver(f) {
    const s = f.shape;
    for (const b of physics.balls) {
      if (!b.active || b.mode !== "table" || b.floor !== s.floor) {
        continue;
      }
      // Where the ball is along the flipper, from the pivot to the tip
      const ex = s.bx - s.pivotX;
      const ey = s.by - s.pivotY;
      const len2 = ex * ex + ey * ey;
      const k = ((b.x - s.pivotX) * ex + (b.y - s.pivotY) * ey) / len2;
      if (k < 0.15 || k > 1.05) {
        continue;
      }
      const cx = s.pivotX + ex * k;
      const cy = s.pivotY + ey * k;
      const d = Math.hypot(b.x - cx, b.y - cy);
      const coming = b.vy < 1 || b.y < cy + 0.6;
      // A little later on the flipper aims a little more across the table
      const reach = 0.95 + random() * 0.35;
      if (d < reach && coming && b.y > cy - 0.2) {
        return true;
      }
    }
    return false;
  }

  return {
    /** One frame of play; returns what it pressed, for the rules' lanes. */
    step(dt, controls) {
      clock += dt;
      for (const x of flips) {
        if (x.f.held) {
          if (clock >= x.until) {
            x.f.held = false;
            x.rest = clock + REST_S;
            controls.release(x.f);
          }
        } else if (clock >= x.rest && ballOver(x.f)) {
          x.f.held = true;
          x.until = clock + HOLD_S;
          controls.press(x.f);
        }
      }
      const waiting = physics.ballOnPlunger();
      if (waiting && !plunging) {
        plunging = clock + 0.6;
        strength = 0.25 + random() * 0.75;
      }
      if (plunging) {
        physics.pullPlunger(Math.min(strength, (clock - (plunging - 0.6)) * 2));
        if (clock >= plunging) {
          plunging = 0;
          if (physics.releasePlunger()) {
            controls.launched();
          }
        }
      }
    }
  };
}
