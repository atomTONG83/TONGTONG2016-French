> 最新状态（2026-10-19）：用户明确要求正式部署后，v2课程及Studio界面已发布至受保护Worker 13257e15-6f75-44c8-bd59-0e3d2563f967，tongtong2016.com沿用原跳转入口。本文早期“未上线”记录属于接入时状态；以docs/music-quest-v2-studio.md、docs/music-quest-v2-teaching.md和开发记录最新验收续记为准。实体iPhone/iPad Safari仍未实测，PR未合并、Pages未发布。

# Music Quest · Mac mini Worker 接入（2026-10-19）

当前状态：本机已接入，草稿 PR 已创建；未合并、未正式部署、未发布 Pages。等待 iPhone/iPad Safari 真机声音和节奏验收。

## 接收与来源

执行环境：TONGdeMac-mini.local / atom1983；唯一维护根目录 `/Volumes/LaCie/Codex/20260916 童童学习空间`。项目根 Git 无远端；GitHub 发布仓库是 `tmp/pages-publish`，origin 为 atomTONG83/TONGTONG2016-French。未向 Worker 本地仓库导入不明 bundle，也未提交或覆盖原有未提交工作。

交接指定 tmp 目录现场不存在，Dropbox 本机副本仍为0字节；已通过 Dropbox 连接器取得两份归档到 tmp/Music-Quest-handoff。bundle 270541 bytes / SHA256 04801f5fbf28fef6f1b6688c452b73dbeaa3c8ced9b02e8feec1c93d1f6de9c9；tar 860160 bytes / SHA256 b485c7a740e4f8729dc2ef6d4ff7f11c5f3abb8e0452b337d644d792fc3970b4。检查 tar 无越界路径或链接后解包到新目录。bundle 在已确认 origin 和基线 782829e 的发布仓库通过 verify。

已通读四份文档。tar 缺开发记录、人工审核两份文档，已从 bundle 的 825e8f3 提交恢复；模块25文件均与该提交逐字节一致。README 与 PR-draft 从 Dropbox 云端读取。

原始 63befe5 → 825e8f314c4ce332ea4be12ebe8c1d0561d076b4 历史已正常推送 feature/music-quest，无强推、未改 main。草稿 PR：https://github.com/atomTONG83/TONGTONG2016-French/pull/1 ，已附加本聊天。PR 禁止自动合并。

## 接入

- `site/music-theory/` 为原模块，Worker 构建明确复制整个目录；Pages 白名单不包含该目录。
- `site/index.html` 当前课程网格新增 #music-quest-entry；`site/violin_learning_hub.html` 顶部新增 #music-quest-link，保留所有课程/计时器内容。首页奖金115.0与原有科幻视觉保留。
- 默认 Worker 构建现在明确恢复 private/french-reviewed-20261018 六文件，避免将此前未发布的法语源码改动一起上线。
- 实际 Worker 配置 run_worker_first:true；现有认证与 private/no-store 策略覆盖模块，无需改 Worker 后端、路由、配置、密钥或迁移。目录规范化和 text/javascript 由真实静态资产绑定处理，已在新版本地 runtime 实测。
- 根目录 package.json 仅提供本地测试；tests/music-quest imports 适配 site/，E2E 阻断外站请求和非GET/HEAD操作。未增加运行时依赖。

本次 Worker 变更未提交到另一个远程仓库：本地根仓库无远端且有大量既有未提交工作。独立任务差异保存 audit/music-quest-worker-integration-20261019.patch，原文件及完整 dist 保存 private/music-quest-before-20261019。GitHub PR 中的旧首页/小提琴页不作为本项目发布源。

## 本机验证

