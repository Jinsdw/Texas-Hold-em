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
| E-006 | 2026-09-14 | 逻辑缺陷 | 边池分层公式产生负贡献，经典三级 all-in 第三池被抵消为 0 | ✅   |
| E-007 | 2026-09-14 | 逻辑缺陷 | 庄家轮转取到自己不移动；唯一可行动者已匹配时应直接 run-out | ✅   |
| E-008 | 2026-09-14 | 逻辑缺陷 | 边池空档防御只处理头部，尾部无人可领的池未合并（弃牌者多投分） | ✅   |
| E-009 | 2026-09-14 | 依赖冲突 | @vitest/coverage-v8 5.x 需 vitest 5；findLastIndex 需 ES2023 lib | ✅   |

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

## E-009 覆盖率工具版本不匹配与 ES2023 API

- **日期**：2026-09-14
- **位置**：根 package.json（devDependencies）、tsconfig.base.json
- **报错信息**：① `pnpm peers check` 报 @vitest/coverage-v8@5.0.0 要求 vitest 5.0.0（实际 3.2.7），运行时报 loadProvider 初始化失败；② `TS2550: Property 'findLastIndex' does not exist... Try changing the 'lib' compiler option to 'es2023'`
- **根因**：① pnpm add 未锁大版本，装到了适配 vitest 5 的 coverage-v8 5.x；② pots.ts 使用了 ES2023 的 `Array.findLastIndex`，而 tsconfig lib 为 ES2022
- **修复方式**：① 安装 `@vitest/coverage-v8@^3.2.7` 与 vitest 大版本对齐；② tsconfig.base 的 target/lib 升级为 ES2023（Vite 构建目标与 Node 22 均支持）
- **验证**：peers check 通过；lint/typecheck/57 测试/覆盖率报告全绿
- **教训**：vitest 生态插件（coverage/ui/ui-vue 等）版本必须与 vitest 本体大版本一致；使用新数组 API 前确认 tsconfig lib 等级

## E-008 边池尾部空档未合并

- **日期**：2026-09-14
- **位置**：`apps/server/src/game/pots.ts`（buildPots 防御逻辑）
- **报错信息**：摊牌测试 `奇数底池余数按庄家后座位分配` 失败——预期单池 301，实际得到 300 + 空池 1
- **根因**：防御性合并只处理了"头部空池"（firstClaimable 之前），而本用例空池在**尾部**：弃牌者 x 投入 101 形成 [100,101] 两层，101 层唯一贡献者已弃牌、无人可领，那 1 分悬空
- **修复方式**：增加尾部合并——`findLastIndex` 找最后一个可领取池，其后所有空池金额并入；与头部合并逻辑对称
- **验证**：57 个测试全部通过
- **教训**：边界防御要同时考虑序列两端（头部/尾部）；测试构造"弃牌者多投"场景正好补上了这个盲区

## E-007 状态机：庄家轮转失效与 run-out 特判缺失

- **日期**：2026-09-14
- **位置**：`apps/server/src/game/engine.ts`（startHand / settleAfterAction）及 engine.test.ts 多处期望
- **报错信息**：9 个状态机测试失败（`expected 0 to be 1`、`expected 'pre-flop' to be 'showdown'` 等）
- **根因**：① `seatingOrderFrom(state, dealerSeat)[0]` 含起始座位自身，庄家"轮转"永远取到自己；② 对手全部 all-in、唯一可行动玩家下注已匹配时（如单挑 all-in 补齐大盲），大盲的 option 行动毫无意义，原实现等待其行动导致卡在 pre-flop；③ 多处测试期望的座位/金额核算错误（三人局 b 是小盲不是大盲、盲注已含在 totalContribution 中勿双算、postflop 行动从庄家后开始而非固定 c 先动、克隆状态后断言了旧引用）
- **修复方式**：① 轮转改为 `seatingOrderFrom(state, dealerSeat + 1)[0]`，createTable 初始 dealerSeat=-1（首手从座位 0 起定庄）；② settleAfterAction 增加特判：canAct 仅剩 1 人且 matched 且存在 all-in 对手 → 直接 runOutBoard；③ 重写测试期望并逐条人工核算
- **验证**：52 个测试全部通过
- **教训**：环形座位运算中"从 X 开始"与"从 X 之后开始"必须显式区分；状态机测试失败时先核对扑克规则再改代码，避免把正确实现改错

## E-006 边池分层公式产生负贡献

- **日期**：2026-09-14
- **位置**：`apps/server/src/game/pots.ts`（buildPots）
- **报错信息**：测试 `经典三级 all-in：A500 B300 C100` 失败——第三池 `expected 200, received 0`
- **根因**：分层公式 `amount += Math.min(contrib, level) - prev` 没有下限截断：玩家 C 只投入 100，在计算 [300,500] 层时 `min(100,500) - 300 = -200`，负贡献恰好抵消了 A 该层的 200，边池凭空消失
- **修复方式**：改为 `Math.max(0, Math.min(contrib, level) - prev)`——每个玩家对一层的贡献是投入被钳制到 `[prev, level]` 区间后的增量，不足 prev 记 0
- **验证**：修复后 5 个边池测试 + 全部 37 个测试通过；同时修正了"弃牌者"用例中 b（投入 100、未弃牌）应享有主池资格的期望错误
- **教训**：分层/区间类公式要显式 clamp 到 `[prev, level]`；测试期望要先按规则人工核算每个玩家的资格与金额

## E-005 评估器测试期望值写错（测试错误，非实现错误）

- **日期**：2026-09-14
- **位置**：`apps/server/src/game/evaluator.test.ts`
- **报错信息**：`expected 8 to be 9`（StraightFlush vs 期望 RoyalFlush）；`expected +0 to be 8`（HighCard vs 期望 StraightFlush）
- **根因**：两个测试用例的扑克学期望写错——① 公共牌 9♣10♣J♣Q♣K♣ 是 **K 高同花顺**（straight high=13），不是皇家同花顺（皇家必须 10-A）；② 6 张场景 A♥K♥+Q♥J♥ 只有 **4 张同花色**，5 张组合里凑不成同花，评估器正确返回高牌 A。评估器实现本身正确
- **修复方式**：① 期望改为 `StraightFlush + [13]`；② 公共牌改为 4 张同花（补 10♥）。首次修复时又把 10♥ 的期望写成 StraightFlush——**A♥K♥Q♥J♥10♥ 恰是皇家同花顺**（第二次期望错误，actual=9 才正确），最终期望改为 `RoyalFlush + [14]`
- **验证**：32 个测试全部通过
- **教训**：扑克手牌期望值应先人工核对牌面（10-A 同花=皇家；不足 5 张同花色=不成同花），并且必须在测试全绿后再执行 commit

## E-004 本机缺少 Rust 工具链（待处理）

- **日期**：2026-09-14
- **位置**：本机环境（影响 `apps/desktop/src-tauri`）
- **报错信息**：`cargo: command not found`、`rustc: command not found`（`C:/Users/Z/.cargo/bin` 不存在，系统 PATH 中亦无）
- **根因**：未安装 Rustup / Rust stable-msvc 工具链
- **修复方式（计划）**：安装 Visual Studio 生成工具（C++ 桌面开发）→ `winget install Rustlang.Rustup` → `rustup default stable-msvc` → 运行 `pnpm tauri dev` 补验原生窗口
- **验证**：待处理。当前影响范围仅 `pnpm tauri dev / tauri build`；TS 编译、Vite 构建/开发服务器、全部测试门禁不受影响
