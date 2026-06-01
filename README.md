# ScreenFlow AI

ScreenFlow AI 是面向在线教学、企业培训和内容创作者的 AI 视频工作台，支持 AI 录课、屏幕共享录制、人像视频解说、自动字幕、AI 副驾驶、实时分析、隐私模糊、视频剪辑和多平台发布工作流。

线上演示地址：`https://www.emai2.cn/meet/`

## 本次存档备注

本次存档重点修复了多人会议室底栏功能和电脑端 WebRTC 视频接收稳定性：

- 修复电脑端同时接收远端音频和视频 producer 时，多个请求共用 `consumed` 响应事件导致 SDP 参数串线的问题。客户端现在按响应事件串行处理 SFU 请求，并对 producer 做去重和关闭清理。
- 修复虚拟背景切换时误停麦克风轨道、重复发布音频 producer、摄像头已就绪但画布未开始绘制、二次切换动画状态未重置的问题。
- 新增聊天历史消息 API。进入会议后会加载最近 100 条消息，并与 Socket 实时消息合并去重。
- 聊天发送增加服务端确认、超时处理和错误提示。未成功发送时保留输入内容，未加入房间的客户端不能向会议发送消息。
- 修复刚进入会议时立即创建投票可能遇到 `Room not found` 的竞态：服务端会在发出 `room-joined` 前确保房间已写入数据库。
- 完善投票实时连接、服务端输入清理、投票 ID 同步和匿名主持人关闭投票校验。普通参会者不能关闭投票。

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | React 19 + TypeScript |
| 构建 | Vite 6 |
| 样式 | Tailwind CSS v4 |
| 状态管理 | Zustand + persist |
| 国际化 | react-i18next，中英文切换 |
| 实时通信 | Socket.IO |
| 视频通话 | WebRTC / mediasoup |
| 后端 | Express + Socket.IO + Prisma + SQLite |
| AI 能力 | OpenRouter / AI API |

## 快速开始

安装依赖：

```bash
npm install
cd server && npm install && npx prisma db push && cd ..
```

配置环境变量：

```bash
cp .env.example .env.local
cp server/.env.example server/.env
```

开发启动：

```bash
cmd /c npm start
```

默认地址：

- 前端：`http://localhost:3000/meet/`
- 后端：`http://localhost:4000`
- 健康检查：`http://localhost:4000/api/health`

生产构建：

```bash
cmd /c npm run build
```

> 在 Windows PowerShell 中直接执行 `npm` 可能被执行策略拦截，建议使用 `cmd /c npm ...` 或 `npm.cmd ...`。

## 路由

| 路径 | 页面 | 说明 |
| --- | --- | --- |
| `/` | HomePage | 产品首页，展示价值主张并创建/加入会议 |
| `/pricing` | PricingPage | 商业化套餐、Pro 内测和意向表单 |
| `/record` | RecordPage | 独立录制、字幕、AI 副驾驶、分析、剪辑、封面和发布入口 |
| `/meeting/:meetingId` | MeetingRoom | 多人会议室 |
| `/settings` | SettingsPage | 主题和语言设置 |

## 核心功能

### AI 录课与录制

- 支持摄像头、屏幕、共享窗口 + 人像解说录制。
- 支持画中画、左右并排、悬浮圆形人像等布局。
- 人像解说支持位置预设、拖拽移动和小/中/大尺寸切换。
- 录制完成后可下载 WebM 视频。
- 录制页提供视频剪辑、AI 封面生成和发布工作流入口。

### AI 副驾驶与分析

- 基于实时语音转写生成讲解问题、补充建议和互动提示。
- 分析模块返回清晰度、节奏、互动、结构等指标。
- 支持摘要、亮点、风险点和下一步行动建议。

### 隐私模糊

- 支持录制、屏幕共享和在线演示时点击添加模糊区域。
- 可用于遮挡文字、图像、输入框、段落或任意敏感区域。
- 模糊区域会进入预览和最终录制流。

### 多平台发布

- 发布弹窗支持选择 YouTube、小红书、抖音、微信视频号。
- 后端提供平台账号状态、OAuth 跳转和发布提交接口。
- 当前支持演示模式，配置平台凭证后可切换到真实平台上传适配。

### Pro 内测与商业化验证

- 免费版、Pro 版、Team 版套餐展示。
- Pro 意向申请会保存申请编号、审核状态和方案信息。
- 已申请 Pro 内测后，可体验发布、剪辑、封面、字幕导出等 Pro 功能入口。

### 自动字幕

- 基于浏览器语音识别生成实时字幕。
- 支持字幕样式设置、自动隐藏和远端字幕展示。
- Pro 功能包含 SRT/VTT 字幕导出。

