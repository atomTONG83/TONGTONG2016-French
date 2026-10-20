// 世界 6 · 独立识谱城堡：「识谱侦探」陌生短乐谱综合解码
// 乐谱均为原创短旋律。每个音都人工写下了 expect（实际音高）、string/finger（琴弦/指法），
// 单元测试会用 theory.js / violin.js 的规则逐一核对，二者不一致时测试失败。
import { FR_NAME, frenchName, actualNote, keySignatureSteps, keyByCount, DURATIONS, midi, noteToString } from '../theory.js';
import { placements, stringById, POSITIONS, STRINGS } from '../violin.js';
import { explainAccidental } from './towers.js';

const N = (step, octave, dur, measure, string, finger, acc = null) => ({ step, octave, dur, measure, string, finger, acc });

export const EXCERPTS = [
  {
    id: 'det.d1', title: 'Ré majeur 小行进', keyCount: 2, position: 'first', bpm: 72, level: 1,
    notes: [N('D', 4, 'q', 1, 'D', 0), N('E', 4, 'q', 1, 'D', 1), N('F', 4, 'q', 1, 'D', 2), N('G', 4, 'q', 1, 'D', 3),
      N('A', 4, 'h', 2, 'A', 0), N('F', 4, 'q', 2, 'D', 2), N('D', 4, 'q', 2, 'D', 0)],
    expect: ['D4', 'E4', 'F#4', 'G4', 'A4', 'F#4', 'D4'], fingerFocus: [2, 4],
  },
  {
    id: 'det.g1', title: 'Sol majeur 小舞步', keyCount: 1, position: 'first', bpm: 66, level: 1,
    notes: [N('G', 4, 'q', 1, 'D', 3), N('A', 4, 'q', 1, 'A', 0), N('B', 4, 'h', 1, 'A', 1),
      N('A', 4, '8', 2, 'A', 0), N('G', 4, '8', 2, 'D', 3), N('F', 4, 'q', 2, 'D', 2), N('G', 4, 'h', 2, 'D', 3)],
    expect: ['G4', 'A4', 'B4', 'A4', 'G4', 'F#4', 'G4'], fingerFocus: [0, 5],
  },
  {
    id: 'det.f1', title: 'Fa majeur 摇篮曲', keyCount: -1, position: 'first', bpm: 60, level: 1,
    notes: [N('F', 4, 'q', 1, 'D', 2), N('G', 4, 'q', 1, 'D', 3), N('A', 4, 'q', 1, 'A', 0), N('B', 4, 'q', 1, 'A', 1),
      N('A', 4, 'q', 2, 'A', 0), N('G', 4, 'q', 2, 'D', 3), N('F', 4, 'h', 2, 'D', 2)],
    expect: ['F4', 'G4', 'A4', 'Bb4', 'A4', 'G4', 'F4'], fingerFocus: [0, 3],
  },
  {
    id: 'det.d2', title: '还原号侦探', keyCount: 2, position: 'first', bpm: 66, level: 2,
    notes: [N('A', 4, 'q', 1, 'A', 0), N('C', 5, 'q', 1, 'A', 2, 'n'), N('B', 4, 'q', 1, 'A', 1), N('A', 4, 'q', 1, 'A', 0),
      N('C', 5, 'q', 2, 'A', 2), N('D', 5, 'q', 2, 'A', 3), N('A', 4, 'h', 2, 'A', 0)],
    expect: ['A4', 'C5', 'B4', 'A4', 'C#5', 'D5', 'A4'], fingerFocus: [1, 4],
  },
  {
    id: 'det.bb1', title: 'Si bémol 小回旋', keyCount: -2, position: 'first', bpm: 66, level: 2,
    notes: [N('B', 4, 'q', 1, 'A', 1), N('C', 5, 'q', 1, 'A', 2), N('D', 5, 'q', 1, 'A', 3), N('C', 5, 'q', 1, 'A', 2),
      N('B', 4, 'q', 2, 'A', 1), N('A', 4, 'q', 2, 'A', 0), N('B', 4, 'h', 2, 'A', 1)],
    expect: ['Bb4', 'C5', 'D5', 'C5', 'Bb4', 'A4', 'Bb4'], fingerFocus: [0, 1],
  },
  {
    id: 'det.a1', title: 'La majeur 上行', keyCount: 3, position: 'first', bpm: 72, level: 2,
    notes: [N('A', 4, 'q', 1, 'A', 0), N('B', 4, 'q', 1, 'A', 1), N('C', 5, 'q', 1, 'A', 2), N('D', 5, 'q', 1, 'A', 3),
      N('E', 5, 'q', 2, 'E', 0), N('C', 5, 'q', 2, 'A', 2), N('A', 4, 'h', 2, 'A', 0)],
    expect: ['A4', 'B4', 'C#5', 'D5', 'E5', 'C#5', 'A4'], fingerFocus: [2, 4],
  },
  {
    id: 'det.g2', title: 'croches 小跑步', keyCount: 1, position: 'first', bpm: 60, level: 2,
    notes: [N('D', 5, '8', 1, 'A', 3), N('C', 5, '8', 1, 'A', 2), N('B', 4, 'q', 1, 'A', 1), N('A', 4, 'q', 1, 'A', 0), N('G', 4, 'q', 1, 'D', 3),
      N('F', 4, 'h', 2, 'D', 2), N('G', 4, 'h', 2, 'D', 3)],
    expect: ['D5', 'C5', 'B4', 'A4', 'G4', 'F#4', 'G4'], fingerFocus: [1, 5],
  },
  {
    id: 'det.d3', title: '第三把位 · 高处的 Ré majeur', keyCount: 2, position: 'third', bpm: 60, level: 3,
    notes: [N('D', 5, 'q', 1, 'A', 1), N('E', 5, 'q', 1, 'A', 2), N('F', 5, 'q', 1, 'A', 3), N('G', 5, 'q', 1, 'A', 4),
      N('A', 5, 'q', 2, 'E', 1), N('G', 5, 'q', 2, 'A', 4), N('F', 5, 'h', 2, 'A', 3)],
    expect: ['D5', 'E5', 'F#5', 'G5', 'A5', 'G5', 'F#5'], fingerFocus: [0, 4],
  },
];

