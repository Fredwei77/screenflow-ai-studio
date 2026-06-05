# ScreenFlow AI

ScreenFlow AI 是面向在线教学、企业培训和内容创作者的 AI 视频工作台，支持 AI 录课、会议、自动字幕、AI 副驾驶、实时分析、白板/画笔标注、隐私模糊、视频剪辑、字幕导出、发布工作台和 Pro 付费意愿验证。

线上演示地址：`https://www.emai2.cn/meet/`

## 本次存档备注

存档日期：2026-06-05

本次工作重点是把 ScreenFlow AI 从“功能型项目”继续推进成“可验证付费意愿的产品”，同时集中修复 AI 录课和会议室中的关键体验问题。

### 今日完成

- 新增产品工作台和 Pro 申请处理后台入口，用于查看商业线索、管理 Pro 申请状态，并支持“开始审核 / 通过申请 / 拒绝申请”等处理动作。
- 优化 Pricing/Pro 申请链路，将申请数据写入本地商业线索池，为后续接入后端、CRM 或真实线索管理后台预留结构。
- 修复 AI 录课中文界面下 AI 副驾驶输出英文的问题，前后端均按语言参数生成中文提示。
- 优化 AI 副驾驶提示质量，减少泛泛的问题，优先给出可执行、贴近当前讲解内容的中文辅助提示。
- 修复中文连续说话时字幕容易只有拼音没有汉字的问题，录课页会按界面语言选择更合适的识别语言。
- 优化共享整个屏幕时的无限递归预览问题，录课页会隐藏整屏共享的实时预览，降低误录自身页面的风险。
- 优化“分析”板块的中文指标、布局和实时反馈显示。
- 完善 AI 录课页画笔工具：画笔、高亮、箭头、圆圈、激光笔、橡皮擦、隐私模糊、撤销、重做、清空等交互更完整。
- 修复会议室聊天发送时提示 `Not in this room` 的问题，客户端会等待/恢复房间加入状态后再发送。
- 修复一人进入会议室但右上角显示 2 位参与者的问题，顶部参与者数量改为使用实际展示成员数。
- 修复会议室共享功能退出后主屏摄像头黑屏的问题，恢复摄像头时会校验 live video track，并避免替换已结束的 track。

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
cd server && cmd /c npm run build
```

> 在 Windows PowerShell 中直接执行 `npm` 可能被执行策略拦截，建议使用 `cmd /c npm ...` 或 `npm.cmd ...`。

## 路由

| 路径 | 页面 | 说明 |
| --- | --- | --- |
| `/` | HomePage | 产品首页，创建/加入会议，进入录课和商业化入口 |
| `/pricing` | PricingPage | 套餐、Pro 内测申请和付费意愿采集 |
| `/workspace` | WorkspacePage | 产品化工作台，展示录课、会议、字幕、摘要、白板和发布流程 |
| `/applications` | ApplicationsPage | Pro 申请处理清单，支持审核状态管理 |
| `/record` | RecordPage | 独立 AI 录课、字幕、AI 副驾驶、分析、画笔、剪辑和发布入口 |
| `/meeting/:meetingId` | MeetingRoom | 多人会议室、聊天、成员、白板、投票、录制 |
| `/settings` | SettingsPage | 主题和语言设置 |

## 核心功能

### AI 录课

- 支持摄像头、屏幕、共享窗口、整屏共享和人像解说录制。
- 支持画中画、左右并排、悬浮人像、布局切换和拖拽定位。
- 支持实时字幕、SRT/VTT 字幕导出、AI 摘要、AI 分析、视频剪辑和发布入口。
- 整屏共享时自动隐藏本页预览，避免无限递归画面。

### AI 副驾驶与分析

- 根据实时转写生成中文辅助提示、追问、补充案例建议和结构化讲解建议。
- 分析模块展示清晰、参与、结构、节奏、行动等指标。
- AI 提示会结合最近上下文，降低重复和空泛提示。

### 画笔与隐私模糊

- 支持画笔、高亮、箭头、圆圈、激光笔、橡皮擦、隐私模糊。
- 支持颜色、笔触粗细、撤销、重做和清空。
- 激光笔只显示实时轨迹，不会写入永久标注。
- 清空和橡皮擦操作也进入撤销链路。

### 会议室

- 支持多人会议、成员列表、聊天、白板、投票、录制列表和屏幕共享。
- 聊天发送会确认房间加入状态，避免未加入房间时消息丢失。
- 参与者数量使用实际展示成员数，避免本地用户重复计数。
- 退出共享后会恢复可用摄像头轨道，避免主屏黑屏。

### Pro 内测与商业化验证

- Pricing 页支持提交 Pro/Team 意向申请。
- 申请会保存编号、联系方式、团队规模、使用场景、付费意愿和审核状态。
- Applications 页支持搜索申请、查看详情，并处理审核状态。
- 商业化事件会写入本地线索池，方便后续接入后端、CRM 或埋点系统。

## API 说明

### AI API

- `POST /api/ai/questions`：根据实时转写和语言参数生成 AI 副驾驶提示。
- `POST /api/ai/analyze`：根据转写文本生成录课表现分析。

### 会议 API

- `GET /api/chat/:meetingId`：获取会议最近 100 条聊天消息。
- `GET /api/polls/:meetingId`：获取会议投票列表和结果。
- `POST /api/polls/:meetingId`：创建投票。
- `POST /api/polls/:pollId/vote`：提交投票。

开发环境下，前端 `/meet/api/*` 会代理到后端 `http://localhost:4000/api/*`。

## 项目结构

```text
src/
  components/        UI、录制、会议、标注、分析和聊天组件
  hooks/             WebRTC、媒体流、录制、字幕、隐私模糊等 hooks
  pages/             Home、Pricing、Workspace、Applications、Record、Meeting、Settings
  services/          API、Socket、发布服务
  stores/            Zustand 状态管理
  locales/           en.json、zh.json
  lib/               商业化线索和格式化工具
server/
  src/
    routes/          API 路由
    socket/          Socket.IO 事件处理
    services/        AI 服务
    sfu/             mediasoup SFU
```

## 验证记录

本次存档前已执行：

```bash
npm.cmd run build
cd server && cmd /c npm run build
```

前端和后端构建均已通过。前端仍有 Vite 大 chunk 提示，属于现有打包体积提示，不影响运行。

## 后续建议

- 将 Pro 申请从 `localStorage` 接入后端数据库、CRM 或真实线索管理后台。
- 为发布工作台接入真实平台上传任务队列和 OAuth 凭证。
- 对 AI 副驾驶、分析接口增加服务端限流、日志和错误观测。
- 对大体积前端 bundle 做路由级代码拆分。
