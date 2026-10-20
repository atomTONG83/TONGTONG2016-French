// 页面：冒险大厅、地图、关卡、复习、老师任务、家长视图
import { h, shuffle, toast } from './dom.js';
import {narration} from '../voice.js';
import {register, french} from '../i18n.js';
import {studioForWorld} from './classroom.js';
import {learningDashboard} from './rewards.js';
import {adventureMap,journeyBanner} from './adventure.js';
import {journey,lessonPassed} from '../progression.js';
import { mino, keyboard, fingerboard, spacingDiagram, playSeq, playNoteStr } from './widgets.js';
import { staffView } from './staff.js';
import { renderQuestion, soundGate } from './question.js';
import { detectiveView } from './detective.js';
import { audio } from '../audio.js';
import { levelFromXp } from '../store.js';
import { WORLDS, LESSONS, lessonsOf, lessonById, getQuestion, SKILLS, bank } from '../content/index.js';
import { SPACING_SETS } from '../content/lab.js';
import { TEACHER_WEEKS, REPERTOIRE } from '../content/tasks.js';
import { midi as toMidi, noteToString, DURATIONS } from '../theory.js';

const VIOLIN_URL = '../violin_learning_hub.html';
const HOME_URL = '../index.html';

/* ───────── 公共：推荐下一关 ───────── */
export function recommendedLesson(store) {
  const L = store.state.lessons;
  return LESSONS.find((l) => !lessonPassed(L[l.id])) ?? LESSONS.slice().sort((a, b) => (L[a.id].bestAcc - L[b.id].bestAcc))[0];
}
function lessonState(store, l) {
  const r = store.state.lessons[l.id];
  if (!r) return { done: false };
  return { done: true, best: Math.round(r.bestAcc * 100), times: r.completed };
}

/* ───────── 冒险大厅 ───────── */
export function hallPage(store) {
  const st = store.state;
  const lv = levelFromXp(st.xp);
  const due = store.dueItems(50).length;
  const rec = recommendedLesson(store);
  const world = WORLDS.find((w) => w.id === rec.world);
  const streak = store.streak();
  const today = st.days[store.today()];
  const greet = today?.lessons ? `今天已经完成 ${today.lessons} 关，做得好！` : due ? `有 ${due} 道题到了复习时间，先热热身？` : '今天想解锁哪条乐理规则？';

  return h('div', { class: 'page hall' },
    h('section', { class: 'hero' },
      h('div', { class: 'hero-mino' }, mino(today?.lessons ? 'cheer' : 'happy', 120)),
      h('div', { class: 'hero-text' },
        h('h1', {}, '乐理冒险岛', h('span', { class: 'en' }, 'Music Quest')),
        h('p', { class: 'bubble' }, h('strong', {}, '小音 Mino：'), greet))),
    journeyBanner(store),
    learningDashboard(store),
    h('section', { class: 'today card practice-after-teaching' },
      h('h2', {}, registerLabel('已经学过？继续练习','Déjà découvert ? Entraîne-toi')),
      h('a', { class: 'mission', href: `#/lesson/${rec.id}` },
        h('span', { class: 'm-emoji', style: { color: world.color } }, world.emoji),
        h('span', {}, h('strong', {}, rec.title), h('small', {}, `${world.name} · 约 ${rec.minutes} 分钟`)),
        h('span', { class: 'm-go' }, '开始')),
      due ? h('a', { class: 'mission review', href: '#/review' },
        h('span', { class: 'm-emoji' }, '🔁'), h('span', {}, h('strong', {}, `复习 ${due} 道到期题`), h('small', {}, '间隔复习：次日 → 3 天 → 7 天 → 14 天')), h('span', { class: 'm-go' }, '复习')) : null,
      h('p', { class: 'muted small' }, '乐理关卡每关 3–7 分钟。今天也别忘了真正拿起琴，慢速练 20–30 分钟。')),
    h('section', { class: 'stats' },
      stat(`Lv.${lv.level}`, lv.title, h('div', { class: 'xpbar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': lv.need, 'aria-valuenow': lv.into, 'aria-label': '本级经验' }, h('i', { style: { width: `${Math.round((lv.into / lv.need) * 100)}%` } }))),
      stat(String(st.xp), '经验 XP'),
      stat(String(streak), '连续学习天数'),
      stat(String(due), '待复习')),
    h('nav', { class: 'hall-nav' },
      h('a', { class: 'btn primary big', href: '#/map' }, '🗺 进入冒险地图'),
      h('a', { class: 'btn ghost', href: '#/review' }, '🔁 复习'),
      h('a', { class: 'btn ghost', href: '#/tasks' }, '📋 老师任务'),
      h('a', { class: 'btn ghost', href: VIOLIN_URL }, '🎻 回小提琴空间')),
    recentList(store),
  );
}
function stat(v, label, extra) {
  return h('div', { class: 'stat' }, h('strong', {}, v), h('span', {}, label), extra || null);
}
function recentList(store) {
  const recent = Object.entries(store.state.lessons).sort((a, b) => (a[1].lastAt < b[1].lastAt ? 1 : -1)).slice(0, 3);
  if (!recent.length) return h('section', { class: 'card recent' }, h('h2', {}, '最近进度'), h('p', { class: 'muted' }, '还没有完成的关卡。从「今日任务」开始第一关吧。'));
  return h('section', { class: 'card recent' }, h('h2', {}, '最近进度'),
    h('ul', {}, ...recent.map(([id, r]) => {
      const l = lessonById(id);
      return l ? h('li', {}, h('a', { href: `#/lesson/${id}` }, l.title), h('span', { class: 'muted' }, ` 最好 ${Math.round(r.bestAcc * 100)}% · 完成 ${r.completed} 次`)) : null;
    })));
}

