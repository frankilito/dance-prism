// ===== 主程序:状态机 + 游戏主循环 =====
import * as THREE from 'three';
import { SONGS, THEMES, IS_SHOT, IS_AUTOTEST, qs } from './config.js';
import { buildChart, buildFreestyleChart } from './charts.js';
import { AudioEngine } from './audio.js';
import { Stage } from './stage.js';
import { Dancer } from './dancer.js';
import { FX } from './fx.js';
import { CameraDirector } from './cameraDirector.js';
import { Tracker } from './pose/tracker.js';
import { Scorer } from './pose/score.js';
import { SimPlayer } from './sim.js';
import {
  $, showScreen, toast, flash, drawSongArt, MoveStrip, popJudgement,
  saveScore, bestScore, renderBoard, gradeOf, makePoster, downloadCanvas,
  Recorder, drawSkeleton,
} from './ui.js';

const glCanvas = $('gl');
const audio = new AudioEngine();
let stage = null, dancer = null, fx = null, director = null;
let tracker = null;
let state = 'boot';
let mode = 'solo';         // solo | duo
let source = 'cam';        // cam | sim(观演/测试)
let selIdx = 0;
let customSong = null;     // 导入音乐
let session = null;
let attract = null;
let lastT = performance.now();
let fpsAcc = 0, fpsN = 0, fpsLow = 0, qualityLevel = 1;

// ---------- 舞台构建 ----------
function buildStage(themeName) {
  if (stage) stage.dispose();
  const theme = THEMES[themeName];
  stage = new Stage(glCanvas, theme, qualityLevel);
  dancer = new Dancer(theme);
  stage.scene.add(dancer.root);
  fx = new FX(stage.scene, theme);
  director = new CameraDirector(stage.camera);
  window.__dbg = { stage, dancer, fx, audio, get session() { return session; }, setCam: (x, y, z) => { window.__camLock = [x, y, z]; } };
  onResize();
}

function onResize() { stage?.resize(); }
addEventListener('resize', onResize);

// ---------- 启动 ----------
async function boot() {
  const fill = $('bootFill'), msg = $('bootMsg');
  const prog = (p, m) => { fill.style.width = `${p}%`; msg.textContent = m; };
  prog(20, '正在点亮舞台…');
  buildStage('neonCity');
  prog(55, '正在排练舞步…');
  // 待机演出
  const attractChart = buildChart(SONGS[0]);
  dancer.setChart(attractChart);
  attract = { chart: attractChart, t0: performance.now() };
  prog(85, '正在调试灯光…');
  await new Promise((r) => setTimeout(r, 60));
  prog(100, 'READY!');
  setupUI();
  requestAnimationFrame(loop);
  if (IS_AUTOTEST) {
    showScreen('game');
    state = 'game';
    await runAutotest();
    return;
  }
  showScreen('title');
  state = 'title';
  window.__ready = true;
}

