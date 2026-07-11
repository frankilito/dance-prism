// ===== 动作评分 =====
// 玩家帧(镜像屏幕空间 2D 段向量)vs 姿势模板(3D 方向投影到 2D),
// 加权关节角误差 + 跳/蹲/转身事件检测 + 时间窗判定。
import { JUDGE } from '../config.js';
import { getPose } from '../poses.js';

const SEGS = ['uaL', 'faL', 'uaR', 'faR', 'thL', 'shL', 'thR', 'shR', 'torso'];
const WEIGHTS = { uaL: 1.6, faL: 1.25, uaR: 1.6, faR: 1.25, thL: 0.85, shL: 0.55, thR: 0.85, shR: 0.55, torso: 1.5 };

// 姿势 → 2D 模板(投影 + 前缩权重),缓存
const tplCache = new Map();
export function poseTemplate(poseName) {
  if (tplCache.has(poseName)) return tplCache.get(poseName);
  const pose = getPose(poseName);
  const tpl = {};
  for (const k of SEGS) {
    const v = k === 'torso' ? pose.torso : pose[k];
    const len = Math.hypot(v[0], v[1]);
    tpl[k] = {
      dir: len > 0.001 ? [v[0] / len, v[1] / len] : [0, -1],
      w: WEIGHTS[k] * Math.min(1, Math.max(0.22, len)), // 指向镜头的段降权
    };
  }
  tplCache.set(poseName, tpl);
  return tpl;
}

// 单帧 vs 模板:加权平均角误差(度)
export function frameError(frame, tpl) {
  let sum = 0, wsum = 0;
  for (const k of SEGS) {
    const fs = frame.seg[k];
    if (!fs) continue;
    const t = tpl[k];
    const dot = Math.max(-1, Math.min(1, fs[0] * t.dir[0] + fs[1] * t.dir[1]));
    const err = (Math.acos(dot) * 180) / Math.PI;
    sum += err * t.w;
    wsum += t.w;
  }
  return wsum > 0 ? sum / wsum : 180;
}

// 事件检测:在窗口帧序列上找特征
function detectEvent(frames, ev, baseline) {
  if (!frames.length) return false;
  if (ev === 'jump') {
    let maxUp = 0;
    for (const f of frames) maxUp = Math.max(maxUp, f.hipY - baseline.hipY);
    return maxUp > 0.13;
  }
  if (ev === 'squat') {
    let maxDown = 0;
    for (const f of frames) maxDown = Math.max(maxDown, baseline.hipY - f.hipY);
    return maxDown > 0.16;
  }
  if (ev === 'turn') {
    let minW = 1e9;
    for (const f of frames) minW = Math.min(minW, Math.abs(f.shoulderW));
    return minW < baseline.shoulderW * 0.55;
  }
  return false;
}

// 一个玩家的评分状态机
export class Scorer {
  constructor(chart, playerIdx = 0) {
    this.chart = chart;
    this.idx = playerIdx;
    this.buffer = [];         // 最近帧
    this.nextMove = 0;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.counts = { perfect: 0, great: 0, good: 0, miss: 0 };
    this.energy = 0;          // 律动槽 0..1
    this.accSum = 0;
    this.baseline = { hipY: 0, shoulderW: 0.9, n: 0 };
    this.beatDur = 60 / chart.bpm;
    this.results = [];
  }

  pushFrame(frame) {
    this.buffer.push(frame);
    const cutoff = frame.t - 3;
    while (this.buffer.length && this.buffer[0].t < cutoff) this.buffer.shift();
    // 基线:缓慢跟随(站立姿态的髋高/肩宽)
    const b = this.baseline;
    if (b.n < 40) {
      b.hipY = (b.hipY * b.n + frame.hipY) / (b.n + 1);
      b.shoulderW = (b.shoulderW * b.n + Math.abs(frame.shoulderW)) / (b.n + 1);
      b.n++;
    } else {
      b.hipY += (frame.hipY - b.hipY) * 0.004;
      b.shoulderW += (Math.abs(frame.shoulderW) - b.shoulderW) * 0.003;
    }
  }

  // songTime 前进,窗口关闭的动作出判定;返回本帧新判定列表
  update(songTime) {
    const out = [];
    const W = JUDGE.window;
    while (this.nextMove < this.chart.moves.length) {
      const mv = this.chart.moves[this.nextMove];
      const tMove = mv.beat * this.beatDur;
      if (songTime < tMove + W) break;
      out.push(this.judgeMove(mv, tMove));
      this.nextMove++;
    }
    return out;
  }

  judgeMove(mv, tMove) {
    const W = JUDGE.window;
    const frames = this.buffer.filter((f) => f.t >= tMove - W && f.t <= tMove + W);
    const tpl = poseTemplate(mv.pose);
    let best = 999, bestDt = 0;
    for (const f of frames) {
      // 时间偏移惩罚:偏离拍点越远误差越大
      const dtPen = Math.abs(f.t - tMove) * 26;
      const e = frameError(f, tpl) + dtPen;
      if (e < best) { best = e; bestDt = f.t - tMove; }
    }
    // 事件加成/约束
    if (mv.event) {
      const hit = detectEvent(frames, mv.event, this.baseline);
      if (hit) best -= 14;
      else best += 16;
    }
    if (!frames.length) best = 999;
    best = Math.max(0, best);

    let j;
    if (best <= JUDGE.perfectDeg) j = 'perfect';
    else if (best <= JUDGE.greatDeg) j = 'great';
    else if (best <= JUDGE.goodDeg) j = 'good';
    else j = 'miss';

    // 连击与分数
    if (j === 'miss') this.combo = 0;
    else {
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
    }
    const bonus = 1 + Math.min(JUDGE.comboBonusMax, this.combo * JUDGE.comboBonus);
    const gain = Math.round(JUDGE.scores[j] * bonus);
    this.score += gain;
    this.counts[j]++;
    const accVal = { perfect: 1, great: 0.72, good: 0.4, miss: 0 }[j];
    this.accSum += accVal;
    this.energy = Math.max(0, Math.min(1, this.energy + (j === 'miss' ? -0.08 : accVal * 0.045)));
    const res = { judgement: j, move: mv, gain, dt: bestDt, err: best, combo: this.combo };
    this.results.push(res);
    return res;
  }

  accuracy() {
    const n = this.counts.perfect + this.counts.great + this.counts.good + this.counts.miss;
    return n ? this.accSum / n : 0;
  }

  finalAccuracy() {
    const total = this.chart.moves.length || 1;
    return this.accSum / total;
  }
}
