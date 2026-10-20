import {chapterProgress} from './progression.js';
// Music Quest · 学习记录与间隔复习
// 持久化：沿用本站已有约定（复习营 /revision/ 使用 localStorage 单键 JSON）。
// 仅保存在当前浏览器；不宣称跨设备同步。存储键：tt_music_quest_v1

export const STORE_KEY = 'tt_music_quest_v1';
export const SCHEMA_VERSION = 1;
/** 间隔复习：首次答对次日，再 3 天、7 天、14 天；答错回到「次日」 */
export const INTERVALS = [1, 3, 7, 14];
const MAX_LOG = 300;

/** 巴黎时间的日期键 YYYY-MM-DD */
export function dayKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(date);
}
export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}
export function diffDays(a, b) {
  const pa = Date.UTC(...a.split('-').map((x, i) => (i === 1 ? Number(x) - 1 : Number(x))));
  const pb = Date.UTC(...b.split('-').map((x, i) => (i === 1 ? Number(x) - 1 : Number(x))));
  return Math.round((pb - pa) / 86400000);
}

export function emptyState(now = new Date()) {
  return {
    version: SCHEMA_VERSION,
    createdAt: now.toISOString(),
    xp: 0,
    days: {}, // 'YYYY-MM-DD' → { lessons, answers, correct, xp }
    lessons: {}, // lessonId → { completed, bestAcc, lastAt }
    skills: {}, // skillId → { correct, wrong, recent: [1,0,...] (最近 12 次) }
    items: {}, // questionId → { c, w, stage, due, lastAt, xpDay }
    log: [], // 最近作答记录 { at, qid, ok, skill }
    rhythm: [], // 节奏挑战记录 { at, bpm, pattern, meanAbsMs, hits, total }
    tasks: {}, // taskId → { checkedAt }（家长手动勾选的实体练琴任务）
    settings: { muted: false },
  };
}

/** 数据迁移：保持向后兼容，旧字段保留，缺失字段补默认值 */
export function migrate(raw, now = new Date()) {
  const base = emptyState(now);
  if (!raw || typeof raw !== 'object') return base;
  const out = { ...base, ...raw };
  for (const k of ['days', 'lessons', 'skills', 'items', 'tasks']) {
    if (!out[k] || typeof out[k] !== 'object' || Array.isArray(out[k])) out[k] = {};
  }
  for (const k of ['log', 'rhythm']) if (!Array.isArray(out[k])) out[k] = [];
  out.settings = { ...base.settings, ...(raw.settings || {}) };
  if (!Number.isFinite(out.xp) || out.xp < 0) out.xp = 0;
  out.version = SCHEMA_VERSION;
  return out;
}

