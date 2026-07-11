// ===== 谱面系统 =====
// 每首歌:段落编排(arrangement,同时驱动音乐/灯光/镜头)+ 程序化编舞(每 2 拍一个判定动作)。
// 编舞按歌曲种子确定性生成:同一首歌永远同一套舞(排行榜公平),不同歌完全不同。
import { getPose, POOLS, MIRROR, EVENT_POOLS } from './poses.js';

// 段落编排:sec 类型驱动合成器配器与舞台演出强度
// intro/verse/pre/chorus/bridge/outro,bars 为小节数(4/4 拍)
export const ARRANGEMENTS = {
  neon: [
    { sec: 'intro', bars: 4 }, { sec: 'verse', bars: 8 }, { sec: 'pre', bars: 4 },
    { sec: 'chorus', bars: 8 }, { sec: 'verse', bars: 8 }, { sec: 'pre', bars: 4 },
    { sec: 'chorus', bars: 8 }, { sec: 'bridge', bars: 4 }, { sec: 'chorus', bars: 8 }, { sec: 'outro', bars: 2 },
  ],
  beach: [
    { sec: 'intro', bars: 4 }, { sec: 'verse', bars: 8 }, { sec: 'chorus', bars: 8 },
    { sec: 'verse', bars: 8 }, { sec: 'pre', bars: 4 }, { sec: 'chorus', bars: 8 },
    { sec: 'bridge', bars: 4 }, { sec: 'chorus', bars: 8 }, { sec: 'outro', bars: 2 },
  ],
  theater: [
    { sec: 'intro', bars: 4 }, { sec: 'verse', bars: 8 }, { sec: 'pre', bars: 4 },
    { sec: 'chorus', bars: 8 }, { sec: 'verse', bars: 8 }, { sec: 'pre', bars: 4 },
    { sec: 'chorus', bars: 8 }, { sec: 'bridge', bars: 8 }, { sec: 'chorus', bars: 8 }, { sec: 'outro', bars: 2 },
  ],
  disco: [
    { sec: 'intro', bars: 4 }, { sec: 'verse', bars: 8 }, { sec: 'chorus', bars: 8 },
    { sec: 'verse', bars: 8 }, { sec: 'chorus', bars: 8 }, { sec: 'bridge', bars: 4 },
    { sec: 'chorus', bars: 8 }, { sec: 'outro', bars: 2 },
  ],
  space: [
    { sec: 'intro', bars: 8 }, { sec: 'verse', bars: 8 }, { sec: 'pre', bars: 4 },
    { sec: 'chorus', bars: 8 }, { sec: 'verse', bars: 8 }, { sec: 'pre', bars: 4 },
    { sec: 'chorus', bars: 8 }, { sec: 'bridge', bars: 4 }, { sec: 'chorus', bars: 8 }, { sec: 'outro', bars: 2 },
  ],
};

// —— 程序化编舞 ——
// 短语结构:4 个动作一组,偏好"右边做一遍、左边做一遍"的镜像呼应;
// 段落能量曲线:intro 热身 → verse 中速 → pre 蓄力(蹲多)→ chorus 高能(跳/踢)→ bridge 转身花样 → outro 定格收尾。
function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEC_STYLE = {
  intro:  { tiers: [['e1', 0.5], ['e2', 0.5]], jumpEvery: 0, squatP: 0.06, turnP: 0.04, echoP: 0.55 },
  verse:  { tiers: [['e2', 0.62], ['e1', 0.16], ['e3', 0.22]], jumpEvery: 16, squatP: 0.08, turnP: 0.06, echoP: 0.6 },
  pre:    { tiers: [['e2', 0.45], ['e3', 0.55]], jumpEvery: 8, squatP: 0.22, turnP: 0, echoP: 0.5 },
  chorus: { tiers: [['e3', 0.68], ['e2', 0.32]], jumpEvery: 8, squatP: 0.1, turnP: 0.05, echoP: 0.62 },
  bridge: { tiers: [['e1', 0.3], ['e2', 0.7]], jumpEvery: 0, squatP: 0.12, turnP: 0.14, echoP: 0.5 },
  outro:  null,
};

function pickTier(rng, tiers) {
  let r = rng();
  for (const [t, w] of tiers) { r -= w; if (r <= 0) return t; }
  return tiers[tiers.length - 1][0];
}
function pickFrom(rng, arr, recent) {
  for (let tries = 0; tries < 10; tries++) {
    const cand = arr[(rng() * arr.length) | 0];
    if (!recent.includes(cand) && !recent.includes(MIRROR[cand])) return cand;
  }
  return arr[(rng() * arr.length) | 0];
}

