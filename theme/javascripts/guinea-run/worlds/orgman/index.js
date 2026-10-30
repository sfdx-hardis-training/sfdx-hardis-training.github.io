/*
 * Org-Man, the second bonus of Guinea Run: it opens with Pipeline Pinball,
 * once the ten worlds are done. Four admins roam the org, each with a habit
 * the pipeline does not like; the guinea pig eats the metadata of the maze,
 * and a deployment rocket turns the tables for a few seconds. The mazes come
 * round faster and faster: the score is the game.
 *
 * This module puts the pieces together: maze.js (the grids), rules.js (the
 * numbers), ghosts.js (the admins' habits), sim.js (the game), view.js (the
 * look), autoplay.js (the player of the check). It is not a world of WORLDS:
 * the shell opens it from its own card (KIND = "bonus") and sends its result
 * to the Hall of Fame on its own board. No saved game: a run is minutes long.
 */
import { createSim } from "./sim.js";
import { createView } from "./view.js";
import { createAutoplay } from "./autoplay.js";
import { salesManagerIn } from "./rules.js";
import { mazeForLevel } from "./maze.js";
import { pickAdmins, adminFaceUrl } from "../../core/faces.js";
import { readingMs } from "../../hud.js";

export const KIND = "bonus";
export const PADS = ["left", "duck", "jump", "right"];
// The maze turns while the finger moves (core/input.js)
export const SWIPE = "move";
export const MODELS = ["vegetables"];
export const PHONE_MESSAGES = "top";
export const QUOTES = [];

const STEP = 1 / 120;
const RULES = 8;
const PIG_SCALE = 0.8;
// The card between two mazes stays at least this long, so the cheer is seen
const CARD_MIN_MS = 2600;

