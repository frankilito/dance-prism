// ===== 谱面系统 =====
// 每首歌:段落编排(arrangement,同时驱动音乐/灯光/镜头)+ 每 2 拍一个判定动作。
import { getPose } from './poses.js';

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

// 每个段落的舞步循环(每个名字占 2 拍,8 小节段落= 16 个动作)
// 段落短于循环时截断,长于则重复
const ROUTINES = {
  neon: {
    intro: ['idle', 'hipsHands', 'leanL', 'leanR', 'hipsHands', 'waveR', 'waveL', 'armsUpV'],
    verse: ['punchR', 'punchL', 'punchR', 'crossArms', 'slideR', 'slideL', 'kneeUpR', 'kneeUpL',
            'waveR', 'phoneR', 'leanL', 'leanR', 'swimArms', 'crossArms', 'muscle', 'hipsHands'],
    pre: ['squatArms', 'armsUpV', 'squatArms', 'clapUp', 'leanL', 'leanR', 'squatSumo', 'jumpStar'],
    chorus: ['discoPointR', 'discoPointL', 'discoPointR', 'clapUp', 'punchR', 'punchL', 'jumpStar', 'armsUpV',
             'waveR', 'waveL', 'lassoR', 'muscle', 'kickR', 'kickL', 'squatArms', 'heartHands'],
    bridge: ['crossArms', 'turnSideR', 'swimArms', 'turnSideL', 'squatSumo', 'clapUp', 'leanR', 'armsUpV'],
    outro: ['jumpStar', 'heroFinish', 'heroFinish', 'heroFinish'],
  },
  beach: {
    intro: ['idle', 'waveR', 'waveL', 'armsUpV', 'leanL', 'leanR', 'swimArms', 'clapUp'],
    verse: ['swimArms', 'waveR', 'swimArms', 'waveL', 'slideR', 'slideL', 'hipsHands', 'lassoR',
            'leanL', 'leanR', 'kneeUpR', 'kneeUpL', 'phoneR', 'waveR', 'heartHands', 'clapUp'],
    pre: ['squatArms', 'clapUp', 'squatArms', 'armsUpV', 'lungeR', 'lungeL', 'squatSumo', 'jumpTuck'],
    chorus: ['armsUpV', 'lassoR', 'discoPointR', 'discoPointL', 'swimArms', 'jumpStar', 'waveR', 'waveL',
             'kickR', 'kickL', 'heartHands', 'clapUp', 'slideR', 'slideL', 'muscle', 'armsUpV'],
    bridge: ['bowFinish', 'swimArms', 'turnSideR', 'waveL', 'leanL', 'leanR', 'clapUp', 'armsUpV'],
    outro: ['jumpTuck', 'heartHands', 'heartHands', 'heartHands'],
  },
  theater: {
    intro: ['crossArms', 'idle', 'leanL', 'leanR', 'tPose', 'clapUp', 'squatArms', 'armsUpV'],
    verse: ['tPose', 'crossArms', 'punchR', 'punchL', 'windmillR', 'windmillL', 'kneeUpR', 'kneeUpL',
            'swimArms', 'muscle', 'slideR', 'slideL', 'turnSideR', 'crossArms', 'lassoR', 'clapUp'],
    pre: ['squatArms', 'punchR', 'squatArms', 'punchL', 'squatSumo', 'clapUp', 'jumpTuck', 'jumpStar'],
    chorus: ['punchR', 'punchL', 'jumpStar', 'clapUp', 'windmillR', 'windmillL', 'kickR', 'kickL',
             'discoPointR', 'discoPointL', 'muscle', 'heartHands', 'squatArms', 'armsUpV', 'turnSideL', 'heroFinish'],
    bridge: ['crossArms', 'swimArms', 'turnSideR', 'turnSideL', 'squatSumo', 'tPose', 'bowFinish', 'armsUpV',
             'leanL', 'leanR', 'lassoR', 'windmillL', 'kneeUpR', 'kneeUpL', 'clapUp', 'jumpStar'],
    outro: ['jumpStar', 'heroFinish', 'heroFinish', 'heroFinish'],
  },
  disco: {
    intro: ['idle', 'hipsHands', 'discoPointR', 'discoPointL', 'leanL', 'leanR', 'lassoR', 'clapUp'],
    verse: ['discoPointR', 'discoPointL', 'discoPointR', 'hipsHands', 'slideR', 'slideL', 'phoneR', 'lassoR',
            'kneeUpR', 'kneeUpL', 'waveR', 'waveL', 'muscle', 'crossArms', 'leanL', 'leanR'],
    chorus: ['discoPointR', 'discoPointL', 'jumpStar', 'clapUp', 'lassoR', 'windmillR', 'kickR', 'kickL',
             'squatSumo', 'armsUpV', 'punchR', 'punchL', 'heartHands', 'muscle', 'turnSideR', 'armsUpV'],
    bridge: ['squatSumo', 'squatArms', 'squatSumo', 'jumpStar', 'turnSideL', 'turnSideR', 'clapUp', 'armsUpV'],
    outro: ['jumpStar', 'discoPointR', 'discoPointR', 'discoPointR'],
  },
  space: {
    intro: ['idle', 'crossArms', 'swimArms', 'tPose', 'leanL', 'leanR', 'squatArms', 'armsUpV',
            'waveR', 'waveL', 'clapUp', 'lassoR', 'hipsHands', 'muscle', 'phoneR', 'armsUpV'],
    verse: ['swimArms', 'tPose', 'punchR', 'punchL', 'windmillR', 'windmillL', 'slideR', 'slideL',
            'kneeUpR', 'kneeUpL', 'turnSideR', 'crossArms', 'lassoR', 'waveL', 'leanR', 'clapUp'],
    pre: ['squatArms', 'armsUpV', 'squatSumo', 'jumpTuck', 'punchR', 'punchL', 'squatArms', 'jumpStar'],
    chorus: ['jumpStar', 'armsUpV', 'punchR', 'punchL', 'kickR', 'kickL', 'windmillR', 'windmillL',
             'discoPointR', 'discoPointL', 'jumpTuck', 'clapUp', 'muscle', 'heartHands', 'turnSideL', 'heroFinish'],
    bridge: ['crossArms', 'turnSideR', 'swimArms', 'turnSideL', 'squatSumo', 'bowFinish', 'clapUp', 'jumpStar'],
    outro: ['jumpStar', 'heroFinish', 'heroFinish', 'heroFinish'],
  },
};

