# Music Quest · 乐理冒险岛 — 部署交接文档（Claude → ChatGPT）

> 版本 v1.0.0 · 2026-10-19 · 作者：Claude（本地开发、测试）  
> **本次开发没有部署、没有 push、没有改动任何线上配置或生产数据。** 部署由接手工程师审核后执行。

---

## 0. 一页摘要

| 项 | 内容 |
|---|---|
| 仓库 | `atomTONG83/TONGTONG2016-French`（GitHub Pages，`CNAME = tongtong2016.com`） |
| 工作分支 | `feature/music-quest`（基于 `main` @ `782829e`） |
| 新模块 | `/music-theory/`（静态、零构建、哈希路由） |
| 改动的旧文件 | `index.html`（+1 行入口卡片）、`violin_learning_hub.html`（+7 行入口链接） |
| 新依赖 | 运行时：vendored VexFlow 4.2.3 单文件（MIT）。开发：无（测试用 Node 内置 `node:test`） |
| 数据 | 仅浏览器 localStorage 新键 `tt_music_quest_v1`、`tt_mq_bpm`；**无数据库迁移、无云端写入** |
| 测试 | 单元测试 48/48 通过；端到端 44/44 通过（Chromium，桌面 + 375px 手机） |
| **部署前必须决定** | 生产首页实际由 Cloudflare Worker 提供（见 §8），Worker 源码不在本仓库 |

---

## 1. 修改清单

### 新增

| 路径 | 作用 |
|---|---|
| `music-theory/index.html` | 模块入口页（外壳、顶栏、返回童童空间/小提琴空间链接） |
| `music-theory/css/quest.css` | 全部样式（深蓝紫音乐宇宙主题、响应式、`prefers-reduced-motion`） |
| `music-theory/js/theory.js` | **乐理规则核心**（纯函数）：音名、MIDI/频率、升降号顺序、调号、临时记号/还原号规则、大调音阶、全音半音、时值 |
| `music-theory/js/violin.js` | **小提琴指板逻辑**：四根空弦、第一/第三把位已核对音位表、「音符+琴弦+把位→手指」、手指靠拢判断 |
| `music-theory/js/store.js` | 学习记录、XP、连续天数、间隔复习（1/3/7/14 天）、技能状态、家长统计、导出/导入备份、数据迁移 |
| `music-theory/js/audio.js` | Web Audio 音频引擎（iOS 手势解锁、静音、节拍器滴答、类弦乐合成音） |
| `music-theory/js/content/*.js` | 六个世界的题库（347 题，稳定 ID）、关卡定义、老师任务、曲目技能标签 |
| `music-theory/js/ui/*.js` | 页面与组件：大厅、地图、关卡运行器、题型、五线谱（VexFlow）、键盘、抽象指板、间距图、节奏游戏、识谱侦探、家长视图 |
| `music-theory/js/main.js` | 入口与哈希路由 |
| `music-theory/vendor/vexflow-bravura-4.2.3.js` | VexFlow 4.2.3（含 Bravura 音乐字体），570 KB，本地托管 |
| `music-theory/vendor/VEXFLOW-LICENSE.txt` | VexFlow MIT 许可证 |
| `tests/music-quest/*.test.js` | 单元测试（乐理规则、指板、题库一致性、存储/复习） |
| `tests/music-quest/e2e.mjs` | 端到端测试脚本（可选，需 Playwright） |
| `package.json` | 只有 `test` / `serve` 脚本，**无任何依赖** |
| `.gitignore` | 忽略 `node_modules`、`e2e-shots/` |
| `docs/music-quest-handoff.md` | 本文件 |
| `docs/music-quest-dev-log.md` | 开发记录（审计、决策、过程、测试结果） |
| `docs/music-quest-manual-review.md` | 40 道代表性题目人工复核表 |

### 修改

| 文件 | 改动 | 与旧模块关系 |
|---|---|---|
| `index.html` | Knowledge Interface 网格第一位新增 `#music-quest-entry` 卡片：「🎵 乐理冒险岛 · Music Quest / 听懂音乐规则，解锁小提琴新技能！」→ `music-theory/` | 其他卡片、脚本、跳转逻辑一字未改 |
| `violin_learning_hub.html` | 页首「练习工具」之前新增 `#music-quest-link` → `music-theory/?from=violin#/map` | 节拍器、课程卡片、PDF/图片查看器未改 |
| `UPDATE_LOG.md` | 新增一条更新日志 | — |

