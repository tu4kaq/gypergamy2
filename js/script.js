/* ============================================================
   ГИПЕРГАМИЯ · script.js — экраны, звук, ввод, HUD, цикл
   ============================================================ */
(function () {
'use strict';
const $ = s => document.querySelector(s);
const els = {
  bg: $('#bg-canvas'), heroCv: $('#hero-canvas'), gameCv: $('#game-canvas'),
  cursor: $('#cursor-glow'), topbar: $('#topbar'), veil: $('#veil'),
  landing: $('#screen-landing'), menu: $('#screen-menu'), gameScr: $('#screen-game'),
  victory: $('#screen-victory'), defeat: $('#screen-defeat'), pause: $('#overlay-pause'),
  readyPill: $('#ready-pill'), readyText: $('#ready-text'),
  heroStart: $('#hero-start'), heroControls: $('#hero-controls'), topPlay: $('#topbar-play'),
  teaserPlay: $('#teaser-play'), stageTilt: $('#stage-tilt'), stageCard: $('#stage-card'),
  menuPlay: $('#menu-play'), menuBack: $('#menu-back'), soundState: $('#sound-state'),
  recordChip: $('#record-chip'), recordText: $('#record-text'),
  lifeChip: $('#life-chip'), hearts: Array.from(document.querySelectorAll('#hearts .heart')),
  starChip: $('#star-chip'), starCount: $('#star-count'), starTotal: $('#star-total'),
  progChip: $('#prog-chip'), progPct: $('#prog-pct'), btnPause: $('#btn-pause'),
  toast: $('#tutorial-toast'), countdown: $('#countdown'), cdNum: $('#cd-num'),
  tLeft: $('#touch-left'), tRight: $('#touch-right'), tJump: $('#touch-jump'),
  pauseResume: $('#pause-resume'), pauseRestart: $('#pause-restart'), pauseMenu: $('#pause-menu'),
  vStars: $('#v-stars'), vTotal: $('#v-total'), vTime: $('#v-time'), vRecord: $('#v-record'),
  vAgain: $('#v-again'), vMenu: $('#v-menu'), sparkles: $('#sparkles'),
  dRetry: $('#d-retry'), dMenu: $('#d-menu')
};
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};
const finePointer = matchMedia('(pointer: fine)').matches;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;
if (isTouch) document.body.classList.add('touch');

/* ---------------- звук (Web Audio + MP3 Support) ---------------- */
const AudioFX = {
  ctx: null, master: null, musicBus: null, noiseBuf: null,
  enabled: true, musicOn: false, nextNote: 0, stepIdx: 0,
  
  // NEW PROPERTIES FOR CUSTOM MUSIC
  customBuffer: null,
  customSource: null,

  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? .5 : 0;
      this.master.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.connect(this.master);
      
      // Delay effect for synth sounds
      const delay = this.ctx.createDelay(.6); delay.delayTime.value = .32;
      const fb = this.ctx.createGain(); fb.gain.value = .32;
      delay.connect(fb); fb.connect(delay);
      const wet = this.ctx.createGain(); wet.gain.value = .3;
      delay.connect(wet); wet.connect(this.master);
      this.musicBus.connect(delay);
      
      // White noise buffer for SFX
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { this.ctx = null; }
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); },
  setEnabled(v) {
    this.enabled = v;
    if (this.ctx) { this.master.gain.setTargetAtTime(v ? .5 : 0, this.ctx.currentTime, .02); if (v) this.resume(); }
  },
  
  // LOAD THE USER'S FILE
  async loadCustomMusic(url) {
    if (!this.ctx) return;
    try {
      const res = await fetch(url);
      const buf = await res.arrayBuffer();
      this.customBuffer = await this.ctx.decodeAudioData(buf);
      console.log("Defeat Music Loaded");
    } catch (err) {
      console.error("Error loading defeat music", err);
    }
  },

  playCustomMusic() {
    if (!this.ctx || !this.enabled || !this.customBuffer) return;
    this.stopCustomMusic(); // Ensure clean start
    
    this.customSource = this.ctx.createBufferSource();
    this.customSource.buffer = this.customBuffer;
    this.customSource.loop = true; // Loop the noise forever? Or just once? Let's loop it as per meme format usually.
    this.customSource.connect(this.master);
    this.customSource.start(0);
  },

  stopCustomMusic() {
    if (this.customSource) {
      try { this.customSource.stop(); } catch(e) {}
      this.customSource.disconnect();
      this.customSource = null;
    }
  },

  tone(o) {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const t0 = this.ctx.currentTime + (o.at || 0);
    const osc = this.ctx.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f0, t0);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t0 + o.dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.vol, t0 + (o.attack || .008));
    g.gain.exponentialRampToValueAtTime(.0001, t0 + o.dur);
    osc.connect(g); g.connect(o.bus || this.master);
    osc.start(t0); osc.stop(t0 + o.dur + .05);
  },
  noise(o) {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const t0 = this.ctx.currentTime + (o.at || 0);
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.freq || 600;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.vol, t0 + .01);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + o.dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t0); src.stop(t0 + o.dur + .05);
  },
  play(name) {
    if (!this.ctx || !this.enabled) return;
    switch (name) {
      case 'click': this.tone({ f0: 750, f1: 520, dur: .07, vol: .15 }); break;
      case 'count': this.tone({ f0: 620, dur: .09, vol: .12 }); break;
      case 'go': this.tone({ f0: 930, dur: .18, vol: .16 }); this.tone({ type: 'triangle', f0: 1240, dur: .2, vol: .1, at: .02 }); break;
      case 'jump': this.tone({ type: 'triangle', f0: 300, f1: 620, dur: .16, vol: .2 }); break;
      case 'land': this.noise({ freq: 300, dur: .08, vol: .12 }); break;
      case 'star': this.tone({ f0: 1318.5, dur: .22, vol: .14 }); this.tone({ f0: 1975.5, dur: .3, vol: .12, at: .07 }); break;
      case 'hurt': this.tone({ type: 'triangle', f0: 210, f1: 70, dur: .28, vol: .3 }); this.noise({ freq: 500, dur: .15, vol: .2 }); break;
      case 'respawn': this.tone({ f0: 420, f1: 840, dur: .25, vol: .12 }); break;
      // Removed standard 'lose' sound logic here because we use the file now
      case 'win':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone({ type: 'triangle', f0: f, dur: .5, vol: .18, at: i * .12 }));
        this.tone({ f0: 2093, dur: .6, vol: .1, at: .48 });
        break;
    }
  },
  startMusic() {
    if (!this.ctx) return;
    this.musicOn = true; this.stepIdx = 0;
    this.nextNote = this.ctx.currentTime + .1;
  },
  stopMusic() { this.musicOn = false; },
  tick() {
    if (!this.ctx || !this.musicOn || !this.enabled) return;
    const now = this.ctx.currentTime;
    if (this.nextNote < now - .1) this.nextNote = now + .05;
    const seq = [220, 261.63, 329.63, 440, 392, 329.63, 261.63, 329.63, 220, 261.63, 329.63, 392, 440, 329.63, 261.63, 196];
    while (this.nextNote < now + .3) {
      const at = this.nextNote - now;
      this.tone({ type: 'triangle', f0: seq[this.stepIdx % 16], dur: .85, vol: .055, at, bus: this.musicBus });
      if (this.stepIdx % 8 === 0) this.tone({ f0: 110, dur: 1.4, vol: .07, at, bus: this.musicBus });
      this.stepIdx++; this.nextNote += .3;
    }
  }
};

