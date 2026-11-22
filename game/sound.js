// Sound for Math Trail: 8-bit style music and effects made with the Web Audio API.
//
// Everything is generated in code, so there are no sound files to download or cache.
// The sound copies the style of old console games (pulse and triangle waves, short
// bouncy notes), but every melody here is original.
"use strict";

const Sound = (() => {
  const MUTE_KEY = "math-trail-muted";
  const VOLUME = 0.3;          // master volume
  const MUSIC_VOLUME = 0.4;    // music relative to the effects
  const STEP = 0.1;            // one 16th note at 150 BPM, in seconds

  let ctx = null, master = null, pulse = null;
  let musicBus = null, musicTimer = null, nextNoteTime = 0, step = 0;
  let muted = false;
  try { muted = localStorage.getItem(MUTE_KEY) === "1"; } catch (e) { /* storage blocked */ }

  const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

  // The audio context may only start after a tap or click, so it is created on first use.
  function ready() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : VOLUME;
      master.connect(ctx.destination);
      // A 25% pulse wave: the thin, buzzy lead sound of 8-bit consoles.
      const n = 32, real = new Float32Array(n), imag = new Float32Array(n);
      for (let k = 1; k < n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * 0.25);
      pulse = ctx.createPeriodicWave(real, imag);
    }
    if (ctx.state === "suspended") ctx.resume();
    return true;
  }

  // One note. opts: wave ("pulse" | "triangle"), vol, slideTo (Hz), out (gain node).
  function tone(freq, t, dur, opts = {}) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    if (opts.wave === "triangle") osc.type = "triangle"; else osc.setPeriodicWave(pulse);
    osc.frequency.setValueAtTime(freq, t);
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t + dur);
    const vol = opts.vol === undefined ? 0.5 : opts.vol;
    g.gain.setValueAtTime(vol, t);
    g.gain.linearRampToValueAtTime(vol * 0.6, t + dur * 0.7);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(opts.out || master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // ---- Music: a 4-bar loop (C, Am, F, G), lead on pulse, bass on triangle ----
  // Lead as [midi note or 0 for rest, length in 16th notes]; each bar is 16 steps.
  const LEAD = [
    [76, 2], [79, 2], [84, 2], [0, 2], [79, 2], [76, 2], [79, 4],
    [81, 2], [84, 2], [88, 2], [0, 2], [86, 2], [84, 2], [81, 4],
    [81, 2], [77, 2], [81, 2], [84, 2], [86, 2], [84, 2], [81, 4],
    [79, 2], [83, 2], [86, 2], [0, 2], [83, 2], [79, 1], [81, 1], [83, 4]
  ];
  const ROOTS = [48, 45, 41, 43];          // C3, A2, F2, G2
  const BASS_BAR = [0, 12, 7, 12, 0, 12, 7, 12]; // oom-pah on 8th notes: root, octave, fifth, octave
  const LOOP_STEPS = 64;

  // Turn the lead list into a lookup: step -> [note, length].
  const leadAt = {};
  LEAD.reduce((pos, [note, len]) => { if (note) leadAt[pos] = [note, len]; return pos + len; }, 0);

  function scheduleMusic() {
    // If the timer was throttled, skip ahead instead of playing a burst of late notes.
    if (nextNoteTime < ctx.currentTime - 0.1) nextNoteTime = ctx.currentTime + 0.02;
    while (nextNoteTime < ctx.currentTime + 0.2) {
      const s = step % LOOP_STEPS;
      const lead = leadAt[s];
      if (lead) tone(hz(lead[0]), nextNoteTime, lead[1] * STEP * 0.85, { vol: 0.35, out: musicBus });
      if (s % 2 === 0) {
        const bar = Math.floor(s / 16);
        const note = ROOTS[bar] + BASS_BAR[(s % 16) / 2];
        tone(hz(note), nextNoteTime, STEP * 1.6, { wave: "triangle", vol: 0.7, out: musicBus });
      }
      nextNoteTime += STEP;
      step++;
    }
  }

  function startMusic() {
    if (!ready()) return;
    stopMusic();
    musicBus = ctx.createGain();
    musicBus.gain.value = MUSIC_VOLUME;
    musicBus.connect(master);
    step = 0;
    nextNoteTime = ctx.currentTime + 0.05;
    scheduleMusic();
    musicTimer = setInterval(scheduleMusic, 25);
  }

  function stopMusic() {
    clearInterval(musicTimer);
    musicTimer = null;
    if (musicBus && ctx) {
      // Fade out the notes that are already scheduled, then drop the old bus.
      const bus = musicBus;
      bus.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
      setTimeout(() => bus.disconnect(), 400);
    }
    musicBus = null;
  }

  // ---- Effects ---------------------------------------------------------------
  function play(fn) { if (ready()) fn(ctx.currentTime + 0.01); }

  // Right answer: a bright two-note "ding".
  const correct = () => play((t) => {
    tone(hz(88), t, 0.07, { vol: 0.45 });
    tone(hz(93), t + 0.07, 0.35, { vol: 0.45 });
  });

  // Wrong answer: a short "bonk" that drops down.
  const wrong = () => play((t) => {
    tone(hz(67), t, 0.09, { vol: 0.4 });
    tone(hz(60), t + 0.1, 0.09, { vol: 0.4 });
    tone(196, t + 0.2, 0.35, { vol: 0.4, slideTo: 80 });
    tone(hz(36), t + 0.2, 0.3, { wave: "triangle", vol: 0.6 });
  });

  // Moving on to the next obstacle: a quick rising "whoop".
  const next = () => play((t) => {
    tone(330, t, 0.16, { vol: 0.3, slideTo: 990 });
  });

  // Reaching the goal: rising arpeggio and a held "ta-da".
  const goal = () => play((t) => {
    [67, 72, 76, 79, 84, 88].forEach((n, i) => tone(hz(n), t + i * 0.08, 0.08, { vol: 0.4 }));
    tone(hz(91), t + 0.48, 0.45, { vol: 0.4 });
    tone(hz(84), t + 1.0, 0.12, { vol: 0.4 });
    tone(hz(88), t + 1.14, 0.12, { vol: 0.4 });
    tone(hz(96), t + 1.28, 0.7, { vol: 0.4 });
    [[48, 0], [55, 0.48], [43, 1.0], [48, 1.28]].forEach(([n, d]) =>
      tone(hz(n), t + d, d === 1.28 ? 0.7 : 0.4, { wave: "triangle", vol: 0.7 }));
  });

  function setMuted(value) {
    muted = value;
    try { localStorage.setItem(MUTE_KEY, muted ? "1" : "0"); } catch (e) { /* storage blocked */ }
    if (master) master.gain.setTargetAtTime(muted ? 0 : VOLUME, ctx.currentTime, 0.02);
  }

  // Pause all sound while the app is in the background.
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });

  return { startMusic, stopMusic, correct, wrong, next, goal, setMuted, isMuted: () => muted };
})();
