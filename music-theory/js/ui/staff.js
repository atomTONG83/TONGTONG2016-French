// 五线谱渲染：使用本地 vendored VexFlow 4.2.3（MIT），不依赖外部 CDN。
// 正确显示 谱号、调号、拍号、音符、临时记号（♯ ♭ ♮）、时值与指法数字。
import { h } from './dom.js';
import { keyByCount } from '../theory.js';

const INK = '#1d1850';
const HI = '#c2410c';

export function vexReady() {
  return typeof window !== 'undefined' && !!window.Vex?.Flow;
}

/**
 * staff: { keyCount, time?: '4/4'|null, notes: [{step, octave, acc, dur, measure, finger?}], highlight?: number[] }
 * 返回容器元素；窗口尺寸变化时自动重绘。
 */
export function staffView(staff, { label = '五线谱', compact = false } = {}) {
  const box = h('div', { class: `staff-paper${compact ? ' compact' : ''}`, role: 'img', 'aria-label': describe(staff, label) });
  const draw = () => {
    box.replaceChildren();
    if (!vexReady()) {
      box.append(h('p', { class: 'staff-fallback' }, '乐谱组件加载失败，请刷新页面。'));
      return;
    }
    try { render(box, staff, compact); } catch (e) {
      console.error(e);
      box.append(h('p', { class: 'staff-fallback' }, '这段乐谱暂时无法显示。'));
    }
  };
  box._staff = staff;
  box.redraw = (next) => { if (next) box._staff = staff = next; draw(); };
  requestAnimationFrame(draw);
  let lastW = 0;
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => {
    const w = box.clientWidth;
    if (box.isConnected && Math.abs(w - lastW) > 8) { lastW = w; draw(); }
  }) : null;
  ro?.observe(box);
  return box;
}

function render(box, staff, compact) {
  const VF = window.Vex.Flow;
  const width = Math.max(260, Math.min(box.clientWidth || 320, 900));
  const measures = groupMeasures(staff.notes || []);
  const n = Math.max(1, measures.length);
  const key = keyByCount(staff.keyCount ?? 0);
  const head = 40 + Math.abs(staff.keyCount ?? 0) * 11;
  const timeW = staff.time ? 26 : 0;
  // 窄屏（手机）且音符较多时：每小节一行，每行开头重写谱号和调号（与真实乐谱换行一致）
  const maxPerMeasure = Math.max(0, ...measures.map((m) => m.length));
  const wrap = n > 1 && (width - head - timeW) / n < maxPerMeasure * 38;
  const rowH = compact ? 110 : 140;
  const rows = wrap ? n : 1;
  const renderer = new VF.Renderer(box, VF.Renderer.Backends.SVG);
  renderer.resize(width, (compact ? 20 : 30) + rows * rowH);
  const ctx = renderer.getContext();
  ctx.setFillStyle(INK); ctx.setStrokeStyle(INK);
  const hi = new Set(staff.highlight || []);
  let globalIndex = 0;
  const y0 = compact ? 14 : 34;
  for (let mi = 0; mi < n; mi++) {
    const row = wrap ? mi : 0;
    const startOfRow = wrap || mi === 0;
    let x, w;
    if (wrap) { x = 6; w = width - 12; }
    else {
      const per = (width - 12 - head - timeW) / n;
      x = 6 + (mi === 0 ? 0 : head + timeW + per * mi);
      w = mi === 0 ? per + head + timeW : per;
    }
    const stave = new VF.Stave(x, y0 + row * rowH, w);
    if (startOfRow) {
      stave.addClef('treble');
      if (staff.keyCount) stave.addKeySignature(key.vex);
      if (mi === 0 && staff.time) stave.addTimeSignature(staff.time);
    }
    if (mi === n - 1 && measures.length > 1) stave.setEndBarType(VF.Barline.type.END);
    stave.setContext(ctx).draw();
    const notes = measures[mi] || [];
    if (notes.length) {
      const vnotes = notes.map((nt) => {
        const sn = new VF.StaveNote({ clef: 'treble', keys: [`${nt.step.toLowerCase()}/${nt.octave}`], duration: nt.dur, auto_stem: true });
        if (nt.acc) sn.addModifier(new VF.Accidental(nt.acc), 0);
        if (nt.finger != null) {
          const f = new VF.FretHandFinger(String(nt.finger));
          f.setPosition(VF.Modifier.Position.ABOVE);
          sn.addModifier(f, 0);
        }
        if (hi.has(globalIndex)) sn.setStyle({ fillStyle: HI, strokeStyle: HI });
        globalIndex += 1;
        return sn;
      });
      const voice = new VF.Voice({ num_beats: 4, beat_value: 4 }).setMode(VF.Voice.Mode.SOFT);
      voice.addTickables(vnotes);
      const beams = VF.Beam.generateBeams(vnotes);
      new VF.Formatter().joinVoices([voice]).format([voice], stave.getNoteEndX() - stave.getNoteStartX() - 14);
      voice.draw(ctx, stave);
      beams.forEach((b) => b.setContext(ctx).draw());
    }
  }
}

function groupMeasures(notes) {
  const map = new Map();
  for (const n of notes) {
    if (!map.has(n.measure)) map.set(n.measure, []);
    map.get(n.measure).push(n);
  }
  return [...map.keys()].sort((a, b) => a - b).map((k) => map.get(k));
}

const FR = { C: 'Do', D: 'Ré', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' };
function describe(staff, label) {
  const k = staff.keyCount ? `${Math.abs(staff.keyCount)} 个${staff.keyCount > 0 ? '升' : '降'}号` : '无调号';
  const ns = (staff.notes || []).length;
  return `${label}：高音谱号，${k}${ns ? `，${ns} 个音` : ''}${(staff.highlight || []).length ? `，第 ${staff.highlight.map((i) => i + 1).join('、')} 个音高亮` : ''}`;
}
export { FR };