// ---------- UI 绑定 ----------
function setupUI() {
  // 选歌卡片
  const wrap = $('songCards');
  SONGS.forEach((song, i) => {
    const card = document.createElement('div');
    card.className = 'song-card';
    card.style.setProperty('--tint', song.tint + '77');
    const cv = document.createElement('canvas');
    drawSongArt(cv, song);
    card.appendChild(cv);
    const info = document.createElement('div');
    info.className = 'song-info';
    info.innerHTML = `<div class="song-name">${song.name}</div>
      <div class="song-meta"><span>${song.desc} · ${song.bpm}BPM</span>
      <span class="song-diff"><b>${'★'.repeat(song.diff)}${'☆'.repeat(5 - song.diff)}</b></span></div>`;
    card.appendChild(info);
    const best = bestScore(song.id);
    if (best) {
      const b = document.createElement('div');
      b.className = 'song-best';
      b.textContent = `最高 ${best.toLocaleString()}`;
      card.appendChild(b);
    }
    card.onclick = () => { if (selIdx === i) confirmSong(); else selectSong(i); };
    wrap.appendChild(card);
  });
  selectSong(0);

  $('btnStart').onclick = () => { audio.ensure(); audio.sfx('confirm'); showScreen('select'); state = 'select'; };
  $('modeSolo').onclick = () => setMode('solo');
  $('modeDuo').onclick = () => setMode('duo');
  $('btnBoard').onclick = () => {
    renderBoard($('boardList'), SONGS[selIdx].id);
    $('board').style.display = 'flex';
  };
  $('btnBoardClose').onclick = () => { $('board').style.display = 'none'; };
  $('btnImport').onclick = () => $('fileImport').click();
  $('fileImport').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    toast('正在分析节拍…');
    try {
      audio.ensure();
      const { buffer, bpm, duration } = await audio.analyzeImport(await file.arrayBuffer());
      customSong = {
        id: 'custom', name: file.name.replace(/\.[^.]+$/, '').slice(0, 14), en: 'CUSTOM TRACK',
        bpm, diff: 3, theme: 'theater', tint: '#b026ff', tint2: '#4dc3ff', desc: `导入 · ${bpm}BPM`,
        buffer, duration,
      };
      toast(`《${customSong.name}》 ${bpm} BPM · 已生成舞谱`, 3000);
      audio.sfx('confirm');
      goCalib();
    } catch (err) {
      console.error(err);
      toast('音频解析失败,请换一个文件');
    }
  };
  $('btnCalibBack').onclick = () => { closeCam(); showScreen('select'); state = 'select'; };
  $('btnNoCam').onclick = () => { closeCam(); source = 'sim'; startGame(); };
  $('btnDance').onclick = () => { source = 'cam'; startGame(); };
  $('btnQuit').onclick = () => quitGame();
  $('btnRetry').onclick = () => { showScreen(null); startGame(); };
  $('btnBackSel').onclick = () => { audio.sfx('click'); closeCam(); showScreen('select'); state = 'select'; };
  $('btnPoster').onclick = () => {
    const s = session;
    if (!s) return;
    const poster = makePoster(s.song, s.scorers[0], s.grades[0], glCanvas);
    downloadCanvas(poster, `舞光十色_${s.song.name}_${s.grades[0]}.png`);
    audio.sfx('confirm');
    toast('海报已保存 ✨');
  };
  $('btnClip').onclick = () => {
    if (session?.recorder?.download(`舞光十色_${session.song.name}.webm`)) toast('录像已保存 🎬');
  };

  addEventListener('keydown', (e) => {
    if (state === 'select') {
      if (e.key === 'ArrowLeft') selectSong((selIdx + SONGS.length - 1) % SONGS.length);
      if (e.key === 'ArrowRight') selectSong((selIdx + 1) % SONGS.length);
      if (e.key === 'Enter') confirmSong();
    } else if (state === 'title' && (e.key === 'Enter' || e.key === ' ')) {
      $('btnStart').click();
    } else if (state === 'game' && e.key === 'Escape') {
      quitGame();
    }
  });
}

function setMode(m) {
  mode = m;
  $('modeSolo').classList.toggle('on', m === 'solo');
  $('modeDuo').classList.toggle('on', m === 'duo');
  $('tipDuo').style.display = m === 'duo' ? '' : 'none';
  audio.sfx('click');
}

function selectSong(i) {
  selIdx = i;
  customSong = null;
  document.querySelectorAll('.song-card').forEach((c, j) => c.classList.toggle('sel', j === i));
  audio.sfx('click');
}

function confirmSong() { audio.sfx('confirm'); goCalib(); }

