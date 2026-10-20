// 交互组件：小音 Mino、迷你键盘、抽象指板、手指间距图
import { h, svgEl } from './dom.js';
import { audio } from '../audio.js';
import { midi as toMidi, parseNote } from '../theory.js';
import { STRINGS, POSITIONS, slotsOn, stringById, placements } from '../violin.js';

/* ── 小音 Mino：原创音乐精灵（圆润光球 + 符尾小天线 + 迷你小提琴） ── */
export function mino(mood = 'happy', size = 96) {
  const mouth = {
    happy: '<path d="M43 63 Q50 70 57 63" stroke="#1d1850" stroke-width="3" fill="none" stroke-linecap="round"/>',
    think: '<ellipse cx="51" cy="65" rx="3.5" ry="4" fill="#1d1850"/>',
    cheer: '<path d="M41 61 Q50 74 59 61 Z" fill="#1d1850"/><path d="M45 66 Q50 70 55 66" fill="#ff9b8a"/>',
    calm: '<path d="M44 64 Q50 67 56 64" stroke="#1d1850" stroke-width="3" fill="none" stroke-linecap="round"/>',
  }[mood] || '';
  const eyes = mood === 'cheer'
    ? '<path d="M36 52 Q40 47 44 52" stroke="#1d1850" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M56 52 Q60 47 64 52" stroke="#1d1850" stroke-width="3" fill="none" stroke-linecap="round"/>'
    : '<ellipse cx="40" cy="52" rx="4.2" ry="5.2" fill="#1d1850"/><ellipse cx="60" cy="52" rx="4.2" ry="5.2" fill="#1d1850"/><circle cx="41.5" cy="50" r="1.5" fill="#fff"/><circle cx="61.5" cy="50" r="1.5" fill="#fff"/>';
  const wrap = h('span', { class: `mino mino-${mood}`, 'aria-hidden': 'true' });
  wrap.innerHTML = `<svg viewBox="0 0 120 110" width="${size}" height="${size * 110 / 120}">
    <defs><radialGradient id="mg-${mood}" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#e0f7ff"/><stop offset=".55" stop-color="#8fd8ff"/><stop offset="1" stop-color="#b49cff"/></radialGradient></defs>
    <path d="M50 18 L50 6 Q62 8 66 18" stroke="#f4c26b" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <circle cx="50" cy="56" r="38" fill="url(#mg-${mood})"/>
    <ellipse cx="34" cy="62" rx="5" ry="3" fill="#ff9b8a" opacity=".55"/><ellipse cx="66" cy="62" rx="5" ry="3" fill="#ff9b8a" opacity=".55"/>
    ${eyes}${mouth}
    <g transform="translate(86 52) rotate(28)">
      <rect x="-3" y="-24" width="6" height="18" rx="2" fill="#7c4a2d"/>
      <path d="M0 -6 C-11 -6 -12 4 -7 8 C-12 12 -11 24 0 24 C11 24 12 12 7 8 C12 4 11 -6 0 -6Z" fill="#c07a3e" stroke="#7c4a2d" stroke-width="1.5"/>
      <path d="M-4 6 q-1 4 0 8 M4 6 q1 4 0 8" stroke="#3b2414" stroke-width="1.2" fill="none"/>
    </g>
    <line x1="72" y1="88" x2="108" y2="40" stroke="#f4c26b" stroke-width="2.4" stroke-linecap="round"/>
  </svg>`;
  return wrap;
}

