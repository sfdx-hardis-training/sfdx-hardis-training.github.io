/*
 * The dot-matrix display of Pipeline Pinball, the orange screen of the arcade
 * tables: 128 by 32 dots. It shows the score, the ball and the level; the
 * mission, its timer and its goal while one plays; and big words for the
 * moments (jackpot, multiball, skill shot, extra ball, tilt) that blink, then
 * give the screen back.
 *
 * Text is written with a dot font of its own, 5 by 7 dots a letter, as the
 * arcade displays do: every letter lands on whole dots, so it reads at any
 * size. The score and the big words are drawn twice as large. A line too long
 * for the screen scrolls across it. It redraws at most 20 times a second, and
 * only when what it shows changed, blinks or scrolls.
 */

const W = 128;
const H = 32;
const DOT_ON = "#ff7a1a";
const DOT_HOT = "#ffd27a";
const DOT_OFF = "#221006";
const REDRAW_S = 0.05;
// Dots a second for a line that scrolls, and the gap before it comes round again
const SCROLL_SPEED = 34;
const SCROLL_GAP = 24;

// The dot font: 7 rows a letter, its width is the length of a row
const GLYPHS = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".####"],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: [".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  J: ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "#.#.#", ".#.#."],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  a: [".....", ".....", ".###.", "....#", ".####", "#...#", ".####"],
  b: ["#....", "#....", "#.##.", "##..#", "#...#", "#...#", "####."],
  c: [".....", ".....", ".###.", "#....", "#....", "#...#", ".###."],
  d: ["....#", "....#", ".##.#", "#..##", "#...#", "#...#", ".####"],
  e: [".....", ".....", ".###.", "#...#", "#####", "#....", ".###."],
  f: ["..##.", ".#..#", ".#...", "###..", ".#...", ".#...", ".#..."],
  g: [".....", ".####", "#...#", "#...#", ".####", "....#", ".###."],
  h: ["#....", "#....", "#.##.", "##..#", "#...#", "#...#", "#...#"],
  i: ["..#..", ".....", ".##..", "..#..", "..#..", "..#..", ".###."],
  j: ["...#.", ".....", "..##.", "...#.", "...#.", "#..#.", ".##.."],
  k: ["#....", "#....", "#..#.", "#.#..", "##...", "#.#..", "#..#."],
  l: [".##..", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  m: [".....", ".....", "##.#.", "#.#.#", "#.#.#", "#...#", "#...#"],
  n: [".....", ".....", "#.##.", "##..#", "#...#", "#...#", "#...#"],
  o: [".....", ".....", ".###.", "#...#", "#...#", "#...#", ".###."],
  p: [".....", ".....", "####.", "#...#", "####.", "#....", "#...."],
  q: [".....", ".....", ".##.#", "#..##", ".####", "....#", "....#"],
  r: [".....", ".....", "#.##.", "##..#", "#....", "#....", "#...."],
  s: [".....", ".....", ".###.", "#....", ".###.", "....#", "####."],
  t: [".#...", ".#...", "###..", ".#...", ".#...", ".#..#", "..##."],
  u: [".....", ".....", "#...#", "#...#", "#...#", "#..##", ".##.#"],
  v: [".....", ".....", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  w: [".....", ".....", "#...#", "#...#", "#.#.#", "#.#.#", ".#.#."],
  x: [".....", ".....", "#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
  y: [".....", ".....", "#...#", "#...#", ".####", "....#", ".###."],
  z: [".....", ".....", "#####", "...#.", "..#..", ".#...", "#####"],
  0: [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  1: ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  2: [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  3: ["#####", "...#.", "..#..", "...#.", "....#", "#...#", ".###."],
  4: ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  5: ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  6: ["..##.", ".#...", "#....", "####.", "#...#", "#...#", ".###."],
  7: ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  8: [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  9: [".###.", "#...#", "#...#", ".####", "....#", "...#.", ".##.."],
  " ": ["...", "...", "...", "...", "...", "...", "..."],
  // The thin space of a French score: 11 028 150
  " ": ["..", "..", "..", "..", "..", "..", ".."],
  ".": ["..", "..", "..", "..", "..", "##", "##"],
  ",": ["..", "..", "..", "..", "##", ".#", "#."],
  ":": ["..", "##", "##", "..", "##", "##", ".."],
  ";": ["..", "##", "##", "..", "##", ".#", "#."],
  "!": ["#", "#", "#", "#", "#", ".", "#"],
  "'": ["#", "#", ".", ".", ".", ".", "."],
  '"': ["#.#", "#.#", "...", "...", "...", "...", "..."],
  "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
  "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
  "+": [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
  "=": [".....", ".....", "#####", ".....", "#####", ".....", "....."],
  "*": [".....", "..#..", "#.#.#", ".###.", "#.#.#", "..#..", "....."],
  "/": [".....", "....#", "...#.", "..#..", ".#...", "#....", "....."],
  "%": ["##...", "##..#", "...#.", "..#..", ".#...", "#..##", "...##"],
  "#": [".#.#.", ".#.#.", "#####", ".#.#.", "#####", ".#.#.", ".#.#."],
  "&": [".##..", "#..#.", "#.#..", ".#...", "#.#.#", "#..#.", ".##.#"],
  "(": ["..#", ".#.", "#..", "#..", "#..", ".#.", "..#"],
  ")": ["#..", ".#.", "..#", "..#", "..#", ".#.", "#.."],
  "<": ["...#", "..#.", ".#..", "#...", ".#..", "..#.", "...#"],
  ">": ["#...", ".#..", "..#.", "...#", "..#.", ".#..", "#..."],
  _: [".....", ".....", ".....", ".....", ".....", ".....", "#####"]
};
const SAME_AS = { " ": " ", "’": "'", "×": "x", "…": "." };

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
  // The brightness of each dot: 0 off, 1 lit, 2 bright
  const dots = new Uint8Array(W * H);
  let flash = null;
  let since = REDRAW_S;
  let lastKey = "";
  let clock = 0;
  // Set while a line scrolls: the screen redraws even when nothing changed
  let moving = false;

  function compose(view) {
    dots.fill(0);
    moving = false;
    if (flash) {
      if (flash.typing) {
        // A command typed at a terminal, one character after the other; a long one shows its end
        const shown = flash.big.slice(0, Math.floor((clock - flash.at) * 22)) + (Math.floor(clock * 4) % 2 === 0 ? "_" : "");
        const w = measure(shown, 1, 1);
        write(shown, w > W - 2 ? W - 1 - w : Math.floor((W - w) / 2), 12, 1, 1, 2, 1);
        return;
      }
      // The big word, blinking, with its line under it
      if (Math.floor(clock * 6) % 2 === 0 || clock - flash.at > 0.9) {
        big(flash.big, flash.small ? 2 : 9);
      }
      if (flash.small) {
        line(flash.small, 23, 1, 1);
      }
      return;
    }
    if (view.mission) {
      line(view.mission + "  " + view.time, 1, 1, 1);
      line(view.goal, 12, 1, 1);
      line(view.score, 23, 1, 2);
      return;
    }
    big(view.score, 2);
    line(view.status, 23, 1, 1);
  }

  /** A line twice as large where it fits; else twice as tall, scrolling if it must. */
  function big(text, y) {
    if (measure(text, 2, 1) <= W - 2) {
      line(text, y, 2, 2, 2);
    } else {
      line(text, y, 1, 2, 2);
    }
  }

  /**
   * A line centred: bold (each dot doubled to its right, it reads on a phone)
   * where it fits, plain where only that fits, or bold and scrolling across.
   */
  function line(text, y, sx, level, sy) {
    for (const bold of [1, 0]) {
      const w = measure(text, sx, bold);
      if (w <= W - 2) {
        write(text, Math.floor((W - w) / 2), y, sx, sy || 1, level, bold);
        return;
      }
    }
    moving = true;
    const loop = measure(text, sx, 1) + SCROLL_GAP;
    const x = W - Math.floor((clock * SCROLL_SPEED) % (loop + W));
    write(text, x, y, sx, sy || 1, level, 1);
    if (x + loop < W) {
      write(text, x + loop, y, sx, sy || 1, level, 1);
    }
  }

  function measure(text, sx, bold) {
    let w = 0;
    for (const ch of text) {
      w += (glyph(ch)[0].length + 1) * sx + bold;
    }
    return Math.max(0, w - sx);
  }

  function write(text, x0, y0, sx, sy, level, bold) {
    let x = x0;
    for (const ch of text) {
      const rows = glyph(ch);
      const width = rows[0].length;
      if (x + width * sx + bold >= 0 && x < W) {
        for (let r = 0; r < 7; r++) {
          const row = rows[r];
          for (let c = 0; c < width; c++) {
            if (row.charCodeAt(c) !== 35) {
              continue;
            }
            for (let dy = 0; dy < sy; dy++) {
              const py = y0 + r * sy + dy;
              if (py < 0 || py >= H) {
                continue;
              }
              for (let dx = 0; dx < sx + bold; dx++) {
                const px = x + c * sx + dx;
                if (px >= 0 && px < W) {
                  dots[py * W + px] = level;
                }
              }
            }
          }
        }
      }
      x += (width + 1) * sx + bold;
    }
  }

  // Each dot is a 4 by 4 cell: a round dot of 3 by 3 pixels, its corners dimmer
  const pixels = out.createImageData(screen.width, screen.height);
  const tones = [DOT_OFF, DOT_ON, DOT_HOT].map((hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]);

  function paint() {
    const p = pixels.data;
    p.fill(0);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const tone = tones[dots[y * W + x]];
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
      if (since < REDRAW_S || (key === lastKey && !flash && !moving)) {
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

/** The dots of a character: accents dropped (É is E), anything unknown a space. */
function glyph(ch) {
  const found = GLYPHS[ch] || GLYPHS[SAME_AS[ch]];
  if (found) {
    return found;
  }
  const plain = ch.normalize("NFD").charAt(0);
  return GLYPHS[plain] || GLYPHS[" "];
}
