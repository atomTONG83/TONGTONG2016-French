// Music Quest 端到端测试（可选，需要 Playwright）。
// 运行方式（不会把依赖写入 package.json）：
//   python3 -m http.server 8080            # 在仓库根目录启动静态服务
//   npm i --no-save playwright-core@1.56   # 或使用已有的 Playwright
//   CHROMIUM_PATH=/path/to/chromium node tests/music-quest/e2e.mjs http://localhost:8080
// 截图输出到 E2E_OUT（默认 ./e2e-shots，已在 .gitignore 中忽略）。
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { getQuestion } from '../../music-theory/js/content/index.js';

const BASE = (process.argv[2] || 'http://localhost:8080').replace(/\/$/, '');
const APP = `${BASE}/music-theory/`;
const OUT = process.env.E2E_OUT || 'e2e-shots';
mkdirSync(OUT, { recursive: true });
const results = [];
const ok = (name, cond, extra = '') => { results.push({ name, pass: !!cond, extra }); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  · ' + extra : ''}`); };

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const ctx = await browser.newContext({ viewport: { width: 1024, height: 900 } });
// Isolated checks may only read this local preview, never production services.
await ctx.route('**/*', route => { const u = new URL(route.request().url()); return (u.origin === new URL(BASE).origin && ['GET', 'HEAD'].includes(route.request().method())) ? route.continue() : route.abort(); });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.googleapis|ERR_TUNNEL|ERR_NAME|net::/.test(m.text())) errors.push(m.text()); });

const q = (s) => JSON.stringify(s);
async function introToQuestions() {
  for (let i = 0; i < 6; i++) {
    const btn = page.locator('.intro-card .q-actions .btn.primary');
    if (!(await btn.count())) break;
    await btn.click();
  }
}
async function answerCurrent({ wrongFirst = false, wrongKeyboard = false } = {}) {
  const sec = page.locator('section.q').first();
  const id = await sec.getAttribute('data-qid');
  const item = getQuestion(id);
  if (!item) throw new Error(`题库里没有 ${id}`);
  if (wrongFirst && item.type === 'choice') {
    const wrong = item.options.find((o) => o.value !== item.answer);
    await sec.locator(`.opt[data-value=${q(wrong.value)}]`).click();
    await sec.locator('button:has-text("检查答案")').click();
    await sec.locator('.q-feedback.retry').waitFor();
    await sec.locator('button:has-text("再试一次")').click();
  }
  if (item.type === 'choice') await sec.locator(`.opt[data-value=${q(item.answer)}]`).click();
  else if (item.type === 'multi') for (const a of item.answer) await sec.locator(`.opt[data-value=${q(a)}]`).click();
  else if (item.type === 'order') for (const t of item.answer) await sec.locator(`.order-pool .tile[data-tile=${q(t)}]`).click();
  else if (item.type === 'keyboard-scale') {
    if (wrongKeyboard) await sec.locator('.kbd .key[data-midi="60"]').dispatchEvent('pointerdown');
    for (const m of item.answer) await sec.locator(`.kbd .key[data-midi="${m}"]`).dispatchEvent('pointerdown');
  }
  if (item.type !== 'keyboard-scale') await sec.locator('button:has-text("检查答案")').click();
  await sec.locator('.q-feedback.good').waitFor({ timeout: 4000 });
  await sec.locator('.q-feedback button:has-text("继续")').click();
  return id;
}
async function playLesson(id, opts = {}) {
  await page.goto(`${APP}#/lesson/${id}`);
  await page.waitForSelector('.intro-card, section.q');
  await introToQuestions();
  const seen = [];
  for (let i = 0; i < 20; i++) {
    if (await page.locator('.summary').count()) break;
    seen.push(await answerCurrent({ wrongFirst: opts.wrongFirst && i === 0, wrongKeyboard: opts.wrongKeyboard }));
  }
  return { seen, summary: await page.locator('.summary').innerText() };
}

// 1. 大厅
await page.goto(APP);
await page.waitForSelector('.hall');
ok('大厅加载', await page.locator('h1:has-text("乐理冒险岛")').count());
ok('大厅有返回童童空间与小提琴链接', (await page.locator('a[href="../index.html"]').count()) && (await page.locator('a[href="../violin_learning_hub.html"]').count()));
await page.screenshot({ path: `${OUT}/01-hall.png`, fullPage: true });

