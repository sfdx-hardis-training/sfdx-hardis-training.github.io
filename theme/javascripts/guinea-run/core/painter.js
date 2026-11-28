/*
 * Everything Guinea Run draws on a canvas, in the look of the Lightning Design
 * System: toasts, cards, icon tiles, coins, the Path, and the glyphs inside
 * them. A world asks the painter for a texture or a material by name, and the
 * painter caches it until the world closes.
 *
 * Nothing here runs at import time, so a check can import the module in Node.
 */

// Lightning Design System colours
export const SLDS = {
  brand: "#0176D3",
  brandDark: "#014486",
  navy: "#032D60",
  error: "#EA001E",
  errorDark: "#BA0517",
  warning: "#FE9339",
  warningDark: "#DD7A01",
  success: "#2E844A",
  purple: "#9050E9",
  teal: "#06A59A",
  grey: "#706E6B",
  border: "#C9C9C9",
  light: "#F3F3F3",
  text: "#181818",
  weak: "#444444",
  white: "#FFFFFF"
};

/* ---------- Drawing helpers ---------- */

export function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function font(ctx, size, weight, mono) {
  ctx.font = (weight || "700") + " " + size + "px " + (mono ? "'JetBrains Mono', Consolas, monospace" : "'Open Sans', 'Segoe UI', Arial, sans-serif");
}

/** Writes text at (x, y), shrinking the font until it fits maxWidth. */
export function fitText(ctx, text, x, y, maxWidth, size, weight, mono) {
  let s = size;
  font(ctx, s, weight, mono);
  while (ctx.measureText(text).width > maxWidth && s > 10) {
    s -= 2;
    font(ctx, s, weight, mono);
  }
  ctx.fillText(text, x, y);
}

/** Splits text into lines that fit maxWidth at the current font. */
export function wrapLines(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? line + " " + word : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) {
    lines.push(line);
  }
  return lines;
}

