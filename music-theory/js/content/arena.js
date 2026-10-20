// 世界 3 · 节奏竞技场：时值、拍数、敲击节奏（真实时间采集）
import { DURATIONS } from '../theory.js';

const durLabel = (d) => `${DURATIONS[d].fr}（${DURATIONS[d].zh}）`;

/** 4/4 拍单小节节奏型（敲击游戏），每个都会在单元测试中验证正好 4 拍 */
export const TAP_PATTERNS = [
  { id: 'tap.qqqq', durs: ['q', 'q', 'q', 'q'], level: 1, title: '四个 noires · 稳稳走路' },
  { id: 'tap.hh', durs: ['h', 'h'], level: 1, title: '两个 blanches · 长音拉满' },
  { id: 'tap.hqq', durs: ['h', 'q', 'q'], level: 1, title: 'blanche + 两个 noires' },
  { id: 'tap.qqh', durs: ['q', 'q', 'h'], level: 1, title: '两个 noires + blanche' },
  { id: 'tap.q88qq', durs: ['q', '8', '8', 'q', 'q'], level: 2, title: '加入一对 croches' },
  { id: 'tap.88q88q', durs: ['8', '8', 'q', '8', '8', 'q'], level: 2, title: 'croches 与 noires 交替' },
  { id: 'tap.q88h', durs: ['q', '8', '8', 'h'], level: 2, title: '跑两步再停住' },
];

/** 适龄、宽容的判定窗口（毫秒） */
export const TAP_WINDOWS = { good: 110, ok: 220 };

/**
 * 评分：taps 与 expected 都是秒（同一时钟）。
 * 每个期望音配对一次最接近的敲击；多余敲击单独计数。
 */
export function scoreTaps(expected, taps, windows = TAP_WINDOWS) {
  const used = new Set();
  const results = expected.map((e) => {
    let best = -1, bestD = Infinity;
    taps.forEach((t, i) => {
      if (used.has(i)) return;
      const d = Math.abs(t - e);
      if (d < bestD) { bestD = d; best = i; }
    });
    const ms = best >= 0 ? Math.round((taps[best] - e) * 1000) : null;
    if (best >= 0 && Math.abs(ms) <= windows.ok) {
      used.add(best);
      return { expected: e, offsetMs: ms, grade: Math.abs(ms) <= windows.good ? 'good' : 'ok' };
    }
    return { expected: e, offsetMs: null, grade: 'miss' };
  });
  const extra = taps.length - used.size;
  const hits = results.filter((r) => r.grade !== 'miss');
  const meanAbsMs = hits.length ? Math.round(hits.reduce((a, r) => a + Math.abs(r.offsetMs), 0) / hits.length) : null;
  const meanSignedMs = hits.length ? Math.round(hits.reduce((a, r) => a + r.offsetMs, 0) / hits.length) : null;
  const good = results.filter((r) => r.grade === 'good').length;
  const score = expected.length ? (good + 0.6 * (hits.length - good)) / expected.length - 0.1 * Math.max(0, extra) : 0;
  return { results, hits: hits.length, good, total: expected.length, extra, meanAbsMs, meanSignedMs, score: Math.max(0, Math.min(1, score)) };
}

/** 根据评分给出适龄反馈（不羞辱，指出具体可改进处） */
export function tapFeedback(s, durs = []) {
  const tips = [];
  if (s.meanSignedMs != null && s.meanSignedMs < -60) tips.push('整体有点「抢拍」：敲之前先在心里数「1、2、3、4」，等拍子到了再敲。');
  if (s.meanSignedMs != null && s.meanSignedMs > 60) tips.push('整体稍微「拖后」：跟着滴答声提前准备好手指。');
  if (s.extra > 0) tips.push(durs.includes('h') ? `多敲了 ${s.extra} 下：blanche（二分音符）要占满 2 拍，中间不要再敲。` : `多敲了 ${s.extra} 下：每个音只在开头敲一下。`);
  if (s.total - s.hits > 0) tips.push(`有 ${s.total - s.hits} 个音没对上，可以把速度调慢一点再试。`);
  let head;
  if (s.score >= 0.85) head = '节奏很稳！🎯';
  else if (s.score >= 0.6) head = '大部分都对上了，再来一次会更稳。';
  else head = '没关系，节奏是练出来的。先慢一点，跟着滴答声数拍。';
  return { head, tips };
}