模块内所有链接都是**相对路径**（`../index.html`、`../violin_learning_hub.html`），在 GitHub Pages 和 Worker 根路径下都成立。

---

## 2. Git 状态

- 分支：`feature/music-quest`（本地分支，**未推送**）。
- 提交：见交付时 `git log --oneline -3`（提交信息以 `Add Music Quest` 开头）。
- 推送风险：本仓库是 GitHub Pages 站点，**推送到 `main` = 立即上线**。请先推送到 `feature/music-quest` 并开 PR 审查；不要直接推 `main`。
- `git status` 交付时应为干净（`node_modules` 被忽略，未提交）。

```bash
git log --oneline -3
git diff main --stat
```

---

## 3. 技术栈与依赖

- 原站：纯静态 HTML/CSS/原生 JS，无打包器；本模块保持一致（原生 ES Modules，Safari 14+/Chrome/Firefox 均支持）。
- 新增运行时依赖：**VexFlow 4.2.3**（MIT，作者 Mohit Muthanna Cheppudira 等），使用官方构建 `build/cjs/vexflow-bravura.js`（UMD，暴露 `window.Vex`）。内含 Bravura 字体（SIL Open Font License 1.1）。
  - 选择理由：要求「正确显示谱号、调号、临时记号、时值、指法数字，不能用浮动 Unicode 假装乐谱」。原站没有乐谱渲染器（小提琴页只有 PDF/图片查看）。
  - 体积：570 KB（gzip 后约 170 KB），只在 `/music-theory/` 加载。
- 音频：Web Audio API 自行合成，**未引入 Tone.js**。
- 字体：Bricolage Grotesque（Google Fonts，与原站同样以 `@import`/`<link>` 方式加载）；加载失败时回退系统字体，不影响功能。
- 环境要求：本地测试需 Node ≥ 18（已在 Node 22 验证），Python 3（静态服务器）。

---

## 4. 构建与测试（可直接复制）

站点**无需构建**。

```bash
# 单元测试（零依赖）
npm test
# 实际结果（2026-10-19，Node 22.22）：tests 48 · pass 48 · fail 0

# 本地预览
python3 -m http.server 8080        # 在仓库根目录
# 打开 http://localhost:8080/music-theory/

# 端到端测试（可选；不写入 package.json）
npm i --no-save playwright-core
npx playwright install chromium     # 或设置 CHROMIUM_PATH 指向已有 Chromium
node tests/music-quest/e2e.mjs http://localhost:8080
# 实际结果（Chromium headless）：44/44 通过
```

已知非失败项：本地沙箱无法访问 Google Fonts，控制台有一条字体加载失败，已被 E2E 过滤；生产环境不会出现。

---

## 5. 本地预览

- 启动：仓库根目录 `python3 -m http.server 8080`
- 地址（实际验证过）：
  - `http://localhost:8080/music-theory/` — 冒险大厅
  - `http://localhost:8080/music-theory/#/map` — 地图
  - `http://localhost:8080/music-theory/#/lesson/w2.sharps` — 升号顺序关卡
  - `http://localhost:8080/music-theory/#/lesson/w6.det.d2` — 识谱侦探（还原号）
  - `http://localhost:8080/music-theory/#/review`、`#/tasks`、`#/parent`
  - `http://localhost:8080/violin_learning_hub.html` — 检查新增入口
- 注意：本地打开 `http://localhost:8080/index.html` 会被原有脚本立刻跳转到 Worker 登录页（原站行为，未改动），首页卡片请直接看源码或在 Worker 环境验证。

---

## 6. 数据变更

| 键 | 位置 | 内容 |
|---|---|---|
| `tt_music_quest_v1` | localStorage | 单个 JSON：`{ version:1, xp, days, lessons, skills, items, log, rhythm, tasks, settings }`（详见 `store.js` 顶部） |
| `tt_mq_bpm` | localStorage | 节奏游戏上次选择的 BPM |

