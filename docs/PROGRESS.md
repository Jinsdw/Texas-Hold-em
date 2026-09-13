# 项目进度

**最后更新**：2026-09-14 04:20
**当前阶段**：M5 持久化与账号（进行中）
**整体完成度**：约 78%

> 文档同步范围（硬性要求）：每次代码更新后按顺序执行 **CHANGELOG → PROGRESS → ROADMAP → README（依赖清单 + 启动步骤）→ git commit（Conventional Commits，一个原子任务一次提交）**。
> **报错规则（硬性要求）**：遇到任何报错（编译/类型/测试/运行时/依赖/环境）必须记录到 [ERRORS.md](ERRORS.md)：错误现象、根因、修复方式、验证结果；随当次提交一并入库。

## 当前正在进行的任务

- [ ] M5-2 账号注册/登录（scrypt + REST + WS 绑定）

## 已完成任务（最近 10 条）

- [x] 2026-09-14 M5-1 数据库层与 schema（71 测试通过）

- [x] 2026-09-14 M4-2/M4-3 牌桌 UI 与页面（浏览器实测通过）

- [x] 2026-09-14 M4-1 WS 客户端封装与状态 store

- [x] 2026-09-14 M3-3/M3-4 WS 分发层与双客户端冒烟全流程通过

- [x] 2026-09-14 M3-2 RoomManager 房间管理器（11 测试通过）

- [x] 2026-09-14 M3-1 共享消息协议与类型守卫

- [x] 2026-09-14 M2-6 覆盖率 88.75% + M2 全量验收全绿（lint/typecheck/57 测试）

- [x] 2026-09-14 M2-5 摊牌与边池结算（6 测试通过，修复尾部空池 E-008）

- [x] 2026-09-14 M2-4 下注轮次状态机（15 测试通过，修复庄家轮转与 run-out 特判 E-007）

- [x] 2026-09-14 M2-3 边池计算（5 测试通过，修复负贡献缺陷 E-006）

- [x] 2026-09-14 M2-2 手牌评估器 7 选 5（20 测试通过，含皇家同花顺/轮子/平局/公共牌打法）

- [x] 2026-09-14 M2-1 牌组生成 + Fisher-Yates 洗牌（6 测试通过，可注入种子 RNG）

- [x] 2026-09-14 新增 docs/ERRORS.md 错误日志（回填 M1 的 4 条错误：pnpm 11 allowBuilds、plugin-react peer、hono serve 类型、Rust 缺失）并纳入硬性同步规则
- [x] 2026-09-14 git 仓库初始化，按 M1 任务粒度回填 6 个提交，新增「每任务一提交」规范并忽略 .zcode/
- [x] 2026-09-14 M1-5 全量验收通过（lint / typecheck / test + 服务端与前端手动验证）
- [x] 2026-09-14 M1-4 @holdem/server（Hono /health 200 + WebSocket welcome 实测通过）
- [x] 2026-09-14 M1-3 @holdem/desktop 前端 + Tauri 2 壳（typecheck/build/图标验证通过）
- [x] 2026-09-14 M1-2 @holdem/shared 核心类型与常量（tsc + vitest 通过）
- [x] 2026-09-14 M1-1 pnpm workspace 初始化（install + lint 验证通过）
- [x] 2026-09-14 初始化 docs/ROADMAP.md、docs/PROGRESS.md、docs/CHANGELOG.md

## 已知问题 / 技术债

- [ ] 本机未安装 Rust 工具链（cargo/rustc 缺失）：Tauri 原生窗口（pnpm tauri dev）暂未实测，需安装 VS 生成工具 + rustup 后补验；浏览器开发模式与全部 CI 门禁不受影响
- [ ] eslint 9.39.5 有 deprecated 提示（eslint 10 尚未被 typescript-eslint 8 支持），暂不升级

## 下一步计划

1. 用户确认后进入 M2 核心游戏引擎（纯函数、无 IO），每个子任务完成后 git commit
2. M2 任务顺序：牌组与洗牌 → 发牌 → 手牌评估器（7 选 5）→ 下注轮次状态机 → 边池 → 摊牌 → 单元测试（覆盖率目标 80%）
3. 补验项：安装 Rust 后运行 pnpm tauri dev 验证原生窗口
