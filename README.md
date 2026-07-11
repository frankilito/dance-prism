# 舞光十色 DANCE PRISM 🕺🌈

网页版 3D 音乐舞蹈体感游戏(Just Dance 风格)。打开摄像头,跟着舞台上的 3D 舞者跳舞,
系统用 MediaPipe 在本地实时识别你的动作并打分 —— 画面**不会上传**,全部识别在浏览器内完成。

**在线游玩** → https://frankilito.github.io/dance-prism/

## 玩法

1. 允许摄像头权限,保持全身入镜(光线越亮识别越准)
2. 跟着屏幕中央的参考舞者做动作,动作预告条(右下)会提前显示接下来的舞步
3. 卡在节拍上摆出正确姿势 → PERFECT / GREAT / GOOD / MISS
4. 连击有加成,副歌有彩带激光 pyro 火花,跳完看评级、排行榜,可生成海报 / 保存录像

## 特性

- 🎵 **5 首内置原创合成曲**,风格各异(Synthwave / 热带浩室 / Future Bass / Disco Funk / Trance),也可导入自己的音乐自动生成舞谱
- 🏟️ **5 套主题 3D 舞台**:霓虹城市(楼宇窗灯闪烁+无人机灯秀)/ 夏日海滩(落日海面+火把)/ 未来剧场(节拍追逐拱环)/ 复古迪厅(镜球光斑洒场)/ 太空演唱会(流星+星环)—— LED 像素大屏、摇头灯体积光、激光阵、烟雾、观众荧光棒海、镜面地板、地面光辐条
- 💃 **程序化 3D 偶像舞者**:关节骨骼动画、裙摆/马尾布料物理、表情反馈,每套舞台专属服装配色与头饰(棒球帽 / 遮阳帽 / 光环 / 礼帽 / 天线)
- 🎇 **节奏演出**:副歌 pyro 火花柱、拍点波纹、动作残影、连击火焰环、Perfect 冲击波、镜头推拉环绕
- 🎯 **动作识别**:MediaPipe Pose 33 关键点,识别手臂/腿部/倾斜/跳跃/转身/下蹲,按关节角相似度 + 节奏命中 + 连击计分
- 👯 **双人同屏对战**,localStorage 排行榜
- 📸 结算海报生成 + MediaRecorder 精彩录像
- 🛡️ 低光提示 / 出镜提醒 / 掉帧自动降质

## 本地运行

```bash
node server.mjs        # → http://localhost:8991
# 或双击 启动.command (macOS)
```

需要静态服务器(直接 file:// 打不开 ES Module / wasm)。推荐 Chrome。

## 无摄像头?

选歌后点「无摄像头观演模式」,由 AI 模拟玩家跳给你看,完整体验舞台演出。

## 技术

Three.js(自建舞台/舞者/特效,UnrealBloom 后期) + @mediapipe/tasks-vision(本地 wasm 推理)
+ WebAudio 程序化作曲(无任何外部音频素材)。所有依赖已 vendor 本地化,可完全离线运行。

## 开发测试

```bash
node tools/shoot.mjs test          # 模拟玩家全流程自动测试(需 Chrome)
node tools/shoot.mjs shot out.png  # 截图
```

---
Made with Claude Code 🤖
