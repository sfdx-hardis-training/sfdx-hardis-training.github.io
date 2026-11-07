/*
 * The Devs who play the bosses of worlds 4 and 6: a young Dev in a hoodie,
 * "Dev" on his chest, his laptop in his hands, and one of the twenty-one faces
 * (core/faces.js) on a disc that always looks at the camera. With him come
 * his health bar under the top bar, and his speech bubble, which keeps every
 * line for its reading time on the game clock.
 */
import { SLDS } from "./painter.js";
import { readingMs } from "../hud.js";

/** Where his head is, in his own units (the figure is about 4.5 tall at scale 1). */
export const DEV_HEAD_Y = 3.05;
export const DEV_HEAD_R = 0.74;

/**
 * The figure. o: { faceUrl, name (the word on his chest), screen (what his
 * laptop shows), onFace() when the portrait is drawn }. place() puts it where
 * the world wants it, each frame.
 */
export function createDevFigure(ctx, o) {
  const { THREE, root, paint, engine, camera } = ctx;
  const owned = [];
  let disposed = false;
  const group = new THREE.Group();
  group.visible = false;
  root.add(group);
  const hoodie = paint.plain(0x3b4a9e, { roughness: 0.7 });
  const jeans = paint.plain(0x22325a, { roughness: 0.7 });
  const skin = paint.plain(0xe0ac8a, { roughness: 0.7 });
  const limb = paint.geometry("dev-limb", () => new THREE.CapsuleGeometry(0.15, 0.7, 4, 10).translate(0, -0.45, 0));
  const add = (geometry, material, parent, x, y, z) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = engine.settings.shadows;
    parent.add(mesh);
    return mesh;
  };
  const joint = (x, y) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    group.add(pivot);
    return pivot;
  };
  const legs = [-0.25, 0.25].map((x) => {
    const hip = joint(x, 1.02);
    add(limb, jeans, hip, 0, 0, 0);
    return hip;
  });
  add(paint.geometry("dev-torso", () => new THREE.CapsuleGeometry(0.5, 0.6, 6, 14)), hoodie, group, 0, 1.78, 0).scale.set(1.25, 1, 0.9);
  const arms = [-1, 1].map((side) => {
    const shoulder = joint(side * 0.7, 2.28);
    add(limb, hoodie, shoulder, 0, 0, 0);
    add(paint.geometry("dev-hand", () => new THREE.SphereGeometry(0.17, 12, 10)), skin, shoulder, 0, -0.95, 0);
    return shoulder;
  });
  // His laptop, open, held in front of him
  const laptop = new THREE.Group();
  laptop.position.set(0, 1.42, 0.78);
  group.add(laptop);
  add(paint.geometry("dev-keys", () => new THREE.BoxGeometry(1.1, 0.06, 0.7)), paint.plain(0x9aa1ab, { roughness: 0.5 }), laptop, 0, 0, 0);
  const screen = add(paint.geometry("dev-screen", () => new THREE.PlaneGeometry(1.1, 0.7)), paint.label("dev-screen", o.screen, { bg: SLDS.navy, fg: "#FE9339", width: 256, height: 160, size: 64, mono: true }), laptop, 0, 0.36, 0.36);
  screen.rotation.x = 0.25;
  const sign = paint.sign("dev-name", o.name, { color: "#DD7A01", glyph: "code", height: 0.42 });
  sign.position.set(0, 2.12, 0.55);
  group.add(sign);

  // The face: a plain one until the portrait has loaded
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const c = canvas.getContext("2d");
  c.fillStyle = "#ffffff";
  c.beginPath();
  c.arc(128, 128, 126, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#f2c9a0";
  c.beginPath();
  c.arc(128, 128, 112, 0, Math.PI * 2);
  c.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const faceMaterial = new THREE.MeshBasicMaterial({ map: texture, alphaTest: 0.5, toneMapped: false, fog: false });
  owned.push(texture, faceMaterial);
  const portrait = new Image();
  portrait.decoding = "async";
  portrait.onload = () => {
    if (disposed) {
      return;
    }
    c.save();
    c.beginPath();
    c.arc(128, 128, 116, 0, Math.PI * 2);
    c.clip();
    c.drawImage(portrait, 12, 12, 232, 232);
    c.restore();
    texture.needsUpdate = true;
    if (o.onFace) {
      o.onFace();
    }
  };
  // A portrait that does not load keeps the plain face: the fight never waits for it
  portrait.onerror = () => {};
  portrait.src = o.faceUrl;
  const face = new THREE.Mesh(paint.geometry("dev-face", () => new THREE.CircleGeometry(DEV_HEAD_R, 40)), faceMaterial);
  face.visible = false;
  face.renderOrder = 1;
  root.add(face);

  return {
    group,
    face,
    get visible() {
      return group.visible;
    },
    set visible(on) {
      group.visible = on;
      face.visible = on;
    },
    /**
     * p: { x, y, z, scale, lean (bowing towards the camera), stride (-1 to 1
     * while he walks), typing (how hard his hands go) }.
     */
    place(p) {
      const lean = p.lean || 0;
      group.position.set(p.x, p.y || 0, p.z);
      group.scale.setScalar(p.scale);
      group.rotation.x = lean;
      const stride = p.stride || 0;
      legs[0].rotation.x = stride * 0.5;
      legs[1].rotation.x = -stride * 0.5;
      const typing = p.typing || 0;
      arms[0].rotation.x = -0.95 + typing;
      arms[1].rotation.x = -0.95 - typing;
      face.position.set(p.x, (p.y || 0) + DEV_HEAD_Y * p.scale * Math.cos(lean), p.z + 0.2 + DEV_HEAD_Y * p.scale * Math.sin(lean));
      face.quaternion.copy(camera.quaternion);
      face.scale.setScalar(p.scale);
    },
    /** Where a thrown thing leaves his hands. */
    hand(out) {
      return arms[1].children[1].getWorldPosition(out);
    },
    dispose() {
      disposed = true;
      for (const thing of owned) {
        thing.dispose();
      }
    }
  };
}