// 生成一个段落的判定动作序列
function genSection(rng, sec, slots, recent) {
  const out = [];
  if (sec === 'outro') {
    for (let i = 0; i < slots; i++) {
      out.push(i === 0 ? EVENT_POOLS.jump[(rng() * EVENT_POOLS.jump.length) | 0]
        : EVENT_POOLS.finish[(rng() * EVENT_POOLS.finish.length) | 0]);
    }
    return out;
  }
  const st = SEC_STYLE[sec] || SEC_STYLE.verse;
  for (let i = 0; i < slots; i++) {
    const gi = i % 4;
    const prev = out[out.length - 1] || recent[recent.length - 1];
    let pose = null;
    if (st.jumpEvery && (i + 1) % st.jumpEvery === 0) {
      pose = EVENT_POOLS.jump[(rng() * EVENT_POOLS.jump.length) | 0];
    } else if (gi === 2 && rng() < st.squatP) {
      pose = EVENT_POOLS.squat[(rng() * EVENT_POOLS.squat.length) | 0];
    } else if (gi === 1 && rng() < st.turnP) {
      pose = EVENT_POOLS.turn[(rng() * 2) | 0];
    } else if ((gi === 1 || gi === 3) && prev && MIRROR[prev] && MIRROR[prev] !== prev && rng() < st.echoP) {
      pose = MIRROR[prev]; // 镜像呼应:右边做完左边做
    } else {
      pose = pickFrom(rng, POOLS[pickTier(rng, st.tiers)], recent);
    }
    out.push(pose);
    recent.push(pose);
    if (recent.length > 8) recent.shift();
  }
  return out;
}

// 流舞轨道:在相邻判定动作的中点自动插过渡舞步(只给舞者演,不进判定/预告/评分)。
// 跳/蹲前插"蓄力",重复动作之间插"弹跳/绕臂",其余在律动步/侧点步里按种子挑 —— 舞者每一拍都有新目标。
const FILL_L = ['grooveL', 'sideStepL'];
const FILL_R = ['grooveR', 'sideStepR'];
const FILL_C = ['bounceLow', 'armRollF'];
function buildFlow(moves, rng) {
  const flow = [];
  for (let i = 0; i < moves.length; i++) {
    const mv = moves[i];
    flow.push({ beat: mv.beat, pose: mv.pose, event: mv.event, sec: mv.sec });
    const next = moves[i + 1];
    if (!next) continue;
    const gap = next.beat - mv.beat;
    if (gap < 2) continue;
    const midBeat = mv.beat + gap / 2;
    let fillPose;
    if (next.event === 'jump' || next.event === 'squat') fillPose = 'windup';
    else if (next.pose === mv.pose) fillPose = FILL_C[(rng() * FILL_C.length) | 0];
    else if (Math.floor(midBeat) % 4 < 2) fillPose = FILL_L[(rng() * FILL_L.length) | 0];
    else fillPose = FILL_R[(rng() * FILL_R.length) | 0];
    flow.push({ beat: midBeat, pose: fillPose, fill: true, sec: mv.sec });
  }
  return flow;
}

// 构建谱面:返回 { bpm, totalBeats, duration, moves, flow, sections }
export function buildChart(song, fast = false) {
  let arr = ARRANGEMENTS[song.id] || ARRANGEMENTS.neon;
  if (fast) arr = [{ sec: 'intro', bars: 2 }, { sec: 'chorus', bars: 4 }, { sec: 'outro', bars: 2 }];
  const rng = mulberry32(hashSeed(song.id + '·dance'));

  const moves = [];
  const sections = [];
  const recent = [];
  let beat = 0;
  for (const { sec, bars } of arr) {
    sections.push({ beat, sec, bars });
    const slots = bars * 2; // 每 2 拍一个判定动作
    const seq = genSection(rng, sec, slots, recent);
    for (let i = 0; i < slots; i++) {
      const poseName = seq[i];
      const pose = getPose(poseName);
      moves.push({ beat: beat + i * 2, pose: poseName, event: pose.event, sec });
    }
    beat += bars * 4;
  }
  const totalBeats = beat;
  const duration = (totalBeats * 60) / song.bpm;
  return { songId: song.id, bpm: song.bpm, totalBeats, duration, moves, flow: buildFlow(moves, rng), sections };
}

// 导入音乐的自由谱面:按估算 BPM 程序化编舞(同一文件同一套舞)
export function buildFreestyleChart(bpm, duration) {
  const beats = Math.floor((duration * bpm) / 60) - 4;
  const rng = mulberry32(hashSeed(`custom·${bpm}·${Math.round(duration)}`));
  const moves = [];
  const sections = [];
  const recent = [];
  let beat = 4; // 前 4 拍留白
  const secLen = 8; // 每 8 小节切换段落感
  let secIdx = 0;
  while (beat + 2 <= beats) {
    const sec = secIdx % 2 === 0 ? 'verse' : 'chorus';
    const secBeats = Math.min(secLen * 4, beats - beat);
    const slots = Math.floor(secBeats / 2);
    if (slots <= 0) break;
    sections.push({ beat, sec, bars: Math.ceil(secBeats / 4) });
    const seq = genSection(rng, sec, slots, recent);
    for (let i = 0; i < slots; i++) {
      moves.push({ beat: beat + i * 2, pose: seq[i], event: getPose(seq[i]).event, sec });
    }
    beat += slots * 2;
    secIdx++;
  }
  return { songId: 'custom', bpm, totalBeats: beats, duration, moves, flow: buildFlow(moves, rng), sections };
}
