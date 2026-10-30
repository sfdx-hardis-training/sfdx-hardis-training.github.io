/*
 * Guinea Run: the change of US-014 travels the pipeline, from a laptop with
 * nothing installed to production, through the worlds of the course, and
 * the last one keeps watch over production.
 *
 * Loaded by ../easter-egg.js the first time a reader finds the easter egg.
 * Three.js comes from jsDelivr at a fixed version, only then: a reader who never
 * finds the egg never downloads it. Each world is a module of worlds/, loaded
 * when it is played and freed when it is left, so only one world is ever in
 * memory.
 *
 * This file is the shell: the overlay, the map, the cards, the score, the
 * attempts and the stars, the badges, and the `ctx` every world is given (see
 * makeContext below, and worlds/runner.js for the runner worlds).
 *
 * Settings for checks, in the page URL: guinea-unlock=all opens every world
 * and saves nothing, guinea-world=N opens world N directly (with
 * guinea-unlock=all), guinea-seed=N replays the same track, guinea-at=M
 * starts a runner M metres down its track, guinea-test=1 adds the test hooks
 * of window.__guineaRun to a normal game. guinea-world=pinball and
 * guinea-world=orgman open the bonuses, Pipeline Pinball and Org-Man, which
 * every finished game unlocks (core/story.js BONUSES): each is loaded like a
 * world, keeps its own card and its own board.
 */
import { translator } from "./texts.js";
import { createHud } from "./hud.js";
import { createInput } from "./core/input.js";
import { createEngine } from "./core/engine.js";
import { createPainter, loadLogo } from "./core/painter.js";
import { createProgress } from "./core/progress.js";
import { installKind, rememberedInstalled } from "./core/install.js";
import { createSound } from "./core/sound.js";
import { seededRandom } from "./core/random.js";
import { WORLDS, BONUSES, bonusOf, judgePlan, modeOf } from "./core/story.js";
import { createGuineaPig } from "./guinea-pig.js";
import { createFx } from "./core/fx.js";
import { createModels } from "./core/models.js";
import { createMusic } from "./core/music.js";
import { THEMES } from "./core/themes.js";
import { TALLY_SET, stamp, stampPinball, stampOrgman } from "./core/tally.js";
import { hasCheckpoint, loadCheckpoint, saveCheckpoint, clearCheckpoint } from "./core/checkpoint.js";
import { GAME_VERSION, WORLD_COUNT, bonusTarget, collectResults, isHandle, loadBoard, scoresOf, sendWait, submissionUrl, topInvites } from "./core/hof.js";

// scripts/build/vendor-three.mjs copies the add-ons of this same version
const THREE_VERSION = "0.186.1";
// The WebGPU build: WebGPU where the browser has it, WebGL 2 otherwise
const THREE_URL = "https://cdn.jsdelivr.net/npm/three@" + THREE_VERSION + "/build/three.webgpu.min.js";
// Generous on purpose: the worlds teach, they are not meant to stop anyone
const ATTEMPTS = 5;
// A slow frame is played as several short steps, so a weak device keeps the
// right speed and nothing passes through the guinea pig between two frames
const STEP_DT = 1 / 30;
const COMBO_WINDOW = 2.5;
// The most a boss beaten at its par time (WORLDS[].par) adds to the score
const SPEED_BONUS = 300;
// A world without a mistake, less this much per attempt lost, never below 0
const CLEAN_BONUS = 250;
const MISTAKE_COST = 50;
// Victor's note found in the world
const NOTE_BONUS = 200;
// How long the board read from GitHub is reused before it is read again
const BOARD_REUSE_MS = 60000;

let active = null;

/** Opens the game. Returns { stop } at once, while Three.js still loads. */
export function start(options) {
  if (active) {
    return active;
  }
  active = createGame(options);
  return active;
}

