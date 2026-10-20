// 内容注册表：世界、关卡、题库（稳定 ID → 题目）
import { towerQuestions } from './towers.js';
import { labQuestions } from './lab.js';
import { portQuestions } from './port.js';
import { arenaQuestions } from './arena.js';
import { forestQuestions } from './forest.js';
import { castleQuestions, EXCERPTS } from './castle.js';

export const SKILLS = {
  'theory.sharp_order': '升号顺序',
  'theory.flat_order': '降号顺序',
  'theory.accidentals': '临时记号与还原号',
  'theory.whole_half_step': '全音与半音',
  'theory.key_signature': '调号',
  'violin.open_strings': '四根空弦',
  'violin.first_position': '第一把位',
  'violin.third_position': '第三把位',
  'violin.note_string_finger_position': '音符·琴弦·指法·把位',
  'rhythm.half_note': 'blanche 二分音符',
  'rhythm.quarter_note': 'noire 四分音符',
  'rhythm.eighth_note': 'croche 八分音符',
  'rhythm.steady_pulse': '稳定节拍',
  'reading.note_identification': '认音名',
  'reading.fingering_interpretation': '理解指法数字',
  'reading.independent_decoding': '独立识谱',
  'ear.pitch_direction': '听音高方向',
  'ear.interval_basic': '听半音/全音',
};

let _bank = null;
export function bank() {
  if (_bank) return _bank;
  _bank = new Map();
  for (const q of [...portQuestions(), ...towerQuestions(), ...arenaQuestions(), ...labQuestions(), ...forestQuestions(), ...castleQuestions()]) {
    if (_bank.has(q.id)) throw new Error(`题目 ID 重复: ${q.id}`);
    _bank.set(q.id, q);
  }
  return _bank;
}
export const getQuestion = (id) => bank().get(id) ?? null;
export const primarySkill = (id) => getQuestion(id)?.skills?.[0] ?? null;
const ids = (prefix) => [...bank().keys()].filter((k) => k.startsWith(prefix));

export const WORLDS = [
  { id: 'w1', emoji: '🎼', name: '五线谱启航港', fr: 'Port de la Portée', color: '#38bdf8', desc: '音符、谱号、基本识谱' },
  { id: 'w2', emoji: '♯', name: '升降号魔法塔', fr: 'Tour des Altérations', color: '#a78bfa', desc: '升降号顺序、调号、还原号' },
  { id: 'w3', emoji: '🥁', name: '节奏竞技场', fr: 'Arène du Rythme', color: '#f59e0b', desc: '时值、节拍器、节奏敲击' },
  { id: 'w4', emoji: '🎻', name: '指板实验室', fr: 'Labo de la Touche', color: '#34d399', desc: '全音半音、空弦、第一/第三把位、指法' },
  { id: 'w5', emoji: '👂', name: '听觉森林', fr: "Forêt de l'Oreille", color: '#4ade80', desc: '音高比较、半音/全音听辨、旋律配谱' },
  { id: 'w6', emoji: '🏰', name: '独立识谱城堡', fr: 'Château du Déchiffrage', color: '#f472b6', desc: '陌生短乐谱综合解码' },
];

/**
 * 关卡：观察 → 试听 → 发现规律 → 动手操作 → 独立作答 → 解释反馈 → 复习
 * intro 卡片里的 widget 由界面渲染为可交互组件。
 */
