// 世界 2 · 升降号魔法塔：升号/降号顺序、调号、还原号
import {
  SHARP_ORDER, FLAT_ORDER, FR_NAME, KEYS, keySignatureSteps, frenchName, actualAlter, ACCIDENTALS,
} from '../theory.js';

const fr = (s) => FR_NAME[s];
const nameOpts = () => Object.values(FR_NAME).map((n) => ({ value: n, label: n }));
const accName = (alter) => (alter === 1 ? 'dièse ♯' : alter === -1 ? 'bémol ♭' : 'bécarre / 本位');

export function towerQuestions() {
  const qs = [];

  qs.push({
    id: 'order.sharps', type: 'order', skills: ['theory.sharp_order'], difficulty: 1,
    prompt: '把 7 个升号按「加入调号的先后顺序」排好。',
    tiles: SHARP_ORDER.map(fr), answer: SHARP_ORDER.map(fr),
    explain: '升号顺序 Fa – Do – Sol – Ré – La – Mi – Si。小窍门：从一个升号往上数到第 5 个音名，就是下一个升号（Fa、Sol、La、Si、Do → 下一个是 Do），一直这样数下去。',
  });
  qs.push({
    id: 'order.flats', type: 'order', skills: ['theory.flat_order'], difficulty: 1,
    prompt: '把 7 个降号按「加入调号的先后顺序」排好。',
    tiles: FLAT_ORDER.map(fr), answer: FLAT_ORDER.map(fr),
    explain: '降号顺序 Si – Mi – La – Ré – Sol – Do – Fa，正好是升号顺序倒过来读。从一个降号往上数到第 4 个音名，就是下一个降号（Si、Do、Ré、Mi → 下一个是 Mi）。',
  });

  SHARP_ORDER.forEach((s, i) => qs.push({
    id: `sharps.index.${i + 1}`, type: 'choice', skills: ['theory.sharp_order'], difficulty: 1,
    prompt: `升号顺序里，第 ${i + 1} 个升号是哪个音？`,
    options: nameOpts(), answer: fr(s),
    explain: `升号顺序 Fa–Do–Sol–Ré–La–Mi–Si，第 ${i + 1} 个是 ${fr(s)}（${fr(s)} dièse）。`,
  }));
  FLAT_ORDER.forEach((s, i) => qs.push({
    id: `flats.index.${i + 1}`, type: 'choice', skills: ['theory.flat_order'], difficulty: 1,
    prompt: `降号顺序里，第 ${i + 1} 个降号是哪个音？`,
    options: nameOpts(), answer: fr(s),
    explain: `降号顺序 Si–Mi–La–Ré–Sol–Do–Fa，第 ${i + 1} 个是 ${fr(s)}（${fr(s)} bémol）。`,
  }));
  for (let n = 1; n <= 6; n++) {
    const have = SHARP_ORDER.slice(0, n).map((s) => `${fr(s)}♯`).join('、');
    qs.push({
      id: `sharps.next.${n}`, type: 'choice', skills: ['theory.sharp_order'], difficulty: 2,
      prompt: `调号里已经有 ${have}。如果再加一个升号，会是哪个音？`,
      options: nameOpts(), answer: fr(SHARP_ORDER[n]),
      explain: `按顺序 Fa–Do–Sol–Ré–La–Mi–Si，${fr(SHARP_ORDER[n - 1])} 后面是 ${fr(SHARP_ORDER[n])}。升号只会按这个顺序一个一个加，不会跳过。`,
    });
    const haveB = FLAT_ORDER.slice(0, n).map((s) => `${fr(s)}♭`).join('、');
    qs.push({
      id: `flats.next.${n}`, type: 'choice', skills: ['theory.flat_order'], difficulty: 2,
      prompt: `调号里已经有 ${haveB}。如果再加一个降号，会是哪个音？`,
      options: nameOpts(), answer: fr(FLAT_ORDER[n]),
      explain: `按顺序 Si–Mi–La–Ré–Sol–Do–Fa，${fr(FLAT_ORDER[n - 1])} 后面是 ${fr(FLAT_ORDER[n])}。`,
    });
  }

  // 调号：在五线谱上辨认（第一阶段范围 0–3 个升号、0–2 个降号）
  for (const k of KEYS) {
    const steps = keySignatureSteps(k.count);
    const kind = k.count > 0 ? '升' : '降';
    const sym = k.count > 0 ? '♯' : '♭';
    if (k.count === 0) {
      qs.push({
        id: 'ks.notes.0', type: 'choice', skills: ['theory.key_signature'], difficulty: 1,
        staff: { keyCount: 0, notes: [] },
        prompt: '这个谱号后面没有任何升号或降号。哪些音需要升或降？',
        options: [{ value: 'none', label: '一个都不用，全部按白键音（本位音）' }, { value: 'fa', label: '只有 Fa 要升' }, { value: 'si', label: '只有 Si 要降' }],
        answer: 'none',
        explain: '没有调号（Do majeur / la mineur）：除非出现临时记号，所有音都是本位音。',
      });
      continue;
    }
    qs.push({
      id: `ks.notes.${k.count}`, type: 'multi', skills: ['theory.key_signature'], difficulty: 1,
      staff: { keyCount: k.count, notes: [] },
      prompt: `看这个调号：整首曲子里，哪些音都要${kind}半音？（可多选）`,
      options: nameOpts(), answer: steps.map(fr),
      explain: `${Math.abs(k.count)} 个${kind}号：${steps.map((s) => fr(s) + sym).join('、')}。调号对所有八度的这些音都有效，从曲子开头一直管到结尾（除非换调号）。`,
    });
    qs.push({
      id: `ks.last.${k.count}`, type: 'choice', skills: ['theory.key_signature', k.count > 0 ? 'theory.sharp_order' : 'theory.flat_order'], difficulty: 2,
      staff: { keyCount: k.count, notes: [] },
      prompt: `这个调号的最后一个${kind}号（最右边）是哪个音？`,
      options: nameOpts(), answer: fr(steps[steps.length - 1]),
      explain: `调号永远按${kind}号顺序书写，第 ${steps.length} 个是 ${fr(steps[steps.length - 1])}${sym}。`,
    });
    qs.push({
      id: `ks.key.${k.count}`, type: 'choice', skills: ['theory.key_signature'], difficulty: 3,
      staff: { keyCount: k.count, notes: [] },
      prompt: `这个调号对应哪个大调（majeur）？`,
      options: KEYS.filter((x) => x.count !== 0).map((x) => ({ value: x.fr, label: `${x.fr}（${x.zh}）` })),
      answer: k.fr,
      explain: k.count > 0
        ? `升号调的找法：最后一个升号再往上一个半音就是主音。最后一个升号是 ${fr(steps[steps.length - 1])}♯ → 主音 ${k.fr.split(' ')[0]}，所以是 ${k.fr}（关系小调 ${k.relMinorFr}）。`
        : k.count === -1
          ? '只有一个降号 Si♭ 时是 Fa majeur（这个需要直接记住；关系小调 ré mineur）。'
          : `降号调的找法：倒数第二个降号就是主音。倒数第二个是 Si♭ → Si bémol majeur（关系小调 ${k.relMinorFr}）。`,
    });
  }

  // 还原号与临时记号：明确调号、小节与生效范围
  for (const ctx of ACCIDENTAL_CONTEXTS) qs.push(accidentalQuestion(ctx));
  return qs;
}

