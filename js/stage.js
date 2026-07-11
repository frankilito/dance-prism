// ===== 3D 舞台引擎 =====
// 反射地面 / LED 大屏(频谱驱动)/ 摇头灯体积光 / 激光阵 / 烟雾 / 观众荧光棒海 / 主题布景。
import * as THREE from 'three';
import { Reflector } from 'three/addons/Reflector.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

function gradientTex(stops, w = 64, h = 64, radial = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const g = radial
    ? ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2)
    : ctx.createLinearGradient(0, 0, 0, h);
  for (const [p, col] of stops) g.addColorStop(p, col);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const t = new THREE.CanvasTexture(c);
  return t;
}

export class Stage {
  constructor(canvas, theme, quality = 1) {
    this.theme = theme;
    this.quality = quality;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: quality > 0.75, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, quality > 0.75 ? 1.6 : 1));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(theme.fog);
    this.scene.fog = new THREE.FogExp2(theme.fog, theme.fogDensity);

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    this.camera.position.set(0, 1.7, 6.4);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1024, 512), theme.bloom, 0.42, 0.88);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.beatPulse = 0;   // 每拍衰减脉冲(灯光强度)
    this.hitFlash = 0;    // Perfect 白闪
    this.level = 0;
    this.time = 0;

    this.build();
    this.resize();
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  build() {
    const T = this.theme;
    // —— 基础光 ——(强度收着点:主体细节靠 key/fill,氛围靠 rim/spot,过曝交给窄带 trim)
    this.scene.add(new THREE.AmbientLight(T.ambient, 1.45));
    this.keyLight = new THREE.DirectionalLight(0xfff2e2, 0.9);
    this.keyLight.position.set(2, 6, 5);
    this.scene.add(this.keyLight);
    // 正面冷色补光:保住舞者暗部轮廓
    this.fillLight = new THREE.DirectionalLight(0xa8c4ff, 0.4);
    this.fillLight.position.set(-1.6, 2.2, 6);
    this.scene.add(this.fillLight);
    this.rimL = new THREE.PointLight(T.primary, 42, 18);
    this.rimL.position.set(-3.4, 2.6, -1.5);
    this.scene.add(this.rimL);
    this.rimR = new THREE.PointLight(T.secondary, 42, 18);
    this.rimR.position.set(3.4, 2.6, -1.5);
    this.scene.add(this.rimR);
    this.spot = new THREE.SpotLight(0xffffff, 95, 30, 0.5, 0.45);
    this.spot.position.set(0, 7.5, 3);
    this.spot.target.position.set(0, 1, 0);
    this.scene.add(this.spot, this.spot.target);

    this.buildFloor();
    this.buildFloorSpokes();
    this.buildLED();
    this.buildTruss();
    this.buildLasers();
    this.buildFogSprites();
    this.buildCrowd();
    this.buildProps();
  }

  // —— 舞台地面:圆形台 + 镜面反射 + 发光环 ——
  buildFloor() {
    const T = this.theme;
    const q = this.quality;
    // 镜面
    const mirror = new Reflector(new THREE.CircleGeometry(4.4, 48), {
      textureWidth: 512 * q, textureHeight: 512 * q,
      color: 0x889, clipBias: 0.003,
    });
    mirror.rotation.x = -Math.PI / 2;
    mirror.position.y = 0.005;
    this.scene.add(mirror);
    // 半透明暗色叠层(镜面只隐约可见)
    const cover = new THREE.Mesh(
      new THREE.CircleGeometry(4.4, 48),
      new THREE.MeshStandardMaterial({ color: T.floorTint, metalness: 0.4, roughness: 0.35, transparent: true, opacity: 0.72 })
    );
    cover.rotation.x = -Math.PI / 2;
    cover.position.y = 0.012;
    this.scene.add(cover);
    // 台缘发光环 ×2
    this.floorRings = [];
    for (const [r, col] of [[4.42, T.primary], [3.6, T.secondary]]) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.035, 8, 96),
        new THREE.MeshBasicMaterial({ color: col })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.02;
      this.scene.add(ring);
      this.floorRings.push(ring);
    }
    // 舞台基座(圆柱侧面)
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(4.5, 4.7, 0.5, 48, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x0c0a18, metalness: 0.6, roughness: 0.4 })
    );
    base.position.y = -0.25;
    this.scene.add(base);
    const baseGlow = new THREE.Mesh(
      new THREE.CylinderGeometry(4.55, 4.55, 0.06, 48, 1, true),
      new THREE.MeshBasicMaterial({ color: T.primary, side: THREE.DoubleSide })
    );
    baseGlow.position.y = -0.1;
    this.scene.add(baseGlow);
    this.baseGlow = baseGlow;
    // 场外大地面(暗)
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(80, 32),
      new THREE.MeshStandardMaterial({ color: 0x060510, metalness: 0.2, roughness: 0.9 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    this.scene.add(ground);
  }

  // —— 地面光辐条:从台心放射的楔形光带,随节拍逐条追逐点亮 ——
  buildFloorSpokes() {
    const T = this.theme;
    this.spokes = [];
    const N = 12;
    for (let i = 0; i < N; i++) {
      const geo = new THREE.RingGeometry(0.75, 4.15, 6, 1, (i / N) * Math.PI * 2 + 0.03, (Math.PI * 2) / N - 0.06);
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 ? T.primary : T.secondary, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      });
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.018;
      this.scene.add(m);
      this.spokes.push(m);
    }
  }

  // —— LED 大屏(canvas 程序纹理) ——
  buildLED() {
    const T = this.theme;
    this.ledCanvas = document.createElement('canvas');
    this.ledCanvas.width = 512; this.ledCanvas.height = 256;
    this.ledTex = new THREE.CanvasTexture(this.ledCanvas);
    this.ledTex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: this.ledTex });
    // 主屏(轻微弧面:用多段平面弯曲)
    const geo = new THREE.PlaneGeometry(11, 5.4, 24, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      pos.setZ(i, -Math.pow(Math.abs(x) / 5.5, 2) * 1.2);
    }
    geo.computeVertexNormals();
    this.ledMain = new THREE.Mesh(geo, mat);
    this.ledMain.position.set(0, 3.4, -5.2);
    this.scene.add(this.ledMain);
    // 屏幕外框
    const frame = new THREE.Mesh(
      new THREE.PlaneGeometry(11.5, 5.9),
      new THREE.MeshStandardMaterial({ color: 0x090812, metalness: 0.7, roughness: 0.4 })
    );
    frame.position.set(0, 3.4, -5.45);
    this.scene.add(frame);
    // 两侧竖条屏
    this.ledSides = [];
    for (const s of [-1, 1]) {
      const side = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 6.2), mat.clone());
      side.material.map = this.ledTex;
      side.position.set(s * 7.2, 3.1, -3.6);
      side.rotation.y = -s * 0.5;
      this.scene.add(side);
      this.ledSides.push(side);
    }
  }

  // —— 灯架 + 摇头灯(体积光锥) ——
  buildTruss() {
    const T = this.theme;
    const trussMat = new THREE.MeshStandardMaterial({ color: 0x14121f, metalness: 0.85, roughness: 0.35 });
    for (const [y, z] of [[6.4, -3.5], [6.9, 0.5]]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(13, 0.14, 0.14), trussMat);
      bar.position.set(0, y, z);
      this.scene.add(bar);
    }
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 7, 0.16), trussMat);
      post.position.set(s * 6.4, 3.5, -1.5);
      this.scene.add(post);
    }
    // 光锥纹理
    const coneTex = gradientTex([[0, 'rgba(255,255,255,0.85)'], [1, 'rgba(255,255,255,0)']], 64, 64, false);
    this.heads = [];
    const N = 8;
    for (let i = 0; i < N; i++) {
      const x = (i - (N - 1) / 2) * 1.55;
      const z = i % 2 === 0 ? -3.5 : 0.5;
      const y = i % 2 === 0 ? 6.4 : 6.9;
      const yoke = new THREE.Group();
      yoke.position.set(x, y - 0.12, z);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.3, 10), trussMat);
      yoke.add(body);
      const col = i % 2 === 0 ? T.primary : T.secondary;
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(1.15, 9, 20, 1, true),
        new THREE.MeshBasicMaterial({
          map: coneTex, transparent: true, opacity: T.coneOp ?? 0.26, color: col,
          blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
        })
      );
      cone.position.y = -4.5;
      cone.rotation.x = Math.PI; // 尖朝上
      yoke.add(cone);
      const lens = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), new THREE.MeshBasicMaterial({ color: col }));
      lens.position.y = -0.16;
      yoke.add(lens);
      this.scene.add(yoke);
      this.heads.push({ yoke, cone, lens, phase: i / N * Math.PI * 2, col: new THREE.Color(col) });
    }
  }

  // —— 激光阵 ——
  buildLasers() {
    const T = this.theme;
    this.lasers = [];
    for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const beam = new THREE.Mesh(
          new THREE.CylinderGeometry(0.014, 0.014, 26, 6, 1, true),
          new THREE.MeshBasicMaterial({
            color: i % 2 ? T.secondary : T.accent, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
          })
        );
        beam.position.set(s * 6.3, 6.2, -1.5);
        beam.geometry.translate(0, -13, 0);
        this.scene.add(beam);
        this.lasers.push({ beam, side: s, idx: i });
      }
    }
  }

  // —— 烟雾(漂浮大雾片) ——
  buildFogSprites() {
    const tex = gradientTex([[0, 'rgba(255,255,255,0.16)'], [0.7, 'rgba(255,255,255,0.05)'], [1, 'rgba(255,255,255,0)']], 128, 128);
    this.fogSprites = [];
    for (let i = 0; i < 14; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, transparent: true, opacity: 0.55,
        color: new THREE.Color(this.theme.primary).lerp(new THREE.Color(0xffffff), 0.7),
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      const r = 2 + Math.random() * 4.5;
      const a = Math.random() * Math.PI * 2;
      sp.position.set(Math.sin(a) * r, 0.25 + Math.random() * 0.7, Math.cos(a) * r * 0.7);
      const sc = 2.5 + Math.random() * 3;
      sp.scale.set(sc, sc * 0.55, 1);
      sp.userData = { speed: 0.08 + Math.random() * 0.12, phase: Math.random() * 10 };
      sp.material.opacity = 0.4;
      this.scene.add(sp);
      this.fogSprites.push(sp);
    }
  }

  // —— 观众 + 荧光棒海 ——
  buildCrowd() {
    const T = this.theme;
    const N = 220;
    const bodyGeo = new THREE.CapsuleGeometry(0.16, 0.72, 3, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0a0916, roughness: 0.9 });
    this.crowd = new THREE.InstancedMesh(bodyGeo, bodyMat, N);
    const stickGeo = new THREE.CapsuleGeometry(0.022, 0.3, 2, 6);
    const stickMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.sticks = new THREE.InstancedMesh(stickGeo, stickMat, N);
    const palette = [new THREE.Color(T.primary), new THREE.Color(T.secondary), new THREE.Color(T.accent)];
    this.crowdData = [];
    const dummy = new THREE.Object3D();
    for (let i = 0; i < N; i++) {
      // 环形观众席(留出正面摄像机走廊)
      let a = (Math.random() * 1.7 + 0.42) * Math.PI; // 后方到两侧
      if (Math.random() < 0.35) a = Math.random() * Math.PI * 2; // 少量散布
      const r = 6.5 + Math.random() * 7;
      const x = Math.sin(a) * r, z = Math.cos(a) * r;
      const y = -0.5 + Math.max(0, (r - 8) * 0.12); // 后排逐渐升高
      const ph = Math.random() * Math.PI * 2;
      this.crowdData.push({ x, y, z, ph, jump: 0.5 + Math.random() * 0.8 });
      dummy.position.set(x, y + 0.45, z);
      dummy.updateMatrix();
      this.crowd.setMatrixAt(i, dummy.matrix);
      this.sticks.setColorAt(i, palette[i % 3]);
    }
    this.scene.add(this.crowd, this.sticks);
  }

  // —— 主题布景 ——
  buildProps() {
    const T = this.theme;
    const kind = T.props;
    const g = new THREE.Group();
    this.scene.add(g);
    this.props = g;

    if (kind === 'city') {
      // 霓虹楼群剪影(窗灯随时间闪烁)
      this.cityBuildings = [];
      for (let i = 0; i < 42; i++) {
        const w = 1.2 + Math.random() * 2.4, h = 3 + Math.random() * 12;
        const a = Math.random() * Math.PI * 2;
        const r = 22 + Math.random() * 26;
        const base = 0.12 + Math.random() * 0.2;
        const b = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, w),
          new THREE.MeshStandardMaterial({
            color: 0x0a0918, metalness: 0.5, roughness: 0.6,
            emissive: Math.random() < 0.5 ? T.primary : T.secondary,
            emissiveIntensity: base,
          })
        );
        b.position.set(Math.sin(a) * r, h / 2 - 0.5, Math.cos(a) * r);
        g.add(b);
        this.cityBuildings.push({ mesh: b, base, phase: Math.random() * 20, speed: 0.4 + Math.random() * 1.6 });
      }
      // 空中巡游灯(缓慢环绕的彩色光点,像无人机灯秀)
      this.drones = [];
      for (let i = 0; i < 10; i++) {
        const d = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6),
          new THREE.MeshBasicMaterial({ color: i % 2 ? T.secondary : T.accent }));
        d.userData = { r: 10 + Math.random() * 6, h: 5.5 + Math.random() * 3.5, a: Math.random() * Math.PI * 2, sp: 0.1 + Math.random() * 0.16 };
        g.add(d);
        this.drones.push(d);
      }
      // 霓虹拱门
      for (const s of [-1, 1]) {
        const arc = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.045, 8, 32, Math.PI), new THREE.MeshBasicMaterial({ color: T.accent }));
        arc.position.set(s * 7.6, 0, -4.5);
        g.add(arc);
      }
    } else if (kind === 'beach') {
      // 海面
      const sea = new THREE.Mesh(
        new THREE.PlaneGeometry(120, 60),
        new THREE.MeshStandardMaterial({ color: 0x0d3547, metalness: 0.8, roughness: 0.25, emissive: 0x0a2836, emissiveIntensity: 0.28 })
      );
      sea.rotation.x = -Math.PI / 2;
      sea.position.set(0, -0.48, -40);
      g.add(sea);
      // 落日
      const sun = new THREE.Mesh(new THREE.CircleGeometry(6, 40), new THREE.MeshBasicMaterial({ color: 0xe86a34 }));
      sun.position.set(0, 4.5, -55);
      g.add(sun);
      this.sun = sun;
      // 火把:竹竿 + 跳动的火苗光斑
      this.torches = [];
      const flameTex = gradientTex([[0, 'rgba(255,220,150,0.95)'], [0.45, 'rgba(255,140,50,0.55)'], [1, 'rgba(255,80,20,0)']], 64, 64);
      for (const [tx, tz] of [[-5.6, 1.6], [5.6, 1.6], [-6.8, -2.6], [6.8, -2.6]]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 1.7, 8),
          new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.9 }));
        pole.position.set(tx, 0.35, tz);
        g.add(pole);
        const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.06, 0.14, 8),
          new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.8 }));
        bowl.position.set(tx, 1.22, tz);
        g.add(bowl);
        const flame = new THREE.Sprite(new THREE.SpriteMaterial({
          map: flameTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xffc880,
        }));
        flame.position.set(tx, 1.5, tz);
        flame.scale.set(0.5, 0.75, 1);
        g.add(flame);
        this.torches.push({ flame, phase: Math.random() * 10, baseY: 1.5 });
      }
      // 棕榈树(干=弯曲圆柱堆叠,叶=拉伸锥)
      for (const [x, z, sc] of [[-8, -6, 1], [8.5, -5, 1.15], [-11, -1, 0.9], [11, -0.5, 0.95]]) {
        const tree = new THREE.Group();
        let py = 0;
        for (let i = 0; i < 6; i++) {
          const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * (1 - i * 0.08), 0.11 * (1 - i * 0.08), 0.7, 8),
            new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.9 }));
          seg.position.set(Math.sin(i * 0.25) * 0.35, py + 0.35, 0);
          seg.rotation.z = -i * 0.06;
          tree.add(seg);
          py += 0.66;
        }
        for (let i = 0; i < 7; i++) {
          const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.16, 2.2, 5),
            new THREE.MeshStandardMaterial({ color: 0x1d7a4f, roughness: 0.8, emissive: 0x0a4428, emissiveIntensity: 0.4 }));
          const a = (i / 7) * Math.PI * 2;
          leaf.position.set(Math.sin(i * 0.25) * 0.35 + Math.sin(a) * 0.75, py + 0.15, Math.cos(a) * 0.75);
          leaf.rotation.set(Math.cos(a) * 1.25, 0, -Math.sin(a) * 1.25);
          tree.add(leaf);
        }
        tree.position.set(x, -0.5, z);
        tree.scale.setScalar(sc * 1.35);
        g.add(tree);
      }
    } else if (kind === 'theater') {
      // 未来剧场:发光拱环阵列(随节拍逐环追逐点亮)
      this.theaterArcs = [];
      for (let i = 0; i < 6; i++) {
        const arc = new THREE.Mesh(
          new THREE.TorusGeometry(7 + i * 2.2, 0.07, 8, 48, Math.PI),
          new THREE.MeshBasicMaterial({ color: i % 2 ? T.primary : T.secondary, transparent: true, opacity: 0.85 - i * 0.1 })
        );
        arc.position.set(0, 0, -6 - i * 3);
        g.add(arc);
        this.theaterArcs.push({ mesh: arc, base: 0.55 - i * 0.06 });
      }
      // 悬浮平台柱
      for (const s of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const col = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4 + i, 0.5),
            new THREE.MeshStandardMaterial({ color: 0x0d0b20, metalness: 0.8, roughness: 0.3, emissive: T.primary, emissiveIntensity: 0.25 }));
          col.position.set(s * (6.5 + i * 2.4), 1.5, -4 - i * 2.5);
          g.add(col);
        }
      }
    } else if (kind === 'disco') {
      // 镜球
      const ballGeo = new THREE.SphereGeometry(1.1, 24, 18);
      const ball = new THREE.Mesh(ballGeo, new THREE.MeshStandardMaterial({
        color: 0xdddddd, metalness: 1, roughness: 0.12, flatShading: true,
      }));
      ball.position.set(0, 5.4, -1);
      g.add(ball);
      this.discoBall = ball;
      // 镜球光斑:洒在地面/空中环绕旋转的白金光点
      const dotTex = gradientTex([[0, 'rgba(255,255,255,0.95)'], [0.5, 'rgba(255,240,200,0.5)'], [1, 'rgba(255,240,200,0)']], 32, 32);
      this.ballDots = new THREE.Group();
      for (let i = 0; i < 64; i++) {
        const onFloor = Math.random() < 0.85;
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({
          map: dotTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
          color: i % 3 === 0 ? 0xffe9b8 : 0xffffff, opacity: onFloor ? 0.5 : 0.22,
        }));
        const a = Math.random() * Math.PI * 2;
        const r = 1.2 + Math.random() * 3.4;
        const y = onFloor ? 0.04 : 0.6 + Math.random() * 2;
        sp.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
        const s = onFloor ? 0.08 + Math.random() * 0.1 : 0.05 + Math.random() * 0.06;
        sp.scale.set(s, s, 1);
        sp.userData.air = !onFloor;
        this.ballDots.add(sp);
      }
      g.add(this.ballDots);
      const hang = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4), new THREE.MeshBasicMaterial({ color: 0x444 }));
      hang.position.set(0, 6.3, -1);
      g.add(hang);
      // 复古灯柱圈
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.6, 0.22),
          new THREE.MeshBasicMaterial({ color: i % 2 ? T.primary : T.secondary }));
        bar.position.set(Math.sin(a) * 9, 0.8, Math.cos(a) * 9);
        g.add(bar);
      }
    } else if (kind === 'space') {
      // 星空
      const starGeo = new THREE.BufferGeometry();
      const starPos = new Float32Array(900 * 3);
      for (let i = 0; i < 900; i++) {
        const r = 30 + Math.random() * 60;
        const th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 2 - 1);
        starPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
        starPos[i * 3 + 1] = Math.abs(r * Math.cos(ph)) - 2;
        starPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      }
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
      const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xbfd4ff, size: 0.12, sizeAttenuation: true }));
      g.add(stars);
      this.stars = stars;
      // 大行星 + 环
      const planet = new THREE.Mesh(new THREE.SphereGeometry(7, 28, 20),
        new THREE.MeshStandardMaterial({ color: 0x22355f, metalness: 0.2, roughness: 0.7, emissive: 0x16295a, emissiveIntensity: 0.6 }));
      planet.position.set(-16, 10, -38);
      g.add(planet);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(10.5, 0.8, 8, 48),
        new THREE.MeshBasicMaterial({ color: T.secondary, transparent: true, opacity: 0.5 }));
      ring.position.copy(planet.position);
      ring.rotation.x = Math.PI / 2.6;
      g.add(ring);
      // 环形空间站结构
      const halo = new THREE.Mesh(new THREE.TorusGeometry(12, 0.12, 8, 64),
        new THREE.MeshBasicMaterial({ color: T.primary, transparent: true, opacity: 0.75 }));
      halo.rotation.x = Math.PI / 2;
      halo.position.y = 7.5;
      g.add(halo);
      this.halo = halo;
      // 流星:随机划过天幕的光条
      this.meteors = [];
      for (let i = 0; i < 3; i++) {
        const m = new THREE.Mesh(
          new THREE.CylinderGeometry(0.012, 0.05, 3.2, 5, 1, true),
          new THREE.MeshBasicMaterial({ color: 0xcfe4ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
        );
        g.add(m);
        this.meteors.push({ mesh: m, t: -2 - Math.random() * 6 });
      }
    }
  }

  // ---------- LED 程序 ----------
  drawLED(beat, spectrum, sec) {
    const c = this.ledCanvas.getContext('2d');
    const W = 512, H = 256;
    const T = this.theme;
    const p = new THREE.Color(T.primary), s = new THREE.Color(T.secondary);
    const hexP = '#' + p.getHexString(), hexS = '#' + s.getHexString();
    const flash = this.beatPulse;
    const prog = T.ledProgram;
    if (prog === 'equalizer') {
      c.fillStyle = '#05040c'; c.fillRect(0, 0, W, H);
      const bars = 28;
      for (let i = 0; i < bars; i++) {
        const v = spectrum ? spectrum[2 + i * 2] / 255 : Math.abs(Math.sin(beat * 2 + i));
        const h = v * (H - 30) + 6;
        const grad = c.createLinearGradient(0, H, 0, H - h);
        grad.addColorStop(0, hexP); grad.addColorStop(1, hexS);
        c.fillStyle = grad;
        c.fillRect(i * (W / bars) + 2, H - h, W / bars - 5, h);
      }
      c.fillStyle = `rgba(255,255,255,${flash * 0.28})`; c.fillRect(0, 0, W, H);
    } else if (prog === 'sunset') {
      const grad = c.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#1d0b40'); grad.addColorStop(0.55, '#8f2650'); grad.addColorStop(1, '#c76a2c');
      c.fillStyle = grad; c.fillRect(0, 0, W, H);
      c.fillStyle = '#f0b459';
      c.beginPath(); c.arc(W / 2, H * 0.62 + Math.sin(beat * 0.5) * 4, 40 + flash * 7, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.34)'; c.lineWidth = 3;
      for (let i = 0; i < 5; i++) {
        c.beginPath();
        for (let x = 0; x <= W; x += 8) {
          const y = H * 0.72 + i * 24 + Math.sin(x * 0.03 + beat * 2.4 + i) * 6;
          x === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
        }
        c.stroke();
      }
    } else if (prog === 'tunnel') {
      c.fillStyle = '#060414'; c.fillRect(0, 0, W, H);
      for (let i = 0; i < 9; i++) {
        const z = ((i / 9 + (beat * 0.24)) % 1);
        const r = z * z * 300 + 6;
        c.strokeStyle = i % 2 ? hexP : hexS;
        c.globalAlpha = z * 0.9 + flash * 0.1;
        c.lineWidth = 3 + z * 7;
        c.strokeRect(W / 2 - r * 1.6, H / 2 - r, r * 3.2, r * 2);
      }
      c.globalAlpha = 1;
    } else if (prog === 'checker') {
      const n = 8, m = 4;
      for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
        const on = (i + j + Math.floor(beat)) % 2 === 0;
        const cols = [hexP, hexS, '#ffd34d', '#4dc3ff'];
        c.fillStyle = on ? cols[(i + j * 2 + Math.floor(beat / 4)) % 4] : '#0a0812';
        c.globalAlpha = on ? 0.85 + flash * 0.15 : 1;
        c.fillRect(i * W / n, j * H / m, W / n - 3, H / m - 3);
      }
      c.globalAlpha = 1;
    } else { // starfield
      c.fillStyle = 'rgba(4,4,16,0.4)'; c.fillRect(0, 0, W, H);
      if (!this._stars) {
        this._stars = Array.from({ length: 70 }, () => ({ a: Math.random() * Math.PI * 2, r: Math.random(), sp: 0.3 + Math.random() }));
      }
      for (const st of this._stars) {
        st.r += st.sp * 0.012 * (1 + flash * 2);
        if (st.r > 1) st.r = 0.02;
        const x = W / 2 + Math.cos(st.a) * st.r * W * 0.6;
        const y = H / 2 + Math.sin(st.a) * st.r * H * 0.6;
        c.fillStyle = st.sp > 1 ? hexS : '#cfe0ff';
        const sz = st.r * 4 + 0.5;
        c.fillRect(x, y, sz, sz);
      }
      c.fillStyle = `rgba(140,160,255,${flash * 0.2})`; c.fillRect(0, 0, W, H);
    }
    // 段落文字提示(副歌)
    if (sec === 'chorus') {
      c.font = '900 italic 40px Arial';
      c.textAlign = 'center';
      c.fillStyle = `rgba(255,255,255,${0.14 + flash * 0.4})`;
      c.fillText('★ DANCE! ★', W / 2, 54);
    }
    // LED 像素网格:压出真实大屏的灯珠质感
    c.globalAlpha = 1;
    c.fillStyle = 'rgba(0,0,0,0.34)';
    for (let x = 0; x < W; x += 8) c.fillRect(x, 0, 2, H);
    for (let y = 0; y < H; y += 8) c.fillRect(0, y, W, 2);
    this.ledTex.needsUpdate = true;
  }

  // ---------- 每帧更新 ----------
  update(dt, beat, level, sec, spectrum) {
    this.time += dt;
    this.level = level;
    const T = this.theme;
    const phase = beat % 1;
    // 拍点脉冲
    if (phase < 0.5) this.beatPulse = Math.max(this.beatPulse, 1 - phase * 2);
    this.beatPulse *= Math.pow(0.02, dt);
    this.hitFlash *= Math.pow(0.008, dt);
    const intensity = sec === 'chorus' ? 1 : sec === 'intro' || sec === 'bridge' ? 0.45 : 0.7;

    // 摇头灯
    for (let i = 0; i < this.heads.length; i++) {
      const h = this.heads[i];
      const sweep = sec === 'chorus' ? 1.5 : 0.7;
      h.yoke.rotation.z = Math.sin(this.time * sweep + h.phase) * 0.65;
      h.yoke.rotation.x = 0.35 + Math.sin(this.time * sweep * 0.7 + h.phase * 2) * 0.3;
      h.cone.material.opacity = (T.coneOp ?? 0.26) * (0.4 + this.beatPulse * 1.1 + level * 0.65) * intensity;
    }
    // 边缘灯 & 聚光呼吸
    this.rimL.intensity = 30 + this.beatPulse * 55 * intensity;
    this.rimR.intensity = 30 + this.beatPulse * 55 * intensity;
    this.spot.intensity = 85 + this.beatPulse * 70 + this.hitFlash * 240;
    // 台环发光闪烁
    for (let i = 0; i < this.floorRings.length; i++) {
      const m = this.floorRings[i].material;
      m.color.set(i === 0 ? T.primary : T.secondary);
      const k = 0.55 + this.beatPulse * 0.9;
      m.color.multiplyScalar(k);
    }
    this.baseGlow.material.color.set(T.primary).multiplyScalar(0.4 + this.beatPulse * 0.8);
    // 激光(副歌 + pre 展开)
    const laserOn = sec === 'chorus' ? 1 : sec === 'pre' ? 0.5 : 0;
    for (const L of this.lasers) {
      const targetOp = laserOn * (0.5 + this.beatPulse * 0.5) * 0.75;
      L.beam.material.opacity += (targetOp - L.beam.material.opacity) * Math.min(1, dt * 6);
      L.beam.rotation.z = L.side * (0.5 + Math.sin(this.time * 1.6 + L.idx * 1.3) * 0.42);
      L.beam.rotation.x = Math.sin(this.time * 1.1 + L.idx * 2.1) * 0.35;
    }
    // 烟雾漂移
    for (const sp of this.fogSprites) {
      sp.position.x += Math.sin(this.time * 0.3 + sp.userData.phase) * sp.userData.speed * dt;
      sp.position.z += Math.cos(this.time * 0.22 + sp.userData.phase) * sp.userData.speed * dt * 0.6;
      sp.material.opacity = 0.26 + Math.sin(this.time * 0.5 + sp.userData.phase) * 0.12 + level * 0.12;
    }
    // 观众跳动 + 荧光棒
    const dummy = new THREE.Object3D();
    const beatBounce = Math.abs(Math.sin(beat * Math.PI));
    for (let i = 0; i < this.crowdData.length; i++) {
      const d = this.crowdData[i];
      const hop = sec === 'chorus' ? beatBounce * 0.22 * d.jump : beatBounce * 0.06 * d.jump;
      dummy.position.set(d.x, d.y + 0.45 + hop, d.z);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      this.crowd.setMatrixAt(i, dummy.matrix);
      // 荧光棒:举手摇摆
      dummy.position.set(d.x, d.y + 1.05 + hop, d.z);
      dummy.rotation.z = Math.sin(beat * Math.PI + d.ph) * 0.55;
      dummy.rotation.x = Math.cos(beat * Math.PI * 0.5 + d.ph) * 0.2;
      dummy.updateMatrix();
      this.sticks.setMatrixAt(i, dummy.matrix);
    }
    this.crowd.instanceMatrix.needsUpdate = true;
    this.sticks.instanceMatrix.needsUpdate = true;
    // 地面光辐条:环形追逐,副歌加速
    if (this.spokes) {
      const N = this.spokes.length;
      const spin = beat * (sec === 'chorus' ? 3 : 1.5);
      for (let i = 0; i < N; i++) {
        const dd = ((i - spin) % N + N) % N;
        const chase = Math.pow(Math.max(0, 1 - dd / 3.2), 2);
        this.spokes[i].material.opacity = chase * (0.1 + this.beatPulse * 0.3 + level * 0.12) * intensity;
      }
    }
    // 主题动态
    if (this.discoBall) this.discoBall.rotation.y += dt * 0.8;
    if (this.ballDots) {
      this.ballDots.rotation.y += dt * (0.35 + this.beatPulse * 0.5);
      this.ballDots.children.forEach((sp, i) => {
        const base = sp.userData.air ? 0.16 : 0.34;
        sp.material.opacity = base + this.beatPulse * (sp.userData.air ? 0.15 : 0.4) + (sp.userData.air ? 0.05 : 0.16) * Math.sin(this.time * 2.4 + i);
      });
    }
    if (this.halo) this.halo.rotation.z += dt * 0.15;
    if (this.stars) this.stars.rotation.y += dt * 0.01;
    if (this.sun) this.sun.scale.setScalar(1 + this.beatPulse * 0.05);
    if (this.cityBuildings) {
      for (const b of this.cityBuildings) {
        // 窗灯闪烁:慢波 + 偶发瞬灭
        const w = Math.sin(this.time * b.speed + b.phase);
        b.mesh.material.emissiveIntensity = b.base * (0.75 + 0.35 * w) + (w > 0.96 ? 0.25 : 0);
      }
    }
    if (this.drones) {
      for (const d of this.drones) {
        const u = d.userData;
        u.a += dt * u.sp;
        d.position.set(Math.sin(u.a) * u.r, u.h + Math.sin(this.time * 0.7 + u.r) * 0.5, Math.cos(u.a) * u.r);
      }
    }
    if (this.torches) {
      for (const t of this.torches) {
        const n = Math.sin(this.time * 9 + t.phase) * 0.5 + Math.sin(this.time * 23 + t.phase * 2) * 0.5;
        t.flame.scale.set(0.44 + n * 0.08, 0.66 + n * 0.16, 1);
        t.flame.position.y = t.baseY + n * 0.03;
        t.flame.material.opacity = 0.75 + n * 0.2;
      }
    }
    if (this.theaterArcs) {
      const N = this.theaterArcs.length;
      const beatInt = Math.floor(Math.max(0, beat));
      for (let i = 0; i < N; i++) {
        const a = this.theaterArcs[i];
        const lit = beatInt % N === i;
        a.mesh.material.opacity = a.base * (0.55 + level * 0.4) + (lit ? this.beatPulse * 0.5 : 0);
      }
    }
    if (this.meteors) {
      for (const mt of this.meteors) {
        mt.t += dt;
        if (mt.t > 1.1) {
          mt.t = -3 - Math.random() * 8; // 下一颗间隔
          const a = Math.random() * Math.PI * 2;
          mt.x0 = Math.sin(a) * (18 + Math.random() * 14);
          mt.z0 = -Math.abs(Math.cos(a)) * (20 + Math.random() * 14);
          mt.y0 = 12 + Math.random() * 8;
          mt.dx = -mt.x0 * 0.04 + (Math.random() - 0.5) * 3;
          mt.dy = -(3.5 + Math.random() * 2);
          mt.mesh.position.set(mt.x0, mt.y0, mt.z0);
          mt.mesh.rotation.z = Math.atan2(mt.dx, -mt.dy);
        }
        if (mt.t >= 0 && mt.t <= 1.1) {
          mt.mesh.position.set(mt.x0 + mt.dx * mt.t * 6, mt.y0 + mt.dy * mt.t * 6, mt.z0);
          mt.mesh.material.opacity = Math.sin(Math.min(1, mt.t / 1.1) * Math.PI) * 0.8;
        } else {
          mt.mesh.material.opacity = 0;
        }
      }
    }
    // bloom 呼吸
    this.bloom.strength = T.bloom * (0.9 + this.beatPulse * 0.25 + this.hitFlash * 0.3);
    // LED 每 2 帧刷一次
    this._ledSkip = (this._ledSkip || 0) + 1;
    if (this._ledSkip % 2 === 0) this.drawLED(beat, spectrum, sec);
  }

  render() {
    this.composer.render();
  }

  dispose() {
    this.renderer.dispose();
  }
}