/** The glyphs, drawn in a box of `size` centred on (x, y), in the current colour. */
export const GLYPHS = {
  error(ctx, x, y, size) {
    ctx.lineWidth = size * 0.14;
    ctx.lineCap = "round";
    const d = size * 0.22;
    ctx.beginPath();
    ctx.moveTo(x - d, y - d);
    ctx.lineTo(x + d, y + d);
    ctx.moveTo(x + d, y - d);
    ctx.lineTo(x - d, y + d);
    ctx.stroke();
  },
  warning(ctx, x, y, size) {
    ctx.lineWidth = size * 0.12;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.25);
    ctx.lineTo(x, y + size * 0.08);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y + size * 0.27, size * 0.07, 0, Math.PI * 2);
    ctx.fill();
  },
  check(ctx, x, y, size) {
    ctx.lineWidth = size * 0.14;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x - size * 0.25, y);
    ctx.lineTo(x - size * 0.06, y + size * 0.2);
    ctx.lineTo(x + size * 0.27, y - size * 0.2);
    ctx.stroke();
  },
  lock(ctx, x, y, size) {
    ctx.lineWidth = size * 0.1;
    ctx.beginPath();
    ctx.arc(x, y - size * 0.08, size * 0.17, Math.PI, 0);
    ctx.stroke();
    rounded(ctx, x - size * 0.27, y - size * 0.06, size * 0.54, size * 0.38, size * 0.06);
    ctx.fill();
  },
  flow(ctx, x, y, size) {
    // Three steps joined by lines, the way Flow Builder draws them
    const d = size * 0.3;
    ctx.lineWidth = size * 0.07;
    ctx.beginPath();
    ctx.moveTo(x, y - d);
    ctx.lineTo(x, y + d);
    ctx.moveTo(x, y);
    ctx.lineTo(x + d, y + d);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y - d, size * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.12);
    ctx.lineTo(x + size * 0.12, y);
    ctx.lineTo(x, y + size * 0.12);
    ctx.lineTo(x - size * 0.12, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x - size * 0.09, y + d - size * 0.09, size * 0.18, size * 0.18);
    ctx.fillRect(x + d - size * 0.09, y + d - size * 0.09, size * 0.18, size * 0.18);
  },
  apex(ctx, x, y, size) {
    font(ctx, size * 0.5, "800", true);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("{ }", x, y + size * 0.03);
  },
  code(ctx, x, y, size) {
    font(ctx, size * 0.42, "800", true);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("</>", x, y + size * 0.03);
  },
  profile(ctx, x, y, size) {
    ctx.beginPath();
    ctx.arc(x, y - size * 0.13, size * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, y + size * 0.27, size * 0.27, size * 0.2, 0, Math.PI, 0);
    ctx.fill();
  },
  permset(ctx, x, y, size) {
    // A key
    ctx.lineWidth = size * 0.09;
    ctx.beginPath();
    ctx.arc(x - size * 0.14, y, size * 0.14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + size * 0.32, y);
    ctx.moveTo(x + size * 0.22, y);
    ctx.lineTo(x + size * 0.22, y + size * 0.12);
    ctx.moveTo(x + size * 0.31, y);
    ctx.lineTo(x + size * 0.31, y + size * 0.1);
    ctx.stroke();
  },
  bolt(ctx, x, y, size) {
    ctx.beginPath();
    ctx.moveTo(x + size * 0.06, y - size * 0.36);
    ctx.lineTo(x - size * 0.2, y + size * 0.05);
    ctx.lineTo(x - size * 0.01, y + size * 0.05);
    ctx.lineTo(x - size * 0.08, y + size * 0.36);
    ctx.lineTo(x + size * 0.2, y - size * 0.07);
    ctx.lineTo(x + size * 0.01, y - size * 0.07);
    ctx.closePath();
    ctx.fill();
  },
  delta(ctx, x, y, size) {
    ctx.lineWidth = size * 0.1;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.3);
    ctx.lineTo(x + size * 0.3, y + size * 0.25);
    ctx.lineTo(x - size * 0.3, y + size * 0.25);
    ctx.closePath();
    ctx.stroke();
  },
  loop(ctx, x, y, size) {
    // A loop back, with its arrow head: backpromote, restart, retry
    ctx.lineWidth = size * 0.1;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(x, y, size * 0.25, Math.PI * 0.15, Math.PI * 1.75);
    ctx.stroke();
    const a = Math.PI * 0.15;
    const hx = x + Math.cos(a) * size * 0.25;
    const hy = y + Math.sin(a) * size * 0.25;
    ctx.beginPath();
    ctx.moveTo(hx + size * 0.12, hy - size * 0.02);
    ctx.lineTo(hx - size * 0.02, hy + size * 0.14);
    ctx.lineTo(hx - size * 0.08, hy - size * 0.06);
    ctx.closePath();
    ctx.fill();
  },
  branch(ctx, x, y, size) {
    // A git branch: a trunk and a branch joining it
    ctx.lineWidth = size * 0.08;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - size * 0.15, y - size * 0.3);
    ctx.lineTo(x - size * 0.15, y + size * 0.3);
    ctx.moveTo(x - size * 0.15, y + size * 0.1);
    ctx.quadraticCurveTo(x + size * 0.18, y + size * 0.05, x + size * 0.18, y - size * 0.18);
    ctx.stroke();
    for (const [cx, cy] of [
      [x - size * 0.15, y - size * 0.3],
      [x - size * 0.15, y + size * 0.3],
      [x + size * 0.18, y - size * 0.22]
    ]) {
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  hexagon(ctx, x, y, size) {
    ctx.lineWidth = size * 0.09;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (i * Math.PI) / 3;
      const px = x + Math.cos(a) * size * 0.3;
      const py = y + Math.sin(a) * size * 0.3;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.stroke();
    font(ctx, size * 0.24, "800", true);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("js", x, y + size * 0.02);
  },
  cloud(ctx, x, y, size) {
    ctx.beginPath();
    ctx.arc(x - size * 0.14, y + size * 0.04, size * 0.15, 0, Math.PI * 2);
    ctx.arc(x + size * 0.02, y - size * 0.08, size * 0.19, 0, Math.PI * 2);
    ctx.arc(x + size * 0.18, y + size * 0.05, size * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - size * 0.14, y + size * 0.02, size * 0.32, size * 0.17);
  },
  infinity(ctx, x, y, size) {
    // The Cloudity mark, simplified
    ctx.lineWidth = size * 0.09;
    ctx.beginPath();
    ctx.ellipse(x - size * 0.14, y, size * 0.13, size * 0.12, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x + size * 0.14, y, size * 0.13, size * 0.12, 0, 0, Math.PI * 2);
    ctx.stroke();
  },
  puzzle(ctx, x, y, size) {
    // An extension: four squares, one apart
    const s = size * 0.17;
    ctx.fillRect(x - s - 2, y - s - 2, s, s);
    ctx.fillRect(x + 2, y - s - 2, s, s);
    ctx.fillRect(x - s - 2, y + 2, s, s);
    ctx.save();
    ctx.translate(x + s / 2 + 6, y + s / 2 + 6);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.restore();
  },
  org(ctx, x, y, size) {
    // An org: a building
    ctx.fillRect(x - size * 0.22, y - size * 0.22, size * 0.44, size * 0.48);
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 2; c++) {
        ctx.fillRect(x - size * 0.14 + c * size * 0.16, y - size * 0.15 + r * size * 0.13, size * 0.1, size * 0.08);
      }
    }
    ctx.restore();
  },
  gear(ctx, x, y, size) {
    ctx.lineWidth = size * 0.1;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.14, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * size * 0.2, y + Math.sin(a) * size * 0.2);
      ctx.lineTo(x + Math.cos(a) * size * 0.31, y + Math.sin(a) * size * 0.31);
      ctx.stroke();
    }
  },
  fork(ctx, x, y, size) {
    ctx.lineWidth = size * 0.08;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - size * 0.18, y - size * 0.22);
    ctx.lineTo(x - size * 0.18, y - size * 0.05);
    ctx.quadraticCurveTo(x - size * 0.18, y + size * 0.05, x, y + size * 0.05);
    ctx.quadraticCurveTo(x + size * 0.18, y + size * 0.05, x + size * 0.18, y - size * 0.05);
    ctx.lineTo(x + size * 0.18, y - size * 0.22);
    ctx.moveTo(x, y + size * 0.05);
    ctx.lineTo(x, y + size * 0.22);
    ctx.stroke();
    for (const [cx, cy] of [
      [x - size * 0.18, y - size * 0.26],
      [x + size * 0.18, y - size * 0.26],
      [x, y + size * 0.27]
    ]) {
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  log(ctx, x, y, size) {
    ctx.fillRect(x - size * 0.24, y - size * 0.26, size * 0.48, size * 0.07);
    ctx.fillRect(x - size * 0.24, y - size * 0.1, size * 0.36, size * 0.07);
    ctx.fillRect(x - size * 0.24, y + size * 0.06, size * 0.44, size * 0.07);
    ctx.fillRect(x - size * 0.24, y + size * 0.22, size * 0.28, size * 0.07);
  },
  shield(ctx, x, y, size) {
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.3);
    ctx.lineTo(x + size * 0.25, y - size * 0.2);
    ctx.quadraticCurveTo(x + size * 0.24, y + size * 0.15, x, y + size * 0.32);
    ctx.quadraticCurveTo(x - size * 0.24, y + size * 0.15, x - size * 0.25, y - size * 0.2);
    ctx.closePath();
    ctx.fill();
  },
  star(ctx, x, y, size) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? size * 0.32 : size * 0.14;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();
  },
  note(ctx, x, y, size) {
    ctx.fillRect(x - size * 0.24, y - size * 0.24, size * 0.48, size * 0.48);
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillRect(x - size * 0.16, y - size * 0.12, size * 0.32, size * 0.05);
    ctx.fillRect(x - size * 0.16, y, size * 0.32, size * 0.05);
    ctx.fillRect(x - size * 0.16, y + size * 0.12, size * 0.2, size * 0.05);
    ctx.restore();
  },
  box(ctx, x, y, size) {
    ctx.lineWidth = size * 0.08;
    ctx.strokeRect(x - size * 0.22, y - size * 0.16, size * 0.44, size * 0.36);
    ctx.beginPath();
    ctx.moveTo(x - size * 0.22, y - size * 0.04);
    ctx.lineTo(x + size * 0.22, y - size * 0.04);
    ctx.stroke();
  },
  eye(ctx, x, y, size) {
    ctx.lineWidth = size * 0.08;
    ctx.beginPath();
    ctx.ellipse(x, y, size * 0.3, size * 0.17, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, size * 0.09, 0, Math.PI * 2);
    ctx.fill();
  },
  empty(ctx, x, y, size) {
    ctx.lineWidth = size * 0.08;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.24, 0, Math.PI * 2);
    ctx.stroke();
    font(ctx, size * 0.3, "800");
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("0", x, y + size * 0.02);
  }
};