### 会议与白板

- 支持多人会议、聊天历史、成员列表和屏幕共享。
- 支持虚拟背景模糊、纯色背景和预设图片背景。
- 支持实时投票、投票结果同步和主持人关闭投票。
- WebRTC 使用 mediasoup SFU，客户端会串行处理共享响应事件的消费请求，避免电脑端并发接收音视频时出现 SDP 冲突。
- 支持白板、画笔、橡皮擦和实时同步。
- 支持会议摘要、要点、待办事项和未解决问题提取。

## API 说明

### AI API

- `POST /api/ai/questions`：根据实时转写生成 AI 副驾驶问题建议。
- `POST /api/ai/analyze`：根据转写文本生成录课分析结构。

### 发布 API

- `GET /api/publish/platforms`：获取平台列表和连接状态。
- `GET /api/publish/oauth/:platform`：获取平台 OAuth 授权地址。
- `GET /api/publish/accounts`：获取已连接账号。
- `POST /api/publish`：提交发布任务。

### 会议 API

- `GET /api/chat/:meetingId`：获取会议最近 100 条聊天消息。
- `GET /api/polls/:meetingId`：获取会议投票列表和投票结果。
- `POST /api/polls/:meetingId`：创建投票。
- `POST /api/polls/:pollId/vote`：提交投票。

开发环境下，前端 `/meet/api/*` 会代理到后端 `http://localhost:4000/api/*`。

## 环境变量

| 变量 | 说明 | 位置 |
| --- | --- | --- |
| `DATABASE_URL` | Prisma 数据库连接字符串 | `server/.env` |
| `JWT_SECRET` | JWT 签名密钥，生产必填 | `server/.env` |
| `OPENROUTER_API_KEY` | AI 功能 API Key | `.env.local` 或 `server/.env` |
| `AI_MODEL` | AI 模型名称 | `server/.env` |
| `CORS_ORIGIN` | 生产环境允许的前端来源 | `server/.env` |
| `ANNOUNCED_IP` | SFU 对外公布 IP | `server/.env` |
| `PUBLISH_DEMO_MODE` | 发布功能演示模式开关 | `.env.local` 或 `server/.env` |
| `PUBLIC_BASE_URL` | 发布回调和公开服务基础地址 | `.env.local` 或 `server/.env` |
| `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` | YouTube OAuth 凭证 | `server/.env` |
| `DOUYIN_CLIENT_KEY` / `DOUYIN_CLIENT_SECRET` | 抖音开放平台凭证 | `server/.env` |
| `XIAOHONGSHU_CLIENT_ID` / `XIAOHONGSHU_CLIENT_SECRET` | 小红书开放平台凭证 | `server/.env` |
| `WECHAT_CHANNELS_APP_ID` / `WECHAT_CHANNELS_APP_SECRET` | 微信视频号凭证 | `server/.env` |

## 项目结构

```text
src/
  components/        UI 组件、会议组件、录制组件、发布组件
  hooks/             WebRTC、录制、字幕、提词器、隐私模糊、流合成 hooks
  pages/             HomePage、PricingPage、RecordPage、MeetingRoom、SettingsPage
  stores/            Zustand 状态管理
  services/          API、Socket、发布服务
  locales/           en.json、zh.json
  lib/               格式化工具、商业化意向记录
  utils/             字幕导出等工具
server/
  src/
    routes/          API 路由
    socket/          Socket.IO 事件处理
    services/        AI 服务
    sfu/             mediasoup SFU
    prisma.ts        Prisma 客户端
```

## 常见问题

### 端口被占用

如果启动时报错：

```text
EADDRINUSE: address already in use :::4000
```

检查并结束占用进程：

```bat
netstat -ano | findstr :4000
taskkill /PID <PID> /F /T
```

### 生产环境 JWT_SECRET

生产环境必须配置：

```text
JWT_SECRET=your-secure-secret
```

否则服务端会主动退出，避免使用默认开发密钥。

### 电脑端无法显示其他用户视频

如果电脑端控制台出现以下错误：

```text
Failed to parse SessionDescription. Duplicate a=msid lines detected
```

请确认已部署包含 SFU 消费请求串行化修复的新前端构建，并在电脑端强制刷新缓存。该问题通常由音频和视频 producer 同时到达时复用同一个 `consumed` 响应事件引起。

## 后续建议

- 将 Pro 意向申请从 `localStorage` 接入后端数据库、CRM 或埋点系统。
- 补齐各发布平台真实上传适配和发布任务队列。
- 为 AI 副驾驶和分析接口增加服务端限流、日志和错误观测。
- 对大体积前端 bundle 做路由级代码拆分。
