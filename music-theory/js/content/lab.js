// 世界 4 · 指板实验室：全音/半音、D 大调、空弦、第一/第三把位、指法数字
import { parseNote, frenchName, stepKind, majorScale, halfStepPairs, FR_NAME, midi } from '../theory.js';
import { STRINGS, POSITIONS, placements, stringById, notesForFinger, fingerSpacing } from '../violin.js';

const nm = (s) => frenchName(s);
const nmo = (s) => frenchName(s, { withOctave: true });

/** 键盘上相邻两音：全音还是半音 */
export const STEP_PAIRS = [
  ['E4', 'F4'], ['B4', 'C5'], ['C4', 'D4'], ['F4', 'G4'], ['F#4', 'G4'], ['C#5', 'D5'],
  ['A4', 'B4'], ['G4', 'A4'], ['D4', 'E4'], ['E4', 'F#4'], ['B4', 'C#5'],
];

/** 第一把位、第三把位题目使用的音（已拼写，均在 POSITIONS 已核对的音位内） */
export const FIRST_POS_NOTES = {
  G: ['A3', 'Bb3', 'B3', 'C4', 'D4'],
  D: ['Eb4', 'E4', 'F4', 'F#4', 'G4', 'A4'],
  A: ['Bb4', 'B4', 'C5', 'C#5', 'D5', 'E5'],
  E: ['F5', 'F#5', 'G5', 'G#5', 'A5', 'B5'],
};
export const THIRD_POS_NOTES = {
  G: ['C4', 'D4', 'Eb4', 'E4', 'F4'],
  D: ['G4', 'A4', 'Bb4', 'B4', 'C5'],
  A: ['D5', 'Eb5', 'E5', 'F5', 'F#5', 'G5'],
  E: ['A5', 'B5', 'C6', 'C#6', 'D6'],
};

/**
 * 手指靠拢/分开：同一根弦、同一把位上连续 4 个音（1–2–3–4 指）。
 * 正确答案由 fingerSpacing() 计算，不是固定规则。
 */
export const SPACING_SETS = [
  { id: 'spacing.A1.D', string: 'A', pos: 'first', notes: ['B4', 'C#5', 'D5', 'E5'], ctx: 'Ré majeur（D 大调）' },
  { id: 'spacing.A1.C', string: 'A', pos: 'first', notes: ['B4', 'C5', 'D5', 'E5'], ctx: 'Do majeur（C 大调）' },
  { id: 'spacing.D1.D', string: 'D', pos: 'first', notes: ['E4', 'F#4', 'G4', 'A4'], ctx: 'Ré majeur（D 大调）' },
  { id: 'spacing.D1.F', string: 'D', pos: 'first', notes: ['E4', 'F4', 'G4', 'A4'], ctx: 'Fa majeur（F 大调）' },
  { id: 'spacing.E1.D', string: 'E', pos: 'first', notes: ['F#5', 'G5', 'A5', 'B5'], ctx: 'Ré majeur（D 大调）' },
  { id: 'spacing.E1.A', string: 'E', pos: 'first', notes: ['F#5', 'G#5', 'A5', 'B5'], ctx: 'La majeur（A 大调）' },
  { id: 'spacing.G1.G', string: 'G', pos: 'first', notes: ['A3', 'B3', 'C4', 'D4'], ctx: 'Sol majeur（G 大调）' },
  { id: 'spacing.A3.D', string: 'A', pos: 'third', notes: ['D5', 'E5', 'F#5', 'G5'], ctx: 'Ré majeur（D 大调）' },
  { id: 'spacing.A3.C', string: 'A', pos: 'third', notes: ['D5', 'E5', 'F5', 'G5'], ctx: 'Do majeur（C 大调）' },
];

export function spacingAnswer(set) {
  const pairs = [];
  for (let i = 0; i < 3; i++) {
    const sp = fingerSpacing(set.notes[i], set.notes[i + 1], set.string, set.pos);
    if (!sp) throw new Error(`音位未核对: ${set.id}`);
    pairs.push({ label: `${sp.from.finger}–${sp.to.finger}`, kind: sp.kind, semis: sp.semitones });
  }
  return pairs;
}