export const TEXTS = {
  en: {
    intro:
      "Production is calm. Too calm. Four admins roam the org, each with a habit the pipeline does not like. Eat every piece of metadata in the maze, and when a deployment rocket is in reach, take it: for a few seconds everything goes through the pipeline, and the admins run.",
    how1: "Arrows, WASD or ZQSD steer the guinea pig, a swipe on a phone. A turn asked early waits for the next crossing",
    how2: "Eat all the metadata to clear the maze. A rocket turns the admins blue: catch them for 200, 400, 800, then 1,600",
    how3: "Three lives, one more at 10,000 points, then every 100,000. Every fourth maze, the Sales Manager comes too",
    note: "An admin in a hurry is not a villain. A change nobody can review is. - V.",
    omTitle: "Org-Man",
    omMaze_objects: "Object Manager",
    omMaze_flows: "Flow Builder",
    omMaze_permissions: "Permission Sets",
    omMaze_deployments: "Deployment Status",
    omGoal: "Maze {{n}} · {{maze}}",
    omAdmin0: "Hotfix in prod",
    omAdmin1: "Click in Setup",
    omAdmin2: "Sandbox refresh",
    omAdmin3: "Profile tweak",
    omAdmin4: "The Sales Manager",
    omReady: "Ready?",
    omGo: "Go!",
    omLives: "{{hearts}} · maze {{n}}",
    omCaughtBy: "Caught by {{who}}",
    omCaught: "{{who}}: +{{points}}",
    omExtraLife: "Extra life!",
    omVegetable: "Vegetable: +{{points}}",
    omCleared: "Maze {{n}} cleared",
    omSweep: "Every admin, at every rocket: +{{points}}",
    omClean: "No life lost: +{{points}}",
    omNext: "Next: {{maze}}",
    omSalesManagerNext: "The Sales Manager comes to this one. He is faster, and worth 5,000 when blue.",
    omSkip: "Any key or a tap goes on",
    omToBeat: "To beat: {{points}}",
    omBest: "Your best: {{points}}",
    omTop5: "Top 5 of Org-Man!",
    omRule1: "A change in production goes through a Pull Request, not through Setup.",
    omRule2: "A hotfix starts on a branch from main, and comes back down with a retrofit.",
    omRule3: "A sandbox refresh wipes what was never in git: commit first.",
    omRule4: "Access changes by Permission Sets, retrieved and reviewed, never by hand in production.",
    omRule5: "Deploy from git, and the next deployment does not undo yours.",
    omRule6: "What the monitoring finds in production goes back to git through a Pull Request.",
    omRule7: "A deployment check that is green before the merge is a release without surprises.",
    omRule8: "The admins are not the enemy. The clicks nobody can review are."
  },
  fr: {
    intro:
      "La production est calme. Trop calme. Quatre admins rôdent dans l'org, chacun avec une habitude que le pipeline n'aime pas. Mangez toutes les métadonnées du labyrinthe, et quand une fusée de déploiement est à portée, prenez-la : pendant quelques secondes tout passe par le pipeline, et les admins fuient.",
    how1: "Les flèches, WASD ou ZQSD dirigent le cochon d'Inde, un glissement du doigt sur un téléphone. Un virage demandé en avance attend le prochain croisement",
    how2: "Mangez toutes les métadonnées pour finir le labyrinthe. Une fusée rend les admins bleus : attrapez-les pour 200, 400, 800, puis 1 600",
    how3: "Trois vies, une de plus à 10 000 points, puis tous les 100 000. Tous les quatre labyrinthes, le Sales Manager vient aussi",
    note: "Un admin pressé n'est pas un méchant. Un changement que personne ne peut relire, si. - V.",
    omTitle: "Org-Man",
    omMaze_objects: "Object Manager",
    omMaze_flows: "Flow Builder",
    omMaze_permissions: "Permission Sets",
    omMaze_deployments: "Deployment Status",
    omGoal: "Labyrinthe {{n}} · {{maze}}",
    omAdmin0: "Hotfix en prod",
    omAdmin1: "Clic dans Setup",
    omAdmin2: "Refresh de sandbox",
    omAdmin3: "Retouche de profil",
    omAdmin4: "Le Sales Manager",
    omReady: "Prêt ?",
    omGo: "C'est parti !",
    omLives: "{{hearts}} · labyrinthe {{n}}",
    omCaughtBy: "Attrapé par {{who}}",
    omCaught: "{{who}} : +{{points}}",
    omExtraLife: "Une vie de plus !",
    omVegetable: "Légume : +{{points}}",
    omCleared: "Labyrinthe {{n}} terminé",
    omSweep: "Tous les admins, à chaque fusée : +{{points}}",
    omClean: "Aucune vie perdue : +{{points}}",
    omNext: "Ensuite : {{maze}}",
    omSalesManagerNext: "Le Sales Manager vient dans celui-ci. Il est plus rapide, et vaut 5 000 quand il est bleu.",
    omSkip: "Une touche ou un appui pour continuer",
    omToBeat: "À battre : {{points}}",
    omBest: "Votre record : {{points}}",
    omTop5: "Top 5 d'Org-Man !",
    omRule1: "Un changement en production passe par une Pull Request, pas par Setup.",
    omRule2: "Un hotfix part d'une branche de main, et redescend par un retrofit.",
    omRule3: "Un refresh de sandbox efface ce qui n'a jamais été dans git : commitez d'abord.",
    omRule4: "Les accès changent par des Permission Sets, récupérés et relus, jamais à la main en production.",
    omRule5: "Déployez depuis git, et le déploiement suivant ne défait pas le vôtre.",
    omRule6: "Ce que le monitoring trouve en production revient dans git par une Pull Request.",
    omRule7: "Un check de déploiement vert avant le merge, c'est une release sans surprise.",
    omRule8: "Les admins ne sont pas l'ennemi. Les clics que personne ne peut relire, si."
  }
};

