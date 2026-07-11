// ===== UI:选歌卡片 / HUD / 判定 / 结算 / 排行榜 / 海报 / 录制 =====
import { SONGS, THEMES, GRADES } from './config.js';
import { getPose } from './poses.js';

export const $ = (id) => document.getElementById(id);

export function showScreen(name) {
  for (const s of document.querySelectorAll('.screen')) s.classList.remove('active');
  if (name) $(name).classList.add('active');
}

export function toast(msg, ms = 2200) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('on'), ms);
}

export function flash(opacity = 0.55) {
  const f = $('flash');
  f.style.transition = 'none';
  f.style.opacity = opacity;
  requestAnimationFrame(() => {
    f.style.transition = 'opacity 0.45s';
    f.style.opacity = 0;
  });
}

// ---------- 选歌卡片(主题小海报,canvas 绘制) ----------
export function drawSongArt(canvas, song) {
  const W = canvas.width = 320, H = canvas.height = 200;
  const c = canvas.getContext('2d');
  const T = THEMES[song.theme];
  const p = '#' + T.primary.toString(16).padStart(6, '0');
  const s = '#' + T.secondary.toString(16).padStart(6, '0');
  const g = c.createLinearGradient(0, 0, 0, H);
  if (song.theme === 'beach') { g.addColorStop(0, '#2b1055'); g.addColorStop(0.6, '#c33764'); g.addColorStop(1, '#ff9a3d'); }
  else if (song.theme === 'disco') { g.addColorStop(0, '#1a0b14'); g.addColorStop(1, '#3d1030'); }
  else if (song.theme === 'space') { g.addColorStop(0, '#02020c'); g.addColorStop(1, '#101540'); }
  else { g.addColorStop(0, '#0a0618'); g.addColorStop(1, '#231040'); }
  c.fillStyle = g; c.fillRect(0, 0, W, H);

  if (song.theme === 'neonCity') {
    for (let i = 0; i < 14; i++) {
      const bw = 14 + (i * 37 % 30), bh = 40 + (i * 53 % 90), x = i * 24 - 6;
      c.fillStyle = '#0d0a1e';
      c.fillRect(x, H - bh, bw, bh);
      c.fillStyle = i % 2 ? p : s;
      c.globalAlpha = 0.85;
      for (let wy = H - bh + 6; wy < H - 8; wy += 12)
        for (let wx = x + 3; wx < x + bw - 4; wx += 8)
          if ((wx + wy) % 3) c.fillRect(wx, wy, 3, 5);
      c.globalAlpha = 1;
    }
    c.strokeStyle = p; c.lineWidth = 3;
    c.beginPath(); c.arc(W / 2, H + 40, 90, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
  } else if (song.theme === 'beach') {
    c.fillStyle = '#ffd76e';
    c.beginPath(); c.arc(W / 2, H * 0.58, 34, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(13,53,71,0.9)'; c.fillRect(0, H * 0.68, W, H);
    c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      for (let x = 0; x <= W; x += 6) {
        const y = H * 0.72 + i * 12 + Math.sin(x * 0.05 + i * 2) * 3;
        x === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
      }
      c.stroke();
    }
    c.fillStyle = '#123326';
    c.beginPath(); c.ellipse(30, H * 0.6, 10, 46, 0.35, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(W - 26, H * 0.62, 9, 42, -0.3, 0, Math.PI * 2); c.fill();
  } else if (song.theme === 'theater') {
    for (let i = 5; i >= 0; i--) {
      c.strokeStyle = i % 2 ? p : s;
      c.globalAlpha = 1 - i * 0.13;
      c.lineWidth = 4;
      const r = 26 + i * 26;
      c.beginPath(); c.arc(W / 2, H * 0.88, r, Math.PI, 0); c.stroke();
    }
    c.globalAlpha = 1;
  } else if (song.theme === 'disco') {
    c.save(); c.translate(W / 2, 62);
    for (let ring = 0; ring < 4; ring++) {
      for (let i = 0; i < 10 + ring * 6; i++) {
        const a = (i / (10 + ring * 6)) * Math.PI * 2;
        const r = 12 + ring * 11;
        c.fillStyle = ['#ddd', p, s, '#fff'][(i + ring) % 4];
        c.fillRect(Math.cos(a) * r - 3, Math.sin(a) * r * 0.9 - 3, 6, 6);
      }
    }
    c.restore();
    for (let i = 0; i < 6; i++) {
      c.fillStyle = [p, s, '#ffd34d'][i % 3];
      c.globalAlpha = 0.5;
      c.beginPath();
      c.moveTo(W / 2, 62);
      c.lineTo(i * W / 5 - 20, H); c.lineTo(i * W / 5 + 24, H);
      c.closePath(); c.fill();
    }
    c.globalAlpha = 1;
  } else if (song.theme === 'space') {
    for (let i = 0; i < 60; i++) {
      c.fillStyle = i % 5 ? '#cfe0ff' : s;
      const x = (i * 73) % W, y = (i * 41) % H;
      c.fillRect(x, y, i % 4 ? 1.5 : 2.5, i % 4 ? 1.5 : 2.5);
    }
    c.fillStyle = '#22355f';
    c.beginPath(); c.arc(W * 0.74, H * 0.36, 34, 0, Math.PI * 2); c.fill();
    c.strokeStyle = s; c.lineWidth = 5; c.globalAlpha = 0.7;
    c.beginPath(); c.ellipse(W * 0.74, H * 0.36, 52, 14, -0.35, 0, Math.PI * 2); c.stroke();
    c.globalAlpha = 1;
  }
  // 标题字(留给卡片下方信息区,不重复绘制)
}

// ---------- 动作图标(火柴人 pictogram) ----------
export function drawMovePictogram(canvas, poseName, color = '#ffd34d') {
  const W = canvas.width = 96, H = canvas.height = 96;
  const c = canvas.getContext('2d');
  c.clearRect(0, 0, W, H);
  const pose = getPose(poseName);
  const cx = W / 2, cy = H * 0.52, S = 22;
  const pt = (base, dir, len) => [base[0] + dir[0] * len * S, base[1] - dir[1] * len * S];
  const hip = [cx, cy + (pose.hipY < -0.1 ? 8 : pose.hipY > 0.1 ? -7 : 0)];
  const neck = pt(hip, pose.torso, 1.15);
  const shW = 0.42 * S;
  const perp = [-pose.torso[1], -pose.torso[0]];
  const shL = [neck[0] - shW, neck[1] + perp[1] * 2];
  const shR = [neck[0] + shW, neck[1] + perp[1] * 2];
  const elL = pt(shL, pose.uaL, 0.62), wrL = pt(elL, pose.faL, 0.56);
  const elR = pt(shR, pose.uaR, 0.62), wrR = pt(elR, pose.faR, 0.56);
  const hipL = [hip[0] - 0.22 * S, hip[1]], hipR = [hip[0] + 0.22 * S, hip[1]];
  const knL = pt(hipL, pose.thL, 0.8), anL = pt(knL, pose.shL, 0.74);
  const knR = pt(hipR, pose.thR, 0.8), anR = pt(knR, pose.shR, 0.74);
  c.lineWidth = 7; c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = color;
  c.shadowColor = color; c.shadowBlur = 8;
  const line = (a, b) => { c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); };
  line(hip, neck);
  line(shL, elL); line(elL, wrL);
  line(shR, elR); line(elR, wrR);
  line(hipL, knL); line(knL, anL);
  line(hipR, knR); line(knR, anR);
  // 头
  const head = pt(neck, pose.torso, 0.38);
  c.beginPath(); c.arc(head[0], head[1] - 4, 8, 0, Math.PI * 2); c.stroke();
  // 事件标记
  if (pose.event) {
    c.shadowBlur = 0;
    c.font = '900 16px Arial'; c.textAlign = 'right';
    c.fillStyle = '#fff';
    c.fillText(pose.event === 'jump' ? '↑' : pose.event === 'squat' ? '↓' : '↻', W - 6, 18);
  }
}

// ---------- 动作预告条 ----------
export class MoveStrip {
  constructor(el, chart, tint) {
    this.el = el;
    this.chart = chart;
    this.tint = tint;
    this.shown = new Map(); // moveIdx -> element
    this.el.innerHTML = '';
  }

  // beat:当前拍;显示未来 4 个动作,最近的高亮
  update(beat) {
    const moves = this.chart.moves;
    let next = 0;
    while (next < moves.length && moves[next].beat < beat - 0.3) next++;
    const want = [];
    for (let i = next; i < Math.min(next + 4, moves.length); i++) want.push(i);
    // 移除过期
    for (const [idx, node] of this.shown) {
      if (!want.includes(idx)) { node.remove(); this.shown.delete(idx); }
    }
    // 添加新的
    for (const idx of want) {
      if (!this.shown.has(idx)) {
        const div = document.createElement('div');
        div.className = 'move-icon';
        const cv = document.createElement('canvas');
        drawMovePictogram(cv, moves[idx].pose, this.tint);
        div.appendChild(cv);
        const ring = document.createElement('div');
        ring.className = 'ring';
        div.appendChild(ring);
        this.el.appendChild(div);
        this.shown.set(idx, div);
      }
      this.shown.get(idx).classList.toggle('next', idx === next);
    }
    // 排序:最近的在底部(column-reverse,DOM 顺序=远→近)
    const ordered = [...want].reverse();
    for (const idx of ordered) this.el.appendChild(this.shown.get(idx));
  }
}

// ---------- 判定弹字 ----------
const JUDGE_TEXT = { perfect: 'PERFECT!', great: 'GREAT!', good: 'GOOD', miss: 'MISS' };
export function popJudgement(playerIdx, j, combo) {
  const el = $(playerIdx === 0 ? 'judge1' : 'judge2');
  el.textContent = JUDGE_TEXT[j] + (j !== 'miss' && combo > 5 ? ` ×${combo}` : '');
  el.className = `judge-pop ${playerIdx === 1 ? 'p2' : ''} jt-${j}`;
  el.style.rotate = j === 'miss' ? '0deg' : `${(Math.random() * 7 - 3.5).toFixed(1)}deg`;
  void el.offsetWidth; // 重启动画
  el.classList.add('show');
}

// ---------- 排行榜 ----------
const BOARD_KEY = 'danceprism_board_v1';
export function loadBoard() {
  try { return JSON.parse(localStorage.getItem(BOARD_KEY)) || {}; } catch { return {}; }
}
export function saveScore(songId, entry) {
  const b = loadBoard();
  if (!b[songId]) b[songId] = [];
  b[songId].push(entry);
  b[songId].sort((a, c) => c.score - a.score);
  b[songId] = b[songId].slice(0, 20);
  localStorage.setItem(BOARD_KEY, JSON.stringify(b));
  return b[songId].findIndex((e) => e === entry || (e.score === entry.score && e.date === entry.date)) + 1;
}
export function bestScore(songId) {
  const b = loadBoard();
  return b[songId]?.[0]?.score || 0;
}
export function renderBoard(container, songId) {
  const b = loadBoard();
  const list = b[songId] || [];
  if (!list.length) {
    container.innerHTML = '<div class="board-empty">还没有记录,快去创造第一个吧!</div>';
    return;
  }
  container.innerHTML = list.slice(0, 10).map((e, i) => `
    <div class="board-row ${i === 0 ? 'top1' : ''}">
      <div class="rk">${i + 1}</div>
      <div class="nm">${e.name}${e.mode === 'duo' ? ' 👯' : ''}</div>
      <div class="gd">${e.grade}</div>
      <div class="sc">${e.score.toLocaleString()}</div>
    </div>`).join('');
}

export function gradeOf(acc) {
  for (const g of GRADES) if (acc >= g.min) return g.g;
  return 'D';
}

// ---------- 结算海报 ----------
export function makePoster(song, scorer, grade, glCanvas) {
  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  const T = THEMES[song.theme];
  const p = '#' + T.primary.toString(16).padStart(6, '0');
  const s = '#' + T.secondary.toString(16).padStart(6, '0');
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0a0618'); g.addColorStop(1, '#1c0f33');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // 舞台截图
  try {
    const sw = W - 120, sh = sw * glCanvas.height / glCanvas.width;
    x.save();
    x.beginPath();
    x.roundRect(60, 210, sw, sh, 28);
    x.clip();
    x.drawImage(glCanvas, 60, 210, sw, sh);
    x.restore();
    x.strokeStyle = p; x.lineWidth = 3;
    x.beginPath(); x.roundRect(60, 210, sw, sh, 28); x.stroke();
  } catch {}
  // 标题
  x.textAlign = 'center';
  x.font = '900 italic 64px "PingFang SC", Arial';
  x.fillStyle = '#fff';
  x.shadowColor = p; x.shadowBlur = 30;
  x.fillText('舞光十色', W / 2, 110);
  x.font = '700 30px Arial';
  x.shadowBlur = 0;
  x.fillStyle = s;
  x.fillText('DANCE PRISM', W / 2, 158);
  // 歌名 + 评级
  const shotH = (W - 120) * glCanvas.height / glCanvas.width;
  let y = 210 + shotH + 90;
  x.font = '800 italic 48px "PingFang SC", Arial';
  x.fillStyle = '#fff';
  x.fillText(`${song.name} · ${song.en}`, W / 2, y);
  y += 190;
  x.font = '900 italic 220px Arial';
  const gg = x.createLinearGradient(0, y - 180, 0, y);
  gg.addColorStop(0, '#fff'); gg.addColorStop(0.55, '#ffd34d'); gg.addColorStop(1, '#ff8a00');
  x.fillStyle = gg;
  x.shadowColor = '#ffb400'; x.shadowBlur = 44;
  x.fillText(grade, W / 2, y);
  x.shadowBlur = 0;
  y += 90;
  x.font = '900 italic 76px Arial';
  x.fillStyle = '#fff';
  x.fillText(scorer.score.toLocaleString(), W / 2, y);
  y += 78;
  x.font = '600 34px "PingFang SC", Arial';
  x.fillStyle = '#9aa1d4';
  const ct = scorer.counts;
  x.fillText(`PERFECT ${ct.perfect}   GREAT ${ct.great}   GOOD ${ct.good}   MISS ${ct.miss}   最大连击 ${scorer.maxCombo}`, W / 2, y);
  y += 64;
  x.fillStyle = '#666e9e';
  x.font = '500 28px Arial';
  x.fillText(new Date().toLocaleDateString('zh-CN') + ' · Powered by MediaPipe + Three.js', W / 2, y);
  return c;
}

export function downloadCanvas(canvas, name) {
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}

// ---------- 录制 ----------
export class Recorder {
  constructor(glCanvas, audioStream) {
    this.blob = null;
    this.rec = null;
    try {
      const stream = glCanvas.captureStream(30);
      if (audioStream) for (const t of audioStream.getAudioTracks()) stream.addTrack(t);
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
      this.rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 5e6 });
      this.chunks = [];
      this.rec.ondataavailable = (e) => { if (e.data.size) this.chunks.push(e.data); };
      this.rec.onstop = () => { this.blob = new Blob(this.chunks, { type: 'video/webm' }); };
    } catch (e) {
      console.warn('[rec] MediaRecorder unavailable', e);
    }
  }
  start() { try { this.rec?.start(1000); } catch {} }
  stop() { try { if (this.rec?.state === 'recording') this.rec.stop(); } catch {} }
  download(name) {
    if (!this.blob) return false;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(this.blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    return true;
  }
}

// ---------- 摄像头骨架叠加 ----------
import { SKELETON_EDGES } from './pose/tracker.js';
export function drawSkeleton(canvas, playersLm, colors = ['#ff2d78', '#22d3ee']) {
  const c = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  c.clearRect(0, 0, W, H);
  playersLm.forEach((lm, pi) => {
    if (!lm) return;
    c.strokeStyle = colors[pi];
    c.fillStyle = colors[pi];
    c.lineWidth = 3;
    c.shadowColor = colors[pi]; c.shadowBlur = 6;
    for (const [a, b] of SKELETON_EDGES) {
      const pa = lm[a], pb = lm[b];
      if ((pa.visibility ?? 1) < 0.35 || (pb.visibility ?? 1) < 0.35) continue;
      c.beginPath();
      c.moveTo((1 - pa.x) * W, pa.y * H);
      c.lineTo((1 - pb.x) * W, pb.y * H);
      c.stroke();
    }
    const head = lm[0];
    if ((head.visibility ?? 1) > 0.35) {
      c.beginPath();
      c.arc((1 - head.x) * W, head.y * H, 9, 0, Math.PI * 2);
      c.stroke();
    }
    c.shadowBlur = 0;
  });
}
