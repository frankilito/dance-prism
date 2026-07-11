// ===== 模拟玩家 =====
// 观演模式(无摄像头)与自动测试:按谱面生成带噪声的帧,走与真人完全相同的评分管线。
// 噪声随时间平滑变化(窗口内一致),"做错的动作"在构造时确定,避免逐帧闪烁。
import { getPose, lerpPose, POSES } from './poses.js';

const SEG_KEYS = ['uaL', 'faL', 'uaR', 'faR', 'thL', 'shL', 'thR', 'shR', 'torso'];

export class SimPlayer {
  constructor(chart, accuracy = 0.85, seedOffset = 0) {
    this.chart = chart;
    this.accuracy = accuracy;
    this.beatDur = 60 / chart.bpm;
    this.jitter = (1 - accuracy) * 0.22 + 0.015; // 时间抖动(秒)
    this.noiseAmp = (1 - accuracy) * 0.55 + 0.02; // 方向噪声幅度
    this.phase = seedOffset * 3.7 + accuracy * 11;
    this._tmp = {};
    // 预计算每个动作是否做错:错则替换为别的姿势或偷懒保持上一个
    let seed = (12345 + seedOffset * 999331) >>> 0;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const names = Object.keys(POSES);
    const mistakeProb = Math.max(0, (1 - accuracy) * 0.95);
    this.actual = chart.moves.map((mv, i) => {
      if (rnd() >= mistakeProb) return { pose: mv.pose, doEvent: rnd() < accuracy + 0.25 };
      const lazy = rnd() < 0.5;
      return {
        pose: lazy ? (chart.moves[i - 1]?.pose || 'idle') : names[Math.floor(rnd() * names.length)],
        doEvent: false,
      };
    });
  }

  // songTime → 一帧(与 tracker.landmarksToFrame 相同格式)
  frame(songTime) {
    const moves = this.chart.moves;
    const personalT = songTime + Math.sin(songTime * 0.7 + this.phase) * this.jitter;
    const beat = personalT / this.beatDur;
    let idx = -1;
    for (let i = 0; i < moves.length; i++) {
      if (moves[i].beat - 0.85 <= beat) idx = i; else break;
    }
    const from = getPose(idx <= 0 ? 'idle' : this.actual[idx - 1].pose);
    const to = getPose(idx >= 0 ? this.actual[idx].pose : 'idle');
    let t = idx >= 0 ? Math.min(1, (beat - (moves[idx].beat - 0.85)) / 0.85) : 1;
    t = t * t * (3 - 2 * t);
    const pose = lerpPose(from, to, t, this._tmp);
    // 投影到 2D + 平滑噪声(每段独立相位,随时间缓变)
    const seg = {};
    for (let i = 0; i < SEG_KEYS.length; i++) {
      const k = SEG_KEYS[i];
      const v = pose[k];
      const n1 = Math.sin(songTime * 1.7 + i * 2.31 + this.phase) * this.noiseAmp;
      const n2 = Math.cos(songTime * 1.23 + i * 4.17 + this.phase * 1.7) * this.noiseAmp;
      const dx = v[0] + n1, dy = v[1] + n2;
      const l = Math.hypot(dx, dy) || 1;
      seg[k] = [dx / l, dy / l];
    }
    // 髋高:含事件(跳/蹲)
    let hipY = 2.1 + pose.hipY * 0.55;
    const act = idx >= 0 ? this.actual[idx] : null;
    const ev = act && act.doEvent ? moves[idx].event : null;
    if (ev) {
      const tEvent = moves[idx].beat * this.beatDur;
      const dt = songTime - tEvent;
      if (ev === 'jump' && Math.abs(dt) < 0.3) hipY += Math.cos((dt / 0.3) * Math.PI / 2) * 0.32;
      if (ev === 'squat' && Math.abs(dt) < 0.4) hipY -= Math.cos((dt / 0.4) * Math.PI / 2) * 0.32;
    }
    // 肩宽:转身时收缩
    let shoulderW = 0.92;
    if (ev === 'turn') {
      const tEvent = moves[idx].beat * this.beatDur;
      const dt = Math.abs(songTime - tEvent);
      if (dt < 0.4) shoulderW = 0.92 - (1 - dt / 0.4) * 0.62;
    }
    return { t: songTime, seg, hipY, shoulderW, vis: 0.95 };
  }
}
