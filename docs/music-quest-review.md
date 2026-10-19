# Music Quest 接手审核（2026-10-19）

## 范围与修复

审核来源：本地 `feature/music-quest` 提交 `63befe5`，基线 `main@782829e`。已通读交接、开发记录、人工复核记录及模块核心实现，并核对原站仅增加两处入口。

修复两项统计问题：

1. 键盘音阶错按后最终完成时，原实现没有将该题计入关卡正确率分母和错题回顾；现在计为一次非首次正确作答，并进入薄弱题和次日复习。
2. 选择题先错后对时，原实现将重试重复计入家长作答总数与技能近期记录；现在重试更新题目状态、复习日期和 XP，但首次作答统计只计一次。

补充 Bravura 字体 SIL OFL 1.1 许可证（上游 `steinbergmedia/bravura` 的 `bravura-1.392/LICENSE.txt`），与现有 VexFlow MIT 许可证并存。

VexFlow 文件与 `https://cdn.jsdelivr.net/npm/vexflow@4.2.3/build/cjs/vexflow-bravura.js` 逐字节 SHA-256 一致：`f0878cdc1e6bf5c52149ce377ffd400c2856ceb4d96018631308473c690af645`。

## 本地验证

- 原交接单元测试：48/48 通过；修复后增加 2 项统计回归：50/50 通过。
- 原浏览器 E2E：44/44 通过（本机 Google Chrome，含 375px 触屏视口）。
- 修复后浏览器 E2E：47/47 通过，新增重试计数、键盘错按分母和键盘薄弱题记录回归。
- 已查看手机侦探页截图：乐谱分行、文字和选项可读。
- 本地 `/music-theory` 返回 301 到 `/music-theory/`；`js/main.js` 返回 `text/javascript`。
- 本机无 npm 命令，使用 bundled Node v24.19.0 直接执行 package.json 中同一 `node --test` 命令；浏览器工具使用已有 playwright-core，没有增加依赖清单。

## 生产核验与部署门槛

2026-10-19 HTTP 实测：Worker 根目录、`/music-theory`、`/music-theory/`、`/music-theory/js/main.js` 均对匿名请求返回 401 JSON/no-store。此结果只能证明匿名请求被拦截，不能证明模块已存在、认证后的目录重定向或 JS MIME 正确。`https://tongtong2016.com/music-theory/` 返回 404。

用户指出 Worker 在 Mac mini 的童童空间项目，并明确授权向现有聊天发送接续消息，核查及部署。通过该项目聊天只读预检得知：

- 项目路径 `/Volumes/LaCie/Codex/20260916 童童学习空间`。
- 构建 `scripts/build_assets.py` → `dist/` → `worker/wrangler.jsonc`；尚未包含 Music Quest。
- `run_worker_first: true`，认证在资源之前。
- 最近法语修复六文件与已发布基线一致，现有首页和小提琴页含近期课程；应定点插入入口，禁止整体覆盖为本仓库旧页面。
- 最近已验证 Worker 版本 `010a0cb8-3912-4fb7-9766-fdd89b8d4398`；发布前必须再次查询实时版本。

正式发布前仍必须完成：认证下资源与入口核验、无斜杠重定向、JS MIME、逐字节资源比对和旧模块回归；iPhone/iPad Safari 真机声音解锁及节奏测试。Mac mini 会话当前报告 Cloudflare DNS 失败，尚未部署。

使用 Worker 作为唯一学习入口，避免两个源产生独立进度。GitHub 经 PR 审查，不直接写 main；合并会发布公开 Pages，须明确处理此公开副本和源隔离问题。未改动生产数据。

## 回滚

Pages 若最终通过 PR 合并，使用对应合并方式的 revert 经 PR 回滚。Worker 为独立发布，必须另行恢复发布前记录的 Worker 版本或资产快照；仅 revert GitHub 提交不能回滚 Worker。两者均不清除浏览器学习进度。
