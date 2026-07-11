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