/** His health bar, under the top bar: his face, "Dev", the bar, and a count of the world's own. */
export function createDevBar(hud, faceUrl, name) {
  const node = document.createElement("div");
  node.className = "gr-dev-bar";
  node.hidden = true;
  const picture = document.createElement("img");
  picture.alt = "";
  picture.decoding = "async";
  picture.addEventListener("error", () => picture.remove());
  picture.src = faceUrl;
  const label = document.createElement("strong");
  label.textContent = name;
  const track = document.createElement("i");
  const fill = document.createElement("b");
  track.appendChild(fill);
  const count = document.createElement("em");
  node.append(picture, label, track, count);
  hud.extra.appendChild(node);
  return {
    node,
    set hidden(on) {
      node.hidden = on;
    },
    /** share: his health from 0 to 1; text: the count beside it, in red when alarm. */
    render(share, text, alarm) {
      fill.style.width = Math.max(0, share * 100) + "%";
      count.textContent = text || "";
      count.classList.toggle("is-in", Boolean(alarm));
    },
    remove() {
      node.remove();
    }
  };
}

/**
 * His speech bubble, beside his head. now() is the game clock in seconds. A
 * line stays at least its reading time; a reaction (a quip at a hit) never
 * cuts a line being read, and any other line waits for it (the newest only).
 */