// Initialize audio context and load file on first interaction
document.addEventListener('pointerdown', () => { 
  AudioFX.init(); 
  AudioFX.resume();
  // Load the specific file path
  if(!AudioFX.customBuffer) AudioFX.loadCustomMusic('assets/defeat-music.mp3');
}, { once: true });

document.addEventListener('keydown', () => { 
  AudioFX.init(); 
  AudioFX.resume();
  if(!AudioFX.customBuffer) AudioFX.loadCustomMusic('assets/defeat-music.mp3');
}, { once: true });


/* ---------------- состояние / таймеры ---------------- */
let state = 'landing';
let countdownActive = false;
let transitioning = false;
const timers = {};
function after(key, ms, fn) { clearT(key); timers[key] = setTimeout(fn, ms); }
function clearT(key) { if (timers[key]) { clearTimeout(timers[key]); clearInterval(timers[key]); delete timers[key]; } }
function clearAllTimers() { Object.keys(timers).forEach(clearT); }
const fmt = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
function retrigger(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

/* ---------------- канвасы / инстансы ---------------- */
const backdrop = HyperGame.createBackdrop(els.bg);
const attract = HyperGame.createAttract(els.heroCv);
const game = new HyperGame.Game(els.gameCv, {
  onStar(n, total) { els.starCount.textContent = n; els.starTotal.textContent = total; retrigger(els.starChip, 'bump'); AudioFX.play('star'); },
  onLife(n) {
    els.hearts.forEach((h, i) => h.classList.toggle('lost', i >= n));
    retrigger(els.lifeChip, 'ouch');
    if (n > 0) AudioFX.play('hurt');
  },
  onProgress(p) {
    const pct = (p * 100).toFixed(1) + '%';
    els.progChip.style.setProperty('--p', pct);
    els.progPct.textContent = Math.round(p * 100) + '%';
  },
  onJump() { AudioFX.play('jump'); },
  onLand() { AudioFX.play('land'); },
  onRespawn() { AudioFX.play('respawn'); },
  onWin(res) { enterVictory(res); },
  onLose() { enterDefeat(); }
});
game.touchMode = isTouch;
game.reduceMotion = reduceMotion;
$('#hero-stars').textContent = game.totalStars;
$('#mission-stars').textContent = game.totalStars;
els.starTotal.textContent = game.totalStars;
els.vTotal.textContent = game.totalStars;

function fitCanvas(cv, cap) {
  const r = cv.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  const dpr = Math.min(window.devicePixelRatio || 1, cap);
  return { w: r.width, h: r.height, dpr };
}
function resizeAll() {
  const a = fitCanvas(els.bg, 1.5); if (a) backdrop.resize(a.w, a.h, a.dpr);
  const b = fitCanvas(els.heroCv, 2); if (b) attract.resize(b.w, b.h, b.dpr);
  const c = fitCanvas(els.gameCv, 2);
  if (c) { game.resize(c.w, c.h, c.dpr); if (!els.gameScr.hidden) game.render(); }
}
let resizeQueued = false;
function queueResize() {
  if (resizeQueued) return;
  resizeQueued = true;
  requestAnimationFrame(() => { resizeQueued = false; resizeAll(); });
}
window.addEventListener('resize', queueResize);
window.addEventListener('orientationchange', queueResize);

/* ---------------- экраны ---------------- */
function applyScreen() {
  document.body.dataset.screen = state;
  els.landing.hidden = state !== 'landing';
  els.menu.hidden = state !== 'menu';
  els.gameScr.hidden = !['game', 'paused', 'victory', 'defeat'].includes(state);
  els.victory.hidden = state !== 'victory';
  els.defeat.hidden = state !== 'defeat';
  els.pause.hidden = state !== 'paused';
  const primary = { landing: els.landing, menu: els.menu, game: els.gameScr, paused: els.gameScr, victory: els.victory, defeat: els.defeat }[state];
  retrigger(primary, 'entered');
  if (state === 'menu') renderRecord();
  resizeAll();
}
function transitionTo(next, prep, onShown) {
  if (transitioning) return;
  transitioning = true;
  els.veil.classList.add('on');
  after('veil', 320, () => {
    clearAllTimers();
    countdownActive = false;
    els.countdown.hidden = true;
    if (prep) prep();
    state = next;
    applyScreen();
    els.veil.classList.remove('on');
    if (onShown) onShown();
    after('veil2', 360, () => { transitioning = false; });
  });
}
function focusBtn(btn) { try { btn.focus({ preventScroll: true }); } catch (e) { btn.focus(); } }

/* ---------------- рекорд ---------------- */
function getBest() { try { return JSON.parse(store.get('hg-best') || 'null'); } catch (e) { return null; } }
function renderRecord() {
  const b = getBest();
  els.recordChip.hidden = !b;
  if (b) els.recordText.textContent = `Рекорд: ★ ${b.s}/${game.totalStars} · ${fmt(b.t)}`;
}

/* ---------------- игровой поток ---------------- */
function startCountdown(labels, step, done) {
  countdownActive = true;
  els.countdown.hidden = false;
  let i = 0;
  const tick = () => {
    if (state !== 'game') { els.countdown.hidden = true; countdownActive = false; return; }
    if (i < labels.length) {
      els.cdNum.textContent = labels[i];
      retrigger(els.cdNum, 'pop');
      AudioFX.play(i === labels.length - 1 && labels[i] === 'ВПЕРЁД!' ? 'go' : 'count');
      i++;
      after('cd', step, tick);
    } else {
      els.countdown.hidden = true;
      countdownActive = false;
      done();
    }
  };
  tick();
}
function startGameFlow() {
  // Stop any playing noise before starting a new run
  AudioFX.stopCustomMusic();
  
  transitionTo('game',
    () => { game.startRun(); retrigger(els.toast, 'play'); },
    () => startCountdown(['3', '2', '1', 'ВПЕРЁД!'], 460, () => { game.setLive(); AudioFX.startMusic(); })
  );
}
function pauseGame() {
  if (state !== 'game') return;
  if (['winning', 'won', 'over'].includes(game.runState)) return;
  if (countdownActive) { clearT('cd'); countdownActive = false; els.countdown.hidden = true; }
  game.input.left = game.input.right = game.input.jumpHeld = false;
  AudioFX.stopMusic();
  state = 'paused';
  applyScreen();
  focusBtn(els.pauseResume);
}
function resumeGame() {
  if (state !== 'paused') return;
  state = 'game';
  applyScreen();
  startCountdown(['3', '2', '1'], 380, () => { game.setLive(); AudioFX.startMusic(); });
}
function enterDefeat() {
  clearAllTimers();
  countdownActive = false;
  els.countdown.hidden = true;
  
  // STOP GAME SYNTH MUSIC
  AudioFX.stopMusic();
  
  state = 'defeat';
  applyScreen();
  
  // PLAY USER'S NOISE TRACK
  AudioFX.playCustomMusic();
  
  after('dfocus', 950, () => focusBtn(els.dRetry));
}
function enterVictory(res) {
  clearAllTimers();
  AudioFX.stopMusic();
  state = 'victory';
  applyScreen();
  AudioFX.play('win');
  els.vTotal.textContent = res.total;
  els.vTime.textContent = fmt(res.time);
  const best = getBest();
  const isNew = !best || res.stars > best.s || (res.stars === best.s && res.time < best.t);
  els.vRecord.hidden = !isNew;
  if (isNew) store.set('hg-best', JSON.stringify({ s: res.stars, t: Math.round(res.time * 10) / 10 }));
  let step = 0; const steps = 24;
  els.vStars.textContent = '0';
  timers.vcount = setInterval(() => {
    step++;
    const k = 1 - Math.pow(1 - step / steps, 3);
    els.vStars.textContent = Math.round(res.stars * k);
    if (step >= steps) { els.vStars.textContent = res.stars; clearT('vcount'); }
  }, 30);
  after('vfocus', 650, () => focusBtn(els.vAgain));
}

/* ---------------- звук: единый переключатель ---------------- */
let muted = store.get('hg-muted') === '1';
function applyMute() {
  document.body.classList.toggle('muted', muted);
  AudioFX.setEnabled(!muted);
  els.soundState.textContent = muted ? 'ВЫКЛ' : 'ВКЛ';
  document.querySelectorAll('[data-sound-toggle]').forEach(b => {
    b.setAttribute('aria-pressed', String(!muted));
    b.setAttribute('aria-label', muted ? 'Включить звук' : 'Выключить звук');
  });
  store.set('hg-muted', muted ? '1' : '0');
}
function toggleMute() {
  muted = !muted;
  applyMute();
  if (!muted) { AudioFX.init(); AudioFX.play('click'); }
}
document.querySelectorAll('[data-sound-toggle]').forEach(b => b.addEventListener('click', toggleMute));
applyMute();

/* ---------------- клики / sfx ---------------- */
document.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  if (!b.hasAttribute('data-sound-toggle')) { AudioFX.init(); AudioFX.play('click'); }
  after('blur', 0, () => b.blur());
});
els.heroStart.addEventListener('click', () => transitionTo('menu'));
els.heroControls.addEventListener('click', () => transitionTo('menu'));
els.topPlay.addEventListener('click', () => transitionTo('menu'));
els.teaserPlay.addEventListener('click', () => transitionTo('menu'));
els.menuPlay.addEventListener('click', startGameFlow);
els.menuBack.addEventListener('click', () => transitionTo('landing'));
els.btnPause.addEventListener('click', pauseGame);
els.pauseResume.addEventListener('click', resumeGame);
els.pauseRestart.addEventListener('click', startGameFlow);
els.pauseMenu.addEventListener('click', () => transitionTo('menu', () => AudioFX.stopMusic()));
els.vAgain.addEventListener('click', startGameFlow);
els.vMenu.addEventListener('click', () => transitionTo('menu'));
els.dRetry.addEventListener('click', startGameFlow);
els.dMenu.addEventListener('click', () => transitionTo('menu'));

