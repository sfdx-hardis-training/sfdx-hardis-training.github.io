/*
 * The ten missions of Pipeline Pinball, one per world of the game, and Release
 * day once all ten are done. A mission starts at the Pull Request scoop and
 * runs on the game clock; a mission that runs out of time is simply still to
 * do, with the rule of its world on the way out.
 *
 * A mission keeps its state in m, a plain object the checkpoint saves as is.
 * The rules call start(m, api), shot(m, shot, api) for every shot of the ball,
 * and update(m, dt, api); a mission calls api.done() when it is won. goal(m)
 * gives the text key and values of its goal line.
 *
 * shot: { name, index } with name one of integration, uat, preprod (the left
 * orbit), orbitRight, production (the ramp made), scoop, release, bumper,
 * sling, drop, check, admin, rabbit, salesManager, spinner (index: spins),
 * outlane, drain.
 */

export const MISSION_COUNT = 10;

const TOOL_SHOTS = ["integration", "uat", "preprod", "orbitRight"];

export const MISSIONS = [
  // 0 Install the tools: VS Code, the sf CLI, Git, sfdx-hardis, one lit shot each
  {
    time: 60,
    start(m, api) {
      m.left = TOOL_SHOTS.slice();
      for (const s of TOOL_SHOTS) {
        api.light("shot-" + s, 2);
      }
    },
    shot(m, shot, api) {
      const i = m.left.indexOf(shot.name);
      if (i < 0) {
        return;
      }
      m.left.splice(i, 1);
      api.light("shot-" + shot.name, 0);
      api.award(40000, "pbTool", { tool: api.text("pbTool" + (4 - m.left.length)) });
      if (!m.left.length) {
        api.done();
      }
    },
    goal(m) {
      return ["pbGoal0", { n: 4 - m.left.length }];
    },
    end(m, api) {
      for (const s of TOOL_SHOTS) {
        api.light("shot-" + s, 0);
      }
    }
  },

  // 1 Build US-014: the mushroom makes the guinea pig giant; the field, the layout, then the permission set
  {
    time: 70,
    start(m, api) {
      m.step = 0;
      m.hits = 0;
      api.setGiant(true);
    },
    shot(m, shot, api) {
      if (m.step === 0 && shot.name === "bumper") {
        m.hits++;
        api.award(6000, "");
        if (m.hits >= 8) {
          m.step = 1;
          m.hits = 0;
          api.award(60000, "pbBuiltField");
          api.light("check0", 2);
          api.light("check1", 2);
          api.light("check2", 2);
        }
      } else if (m.step === 1 && shot.name === "check") {
        m.hits++;
        if (m.hits >= 2) {
          m.step = 2;
          api.award(60000, "pbBuiltLayout");
          api.light("shot-orbitRight", 2);
        }
      } else if (m.step === 2 && shot.name === "orbitRight") {
        api.award(120000, "pbBuiltPermission");
        api.done();
      }
    },
    goal(m) {
      return ["pbGoal1_" + m.step, { n: m.hits }];
    },
    end(m, api) {
      api.setGiant(false);
      api.light("shot-orbitRight", 0);
    }
  },

  // 2 Commit only what you need: green drop targets are US-014's, red ones are a Profile and a teammate's work
  {
    time: 55,
    start(m, api) {
      api.resetDrops();
      const order = api.shuffle([0, 1, 2, 3, 4]);
      m.green = order.slice(0, 3);
      m.red = order.slice(3);
      m.hit = [];
      for (let i = 0; i < 5; i++) {
        api.light("drop" + i, 2, m.green.includes(i) ? 0x2e844a : 0xea001e);
      }
    },
    shot(m, shot, api) {
      if (shot.name !== "drop" || m.hit.includes(shot.index)) {
        return;
      }
      m.hit.push(shot.index);
      api.light("drop" + shot.index, 0);
      if (m.red.includes(shot.index)) {
        api.fail("pbWrongFile", shot.index === m.red[0] ? "pbWrongProfile" : "pbWrongTeammate");
        return;
      }
      api.award(50000, "pbCommitted");
      if (m.green.every((i) => m.hit.includes(i))) {
        api.done();
      }
    },
    goal(m) {
      return ["pbGoal2", { n: m.hit.filter((i) => m.green.includes(i)).length }];
    },
    end(m, api) {
      for (let i = 0; i < 5; i++) {
        api.light("drop" + i, 0);
      }
      api.resetDrops();
    }
  },

  // 3 The right base branch: the integration ramp, three times; the uat ramp flashes red, "main"
  {
    time: 55,
    start(m, api) {
      m.n = 0;
      api.light("shot-integration", 2);
      api.light("shot-uat", 3, 0xea001e);
    },
    shot(m, shot, api) {
      if (shot.name === "integration") {
        m.n++;
        api.award(60000, "pbRightBase");
        if (m.n >= 3) {
          api.done();
        }
      } else if (shot.name === "uat") {
        m.timeLeft = Math.max(1, m.timeLeft - 8);
        api.say("tip", "pbWrongBase");
      }
    },
    goal(m) {
      return ["pbGoal3", { n: m.n }];
    },
    end(m, api) {
      api.light("shot-integration", 0);
      api.light("shot-uat", 0);
    }
  },

  // 4 Coverage: the spinner writes tests, up to 75%; the bumpers write i++, which is not a test
  {
    time: 55,
    start(m, api) {
      m.coverage = 40;
      api.light("shot-preprod", 2);
    },
    shot(m, shot, api) {
      if (shot.name === "spinner") {
        m.coverage = Math.min(100, m.coverage + shot.index * 1.4);
        api.award(2000 * shot.index, "");
      } else if (shot.name === "bumper") {
        m.coverage = Math.max(0, m.coverage - 0.6);
      }
      if (m.coverage >= 75) {
        api.award(150000, "pbCovered");
        api.done();
      }
    },
    goal(m) {
      return ["pbGoal4", { n: Math.floor(m.coverage) }];
    },
    end(m, api) {
      api.light("shot-preprod", 0);
    }
  },

  // 5 Merge with Mariia: her ramp, yours, in turn; a ball down an outlane is a line lost
  {
    time: 60,
    start(m, api) {
      m.n = 0;
      m.next = "integration";
      api.light("shot-integration", 2);
    },
    shot(m, shot, api) {
      if (shot.name === m.next) {
        m.n++;
        api.light("shot-" + m.next, 0);
        m.next = m.next === "integration" ? "uat" : "integration";
        api.light("shot-" + m.next, 2);
        api.award(50000, "pbBothKept");
        if (m.n >= 4) {
          api.done();
        }
      } else if (shot.name === "outlane") {
        api.say("tip", "pbLostLine");
      }
    },
    goal(m) {
      return ["pbGoal5", { n: m.n }];
    },
    end(m, api) {
      api.light("shot-integration", 0);
      api.light("shot-uat", 0);
    }
  },

  // 6 Integration on the beat: two balls, and every shot on the beat counts
  {
    time: 50,
    start(m, api) {
      m.n = 0;
      api.addBall(10);
    },
    shot(m, shot, api) {
      if (!["integration", "uat", "preprod", "orbitRight", "drop", "check", "scoop", "bumper"].includes(shot.name)) {
        return;
      }
      if (api.onBeat()) {
        m.n++;
        api.award(shot.name === "bumper" ? 15000 : 50000, "pbOnBeat");
        if (m.n >= 8) {
          api.done();
        }
      }
    },
    goal(m) {
      return ["pbGoal6", { n: m.n }];
    }
  },

  // 7 Promotion: integration, uat, preprod in order; the uat tester leaves on sick leave, take the promotion branch
  {
    time: 65,
    start(m, api) {
      m.step = 0;
      m.wait = 0;
      api.light("shot-integration", 2);
    },
    shot(m, shot, api) {
      const want = ["integration", m.sick ? "orbitRight" : "uat", "preprod"][m.step];
      if (shot.name !== want) {
        return;
      }
      api.light("shot-" + want, 0);
      api.award(70000, "pbPromoted", { org: api.text("pbOrg" + m.step) });
      m.step++;
      if (m.step === 1) {
        m.wait = 7;
        api.light("shot-uat", 2);
      } else if (m.step === 2) {
        api.light("shot-uat", 0);
        api.light("shot-orbitRight", 0);
        api.light("shot-preprod", 2);
      } else {
        api.done();
      }
    },
    update(m, dt, api) {
      if (m.step === 1 && !m.sick && m.wait > 0) {
        m.wait -= dt;
        if (m.wait <= 0) {
          m.sick = true;
          api.light("shot-uat", 0);
          api.light("shot-orbitRight", 2);
          api.say("chat", "pbSickLeave");
        }
      }
    },
    goal(m) {
      return ["pbGoal7", { n: m.step }];
    },
    end(m, api) {
      for (const s of ["integration", "uat", "preprod", "orbitRight"]) {
        api.light("shot-" + s, 0);
      }
    }
  },

  // 8 Release to production: up to the Production floor, five hits on the Data Cloud rabbit
  {
    time: 80,
    start(m, api) {
      m.n = 0;
      api.openProduction(true);
      api.light("rabbit", 2);
    },
    shot(m, shot, api) {
      if (shot.name === "rabbit") {
        m.n++;
        api.award(60000, "pbRabbitHit");
        if (m.n >= 5) {
          api.done();
        }
      }
    },
    goal(m) {
      return ["pbGoal8", { n: m.n }];
    },
    end(m, api) {
      api.light("rabbit", 0);
      api.openProduction(false);
    }
  },

  // 9 Monitoring: admins rise with change sets; hit each before it gets away, retrofit the ones that do
  {
    time: 75,
    start(m) {
      m.caught = 0;
      m.rise = 1.5;
      m.up = [0, 0, 0];
      m.away = 0;
    },
    update(m, dt, api) {
      m.rise -= dt;
      if (m.rise <= 0) {
        const free = [0, 1, 2].filter((i) => m.up[i] <= 0);
        if (free.length) {
          const i = free[Math.floor(api.random() * free.length)];
          m.up[i] = 7;
          api.admin(i, true);
        }
        m.rise = 3.2;
      }
      for (let i = 0; i < 3; i++) {
        if (m.up[i] > 0) {
          m.up[i] -= dt;
          if (m.up[i] <= 0) {
            api.admin(i, false);
            m.away++;
            api.light("shot-scoop", 3);
            api.say("tip", "pbAdminAway");
          }
        }
      }
    },
    shot(m, shot, api) {
      if (shot.name === "admin" && m.up[shot.index] > 0) {
        m.up[shot.index] = 0;
        api.admin(shot.index, false);
        m.caught++;
        api.award(50000, "pbAdminCaught");
      } else if (shot.name === "scoop" && m.away > 0) {
        m.away--;
        m.caught++;
        api.award(80000, "pbRetrofit");
        if (!m.away) {
          api.light("shot-scoop", 0);
        }
      }
      if (m.caught >= 6) {
        api.done();
      }
    },
    goal(m) {
      return ["pbGoal9", { n: m.caught }];
    },
    end(m, api) {
      for (let i = 0; i < 3; i++) {
        api.admin(i, false);
      }
      api.light("shot-scoop", 0);
    }
  }
];

