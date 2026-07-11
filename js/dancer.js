// ===== 3D 舞者:程序化偶像 =====
// 关节层级 + 姿势插值驱动;裙摆/马尾 verlet 布料;canvas 表情;发光饰品。
// 姿势为屏幕镜像空间方向向量(见 poses.js),舞者面向观众(+Z),世界方向即姿势方向。
import * as THREE from 'three';
import { getPose, lerpPose } from './poses.js';

const DOWN = new THREE.Vector3(0, -1, 0);
const UP = new THREE.Vector3(0, 1, 0);
const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();

const DIM = {
  hipY: 0.96, torso: 0.5, neck: 0.09, headR: 0.145,
  uarm: 0.27, farm: 0.25, thigh: 0.44, shin: 0.42,
  shoulderW: 0.215, hipW: 0.1,
};

function aim(group, dir, restAxis = DOWN) {
  group.parent.updateWorldMatrix(true, false);
  _q.setFromRotationMatrix(group.parent.matrixWorld).invert();
  _v.set(dir[0], dir[1], dir[2]).applyQuaternion(_q).normalize();
  group.quaternion.setFromUnitVectors(restAxis, _v);
}

export class Dancer {
  constructor(theme) {
    this.root = new THREE.Group();
    this.theme = theme;
    this.time = 0;
    this.curPose = getPose('idle');
    this.fromPose = getPose('idle');
    this.toPose = getPose('idle');
    this.moveT = 1;
    this.transT = 1;            // 当前过渡进度(0..1,>=1 为保持段)
    this.track = null;          // 流舞轨道(判定动作 + 过渡舞步)
    this._d = Array.from({ length: 9 }, () => [0, 0, 0]); // 律动层复用向量
    this.rootYawTarget = 0;
    this.rootYaw = 0;
    this.jumpAnim = 0;
    this.faceMood = 'smile';
    this.faceTimer = 0;
    this.blink = 0;
    this.reactPulse = 0;   // 判定时的服装发光脉冲
    this.limbMeshes = []; // 残影用
    this.build();
  }

  // ---------- 材质 ----------
  mats() {
    if (this._mats) return this._mats;
    const t = this.theme;
    const cs = t.costume || {};
    const top = new THREE.Color(cs.top ?? t.primary);
    const pants = new THREE.Color(cs.pants ?? 0x1c1a2e);
    const trim = new THREE.Color(cs.trim ?? t.secondary);
    // 亮度收敛:高光交给窄面积的 trim,大面积材质都压在 bloom 阈值下
    const body = new THREE.MeshPhysicalMaterial({
      color: 0xbdb9d8, metalness: 0.3, roughness: 0.48, clearcoat: 0.32, clearcoatRoughness: 0.4,
    });
    const suit = new THREE.MeshStandardMaterial({
      color: top.clone().multiplyScalar(0.62), metalness: 0.3, roughness: 0.5,
      emissive: top, emissiveIntensity: 0.14,
    });
    const dark = new THREE.MeshStandardMaterial({ color: pants, metalness: 0.5, roughness: 0.45 });
    const glow = new THREE.MeshBasicMaterial({ color: trim });
    const glow2 = new THREE.MeshBasicMaterial({ color: t.secondary });
    const cloth = new THREE.MeshStandardMaterial({
      color: top.clone().multiplyScalar(0.78), metalness: 0.15, roughness: 0.55,
      emissive: top, emissiveIntensity: 0.28, side: THREE.DoubleSide,
    });
    const hair = new THREE.MeshStandardMaterial({
      color: new THREE.Color(t.secondary).multiplyScalar(0.6), metalness: 0.35, roughness: 0.38,
      emissive: t.secondary, emissiveIntensity: 0.38,
    });
    this._mats = { body, suit, dark, glow, glow2, cloth, hair };
    return this._mats;
  }

  capsule(r, len, mat, track = true) {
    const g = new THREE.Group();
    const geo = new THREE.CapsuleGeometry(r, Math.max(0.02, len - r), 4, 14);
    const m = new THREE.Mesh(geo, mat);
    m.position.y = -len / 2;
    m.castShadow = false;
    g.add(m);
    if (track) this.limbMeshes.push(m);
    return g;
  }