/* ───────── 冒险地图：一条蜿蜒的五线谱 ───────── */
export function mapPage(store,selected) { return adventureMap(store,selected); }

/* ───────── 关卡 ───────── */
export function lessonPage(store, id) {
  const lesson = resolveLesson(id);
  if (!lesson) return notFound();
  const world = WORLDS.find((w) => w.id === lesson.world);
  const wrap = h('div', { class: 'page lesson', style: { '--wc': world.color } });
  const head = h('header', { class: 'lesson-head' },
    h('a', { class: 'close', href: '#/map', 'aria-label': '离开关卡，回到地图' }, '✕'),
    h('div', { class: 'progress', role: 'progressbar', 'aria-label': '关卡进度', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': 0 }, h('i')),
    h('span', { class: 'lesson-world' }, `${world.emoji} ${world.name}`));
  const body = h('div', { class: 'lesson-body' });
  wrap.append(head, body);
  const setProgress = (p) => { head.querySelector('.progress i').style.width = `${Math.round(p * 100)}%`; head.querySelector('.progress').setAttribute('aria-valuenow', String(Math.round(p * 100))); };

  const results = [];
  const record = (q, r) => {
    if (r.rhythm) store.recordRhythm({ bpm: r.rhythm.bpm, pattern: r.rhythm.pattern, meanAbsMs: r.rhythm.meanAbsMs, meanSignedMs: r.rhythm.meanSignedMs, hits: r.rhythm.hits, total: r.rhythm.total, extra: r.rhythm.extra, score: Math.round(r.rhythm.score * 100) / 100 });
    if (r.retry) return;
    const res = store.recordAnswer({ qid: q.id, skills: q.skills, ok: r.ok, firstTry: r.firstTry, hinted: r.hinted, followup: r.followup });
    if (!r.followup) results.push({ q, ok: r.ok && r.firstTry && !r.hinted });
    if (res.xpGained) toast(`+${res.xpGained} XP`);
  };

  if (lesson.detective) {
    body.append(detectiveView(lesson.detective, {
      record,
      onFinish: ({ total, ok }) => {
        setProgress(1);
        const acc = total ? ok / total : 0;
        const { bonus } = store.completeLesson(lesson.id, acc);
        body.append(endNav(bonus, wrongOf(results),store));
      },
    }));
    return wrap;
  }

  // 介绍卡：观察 → 试听 → 发现规律 → 动手操作
  let ci = 0;
  const intro = lesson.intro || [];
  const showIntro = () => {
    body.replaceChildren();
    if (ci >= intro.length) return startQuestions();
    const c = intro[ci];
    setProgress(0);
    body.append(h('section', { class: 'intro-card' },
      h('div', { class: 'intro-steps', 'aria-label': '学习步骤' }, ...['观察', '试听', '发现规律', '动手操作', '独立作答'].map((s) => h('span', { class: s === c.step ? 'on' : '' }, s))),
      h('div', { class: 'intro-main' }, mino(ci === 0 ? 'happy' : 'think', 72), h('div', {}, h('h2', {}, lesson.title), h('h3', {}, c.title), h('p', {}, c.text))),
      narration(c.text),
      c.widget ? widgetFor(c.widget) : null,
      lesson.needsAudio && !audio.ready ? h('div', { class: 'q-actions' }, soundGate()) : null,
      h('div', { class: 'q-actions' },
        ci > 0 ? h('button', { class: 'btn ghost', type: 'button', onclick: () => { ci -= 1; showIntro(); } }, '上一步') : null,
        h('button', { class: 'btn primary', type: 'button', onclick: () => { ci += 1; showIntro(); } }, ci === intro.length - 1 ? '开始答题' : '下一步'))));
  };

  let queue = [];
  let qi = 0;
  function startQuestions() {
    const pool = lesson.pool();
    const must = lesson.must || [];
    const rest = shuffle(pool.filter((x) => !must.includes(x)));
    // 把到期或错过的题优先放进来（真实复习，不是随机刷题）
    const st = store.state.items;
    rest.sort((a, b) => (st[b]?.w ?? 0) - (st[a]?.w ?? 0));
    queue = [...must, ...rest].slice(0, lesson.count).map(getQuestion);
    if (!lesson.rhythm) queue = shuffleKeepMustFirst(queue, must.length);
    qi = 0;
    nextQ();
  }
  function nextQ() {
    cleanupRhythm(body);
    body.replaceChildren();
    setProgress(qi / queue.length);
    if (qi >= queue.length) return finish();
    const q = queue[qi];
    body.append(h('p', { class: 'q-count muted small' }, `第 ${qi + 1} / ${queue.length} 题`));
    body.append(renderQuestion(q, { record: (r) => record(q, r), next: () => { qi += 1; nextQ(); window.scrollTo({ top: 0, behavior: 'smooth' }); } }));
  }
  function finish() {
    setProgress(1);
    const n = results.length;
    const ok = results.filter((r) => r.ok).length;
    const acc = n ? ok / n : 0;
    const { bonus } = store.completeLesson(lesson.id, acc);
    body.append(h('section', { class: 'summary' },
      mino(acc >= 0.8 ? 'cheer' : 'happy', 96),
      h('div',{class:'treasure-rating','aria-label':registerLabel('独立作答星级','Étoiles de réussite autonome')},acc>=1?'✦ ✦ ✦':acc>=.8?'✦ ✦ ☆':acc>=.6?'✦ ☆ ☆':'☆ ☆ ☆'),
      h('h2', {}, acc >= 0.8 ? '关卡完成！' : '关卡完成，继续加油！'),
      h('p',{class:'small muted'},registerLabel('星级按第一次独立答对计算；重试帮助学习，不会把错误藏起来。','Les étoiles reflètent les réponses autonomes du premier essai. Réessayer aide à apprendre sans masquer les erreurs.')),
      h('p', { class: 'big-num' }, `${ok} / ${n}`, h('small', {}, ' 第一次就答对')),
      bonus ? h('p', {}, `完成奖励 +${bonus} XP`) : h('p', { class: 'muted small' }, acc < 0.6 ? '正确率 60% 以上才有完成奖励。错题会自动安排到明天复习。' : '同一关今天已经领过完成奖励。'),
      endNav(0, wrongOf(results),store)));
  }
  showIntro();
  return wrap;
}
function shuffleKeepMustFirst(arr, k) { return [...arr.slice(0, k), ...shuffle(arr.slice(k))]; }
function wrongOf(results) { return results.filter((r) => !r.ok).map((r) => r.q); }
function endNav(bonus, wrong,store) {
  const next=store?journey(store.state).next:null;
  return h('div', { class: 'end-nav' },
    next?h('a',{class:'btn primary next-quest',href:next.href},registerLabel('下一站：继续冒险 →','Prochaine étape : continuer →')):null,
    bonus ? h('p', {}, `完成奖励 +${bonus} XP`) : null,
    wrong.length ? h('details', { class: 'wrong-list' }, h('summary', {}, `这次需要再看看的 ${wrong.length} 题`), h('ul', {}, ...wrong.map((q) => h('li', {}, h('strong', {}, q.prompt), h('p', { class: 'muted' }, q.explain))))) : null,
    h('div', { class: 'q-actions' },
      h('a', { class: 'btn primary', href: '#/map' }, '回到地图'),
      h('a', { class: 'btn ghost', href: '#/review' }, registerLabel('🔁 复习巩固','🔁 Réviser')),h('a',{class:'btn ghost',href:'#/challenge'},registerLabel('🏆 综合闯关','🏆 Défi final')),h('a', { class: 'btn ghost', href: '#/' }, '冒险大厅')));
}
function cleanupRhythm(root) { root.querySelectorAll('.rhythm').forEach((r) => r._cleanup?.()); }

function widgetFor(w) {
  if (w.type === 'staff') {
    const sv = staffView(w.staff);
    const notes = (w.staff.notes || []);
    const items = notes.map((n, i) => ({ midi: toMidi({ step: n.step, alter: n.acc === '#' ? 1 : n.acc === 'b' ? -1 : effectiveAlter(w.staff, i), octave: n.octave }), beats: DURATIONS[n.dur].beats }));
    return h('div', { class: 'widget' }, sv, w.caption ? h('p', { class: 'muted small' }, w.caption) : null,
      w.play && notes.length ? h('button', { class: 'btn ghost small', type: 'button', onclick: async () => { if (await audio.unlock()) audio.sequence(items, { bpm: 76, onNote: (i) => sv.redraw({ ...w.staff, highlight: [i] }) }); } }, '▶ 听一听') : null);
  }
  if (w.type === 'keyboard') {
    const kb = keyboard({});
    const demo = w.demo ? h('div', { class: 'q-actions' }, ...w.demo.map(([a, b]) => h('button', { class: 'btn ghost small', type: 'button', onclick: async () => { if (await audio.unlock()) playSeq([a, b], 70); } }, `▶ ${a.replace(/\d/, '')}→${b.replace(/\d/, '')}`))) : null;
    return h('div', { class: 'widget' }, kb, demo);
  }
  if (w.type === 'fingerboard') return h('div', { class: 'widget' }, fingerboard({ pos: w.pos, highlightFinger: w.highlightFinger ?? null }));
  if (w.type === 'spacing') return h('div', { class: 'widget' }, spacingDiagram(SPACING_SETS.find((s) => s.id === w.set)));
  return null;
}
import { actualAlter } from '../theory.js';
function effectiveAlter(staff, i) { return actualAlter(staff.notes, i, staff.keyCount ?? 0); }

/* ───────── 复习 ───────── */
export function reviewPage(store) {
  let ids = store.dueItems(10);
  let mode = '到期复习';
  if (!ids.length) { ids = store.weakItems(8).map((x) => x.id); mode = '错题再练'; }
  ids = ids.filter((id) => getQuestion(id) && getQuestion(id).type !== 'tap');
  if (!ids.length) {
    return h('div', { class: 'page review empty' }, mino('calm', 100), h('h1', {}, '现在没有需要复习的题'),
      h('p', { class: 'muted' }, '答过的题会按「次日 → 3 天 → 7 天 → 14 天」自动回来；答错的题明天就会出现在这里。'),
      h('a', { class: 'btn primary', href: '#/map' }, '去地图学新关卡'));
  }
  const fake = { id: 'review', world: getQuestion(ids[0]).id.startsWith('det.') ? 'w6' : 'w2', title: mode, intro: [{ step: '独立作答', title: mode, text: `${ids.length} 道题。每道题都来自你之前练过的关卡，答对后间隔会变长。` }], pool: () => ids, count: ids.length };
  LESSONS_REVIEW.set('review', fake);
  return lessonPage(store, 'review');
}
const LESSONS_REVIEW = new Map();
const _lessonById = lessonById;
// 复习关卡不写入正式关卡表，仅在本次会话中存在
export function resolveLesson(id) { return LESSONS_REVIEW.get(id) ?? _lessonById(id); }

/* ───────── 老师任务 & 曲目 ───────── */
export function tasksPage(store) {
  return h('div', { class: 'page tasks' },
    h('header', { class: 'page-head' }, h('h1', {}, '本周老师任务'), h('p', { class: 'muted' }, TEACHER_WEEKS[0].source)),
    ...TEACHER_WEEKS.map((w) => h('section', { class: 'card' }, h('h2', {}, w.label), h('ul', { class: 'task-list' }, ...w.tasks.map((t) => taskRow(store, t, false))))),
    h('section', { class: 'card' }, h('h2', {}, '曲目与技能标签'),
      h('p', { class: 'muted small' }, '曲目内容以小提琴页面为准，这里只标出每首曲子会用到的乐理技能。'),
      h('ul', { class: 'rep-list' }, ...REPERTOIRE.map((r) => h('li', {},
        h('strong', {}, r.title), r.composer ? h('span', { class: 'muted' }, ` · ${r.composer}`) : null,
        h('p', { class: 'muted small' }, r.source),
        r.facts ? h('p', { class: 'small' }, r.facts) : null,
        r.composerNote ? h('p', { class: 'small warn' }, r.composerNote) : null,
        r.pending ? h('p', { class: 'small warn' }, r.pending) : null,
        h('p', { class: 'tags' }, ...r.skills.map((s) => h('span', { class: 'tag' }, SKILLS[s])))))),
      h('a', { class: 'btn ghost', href: VIOLIN_URL }, '🎻 打开小提琴空间看课程记录')),
    h('section', { class: 'card' }, h('h2', {}, '关于揉弦 vibrato'),
      h('p', {}, '揉弦是左手手指在按弦的位置上做有控制的、细小的来回摆动，让长音更有歌唱感。它是这一年的后续目标。'),
      h('p', { class: 'muted' }, '揉弦的手腕、手指动作需要老师当面示范和纠正，所以这里只介绍概念，不安排揉弦动作练习。')),
  );
}
function taskRow(store, t, parent) {
  const statuses = t.skills.map((s) => store.skillStatus(s));
  const started = statuses.filter((s) => s.n > 0);
  let status;
  if (t.kind === 'future') status = h('span', { class: 'pill future' }, '后续目标');
  else if (t.kind === 'practice') {
    const checked = !!store.state.tasks[t.id];
    status = parent
      ? h('label', { class: 'check' }, h('input', { type: 'checkbox', checked, onchange: (e) => { store.setTaskChecked(t.id, e.target.checked); toast(e.target.checked ? '已记录：家长确认' : '已取消确认'); } }), ' 家长确认')
      : h('span', { class: `pill ${checked ? 'ok' : ''}` }, checked ? '家长已确认' : '待家长确认');
  } else if (!started.length) status = h('span', { class: 'pill' }, '未开始');
  else {
    const min = Math.min(...started.map((s) => s.level));
    status = h('span', { class: `pill lv${min}` }, started.length < statuses.length ? '进步中' : ['', '需复习', '进步中', '较熟练'][min]);
  }
  return h('li', {}, h('div', {}, h('strong', {}, t.title), t.note ? h('p', { class: 'muted small' }, t.note) : null,
    t.lessons ? h('p', { class: 'small' }, ...t.lessons.map((id) => { const l = id === 'w6.detective' ? LESSONS.find((x) => x.world === 'w6') : lessonById(id); return l ? h('a', { class: 'task-link', href: `#/lesson/${l.id}` }, l.title) : null; })) : null), status);
}

/* ───────── 家长视图（只读真实数据） ───────── */
export function parentPage(store) {
  const w = store.weekSummary();
  const st = store.state;
  const weak = store.weakItems(8);
  const rhythm = st.rhythm.slice(-5).reverse();
  const fileIn = h('input', { type: 'file', accept: 'application/json', class: 'sr-only', id: 'mq-import' });
  fileIn.addEventListener('change', async () => {
    const f = fileIn.files[0];
    if (!f) return;
    try { store.importJSON(await f.text()); toast('已从备份恢复'); location.hash = '#/parent'; window.dispatchEvent(new HashChangeEvent('hashchange')); }
    catch (e) { toast(`恢复失败：${e.message}`); }
  });
  return h('div', { class: 'page parent' },
    h('header', { class: 'page-head' }, h('h1', {}, '家长视图'), h('p', { class: 'muted' }, registerLabel('以下数据来自本设备的实际学习活动，观看和作答分开记录。','Les données viennent des activités enregistrées sur cet appareil. Visionnage et réponses sont comptés séparément.'))),
    h('section', { class: 'stats' },
      stat(String(w.days), '本周学习天数'), stat(String(w.lessons), '本周完成关卡'), stat(String(w.answers), '本周作答'),
      stat(w.answers ? `${Math.round((w.correct / w.answers) * 100)}%` : '—', '第一次答对率')),
    h('section', { class: 'card' }, h('h2', {}, '技能表现'),
      h('table', { class: 'skills' }, h('thead', {}, h('tr', {}, h('th', {}, '技能'), h('th', {}, '状态'), h('th', {}, '最近正确率'), h('th', {}, '作答'))),
        h('tbody', {}, ...Object.entries(SKILLS).map(([id, name]) => {
          const s = store.skillStatus(id);
          return h('tr', {}, h('td', {}, name), h('td', {}, h('span', { class: `pill lv${s.level}` }, s.label)), h('td', {}, s.acc == null ? '—' : `${Math.round(s.acc * 100)}%`), h('td', {}, String(s.n)));
        }))),
      h('p', { class: 'muted small' }, '状态说明：「较熟练」= 最近至少 5 次中 85% 以上第一次答对且没有到期题；不使用「已掌握」这样的绝对标签。')),
    h('section', { class: 'card' }, h('h2', {}, '薄弱点'),
      weak.length ? h('ul', { class: 'weak' }, ...weak.map((x) => { const q = getQuestion(x.id); return q ? h('li', {}, h('strong', {}, q.prompt), h('span', { class: 'muted small' }, ` 错 ${x.w} 次 · 对 ${x.c} 次 · ${SKILLS[q.skills[0]]}`)) : null; })) : h('p', { class: 'muted' }, '目前没有反复出错的题。')),
    h('section', { class: 'card' }, h('h2', {}, '老师任务完成情况'), h('ul', { class: 'task-list' }, ...TEACHER_WEEKS[0].tasks.map((t) => taskRow(store, t, true))),
      h('p', { class: 'muted small' }, '实体练琴类任务无法由应用判断，需要家长勾选确认。')),
    h('section', { class: 'card' }, h('h2', {}, '最近节奏挑战'),
      rhythm.length ? h('ul', {}, ...rhythm.map((r) => h('li', {}, `${r.at.slice(0, 10)} · ${r.bpm} BPM · 对上 ${r.hits}/${r.total}${r.meanAbsMs != null ? ` · 平均偏差 ${r.meanAbsMs} ms` : ''}${r.meanSignedMs != null && Math.abs(r.meanSignedMs) > 60 ? (r.meanSignedMs < 0 ? ' · 偏抢拍' : ' · 偏拖后') : ''}`))) : h('p', { class: 'muted' }, '还没有节奏挑战记录。')),
    h('section', { class: 'card' }, h('h2', {}, '数据保存'),
      h('p', {}, '学习记录保存在这台设备的浏览器里（localStorage：tt_music_quest_v1），', h('strong', {}, '目前不会跨设备同步'), '。换设备或清理浏览器数据前，请先导出备份。'),
      store.persistent ? null : h('p', { class: 'warn' }, '注意：当前浏览器不允许保存（可能是无痕模式），刷新后记录会丢失。'),
      h('div', { class: 'q-actions' },
        h('button', { class: 'btn ghost', type: 'button', onclick: () => {
          const blob = new Blob([store.exportJSON()], { type: 'application/json' });
          const a = h('a', { href: URL.createObjectURL(blob), download: `music-quest-backup-${store.today()}.json` });
          document.body.append(a); a.click(); a.remove();
        } }, '导出备份'),
        h('label', { class: 'btn ghost', for: 'mq-import' }, '从备份恢复'), fileIn)),
  );
}

export function notFound() {
  return h('div', { class: 'page empty' }, mino('think', 90), h('h1', {}, '没有找到这一关'), h('a', { class: 'btn primary', href: '#/map' }, '回到地图'));
}
export { VIOLIN_URL, HOME_URL, playNoteStr, staffView, noteToString };

function registerLabel(zh,fr){register(zh,fr);return zh;}
export function challengePage(store){
 const ready=LESSONS.some(l=>lessonPassed(store.state.lessons[l.id]));
 if(!ready)return h('section',{class:'page challenge-lock practice-bridge'},h('span',{class:'big-symbol'},'🗝'),h('h1',{},registerLabel('先收集第一把知识钥匙','Gagne ta première clé de connaissance')),h('p',{},registerLabel('先看动画、完成探索，再在一个练习关卡中独立答对至少60%，即可开启综合闯关。看视频的 XP 不会代替作答能力。','Regarde un film, explore puis réussis au moins 60 % d’un niveau seul pour ouvrir le défi. Les XP du film ne remplacent pas les réponses.')),h('a',{class:'btn primary',href:'#/learn'},registerLabel('▶ 从动画课堂开始','▶ Commencer par le film')));
 const eligible=[...bank().values()].filter(q=>q.type!=='tap' && !q.noHints && q.type!=='keyboard-scale');
 const familiar=eligible.filter(q=>q.skills.some(s=>(store.state.skills[s]?.recent.length||0)>0));
 const pool=shuffle(familiar.length>=8?familiar:eligible).slice(0,10).map(q=>q.id);
 const lesson={id:'challenge',world:'w6',title:registerLabel('Mino 知识宝藏闯关','Le trésor des connaissances'),intro:[{step:'独立作答',title:registerLabel('十个线索，找回音乐宝藏','Dix indices pour retrouver le trésor'),text:registerLabel('每道题先独立作答，答错可以学习后重试。先做过的技能会优先出现；没有倒计时，也不会扣除原站奖励。','Réponds seul, puis apprends de tes erreurs. Le défi privilégie les compétences déjà rencontrées. Pas de compte à rebours ni de perte des récompenses du site.')}],pool:()=>pool,count:pool.length};
 LESSONS_REVIEW.set('challenge',lesson);
 return lessonPage(store,'challenge');
}