export function arenaQuestions() {
  const qs = [];
  for (const d of ['w', 'h', 'q', '8']) {
    qs.push({
      id: `dur.name.${d}`, type: 'choice', skills: [d === 'h' ? 'rhythm.half_note' : d === '8' ? 'rhythm.eighth_note' : 'rhythm.quarter_note'], difficulty: 1,
      staff: { keyCount: 0, time: null, notes: [{ step: 'B', octave: 4, acc: null, dur: d, measure: 1 }] },
      prompt: '这个音符的法语名称是？',
      options: ['w', 'h', 'q', '8'].map((x) => ({ value: x, label: durLabel(x) })), answer: d,
      explain: `${durLabel(d)}，在 4/4 拍里占 ${DURATIONS[d].beats} 拍。ronde 空心无符干；blanche 空心有符干；noire 实心有符干；croche 实心、有符干和一条符尾（几个连在一起时用横梁）。`,
    });
    qs.push({
      id: `dur.beats.${d}`, type: 'choice', skills: [d === 'h' ? 'rhythm.half_note' : d === '8' ? 'rhythm.eighth_note' : 'rhythm.quarter_note'], difficulty: 1,
      staff: { keyCount: 0, time: '4/4', notes: [{ step: 'B', octave: 4, acc: null, dur: d, measure: 1 }] },
      prompt: `在 4/4 拍里，一个 ${DURATIONS[d].fr}（${DURATIONS[d].zh}）占几拍？`,
      options: [['0.5', '半拍'], ['1', '1 拍'], ['2', '2 拍'], ['4', '4 拍']].map(([v, l]) => ({ value: v, label: l })),
      answer: String(DURATIONS[d].beats),
      explain: `以 noire（四分音符）为 1 拍：ronde = 4 拍，blanche = 2 拍，noire = 1 拍，croche = 半拍（两个 croches 才是 1 拍）。`,
    });
  }
  const fills = [
    { id: 'dur.fill.hq', have: ['h', 'q'], missing: 1 },
    { id: 'dur.fill.q88', have: ['q', '8', '8'], missing: 2 },
    { id: 'dur.fill.888', have: ['8', '8', 'h', '8'], missing: 0.5 },
    { id: 'dur.fill.h', have: ['h'], missing: 2 },
  ];
  for (const f of fills) {
    const sum = f.have.reduce((a, d) => a + DURATIONS[d].beats, 0);
    if (sum + f.missing !== 4) throw new Error(`节奏题数据错误 ${f.id}`);
    qs.push({
      id: f.id, type: 'choice', skills: ['rhythm.steady_pulse'], difficulty: 2,
      prompt: `一个 4/4 小节里已经有：${f.have.map((d) => DURATIONS[d].fr).join(' + ')}。还差几拍才满？`,
      options: [['0.5', '半拍'], ['1', '1 拍'], ['2', '2 拍'], ['3', '3 拍']].map(([v, l]) => ({ value: v, label: l })),
      answer: String(f.missing),
      explain: `${f.have.map((d) => `${DURATIONS[d].fr} ${DURATIONS[d].beats}`).join(' + ')} = ${sum} 拍；4/4 拍每小节 4 拍，所以还差 ${f.missing} 拍。长音一定要拉满它的拍数，不要提前结束。`,
    });
  }
  qs.push({
    id: 'dur.two-croches', type: 'choice', skills: ['rhythm.eighth_note'], difficulty: 1,
    prompt: '两个 croches（八分音符）加起来，等于哪一个音符的时值？',
    options: ['w', 'h', 'q'].map((x) => ({ value: x, label: durLabel(x) })), answer: 'q',
    explain: '每个 croche 半拍，两个 croches 合起来 1 拍 = 一个 noire。数拍时可以念「1 和 2 和」，croche 落在「1」和「和」上。',
  });
  qs.push({
    id: 'rhythm.before-play', type: 'order', skills: ['rhythm.steady_pulse', 'reading.independent_decoding'], difficulty: 1,
    prompt: '开始拉一首曲子之前，先做这几件事。按顺序排好：',
    tiles: ['看调号和拍号', '把音名、节奏都读一遍', '摆好姿势、深呼吸', '心里数一小节再开始'],
    answer: ['看调号和拍号', '把音名、节奏都读一遍', '摆好姿势、深呼吸', '心里数一小节再开始'],
    explain: '老师课上的要求：不要一拿起琴就急着拉。先看调号、拍号和节奏，摆好姿势，在心里数一小节预备拍，再稳稳地进入，就不容易抢拍。',
  });
  for (const p of TAP_PATTERNS) {
    qs.push({
      id: p.id, type: 'tap', skills: ['rhythm.steady_pulse', ...new Set(p.durs.map((d) => (d === 'h' ? 'rhythm.half_note' : d === '8' ? 'rhythm.eighth_note' : 'rhythm.quarter_note')))],
      difficulty: p.level, pattern: p,
      prompt: `跟着节拍器敲出这个节奏：${p.title}`,
      explain: '每个音的开头敲一下；长音（blanche）只敲一下，然后让它响满两拍。',
    });
  }
  return qs;
}