  ring(r, tube, mat) {
    return new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 24), mat);
  }

  // ---------- 建模 ----------
  build() {
    const M = this.mats();
    const D = DIM;

    this.hips = new THREE.Group();
    this.hips.position.y = D.hipY;
    this.root.add(this.hips);

    // 骨盆
    const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.145, 18, 14), M.dark);
    pelvis.scale.set(1.25, 0.72, 0.9);
    this.hips.add(pelvis);
    this.limbMeshes.push(pelvis);
    const belt = this.ring(0.165, 0.02, M.glow);
    belt.rotation.x = Math.PI / 2;
    belt.position.y = 0.04;
    this.hips.add(belt);

    // 躯干(紧身衣 + 白色胸甲)
    this.spine = new THREE.Group();
    this.hips.add(this.spine);
    const torsoMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.3, 6, 16), M.suit);
    torsoMesh.position.y = D.torso * 0.52;
    torsoMesh.scale.set(1.12, 1, 0.82);
    this.spine.add(torsoMesh);
    this.limbMeshes.push(torsoMesh);
    const chestPlate = new THREE.Mesh(new THREE.SphereGeometry(0.155, 18, 14), M.body);
    chestPlate.position.set(0, D.torso * 0.66, 0.02);
    chestPlate.scale.set(1.08, 0.85, 0.72);
    this.spine.add(chestPlate);
    // 胸前发光徽章 + 领口
    const emblem = new THREE.Mesh(new THREE.CircleGeometry(0.045, 20), M.glow2);
    emblem.position.set(0, D.torso * 0.62, 0.145);
    this.spine.add(emblem);
    const collar = this.ring(0.1, 0.018, M.glow2);
    collar.rotation.x = Math.PI / 2.3;
    collar.position.y = D.torso * 0.94;
    this.spine.add(collar);

    // 头
    this.neck = new THREE.Group();
    this.neck.position.y = D.torso;
    this.spine.add(this.neck);
    this.head = new THREE.Group();
    this.head.position.y = D.neck;
    this.neck.add(this.head);
    // 脖子填充
    const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.12, 10), M.dark);
    neckMesh.position.y = -0.02;
    this.head.add(neckMesh);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(D.headR, 22, 18), M.body);
    skull.position.y = D.headR * 0.75;
    this.head.add(skull);
    this.limbMeshes.push(skull);
    // 发帽 + 刘海
    const cap = new THREE.Mesh(new THREE.SphereGeometry(D.headR * 1.12, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.6), M.hair);
    cap.position.y = D.headR * 0.82;
    cap.rotation.x = -0.32;
    this.head.add(cap);
    for (const s of [-1, 0, 1]) {
      const bang = new THREE.Mesh(new THREE.SphereGeometry(D.headR * 0.32, 8, 6), M.hair);
      bang.position.set(s * D.headR * 0.55, D.headR * 1.28, D.headR * 0.62);
      bang.scale.set(1, 1.5, 0.7);
      this.head.add(bang);
    }
    // 耳机
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), M.glow);
      ear.position.set(s * D.headR * 1.02, D.headR * 0.72, 0);
      ear.scale.set(0.55, 1, 1);
      this.head.add(ear);
    }
    // 主题头饰
    this.buildHat();
    // 脸(canvas 表情,贴合头球前部的弧面)
    this.faceCanvas = document.createElement('canvas');
    this.faceCanvas.width = this.faceCanvas.height = 128;
    this.faceTex = new THREE.CanvasTexture(this.faceCanvas);
    this.faceTex.colorSpace = THREE.SRGBColorSpace;
    const faceMat = new THREE.MeshBasicMaterial({ map: this.faceTex, transparent: true });
    // 部分球面:phi 以 +z 为中心(THREE: z = r·sin(phi)·sin(theta))
    const faceGeo = new THREE.SphereGeometry(
      D.headR * 1.015, 24, 18,
      Math.PI / 2 - 0.62, 1.24,       // 水平 ±0.62rad
      Math.PI * 0.30, Math.PI * 0.42  // 垂直:眼-嘴范围
    );
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.position.y = D.headR * 0.75;
    this.head.add(face);
    this.drawFace('smile', 0);

    // 手臂(L=屏幕左 → 模型 -x 侧)
    this.armL = this.buildArm(-1);
    this.armR = this.buildArm(1);
    // 腿
    this.legL = this.buildLeg(-1);
    this.legR = this.buildLeg(1);

    // 裙摆布料
    this.skirt = this.buildSkirt();
    // 马尾
    this.tail = this.buildTail();

    this.root.traverse((o) => { o.frustumCulled = false; });
  }

  // ---------- 主题头饰 ----------
  buildHat() {
    const M = this.mats();
    const D = DIM;
    const kind = this.theme.costume?.hat;
    if (!kind) return;
    const g = new THREE.Group();
    this.head.add(g);
    if (kind === 'cap') {
      // 棒球帽:半球顶 + 前帽檐,微歪戴
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(D.headR * 1.16, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), M.suit);
      dome.position.y = D.headR * 0.95;
      g.add(dome);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(D.headR * 0.95, D.headR * 0.95, 0.016, 14, 1, false, -0.7, 1.4), M.suit);
      brim.position.set(0, D.headR * 1.18, D.headR * 0.5);
      brim.scale.z = 1.6;
      g.add(brim);
      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), M.glow);
      btn.position.y = D.headR * 1.62;
      g.add(btn);
      g.rotation.z = 0.12;
    } else if (kind === 'visor') {
      // 遮阳帽:环形帽箍 + 前檐(露顶)
      const band = new THREE.Mesh(new THREE.TorusGeometry(D.headR * 1.05, 0.022, 8, 20), M.suit);
      band.rotation.x = Math.PI / 2;
      band.position.y = D.headR * 1.3;
      g.add(band);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(D.headR * 1.05, D.headR * 1.05, 0.014, 14, 1, false, -0.85, 1.7), M.glow2);
      brim.position.set(0, D.headR * 1.32, D.headR * 0.42);
      brim.scale.z = 1.7;
      g.add(brim);
    } else if (kind === 'fedora') {
      // 复古礼帽:筒身 + 宽檐 + 发光帽带
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(D.headR * 0.82, D.headR * 0.92, 0.14, 16), M.dark);
      crown.position.y = D.headR * 1.62;
      g.add(crown);
      const brimD = new THREE.Mesh(new THREE.CylinderGeometry(D.headR * 1.5, D.headR * 1.5, 0.014, 20), M.dark);
      brimD.position.y = D.headR * 1.42;
      g.add(brimD);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(D.headR * 0.94, D.headR * 0.94, 0.035, 16), M.glow);
      band.position.y = D.headR * 1.5;
      g.add(band);
      g.rotation.z = -0.1;
    } else if (kind === 'antenna') {
      // 太空天线:细杆 + 发光球,随动作甩动感靠头部动画
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 6), M.dark);
      rod.position.y = D.headR * 1.9;
      g.add(rod);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), M.glow);
      tip.position.y = D.headR * 1.9 + 0.12;
      g.add(tip);
      this.antennaTip = tip;
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(D.headR * 1.2, 0.014, 8, 20), M.glow2);
      ring2.rotation.x = Math.PI / 2.4;
      ring2.position.y = D.headR * 1.15;
      g.add(ring2);
    } else if (kind === 'halo') {
      // 悬浮光环
      const halo = new THREE.Mesh(new THREE.TorusGeometry(D.headR * 0.85, 0.014, 8, 26), M.glow);
      halo.rotation.x = Math.PI / 2;
      halo.position.y = D.headR * 2.25;
      g.add(halo);
      this.haloRing = halo;
    }
  }

  buildArm(side) {
    const M = this.mats();
    const D = DIM;
    const shoulder = new THREE.Group();
    shoulder.position.set(side * D.shoulderW, D.torso * 0.92, 0);
    this.spine.add(shoulder);
    // 肩甲
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), M.dark);
    pad.scale.set(1.1, 0.8, 1);
    shoulder.add(pad);
    this.limbMeshes.push(pad);
    const upper = this.capsule(0.055, D.uarm, M.body);
    shoulder.add(upper);
    // 袖套
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.058, 0.12, 10), M.suit);
    sleeve.position.y = -0.07;
    upper.add(sleeve);
    const elbow = new THREE.Group();
    elbow.position.y = -D.uarm;
    upper.add(elbow);
    // 肘关节补球(弯臂不断开)
    const elbowBall = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 8), M.body);
    elbow.add(elbowBall);
    const fore = this.capsule(0.048, D.farm, M.body);
    elbow.add(fore);
    // 发光手环
    const band = this.ring(0.055, 0.016, M.glow);
    band.position.y = -D.farm * 0.72;
    fore.add(band);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), M.dark);
    hand.position.y = -D.farm - 0.03;
    hand.scale.set(0.85, 1.1, 0.9);
    fore.add(hand);
    this.limbMeshes.push(hand);
    return { shoulder, upper, elbow, fore, hand };
  }

  buildLeg(side) {
    const M = this.mats();
    const D = DIM;
    const hip = new THREE.Group();
    hip.position.set(side * D.hipW, -0.04, 0);
    this.hips.add(hip);
    // 髋关节球(衔接骨盆与大腿)
    const hipBall = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), M.suit);
    hip.add(hipBall);
    const thigh = this.capsule(0.075, D.thigh, M.body);
    hip.add(thigh);
    // 短裤(大腿上段套筒)
    const shortMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.078, 0.16, 12), M.suit);
    shortMesh.position.y = -0.09;
    thigh.add(shortMesh);
    const knee = new THREE.Group();
    knee.position.y = -D.thigh;
    thigh.add(knee);
    // 膝关节补球
    const kneeBall = new THREE.Mesh(new THREE.SphereGeometry(0.066, 10, 8), M.dark);
    knee.add(kneeBall);
    const shin = this.capsule(0.058, D.shin, M.dark);
    knee.add(shin);
    const anklet = this.ring(0.062, 0.014, M.glow2);
    anklet.position.y = -D.shin * 0.8;
    shin.add(anklet);
    // 鞋
    const foot = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.1, 4, 10), M.body);
    foot.rotation.x = Math.PI / 2;
    foot.position.set(0, -D.shin - 0.02, 0.055);
    shin.add(foot);
    this.limbMeshes.push(foot);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.2), this.mats().glow);
    sole.position.set(0, -D.shin - 0.055, 0.045);
    shin.add(sole);
    return { hip, thigh, knee, shin, foot };
  }

  // ---------- 裙摆布料(verlet 丝带) ----------
  buildSkirt() {
    const M = this.mats();
    const STRIPS = 10, SEGS = 4, LEN = 0.082;
    const strips = [];
    const geo = new THREE.BufferGeometry();
    const vertCount = STRIPS * (SEGS + 1) * 2;
    const positions = new Float32Array(vertCount * 3);
    const indices = [];
    for (let s = 0; s < STRIPS; s++) {
      const base = s * (SEGS + 1) * 2;
      for (let i = 0; i < SEGS; i++) {
        const a = base + i * 2, b = a + 1, c = a + 2, d = a + 3;
        indices.push(a, b, c, b, d, c);
      }
    }
    geo.setIndex(indices);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mesh = new THREE.Mesh(geo, M.cloth);
    mesh.frustumCulled = false;
    this.root.add(mesh);
    for (let s = 0; s < STRIPS; s++) {
      const ang = (s / STRIPS) * Math.PI * 2 + Math.PI / STRIPS;
      const ax = Math.sin(ang) * 0.155, az = Math.cos(ang) * 0.13;
      const pts = [];
      for (let i = 0; i <= SEGS; i++) {
        pts.push({ x: ax, y: DIM.hipY - i * LEN, z: az, px: ax, py: DIM.hipY - i * LEN, pz: az });
      }
      strips.push({ ang, ax, az, pts });
    }
    return { mesh, strips, SEGS, LEN, STRIPS, positions };
  }

  // ---------- 马尾(verlet 链 + 球串) ----------
  buildTail() {
    const M = this.mats();
    const SEGS = 7, LEN = 0.085;
    const pts = [];
    for (let i = 0; i <= SEGS; i++) pts.push({ x: 0, y: 1.6 - i * LEN, z: -0.15, px: 0, py: 1.6 - i * LEN, pz: -0.15 });
    const meshes = [];
    for (let i = 0; i < SEGS; i++) {
      const r = 0.055 * (1 - i / (SEGS + 2)) + 0.012;
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), M.hair);
      m.frustumCulled = false;
      this.root.add(m);
      meshes.push(m);
    }
    // 发圈
    const tie = this.ring(0.04, 0.015, M.glow);
    this.root.add(tie);
    return { pts, meshes, SEGS, LEN, tie };
  }

  // ---------- 表情 ----------
  drawFace(mood, blink) {
    const c = this.faceCanvas.getContext('2d');
    c.clearRect(0, 0, 128, 128);
    // 浅色面板底,让五官清晰
    const bg = c.createRadialGradient(64, 64, 8, 64, 64, 64);
    bg.addColorStop(0, '#fff6f4');
    bg.addColorStop(1, '#f2e8ef');
    c.fillStyle = bg;
    c.beginPath(); c.arc(64, 64, 64, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#22203a'; c.fillStyle = '#22203a';
    c.lineWidth = 6; c.lineCap = 'round';
    const eyeY = 58, eyeDX = 26;
    const closed = blink > 0.5;
    const eye = (x, kind) => {
      c.beginPath();
      if (closed || kind === 'wink') { c.moveTo(x - 9, eyeY); c.quadraticCurveTo(x, eyeY + 6, x + 9, eyeY); c.stroke(); }
      else if (kind === 'star') {
        c.save(); c.translate(x, eyeY); c.fillStyle = '#ffb400';
        for (let i = 0; i < 5; i++) {
          c.rotate(Math.PI * 2 / 5);
          c.beginPath(); c.moveTo(0, -11); c.lineTo(3, -3); c.lineTo(-3, -3); c.closePath(); c.fill();
        }
        c.restore();
      } else if (kind === 'heart') {
        c.save(); c.translate(x, eyeY); c.fillStyle = '#ff4d88'; c.beginPath();
        c.arc(-4, -2, 5, 0, Math.PI * 2); c.arc(4, -2, 5, 0, Math.PI * 2);
        c.moveTo(-9, 0); c.lineTo(0, 11); c.lineTo(9, 0); c.closePath(); c.fill(); c.restore();
      } else if (kind === 'dizzy') {
        c.beginPath(); c.moveTo(x - 8, eyeY - 8); c.lineTo(x + 8, eyeY + 8);
        c.moveTo(x + 8, eyeY - 8); c.lineTo(x - 8, eyeY + 8); c.stroke();
      } else if (kind === 'cool') {
        c.beginPath(); c.moveTo(x - 10, eyeY - 2); c.lineTo(x + 10, eyeY - 2); c.stroke();
        c.beginPath(); c.arc(x, eyeY + 2, 5, 0, Math.PI); c.fill();
      } else {
        c.beginPath(); c.arc(x, eyeY, kind === 'wow' ? 8 : 6.5, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(x + 2, eyeY - 2.5, 2.2, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#22203a';
      }
    };
    const kinds = {
      smile: ['dot', 'dot'], wow: ['wow', 'wow'], wink: ['dot', 'wink'],
      cool: ['cool', 'cool'], heart: ['heart', 'heart'], dizzy: ['dizzy', 'dizzy'], star: ['star', 'star'],
    }[mood] || ['dot', 'dot'];
    eye(64 - eyeDX, kinds[0]); eye(64 + eyeDX, kinds[1]);
    // 嘴
    c.beginPath();
    if (mood === 'wow' || mood === 'star') { c.arc(64, 92, 10, 0, Math.PI * 2); c.fill(); }
    else if (mood === 'dizzy') { c.moveTo(52, 96); c.quadraticCurveTo(64, 88, 76, 96); c.stroke(); }
    else if (mood === 'cool') { c.moveTo(54, 93); c.lineTo(76, 90); c.stroke(); }
    else { c.moveTo(48, 88); c.quadraticCurveTo(64, 102, 80, 88); c.stroke(); }
    // 腮红
    c.fillStyle = 'rgba(255,100,150,.35)';
    c.beginPath(); c.arc(28, 80, 9, 0, Math.PI * 2); c.arc(100, 80, 9, 0, Math.PI * 2); c.fill();
    this.faceTex.needsUpdate = true;
  }

  react(kind) {
    if (kind === 'perfect') { this.faceMood = 'star'; this.faceTimer = 0.8; this.reactPulse = 1; }
    else if (kind === 'great') { this.faceMood = 'wink'; this.faceTimer = 0.6; this.reactPulse = 0.55; }
    else if (kind === 'miss') { this.faceMood = 'dizzy'; this.faceTimer = 0.7; }
    this.drawFace(this.faceMood, 0);
  }

  // ---------- 谱面驱动 ----------
  setChart(chart) {
    this.chart = chart;
    this.track = chart.flow || chart.moves; // 优先流舞轨道:每拍都有新舞步
    this.moveIdx = -1;
  }

  // songBeat: 当前歌曲拍;按与上一步的间隔自适应提前量,动作正好踩在拍点上
  updateFromChart(songBeat) {
    if (!this.chart) return;
    const moves = this.track || this.chart.moves;
    let idx = this.moveIdx;
    while (idx + 1 < moves.length) {
      const nx = moves[idx + 1];
      const gap = idx >= 0 ? nx.beat - moves[idx].beat : 2;
      const lead = Math.min(0.9, Math.max(0.35, gap * 0.62));
      if (nx.beat - lead <= songBeat) idx++; else break;
    }
    if (idx !== this.moveIdx && idx >= 0) {
      this.moveIdx = idx;
      const mv = moves[idx];
      this.fromPose = { ...this.curPose };
      this.toPose = getPose(mv.pose);
      const gap = idx > 0 ? mv.beat - moves[idx - 1].beat : 2;
      const lead = Math.min(0.9, Math.max(0.35, gap * 0.62));
      this.moveStartBeat = Math.max(songBeat, mv.beat - lead);
      this.moveEndBeat = mv.beat;
      // 过渡舞步不改变朝向(转身姿势多保持一拍)
      if (!mv.fill) this.rootYawTarget = this.toPose.event === 'turn' ? (mv.pose.endsWith('R') ? -1.15 : 1.15) : 0;
      if (this.toPose.event === 'jump') this.jumpAnim = -1; // 待触发
    }
    if (this.moveIdx >= 0) {
      const span = Math.max(0.25, this.moveEndBeat - this.moveStartBeat);
      const tRaw = Math.min(1, (songBeat - this.moveStartBeat) / span);
      this.transT = tRaw;
      // easeOutBack:动作打到位有弹性
      const s = 1.35;
      const t = 1 + (s + 1) * Math.pow(tRaw - 1, 3) + s * Math.pow(tRaw - 1, 2);
      lerpPose(this.fromPose, this.toPose, Math.max(0, Math.min(1.08, t)), this.curPose);
      // 弧线过渡:途中向"收势"弯一下,四肢轨迹变成弧线而非直线
      if (tRaw < 0.995) {
        if (!this._collect) this._collect = getPose('bounceLow');
        lerpPose(this.curPose, this._collect, Math.sin(tRaw * Math.PI) * 0.26, this.curPose);
      }
      // 跳跃抛物线
      if (this.toPose.event === 'jump') {
        const jt = (songBeat - (this.moveEndBeat - 0.5)) / 1;
        if (jt > 0 && jt < 1) this.jumpAnim = Math.sin(jt * Math.PI);
        else this.jumpAnim = 0;
      } else this.jumpAnim = 0;
    }
  }

  // ---------- 每帧 ----------
  update(dt, songBeat, level = 0) {
    this.time += dt;
    this.updateFromChart(songBeat);
    const p = this.curPose;
    const phase = songBeat % 1;
    // 律动层:重拍下沉 + 摇摆 + 重心左右
    const bounce = -Math.abs(Math.sin(phase * Math.PI)) * 0.045 * (1 + level * 0.5);
    const sway = Math.sin(songBeat * Math.PI) * 0.05;
    this.hips.position.y = DIM.hipY + p.hipY * 0.9 + bounce + this.jumpAnim * 0.42;
    this.hips.position.x = Math.sin(songBeat * Math.PI) * 0.05 * (1 + level * 0.4);
    this.hips.rotation.z = sway * 0.4;
    this.hips.rotation.y = THREE.MathUtils.lerp(this.hips.rotation.y, this.rootYawTarget, Math.min(1, dt * 9));

    // —— 持续律动:半拍处摆动最大、整拍处归零(保证判定拍点上姿势精确) ——
    const g = Math.sin(phase * Math.PI) * (0.5 + level * 0.5) * (this.transT >= 0.995 ? 1 : 0.4);
    const swing = Math.sin(songBeat * Math.PI);          // 2 拍一个前后摆循环(左右臂反相)
    const swingLag = Math.sin((songBeat - 0.14) * Math.PI); // 前臂滞后,甩鞭感
    const pump = Math.sin(songBeat * Math.PI * 2);       // 每拍一次的泵动
    const pumpLag = Math.sin((songBeat - 0.1) * Math.PI * 2);
    const D = this._d;
    const armDir = (out, base, side, s, pp) => {
      if (base[1] < -0.45) { // 垂臂:随步伐前后摆
        out[0] = base[0]; out[1] = base[1]; out[2] = base[2] + s * 0.36 * g * side;
      } else {               // 抬臂:节拍泵动
        out[0] = base[0]; out[1] = base[1] + Math.abs(pp) * 0.1 * g; out[2] = base[2] + pp * 0.07 * g;
      }
      return out;
    };

    // 躯干(附加节拍脉冲)
    D[8][0] = p.torso[0]; D[8][1] = p.torso[1]; D[8][2] = p.torso[2] + pump * 0.05 * g;
    aim(this.spine, D[8], UP);
    this.spine.rotation.z += sway * 0.25;
    // 头:反向稳定 + 节拍点头
    this.head.rotation.x = Math.sin(songBeat * Math.PI * 2) * 0.07;
    this.head.rotation.z = -sway * 0.5;
    // 手臂
    aim(this.armL.upper, armDir(D[0], p.uaL, 1, swing, pump));
    aim(this.armL.fore, armDir(D[1], p.faL, 1, swingLag, pumpLag));
    aim(this.armR.upper, armDir(D[2], p.uaR, -1, swing, pump));
    aim(this.armR.fore, armDir(D[3], p.faR, -1, swingLag, pumpLag));
    // 腿:姿势里空闲(近直立)的腿随拍交替提膝踏步
    const freeLeg = (th) => Math.abs(th[0]) < 0.45 && th[1] < -0.75 && Math.abs(th[2]) < 0.3;
    const liftL = Math.max(0, Math.sin((songBeat % 2) * Math.PI)) * g;
    const liftR = Math.max(0, Math.sin(((songBeat + 1) % 2) * Math.PI)) * g;
    if (freeLeg(p.thL)) {
      D[4][0] = p.thL[0]; D[4][1] = p.thL[1] + liftL * 0.22; D[4][2] = p.thL[2] + liftL * 0.5;
      D[5][0] = p.shL[0]; D[5][1] = p.shL[1]; D[5][2] = p.shL[2] - liftL * 0.34;
      aim(this.legL.thigh, D[4]); aim(this.legL.shin, D[5]);
    } else {
      aim(this.legL.thigh, p.thL); aim(this.legL.shin, p.shL);
    }
    if (freeLeg(p.thR)) {
      D[6][0] = p.thR[0]; D[6][1] = p.thR[1] + liftR * 0.22; D[6][2] = p.thR[2] + liftR * 0.5;
      D[7][0] = p.shR[0]; D[7][1] = p.shR[1]; D[7][2] = p.shR[2] - liftR * 0.34;
      aim(this.legR.thigh, D[6]); aim(this.legR.shin, D[7]);
    } else {
      aim(this.legR.thigh, p.thR); aim(this.legR.shin, p.shR);
    }

    // 表情
    this.faceTimer -= dt;
    this.blink -= dt;
    if (this.faceTimer <= 0 && this.faceMood !== p.face) {
      this.faceMood = p.face;
      this.drawFace(this.faceMood, 0);
    }
    if (this.blink <= 0) {
      this.blink = 2.4 + Math.random() * 2.5;
      this.drawFace(this.faceMood, 1);
      setTimeout(() => this.drawFace(this.faceMood, 0), 120);
    }

    // 服装随节拍/判定发光呼吸
    this.reactPulse *= Math.pow(0.02, dt);
    const M = this._mats;
    if (M) {
      M.suit.emissiveIntensity = 0.14 + level * 0.12 + this.reactPulse * 0.5;
      M.cloth.emissiveIntensity = 0.28 + level * 0.1 + this.reactPulse * 0.3;
      M.hair.emissiveIntensity = 0.38 + this.reactPulse * 0.25;
    }
    // 头饰动画
    if (this.haloRing) {
      this.haloRing.rotation.z += dt * 1.6;
      this.haloRing.position.y = DIM.headR * 2.25 + Math.sin(this.time * 2.2) * 0.012;
    }
    if (this.antennaTip) {
      const k = 0.7 + this.reactPulse * 0.6 + Math.abs(Math.sin(songBeat * Math.PI)) * 0.3;
      this.antennaTip.scale.setScalar(k);
    }

    this.simSkirt(dt);
    this.simTail(dt);
  }

  simSkirt(dt) {
    const { strips, SEGS, LEN, positions, mesh } = this.skirt;
    const damp = 0.965, g = -3.2 * dt * dt;
    this.hips.updateWorldMatrix(true, false);
    const hm = this.hips.matrixWorld;
    let vi = 0;
    for (const strip of strips) {
      // 锚点跟随骨盆
      _v.set(strip.ax, -0.02, strip.az).applyMatrix4(hm);
      const pts = strip.pts;
      pts[0].x = _v.x; pts[0].y = _v.y; pts[0].z = _v.z;
      for (let i = 1; i <= SEGS; i++) {
        const pt = pts[i];
        const vx = (pt.x - pt.px) * damp, vy = (pt.y - pt.py) * damp, vz = (pt.z - pt.pz) * damp;
        pt.px = pt.x; pt.py = pt.y; pt.pz = pt.z;
        pt.x += vx; pt.y += vy + g; pt.z += vz;
      }
      // 长度约束(两次迭代;首段锚点固定,全部修正给 b)
      for (let it = 0; it < 2; it++) {
        for (let i = 0; i < SEGS; i++) {
          const a = pts[i], b = pts[i + 1];
          const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
          const d = Math.hypot(dx, dy, dz) || 1;
          const diff = (d - LEN) / d;
          if (i === 0) { b.x -= dx * diff; b.y -= dy * diff; b.z -= dz * diff; }
          else {
            a.x += dx * diff * 0.5; a.y += dy * diff * 0.5; a.z += dz * diff * 0.5;
            b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5; b.z -= dz * diff * 0.5;
          }
        }
      }
      // 大腿碰撞(近似两个球)
      for (const legSide of [-1, 1]) {
        _v.set(legSide * 0.1, -0.25, 0).applyMatrix4(hm);
        for (let i = 1; i <= SEGS; i++) {
          const pt = pts[i];
          const dx = pt.x - _v.x, dy = pt.y - _v.y, dz = pt.z - _v.z;
          const d = Math.hypot(dx, dy, dz);
          if (d < 0.13 && d > 0.0001) {
            const push = (0.13 - d) / d;
            pt.x += dx * push; pt.y += dy * push; pt.z += dz * push;
          }
        }
      }
      // 写入几何:每点生成宽度方向双顶点
      const wdir = { x: Math.cos(strip.ang), z: -Math.sin(strip.ang) };
      for (let i = 0; i <= SEGS; i++) {
        const pt = pts[i];
        const w = 0.045 * (1 - i / (SEGS + 3));
        positions[vi++] = pt.x - wdir.x * w; positions[vi++] = pt.y; positions[vi++] = pt.z - wdir.z * w;
        positions[vi++] = pt.x + wdir.x * w; positions[vi++] = pt.y; positions[vi++] = pt.z + wdir.z * w;
      }
    }
    mesh.geometry.attributes.position.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  }

  simTail(dt) {
    const { pts, meshes, SEGS, LEN, tie } = this.tail;
    this.head.updateWorldMatrix(true, false);
    _v.set(0, DIM.headR * 1.15, -DIM.headR * 0.9).applyMatrix4(this.head.matrixWorld);
    pts[0].x = _v.x; pts[0].y = _v.y; pts[0].z = _v.z;
    const damp = 0.96, g = -4.5 * dt * dt;
    for (let i = 1; i <= SEGS; i++) {
      const pt = pts[i];
      const vx = (pt.x - pt.px) * damp, vy = (pt.y - pt.py) * damp, vz = (pt.z - pt.pz) * damp;
      pt.px = pt.x; pt.py = pt.y; pt.pz = pt.z;
      pt.x += vx; pt.y += vy + g; pt.z += vz - dt * 0.15; // 微微向后飘
    }
    for (let it = 0; it < 3; it++) {
      for (let i = 0; i < SEGS; i++) {
        const a = pts[i], b = pts[i + 1];
        let dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
        const d = Math.hypot(dx, dy, dz) || 1;
        const diff = (d - LEN) / d;
        if (i === 0) { b.x -= dx * diff; b.y -= dy * diff; b.z -= dz * diff; }
        else {
          a.x += dx * diff * 0.5; a.y += dy * diff * 0.5; a.z += dz * diff * 0.5;
          b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5; b.z -= dz * diff * 0.5;
        }
      }
    }
    // 头部球碰撞
    _v.setFromMatrixPosition(this.head.matrixWorld);
    for (let i = 1; i <= SEGS; i++) {
      const pt = pts[i];
      const dx = pt.x - _v.x, dy = pt.y - (_v.y + 0.1), dz = pt.z - _v.z;
      const d = Math.hypot(dx, dy, dz);
      const r = DIM.headR * 1.15;
      if (d < r && d > 0.0001) {
        const push = (r - d) / d;
        pt.x += dx * push; pt.y += dy * push; pt.z += dz * push;
      }
    }
    // root 空间放置(meshes 挂在 root 下,需要世界→root 逆变换)
    this.root.updateWorldMatrix(true, false);
    const inv = this.root.matrixWorld.clone().invert();
    for (let i = 0; i < SEGS; i++) {
      _v.set((pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2, (pts[i].z + pts[i + 1].z) / 2).applyMatrix4(inv);
      meshes[i].position.copy(_v);
    }
    _v.set(pts[0].x, pts[0].y, pts[0].z).applyMatrix4(inv);
    tie.position.copy(_v);
  }
}
