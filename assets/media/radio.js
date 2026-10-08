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

  // One 16th-note step. 16 steps a bar, one chord a bar.
  function play(t) {
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

  function start(lv) {
    if (lv) level = Math.min(5, Math.max(1, lv | 0));
    unlockIOS();
    if (!ctx) build();
    if (ctx.state !== 'running' && ctx.resume) ctx.resume();
    next = ctx.currentTime + 0.05; step = 0;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0.8, ctx.currentTime, 0.6);
    timer = setInterval(tick, 25); playing = true;
  }
  function stop() {
    if (!ctx) return;
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
    clearInterval(timer); timer = null; playing = false;
    if (keepAlive) try { keepAlive.pause(); } catch (e) {}
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
        b.title = playing ? 'Turn SIREN Radio off' : 'Turn SIREN Radio on: an original soundtrack for this page, generated in your browser';
      });
    };
    var check = function () {
      setTimeout(function () {
        if (!playing || !ctx) return;
        if (ctx.state !== 'running') btns.forEach(function (b) { b.textContent = '♪ TAP AGAIN'; b.title = 'Your browser blocked the sound. Tap again; on a phone, check the volume.'; });
      }, 700);
    };
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (playing && ctx && ctx.state !== 'running') { ctx.resume(); unlockIOS(); paint(); check(); return; }
        if (playing) stop(); else start(lv);
        try { localStorage.setItem(KEY, playing ? '1' : '0'); } catch (e) {}
        paint(); check();
      });
    });
    // Remembered "on": browsers forbid sound before a gesture, so resume on the
    // visitor's first tap or key press rather than autoplaying.
    var want = false; try { want = localStorage.getItem(KEY) === '1'; } catch (e) {}
    if (want) {
      btns.forEach(function (b) { b.classList.add('armed'); });
      var go = function (e) {
        if (btns.indexOf(e.target) >= 0 || playing) return;
        start(lv); paint();
      };
      addEventListener('pointerdown', go, { once: true });
      addEventListener('keydown', go, { once: true });
    }
    paint();
  }
  // Render a stretch of the soundtrack offline (used to score the explainer
  // video). `levelAt(seconds)` picks the level at each moment.
  function renderOffline(seconds, levelAt) {
    var saved = [ctx, master, wet, level, step];
    var sr = 44100, off = new OfflineAudioContext(2, Math.ceil(sr * seconds), sr);
    build(off); master.gain.value = 0.8; step = 0;
    var t = 0.05;
    while (t < seconds - 0.5) { level = levelAt(t); t += play(t); }
    master.gain.setValueAtTime(0.8, seconds - 2.5); master.gain.linearRampToValueAtTime(0, seconds - 0.2);
    var done = off.startRendering();
    ctx = saved[0]; master = saved[1]; wet = saved[2]; level = saved[3]; step = saved[4];
    return done;
  }
  window.SirenRadio = { start: start, stop: stop, renderOffline: renderOffline, get playing() { return playing; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