export const CSS = `
.gr-om-bar { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; pointer-events: none; }
.gr-om-pill { background: rgba(3,45,96,0.82); color: #fff; border-radius: 999px; padding: 3px 10px; font-size: 13px; font-weight: 700; white-space: nowrap; }
.gr-om-pill.is-hot { background: #dd7a01; }
.gr-om-pill[hidden] { display: none; }
.gr-om-call { position: absolute; left: 50%; top: 46%; transform: translate(-50%, -50%); color: #fff; font-size: clamp(26px, 6vw, 44px); font-weight: 800; text-shadow: 0 3px 0 #032d60, 0 0 18px rgba(1,118,211,0.7); pointer-events: none; white-space: nowrap; }
.gr-om-call[hidden] { display: none; }
.gr-om-card { position: absolute; left: 50%; top: 44%; transform: translate(-50%, -50%); background: rgba(255,255,255,0.97); color: #181818; border-radius: 12px; padding: 14px 18px; width: min(420px, 88vw); box-shadow: 0 8px 28px rgba(0,0,0,0.35); }
.gr-om-card[hidden] { display: none; }
.gr-om-card h3 { margin: 0 0 6px; font-size: 18px; }
.gr-om-card ul { margin: 0 0 8px; padding: 0; list-style: none; }
.gr-om-card li { font-size: 14px; }
.gr-om-card .gr-om-rule { border-left: 4px solid #0176d3; padding: 4px 8px; margin: 8px 0; font-size: 14px; background: #f3f6fb; }
.gr-om-card .gr-om-next { font-weight: 700; font-size: 14px; }
.gr-om-card .gr-om-warn { color: #a85600; font-size: 13px; margin-top: 4px; }
.gr-om-card .gr-om-skip { color: #5c5c5c; font-size: 12px; margin-top: 8px; }
`;

