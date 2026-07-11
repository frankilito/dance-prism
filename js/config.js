// ===== 全局配置:歌曲 / 主题 =====

export const SONGS = [
  {
    id: 'neon',
    name: '霓虹脉冲',
    en: 'NEON PULSE',
    bpm: 122,
    diff: 3,
    theme: 'neonCity',
    tint: '#ff2d78',
    tint2: '#22d3ee',
    desc: '赛博都市 Synthwave',
  },
  {
    id: 'beach',
    name: '落日冲浪',
    en: 'SUNSET SURF',
    bpm: 106,
    diff: 2,
    theme: 'beach',
    tint: '#ff9d4d',
    tint2: '#2de8c8',
    desc: '夏日热带浩室',
  },
  {
    id: 'theater',
    name: '未来虹光',
    en: 'PHOTON THEATER',
    bpm: 128,
    diff: 4,
    theme: 'theater',
    tint: '#b026ff',
    tint2: '#4dc3ff',
    desc: '未来剧场 Future Bass',
  },
  {
    id: 'disco',
    name: '镜球狂热',
    en: 'MIRRORBALL FEVER',
    bpm: 118,
    diff: 3,
    theme: 'disco',
    tint: '#ffd34d',
    tint2: '#ff5ea8',
    desc: '复古迪厅 Funk',
  },
  {
    id: 'space',
    name: '星际巡游',
    en: 'GALACTIC TOUR',
    bpm: 132,
    diff: 5,
    theme: 'space',
    tint: '#7c8cff',
    tint2: '#3ef2d0',
    desc: '太空演唱会 Trance',
  },
];

export const THEMES = {
  neonCity: {
    name: '霓虹城市',
    primary: 0xff2d78, secondary: 0x22d3ee, accent: 0xb026ff,
    fog: 0x0a0618, fogDensity: 0.016,
    floorTint: 0x140a22, ledProgram: 'equalizer',
    bloom: 0.72, ambient: 0x1a1030, coneOp: 0.24,
    costume: { top: 0xe83d78, pants: 0x23253f, trim: 0x35e8ff, hat: 'cap' },
    props: 'city',
  },
  beach: {
    name: '夏日海滩',
    primary: 0xff9d4d, secondary: 0x2de8c8, accent: 0xff5ea8,
    fog: 0x241330, fogDensity: 0.01,
    floorTint: 0x1c1024, ledProgram: 'sunset',
    bloom: 0.5, ambient: 0x2c1c34, coneOp: 0.14,
    costume: { top: 0xff8b48, pants: 0x1c454e, trim: 0x3dffd8, hat: 'visor' },
    props: 'beach',
  },
  theater: {
    name: '未来剧场',
    primary: 0xb026ff, secondary: 0x4dc3ff, accent: 0xffffff,
    fog: 0x08061a, fogDensity: 0.018,
    floorTint: 0x0e0a20, ledProgram: 'tunnel',
    bloom: 0.85, ambient: 0x150f38, coneOp: 0.24,
    costume: { top: 0xa337f0, pants: 0x1c1838, trim: 0x64d6ff, hat: 'halo' },
    props: 'theater',
  },
  disco: {
    name: '复古迪厅',
    primary: 0xffd34d, secondary: 0xff5ea8, accent: 0x4dc3ff,
    fog: 0x140a10, fogDensity: 0.014,
    floorTint: 0x180e14, ledProgram: 'checker',
    bloom: 0.62, ambient: 0x2a1420, coneOp: 0.2,
    costume: { top: 0xf5b93a, pants: 0x33203c, trim: 0xff6cb0, hat: 'fedora' },
    props: 'disco',
  },
  space: {
    name: '太空演唱会',
    primary: 0x7c8cff, secondary: 0x3ef2d0, accent: 0xff5ea8,
    fog: 0x040410, fogDensity: 0.012,
    floorTint: 0x0a0a1c, ledProgram: 'starfield',
    bloom: 0.82, ambient: 0x101038, coneOp: 0.24,
    costume: { top: 0x8492ff, pants: 0x181c3c, trim: 0x4dffdf, hat: 'antenna' },
    props: 'space',
  },
};

// 判定
export const JUDGE = {
  window: 0.5,          // 判定采样窗口(秒,谱面点前后)
  perfectDeg: 18,       // 平均关节角误差阈值
  greatDeg: 33,
  goodDeg: 52,
  scores: { perfect: 500, great: 300, good: 100, miss: 0 },
  comboBonus: 0.01,     // 每连击加成 1%,封顶 50%
  comboBonusMax: 0.5,
};

export const GRADES = [
  { min: 0.92, g: 'SSS' }, { min: 0.84, g: 'SS' }, { min: 0.74, g: 'S' },
  { min: 0.6, g: 'A' }, { min: 0.45, g: 'B' }, { min: 0.28, g: 'C' }, { min: 0, g: 'D' },
];

export const qs = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
export const IS_SHOT = qs.has('shot');
export const IS_AUTOTEST = qs.has('autotest');
