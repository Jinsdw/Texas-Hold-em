# Changelog

本项目所有显著变更都记录在此文件中。
格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [Unreleased]

### 2026-09-14（M2-6）—— M2 完成

- Added: 覆盖率工具 @vitest/coverage-v8（^3.2.7 与 vitest 对齐）+ pnpm test:coverage 脚本；引擎行覆盖 88.75%（目标 80%）
- Changed: tsconfig base 升级 ES2023（支持 findLastIndex）
- Verified: M2 验收全绿——lint / typecheck / 57 测试 / 覆盖率

### 2026-09-14（M2-5）

- Added: 摊牌结算 resolveShowdown——按边池分层比较手牌、平分底池、余数按庄家后座位分配、摊牌公开信息（reveals）；接入引擎 run-out 与 river 收官流程；6 个单元测试
- Fixed: buildPots 尾部空池未合并（弃牌者多投金额悬空），详见 ERRORS.md E-008

### 2026-09-14（M2-4）

- Added: 下注轮次状态机——startHand（庄家轮转/发牌/盲注/单挑规则）、applyAction（fold/check/call/raise/all-in 裁决与最小加注校验）、加注重开行动义务、all-in 短注不重开、BB option、轮次自动推进、legalActionsFor 金额边界、toPublicState 公共快照；15 个单元测试
- Fixed: 庄家轮转取到自己不移动（dealerSeat 改 -1 起始 + 从下一座起找）；唯一可行动者已匹配且对手全 all-in 时直接 run-out，详见 ERRORS.md E-007

### 2026-09-14（M2-3）

- Added: 边池计算 buildPots——按投入层级切分主池/边池、弃牌者计入但无资格；5 个单元测试
- Fixed: 修复分层公式负贡献缺陷（未 clamp 到 [prev, level] 区间导致边池金额被抵消），详见 ERRORS.md E-006

### 2026-09-14（M2-2 补丁）

- Fixed: 评估器 6 张场景测试期望再次修正（10-A 同花即皇家同花顺，期望 RoyalFlush），测试全绿后补交

### 2026-09-14（M2-2）

- Added: 手牌评估器——evaluateFive 5 张判定全部 10 种牌型、evaluateBest 7 选 5、compareEvaluations 决胜比较；20 个单元测试
- Fixed: 修正评估器测试中两处扑克学期望错误（K 高同花顺≠皇家；同花色不足 5 张不成同花），详见 ERRORS.md E-005

### 2026-09-14（M2-1）

- Added: 游戏引擎牌组模块——createDeck 52 张有序牌 + Fisher-Yates 洗牌（纯函数，支持注入种子 RNG）；单元测试 6 例
- Added: scripts/sync-docs.mjs 文档同步工具（CHANGELOG/ROADMAP/PROGRESS 一键更新）

### 2026-09-14（第 8 次更新）

- Added: `docs/ERRORS.md` 错误日志——记录错误现象、根因、修复方式、验证结果；回填 M1 的 4 条记录（pnpm 11 allowBuilds 迁移、plugin-react peer 升级、hono serve 类型收窄、Rust 工具链缺失待办）
- Changed: 「遇错必记 ERRORS.md」纳入 PROGRESS 硬性同步规则与 README

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
