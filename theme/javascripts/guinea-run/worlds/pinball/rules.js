/*
 * The rules of Pipeline Pinball: points, balls, the promotion ladder, locks and
 * Deploy to all orgs, the scoop and its missions, Release day and the levels.
 * No Three.js and no page here: the rules read the events of the physics and
 * tell the world module what to show through `out`, so
 * scripts/guinea-run/pinball.test.mjs plays them in Node.
 *
 * Everything that must survive a pause lives in `s`, a plain object: the
 * checkpoint saves it as is. What only matters for the ball on screen (a ball
 * held in the scoop, balls waiting to be launched) lives in `rt` and is
 * rebuilt on a resume, which serves the ball again from the plunger.
 *
 * out: say(kind, key, vars) (kind: toast, coach, tip, chat), sound(name),
 * event(name, data), text(key), onBeat().
 */
import { TABLE } from "./layout.js";
import { GRAVITY } from "./physics.js";
import { MISSIONS, WIZARD, MISSION_COUNT } from "./missions.js";

export const BALLS_PER_GAME = 3;
const COMBO_WINDOW = 3.5;
const SCOOP_HOLD = 1.1;
const SELECT_HOLD = 3.2;
const RELEASE_HOLD = 1.2;
const DROPS_RESET_S = 1.2;
const LAUNCH_SPEED = 62;
const NOTE_LIFE = 25;
// Replay scores: passing one knocks, and gives an extra ball (a free game on the arcade)
const REPLAYS = [5000000, 25000000, 75000000, 150000000, 300000000];
// A rollover seen again within this is the same ball on the same switch
const ROLLOVER_GAP = 0.35;
// The sf hardis terminal: real commands, each with what it does to the table
const COMMANDS = [
  { cmd: "hardis:org:monitor:backup", key: "pbCmdBackup", effect: "save" },
  { cmd: "hardis:work:save", key: "pbCmdSave", effect: "extra" },
  { cmd: "hardis:project:deploy:smart", key: "pbCmdDeploy", effect: "lock" },
  { cmd: "hardis:doc:project2markdown", key: "pbCmdDoc", effect: "bonusX" },
  { cmd: "hardis:org:diagnose:unusedlicenses", key: "pbCmdLicenses", points: 250000 },
  { cmd: "hardis:org:diagnose:audittrail", key: "pbCmdAudit", effect: "note" },
  { cmd: "hardis:work:new", key: "pbCmdNew", effect: "mission" },
  { cmd: "hardis:org:monitor:all", key: "pbCmdMonitor", effect: "kickback" },
  { cmd: "hardis:project:clean:references", key: "pbCmdClean", effect: "drops" },
  { cmd: "hardis:project:audit:apiversion", key: "pbCmdApi", points: 150000 },
  { cmd: "hardis:org:diagnose:legacyapi", key: "pbCmdLegacy", points: 200000 }
];
const TERMINAL_HOLD = 2.8;
// The Rollback kick: fast enough to clear the inlane post every time
const KICKBACK_SPEED = 30;
// An admin in production: a raid now and then, and the time to catch him
const RAID_FIRST = 45;
const RAID_EVERY = 60;
const RAID_TIME = 15;
// Validate, then Quick deploy: the check runs, then the production ramp stays open this long
const VALIDATE_S = 3;
const QUICK_S = 12;
const DOUBLE_S = 20;
const MAJOR = ["integration", "uat", "preprod", "orbitRight", "production"];
// Deploy to all orgs: each round of jackpots is worth one step more, its shots
// change colour (blue, green, yellow, orange, red), and the super jackpot pays
// back every jackpot of the round
const JACKPOT = 400000;
const JACKPOT_COLORS = [0x1b96ff, 0x45c65a, 0xffd23f, 0xfe9339, 0xea001e];
const SUPER_MIN = 1500000;
// The orbits made one after the other: each loop pays more, up to ten
const LOOP_WINDOW = 3.5;
const LOOP_MAX = 10;
const LOOP_EXTRA = 6;
// The whole pipeline in one go: integration, uat, preprod, then production,
// each shot within PIPELINE_WINDOW of the one before
const PIPELINE = ["integration", "uat", "preprod", "production"];
const PIPELINE_WINDOW = 6;
const PIPELINE_AWARD = 1500000;
// Back from production, a bug: a Hotfix hurry-up, worth less every second
const HURRY_START = 1000000;
const HURRY_FLOOR = 100000;
const HURRY_S = 20;
// A soft plunge straight into the sf hardis terminal: the secret skill shot
const SECRET_SKILL = 750000;
// The light modes: off, on, slow blink, fast blink
export const OFF = 0;
export const ON = 1;
export const BLINK = 2;
export const FAST = 3;

/** A new game's state. */
export function newState() {
  return {
    v: 1,
    score: 0,
    clock: 0,
    ballNo: 1,
    extraBalls: 0,
    extraLit: false,
    level: 1,
    done: new Array(MISSION_COUNT).fill(false),
    missionsTotal: 0,
    missionsThisLevel: 0,
    notes: 0,
    note: null,
    mission: null,
    select: 0,
    promo: 0,
    productionForced: false,
    locks: 0,
    lockLit: false,
    mb: null,
    bonusX: 1,
    stats: { bumpers: 0, ramps: 0, targets: 0, missions: 0 },
    drops: [true, true, true, true, true],
    checks: [false, false, false],
    backups: [false, false, false],
    quality: [false, false, false],
    lanes: [false, false, false],
    // Rollback is lit in both outlanes when the game starts
    kickback: true,
    kickbackR: true,
    saveUntil: 0,
    saveArmed: true,
    skill: null,
    combo: 0,
    lastMajor: -10,
    tilt: 0,
    tilted: false,
    smHits: 0,
    replayNext: 0,
    flowHits: 0,
    flowDone: false,
    retrofit: false,
    lostPromo: 0,
    lastCommand: -1,
    smDownUntil: 0,
    loops: 0,
    lastLoop: -10,
    chain: 0,
    lastChain: -10,
    hurry: null,
    over: false
  };
}

