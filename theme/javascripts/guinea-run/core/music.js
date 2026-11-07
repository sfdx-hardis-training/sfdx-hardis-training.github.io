/*
 * The music of the musical runs (worlds 6 and 8): a small sequencer on the
 * WebAudio clock, with every instrument played by the browser (no file).
 *
 * The game owns the clock: update(dt) moves the song beat on by the game time,
 * so a paused game, a slow phone or a scripted check all keep the music and
 * the level on the same beat. Each sixteenth note is scheduled a little ahead
 * on the audio clock (lookahead scheduling), never with a timer, so the notes
 * stay in time however irregular the frames are.
 *
 *   const music = createMusic(sound, song);
 *   music.start();                 // on Start
 *   music.update(dt);              // every game step: moves the beat, schedules
 *   music.beat, music.phase, music.pulse   // for the visuals
 *   music.setSection("chorus", bar);       // from that bar on
 *   music.note(i);                 // a collectable: a note of the chord being played
 *   music.setTempo(bpm, beat);    // from that beat on (a bar line), a new tempo
 *   music.dispose();
 *
 * It plays through the master output of core/sound.js, so the limiter and
 * the mute (M) apply to it too. A song is { bpm, root (MIDI note of the key),
 * progression (one chord per bar, as scale degrees), lead: { name: [64
 * sixteenths, scale degrees or null] }, sections: { name: tracks } }, and
 * optionally: scale (MINOR), volume, sevenths, swing (0 to 0.3, the late
 * offbeats of lo-fi), leadVoice ("square", "bell", "soft"), stabVoice
 * ("pluck", "keys"), and form: [[section, bars], ...] for a background theme
 * that arranges itself (the first entry plays once, the rest loop).
 *
 * The same engine plays the musical runs in the foreground and the themes
 * of the other worlds in the background (core/themes.js, started by the shell).
 */

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
export const MINOR = [0, 2, 3, 5, 7, 8, 10];
const STEPS_PER_BEAT = 4;
const STEPS_PER_BAR = 16;
const VOLUME = 0.34;
// Notes are scheduled this far behind the game, so they are always in the future
const LATENCY_S = 0.04;
// How far ahead the notes are scheduled. A phone stalls longer (a garbage
// collection, a texture upload): a notes queue that runs dry is a silence
const LOOKAHEAD_S = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(pointer: coarse)").matches ? 0.3 : 0.12;

// The sections every song can use; a song can replace or add its own
export const SECTIONS = {
  intro: { kick: "x...x...x...x...", hat: "..x...x...x...x.", pad: true },
  verse: { kick: "x...x...x...x...", clap: "....x.......x...", hat: "x.x.x.x.x.x.x.x.", bass: "x..x..x.x..x..o.", stab: "..x...x...x...x." },
  chorus: {
    kick: "x...x...x...x...",
    clap: "....x.......x...",
    hat: "xxxxxxxxxxxxxxxx",
    open: "..x...x...x...x.",
    bass: "x.ox.ox.x.ox.oxo",
    stab: "..x...x...x..x..",
    arp: true,
    lead: "chorus"
  },
  // While the guinea pig waits at a stop: the groove holds its breath
  break: { hat: "x.x.x.x.x.x.x.x.", pad: true, arp: true },
  lounge: { kick: "x.........x.....", hat: "..x...x...x...x.", pad: true, arp: true, bass: "x.......x......." },
  silence: {}
};

/**
 * A melody written as text, one character per sixteenth: a digit is a degree
 * of the scale from the root (0 to 9, then a and b), a dot is a rest.
 */
export function melody(text) {
  return [...text.replace(/\s/g, "")].map((ch) => (ch === "." ? null : parseInt(ch, 12)));
}

function mod(n, m) {
  return ((n % m) + m) % m;
}