export function glyph(ctx, name, x, y, size, color) {
  ctx.save();
  ctx.fillStyle = color || SLDS.white;
  ctx.strokeStyle = color || SLDS.white;
  (GLYPHS[name] || GLYPHS.box)(ctx, x, y, size);
  ctx.restore();
}

/** A toast: a coloured bar with its icon, a title and an optional detail line. */
export function drawToast(ctx, w, h, color, icon, title, detail) {
  rounded(ctx, 4, 4, w - 8, h - 8, h * 0.12);
  ctx.fillStyle = color;
  ctx.fill();
  const iconSize = h * 0.5;
  ctx.beginPath();
  ctx.arc(h * 0.45, h / 2, iconSize * 0.55, 0, Math.PI * 2);
  ctx.strokeStyle = SLDS.white;
  ctx.lineWidth = h * 0.04;
  ctx.stroke();
  glyph(ctx, icon, h * 0.45, h / 2, iconSize);
  ctx.fillStyle = SLDS.white;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const left = h * 0.85;
  if (detail) {
    fitText(ctx, title, left, h * 0.36, w - left - 16, h * 0.26, "700");
    fitText(ctx, detail, left, h * 0.68, w - left - 16, h * 0.18, "400", true);
  } else {
    fitText(ctx, title, left, h / 2, w - left - 16, h * 0.28, "700");
  }
}

