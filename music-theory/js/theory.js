// Music Quest · 乐理规则核心（纯函数，无 DOM 依赖，可在 Node 中单元测试）
// 所有题目答案都由本文件的确定性逻辑计算，不依赖生成式文本。

export const STEPS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const STEP_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** 法语固定唱名（Do 固定），注意 Ré 带重音符 */
export const FR_NAME = { C: 'Do', D: 'Ré', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' };
export const FR_TO_STEP = Object.fromEntries(Object.entries(FR_NAME).map(([k, v]) => [v, k]));

/** 临时记号：符号、法语名、中文名 */
export const ACCIDENTALS = {
  '#': { alter: 1, symbol: '♯', fr: 'dièse', zh: '升号' },
  b: { alter: -1, symbol: '♭', fr: 'bémol', zh: '降号' },
  n: { alter: 0, symbol: '♮', fr: 'bécarre', zh: '还原号' },
};

/** 升号顺序 Fa–Do–Sol–Ré–La–Mi–Si；降号顺序 Si–Mi–La–Ré–Sol–Do–Fa（升号顺序的倒序） */
export const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
export const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

/**
 * 解析音符字符串，例如 'F#4'、'Bb3'、'C5'。
 * 返回 { step, alter, octave }，alter：-1 降、0 本位、+1 升。
 */
export function parseNote(str) {
  const m = /^([A-G])(##|#|bb|b)?(-?\d)$/.exec(str);
  if (!m) throw new Error(`无法解析音符: ${str}`);
  const acc = m[2] || '';
  const alter = acc === '#' ? 1 : acc === '##' ? 2 : acc === 'b' ? -1 : acc === 'bb' ? -2 : 0;
  return { step: m[1], alter, octave: Number(m[3]) };
}

export function noteToString({ step, alter, octave }) {
  const acc = alter === 1 ? '#' : alter === 2 ? '##' : alter === -1 ? 'b' : alter === -2 ? 'bb' : '';
  return `${step}${acc}${octave}`;
}

/** MIDI 编号：C4 = 60，A4 = 69 */
export function midi(note) {
  const n = typeof note === 'string' ? parseNote(note) : note;
  return 12 * (n.octave + 1) + STEP_PC[n.step] + n.alter;
}

/** 平均律频率（A4 = 440 Hz） */
export function frequency(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

/**
 * 法语音名，例如 { step:'F', alter:1 } → 'Fa♯'。
 * withOctave 时按法国音乐学院习惯标八度：中央 Do = Do3，La3 = 440 Hz
 * （比国际科学音高记法小 1；程序内部仍用科学记法 C4 = MIDI 60）。
 */
export const frenchOctave = (sciOctave) => sciOctave - 1;
export function frenchName(note, { withOctave = false } = {}) {
  const n = typeof note === 'string' ? parseNote(note) : note;
  const sym = n.alter === 1 ? '♯' : n.alter === -1 ? '♭' : n.alter === 2 ? '𝄪' : n.alter === -2 ? '𝄫' : '';
  return `${FR_NAME[n.step]}${sym}${withOctave ? frenchOctave(n.octave) : ''}`;
}

/** 法语完整读法，例如 'Fa dièse'、'Si bémol' */
export function frenchSpoken(note) {
  const n = typeof note === 'string' ? parseNote(note) : note;
  const word = n.alter === 1 ? ' dièse' : n.alter === -1 ? ' bémol' : '';
  return `${FR_NAME[n.step]}${word}`;
}

/**
 * 调号：正数=升号个数，负数=降号个数。返回 { F: 1, C: 1 } 这样的映射。
 */
export function keySignatureAlters(count) {
  if (!Number.isInteger(count) || count < -7 || count > 7) throw new Error(`调号个数无效: ${count}`);
  const map = {};
  if (count > 0) SHARP_ORDER.slice(0, count).forEach((s) => (map[s] = 1));
  if (count < 0) FLAT_ORDER.slice(0, -count).forEach((s) => (map[s] = -1));
  return map;
}

/** 调号涉及的音名（按书写顺序） */
export function keySignatureSteps(count) {
  return count > 0 ? SHARP_ORDER.slice(0, count) : count < 0 ? FLAT_ORDER.slice(0, -count) : [];
}

/** 常用调（第一阶段范围：0–3 个升号、0–2 个降号） */
export const KEYS = [
  { count: 0, major: 'C', fr: 'Do majeur', zh: 'C 大调', vex: 'C', relMinorFr: 'la mineur' },
  { count: 1, major: 'G', fr: 'Sol majeur', zh: 'G 大调', vex: 'G', relMinorFr: 'mi mineur' },
  { count: 2, major: 'D', fr: 'Ré majeur', zh: 'D 大调', vex: 'D', relMinorFr: 'si mineur' },
  { count: 3, major: 'A', fr: 'La majeur', zh: 'A 大调', vex: 'A', relMinorFr: 'fa dièse mineur' },
  { count: -1, major: 'F', fr: 'Fa majeur', zh: 'F 大调', vex: 'F', relMinorFr: 'ré mineur' },
  { count: -2, major: 'Bb', fr: 'Si bémol majeur', zh: '降 B 大调', vex: 'Bb', relMinorFr: 'sol mineur' },
];
export function keyByCount(count) {
  const k = KEYS.find((x) => x.count === count);
  if (!k) throw new Error(`第一阶段不支持该调号: ${count}`);
  return k;
}

/**
 * 计算乐谱中某个音的实际升降（调号 + 临时记号 + 小节线规则）。
 * notes: [{ step, octave, acc: '#'|'b'|'n'|null, measure }]
 * 规则（传统记谱法）：
 *   1. 临时记号作用于同一小节内、同一谱位（同音名同八度）之后的所有音；
 *   2. 小节线后失效，恢复调号；
 *   3. 无临时记号时，使用调号。
 */
export function actualAlter(notes, index, keyCount) {
  const target = notes[index];
  if (!target) throw new Error('音符序号越界');
  const ks = keySignatureAlters(keyCount);
  let alter = ks[target.step] ?? 0;
  for (let i = 0; i <= index; i++) {
    const n = notes[i];
    if (n.measure !== target.measure) continue;
    if (n.step === target.step && n.octave === target.octave && n.acc) {
      alter = ACCIDENTALS[n.acc].alter;
    }
  }
  return alter;
}

/** 根据乐谱上下文得到实际音高（{step, alter, octave}） */
export function actualNote(notes, index, keyCount) {
  const n = notes[index];
  return { step: n.step, alter: actualAlter(notes, index, keyCount), octave: n.octave };
}

/** 两音之间相差的半音数（有向） */
export function semitones(a, b) {
  return midi(b) - midi(a);
}

/** 相邻音级的关系：1 个半音 = demi-ton，2 个半音 = ton */
export function stepKind(a, b) {
  const d = Math.abs(semitones(a, b));
  if (d === 1) return 'demi-ton';
  if (d === 2) return 'ton';
  return null;
}

/**
 * 大调音阶（T T S T T T S），按字母连续拼写。
 * majorScale('D', 4) → D4 E4 F#4 G4 A4 B4 C#5 D5
 */
export function majorScale(tonicStep, octave, tonicAlter = 0) {
  const pattern = [2, 2, 1, 2, 2, 2, 1];
  const start = { step: tonicStep, alter: tonicAlter, octave };
  const out = [start];
  let cur = start;
  for (const interval of pattern) {
    const si = STEPS.indexOf(cur.step);
    const nextStep = STEPS[(si + 1) % 7];
    const nextOct = si === 6 ? cur.octave + 1 : cur.octave;
    const natural = { step: nextStep, alter: 0, octave: nextOct };
    const want = midi(cur) + interval;
    const alter = want - midi(natural);
    if (Math.abs(alter) > 1) throw new Error('音阶拼写超出单升降范围');
    cur = { step: nextStep, alter, octave: nextOct };
    out.push(cur);
  }
  return out;
}

/** 返回音阶中半音所在的相邻对（序号，从 0 开始） */
export function halfStepPairs(scale) {
  const pairs = [];
  for (let i = 0; i < scale.length - 1; i++) {
    if (semitones(scale[i], scale[i + 1]) === 1) pairs.push([i, i + 1]);
  }
  return pairs;
}

/** 音高方向：second 相对 first 更高 / 更低 / 相同 */
export function pitchDirection(first, second) {
  const d = semitones(first, second);
  return d > 0 ? 'higher' : d < 0 ? 'lower' : 'same';
}

/** 时值（以四分音符为 1 拍） */
export const DURATIONS = {
  w: { beats: 4, fr: 'ronde', zh: '全音符', vex: 'w' },
  h: { beats: 2, fr: 'blanche', zh: '二分音符', vex: 'h' },
  q: { beats: 1, fr: 'noire', zh: '四分音符', vex: 'q' },
  '8': { beats: 0.5, fr: 'croche', zh: '八分音符', vex: '8' },
};

/** 校验每小节拍数是否等于拍号 */
export function measureBeats(notes) {
  const byMeasure = new Map();
  for (const n of notes) {
    byMeasure.set(n.measure, (byMeasure.get(n.measure) ?? 0) + DURATIONS[n.dur].beats);
  }
  return byMeasure;
}

/** 节奏音型 → 各音起点（以拍为单位） */
export function onsetsInBeats(durs) {
  const out = [];
  let t = 0;
  for (const d of durs) {
    out.push(t);
    t += DURATIONS[d].beats;
  }
  return { onsets: out, total: t };
}

/** 稳定洗牌（可注入随机数，便于测试） */
export function shuffle(arr, rand = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
