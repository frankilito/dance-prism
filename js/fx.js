// ===== 特效系统:全部挂节拍时钟 =====
// 粒子爆发 / 节拍地面波纹 / 彩带 / 舞者残影 / 连击火焰环 / Perfect 冲击波。
import * as THREE from 'three';

function circleTex(soft = true) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(soft ? 0.4 : 0.85, 'rgba(255,255,255,0.9)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export class FX {
  constructor(scene, theme) {
    this.scene = scene;
    this.theme = theme;
    this.time = 0;
    this.buildParticles();
    this.buildRipples();
    this.buildConfetti();
    this.buildShock();
    this.buildComboFire();
    this.ghosts = [];
    this.ghostMatPool = [];
  }

  // ---------- 通用粒子池(Points) ----------
  buildParticles() {
    const N = this.N = 700;
    const geo = new THREE.BufferGeometry();
    this.pPos = new Float32Array(N * 3);
    this.pCol = new Float32Array(N * 3);
    this.pVel = new Float32Array(N * 3);
    this.pLife = new Float32Array(N).fill(-1);
    this.pMax = new Float32Array(N).fill(1);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.pCol, 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.09, map: circleTex(), transparent: true, vertexColors: true,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.points.frustumCulled = false;
    this.scene.add(this.points);
    this.pCursor = 0;
  }

  burst(pos, colorHex, n = 26, speed = 2.2, up = 1.2) {
    const col = new THREE.Color(colorHex);
    for (let i = 0; i < n; i++) {
      const idx = this.pCursor = (this.pCursor + 1) % this.N;
      this.pPos[idx * 3] = pos.x; this.pPos[idx * 3 + 1] = pos.y; this.pPos[idx * 3 + 2] = pos.z;
      const a = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 2 - 1);
      const sp = speed * (0.4 + Math.random() * 0.8);
      this.pVel[idx * 3] = Math.sin(ph) * Math.cos(a) * sp;
      this.pVel[idx * 3 + 1] = Math.abs(Math.cos(ph)) * sp * up;
      this.pVel[idx * 3 + 2] = Math.sin(ph) * Math.sin(a) * sp;
      const tint = 0.75 + Math.random() * 0.45;
      this.pCol[idx * 3] = col.r * tint; this.pCol[idx * 3 + 1] = col.g * tint; this.pCol[idx * 3 + 2] = col.b * tint;
      this.pLife[idx] = this.pMax[idx] = 0.5 + Math.random() * 0.55;
    }
  }

  // ---------- 节拍地面波纹 ----------
  buildRipples() {
    this.ripples = [];
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(
        new THREE.RingGeometry(0.96, 1, 48),
        new THREE.MeshBasicMaterial({ color: this.theme.secondary, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
      );
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.03;
      this.scene.add(m);
      this.ripples.push({ mesh: m, t: -1 });
    }
    this.rippleCursor = 0;
  }

  ripple(x = 0, z = 0, color = null, big = false) {
    const r = this.ripples[this.rippleCursor = (this.rippleCursor + 1) % this.ripples.length];
    r.t = 0;
    r.big = big;
    r.mesh.position.x = x; r.mesh.position.z = z;
    r.mesh.material.color.set(color || this.theme.secondary);
  }

  // ---------- 彩带(InstancedMesh 小方片) ----------
  buildConfetti() {
    const N = this.CN = 360;
    this.confetti = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.055, 0.11),
      new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
      N
    );
    this.confetti.frustumCulled = false;
    this.cData = [];
    const palette = [this.theme.primary, this.theme.secondary, this.theme.accent, 0xffffff, 0xffd34d];
    const col = new THREE.Color();
    for (let i = 0; i < N; i++) {
      this.cData.push({ x: 0, y: -10, z: 0, vx: 0, vy: 0, vz: 0, rx: Math.random() * 6, rz: Math.random() * 6, wr: 2 + Math.random() * 6, live: false });
      this.confetti.setColorAt(i, col.set(palette[i % palette.length]));
    }
    this.scene.add(this.confetti);
    this.cCursor = 0;
  }

  confettiBlast(n = 120) {
    for (let i = 0; i < n; i++) {
      const d = this.cData[this.cCursor = (this.cCursor + 1) % this.CN];
      const side = Math.random() < 0.5 ? -1 : 1;
      d.x = side * (3.5 + Math.random() * 1.5);
      d.y = 0.2;
      d.z = -1 + Math.random() * 2;
      d.vx = -side * (1.5 + Math.random() * 2.4);
      d.vy = 4.5 + Math.random() * 3;
      d.vz = (Math.random() - 0.5) * 2;
      d.live = true;
    }
  }

  // ---------- 舞台 pyro:台缘四点向上喷金色火花柱 ----------
  pyro() {
    if (!this._pyroPos) {
      this._pyroPos = [[-3.6, -2.2], [3.6, -2.2], [-2.1, -3.5], [2.1, -3.5]];
      this._pyroV = new THREE.Vector3();
    }
    for (const [x, z] of this._pyroPos) {
      this._pyroV.set(x, 0.05, z);
      this.burst(this._pyroV, 0xffd98a, 24, 2.2, 2.4);
      this.burst(this._pyroV, 0xfff3d6, 10, 1.6, 3.0);
    }
  }

  // ---------- Perfect 冲击波(竖直环) ----------
  buildShock() {
    this.shocks = [];
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(
        new THREE.TorusGeometry(1, 0.035, 8, 40),
        new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      this.scene.add(m);
      this.shocks.push({ mesh: m, t: -1 });
    }
    this.shockCursor = 0;
  }

  shockwave(pos, color = 0xffd34d) {
    const s = this.shocks[this.shockCursor = (this.shockCursor + 1) % this.shocks.length];
    s.t = 0;
    s.mesh.position.copy(pos);
    s.mesh.material.color.set(color);
  }

  // ---------- 连击火焰环(围绕舞者的旋转火粒子发射器) ----------
  buildComboFire() {
    this.fireLevel = 0; // 0~1
    this._fireAcc = 0;
  }

  setComboFire(level) { this.fireLevel = Math.min(1, level); }

  // ---------- 舞者残影 ----------
  ghost(dancer, color = null) {
    if (this.ghosts.length > 5) return;
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({
      color: color || this.theme.secondary, transparent: true, opacity: 0.32,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    for (const src of dancer.limbMeshes) {
      src.updateWorldMatrix(true, false);
      const m = new THREE.Mesh(src.geometry, mat);
      m.matrixAutoUpdate = false;
      m.matrix.copy(src.matrixWorld);
      m.frustumCulled = false;
      group.add(m);
    }
    this.scene.add(group);
    this.ghosts.push({ group, mat, life: 0.42, max: 0.42 });
  }

  // ---------- 每帧 ----------
  update(dt, dancerPos = null) {
    this.time += dt;
    // 粒子
    for (let i = 0; i < this.N; i++) {
      if (this.pLife[i] < 0) continue;
      this.pLife[i] -= dt;
      if (this.pLife[i] < 0) { this.pPos[i * 3 + 1] = -99; continue; }
      this.pVel[i * 3 + 1] -= 3.4 * dt;
      this.pPos[i * 3] += this.pVel[i * 3] * dt;
      this.pPos[i * 3 + 1] += this.pVel[i * 3 + 1] * dt;
      this.pPos[i * 3 + 2] += this.pVel[i * 3 + 2] * dt;
      if (this.pPos[i * 3 + 1] < 0.02) { this.pPos[i * 3 + 1] = 0.02; this.pVel[i * 3 + 1] *= -0.4; }
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
    // 波纹
    for (const r of this.ripples) {
      if (r.t < 0) continue;
      r.t += dt;
      const dur = r.big ? 0.9 : 0.55;
      if (r.t > dur) { r.t = -1; r.mesh.material.opacity = 0; continue; }
      const k = r.t / dur;
      const sc = 0.3 + k * (r.big ? 4.2 : 2.2);
      r.mesh.scale.setScalar(sc);
      r.mesh.material.opacity = (1 - k) * 0.85;
    }
    // 彩带
    let anyC = false;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < this.CN; i++) {
      const d = this.cData[i];
      if (!d.live) continue;
      anyC = true;
      d.vy -= 5.2 * dt;
      // 空气阻力 + 飘摆
      d.vx *= 1 - dt * 1.4; d.vz *= 1 - dt * 1.4;
      if (d.vy < -0.9) d.vy = -0.9;
      d.x += d.vx * dt + Math.sin(this.time * d.wr + i) * dt * 0.5;
      d.y += d.vy * dt;
      d.z += d.vz * dt;
      d.rx += d.wr * dt; d.rz += d.wr * 0.7 * dt;
      if (d.y < -0.4) { d.live = false; d.y = -10; }
      dummy.position.set(d.x, d.y, d.z);
      dummy.rotation.set(d.rx, 0, d.rz);
      dummy.updateMatrix();
      this.confetti.setMatrixAt(i, dummy.matrix);
    }
    if (anyC) this.confetti.instanceMatrix.needsUpdate = true;
    // 冲击波
    for (const s of this.shocks) {
      if (s.t < 0) continue;
      s.t += dt;
      const dur = 0.5;
      if (s.t > dur) { s.t = -1; s.mesh.material.opacity = 0; continue; }
      const k = s.t / dur;
      s.mesh.scale.setScalar(0.2 + k * 2.4);
      s.mesh.material.opacity = (1 - k) * 0.9;
      s.mesh.lookAt(0, s.mesh.position.y, 8); // 朝向观众
    }
    // 连击火焰:围着舞者持续喷小粒子
    if (this.fireLevel > 0.05 && dancerPos) {
      this._fireAcc += dt * (10 + this.fireLevel * 40);
      while (this._fireAcc >= 1) {
        this._fireAcc -= 1;
        const a = Math.random() * Math.PI * 2;
        const r = 0.85 + Math.random() * 0.2;
        const p = new THREE.Vector3(dancerPos.x + Math.sin(a) * r, 0.05, dancerPos.z + Math.cos(a) * r);
        this.burst(p, this.fireLevel > 0.7 ? 0xff9d2d : this.theme.primary, 1, 0.5, 3.2);
      }
    }
    // 残影
    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      const g = this.ghosts[i];
      g.life -= dt;
      if (g.life <= 0) {
        this.scene.remove(g.group);
        this.ghosts.splice(i, 1);
      } else {
        g.mat.opacity = (g.life / g.max) * 0.32;
      }
    }
  }
}