function frequency(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function createMusic(sound, song) {
  // The tempo, in segments: from the beat of a segment on, its bpm. The song
  // clock is in seconds; the beat is read from the segments, so a change of
  // tempo never moves a beat that has already been played
  let segments = [{ beat: 0, sec: 0, bpm: song.bpm }];
  let seconds = 0;
  function segmentAtBeat(b) {
    let seg = segments[0];
    for (const s of segments) {
      if (s.beat <= b) {
        seg = s;
      }
    }
    return seg;
  }
  function secondsAt(b) {
    const seg = segmentAtBeat(b);
    return seg.sec + ((b - seg.beat) * 60) / seg.bpm;
  }
  function beatAt(sec) {
    let seg = segments[0];
    for (const s of segments) {
      if (s.sec <= sec) {
        seg = s;
      }
    }
    return seg.beat + ((sec - seg.sec) * seg.bpm) / 60;
  }
  const spbAt = (b) => 60 / segmentAtBeat(b).bpm;
  const sections = Object.assign({}, SECTIONS, song.sections || {});
  const scale = song.scale || MAJOR;
  const volume = song.volume || VOLUME;
  const semi = (degree) => 12 * Math.floor(degree / 7) + scale[mod(degree, 7)];
  // A theme that arranges itself follows its form, until a world sets a section by hand
  let manualSections = false;
  const progression = song.progression || [0, 4, 5, 3];
  let beat = 0;
  let started = false;
  let disposed = false;
  let nextStep = 0;
  let anchor = 0;
  let queue = [{ bar: 0, name: song.start || "intro" }];
  let out = null;

  /** The nodes of the music, made once the game has its audio context. */
  function setup() {
    if (out || disposed) {
      return out;
    }
    const audio = sound.audio ? sound.audio() : null;
    if (!audio) {
      return null;
    }
    const c = audio.context;
    const bus = c.createGain();
    bus.gain.value = sound.muted ? 0 : volume;
    bus.connect(audio.master);
    // A short echo on the lead and the bells, a quarter of a bar long
    const echo = c.createDelay(2);
    echo.delayTime.value = spbAt(beat) * 0.75;
    const feedback = c.createGain();
    feedback.gain.value = 0.3;
    const wet = c.createGain();
    wet.gain.value = 0.32;
    echo.connect(feedback);
    feedback.connect(echo);
    echo.connect(wet);
    wet.connect(bus);
    const length = Math.floor(c.sampleRate * 1.2);
    const noise = c.createBuffer(1, length, c.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    out = { c, bus, echo, noise, muted: sound.muted };
    anchor = c.currentTime - seconds + LATENCY_S;
    return out;
  }

  /* ---------- The instruments ---------- */

  function envelope(t, peak, attack, decay) {
    const g = out.c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    return g;
  }

  function osc(type, freq, t, length, target) {
    const o = out.c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.connect(target);
    o.start(t);
    o.stop(t + length + 0.05);
    return o;
  }

  function noiseHit(t, volume, filterType, freq, q, decay, target) {
    const source = out.c.createBufferSource();
    source.buffer = out.noise;
    const filter = out.c.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const g = envelope(t, volume, 0.002, decay);
    source.connect(filter);
    filter.connect(g);
    g.connect(target || out.bus);
    source.start(t, Math.random() * 0.5);
    source.stop(t + decay + 0.05);
  }

  function kick(t, v) {
    const g = envelope(t, 0.9 * v, 0.003, 0.32);
    g.connect(out.bus);
    const o = osc("sine", 150, t, 0.35, g);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.14);
  }

  // A clap is three quick bursts of noise
  function clap(t, v) {
    for (let i = 0; i < 3; i++) {
      noiseHit(t + i * 0.011, (i === 2 ? 0.5 : 0.32) * v, "bandpass", 1500, 1.1, i === 2 ? 0.16 : 0.02);
    }
  }

  function snare(t, v) {
    noiseHit(t, 0.32 * v, "highpass", 1100, 0.7, 0.12);
    const g = envelope(t, 0.18 * v, 0.002, 0.08);
    g.connect(out.bus);
    osc("triangle", 196, t, 0.1, g);
  }

  function hat(t, v, open) {
    noiseHit(t, (open ? 0.12 : 0.1) * v, "highpass", 7600, 0.8, open ? 0.2 : 0.035);
  }

  function crash(t, v) {
    noiseHit(t, 0.18 * v, "highpass", 4200, 0.5, 1.4);
  }

  function bass(t, midi, length, v) {
    const filter = out.c.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 6;
    filter.frequency.setValueAtTime(1100, t);
    filter.frequency.exponentialRampToValueAtTime(260, t + length);
    const g = envelope(t, 0.34 * v, 0.006, length);
    filter.connect(g);
    g.connect(out.bus);
    osc("sawtooth", frequency(midi), t, length, filter);
    osc("sine", frequency(midi - 12), t, length, g);
  }

  function pluck(t, midi, v, length, target) {
    const filter = out.c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(3200, t);
    filter.frequency.exponentialRampToValueAtTime(700, t + length);
    const g = envelope(t, v, 0.004, length);
    filter.connect(g);
    g.connect(target || out.bus);
    osc("sawtooth", frequency(midi) * 1.003, t, length, filter);
    osc("triangle", frequency(midi), t, length, filter);
  }

  function keys(t, midi, v, length) {
    const g = envelope(t, v, 0.01, length);
    g.connect(out.bus);
    g.connect(out.echo);
    osc("triangle", frequency(midi), t, length, g);
    osc("sine", frequency(midi) * 2.001, t, length * 0.6, g);
  }

  function pad(t, midis, length, v) {
    for (const midi of midis) {
      const g = out.c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05 * v, t + 0.25);
      g.gain.setValueAtTime(0.05 * v, t + length - 0.2);
      g.gain.exponentialRampToValueAtTime(0.0001, t + length);
      g.connect(out.bus);
      osc("triangle", frequency(midi), t, length, g);
      osc("sine", frequency(midi + 12) * 1.004, t, length, g);
    }
  }

  function lead(t, midi, length, v) {
    const filter = out.c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2600;
    const g = out.c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.085 * v, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.04 * v, t + length * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + length);
    filter.connect(g);
    g.connect(out.bus);
    g.connect(out.echo);
    osc("square", frequency(midi) * 0.997, t, length, filter);
    osc("square", frequency(midi) * 1.003, t, length, filter);
  }

  // A marimba bar: what a collectable sings
  function bell(t, midi, v) {
    const g = envelope(t, 0.2 * v, 0.003, 0.5);
    g.connect(out.bus);
    g.connect(out.echo);
    osc("sine", frequency(midi), t, 0.5, g);
    const g2 = envelope(t, 0.05 * v, 0.002, 0.12);
    g2.connect(out.bus);
    osc("sine", frequency(midi) * 4, t, 0.15, g2);
  }

  // A wood block: the cue of a jump that is coming
  function wood(t, v) {
    const g = envelope(t, 0.12 * v, 0.001, 0.05);
    g.connect(out.bus);
    osc("sine", 1480, t, 0.06, g);
    osc("triangle", 2220, t, 0.04, g);
  }

  /* ---------- The song ---------- */

  function formAt(bar) {
    const form = song.form;
    const head = form[0][1];
    if (bar < head) {
      return form[0][0];
    }
    const loop = form.slice(1);
    const total = loop.reduce((sum, part) => sum + part[1], 0);
    let at = mod(bar - head, total);
    for (const [name, bars] of loop) {
      if (at < bars) {
        return name;
      }
      at -= bars;
    }
    return loop[0][0];
  }

  function sectionAt(bar) {
    if (song.form && !manualSections) {
      return sections[formAt(bar)] || sections.silence;
    }
    let name = queue[0].name;
    for (const entry of queue) {
      if (entry.bar <= bar) {
        name = entry.name;
      }
    }
    return sections[name] || sections.silence;
  }

  /** The chord of a bar, as MIDI notes around the root. */
  function chord(bar) {
    const degree = progression[mod(bar, progression.length)];
    const degrees = song.sevenths ? [degree, degree + 2, degree + 4, degree + 6] : [degree, degree + 2, degree + 4];
    return degrees.map((d) => song.root + semi(d));
  }

  function scheduleStep(step, t) {
    const spb = spbAt(step / STEPS_PER_BEAT);
    const bar = Math.floor(step / STEPS_PER_BAR);
    const s = mod(step, STEPS_PER_BAR);
    const section = sectionAt(bar);
    const tones = chord(bar);
    const hit = (pattern) => (pattern ? pattern[s] : ".");
    // Lo-fi swing: the offbeat sixteenths come a little late
    if (song.swing && s % 2 === 1) {
      t += (song.swing * spb) / 4;
    }
    const k = hit(section.kick);
    if (k !== ".") {
      kick(t, k === "X" ? 1.2 : 1);
    }
    const c = hit(section.clap);
    if (c !== ".") {
      clap(t, c === "x" ? 1 : 0.6);
    }
    const sn = hit(section.snare);
    if (sn !== ".") {
      snare(t, sn === "X" ? 1 : 0.55);
    }
    const h = hit(section.hat);
    if (h !== ".") {
      hat(t, s % 4 === 0 ? 1 : 0.7, false);
    }
    if (hit(section.open) !== ".") {
      hat(t, 1, true);
    }
    const b = hit(section.bass);
    if (b !== ".") {
      bass(t, (b === "f" ? tones[2] : tones[0]) - 24 + (b === "o" ? 12 : 0), spb * (section.long ? 0.9 : 0.45), 1);
    }
    if (hit(section.stab) !== ".") {
      if (song.stabVoice === "keys") {
        tones.forEach((midi) => keys(t, midi, 0.045, spb * 1.6));
      } else {
        tones.forEach((midi) => pluck(t, midi, 0.055, spb * 0.4));
      }
    }
    if (section.pad && s === 0) {
      pad(t, tones.map((m) => m - 12), spb * 4, 1);
    }
    if (section.arp && s % 2 === 0) {
      const order = [0, 1, 2, 3, 2, 1, 0, 1];
      const i = order[mod(s / 2, order.length)];
      pluck(t, (i === 3 ? tones[0] + 12 : tones[i]) + 12, 0.03, spb * 0.3, out.echo);
    }
    playMelody(step, t, spb, section.lead, song.leadVoice, 12);
    // A second voice that answers the first, a bell an octave up
    playMelody(step, t, spb, section.answer, "bell", 24);
  }

  function playMelody(step, t, spb, key, voice, octave) {
    const melody = key && song.lead && song.lead[key];
    if (melody) {
      const index = mod(step, melody.length);
      const degree = melody[index];
      if (degree !== null && degree !== undefined) {
        // A note lasts until the next one
        let length = 1;
        while (length < 4 && (melody[mod(index + length, melody.length)] === null || melody[mod(index + length, melody.length)] === undefined)) {
          length += 1;
        }
        const midi = song.root + octave + semi(degree);
        if (voice === "bell") {
          bell(t, midi, 0.7);
        } else if (voice === "soft") {
          keys(t, midi, 0.08, (length * spb) / 4 + 0.2);
        } else {
          lead(t, midi, (length * spb) / 4 + 0.05, 1);
        }
      }
    }
  }

  function audioTime(songBeat) {
    return anchor + secondsAt(songBeat);
  }

  function schedule(dt) {
    const c = out.c;
    const now = c.currentTime;
    // Where beat 0 is on the audio clock: followed gently, jumped to after a pause
    const wanted = now - seconds + LATENCY_S;
    if (Math.abs(wanted - anchor) > 0.08) {
      anchor = wanted;
    } else {
      anchor += (wanted - anchor) * 0.05;
    }
    if (out.muted !== sound.muted) {
      out.muted = sound.muted;
      out.bus.gain.setTargetAtTime(sound.muted ? 0 : volume, now, 0.02);
    }
    const horizon = beatAt(seconds + Math.max(LOOKAHEAD_S, dt * 1.5) + LATENCY_S);
    while (nextStep / STEPS_PER_BEAT < horizon) {
      const t = audioTime(nextStep / STEPS_PER_BEAT);
      // A step the game has already left behind is skipped, never played late;
      // muted, nothing is made at all
      if (t >= now - 0.02 && !sound.muted) {
        scheduleStep(nextStep, Math.max(t, now));
      }
      nextStep += 1;
    }
  }

  function safely(fn) {
    if (disposed || !setup()) {
      return;
    }
    try {
      fn(out.c.currentTime);
    } catch {
      // The music is never worth an error
    }
  }

  return {
    get beat() {
      return beat;
    },
    get bar() {
      return Math.floor(beat / 4);
    },
    /** Where in the beat we are, 0 to 1. */
    get phase() {
      return beat - Math.floor(beat);
    },
    /** 1 on each beat, fading fast: what the visuals bounce with. */
    get pulse() {
      return Math.exp(-(beat - Math.floor(beat)) * 5);
    },
    /** 1 on each bar, fading over the bar. */
    get barPulse() {
      return Math.exp(-(beat / 4 - Math.floor(beat / 4)) * 3);
    },
    get secondsPerBeat() {
      return spbAt(beat);
    },
    /** The tempo being played now. */
    get bpm() {
      return segmentAtBeat(beat).bpm;
    },
    /** From that beat of the song on (a bar line, in the future), play at that tempo. */
    setTempo(bpm, atBeat) {
      const at = Math.max(atBeat, Math.ceil(beat));
      const sec = secondsAt(at);
      segments = segments.filter((seg) => seg.beat < at);
      segments.push({ beat: at, sec, bpm });
      if (out) {
        try {
          const t = Math.max(out.c.currentTime, audioTime(at));
          out.echo.delayTime.setValueAtTime((60 / bpm) * 0.75, t);
        } catch {
          // The echo keeps its old length
        }
      }
    },
    start() {
      beat = 0;
      seconds = 0;
      segments = [{ beat: 0, sec: 0, bpm: song.bpm }];
      nextStep = 0;
      started = true;
      if (setup()) {
        anchor = out.c.currentTime + LATENCY_S;
      }
    },
    update(dt) {
      if (!started || disposed) {
        return;
      }
      seconds += dt;
      beat = beatAt(seconds);
      if (!setup()) {
        return;
      }
      try {
        schedule(dt);
      } catch {
        // A browser that refuses a node keeps the game going, quietly
      }
    },
    /** From that bar on (a bar number of the song), play that section. */
    setSection(name, bar) {
      manualSections = true;
      const from = bar === undefined ? Math.floor(beat / 4) + 1 : bar;
      queue = queue.filter((entry) => entry.bar < from);
      queue.push({ bar: from, name });
      if (!queue.length || queue[0].bar > 0) {
        queue.unshift({ bar: 0, name: "silence" });
      }
    },
    sectionName(bar) {
      let name = queue[0].name;
      for (const entry of queue) {
        if (entry.bar <= bar) {
          name = entry.name;
        }
      }
      return name;
    },
    /** A collectable picked up: a note of the chord being played, on the next sixteenth. */
    note(index) {
      safely((now) => {
        const tones = chord(Math.floor(beat / 4));
        const ladder = [tones[0], tones[1], tones[2], tones[0] + 12, tones[1] + 12, tones[2] + 12];
        const midi = ladder[mod(index, ladder.length)] + 12;
        const nextSixteenth = Math.ceil(beat * STEPS_PER_BEAT) / STEPS_PER_BEAT;
        const t = audioTime(nextSixteenth);
        bell(t - now < 0.06 && t > now ? t : now, midi, 1);
      });
    },
    /** The wood block that says a jump is coming, at a beat of the song. */
    cue(songBeat, strong) {
      safely((now) => {
        const t = audioTime(songBeat);
        if (t > now) {
          wood(t, strong ? 1.6 : 0.8);
        }
      });
    },
    /** A snare roll leading into a beat of the song, over a number of beats. */
    fill(toBeat, beats) {
      safely((now) => {
        const count = Math.round(beats * STEPS_PER_BEAT);
        for (let i = 0; i < count; i++) {
          const t = audioTime(toBeat - beats + i / STEPS_PER_BEAT);
          if (t > now) {
            snare(t, 0.4 + (0.6 * i) / count);
          }
        }
        const t = audioTime(toBeat);
        if (t > now) {
          crash(t, 1);
        }
      });
    },
    /** A small hop sound, for a jump. */
    hop() {
      safely((now) => {
        const g = envelope(now, 0.05, 0.004, 0.1);
        g.connect(out.bus);
        const o = osc("sine", 330, now, 0.12, g);
        o.frequency.exponentialRampToValueAtTime(700, now + 0.1);
      });
    },
    /** The last chord: the world is done. */
    finale() {
      safely((now) => {
        const t = audioTime(Math.ceil(beat * 2) / 2);
        const start = t > now && t - now < 0.4 ? t : now;
        const root = song.root;
        crash(start, 1.2);
        kick(start, 1.2);
        [0, 4, 7, 12, 16].forEach((interval, i) => bell(start + i * 0.07, root + 12 + interval, 0.9));
        pad(start, [root - 12, root - 5, root, root + 4], 2.4, 1.6);
        bass(start, root - 24, 1.2, 1);
        nextStep = Number.MAX_SAFE_INTEGER;
      });
    },
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      started = false;
      if (out) {
        const { c, bus } = out;
        try {
          bus.gain.setTargetAtTime(0, c.currentTime, 0.03);
          setTimeout(() => {
            try {
              bus.disconnect();
            } catch {
              // Already gone with the context
            }
          }, 200);
        } catch {
          // The context was closed with the game
        }
      }
    }
  };
}
