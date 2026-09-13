# Changelog

本项目所有显著变更都记录在此文件中。
格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [Unreleased]

### 2026-09-14（第 7 次更新）

- Added: git 仓库初始化（main 分支），按 M1 任务粒度回填 6 个提交（docs/workspace/shared/desktop/server/验收）
- Added: 「每个原子任务完成即 git commit」规范，记录于 README Git 工作流章节与 PROGRESS 文档同步规则
- Changed: .gitignore 增加 .zcode/（ZCode 会话数据）

### 2026-09-14（第 6 次更新）—— M1 完成

- Added: README.md 项目文档（环境要求 / 分包依赖清单 / 详细启动步骤），并纳入每次更新的同步范围
- Changed: 全仓 Prettier 格式化
- Verified: pnpm lint + typecheck（3 包）+ test（5 例）全绿；服务端 /health 与 WS welcome、前端 Vite dev/build 实测通过

### 2026-09-14（第 5 次更新）

- Added: `@holdem/server`——Hono 应用工厂（createApp）+ `/health` 端点 + tsx watch 开发脚本
- Added: WebSocket 通路（ws 库，HTTP upgrade 挂载于 /ws，M1 为 welcome/回显占位，M3 换正式协议）
- Added: health 单元测试与 scripts/ws-smoke.mjs 冒烟脚本
- Fixed: @hono/node-server 返回宽联合类型导致的 tsc 报错（收窄为 node:http Server）

### 2026-09-14（第 4 次更新）

- Added: `@holdem/desktop` 前端骨架（React 19 + Vite 6 + Tailwind 4 + Zustand 连接状态 store，tsc + vite build 通过）
- Added: Tauri 2 Rust 壳（Cargo.toml / main.rs / tauri.conf.json / capabilities），标识符 com.holdem.desktop
- Added: `tauri icon` 全套应用图标（scripts/generate-icon.mjs 生成占位源图）
- Fixed: @vitejs/plugin-react 升至 ^4.4 以兼容 vite 6（peer 检查通过）

### 2026-09-14（第 3 次更新）

- Added: `@holdem/shared` 包——Suit/Rank/Card、Player/PlayerStatus、PlayerAction（fold/check/call/raise/all-in 判别联合）、GamePhase/GameState/BlindStructure、HandRank 枚举与 HandEvaluation
- Added: 扑克常量（SUITS/RANKS/发牌张数/默认筹码与盲注/人数上限）及单元测试（4 例通过）

### 2026-09-14（第 2 次更新）

- Added: pnpm workspace 根配置（package.json、pnpm-workspace.yaml、tsconfig.base.json、.gitignore）
- Added: ESLint 9 flat config（禁 any、强制 type-imports）+ Prettier + 根级 Vitest
- Fixed: pnpm 11 下构建脚本许可迁移至 pnpm-workspace.yaml 的 allowBuilds 字段

### 2026-09-14

- Added: 初始化进度管理文档 `docs/ROADMAP.md`（M1–M6 里程碑规划）
- Added: 初始化 `docs/PROGRESS.md`（任务进度主文件）
- Added: 初始化 `docs/CHANGELOG.md`（变更日志）