export const LESSONS = [
  // ── 世界 1
  { id: 'w1.clef', world: 'w1', title: '谱号与五线', minutes: 4, count: 7,
    intro: [
      { step: '观察', title: 'clé de sol 高音谱号', text: '小提琴谱都用 clé de sol。它的螺旋从第二线开始绕——第二线就是 Sol3。八度号用法国音乐学院的习惯：中央 Do 叫 Do3，La3 = 440 Hz（和老师说的一样）。', widget: { type: 'staff', staff: { keyCount: 0, notes: [{ step: 'G', octave: 4, dur: 'w', measure: 1 }] } } },
      { step: '发现规律', title: '线和间交替', text: '线上的音从下往上：Mi–Sol–Si–Ré–Fa；间里的音：Fa–La–Do–Mi。音往上走一格（线→间→线），音名就往后数一个。', widget: { type: 'staff', play: true, staff: { keyCount: 0, notes: ['E', 'F', 'G', 'A', 'B', 'C', 'D', 'E'].map((s, i) => ({ step: s, octave: i < 5 ? 4 : 5, dur: 'q', measure: i < 4 ? 1 : 2 })) } } },
    ],
    pool: () => ['read.clef', 'read.lines', 'read.spaces', ...['E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5'].map((n) => `read.note.${n}`)] },
  { id: 'w1.ledger', world: 'w1', title: '加线上的音', minutes: 4, count: 7,
    intro: [
      { step: '观察', title: '下加线：小提琴的低音区', text: 'Sol 弦的空弦 Sol2 在下加二线下方。从 Mi3（第一线）往下数：Ré3 → Do3（下加一线）→ Si2 → La2（下加二线）→ Sol2。', widget: { type: 'staff', play: true, staff: { keyCount: 0, notes: ['E4', 'D4', 'C4', 'B3', 'A3', 'G3'].map((n, i) => ({ step: n[0], octave: +n[1], dur: i < 4 ? 'q' : 'h', measure: i < 4 ? 1 : 2 })) } } },
    ],
    pool: () => ['G3', 'A3', 'B3', 'C4', 'D4', 'G5', 'A5', 'B5', 'E4', 'F5'].map((n) => `read.note.${n}`) },
  { id: 'w1.finger', world: 'w1', title: '先认音符，再看指法', minutes: 4, count: 4,
    intro: [
      { step: '发现规律', title: '指法数字 ≠ 音名', text: '谱上的「2」只说明用中指，不说明是什么音。同一个 2 指，在 La 弦第一把位可能是 Do 或 Do♯，在 Ré 弦可能是 Fa 或 Fa♯。所以要先认音符，再用指法确认琴弦和把位。', widget: { type: 'fingerboard', pos: 'first', highlightFinger: 2 } },
    ],
    pool: () => ['read.finger.first', 'finger.ambiguous', 'finger.samenote', 'reading.order'] },

  // ── 世界 2
  { id: 'w2.sharps', world: 'w2', title: '升号顺序 Fa–Do–Sol…', minutes: 4, count: 7,
    intro: [
      { step: '观察', title: '七个升号', text: '升号总是按同一个顺序加入调号：Fa – Do – Sol – Ré – La – Mi – Si。', widget: { type: 'staff', staff: { keyCount: 3, notes: [] }, caption: '3 个升号：Fa♯ Do♯ Sol♯' } },
      { step: '发现规律', title: '每次往上数 5 个音名', text: '从这个升号算起，数到第 5 个音名就是下一个升号（纯五度）：Fa、Sol、La、Si、Do → Do；Do、Ré、Mi、Fa、Sol → Sol……念熟它：Fa Do Sol Ré La Mi Si！' },
    ],
    pool: () => ['order.sharps', ...ids('sharps.index.'), ...ids('sharps.next.')], must: ['order.sharps'] },
  { id: 'w2.flats', world: 'w2', title: '降号顺序 Si–Mi–La…', minutes: 4, count: 7,
    intro: [
      { step: '发现规律', title: '倒过来就是降号', text: '降号顺序是升号顺序倒过来：Si – Mi – La – Ré – Sol – Do – Fa。', widget: { type: 'staff', staff: { keyCount: -2, notes: [] }, caption: '2 个降号：Si♭ Mi♭' } },
    ],
    pool: () => ['order.flats', ...ids('flats.index.'), ...ids('flats.next.')], must: ['order.flats'] },
  { id: 'w2.keysig', world: 'w2', title: '读懂调号', minutes: 5, count: 7,
    intro: [
      { step: '观察', title: '调号管整首曲子', text: '谱号后面的升降号叫调号（armure）。它管整首曲子、所有八度的这些音。', widget: { type: 'staff', staff: { keyCount: 2, notes: [{ step: 'F', octave: 4, dur: 'h', measure: 1 }, { step: 'F', octave: 5, dur: 'h', measure: 1 }] }, play: true, caption: '两个 Fa 都要拉成 Fa♯，虽然音符前面没写 ♯' } },
    ],
    pool: () => [...ids('ks.notes.'), ...ids('ks.last.'), ...ids('ks.key.')] },
  { id: 'w2.accidentals', world: 'w2', title: '♯ ♭ ♮ 临时记号', minutes: 6, count: 6,
    intro: [
      { step: '观察', title: '三个符号', text: '♯ dièse 升高半音；♭ bémol 降低半音；♮ bécarre 还原成本位音（取消调号或前面的升降）。' },
      { step: '发现规律', title: '临时记号管多久？', text: '写在音符前面的临时记号，只管同一小节里、同一个位置的音；过了小节线就失效，又回到调号。', widget: { type: 'staff', play: true, staff: { keyCount: 2, notes: [{ step: 'F', octave: 4, acc: 'n', dur: 'q', measure: 1 }, { step: 'G', octave: 4, dur: 'q', measure: 1 }, { step: 'F', octave: 4, dur: 'h', measure: 1 }, { step: 'F', octave: 4, dur: 'w', measure: 2 }] }, caption: '第 1 小节两个 Fa 都是还原的 Fa；第 2 小节回到 Fa♯' } },
    ],
    pool: () => ids('acc.') },

  // ── 世界 3
  { id: 'w3.durations', world: 'w3', title: 'ronde · blanche · noire · croche', minutes: 4, count: 7,
    intro: [
      { step: '观察', title: '四种时值', text: '以 noire（四分音符）为 1 拍：ronde 4 拍、blanche 2 拍、noire 1 拍、croche 半拍。', widget: { type: 'staff', play: true, staff: { keyCount: 0, time: '4/4', notes: [{ step: 'B', octave: 4, dur: 'h', measure: 1 }, { step: 'B', octave: 4, dur: 'q', measure: 1 }, { step: 'B', octave: 4, dur: '8', measure: 1 }, { step: 'B', octave: 4, dur: '8', measure: 1 }] } } },
      { step: '动手操作', title: '开拉之前', text: '老师说：不要急着拉！先看调号、拍号和节奏，摆好姿势，在心里数一小节，再稳稳进入。' },
    ],
    pool: () => [...ids('dur.'), 'rhythm.before-play'] },
  { id: 'w3.tap1', world: 'w3', title: '节奏敲击 · noire 与 blanche', minutes: 5, count: 3, rhythm: true,
    intro: [{ step: '试听', title: '先听节拍器', text: '先听一小节「预备拍」，然后在每个音开始的地方敲一下（点按钮、点屏幕或按空格键）。blanche 只敲一下，让它响满 2 拍。' }],
    pool: () => ['tap.qqqq', 'tap.hh', 'tap.hqq', 'tap.qqh'] },
  { id: 'w3.tap2', world: 'w3', title: '节奏敲击 · 加入 croches', minutes: 5, count: 3, rhythm: true,
    intro: [{ step: '发现规律', title: '两个 croches = 1 拍', text: '数「1 和 2 和」：两个 croches 落在「1」和「和」上。速度可以先放慢到 50 或 60。' }],
    pool: () => ['tap.q88qq', 'tap.88q88q', 'tap.q88h'] },

  // ── 世界 4
  { id: 'w4.keyboard', world: 'w4', title: '全音、半音与 D 大调', minutes: 6, count: 6,
    intro: [
      { step: '动手操作', title: '在键盘上找半音', text: '点一点键盘：紧挨着的两个键（包括黑键）相差一个半音 demi-ton；隔一个键是全音 ton。Mi–Fa 和 Si–Do 之间没有黑键，天生就是半音。', widget: { type: 'keyboard' } },
    ],
    pool: () => [...ids('step.kind.'), 'scale.build.D', 'scale.half.D'], must: ['scale.build.D', 'scale.half.D'] },
  { id: 'w4.open', world: 'w4', title: '四根空弦', minutes: 3, count: 6,
    intro: [{ step: '试听', title: 'Sol · Ré · La · Mi', text: '点一点四根空弦，听它们的声音。', widget: { type: 'fingerboard', pos: 'open' } }],
    pool: () => ['open.order', ...ids('open.staff.'), ...ids('open.ear.')] },
  { id: 'w4.first', world: 'w4', title: '第一把位：音符→琴弦→手指', minutes: 6, count: 7,
    intro: [{ step: '动手操作', title: '第一把位地图', text: '点亮的圆点是第一把位已核对的音位。点一点，看音名和手指。注意：低2指、高2指都叫「2 指」。', widget: { type: 'fingerboard', pos: 'first' } }],
    pool: () => [...ids('p1.finger.'), ...ids('p1.where.')] },
  { id: 'w4.spacing', world: 'w4', title: '手指何时靠拢？', minutes: 5, count: 5,
    intro: [{ step: '发现规律', title: '半音靠拢，全音分开', text: '同一根弦上，两个音相差半音，两根手指就要靠拢；相差全音就分开。这取决于具体的音、琴弦和把位，不是固定的「几指和几指永远靠拢」。', widget: { type: 'spacing', set: 'spacing.A1.D' } }],
    pool: () => ids('spacing.') },
  { id: 'w4.third', world: 'w4', title: '第三把位入门', minutes: 6, count: 6,
    intro: [{ step: '观察', title: '整只手往上搬家', text: '第三把位时，1 指落在空弦往上数第 4 个音名（空弦本身算第 1 个）：La 弦上 La→Si→Do→Ré，1 指就是 Ré4——也就是第一把位 3 指的位置。同一个音换了把位，手指数字也会变。', widget: { type: 'fingerboard', pos: 'third' } }],
    pool: () => [...ids('p3.first.'), ...ids('p3.finger.'), 'finger.samenote'] },

  // ── 世界 5
  { id: 'w5.direction', world: 'w5', title: '更高？更低？一样？', minutes: 3, count: 7, needsAudio: true,
    intro: [{ step: '试听', title: '先开声音', text: '这一关全靠耳朵。每题可以重复听，听清楚再选。' }],
    pool: () => ids('ear.dir.') },
  { id: 'w5.steps', world: 'w5', title: '半音还是全音？', minutes: 4, count: 6, needsAudio: true,
    intro: [{ step: '试听', title: '近 vs. 远', text: '半音很近、有点「紧」；全音宽一倍。', widget: { type: 'keyboard', demo: [['E4', 'F4'], ['F4', 'G4']] } }],
    pool: () => ids('ear.step.') },
  { id: 'w5.melody', world: 'w5', title: '旋律配乐谱', minutes: 4, count: 4, needsAudio: true,
    intro: [{ step: '试听', title: '耳朵 + 眼睛', text: '听旋律时用手指跟着乐谱走：声音往上，音符也往上。' }],
    pool: () => ids('ear.melody.') },

  // ── 世界 6（侦探关卡由专用流程运行）
  ...EXCERPTS.map((ex) => ({ id: `w6.${ex.id}`, world: 'w6', title: `识谱侦探 · ${ex.title}`, minutes: 7, detective: ex.id, level: ex.level })),
];

export const lessonById = (id) => LESSONS.find((l) => l.id === id) ?? (id === 'w6.detective' ? LESSONS.find((l) => l.world === 'w6') : null);
export const lessonsOf = (worldId) => LESSONS.filter((l) => l.world === worldId);