// 2. 开启声音（iOS 式手势解锁）
await page.locator('#sound-toggle').click();
await page.waitForTimeout(300);
ok('声音按钮在点击后开启', /声音开/.test(await page.locator('#sound-toggle').innerText()));

// 3. 升号顺序关卡：全部答对
let r = await playLesson('w2.sharps');
ok('升号关卡完成且全部第一次答对', /7 \/ 7/.test(r.summary), r.seen.join(','));
await page.screenshot({ path: `${OUT}/02-sharps-summary.png`, fullPage: true });

// 4. 还原号关卡：第一题先答错再答对
const beforeRetry = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('tt_music_quest_v1')).days).reduce((n, d) => n + d.answers, 0));
r = await playLesson('w2.accidentals', { wrongFirst: true });
ok('还原号关卡：错一次后重试，第一次答对数如实为 5/6', /5 \/ 6/.test(r.summary), r.summary.split('\n').join(' | '));
const wrongQid = r.seen[0];
const afterRetry = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('tt_music_quest_v1')).days).reduce((n, d) => n + d.answers, 0));
ok('重试不重复计入家长作答总数', afterRetry - beforeRetry === r.seen.length);

// 5. 键盘 + D 大调
r = await playLesson('w4.keyboard');
ok('键盘关卡（含 D 大调逐键构建）完成', r.seen.includes('scale.build.D') && /6 \/ 6/.test(r.summary));
await page.goto(APP);
r = await playLesson('w4.keyboard', { wrongKeyboard: true });
ok('键盘错按仍计入关卡分母与错题回顾', /5 \/ 6/.test(r.summary) && /需要再看看的 1 题/.test(r.summary));
ok('键盘错按保留薄弱题记录', await page.evaluate(() => JSON.parse(localStorage.getItem('tt_music_quest_v1')).items['scale.build.D'].w === 1));

// 6. 第一把位、第三把位、空弦、指法间距、识谱、节奏知识、听觉
for (const id of ['w4.first', 'w4.third', 'w4.open', 'w4.spacing', 'w1.clef', 'w1.ledger', 'w1.finger', 'w2.flats', 'w2.keysig', 'w3.durations', 'w5.direction', 'w5.steps', 'w5.melody']) {
  r = await playLesson(id);
  ok(`关卡 ${id} 全部可答完`, /(\d+) \/ \1/.test(r.summary), `${r.seen.length} 题`);
}

// 7. 节奏敲击：按真实时间敲击
await page.goto(`${APP}#/lesson/w3.tap1`);
await introToQuestions();
await page.locator('.rhythm').waitFor();
const qid = await page.locator('section.q').getAttribute('data-qid');
const durs = getQuestion(qid).pattern.durs;
const beats = { h: 2, q: 1, '8': 0.5 };
let t = 0; const onsets = durs.map((d) => { const o = t; t += beats[d]; return o; });
await page.locator('.bpm-row .chip:text-is("60")').click();
await page.locator('.rhythm button:has-text("开始")').click();
// 开始后 0.25s + 4 拍预备（60 BPM = 1s/拍）
await page.evaluate((ons) => new Promise((res) => {
  const pad = document.querySelector('.tap-pad');
  const t0 = performance.now();
  ons.forEach((o) => setTimeout(() => pad.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })), 250 + (4 + o) * 1000 - (performance.now() - t0)));
  setTimeout(res, 250 + (4 + 4) * 1000 + 1200);
}), onsets);
await page.locator('.tap-result .fb-head').waitFor({ timeout: 8000 });
const tapText = await page.locator('.tap-result').innerText();
ok('节奏游戏用真实敲击时间评分', /对上 \d+\/\d+/.test(tapText), tapText.split('\n').slice(0, 3).join(' | '));
await page.screenshot({ path: `${OUT}/03-rhythm.png`, fullPage: true });