export function createStore(storage = globalThis.localStorage, clock = () => new Date()) {
  let state;
  let persistent = !!storage;
  try {
    const txt = storage?.getItem(STORE_KEY);
    state = migrate(txt ? JSON.parse(txt) : null, clock());
  } catch {
    state = emptyState(clock());
  }
  const listeners = new Set();

  function save(event = {}) {
    try {
      if (!storage) throw new Error('no storage');
      storage.setItem(STORE_KEY, JSON.stringify(state));
      persistent = true;
    } catch {
      persistent = false; // 隐私模式或存储已满：仍可练习，但提示无法保存
    }
    listeners.forEach((fn) => fn(state, event));
  }
  const today = () => dayKey(clock());
  const dayRec = () => (state.days[today()] ??= { lessons: 0, answers: 0, correct: 0, xp: 0 });

  /**
   * 记录一次作答。firstTry：本题第一次作答是否正确（提示/重试后答对算 false）。
   * 返回 { xpGained }。
   */
  function recordAnswer({ qid, skills = [], ok, firstTry = ok, hinted = false, followup = false }) {
    const t = today();
    const it = (state.items[qid] ??= { c: 0, w: 0, stage: 0, due: null, lastAt: null, xpDay: null });
    it.lastAt = clock().toISOString();
    let xpGained = 0;
    if (ok) {
      it.c += 1;
      // 键盘题在点完音阶后统一提交，错按也必须进入薄弱题记录。
      if (!firstTry && !followup) it.w += 1;
      if (firstTry && !hinted) {
        it.stage = Math.min(it.stage + 1, INTERVALS.length);
        it.due = addDays(t, INTERVALS[it.stage - 1]);
      } else {
        // 经提示或重试才答对：视为仍需巩固，明天再见
        it.stage = 1;
        it.due = addDays(t, 1);
      }
      // 防刷分：同一题同一天只计一次经验
      if (it.xpDay !== t) {
        xpGained = firstTry && !hinted ? 10 : 4;
        it.xpDay = t;
      }
    } else {
      it.w += 1;
      it.stage = 1;
      it.due = addDays(t, 1);
    }
    for (const s of skills) {
      const sk = (state.skills[s] ??= { correct: 0, wrong: 0, recent: [] });
      // 技能统计只看「第一次作答」，避免重试把正确率刷高
      if (!followup && firstTry !== null) {
        if (ok && firstTry && !hinted) sk.correct += 1;
        else sk.wrong += 1;
        sk.recent.push(ok && firstTry && !hinted ? 1 : 0);
        if (sk.recent.length > 12) sk.recent.shift();
      }
    }
    const d = dayRec();
    if (!followup) d.answers += 1;
    if (!followup && ok && firstTry && !hinted) d.correct += 1;
    d.xp += xpGained;
    state.xp += xpGained;
    state.log.push({ at: clock().toISOString(), qid, ok: !!ok, first: !!firstTry, skill: skills[0] ?? null });
    if (state.log.length > MAX_LOG) state.log.splice(0, state.log.length - MAX_LOG);
    save({type:'answer',xpGained});
    return { xpGained };
  }

  /** 关卡完成：正确率 ≥ 60% 才给完成奖励，同一关同一天只奖励一次 */
  function completeLesson(lessonId, acc) {
    const t = today();
    const l = (state.lessons[lessonId] ??= { completed: 0, bestAcc: 0, lastAt: null, bonusDay: null });
    l.completed += 1;
    l.bestAcc = Math.max(l.bestAcc, acc);
    l.lastAt = clock().toISOString();
    let bonus = 0;
    if (acc >= 0.6 && l.bonusDay !== t) {
      bonus = 20;
      l.bonusDay = t;
    }
    const d = dayRec();
    d.lessons += 1;
    d.xp += bonus;
    state.xp += bonus;
    save({type:'lesson',xpGained:bonus});
    return { bonus };
  }

  function recordRhythm(run) {
    state.rhythm.push({ at: clock().toISOString(), ...run });
    if (state.rhythm.length > 100) state.rhythm.shift();
    dayRec();
    save();
  }

  function setTaskChecked(taskId, checked) {
    if (checked) state.tasks[taskId] = { checkedAt: clock().toISOString() };
    else delete state.tasks[taskId];
    save();
  }

  function setSetting(k, v) {
    state.settings[k] = v;
    save();
  }

  // Teaching rewards are distinct from answers, mastery, money and real practice.
  // Only these fixed categories can earn a one-time reward for an authored course.
  function awardActivity(course, kind) {
    if (!['staff','sharps','accidentals','steps','rhythm','violin','ear','detective'].includes(course)) return {xpGained:0};
    const amount = {film: 10, workshop: 5}[kind];
    if (!amount) return {xpGained:0};
    const rewards = (state.settings.activityRewards ??= {});
    const key = course+':'+kind;
    if (rewards[key]) return {xpGained:0};
    rewards[key] = {at:clock().toISOString(), xp:amount};
    state.xp += amount;
    const d = dayRec(); d.xp += amount; d.activities = (d.activities || 0)+1;
    save({type:'activity',xpGained:amount});
    return {xpGained:amount};
  }

  /** Guardians use only completed real chapter work; no retroactive or repeated bonus. */
  function completeGuardian(world, acc) {
    if (!Number.isFinite(acc) || acc<0 || acc>1 || !chapterProgress(state,world)?.guardian.ready) return {accepted:false,bonus:0};
    const records=(state.settings.campaignGuardians??={});
    const previous=records[world]||{attempts:0,bestAcc:0};
    const firstClear=acc>=.6&&!previous.clearedAt;
    records[world]={...previous,attempts:previous.attempts+1,bestAcc:Math.max(previous.bestAcc,acc),lastAt:clock().toISOString(),...(firstClear?{clearedAt:clock().toISOString()}: {})};
    const bonus=firstClear?30:0;
    if(bonus){state.xp+=bonus;const d=dayRec();d.xp+=bonus;d.activities=(d.activities||0)+1;}
    save({type:'guardian',xpGained:bonus});return {accepted:true,bonus,cleared:acc>=.6};
  }

  /** 到期需要复习的题目 ID（按到期日排序） */
  function dueItems(limit = 20) {
    const t = today();
    return Object.entries(state.items)
      .filter(([, it]) => it.due && it.due <= t)
      .sort((a, b) => (a[1].due < b[1].due ? -1 : 1))
      .map(([id]) => id)
      .slice(0, limit);
  }

  /** 错题：错过且最近一次尚未稳定（stage ≤ 1） */
  function weakItems(limit = 10) {
    return Object.entries(state.items)
      .filter(([, it]) => it.w > 0 && it.stage <= 1)
      .sort((a, b) => b[1].w - a[1].w)
      .map(([id, it]) => ({ id, ...it }))
      .slice(0, limit);
  }

  /** 连续学习天数（今天或昨天有真实完成的课程活动或关卡才算连续） */
  function streak() {
    let k = today();
    const active = (d) => (state.days[d]?.lessons ?? 0) > 0 || (state.days[d]?.activities ?? 0) > 0;
    if (!active(k)) k = addDays(k, -1);
    let n = 0;
    while (active(k)) {
      n += 1;
      k = addDays(k, -1);
    }
    return n;
  }

  /** 技能状态：不使用绝对化「已掌握」，只给 需复习 / 进步中 / 较熟练 */
  function skillStatus(skillId) {
    const sk = state.skills[skillId];
    if (!sk || sk.correct + sk.wrong === 0) return { label: '未开始', level: 0, acc: null, n: 0 };
    const recent = sk.recent;
    const acc = recent.reduce((a, b) => a + b, 0) / recent.length;
    const t = today();
    const hasDue = Object.entries(state.items).some(([id, it]) => it.due && it.due <= t && itemSkill(id) === skillId);
    let label = '进步中', level = 2;
    if (recent.length >= 5 && acc >= 0.85 && !hasDue) { label = '较熟练'; level = 3; }
    else if (acc < 0.6 || (hasDue && acc < 0.85)) { label = '需复习'; level = 1; }
    return { label, level, acc, n: sk.correct + sk.wrong };
  }
  // 题目 ID → 主技能：由内容模块注册
  let itemSkill = () => null;
  function setItemSkillResolver(fn) { itemSkill = fn; }

  /** 本周（周一开始，巴黎时间）统计 */
  function weekSummary() {
    const t = today();
    const [y, m, d] = t.split('-').map(Number);
    const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // 周一=0
    const monday = addDays(t, -dow);
    let days = 0, lessons = 0, answers = 0, correct = 0;
    for (let i = 0; i <= dow; i++) {
      const rec = state.days[addDays(monday, i)];
      if (rec && (rec.lessons > 0 || rec.answers > 0 || (rec.activities || 0) > 0)) days += 1;
      lessons += rec?.lessons ?? 0;
      answers += rec?.answers ?? 0;
      correct += rec?.correct ?? 0;
    }
    return { monday, days, lessons, answers, correct };
  }

  function exportJSON() {
    return JSON.stringify({ exportedAt: clock().toISOString(), key: STORE_KEY, data: state }, null, 2);
  }
  function importJSON(txt) {
    const obj = JSON.parse(txt);
    const data = obj && obj.key === STORE_KEY ? obj.data : null;
    if (!data || typeof data !== 'object' || !('items' in data)) throw new Error('不是乐理冒险岛的备份文件');
    state = migrate(data, clock());
    save();
  }

  return {
    get state() { return state; },
    get persistent() { return persistent; },
    today, recordAnswer, completeLesson, recordRhythm, setTaskChecked, setSetting, awardActivity, completeGuardian,
    dueItems, weakItems, streak, skillStatus, setItemSkillResolver, weekSummary,
    exportJSON, importJSON,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
}

/** 等级：每级所需经验递增，仅作激励 */
export function levelFromXp(xp) {
  let level = 1, need = 100, acc = 0;
  while (xp >= acc + need) { acc += need; level += 1; need = 100 + (level - 1) * 50; }
  const titles = ['音符见习生', '五线谱水手', '升降号学徒', '节奏守护者', '指板探险家', '识谱侦探', '乐理骑士'];
  return { level, into: xp - acc, need, title: titles[Math.min(level - 1, titles.length - 1)] };
}
