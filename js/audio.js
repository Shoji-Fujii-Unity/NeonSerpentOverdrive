/* ============================================================
   audio — Tone.js による procedural synthwave BGM + SFX
   (Tone が読めない場合は Web Audio 合成の互換モードで動作)
   ============================================================ */
(function () {
  var N = window.NSO || (window.NSO = {});
  var T = (typeof Tone !== 'undefined') ? Tone : null;

  var st = {
    ready: false, backend: 'none',
    sfxOn: true, musicOn: true, volMusic: 0.55, volSfx: 0.80,
    playing: false, intensity: 0, targetIntensity: 0, step: 0, ctx: null
  };

  /* ---------- helpers ---------- */
  var NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  function m2n(m) { return NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1); }
  function transport() { return (T && T.getTransport) ? T.getTransport() : (T && T.Transport); }
  function dest() { return (T && T.getDestination) ? T.getDestination() : (T && T.Destination); }
  function now() { try { return T.now(); } catch (e) { return 0; } }

  /* ---------- legacy fallback (no Tone) ---------- */
  var legacy = { ac: null, master: null };
  function legacyInit() {
    if (legacy.ac) return true;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      legacy.ac = new AC();
      legacy.master = legacy.ac.createGain();
      legacy.master.gain.value = st.volSfx;
      legacy.master.connect(legacy.ac.destination);
      st.backend = 'legacy';
      return true;
    } catch (e) { return false; }
  }
  function legacyTone(freq, dur, type, gain, glideTo) {
    if (!st.sfxOn || !legacy.ac) return;
    try {
      var ac = legacy.ac, t0 = ac.currentTime;
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
      if (glideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, glideTo), t0 + dur);
      g.gain.setValueAtTime((gain || 0.12) * st.volSfx, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g); g.connect(legacy.master); o.start(t0); o.stop(t0 + dur + 0.02);
    } catch (e) {}
  }

  /* ---------- Tone rig ---------- */
  var g = {}, v = {}, rig = null;

  /* 8小節リフ： Am F C G | Am F Dm E */
  var PROG = [
    { root: 45, chord: [57, 60, 64] },
    { root: 41, chord: [53, 57, 60] },
    { root: 48, chord: [52, 55, 60] },
    { root: 43, chord: [50, 55, 59] },
    { root: 45, chord: [57, 60, 64] },
    { root: 41, chord: [53, 57, 60] },
    { root: 50, chord: [50, 53, 57] },
    { root: 40, chord: [52, 56, 59] }
  ];
  var BASS_PAT = [0, 0, 12, 0, 0, 12, 0, 7];         /* 8分音符 */
  var ARP_IDX = [0, 1, 2, 3, 4, 5, 4, 2];
  var LEAD = [null, 4, null, 7, null, null, 5, 4, null, 2, null, null, 0, null, 2, null]; /* 16分 */
  var PENTA = [69, 72, 74, 76, 79, 81, 84];

  function buildRig() {
    rig = {};
    var dst = dest();
    g.music = new Tone.Gain(st.musicOn ? st.volMusic : 0).connect(dst);
    g.sfx = new Tone.Gain(st.sfxOn ? st.volSfx : 0).connect(dst);

    g.padBus = new Tone.Gain(0.34).connect(g.music);
    g.arpBus = new Tone.Gain(0.0).connect(g.music);
    g.drmBus = new Tone.Gain(0.0).connect(g.music);
    g.bassBus = new Tone.Gain(0.62).connect(g.music);

    try {
      g.delay = new Tone.FeedbackDelay('8n', 0.34);
      g.delay.wet.value = 0.38;
      g.delay.connect(g.arpBus);
    } catch (e) { g.delay = null; }

    v.pad = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.42, decay: 0.7, sustain: 0.55, release: 1.4 }
    }).connect(g.padBus);
    v.pad.volume.value = -8;

    v.bass = new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      filter: { Q: 5, type: 'lowpass' },
      filterEnvelope: { attack: 0.008, decay: 0.2, sustain: 0.18, baseFrequency: 90, octaves: 2.4, release: 0.25 },
      envelope: { attack: 0.006, decay: 0.18, sustain: 0.5, release: 0.12 }
    }).connect(g.bassBus);
    v.bass.volume.value = -6;

    v.arp = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'square' },
      envelope: { attack: 0.002, decay: 0.12, sustain: 0.0, release: 0.06 }
    });
    if (g.delay) { v.arp.chain ? v.arp.chain(g.delay, g.arpBus) : v.arp.connect(g.delay); }
    else v.arp.connect(g.arpBus);
    v.arp.volume.value = -10;

    try {
      v.kick = new Tone.MembraneSynth({ pitchDecay: 0.035, octaves: 5.5, oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.32, sustain: 0.02, release: 0.15 } }).connect(g.drmBus);
      v.kick.volume.value = -4;
    } catch (e) { v.kick = null; }
    try {
      v.snare = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.16, sustain: 0 } }).connect(g.drmBus);
      v.snare.volume.value = -12;
      v.hat = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.045, sustain: 0 } }).connect(g.drmBus);
      v.hat.volume.value = -20;
    } catch (e) { v.snare = null; v.hat = null; }

    /* --- SFX voices --- */
    v.blip = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.002, decay: 0.09, sustain: 0, release: 0.05 } }).connect(g.sfx);
    v.blip.volume.value = -6;
    v.lead = new Tone.Synth({ oscillator: { type: 'sawtooth' }, envelope: { attack: 0.004, decay: 0.2, sustain: 0.1, release: 0.1 } }).connect(g.sfx);
    v.lead.volume.value = -10;
    v.thud = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.3, sustain: 0 } }).connect(g.sfx);
    v.thud.volume.value = -12;
    try {
      v.metal = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.22, release: 0.1 }, harmonicity: 3.1, modulationIndex: 22, resonance: 3200, octaves: 1.4 }).connect(g.sfx);
      v.metal.volume.value = -22;
    } catch (e) { v.metal = null; }
    try {
      v.low = new Tone.Synth({ oscillator: { type: 'sawtooth' }, envelope: { attack: 0.01, decay: 0.5, sustain: 0.3, release: 0.5 } }).connect(g.sfx);
      v.low.volume.value = -10;
    } catch (e) { v.low = null; }
  }

  function scheduleMusic() {
    var tr = transport();
    if (!tr) return;
    tr.bpm.value = 108;
    var steps = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    try {
      rig.seq = new Tone.Sequence(function (time) { stepEvent(time); }, steps, '16n');
      rig.seq.start(0);
      return;
    } catch (e) { rig.seq = null; st.err = 'seq:' + (e && e.message); }
    /* 古い / 新しい Transport 両対応のフォールバック */
    try {
      var ev = tr.scheduleRepeat(function (time) { stepEvent(time); }, '16n');
      if (ev && typeof ev.start === 'function') ev.start(0);
      rig.repeat = ev;
    } catch (e) {}
  }

  function chordOf(bar) { return PROG[bar % PROG.length]; }

  function stepEvent(time) {
    var s = st.step++;
    var bar = Math.floor(s / 16) % PROG.length;
    var k = s % 16;
    var ch = chordOf(bar);
    var I = st.intensity;

    /* pad: each bar downbeat */
    if (k === 0) {
      var names = ch.chord.map(m2n);
      try { v.pad.triggerAttackRelease(names, '1n', time); } catch (e) {}
    }
    /* bass: 8th grid (even steps) */
    if (k % 2 === 0) {
      var off = BASS_PAT[k / 2];
      var bn = m2n(ch.root + off - (I >= 2 && k % 8 === 6 ? 12 : 0));
      try { v.bass.triggerAttackRelease(bn, '16n', time); } catch (e) {}
    }
    /* drums */
    if (I >= 1 && v.kick && (k === 0 || k === 4 || k === 8 || k === 12 || (I >= 3 && k === 14))) {
      try { v.kick.triggerAttackRelease('A1', '8n', time); } catch (e) {}
    }
    if (I >= 2 && v.snare && (k === 4 || k === 12)) {
      try { v.snare.triggerAttackRelease('16n', time); } catch (e) {}
    }
    if (I >= 2 && v.hat && (k % 2 === 1)) {
      try { v.hat.triggerAttackRelease('32n', time); } catch (e) {}
    }
    /* arp */
    if (I >= 2) {
      var tones = ch.chord.concat([ch.chord[0] + 12, ch.chord[1] + 12, ch.chord[2] + 12]);
      var note = tones[ARP_IDX[k % ARP_IDX.length]];
      try { v.arp.triggerAttackRelease(m2n(note), '32n', time); } catch (e) {}
    }
    /* lead (overdrive) */
    if (I >= 3) {
      var li = LEAD[k];
      if (li !== null && li !== undefined) {
        try { v.arp.triggerAttackRelease(m2n(PENTA[(li + bar) % PENTA.length]), '16n', time); } catch (e) {}
      }
    }
  }

  /* smooth gain ramps for layer intensity */
  function syncIntensityGains(dt) {
    if (!rig) return;
    var I = st.intensity;
    var tgt = { arp: I >= 2 ? (I >= 3 ? 0.34 : 0.24) : 0.0, drm: I >= 1 ? 0.55 : 0.0 };
    try {
      g.arpBus.gain.linearRampToValueAtTime(tgt.arp, T.now() + 0.25);
      g.drmBus.gain.linearRampToValueAtTime(tgt.drm, T.now() + 0.25);
    } catch (e) {}
  }

  /* ---------- public API ---------- */
  var A = {
    init: function () {
      if (st.ready) { A.resume(); return true; }
      if (T) {
        try {
          buildRig();
          st.backend = 'tone';
          st.ready = true;
          A.resume();
          return true;
        } catch (e) {
          T = null; rig = null;
          st.err = 'rig:' + (e && e.message);
        }
      }
      st.ready = legacyInit();
      return st.ready;
    },
    resume: function () {
      try { if (T && T.start) T.start(); } catch (e) {}
      try { if (legacy.ac && legacy.ac.state === 'suspended') legacy.ac.resume(); } catch (e) {}
    },
    backend: function () { return st.backend; },
    debug: function () {
      return {
        backend: st.backend, ready: st.ready, playing: st.playing, musicOn: st.musicOn, sfxOn: st.sfxOn,
        rig: !!rig, seq: !!(rig && rig.seq), repeat: !!(rig && rig.repeat), err: st.err || null,
        intensity: st.intensity, tone: typeof Tone, trState: (Tone && transport()) ? transport().state : '-'
      };
    },

    setSfx: function (on) {
      st.sfxOn = !!on;
      if (rig) { try { g.sfx.gain.value = st.sfxOn ? st.volSfx : 0; } catch (e) {} }
      if (legacy.master) { try { legacy.master.gain.value = st.sfxOn ? st.volSfx : 0; } catch (e) {} }
    },
    setMusic: function (on) {
      st.musicOn = !!on;
      if (!rig) return;
      try { g.music.gain.linearRampToValueAtTime(st.musicOn ? st.volMusic : 0, T.now() + 0.35); } catch (e) {}
      if (st.musicOn && !st.playing) A.startMusic();
    },
    setVolMusic: function (v01) {
      st.volMusic = Math.max(0, Math.min(1, Number(v01) || 0));
      if (rig) { try { g.music.gain.linearRampToValueAtTime(st.musicOn ? st.volMusic : 0, T.now() + 0.15); } catch (e) {} }
    },
    setVolSfx: function (v01) {
      st.volSfx = Math.max(0, Math.min(1, Number(v01) || 0));
      if (rig) { try { g.sfx.gain.value = st.sfxOn ? st.volSfx : 0; } catch (e) {} }
      if (legacy.master) { try { legacy.master.gain.value = st.sfxOn ? st.volSfx : 0; } catch (e) {} }
    },

    startMusic: function () {
      if (!rig || !st.musicOn || st.playing) return;
      var doStart = function () {
        if (st.playing) return;
        try {
          var tr = transport();
          if (!rig.seq && !rig.repeat) scheduleMusic();
          tr.start(now() + 0.05);
          st.playing = true;
          st.step = 0;
          A.setIntensity(1);
        } catch (e) { st.err = (e && (e.message || String(e))) || 'unknown'; }
      };
      try {
        A.resume();
        if (Tone.start) {
          var pr = Tone.start();
          if (pr && pr.then) pr.then(doStart, function () {});
          else doStart();
        } else doStart();
      } catch (e) {}
    },
    stopMusic: function () {
      if (!rig || !st.playing) return;
      try { transport().stop(); } catch (e) {}
      try { v.pad.releaseAll(); } catch (e) {}
      st.playing = false;
      st.intensity = 0;
    },
    setIntensity: function (i) {
      i = Math.max(0, Math.min(3, i | 0));
      if (st.intensity === i) return;
      st.intensity = i;
      syncIntensityGains();
    },

    /* ---------- SFX ---------- */
    eat: function (combo) {
      var scale = [64, 67, 69, 72, 74, 76, 79, 81, 84, 86];
      var m = scale[Math.min(scale.length - 1, combo)];
      if (rig && st.sfxOn) { try { v.blip.triggerAttackRelease(m2n(m + 12), '32n'); } catch (e) {} }
      else legacyTone(760 + combo * 46, 0.1, 'sine', 0.09);
    },
    power: function () {
      if (rig && st.sfxOn) {
        var seq = [72, 76, 79, 84], t0 = now();
        for (var i = 0; i < seq.length; i++) { try { v.blip.triggerAttackRelease(m2n(seq[i]), '32n', t0 + i * 0.06); } catch (e) {} }
      } else { legacyTone(523, 0.08); setTimeout(function () { legacyTone(659, 0.08); }, 70); setTimeout(function () { legacyTone(784, 0.16); }, 150); }
    },
    pulse: function () {
      if (rig && st.sfxOn) {
        try { v.thud.triggerAttackRelease('16n'); } catch (e) {}
        try { v.lead.triggerAttackRelease('D3', '16n'); v.lead.frequency.rampTo('D5', 0.12); } catch (e) {}
      } else legacyTone(240, 0.3, 'sawtooth', 0.08, 900);
    },
    stun: function () {
      if (rig && st.sfxOn) { try { if (v.metal) v.metal.triggerAttackRelease('16n'); else v.blip.triggerAttackRelease('E6', '32n'); } catch (e) {} }
      else legacyTone(1400, 0.14, 'square', 0.06, 700);
    },
    kill: function () {
      if (rig && st.sfxOn) {
        try { v.thud.triggerAttackRelease('8n'); } catch (e) {}
        try { v.lead.triggerAttackRelease('A4', '16n'); v.lead.frequency.rampTo('A2', 0.22); } catch (e) {}
      } else { legacyTone(420, 0.26, 'square', 0.1, 90); legacyTone(180, 0.4, 'sawtooth', 0.08, 60); }
    },
    hurt: function () {
      if (rig && st.sfxOn) {
        try { v.thud.triggerAttackRelease('4n'); } catch (e) {}
        if (v.low) { try { v.low.triggerAttackRelease('A2', '4n'); v.low.frequency.rampTo('A1', 0.7); } catch (e) {} }
      } else { legacyTone(190, 0.5, 'sawtooth', 0.14, 55); }
    },
    rankUp: function () {
      if (rig && st.sfxOn) {
        var seq = [72, 79, 84, 88], t0 = now();
        for (var i = 0; i < seq.length; i++) { try { v.blip.triggerAttackRelease(m2n(seq[i]), '16n', t0 + i * 0.08); } catch (e) {} }
      } else for (var j = 0; j < 4; j++) (function (k) { setTimeout(function () { legacyTone(660 + k * 160, 0.18, 'triangle', 0.09); }, k * 90); })(j);
    },
    ping: function (f0, f1) {
      if (rig && st.sfxOn) { try { v.blip.triggerAttackRelease(m2n(f0 || 84), '32n'); } catch (e) {} }
      else legacyTone(f1 || 1100, 0.12, 'sine', 0.08);
    },
    ui: function () {
      if (rig && st.sfxOn) { try { v.blip.triggerAttackRelease('B5', '64n'); } catch (e) {} }
      else legacyTone(880, 0.05, 'sine', 0.05);
    },
    countdown: function (n) {
      if (rig && st.sfxOn) { try { v.blip.triggerAttackRelease(m2n(n > 0 ? 69 : 81), n > 0 ? '16n' : '8n'); } catch (e) {} }
      else legacyTone(n > 0 ? 440 : 880, n > 0 ? 0.2 : 0.3, 'sine', 0.12);
    }
  };

  N.audio = A;
})();
