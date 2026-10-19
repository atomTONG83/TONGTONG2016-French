// 世界 5 · 听觉森林：音高方向、半音/全音听辨、旋律与乐谱配对
import { pitchDirection, stepKind, frenchName, parseNote, midi } from '../theory.js';

export const DIRECTION_PAIRS = [
  ['D4', 'A4'], ['A4', 'D4'], ['E5', 'E5'], ['G4', 'F#4'], ['C5', 'D5'], ['B4', 'B4'],
  ['F#4', 'G4'], ['D5', 'C#5'], ['G3', 'D4'], ['A4', 'A4'], ['E5', 'D5'], ['B3', 'C4'],
];
export const STEP_EAR_PAIRS = [
  ['E4', 'F4'], ['F4', 'G4'], ['F#4', 'G4'], ['A4', 'B4'], ['C#5', 'D5'], ['D5', 'E5'], ['B4', 'C5'], ['G4', 'A4'],
];

/** 旋律配谱：每题一段 4 音旋律 + 2 个乐谱选项（只有一个与声音一致） */
export const MELODIES = [
  { id: 'ear.melody.1', play: ['D4', 'E4', 'F#4', 'G4'], decoy: ['D4', 'F#4', 'E4', 'G4'] },
  { id: 'ear.melody.2', play: ['A4', 'G4', 'F#4', 'E4'], decoy: ['A4', 'B4', 'C#5', 'D5'] },
  { id: 'ear.melody.3', play: ['G4', 'B4', 'D5', 'B4'], decoy: ['G4', 'B4', 'A4', 'G4'] },
  { id: 'ear.melody.4', play: ['E5', 'E5', 'D5', 'C#5'], decoy: ['E5', 'D5', 'D5', 'C#5'] },
];

const toStaffNote = (s) => {
  const p = parseNote(s);
  return { step: p.step, octave: p.octave, acc: p.alter === 1 ? '#' : p.alter === -1 ? 'b' : null, dur: 'q', measure: 1 };
};

export function forestQuestions() {
  const qs = [];
  for (const [a, b] of DIRECTION_PAIRS) {
    const dir = pitchDirection(a, b);
    const d = midi(b) - midi(a);
    qs.push({
      id: `ear.dir.${a}-${b}`, type: 'choice', skills: ['ear.pitch_direction'], difficulty: Math.abs(d) <= 2 && d !== 0 ? 2 : 1,
      autoplay: [a, b],
      prompt: '听两个音：第二个音比第一个音……',
      options: [{ value: 'higher', label: '⬆ 更高' }, { value: 'lower', label: '⬇ 更低' }, { value: 'same', label: '＝ 一样高' }],
      answer: dir,
      explain: dir === 'same'
        ? `两个音都是 ${frenchName(a, { withOctave: true })}，一样高。`
        : `${frenchName(a, { withOctave: true })} → ${frenchName(b, { withOctave: true })}：第二个音${dir === 'higher' ? '更高' : '更低'}，相差 ${Math.abs(d)} 个半音。${Math.abs(d) <= 2 ? '距离很小，要仔细听！' : ''}`,
    });
  }
  for (const [a, b] of STEP_EAR_PAIRS) {
    const kind = stepKind(a, b);
    qs.push({
      id: `ear.step.${a}-${b}`, type: 'choice', skills: ['ear.interval_basic', 'theory.whole_half_step'], difficulty: 2,
      autoplay: [a, b],
      prompt: '听两个相邻的音：它们相差半音（demi-ton）还是全音（ton）？',
      options: [{ value: 'demi-ton', label: '半音 · demi-ton（很近）' }, { value: 'ton', label: '全音 · ton（远一点）' }],
      answer: kind,
      explain: `${frenchName(a)} → ${frenchName(b)} 是${kind === 'demi-ton' ? '半音：两个音挨得很近，听起来有点「紧」' : '全音：比半音宽一倍'}。拉琴时半音的手指要靠拢。`,
    });
  }
  for (const m of MELODIES) {
    qs.push({
      id: m.id, type: 'choice', skills: ['ear.interval_basic', 'reading.note_identification'], difficulty: 2,
      autoplay: m.play,
      prompt: '听这段旋律，哪一行乐谱和它一样？',
      optionStaves: true, shuffleOptions: true,
      options: [
        { value: 'play', label: 'A', staff: { keyCount: 0, notes: m.play.map(toStaffNote) } },
        { value: 'decoy', label: 'B', staff: { keyCount: 0, notes: m.decoy.map(toStaffNote) } },
      ],
      answer: 'play',
      explain: `听到的是 ${m.play.map((s) => frenchName(s)).join(' – ')}。可以一边听一边用手指跟着乐谱走：音往上，音符在谱上也往上。`,
    });
  }
  return qs;
}