/** A Lightning card: white, a header with an icon tile, and lines of text. */
export function drawCard(ctx, w, h, color, icon, title, lines, mono) {
  rounded(ctx, 6, 6, w - 12, h - 12, 22);
  ctx.fillStyle = SLDS.white;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = SLDS.border;
  ctx.stroke();
  const header = h * 0.24;
  rounded(ctx, 34, 30, header * 0.8, header * 0.8, 10);
  ctx.fillStyle = color;
  ctx.fill();
  glyph(ctx, icon, 34 + header * 0.4, 30 + header * 0.4, header * 0.8);
  ctx.fillStyle = SLDS.text;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  fitText(ctx, title, 34 + header, 30 + header * 0.4, w - header - 70, header * 0.5, "700");
  ctx.fillStyle = SLDS.border;
  ctx.fillRect(30, 40 + header, w - 60, 4);
  const lineHeight = (h - header - 80) / Math.max(lines.length, 1);
  lines.forEach((line, i) => {
    const l = typeof line === "string" ? { text: line } : line;
    ctx.fillStyle = l.color || SLDS.weak;
    fitText(ctx, l.text, 44, 60 + header + lineHeight * (i + 0.5), w - 88, Math.min(lineHeight * 0.62, 48), l.weight || "400", mono || l.mono);
  });
}

/** An icon tile: a rounded square of a colour with a white glyph. */
export function drawTile(ctx, w, h, color, glyphName) {
  rounded(ctx, 2, 2, w - 4, h - 4, w * 0.17);
  ctx.fillStyle = color;
  ctx.fill();
  glyph(ctx, glyphName, w / 2, h / 2, w * 0.9);
}

/** A coin: a radial gradient, its glyph and its label. */
export function drawCoin(ctx, w, h, color, glyphName, label) {
  const gradient = ctx.createRadialGradient(w * 0.4, h * 0.35, 10, w / 2, h / 2, w / 2);
  gradient.addColorStop(0, "#FFFFFF");
  gradient.addColorStop(0.15, color);
  gradient.addColorStop(1, SLDS.navy);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  glyph(ctx, glyphName, w / 2, h * 0.42, w * 0.62);
  ctx.fillStyle = SLDS.white;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  fitText(ctx, label, w / 2, h * 0.78, w * 0.66, 30, "800");
}