/**
 * 每个情境：调号 + 一到两个小节的音 + 要判断的那个音（highlight）。
 * 正确答案由 actualAlter() 计算；expect 是人工写下的核对值，单元测试会比对两者。
 */
export const ACCIDENTAL_CONTEXTS = [
  { id: 'acc.1', keyCount: 2, hi: 0, expect: 1, notes: [n('F', 4, null, 'q', 1), n('G', 4, null, 'q', 1), n('A', 4, null, 'h', 1)] },
  { id: 'acc.2', keyCount: 2, hi: 2, expect: 0, notes: [n('F', 4, 'n', 'q', 1), n('G', 4, null, 'q', 1), n('F', 4, null, 'q', 1), n('E', 4, null, 'q', 1)] },
  { id: 'acc.3', keyCount: 2, hi: 3, expect: 1, notes: [n('F', 4, 'n', 'q', 1), n('G', 4, null, 'q', 1), n('A', 4, null, 'h', 1), n('F', 4, null, 'q', 2), n('E', 4, null, 'q', 2), n('D', 4, null, 'h', 2)] },
  { id: 'acc.4', keyCount: 0, hi: 2, expect: 1, notes: [n('C', 5, '#', 'q', 1), n('D', 5, null, 'q', 1), n('C', 5, null, 'q', 1), n('B', 4, null, 'q', 1)] },
  { id: 'acc.5', keyCount: -2, hi: 0, expect: -1, notes: [n('B', 4, null, 'q', 1), n('C', 5, null, 'q', 1), n('D', 5, null, 'h', 1)] },
  { id: 'acc.6', keyCount: -2, hi: 2, expect: 0, notes: [n('B', 4, 'n', 'q', 1), n('A', 4, null, 'q', 1), n('B', 4, null, 'q', 1), n('C', 5, null, 'q', 1)] },
  { id: 'acc.7', keyCount: 1, hi: 2, expect: 1, notes: [n('F', 5, null, 'q', 1), n('E', 5, null, 'q', 1), n('F', 4, null, 'q', 1), n('G', 4, null, 'q', 1)] },
  { id: 'acc.8', keyCount: 1, hi: 2, expect: 1, difficulty: 3, notes: [n('F', 5, 'n', 'q', 1), n('E', 5, null, 'q', 1), n('F', 4, null, 'q', 1), n('G', 4, null, 'q', 1)] },
  { id: 'acc.9', keyCount: -1, hi: 2, expect: 0, notes: [n('B', 4, 'n', 'q', 1), n('C', 5, null, 'q', 1), n('B', 4, null, 'q', 1), n('A', 4, null, 'q', 1)] },
  { id: 'acc.10', keyCount: 3, hi: 0, expect: 1, notes: [n('G', 4, null, 'q', 1), n('A', 4, null, 'q', 1), n('G', 4, 'n', 'q', 1), n('F', 4, null, 'q', 1)] },
  { id: 'acc.11', keyCount: 3, hi: 3, expect: 1, notes: [n('G', 4, null, 'q', 1), n('A', 4, null, 'q', 1), n('G', 4, 'n', 'q', 1), n('F', 4, null, 'q', 1)] },
  { id: 'acc.12', keyCount: 2, hi: 1, expect: 0, notes: [n('C', 5, 'n', 'q', 1), n('C', 5, null, 'q', 1), n('B', 4, null, 'h', 1)] },
];
function n(step, octave, acc, dur, measure) { return { step, octave, acc, dur, measure }; }

