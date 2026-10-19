> 最新界面：V2 Studio Edition（2.1.0）已部署至Worker 13257e15-6f75-44c8-bd59-0e3d2563f967，iPad导航与按钮升级见docs/music-quest-v2-studio.md。下文保留教学版首次实现/部署记录；最新状态以开发记录为准。

# Music Quest v2 · 配音动画教学与游戏化学习

2026-10-19，本地完成；未合并main、未正式部署、未发布Pages。正式Worker版本不能用此文代替现场查询。维护源仍为童童学习空间项目。

## 学习顺序

1. **看原创动画课**：孩子先观看演示，非一上来答题或操作。中法两套配音可切换，视频自带字幕，并在播放器下方同步显示适合手机阅读的网页双语字幕；支持暂停、回看与拖动。播放完成后开放互动。
2. **动手探索**：操作音符电梯、升降号列车、还原号小节实验、半音桥/键盘、节奏小火车、第一/第三把位、听觉轨迹、读谱线索卡。至少尝试两种操作后才进入练习。探索不判断知识掌握、不记录真实练琴。
3. **游戏练习**：保留原26关、347题及稳定ID。中文和法文同时显示或单独选择。第一遍作答、提示、重试分开统计，错题安排复习。
4. **间隔复习**：沿用1/3/7/14天机制，错题明天返回，不重置旧记录。
5. **游戏考评**：完成至少一个原练习关卡后解锁10题综合宝藏挑战，优先覆盖已练技能。无倒计时；独立首次正确率决定星级，不把重试当首次成功。

## 原创教学视频

8堂短课 × 中/法两版 = 16个MP4，总时长约12分钟（两个语言版本合计）。包括：

- 音符电梯：Sol路标、线/间交替、加线。
- 升降号列车：七个升降号的顺序与纯五度计数。
- 还原号护照：同一小节、音名、八度的作用范围，跨小节回到调号。
- 半音桥：相邻半音、两个半音组成全音、Ré大调的距离。
- 节拍火车：一拍、两拍、半拍和四拍组合。
- 指板搬家：同一个Ré在第一/第三把位的不同手指。
- 声音过山车：上行、下行、重复与半音/全音示意。
- 读谱侦探：先自己解码，再听示范核对的方法。

分镜、插图与动画由本轮代码创作；谱面使用既有本地VexFlow正确排版。中文STHeiti字体不含部分音乐符号，制作过程已为♯♭♮添加Arial Unicode字形回退，避免关键符号变成方框。音乐音高示意不代替老师的实际动作指导。讲解为本产品新编教学，非学校原始材料或老师逐字原话。

## 微软自然语音

使用Edge TTS 7.3.1预生成：中文zh-CN-XiaoxiaoNeural、法语fr-FR-DeniseNeural，语速-8%。共144条MP3，覆盖影片旁白、互动步骤和原关卡介绍；单独问题没有逐题配音承诺。自然语音是合成语音，不声称真人录音。