// 流舞轨道:在相邻判定动作的中点自动插过渡舞步(只给舞者演,不进判定/预告/评分)。
// 跳/蹲前插"蓄力",重复动作之间插"弹跳",其余左右律动交替 —— 让舞者每一拍都有新目标。
function buildFlow(moves) {
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
    else if (next.pose === mv.pose) fillPose = 'bounceLow';
    else fillPose = Math.floor(midBeat) % 4 < 2 ? 'grooveL' : 'grooveR';
    flow.push({ beat: midBeat, pose: fillPose, fill: true, sec: mv.sec });
  }
  return flow;
}

// 构建谱面:返回 { bpm, totalBeats, duration, moves, flow, sections }
export function buildChart(song, fast = false) {
  let arr = ARRANGEMENTS[song.id] || ARRANGEMENTS.neon;
  const routines = ROUTINES[song.id] || ROUTINES.neon;
  if (fast) arr = [{ sec: 'intro', bars: 2 }, { sec: 'chorus', bars: 4 }, { sec: 'outro', bars: 2 }];

  const moves = [];
  const sections = [];
  let beat = 0;
  for (const { sec, bars } of arr) {
    sections.push({ beat, sec, bars });
    const routine = routines[sec] || routines.verse;
    const slots = bars * 2; // 每 2 拍一个动作
    for (let i = 0; i < slots; i++) {
      const poseName = routine[i % routine.length];
      const pose = getPose(poseName);
      moves.push({ beat: beat + i * 2, pose: poseName, event: pose.event, sec });
    }
    beat += bars * 4;
  }
  const totalBeats = beat;
  const duration = (totalBeats * 60) / song.bpm;
  return { songId: song.id, bpm: song.bpm, totalBeats, duration, moves, flow: buildFlow(moves), sections };
}

// 导入音乐的自由谱面:按估算 BPM 循环编排
export function buildFreestyleChart(bpm, duration) {
  const beats = Math.floor((duration * bpm) / 60) - 4;
  const pool = ROUTINES.neon;
  const moves = [];
  const sections = [];
  let beat = 4; // 前 4 拍留白
  let bar = 0;
  while (beat + 2 <= beats) {
    const secLen = 8; // 每 8 小节切换段落感
    const sec = (bar / secLen | 0) % 2 === 0 ? 'verse' : 'chorus';
    if (bar % secLen === 0) sections.push({ beat, sec, bars: secLen });
    const routine = pool[sec];
    const slot = (bar * 2 + (beat % 8 > 3 ? 1 : 0)) % routine.length;
    moves.push({ beat, pose: routine[slot], event: getPose(routine[slot]).event, sec });
    beat += 2;
    if (beat % 4 === 0) bar++;
  }
  return { songId: 'custom', bpm, totalBeats: beats, duration, moves, flow: buildFlow(moves), sections };
}