/* ---------------- клавиатура ---------------- */
window.addEventListener('keydown', e => {
  const code = e.code;
  if (state === 'game' || state === 'paused') {
    if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(code)) e.preventDefault();
  }
  if (e.repeat) return;
  if (code === 'KeyM') { toggleMute(); return; }
  if (code === 'Escape') {
    if (state === 'game') pauseGame();
    else if (state === 'paused') resumeGame();
    else if (state === 'menu') transitionTo('landing');
    else if (state === 'victory' || state === 'defeat') transitionTo('menu');
    return;
  }
  if (state === 'game' && !countdownActive) {
    if (code === 'KeyA' || code === 'ArrowLeft') game.input.left = true;
    if (code === 'KeyD' || code === 'ArrowRight') game.input.right = true;
    if (code === 'Space' || code === 'KeyW' || code === 'ArrowUp') game.pressJump();
  } else if (state === 'menu' && (code === 'Enter' || code === 'Space')) {
    e.preventDefault();
    startGameFlow();
  }
});
window.addEventListener('keyup', e => {
  const code = e.code;
  if (code === 'KeyA' || code === 'ArrowLeft') game.input.left = false;
  if (code === 'KeyD' || code === 'ArrowRight') game.input.right = false;
  if (code === 'Space' || code === 'KeyW' || code === 'ArrowUp') game.releaseJump();
});
window.addEventListener('blur', () => {
  game.input.left = game.input.right = game.input.jumpHeld = false;
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    game.input.left = game.input.right = game.input.jumpHeld = false;
    if (state === 'game') pauseGame();
    AudioFX.stopMusic();
    AudioFX.stopCustomMusic(); // Also stop noise if tab hidden
  }
});
els.gameScr.addEventListener('contextmenu', e => e.preventDefault());

