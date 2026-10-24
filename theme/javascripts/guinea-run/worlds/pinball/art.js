/*
 * The printed art of Pipeline Pinball, painted on canvases: the playfield
 * (nebulas and stars over the Salesforce blue, the zones of the branches, the
 * pipeline road, a dark bezel and a muted print under every insert, so a lit
 * insert glows through its own print), the Production floor, the apron with
 * its rule cards, the flags of the ramps and the caps of the bumpers.
 *
 * The insert shapes live here too (shapePoints), so the painted bezel and the
 * lit insert of view.js are the same shape.
 */
import { TABLE } from "./layout.js";
import { rounded, fitText, glyph } from "../../core/painter.js";

/** The outline of an insert shape, in unit coordinates (y up), or null for a circle. */
export function shapePoints(shape) {
  switch (shape) {
    case "delta":
      // The arrowhead of the arcade tables, notched at its base
      return [0, 1, 0.86, -0.62, 0, -0.2, -0.86, -0.62];
    case "hex": {
      const out = [];
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 2 + (i * Math.PI) / 3;
        out.push(Math.cos(a), Math.sin(a));
      }
      return out;
    }
    case "star": {
      const out = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 1 : 0.45;
        const a = Math.PI / 2 + (i * Math.PI) / 5;
        out.push(Math.cos(a) * r, Math.sin(a) * r);
      }
      return out;
    }
    case "chevron":
      return [0, 0.9, 1, -0.2, 0.62, -0.55, 0, 0.12, -0.62, -0.55, -1, -0.2];
    default:
      return null;
  }
}

function seeded(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function texture(THREE, canvas, tier) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = tier > 1 ? 8 : 2;
  return tex;
}

function hex(color, k) {
  const r = Math.round(((color >> 16) & 255) * k);
  const g = Math.round(((color >> 8) & 255) * k);
  const b = Math.round((color & 255) * k);
  return "rgb(" + r + "," + g + "," + b + ")";
}

/** Space art: a deep gradient, soft nebulas, a field of stars. */
function space(c, w, h, colors, seed) {
  const g = c.createLinearGradient(0, h, 0, 0);
  g.addColorStop(0, colors[0]);
  g.addColorStop(0.5, colors[1]);
  g.addColorStop(1, colors[2]);
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  const rnd = seeded(seed);
  for (const tint of ["144,80,233", "254,147,57", "6,165,154", "27,150,255", "234,0,30", "144,80,233"]) {
    for (let k = 0; k < 2; k++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const r = (0.18 + rnd() * 0.3) * w;
      const n = c.createRadialGradient(x, y, 0, x, y, r);
      n.addColorStop(0, "rgba(" + tint + ",0.32)");
      n.addColorStop(1, "rgba(" + tint + ",0)");
      c.fillStyle = n;
      c.fillRect(0, 0, w, h);
    }
  }
  for (let i = 0; i < (w * h) / 2600; i++) {
    c.fillStyle = "rgba(255,255,255," + (0.25 + rnd() * 0.7) + ")";
    const s = rnd() < 0.08 ? 2.4 : 1.2;
    c.fillRect(rnd() * w, rnd() * h, s, s);
  }
}

/** A shape path at a point: insert shapes, or a circle. */
function insertPath(c, shape, x, y, r, angle) {
  const pts = shapePoints(shape === "bulb" ? "round" : shape);
  c.beginPath();
  if (!pts) {
    c.arc(x, y, r, 0, Math.PI * 2);
    return;
  }
  const cos = Math.cos(-angle || 0);
  const sin = Math.sin(-angle || 0);
  for (let i = 0; i < pts.length; i += 2) {
    const px = pts[i] * cos - pts[i + 1] * sin;
    const py = pts[i] * sin + pts[i + 1] * cos;
    const X = x + px * r;
    const Y = y - py * r;
    if (i === 0) {
      c.moveTo(X, Y);
    } else {
      c.lineTo(X, Y);
    }
  }
  c.closePath();
}