export function createRules(table, out, random) {
  const physics = table.physics;
  const parts = table.parts;
  let s = newState();
  // Kicks vary a little, as real coils do: no shot repeats itself forever
  physics.setJitter(() => (random() - 0.5) * 0.14);
  const rt = {
    pending: [],
    scoop: null,
    release: null,
    hotfix: null,
    terminal: null,
    raid: null,
    raidAt: RAID_FIRST,
    validating: 0,
    quickUntil: 0,
    doubleUntil: 0,
    dropsResetAt: 0,
    nextBallAt: 0,
    ending: false,
    served: false,
    laneAt: [-1, -1, -1],
    matched: false,
    overAt: 0
  };

  // The lights the view draws: the state lights them, a mission lights over them
  const lights = table.lights.map((l) => ({ id: l.id, mode: OFF, color: l.color, base: l.color }));
  const lightIndex = new Map(lights.map((l, i) => [l.id, i]));

  const api = {
    award: (points, key, vars) => award(points, key, vars),
    done: () => endMission(true),
    fail: (key, tip) => {
      out.say("tip", tip || key);
      endMission(false, key);
    },
    light(id, mode, color) {
      if (!s.mission) {
        return;
      }
      s.mission.lights[id] = [mode, color || 0];
    },
    say: (kind, key, vars) => out.say(kind, key, vars),
    text: (key) => out.text(key),
    random,
    shuffle(list) {
      const a = list.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    setGiant: (on) => out.event("giant", on),
    resetDrops,
    addBall: (save) => {
      launchLater(0.4);
      s.saveUntil = Math.max(s.saveUntil, s.clock + (save || 8));
    },
    onBeat: () => out.onBeat(),
    openProduction(on) {
      s.productionForced = on;
    },
    admin(i, up) {
      parts.admins[i].enabled = up;
      out.event("admin", { i, up });
    },
    /** The Sales Manager up in front of the Release hole, or down for a while. */
    salesManager(up) {
      s.smDownUntil = up ? 0 : s.clock + 25;
    }
  };

  /* ---------- Points ---------- */

  function levelMult() {
    return 1 + 0.5 * (s.level - 1);
  }

  function award(points, key, vars) {
    // A Quick deploy doubles everything for a while
    const value = Math.round(points * levelMult() * (s.clock < rt.doubleUntil ? 2 : 1));
    s.score += value;
    if (key) {
      out.say("toast", key, Object.assign({ points: value }, vars || {}));
    }
    // A replay score passed: the knocker, and an extra ball
    if (s.replayNext < REPLAYS.length && s.score >= REPLAYS[s.replayNext]) {
      s.replayNext++;
      s.extraBalls++;
      out.say("coach", "pbReplay");
      out.sound("pbExtra");
    }
    return value;
  }

  /* ---------- Balls ---------- */

  function serve() {
    const ball = physics.addBall(TABLE.plunger.x, TABLE.plunger.y + 0.55, 0, 0, 0);
    s.saveArmed = true;
    s.skill = { lane: Math.floor(random() * 3), until: 0, done: false };
    rt.served = true;
    return ball;
  }

  function launchLater(delay) {
    rt.pending.push(s.clock + delay);
  }

  function inPlay() {
    return physics.activeBalls() + rt.pending.length;
  }

  function setFlippers(on) {
    for (const f of Object.values(parts.flippers)) {
      f.enabled = on;
      if (!on) {
        f.held = false;
      }
    }
  }

  function drained() {
    const left = inPlay();
    if (!s.tilted && s.clock < s.saveUntil) {
      launchLater(0.8);
      out.say("toast", "pbBallSaved", {}, "good");
      out.sound("pbSave");
      return;
    }
    if (left > 0) {
      if (left === 1) {
        endMultiball();
      }
      return;
    }
    endBall();
  }

  function endMultiball() {
    if (s.mb) {
      s.mb = null;
      s.locks = 0;
      out.event("multiball", false);
    }
    if (s.mission && s.mission.id === "wizard") {
      endMission(false);
    }
  }

  function endBall() {
    rt.ending = true;
    endRaid(false);
    rt.validating = 0;
    rt.quickUntil = 0;
    if (s.mission) {
      endMission(false);
    }
    s.mb = null;
    const lines = [];
    let total = 0;
    if (!s.tilted) {
      const st = s.stats;
      const parts2 = [
        ["pbBonusRamps", st.ramps, 10000],
        ["pbBonusTargets", st.targets, 2500],
        ["pbBonusBumpers", st.bumpers, 500],
        ["pbBonusMissions", st.missions, 100000]
      ];
      for (const [key, n, each] of parts2) {
        if (n > 0) {
          const v = Math.round(n * each * levelMult());
          total += v;
          lines.push({ key, n, points: v });
        }
      }
      if (s.bonusX > 1) {
        lines.push({ key: "pbBonusX", n: s.bonusX, points: total * (s.bonusX - 1) });
        total *= s.bonusX;
      }
    }
    s.score += total;
    out.event("endOfBall", { lines, total, tilted: s.tilted });
    rt.nextBallAt = s.clock + 2.8;
  }

  function nextBall() {
    rt.ending = false;
    s.stats = { bumpers: 0, ramps: 0, targets: 0, missions: 0 };
    s.bonusX = 1;
    s.loops = 0;
    s.chain = 0;
    s.hurry = null;
    // The monster Flow is back for the new ball
    s.flowHits = 0;
    s.flowDone = false;
    parts.flow.enabled = true;
    out.event("flow", "spin");
    s.tilt = 0;
    s.tilted = false;
    s.combo = 0;
    setFlippers(true);
    physics.setKicks(true);
    if (s.extraBalls > 0) {
      s.extraBalls--;
      out.say("coach", "pbShootAgain");
      serve();
      return;
    }
    if (s.ballNo >= BALLS_PER_GAME) {
      // The match, as on the arcade: the last two digits of the score against a
      // number drawn now; a match is one more ball
      if (!rt.matched) {
        rt.matched = true;
        const drawn = Math.floor(random() * 10) * 10;
        const won = drawn === s.score % 100;
        out.event("match", { drawn, won });
        if (won) {
          s.extraBalls++;
          out.say("coach", "pbMatchWon");
          out.sound("pbExtra");
          s.extraBalls--;
          serve();
          return;
        }
      }
      rt.overAt = s.clock + 2.4;
      return;
    }
    s.ballNo++;
    out.say("coach", "pbBallN", { n: s.ballNo });
    serve();
  }

  function summary() {
    return { score: s.score, ms: Math.round(s.clock * 1000), level: s.level, missions: s.missionsTotal, notes: s.notes };
  }

  /* ---------- Missions ---------- */

  function missionDef(id) {
    return id === "wizard" ? WIZARD : MISSIONS[id];
  }

  function missionTime(def) {
    return Math.round(def.time * Math.max(0.7, 1 - 0.05 * (s.level - 1)));
  }

  function startMission(id) {
    const def = missionDef(id);
    s.mission = { id, m: { timeLeft: missionTime(def) }, lights: {} };
    def.start(s.mission.m, api);
    out.event("mission", { id, started: true });
    out.say("coach", id === "wizard" ? "pbReleaseDay" : "pbMission" + id);
    out.sound("pbMission");
  }

  function endMission(ok, why) {
    const mission = s.mission;
    if (!mission) {
      return;
    }
    const def = missionDef(mission.id);
    if (def.end) {
      def.end(mission.m, api);
    }
    s.mission = null;
    if (ok && mission.id === "wizard") {
      out.event("mission", { id: "wizard", ok: true });
      levelUp();
      return;
    }
    if (mission.id === "wizard") {
      out.event("mission", { id: "wizard", ok: false });
      levelUp();
      return;
    }
    if (ok) {
      s.done[mission.id] = true;
      s.missionsTotal++;
      s.missionsThisLevel++;
      s.stats.missions++;
      award(300000 + Math.round(mission.m.timeLeft) * 10000, "pbMissionDone");
      out.sound("pbJackpot");
      if (s.missionsThisLevel === 2 || s.missionsThisLevel === 6) {
        s.extraLit = true;
        out.say("toast", "pbExtraLit", {}, "good");
      }
      if (!s.note && random() < 0.4) {
        lightNote();
      }
    }
    out.event("mission", { id: mission.id, ok, why: why || "" });
    s.select = nextMission(s.select);
  }

  function nextMission(from) {
    for (let k = 0; k < MISSION_COUNT; k++) {
      const id = (from + k) % MISSION_COUNT;
      if (!s.done[id]) {
        return id;
      }
    }
    return 0;
  }

  function allDone() {
    return s.done.every(Boolean);
  }

  function levelUp() {
    s.level++;
    s.done = new Array(MISSION_COUNT).fill(false);
    s.missionsThisLevel = 0;
    s.select = 0;
    s.extraLit = true;
    // The table keeps its speed: a level brings more points, a shorter ball save, longer missions
    out.event("level", s.level);
    out.say("coach", "pbNextLevel", { n: s.level });
  }

  // Generous at first, as the course is: 15 seconds, a little less at each level
  function saveTime() {
    return Math.max(6, 16 - s.level);
  }

  /* ---------- Shots ---------- */

  function shot(name, index) {
    const sh = { name, index: index || 0 };
    // Victor's note waits on one lit shot
    if (s.note && s.note.shot === name) {
      s.note = null;
      s.notes++;
      award(1000000, "pbNoteFound");
      out.event("note", s.notes);
    }
    if (name === "preprod" || name === "orbitRight") {
      loop();
    }
    pipeline(name);
    if (MAJOR.includes(name)) {
      s.combo = s.clock - s.lastMajor < COMBO_WINDOW ? Math.min(s.combo + 1, 5) : 1;
      s.lastMajor = s.clock;
      if (s.combo >= 2) {
        award(25000 * s.combo, "pbCombo", { n: s.combo });
        out.sound("pbCombo");
      }
    }
    if (s.mission) {
      const def = missionDef(s.mission.id);
      def.shot(s.mission.m, sh, api);
    }
    if (s.mb && !s.mission) {
      multiballShot(name);
    }
  }

  function multiballShot(name) {
    const mb = s.mb;
    const i = ["integration", "uat", "preprod"].indexOf(name);
    const step = mb.step || 0;
    if (i >= 0 && mb.lit[i]) {
      mb.lit[i] = false;
      const value = JACKPOT * (step + 1);
      mb.collected = (mb.collected || 0) + value;
      award(value, "pbJackpot", { n: step + 1 });
      out.event("jackpot", false);
      out.sound("pbJackpot");
      if (!mb.lit.some(Boolean)) {
        mb.superLit = true;
        out.say("coach", "pbSuperLit");
      }
    } else if (name === "production" && mb.superLit) {
      // The super jackpot pays back the round, then the next round is worth a step more
      mb.superLit = false;
      mb.lit = [true, true, true];
      award(Math.max(SUPER_MIN, mb.collected || 0), "pbSuperJackpot");
      mb.collected = 0;
      mb.step = Math.min(JACKPOT_COLORS.length - 1, step + 1);
      out.event("jackpot", true);
      out.sound("pbJackpot");
    }
  }

  /** An orbit made: a loop, worth more when it follows another one. */
  function loop() {
    s.loops = s.clock - s.lastLoop < LOOP_WINDOW ? Math.min(LOOP_MAX, s.loops + 1) : 1;
    s.lastLoop = s.clock;
    if (s.loops < 2) {
      return;
    }
    award(50000 * s.loops, "pbLoops", { n: s.loops });
    out.sound("pbCombo");
    if (s.loops === LOOP_EXTRA && !s.extraLit) {
      s.extraLit = true;
      out.say("toast", "pbExtraLit", {}, "good");
    }
  }

  /** Integration, uat, preprod, production, each one quickly after the other: the whole pipeline in one go. */
  function pipeline(name) {
    const at = PIPELINE.indexOf(name);
    if (at < 0) {
      return;
    }
    const inTime = s.clock - s.lastChain < PIPELINE_WINDOW;
    if (at === 0) {
      s.chain = 1;
    } else if (inTime && at === s.chain) {
      s.chain++;
    } else {
      s.chain = 0;
      return;
    }
    s.lastChain = s.clock;
    if (s.chain === PIPELINE.length) {
      s.chain = 0;
      award(PIPELINE_AWARD, "pbPipelineCombo");
      out.event("jackpot", true);
      out.sound("pbJackpot");
    }
  }

  /** The value of the Hotfix hurry-up now. */
  function hurryValue() {
    const left = Math.max(0, s.hurry.until - s.clock) / HURRY_S;
    return Math.round((HURRY_FLOOR + (HURRY_START - HURRY_FLOOR) * left) / 1000) * 1000;
  }

  function startHurry() {
    if (s.hurry || s.mb || s.tilted || (s.mission && s.mission.id === "wizard")) {
      return;
    }
    s.hurry = { until: s.clock + HURRY_S };
    out.say("coach", "pbHurryStart");
    out.sound("pbTiltWarn");
  }

  function promotion(name) {
    const want = ["integration", "uat", "preprod"][s.promo];
    if (s.promo < 3 && name === want) {
      s.promo++;
      award(20000 * s.promo, "pbPromo" + s.promo);
      if (s.promo === 3) {
        out.say("coach", "pbProductionOpen");
        out.sound("pbGate");
      }
    }
  }

  function startMultiball() {
    s.mb = { lit: [true, true, true], superLit: false, step: 0, collected: 0 };
    s.hurry = null;
    s.lockLit = false;
    launchLater(1);
    launchLater(2.2);
    s.saveUntil = s.clock + 14;
    out.event("multiball", true);
    out.say("coach", "pbMultiball");
    out.sound("pbMultiball");
  }

  function lightNote() {
    const shots = ["integration", "uat", "preprod", "orbitRight"];
    s.note = { shot: shots[Math.floor(random() * shots.length)], until: s.clock + NOTE_LIFE };
    out.say("toast", "pbNoteLit", {}, "good");
  }

  function resetDrops() {
    for (let i = 0; i < 5; i++) {
      s.drops[i] = true;
      parts.drops[i].enabled = true;
    }
    out.event("drops", null);
  }

  function scoopEnter(ball) {
    award(15000, "");
    shot("scoop");
    // A change made by hand in production, retrofitted through a Pull Request
    if (s.retrofit) {
      s.retrofit = false;
      s.promo = Math.max(s.promo, s.lostPromo);
      s.lostPromo = 0;
      award(100000, "pbRetrofitDone");
      out.sound("pbSave");
    }
    // Release day once the ten are done; otherwise a mission, picked with the flippers while the ball waits
    if (!s.mission && !s.mb && !rt.ending) {
      if (allDone()) {
        rt.scoop = { ball, until: s.clock + 2.2, start: "wizard" };
        out.say("coach", "pbReleaseDayReady");
        return;
      }
      s.select = nextMission(s.select);
      rt.scoop = { ball, until: s.clock + SELECT_HOLD, start: "select" };
      out.event("select", s.select);
      return;
    }
    if (s.extraLit) {
      s.extraLit = false;
      s.extraBalls++;
      out.say("coach", "pbExtraBall");
      out.sound("pbExtra");
    }
    rt.scoop = { ball, until: s.clock + SCOOP_HOLD, start: null };
  }

  function ejectScoop() {
    const hold = rt.scoop;
    rt.scoop = null;
    if (hold.start === "wizard") {
      startMission("wizard");
    } else if (hold.start === "select") {
      out.event("select", -1);
      startMission(s.select);
    }
    if (hold.ball.active && hold.ball.mode === "held") {
      // Onto the right flipper, never twice exactly the same way
      physics.release(hold.ball, 4.4 + (random() - 0.5) * 1.4, -12.4 + (random() - 0.5) * 2.2);
      out.sound("pbKick");
    }
  }

  /* ---------- Physics events ---------- */

  function event(e) {
    if (s.over) {
      return;
    }
    const tag = e.tag;
    switch (e.type) {
      case "drain":
        drained();
        return;
      case "hit":
        hit(tag, e);
        return;
      case "cross":
        cross(tag, e);
        return;
      case "ramp":
        return;
      case "rampDone":
        rampDone(tag, e);
        return;
      case "rampBack":
        return;
      case "enter":
        if (tag === "scoop") {
          scoopEnter(e.ball);
        } else if (tag === "terminal") {
          award(20000, "");
          // A plunge soft enough to drop into the terminal: the secret skill shot
          if (s.skill && !s.skill.done && s.clock < s.skill.until) {
            s.skill.done = true;
            award(SECRET_SKILL, "pbSecretSkill");
            out.sound("pbJackpot");
          }
          shot("terminal");
          rt.terminal = { ball: e.ball, until: s.clock + TERMINAL_HOLD };
          runCommand();
        } else if (tag === "flow") {
          flowEnter();
        } else if (tag === "hotfix") {
          // A hotfix goes straight round the loop to the left inlane
          if (s.hurry) {
            award(hurryValue(), "pbHurryDone");
            s.hurry = null;
            out.event("jackpot", false);
          }
          award(50000, "pbHotfix");
          shot("hotfix");
          out.sound("pbLock");
          rt.hotfix = { ball: e.ball, until: s.clock + 0.7 };
        } else if (tag === "release") {
          award(250000, "pbReleased");
          shot("release");
          out.sound("pbJackpot");
          rt.release = { ball: e.ball, until: s.clock + RELEASE_HOLD };
        }
        return;
      default:
        return;
    }
  }

  function hit(tag, e) {
    if (s.tilted) {
      return;
    }
    if (tag.startsWith("bumper")) {
      s.stats.bumpers++;
      award(2500, "");
      out.sound("pbBumper");
      out.event("bumper", Number(tag.slice(6)));
      shot("bumper", Number(tag.slice(6)));
    } else if (tag === "slingL" || tag === "slingR") {
      award(510, "");
      out.sound("pbSling");
      out.event("sling", tag === "slingL" ? 0 : 1);
    } else if (tag.startsWith("drop")) {
      const i = Number(tag.slice(4));
      if (!s.drops[i]) {
        return;
      }
      s.drops[i] = false;
      parts.drops[i].enabled = false;
      s.stats.targets++;
      award(5000, "");
      out.sound("pbDrop");
      out.event("drops", i);
      shot("drop", i);
      if (!s.drops.some(Boolean) && !s.mission) {
        award(25000, s.lockLit || s.locks >= 3 ? "pbChangesAll" : "pbLockLit");
        if (!s.mb) {
          s.lockLit = true;
        }
        rt.dropsResetAt = s.clock + DROPS_RESET_S;
      }
    } else if (tag.startsWith("check")) {
      const i = Number(tag.slice(5));
      s.checks[i] = true;
      s.stats.targets++;
      award(3000, "");
      out.sound("pbTarget");
      shot("check", i);
      if (s.checks.every(Boolean)) {
        s.checks = [false, false, false];
        if (!s.kickback || !s.kickbackR) {
          s.kickback = true;
          s.kickbackR = true;
          award(15000, "pbKickbackLit");
        } else {
          award(15000, "pbChecksGreen");
        }
      }
    } else if (tag.startsWith("backup")) {
      const i = Number(tag.slice(6));
      s.backups[i] = true;
      s.stats.targets++;
      award(4000, "");
      out.sound("pbTarget");
      shot("backup", i);
      if (s.backups.every(Boolean)) {
        // A backup restored: a second chance, the ball save starts again
        s.backups = [false, false, false];
        s.saveUntil = Math.max(s.saveUntil, s.clock + 10);
        award(30000, "pbBackupRestored");
        out.sound("pbSave");
      }
    } else if (tag.startsWith("quality")) {
      const i = Number(tag.slice(7));
      s.quality[i] = true;
      s.stats.targets++;
      award(4000, "");
      out.sound("pbTarget");
      out.event("quality", i);
      shot("quality", i);
      if (s.quality.every(Boolean)) {
        // The quality gate passed: one more step of the bonus multiplier
        s.quality = [false, false, false];
        if (s.bonusX < 10) {
          s.bonusX++;
        }
        award(25000, "pbQualityGate", { n: s.bonusX });
      }
    } else if (tag === "validate") {
      award(5000, "");
      out.sound("pbTarget");
      shot("validate");
      // The check runs; once green, the production ramp waits for a Quick deploy
      if (!rt.validating && s.clock >= rt.quickUntil) {
        rt.validating = s.clock + VALIDATE_S;
        out.event("validate", "start");
        out.say("toast", "pbValidating", {}, "good");
      }
    } else if (tag.startsWith("admin")) {
      const i = Number(tag.slice(5));
      award(5000, "");
      out.sound("pbTarget");
      shot("admin", i);
      if (rt.raid && rt.raid.i === i) {
        endRaid(true);
      }
    } else if (tag === "rabbit") {
      award(15000, "");
      out.sound("pbBumper");
      out.event("rabbit", null);
      shot("rabbit");
    } else if (tag === "salesManager") {
      out.sound("pbTarget");
      out.event("salesManager", null);
      shot("salesManager");
      if (!(s.mission && s.mission.id === "wizard")) {
        s.smHits++;
        if (s.smHits >= 2) {
          s.smHits = 0;
          s.smDownUntil = s.clock + 25;
          award(50000, "pbApproved");
        } else {
          out.say("chat", "pbSalesManagerNo");
        }
      }
    } else if (tag.startsWith("upperCheck")) {
      s.stats.targets++;
      award(8000, "");
      out.sound("pbTarget");
    } else if (tag === "flipper") {
      out.event("flipperHit", e.value);
    }
  }

  function cross(tag, e) {
    if (tag === "upperDrain" && e.value > 0) {
      physics.sendOnPath(e.ball, parts.paths.down, 4);
      return;
    }
    if (s.tilted) {
      return;
    }
    if ((tag === "kickback" || tag === "kickbackR") && e.value > 0) {
      const left = tag === "kickback";
      if (left ? s.kickback : s.kickbackR) {
        if (left) {
          s.kickback = false;
        } else {
          s.kickbackR = false;
        }
        // The bank closes the outlane over its top: the kick lifts the ball over the inlane post
        physics.sendOnPath(e.ball, left ? parts.kickPaths.left : parts.kickPaths.right, KICKBACK_SPEED);
        out.say("toast", "pbKickback", {}, "good");
        out.sound("pbKick");
      }
      return;
    }
    // A rollover fires whichever way the ball rolls over it: down from the
    // plunge, or up out of the bumpers
    if (tag.startsWith("lane")) {
      const i = Number(tag.slice(4));
      if (s.clock - rt.laneAt[i] > ROLLOVER_GAP) {
        rt.laneAt[i] = s.clock;
        laneCross(i);
      }
      return;
    }
    if (tag === "spinner") {
      const spins = Math.max(1, Math.min(12, Math.round(Math.abs(e.value) / 6)));
      award(600 * spins, "");
      out.sound("pbSpin");
      out.event("spinner", spins);
      shot("spinner", spins);
      return;
    }
    if (tag === "orbitLeft" && e.value > 0) {
      s.stats.ramps++;
      award(20000, "");
      out.sound("pbOrbit");
      shot("preprod");
      promotion("preprod");
      superSkill();
      return;
    }
    if (tag === "orbitRight" && e.value > 0) {
      s.stats.ramps++;
      award(10000, "");
      out.sound("pbOrbit");
      shot("orbitRight");
      return;
    }
    if ((tag === "outlaneL" || tag === "outlaneR") && e.value > 0) {
      award(10000, "");
      shot("outlane");
      return;
    }
    if ((tag === "inlaneL" || tag === "inlaneR") && e.value > 0) {
      award(1000, "");
    }
  }

  function laneCross(i) {
    award(2000, "");
    out.sound("pbLane");
    if (s.skill && !s.skill.done && s.clock < s.skill.until) {
      s.skill.done = true;
      if (i === s.skill.lane) {
        s.skill.super = s.clock + 6;
        award(100000, "pbSkillShot");
        out.sound("pbJackpot");
      }
    }
    s.lanes[i] = true;
    if (s.lanes.every(Boolean)) {
      s.lanes = [false, false, false];
      if (s.bonusX < 10) {
        s.bonusX++;
      }
      award(10000, "pbBonusXUp", { n: s.bonusX });
    }
  }

  function superSkill() {
    if (s.skill && s.skill.super && s.clock < s.skill.super) {
      s.skill.super = 0;
      award(400000, "pbSuperSkill");
      out.sound("pbJackpot");
    }
  }

  function rampDone(tag, e) {
    if (tag === "integration" || tag === "uat") {
      s.stats.ramps++;
      award(25000, "");
      out.sound("pbRamp");
      if (tag === "integration" && s.lockLit && !s.mb && !s.mission) {
        s.locks++;
        s.lockLit = false;
        if (s.locks >= 3) {
          startMultiball();
        } else {
          award(50000, "pbLocked", { n: s.locks });
          out.sound("pbLock");
        }
      }
      shot(tag);
      promotion(tag);
    } else if (tag === "production") {
      s.stats.ramps++;
      // The promotion is spent once the ramp is made, never on the way up: a
      // ball too slow for it rolls back through the gate, never in front of it
      if (s.promo >= 3 && !s.productionForced && !(s.mb && s.mb.superLit) && s.clock >= rt.quickUntil) {
        s.promo = 0;
      }
      if (s.clock < rt.quickUntil) {
        // Validated, then deployed in no time: everything scores double for a while
        rt.quickUntil = 0;
        rt.doubleUntil = s.clock + DOUBLE_S;
        award(200000, "pbQuickDeploy");
        out.event("jackpot", false);
        out.sound("pbJackpot");
      }
      award(100000, "pbProduction");
      out.sound("pbRamp");
      shot("production");
      out.event("upper", true);
    } else if (tag === "down" || tag === "releaseWire") {
      out.event("upper", false);
      startHurry();
    }
    void e;
  }

  /* ---------- Lights ---------- */

  function setLight(id, mode, color) {
    const i = lightIndex.get(id);
    if (i === undefined) {
      return;
    }
    lights[i].mode = mode;
    lights[i].color = color || lights[i].base;
  }

  function refreshLights() {
    for (const l of lights) {
      l.mode = OFF;
      l.color = l.base;
    }
    const promoNames = ["integration", "uat", "preprod"];
    promoNames.forEach((n, i) => setLight("promo-" + n, s.promo > i ? ON : OFF));
    if (!s.mb && s.promo < 3) {
      setLight("shot-" + promoNames[s.promo], BLINK);
    }
    if (productionOpen()) {
      setLight("shot-production", s.mb && s.mb.superLit ? FAST : BLINK);
    }
    for (let i = 0; i < 3; i++) {
      setLight("lock" + i, i < s.locks ? ON : i === s.locks && s.lockLit ? FAST : OFF);
    }
    if (s.lockLit) {
      setLight("shot-integration", FAST, 0xfe9339);
    }
    if (s.mb) {
      const color = JACKPOT_COLORS[s.mb.step || 0];
      ["integration", "uat", "preprod"].forEach((n, i) => s.mb.lit[i] && setLight("shot-" + n, FAST, color));
    }
    for (let i = 0; i < 5; i++) {
      setLight("drop" + i, s.drops[i] ? ON : OFF);
    }
    for (let i = 0; i < 3; i++) {
      setLight("backup" + i, s.backups[i] ? ON : OFF);
      setLight("quality" + i, s.quality[i] ? ON : OFF);
      setLight("check" + i, s.checks[i] ? ON : OFF);
      setLight("lane" + i, s.lanes[i] ? ON : s.skill && !s.skill.done && s.skill.lane === i && rt.served ? FAST : OFF);
    }
    setLight("kickback", s.kickback ? ON : OFF);
    setLight("kickbackR", s.kickbackR ? ON : OFF);
    setLight("shot-hotfix", s.hurry ? FAST : BLINK);
    setLight("shot-terminal", rt.terminal ? FAST : BLINK);
    setLight("validate", rt.validating ? FAST : s.clock < rt.quickUntil ? ON : BLINK);
    if (s.clock < rt.quickUntil) {
      setLight("shot-production", FAST, 0x45c65a);
    }
    if (s.retrofit) {
      setLight("shot-scoop", FAST, 0xea001e);
    }
    // Shoot again: blinking while the ball is saved, lit while an extra ball waits
    setLight("ballSave", s.clock < s.saveUntil ? (s.saveUntil - s.clock < 2 ? FAST : BLINK) : s.extraBalls > 0 ? ON : OFF);
    setLight("extraBall", s.extraLit ? BLINK : OFF);
    if (s.extraLit && !s.mission) {
      setLight("shot-scoop", BLINK, 0xfe9339);
    }
    if (!s.mission && !s.mb) {
      setLight("shot-scoop", allDone() ? FAST : BLINK);
    }
    for (let i = 0; i < MISSION_COUNT; i++) {
      setLight("mission" + i, s.done[i] ? ON : s.mission && s.mission.id === i ? FAST : rt.scoop && rt.scoop.start === "select" && s.select === i ? FAST : OFF);
    }
    // The ladder fills with the missions done on this level; Release day blinks once all ten are
    const rungs = Math.floor((s.missionsThisLevel * 6) / MISSION_COUNT);
    for (let i = 0; i < 6; i++) {
      setLight("ladder" + i, i < rungs ? ON : i === rungs && !allDone() ? BLINK : OFF);
    }
    setLight("missionWizard", s.mission && s.mission.id === "wizard" ? FAST : allDone() ? BLINK : OFF);
    if (s.note) {
      setLight("note", FAST);
      setLight("shot-" + s.note.shot, FAST, 0xdd7a01);
    }
    setLight("release", s.clock >= s.smDownUntil ? OFF : BLINK);
    if (s.mission) {
      for (const [id, [mode, color]] of Object.entries(s.mission.lights)) {
        setLight(id, mode, color);
      }
    }
    if (s.tilted) {
      for (const l of lights) {
        l.mode = OFF;
      }
    }
  }

  function productionOpen() {
    return s.promo >= 3 || s.productionForced || Boolean(s.mb && s.mb.superLit) || s.clock < rt.quickUntil;
  }

  /** A ball on the production ramp or in the chute under it: the gate must not close on it. */
  function ballInChute() {
    const gate = parts.productionGate;
    for (const b of physics.balls) {
      if (!b.active) {
        continue;
      }
      if (b.mode === "path" && b.path === parts.paths.production) {
        return true;
      }
      if (b.mode === "table" && b.floor === 0 && Math.abs(b.x - (gate.ax + gate.bx) / 2) < 0.75 && b.y > gate.ay - 0.6 && b.y < gate.ay + 1.2) {
        return true;
      }
    }
    return false;
  }

  /* ---------- The sf hardis terminal, the monster Flow, the admins in production ---------- */

  function runCommand() {
    let i = Math.floor(random() * COMMANDS.length);
    if (i === s.lastCommand) {
      i = (i + 1) % COMMANDS.length;
    }
    s.lastCommand = i;
    const c = COMMANDS[i];
    const vars = {};
    switch (c.effect) {
      case "save":
        s.saveUntil = Math.max(s.saveUntil, s.clock + 15);
        break;
      case "extra":
        s.extraLit = true;
        break;
      case "lock":
        if (!s.mb && s.locks < 3) {
          s.lockLit = true;
        }
        break;
      case "bonusX":
        s.bonusX = Math.min(10, s.bonusX + 1);
        vars.n = s.bonusX;
        break;
      case "note":
        if (!s.note) {
          lightNote();
        }
        break;
      case "mission":
        if (!s.mission && !s.mb && !allDone()) {
          s.select = nextMission(s.select);
          startMission(s.select);
        }
        break;
      case "kickback":
        s.kickback = true;
        s.kickbackR = true;
        break;
      case "drops":
        resetDrops();
        break;
      default:
        break;
    }
    out.event("terminal", { cmd: "sf " + c.cmd, key: c.key });
    award(c.points || 50000, c.key, vars);
    out.sound("pbLock");
  }

  function flowEnter() {
    if (s.flowDone || s.tilted) {
      return;
    }
    s.flowHits++;
    shot("flow");
    out.event("flow", "hit");
    if (s.flowHits >= 3) {
      // Three times through it: the monster Flow is refactored into Apex, and stops
      s.flowDone = true;
      parts.flow.enabled = false;
      award(300000, "pbFlowRefactored");
      out.event("flow", "apex");
      out.sound("pbJackpot");
    } else {
      award(10000, "pbFlowHit", { n: s.flowHits });
    }
  }

  function startRaid() {
    const i = Math.floor(random() * parts.admins.length);
    parts.admins[i].enabled = true;
    out.event("admin", { i, up: true });
    rt.raid = { i, until: s.clock + RAID_TIME };
    out.event("raid", "start");
    out.say("chat", "pbRaidAdmin", { admin: i });
    out.say("chat", "pbRaid");
    out.sound("pbTiltWarn");
  }

  function endRaid(caught) {
    const raid = rt.raid;
    if (!raid) {
      return;
    }
    rt.raid = null;
    parts.admins[raid.i].enabled = false;
    out.event("admin", { i: raid.i, up: false });
    rt.raidAt = s.clock + RAID_EVERY + random() * RAID_EVERY;
    if (caught) {
      award(300000, "pbRaidCaught");
      out.event("raid", "caught");
      out.sound("pbJackpot");
      return;
    }
    if (rt.ending) {
      return;
    }
    // A change in production that is not in git: the promotion is lost until it is retrofitted
    s.lostPromo = Math.max(s.lostPromo, s.promo);
    s.promo = 0;
    s.retrofit = true;
    out.event("raid", "missed");
    out.say("tip", "pbRaidMissed");
  }

  /* ---------- The clock ---------- */

  function update(dt) {
    if (s.over) {
      return;
    }
    s.clock += dt;
    for (let i = rt.pending.length - 1; i >= 0; i--) {
      if (s.clock >= rt.pending[i] && !physics.ballOnPlunger()) {
        rt.pending.splice(i, 1);
        const ball = physics.addBall(TABLE.plunger.x, TABLE.plunger.y + 0.6, 0, LAUNCH_SPEED, 0);
        if (ball) {
          out.sound("pbKick");
        }
      }
    }
    if (rt.scoop && s.clock >= rt.scoop.until) {
      ejectScoop();
    }
    if (rt.release && s.clock >= rt.release.until) {
      const ball = rt.release.ball;
      rt.release = null;
      if (ball.active && ball.mode === "held") {
        physics.sendOnPath(ball, parts.paths.release, 7);
      }
    }
    if (rt.hotfix && s.clock >= rt.hotfix.until) {
      const ball = rt.hotfix.ball;
      rt.hotfix = null;
      if (ball.active && ball.mode === "held") {
        // An up-kicker: hard enough to climb the whole loop
        physics.sendOnPath(ball, parts.paths.hotfix, 42);
      }
    }
    if (rt.terminal && s.clock >= rt.terminal.until) {
      const ball = rt.terminal.ball;
      rt.terminal = null;
      if (ball.active && ball.mode === "held") {
        physics.release(ball, 1.6 + (random() - 0.5), -2.5);
        out.sound("pbKick");
      }
    }
    if (rt.validating && s.clock >= rt.validating) {
      rt.validating = 0;
      rt.quickUntil = s.clock + QUICK_S;
      out.event("validate", "done");
      out.say("coach", "pbValidated");
      out.sound("pbGate");
    }
    // An admin walks in now and then, when nothing else is going on
    const busy = rt.ending || s.mb || s.saveArmed || (s.mission && (s.mission.id === 9 || s.mission.id === "wizard"));
    if (!rt.raid && !busy && s.clock >= rt.raidAt) {
      startRaid();
    }
    if (rt.raid && s.clock >= rt.raid.until) {
      endRaid(false);
    }
    if (rt.dropsResetAt && s.clock >= rt.dropsResetAt) {
      rt.dropsResetAt = 0;
      resetDrops();
    }
    if (rt.ending && s.clock >= rt.nextBallAt && !rt.overAt) {
      nextBall();
    }
    if (rt.overAt && s.clock >= rt.overAt) {
      rt.overAt = 0;
      s.over = true;
      out.event("gameOver", summary());
      return;
    }
    if (s.mission) {
      const m = s.mission.m;
      const def = missionDef(s.mission.id);
      if (def.update) {
        def.update(m, dt, api);
      }
      if (s.mission && !(def.frozen && def.frozen(s.mission.m))) {
        s.mission.m.timeLeft -= dt;
        if (s.mission.m.timeLeft <= 0) {
          endMission(false, "pbTimeUp");
        }
      }
    }
    if (s.note && s.clock > s.note.until) {
      s.note = null;
    }
    if (s.hurry && s.clock > s.hurry.until) {
      s.hurry = null;
      out.say("tip", "pbHurryMissed");
    }
    s.tilt = Math.max(0, s.tilt - dt * 0.45);
    // The rabbit walks across the Production floor, faster when it is the mission
    const pace = s.mission && (s.mission.id === 8 || s.mission.id === "wizard") ? 1.5 : 0.8;
    const r = parts.rabbit;
    const x = Math.sin(s.clock * pace) * 2.0;
    r.vx = (x - r.ax) / Math.max(dt, 1e-3);
    r.ax = x;
    r.bx = x;
    parts.salesManager.enabled = s.clock >= s.smDownUntil;
    parts.productionGate.enabled = !productionOpen() && !ballInChute();
    refreshLights();
  }

  return {
    lights,
    get state() {
      return s;
    },
    get over() {
      return s.over;
    },
    /** Starts a new game: the first ball on the plunger. */
    newGame() {
      s = newState();
      physics.setGravity(GRAVITY);
      resetDrops();
      setFlippers(true);
      physics.setKicks(true);
      rt.matched = false;
      rt.overAt = 0;
      rt.raidAt = RAID_FIRST;
      parts.flow.enabled = true;
      serve();
    },
    /** The state to save, as plain data. */
    snapshot() {
      return JSON.parse(JSON.stringify(s));
    },
    /** Back where a saved game was: the ball waits on the plunger, saved. */
    restore(saved) {
      s = Object.assign(newState(), saved);
      s.mb = null;
      physics.setGravity(GRAVITY);
      for (let i = 0; i < 5; i++) {
        parts.drops[i].enabled = s.drops[i];
      }
      for (const a of parts.admins) {
        a.enabled = false;
      }
      parts.flow.enabled = !s.flowDone;
      // A resumed game is a fresh ball: never tilted
      s.tilted = false;
      s.tilt = 0;
      setFlippers(true);
      physics.setKicks(true);
      serve();
      s.saveUntil = 0;
      if (s.mission) {
        // A mission that needs more balls gets them back
        if (s.mission.id === "wizard") {
          for (let i = 0; i < 3; i++) {
            launchLater(1 + i);
          }
        } else if (s.mission.id === 6) {
          launchLater(1);
        } else if (s.mission.id === 1) {
          out.event("giant", true);
        }
      }
      refreshLights();
    },
    update,
    event,
    /** The plunger let a ball go: the ball save starts now, and the skill shot. */
    launched() {
      if (s.saveArmed) {
        s.saveArmed = false;
        s.saveUntil = s.clock + saveTime();
      }
      if (s.skill && !s.skill.until) {
        s.skill.until = s.clock + 6;
      }
    },
    /** A flipper pressed: the lit lanes move along, a mission is picked while the ball waits in the scoop. */
    flip(side) {
      if (s.tilted || s.over) {
        return;
      }
      if (rt.scoop && rt.scoop.start === "select") {
        let id = s.select;
        for (let k = 0; k < MISSION_COUNT; k++) {
          id = (id + (side > 0 ? 1 : MISSION_COUNT - 1)) % MISSION_COUNT;
          if (!s.done[id]) {
            break;
          }
        }
        s.select = id;
        rt.scoop.until = Math.max(rt.scoop.until, s.clock + 1.5);
        out.event("select", id);
        return;
      }
      if (s.mission) {
        const def = missionDef(s.mission.id);
        if (def.flip) {
          def.flip(s.mission.m, api);
        }
      }
      const l = s.lanes;
      s.lanes = side > 0 ? [l[2], l[0], l[1]] : [l[1], l[2], l[0]];
      if (s.skill && !s.skill.done && !s.skill.until) {
        s.skill.lane = (s.skill.lane + (side > 0 ? 1 : 2)) % 3;
      }
    },
    /** A nudge: how hard the table moves (0 once tilted). */
    nudge() {
      if (s.tilted || s.over) {
        return 0;
      }
      s.tilt += 1;
      if (s.tilt > 2.6) {
        s.tilted = true;
        setFlippers(false);
        physics.setKicks(false);
        if (s.mission) {
          endMission(false);
        }
        s.saveUntil = 0;
        out.say("coach", "pbTilt");
        out.sound("pbTilt");
        out.event("tilt", true);
        return 0;
      }
      if (s.tilt > 1.6) {
        out.say("toast", "pbTiltWarning", {}, "bad");
        out.sound("pbTiltWarn");
      }
      return 1;
    },
    /** What the HUD shows. */
    hud() {
      const mission = s.mission;
      let goal = null;
      if (mission) {
        goal = missionDef(mission.id).goal(mission.m);
      } else if (rt.scoop && rt.scoop.start === "select") {
        goal = ["pbGoalSelect", {}];
      } else if (s.mb) {
        goal = s.mb.superLit ? ["pbHintSuper", {}] : ["pbHintJackpots", {}];
      } else if (s.lockLit) {
        goal = ["pbHintLock", {}];
      } else if (productionOpen()) {
        goal = ["pbHintProduction", {}];
      } else if (allDone()) {
        goal = ["pbHintReleaseDay", {}];
      } else {
        goal = ["pbHintPromo" + s.promo, {}];
      }
      return {
        score: s.score,
        ballNo: s.ballNo,
        extraBalls: s.extraBalls,
        level: s.level,
        bonusX: s.bonusX,
        mission: mission ? mission.id : null,
        timeLeft: mission ? Math.max(0, Math.ceil(mission.m.timeLeft)) : 0,
        goal,
        select: rt.scoop && rt.scoop.start === "select" ? s.select : -1,
        done: s.done,
        multiball: Boolean(s.mb),
        hurry: s.hurry ? hurryValue() : 0,
        flips: mission && missionDef(mission.id).flipsLeft ? missionDef(mission.id).flipsLeft(mission.m) : null,
        tilted: s.tilted
      };
    },
    summary
  };
}