- **不读取、不修改**原站任何键（`french_*`、`tt_camp_2026` 等）和 Supabase。
- 向后兼容：`migrate()` 对缺失/损坏字段补默认值；JSON 损坏时从空状态开始（不会抛错）。
- 无数据库、无迁移脚本。
- 备份：家长视图「导出备份」下载 JSON；「从备份恢复」导入。
- 限制：**不跨设备同步**；`tongtong2016.com` 与 `*.workers.dev` 是两个不同源，进度互不共享（见 §8）。
- 回滚：删除模块不会影响其他数据；如需清空乐理进度，删除上面两个键即可。

---

## 7. 环境变量 / 绑定

本模块**不需要任何环境变量、密钥或 Cloudflare 绑定**。没有写入任何密钥。
（仓库中原有的 `config.js` 含 Supabase publishable key，是原站既有内容，本次未改动。）

---

## 8. 路由与部署注意事项（重要）

### 8.1 实际生产架构（审计发现）
- `index.html` 的第一段脚本会把所有访客 `location.replace` 到 `https://tongtong-private-staging.euripscope.workers.dev/`（统一登录）。
- 首页的「VIOLIN」卡片也指向 Worker 上的 `/violin_learning_hub.html`。
- **Worker 源码不在本仓库，也不在本次可访问的任何仓库。** Worker 上的小提琴页可能比本仓库版本新（本仓库版本最新课程卡片是 2026-07-04；10/10、10/17 课程未出现在本仓库）。

### 8.2 需要部署方决定的路径
1. **Worker 若直接提供本仓库的静态文件**（例如 Workers Static Assets 指向本仓库构建产物）：合并后 `/music-theory/` 自动可用；首页卡片与小提琴页入口随之生效。
2. **Worker 有自己的一份首页/小提琴页**：需要在 Worker 项目里加同样的两处入口（下方 diff），并把 `music-theory/` 目录整体复制到 Worker 的静态资源目录。
3. **Worker 有认证中间件**：`/music-theory/*` 应和其他学习页一样走登录保护；模块本身不处理认证，也不调用 `/auth/*`。

建议的 Worker 侧 diff（仅示意，需按 Worker 实际文件调整）：

```diff
 <!-- 首页 Knowledge Interface 网格内 -->
+<a href="music-theory/" class="action-box wide" id="music-quest-entry" style="border-color:#b49cff;background:linear-gradient(135deg,rgba(180,156,255,.22),rgba(125,211,252,.10))"><h3 style="color:#e9e1ff;font-size:1.05rem">🎵 乐理冒险岛 · Music Quest</h3><p style="color:#cbd5e1">听懂音乐规则，解锁小提琴新技能！</p></a>

 <!-- violin_learning_hub.html，「练习工具」标题之前 -->
+<a href="music-theory/?from=violin#/map" id="music-quest-link" ...>乐理冒险岛 · Music Quest</a>
```

### 8.3 深链接、静态资源、缓存
- 路由使用 `#/...` 哈希，**服务器只需要能返回 `/music-theory/index.html`**，无需重写规则。`/music-theory`（无斜杠）在 GitHub Pages 会 301 到 `/music-theory/`；在 Worker 上请确认同样行为，否则相对路径 `css/`、`js/` 会解析错误。
- 资源全部相对路径；入口 HTML 对 `quest.css`/`main.js` 带 `?v=1.0.0`。ES 模块内部 import 不带版本号——更新时如遇缓存问题，请提升 `index.html` 中版本号并考虑给 `/music-theory/js/*` 设置较短缓存。
- `.js` 文件需以 `text/javascript` MIME 提供（GitHub Pages 默认满足）。
- `music-theory/index.html` 带 `noindex,nofollow`（与原站一致）。
- `package.json`、`tests/`、`docs/` 会随 GitHub Pages 公开可访问（不含敏感信息）；如不希望公开，可在部署产物中排除。

### 8.4 localStorage 与域名
进度保存在当前源。若孩子有时在 `tongtong2016.com/music-theory/`、有时在 `workers.dev/music-theory/` 使用，两边进度不同。建议只保留一个入口域名；需要迁移时用家长视图的导出/导入。