/* ---------------- сенсорные кнопки ---------------- */
function bindHold(btn, down, up) {
  btn.addEventListener('pointerdown', e => {
    e.preventDefault();
    try { btn.setPointerCapture(e.pointerId); } catch (err) {}
    btn.classList.add('active');
    down();
  });
  const end = () => { btn.classList.remove('active'); up(); };
  btn.addEventListener('pointerup', end);
  btn.addEventListener('pointercancel', end);
  btn.addEventListener('lostpointercapture', end);
}
bindHold(els.tLeft, () => { if (state === 'game') game.input.left = true; }, () => { game.input.left = false; });
bindHold(els.tRight, () => { if (state === 'game') game.input.right = true; }, () => { game.input.right = false; });
bindHold(els.tJump,
  () => { if (state === 'game' && !countdownActive) game.pressJump(); },
  () => game.releaseJump()
);

/* ---------------- лендинг: reveal / nav / tilt / cursor ---------------- */
const io = new IntersectionObserver(entries => {
  entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
}, { root: els.landing, threshold: .15 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));
const navLinks = Array.from(document.querySelectorAll('[data-nav]'));
const spy = new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (en.isIntersecting) navLinks.forEach(a => a.classList.toggle('active', a.dataset.nav === en.target.id));
  });
}, { root: els.landing, rootMargin: '-40% 0px -55% 0px' });
['guide', 'about'].forEach(id => spy.observe(document.getElementById(id)));
els.landing.addEventListener('scroll', () => {
  els.topbar.classList.toggle('scrolled', els.landing.scrollTop > 10);
}, { passive: true });