/* ── 法语音名（按半音，键盘/指板展示用） ── */
const PC_NAMES = ['Do', 'Do♯/Ré♭', 'Ré', 'Mi♭', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯/La♭', 'La', 'Si♭', 'Si'];
// 八度号按法国习惯（中央 Do = Do3）
export const midiName = (m, oct = true) => `${PC_NAMES[m % 12]}${oct ? Math.floor(m / 12) - 2 : ''}`;

export function playNoteStr(s, dur = 0.8) {
  return audio.note(toMidi(s), { dur });
}
export function playSeq(list, bpm = 80) {
  return audio.sequence(list.map((s) => ({ midi: typeof s === 'number' ? s : toMidi(s), beats: 1 })), { bpm });
}

/* ── 迷你键盘 C4–E5 ── */
const WHITE = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5'];
const BLACK = [['C#4', 0], ['D#4', 1], ['F#4', 3], ['G#4', 4], ['A#4', 5], ['C#5', 7], ['D#5', 8]];
const BLACK_LABEL = { 'C#4': 'Do♯', 'D#4': 'Ré♯', 'F#4': 'Fa♯', 'G#4': 'Sol♯', 'A#4': 'Si♭', 'C#5': 'Do♯', 'D#5': 'Mi♭' };

export function keyboard({ highlight = [], onKey = null, labels = true } = {}) {
  const hl = new Set(highlight.map((x) => (typeof x === 'number' ? x : toMidi(x))));
  const W = 40, H = 150;
  const svg = svgEl('svg', { viewBox: `0 0 ${WHITE.length * W} ${H + 4}`, class: 'kbd', role: 'group', 'aria-label': '迷你键盘 Do3 到 Mi4' });
  const keys = new Map();
  const mk = (note, x, w, hgt, black) => {
    const m = toMidi(note);
    const g = svgEl('g', { class: `key ${black ? 'black' : 'white'}${hl.has(m) ? ' hl' : ''}`, 'data-midi': m, tabindex: '0', role: 'button', 'aria-label': `${black ? BLACK_LABEL[note] : midiName(m, false)}${Number(note.slice(-1)) - 1}` });
    g.append(svgEl('rect', { x, y: 0, width: w, height: hgt, rx: 5 }));
    if (labels) {
      const t = svgEl('text', { x: x + w / 2, y: hgt - (black ? 10 : 14), 'text-anchor': 'middle' });
      t.textContent = black ? BLACK_LABEL[note] : midiName(m, false);
      g.append(t);
    }
    const press = () => {
      playNoteStr(note, 0.7);
      g.classList.add('pressed'); setTimeout(() => g.classList.remove('pressed'), 180);
      onKey?.(m, note, g);
    };
    g.addEventListener('pointerdown', (e) => { e.preventDefault(); press(); });
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); press(); } });
    keys.set(m, g);
    return g;
  };
  WHITE.forEach((n, i) => svg.append(mk(n, i * W + 1, W - 2, H, false)));
  BLACK.forEach(([n, after]) => svg.append(mk(n, (after + 1) * W - 13, 26, 92, true)));
  const box = h('div', { class: 'kbd-wrap' }, svg);
  box.mark = (m, cls) => keys.get(m)?.classList.add(cls);
  box.clear = (cls) => keys.forEach((g) => g.classList.remove(cls));
  return box;
}

/* ── 抽象指板（不画品格）：琴弦 + 已核对音位圆点 ── */
export function fingerboard({ pos = 'first', highlightFinger = null, reveal = null, onSlot = null, interactive = true } = {}) {
  const cols = STRINGS.map((s, i) => ({ ...s, x: 70 + i * 70 }));
  const rows = pos === 'third' ? [5, 6, 7, 8, 9, 10] : pos === 'open' ? [0] : [0, 1, 2, 3, 4, 5, 7];
  const y0 = 46, dy = 34;
  const top = rows[0];
  const height = y0 + (rows[rows.length - 1] - top) * dy + 40;
  const svg = svgEl('svg', { viewBox: `0 0 340 ${height}`, class: 'board', role: 'group', 'aria-label': `抽象指板 · ${pos === 'open' ? '空弦' : POSITIONS[pos].zh}` });
  // 弦与标题
  cols.forEach((c, i) => {
    svg.append(svgEl('line', { x1: c.x, y1: 26, x2: c.x, y2: height - 8, class: 'string', 'stroke-width': 3.2 - i * 0.6 }));
    const t = svgEl('text', { x: c.x, y: 16, 'text-anchor': 'middle', class: 'string-name' });
    t.textContent = c.fr;
    svg.append(t);
  });
  if (pos === 'first' || pos === 'open') svg.append(svgEl('rect', { x: 40, y: 24, width: 260, height: 5, rx: 2, class: 'nut' }));
  const info = h('p', { class: 'board-info', 'aria-live': 'polite' }, interactive ? '点一个圆点：听声音、看音名和手指。' : '');
  const slots = [];
  for (const c of cols) {
    const list = pos === 'open' ? [{ semis: 0, finger: 0, label: '空弦', midi: toMidi(c.open) }] : slotsOn(c.id, pos);
    for (const s of list) {
      const y = y0 + (s.semis - top) * dy;
      const isRev = reveal && reveal.string === c.id && reveal.semis === s.semis;
      const dim = highlightFinger != null && s.finger !== highlightFinger;
      const g = svgEl('g', { 'data-string': c.id, 'data-semis': s.semis, class: `slot${isRev ? ' reveal' : ''}${dim ? ' dim' : ''}${highlightFinger === s.finger ? ' focus' : ''}`, tabindex: interactive ? '0' : '-1', role: interactive ? 'button' : 'img', 'aria-label': `${c.fr} 弦 ${s.label} ${midiName(s.midi)}` });
      g.append(svgEl('circle', { cx: c.x, cy: y, r: 14 }));
      const t = svgEl('text', { x: c.x, y: y + 5, 'text-anchor': 'middle' });
      t.textContent = s.finger === 0 ? '0' : String(s.finger);
      g.append(t);
      if (s.label.startsWith('低') || s.label.startsWith('高')) {
        const lt = svgEl('text', { x: c.x + 20, y: y + 4, class: 'slot-tag' });
        lt.textContent = s.label[0];
        g.append(lt);
      }
      if (interactive) {
        const act = () => {
          audio.note(s.midi, { dur: 0.8 });
          slots.forEach((x) => x.classList.remove('active'));
          g.classList.add('active');
          info.textContent = `${c.fr} 弦 · ${pos === 'open' ? '空弦' : POSITIONS[pos].zh} · ${s.label} → ${midiName(s.midi)}`;
          onSlot?.({ string: c.id, ...s });
        };
        g.addEventListener('pointerdown', (e) => { e.preventDefault(); act(); });
        g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
      }
      slots.push(g);
      svg.append(g);
    }
  }
  const legend = pos === 'open' ? '' : `${POSITIONS[pos].zh} · 圆点间距按半音等距排列（示意图，不是真实品格）`;
  return h('div', { class: 'board-wrap' }, svg, h('p', { class: 'board-legend' }, legend), info);
}

