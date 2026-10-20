import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bank, LESSONS, WORLDS, SKILLS, getQuestion } from '../../music-theory/js/content/index.js';
import { EXCERPTS, verifyExcerpt, buildDetective } from '../../music-theory/js/content/castle.js';
import { ACCIDENTAL_CONTEXTS } from '../../music-theory/js/content/towers.js';
import { SPACING_SETS, spacingAnswer } from '../../music-theory/js/content/lab.js';
import { TAP_PATTERNS, scoreTaps } from '../../music-theory/js/content/arena.js';
import { actualAlter, measureBeats, DURATIONS, midi, majorScale } from '../../music-theory/js/theory.js';
import { placements } from '../../music-theory/js/violin.js';
import { TEACHER_WEEKS, REPERTOIRE } from '../../music-theory/js/content/tasks.js';

const all = [...bank().values()];

test('题库：ID 唯一、字段完整、技能 ID 合法、答案在选项内', () => {
  assert.ok(all.length > 150, `题量 ${all.length}`);
  for (const q of all) {
    assert.ok(q.id && q.type && q.prompt && q.explain, q.id);
    assert.ok(q.skills.length > 0, q.id);
    for (const s of q.skills) assert.ok(SKILLS[s], `${q.id} 未知技能 ${s}`);
    assert.ok([1, 2, 3].includes(q.difficulty), q.id);
    const vals = (q.options ?? []).map((o) => o.value);
    if (q.type === 'choice') assert.ok(vals.includes(q.answer), `${q.id} 答案不在选项`);
    if (q.type === 'multi') { assert.ok(q.answer.length > 0); for (const a of q.answer) assert.ok(vals.includes(a), `${q.id} ${a}`); }
    if (q.type === 'order') assert.deepEqual([...q.tiles].sort(), [...q.answer].sort(), q.id);
    if (q.type === 'choice' || q.type === 'multi') assert.equal(new Set(vals).size, vals.length, `${q.id} 选项重复`);
  }
});
test('所有 18 个建议技能都有题目覆盖', () => {
  const used = new Set(all.flatMap((q) => q.skills));
  for (const s of Object.keys(SKILLS)) assert.ok(used.has(s), `技能无题目: ${s}`);
});
test('还原号情境：规则计算 = 人工核对值', () => {
  for (const c of ACCIDENTAL_CONTEXTS) {
    assert.equal(actualAlter(c.notes, c.hi, c.keyCount), c.expect, c.id);
    assert.equal(getQuestion(c.id).answer, String(c.expect));
    for (const [m, beats] of measureBeats(c.notes)) assert.ok(beats <= 4, `${c.id} 小节 ${m}`);
  }
});
test('识谱侦探：每个音的实际音高、琴弦、指法全部核对通过；每小节正好 4 拍', () => {
  for (const ex of EXCERPTS) {
    assert.deepEqual(verifyExcerpt(ex), []);
    for (const [m, b] of measureBeats(ex.notes)) assert.equal(b, 4, `${ex.id} 小节 ${m}`);
    const d = buildDetective(ex);
    assert.equal(d.steps.length, 7);
    // 第 4 步：音符 + 指法 + 把位 → 唯一琴弦
    for (const q of d.steps[3].questions) {
      const i = Number(q.id.split('.').pop());
      const n = ex.notes[i];
      const cands = placements(d.actual[i], ex.position).filter((p) => p.finger === n.finger);
      assert.equal(cands.length, 1, `${q.id} 琴弦不唯一`);
      assert.equal(cands[0].string, q.answer);
    }
  }
});
test('手指靠拢题：每组恰好一处半音', () => {
  for (const s of SPACING_SETS) {
    const p = spacingAnswer(s);
    assert.equal(p.filter((x) => x.kind === 'close').length, 1, s.id);
    assert.ok(p.every((x) => x.kind !== 'other'), s.id);
  }
});
test('D 大调键盘题答案', () => {
  const q = getQuestion('scale.build.D');
  assert.deepEqual(q.answer, [62, 64, 66, 67, 69, 71, 73, 74]);
  assert.deepEqual(getQuestion('scale.half.D').answer, ['2', '6']);
});
test('节奏型都是完整 4/4 小节', () => {
  for (const p of TAP_PATTERNS) assert.equal(p.durs.reduce((a, d) => a + DURATIONS[d].beats, 0), 4, p.id);
});
test('节奏评分：准确、抢拍、漏拍、多敲', () => {
  const exp = [0, 0.5, 1, 1.5];
  const perfect = scoreTaps(exp, [0.01, 0.49, 1.02, 1.5]);
  assert.equal(perfect.good, 4); assert.equal(perfect.extra, 0); assert.ok(perfect.score > 0.95);
  const early = scoreTaps(exp, [-0.15, 0.35, 0.85, 1.35]);
  assert.equal(early.hits, 4); assert.ok(early.meanSignedMs < -100);
  const missing = scoreTaps(exp, [0, 0.5]);
  assert.equal(missing.hits, 2); assert.equal(missing.total, 4);
  const extra = scoreTaps(exp, [0, 0.25, 0.5, 1, 1.5, 1.75]);
  assert.equal(extra.extra, 2);
  const none = scoreTaps(exp, []);
  assert.equal(none.score, 0);
});
test('关卡：题池非空、题目存在、世界存在', () => {
  for (const l of LESSONS) {
    assert.ok(WORLDS.find((w) => w.id === l.world), l.id);
    if (l.detective) { assert.ok(EXCERPTS.find((e) => e.id === l.detective)); continue; }
    const pool = l.pool();
    assert.ok(pool.length >= (l.count ?? 1), `${l.id} 题量不足`);
    for (const id of pool) assert.ok(getQuestion(id), `${l.id} 缺题 ${id}`);
    for (const id of l.must ?? []) assert.ok(pool.includes(id));
  }
  for (const w of WORLDS) assert.ok(LESSONS.some((l) => l.world === w.id), w.id);
});
test('老师任务：技能与关卡引用有效；揉弦仅为未来目标；作曲者未硬编码', () => {
  const lessonIds = new Set(LESSONS.map((l) => l.id).concat(['w6.detective']));
  for (const w of TEACHER_WEEKS) for (const t of w.tasks) {
    for (const s of t.skills) assert.ok(SKILLS[s], t.id);
    for (const l of t.lessons ?? []) assert.ok(lessonIds.has(l), `${t.id} → ${l}`);
  }
  const vib = TEACHER_WEEKS[0].tasks.find((t) => t.id === 'tw1.vibrato');
  assert.equal(vib.kind, 'future'); assert.ok(!vib.lessons);
  assert.equal(REPERTOIRE.find((r) => r.id === 'fantaisie-russe').composer, null);
});
test('键盘音阶题的音都在键盘范围内（C4–E5）', () => {
  for (const n of majorScale('D', 4)) assert.ok(midi(n) >= 60 && midi(n) <= 76);
});
test('侦探节奏题：所有选项都是完整 4/4 小节且互不相同', () => {
  for (const ex of EXCERPTS) {
    const q = buildDetective(ex).steps[4].questions[0];
    const words = { ronde: 4, blanche: 2, noire: 1, croche: 0.5 };
    for (const o of q.options) assert.equal(o.value.split(' – ').reduce((a, w) => a + words[w], 0), 4, `${q.id}: ${o.value}`);
    assert.equal(new Set(q.options.map((o) => o.value)).size, 3);
  }
});
test('识谱侦探独立再读：不出现 Mi♯ Si♯ Fa♭ Do♭ 等罕见拼写', () => {
  for (const q of [...bank().values()].filter((x) => x.id.includes('.solo.'))) {
    for (const o of q.options) assert.ok(!/^(Mi♯|Si♯|Fa♭|Do♭)$/.test(o.value) || o.value === q.answer, `${q.id}: ${o.value}`);
  }
});
test('孩子看到的文字里八度号用法国习惯（不出现 Sol3 空弦、La4=440 之类科学记法）', () => {
  const txt = [...bank().values()].map((q) => q.prompt + q.explain).join('\n') + JSON.stringify(LESSONS.map((l) => l.intro));
  assert.ok(!/Sol3 – Ré4 – La4 – Mi5/.test(txt));
  assert.ok(/Sol2 – Ré3 – La3 – Mi4/.test(txt));
});
