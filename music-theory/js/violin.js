// Music Quest · 小提琴指板逻辑
// 只收录经过核对的音位：第一把位、第三把位的常规手型。
// 「几指」必须结合 音符 + 琴弦 + 把位 才能确定，单看指法数字无法知道音名。

import { midi, parseNote, frenchName } from './theory.js';

export const STRINGS = [
  { id: 'G', fr: 'Sol', zh: 'Sol 弦（G 弦，最粗）', open: 'G3' },
  { id: 'D', fr: 'Ré', zh: 'Ré 弦（D 弦）', open: 'D4' },
  { id: 'A', fr: 'La', zh: 'La 弦（A 弦）', open: 'A4' },
  { id: 'E', fr: 'Mi', zh: 'Mi 弦（E 弦，最细）', open: 'E5' },
];
export const stringById = (id) => {
  const s = STRINGS.find((x) => x.id === id);
  if (!s) throw new Error(`未知琴弦 ${id}`);
  return s;
};

/**
 * 每个把位：「离空弦的半音数」→ 手指。
 * 第一把位（première position）：
 *   0 空弦；1 低1指；2 1指；3 低2指；4 高2指；5 3指；7 4指（与下一根空弦同音）。
 *   6 个半音（高3指/低4指）属于伸张或两种指法都可能，第一阶段不出题。
 * 第三把位（troisième position）：1 指在空弦上方纯四度（空弦算第 1 个，往上数到第 4 个音名），
 *   即第一把位 3 指的位置。
 *   5 1指；6 低2指；7 高2指；8 低3指；9 高3指；10 4指。
 *   4 个半音（低1指后伸）和 11 个半音（4指伸张）第一阶段不出题。
 */
export const POSITIONS = {
  first: {
    id: 'first', fr: 'première position', zh: '第一把位',
    map: { 0: { finger: 0, label: '空弦' }, 1: { finger: 1, label: '低1指' }, 2: { finger: 1, label: '1指' },
      3: { finger: 2, label: '低2指' }, 4: { finger: 2, label: '高2指' }, 5: { finger: 3, label: '3指' },
      7: { finger: 4, label: '4指' } },
  },
  third: {
    id: 'third', fr: 'troisième position', zh: '第三把位',
    map: { 5: { finger: 1, label: '1指' }, 6: { finger: 2, label: '低2指' }, 7: { finger: 2, label: '高2指' },
      8: { finger: 3, label: '低3指' }, 9: { finger: 3, label: '高3指' }, 10: { finger: 4, label: '4指' } },
  },
};

/** 一个音在某把位的所有可行指法：[{ string, finger, label, semis }] */
export function placements(note, positionId) {
  const pos = POSITIONS[positionId];
  if (!pos) throw new Error(`未知把位 ${positionId}`);
  const m = midi(note);
  const out = [];
  for (const s of STRINGS) {
    const semis = m - midi(s.open);
    const slot = pos.map[semis];
    if (slot) out.push({ string: s.id, finger: slot.finger, label: slot.label, semis });
  }
  return out;
}

/** 已知 琴弦 + 把位 + 半音位置 → MIDI */
export function midiAt(stringId, semis) {
  return midi(stringById(stringId).open) + semis;
}

/** 某根弦某把位上的所有已核对音位（用于交互指板） */
export function slotsOn(stringId, positionId) {
  const pos = POSITIONS[positionId];
  return Object.entries(pos.map).map(([semis, slot]) => ({
    string: stringId, semis: Number(semis), finger: slot.finger, label: slot.label, midi: midiAt(stringId, Number(semis)),
  }));
}

/**
 * 「看到 2 指，能知道是什么音吗？」——列出同一手指在不同弦/把位上可能对应的音高数量。
 */
export function notesForFinger(finger, positionId) {
  const out = [];
  for (const s of STRINGS) {
    for (const slot of slotsOn(s.id, positionId)) if (slot.finger === finger) out.push(slot);
  }
  return out;
}

/**
 * 两个相邻手指（同弦同把位）之间是「靠拢」（半音）还是「分开」（全音）。
 * a、b 为音符字符串或对象，需在同一根弦上。
 */
export function fingerSpacing(a, b, stringId, positionId) {
  const pa = placements(a, positionId).find((p) => p.string === stringId);
  const pb = placements(b, positionId).find((p) => p.string === stringId);
  if (!pa || !pb) return null;
  const d = Math.abs(pb.semis - pa.semis);
  return { from: pa, to: pb, semitones: d, kind: d === 1 ? 'close' : d === 2 ? 'apart' : 'other' };
}

/** 方便展示：'La 弦 · 第一把位 · 高2指' */
export function describePlacement(p, positionId) {
  return `${stringById(p.string).fr} 弦 · ${POSITIONS[positionId].zh} · ${p.label}`;
}

export function openStringNote(stringId) {
  return parseNote(stringById(stringId).open);
}

export function openStringName(stringId) {
  return frenchName(stringById(stringId).open, { withOctave: true });
}