export function explainAccidental(ctx) {
  const { notes, hi, keyCount } = ctx;
  const t = notes[hi];
  const ks = keySignatureSteps(keyCount);
  const inKey = ks.includes(t.step);
  const kSym = keyCount > 0 ? '♯' : '♭';
  // 找到本小节、同一谱位、此前（含自己）最近的临时记号
  let src = null;
  for (let i = 0; i <= hi; i++) {
    const x = notes[i];
    if (x.measure === t.measure && x.step === t.step && x.octave === t.octave && x.acc) src = { i, acc: x.acc };
  }
  const result = frenchName({ step: t.step, alter: actualAlter(notes, hi, keyCount), octave: t.octave });
  const parts = [];
  if (src && src.i === hi) {
    parts.push(`这个音前面直接写着 ${ACCIDENTALS[src.acc].symbol}（${ACCIDENTALS[src.acc].fr}），所以是 ${result}。`);
  } else if (src) {
    parts.push(`同一小节里、同一位置（${FR_NAME[t.step]}${t.octave - 1}）前面已经出现 ${ACCIDENTALS[src.acc].symbol}（${ACCIDENTALS[src.acc].fr}），它一直管到这一小节结束，所以还是 ${result}。`);
  } else {
    const other = notes.find((x, i) => i < hi && x.step === t.step && x.acc && (x.measure !== t.measure || x.octave !== t.octave));
    if (other && other.measure !== t.measure) parts.push('前一小节的临时记号过了小节线就失效了。');
    if (other && other.measure === t.measure && other.octave !== t.octave) parts.push(`临时记号只管同一个谱位：前面的 ${ACCIDENTALS[other.acc].symbol} 写在 ${FR_NAME[other.step]}${other.octave - 1}，管不到 ${FR_NAME[t.step]}${t.octave - 1}。`);
    parts.push(inKey ? `没有临时记号，就按调号：调号里有 ${FR_NAME[t.step]}${kSym}，所以是 ${result}。` : `没有临时记号，调号里也没有 ${FR_NAME[t.step]}，所以是本位音 ${result}。`);
  }
  return parts.join('');
}

function accidentalQuestion(ctx) {
  const t = ctx.notes[ctx.hi];
  const alter = actualAlter(ctx.notes, ctx.hi, ctx.keyCount);
  const opts = [-1, 0, 1].map((a) => ({ value: String(a), label: `${frenchName({ step: t.step, alter: a, octave: t.octave })}（${accName(a)}）` }));
  return {
    id: ctx.id, type: 'choice', skills: ['theory.accidentals'], difficulty: ctx.difficulty ?? 2,
    staff: { keyCount: ctx.keyCount, notes: ctx.notes, highlight: [ctx.hi] },
    prompt: `第 ${ctx.notes[ctx.hi].measure} 小节里发光的那个音，实际要拉成什么音？`,
    options: opts, answer: String(alter),
    explain: explainAccidental(ctx),
    audioAnswer: { notes: [{ step: t.step, alter, octave: t.octave }] },
  };
}