/**
 * Release day: four balls, every shot a jackpot, then the Sales Manager on the
 * Production floor during the Code freeze: no more clock, a number of flips.
 */
const FREEZE_FLIPS = 40;

export const WIZARD = {
  time: 100,
  start(m, api) {
    m.jackpots = 0;
    m.boss = 0;
    api.openProduction(true);
    api.salesManager(true);
    for (const s of ["integration", "uat", "preprod", "orbitRight", "scoop"]) {
      api.light("shot-" + s, 3);
    }
    api.addBall(12);
    api.addBall(12);
    api.addBall(12);
  },
  shot(m, shot, api) {
    if (["integration", "uat", "preprod", "orbitRight", "scoop"].includes(shot.name)) {
      m.jackpots++;
      api.award(1000000, "pbReleaseJackpot");
      if (m.jackpots === 6) {
        // The Code freeze starts: the clock stops, the flips are counted
        m.flips = FREEZE_FLIPS;
        api.award(0, "pbCodeFreeze", { n: FREEZE_FLIPS });
      }
    } else if (shot.name === "salesManager" && m.jackpots >= 6) {
      m.boss++;
      api.award(500000, "pbSalesManagerHit");
      if (m.boss >= 3) {
        api.award(5000000, "pbReleaseDone");
        api.done();
      }
    }
  },
  goal(m) {
    return m.jackpots < 6 ? ["pbGoalWizard", { n: m.jackpots }] : ["pbGoalWizardBoss", { n: m.boss, flips: m.flips }];
  },
  /** During the Code freeze the clock stops: the flips run out instead. */
  frozen(m) {
    return m.jackpots >= 6;
  },
  flipsLeft(m) {
    return m.jackpots >= 6 ? m.flips : null;
  },
  flip(m, api) {
    if (m.jackpots < 6) {
      return;
    }
    m.flips--;
    if (m.flips <= 0) {
      api.fail("pbFreezeOver", "pbFreezeTip");
    }
  },
  end(m, api) {
    // He stands in front of the Release hole again, as before Release day
    api.salesManager(true);
    api.openProduction(false);
    for (const s of ["integration", "uat", "preprod", "orbitRight", "scoop"]) {
      api.light("shot-" + s, 0);
    }
  }
};