- 模块单元50/50，Chrome E2E47/47，375px截图目视检查；均为本机测试，不是真机Safari。
- Worker既有72测试通过；法语既有/优化/恢复32测试通过；部署dry-run通过；Python/JS语法与diff检查通过。
- 默认构建只更改2个入口HTML，新增25个模块文件，348个既有文件逐字节不变；法语六文件精确一致。
- 旧版项目Wrangler4.129.0的本地workerd最高支持2026-09-10，无法运行2026-09-16配置。临时安装Wrangler4.151.2到/tmp，新版本地运行通过，未修改项目lockfile、依赖或兼容日期。
- 真实本地Worker：25资产认证后字节一致，匿名逐个401，HTML导航到登录，JS MIME正确、缓存no-store、无斜杠跳转保留from查询；14旧资源一致、学生不能读家长API。
- 隔离Chrome通过本地Cookie登录验证实际首页入口、小提琴入口和返回、10/10与10/17课程保留。所有D1迁移/登录只在独立本地SQLite执行；没有生产学习、奖励或Supabase/D1数据写入。
- 现场Cloudflare查询当前100%版本010a0cb8-3912-4fb7-9766-fdd89b8d4398；线上14项旧资源GET核对与发布前dist一致。未将匿名401当作模块已上线证据。没有新Worker部署版本，没有Music Quest正式线上验收结论。

证据：audit/music-quest-{assets,unit,e2e,worker-tests,french-tests,dry-run,local,before,worker-browser,deployments-before}-20261019.*；截图 audit/music-quest-browser-20261019/。

## 真机测试副本

运行 `python3 scripts/preview_music_quest.py`。脚本只复制乐理模块、登录页与两个明确标注本地测试的返回页；不复制学校原件、家长资料、奖励快照或生产口令。使用本地D1和测试账号，局域网HTTPS端口8789，无隧道、无公网发布。当前本机地址192.168.32.99。

1. iPhone与iPad连接同一局域网，用Safari打开 `https://192.168.32.99:8789/music-theory/`。这是本机开发证书；只在确认此地址为这台Mac时继续访问。若系统不允许继续，保留错误信息，不更改系统安全设置。
2. 测试登录：用户名 tongtong，口令 local-music-preview-only（仅本地测试口令，不是正式口令）。进入地图，点顶栏「开启声音」，确认音符/示范有声音。
3. 打开「节奏竞技场」的敲击关卡：听预备拍，按节奏敲击，确认能记录敲击和展示反馈。关闭设备静音，优先用扬声器，避免蓝牙延迟影响判断。
4. 节奏播放时切到后台再返回：应暂停并提示；下一次点击能恢复声音，不自动继续旧节奏。检查触控、横竖屏和返回链接。
5. 分别记录设备型号、iOS/iPadOS版本、声音开启/节奏记录/后台恢复是否通过。测试进度仅存这个测试源，不需要转入正式站。

测试服务可Ctrl+C停止；IP变化时用当前Mac局域网IP替代。不要把开发测试口令输入正式Worker。

## 正式发布门槛与回滚

真机未验收，停在正式发布前。通过后仍须重新现场查询Worker版本、运行 `python3 scripts/verify_music_quest.py --before` 刷新快照，确认无新生产改动，再标准构建/dry-run及正常Worker部署。若快照不匹配先复核，禁止覆盖上线期间新增改动。发布后运行 `python3 scripts/verify_music_quest.py` 做GET-only验收。

当前现场回滚目标命令（本次没有发布，无需执行）：在worker目录运行 `npx wrangler rollback 010a0cb8-3912-4fb7-9766-fdd89b8d4398`。真正发布前如线上版本已变，以新查得的发布前版本替换。只恢复Worker代码/资产，保留所有Supabase/D1和浏览器记录。不能通过revert GitHub PR代替Worker回滚。

本地撤回可逐文件从private/music-quest-before-20261019/source恢复本轮3个修改文件，移除新增模块/测试/工具；保留全部其他工作及数据库，不做git reset。恢复旧构建器后仍需按已发布法语六文件基线恢复产物。

GitHub main合并会发布Pages公开副本；合并前必须另行处理模块公开路径和统一Worker入口。当前PR保持draft和未合并；本项目Pages构建白名单没有扩大。