/** A Path: chevrons, done ones in green with a tick, the current one in blue. */
export function drawPath(ctx, w, h, steps, current) {
  const step = w / steps.length;
  steps.forEach((name, i) => {
    const x = i * step;
    const done = i < current;
    const now = i === current;
    ctx.fillStyle = done ? SLDS.success : now ? SLDS.brand : "#E5E5E5";
    ctx.beginPath();
    ctx.moveTo(x, 8);
    ctx.lineTo(x + step - 14, 8);
    ctx.lineTo(x + step + 8, h / 2);
    ctx.lineTo(x + step - 14, h - 8);
    ctx.lineTo(x, h - 8);
    if (i > 0) {
      ctx.lineTo(x + 22, h / 2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = done || now ? SLDS.white : SLDS.weak;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fitText(ctx, (done ? "✓ " : "") + name, x + step / 2 + 4, h / 2 + 2, step - 40, 30, "700");
  });
}

/* ---------- The painter ---------- */

let logoImage = null;
let logoPromise = null;

/** Loads the white Cloudity text logo once for every world. */
export function loadLogo(url) {
  if (!logoPromise && url && typeof Image !== "undefined") {
    logoPromise = new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        logoImage = image;
        resolve(image);
      };
      image.onerror = () => resolve(null);
      image.src = url;
    });
  }
  return logoPromise || Promise.resolve(null);
}

/**
 * Canvas pictures as textures and materials, cached by name until dispose().
 * A drawing that uses the logo is drawn again once the logo has loaded.
 */
