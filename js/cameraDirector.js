// ===== 镜头导演:随音乐段落切机位 + 推拉/环绕/升降 + 拍点冲击 =====
import * as THREE from 'three';

const LOOK = new THREE.Vector3(0, 1.15, 0);

// 每个机位:from→to 位置插值(整段镜头时长内),look 目标
const SHOTS = {
  wide: { from: [0, 2.3, 8.2], to: [0, 1.9, 6.6], look: [0, 1.15, 0] },
  mid: { from: [0, 1.55, 5.4], to: [0, 1.45, 4.6], look: [0, 1.2, 0] },
  closeR: { from: [1.3, 1.7, 3.6], to: [0.7, 1.5, 3.1], look: [0, 1.3, 0] },
  closeL: { from: [-1.3, 1.7, 3.6], to: [-0.7, 1.5, 3.1], look: [0, 1.3, 0] },
  low: { from: [-1.8, 0.65, 5], to: [-0.6, 0.75, 4.2], look: [0, 1.5, 0] },
  crane: { from: [0, 4.8, 7], to: [0, 2.1, 5.6], look: [0, 1.1, 0] },
  sideL: { from: [-3.8, 1.5, 3.2], to: [-2.6, 1.5, 4.2], look: [0, 1.25, 0] },
  sideR: { from: [3.8, 1.5, 3.2], to: [2.6, 1.5, 4.2], look: [0, 1.25, 0] },
};

// 段落 → 机位循环(每 shotBeats 拍切一个)
const PROGRAMS = {
  intro: { seq: ['crane', 'wide'], shotBeats: 8 },
  verse: { seq: ['mid', 'closeR', 'wide', 'closeL', 'sideL', 'mid', 'sideR', 'low'], shotBeats: 8 },
  pre: { seq: ['low', 'mid', 'closeR', 'wide'], shotBeats: 4 },
  chorus: { seq: ['wide', 'orbit', 'mid', 'low', 'orbit', 'closeR', 'wide', 'crane'], shotBeats: 4 },
  bridge: { seq: ['sideL', 'crane', 'sideR', 'orbit'], shotBeats: 8 },
  outro: { seq: ['wide', 'crane'], shotBeats: 8 },
};

export class CameraDirector {
  constructor(camera) {
    this.camera = camera;
    this.enabled = true;
    this.shake = 0;
    this.punch = 0;
    this.lastBeatInt = -1;
    this.baseFov = 50;
    this._pos = new THREE.Vector3(0, 1.9, 6.8);
    this._look = LOOK.clone();
  }

  // beat 连续拍数,sec 段落名
  update(dt, beat, sec, level = 0) {
    if (!this.enabled) return;
    const prog = PROGRAMS[sec] || PROGRAMS.verse;
    const shotIdx = Math.floor(beat / prog.shotBeats);
    const shotT = (beat % prog.shotBeats) / prog.shotBeats;
    const name = prog.seq[shotIdx % prog.seq.length];

    const target = new THREE.Vector3();
    const look = new THREE.Vector3(0, 1.2, 0);
    if (name === 'orbit') {
      const dir = shotIdx % 2 === 0 ? 1 : -1;
      const a = dir * (shotT * Math.PI * 0.5 - Math.PI * 0.25);
      const r = 5.4 - shotT * 0.8;
      target.set(Math.sin(a) * r, 1.6 + Math.sin(shotT * Math.PI) * 0.4, Math.cos(a) * r);
    } else {
      const s = SHOTS[name] || SHOTS.wide;
      // 平滑推拉(easeInOut)
      const e = shotT * shotT * (3 - 2 * shotT);
      target.set(
        s.from[0] + (s.to[0] - s.from[0]) * e,
        s.from[1] + (s.to[1] - s.from[1]) * e,
        s.from[2] + (s.to[2] - s.from[2]) * e
      );
      look.set(s.look[0], s.look[1], s.look[2]);
    }

    // 切镜头瞬间硬切,镜头内平滑跟随
    const newShot = this._shotKey !== sec + shotIdx;
    if (newShot) {
      this._shotKey = sec + shotIdx;
      this._pos.copy(target);
    } else {
      this._pos.lerp(target, Math.min(1, dt * 4));
    }
    this._look.lerp(look, Math.min(1, dt * 6));

    // 重拍 FOV 冲击(副歌)
    const beatInt = Math.floor(beat);
    if (beatInt !== this.lastBeatInt) {
      this.lastBeatInt = beatInt;
      if (sec === 'chorus' && beatInt % 2 === 0) this.punch = 1;
      if (sec === 'chorus' && beatInt % 8 === 0) this.shake = Math.max(this.shake, 0.5);
    }
    this.punch *= Math.pow(0.005, dt);
    this.shake *= Math.pow(0.01, dt);

    const c = this.camera;
    c.position.copy(this._pos);
    c.position.x += (Math.random() - 0.5) * this.shake * 0.12;
    c.position.y += (Math.random() - 0.5) * this.shake * 0.12;
    c.lookAt(this._look);
    c.fov = this.baseFov - this.punch * 2.2 + level * 1.2;
    c.updateProjectionMatrix();
  }

  kick(amount = 1) { this.shake = Math.max(this.shake, amount * 0.6); this.punch = Math.max(this.punch, amount); }
}
