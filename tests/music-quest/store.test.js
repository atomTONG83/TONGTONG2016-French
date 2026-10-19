import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, STORE_KEY, addDays, dayKey, migrate, levelFromXp } from '../../music-theory/js/store.js';

function mem() { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), _m: m }; }
function clockAt(iso) { let t = new Date(iso); return { now: () => t, set: (x) => { t = new Date(x); } }; }

test('间隔复习：次日 → 3 天 → 7 天 → 14 天；答错回到次日', () => {
  const s = mem(); const c = clockAt('2026-10-19T10:00:00+02:00');
  const st = createStore(s, c.now);
  st.recordAnswer({ qid: 'q1', skills: ['theory.sharp_order'], ok: true });
  assert.equal(st.state.items.q1.due, '2026-10-20');
  c.set('2026-10-20T10:00:00+02:00'); st.recordAnswer({ qid: 'q1', skills: [], ok: true });
  assert.equal(st.state.items.q1.due, '2026-10-23');
  c.set('2026-10-23T10:00:00+02:00'); st.recordAnswer({ qid: 'q1', skills: [], ok: true });
  assert.equal(st.state.items.q1.due, '2026-10-30');
  c.set('2026-10-30T10:00:00+02:00'); st.recordAnswer({ qid: 'q1', skills: [], ok: true });
  assert.equal(st.state.items.q1.due, '2026-11-13');
  st.recordAnswer({ qid: 'q1', skills: [], ok: false });
  assert.equal(st.state.items.q1.due, '2026-10-31');
  assert.equal(st.state.items.q1.stage, 1);
});
test('提示后答对：不升级，次日复习；经验减少', () => {
  const st = createStore(mem(), () => new Date('2026-10-19T10:00:00Z'));
  const r = st.recordAnswer({ qid: 'q2', skills: ['a'], ok: true, hinted: true });
  assert.equal(r.xpGained, 4);
  assert.equal(st.state.items.q2.due, '2026-10-20');
});
test('防刷分：同一题同一天只计一次经验', () => {
  const st = createStore(mem(), () => new Date('2026-10-19T10:00:00Z'));
  assert.equal(st.recordAnswer({ qid: 'q3', skills: [], ok: true }).xpGained, 10);
  assert.equal(st.recordAnswer({ qid: 'q3', skills: [], ok: true }).xpGained, 0);
  assert.equal(st.state.xp, 10);
});
test('刷新后保留（持久化往返）', () => {
  const s = mem(); const now = () => new Date('2026-10-19T10:00:00Z');
  const a = createStore(s, now);
  a.recordAnswer({ qid: 'q4', skills: ['theory.flat_order'], ok: false });
  a.completeLesson('w2.flats', 0.7);
  const b = createStore(s, now);
  assert.equal(b.state.items.q4.w, 1);
  assert.equal(b.state.lessons['w2.flats'].completed, 1);
  assert.ok(s._m.has(STORE_KEY));
  assert.deepEqual(b.weakItems().map((x) => x.id), ['q4']);
});
test('到期复习列表', () => {
  const s = mem(); const c = clockAt('2026-10-19T10:00:00Z');
  const st = createStore(s, c.now);
  st.recordAnswer({ qid: 'a', skills: [], ok: true });
  st.recordAnswer({ qid: 'b', skills: [], ok: false });
  assert.deepEqual(st.dueItems(), []);
  c.set('2026-10-20T10:00:00Z');
  assert.deepEqual(st.dueItems().sort(), ['a', 'b']);
});
test('关卡奖励：正确率 ≥60% 且每天一次', () => {
  const st = createStore(mem(), () => new Date('2026-10-19T10:00:00Z'));
  assert.equal(st.completeLesson('L', 0.5).bonus, 0);
  assert.equal(st.completeLesson('L', 0.8).bonus, 20);
  assert.equal(st.completeLesson('L', 0.9).bonus, 0);
});
test('连续天数', () => {
  const s = mem(); const c = clockAt('2026-10-17T10:00:00Z');
  const st = createStore(s, c.now);
  st.completeLesson('L', 1);
  c.set('2026-10-18T10:00:00Z'); st.completeLesson('L', 1);
  c.set('2026-10-19T10:00:00Z');
  assert.equal(st.streak(), 2, '今天还没学，昨天连续仍算');
  st.completeLesson('L', 1);
  assert.equal(st.streak(), 3);
  c.set('2026-10-21T10:00:00Z');
  assert.equal(st.streak(), 0);
});
test('技能状态不使用绝对化「掌握」', () => {
  const st = createStore(mem(), () => new Date('2026-10-19T10:00:00Z'));
  st.setItemSkillResolver(() => 'x');
  assert.equal(st.skillStatus('x').label, '未开始');
  for (let i = 0; i < 6; i++) st.recordAnswer({ qid: 'z' + i, skills: ['x'], ok: true });
  assert.equal(st.skillStatus('x').label, '较熟练');
  for (let i = 0; i < 6; i++) st.recordAnswer({ qid: 'w' + i, skills: ['x'], ok: false });
  assert.equal(st.skillStatus('x').label, '需复习');
});
test('损坏数据与迁移', () => {
  const s = mem(); s.setItem(STORE_KEY, '{not json');
  const st = createStore(s, () => new Date());
  assert.equal(st.state.xp, 0);
  const m = migrate({ xp: -5, items: [], settings: { muted: true } });
  assert.equal(m.xp, 0); assert.deepEqual(m.items, {}); assert.equal(m.settings.muted, true);
});
test('存储不可写时仍可练习', () => {
  const broken = { getItem: () => null, setItem: () => { throw new Error('QuotaExceeded'); } };
  const st = createStore(broken, () => new Date());
  st.recordAnswer({ qid: 'q', skills: [], ok: true });
  assert.equal(st.persistent, false);
});
test('导出/导入备份', () => {
  const a = createStore(mem(), () => new Date('2026-10-19T10:00:00Z'));
  a.recordAnswer({ qid: 'q', skills: [], ok: true });
  const b = createStore(mem(), () => new Date('2026-10-19T10:00:00Z'));
  b.importJSON(a.exportJSON());
  assert.equal(b.state.xp, 10);
  assert.throws(() => b.importJSON('{"foo":1}'));
});
test('日期工具与等级', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(dayKey(new Date('2026-10-19T23:30:00Z')), '2026-10-20', '巴黎时间');
  assert.equal(levelFromXp(0).level, 1);
  assert.equal(levelFromXp(100).level, 2);
});
test('本周统计从周一开始', () => {
  const s = mem(); const c = clockAt('2026-10-19T10:00:00Z'); // 周一
  const st = createStore(s, c.now);
  st.completeLesson('L', 1);
  c.set('2026-10-21T10:00:00Z');
  st.recordAnswer({ qid: 'q', skills: [], ok: true });
  const w = st.weekSummary();
  assert.equal(w.monday, '2026-10-19'); assert.equal(w.days, 2); assert.equal(w.lessons, 1);
});