---

## 9. 验证清单

**页面/玩法**
- [ ] 首页（Worker 版）出现「🎵 乐理冒险岛」卡片，点击进入 `/music-theory/`；顶部「← 童童空间」能返回
- [ ] 小提琴页出现入口；从小提琴页进入后「🎻 小提琴空间」高亮，能返回
- [ ] 地图六个世界、26 个关卡均可进入（没有不可用的按钮）
- [ ] 升号/降号排序（点按与拖动）、调号、还原号、键盘 D 大调、指板、手指间距、节奏敲击、听觉、识谱侦探全部能答完
- [ ] 答错 → 解释 + 再试一次；第二次仍错 → 显示正确答案
- [ ] 刷新后 XP、错题、复习到期仍在；家长视图数字与实际作答一致

**乐理正确性**
- [ ] `npm test` 全绿（含每个侦探乐谱逐音核对、每小节 4 拍、所有选择题答案在选项中）
- [ ] 抽查 `docs/music-quest-manual-review.md`

**音频**
- [ ] iPhone/iPad Safari：首次需点「开启声音」；静音开关打开时会提示
- [ ] 切到后台再回来，节奏游戏暂停并提示；再次点击可恢复声音
- [ ] 标准音 440 Hz（界面按法国习惯称 La3；程序内部科学记法 A4 = MIDI 69，单元测试已验证）

**移动端**
- [ ] iPhone 宽度（375px）无横向滚动；按钮 ≥ 40px；五线谱窄屏自动一行一小节

**旧模块回归**
- [ ] 背单词、CM2、语法、复习营、地球、汉语、学习统计页正常（E2E 已在本地验证 6 个旧页面无新增脚本错误）

---

## 10. 风险与待办

| 类型 | 说明 |
|---|---|
| **阻断项** | Worker 源码不在本仓库：入口卡片要在 Worker 实际提供的首页/小提琴页上生效，需部署方确认 §8.2 |
| 数据 | 仅本机保存，不跨设备同步；两个域名进度不共享 |
| 曲目 | `Fantaisie russe` 作曲者未填写（待按现有乐谱核对）；尚无该曲的乐谱片段与录音，因此没有该曲的看谱挑战（界面如实标为「待录入」，无失效按钮） |
| 小提琴页同步 | 本仓库小提琴页缺 10/10、10/17 课程卡片；任务数据来自开发任务书 |
| 音色 | 合成音为「类弦乐」示意，不是真实小提琴采样；音高准确 |
| 节奏判定 | 使用 `AudioContext.currentTime` 并扣除 `outputLatency`；蓝牙耳机延迟较大时可能整体偏「拖后」，反馈文字是宽容的 |
| 把位范围 | 只出经过核对的常规手型音位；第一把位 6 个半音位置、第三把位 4/11 个半音位置刻意不出题 |
| 未实现（后续规划） | 实时麦克风音准识别、揉弦动作识别（任务书说明非 MVP）；教师任务后台编辑（目前改 `content/tasks.js`）；跨设备同步（可接原站 Supabase，需新表与 RLS 设计） |
| 八度号 | 界面按法国音乐学院习惯（中央 Do = Do3）；如老师使用国际记法，只需改 `theory.js` 的 `frenchOctave` 与 `widgets.js` 的 `midiName` |
| 字体 | Google Fonts 不可用时回退系统字体 |

---

## 11. 回滚方式

本模块是**纯新增目录 + 两处一行级入口**，回滚不涉及数据：

```bash
# 若已合并到 main 并上线：
git revert <合并提交>          # 恢复 index.html、violin_learning_hub.html，删除 music-theory/ 等
git push origin main           # GitHub Pages 重新发布

# 最小回滚（只隐藏入口，保留模块）：
#   删除 index.html 中 #music-quest-entry 与 violin_learning_hub.html 中 #music-quest-link 两段
```

- 原站所有 localStorage 键、Supabase 数据都未被本模块读写，回滚不会损坏原站数据。
- 孩子在乐理模块里的进度（`tt_music_quest_v1`）回滚后仍留在浏览器中，重新上线即可继续。
