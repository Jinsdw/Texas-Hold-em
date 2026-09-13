# 项目进度

**最后更新**：2026-09-14 03:14
**当前阶段**：M1 项目脚手架 ✅ 已完成（等待确认进入 M2）
**整体完成度**：约 18%

> 文档同步范围（硬性要求）：每次代码更新后同步 CHANGELOG → PROGRESS → ROADMAP → **README（依赖清单 + 启动步骤）**。

## 当前正在进行的任务

（无——M1 已全部完成并通过验收，等待用户确认后进入 M2）

## M1 验收结果

- `pnpm lint` ✅　`pnpm typecheck`（shared / desktop / server 三包）✅　`pnpm test`（5 例）✅
- 服务端实测：`GET /health` 返回 200；`ws://localhost:3000/ws` 握手成功并收到 welcome 消息；停止后端口正常释放
- 桌面端实测：`tsc --noEmit`、`vite build`、Vite dev server（localhost:5173）均通过；`tauri icon` 全套图标已生成

## 已完成任务（最近 10 条）

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

1. 用户确认后进入 M2 核心游戏引擎（纯函数、无 IO）
2. M2 任务顺序：牌组与洗牌 → 发牌 → 手牌评估器（7 选 5）→ 下注轮次状态机 → 边池 → 摊牌 → 单元测试（覆盖率目标 80%）
3. 补验项：安装 Rust 后运行 pnpm tauri dev 验证原生窗口