const nameOpts = () => Object.values(FR_NAME).map((v) => ({ value: v, label: v }));
const durWord = (d) => DURATIONS[d].fr;

/** 为谱面准备：只显示指法数字（finger 属性），其他人工核对字段不进入谱面 */
export function staffFor(ex, { fingers = [], highlight = [] } = {}) {
  return {
    keyCount: ex.keyCount, time: '4/4', highlight,
    notes: ex.notes.map((n, i) => ({ step: n.step, octave: n.octave, acc: n.acc, dur: n.dur, measure: n.measure, finger: fingers.includes(i) ? n.finger : undefined })),
  };
}

/** 生成侦探关卡的 7 个步骤（答案全部由规则计算） */
export function buildDetective(ex) {
  const key = keyByCount(ex.keyCount);
  const ksSteps = keySignatureSteps(ex.keyCount);
  const pos = POSITIONS[ex.position];
  const actual = ex.notes.map((_, i) => actualNote(ex.notes, i, ex.keyCount));
  const skillPos = ex.position === 'first' ? 'violin.first_position' : 'violin.third_position';
  const steps = [];

  // 1 谱号与调号
  steps.push({
    kind: 'key', title: '① 谱号与调号', hint1: '先看最左边：谱号后面紧跟着的 ♯ 或 ♭ 就是调号。', hint2: ksSteps.length ? `数一数有几个${ex.keyCount > 0 ? '升' : '降'}号，再按顺序说出它们。` : '谱号后面什么也没有。',
    questions: [ex.keyCount === 0 ? null : {
      id: `${ex.id}.key`, type: 'multi', skills: ['theory.key_signature', 'reading.independent_decoding'], difficulty: 1,
      staff: staffFor(ex), prompt: '这段谱子的调号让哪些音升/降？（可多选）',
      options: nameOpts(), answer: ksSteps.map((s) => FR_NAME[s]),
      explain: `调号 ${ksSteps.map((s) => FR_NAME[s] + (ex.keyCount > 0 ? '♯' : '♭')).join('、')} → ${key.fr}（${key.zh}）。整段里这些音都要${ex.keyCount > 0 ? '升' : '降'}，除非遇到还原号。`,
    }].filter(Boolean),
  });

  // 2 读音名（第 1 小节）
  const m1 = ex.notes.map((n, i) => ({ n, i })).filter(({ n }) => n.measure === 1);
  steps.push({
    kind: 'names', title: '② 读出音名', hint1: '高音谱号：线上 Mi–Sol–Si–Ré–Fa，间里 Fa–La–Do–Mi。', hint2: '从一个认识的音出发，一格一格往上或往下数。',
    questions: m1.map(({ n, i }) => ({
      id: `${ex.id}.name.${i}`, type: 'choice', skills: ['reading.note_identification', 'reading.independent_decoding'], difficulty: 1,
      staff: staffFor(ex, { highlight: [i] }), prompt: `第 ${i + 1} 个音（发光的那个）在谱上叫什么？先不管升降号。`,
      options: nameOpts(), answer: FR_NAME[n.step],
      explain: `它在 ${FR_NAME[n.step]}${n.octave - 1} 的位置。`,
    })),
  });

  // 3 实际音高：受调号或临时记号影响的音
  const affected = ex.notes.map((n, i) => ({ n, i })).filter(({ n, i }) => n.acc || ksSteps.includes(n.step));
  steps.push({
    kind: 'pitch', title: '③ 实际音高（升降与还原）', hint1: '先看这个音前面有没有临时记号；没有就看调号。', hint2: '临时记号只管同一小节、同一位置，过了小节线就失效。',
    questions: affected.map(({ n, i }) => {
      const a = actual[i];
      return {
        id: `${ex.id}.pitch.${i}`, type: 'choice', skills: ['theory.accidentals', 'theory.key_signature', 'reading.independent_decoding'], difficulty: 2,
        staff: staffFor(ex, { highlight: [i] }), prompt: `第 ${i + 1} 个音实际要拉成？`,
        options: [-1, 0, 1].map((al) => ({ value: String(al), label: frenchName({ step: n.step, alter: al }) })),
        answer: String(a.alter),
        explain: explainAccidental({ notes: ex.notes, hi: i, keyCount: ex.keyCount }),
        audioAnswer: { notes: [a] },
      };
    }),
  });

  // 4 琴弦 · 把位 · 指法：音符 + 指法数字 + 把位 → 哪根弦
  steps.push({
    kind: 'finger', title: '④ 琴弦 · 把位 · 指法', hint1: `这一段用${pos.zh}。指法数字要和音符一起看。`, hint2: '想一想：哪根弦的空弦往上数，用这个手指正好到这个音？',
    questions: ex.fingerFocus.map((i) => {
      const n = ex.notes[i];
      const a = actual[i];
      return {
        id: `${ex.id}.string.${i}`, type: 'choice', skills: ['violin.note_string_finger_position', skillPos, 'reading.fingering_interpretation'], difficulty: 2,
        staff: staffFor(ex, { highlight: [i], fingers: [i] }),
        board: { pos: ex.position, reveal: { string: n.string, semis: midi(a) - midi(stringById(n.string).open) } },
        prompt: `第 ${i + 1} 个音是 ${frenchName(a, { withOctave: true })}，谱上写着「${n.finger}」，用${pos.zh}。它在哪根弦上？`,
        options: STRINGS.map((s) => ({ value: s.id, label: s.zh })), answer: n.string,
        explain: `${frenchName(a, { withOctave: true })} 在${pos.zh}${n.finger === 0 ? '是空弦' : `用 ${n.finger} 指`}：${stringById(n.string).fr} 弦（比空弦高 ${midi(a) - midi(stringById(n.string).open)} 个半音）。同样的「${n.finger}」放在别的弦上就是别的音。`,
      };
    }),
  });

  // 5 节奏：第 1 小节
  const m1Durs = m1.map(({ n }) => n.dur);
  const pattern = m1Durs.map(durWord).join(' – ');
  const decoys = rhythmDecoys(m1Durs).map((d) => d.map(durWord).join(' – '));
  steps.push({
    kind: 'rhythm', title: '⑤ 节奏', hint1: 'noire 1 拍，blanche 2 拍，croche 半拍。', hint2: '4/4 拍每小节一共 4 拍。',
    questions: [{
      id: `${ex.id}.rhythm`, type: 'choice', skills: ['rhythm.steady_pulse', 'reading.independent_decoding'], difficulty: 1,
      staff: staffFor(ex), prompt: '第 1 小节的节奏是哪一个？',
      options: [pattern, ...decoys].map((p) => ({ value: p, label: p })), answer: pattern, shuffleOptions: true,
      explain: `第 1 小节：${m1Durs.map((d) => `${durWord(d)}（${DURATIONS[d].beats} 拍）`).join(' + ')} = 4 拍。`,
    }],
  });

  // 6 听示范（解码完成后才开放）
  steps.push({ kind: 'listen', title: '⑥ 听示范，对照乐谱', questions: [] });

  // 7 不看提示，独立再读一遍（全部音的实际音名）
  steps.push({
    kind: 'solo', title: '⑦ 不看提示，独立再读一遍', questions: ex.notes.map((n, i) => {
      const a = actual[i];
      const right = frenchName(a);
      // 干扰项只用孩子常见的拼写：避免 Mi♯、Si♯、Fa♭、Do♭ 这类罕见写法
      let alt = 0;
      if (a.alter === 0) {
        const preferFlat = ex.keyCount < 0;
        alt = preferFlat ? (['C', 'F'].includes(n.step) ? 1 : -1) : (['E', 'B'].includes(n.step) ? -1 : 1);
      }
      const opts = new Set([right, frenchName({ step: n.step, alter: alt })]);
      const si = ['C', 'D', 'E', 'F', 'G', 'A', 'B'].indexOf(n.step);
      opts.add(frenchName({ step: ['C', 'D', 'E', 'F', 'G', 'A', 'B'][(si + 1) % 7], alter: 0 }));
      return {
        id: `${ex.id}.solo.${i}`, type: 'choice', skills: ['reading.independent_decoding'], difficulty: 2, noHints: true,
        staff: staffFor(ex, { highlight: [i] }), prompt: `第 ${i + 1} 个音：`,
        options: [...opts].map((v) => ({ value: v, label: v })), answer: right, shuffleOptions: true,
        explain: `第 ${i + 1} 个音是 ${right}。`,
      };
    }),
  });

  return { excerpt: ex, key, steps, actual: actual.map((a) => noteToString(a)) };
}