let tiltX = 0, tiltY = 0, tiltTX = 0, tiltTY = 0;
if (finePointer && !reduceMotion) {
  els.stageCard.addEventListener('pointermove', e => {
    const r = els.stageCard.getBoundingClientRect();
    tiltTY = ((e.clientX - r.left) / r.width - .5) * 7;
    tiltTX = -((e.clientY - r.top) / r.height - .5) * 6;
  });
  els.stageCard.addEventListener('pointerleave', () => { tiltTX = 0; tiltTY = 0; });
}
let curX = -500, curY = -500, curTX = -500, curTY = -500;
if (finePointer) {
  window.addEventListener('pointermove', e => { curTX = e.clientX; curTY = e.clientY; }, { passive: true });
}

/* ---------------- искры победы ---------------- */
(function buildSparkles() {
  const colors = ['#ffd166', '#ff8fd3', '#4cc9f0', '#c9b8ff'];
  for (let i = 0; i < 26; i++) {
    const s = document.createElement('span');
    s.className = 'sparkle';
    const size = 3 + Math.random() * 5;
    const c = colors[i % colors.length];
    s.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 100}%;width:${size}px;height:${size}px;background:${c};box-shadow:0 0 ${size * 3}px ${c};--dur:${1.8 + Math.random() * 2.4}s;--del:${Math.random() * 2.5}s`;
    els.sparkles.appendChild(s);
  }
})();

/* ---------------- единый цикл rAF ---------------- */
let lastT = performance.now();
let readyShown = false;
function loop(now) {
  requestAnimationFrame(loop);
  let dt = (now - lastT) / 1000;
  lastT = now;
  if (document.hidden) return;
  if (dt > .05) dt = .05;
  if (!readyShown) {
    readyShown = true;
    els.readyPill.classList.add('ready');
    els.readyText.textContent = 'ИГРА ГОТОВА К ЗАПУСКУ';
  }
  AudioFX.tick();
  if (finePointer && (state === 'landing' || state === 'menu')) {
    curX += (curTX - curX) * Math.min(1, dt * 8);
    curY += (curTY - curY) * Math.min(1, dt * 8);
    els.cursor.style.transform = `translate3d(${curX - 210}px,${curY - 210}px,0)`;
  }
  if (state === 'landing') {
    if (finePointer && !reduceMotion) {
      tiltX += (tiltTX - tiltX) * Math.min(1, dt * 7);
      tiltY += (tiltTY - tiltY) * Math.min(1, dt * 7);
      els.stageTilt.style.transform = `perspective(900px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`;
    }
    backdrop.render(dt);
    attract.render(dt);
  } else if (state === 'menu') {
    backdrop.render(dt);
  } else if (state === 'game') {
    game.update(dt);
    game.render();
  }
}
resizeAll();
requestAnimationFrame(loop);
})();