export function createDevSpeech(hud, now) {
  const node = document.createElement("div");
  node.className = "gr-dev-say";
  node.hidden = true;
  hud.layer.appendChild(node);
  const box = { w: 0, h: 0, key: "", cap: 0 };
  const line = { until: 0, read: 0, pending: null };
  let point = null;

  function show(text, reaction, onShow) {
    line.pending = null;
    const read = readingMs(text) / 1000;
    node.textContent = text;
    node.style.maxWidth = "";
    node.hidden = false;
    box.w = 0;
    box.cap = 0;
    line.until = now() + read + 0.3;
    line.read = now() + (reaction ? 0.6 * read : read);
    if (onShow) {
      onShow(read);
    }
  }

  return {
    node,
    /** Says text, now or once the line being read is read. onShow(readSeconds) runs when it shows. */
    say(text, reaction, onShow) {
      if (now() < line.read) {
        if (!reaction) {
          line.pending = { text, onShow };
        }
        return;
      }
      show(text, reaction, onShow);
    },
    /** True while a line is being read, or one waits for its turn. */
    get reading() {
      return now() < line.read || Boolean(line.pending);
    },
    /** Shows a waiting line once the one before it is read; call it each step. */
    update() {
      if (line.pending && now() >= line.read) {
        show(line.pending.text, false, line.pending.onShow);
      }
    },
    hide() {
      node.hidden = true;
      line.pending = null;
      line.read = 0;
    },
    /**
     * Puts the bubble beside head (a Vector3, his face's centre) of radius r,
     * on the screen side with room; with above, over his head when the sky has room.
     */
    place(camera, head, r, above) {
      if (node.hidden) {
        return;
      }
      if (now() > line.until) {
        node.hidden = true;
        return;
      }
      const w = hud.layer.clientWidth;
      const h = hud.layer.clientHeight;
      if (!box.w) {
        box.w = node.offsetWidth;
        box.h = node.offsetHeight;
      }
      point = point || head.clone();
      point.copy(head).project(camera);
      const cx = ((point.x + 1) / 2) * w;
      const cy = ((1 - point.y) / 2) * h;
      point.set(head.x + r, head.y, head.z).project(camera);
      const reach = Math.abs(((point.x + 1) / 2) * w - cx) + 12;
      const roomRight = w - 8 - (cx + reach);
      const roomLeft = cx - reach - 8;
      const onLeft = box.w > roomRight && roomLeft > roomRight;
      // On a narrow screen the bubble gets narrower rather than cover his face
      const room = Math.floor(Math.max(110, onLeft ? roomLeft : roomRight));
      if (room < box.w - 4 || (box.cap && room > box.cap + 12)) {
        box.cap = room;
        node.style.maxWidth = room + "px";
        box.w = node.offsetWidth;
        box.h = node.offsetHeight;
      }
      const x = Math.round(Math.max(8, Math.min(w - 8 - box.w, onLeft ? cx - reach - box.w : cx + reach)));
      const overlay = hud.layer.parentElement;
      const top = (overlay && parseFloat(overlay.style.getPropertyValue("--gr-top-end"))) || 0;
      // Over his head it may take the margin round his face, never the face
      const over = above && cy - reach - box.h + 6 >= top + 8;
      const y = Math.round(over ? Math.max(top + 8, cy - reach - box.h - 6) : Math.max(top + 8, Math.min(h - box.h - 8, cy - box.h / 2)));
      const left = over ? Math.round(Math.max(8, Math.min(w - 8 - box.w, cx - box.w / 2))) : x;
      const key = left + "," + y + "," + onLeft + over;
      if (key !== box.key) {
        box.key = key;
        node.classList.toggle("is-left", onLeft && !over);
        node.classList.toggle("is-over", over);
        node.style.transform = "translate(" + left + "px, " + y + "px)";
      }
    },
    remove() {
      node.remove();
    }
  };
}

/** The styles of the bar and the bubble, added to a world's own CSS. */
export const DEV_CSS = `
.guinea-run .gr-dev-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 260px;
  max-width: 520px;
  padding: 3px 12px 3px 3px;
  border: 2px solid #ffffff;
  border-radius: 999px;
  background: rgba(3, 45, 96, 0.92);
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.3);
  color: #ffffff;
  font-size: 14px;
  pointer-events: none;
}
.guinea-run .gr-dev-bar[hidden] {
  display: none;
}
.guinea-run .gr-dev-bar img {
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #ffffff;
}
.guinea-run .gr-dev-bar strong {
  white-space: nowrap;
}
.guinea-run .gr-dev-bar i {
  flex: 1 1 auto;
  display: block;
  min-width: 70px;
  height: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
}
.guinea-run .gr-dev-bar b {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #fe9339, #dd7a01);
  transition: width 0.15s;
}
.guinea-run .gr-dev-bar em {
  flex: 0 0 auto;
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12px;
  font-style: normal;
  font-weight: 700;
  white-space: pre;
}
.guinea-run .gr-dev-bar em:empty {
  display: none;
}
.guinea-run .gr-dev-bar em.is-in {
  color: #ffb3a8;
}
.guinea-run .gr-layer > .gr-dev-say {
  position: absolute;
  left: 0;
  top: 0;
  width: max-content;
  max-width: 230px;
  padding: 6px 12px;
  border: 2px solid #032d60;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 3px 0 rgba(3, 45, 96, 0.35);
  color: #032d60;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.25;
  pointer-events: none;
}
.guinea-run .gr-layer > .gr-dev-say[hidden] {
  display: none;
}
@media (max-width: 600px) {
  .guinea-run .gr-dev-bar {
    min-width: 0;
    width: calc(100vw - 32px);
    font-size: 13px;
  }
  .guinea-run .gr-layer > .gr-dev-say {
    max-width: 170px;
    padding: 5px 9px;
    font-size: 13px;
  }
}
`;