/** The playfield, printed. lights: the inserts of layout.js, painted with their bezels and labels. */
export function paintField(THREE, t, lights, tier) {
  const width = TABLE.right - TABLE.left + 0.4;
  const y0 = -1.6;
  const length = TABLE.top + 0.3 - y0;
  const scale = tier > 0 ? 96 : 64;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(length * scale);
  const c = canvas.getContext("2d");
  const X = (x) => (x - (TABLE.left - 0.2)) * scale;
  const Y = (y) => canvas.height - (y - y0) * scale;
  const U = (u) => u * scale;
  space(c, canvas.width, canvas.height, ["#04102a", "#0a2c6e", "#2a1160"], 11);

  // The zones of the branches, round their ramps
  // An open zone (the integration and uat ramps) is a glow with no frame round its mouth
  const zone = (x0, y0z, x1, y1, color, label, open) => {
    rounded(c, X(x0), Y(y1), U(x1 - x0), U(y1 - y0z), U(open ? 0 : 0.45));
    const g = c.createLinearGradient(0, Y(y1), 0, Y(y0z));
    g.addColorStop(0, color.replace("A", "0.45"));
    g.addColorStop(1, color.replace("A", open ? "0" : "0.08"));
    c.fillStyle = g;
    c.fill();
    if (!open) {
      c.lineWidth = U(0.05);
      c.strokeStyle = color.replace("A", "0.7");
      c.stroke();
    }
    if (label) {
      c.save();
      c.fillStyle = "rgba(255,255,255,0.9)";
      c.textAlign = "center";
      c.textBaseline = "middle";
      fitText(c, label, X((x0 + x1) / 2), Y(y0z + 0.45), U(x1 - x0 - 0.2), U(0.32), "900");
      c.restore();
    }
  };
  zone(-3.6, 10.65, -2.4, 15.9, "rgba(27,150,255,A)", "", true);
  zone(2.4, 10.65, 3.6, 15.9, "rgba(6,165,154,A)", "", true);
  zone(-0.85, 13.0, 0.85, 16.5, "rgba(69,198,90,A)", "");

  // The pipeline road up the middle, from the flippers to production
  c.save();
  c.strokeStyle = "rgba(255,255,255,0.13)";
  c.lineWidth = U(1.1);
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(X(0), Y(3.0));
  c.lineTo(X(0), Y(13.1));
  c.stroke();
  c.setLineDash([U(0.3), U(0.3)]);
  c.strokeStyle = "rgba(255,210,122,0.45)";
  c.lineWidth = U(0.06);
  c.beginPath();
  c.moveTo(X(0), Y(6.4));
  c.lineTo(X(0), Y(12.9));
  c.stroke();
  c.restore();
  // The branches leave the road for the ramps
  c.strokeStyle = "rgba(255,255,255,0.12)";
  c.lineWidth = U(0.35);
  for (const side of [-1, 1]) {
    c.beginPath();
    c.moveTo(X(0), Y(7.0));
    c.bezierCurveTo(X(side * 1.2), Y(7.6), X(side * 2.6), Y(8.6), X(side * 3.0), Y(10.7));
    c.stroke();
  }
  // Constellations between the stars of the circuit
  const rnd = seeded(5);
  c.strokeStyle = "rgba(160,200,255,0.18)";
  c.lineWidth = U(0.02);
  for (let k = 0; k < 7; k++) {
    let px = -4 + rnd() * 9;
    let py = 2 + rnd() * 17;
    c.beginPath();
    c.moveTo(X(px), Y(py));
    for (let j = 0; j < 4; j++) {
      px += (rnd() - 0.5) * 2.2;
      py += (rnd() - 0.5) * 2.2;
      c.lineTo(X(px), Y(py));
      c.fillStyle = "rgba(200,230,255,0.6)";
      c.fillRect(X(px) - 2, Y(py) - 2, 4, 4);
    }
    c.stroke();
  }

  // The lower playfield: dark panels behind the slingshots and the inlanes
  c.fillStyle = "rgba(3,10,30,0.55)";
  for (const side of [-1, 1]) {
    c.beginPath();
    c.moveTo(X(side * 5), Y(-1.6));
    c.lineTo(X(side * 5), Y(7.1));
    c.lineTo(X(side * 4.0), Y(6.5));
    c.lineTo(X(side * 2.3), Y(2.4));
    c.lineTo(X(side * 0.6), Y(-1.6));
    c.closePath();
    c.fill();
  }
  // Outlane and inlane arrows
  c.fillStyle = "rgba(255,255,255,0.35)";
  for (const [x, y] of [
    [-3.55, 5.3],
    [3.55, 5.3],
    [-4.5, 5.3],
    [4.5, 5.3]
  ]) {
    insertPath(c, "chevron", X(x), Y(y), U(0.22), Math.PI);
    c.fill();
  }

  // Every insert: a dark bezel, a muted print, its label
  c.textAlign = "center";
  c.textBaseline = "middle";
  for (const l of lights) {
    if (l.floor !== 0 || l.shape === "bulb") {
      continue;
    }
    const x = X(l.x);
    const y = Y(l.y);
    const r = U(l.size);
    insertPath(c, l.shape, x, y, r * 1.28, l.angle);
    c.fillStyle = "#040914";
    c.fill();
    c.lineWidth = U(0.03);
    c.strokeStyle = "rgba(255,255,255,0.45)";
    c.stroke();
    insertPath(c, l.shape, x, y, r, l.angle);
    const g = c.createRadialGradient(x, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, hex(l.color, 0.55));
    g.addColorStop(1, hex(l.color, 0.22));
    c.fillStyle = g;
    c.fill();
    if (l.label) {
      const text = t(l.label);
      c.fillStyle = "#ffffff";
      if (l.shape === "hex" || l.labelAt === "inside") {
        const words = text.split(" ");
        const lines = words.length > 1 && text.length > 9 ? [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")] : [text];
        lines.forEach((part, i) => fitText(c, part.toUpperCase(), x, y + (i - (lines.length - 1) / 2) * U(0.17), r * 1.5, U(0.16), "900"));
      } else {
        fitText(c, text.toUpperCase(), x, y + (l.labelAt === "above" ? -r * 1.9 : r * 1.75), U(1.9), U(0.15), "900");
      }
    }
  }

  // The words of the playfield
  const label = (text, x, y, size, colorName, angle) => {
    c.save();
    c.translate(X(x), Y(y));
    c.rotate(angle || 0);
    c.fillStyle = colorName;
    c.shadowColor = "rgba(0,0,0,0.8)";
    c.shadowBlur = U(0.06);
    fitText(c, text, 0, 0, U(2.6), U(size), "900");
    c.restore();
  };
  label(t("pbFieldPreprod").toUpperCase(), -4.42, 15.6, 0.22, "#d8b8ff", -Math.PI / 2);
  label(t("pbFieldProduction").toUpperCase(), 0, 14.6, 0.26, "#a8f0b5");
  label(t("pbFieldPullRequest").toUpperCase(), -1.55, 14.85, 0.17, "#ffd0a8");
  label(t("pbFieldBackups").toUpperCase(), -3.95, 10.9, 0.15, "#8ff0e4", -Math.PI / 2);
  label(t("pbFieldCodeQuality").toUpperCase(), 3.95, 10.9, 0.15, "#ffd0a8", Math.PI / 2);
  label(t("pbFieldRecentChanges").toUpperCase(), -4.0, 8.6, 0.15, "#9fd4ff", -1.05);
  label(t("pbFieldChecks").toUpperCase(), 4.0, 8.6, 0.15, "#a8f0b5", 1.05);
  label(t("pbFieldDeploy").toUpperCase(), -1.95, 10.2, 0.14, "#ffd0a8");
  // The plunger lane
  c.fillStyle = "rgba(0,0,0,0.45)";
  c.fillRect(X(5.0), Y(14), X(6.1) - X(5.0), Y(-1.6) - Y(14));
  return texture(THREE, canvas, tier);
}

/** The Production floor, printed: the org in green, its stars. */
export function paintUpper(THREE, t, lights, tier) {
  const scale = tier > 0 ? 96 : 64;
  const w = TABLE.upperRight - TABLE.upperLeft + 0.6;
  const l = TABLE.upperTop - TABLE.upperBottom;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(l * scale);
  const c = canvas.getContext("2d");
  space(c, canvas.width, canvas.height, ["#062a18", "#0b5a2c", "#1f6e8c"], 23);
  c.textAlign = "center";
  c.textBaseline = "middle";
  glyph(c, "cloud", canvas.width / 2, canvas.height * 0.42, scale * 1.4, "rgba(255,255,255,0.18)");
  c.fillStyle = "rgba(255,255,255,0.9)";
  fitText(c, t("pbFieldProductionOrg").toUpperCase(), canvas.width / 2, canvas.height * 0.66, canvas.width * 0.8, scale * 0.4, "900");
  c.fillStyle = "rgba(255,255,255,0.7)";
  fitText(c, t("pbFieldRelease").toUpperCase(), canvas.width * 0.16, canvas.height * 0.2, canvas.width * 0.3, scale * 0.22, "900");
  const X = (x) => (x - (TABLE.upperLeft - 0.3)) * scale;
  const Y = (y) => canvas.height - (y - TABLE.upperBottom) * scale;
  for (const light of lights) {
    if (light.floor !== 1) {
      continue;
    }
    insertPath(c, light.shape, X(light.x), Y(light.y), light.size * scale * 1.28, light.angle);
    c.fillStyle = "#040914";
    c.fill();
    insertPath(c, light.shape, X(light.x), Y(light.y), light.size * scale, light.angle);
    c.fillStyle = hex(light.color, 0.3);
    c.fill();
  }
  return texture(THREE, canvas, tier);
}

/** The apron: the two rule cards, the name of the table in the middle. */
export function paintApron(THREE, t) {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 384;
  const c = canvas.getContext("2d");
  const g = c.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, "#1a2a44");
  g.addColorStop(1, "#0a1220");
  c.fillStyle = g;
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.textAlign = "center";
  c.textBaseline = "middle";
  const card = (x, text) => {
    rounded(c, x, 70, 620, 250, 22);
    c.fillStyle = "#ffd25a";
    c.fill();
    c.fillStyle = "#032d60";
    const words = text.split(" ");
    const lines = [];
    let current = "";
    c.font = "800 40px 'Open Sans', Arial, sans-serif";
    for (const word of words) {
      const next = current ? current + " " + word : word;
      if (c.measureText(next).width > 560 && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    }
    lines.push(current);
    lines.slice(0, 4).forEach((part, i) => c.fillText(part, x + 310, 195 + (i - (Math.min(lines.length, 4) - 1) / 2) * 50));
  };
  card(60, t("pbApronPromote"));
  card(canvas.width - 680, t("pbApronMissions"));
  c.fillStyle = "#ffffff";
  fitText(c, t("pbTitle").toUpperCase(), canvas.width / 2, 150, 560, 78, "900");
  c.fillStyle = "#9fd4ff";
  fitText(c, "Cloudity · sfdx-hardis", canvas.width / 2, 250, 520, 46, "800");
  return texture(THREE, canvas, 2);
}

/** A flag over the mouth of a ramp: its colour, its name, read from the flippers. */
export function paintSign(THREE, text, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 320;
  const c = canvas.getContext("2d");
  rounded(c, 6, 6, 244, 308, 26);
  const g = c.createLinearGradient(0, 0, 0, 320);
  g.addColorStop(0, hex(color, 1));
  g.addColorStop(1, hex(color, 0.35));
  c.fillStyle = g;
  c.fill();
  c.lineWidth = 8;
  c.strokeStyle = "#e8eef5";
  c.stroke();
  // A burst of light behind the name
  const b = c.createRadialGradient(128, 120, 4, 128, 120, 120);
  b.addColorStop(0, "rgba(255,255,255,0.85)");
  b.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = b;
  c.fillRect(0, 0, 256, 320);
  c.fillStyle = "#ffffff";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.shadowColor = "rgba(0,0,0,0.7)";
  c.shadowBlur = 8;
  fitText(c, text.toUpperCase(), 128, 250, 220, 48, "900");
  glyph(c, "branch", 128, 118, 90, "#ffffff");
  return texture(THREE, canvas, 2);
}

/** The monster Flow disc: a tangle of Flow arrows, or, once refactored, the Apex mark. */
export function paintFlow(THREE, apex) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const c = canvas.getContext("2d");
  const g = c.createRadialGradient(128, 128, 10, 128, 128, 128);
  g.addColorStop(0, apex ? "#5ab0ff" : "#ffb347");
  g.addColorStop(1, apex ? "#0176d3" : "#c2410c");
  c.fillStyle = g;
  c.beginPath();
  c.arc(128, 128, 126, 0, Math.PI * 2);
  c.fill();
  if (apex) {
    glyph(c, "apex", 128, 128, 120, "#ffffff");
  } else {
    // A spiral of Flow elements, the monster an admin built
    c.strokeStyle = "rgba(255,255,255,0.85)";
    c.lineWidth = 7;
    c.beginPath();
    for (let a = 0; a < Math.PI * 6; a += 0.1) {
      const r = 10 + a * 6;
      const x = 128 + Math.cos(a) * r;
      const y = 128 + Math.sin(a) * r;
      if (a === 0) {
        c.moveTo(x, y);
      } else {
        c.lineTo(x, y);
      }
    }
    c.stroke();
    glyph(c, "flow", 128, 128, 70, "#ffffff");
  }
  return texture(THREE, canvas, 1);
}

/** The screen of the sf hardis terminal: a prompt waiting. */
export function paintTerminal(THREE) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 160;
  const c = canvas.getContext("2d");
  rounded(c, 4, 4, 248, 152, 18);
  c.fillStyle = "#0b1220";
  c.fill();
  c.lineWidth = 6;
  c.strokeStyle = "#9aa7b5";
  c.stroke();
  c.fillStyle = "#45c65a";
  c.font = "700 34px 'Courier New', monospace";
  c.textBaseline = "middle";
  c.fillText("$ sf hardis", 22, 62);
  c.fillText(">_", 22, 112);
  return texture(THREE, canvas, 1);
}

/** The cap of a pop bumper: the Apex trigger mark on a bright dome. */
export function paintBumperCap(THREE, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const c = canvas.getContext("2d");
  const g = c.createRadialGradient(110, 100, 10, 128, 128, 128);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.35, hex(color, 1));
  g.addColorStop(1, hex(color, 0.5));
  c.fillStyle = g;
  c.fillRect(0, 0, 256, 256);
  glyph(c, "apex", 128, 128, 120, "#ffffff");
  return texture(THREE, canvas, 1);
}