function createGame(options) {
  const lang = options.lang === "fr" ? "fr" : "en";
  const track = options.track || function () {};
  const params = new URLSearchParams(window.location.search);
  const unlockAll = params.get("guinea-unlock") === "all";
  // The test hooks of window.__guineaRun, for scripts/verify/check-easter-egg.mjs
  const testHooks = unlockAll || params.get("guinea-test") === "1";
  const directWorld = unlockAll && params.has("guinea-world") ? (bonusOf(params.get("guinea-world")) ? params.get("guinea-world") : Number(params.get("guinea-world"))) : null;
  const seedParam = params.get("guinea-seed");
  const startAt = Number(params.get("guinea-at")) || 0;
  // A run a check can steer is never signed, so it never reaches the Hall of Fame
  const testMode = testHooks || seedParam !== null || startAt > 0;
  // The home screen app is offered once a visit (installHint)
  let installOffered = false;

  // The Cloudity logo, the badges and the labs are the site's own files
  const logoUrl = new URL("../../images/cloudity-text-logo-white.svg", options.base).href;
  const siteRoot = new URL("../../../", options.base);
  const badgeUrl = (level) => new URL("badges/img/banner-level-" + level + ".svg", siteRoot).href;

  const shellT = translator(lang);
  const progress = createProgress({ volatile: unlockAll, unlockAll });
  // A world added after the last one opens for whoever already finished the one before it
  for (const world of WORLDS) {
    if (world.id > progress.unlocked && world.id > 0 && progress.world(world.id - 1).stars > 0) {
      progress.complete(world.id - 1, 0, 0, world.id);
    }
  }
  const sound = createSound();
  const previousFocus = document.activeElement;
  const cleanups = [];
  // Filled once labs.js has loaded; the HUD reads it each time it draws a card
  const labs = {};
  let stopped = false;
  let state = "loading";
  let engine = null;
  let fx = null;
  let models = null;
  let THREE = null;
  let pig = null;
  let showroom = null;

  // The world being played, and the run of it
  let current = null;
  let run = null;
  // The Hall of Fame as last read, and where its card was opened from
  let board = null;
  let hofFrom = null;
  // The results of the last issue prepared, what the last invitation asked, a signature on its way
  let prepared = null;
  let inviteAsk = 0;
  let signing = Promise.resolve();
  // The score the open bonus must pass to enter the top 5 of its board (0: no flash), and the best games of a check
  let pinTarget = 0;
  const testBonus = { pinball: 0, orgman: 0 };

  loadStylesheet(options.base + "guinea-run.css");
  const hud = createHud(shellT, { logoUrl, badgeUrl, labs, lang, hostSave: Boolean(options.hostSave) });
  const overlay = hud.overlay;
  document.body.appendChild(overlay);
  document.documentElement.classList.add("guinea-run-open");
  hud.setMuted(sound.muted);
  hud.loading();

  function listen(target, type, handler, opts) {
    target.addEventListener(type, handler, opts);
    cleanups.push(() => target.removeEventListener(type, handler, opts));
  }

  // No scrolling or zooming the page behind the game on a phone
  listen(
    overlay,
    "touchmove",
    (event) => {
      // The menus, and a world's own lists, may scroll on a small screen
      if (!(event.target.closest && event.target.closest(".gr-panel, .gr-scroll"))) {
        event.preventDefault();
      }
    },
    { passive: false }
  );
  listen(document, "visibilitychange", () => {
    if (document.hidden) {
      pause();
    }
  });
  listen(window, "blur", pause);
  // play.html: the browser offered the install late, the player answered its box, or the game got installed
  listen(window, "guinea-run-install", refreshInstall);

  const disposeInput = createInput(overlay, hud.canvas, onAction, {
    tapOnDown: () => state === "playing" && Boolean(current) && String(current.module.PADS) === "jump",
    // The bonus table plays with held keys and touches
    hold: () => state === "playing" && Boolean(current && current.world) && current.module.PADS === "flippers",
    onHold: (name, down) => current && current.world && current.world.hold && current.world.hold(name, down),
    // The maze turns while the finger moves
    swipeOnMove: () => state === "playing" && Boolean(current && current.world) && current.module.SWIPE === "move"
  });

  /** The world a button names: a world id, or a bonus id ("pinball", "orgman"). */
  function worldOf(element) {
    const value = element && element.getAttribute("data-world");
    return bonusOf(value) ? value : Number(value);
  }

  /** Every world done (or a check that opens everything): the bonuses are open. */
  function bonusOpen() {
    return unlockAll || progress.bonusOpen(WORLDS);
  }

  /** Whether the world played is a bonus. */
  function playingBonus() {
    return Boolean(current && bonusOf(current.info.id));
  }

  /** The bonuses whose teaser was never shown, now that they are open. */
  function unseenTeasers() {
    return bonusOpen() && !testMode ? BONUSES.filter((b) => !progress.bonusOf(b.id).teaserSeen).map((b) => b.id) : [];
  }

  /** Shows the teaser of the bonuses never shown, once. Returns whether it did. */
  function showTeaser(fromCredits) {
    const ids = unseenTeasers();
    if (!ids.length) {
      return false;
    }
    for (const id of ids) {
      progress.setTeaserSeen(id);
    }
    track("easter_egg_bonus_teaser", { from: fromCredits ? "credits" : "map", bonuses: ids.join(",") });
    hud.teaser(fromCredits, ids);
    return true;
  }

  function onAction(action, element) {
    if (action === "quit") {
      stop();
      return;
    }
    if (action === "mute") {
      hud.setMuted(sound.toggle());
      return;
    }
    if (action === "retry-load") {
      if (!engine) {
        boot();
      } else if (current) {
        openWorld(current.info.id);
      } else {
        showMap();
      }
      return;
    }
    if (state === "loading" || state === "error") {
      return;
    }
    if (state === "celebrating") {
      if (action === "confirm" || action === "jump" || action === "skip" || action === "tap") {
        hud.skipCelebration();
      }
      return;
    }
    switch (action) {
      case "play":
        if (element && element.hasAttribute("data-world")) {
          openWorld(worldOf(element));
        }
        return;
      case "bonus":
        openWorld(element && bonusOf(element.getAttribute("data-world")) ? element.getAttribute("data-world") : "pinball");
        return;
      case "bonus-new":
        startBonus(false);
        return;
      case "bonus-resume":
        startBonus(true);
        return;
      case "map":
        showMap();
        return;
      case "install":
        if (options.install) {
          const trigger = state === "map" ? "map" : options.trigger;
          track("easter_egg_install", { trigger });
          if (element) {
            element.hidden = true;
          }
          options.install
            .prompt()
            .then((outcome) => track("easter_egg_install_choice", { trigger, outcome }))
            .catch(() => {});
        }
        return;
      case "install-page":
        // From a course page, the game page, where it installs
        track("easter_egg_install", { trigger: state === "map" ? "map" : options.trigger, kind: "page" });
        window.location.href = gamePageUrl();
        return;
      case "mode":
        if (state === "map" && element && element.hasAttribute("data-mode")) {
          progress.setMode(modeOf(element.getAttribute("data-mode")).id);
          track("easter_egg_mode", { mode: progress.mode });
          showMap();
        }
        return;
      case "hof":
        showHallOfFame(element && element.hasAttribute("data-world") ? worldOf(element) : "all", current ? current.info.id : null);
        return;
      case "hof-tab":
        if (state === "hof" && element) {
          const tab = element.getAttribute("data-tab");
          showHallOfFame(tab === "all" || bonusOf(tab) ? tab : Number(tab), hofFrom);
        }
        return;
      case "start":
        startWorld();
        return;
      case "next":
        openWorld(current ? current.info.id + 1 : 0);
        return;
      case "resume":
        resume();
        return;
      case "credits-card":
        if (state === "credits") {
          // The first time, the roll ends on the bonuses: one more thing
          if (!showTeaser(true)) {
            hud.creditsCard();
          }
        }
        return;
      case "credits-roll":
        if (state === "credits") {
          hud.creditsRoll();
        }
        return;
      case "pause":
        if (state === "playing") {
          pause();
        } else if (state === "paused") {
          resume();
        }
        return;
      default:
        break;
    }
    if (action === "confirm") {
      if (state === "paused") {
        resume();
        return;
      }
      if (playingBonus() && (state === "intro" || state === "done")) {
        if (state === "done") {
          showMap();
        } else {
          startBonus(current.info.id === "pinball" && hasCheckpoint());
        }
        return;
      }
      if (state === "intro" || state === "failed") {
        startWorld();
        return;
      }
      if (state === "done") {
        openWorld(current ? current.info.id + 1 : 0);
        return;
      }
    }
    if (state === "playing" && current && current.world) {
      current.world.action(action);
    }
  }

  function pause() {
    if (state === "playing") {
      state = "paused";
      engine.setActive(false);
      // The bonus table saves its game, and lets its flippers down
      if (current && current.world && current.world.pause) {
        current.world.pause();
      }
      hud.paused({ renderer: engine.backend === "webgpu" ? "WebGPU" : "WebGL 2", fps: Math.round(engine.fps), tier: engine.tier });
    }
  }

  function resume() {
    if (state === "paused") {
      state = "playing";
      engine.setActive(true);
      hud.playing();
    }
  }

  async function boot() {
    state = "loading";
    hud.loading();
    if (!webglAvailable()) {
      state = "error";
      hud.message(shellT("noWebgl"), false);
      return;
    }
    try {
      const [three, table] = await Promise.all([import(THREE_URL), loadLabs(options.base, lang)]);
      THREE = three;
      Object.assign(labs, table);
    } catch {
      if (!stopped) {
        state = "error";
        hud.message(shellT("loadFailed"), true);
      }
      return;
    }
    if (stopped) {
      return;
    }
    loadLogo(logoUrl);
    try {
      engine = await createEngine(THREE, hud.canvas, overlay, frame, { forceWebGL: params.get("guinea-gl") === "1", noBloom: params.get("guinea-bloom") === "0" });
    } catch {
      if (!stopped) {
        state = "error";
        hud.message(shellT("noWebgl"), false);
      }
      return;
    }
    if (stopped) {
      engine.dispose();
      return;
    }
    overlay.setAttribute("data-renderer", engine.backend);
    engine.onBigResize(pause);
    pig = createGuineaPig(THREE, { furShells: [2, 4, 6][engine.tier], modelUrl: options.base + "models/guinea-pig.glb" });
    pig.state = { running: false };
    engine.scene.add(pig.object);
    engine.scene.add(pig.shadow);
    fx = createFx(THREE, engine.scene, hud.reduced);
    models = createModels(THREE, options.base);
    showroom = createShowroom(THREE);
    engine.scene.add(showroom);
    hud.setBadges(progress.badges);
    engine.start();
    if (testHooks) {
      exposeTestHooks();
    }
    if (directWorld !== null && (WORLDS[directWorld] || bonusOf(directWorld))) {
      openWorld(directWorld);
    } else {
      showMap();
      // The shared save of VS Code was edited by hand: play.html cleared it, the player hears why
      if (options.saveRefused) {
        track("easter_egg_save_refused", { trigger: options.trigger });
        hud.saveRefused();
      }
    }
  }

  /* ---------- The map and the worlds ---------- */

  function resetPig() {
    pig.setGhost(false);
    pig.setSitting(false);
    pig.setRiders([]);
    pig.object.position.set(0, 0, 0);
    pig.object.rotation.set(0, 0, 0);
    pig.object.visible = true;
    pig.shadow.position.set(0, 0.012, 0.05);
    pig.state = { running: false, airborne: false, ducking: false, speed: 0, height: 0 };
  }

  function showMap() {
    closeWorld();
    state = "map";
    engine.setActive(false);
    showroom.visible = true;
    resetPig();
    engine.resetLook();
    hud.clearWorldUi();
    hud.setPads([]);
    overlay.removeAttribute("data-world");
    // A player who finished the game before a bonus existed sees its teaser once
    if (showTeaser(false)) {
      return;
    }
    hud.map(
      progress,
      () => {
        progress.reset();
        clearCheckpoint();
        hud.setBadges([]);
        showMap();
      },
      BONUSES.map((b) => ({ id: b.id, open: bonusOpen(), best: progress.bonusOf(b.id).best, hasSave: b.id === "pinball" && hasCheckpoint() })),
      installOffer()
    );
    markMap();
  }

  async function openWorld(id) {
    const bonus = bonusOf(id);
    const info = bonus || WORLDS[id];
    if (!info || (bonus ? !bonusOpen() : id > progress.unlocked && !unlockAll)) {
      showMap();
      return;
    }
    closeWorld();
    state = "loading";
    hud.loading();
    let module;
    try {
      module = await import("./worlds/" + info.module);
    } catch {
      state = "error";
      hud.message(shellT("loadFailed"), true);
      return;
    }
    if (stopped) {
      return;
    }
    current = { info, module, world: null, t: translator(lang, [module.TEXTS || {}]) };
    overlay.setAttribute("data-world", String(id));
    // On a phone, messages go under the top bar unless the world's track runs
    // up the middle of the screen (PHONE_MESSAGES = "bottom")
    overlay.setAttribute("data-messages", module.PHONE_MESSAGES === "bottom" ? "bottom" : "top");
    // A world's own styles live in its module, and leave with it
    if (module.CSS) {
      const style = document.createElement("style");
      style.id = "guinea-run-world-css";
      style.textContent = module.CSS;
      document.head.appendChild(style);
    }
    // The models the world names, and the Salesforce items every world uses
    // (its trophy too), loaded behind the loading card
    await Promise.race([models.load(["salesforce"].concat(module.MODELS || [])), new Promise((resolve) => window.setTimeout(resolve, 15000))]);
    if (stopped || !current) {
      return;
    }
    try {
      createCurrentWorld();
    } catch (e) {
      console.error(e);
      state = "error";
      hud.message(shellT("loadFailed"), true);
      return;
    }
    // Shaders are built now, behind the loading card, not on the first frames
    await engine.warm();
    if (stopped || !current) {
      return;
    }
    state = "intro";
    engine.setActive(false);
    // A world says how it is played in three short steps: how1, how2, how3
    const how = ["how1", "how2", "how3"].map((key) => current.t(key)).filter((text, i) => text && text !== "how" + (i + 1));
    if (bonus) {
      readBonusTarget();
      hud.bonusIntro({ id: info.id, story: current.t("intro"), how, best: progress.bonusOf(info.id).best, hasSave: info.id === "pinball" && hasCheckpoint() });
    } else {
      hud.intro(info, progress.world(id), current.t("intro"), how, module.PADS, modeOf(progress.mode));
    }
    track("easter_egg_world_open", { world: id });
  }

  /** Starts a bonus: a new game, or for the table the saved one (a saved game that was changed starts a new one). */
  async function startBonus(resume) {
    if (!playingBonus()) {
      return;
    }
    let saved = null;
    if (resume && current.info.id === "pinball") {
      const read = await loadCheckpoint();
      if (read && read.state) {
        saved = read.state;
      } else if (read && read.broken) {
        clearCheckpoint();
        hud.toast(shellT("bonusSaveBroken"), "bad");
      }
    }
    if (!playingBonus() || (state !== "intro" && state !== "done")) {
      return;
    }
    if (state !== "intro") {
      createCurrentWorld();
    }
    state = "playing";
    hud.playing();
    engine.setActive(true);
    current.world.start({ resume: saved });
    track("easter_egg_bonus_start", { bonus: current.info.id, resume: Boolean(saved) });
  }

  /** The end of a game of a bonus: its record, the Hall of Fame, the card. */
  function bonusOver(summary) {
    if (!run || run.ended) {
      return;
    }
    run.ended = true;
    state = "done";
    engine.setActive(false);
    const id = current.info.id;
    const before = progress.bonusOf(id).best;
    let record = null;
    if (!testMode) {
      record =
        id === "orgman"
          ? { org: 1, sc: summary.score, ms: summary.ms, lv: summary.level, gh: summary.admins, at: Date.now(), v: GAME_VERSION, k: TALLY_SET }
          : { pin: 1, sc: summary.score, ms: summary.ms, lv: summary.level, mi: summary.missions, nt: summary.notes, at: Date.now(), v: GAME_VERSION, k: TALLY_SET };
    }
    const newBest = testMode ? summary.score > before : progress.completeBonus(summary.score, record, id);
    if (newBest && record) {
      const stamper = id === "orgman" ? stampOrgman : stampPinball;
      signing = stamper(record).then((sg) => sg && progress.setBonusRecord(Object.assign({}, record, { sg }), id));
    }
    if (testMode) {
      testBonus[id] = Math.max(testBonus[id] || 0, summary.score);
    }
    track("easter_egg_bonus_over", { bonus: id, score: summary.score, level: summary.level, missions: summary.missions, admins: summary.admins, minutes: Math.round(summary.ms / 60000), trigger: options.trigger });
    sound.play(newBest ? "fanfare" : "happy");
    hud.bonusResult(Object.assign({ id, best: Math.max(before, summary.score), newBest }, summary));
    inviteFor([id]);
  }

  /** Builds the world from its module, fresh: every attempt of a world starts clean. */
  function createCurrentWorld() {
    if (current.world) {
      disposeWorldObjects();
    }
    showroom.visible = false;
    engine.resetLook();
    hud.clearWorldUi();
    resetPig();
    // The mode is read once per run: a world is played in one mode from start to end.
    // The bonuses ignore it: same points in every mode, so the same speed (Easy's)
    const mode = playingBonus() ? modeOf("easy") : modeOf(progress.mode);
    run = { score: 0, attempts: ATTEMPTS, lost: 0, note: false, tip: "", combo: 0, comboTime: -10, ended: false, bossClock: null, bossDone: false, mode };
    const root = new THREE.Group();
    engine.scene.add(root);
    const paint = createPainter(THREE);
    current.root = root;
    current.paint = paint;
    hud.setPads(current.module.PADS || ["left", "right", "jump", "duck"]);
    current.world = current.module.createWorld(makeContext(root, paint));
    if (!playingBonus()) {
      updateHud();
    }
  }

  function startWorld() {
    if (!current) {
      showMap();
      return;
    }
    if (state !== "intro") {
      createCurrentWorld();
    }
    state = "playing";
    hud.playing();
    engine.setActive(true);
    sound.play("hungry");
    if (current.world.start) {
      current.world.start();
    }
    sound.play("wheek");
  }

  function disposeWorldObjects() {
    if (!current || !current.world) {
      return;
    }
    try {
      current.world.dispose();
    } catch {
      // A world that fails to clean up must not keep the player stuck
    }
    engine.scene.remove(current.root);
    current.paint.dispose();
    fx.clear();
    current.world = null;
    hud.clearWorldUi();
  }

  function closeWorld() {
    if (current) {
      disposeWorldObjects();
      current = null;
    }
    const style = document.getElementById("guinea-run-world-css");
    if (style) {
      style.remove();
    }
  }

  /**
   * Everything a world can use. A world module exports TEXTS ({ en, fr }, with
   * at least intro and note), QUOTES (the strings it takes from the labs),
   * PADS (the pads it needs), and createWorld(ctx) returning
   * { start(), update(dt, time), action(name), dispose() }.
   *
   * Actions are left, right, jump, duck, confirm and tap. A world calls
   * ctx.collect / ctx.loseAttempt / ctx.foundNote while it plays, and
   * ctx.finish() or ctx.fail(tip) once, at its end. A world with a boss calls
   * ctx.bossStarted() when the fight starts and ctx.bossBeaten() when the boss
   * is down: with a par time (WORLDS[].par) a fast fight earns a speed bonus.
   */
  function makeContext(root, paint) {
    const info = current.info;
    return {
      THREE,
      engine,
      scene: engine.scene,
      camera: engine.camera,
      root,
      pig,
      /** Confetti: fx.burst(x, y, z, { count, colors, speed, up, life }). */
      fx,
      /** The Kenney models of the packs the world named in MODELS: models.get(name, { height }). */
      models,
      paint,
      t: current.t,
      lang,
      sound,
      world: info,
      params: { startAt, testMode, seed: Number(seedParam) || 0 },
      /** The score a bonus must pass to enter the top 5 of its board, 0 when there is nothing to flash. */
      get hofTarget() {
        return pinTarget;
      },
      /** The best game of the bonus played, in this browser. */
      get bonusBest() {
        return bonusOf(info.id) ? progress.bonusOf(info.id).best : 0;
      },
      /** How much faster than Easy the world runs (1, 1.5 or 2): its update already gets the faster time, a musical run sets its tempo with it. */
      get speed() {
        return run.mode.speed;
      },
      random: seededRandom(seedParam ? Number(seedParam) + info.id : Date.now() & 0xffffffff),
      get attempts() {
        return run.attempts;
      },
      get plan() {
        return progress.plan;
      },
      judgePlan() {
        return judgePlan(progress.plan);
      },
      savePlan(plan) {
        progress.setPlan(plan);
      },
      hud: {
        layer: hud.layer,
        extra: hud.extra,
        touch: hud.touch,
        reduced: hud.reduced,
        toast: (text, tone) => hud.toast(text, tone),
        chat: (who, text, ms) => hud.chat(who, text, ms),
        tick: (line) => hud.tick(line),
        clearTicker: () => hud.clearTicker(),
        goal: (text) => hud.goal(text),
        coach: (text, ms) => hud.coach(text, ms),
        tip: (text, ms) => hud.tip(text, ms),
        setPath: (steps, i) => hud.setPath(steps, i),
        setPads: (list) => hud.setPads(list)
      },
      /** Points for something done right, multiplied by the streak of good moves. */
      collect(points, label) {
        const now = engine.time;
        const at = pig.object.position;
        fx.burst(at.x, at.y + 0.8, at.z, { count: 10, speed: 2.5, up: 3, life: 0.8 });
        hud.hideTip();
        run.combo = now - run.comboTime < COMBO_WINDOW ? Math.min(run.combo + 1, 8) : 1;
        run.comboTime = now;
        const multiplier = Math.min(1 + Math.floor((run.combo - 1) / 2), 4);
        run.score += points * multiplier;
        sound.play(multiplier > 1 && run.combo % 2 === 1 ? "combo" : "pickup");
        if (label) {
          hud.toast(multiplier > 1 ? label + "  x" + multiplier : label, "good");
        }
        updateHud();
        return multiplier;
      },
      points(n) {
        run.score = Math.max(0, run.score + n);
        updateHud();
      },
      /** A mistake: one attempt less. The tip is what the lab says to do, shown if the world is lost. */
      loseAttempt(title, tip) {
        if (run.ended) {
          return run.attempts;
        }
        run.attempts -= 1;
        run.lost += 1;
        run.combo = 0;
        run.tip = tip || run.tip;
        sound.play("hit");
        if (title) {
          hud.toast(title, "bad");
        }
        if (tip && tip !== title) {
          hud.tip(tip, 0, title);
        }
        updateHud();
        if (run.attempts <= 0) {
          failWorld();
        }
        return run.attempts;
      },
      gainAttempt() {
        if (run.attempts < ATTEMPTS) {
          run.attempts += 1;
          updateHud();
          return true;
        }
        return false;
      },
      foundNote() {
        if (run.note) {
          return;
        }
        run.note = true;
        sound.play("note");
        hud.note(current.t("note"));
      },
      /**
       * The boss fight starts now, once its opening lines are said (a longer
       * line in another language costs nothing): the time to beat it counts
       * from here, on the game clock, so a pause stops it. Once per run: a
       * world with two bosses calls it at each, the clock runs from the first.
       */
      bossStarted() {
        if (!run.ended && run.bossClock === null) {
          run.bossClock = 0;
          run.bossDone = false;
        }
      },
      /** The boss is down: the clock stops, even if the world plays on (a musical run ends with its song). */
      bossBeaten() {
        if (run.bossClock !== null) {
          run.bossDone = true;
        }
      },
      /** Ends the world in success. info, when given, is what the player missed: shown on the result, never a reason to fail. */
      finish(bonus, info) {
        succeedWorld(bonus || 0, info);
      },
      fail(tip) {
        if (tip) {
          run.tip = tip;
        }
        failWorld();
      },
      setData(name, value) {
        overlay.setAttribute("data-" + name, String(value));
      },
      /** The bonus table: its top bar, its saved game, its end. Nothing is saved by a check. */
      bonus: {
        hud(view) {
          hud.update({ world: shellT(info.id === "orgman" ? "orgName" : "bonusName"), score: view.score, attempts: 0, maxAttempts: 0, label: view.ball });
        },
        saveCheckpoint(snapshot) {
          return testMode ? Promise.resolve(false) : saveCheckpoint(snapshot);
        },
        clearCheckpoint() {
          if (!testMode) {
            clearCheckpoint();
          }
        },
        over(summary) {
          bonusOver(summary);
        }
      },
      get playing() {
        return state === "playing";
      }
    };
  }

  function succeedWorld(bonus, missed) {
    if (!run || run.ended) {
      return;
    }
    run.ended = true;
    run.score += bonus;
    const info = current.info;
    // A boss that was never beaten has no time, and no speed bonus
    const bossMs = run.bossClock !== null && run.bossDone ? Math.round(run.bossClock * 1000) : null;
    // The end bonuses, each a line of the end card
    const bonuses = [];
    const clean = Math.max(0, CLEAN_BONUS - run.lost * MISTAKE_COST);
    run.score += clean;
    bonuses.push(run.lost === 0 ? { key: "bonusClean", points: clean } : { key: "bonusMistakes", points: clean, n: run.lost });
    if (run.note) {
      run.score += NOTE_BONUS;
      bonuses.push({ key: "bonusNote", points: NOTE_BONUS });
    }
    if (bossMs !== null && info.par) {
      const seconds = bossMs / 1000;
      const points = Math.round(SPEED_BONUS * Math.min(1, Math.max(0, 1 - (seconds - info.par) / (2 * info.par))));
      run.score += points;
      bonuses.push({ key: points > 0 ? "speedLine" : "speedLineNone", points, s: Math.round(seconds) });
    }
    // Last: the mode multiplies the whole score, bonuses included
    if (run.mode.mult !== 1) {
      run.score = Math.round(run.score * run.mode.mult);
      bonuses.push({ key: "bonusMode", mode: shellT("mode_" + run.mode.id), mult: run.mode.mult });
    }
    fx.burst(pig.object.position.x, pig.object.position.y + 1, pig.object.position.z, { count: 70, speed: 5, up: 6, life: 1.6 });
    pig.hop();
    const stars = 1 + (run.lost === 0 ? 1 : 0) + (run.note ? 1 : 0);
    if (run.note) {
      progress.addNote(info.id);
    }
    const before = progress.world(info.id).best;
    const last = info.id === WORLDS.length - 1;
    const record = testMode ? { test: true } : { w: info.id, sc: run.score, st: stars, bm: bossMs, m: run.mode.id, at: Date.now(), v: GAME_VERSION, k: TALLY_SET };
    const newBest = progress.complete(info.id, run.score, stars, last ? info.id : info.id + 1, record);
    if (newBest && !testMode) {
      // A few milliseconds: the card does not wait for it
      signing = stamp(record).then((sg) => sg && progress.setRecord(info.id, Object.assign({}, record, { sg })));
    }
    track("easter_egg_world_done", { world: info.id, stars, score: run.score, mode: run.mode.id, trigger: options.trigger });
    engine.setActive(false);
    const result = { ok: true, world: info, score: run.score, best: Math.max(before, run.score), newBest, stars, hasNext: !last, missed: missed || "", bonuses, install: installHint() };
    const show = () => {
      if (last) {
        progress.setFinished();
        track("easter_egg_finished", { score: run.score, trigger: options.trigger });
        state = "credits";
        hud.credits(progress.badges, result);
      } else {
        state = "done";
        hud.result(result);
        inviteFor([info.id, "all"]);
      }
    };
    if (info.badge) {
      progress.addBadge(info.badge);
      track("easter_egg_badge", { level: info.badge, trigger: options.trigger });
      state = "celebrating";
      sound.play("fanfare");
      showTrophy();
      hud.celebrate(info.badge, () => {
        hideTrophy();
        show();
      });
    } else {
      sound.play("happy");
      show();
    }
  }

  function failWorld() {
    if (!run || run.ended) {
      return;
    }
    run.ended = true;
    state = "failed";
    engine.setActive(false);
    sound.play("wrong");
    track("easter_egg_world_failed", { world: current.info.id });
    hud.result({ ok: false, world: current.info, tip: run.tip });
  }

  /* ---------- The Hall of Fame ---------- */

  /** The card of the boards. tab: "all" or a world id. from: the world whose card opened it, or null for the map. */
  async function showHallOfFame(tab, from) {
    closeWorld();
    state = "hof";
    hofFrom = from;
    engine.setActive(false);
    showroom.visible = true;
    resetPig();
    engine.resetLook();
    overlay.removeAttribute("data-world");
    hud.clearWorldUi();
    hud.setPads([]);
    const view = { tab, from, handle: progress.handle, canSend: !testMode, prepare: prepareSubmission, onSent: sentScores };
    if (!boardFresh()) {
      hud.hallOfFame(Object.assign({ loading: true }, view));
      const loaded = await currentBoard();
      if (state !== "hof" || hofFrom !== from) {
        return;
      }
      track("easter_egg_hof_open", { ok: loaded.ok });
    }
    hud.hallOfFame(Object.assign({ board: board.board, ok: board.ok }, view));
  }

  /** The issue address for a handle, or { error } with the text key that says why not. */
  async function prepareSubmission(handle) {
    if (testMode) {
      return { error: "hofTestMode" };
    }
    if (!isHandle(handle)) {
      return { error: "hofHandleBad" };
    }
    const results = collectResults(progress, Date.now());
    if (!results.length) {
      return { error: "hofNothing" };
    }
    const wait = sendWait(progress.sentAt, Date.now());
    if (wait > 0) {
      return { error: "hofWait", params: { n: Math.ceil(wait / 60000) } };
    }
    prepared = results;
    return { url: await submissionUrl(handle, results, Date.now()), count: results.length };
  }

  function sentScores(handle, count) {
    progress.setHandle(handle);
    if (prepared) {
      progress.addSent(scoresOf(prepared), Date.now());
    }
    hud.markHof(false);
    // The next look at the board reads it again: the new scores land within minutes
    board = null;
    track("easter_egg_hof_submit", { worlds: count });
  }

  function boardFresh() {
    return Boolean(board) && Date.now() - board.at <= BOARD_REUSE_MS;
  }

  /** The board, read again once it is older than BOARD_REUSE_MS. Never throws. */
  async function currentBoard() {
    if (!boardFresh()) {
      const loaded = await loadBoard(siteRoot);
      board = Object.assign(loaded, { at: Date.now() });
    }
    return board;
  }

  /** The scores the player can send now; in a check, the bests of this session. */
  function mineScores() {
    if (testMode) {
      const worlds = {};
      for (let w = 0; w < WORLD_COUNT; w++) {
        worlds[w] = progress.world(w).best;
      }
      return { worlds, pinball: testBonus.pinball, orgman: testBonus.orgman };
    }
    return scoresOf(collectResults(progress, Date.now()));
  }

  /**
   * The boards where the scores not sent yet would enter the top 5. Nothing to
   * send, or too soon after the last send: no need to read the board. The
   * invitation comes back at the next end card or map once the pause is over.
   */
  async function invitesFor(boards) {
    const empty = { players: {} };
    if (!testMode && sendWait(progress.sentAt, Date.now()) > 0) {
      return [];
    }
    if (!topInvites(empty, mineScores(), progress.sent, progress.handle, boards).length) {
      return [];
    }
    const read = await currentBoard();
    return read.ok ? topInvites(read.board, mineScores(), progress.sent, progress.handle, boards) : [];
  }

  /**
   * The invitation on the end card, once the signature and the board are in:
   * with a known handle a link straight to the issue, otherwise the Hall of Fame card.
   */
  /**
   * On a phone, the end card of a won world offers the home screen app, which
   * plays offline (play.html, its manifest and sw.js). Once a visit. From a
   * course page it opens the game page; there, an Android browser installs it
   * at a tap, Safari and the others say where the menu entry is. Never in a
   * frame or in the app itself (options.install is null there). The offer of
   * the map (installOffer) does not use this visit up.
   */
  function installHint() {
    if (installOffered) {
      return null;
    }
    const offer = installOffer();
    if (offer) {
      installOffered = true;
    }
    return offer;
  }

  /** The offer of the map, on every map while the game is not installed. */
  function installOffer() {
    const offer = installKind(options.install, installDevice());
    return offer && offer.kind === "page" ? { kind: "page", url: gamePageUrl() } : offer;
  }

  /** The install box on screen (map or end card) follows what play.html just learnt. */
  function refreshInstall() {
    if (state === "map" || hud.hasInstallBox()) {
      hud.refreshInstall(installOffer());
    }
  }

  function installDevice() {
    return { touch: hud.touch, testMode, userAgent: navigator.userAgent, platform: navigator.platform, maxTouchPoints: navigator.maxTouchPoints, remembered: rememberedInstalled(storageOrNull()) };
  }

  function storageOrNull() {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }

  function gamePageUrl() {
    return new URL("play.html?lang=" + lang, options.base).href;
  }

  async function inviteFor(boards) {
    const ask = ++inviteAsk;
    const shown = state;
    await signing;
    const invites = await invitesFor(boards);
    if (ask !== inviteAsk || state !== shown || !invites.length) {
      return;
    }
    const view = { invites, canSend: !testMode, onSent: sentScores };
    if (progress.handle && !testMode) {
      const ready = await prepareSubmission(progress.handle);
      if (ask !== inviteAsk || state !== shown) {
        return;
      }
      if (ready.url) {
        Object.assign(view, { handle: progress.handle, url: ready.url, count: ready.count });
      }
    }
    hud.invite(view);
    hud.markHof(true);
    track("easter_egg_hof_invite", { boards: invites.map((i) => i.board).join(","), rank: Math.min(...invites.map((i) => i.rank)) });
  }

  /** The mark on the Hall of Fame button of the map, while a top 5 score waits to be sent. */
  async function markMap() {
    const boards = Array.from({ length: WORLD_COUNT }, (_, w) => w).concat(["all"], BONUSES.map((b) => b.id));
    const invites = await invitesFor(boards);
    if (state === "map") {
      hud.markHof(invites.length > 0);
    }
  }

  /** What the open bonus must pass to flash TOP 5, read while its card shows. */
  async function readBonusTarget() {
    pinTarget = 0;
    const id = current && current.info.id;
    const read = await currentBoard();
    pinTarget = read.ok && bonusOf(id) ? bonusTarget(read.board, progress.sent, progress.handle, id) : 0;
  }

  function updateHud() {
    if (!current || !run) {
      return;
    }
    const mode = run.mode.id === "easy" ? "" : " · " + shellT("mode_" + run.mode.id);
    hud.update({ world: current.info.id + " · " + shellT("w" + current.info.id + "_name") + mode, score: run.score, attempts: run.attempts, maxAttempts: ATTEMPTS });
  }

  /* ---------- The trophy: the badge and the Cloudity logo, in 3D ---------- */

  // They turn beside the celebration card, in front of the camera of the world
  let trophy = null;
  function showTrophy() {
    if (!models || !models.has("sfdx-hardis-badge")) {
      return;
    }
    if (!trophy) {
      trophy = new THREE.Group();
      const badge = models.get("sfdx-hardis-badge", { height: 1.3 });
      const logo = models.get("cloudity-logo", { width: 1.5 });
      trophy.add(badge, logo);
      trophy.userData.items = [badge, logo];
    }
    trophy.visible = true;
    trophy.userData.time = 0;
    engine.scene.add(trophy);
    fx.burst(engine.camera.position.x, engine.camera.position.y, engine.camera.position.z - 2, { count: 40, speed: 3, up: 3 });
  }

  function hideTrophy() {
    if (trophy) {
      trophy.visible = false;
      engine.scene.remove(trophy);
    }
  }

  // Placed from points of the screen, so a world's camera offset or zoom does
  // not matter: on each side of the card, or above it on a phone
  const trophyPoint = { x: 0, y: 0 };
  function placeTrophy(dt) {
    if (!trophy || !trophy.visible) {
      return;
    }
    trophy.userData.time += dt;
    const t = trophy.userData.time;
    const camera = engine.camera;
    const portrait = engine.portrait;
    const distance = 4;
    const height = 2 * distance * Math.tan((camera.fov * Math.PI) / 360) / (camera.zoom || 1);
    const pop = Math.min(1, t * 2.5);
    trophy.position.set(0, 0, 0);
    trophy.quaternion.identity();
    trophy.userData.items.forEach((item, i) => {
      const side = i === 0 ? -1 : 1;
      trophyPoint.x = portrait ? side * 0.5 : side * 0.62;
      trophyPoint.y = portrait ? 0.5 : 0.05;
      const at = new THREE.Vector3(trophyPoint.x, trophyPoint.y, 0.5).unproject(camera).sub(camera.position).normalize();
      item.position.copy(camera.position).addScaledVector(at, distance);
      item.quaternion.copy(camera.quaternion);
      item.rotateY(Math.sin(t * 1.2 + i * 2) * 0.6);
      item.position.y += Math.sin(t * 2 + i) * height * 0.012;
      // About a fifth of the screen height, a little smaller on a phone
      item.scale.setScalar(pop * height * (portrait ? 0.1 : 0.2) / 1.3);
    });
  }

  /* ---------- The background music ---------- */

  // A theme per world (core/themes.js), and a soft one on the map. It plays
  // while a world is played, holds on pause, stops on the card, the
  // celebration, the result and the close. A musical run plays its own song.
  let backgroundMusic = null;

  function wantedTheme() {
    // The soft theme of the map plays under the credits too
    if (state === "map" || state === "credits") {
      return THEMES.map ? { key: "map", run: null } : null;
    }
    if (!current || !current.world || (state !== "playing" && state !== "paused")) {
      return null;
    }
    const own = current.module.MUSIC;
    if (own === false || current.info.style === "musical") {
      return null;
    }
    const key = own !== undefined ? own : current.info.id;
    return THEMES[key] ? { key, run } : null;
  }

  function updateBackgroundMusic(dt) {
    const wanted = wantedTheme();
    const same = backgroundMusic && wanted && backgroundMusic.key === wanted.key && backgroundMusic.run === wanted.run;
    if (!same) {
      stopBackgroundMusic();
      if (wanted) {
        const theme = THEMES[wanted.key];
        backgroundMusic = { key: wanted.key, run: wanted.run, theme, music: createMusic(sound, theme), pace: Number(overlay.getAttribute("data-pace")) || 1 };
        backgroundMusic.base = backgroundMusic.pace;
        backgroundMusic.music.start();
      }
    }
    if (!backgroundMusic || (state !== "playing" && state !== "map" && state !== "credits")) {
      return;
    }
    // A world that speeds up (data-pace) takes its theme along, gently, on a bar line
    const pace = Number(overlay.getAttribute("data-pace")) || backgroundMusic.base;
    if (Math.abs(pace - backgroundMusic.pace) > 0.02) {
      backgroundMusic.pace = pace;
      const factor = 1 + (pace / backgroundMusic.base - 1) * 0.6;
      backgroundMusic.music.setTempo(backgroundMusic.theme.bpm * factor, (backgroundMusic.music.bar + 1) * 4);
    }
    backgroundMusic.music.update(dt);
  }

  function stopBackgroundMusic() {
    if (backgroundMusic) {
      backgroundMusic.music.dispose();
      backgroundMusic = null;
    }
  }

  /* ---------- The frame ---------- */

  function frame(dt, time) {
    updateBackgroundMusic(dt);
    if (state === "playing" && current && current.world) {
      // The mode runs the world faster; a musical run is faster through its tempo instead
      const speed = run ? run.mode.speed : 1;
      if (run && run.bossClock !== null && !run.bossDone && !run.ended) {
        // Game time: a par time means the same in every mode
        run.bossClock += dt * speed;
      }
      let left = current.module.OWN_SPEED ? dt : dt * speed;
      while (left > 1e-6 && state === "playing") {
        const slice = Math.min(left, STEP_DT);
        current.world.update(slice, time);
        left -= slice;
      }
    } else if (state === "map" || !current || !current.world || !current.world.idleCamera) {
      idleCamera(time);
    } else {
      current.world.idleCamera(time);
    }
    pig.animate(dt, pig.state || { running: false });
    fx.update(dt);
    placeTrophy(dt);
  }

  /** Off the game, the camera turns slowly round the guinea pig. */
  function idleCamera(time) {
    const camera = engine.camera;
    const target = pig.object.position;
    const portrait = engine.portrait;
    const angle = 0.9 + time * 0.25;
    const radius = portrait ? 3.6 : 2.9;
    camera.position.set(target.x + Math.sin(angle) * radius, target.y + 1.3, target.z - Math.cos(angle) * radius);
    camera.lookAt(target.x, target.y + (portrait ? -0.75 : -0.45), target.z);
    engine.aimSun(target.x, target.z);
  }

  function exposeTestHooks() {
    window.__guineaRun = {
      state: () => state,
      world: () => (current ? current.info.id : null),
      finish: () => current && current.world && (playingBonus() ? bonusOver({ score: 1000, ms: 60000, level: 1, missions: 0, notes: 0, admins: 0 }) : succeedWorld(0)),
      fail: () => current && current.world && failWorld(),
      action: (name) => onAction(name, null),
      bossClock: () => (run ? run.bossClock : null),
      // A board to rank against, instead of the one on GitHub
      board: (value) => {
        board = { board: value, ok: true, at: Date.now() + 864e5 };
        if (playingBonus()) {
          readBonusTarget();
        }
      },
      hofTarget: () => pinTarget,
      // The models stay loaded for the session: only what a world made itself counts
      geometries: () => (engine ? engine.renderer.info.memory.geometries - (models ? models.geometryCount : 0) : 0),
      textures: () => (engine ? engine.renderer.info.memory.textures : 0)
    };
  }

  function stop() {
    if (stopped) {
      return;
    }
    stopped = true;
    stopBackgroundMusic();
    closeWorld();
    if (fx) {
      fx.dispose();
    }
    if (models) {
      models.dispose();
    }
    if (engine) {
      engine.dispose();
    }
    if (pig) {
      pig.dispose();
    }
    disposeInput();
    for (const cleanup of cleanups) {
      cleanup();
    }
    sound.dispose();
    hud.dispose();
    document.documentElement.classList.remove("guinea-run-open");
    if (window.__guineaRun) {
      delete window.__guineaRun;
    }
    if (previousFocus && previousFocus.focus) {
      previousFocus.focus({ preventScroll: true });
    }
    active = null;
    if (options.onExit) {
      options.onExit();
    }
  }

  boot();
  return { stop };
}

