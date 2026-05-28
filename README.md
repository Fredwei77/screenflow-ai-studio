# ScreenFlow AI

ScreenFlow AI 是面向在线教学、企业培训和内容创作者的 AI 视频工作台，支持 AI 录课、自动字幕、会议总结、白板互动、投票、录制下载、提词器、虚拟背景、视频剪辑和发布工作流。

线上演示地址：`https://www.emai2.cn/meet/`

## 今日归档说明

本次归档重点完成了产品商业化第一阶段和 SEO/国际化基础建设：

- 新增 `/pricing` 价格页，包含 Free、Pro、Team 三档套餐和内测/购买意向表单。
- 新增商业化意向记录工具，先用 `localStorage` 记录 `pricing_view`、`upgrade_click`、`lead_submit`。
- 首页增加清晰价值主张：AI 录课、自动字幕、会议总结、白板互动。
- 优化首页英文排版，英文大标题使用可控分行，整体视觉更协调。
- 优化价格页 hero、套餐卡片和页脚社交媒体区域。
- 修复中英文切换乱码问题，重建中文语言包并让首页、价格页、页脚、表单跟随语言切换。
- 增加基础 SEO：`title`、`description`、canonical、Open Graph、Twitter Card、SoftwareApplication JSON-LD。
- 新增 `robots.txt` 和 `sitemap.xml`，便于搜索引擎收录 `/meet/`、`/meet/pricing`、`/meet/record`。

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

```bash
npm install
cd server && npm install && npx prisma db push && cd ..
```

配置环境变量：

```bash
cp .env.example .env.local
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

> 在 Windows PowerShell 中直接执行 `npm` 可能被执行策略拦截，建议使用 `cmd /c npm ...`。

## 路由

| 路径 | 页面 | 说明 |
| --- | --- | --- |
| `/` | HomePage | 产品首页，展示价值主张并创建/加入会议 |
| `/pricing` | PricingPage | 商业化套餐、Pro 内测和意向表单 |
| `/record` | RecordPage | 独立录制、字幕、提词器、剪辑和发布入口 |
| `/meeting/:meetingId` | MeetingRoom | 多人会议室 |
| `/settings` | SettingsPage | 主题和语言设置 |

## 核心功能

### AI 录课与录制

- 支持摄像头、屏幕、双画面录制。
- 支持画中画、左右并排、悬浮摄像头等布局。
- 录制完成后可下载 WebM 视频。
- 录制页提供视频剪辑、封面生成、发布工作流入口。

### 自动字幕

- 基于浏览器语音识别生成实时字幕。
- 支持字幕样式设置、自动隐藏和远端字幕展示。
- Pro 功能入口包含 SRT/VTT 字幕导出意向验证。

### 会议总结

- 基于会议转写文本生成摘要。
- 提取要点、待办事项和未解决问题。
- 录制页提供实时表现分析和 AI 辅助问题生成。

### 白板互动

- 支持白板、画笔、橡皮擦和实时同步。
- 支持会议投票、聊天、成员列表等互动能力。

### 商业化验证

- 免费版、Pro 版、Team 版套餐展示。
- Pro 功能点击会记录升级意向。
- 意向表单当前保存在本地，后续可接入后端 CRM 或埋点平台。

### SEO 推广基础

- 首页包含核心关键词：AI 录课、自动字幕、会议总结、白板互动。
- `public/robots.txt` 开放 `/meet/` 抓取。
- `public/sitemap.xml` 收录主要落地页。
- `src/index.html` 内包含 SEO meta 和结构化数据。

## 项目结构

```text
src/
  components/        UI 组件、会议组件、录制组件、商业化入口组件
  hooks/             WebRTC、录制、字幕、提词器、虚拟背景、剪辑等 hooks
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

## 环境变量

| 变量 | 说明 | 位置 |
| --- | --- | --- |
| `DATABASE_URL` | Prisma 数据库连接字符串 | `server/.env` |
| `JWT_SECRET` | JWT 签名密钥，生产必填 | `server/.env` |
| `OPENROUTER_API_KEY` | AI 功能 API Key | `.env.local` 或服务端环境 |
| `AI_MODEL` | AI 模型名称 | 服务端环境 |
| `CORS_ORIGIN` | 生产环境允许的前端来源 | 服务端环境 |
| `ANNOUNCED_IP` | SFU 对外公布 IP | 服务端环境 |

## 后续建议

- 将商业化意向从 `localStorage` 接入后端数据库。
- 将 `/pricing`、`/record`、功能页做预渲染或静态落地页，进一步提升 SEO。
- 提交 `https://www.emai2.cn/meet/sitemap.xml` 到百度搜索资源平台和 Google Search Console。
- 对大体积前端 bundle 做路由级代码拆分。