/** 节奏干扰项：其他同样是 4 拍的常见节奏型（不会出现拍数错误的选项） */
const FOUR_BEAT = [['q', 'q', 'q', 'q'], ['h', 'h'], ['h', 'q', 'q'], ['q', 'q', 'h'], ['q', 'h', 'q'], ['8', '8', 'q', 'q', 'q'], ['q', '8', '8', 'h'], ['8', '8', 'q', 'h']];
function rhythmDecoys(durs) {
  const key = durs.join();
  // 优先选音符个数相近的，干扰性更强
  return FOUR_BEAT.filter((d) => d.join() !== key)
    .sort((a, b) => Math.abs(a.length - durs.length) - Math.abs(b.length - durs.length))
    .slice(0, 2);
}

export function castleQuestions() {
  return EXCERPTS.flatMap((ex) => buildDetective(ex).steps.flatMap((s) => s.questions));
}

export function verifyExcerpt(ex) {
  // 返回所有不一致（空数组 = 通过）
  const problems = [];
  ex.notes.forEach((n, i) => {
    const a = noteToString(actualNote(ex.notes, i, ex.keyCount));
    if (a !== ex.expect[i]) problems.push(`${ex.id} 第 ${i + 1} 音：规则得 ${a}，人工核对 ${ex.expect[i]}`);
    const pl = placements(ex.expect[i], ex.position).filter((p) => p.string === n.string);
    if (!pl.length || pl[0].finger !== n.finger) problems.push(`${ex.id} 第 ${i + 1} 音：${ex.expect[i]} 在 ${n.string} 弦 ${ex.position} 不是 ${n.finger} 指`);
  });
  return problems;
}
