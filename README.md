# ScreenFlow AI - 视频教学平台

多人实时视频教学平台，支持字幕、白板、投票、录制、AI 摘要等功能。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 19 + TypeScript |
| 构建工具 | Vite 6 |
| 样式 | Tailwind CSS v4 |
| 状态管理 | Zustand（含 persist 中间件） |
| 实时通信 | Socket.IO |
| 视频通话 | WebRTC（mesh P2P，最多 4 人） |
| 国际化 | react-i18next（中/英） |
| 后端 | Express + Socket.IO + Prisma + SQLite |

## 快速开始

```bash
# 安装依赖
npm install
cd server && npm install && npx prisma db push && cd ..

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入 OpenRouter API Key（可选，AI 摘要功能需要）

# 启动开发服务器
npm start
# 前端: http://localhost:3000  后端: http://localhost:4000

# 生产构建
npm run build
```

## 项目结构

```
src/
├── components/              # UI 组件
│   ├── ui/                  # 基础 UI（Button, Input, Card, Modal, Spinner）
│   ├── ChatPanel.tsx        # 聊天面板
│   ├── CreatePollForm.tsx   # 创建投票表单
│   ├── ErrorBoundary.tsx    # 全局错误边界
│   ├── LanguageSwitcher.tsx # 中英文切换按钮
│   ├── MeetingControls.tsx  # 会议控制栏
│   ├── ParticipantGrid.tsx  # 视频网格布局
│   ├── ParticipantList.tsx  # 参与者列表
│   ├── PollPanel.tsx        # 投票面板
│   ├── PollResults.tsx      # 投票结果展示
│   ├── RecordingList.tsx    # 录制列表
│   ├── RemoteAudioPlayer.tsx # 远程音频播放
│   ├── SubtitleOverlay.tsx  # 字幕叠加层
│   ├── SubtitleSettings.tsx # 字幕设置弹窗
│   ├── SummaryModal.tsx     # AI 摘要弹窗
│   ├── WhiteboardPanel.tsx  # 白板面板
│   └── WhiteboardToolbar.tsx # 白板工具栏
├── hooks/                   # 自定义 Hooks
│   ├── useMeetingRecording.ts # 会议录制
│   ├── usePolling.ts        # 投票逻辑
│   ├── useSpeechRecognition.ts # 语音识别（Web Speech API）
│   ├── useSubtitles.ts      # 字幕编排（识别 + 广播 + 自动隐藏）
│   ├── useSummary.ts        # AI 摘要
│   ├── useWebRTC.ts         # WebRTC 连接管理
│   └── useWhiteboard.ts     # 白板逻辑
├── stores/                  # Zustand 状态管理
│   ├── useAuthStore.ts      # 认证状态（持久化）
│   ├── useChatStore.ts      # 聊天消息
│   ├── useMeetingStore.ts   # 会议状态（参与者/流/静音）
│   ├── usePollStore.ts      # 投票状态
│   ├── useSubtitleStore.ts  # 字幕状态
│   ├── useSummaryStore.ts   # 摘要状态
│   ├── useUIStore.ts        # UI 状态（主题/语言，持久化）
│   └── useWhiteboardStore.ts # 白板状态
├── pages/
│   ├── HomePage.tsx         # 首页（创建/加入会议）
│   ├── MeetingRoom.tsx      # 会议室主页面
│   ├── RecordPage.tsx       # 独立录制页面
│   └── SettingsPage.tsx     # 设置页面
├── services/
│   ├── api.ts               # HTTP API 封装
│   └── socket.ts            # Socket.IO 客户端封装
├── locales/
│   ├── en.json              # 英文翻译
│   └── zh.json              # 中文翻译
├── i18n.ts                  # i18next 初始化
├── types/index.ts           # TypeScript 类型定义
└── index.tsx                # 应用入口

server/
└── src/
    ├── index.ts             # Express + Socket.IO 服务入口
    ├── socket/index.ts      # Socket 事件处理
    ├── routes/              # API 路由
    ├── services/            # 业务服务
    └── prisma/              # 数据库 schema
```

