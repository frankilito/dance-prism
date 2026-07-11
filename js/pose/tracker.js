// ===== 摄像头姿态追踪 =====
// MediaPipe PoseLandmarker(全本地 wasm+模型,画面不上传);
// 输出与 sim.js 相同的帧格式;处理低光/出镜/掉帧降级。
import { PoseLandmarker, FilesetResolver } from '../../vendor/mediapipe/vision_bundle.mjs';

// MediaPipe 关键点索引
const LM = {
  shoulderL: 11, shoulderR: 12, elbowL: 13, elbowR: 14, wristL: 15, wristR: 16,
  hipL: 23, hipR: 24, kneeL: 25, kneeR: 26, ankleL: 27, ankleR: 28,
};

export class Tracker {
  constructor() {
    this.landmarker = null;
    this.stream = null;
    this.video = null;
    this.running = false;
    this.numPoses = 1;
    this.playersLm = [null, null];  // 原始关键点(叠加层绘制用,图像坐标)
    this.onFrame = null;            // (playerIdx, frame) 回调
    this.timeSource = () => performance.now() / 1000;
    this.detFps = 0;
    this.quality = { dim: false, outOfFrame: false, lowFps: false };
    this._lastVideoTime = -1;
    this._skip = 0;
    this._skipMod = 1;
    this._prevX = [0.3, 0.7];
  }

  async init(numPoses = 1) {
    this.numPoses = numPoses;
    const fileset = await FilesetResolver.forVisionTasks('vendor/mediapipe/wasm');
    const make = (delegate) => PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: 'vendor/mediapipe/pose_landmarker_lite.task', delegate },
      runningMode: 'VIDEO',
      numPoses,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    try {
      this.landmarker = await make('GPU');
    } catch (e) {
      console.warn('[tracker] GPU delegate failed, fallback CPU', e);
      this.landmarker = await make('CPU');
    }
  }

  async openCamera(videoEl) {
    this.video = videoEl;
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user', frameRate: { ideal: 30 } },
      audio: false,
    });
    videoEl.srcObject = this.stream;
    await videoEl.play();
    // 亮度检测用小画布
    this._lumaCanvas = document.createElement('canvas');
    this._lumaCanvas.width = 32; this._lumaCanvas.height = 24;
    this._lastLuma = performance.now();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._times = [];
    const loop = () => {
      if (!this.running) return;
      this.detect();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
  }

  close() {
    this.stop();
    if (this.stream) {
      for (const t of this.stream.getTracks()) t.stop();
      this.stream = null;
    }
    if (this.video) this.video.srcObject = null;
  }

  detect() {
    const v = this.video;
    if (!this.landmarker || !v || v.readyState < 2) return;
    if (v.currentTime === this._lastVideoTime) return;
    // 掉帧降级:检测耗时过长则隔帧检测
    this._skip = (this._skip + 1) % this._skipMod;
    if (this._skip !== 0) return;
    this._lastVideoTime = v.currentTime;
    const t0 = performance.now();
    let result;
    try {
      result = this.landmarker.detectForVideo(v, t0);
    } catch (e) {
      console.warn('[tracker] detect error', e);
      return;
    }
    const cost = performance.now() - t0;
    this._skipMod = cost > 40 ? 2 : 1;
    this.quality.lowFps = cost > 40;
    // fps 统计
    this._times.push(t0);
    while (this._times.length && this._times[0] < t0 - 2000) this._times.shift();
    this.detFps = this._times.length / 2;

    const poses = result.landmarks || [];
    // 双人分配:按镜像 x 排序 + 靠近上次位置
    const entries = poses.map((lm) => {
      const hipX = 1 - (lm[LM.hipL].x + lm[LM.hipR].x) / 2; // 镜像
      return { lm, hipX };
    });
    entries.sort((a, b) => a.hipX - b.hipX);
    const t = this.timeSource();
    this.playersLm = [null, null];
    if (this.numPoses === 1) {
      if (entries[0]) this.emit(0, entries[0].lm, t);
    } else {
      // 左半屏 = P1,右半屏 = P2;单人入镜时按离谁近
      if (entries.length >= 2) {
        this.emit(0, entries[0].lm, t);
        this.emit(1, entries[entries.length - 1].lm, t);
        this._prevX = [entries[0].hipX, entries[entries.length - 1].hipX];
      } else if (entries.length === 1) {
        const e = entries[0];
        const pi = Math.abs(e.hipX - this._prevX[0]) <= Math.abs(e.hipX - this._prevX[1]) ? 0 : 1;
        this.emit(pi, e.lm, t);
        this._prevX[pi] = e.hipX;
      }
    }
    this.quality.outOfFrame = poses.length === 0;
    // 亮度检测(每 2 秒)
    if (t0 - this._lastLuma > 2000) {
      this._lastLuma = t0;
      const c = this._lumaCanvas.getContext('2d', { willReadFrequently: true });
      c.drawImage(v, 0, 0, 32, 24);
      const d = c.getImageData(0, 0, 32, 24).data;
      let s = 0;
      for (let i = 0; i < d.length; i += 16) s += d[i] * 0.3 + d[i + 1] * 0.6 + d[i + 2] * 0.1;
      this.quality.dim = s / (d.length / 16) < 46;
    }
  }

  emit(playerIdx, lm, t) {
    this.playersLm[playerIdx] = lm;
    const frame = landmarksToFrame(lm, t);
    if (frame && this.onFrame) this.onFrame(playerIdx, frame);
  }
}