本机原7.2.8客户端收到服务403，隔离环境7.3.1通过。使用[edge-tts项目](https://github.com/rany2/edge-tts)提供的Edge在线语音客户端，无Azure计费密钥。它不是微软正式支持的免费开发API，不保证未来服务持续可用。这里只在制作时请求普通教学文本；运行时从受保护Worker播放本地文件，不把孩子的作答、学习记录或家长材料送给语音服务。已生成音频不依赖该服务在线。

同一时刻只有一段讲解；支持中法切换与语速选择，离开页面或切后台会停止讲解，不自动恢复。视频使用本机生成的H264/AAC，自带图文字幕；课堂另有双语讲稿。音频播放与真实iOS静音/后台行为仍需真机验证。

## 奖励

- 动画首次播放完成：10 XP；同课换语言或重看不重复发放。
- 首次完成探索：5 XP；不写答题/技能掌握/实体练琴记录。
- 既有答题与关卡XP机制保留，重复同题同日不刷XP。
- 每日目标20/40/60 XP可选、等级进度、连续学习天数、首课/3次探索/3日连学/8课收藏徽章。
- “看过动画”“探索完成”“首次独立答对”分别展示。观看不等于掌握。
- Music Quest XP只在自己的原localStorage键内扩展；不与原站星星、奖金、Supabase或D1练琴奖励兑换或同步。

## 代码与构建

主要新增：js/teaching-content.js、teaching-films.js、content/french.js、i18n.js、voice.js、ui/classroom.js、ui/rewards.js、video/、audio/voice/。默认build_assets.py仍只把模块纳入受保护Worker；Pages白名单未扩大。

实际Worker ASSETS绑定在本地对Range请求返回200完整视频，导致拖动位置回到开头。新增worker/src/music-media.js，且在原认证后调用：只处理8课中法MP4及哈希命名语音MP3，单文件最多4MiB，支持单段/后缀/开放末尾Range、If-Range、HEAD、416。匿名Range仍先被认证拦截；不会扩大公开路径或更改数据库。原小提琴音频处理保持。

制作用脚本：scripts/music_quest_voice_catalog.mjs、generate_music_quest_voice.py、render_music_quest_scores.mjs、render_music_quest_videos.py。视频渲染器使用Pillow、ffmpeg及macOS字体；有生成好的可用资产，无运行时Python依赖。重做影片用render_music_quest_videos.py --force；不加--force复用既有完整影片元数据。

制作示例（维护根目录，隔离工具依赖）：

```sh
python3 -m venv /tmp/music-quest-edge-20261019
/tmp/music-quest-edge-20261019/bin/pip install edge-tts==7.3.1
/tmp/music-quest-edge-20261019/bin/python scripts/generate_music_quest_voice.py
# 另开本地8082静态服务，根目录为site/music-theory；安装临时playwright-core或使用现有安装。
node scripts/render_music_quest_scores.mjs
python3 scripts/render_music_quest_videos.py --force
python3 scripts/build_assets.py
```

## 测试与正式发布状态

以本轮开发记录和audit/music-quest-v2-*最终结果为准。单元测试包含347题法语覆盖、所有选项答案不变、旧进度保留、奖励防重复和所有144音频哈希。媒体测试核对范围读取与路径边界。浏览器测试隔离网络，全部生产学习写入为0；测试视频解锁用自动化seek-to-end，不冒称孩子实际完整观看或真机验收。

2026-10-19用户随后明确要求“请部署上童童空间tongtong2016.com”，本轮已据此发布受保护Worker，版本3df31958-b486-46eb-ab16-9bca9f4301a5。该部署指令更新了此前等待真机验收的发布安排；没有将未做的iPhone/iPad Safari实测记为通过。tongtong2016.com沿用既有跳转进入统一受保护Worker；没有变更DNS、发布Pages或合并GitHub草稿PR。真机仍需检查完整动画、中法语音、字幕/拖动/暂停、看完进入互动、至少两种操作后进入练习、复习/闯关流程、后台返回。线上文件及浏览器最终验收见开发记录续记与audit/music-quest-deploy-*。GitHub PR保持草稿；合并会发布Pages公开副本，必须先处理统一Worker入口与公开路径问题。

## 回滚

已现场确认发布前正式版本010a0cb8-3912-4fb7-9766-fdd89b8d4398；必要时在worker/运行npx wrangler rollback 010a0cb8-3912-4fb7-9766-fdd89b8d4398。该操作只回退Worker代码与资产，保留数据库、进行中计划、真实练琴、旧词本/奖金及所有浏览器学习数据；不恢复数据库快照或清理tt_music_quest_v1/tt_mq_bpm。v1模块备份private/music-quest-v1-before-bilingual-20261019，接入前备份private/music-quest-before-20261019；只恢复本轮相关文件，保留其他未提交工作。GitHub revert不能代替Worker回滚。
