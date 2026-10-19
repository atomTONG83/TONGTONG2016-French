// 世界 1 · 五线谱启航港：高音谱号、线与间、加线音、先认音符再看指法
import { FR_NAME, frenchName } from '../theory.js';

const nameOpts = () => Object.values(FR_NAME).map((v) => ({ value: v, label: v }));

/** 高音谱号（clé de sol）上的本位音：线、间、上下加线 */
export const STAFF_NOTES = {
  inside: ['E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5'],
  ledger: ['G3', 'A3', 'B3', 'C4', 'D4', 'G5', 'A5', 'B5'],
};
const LINES = ['E4', 'G4', 'B4', 'D5', 'F5'];

function where(n) {
  if (n === 'D4') return '在第一线下方的「下加一间」，紧贴第一线';
  if (n === 'C4') return '在下加一线上（中央 Do）';
  if (n === 'B3') return '在下加一线下方的间';
  if (n === 'A3') return '在下加二线上';
  if (n === 'G3') return '在下加二线下方的间（小提琴最低音，Sol 空弦）';
  if (n === 'G5') return '在第五线上方的「上加一间」，紧贴第五线';
  if (n === 'A5') return '在上加一线上';
  if (n === 'B5') return '在上加一线上方的间';
  const li = LINES.indexOf(n);
  if (li >= 0) return `在第 ${li + 1} 线上`;
  const sp = ['F4', 'A4', 'C5', 'E5'].indexOf(n);
  return `在第 ${sp + 1} 间`;
}

export function portQuestions() {
  const qs = [];
  qs.push({
    id: 'read.clef', type: 'choice', skills: ['reading.note_identification'], difficulty: 1,
    staff: { keyCount: 0, notes: [] },
    prompt: '小提琴谱开头这个谱号叫什么？它的圆圈绕着的第二线是什么音？',
    options: [
      { value: 'sol', label: 'clé de sol（高音谱号），第二线是 Sol' },
      { value: 'fa', label: 'clé de fa（低音谱号），第二线是 Fa' },
      { value: 'sol-do', label: 'clé de sol，第二线是 Do' },
    ],
    answer: 'sol',
    explain: '小提琴使用 clé de sol（高音谱号，也叫 G 谱号）。谱号的螺旋从第二线开始绕，告诉我们第二线上的音是 Sol3。知道了 Sol，就可以按 Sol–La–Si–Do… 往上往下数出其他音。（clé de fa 低音谱号标的是第四线 Fa，大提琴、低音提琴用它。）',
  });
  for (const [group, list] of Object.entries(STAFF_NOTES)) {
    for (const ns of list) {
      const step = ns[0];
      qs.push({
        id: `read.note.${ns}`, type: 'choice', skills: ['reading.note_identification'], difficulty: group === 'inside' ? 1 : 2,
        staff: { keyCount: 0, notes: [{ step, octave: Number(ns.slice(1)), acc: null, dur: 'w', measure: 1 }] },
        prompt: '这个音叫什么？',
        options: nameOpts(), answer: FR_NAME[step], play: [ns],
        explain: `${frenchName(ns, { withOctave: true })}：${where(ns)}。线上的音从下往上是 Mi–Sol–Si–Ré–Fa，间里的音是 Fa–La–Do–Mi。`,
      });
    }
  }
  qs.push({
    id: 'read.lines', type: 'order', skills: ['reading.note_identification'], difficulty: 1,
    prompt: '高音谱号五条线上的音，从下（第一线）往上排好。',
    tiles: ['Mi', 'Sol', 'Si', 'Ré', 'Fa'], answer: ['Mi', 'Sol', 'Si', 'Ré', 'Fa'],
    explain: '五条线从下往上：Mi3 – Sol3 – Si3 – Ré4 – Fa4，每两条线之间隔一个音名（中间那个在「间」里）。',
  });
  qs.push({
    id: 'read.spaces', type: 'order', skills: ['reading.note_identification'], difficulty: 1,
    prompt: '高音谱号四个间里的音，从下往上排好。',
    tiles: ['Fa', 'La', 'Do', 'Mi'], answer: ['Fa', 'La', 'Do', 'Mi'],
    explain: '四个间从下往上：Fa3 – La3 – Do4 – Mi4。',
  });
  qs.push({
    id: 'read.finger.first', type: 'choice', skills: ['reading.fingering_interpretation', 'reading.note_identification'], difficulty: 1,
    staff: { keyCount: 0, notes: [{ step: 'C', octave: 5, acc: null, dur: 'w', measure: 1, finger: 2 }] },
    prompt: '谱上这个音写着指法「2」。看谱时你应该先做哪一步？',
    options: [
      { value: 'note', label: '先认出音符（这里是 Do4），再用指法数字确认手指' },
      { value: 'finger', label: '直接按 2 指，不用认音符' },
      { value: 'teacher', label: '等老师示范再说' },
    ],
    answer: 'note',
    explain: '先认音符，再读指法：这个音是第三间的 Do4。在 La 弦第一把位，Do4 是「低2指」（离 1 指半音，要靠拢）。如果调号或临时记号让它变成 Do♯4，就是「高2指」——同样写着 2，位置却不同！',
  });
  return qs;
}
