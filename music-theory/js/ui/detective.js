// 识谱侦探：调号 → 音名 → 实际音高 → 琴弦/把位/指法 → 节奏 → 听示范 → 独立再读
import { h } from './dom.js';
import { staffView } from './staff.js';
import { renderQuestion, soundGate } from './question.js';
import { mino } from './widgets.js';
import { audio } from '../audio.js';
import { midi, DURATIONS } from '../theory.js';
import { buildDetective, staffFor, EXCERPTS } from '../content/castle.js';

export function detectiveView(exId, { record, onFinish }) {
  const ex = EXCERPTS.find((e) => e.id === exId);
  const det = buildDetective(ex);
  const steps = det.steps;
  const queue = [];
  steps.forEach((s, si) => {
    if (s.kind === 'listen') queue.push({ si, listen: true });
    else s.questions.forEach((q) => queue.push({ si, q }));
  });
  const stats = { decode: { n: 0, ok: 0 }, solo: { n: 0, ok: 0 } };
  let pos = 0;

  const chips = h('ol', { class: 'det-steps', 'aria-label': '解码步骤' }, ...steps.map((s) => h('li', {}, s.title)));
  const stage = h('div', { class: 'det-stage' });
  const root = h('div', { class: 'detective' },
    h('div', { class: 'det-intro' }, mino('think', 64), h('div', {},
      h('h2', {}, `识谱侦探 · ${ex.title}`),
      h('p', { class: 'muted' }, `一段从没见过的短乐谱。先自己一步步解码，最后才能听示范。${ex.position === 'third' ? '这一段用第三把位。' : '这一段用第一把位。'}`))),
    chips, stage);

  function show() {
    const item = queue[pos];
    [...chips.children].forEach((li, i) => li.className = i < (item?.si ?? 99) ? 'done' : i === item?.si ? 'now' : '');
    stage.replaceChildren();
    if (!item) return done();
    const step = steps[item.si];
    if (item.listen) return stage.append(listenStep());
    const solo = step.kind === 'solo';
    if (solo && queue[pos - 1]?.listen) stage.append(h('p', { class: 'det-note' }, '现在提示都关掉了。不听示范、不看提示，从第一个音读到最后一个音。'));
    stage.append(renderQuestion(item.q, {
      record: (r) => {
        record(item.q, r);
        if (r.firstTry !== false || !r.ok) {
          const bucket = solo ? stats.solo : stats.decode;
          if (r.firstTry) { bucket.n += 1; if (r.ok && !r.hinted) bucket.ok += 1; }
        }
      },
      next: () => { pos += 1; show(); window.scrollTo({ top: root.offsetTop - 10, behavior: 'smooth' }); },
    }, { hints: solo ? [] : [step.hint1, step.hint2] }));
  }

  function listenStep() {
    const sv = staffView(staffFor(ex));
    const status = h('p', { class: 'muted', 'aria-live': 'polite' }, '解码完成！现在听标准示范，眼睛跟着发光的音符走。');
    const play = h('button', { class: 'btn primary', type: 'button' }, '▶ 播放示范');
    play.addEventListener('click', async () => {
      if (!(await audio.unlock())) { status.textContent = '声音无法开启：请检查设备静音开关。'; return; }
      const items = det.actual.map((n, i) => ({ midi: midi(n), beats: DURATIONS[ex.notes[i].dur].beats }));
      play.disabled = true;
      const dur = audio.sequence(items, { bpm: ex.bpm, onNote: (i) => sv.redraw(staffFor(ex, { highlight: [i] })) });
      setTimeout(() => { play.disabled = false; sv.redraw(staffFor(ex)); status.textContent = '可以再听一遍，或者继续最后一步。'; }, dur * 1000 + 300);
    });
    return h('div', { class: 'det-listen' }, sv, status, h('p', { class: 'muted small' }, `示范速度 ${ex.bpm} BPM。听熟旋律很好，但下一步还是要靠自己看谱读出来。`),
      h('div', { class: 'q-actions' }, audio.ready ? null : soundGate(), play,
        h('button', { class: 'btn ghost', type: 'button', onclick: () => { pos += 1; show(); } }, '继续：独立再读一遍')));
  }

  function done() {
    const pct = (b) => (b.n ? Math.round((b.ok / b.n) * 100) : 0);
    stage.append(h('div', { class: 'det-done' }, mino('cheer', 80),
      h('h2', {}, '解码完成！'),
      h('p', {}, `分步解码第一次就答对：${stats.decode.ok}/${stats.decode.n}（${pct(stats.decode)}%）`),
      h('p', {}, `不看提示独立再读：${stats.solo.ok}/${stats.solo.n}（${pct(stats.solo)}%）`),
      h('p', { class: 'muted' }, stats.solo.n && pct(stats.solo) >= 85 ? '独立读谱很稳！明天换一段新谱子试试。' : '独立再读还有几个音没读准，复习时会再出现。拉琴前也用同样的顺序先读一遍。'),
    ));
    onFinish({ total: stats.decode.n + stats.solo.n, ok: stats.decode.ok + stats.solo.ok });
  }
  show();
  return root;
}
