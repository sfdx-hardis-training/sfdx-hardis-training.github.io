/*
 * The background themes of Guinea Run: one per world that has no music of
 * its own (worlds 6 and 8 are musical runs and play their own song), and a
 * soft one for the map. The shell plays them with core/music.js, quieter than
 * a musical run, under the guinea pig and the bells.
 *
 * Each theme arranges itself with its form: an intro once, then its sections
 * in a loop, so a world of a few minutes does not hear the same eight bars
 * over and over. Melodies are degrees of the scale, one character per
 * sixteenth (see melody() in music.js).
 *
 * A world module can choose another theme with `export const MUSIC = "map"`
 * (a key of THEMES), or none with `export const MUSIC = false`.
 */
import { melody, MINOR } from "./music.js";

const FOUR = "x...x...x...x...";
const BACKBEAT = "....x.......x...";
const EIGHTHS = "x.x.x.x.x.x.x.x.";
const OFFBEATS = "..x...x...x...x.";
const SIXTEENTHS = "xxxxxxxxxxxxxxxx";
// Lo-fi drums: a lazy kick and a soft backbeat
const LOFI_KICK = "x......x..x.....";
const LOFI_CLAP = "....o.......o...";
export const MOTIF = "3q7u3uqzedwgw";

export const THEMES = {
  // The map: a music box, no drums
  map: {
    bpm: 90,
    root: 60,
    progression: [0, 5, 3, 4],
    volume: 0.12,
    leadVoice: "bell",
    lead: { a: melody("4.......2.......0.......2....... 5.......4.......2.......1.......") },
    sections: {
      intro: { pad: true },
      a: { pad: true, arp: true },
      b: { pad: true, arp: true, lead: "a" }
    },
    form: [
      ["intro", 2],
      ["a", 4],
      ["b", 8]
    ]
  },

  // 0 Get set up: a bright first day, glockenspiel over light pop
  0: {
    bpm: 104,
    root: 60,
    progression: [0, 3, 5, 4],
    volume: 0.16,
    leadVoice: "bell",
    lead: {
      a: melody("4.2.0.2.4...4... 5.3.5.7.5...3... 7.5.4.5.7...9... 8.6.4.6.4...2.1."),
      b: melody("4.......7....... 5.......3....... 4.......7....... 6.......4.......")
    },
    sections: {
      intro: { pad: true, hat: OFFBEATS },
      verse: { kick: FOUR, hat: OFFBEATS, bass: "x...x.o.x...x.o.", stab: OFFBEATS },
      chorus: { kick: FOUR, clap: BACKBEAT, hat: EIGHTHS, bass: "x...x.o.x...x.o.", stab: OFFBEATS, arp: true, lead: "a" },
      break: { pad: true, arp: true, lead: "b" }
    },
    form: [
      ["intro", 2],
      ["verse", 4],
      ["chorus", 8],
      ["verse", 4],
      ["break", 4],
      ["chorus", 8]
    ]
  },

  // 0, the "Why install anything?" admin past the Re-check door
  // (worlds/world-0-setup.js switches to it while he fights): the first-day
  // tune in a minor key, faster, a square lead over a driving beat
  "0-admin": {
    bpm: 132,
    root: 57,
    scale: MINOR,
    progression: [0, 5, 3, 4],
    volume: 0.16,
    leadVoice: "square",
    lead: {
      a: melody("4.2.0.2.4...4... 5.3.5.7.5...3... 7.5.4.5.7...9... 8.6.4.6.4...2.1."),
      b: melody("0.0.4.0.7.0.4.0. 0.0.5.0.8.0.5.0. 7.7.9.7.b.9.7.5. 4.4.5.4.2...0...")
    },
    sections: {
      intro: { kick: FOUR, hat: OFFBEATS, bass: "x.......x......." },
      fight: { kick: FOUR, clap: BACKBEAT, hat: EIGHTHS, bass: "x.x.o.x.x.x.o.x.", stab: OFFBEATS, lead: "a" },
      push: { kick: FOUR, clap: BACKBEAT, hat: SIXTEENTHS, bass: "x.x.x.x.x.x.x.x.", arp: true, lead: "b" }
    },
    form: [
      ["intro", 1],
      ["fight", 8],
      ["push", 4]
    ]
  },

  // 1 Build it in the org: a bouncy platformer, octave bass and a staccato square lead
  1: {
    bpm: 128,
    root: 65,
    progression: [0, 4, 5, 3],
    volume: 0.15,
    lead: {
      a: melody("0.2.4.7.4.2.4... 8.6.4.6.8...6... 9.7.5.7.9.a.9... 7.5.3.5.7...5.4.")
    },
    sections: {
      intro: { pad: true, hat: EIGHTHS },
      verse: { kick: FOUR, clap: BACKBEAT, hat: EIGHTHS, bass: "x.o.x.o.x.o.x.o.", stab: OFFBEATS },
      chorus: { kick: FOUR, clap: BACKBEAT, hat: EIGHTHS, open: OFFBEATS, bass: "x.o.x.o.x.o.x.o.", stab: OFFBEATS, lead: "a" },
      break: { pad: true, arp: true, bass: "x.......x......." }
    },
    form: [
      ["intro", 2],
      ["verse", 4],
      ["chorus", 8],
      ["break", 4],
      ["chorus", 8]
    ]
  },

  // 1, the castle at the end (worlds/world-1-org.js switches to it on the
  // bridge): the same tune in a minor key, lower and slower, a heavy beat
  "1-castle": {
    bpm: 112,
    root: 53,
    scale: MINOR,
    progression: [0, 5, 3, 4],
    volume: 0.16,
    leadVoice: "square",
    lead: {
      a: melody("0.2.4.7.4.2.4... 8.6.4.6.8...6... 9.7.5.7.9.a.9... 7.5.3.5.7...5.4.")
    },
    sections: {
      intro: { kick: FOUR, pad: true, bass: "x.......x......." },
      fight: { kick: FOUR, clap: BACKBEAT, hat: EIGHTHS, bass: "x.x.o.x.x.x.o.x.", stab: OFFBEATS, lead: "a" },
      dread: { kick: "x.....x.x.......", hat: OFFBEATS, pad: true, arp: true, bass: "x.......x......." }
    },
    form: [
      ["intro", 1],
      ["fight", 8],
      ["dread", 2]
    ]
  },

  // 2 Retrieve and commit: a busy conveyor belt, sixteenth hats and a syncopated bass
  2: {
    bpm: 118,
    root: 57,
    scale: MINOR,
    progression: [0, 5, 3, 4],
    volume: 0.15,
    leadVoice: "soft",
    lead: {
      a: melody("4.4.2.4.0.0.2.4. 7.7.5.7.9.9.7.5. 5.5.3.5.7.7.5.3. 6.6.4.6.8...6.4.")
    },
    sections: {
      intro: { kick: FOUR, hat: SIXTEENTHS },
      verse: { kick: FOUR, hat: SIXTEENTHS, bass: "x.xx.x.xx.x.x.xx", arp: true },
      chorus: { kick: FOUR, clap: BACKBEAT, hat: SIXTEENTHS, bass: "x.xx.x.xx.x.x.xx", arp: true, lead: "a" },
      break: { hat: SIXTEENTHS, arp: true, pad: true }
    },
    form: [
      ["intro", 2],
      ["verse", 8],
      ["chorus", 8],
      ["break", 4],
      ["chorus", 8]
    ]
  },

  // 3 Open the Pull Request: calm lo-fi to think at the desk, soft keys and seventh chords
  3: {
    bpm: 78,
    root: 63,
    progression: [1, 4, 0, 5],
    sevenths: true,
    swing: 0.22,
    volume: 0.14,
    stabVoice: "keys",
    leadVoice: "soft",
    lead: {
      a: melody("5...3...1....... 8...6...4....... 4...2...0...2... 7...5.......4...")
    },
    sections: {
      intro: { pad: true, stab: "x..............." },
      verse: { kick: LOFI_KICK, clap: LOFI_CLAP, hat: OFFBEATS, bass: "x.......x.....x.", long: true, stab: "x.......x......." },
      chorus: { kick: LOFI_KICK, clap: LOFI_CLAP, hat: OFFBEATS, bass: "x.......x.....x.", long: true, stab: "x.......x.......", lead: "a" },
      break: { pad: true, lead: "a" }
    },
    form: [
      ["intro", 2],
      ["verse", 8],
      ["chorus", 8],
      ["break", 4],
      ["chorus", 8]
    ]
  },

  // 4 Pass the checks: tense but fun, a minor defense pulse
  4: {
    bpm: 132,
    root: 64,
    scale: MINOR,
    progression: [0, 5, 2, 6],
    volume: 0.15,
    lead: {
      a: melody("4...4.2.4...7... 7...7.5.7...9... 6...6.4.6...8... 8...8.6.a...8.6.")
    },
    sections: {
      intro: { hat: EIGHTHS, bass: "x.xxx.xxx.xxx.xx" },
      verse: { kick: FOUR, hat: EIGHTHS, bass: "x.xxx.xxx.xxx.xx", arp: true },
      chorus: { kick: FOUR, clap: BACKBEAT, hat: EIGHTHS, open: OFFBEATS, bass: "x.xxx.xxx.xxx.xx", arp: true, lead: "a" },
      break: { pad: true, arp: true, bass: "x...x...x...x..." }
    },
    form: [
      ["intro", 2],
      ["verse", 8],
      ["chorus", 8],
      ["break", 4],
      ["chorus", 8]
    ]
  },

  // 4, the Dev who pads his test class with i++ (worlds/world-4-checks.js
  // switches to it while he fights): the defense pulse, faster, a square
  // lead that types away over sixteenth hats
  "4-dev": {
    bpm: 144,
    root: 59,
    scale: MINOR,
    progression: [0, 5, 2, 6],
    volume: 0.16,
    leadVoice: "square",
    lead: {
      a: melody("4...4.2.4...7... 7...7.5.7...9... 6...6.4.6...8... 8...8.6.a...8.6."),
      b: melody("0.0.0.2.4.4.4.2. 0.0.0.2.4...7... 5.5.5.4.2.2.2.0. 2.2.4.2.0.......")
    },
    sections: {
      intro: { kick: FOUR, hat: SIXTEENTHS, bass: "x.......x......." },
      fight: { kick: FOUR, clap: BACKBEAT, hat: SIXTEENTHS, bass: "x.xxx.xxx.xxx.xx", stab: OFFBEATS, lead: "b" },
      push: { kick: FOUR, clap: BACKBEAT, hat: SIXTEENTHS, open: OFFBEATS, bass: "x.x.x.x.x.x.x.x.", arp: true, lead: "a" }
    },
    form: [
      ["intro", 1],
      ["fight", 8],
      ["push", 4]
    ]
  },

  // 5 Resolve the conflict: lo-fi for two voices, one asks and the other answers
  5: {
    bpm: 84,
    root: 57,
    progression: [0, 5, 3, 4],
    sevenths: true,
    swing: 0.2,
    volume: 0.14,
    stabVoice: "keys",
    leadVoice: "soft",
    lead: {
      call: melody("4...2...4.5.4... 7...5...4....... ................ ................"),
      answer: melody("................ ................ 7...5...3.4.5... 6...4...2.......")
    },
    sections: {
      intro: { pad: true },
      verse: { kick: LOFI_KICK, clap: LOFI_CLAP, hat: OFFBEATS, bass: "x.......x.....x.", long: true, stab: "x.......x......." },
      chorus: { kick: LOFI_KICK, clap: LOFI_CLAP, hat: OFFBEATS, bass: "x.......x.....x.", long: true, stab: "x.......x.......", lead: "call", answer: "answer" },
      break: { pad: true, lead: "call", answer: "answer" }
    },
    form: [
      ["intro", 2],
      ["verse", 4],
      ["chorus", 8],
      ["break", 4],
      ["chorus", 8]
    ]
  },

  // 7 Promote to uat and preprod: a march up the pipeline, snare, oompah bass, a brass lead
  7: {
    bpm: 112,
    root: 58,
    progression: [0, 3, 0, 4],
    volume: 0.15,
    lead: {
      a: melody("0...0.0.2...4... 5...3...5...7... 7...4...2...0... 1...2...4...6...")
    },
    sections: {
      intro: { snare: "X.x.x.xxX.x.x.x.", kick: "x.......x......." },
      verse: { kick: "x.......x.......", snare: "X.x.x.xxX.x.x.x.", bass: "x...f...x...f...", stab: OFFBEATS },
      chorus: { kick: "x.......x.......", snare: "X.x.x.xxX.x.x.x.", bass: "x...f...x...f...", stab: OFFBEATS, lead: "a" },
      break: { snare: "x...x...x...x...", bass: "x...f...x...f...", pad: true }
    },
    form: [
      ["intro", 1],
      ["verse", 4],
      ["chorus", 8],
      ["break", 4],
      ["chorus", 8]
    ]
  },

  // Pipeline Pinball: a bright arcade boogie, a walking bass under bells; the table counts its beat for mission 6
  pinball: {
    bpm: 124,
    root: 62,
    progression: [0, 3, 4, 4],
    volume: 0.14,
    leadVoice: "bell",
    lead: {
      a: melody("0.2.4.7.9...7... 4.5.7.9.b...9... 7.4.2.4.7...4... 2.4.5.4.2...1..."),
      b: melody("7...9...b...9... 7.......4....... 5...7...9...7... 4.......2.......")
    },
    sections: {
      intro: { kick: FOUR, bass: "x.......x......." },
      verse: { kick: FOUR, hat: OFFBEATS, bass: "x.x.x.x.x.x.x.x.", stab: OFFBEATS },
      chorus: { kick: FOUR, clap: BACKBEAT, hat: EIGHTHS, bass: "x.o.x.o.x.o.x.o.", arp: true, lead: "a" },
      bridge: { kick: FOUR, clap: BACKBEAT, hat: SIXTEENTHS, bass: "x...x...x...x...", lead: "b" },
      break: { pad: true, arp: true, bass: "x.......x......." }
    },
    form: [
      ["intro", 2],
      ["verse", 4],
      ["chorus", 8],
      ["bridge", 8],
      ["break", 4],
      ["chorus", 8]
    ]
  },

  // Org-Man, the maze: a quick chase, a walking bass and a square lead that runs round the scale
  orgman: {
    bpm: 132,
    root: 60,
    progression: [0, 5, 3, 4],
    volume: 0.13,
    leadVoice: "square",
    lead: {
      a: melody("0.4.7.4.9.7.4.2. 0.2.4.5.7...4... 5.4.2.0.2.4.5.7. 9.7.5.4.2...0..."),
      b: melody("7.7.9.7.4...2... 5.5.7.5.2...0... 4.5.7.9.b.9.7.5. 4.2.0.2.4.......")
    },
    sections: {
      intro: { kick: FOUR, bass: "x.x.x.x.x.x.x.x." },
      verse: { kick: FOUR, hat: OFFBEATS, bass: "x.o.x.o.x.o.x.o.", lead: "a" },
      chorus: { kick: FOUR, clap: BACKBEAT, hat: EIGHTHS, bass: "x.o.x.o.x.o.x.o.", arp: true, lead: "b" },
      break: { pad: true, arp: true, bass: "x.......x......." }
    },
    form: [
      ["intro", 2],
      ["verse", 8],
      ["chorus", 8],
      ["break", 4],
      ["verse", 8],
      ["chorus", 8]
    ]
  },

  // 9 Monitor production: an arcade march at night, a bass stomping down the chords under a square lead
  9: {
    bpm: 120,
    root: 57,
    scale: MINOR,
    progression: [0, 6, 5, 4],
    volume: 0.15,
    lead: {
      a: melody("0...0.2.4...4... 6...6.4.3....... 5...5.3.2...2... 4...4.6.7.......")
    },
    sections: {
      intro: { kick: FOUR, bass: "x...x...x...x..." },
      verse: { kick: FOUR, hat: OFFBEATS, bass: "x...x...x...x...", stab: OFFBEATS },
      chorus: { kick: FOUR, clap: BACKBEAT, hat: EIGHTHS, bass: "x.o.x.o.x.o.x.o.", stab: OFFBEATS, lead: "a" },
      break: { pad: true, arp: true, bass: "x.......x......." }
    },
    form: [
      ["intro", 2],
      ["verse", 4],
      ["chorus", 8],
      ["break", 4],
      ["chorus", 8]
    ]
  }
};
