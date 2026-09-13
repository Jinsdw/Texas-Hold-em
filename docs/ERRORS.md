# 错误日志

> **规则（硬性要求）**：开发过程中每次遇到报错（编译失败、类型错误、测试失败、运行时错误、依赖冲突、环境问题）必须在此追加一条记录，标明**错误现象、根因、修复方式、验证结果**。修复完成后状态标记为 ✅，暂未解决的标记为 ⏳。

## 索引

| #     | 日期       | 类别     | 简述                                                  | 状态 |
| ----- | ---------- | -------- | ----------------------------------------------------- | ---- |
| E-001 | 2026-09-14 | 依赖管理 | pnpm 11 不再读取 package.json 的 pnpm.onlyBuiltDependencies | ✅   |
| E-002 | 2026-09-14 | 依赖冲突 | @vitejs/plugin-react 4.3.0 与 vite 6 的 peer 依赖不匹配 | ✅   |
| E-003 | 2026-09-14 | 类型错误 | @hono/node-server serve() 宽联合类型导致 tsc 失败       | ✅   |
| E-004 | 2026-09-14 | 环境缺失 | 本机无 Rust 工具链，Tauri 原生窗口无法编译验证          | ⏳   |
| E-005 | 2026-09-14 | 测试失败 | 评估器测试期望值写错（K 高同花顺误当皇家、同花牌不足误判） | ✅   |

---

## E-001 pnpm 11 构建脚本许可配置位置变更

- **日期**：2026-09-14
- **位置**：根 `package.json` / `pnpm-workspace.yaml`
- **报错信息**：`[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: esbuild@0.28.2`，同时警告 `The "pnpm" field in package.json is no longer read by pnpm`；`pnpm lint` 因 `verify-deps-before-run` 触发的隐式 install 失败而连带退出码 1
- **根因**：pnpm 11 出于供应链安全默认阻止依赖的 postinstall 脚本，许可清单从 `package.json` 的 `pnpm.onlyBuiltDependencies` 迁移到了 `pnpm-workspace.yaml` 的新字段 `allowBuilds`（首次运行时 pnpm 会自动写入占位符 `esbuild: set this to true or false`，需手动补全）
- **修复方式**：从 `package.json` 删除 `pnpm` 字段；在 `pnpm-workspace.yaml` 中配置 `allowBuilds: { esbuild: true, "@tailwindcss/oxide": true, "@tauri-apps/cli": true }`，重新 `pnpm install` 确认 esbuild postinstall 执行成功
- **验证**：`pnpm install` 无 ignored builds 警告，`pnpm lint` 通过

## E-002 @vitejs/plugin-react 与 vite 6 peer 依赖不匹配

- **日期**：2026-09-14
- **位置**：`apps/desktop/package.json`
- **报错信息**：`pnpm peers check` 报告 `✕ unmet peer vite — Installed: 6.4.3, Wanted: "^4.2.0 || ^5.0.0"（@vitejs/plugin-react@4.3.0）`
- **根因**：`@vitejs/plugin-react@4.3.0` 发布早于 vite 6，peer 范围未包含 `^6`
- **修复方式**：升级 `@vitejs/plugin-react` 至 `^4.4.0`（该版本 peer 范围纳入 vite 6）
- **验证**：`pnpm peers check` 输出 `No peer dependency issues found`；desktop `tsc` 与 `vite build` 通过

## E-003 @hono/node-server serve() 类型不兼容 ws 挂载

- **日期**：2026-09-14
- **位置**：`apps/server/src/index.ts`
- **报错信息**：`TS2345: Argument of type 'ServerType' is not assignable to parameter of type 'Server<typeof IncomingMessage, typeof ServerResponse>'`（`Http2Server` 缺少 `maxHeadersCount`、`timeout` 等属性）
- **根因**：`serve()` 的返回类型是含 Http2 变体的宽联合 `ServerType`；未传 `createServer` override 时实际创建的是标准 `node:http` Server，但类型系统无法自动收窄
- **修复方式**：在调用处显式收窄：`createWebSocketServer(server as HttpServer)`，并加注释说明该联合类型的实际行为；`createWebSocketServer` 参数类型保持严格的 `HttpServer`
- **验证**：`pnpm --filter @holdem/server typecheck` 通过；服务端实际启动 + `/health` + WebSocket 握手实测正常

## E-005 评估器测试期望值写错（测试错误，非实现错误）

- **日期**：2026-09-14
- **位置**：`apps/server/src/game/evaluator.test.ts`
- **报错信息**：`expected 8 to be 9`（StraightFlush vs 期望 RoyalFlush）；`expected +0 to be 8`（HighCard vs 期望 StraightFlush）
- **根因**：两个测试用例的扑克学期望写错——① 公共牌 9♣10♣J♣Q♣K♣ 是 **K 高同花顺**（straight high=13），不是皇家同花顺（皇家必须 10-A）；② 6 张场景 A♥K♥+Q♥J♥ 只有 **4 张同花色**，5 张组合里凑不成同花，评估器正确返回高牌 A。评估器实现本身正确
- **修复方式**：① 期望改为 `StraightFlush + [13]`；② 公共牌改为 4 张同花（补 10♥），断言 StraightFlush
- **验证**：32 个测试全部通过

## E-004 本机缺少 Rust 工具链（待处理）

- **日期**：2026-09-14
- **位置**：本机环境（影响 `apps/desktop/src-tauri`）
- **报错信息**：`cargo: command not found`、`rustc: command not found`（`C:/Users/Z/.cargo/bin` 不存在，系统 PATH 中亦无）
- **根因**：未安装 Rustup / Rust stable-msvc 工具链
- **修复方式（计划）**：安装 Visual Studio 生成工具（C++ 桌面开发）→ `winget install Rustlang.Rustup` → `rustup default stable-msvc` → 运行 `pnpm tauri dev` 补验原生窗口
- **验证**：待处理。当前影响范围仅 `pnpm tauri dev / tauri build`；TS 编译、Vite 构建/开发服务器、全部测试门禁不受影响