export function createPainter(THREE) {
  const cache = new Map();

  function texture(name, width, height, draw) {
    if (cache.has("t:" + name)) {
      return cache.get("t:" + name);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const result = new THREE.CanvasTexture(canvas);
    result.colorSpace = THREE.SRGBColorSpace;
    result.anisotropy = 4;
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      draw(ctx, width, height, logoImage);
      result.needsUpdate = true;
    };
    render();
    if (!logoImage && logoPromise) {
      logoPromise.then((image) => {
        if (image && cache.has("t:" + name)) {
          render();
        }
      });
    }
    cache.set("t:" + name, result);
    return result;
  }

  function material(name, width, height, draw, extra) {
    if (cache.has("m:" + name)) {
      return cache.get("m:" + name);
    }
    const result = new THREE.MeshStandardMaterial(Object.assign({ map: texture(name, width, height, draw), roughness: 0.6 }, extra));
    cache.set("m:" + name, result);
    return result;
  }

  const painter = {
    texture,
    material,

    /** A plain coloured material, shared by colour and options. */
    plain(color, extra) {
      const key = "p:" + color + JSON.stringify(extra || {});
      if (!cache.has(key)) {
        cache.set(key, new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.6 }, extra)));
      }
      return cache.get(key);
    },

    /** A geometry made once and shared, freed with the painter. */
    geometry(name, make) {
      const key = "g:" + name;
      if (!cache.has(key)) {
        cache.set(key, make());
      }
      return cache.get(key);
    },

    toast(name, color, icon, title, detail, extra) {
      return material("toast:" + name + title + (detail || ""), 512, 148, (ctx, w, h) => drawToast(ctx, w, h, color, icon, title, detail), Object.assign({ side: THREE.DoubleSide, emissive: 0x151515 }, extra));
    },

    card(name, color, icon, title, lines, mono, size) {
      const [w, h] = size || [512, 480];
      return material("card:" + name, w, h, (ctx, cw, ch) => drawCard(ctx, cw, ch, color, icon, title, lines, mono), { emissive: 0x111111 });
    },

    tile(name, color, glyphName) {
      return material("tile:" + name, 128, 128, (ctx, w, h) => drawTile(ctx, w, h, color, glyphName), { transparent: true, alphaTest: 0.5, emissive: 0x202020, roughness: 0.35 });
    },

    coin(name, color, glyphName, label) {
      return material("coin:" + name, 256, 256, (ctx, w, h) => drawCoin(ctx, w, h, color, glyphName, label), { emissive: 0x1a1a1a, metalness: 0.2, roughness: 0.35 });
    },

    path(name, steps, current) {
      return material("path:" + name + current, 1024, 128, (ctx, w, h) => drawPath(ctx, w, h, steps, current), { side: THREE.DoubleSide, emissive: 0x202020 });
    },

    /** A text label on a transparent or coloured background. */
    label(name, text, options) {
      const o = Object.assign({ bg: "transparent", fg: SLDS.white, width: 512, height: 128, size: 64, weight: "800", mono: false }, options);
      return material(
        "label:" + name + text + JSON.stringify(o),
        o.width,
        o.height,
        (ctx, w, h) => {
          if (o.bg !== "transparent") {
            rounded(ctx, 2, 2, w - 4, h - 4, Math.min(24, h / 4));
            ctx.fillStyle = o.bg;
            ctx.fill();
          }
          ctx.fillStyle = o.fg;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          fitText(ctx, text, w / 2, h / 2 + 2, w * 0.92, o.size, o.weight, o.mono);
        },
        { transparent: o.bg === "transparent", side: THREE.DoubleSide, emissive: 0x202020, depthWrite: o.bg !== "transparent" }
      );
    },

    /**
     * A sign that always faces the camera, sized to its text, so it can be
     * read from any angle: a white chip with a coloured edge and an optional
     * glyph. Keep it to a few words; the details belong in a toast.
     * options: { color, glyph, fg, bg, height (world units, default 0.7),
     * screen (true: the same size on screen at any distance, height is then
     * a fraction of the screen height) }. Returns a THREE.Sprite.
     */
    sign(name, text, options) {
      const o = Object.assign({ color: SLDS.brand, glyph: null, fg: SLDS.navy, bg: SLDS.white, height: 0.7, screen: false }, options);
      const H = 128;
      const probe = document.createElement("canvas").getContext("2d");
      font(probe, 68, "800", false);
      const textWidth = Math.min(probe.measureText(text).width, 1500);
      const W = Math.ceil(textWidth + 64 + (o.glyph ? 104 : 0));
      const key = "sign:" + name + text + JSON.stringify(o);
      let spriteMaterial = cache.get(key);
      if (!spriteMaterial) {
        const map = texture(key, W, H, (ctx, w, h) => {
          rounded(ctx, 4, 4, w - 8, h - 8, 40);
          ctx.fillStyle = o.bg;
          ctx.fill();
          ctx.lineWidth = 8;
          ctx.strokeStyle = o.color;
          ctx.stroke();
          let x = 32;
          if (o.glyph) {
            ctx.beginPath();
            ctx.arc(32 + 40, h / 2, 40, 0, Math.PI * 2);
            ctx.fillStyle = o.color;
            ctx.fill();
            glyph(ctx, o.glyph, 32 + 40, h / 2, 46, SLDS.white);
            x += 104;
          }
          ctx.fillStyle = o.fg;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          fitText(ctx, text, x, h / 2 + 3, w - x - 28, 68, "800");
        });
        spriteMaterial = new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, sizeAttenuation: !o.screen, fog: !o.screen, toneMapped: false });
        cache.set(key, spriteMaterial);
      }
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set((o.height * W) / H, o.height, 1);
      sprite.renderOrder = 2;
      return sprite;
    },

    /** The Cloudity plaque: the white text logo on navy. */
    plaque() {
      return material(
        "cloudity-plaque",
        512,
        248,
        (ctx, w, h, logo) => {
          rounded(ctx, 4, 4, w - 8, h - 8, 28);
          ctx.fillStyle = SLDS.navy;
          ctx.fill();
          ctx.lineWidth = 6;
          ctx.strokeStyle = SLDS.white;
          ctx.stroke();
          if (logo) {
            const ratio = logo.naturalWidth && logo.naturalHeight ? logo.naturalWidth / logo.naturalHeight : 3.2;
            const lh = Math.min((w * 0.78) / ratio, h * 0.7);
            ctx.drawImage(logo, (w - lh * ratio) / 2, (h - lh) / 2, lh * ratio, lh);
          } else {
            ctx.fillStyle = SLDS.white;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            fitText(ctx, "Cloudity", w / 2, h / 2, w * 0.8, 80, "800");
          }
        },
        { side: THREE.DoubleSide, emissive: 0x2a2a2a }
      );
    },

    dispose() {
      for (const thing of cache.values()) {
        if (thing && thing.dispose) {
          thing.dispose();
        }
      }
      cache.clear();
    }
  };
  return painter;
}

/** A box with a picture on its front and back faces, and a plain colour around. */
export function pictureBox(THREE, geometry, picture, side) {
  return new THREE.Mesh(geometry, [side, side, side, side, picture, picture]);
}
