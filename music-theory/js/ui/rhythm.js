// 节奏竞技场：节拍器 + 真实敲击时间采集与评分
// 时间基准：AudioContext.currentTime（与节拍器同一时钟），并扣除输出延迟。
import { h } from './dom.js';
import { staffView } from './staff.js';
import { audio } from '../audio.js';
import { onsetsInBeats } from '../theory.js';
import { scoreTaps, tapFeedback } from '../content/arena.js';

export const BPM_CHOICES = [50, 52, 60, 72, 80];

export function rhythmGame(q, { onResult, onNext }) {
  const p = q.pattern;
  let bpm = 60;
  try { bpm = Number(localStorage.getItem('tt_mq_bpm')) || 60; } catch { /* 无存储时用默认 */ }
  if (!BPM_CHOICES.includes(bpm)) bpm = 60;
  let run = null;
  let runs = 0;

  const staff = staffView({ keyCount: 0, time: '4/4', notes: p.durs.map((d) => ({ step: 'B', octave: 4, dur: d, measure: 1 })) }, { label: '节奏型' });
  const bpmSel = h('div', { class: 'bpm-row', role: 'radiogroup', 'aria-label': '速度 BPM' },
    h('span', { class: 'muted small' }, '速度（每分钟拍数）：'),
    ...BPM_CHOICES.map((b) => {
      const btn = h('button', { class: 'chip', type: 'button', role: 'radio', 'aria-checked': String(b === bpm) }, String(b));
      btn.addEventListener('click', () => {
        if (run) return;
        bpm = b;
        try { localStorage.setItem('tt_mq_bpm', String(b)); } catch { /* 忽略 */ }
        bpmSel.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-checked', String(c.textContent === String(b))));
      });
      return btn;
    }));
  const status = h('p', { class: 'tap-status', 'aria-live': 'polite' }, '先点「听示范」，再点「开始」。会先响 4 下预备拍。');
  const beatDots = h('div', { class: 'beat-dots', 'aria-hidden': 'true' }, ...[0, 1, 2, 3].map(() => h('span')));
  const pad = h('button', { class: 'tap-pad', type: 'button', disabled: true, 'aria-label': '敲击区：在每个音开始时点按，或按空格键' }, '敲 · TAP');
  const startBtn = h('button', { class: 'btn primary', type: 'button' }, '开始');
  const demoBtn = h('button', { class: 'btn ghost', type: 'button' }, '▶ 听示范');
  const result = h('div', { class: 'tap-result', 'aria-live': 'polite' });
  const el = h('div', { class: 'rhythm' }, staff, bpmSel, h('div', { class: 'q-actions' }, demoBtn, startBtn), beatDots, pad, status, result);

  const { onsets, total } = onsetsInBeats(p.durs);

  demoBtn.addEventListener('click', async () => {
    if (run) return;
    if (!(await audio.unlock())) { status.textContent = '声音无法开启：请检查设备静音开关后再点一次。'; return; }
    const spb = 60 / bpm;
    const t0 = audio.now() + 0.15;
    for (let b = 0; b < 4; b++) audio.click(t0 + b * spb, b === 0);
    p.durs.forEach((d, i) => audio.note(71, { at: t0 + onsets[i] * spb, dur: Math.max(0.15, ({ h: 2, q: 1, '8': 0.5, w: 4 }[d]) * spb - 0.06) }));
    status.textContent = '示范：每个音开始时，就是你要敲的时刻。';
  });

  startBtn.addEventListener('click', async () => {
    if (run) return;
    if (!(await audio.unlock())) { status.textContent = '声音无法开启：请检查设备静音开关后再点一次。'; return; }
    if (audio.muted) { status.textContent = '声音被关闭了：先在右上角打开声音，才能听到节拍器。'; return; }
    begin();
  });

  function begin() {
    const spb = 60 / bpm;
    const t0 = audio.now() + 0.25;
    const countIn = 4;
    const latency = (audio.ctx.outputLatency || audio.ctx.baseLatency || 0);
    const expected = onsets.map((b) => t0 + (countIn + b) * spb);
    const endAt = t0 + (countIn + total) * spb + spb * 0.6;
    const taps = [];
    let nextBeat = 0;
    const totalBeats = countIn + total;
    result.replaceChildren();
    run = { taps, expected, timer: null, raf: null };
    startBtn.disabled = true; demoBtn.disabled = true; pad.disabled = false;
    pad.focus({ preventScroll: true });
    // 节拍器调度（25ms 轮询，提前 120ms 安排），可随时中止
    run.timer = setInterval(() => {
      while (nextBeat < totalBeats && t0 + nextBeat * spb < audio.now() + 0.12) {
        audio.click(t0 + nextBeat * spb, nextBeat % 4 === 0);
        nextBeat += 1;
      }
      if (audio.now() > endAt) finish();
    }, 25);
    const tick = () => {
      if (!run) return;
      const b = Math.floor((audio.now() - t0) / spb);
      beatDots.querySelectorAll('span').forEach((s, i) => s.classList.toggle('on', b >= 0 && b % 4 === i));
      status.textContent = b < 0 ? '准备……' : b < countIn ? `预备拍 ${b + 1} / 4 · 先别敲` : '现在跟着节奏敲！';
      run.raf = requestAnimationFrame(tick);
    };
    tick();
    run.onTap = (e) => {
      if (e) e.preventDefault();
      const t = audio.now() - latency;
      if (t < t0 + (countIn - 0.5) * spb) return; // 预备拍内的敲击不计
      taps.push(t);
      pad.classList.add('hit'); setTimeout(() => pad.classList.remove('hit'), 90);
    };
  }

  function stopRun() {
    if (!run) return;
    clearInterval(run.timer); cancelAnimationFrame(run.raf);
    beatDots.querySelectorAll('span').forEach((s) => s.classList.remove('on'));
    pad.disabled = true; startBtn.disabled = false; demoBtn.disabled = false;
  }

  function finish() {
    const r = run;
    stopRun();
    run = null;
    const s = scoreTaps(r.expected, r.taps);
    runs += 1;
    const fb = tapFeedback(s, p.durs);
    result.replaceChildren(
      h('div', { class: 'tap-timeline', 'aria-hidden': 'true' }, ...s.results.map((x) => h('span', { class: `g-${x.grade}`, title: x.offsetMs == null ? '漏掉' : `${x.offsetMs > 0 ? '+' : ''}${x.offsetMs} ms` }, x.grade === 'good' ? '●' : x.grade === 'ok' ? '◐' : '○'))),
      h('p', { class: 'fb-head' }, fb.head),
      h('p', { class: 'muted' }, `对上 ${s.hits}/${s.total} 个音（${s.good} 个很准）${s.meanAbsMs != null ? `，平均偏差 ${s.meanAbsMs} 毫秒` : ''}${s.extra ? `，多敲 ${s.extra} 下` : ''}。`),
      ...fb.tips.map((t) => h('p', { class: 'tip' }, t)),
      h('div', { class: 'q-actions' },
        h('button', { class: 'btn ghost', type: 'button', onclick: () => { result.replaceChildren(); status.textContent = '再来一次：先听预备拍。'; } }, '再来一次'),
        h('button', { class: 'btn primary', type: 'button', onclick: () => onNext() }, '下一题')),
    );
    status.textContent = '完成！';
    onResult({ ...s, bpm, pattern: p.id }, runs);
  }

  function abort(reason) {
    if (!run) return;
    stopRun();
    run = null;
    status.textContent = reason;
  }

  pad.addEventListener('pointerdown', (e) => run?.onTap(e));
  const onKey = (e) => {
    if (!el.isConnected) { cleanup(); return; }
    if (e.code === 'Space' && run) run.onTap(e);
  };
  const onHide = () => { if (document.hidden) abort('暂停了：切换到别的页面时节拍器会停止。准备好后点「开始」重来。'); };
  const onBlur = () => abort('暂停了：窗口失去焦点。准备好后点「开始」重来。');
  window.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('blur', onBlur);
  function cleanup() {
    stopRun(); run = null;
    window.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onHide);
    window.removeEventListener('blur', onBlur);
  }
  el._cleanup = cleanup;
  return el;
}