// 关键点 → 归一化帧(镜像屏幕空间:+x 右,+y 上;以髋为原点,躯干长为单位)
export function landmarksToFrame(lm, t) {
  const g = (i) => lm[i];
  const mx = (p) => 1 - p.x;   // 镜像
  const my = (p) => 1 - p.y;   // y 翻上
  const shL = g(LM.shoulderL), shR = g(LM.shoulderR);
  const hpL = g(LM.hipL), hpR = g(LM.hipR);
  const midHip = { x: (mx(hpL) + mx(hpR)) / 2, y: (my(hpL) + my(hpR)) / 2 };
  const midSh = { x: (mx(shL) + mx(shR)) / 2, y: (my(shL) + my(shR)) / 2 };
  const scale = Math.hypot(midSh.x - midHip.x, midSh.y - midHip.y);
  if (scale < 0.02) return null;
  const seg = {};
  const segDef = {
    uaL: [LM.shoulderL, LM.elbowL], faL: [LM.elbowL, LM.wristL],
    uaR: [LM.shoulderR, LM.elbowR], faR: [LM.elbowR, LM.wristR],
    thL: [LM.hipL, LM.kneeL], shL: [LM.kneeL, LM.ankleL],
    thR: [LM.hipR, LM.kneeR], shR: [LM.kneeR, LM.ankleR],
  };
  let visSum = 0, visN = 0;
  for (const [k, [a, b]] of Object.entries(segDef)) {
    const pa = g(a), pb = g(b);
    const va = (pa.visibility ?? 1), vb = (pb.visibility ?? 1);
    visSum += va + vb; visN += 2;
    if (va < 0.35 || vb < 0.35) { seg[k] = null; continue; }
    const dx = mx(pb) - mx(pa), dy = my(pb) - my(pa);
    const l = Math.hypot(dx, dy);
    seg[k] = l > 0.004 ? [dx / l, dy / l] : null;
  }
  // 躯干
  {
    const dx = midSh.x - midHip.x, dy = midSh.y - midHip.y;
    const l = Math.hypot(dx, dy) || 1;
    seg.torso = [dx / l, dy / l];
  }
  return {
    t,
    seg,
    hipY: midHip.y / scale,                       // 髋高(躯干单位)
    shoulderW: (mx(shR) - mx(shL)) / scale,       // 带符号肩宽(转身检测)
    vis: visN ? visSum / visN : 0,
  };
}

// 屏幕左侧肢体索引(注意镜像后:屏幕左 = 解剖学左)
export const SKELETON_EDGES = [
  [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 12], [23, 24], [11, 23], [12, 24],
  [23, 25], [25, 27], [24, 26], [26, 28],
];