/* ── 手指间距：一根弦上 1–2–3–4 指的距离 ── */
export function spacingDiagram(set) {
  const open = toMidi(stringById(set.string).open);
  const pts = set.notes.map((n) => {
    const p = placements(n, set.pos).find((x) => x.string === set.string);
    return { n, semis: toMidi(n) - open, finger: p.finger };
  });
  const min = pts[0].semis, max = pts[pts.length - 1].semis;
  const W = 340, x0 = 30, scale = (W - 60) / Math.max(1, max - min);
  const svg = svgEl('svg', { viewBox: `0 0 ${W} 120`, class: 'spacing', role: 'img', 'aria-label': '手指间距示意' });
  svg.append(svgEl('line', { x1: 10, y1: 60, x2: W - 10, y2: 60, class: 'string', 'stroke-width': 3 }));
  pts.forEach((p, i) => {
    const x = x0 + (p.semis - min) * scale;
    if (i > 0) {
      const prev = x0 + (pts[i - 1].semis - min) * scale;
      const d = p.semis - pts[i - 1].semis;
      const path = svgEl('path', { d: `M${prev} 40 Q${(prev + x) / 2} ${d === 1 ? 28 : 18} ${x} 40`, class: d === 1 ? 'arc close' : 'arc' });
      svg.append(path);
      const t = svgEl('text', { x: (prev + x) / 2, y: d === 1 ? 22 : 12, 'text-anchor': 'middle', class: d === 1 ? 'arc-label close' : 'arc-label' });
      t.textContent = d === 1 ? '半音·靠拢' : '全音';
      svg.append(t);
    }
    svg.append(svgEl('circle', { cx: x, cy: 60, r: 13, class: 'dot' }));
    const f = svgEl('text', { x, y: 65, 'text-anchor': 'middle', class: 'dot-f' });
    f.textContent = p.finger;
    svg.append(f);
    const nt = svgEl('text', { x, y: 96, 'text-anchor': 'middle', class: 'dot-n' });
    nt.textContent = midiName(toMidi(p.n)).replace(/\d+$/, '').split('/')[0];
    svg.append(nt);
  });
  const play = h('button', { class: 'btn ghost small', type: 'button', onclick: () => playSeq(set.notes, 80) }, '▶ 听这四个音');
  return h('div', { class: 'spacing-wrap' }, h('p', { class: 'muted' }, `${stringById(set.string).fr} 弦 · ${POSITIONS[set.pos].zh} · ${set.ctx}`), svg, play);
}

export { parseNote };
