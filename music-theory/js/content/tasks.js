// 本周老师任务 & 曲目技能标签
// 来源：家长对 2026-10-10、2026-10-17 两堂课的整理（不是原始乐谱的逐音转写）。
// 扩展方式：在 TEACHER_WEEKS 顶部追加新的一周即可，旧周保留作历史。

export const TEACHER_WEEKS = [
  {
    id: '2026-10-lessons',
    label: '10/10 + 10/17 课堂要求',
    source: '家长整理的音乐学院课堂要求（2026-10-10、2026-10-17）',
    tasks: [
      { id: 'tw1.sharps', title: '背熟升号顺序 Fa–Do–Sol–Ré–La–Mi–Si', kind: 'theory', skills: ['theory.sharp_order'], lessons: ['w2.sharps'] },
      { id: 'tw1.flats', title: '背熟降号顺序 Si–Mi–La–Ré–Sol–Do–Fa', kind: 'theory', skills: ['theory.flat_order'], lessons: ['w2.flats'] },
      { id: 'tw1.keysig', title: '理解 ♯ ♭ ♮，调号与临时记号的作用', kind: 'theory', skills: ['theory.key_signature', 'theory.accidentals'], lessons: ['w2.keysig', 'w2.accidentals'] },
      { id: 'tw1.steps', title: '全音与半音；D 大调中 Fa♯–Sol、Do♯–Ré 是半音', kind: 'theory', skills: ['theory.whole_half_step'], lessons: ['w4.keyboard', 'w4.spacing'] },
      { id: 'tw1.reading', title: '看谱先认音符，再读指法数字', kind: 'theory', skills: ['reading.fingering_interpretation', 'violin.note_string_finger_position'], lessons: ['w1.finger', 'w6.detective'] },
      { id: 'tw1.positions', title: '琴弦与第一、第三把位的指法', kind: 'theory', skills: ['violin.first_position', 'violin.third_position'], lessons: ['w4.first', 'w4.third'] },
      { id: 'tw1.rhythm', title: '稳定节奏：二分、四分、八分音符；开拉前先观察，不抢拍', kind: 'theory', skills: ['rhythm.steady_pulse', 'rhythm.half_note', 'rhythm.quarter_note', 'rhythm.eighth_note'], lessons: ['w3.durations', 'w3.tap1', 'w3.tap2'] },
      { id: 'tw1.practice', title: '实体练琴 20–30 分钟（慢速、稳定）', kind: 'practice', skills: [], note: '需要真正拿起琴练习；由家长勾选确认，本应用不会自动打勾。' },
      { id: 'tw1.fantaisie', title: '熟悉 Fantaisie russe 的旋律（听谱、慢练、换把）', kind: 'practice', skills: ['violin.third_position', 'rhythm.steady_pulse'], piece: 'fantaisie-russe', note: '听熟旋律 ≠ 会独立识谱。曲目信息待按童童现有乐谱核对。' },
      { id: 'tw1.vibrato', title: '揉弦 vibrato（年度后续目标）', kind: 'future', skills: [], note: '这里只介绍概念。揉弦动作需要老师现场指导，本应用不安排揉弦动作训练。' },
    ],
  },
];

/**
 * 曲目技能标签。
 * 小提琴板块（violin_learning_hub.html）的课程卡片是手写 HTML，没有结构化曲目数据库，
 * 因此这里只保存「曲目 → 技能标签」的映射，并链接回原小提琴页面；曲目内容仍以原页面为准。
 */
export const REPERTOIRE = [
  {
    id: 'fantaisie-russe', title: 'Fantaisie russe', composer: null,
    composerNote: '作曲者信息待按童童现有乐谱核对（课堂转录可能有误，未硬编码）。',
    source: '2026-10 课堂（家长整理）', skills: ['theory.key_signature', 'violin.third_position', 'rhythm.steady_pulse', 'ear.interval_basic'],
    excerpts: [], audio: null,
    pending: '尚未录入乐谱片段与录音：录入经核对的片段后，即可在「识谱城堡」生成本曲目的看谱挑战。',
  },
  {
    id: 'becker-gavotte', title: 'Gavotte', composer: 'J. Becker', source: '小提琴页 2026-06-06 / 06-13 课程卡片',
    skills: ['theory.key_signature', 'theory.flat_order', 'theory.accidentals', 'rhythm.eighth_note'],
    facts: '小提琴页记录为「B♭ 大调（双降号）」，但同页老师笔记又提到 ♭La 和 G 大调段——调性待按童童的乐谱核对，乐理题中不引用。', excerpts: [], audio: null,
  },
  {
    id: 'bach-gavotte-d', title: 'Gavotte in D', composer: 'Bach', source: '小提琴页 2026-07-04 课程卡片',
    skills: ['theory.key_signature', 'theory.whole_half_step', 'rhythm.steady_pulse'], facts: 'D 大调：Fa♯、Do♯。', excerpts: [], audio: null,
  },
  {
    id: 'never-back-down', title: 'Never Back Down', composer: null, source: '小提琴页 2026-05 课程卡片（已有 PDF 与伴奏录音）',
    skills: ['rhythm.steady_pulse', 'rhythm.half_note'], facts: '老师要求：长音拍子拉满，不要一味加速。', excerpts: [], audio: null,
  },
];
