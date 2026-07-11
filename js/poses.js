// ===== 姿势库 =====
// 所有姿势定义在「屏幕镜像空间」:+x = 屏幕右, +y = 上, +z = 朝向观众。
// L/R 指屏幕左右侧的肢体(玩家照镜子跟跳,舞者模型自动换到解剖学对侧)。
// 舞者动画、动作图标、评分模板三方共用此数据。

function n(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

const DOWN = [0, -1, 0];
const D_L = n([-0.22, -1, 0.05]); // 自然下垂(屏幕左臂)
const D_R = n([0.22, -1, 0.05]);

// def: { uaL, faL, uaR, faR, thL, shL, thR, shR, torso, hipY, face, event, hold }
export const POSES = {};
function P(name, def) {
  POSES[name] = {
    name,
    uaL: n(def.uaL || D_L), faL: n(def.faL || def.uaL || D_L),
    uaR: n(def.uaR || D_R), faR: n(def.faR || def.uaR || D_R),
    thL: n(def.thL || DOWN), shL: n(def.shL || def.thL || DOWN),
    thR: n(def.thR || DOWN), shR: n(def.shR || def.thR || DOWN),
    torso: n(def.torso || [0, 1, 0]),
    hipY: def.hipY || 0,
    face: def.face || 'smile',
    event: def.event || null,   // 'jump' | 'squat' | 'turn'
  };
  return POSES[name];
}

// —— 站姿 · 手臂系 ——
P('idle', {});
P('armsUpV', { uaL: [-0.55, 1, 0.1], faL: [-0.6, 1, 0.1], uaR: [0.55, 1, 0.1], faR: [0.6, 1, 0.1], face: 'wow' });
P('tPose', { uaL: [-1, 0.05, 0], faL: [-1, 0.05, 0], uaR: [1, 0.05, 0], faR: [1, 0.05, 0] });
P('clapUp', { uaL: [-0.15, 1, 0.15], faL: [0.12, 1, 0.1], uaR: [0.15, 1, 0.15], faR: [-0.12, 1, 0.1], face: 'wow' });
P('hipsHands', { uaL: [-0.85, -0.5, 0.1], faL: [0.6, -0.5, 0.25], uaR: [0.85, -0.5, 0.1], faR: [-0.6, -0.5, 0.25] });
P('crossArms', { uaL: [-0.4, -0.75, 0.3], faL: [0.9, 0.25, 0.3], uaR: [0.4, -0.75, 0.3], faR: [-0.9, 0.25, 0.3], face: 'cool' });
P('muscle', { uaL: [-1, 0.15, 0], faL: [-0.25, 1, 0.1], uaR: [1, 0.15, 0], faR: [0.25, 1, 0.1], face: 'cool' });
P('swimArms', { uaL: [-0.2, 0.1, 1], faL: [-0.1, 0.05, 1], uaR: [0.2, 0.1, 1], faR: [0.1, 0.05, 1] });
P('pointUpR', { uaR: [0.5, 1, 0.1], faR: [0.55, 1, 0.1], uaL: [-0.85, -0.5, 0.1], faL: [0.6, -0.5, 0.25], face: 'wink' });
P('pointUpL', { uaL: [-0.5, 1, 0.1], faL: [-0.55, 1, 0.1], uaR: [0.85, -0.5, 0.1], faR: [-0.6, -0.5, 0.25], face: 'wink' });
P('punchR', { uaR: [0.95, 0.2, 0.35], faR: [1, 0.2, 0.3], uaL: [-0.35, -0.8, 0.15], faL: [0.35, 0.5, 0.5], face: 'cool' });
P('punchL', { uaL: [-0.95, 0.2, 0.35], faL: [-1, 0.2, 0.3], uaR: [0.35, -0.8, 0.15], faR: [-0.35, 0.5, 0.5], face: 'cool' });
P('waveR', { uaR: [1, 0.45, 0.1], faR: [0.35, 1, 0.15], uaL: [-0.6, -0.85, 0.1], face: 'wink' });
P('waveL', { uaL: [-1, 0.45, 0.1], faL: [-0.35, 1, 0.15], uaR: [0.6, -0.85, 0.1], face: 'wink' });
P('discoPointR', { uaR: [0.75, 0.85, 0.15], faR: [0.8, 0.9, 0.1], uaL: [-0.45, -0.9, 0.2], faL: [-0.5, -0.95, 0.15], torso: [0.16, 1, 0], face: 'wow' });
P('discoPointL', { uaL: [-0.75, 0.85, 0.15], faL: [-0.8, 0.9, 0.1], uaR: [0.45, -0.9, 0.2], faR: [0.5, -0.95, 0.15], torso: [-0.16, 1, 0], face: 'wow' });
P('lassoR', { uaR: [0.55, 0.95, 0], faR: [-0.3, 0.85, 0.35], uaL: [-0.85, -0.5, 0.1], faL: [0.6, -0.5, 0.25], face: 'wink' });
P('windmillR', { uaR: [0.85, 0.75, -0.2], faR: [0.9, 0.7, -0.2], uaL: [-0.55, -0.9, 0.1], torso: [-0.1, 1, 0] });
P('windmillL', { uaL: [-0.85, 0.75, -0.2], faL: [-0.9, 0.7, -0.2], uaR: [0.55, -0.9, 0.1], torso: [0.1, 1, 0] });
P('phoneR', { uaR: [0.5, -0.35, 0.4], faR: [-0.3, 0.95, 0.35], uaL: [-0.6, -0.9, 0.1], face: 'wink' });
P('heartHands', { uaL: [-0.4, 0.75, 0.4], faL: [0.5, 0.75, 0.35], uaR: [0.4, 0.75, 0.4], faR: [-0.5, 0.75, 0.35], face: 'heart' });

// —— 倾斜系 ——
P('leanR', { torso: [0.42, 1, 0], uaL: [-0.9, 0.5, 0.05], faL: [-0.95, 0.55, 0.05], uaR: [0.5, -0.95, 0.1], face: 'wow' });
P('leanL', { torso: [-0.42, 1, 0], uaR: [0.9, 0.5, 0.05], faR: [0.95, 0.55, 0.05], uaL: [-0.5, -0.95, 0.1], face: 'wow' });
P('slideR', { torso: [0.3, 1, 0], uaL: [-1, 0.3, 0], faL: [-1, 0.35, 0], uaR: [1, 0.05, 0], faR: [1, 0.1, 0], thL: [-0.35, -1, 0] });
P('slideL', { torso: [-0.3, 1, 0], uaR: [1, 0.3, 0], faR: [1, 0.35, 0], uaL: [-1, 0.05, 0], faL: [-1, 0.1, 0], thR: [0.35, -1, 0] });

// —— 腿部 · 蹲跳系 ——
P('squatArms', { hipY: -0.34, thL: [-0.5, -0.72, 0.3], shL: [-0.12, -1, -0.1], thR: [0.5, -0.72, 0.3], shR: [0.12, -1, -0.1], uaL: [-0.3, 0.1, 0.9], faL: [-0.3, 0.15, 0.95], uaR: [0.3, 0.1, 0.9], faR: [0.3, 0.15, 0.95], event: 'squat', face: 'cool' });
P('squatSumo', { hipY: -0.38, thL: [-0.75, -0.6, 0.15], shL: [-0.15, -1, -0.05], thR: [0.75, -0.6, 0.15], shR: [0.15, -1, -0.05], uaL: [-0.6, -0.55, 0.4], faL: [-0.3, -0.8, 0.3], uaR: [0.6, -0.55, 0.4], faR: [0.3, -0.8, 0.3], event: 'squat', face: 'wow' });
P('lungeR', { hipY: -0.16, thR: [0.8, -0.55, 0.2], shR: [0.25, -1, 0], thL: [-0.3, -1, -0.1], torso: [0.2, 1, 0], uaR: [0.9, 0.6, 0.1], faR: [0.95, 0.65, 0.1], uaL: [-0.7, -0.7, 0.1] });
P('lungeL', { hipY: -0.16, thL: [-0.8, -0.55, 0.2], shL: [-0.25, -1, 0], thR: [0.3, -1, -0.1], torso: [-0.2, 1, 0], uaL: [-0.9, 0.6, 0.1], faL: [-0.95, 0.65, 0.1], uaR: [0.7, -0.7, 0.1] });
P('kickR', { thR: [0.55, -0.35, 0.6], shR: [0.6, -0.4, 0.65], uaL: [-0.8, 0.6, 0.1], faL: [-0.85, 0.65, 0.1], uaR: [0.6, -0.75, 0.15], torso: [-0.12, 1, 0], face: 'wow' });
P('kickL', { thL: [-0.55, -0.35, 0.6], shL: [-0.6, -0.4, 0.65], uaR: [0.8, 0.6, 0.1], faR: [0.85, 0.65, 0.1], uaL: [-0.6, -0.75, 0.15], torso: [0.12, 1, 0], face: 'wow' });
P('kneeUpR', { thR: [0.15, -0.05, 0.85], shR: [0.1, -1, 0.2], uaL: [-0.5, 0.9, 0.1], faL: [-0.55, 0.95, 0.1], uaR: [0.7, -0.5, 0.2], hipY: -0.05 });
P('kneeUpL', { thL: [-0.15, -0.05, 0.85], shL: [-0.1, -1, 0.2], uaR: [0.5, 0.9, 0.1], faR: [0.55, 0.95, 0.1], uaL: [-0.7, -0.5, 0.2], hipY: -0.05 });
P('jumpStar', { hipY: 0.28, thL: [-0.55, -0.85, 0], thR: [0.55, -0.85, 0], shL: [-0.6, -0.9, 0], shR: [0.6, -0.9, 0], uaL: [-0.75, 0.8, 0.1], faL: [-0.8, 0.85, 0.1], uaR: [0.75, 0.8, 0.1], faR: [0.8, 0.85, 0.1], event: 'jump', face: 'wow' });
P('jumpTuck', { hipY: 0.3, thL: [-0.2, -0.35, 0.8], thR: [0.2, -0.35, 0.8], shL: [-0.1, -1, 0.1], shR: [0.1, -1, 0.1], uaL: [-0.6, 0.85, 0.15], faL: [-0.65, 0.9, 0.15], uaR: [0.6, 0.85, 0.15], faR: [0.65, 0.9, 0.15], event: 'jump', face: 'wow' });

// —— 转身(侧身剪影) ——
P('turnSideR', { uaL: [0.5, -0.6, -0.5], faL: [0.6, -0.5, -0.5], uaR: [0.85, 0.5, -0.3], faR: [0.9, 0.55, -0.3], torso: [0.1, 1, -0.25], thL: [0.1, -1, -0.15], event: 'turn', face: 'cool' });
P('turnSideL', { uaR: [-0.5, -0.6, -0.5], faR: [-0.6, -0.5, -0.5], uaL: [-0.85, 0.5, -0.3], faL: [-0.9, 0.55, -0.3], torso: [-0.1, 1, -0.25], thR: [-0.1, -1, -0.15], event: 'turn', face: 'cool' });

// —— 收尾 ——
P('bowFinish', { torso: [0, 0.55, 0.85], uaL: [-0.9, -0.4, 0.1], faL: [-0.95, -0.4, 0.1], uaR: [0.9, -0.4, 0.1], faR: [0.95, -0.4, 0.1], hipY: -0.08, face: 'smile' });
P('heroFinish', { uaR: [0.35, 1, 0.1], faR: [0.4, 1, 0.05], uaL: [-0.85, -0.55, 0.1], faL: [0.55, -0.5, 0.3], torso: [0.08, 1, 0], thL: [-0.4, -1, 0], face: 'cool' });

// —— 过渡舞步(流舞轨道专用,不进判定;让两个判定动作之间也在"跳舞") ——
P('grooveL', { uaL: [-0.55, -0.35, 0.35], faL: [-0.25, 0.35, 0.6], uaR: [0.5, -0.85, -0.18], faR: [0.55, -0.75, -0.28], thL: [-0.3, -1, 0.08], shL: [-0.12, -1, 0], thR: [0.2, -0.92, 0.14], shR: [0.12, -1, 0.1], torso: [-0.13, 1, 0.04], hipY: -0.05 });
P('grooveR', { uaR: [0.55, -0.35, 0.35], faR: [0.25, 0.35, 0.6], uaL: [-0.5, -0.85, -0.18], faL: [-0.55, -0.75, -0.28], thR: [0.3, -1, 0.08], shR: [0.12, -1, 0], thL: [-0.2, -0.92, 0.14], shL: [-0.12, -1, 0.1], torso: [0.13, 1, 0.04], hipY: -0.05 });
P('bounceLow', { hipY: -0.1, uaL: [-0.45, -0.7, 0.25], faL: [-0.15, -0.05, 0.9], uaR: [0.45, -0.7, 0.25], faR: [0.15, -0.05, 0.9], thL: [-0.22, -1, 0.1], shL: [-0.08, -1, -0.02], thR: [0.22, -1, 0.1], shR: [0.08, -1, -0.02], torso: [0, 1, 0.06] });
P('windup', { hipY: -0.2, uaL: [-0.5, -0.75, -0.3], faL: [-0.55, -0.7, -0.38], uaR: [0.5, -0.75, -0.3], faR: [0.55, -0.7, -0.38], thL: [-0.26, -0.92, 0.2], shL: [-0.1, -1, -0.06], thR: [0.26, -0.92, 0.2], shR: [0.1, -1, -0.06], torso: [0, 0.92, 0.32], face: 'wow' });
P('sideStepL', { uaL: [-0.7, -0.5, 0.2], faL: [-0.5, 0.1, 0.5], uaR: [0.6, -0.7, 0.1], faR: [0.65, -0.6, 0.15], thL: [-0.5, -0.85, 0.05], shL: [-0.55, -0.9, 0.05], thR: [0.1, -1, 0.02], shR: [0.14, -1, 0], torso: [-0.1, 1, 0.02], hipY: -0.06 });
P('sideStepR', { uaR: [0.7, -0.5, 0.2], faR: [0.5, 0.1, 0.5], uaL: [-0.6, -0.7, 0.1], faL: [-0.65, -0.6, 0.15], thR: [0.5, -0.85, 0.05], shR: [0.55, -0.9, 0.05], thL: [-0.1, -1, 0.02], shL: [-0.14, -1, 0], torso: [0.1, 1, 0.02], hipY: -0.06 });
P('armRollF', { uaL: [-0.3, -0.2, 0.85], faL: [0.3, 0.15, 0.7], uaR: [0.3, -0.35, 0.8], faR: [-0.25, 0.05, 0.75], thL: [-0.24, -0.95, 0.12], shL: [-0.1, -1, -0.02], thR: [0.24, -0.95, 0.12], shR: [0.1, -1, -0.02], hipY: -0.09 });

// —— 额外跳跃 ——
P('jumpX', { hipY: 0.28, uaL: [-0.45, 0.85, 0.15], faL: [0.35, 0.9, 0.1], uaR: [0.45, 0.85, 0.15], faR: [-0.35, 0.9, 0.1], thL: [-0.2, -1, 0.05], thR: [0.2, -1, 0.05], shL: [-0.15, -1, 0.1], shR: [0.15, -1, 0.1], event: 'jump', face: 'star' });

// ===== 组合姿势工厂:手臂模式 × 腿部模式 =====
// 精选搭配表生成"手脚并用"的组合动作,含自动左右镜像 —— 姿势库扩充一个数量级。
// sided 组件以"右侧主动"为规范形;rel 指定腿相对手臂同侧('same')或异侧('opp')。
const FLIP = (v) => (v ? [-v[0], v[1], v[2]] : undefined);

// 手臂模式(uaL/faL/uaR/faR [+torso/face]),e = 能量档 1..3
const ARMS = {
  upV:      { e: 3, face: 'wow', uaL: [-0.55, 1, 0.1], faL: [-0.6, 1, 0.1], uaR: [0.55, 1, 0.1], faR: [0.6, 1, 0.1] },
  upPar:    { e: 3, face: 'wow', uaL: [-0.18, 1, 0.12], faL: [-0.2, 1, 0.1], uaR: [0.18, 1, 0.12], faR: [0.2, 1, 0.1] },
  frontPush:{ e: 2, uaL: [-0.3, 0.05, 0.95], faL: [-0.32, 0.02, 1], uaR: [0.3, 0.05, 0.95], faR: [0.32, 0.02, 1] },
  outT:     { e: 2, uaL: [-1, 0.05, 0], faL: [-1, 0.05, 0], uaR: [1, 0.05, 0], faR: [1, 0.05, 0] },
  guard:    { e: 2, face: 'cool', uaL: [-0.5, -0.45, 0.4], faL: [-0.15, 0.85, 0.4], uaR: [0.5, -0.45, 0.4], faR: [0.15, 0.85, 0.4] },
  wings:    { e: 2, uaL: [-0.8, -0.2, -0.5], faL: [-0.85, -0.15, -0.55], uaR: [0.8, -0.2, -0.5], faR: [0.85, -0.15, -0.55] },
  lowX:     { e: 1, uaL: [-0.35, -0.85, 0.25], faL: [0.5, -0.7, 0.3], uaR: [0.35, -0.85, 0.25], faR: [-0.5, -0.7, 0.3] },
  akimbo:   { e: 1, uaL: [-0.85, -0.5, 0.1], faL: [0.6, -0.5, 0.25], uaR: [0.85, -0.5, 0.1], faR: [-0.6, -0.5, 0.25] },
  pump:     { e: 2, sided: 1, face: 'wink', uaR: [0.4, 1, 0.1], faR: [0.45, 1, 0.05], uaL: [-0.85, -0.5, 0.1], faL: [0.6, -0.5, 0.25] },
  punchF:   { e: 2, sided: 1, face: 'cool', uaR: [0.25, 0.1, 0.95], faR: [0.28, 0.12, 1], uaL: [-0.55, -0.5, -0.25], faL: [-0.5, -0.45, -0.35] },
  punchS:   { e: 2, sided: 1, face: 'cool', uaR: [0.95, 0.2, 0.3], faR: [1, 0.22, 0.28], uaL: [-0.4, -0.7, -0.2], faL: [-0.45, -0.65, -0.25] },
  bowDraw:  { e: 2, sided: 1, face: 'cool', torso: [-0.1, 1, 0], uaL: [-0.95, 0.15, 0.2], faL: [-1, 0.18, 0.18], uaR: [0.35, 0.2, -0.6], faR: [-0.5, 0.15, -0.5] },
  rainbow:  { e: 2, sided: 1, uaR: [-0.2, 0.95, 0.15], faR: [-0.55, 0.75, 0.15], uaL: [-0.9, -0.35, 0.1], faL: [-0.95, -0.3, 0.1] },
  whip:     { e: 3, sided: 1, face: 'wow', uaR: [0.6, 0.85, -0.15], faR: [0.2, 0.95, -0.3], uaL: [-0.7, -0.55, -0.3], faL: [-0.75, -0.5, -0.35] },
  disco:    { e: 3, sided: 1, face: 'wow', torso: [0.16, 1, 0], uaR: [0.75, 0.85, 0.15], faR: [0.8, 0.9, 0.1], uaL: [-0.45, -0.9, 0.2], faL: [-0.5, -0.95, 0.15] },
  lasso:    { e: 2, sided: 1, face: 'wink', uaR: [0.55, 0.95, 0], faR: [-0.3, 0.85, 0.35], uaL: [-0.85, -0.5, 0.1], faL: [0.6, -0.5, 0.25] },
  slice:    { e: 2, sided: 1, uaR: [0.9, -0.35, 0.3], faR: [0.95, -0.3, 0.3], uaL: [-0.5, 0.8, 0.2], faL: [-0.55, 0.85, 0.15] },
};

// 腿部模式(thL/shL/thR/shR [+hipY/event])
const LEGS = {
  wide:     { e: 1, thL: [-0.4, -0.92, 0], shL: [-0.42, -0.95, 0], thR: [0.4, -0.92, 0], shR: [0.42, -0.95, 0] },
  wideBend: { e: 2, hipY: -0.16, thL: [-0.45, -0.8, 0.18], shL: [-0.2, -1, -0.05], thR: [0.45, -0.8, 0.18], shR: [0.2, -1, -0.05] },
  halfSquat:{ e: 2, hipY: -0.22, thL: [-0.3, -0.75, 0.3], shL: [-0.12, -1, -0.08], thR: [0.3, -0.75, 0.3], shR: [0.12, -1, -0.08] },
  deepSquat:{ e: 3, hipY: -0.36, event: 'squat', thL: [-0.5, -0.62, 0.32], shL: [-0.14, -1, -0.1], thR: [0.5, -0.62, 0.32], shR: [0.14, -1, -0.1] },
  stepOut:  { e: 1, sided: 1, thR: [0.55, -0.8, 0.05], shR: [0.6, -0.85, 0.05], thL: [-0.15, -1, 0], shL: [-0.1, -1, 0] },
  heelTap:  { e: 1, sided: 1, thR: [0.28, -0.85, 0.35], shR: [0.25, -0.8, 0.45], thL: [-0.18, -1, 0.02], shL: [-0.12, -1, -0.02] },
  cross:    { e: 2, sided: 1, hipY: -0.04, thR: [-0.22, -0.92, 0.12], shR: [-0.25, -0.95, 0.1], thL: [-0.12, -1, 0], shL: [-0.08, -1, 0] },
  kneeUp:   { e: 2, sided: 1, hipY: -0.05, thR: [0.15, -0.05, 0.85], shR: [0.1, -1, 0.2], thL: [-0.15, -1, -0.05], shL: [-0.1, -1, -0.05] },
  kickF:    { e: 3, sided: 1, face: 'wow', thR: [0.35, -0.3, 0.75], shR: [0.4, -0.32, 0.8], thL: [-0.15, -1, -0.08], shL: [-0.1, -1, -0.08] },
  kickS:    { e: 3, sided: 1, face: 'wow', thR: [0.8, -0.5, 0.12], shR: [0.85, -0.45, 0.15], thL: [-0.12, -1, 0], shL: [-0.08, -1, 0] },
  lungeF:   { e: 2, sided: 1, hipY: -0.18, thR: [0.3, -0.7, 0.55], shR: [0.1, -1, 0.05], thL: [-0.25, -0.95, -0.25], shL: [-0.3, -0.9, -0.3] },
  lungeS:   { e: 2, sided: 1, hipY: -0.16, torso: [0.2, 1, 0], thR: [0.8, -0.55, 0.2], shR: [0.25, -1, 0], thL: [-0.3, -1, -0.1], shL: [-0.32, -1, -0.08] },
  backStep: { e: 2, sided: 1, hipY: -0.08, thR: [0.22, -0.85, -0.4], shR: [0.18, -0.8, -0.45], thL: [-0.15, -1, 0.05], shL: [-0.1, -1, 0.05] },
};

// 镜像整个姿势定义:所有向量 x 取反 + 左右通道互换
function mirrorDef(d) {
  return {
    uaL: FLIP(d.uaR), faL: FLIP(d.faR), uaR: FLIP(d.uaL), faR: FLIP(d.faL),
    thL: FLIP(d.thR), shL: FLIP(d.shR), thR: FLIP(d.thL), shR: FLIP(d.shL),
    torso: FLIP(d.torso), hipY: d.hipY, face: d.face, event: d.event,
  };
}

// 精选搭配表:[手臂, 腿, rel]。rel: 'C' 腿居中/不镜像;'same' 腿主侧与手臂同侧;'opp' 异侧。
const PAIRS = [
  ['upV', 'wide', 'C'], ['upV', 'wideBend', 'C'], ['upV', 'kneeUp', 'same'], ['upV', 'stepOut', 'same'], ['upV', 'heelTap', 'same'],
  ['upPar', 'deepSquat', 'C'], ['upPar', 'halfSquat', 'C'], ['upPar', 'kneeUp', 'same'], ['upPar', 'cross', 'same'],
  ['frontPush', 'halfSquat', 'C'], ['frontPush', 'deepSquat', 'C'], ['frontPush', 'backStep', 'same'], ['frontPush', 'wide', 'C'],
  ['outT', 'wide', 'C'], ['outT', 'lungeS', 'same'], ['outT', 'stepOut', 'same'], ['outT', 'cross', 'same'], ['outT', 'kickS', 'same'],
  ['guard', 'halfSquat', 'C'], ['guard', 'kickF', 'same'], ['guard', 'kickS', 'same'], ['guard', 'cross', 'same'], ['guard', 'wideBend', 'C'],
  ['wings', 'lungeF', 'same'], ['wings', 'kickF', 'same'], ['wings', 'wide', 'C'], ['wings', 'backStep', 'same'],
  ['lowX', 'cross', 'same'], ['lowX', 'halfSquat', 'C'], ['lowX', 'heelTap', 'same'],
  ['akimbo', 'heelTap', 'same'], ['akimbo', 'stepOut', 'same'], ['akimbo', 'cross', 'same'], ['akimbo', 'wideBend', 'C'],
  ['pump', 'kneeUp', 'opp'], ['pump', 'stepOut', 'same'], ['pump', 'lungeF', 'same'], ['pump', 'heelTap', 'opp'],
  ['punchF', 'lungeF', 'same'], ['punchF', 'halfSquat', 'C'], ['punchF', 'stepOut', 'opp'], ['punchF', 'kneeUp', 'opp'],
  ['punchS', 'lungeS', 'same'], ['punchS', 'wide', 'C'], ['punchS', 'cross', 'opp'],
  ['bowDraw', 'lungeS', 'opp'], ['bowDraw', 'stepOut', 'opp'], ['bowDraw', 'wide', 'C'],
  ['rainbow', 'stepOut', 'same'], ['rainbow', 'cross', 'opp'], ['rainbow', 'heelTap', 'same'],
  ['whip', 'kneeUp', 'same'], ['whip', 'lungeF', 'same'], ['whip', 'kickS', 'opp'],
  ['disco', 'heelTap', 'same'], ['disco', 'stepOut', 'same'], ['disco', 'cross', 'opp'], ['disco', 'halfSquat', 'C'],
  ['lasso', 'lungeS', 'same'], ['lasso', 'kneeUp', 'opp'], ['lasso', 'wide', 'C'],
  ['slice', 'lungeF', 'same'], ['slice', 'backStep', 'same'], ['slice', 'kickF', 'opp'],
];

// 生成组合姿势并按能量档归池;镜像姿势互相登记到 MIRROR
export const POOLS = { e1: [], e2: [], e3: [] };
export const MIRROR = {};
function registerCombo(armName, legName, rel) {
  const A = ARMS[armName], Lg = LEGS[legName];
  const legDef = rel === 'opp' && Lg.sided ? mirrorDef(Lg) : Lg;
  const def = {
    uaL: A.uaL, faL: A.faL, uaR: A.uaR, faR: A.faR,
    thL: legDef.thL, shL: legDef.shL, thR: legDef.thR, shR: legDef.shR,
    torso: A.torso || legDef.torso, hipY: legDef.hipY || 0,
    face: A.face || Lg.face, event: legDef.event,
  };
  const e = Math.max(A.e, Lg.e);
  const sided = A.sided || Lg.sided;
  const base = `c_${armName}_${legName}`;
  if (!sided) {
    P(base, def);
    POOLS[`e${e}`].push(base);
    MIRROR[base] = base;
  } else {
    const nR = `${base}_R`, nL = `${base}_L`;
    P(nR, def);
    P(nL, mirrorDef(POSES[nR]));
    POOLS[`e${e}`].push(nR, nL);
    MIRROR[nR] = nL; MIRROR[nL] = nR;
  }
}
for (const [a, l, rel] of PAIRS) registerCombo(a, l, rel);

// 经典手工姿势也入池(带镜像关系的登记互指)
const HAND_POOL = {
  e1: ['idle', 'hipsHands', 'crossArms', 'phoneR', 'swimArms'],
  e2: ['clapUp', 'waveR', 'waveL', 'lassoR', 'leanL', 'leanR', 'slideR', 'slideL', 'lungeR', 'lungeL', 'kneeUpR', 'kneeUpL', 'heartHands', 'windmillR', 'windmillL'],
  e3: ['armsUpV', 'muscle', 'punchR', 'punchL', 'discoPointR', 'discoPointL', 'kickR', 'kickL'],
};
for (const t of ['e1', 'e2', 'e3']) POOLS[t].push(...HAND_POOL[t]);
for (const [a, b] of [['waveR', 'waveL'], ['leanR', 'leanL'], ['slideR', 'slideL'], ['lungeR', 'lungeL'],
  ['kneeUpR', 'kneeUpL'], ['windmillR', 'windmillL'], ['punchR', 'punchL'], ['discoPointR', 'discoPointL'],
  ['kickR', 'kickL'], ['turnSideR', 'turnSideL']]) { MIRROR[a] = b; MIRROR[b] = a; }

export const EVENT_POOLS = {
  jump: ['jumpStar', 'jumpTuck', 'jumpX'],
  squat: ['squatArms', 'squatSumo', 'c_upPar_deepSquat', 'c_frontPush_deepSquat'],
  turn: ['turnSideR', 'turnSideL'],
  finish: ['heroFinish', 'bowFinish', 'heartHands', 'muscle'],
};

export function getPose(name) {
  return POSES[name] || POSES.idle;
}

// 姿势插值(给舞者用):对方向向量做 nlerp,hipY 线性
export function lerpPose(a, b, t, out = {}) {
  const mix = (va, vb) => {
    const x = va[0] + (vb[0] - va[0]) * t;
    const y = va[1] + (vb[1] - va[1]) * t;
    const z = va[2] + (vb[2] - va[2]) * t;
    const l = Math.hypot(x, y, z) || 1;
    return [x / l, y / l, z / l];
  };
  for (const k of ['uaL', 'faL', 'uaR', 'faR', 'thL', 'shL', 'thR', 'shR', 'torso']) out[k] = mix(a[k], b[k]);
  out.hipY = a.hipY + (b.hipY - a.hipY) * t;
  out.face = t < 0.5 ? a.face : b.face;
  return out;
}