// 8. 识谱侦探完整流程
await page.goto(`${APP}#/lesson/w6.det.d2`);
await page.waitForSelector('.detective');
for (let i = 0; i < 40; i++) {
  if (await page.locator('.det-done').count()) break;
  if (await page.locator('.det-listen').count()) {
    await page.locator('.det-listen button:has-text("播放示范")').click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/04-detective-listen.png`, fullPage: true });
    await page.locator('.det-listen button:has-text("继续")').click();
    continue;
  }
  if (i === 2) { // 用一次分层提示
    await page.locator('section.q button:has-text("提示")').click();
    ok('分层提示可展开', await page.locator('.q-hint p').count());
  }
  await answerCurrent();
}
ok('识谱侦探 7 步全部走完', await page.locator('.det-done').count());
await page.screenshot({ path: `${OUT}/05-detective-done.png`, fullPage: true });

// 9. 刷新后保留
await page.goto(APP); await page.reload(); await page.waitForSelector('.hall');
const xp = Number(await page.locator('.stat strong').nth(1).innerText());
ok('刷新后 XP 保留', xp > 0, `XP=${xp}`);
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('tt_music_quest_v1')));
ok('错题记录保存', stored.items[wrongQid]?.w === 1, wrongQid);

// 10. 家长视图
await page.goto(`${APP}#/parent`);
await page.waitForSelector('.parent');
const ptxt = await page.locator('.parent').innerText();
ok('家长视图显示本周数据与薄弱点', /本周学习天数/.test(ptxt) && ptxt.includes(getQuestion(wrongQid).prompt.slice(0, 8)));
await page.locator('.parent .task-list input[type=checkbox]').first().check();
ok('家长勾选实体练琴任务被保存', await page.evaluate(() => !!JSON.parse(localStorage.getItem('tt_music_quest_v1')).tasks['tw1.practice']));
await page.screenshot({ path: `${OUT}/06-parent.png`, fullPage: true });

// 11. 时间旅行：明天应出现到期复习
const page2 = await ctx.newPage();
page2.on('pageerror', (e) => errors.push(e.message));
await page2.clock.install({ time: new Date(Date.now() + 26 * 3600 * 1000) });
await page2.goto(`${APP}#/review`);
await page2.waitForSelector('.lesson, .review');
const revIntro = await page2.locator('.intro-card').innerText().catch(() => '');
ok('次日出现到期复习', /到期复习/.test(revIntro), revIntro.split('\n')[2] || '');
await page2.close();

// 12. 手机尺寸：无横向溢出
const mob = await browser.newContext({ viewport: { width: 375, height: 760 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await mob.route('**/*', route => { const u = new URL(route.request().url()); return (u.origin === new URL(BASE).origin && ['GET', 'HEAD'].includes(route.request().method())) ? route.continue() : route.abort(); });
const mp = await mob.newPage();
mp.on('pageerror', (e) => errors.push(e.message));
for (const route of ['', '#/map', '#/lesson/w4.first', '#/lesson/w6.det.d3', '#/lesson/w3.tap2', '#/tasks', '#/parent', '#/lesson/w2.sharps']) {
  await mp.goto(APP + route); await mp.waitForTimeout(700);
  if (route.includes('lesson')) { const b = mp.locator('.intro-card .q-actions .btn.primary'); for (let i = 0; i < 3 && (await b.count()); i++) await b.click(); await mp.waitForTimeout(500); }
  const over = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(`手机 375px 无横向溢出 ${route || '#/'}`, over <= 0, `溢出 ${over}px`);
  await mp.screenshot({ path: `${OUT}/m-${(route || 'hall').replace(/[#/.]/g, '_')}.png`, fullPage: true });
}
await mob.close();

// 13. 旧模块回归
const old = await ctx.newPage();
const oldErr = [];
old.on('pageerror', (e) => oldErr.push(e.message));
await old.goto(`${BASE}/violin_learning_hub.html`);
ok('小提琴页面仍可打开并有乐理入口', (await old.locator('#music-quest-link').count()) && (await old.locator('.metronome-card').count()));
await old.locator('#music-quest-link').click();
await old.waitForSelector('.map');
ok('从小提琴页进入地图并显示返回小提琴的强调链接', await old.locator('#back-violin.emph').count());
for (const p of ['cm2_words.html', 'french_grammar.html', 'exam_hub.html', 'revision/', 'study_stats.html', 'chinese_learning.html']) {
  const before = oldErr.length;
  await old.goto(`${BASE}/${p}`, { waitUntil: 'domcontentloaded' }); await old.waitForTimeout(500);
  ok(`旧页面 ${p} 无新增脚本错误`, oldErr.length === before, oldErr.slice(before).join(' / '));
}

ok('Music Quest 全程无脚本错误', errors.length === 0, errors.slice(0, 5).join(' / '));
await browser.close();
const fail = results.filter((x) => !x.pass);
console.log(`\n${results.length - fail.length}/${results.length} 通过`);
process.exit(fail.length ? 1 : 0);