// ---------- 摄像头准备 ----------
async function goCalib() {
  showScreen('calib');
  state = 'calib';
  const guide = $('calibGuide');
  $('btnDance').disabled = true;
  guide.className = 'calib-guide';
  guide.textContent = '正在加载姿态识别模型…';
  try {
    if (!tracker) {
      tracker = new Tracker();
      await tracker.init(mode === 'duo' ? 2 : 1);
    } else if ((tracker.numPoses === 2) !== (mode === 'duo')) {
      tracker.close();
      tracker = new Tracker();
      await tracker.init(mode === 'duo' ? 2 : 1);
    }
    guide.textContent = '请求摄像头权限…(画面全程本地处理,不会上传)';
    await tracker.openCamera($('camVideo'));
    tracker.timeSource = () => performance.now() / 1000;
    tracker.onFrame = null;
    tracker.start();
    guide.textContent = '请站到画面中,保持全身入镜';
  } catch (e) {
    console.warn('[calib]', e);
    guide.textContent = '⚠️ 无法访问摄像头,可选择「无摄像头观演模式」';
    return;
  }
  // 校准循环
  let stableSince = 0;
  const overlay = $('camOverlay');
  const tick = () => {
    if (state !== 'calib') return;
    const v = $('camVideo');
    if (v.videoWidth) { overlay.width = v.videoWidth; overlay.height = v.videoHeight; }
    drawSkeleton(overlay, tracker.playersLm);
    const need = mode === 'duo' ? 2 : 1;
    const seen = tracker.playersLm.filter(Boolean).length;
    const now = performance.now();
    if (seen >= need) {
      if (!stableSince) stableSince = now;
      if (now - stableSince > 1200) {
        guide.textContent = mode === 'duo' ? '✓ 两位舞者就位!' : '✓ 舞者就位!';
        guide.className = 'calib-guide ok';
        $('btnDance').disabled = false;
      } else {
        guide.textContent = '很好,保持住…';
      }
    } else {
      stableSince = 0;
      $('btnDance').disabled = true;
      guide.className = 'calib-guide';
      if (tracker.quality.dim) guide.textContent = '💡 光线偏暗,请开灯以提高识别率';
      else if (seen === 0) guide.textContent = '请站到画面中,保持全身入镜';
      else guide.textContent = `还差 ${need - seen} 位舞者入镜(请左右站开)`;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function closeCam() {
  if (tracker) { tracker.close(); tracker = null; }
  $('camVideo').srcObject = null;
  $('pipVideo').srcObject = null;
}

// ---------- 开始游戏 ----------
async function startGame() {
  const song = customSong || SONGS[selIdx];
  const chart = customSong
    ? buildFreestyleChart(customSong.bpm, customSong.duration)
    : buildChart(song, qs.has('fast'));
  buildStage(song.theme);
  dancer.setChart(chart);

  const players = mode === 'duo' ? 2 : 1;
  const scorers = Array.from({ length: players }, (_, i) => new Scorer(chart, i));
  const sims = source === 'sim'
    ? Array.from({ length: players }, (_, i) => new SimPlayer(chart, i === 0 ? 0.88 : 0.62, i))
    : null;

  session = {
    song, chart, scorers, sims, players,
    strip: new MoveStrip($('moveStrip'), chart, song.tint),
    lastSec: '', lastBeatInt: -1, judgedFlash: 0,
    grades: [], ranks: [], recorder: null, ended: false,
  };

  // HUD 初始化
  $('hudSong').textContent = `${song.name} · ${song.en}`;
  $('score1').textContent = '0';
  $('score2').textContent = '0';
  $('combo1').className = 'hud-combo';
  $('combo2').className = 'hud-combo';
  document.querySelector('.hud-p2').style.visibility = players === 2 ? 'visible' : 'hidden';
  $('gaugeFill').style.height = '0%';
  document.documentElement.style.setProperty('--beatDur', `${60 / chart.bpm}s`);
  $('judge2').style.display = players === 2 ? '' : 'none';

  // 摄像头接入评分 + PiP
  const pipWrap = document.querySelector('.pip');
  if (source === 'cam' && tracker) {
    tracker.timeSource = () => audio.getTime();
    tracker.onFrame = (pi, f) => session.scorers[pi]?.pushFrame(f);
    $('pipVideo').srcObject = tracker.stream;
    $('pipVideo').play().catch(() => {});
    pipWrap.style.display = '';
  } else {
    pipWrap.style.display = 'none';
  }

  showScreen('game');
  state = 'countdown';

  // 录制
  audio.ensure();
  session.recorder = new Recorder(glCanvas, audio.recDest?.stream);
  session.recorder.start();
  $('recDot').style.display = session.recorder.rec ? '' : 'none';

  // 倒计时
  const cd = $('countdown');
  for (const n of ['3', '2', '1']) {
    cd.textContent = n;
    cd.classList.remove('pop'); void cd.offsetWidth; cd.classList.add('pop');
    audio.sfx('count');
    await new Promise((r) => setTimeout(r, 700));
    if (state !== 'countdown') return;
  }
  cd.textContent = 'DANCE!';
  cd.classList.remove('pop'); void cd.offsetWidth; cd.classList.add('pop');
  audio.sfx('go');
  flash(0.4);
  setTimeout(() => { cd.textContent = ''; }, 700);

  state = 'game';
  audio.onEnd = () => finishGame();
  await audio.playSong(song, chart, customSong?.buffer || null);
}

function quitGame() {
  audio.stop();
  audio.onEnd = null;
  session?.recorder?.stop();
  $('recDot').style.display = 'none';
  closeCam();
  showScreen('select');
  state = 'select';
}

// ---------- 结算 ----------
function finishGame() {
  if (!session || session.ended) return;
  session.ended = true;
  session.recorder?.stop();
  $('recDot').style.display = 'none';
  audio.sfx('cheer');
  const s = session;
  s.grades = s.scorers.map((sc) => gradeOf(sc.finalAccuracy()));
  s.ranks = s.scorers.map((sc, i) => saveScore(s.song.id, {
    name: s.players === 2 ? `P${i + 1}` : 'YOU',
    score: sc.score, grade: s.grades[i],
    acc: Math.round(sc.finalAccuracy() * 100),
    combo: sc.maxCombo, mode, date: Date.now(),
  }));
  // 填结算
  $('resGrade').textContent = s.grades[0];
  $('resTitle').textContent = `${s.song.name} · ${mode === 'duo' ? '双人' : '单人'}${source === 'sim' ? ' · 观演' : ''}`;
  const cols = $('resCols');
  const mk = (sc, i) => `
    <div class="res-col"><div class="k">${s.players === 2 ? `P${i + 1} ` : ''}SCORE</div><div class="v gold">${sc.score.toLocaleString()}</div></div>
    <div class="res-col"><div class="k">准确率</div><div class="v">${Math.round(sc.finalAccuracy() * 100)}%</div></div>
    <div class="res-col"><div class="k">最大连击</div><div class="v">${sc.maxCombo}</div></div>
    <div class="res-col"><div class="k">判定 P·G·G·M</div><div class="v" style="font-size:1.1rem">${sc.counts.perfect} · ${sc.counts.great} · ${sc.counts.good} · ${sc.counts.miss}</div></div>`;
  cols.innerHTML = s.scorers.map(mk).join('<div style="width:100%"></div>');
  if (s.players === 2) {
    const w = s.scorers[0].score >= s.scorers[1].score ? 1 : 2;
    $('resTitle').textContent += ` · 🏆 P${w} 获胜!`;
  }
  renderBoard($('resBoard'), s.song.id);
  $('btnClip').style.display = session.recorder?.rec ? '' : 'none';
  setTimeout(() => {
    showScreen('results');
    state = 'results';
    fx?.confettiBlast(200);
  }, 600);
}

// ---------- 主循环 ----------
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  if (!stage) return;

  // FPS 自适应降质
  fpsAcc += dt; fpsN++;
  if (fpsAcc >= 2) {
    const fps = fpsN / fpsAcc;
    if (IS_AUTOTEST) console.log(`FPS ${fps.toFixed(1)}`);
    fpsAcc = 0; fpsN = 0;
    if (fps < 42 && qualityLevel > 0.5) {
      fpsLow++;
      if (fpsLow >= 2) {
        qualityLevel = 0.5;
        stage.renderer.setPixelRatio(1);
        stage.bloom.strength *= 0.8;
        toast('已自动降低画质以保持流畅');
        fpsLow = 0;
      }
    } else fpsLow = 0;
  }

  if (state === 'game' && session && audio.playing) {
    const songTime = audio.getTime();
    const beat = audio.getBeat();
    const level = audio.getLevel();
    const sc = audio.secAt ? audio.secAt(beat) : null;
    const sec = audio.importedOnly ? (session.chart.sections.find((s2, i2, a2) => beat >= s2.beat && (!a2[i2 + 1] || beat < a2[i2 + 1].beat))?.sec || 'verse') : (sc?.sec || 'verse');

    // 模拟玩家喂帧
    if (session.sims && songTime > 0) {
      for (let i = 0; i < session.sims.length; i++) {
        session.scorers[i].pushFrame(session.sims[i].frame(songTime));
      }
    }
    // 摄像头质量提示
    if (source === 'cam' && tracker && songTime > 3) {
      if (!session._qToast || now - session._qToast > 15000) {
        if (tracker.quality.dim) { toast('💡 光线偏暗,识别可能不准'); session._qToast = now; }
        else if (tracker.quality.outOfFrame) { toast('📷 找不到你啦,请回到镜头前'); session._qToast = now; }
      }
    }
    // 判定
    for (let pi = 0; pi < session.scorers.length; pi++) {
      const results = session.scorers[pi].update(songTime);
      for (const r of results) onJudgement(pi, r);
    }
    // HUD
    $('score1').textContent = session.scorers[0].score.toLocaleString();
    if (session.players === 2) $('score2').textContent = session.scorers[1].score.toLocaleString();
    updateCombo(0); if (session.players === 2) updateCombo(1);
    $('hudProgFill').style.width = `${Math.min(100, (songTime / session.chart.duration) * 100)}%`;
    $('gaugeFill').style.height = `${session.scorers[0].energy * 100}%`;
    session.strip.update(beat);

    // 节拍事件
    const beatInt = Math.floor(beat);
    if (beatInt !== session.lastBeatInt && beatInt >= 0) {
      session.lastBeatInt = beatInt;
      const dp = dancer.root.position;
      if (sec === 'chorus' || beatInt % 2 === 0) {
        fx.ripple(dp.x, dp.z, beatInt % 2 ? session.song.tint : session.song.tint2, sec === 'chorus' && beatInt % 4 === 0);
      }
      if (sec === 'chorus' && qualityLevel > 0.5) fx.ghost(dancer);
      if (sec === 'chorus' && beatInt % 4 === 0) fx.pyro();
    }
    // 段落切换演出
    if (sec !== session.lastSec) {
      if (sec === 'chorus') {
        fx.confettiBlast(150);
        fx.pyro();
        director.kick(1);
        flash(0.25);
      }
      session.lastSec = sec;
    }
    // 连击火焰
    const combo = session.scorers[0].combo;
    fx.setComboFire(combo >= 8 ? Math.min(1, combo / 40) : 0);

    // 场景更新
    dancer.update(dt, beat, level);
    stage.update(dt, beat, level, sec, audio.getSpectrum());
    fx.update(dt, dancer.root.position);
    director.update(dt, Math.max(0, beat), sec, level);

    // PiP 骨架
    if (source === 'cam' && tracker) {
      const pc = $('pipCanvas');
      if (pc.width !== 240) { pc.width = 240; pc.height = 180; }
      drawSkeleton(pc, tracker.playersLm);
    }
  } else {
    // 待机演出(标题/选歌/校准/结算背后)
    const t = (now - (attract?.t0 || 0)) / 1000;
    const beat = t * (SONGS[0].bpm / 60) * 0.5;
    const fakeLevel = 0.25 + Math.abs(Math.sin(beat * Math.PI)) * 0.3;
    if (attract && dancer.chart) {
      const loopBeat = beat % attract.chart.totalBeats;
      if (loopBeat < 1 && dancer.moveIdx > 10) dancer.moveIdx = -1; // 循环
      dancer.update(dt, loopBeat, fakeLevel);
    }
    stage.update(dt, beat, fakeLevel, state === 'results' ? 'chorus' : 'verse', null);
    fx.update(dt, dancer.root.position);
    // 慢速环绕镜头
    if (window.__camLock) {
      const [cx, cy, cz] = window.__camLock;
      stage.camera.position.set(cx, cy, cz);
    } else {
      const a = t * 0.12;
      stage.camera.position.set(Math.sin(a) * 6.8, 2 + Math.sin(t * 0.4) * 0.4, Math.cos(a) * 6.8);
    }
    stage.camera.lookAt(0, 1.2, 0);
  }

  stage.render();
}

function onJudgement(pi, r) {
  popJudgement(pi, r.judgement, r.combo);
  audio.sfx(r.judgement);
  if (pi === 0) {
    dancer.react(r.judgement);
  }
  const handWorld = new THREE.Vector3();
  (pi === 0 ? dancer.armR : dancer.armL).hand.getWorldPosition(handWorld);
  if (r.judgement === 'perfect') {
    fx.burst(handWorld, 0xffd34d, 30, 2.6);
    fx.shockwave(new THREE.Vector3(dancer.root.position.x, 1.1, dancer.root.position.z), pi === 0 ? 0xffd34d : 0x22d3ee);
    stage.hitFlash = 1;
    if (r.combo > 0 && r.combo % 10 === 0) { audio.sfx('combo'); director.kick(0.8); }
  } else if (r.judgement === 'great') {
    fx.burst(handWorld, pi === 0 ? 0x6cf7c3 : 0x22d3ee, 16, 1.8);
  } else if (r.judgement === 'good') {
    fx.burst(handWorld, 0x7cc4ff, 8, 1.2);
  }
  if (IS_AUTOTEST) console.log(`TEST judge p${pi} ${r.judgement} err=${r.err.toFixed(1)} combo=${r.combo}`);
}

function updateCombo(pi) {
  const sc = session.scorers[pi];
  const el = $(pi === 0 ? 'combo1' : 'combo2');
  el.querySelector('b').textContent = sc.combo;
  el.classList.toggle('on', sc.combo >= 3);
  el.classList.toggle('fire', sc.combo >= 15);
}

// ---------- 自动测试 ----------
async function runAutotest() {
  console.log('TEST start autotest');
  window.__game = { started: true };
  mode = qs.has('solo') ? 'solo' : 'duo';
  source = 'sim';
  selIdx = 0;
  setMode(mode);
  // fast 谱面
  if (!qs.has('fullsong')) {
    const url = new URL(location); // 标记 fast
    if (!qs.has('fast')) qs.set('fast', '1');
  }
  await startGame();
  // 等待结束
  await new Promise((resolve) => {
    const check = setInterval(() => {
      if (state === 'results' || session?.ended) { clearInterval(check); resolve(); }
    }, 500);
  });
  const s = session;
  for (let i = 0; i < s.scorers.length; i++) {
    const sc = s.scorers[i];
    console.log(`TEST result p${i} score=${sc.score} acc=${(sc.finalAccuracy() * 100).toFixed(1)}% grade=${s.grades[i]} maxCombo=${sc.maxCombo} counts=${JSON.stringify(sc.counts)}`);
  }
  const p0 = s.scorers[0], p1 = s.scorers[1];
  const asserts = [
    ['p0 判定总数=谱面动作数', p0.results.length === s.chart.moves.length],
    ['p0 有得分', p0.score > 0],
    ['p0 高手准确率>60%', p0.finalAccuracy() > 0.6],
    ['p0 有 perfect', p0.counts.perfect > 0],
    [`双人时 p0>p1`, !p1 || p0.score > p1.score],
  ];
  let pass = true;
  for (const [name, ok] of asserts) {
    console.log(`TEST assert ${ok ? 'PASS' : 'FAIL'}: ${name}`);
    if (!ok) pass = false;
  }
  console.log(`TEST done ${pass ? 'ALL PASS' : 'HAS FAILURES'}`);
  window.__testDone = true;
}

// main.js 的 startGame 里 buildChart 需要感知 fast — 通过 qs 传递
window.__startDemo = (idx = 0, m = 'solo') => {
  selIdx = idx; mode = m; source = 'sim';
  startGame();
};
boot();
