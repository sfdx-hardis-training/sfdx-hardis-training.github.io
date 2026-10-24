/*
 * The dot-matrix display of Pipeline Pinball, the orange screen of the arcade
 * tables: 128 by 32 dots. It shows the score, the ball and the level; the
 * mission, its timer and its goal while one plays; and big words for the
 * moments (jackpot, multiball, skill shot, extra ball, tilt) that blink, then
 * give the screen back.
 *
 * Text is drawn small on a hidden canvas, then each lit pixel becomes a round
 * dot, so any font reads as a dot matrix. It redraws at most 20 times a second,
 * and only when what it shows changed or blinks.
 */

const W = 128;
const H = 32;
const DOT_ON = "#ff7a1a";
const DOT_HOT = "#ffd27a";
const DOT_OFF = "#2a1206";
const REDRAW_S = 0.05;

export function createDmd(parent) {
  const box = document.createElement("div");
  box.className = "gr-dmd";
  const screen = document.createElement("canvas");
  screen.className = "gr-dmd-screen";
  screen.width = W * 4;
  screen.height = H * 4;
  screen.setAttribute("role", "img");
  box.appendChild(screen);
  parent.appendChild(box);
  const out = screen.getContext("2d");
  const page = document.createElement("canvas");
  page.width = W;
  page.height = H;
  const c = page.getContext("2d", { willReadFrequently: true });
  let flash = null;
  let since = REDRAW_S;
  let lastKey = "";
  let clock = 0;

  function font(size, weight) {
    c.font = (weight || "700") + " " + size + "px 'Courier New', Consolas, monospace";
  }

  /** Writes a line centred, shrinking it until it fits. */
  function line(text, y, size, weight) {
    let s = size;
    font(s, weight);
    while (c.measureText(text).width > W - 4 && s > 6) {
      s -= 1;
      font(s, weight);
    }
    c.fillText(text, W / 2, y);
  }

  function compose(view) {
    c.fillStyle = "#000";
    c.fillRect(0, 0, W, H);
    c.fillStyle = "#fff";
    c.textAlign = "center";
    c.textBaseline = "middle";
    if (flash) {
      // The big word, blinking, with its line under it
      if (flash.typing) {
        // A command typed at a terminal, one character after the other
        const shown = flash.big.slice(0, Math.floor((clock - flash.at) * 22));
        line(shown + (Math.floor(clock * 4) % 2 === 0 ? "_" : ""), 11, 12, "700");
      } else if (Math.floor(clock * 6) % 2 === 0 || clock - flash.at > 0.9) {
        line(flash.big, flash.small ? 11 : 16, flash.small ? 17 : 22, "900");
      }
      if (flash.small) {
        line(flash.small, 26, 9, "700");
      }
      return;
    }
    if (view.mission) {
      line(view.mission + "  " + view.time, 7, 9, "700");
      line(view.goal, 18, 8, "700");
      line(view.score, 28, 9, "900");
      return;
    }
    line(view.score, 13, 20, "900");
    line(view.status, 27, 8, "700");
  }

  // Each dot is a 4 by 4 cell: a round dot of 3 by 3 pixels, its corners dimmer
  const pixels = out.createImageData(screen.width, screen.height);
  const tones = [DOT_OFF, DOT_ON, DOT_HOT].map((hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]);

  function paint() {
    const data = c.getImageData(0, 0, W, H).data;
    const p = pixels.data;
    p.fill(0);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const v = data[(y * W + x) * 4];
        const tone = tones[v > 200 ? 2 : v > 90 ? 1 : 0];
        for (let dy = 0; dy < 3; dy++) {
          for (let dx = 0; dx < 3; dx++) {
            const corner = (dx === 0 || dx === 2) && (dy === 0 || dy === 2);
            const k = corner ? 0.45 : 1;
            const i = ((y * 4 + dy) * screen.width + x * 4 + dx) * 4;
            p[i] = tone[0] * k;
            p[i + 1] = tone[1] * k;
            p[i + 2] = tone[2] * k;
            p[i + 3] = 255;
          }
        }
      }
    }
    out.putImageData(pixels, 0, 0);
  }

  return {
    /** view: { score, status, mission, time, goal } as text. */
    update(dt, view) {
      clock += dt;
      since += dt;
      if (flash && clock > flash.until) {
        flash = null;
      }
      const key = JSON.stringify(view) + (flash ? flash.big + flash.small : "");
      if (since < REDRAW_S || (key === lastKey && !flash)) {
        return;
      }
      since = 0;
      lastKey = key;
      compose(view);
      paint();
      screen.setAttribute("aria-label", flash ? flash.big + " " + (flash.small || "") : view.score + " " + view.status);
    },
    /** A big word for a moment, and an optional line under it. */
    flash(big, small, seconds, typing) {
      flash = { big: typing ? String(big) : String(big).toUpperCase(), small: small ? String(small).toUpperCase() : "", at: clock, until: clock + (seconds || 2), typing: Boolean(typing) };
      since = REDRAW_S;
    },
    dispose() {
      box.remove();
    }
  };
}
