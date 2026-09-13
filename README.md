# Texas Hold'em Desktop

联机德州扑克桌面游戏。**服务器是唯一裁判**：洗牌、发牌、下注裁决全部在服务端完成，客户端只展示状态并发送玩家意图。

## 技术栈

- 桌面壳：Tauri 2.x
- 前端：React 19 + TypeScript + Vite + Zustand + Tailwind CSS
- 服务端：Node.js + Hono + WebSocket（ws）
- 数据库：SQLite + Drizzle ORM（M5 接入）
- Monorepo：pnpm workspace

## 当前进度

M1 项目脚手架 ✅ 已完成——详见 [docs/PROGRESS.md](docs/PROGRESS.md)

## 环境要求

| 工具                          | 版本要求            | 用途                | 是否必需                                                  |
| ----------------------------- | ------------------- | ------------------- | --------------------------------------------------------- |
| Node.js                       | ≥ 20（本机 v22）    | 前端 / 服务端运行时 | ✅ 必需                                                   |
| pnpm                          | ≥ 10（本机 v11.22） | monorepo 包管理     | ✅ 必需                                                   |
| Rust（stable-msvc）+ WebView2 | 最新 stable         | 编译 Tauri 原生窗口 | ⚠️ 仅 `pnpm tauri dev` / 打包需要；纯浏览器开发模式不需要 |

> Rust 安装（仅首次需要）：安装 [Visual Studio 生成工具（C++ 桌面开发）](https://visualstudio.microsoft.com/zh-hans/visual-cpp-build-tools/) 后，运行 `winget install Rustlang.Rustup`，然后 `rustup default stable-msvc`。Windows 10/11 一般已自带 WebView2。

## 目录结构

```
texas-holdem/
├── apps/
│   ├── desktop/          # Tauri + React 客户端（src-tauri/ 为 Rust 壳）
│   └── server/           # Hono + WebSocket 服务端
├── packages/
│   └── shared/           # 前后端共享类型与常量
├── docs/                 # ROADMAP / PROGRESS / CHANGELOG
├── pnpm-workspace.yaml
└── package.json
```

## 依赖清单（当前）

### 根（开发工具，`package.json`）

| 包                                                      | 用途                             |
| ------------------------------------------------------- | -------------------------------- |
| typescript ^5.6                                         | TypeScript 编译器（strict 模式） |
| vitest ^3                                               | 单元测试框架                     |
| eslint ^9 + @eslint/js + typescript-eslint ^8 + globals | 代码检查（flat config，禁 any）  |
| prettier ^3                                             | 代码格式化                       |

### packages/shared（`@holdem/shared`）

无运行时依赖（纯类型与常量，TS 源码直接被前后端引用）。

已定义：`Suit/Rank/Card`、`Player/PlayerStatus`、`PlayerAction`（fold/check/call/raise/all-in 判别联合）、`GamePhase/GameState/BlindStructure`、`HandRank` 枚举、`HandEvaluation`、扑克常量（SUITS/RANKS/默认盲注/人数上限）。

### apps/desktop（`@holdem/desktop`）

| 包                                       | 类型   | 用途                                 |
| ---------------------------------------- | ------ | ------------------------------------ |
| react / react-dom ^19                    | 运行时 | UI 框架                              |
| zustand ^5                               | 运行时 | 客户端状态管理                       |
| @tauri-apps/api ^2                       | 运行时 | Tauri 桌面 API（窗口、事件）         |
| @holdem/shared                           | 运行时 | 共享类型（workspace 链接）           |
| vite ^6 + @vitejs/plugin-react ^4.4      | 开发   | 构建与开发服务器                     |
| tailwindcss ^4 + @tailwindcss/vite ^4    | 开发   | 样式（CSS-first，无需配置文件）      |
| @tauri-apps/cli ^2                       | 开发   | tauri dev / tauri build / tauri icon |
| typescript ^5.6 + @types/react(-dom) ^19 | 开发   | 类型检查                             |

### apps/server（`@holdem/server`）

| 包                             | 类型   | 用途                                     |
| ------------------------------ | ------ | ---------------------------------------- |
| hono ^4                        | 运行时 | HTTP 框架（REST + 健康检查）             |
| @hono/node-server ^1           | 运行时 | Node 适配层（serve）                     |
| ws ^8                          | 运行时 | WebSocket（挂载于 /ws，M3 接入游戏协议） |
| @holdem/shared                 | 运行时 | 共享类型（workspace 链接）               |
| tsx ^4                         | 开发   | TS 直跑 + watch 模式                     |
| @types/node ^22 + @types/ws ^8 | 开发   | 类型定义                                 |

## 启动步骤

```bash
# 1. 安装全部依赖
pnpm install

# 2. 代码质量检查
pnpm lint        # ESLint
pnpm typecheck   # 全部包 tsc --noEmit
pnpm test        # Vitest

# 3. 启动游戏服务端（默认 3000 端口，PORT 环境变量可改）
pnpm dev:server
#   健康检查:  http://localhost:3000/health → {"status":"ok",...}
#   WebSocket: ws://localhost:3000/ws（连接即收到 welcome 消息）
#   WS 冒烟:   pnpm --filter @holdem/server smoke:ws

# 4. 桌面端·浏览器开发模式（无需 Rust）
pnpm dev:desktop # → http://localhost:5173

# 5. 桌面端·原生窗口模式（需要 Rust 工具链，首次编译约 5–15 分钟）
pnpm tauri dev

# 6. 桌面端生产构建（需要 Rust）
pnpm --filter @holdem/desktop build   # 仅前端 → dist/
pnpm tauri build                      # 完整安装包
```

## Git 工作流

- 每完成一个**原子任务**（无论大小）立即 `git commit`，与进度文档同步同批完成
- 提交信息遵循 Conventional Commits：`feat:` / `fix:` / `docs:` / `chore:` / `test:`，描述用中文
- M1 阶段的提交按任务粒度回填（docs 初始化 → workspace → shared → desktop → server → 验收）
- `.zcode/`、`node_modules/`、`dist/`、`src-tauri/target/`、`*.db` 均已忽略

## 错误日志

开发中遇到的每个报错（编译 / 类型 / 测试 / 运行时 / 依赖 / 环境）都记录在 [docs/ERRORS.md](docs/ERRORS.md)，包含错误现象、根因、修复方式与验证结果。

## 进度文档

- [docs/ROADMAP.md](docs/ROADMAP.md) — 里程碑规划
- [docs/PROGRESS.md](docs/PROGRESS.md) — 任务进度主文件
- [docs/CHANGELOG.md](docs/CHANGELOG.md) — 变更日志
- [docs/ERRORS.md](docs/ERRORS.md) — 错误日志（报错现象 / 根因 / 修复方式 / 验证结果）