/** A small round Lightning stage for the map, under the guinea pig. */
function createShowroom(THREE) {
  const group = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.7, 0.2, 48), new THREE.MeshStandardMaterial({ color: 0xf3f5f7, roughness: 0.8 }));
  disc.position.y = -0.1;
  disc.receiveShadow = true;
  group.add(disc);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.05, 8, 64), new THREE.MeshStandardMaterial({ color: 0x0176d3, roughness: 0.4 }));
  rim.rotation.x = Math.PI / 2;
  group.add(rim);
  return group;
}

/** The lab links of a language, written at build time by scripts/build/site.mjs. */
async function loadLabs(base, lang) {
  try {
    const module = await import(base + "labs.js");
    const table = (module.LABS && (module.LABS[lang] || module.LABS.en)) || {};
    const root = new URL("../../../", base);
    const result = {};
    for (const [id, lab] of Object.entries(table)) {
      result[id] = { title: lab.title, url: new URL(lab.url, root).href };
    }
    return result;
  } catch {
    // A local copy built without labs.js still plays: its cards name the labs without a link
    return {};
  }
}

function loadStylesheet(href) {
  if (document.getElementById("guinea-run-css")) {
    return;
  }
  const link = document.createElement("link");
  link.id = "guinea-run-css";
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

function webglAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}