export function createWorld(ctx) {
  const { THREE, hud, sound, t } = ctx;
  const random = ctx.random;
  const faces = pickAdmins("orgman", random, 4);
  const view = createView(THREE, ctx, {
    faceUrl: (i) => adminFaceUrl(faces[i]),
    salesManagerUrl: new URL("../../../../images/bosses/final-boss.svg", import.meta.url).href
  });
  const fmt = (n) => Math.round(n).toLocaleString(ctx.lang === "fr" ? "fr-FR" : "en-US");
  const point = new THREE.Vector3();
  const pos = { x: 0, y: 0 };
  let autoplay = null;
  let ended = false;
  let left = 0;
  let card = null;
  let topFlashed = false;
  let lastBar = "";
  let ruleTurn = Math.floor(random() * RULES);
  let pigTurn = Math.PI / 2;
  let deaths = 0;

  /* ---------- The HUD ---------- */

  const bar = document.createElement("div");
  bar.className = "gr-om-bar";
  const target = document.createElement("span");
  target.className = "gr-om-pill";
  bar.appendChild(target);
  hud.extra.appendChild(bar);
  const call = document.createElement("div");
  call.className = "gr-om-call";
  call.hidden = true;
  hud.layer.appendChild(call);
  const box = document.createElement("div");
  box.className = "gr-om-card";
  box.hidden = true;
  hud.layer.appendChild(box);

  function mazeName(level) {
    return t("omMaze_" + mazeForLevel(level).id);
  }

  function drawBar() {
    const s = sim.state;
    const hearts = "❤".repeat(Math.max(0, s.lives));
    const label = t("omLives", { hearts, n: s.level });
    const goal = ctx.hofTarget;
    const best = ctx.bonusBest || 0;
    const aim = goal > 0 ? t("omToBeat", { points: fmt(goal) }) : best > 0 ? t("omBest", { points: fmt(best) }) : "";
    const key = s.score + "|" + label + "|" + aim;
    if (key === lastBar) {
      return;
    }
    lastBar = key;
    ctx.bonus.hud({ score: fmt(s.score), ball: label });
    target.textContent = aim;
    target.hidden = !aim;
    target.classList.toggle("is-hot", goal > 0 && s.score > goal * 0.8);
    if (!topFlashed && goal > 0 && s.score > goal) {
      topFlashed = true;
      hud.toast(t("omTop5"), "good");
      sound.play("fanfare");
      ctx.setData("om-top5", 1);
    }
  }

  function shout(text, ms) {
    call.textContent = text;
    call.hidden = false;
    window.clearTimeout(shout.timer);
    shout.timer = window.setTimeout(() => (call.hidden = true), ms);
  }

  /* ---------- What the game says ---------- */

  const sim = createSim(random, (name, data) => {
    switch (name) {
      case "level":
        view.buildMaze(sim.state.grid, sim.dotAt);
        view.setAdmins(sim.state.admins.length || (salesManagerIn(data) ? 5 : 4));
        hud.goal(t("omGoal", { n: data, maze: mazeName(data) }));
        ctx.setData("om-level", data);
        return;
      case "ready":
        view.setAdmins(sim.state.admins.length);
        resetPig();
        shout(t("omReady"), 2000);
        if (salesManagerIn(sim.state.level)) {
          sound.play("bossIn");
        }
        return;
      case "go":
        shout(t("omGo"), 700);
        sound.play("wheek");
        return;
      case "dot":
        view.eatDot(data);
        if (sim.state.eaten % 2 === 0) {
          sound.play("w3Tick");
        }
        return;
      case "power":
        view.eatDot(data);
        sound.play("power");
        return;
      case "blue":
        ctx.setData("om-blue", data ? 1 : 0);
        return;
      case "caught": {
        sound.play("bossHit");
        const who = t("omAdmin" + data.id);
        hud.toast(t("omCaught", { who, points: fmt(data.points) }), "good");
        view.worldOf(data.x, data.y, point);
        ctx.fx.burst(point.x, 0.6, point.z, { count: 24, speed: 3, up: 3, life: 0.9 });
        ctx.setData("om-caught", sim.state.caughtTotal);
        return;
      }
      case "death":
        sound.play("hit");
        hud.toast(t("omCaughtBy", { who: t("omAdmin" + data.by) }), "bad");
        deaths += 1;
        ctx.setData("om-deaths", deaths);
        return;
      case "lost":
        sound.play("wrong");
        return;
      case "vegetable":
        if (data.show) {
          view.showVegetable(data.name);
        } else {
          view.hideVegetable();
          if (data.eaten) {
            sound.play("combo");
            hud.toast(t("omVegetable", { points: fmt(data.points) }), "good");
          }
        }
        return;
      case "extraLife":
        sound.play("note");
        hud.toast(t("omExtraLife"), "good");
        return;
      case "cleared":
        cleared(data);
        return;
      case "redraw":
        view.redrawDots(sim.dotAt);
        return;
      case "over":
        gameOver(data);
        return;
      default:
        return;
    }
  });

  /* ---------- Between two mazes: the cheer, the bonuses, a rule ---------- */

  function cleared(data) {
    sound.play("fanfare");
    ctx.pig.hop();
    view.worldOf(sim.state.pig.tx, sim.state.pig.ty, point);
    ctx.fx.burst(point.x, 0.8, point.z, { count: 70, speed: 5, up: 6, life: 1.4 });
    box.replaceChildren();
    const h = document.createElement("h3");
    h.textContent = t("omCleared", { n: data.level });
    box.appendChild(h);
    if (data.bonuses.length) {
      const list = document.createElement("ul");
      for (const b of data.bonuses) {
        const li = document.createElement("li");
        li.textContent = t(b.key, { points: fmt(b.points) });
        list.appendChild(li);
      }
      box.appendChild(list);
    }
    ruleTurn = (ruleTurn % RULES) + 1;
    const rule = document.createElement("div");
    rule.className = "gr-om-rule";
    rule.textContent = t("omRule" + ruleTurn);
    box.appendChild(rule);
    const next = document.createElement("div");
    next.className = "gr-om-next";
    next.textContent = t("omNext", { maze: mazeName(data.level + 1) });
    box.appendChild(next);
    if (salesManagerIn(data.level + 1)) {
      const warn = document.createElement("div");
      warn.className = "gr-om-warn";
      warn.textContent = t("omSalesManagerNext");
      box.appendChild(warn);
    }
    const skip = document.createElement("div");
    skip.className = "gr-om-skip";
    skip.textContent = t("omSkip");
    box.appendChild(skip);
    box.hidden = false;
    // As long as it takes to read the rule (and the warning), never less than the cheer
    const ms = Math.max(CARD_MIN_MS, readingMs(rule.textContent) + (salesManagerIn(data.level + 1) ? readingMs(t("omSalesManagerNext")) * 0.6 : 0));
    card = { until: ms / 1000, time: 0, skippable: 0.8 };
    ctx.setData("om-card", 1);
  }

  function closeCard() {
    card = null;
    box.hidden = true;
    ctx.setData("om-card", 0);
    sim.nextLevel();
  }

  function gameOver(summary) {
    if (ended) {
      return;
    }
    ended = true;
    sound.play("happy");
    ctx.bonus.over(summary);
  }

  /* ---------- The guinea pig ---------- */

  function resetPig() {
    ctx.pig.object.scale.setScalar(PIG_SCALE);
    ctx.pig.object.visible = true;
    // Facing left, the way it starts
    pigTurn = Math.PI / 2;
  }

  function placePig(dt) {
    const s = sim.state;
    const pig = ctx.pig;
    sim.positionOf(s.pig, pos);
    view.worldOf(pos.x, pos.y, point);
    pig.object.position.set(point.x, 0, point.z);
    pig.shadow.position.set(point.x, 0.012, point.z + 0.03);
    if (s.phase === "dying") {
      // A spin, smaller and smaller
      const k = Math.min(1, s.phaseTime / 1.6);
      pig.object.rotation.set(0, pigTurn + k * Math.PI * 6, 0);
      pig.object.scale.setScalar(PIG_SCALE * (1 - k * 0.85));
      pig.state = { running: false };
      return;
    }
    const d = s.pig.dir;
    const wanted = Math.atan2(d === 1 ? 1 : d === 3 ? -1 : 0, d === 0 ? 1 : d === 2 ? -1 : 0);
    // The shortest way round to the new heading
    let delta = wanted - pigTurn;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta));
    pigTurn += delta * Math.min(1, dt * 18);
    pig.object.rotation.set(0, pigTurn, 0);
    pig.state = { running: s.phase === "play" && s.pig.moving, speed: 4 };
  }

  /* ---------- Hooks for the check ---------- */

  function exposeHooks() {
    if (!window.__guineaRun) {
      return;
    }
    window.__guineaRun.orgman = {
      autoplay(on) {
        autoplay = on === false ? null : createAutoplay(sim);
      },
      state: () => {
        const s = sim.state;
        return { phase: s.phase, level: s.level, score: s.score, lives: s.lives, left: s.left, pig: { x: s.pig.tx, y: s.pig.ty, dir: s.pig.dir }, blue: s.blueTime > 0, caught: s.caughtTotal };
      },
      // A check reaches a moment directly: "blue", "clear" (one dot left), or a level number
      jump: (what) => sim.jump(what),
      summary: () => sim.summary()
    };
  }

  return {
    start() {
      ctx.engine.scene.background = new THREE.Color(0x061226);
      ctx.engine.scene.fog = null;
      ctx.engine.sun.position.set(3, 14, 8);
      ctx.pig.shadow.visible = true;
      const at = ctx.params.startAt;
      sim.newGame(at > 1 ? at : 1);
      exposeHooks();
      drawBar();
      view.update(0, sim, { hideAdmins: false });
      placePig(0);
    },
    update(dt) {
      if (card) {
        card.time += dt;
        if (card.time >= card.until) {
          closeCard();
        }
      }
      if (ended) {
        view.update(dt, sim, { hideAdmins: false });
        return;
      }
      left += dt;
      while (left >= STEP) {
        left -= STEP;
        if (autoplay) {
          autoplay.step();
        }
        sim.update(STEP);
        if (ended) {
          break;
        }
      }
      view.update(dt, sim, { hideAdmins: sim.state.phase === "dying" && sim.state.phaseTime > 0.5 });
      placePig(dt);
      drawBar();
    },
    action(name) {
      if (card) {
        if (card.time >= card.skippable) {
          closeCard();
        }
        return;
      }
      const dir = name === "jump" ? 0 : name === "left" ? 1 : name === "duck" ? 2 : name === "right" ? 3 : -1;
      if (dir >= 0) {
        sim.steer(dir);
      }
    },
    idleCamera() {
      view.placeCamera();
    },
    dispose() {
      window.clearTimeout(shout.timer);
      view.dispose();
      bar.remove();
      call.remove();
      box.remove();
      ctx.pig.object.scale.setScalar(1);
      ctx.pig.object.rotation.set(0, 0, 0);
      if (window.__guineaRun && window.__guineaRun.orgman) {
        delete window.__guineaRun.orgman;
      }
    }
  };
}
