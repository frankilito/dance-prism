// ===== 音频引擎:程序化合成 5 首主题曲 + 节拍时钟 + SFX =====
// 无任何外部音频素材,全部 WebAudio 实时合成;节拍时钟以 AudioContext 时间为准,
// 舞者动画 / 评分判定 / 灯光特效 / 镜头全部读取本模块的 getBeat()。

const N = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.playing = false;
    this.song = null;
    this.chart = null;
    this.startTime = 0;
    this.stepDur = 0;
    this.nextStep = 0;
    this.timer = null;
    this.onEnd = null;
    this.level = 0; // 实时能量(灯光用)
  }

  ensure() {
    if (this.ctx) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;
    this.master = ctx.createGain(); this.master.gain.value = 0.9;
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14; this.comp.ratio.value = 4; this.comp.knee.value = 8;
    this.master.connect(this.comp); this.comp.connect(ctx.destination);
    // 录制输出
    this.recDest = ctx.createMediaStreamDestination();
    this.comp.connect(this.recDest);
    // 分析器(LED 频谱)
    this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 256;
    this.comp.connect(this.analyser);
    this.fft = new Uint8Array(this.analyser.frequencyBinCount);
    // 母线
    this.busDrum = ctx.createGain(); this.busDrum.gain.value = 0.95; this.busDrum.connect(this.master);
    this.busBass = ctx.createGain(); this.busBass.gain.value = 0.8; this.busBass.connect(this.master);
    this.busSynth = ctx.createGain(); this.busSynth.gain.value = 0.62; this.busSynth.connect(this.master);
    this.busSfx = ctx.createGain(); this.busSfx.gain.value = 0.85; this.busSfx.connect(this.master);
    // 延迟 & 合成混响
    this.delay = ctx.createDelay(1.5); this.delayFb = ctx.createGain(); this.delayFb.gain.value = 0.32;
    this.delayOut = ctx.createGain(); this.delayOut.gain.value = 0.28;
    this.delay.connect(this.delayFb); this.delayFb.connect(this.delay);
    this.delay.connect(this.delayOut); this.delayOut.connect(this.master);
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.makeImpulse(2.2, 2.4);
    this.revOut = ctx.createGain(); this.revOut.gain.value = 0.34;
    this.reverb.connect(this.revOut); this.revOut.connect(this.master);
    // 噪声缓存
    this.noiseBuf = this.makeNoise(2);
  }

  makeNoise(sec) {
    const len = this.ctx.sampleRate * sec;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  makeImpulse(sec, decay) {
    const rate = this.ctx.sampleRate, len = rate * sec;
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  // ---------- 播放控制 ----------
  async playSong(song, chart, importedBuffer = null) {
    this.ensure();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.stop();
    this.song = song; this.chart = chart;
    this.stepDur = 60 / chart.bpm / 4;
    this.totalSteps = chart.totalBeats * 4;
    this.nextStep = 0;
    this.startTime = this.ctx.currentTime + 0.15;
    this.playing = true;
    if (importedBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = importedBuffer;
      const g = this.ctx.createGain(); g.gain.value = 0.9;
      src.connect(g); g.connect(this.master);
      src.start(this.startTime);
      this.importedSrc = src;
      this.importedOnly = true;
    } else {
      this.importedOnly = false;
    }
    this.timer = setInterval(() => this.tick(), 25);
  }

  stop() {
    this.playing = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.importedSrc) { try { this.importedSrc.stop(); } catch {} this.importedSrc = null; }
  }

  getTime() { return this.playing ? this.ctx.currentTime - this.startTime : 0; }
  getBeat() { return this.getTime() / (this.stepDur * 4); }
  beatDur() { return this.stepDur * 4; }

  getLevel() {
    if (!this.analyser) return 0;
    this.analyser.getByteFrequencyData(this.fft);
    let s = 0;
    for (let i = 2; i < 24; i++) s += this.fft[i];
    this.level = s / (22 * 255);
    return this.level;
  }

  getSpectrum() {
    return this.fft;
  }

  // ---------- 步进调度 ----------
  tick() {
    if (!this.playing) return;
    const ahead = this.ctx.currentTime + 0.18;
    while (this.startTime + this.nextStep * this.stepDur < ahead) {
      const s = this.nextStep;
      if (s >= this.totalSteps) {
        this.playing = false;
        clearInterval(this.timer); this.timer = null;
        const cb = this.onEnd; this.onEnd = null;
        if (cb) setTimeout(cb, 800);
        return;
      }
      const t = this.startTime + s * this.stepDur;
      if (!this.importedOnly) this.scheduleStep(s, t);
      this.nextStep++;
    }
  }

  secAt(beat) {
    const secs = this.chart.sections;
    let cur = secs[0];
    for (const sc of secs) { if (beat >= sc.beat) cur = sc; else break; }
    return cur;
  }

  scheduleStep(s, t) {
    const beat = s / 4;
    const sc = this.secAt(beat);
    const sec = sc.sec;
    const barInSec = Math.floor((beat - sc.beat) / 4);
    const step = s % 16;             // 小节内 16 分位
    const bar = Math.floor(beat / 4);
    const D = SONG_DEFS[this.song.id] || SONG_DEFS.neon;
    D.step(this, t, { sec, step, bar, barInSec, bars: sc.bars, beat });
  }

  // ---------- 乐器 ----------
  kick(t, v = 1) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(44, t + 0.1);
    g.gain.setValueAtTime(1.1 * v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    o.connect(g); g.connect(this.busDrum);
    o.start(t); o.stop(t + 0.26);
    const n = this.ctx.createBufferSource(); n.buffer = this.noiseBuf;
    const nf = this.ctx.createBiquadFilter(); nf.type = 'highpass'; nf.frequency.value = 900;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.35 * v, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
    n.connect(nf); nf.connect(ng); ng.connect(this.busDrum);
    n.start(t, Math.random()); n.stop(t + 0.03);
  }

  snare(t, v = 1) {
    const n = this.ctx.createBufferSource(); n.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.8 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    n.connect(f); f.connect(g); g.connect(this.busDrum); g.connect(this.reverb);
    n.start(t, Math.random()); n.stop(t + 0.2);
    const o = this.ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 200;
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(0.5 * v, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    o.connect(og); og.connect(this.busDrum);
    o.start(t); o.stop(t + 0.1);
  }

  clap(t, v = 1) {
    for (let i = 0; i < 3; i++) {
      const n = this.ctx.createBufferSource(); n.buffer = this.noiseBuf;
      const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1300; f.Q.value = 1.4;
      const g = this.ctx.createGain();
      const tt = t + i * 0.012;
      g.gain.setValueAtTime(0.5 * v, tt); g.gain.exponentialRampToValueAtTime(0.001, tt + (i === 2 ? 0.22 : 0.03));
      n.connect(f); f.connect(g); g.connect(this.busDrum); g.connect(this.reverb);
      n.start(tt, Math.random()); n.stop(tt + 0.25);
    }
  }

  hat(t, open = false, v = 1) {
    const n = this.ctx.createBufferSource(); n.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 8200;
    const g = this.ctx.createGain();
    const dur = open ? 0.28 : 0.045;
    g.gain.setValueAtTime(0.32 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    n.connect(f); f.connect(g); g.connect(this.busDrum);
    n.start(t, Math.random()); n.stop(t + dur + 0.02);
  }

  bass(t, midi, len = 0.22, v = 1, style = 'saw') {
    if (!Number.isFinite(midi)) return;
    const o = this.ctx.createOscillator(); o.type = style === 'square' ? 'square' : 'sawtooth';
    o.frequency.value = N(midi);
    const sub = this.ctx.createOscillator(); sub.type = 'sine'; sub.frequency.value = N(midi - 12);
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 6;
    f.frequency.setValueAtTime(900 * v, t);
    f.frequency.exponentialRampToValueAtTime(140, t + len);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.62 * v, t);
    g.gain.setValueAtTime(0.62 * v, t + len * 0.7);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    const sg = this.ctx.createGain(); sg.gain.setValueAtTime(0.4 * v, t);
    sg.gain.exponentialRampToValueAtTime(0.001, t + len);
    o.connect(f); f.connect(g); g.connect(this.busBass);
    sub.connect(sg); sg.connect(this.busBass);
    o.start(t); o.stop(t + len + 0.02); sub.start(t); sub.stop(t + len + 0.02);
  }

  pluck(t, midi, len = 0.18, v = 1) {
    if (!Number.isFinite(midi)) return;
    const o = this.ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = N(midi);
    const o2 = this.ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = N(midi + 12);
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(4200, t); f.frequency.exponentialRampToValueAtTime(500, t + len);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.5 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
    o.connect(f); o2.connect(f); f.connect(g); g.connect(this.busSynth); g.connect(this.delay);
    o.start(t); o.stop(t + len + 0.02); o2.start(t); o2.stop(t + len + 0.02);
  }

  supersaw(t, midis, len = 0.4, v = 1, cutoff = 3600) {
    midis = midis.filter(Number.isFinite);
    if (!midis.length) return;
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; f.Q.value = 0.6;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16 * v, t + 0.015);
    g.gain.setValueAtTime(0.16 * v, t + len * 0.6);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    f.connect(g); g.connect(this.busSynth); g.connect(this.reverb);
    for (const m of midis) {
      for (const det of [-9, 0, 9]) {
        const o = this.ctx.createOscillator(); o.type = 'sawtooth';
        o.frequency.value = N(m); o.detune.value = det + (Math.random() * 4 - 2);
        o.connect(f); o.start(t); o.stop(t + len + 0.03);
      }
    }
  }

  pad(t, midis, len = 2, v = 1) {
    midis = midis.filter(Number.isFinite);
    if (!midis.length) return;
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 950;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.085 * v, t + len * 0.35);
    g.gain.linearRampToValueAtTime(0, t + len);
    f.connect(g); g.connect(this.busSynth); g.connect(this.reverb);
    for (const m of midis) {
      for (const det of [-6, 6]) {
        const o = this.ctx.createOscillator(); o.type = 'sawtooth';
        o.frequency.value = N(m); o.detune.value = det;
        o.connect(f); o.start(t); o.stop(t + len + 0.05);
      }
    }
  }

  arp(t, midi, len = 0.1, v = 1) {
    if (!Number.isFinite(midi)) return;
    const o = this.ctx.createOscillator(); o.type = 'square'; o.frequency.value = N(midi);
    const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 320;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.11 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
    o.connect(f); f.connect(g); g.connect(this.busSynth); g.connect(this.delay);
    o.start(t); o.stop(t + len + 0.02);
  }

  riser(t, len = 1.8) {
    const n = this.ctx.createBufferSource(); n.buffer = this.noiseBuf; n.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(7500, t + len);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.4, t + len);
    g.gain.setValueAtTime(0.0001, t + len + 0.01);
    n.connect(f); f.connect(g); g.connect(this.busSfx); g.connect(this.reverb);
    n.start(t); n.stop(t + len + 0.05);
  }

  crash(t, v = 1) {
    const n = this.ctx.createBufferSource(); n.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 5000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.55 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
    n.connect(f); f.connect(g); g.connect(this.busDrum); g.connect(this.reverb);
    n.start(t, Math.random()); n.stop(t + 1.5);
  }

  subDrop(t) {
    const o = this.ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.8);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.7, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    o.connect(g); g.connect(this.busBass);
    o.start(t); o.stop(t + 1);
  }

  cheer(t, len = 2.4, v = 1) {
    const n = this.ctx.createBufferSource(); n.buffer = this.noiseBuf; n.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 0.4;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.28 * v, t + 0.35);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    n.connect(f); f.connect(g); g.connect(this.busSfx);
    n.start(t, Math.random()); n.stop(t + len + 0.1);
  }

  // ---------- SFX ----------
  sfx(kind) {
    this.ensure();
    const t = this.ctx.currentTime + 0.01;
    if (kind === 'perfect') {
      this.pluck(t, 88, 0.3, 1.3); this.pluck(t + 0.07, 95, 0.4, 1.1);
      this.arp(t + 0.14, 100, 0.3, 1.4);
    } else if (kind === 'great') {
      this.pluck(t, 84, 0.25, 1.1); this.pluck(t + 0.06, 91, 0.3, 0.8);
    } else if (kind === 'good') {
      this.pluck(t, 79, 0.18, 0.8);
    } else if (kind === 'miss') {
      const o = this.ctx.createOscillator(); o.type = 'triangle';
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.16);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.24, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      o.connect(g); g.connect(this.busSfx); o.start(t); o.stop(t + 0.2);
    } else if (kind === 'click') {
      this.pluck(t, 91, 0.09, 0.7);
    } else if (kind === 'confirm') {
      this.pluck(t, 84, 0.12, 0.9); this.pluck(t + 0.09, 91, 0.22, 0.9);
    } else if (kind === 'count') {
      this.arp(t, 81, 0.12, 2);
    } else if (kind === 'go') {
      this.arp(t, 93, 0.4, 2.4); this.crash(t, 0.5);
    } else if (kind === 'cheer') {
      this.cheer(t, 2.8, 1);
    } else if (kind === 'combo') {
      this.arp(t, 96, 0.14, 1.2); this.arp(t + 0.06, 103, 0.2, 1);
    }
  }

  // ---------- 导入音乐分析 ----------
  async analyzeImport(arrayBuffer) {
    this.ensure();
    const buf = await this.ctx.decodeAudioData(arrayBuffer);
    // 简易 BPM 估计:onset 能量自相关
    const ch = buf.getChannelData(0);
    const hop = 1024, frames = Math.floor(ch.length / hop);
    const env = new Float32Array(frames);
    for (let i = 0; i < frames; i++) {
      let e = 0;
      for (let j = 0; j < hop; j += 4) { const v = ch[i * hop + j]; e += v * v; }
      env[i] = e;
    }
    const onset = new Float32Array(frames);
    for (let i = 1; i < frames; i++) onset[i] = Math.max(0, env[i] - env[i - 1]);
    const fps = buf.sampleRate / hop;
    let bestBpm = 120, bestScore = -1;
    for (let bpm = 70; bpm <= 180; bpm += 0.5) {
      const lag = Math.round((60 / bpm) * fps);
      let s = 0;
      for (let i = 0; i < frames - lag; i++) s += onset[i] * onset[i + lag];
      if (s > bestScore) { bestScore = s; bestBpm = bpm; }
    }
    if (bestBpm < 90) bestBpm *= 2;
    return { buffer: buf, bpm: Math.round(bestBpm), duration: buf.duration };
  }
}

