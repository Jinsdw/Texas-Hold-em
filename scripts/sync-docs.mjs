// 文档同步工具：按硬性规则更新 CHANGELOG / ROADMAP / PROGRESS。
// 用法：node scripts/sync-docs.mjs '<json>'
// JSON 字段（全部可选，按需提供）：
//   changelogEntry  —— 插入到 [Unreleased] 下的整段条目（不含日期行缩进）
//   roadmapCheck    —— ROADMAP 中要勾选的任务文本（- [ ] X → - [x] X，可传数组）
//   roadmapNote     —— ROADMAP 中对勾选行追加的备注（仅对单个 roadmapCheck 生效）
//   stage           —— PROGRESS 当前阶段
//   percent         —— PROGRESS 整体完成度
//   currentTask     —— PROGRESS "当前正在进行的任务" 区块内容（多行字符串）
//   doneEntry       —— PROGRESS "已完成任务" 追加一条（含日期前缀）
//   nextSteps       —— PROGRESS "下一步计划" 整块替换（多行字符串）
import { readFileSync, writeFileSync } from 'node:fs';

const arg = process.argv[2];
if (!arg) {
  console.error("用法: node scripts/sync-docs.mjs '<json>'");
  process.exit(1);
}
const opts = JSON.parse(arg);
const now = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

function patch(file, fn) {
  const before = readFileSync(file, 'utf8');
  const after = fn(before);
  if (after !== before) writeFileSync(file, after, 'utf8');
}

if (opts.changelogEntry) {
  patch('docs/CHANGELOG.md', (t) =>
    t.replace('## [Unreleased]\n', `## [Unreleased]\n\n### ${opts.changelogEntry}\n`),
  );
}

if (opts.roadmapCheck) {
  const checks = Array.isArray(opts.roadmapCheck) ? opts.roadmapCheck : [opts.roadmapCheck];
  patch('docs/ROADMAP.md', (t) => {
    let out = t;
    for (const c of checks) {
      out = out.replace(
        `- [ ] ${c}`,
        `- [x] ${c}${opts.roadmapNote ? `（${opts.roadmapNote}）` : ''}`,
      );
    }
    return out;
  });
}

if (opts.stage || opts.percent) {
  patch('docs/PROGRESS.md', (t) =>
    t
      .replace(/\*\*当前阶段\*\*：.*/, opts.stage ? `**当前阶段**：${opts.stage}` : '$&')
      .replace(/\*\*最后更新\*\*：.*/, `**最后更新**：${now()}`)
      .replace(/\*\*整体完成度\*\*：.*/, opts.percent ? `**整体完成度**：${opts.percent}` : '$&'),
  );
}

if (opts.currentTask !== undefined) {
  patch('docs/PROGRESS.md', (t) =>
    t.replace(
      /## 当前正在进行的任务\n\n[\s\S]*?\n\n## 已完成任务/,
      `## 当前正在进行的任务\n\n${opts.currentTask}\n\n## 已完成任务`,
    ),
  );
}

if (opts.doneEntry) {
  patch('docs/PROGRESS.md', (t) =>
    t.replace(
      '## 已完成任务（最近 10 条）\n',
      `## 已完成任务（最近 10 条）\n\n- [x] ${opts.doneEntry}\n`,
    ),
  );
}

if (opts.nextSteps !== undefined) {
  patch('docs/PROGRESS.md', (t) =>
    t.replace(/## 下一步计划\n\n[\s\S]*$/, `## 下一步计划\n\n${opts.nextSteps}\n`),
  );
}

console.log('docs synced');