## 核心功能

### 1. 视频会议
- WebRTC mesh P2P，最多 4 人同时在线
- 静音/取消静音、摄像头开关、屏幕共享
- 举手功能、参与者列表实时同步
- Socket.IO 信令（offer/answer/ICE candidate）

### 2. 实时字幕
```
用户说话 → Web Speech API 识别
    ├── 最终结果 → addSubtitle() + sendSubtitle(isFinal: true)
    └── 中间结果 → sendSubtitle(isFinal: false) [节流 300ms]

远程字幕接收:
    ├── isFinal: true  → addSubtitle() + clearRemoteInterim()
    └── isFinal: false → setRemoteInterim() [实时显示]

自动隐藏:
    新字幕 → markVisible() → 定时器(可配置) → isVisible: false [700ms 淡出]
```

- 显示最近 5 条字幕，带透明度渐变
- 设置面板：识别语言覆盖、自动隐藏延迟（3s/5s/8s/关闭）

### 3. 国际化
- react-i18next 实现中英文切换
- 语言偏好通过 useUIStore 持久化到 localStorage
- 语音识别语言自动跟随 UI 语言

### 4. 白板
- Canvas 画笔/橡皮擦，颜色/粗细可配置
- 实时同步（Socket.IO 广播笔画）

### 5. 投票
- 创建投票（问题 + 多选项）、实时投票、结果统计
- 防重复投票、关闭投票

### 6. 会议录制
- MediaRecorder 录制本地音视频（WebM VP9+Opus）
- 录制完成后自动下载，元数据保存到服务器

### 7. AI 摘要
- 基于会议转录文本生成摘要
- 提取要点、待办事项、未解决问题

## 路由

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | HomePage | 创建/加入会议 |
| `/meeting/:meetingId` | MeetingRoom | 会议室 |
| `/record` | RecordPage | 独立录制 |
| `/settings` | SettingsPage | 主题/语言设置 |

## 快捷键（录制模式）

| 快捷键 | 功能 |
|--------|------|
| `Ctrl + R` | 开始/停止录制 |
| `Ctrl + D` | 下载视频 |
| `Ctrl + 1` | 切换到屏幕 |
| `Ctrl + 2` | 切换到摄像头 |
| `Ctrl + 3` | 切换到屏幕+麦克风 |

## 开发注意事项

### Zustand Selector 必须返回稳定引用

```typescript
// 错误 — selector 每次返回新数组，导致无限循环
const data = useMyStore(selectDerivedData); // selectDerivedData 内部 map/filter 创建新数组

// 正确 — 订阅原始字段，组件内用 useMemo 计算派生数据
const rawData = useMyStore((s) => s.rawData);
const data = useMemo(() => rawData.filter(...), [rawData]);
```

原因：React 的 `useSyncExternalStore` 用 `Object.is` 比较 selector 返回值，新引用会触发无限重渲染。

### useEffect 中避免不稳定依赖

```typescript
// 错误 — t 函数可能不稳定，导致 effect 反复执行
useEffect(() => { ... }, [language, t]);

// 正确 — 用 ref 存储不稳定引用
const tRef = useRef(t);
useEffect(() => { tRef.current = t; }, [t]);
useEffect(() => { /* 用 tRef.current 代替 t */ }, [language]);
```

### Store Action 使用 getState() 调用

```typescript
// 可能导致不必要的重渲染
const { addSubtitle } = useSubtitleStore(); // 订阅整个 store

// 推荐 — 不订阅，直接调用
useSubtitleStore.getState().addSubtitle(...);
```

## 环境变量

| 变量 | 说明 | 位置 |
|------|------|------|
| `DATABASE_URL` | Prisma 数据库连接字符串 | server/.env |
| `JWT_SECRET` | JWT 签名密钥 | server/.env |
| `AI_API_KEY` | AI 摘要服务 API Key | server/.env |
| `OPENROUTER_API_KEY` | OpenRouter API Key（AI 功能） | .env.local |