export function labQuestions() {
  const qs = [];

  for (const [a, b] of STEP_PAIRS) {
    const kind = stepKind(a, b);
    qs.push({
      id: `step.kind.${a}-${b}`, type: 'choice', skills: ['theory.whole_half_step'], difficulty: a.includes('#') || b.includes('#') ? 2 : 1,
      keyboard: { highlight: [a, b] }, play: [a, b],
      prompt: `${nm(a)} → ${nm(b)}：是全音（ton）还是半音（demi-ton）？`,
      options: [{ value: 'demi-ton', label: '半音 · demi-ton' }, { value: 'ton', label: '全音 · ton' }],
      answer: kind,
      explain: kind === 'demi-ton'
        ? `${nm(a)} 和 ${nm(b)} 在键盘上紧挨着，中间没有别的键：相差 1 个半音（demi-ton）。在同一根弦上用相邻两根手指时，要靠拢。`
        : `${nm(a)} 和 ${nm(b)} 中间还隔着一个键：相差 2 个半音 = 1 个全音（ton）。在同一根弦上用相邻两根手指时，要分开。`,
    });
  }

  const dmaj = majorScale('D', 4);
  qs.push({
    id: 'scale.build.D', type: 'keyboard-scale', skills: ['theory.whole_half_step', 'theory.key_signature'], difficulty: 2,
    prompt: '在键盘上从 Ré 开始，按顺序点出 D 大调（Ré majeur）的 8 个音。',
    answer: dmaj.map((n) => midi(n)), names: dmaj.map(nm),
    explain: 'D 大调：Ré – Mi – Fa♯ – Sol – La – Si – Do♯ – Ré。规律是 全 全 半 全 全 全 半；所以 Fa 和 Do 要升高，才能让半音落在第 3–4 音和第 7–8 音之间。',
  });

  for (const [tonic, label] of [['D', 'Ré majeur'], ['G', 'Sol majeur'], ['A', 'La majeur'], ['C', 'Do majeur']]) {
    const sc = majorScale(tonic, 4);
    const pairs = sc.slice(0, 7).map((x, i) => ({ value: String(i), label: `${nm(x)} – ${nm(sc[i + 1])}` }));
    const ans = halfStepPairs(sc).map(([i]) => String(i));
    qs.push({
      id: `scale.half.${tonic}`, type: 'multi', skills: ['theory.whole_half_step'], difficulty: tonic === 'D' ? 1 : 2,
      prompt: `${label} 音阶 ${sc.map(nm).join(' – ')}：哪两组相邻音是半音（demi-ton）？`,
      play: sc.map(noteToStr),
      options: pairs, answer: ans,
      explain: `大调音阶的半音永远在第 3–4 音和第 7–8 音：${ans.map((i) => `${nm(sc[+i])}–${nm(sc[+i + 1])}`).join('、')}。其他相邻音都是全音。`,
    });
  }

  for (const set of SPACING_SETS) {
    const pairs = spacingAnswer(set);
    const close = pairs.filter((p) => p.kind === 'close').map((p) => p.label);
    const pos = POSITIONS[set.pos];
    qs.push({
      id: set.id, type: 'multi', skills: ['theory.whole_half_step', set.pos === 'first' ? 'violin.first_position' : 'violin.third_position'], difficulty: set.pos === 'first' ? 2 : 3,
      prompt: `在 ${stringById(set.string).fr} 弦、${pos.zh}拉 ${set.notes.map(nm).join(' – ')}（${set.ctx}），分别用 1、2、3、4 指。哪两个手指要靠拢（半音）？`,
      options: pairs.map((p) => ({ value: p.label, label: `${p.label} 指` })),
      answer: close, spacing: set,
      explain: `${pairs.map((p) => `${p.label} 指相差 ${p.semis} 个半音（${p.kind === 'close' ? '靠拢' : '分开'}）`).join('；')}。手指靠不靠拢由这几个音之间的距离决定：换一根弦、换一个调或换把位，靠拢的位置可能就变了。`,
    });
  }

  // 空弦
  for (const s of STRINGS) {
    qs.push({
      id: `open.staff.${s.id}`, type: 'choice', skills: ['violin.open_strings', 'reading.note_identification'], difficulty: 1,
      staff: { keyCount: 0, notes: [{ ...noteObj(s.open), dur: 'w', measure: 1 }] },
      prompt: '这个音是哪根空弦？',
      options: STRINGS.map((x) => ({ value: x.id, label: x.zh })), answer: s.id, play: [s.open],
      explain: `${nmo(s.open)} 是 ${s.fr} 弦的空弦音。四根空弦从低到高：Sol2 – Ré3 – La3 – Mi4，相邻两根弦相差纯五度。`,
    });
    qs.push({
      id: `open.ear.${s.id}`, type: 'choice', skills: ['violin.open_strings', 'ear.pitch_direction'], difficulty: 2,
      autoplay: [s.open],
      prompt: '听一听：这是哪根空弦？（可以多听几次）',
      options: STRINGS.map((x) => ({ value: x.id, label: x.zh })), answer: s.id,
      explain: `这是 ${nmo(s.open)}，${s.fr} 弦。Sol 弦最低最粗，Mi 弦最高最亮。`,
    });
  }
  qs.push({
    id: 'open.order', type: 'order', skills: ['violin.open_strings'], difficulty: 1,
    prompt: '把四根空弦从低到高排好。',
    tiles: STRINGS.map((s) => s.fr), answer: STRINGS.map((s) => s.fr),
    explain: '从低到高：Sol – Ré – La – Mi。架好琴后从上往下看，Sol 弦在最左边，Mi 弦在最右边；相邻两根弦都相差纯五度。',
  });

  // 第一把位 / 第三把位：已知 音 + 琴弦 + 把位 → 几指
  for (const [posId, table] of [['first', FIRST_POS_NOTES], ['third', THIRD_POS_NOTES]]) {
    const pos = POSITIONS[posId];
    for (const [sid, notes] of Object.entries(table)) {
      for (const ns of notes) {
        const pl = placements(ns, posId).find((p) => p.string === sid);
        if (!pl) throw new Error(`音位未核对: ${ns} ${sid} ${posId}`);
        const skill = posId === 'first' ? 'violin.first_position' : 'violin.third_position';
        qs.push({
          id: `${posId === 'first' ? 'p1' : 'p3'}.finger.${sid}.${ns}`, type: 'choice',
          skills: [skill, 'violin.note_string_finger_position'], difficulty: posId === 'first' ? 1 : 2,
          staff: { keyCount: 0, notes: [{ ...noteObj(ns), acc: accOf(ns), dur: 'w', measure: 1 }] },
          board: { string: sid, pos: posId, reveal: { string: sid, semis: pl.semis } },
          prompt: `在 ${stringById(sid).fr} 弦、${pos.zh}拉这个音（${nmo(ns)}），用几指？`,
          options: [0, 1, 2, 3, 4].map((f) => ({ value: String(f), label: f === 0 ? '空弦 0' : `${f} 指` })),
          answer: String(pl.finger), play: [ns],
          explain: `${nmo(ns)} 比 ${stringById(sid).fr} 空弦高 ${pl.semis} 个半音。在${pos.zh}，这个位置是「${pl.label}」。${posId === 'third' ? '第三把位时 1 指落在空弦往上数第 4 个音名（空弦本身算第 1 个），也就是第一把位 3 指的位置。' : ''}`,
        });
      }
    }
  }

  // 一个音在第一把位的所有可行拉法（多选）
  for (const ns of ['A4', 'E5', 'D4', 'D5', 'G4', 'B4']) {
    const valid = placements(ns, 'first');
    const opts = [];
    for (const s of STRINGS) for (const f of [0, 1, 2, 3, 4]) {
      const ok = valid.some((p) => p.string === s.id && p.finger === f);
      // 只保留正确项 + 同手指在相邻弦的干扰项，选项不过多
      if (ok || valid.some((p) => Math.abs(STRINGS.findIndex((x) => x.id === p.string) - STRINGS.indexOf(s)) === 1 && p.finger === f)) {
        opts.push({ value: `${s.id}${f}`, label: `${s.fr} 弦 ${f === 0 ? '空弦' : f + ' 指'}` });
      }
    }
    qs.push({
      id: `p1.where.${ns}`, type: 'multi', skills: ['violin.note_string_finger_position', 'violin.first_position'], difficulty: 2,
      staff: { keyCount: 0, notes: [{ ...noteObj(ns), dur: 'w', measure: 1 }] },
      prompt: `第一把位里，这个音（${nmo(ns)}）可以在哪里拉？（可多选）`,
      options: opts, answer: valid.map((p) => `${p.string}${p.finger}`), play: [ns],
      explain: valid.length > 1
        ? `${nmo(ns)} 有 ${valid.length} 种拉法：${valid.map((p) => `${stringById(p.string).fr} 弦 ${p.finger === 0 ? '空弦' : p.finger + ' 指'}`).join('，或 ')}。第一把位的 4 指和高一根弦的空弦同音，乐谱上的指法数字会告诉你老师选了哪一种。`
        : `${nmo(ns)} 在第一把位只有一种拉法：${stringById(valid[0].string).fr} 弦 ${valid[0].finger === 0 ? '空弦' : valid[0].finger + ' 指'}。`,
    });
  }

  for (const s of STRINGS) {
    const target = midi(s.open) + 5;
    const note = THIRD_POS_NOTES[s.id][0];
    if (midi(note) !== target) throw new Error('第三把位 1 指数据不一致');
    qs.push({
      id: `p3.first.${s.id}`, type: 'choice', skills: ['violin.third_position'], difficulty: 2,
      prompt: `换到第三把位后，${s.fr} 弦上的 1 指是什么音？`,
      options: Object.values(FR_NAME).map((v) => ({ value: v, label: v })), answer: nm(note), play: [note],
      explain: `第三把位：1 指落在空弦往上数第 4 个音名（空弦本身算第 1 个）。${s.fr} 弦：${countUp(s.open)} → 1 指是 ${nm(note)}。`,
    });
  }

  // 「看到 2 指，能知道是什么音吗？」
  const f2 = notesForFinger(2, 'first');
  qs.push({
    id: 'finger.ambiguous', type: 'choice', skills: ['reading.fingering_interpretation'], difficulty: 1,
    prompt: '乐谱上一个音的上方写着「2」。只看这个「2」，能知道是什么音吗？',
    options: [
      { value: 'no', label: '不能：要先认音符，再结合琴弦和把位' },
      { value: 'always', label: '能：2 指永远是同一个音' },
      { value: 'mi', label: '能：2 指一定是 Mi' },
    ],
    answer: 'no',
    explain: `指法数字只告诉你「用哪根手指」，不告诉你音名。光是第一把位，2 指就可能是 ${f2.length} 个不同的音（例如 ${f2.slice(0, 4).map((x) => nmo(noteFromMidiOnString(x))).join('、')}…）。所以看谱顺序是：先认音符 → 再看调号/临时记号 → 再看指法数字确认琴弦和把位。`,
  });
  qs.push({
    id: 'finger.samenote', type: 'choice', skills: ['reading.fingering_interpretation', 'violin.third_position'], difficulty: 2,
    staff: { keyCount: 0, notes: [{ step: 'D', octave: 5, acc: null, dur: 'w', measure: 1 }] },
    prompt: '同一个音 Ré4，在 La 弦上：第一把位用几指？第三把位用几指？',
    options: [{ value: '3-1', label: '第一把位 3 指，第三把位 1 指' }, { value: '3-3', label: '两种把位都是 3 指' }, { value: '1-3', label: '第一把位 1 指，第三把位 3 指' }],
    answer: '3-1', play: ['D5'],
    explain: '同一个音，换了把位，手指数字就会变：第一把位 Ré4 是 La 弦 3 指；第三把位整个手往上移，Ré4 变成 1 指。所以指法数字一定要和把位一起看。',
  });
  qs.push({
    id: 'reading.order', type: 'order', skills: ['reading.independent_decoding'], difficulty: 1,
    prompt: '看一张新谱子，把「解码顺序」排好。',
    tiles: ['看调号', '认音名', '加上升降/还原', '确定琴弦·把位·指法', '看节奏'],
    answer: ['看调号', '认音名', '加上升降/还原', '确定琴弦·把位·指法', '看节奏'],
    explain: '先看调号（知道哪些音要升降），再认音名，然后加上调号和临时记号得到实际音高，再结合指法数字确认琴弦和把位，最后看清节奏再开始拉。不要急着拉，先观察！',
  });
  return qs;
}

function noteToStr(n) { return `${n.step}${n.alter === 1 ? '#' : n.alter === -1 ? 'b' : ''}${n.octave}`; }
function noteObj(s) { const p = parseNote(s); return { step: p.step, octave: p.octave, acc: null }; }
function accOf(s) { const p = parseNote(s); return p.alter === 1 ? '#' : p.alter === -1 ? 'b' : null; }
function countUp(open) {
  const p = parseNote(open);
  const steps = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const i = steps.indexOf(p.step);
  return [0, 1, 2, 3].map((k) => FR_NAME[steps[(i + k) % 7]]).join(' → ');
}
/** 仅用于说明文字：按升号拼写把 MIDI 转为音名 */
function noteFromMidiOnString(slot) {
  const names = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
  return `${names[slot.midi % 12]}${Math.floor(slot.midi / 12) - 1}`;
}
export { noteObj, accOf };
