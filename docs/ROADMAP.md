# 项目路线图

德州扑克联机桌面游戏（Tauri 2 + React 19 + Hono + WebSocket + SQLite）

## M1 项目脚手架 ✅

- [x] M1-1 pnpm workspace 初始化（根 package.json、pnpm-workspace.yaml、tsconfig base、ESLint/Prettier、Vitest）
- [x] M1-2 shared 包核心类型定义（Card / Player / GameState / Action / HandRank）
- [x] M1-3 Tauri + React 客户端初始化（能启动空白窗口）※ TypeScript/Vite 构建已验证；原生窗口启动待本机安装 Rust 后补验（浏览器模式不受影响）
- [x] M1-4 Hono + WebSocket 服务端初始化（能响应 /health）
- [x] M1-5 M1 验收：lint / typecheck / test 全绿，手动验证通过

## M2 核心游戏引擎（下一个阶段）

- [x] 牌组生成与 Fisher-Yates 洗牌
- [ ] 发牌逻辑（手牌 2 张 + 公共牌 5 张）
- [ ] 手牌评估器（7 选 5 最佳）
- [ ] 下注轮次状态机（blind / action order / raise 重新行动）
- [ ] all-in 与边池（side pot）计算
- [ ] 摊牌与胜负判定、平分底池
- [ ] 单元测试（Vitest，覆盖皇家同花顺、平局、边池等边界）

## M3 房间与联机

- [ ] 房间模型与创建/加入/离开
- [ ] WebSocket 消息协议（packages/shared/protocol）
- [ ] 服务器广播机制
- [ ] 断线重连（playerId + token）
- [ ] 观战模式

## M4 桌面端 UI

- [ ] 牌桌布局（椭圆形座位环绕）
- [ ] 自己手牌 + 公共牌展示
- [ ] 操作面板（Fold / Check / Call / Raise 滑块）
- [ ] 筹码、底池、当前行动玩家高亮
- [ ] Zustand store 与 WebSocket 事件绑定
- [ ] 动画与音效

## M5 持久化与账号

- [ ] Drizzle schema（users / games / hands）
- [ ] 简易账号（用户名 + 密码 hash）
- [ ] 对局记录写入

## M6 打磨与发布

- [ ] 语音聊天（LiveKit，可选）
- [ ] Tauri 打包（Windows / macOS）与签名
- [ ] 端到端测试
