// SIREN Radio — an original soundtrack generated live in the browser with the
// Web Audio API. No audio files, no third party, no licence questions. It is
// OFF until the visitor presses the button, and the mood follows the index:
// level 5 is a slow, quiet pad; level 1 is fast, tense and loud.
(function () {
  'use strict';
  if (window.SirenRadio) return; // loaded twice (homepage + the bar on every page)
  var KEY = 'siren:radio';
  var BPM = { 5: 70, 4: 84, 3: 96, 2: 110, 1: 124 };
  // A minor: i - VI - III - VII, as MIDI roots with triads.
  var PROG = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
  // EVERY PAGE HAS ITS OWN TUNE. The page's path picks a key, a progression,
  // a lead sound and a small tempo offset, so the Race does not sound like the
  // Newsroom. The homepage keeps the original theme (A minor, no offset).
  var LEAD = 'square', BPM_SHIFT = 0;
  (function seed() {
    var path = (location.pathname.replace(/\/(index\.html)?$/, '/') || '/');
    if (/\/doomcon\/?$|^\/$/.test(path)) return;
    var h = 2166136261;
    for (var i = 0; i < path.length; i++) { h ^= path.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    // Minor-key progressions as scale-degree triads (semitones from the root).
    var SHAPES = [
      [[0, 3, 7], [-4, 0, 3], [-9, -5, -2], [-2, 2, 5]],   // i VI III VII
      [[0, 3, 7], [5, 8, 12], [-2, 2, 5], [-4, 0, 3]],     // i iv VII VI
      [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-5, -1, 2]],    // i VII VI V (Andalusian)
      [[0, 3, 7], [-4, 0, 3], [5, 8, 12], [7, 11, 14]],    // i VI iv V
      [[0, 3, 7], [1, 5, 8], [0, 3, 7], [-2, 2, 5]],       // i bII i VII (phrygian dread)
    ];
    var root = 52 + (h % 9);                    // E3 .. C4
    var shape = SHAPES[(h >>> 4) % SHAPES.length];
    PROG = shape.map(function (c) { return c.map(function (n) { return root + n; }); });
    LEAD = ['square', 'sawtooth', 'triangle', 'square'][(h >>> 8) % 4];
    BPM_SHIFT = ((h >>> 12) % 13) - 6;          // -6 .. +6 bpm
  })();
  // STATIONS. Five genres, all generated live. The page still picks the key
  // and progression, so every page sounds different on every station.
  var SKEY = 'siren:station';
  var STATIONS = [
    { id: 'siren', name: 'SIREN FM', tag: 'Dark synth that follows the level' },
    { id: 'synthwave', name: 'SKYNET SYNTHWAVE', tag: 'Neon drive music for the machine age' },
    { id: 'ambient', name: 'BUNKER AMBIENT', tag: 'Slow drones for the long wait underground' },
    { id: 'chip', name: 'CANARY CHIPTUNE', tag: '8-bit bleeps from Tally\u2019s perch' },
    { id: 'industrial', name: 'JUDGMENT DAY', tag: 'Industrial march. Metal on metal.' },
    { id: 'lofi', name: 'DATA RAIN LO-FI', tag: 'Beats to watch the index to' },
  ];
  var station = 0;
  try { var sv = localStorage.getItem(SKEY); STATIONS.forEach(function (x, i) { if (x.id === sv) station = i; }); } catch (e) {}
  var ctx = null, master = null, wet = null, timer = null, playing = false;
  var level = 4, step = 0, next = 0;

  var hz = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };

  function build(given) {
    ctx = given || new (window.AudioContext || window.webkitAudioContext)();
    noiseBuf = null;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 4;
    // Make-up gain into a limiter: the first mix measured about -40 dB between
    // beats, which phone and laptop speakers render as silence.
    var makeup = ctx.createGain(); makeup.gain.value = 2.2;
    var limit = ctx.createDynamicsCompressor();
    limit.threshold.value = -4; limit.knee.value = 0; limit.ratio.value = 20; limit.attack.value = 0.002; limit.release.value = 0.12;
    master = ctx.createGain(); master.gain.value = 0;
    master.connect(comp); comp.connect(makeup); makeup.connect(limit); limit.connect(ctx.destination);
    // A dark echo for space.
    var delay = ctx.createDelay(1.5); delay.delayTime.value = 0.375;
    var fb = ctx.createGain(); fb.gain.value = 0.32;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
    wet = ctx.createGain(); wet.gain.value = 0.28;
    wet.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(master);
  }

  function voice(type, freq, t, dur, vol, cutoff, toWet) {
    var o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = type; o.frequency.value = freq;
    f.type = 'lowpass'; f.frequency.value = cutoff || 2000;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(master); if (toWet) g.connect(wet);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  function pad(chord, t, dur) {
    chord.forEach(function (m) {
      [-6, 6].forEach(function (cents) {
        var o = voice('sawtooth', hz(m - 12), t, dur, 0.05, 1500 + (5 - level) * 300, true);
        o.detune.value = cents;
      });
    });
  }
  function kick(t, vol) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.35);
    // The body is 42-140 Hz, below what phone speakers reproduce; a short
    // higher click carries the beat on small speakers.
    voice('triangle', 900, t, 0.03, vol * 0.25, 4000, false);
  }
  var noiseBuf = null;
  function hat(t, vol) {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = 7000;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }
  function siren(t, dur) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(hz(69), t);
    o.frequency.linearRampToValueAtTime(hz(76), t + dur / 2);
    o.frequency.linearRampToValueAtTime(hz(69), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.03, t + dur / 2); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(wet); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }

  function snare(t, vol, tone) {
    if (!noiseBuf) hat(t, 0.0001);
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = 'bandpass'; f.frequency.value = tone || 1800; f.Q.value = 0.7;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    s.connect(f); f.connect(g); g.connect(master); g.connect(wet); s.start(t); s.stop(t + 0.2);
    voice('triangle', 190, t, 0.08, vol * 0.5, 2000, false);
  }
  function bell(freq, t, vol) {
    var o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq; o2.type = 'sine'; o2.frequency.value = freq * 2.76;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
    o.connect(g); o2.connect(g); g.connect(master); g.connect(wet);
    o.start(t); o2.start(t); o.stop(t + 3.6); o2.stop(t + 3.6);
  }
  function clang(t, vol) {
    [1, 1.47, 2.09, 2.83].forEach(function (r) { voice('square', 220 * r, t, 0.25, vol / 4, 5000, true); });
    hat(t, vol * 0.8);
  }
  function rnd(n) { return (Math.sin(n * 12.9898) * 43758.5453) % 1 + 1 > 1.5; }

  // One 16th-note step. 16 steps a bar, one chord a bar.
  function play(t) {
    var st = STATIONS[station].id;
    if (st !== 'siren') return STYLE[st](t);
    var s16 = 60 / (BPM[level] + BPM_SHIFT) / 4;
    var bar = Math.floor(step / 16), pos = step % 16;
    var chord = PROG[bar % 4];
    var heat = 5 - level; // 0 calm .. 4 loud
    if (pos === 0) pad(chord, t, s16 * 16);
    if (pos % 4 === 0 && heat >= 1) kick(t, 0.25 + heat * 0.08);
    if (pos % 2 === 0) {
      voice('triangle', hz(chord[0] - 24), t, s16 * 1.8, 0.09, 400, false);
      // the same note an octave up, with harmonics, so the bass line survives small speakers
      voice('sawtooth', hz(chord[0] - 12), t, s16 * 1.6, 0.045, 900, false);
    }
    var arpEvery = heat >= 3 ? 1 : heat >= 1 ? 2 : 4;
    if (pos % arpEvery === 0) {
      var note = chord[(pos / arpEvery) % 3] + (pos >= 8 ? 12 : 0);
      voice(LEAD, hz(note), t, s16 * 0.9, 0.045 + heat * 0.008, 2200 + heat * 500, true);
    }
    if (heat >= 2 && pos % 2 === 1) hat(t, 0.04 + heat * 0.01);
    if (heat >= 3 && pos === 0 && bar % 4 === 3) siren(t, s16 * 16);
    step++;
    return s16;
  }

  // The other stations. Each returns the length of one 16th note, like play().
  var STYLE = {
    synthwave: function (t) {
      var heat = 5 - level, s16 = 60 / (100 + heat * 4 + BPM_SHIFT) / 4;
      var bar = Math.floor(step / 16), pos = step % 16, chord = PROG[bar % 4];
      if (pos === 0) pad(chord.map(function (n) { return n + 12; }), t, s16 * 16);
      if (pos % 4 === 0) kick(t, 0.42);
      if (pos === 4 || pos === 12) snare(t, 0.22, 1500);
      if (pos % 2 === 1) hat(t, 0.05);
      voice('sawtooth', hz(chord[0] - 24 + (pos % 2 ? 12 : 0)), t, s16 * 0.9, 0.07, 700, false);
      var mel = [0, 2, 1, 2, 0, 1, 2, 1];
      if (pos % 2 === 0) voice('sawtooth', hz(chord[mel[(pos / 2 + bar) % 8]] + 12), t, s16 * 1.8, 0.035, 2600, true);
      step++; return s16;
    },
    ambient: function (t) {
      var s16 = 60 / (56 + BPM_SHIFT) / 4;
      var bar = Math.floor(step / 16), pos = step % 16, chord = PROG[bar % 4];
      if (pos === 0) {
        pad(chord, t, s16 * 18);
        voice('sine', hz(chord[0] - 24), t, s16 * 17, 0.12, 300, false);
      }
      if (pos % 4 === 2 && rnd(step + bar * 7)) bell(hz(chord[(step >> 2) % 3] + 24), t, 0.05);
      if (pos === 8 && bar % 2 === 1) bell(hz(chord[2] + 12), t, 0.04);
      step++; return s16;
    },
    chip: function (t) {
      var heat = 5 - level, s16 = 60 / (132 + heat * 6 + BPM_SHIFT) / 4;
      var bar = Math.floor(step / 16), pos = step % 16, chord = PROG[bar % 4];
      voice('square', hz(chord[pos % 3] + 12 + (pos >= 8 ? 12 : 0)), t, s16 * 0.7, 0.04, 6000, false);
      if (pos % 4 === 0) voice('triangle', hz(chord[0] - 12), t, s16 * 3, 0.14, 3000, false);
      if (pos % 8 === 4) snare(t, 0.12, 4000);
      if (pos % 8 === 0) kick(t, 0.25);
      if (pos === 0 && bar % 2 === 0) voice('square', hz(chord[2] + 24), t, s16 * 4, 0.025, 6000, true);
      step++; return s16;
    },
    industrial: function (t) {
      var heat = 5 - level, s16 = 60 / (92 + heat * 5 + BPM_SHIFT) / 4;
      var bar = Math.floor(step / 16), pos = step % 16, chord = PROG[bar % 4];
      if ([0, 3, 6, 10].indexOf(pos) >= 0) kick(t, 0.5);
      if (pos === 4 || pos === 12) clang(t, 0.16);
      if (pos % 2 === 0) voice('sawtooth', hz(chord[0] - 24), t, s16 * 1.5, 0.09, 500 + heat * 120, false);
      if (pos === 0) { voice('sawtooth', hz(chord[0] - 12), t, s16 * 16, 0.04, 900, true); voice('sawtooth', hz(chord[1] - 12), t, s16 * 16, 0.03, 900, true); }
      if (pos === 14 && bar % 2 === 1) snare(t, 0.2, 900);
      step++; return s16;
    },
    lofi: function (t) {
      var s16 = 60 / (74 + BPM_SHIFT) / 4;
      var bar = Math.floor(step / 16), pos = step % 16, chord = PROG[bar % 4];
      var swing = pos % 2 ? s16 * 0.18 : 0, tt = t + swing;
      if (pos === 0 || pos === 7 || pos === 10) kick(tt, 0.3);
      if (pos === 4 || pos === 12) snare(tt, 0.13, 1200);
      if (pos % 2 === 0) hat(tt, 0.025);
      if (pos === 0 || pos === 6) chord.concat([chord[0] + 10]).forEach(function (n, i) { voice('sine', hz(n), tt + i * 0.012, s16 * 5, 0.05, 1600, true); voice('triangle', hz(n + 12), tt + i * 0.012, s16 * 2, 0.012, 2000, false); });
      if (pos % 4 === 0) voice('sine', hz(chord[0] - 24), tt, s16 * 3, 0.15, 400, false);
      if (pos % 3 === 0) hat(t + s16 * 0.5, 0.006);
      step++; return s16;
    },
  };
  function tick() {
    while (next < ctx.currentTime + 0.12) next += play(next);
  }

  // iPhones mute Web Audio when the ring/silent switch is on, unless the page
  // asks for media playback. Safari 17+ takes navigator.audioSession; older
  // versions switch category when an <audio> element is playing, so a silent
  // looping one runs while the radio is on.
  var keepAlive = null;
  function silentWav() {
    var n = 800, b = new ArrayBuffer(44 + n), v = new DataView(b), i;
    var str = function (o, s) { for (var k = 0; k < s.length; k++) v.setUint8(o + k, s.charCodeAt(k)); };
    str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); str(36, 'data'); v.setUint32(40, n, true);
    for (i = 0; i < n; i++) v.setUint8(44 + i, 128);
    return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
  }
  function unlockIOS() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try {
      if (!keepAlive) { keepAlive = new Audio(silentWav()); keepAlive.loop = true; keepAlive.setAttribute('playsinline', ''); keepAlive.setAttribute('x-webkit-airplay', 'deny'); }
      var p = keepAlive.play(); if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }

  // Bumps on every start and stop. A page-load resume that finishes late
  // must not undo a tap that already turned the radio the other way.
  var epoch = 0;
  function start(lv) {
    if (lv) level = Math.min(5, Math.max(1, lv | 0));
    unlockIOS();
    if (!ctx) build();
    if (ctx.state !== 'running' && ctx.resume) ctx.resume();
    if (!playing) { next = ctx.currentTime + 0.05; step = 0; }
    if (timer) clearInterval(timer);
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0.8, ctx.currentTime, 0.6);
    timer = setInterval(tick, 25); playing = true; epoch++;
  }
  function stop() {
    epoch++;
    playing = false;
    if (timer) { clearInterval(timer); timer = null; }
    if (ctx && master) {
      try {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
      } catch (e) {}
    }
    if (keepAlive) try { keepAlive.pause(); } catch (e) {}
  }

  function setStation(i) {
    station = i; step = 0;
    try { localStorage.setItem(SKEY, STATIONS[i].id); } catch (e) {}
  }
  function toast() {
    var el = document.getElementById('siren-radio-toast');
    if (!el) {
      el = document.createElement('div'); el.id = 'siren-radio-toast'; el.setAttribute('role', 'status');
      el.style.cssText = 'position:fixed;left:50%;bottom:64px;transform:translateX(-50%);z-index:10000;padding:10px 16px;border-radius:8px;background:#0B0F16;color:#E6EAF0;border:1px solid #818CF8;font:600 13px/1.35 system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.5);text-align:center;transition:opacity .4s;pointer-events:none';
      document.body.appendChild(el);
    }
    el.innerHTML = '\ud83d\udcfb <b>' + STATIONS[station].name + '</b><br><span style="font-weight:400;opacity:.8">' + STATIONS[station].tag + ' \u00b7 station ' + (station + 1) + ' of ' + STATIONS.length + '</span>';
    el.style.opacity = '1'; clearTimeout(toast.t); toast.t = setTimeout(function () { el.style.opacity = '0'; }, 2600);
  }
  function wire() {
    // Every radio button on the page: the homepage's top-bar one (#siren-radio)
    // and the one in the bar at the foot of every page ([data-siren-radio]).
    var btns = [].slice.call(document.querySelectorAll('#siren-radio, [data-siren-radio]'));
    if (!btns.length) return;
    var lv = +(btns[0].getAttribute('data-level')) || 4;
    var paint = function () {
      btns.forEach(function (b) {
        b.setAttribute('aria-pressed', String(playing));
        var short = b.hasAttribute('data-siren-radio');
        b.textContent = playing ? (short ? '♪ ON' : '♪ RADIO ON') : (short ? '♪ OFF' : '♪ RADIO');
        b.title = playing ? 'Turn SIREN Radio off (now playing: ' + STATIONS[station].name + ')' : 'Turn SIREN Radio on: an original soundtrack for this page, generated in your browser';
      });
      [].slice.call(document.querySelectorAll('[data-siren-now]')).forEach(function (n) { n.textContent = STATIONS[station].name; });
      [].slice.call(document.querySelectorAll('[data-siren-station]')).forEach(function (sb) {
        var id = sb.getAttribute('data-siren-station');
        if (id) sb.setAttribute('aria-pressed', String(playing && id === STATIONS[station].id));
      });
    };
    // A blocked start used to leave the button saying "on" and treat the next
    // tap as a resume, so the visitor could not turn the radio off. If the
    // context never actually runs, drop back to off and let the next tap be
    // a real start inside their gesture.
    var check = function () {
      var mark = epoch;
      setTimeout(function () {
        if (mark !== epoch || !playing || !ctx) return;
        if (ctx.state === 'running') return;
        stop();
        paint();
        btns.forEach(function (b) { b.title = 'The browser blocked the sound. Tap again to turn SIREN Radio on. On a phone, check the volume and the silent switch.'; });
      }, 700);
    };
    function hitControl(e) {
      var n = e.target;
      while (n && n !== document) {
        if (n.id === 'siren-radio' || (n.hasAttribute && (n.hasAttribute('data-siren-radio') || n.hasAttribute('data-siren-station')))) return true;
        n = n.parentNode;
      }
      return false;
    }
    // Station buttons: [data-siren-station] steps to the next station, and
    // [data-siren-station="synthwave"] (on the radio page) tunes straight to one.
    [].slice.call(document.querySelectorAll('[data-siren-station]')).forEach(function (sb) {
      sb.addEventListener('click', function () {
        var want = sb.getAttribute('data-siren-station'), i = -1;
        STATIONS.forEach(function (x, k) { if (x.id === want) i = k; });
        setStation(i >= 0 ? i : (station + 1) % STATIONS.length);
        if (!playing) start(lv);
        try { localStorage.setItem(KEY, '1'); } catch (e) {}
        paint(); check(); toast();
      });
    });
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        // Always a toggle. A suspended context used to swallow the off tap
        // and resume instead, so on and off fought each other.
        if (playing) stop(); else start(lv);
        try { localStorage.setItem(KEY, playing ? '1' : '0'); } catch (e) {}
        paint();
        if (playing) check();
      });
    });
    // Remembered "on": browsers forbid sound before a gesture, so resume on the
    // visitor's first tap or key press rather than autoplaying.
    var want = false; try { want = localStorage.getItem(KEY) === '1'; } catch (e) {}
    if (want) {
      btns.forEach(function (b) { b.classList.add('armed'); });
      // KEEP PLAYING ACROSS PAGES. The radio was on on the last page, so try
      // to carry straight on. Browsers that remember the visitor has been
      // interacting with the site allow it; the rest need one tap, which the
      // listeners below catch anywhere on the page.
      try {
        start(lv);
        var mark = epoch;
        setTimeout(function () {
          if (mark !== epoch) return;
          if (ctx && ctx.state === 'running' && playing) { paint(); return; }
          stop();
          paint();
          btns.forEach(function (b) { b.title = 'SIREN Radio was on. Tap the button, or anywhere else, to keep it playing.'; if (b.hasAttribute('data-siren-radio')) b.textContent = '♪ TAP'; });
        }, 350);
      } catch (e) {}
      // Resume on the first gesture that browsers accept as user activation.
      // iOS ignores pointerdown from a finger (only touchend/click count), so
      // listen to all of them and stay armed until the audio really runs.
      var evs = ['pointerup', 'touchend', 'click', 'keydown'];
      var disarm = function () { evs.forEach(function (n) { removeEventListener(n, go, true); }); };
      var go = function (e) {
        if (hitControl(e)) { disarm(); return; }
        if (playing && ctx && ctx.state === 'running') { disarm(); return; }
        try { if (localStorage.getItem(KEY) !== '1') { disarm(); return; } } catch (err) {}
        start(lv);
        paint();
        if (ctx && ctx.state === 'running') disarm();
        else if (ctx && ctx.resume) ctx.resume().then(function () { if (ctx.state === 'running') { disarm(); paint(); } }).catch(function () {});
      };
      evs.forEach(function (n) { addEventListener(n, go, true); });
      // Coming back to a backgrounded tab (iOS suspends audio): pick up again.
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState !== 'visible' || !playing || !ctx) return;
        if (ctx.state !== 'running' && ctx.resume) ctx.resume().catch(function () {});
        unlockIOS();
      });
    }
    paint();
  }
  // Render a stretch of the soundtrack offline (used to score the explainer
  // video). `levelAt(seconds)` picks the level at each moment.
  function renderOffline(seconds, levelAt, st) {
    var saved = [ctx, master, wet, level, step, station];
    if (st != null) station = st;
    var sr = 44100, off = new OfflineAudioContext(2, Math.ceil(sr * seconds), sr);
    build(off); master.gain.value = 0.8; step = 0;
    var t = 0.05;
    while (t < seconds - 0.5) { level = levelAt(t); t += play(t); }
    master.gain.setValueAtTime(0.8, seconds - 2.5); master.gain.linearRampToValueAtTime(0, seconds - 0.2);
    var done = off.startRendering();
    ctx = saved[0]; master = saved[1]; wet = saved[2]; level = saved[3]; step = saved[4]; station = saved[5];
    return done;
  }
  window.SirenRadio = { start: start, stop: stop, renderOffline: renderOffline, stations: STATIONS, setStation: setStation, get station() { return station; }, get playing() { return playing; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