// ===== 每首歌的配器定义 =====
// step(engine, t, {sec, step, bar, barInSec, bars, beat})
const SONG_DEFS = {
  // —— 霓虹脉冲 · Synthwave —— Am F C G
  neon: {
    chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],
    roots: [45, 41, 36, 43],
    lead: [69, 0, 72, 0, 76, 0, 74, 72, 74, 0, 72, 0, 69, 0, 67, 69,
           69, 0, 72, 0, 76, 0, 79, 76, 74, 0, 72, 74, 76, 0, 0, 0],
    step(e, t, c) {
      const { sec, step, bar, barInSec, bars } = c;
      const ch = this.chords[bar % 4], root = this.roots[bar % 4];
      const last = barInSec === bars - 1;
      if (sec === 'intro') {
        if (step === 0) e.pad(t, ch, (60 / e.chart.bpm) * 4, 1.1);
        if (step % 4 === 0) e.kick(t, 0.75);
        if (step % 2 === 0) e.arp(t, ch[(step / 2) % 3] + 24, 0.1, 0.7);
        if (last && step === 12) e.riser(t, (60 / e.chart.bpm) * 4);
      } else if (sec === 'verse') {
        if (step === 0 || step === 7 || step === 10) e.kick(t);
        if (step === 4 || step === 12) e.snare(t, 0.9);
        if (step % 2 === 1) e.hat(t, false, 0.8);
        if (step % 4 === 2) e.bass(t, root + 12, 0.14, 0.9);
        if (step % 4 === 0) e.bass(t, root, 0.2, 1);
        if (step === 0) e.pad(t, ch, (60 / e.chart.bpm) * 4, 0.8);
        if (step === 0 && bar % 2 === 0) e.pluck(t, ch[2] + 12, 0.3, 0.8);
      } else if (sec === 'pre') {
        if (step % 4 === 0) e.kick(t);
        if (step === 4 || step === 12) e.clap(t);
        if (step % 2 === 0) e.arp(t, ch[(step / 2) % 3] + 24, 0.09, 0.9 + step / 24);
        if (step % 2 === 0) e.bass(t, root + (step % 8 === 4 ? 12 : 0), 0.13, 1);
        if (last && step === 8) e.riser(t, (60 / e.chart.bpm) * 2);
        if (last && step === 15) e.subDrop(t);
      } else if (sec === 'chorus') {
        if (step === 0 && barInSec === 0) { e.crash(t); e.cheer(t, 2.2, 0.7); }
        if (step % 4 === 0) e.kick(t, 1.1);
        if (step === 4 || step === 12) { e.snare(t); e.clap(t, 0.7); }
        if (step % 2 === 1) e.hat(t, step % 4 === 3, 0.9);
        if (step % 2 === 0) e.bass(t, root + (step % 4 === 2 ? 12 : 0), 0.13, 1.05);
        const li = (bar % 2) * 16 + step;
        if (this.lead[li]) e.supersaw(t, [this.lead[li], this.lead[li] - 12], 0.24, 1.05, 4200);
        if (step === 0) e.pad(t, ch, (60 / e.chart.bpm) * 4, 1);
      } else if (sec === 'bridge') {
        if (step === 0) { e.pad(t, ch, (60 / e.chart.bpm) * 4, 1.2); e.bass(t, root, 0.5, 0.8); }
        if (step % 8 === 0) e.kick(t, 0.6);
        if (step % 2 === 0) e.arp(t, ch[(step / 2) % 3] + 12, 0.14, 0.6);
        if (last && step >= 8 && step % 2 === 0) e.snare(t, 0.5 + (step - 8) * 0.08);
        if (last && step === 8) e.riser(t, (60 / e.chart.bpm) * 2);
      } else if (sec === 'outro') {
        if (step === 0 && barInSec === 0) { e.crash(t); e.cheer(t, 3, 1); }
        if (step % 4 === 0) e.kick(t, 1 - barInSec * 0.3);
        if (step === 0) e.pad(t, ch, (60 / e.chart.bpm) * 4, 1.2);
        if (step === 0 && last) e.supersaw(t, [69, 76, 81], (60 / e.chart.bpm) * 3.5, 1.2, 5000);
      }
    },
  },

  // —— 落日冲浪 · Tropical House —— FMaj7 G Em7 Am
  beach: {
    chords: [[53, 57, 60, 64], [55, 59, 62], [52, 55, 59, 62], [57, 60, 64]],
    roots: [41, 43, 40, 45],
    lead: [72, 0, 0, 74, 76, 0, 74, 0, 72, 0, 69, 0, 67, 0, 69, 72,
           72, 0, 0, 74, 76, 0, 79, 0, 77, 76, 74, 0, 72, 0, 0, 0],
    step(e, t, c) {
      const { sec, step, bar, barInSec, bars } = c;
      const ch = this.chords[bar % 4], root = this.roots[bar % 4];
      const last = barInSec === bars - 1;
      const b = 60 / e.chart.bpm;
      if (sec === 'intro') {
        if (step === 0) e.pad(t, ch, b * 4, 1);
        if (step % 4 === 2) e.pluck(t, ch[Math.floor(step / 4) % ch.length] + 12, 0.3, 0.75);
        if (step % 8 === 0) e.kick(t, 0.6);
        if (last && step === 12) e.riser(t, b * 4);
      } else if (sec === 'verse' || sec === 'pre') {
        if (step % 4 === 0) e.kick(t, 0.95);
        if (step === 4 || step === 12) e.clap(t, 0.85);
        if (step % 2 === 1) e.hat(t, false, 0.65);
        if (step % 4 === 2) e.bass(t, root, 0.2, 0.95);
        const mel = [0, 4, 7, 12];
        if (step % 4 === 0) e.pluck(t, ch[0] + 12 + mel[(bar + Math.floor(step / 4)) % 4] % 12, 0.22, 0.9);
        if (step === 0) e.pad(t, ch, b * 4, 0.65);
        if (sec === 'pre' && last && step === 8) e.riser(t, b * 2);
      } else if (sec === 'chorus') {
        if (step === 0 && barInSec === 0) { e.crash(t, 0.8); e.cheer(t, 2, 0.6); }
        if (step % 4 === 0) e.kick(t, 1.05);
        if (step === 4 || step === 12) e.clap(t);
        if (step % 4 === 2) e.hat(t, true, 0.7);
        else if (step % 2 === 1) e.hat(t, false, 0.6);
        if (step % 4 === 2) e.bass(t, root, 0.24, 1.05);
        if (step % 8 === 6) e.bass(t, root + 7, 0.14, 0.85);
        const li = (bar % 2) * 16 + step;
        if (this.lead[li]) { e.pluck(t, this.lead[li], 0.26, 1.15); e.pluck(t, this.lead[li] + 12, 0.2, 0.5); }
        if (step === 0) e.pad(t, ch, b * 4, 0.9);
      } else if (sec === 'bridge') {
        if (step === 0) e.pad(t, ch, b * 4, 1.1);
        if (step % 2 === 0) e.arp(t, ch[(step / 2) % ch.length] + 12, 0.16, 0.55);
        if (step % 8 === 0) e.kick(t, 0.55);
        if (last && step === 8) e.riser(t, b * 2);
      } else if (sec === 'outro') {
        if (step === 0 && barInSec === 0) { e.crash(t, 0.9); e.cheer(t, 3, 1); }
        if (step === 0) { e.pad(t, ch, b * 4, 1.2); e.pluck(t, 76, 0.5, 1); }
        if (step % 4 === 0) e.kick(t, 0.8 - barInSec * 0.3);
      }
    },
  },

  // —— 未来虹光 · Future Bass —— F G Am (E) 每两拍换和弦切分
  theater: {
    chords: [[53, 57, 60, 64], [55, 59, 62, 65], [57, 60, 64, 67], [55, 59, 62, 64]],
    roots: [41, 43, 45, 43],
    step(e, t, c) {
      const { sec, step, bar, barInSec, bars } = c;
      const ch = this.chords[bar % 4], root = this.roots[bar % 4];
      const last = barInSec === bars - 1;
      const b = 60 / e.chart.bpm;
      const stabPattern = [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0];
      if (sec === 'intro') {
        if (step === 0) e.pad(t, ch, b * 4, 1.15);
        if (step % 4 === 0) e.pluck(t, ch[Math.floor(step / 4) % 4] + 12, 0.35, 0.8);
        if (last && step === 8) e.riser(t, b * 2);
      } else if (sec === 'verse') {
        if (step === 0 || step === 10) e.kick(t, 0.9);
        if (step === 8) e.snare(t, 0.95); // half-time
        if (step % 2 === 1) e.hat(t, false, 0.55);
        if (step % 8 === 0) e.bass(t, root, 0.45, 0.9);
        if (step % 4 === 2) e.pluck(t, ch[Math.floor(step / 4) % 4] + 24, 0.2, 0.75);
        if (step === 0) e.pad(t, ch, b * 4, 0.7);
      } else if (sec === 'pre') {
        if (step % 4 === 0) e.kick(t);
        if (step === 8) e.clap(t);
        if (step % 2 === 0) e.arp(t, ch[(step / 2) % 4] + 24, 0.1, 0.7 + step / 30);
        if (step % 4 === 0) e.bass(t, root, 0.2, 1);
        if (last && step === 8) { e.riser(t, b * 2); }
        if (last && step === 15) e.subDrop(t);
      } else if (sec === 'chorus') {
        if (step === 0 && barInSec === 0) { e.crash(t); e.cheer(t, 2.4, 0.8); }
        if (step === 0 || step === 10) e.kick(t, 1.1);
        if (step === 8) { e.snare(t, 1.1); e.clap(t, 0.8); }
        if (step % 2 === 1) e.hat(t, step === 15, 0.7);
        if (stabPattern[step]) e.supersaw(t, ch.map((m) => m + 12), 0.22, 1.15, 5200);
        if (step % 8 === 0) e.bass(t, root, 0.5, 1.1);
        if (step % 8 === 6) e.bass(t, root + 12, 0.2, 0.9);
      } else if (sec === 'bridge') {
        if (step === 0) e.pad(t, ch, b * 4, 1.25);
        if (step % 4 === 0) e.pluck(t, ch[(bar + Math.floor(step / 4)) % 4] + 12, 0.4, 0.85);
        if (step % 8 === 4) e.kick(t, 0.5);
        if (barInSec >= bars - 2 && step % 4 === 0) e.snare(t, 0.4 + (step / 16) * 0.5);
        if (last && step === 8) e.riser(t, b * 2);
      } else if (sec === 'outro') {
        if (step === 0 && barInSec === 0) { e.crash(t); e.cheer(t, 3.2, 1); }
        if (step === 0) e.supersaw(t, ch.map((m) => m + 12), b * 3.6, 1.1, 4600);
        if (step % 4 === 0) e.kick(t, 0.9 - barInSec * 0.35);
      }
    },
  },

  // —— 镜球狂热 · Disco Funk —— Dm7 G7 CMaj7 A7
  disco: {
    chords: [[50, 53, 57, 60], [55, 59, 62, 65], [48, 52, 55, 59], [45, 49, 52, 55]],
    roots: [38, 43, 36, 33],
    step(e, t, c) {
      const { sec, step, bar, barInSec, bars } = c;
      const ch = this.chords[bar % 4], root = this.roots[bar % 4];
      const last = barInSec === bars - 1;
      const b = 60 / e.chart.bpm;
      const funkBass = [0, 0, 12, 0, 0, 7, 0, 12, 0, 0, 12, 0, 7, 0, 10, 0];
      if (sec === 'intro') {
        if (step % 4 === 0) e.kick(t, 0.8);
        if (step % 4 === 2) e.hat(t, true, 0.5);
        if (step === 0) e.pad(t, ch, b * 4, 0.8);
        if (step % 8 === 4) e.pluck(t, ch[3] + 12, 0.2, 0.7);
        if (last && step === 12) e.riser(t, b * 4);
      } else if (sec === 'verse') {
        if (step % 4 === 0) e.kick(t);
        if (step === 4 || step === 12) e.snare(t, 0.9);
        if (step % 4 === 2) e.hat(t, true, 0.6);
        else if (step % 2 === 1) e.hat(t, false, 0.5);
        if (step % 2 === 0 && funkBass[step] !== undefined && (step % 4 !== 0 || funkBass[step]))
          e.bass(t, root + (funkBass[step] % 12), 0.13, 0.95, 'square');
        if (step % 4 === 0) e.bass(t, root, 0.16, 1, 'square');
        if (step === 6 || step === 14) e.pluck(t, ch[2] + 12, 0.1, 0.85);
        if (step === 0) e.pad(t, ch, b * 4, 0.55);
      } else if (sec === 'chorus') {
        if (step === 0 && barInSec === 0) { e.crash(t, 0.9); e.cheer(t, 2.2, 0.7); }
        if (step % 4 === 0) e.kick(t, 1.05);
        if (step === 4 || step === 12) { e.snare(t); e.clap(t, 0.6); }
        if (step % 4 === 2) e.hat(t, true, 0.75);
        else if (step % 2 === 1) e.hat(t, false, 0.55);
        if (step % 2 === 0) e.bass(t, root + funkBass[step], 0.13, 1.05, 'square');
        const mel = [74, 0, 72, 74, 0, 77, 0, 76, 74, 0, 72, 0, 74, 76, 0, 72];
        if (mel[step] && bar % 2 === 1) e.pluck(t, mel[step], 0.18, 1.05);
        if (step % 8 === 0) e.supersaw(t, ch.map((m) => m + 12), 0.3, 0.7, 3400);
        if (step === 0) e.pad(t, ch, b * 4, 0.8);
      } else if (sec === 'bridge') {
        if (step % 2 === 0) e.hat(t, false, 0.5);
        if (step % 8 === 0) { e.kick(t, 0.7); e.bass(t, root, 0.4, 0.9, 'square'); }
        if (step === 0) e.pad(t, ch, b * 4, 1);
        if (barInSec >= bars - 1 && step % 2 === 0) e.snare(t, 0.35 + (step / 16) * 0.6);
        if (last && step === 8) e.riser(t, b * 2);
      } else if (sec === 'outro') {
        if (step === 0 && barInSec === 0) { e.crash(t); e.cheer(t, 3, 1); }
        if (step % 4 === 0) e.kick(t, 0.9 - barInSec * 0.3);
        if (step === 0) { e.pad(t, ch, b * 4, 1.1); e.supersaw(t, ch.map((m) => m + 12), b * 2, 0.9, 3800); }
      }
    },
  },

  // —— 星际巡游 · Trance —— Em C G D
  space: {
    chords: [[52, 55, 59], [48, 52, 55], [43, 47, 50], [50, 54, 57]],
    roots: [40, 36, 31, 38],
    lead: [76, 0, 76, 79, 0, 76, 0, 74, 76, 0, 72, 0, 74, 0, 76, 0,
           79, 0, 79, 83, 0, 79, 0, 76, 79, 0, 74, 0, 76, 0, 74, 72],
    step(e, t, c) {
      const { sec, step, bar, barInSec, bars } = c;
      const ch = this.chords[bar % 4], root = this.roots[bar % 4];
      const last = barInSec === bars - 1;
      const b = 60 / e.chart.bpm;
      if (sec === 'intro') {
        if (step === 0) e.pad(t, ch, b * 4, 1.1);
        if (step % 2 === 0) e.arp(t, ch[(step / 2) % 3] + 24, 0.09, 0.5 + barInSec * 0.06);
        if (barInSec >= 4 && step % 4 === 0) e.kick(t, 0.7);
        if (last && step === 12) e.riser(t, b * 4);
      } else if (sec === 'verse') {
        if (step % 4 === 0) e.kick(t, 0.95);
        if (step % 4 === 2) e.hat(t, true, 0.55);
        if (step % 2 === 1) e.bass(t, root, 0.1, 0.9);
        if (step % 2 === 0) e.arp(t, ch[(step / 2) % 3] + 24, 0.08, 0.55);
        if (step === 4 || step === 12) e.clap(t, 0.7);
        if (step === 0) e.pad(t, ch, b * 4, 0.7);
      } else if (sec === 'pre') {
        if (step % 4 === 0) e.kick(t);
        if (step % 2 === 1) e.bass(t, root, 0.1, 1);
        if (step % 2 === 0) e.arp(t, ch[(step / 2) % 3] + 24, 0.09, 0.7 + step / 24);
        if (step === 4 || step === 12) e.clap(t, 0.85);
        if (last && step === 0) e.riser(t, b * 4);
        if (last && step === 15) e.subDrop(t);
      } else if (sec === 'chorus') {
        if (step === 0 && barInSec === 0) { e.crash(t); e.cheer(t, 2.6, 0.85); }
        if (step % 4 === 0) e.kick(t, 1.15);
        if (step % 4 === 2) e.hat(t, true, 0.7);
        if (step % 2 === 1) e.bass(t, root, 0.11, 1.05);
        const li = (bar % 2) * 16 + step;
        if (this.lead[li]) e.supersaw(t, [this.lead[li], this.lead[li] - 12], 0.26, 1.1, 5000);
        if (step === 4 || step === 12) e.snare(t, 0.8);
        if (step === 0) e.pad(t, ch, b * 4, 0.85);
      } else if (sec === 'bridge') {
        if (step === 0) e.pad(t, ch, b * 4, 1.2);
        if (step % 2 === 0) e.arp(t, ch[(step / 2) % 3] + 12, 0.12, 0.6);
        if (last && step % 2 === 0) e.snare(t, 0.35 + (step / 16) * 0.55);
        if (last && step === 8) e.riser(t, b * 2);
      } else if (sec === 'outro') {
        if (step === 0 && barInSec === 0) { e.crash(t); e.cheer(t, 3.4, 1); }
        if (step === 0) e.supersaw(t, ch.map((m) => m + 24), b * 3.6, 1, 4800);
        if (step % 4 === 0) e.kick(t, 0.9 - barInSec * 0.35);
      }
    },
  },
};
