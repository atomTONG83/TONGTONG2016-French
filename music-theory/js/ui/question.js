import {setText,bilingual} from '../i18n.js';
// 题目渲染与判定（选择、多选、排序、键盘音阶；节奏题交给 rhythm.js）
import { h, sparkle, shuffle } from './dom.js';
import { staffView } from './staff.js';
import { keyboard, fingerboard, spacingDiagram, playNoteStr, playSeq, mino } from './widgets.js';
import { audio } from '../audio.js';
import { midi as toMidi, noteToString } from '../theory.js';
import { rhythmGame } from './rhythm.js';

const sameSet = (a, b) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

/**
 * 渲染一道题。
 * ctx.record({ ok, firstTry, hinted }) 记录作答；ctx.next() 进入下一题。
 * opts.hints: [文字提示1, 文字提示2]，可选第 3 层「听这个音」由 q.audioAnswer 提供。
 */
export function renderQuestion(q, ctx, opts = {}) {
  const root = h('section', { class: 'q', 'data-qid': q.id, 'data-type': q.type });
  let attempts = 0;
  let hinted = false;
  let finished = false;

  root.append(h('div', { class: 'q-head' }, mino('think', 54), h('h2', { class: 'q-prompt' }, q.prompt)));

  // 素材区：五线谱 / 键盘 / 指板 / 声音
  const media = h('div', { class: 'q-media' });
  if (q.staff) media.append(staffView(q.staff));
  if (q.keyboard) media.append(keyboard({ highlight: q.keyboard.highlight }));
  const soundRow = h('div', { class: 'q-sound' });
  if (q.play) soundRow.append(h('button', { class: 'btn ghost small', type: 'button', onclick: () => playList(q.play) }, '▶ 听一听'));
  if (q.autoplay) {
    soundRow.append(h('button', { class: 'btn ghost small', type: 'button', 'data-autoplay': '', onclick: () => playList(q.autoplay) }, '▶ 再听一次'));
    setTimeout(() => { if (root.isConnected && audio.ready) playList(q.autoplay); }, 350);
  }
  if ((q.play || q.autoplay) && !audio.ready) soundRow.append(soundGate());
  if (soundRow.children.length) media.append(soundRow);
  if (media.children.length) root.append(media);

  // 节奏题：独立组件
  if (q.type === 'tap') {
    root.append(rhythmGame(q, {
      // 第一次敲击计入掌握度；之后的重试只写入节奏记录，避免刷高正确率
      onResult: (r, runs) => { ctx.record({ ok: r.score >= 0.6, firstTry: runs === 1, hinted: false, rhythm: r, retry: runs > 1 }); },
      onNext: () => ctx.next(),
    }));
    return root;
  }

  const answerArea = h('div', { class: 'q-answer' });
  root.append(answerArea);
  const feedback = h('div', { class: 'q-feedback', 'aria-live': 'polite' });
  const checkBtn = h('button', { class: 'btn primary', type: 'button', disabled: true }, '检查答案');
  const actions = h('div', { class: 'q-actions' });

  // 分层提示
  const hints = q.noHints ? [] : (opts.hints || []).filter(Boolean);
  if (hints.length || (q.audioAnswer && !q.noHints && opts.hints)) {
    let level = 0;
    const hintBox = h('div', { class: 'q-hint', 'aria-live': 'polite' });
    const hintBtn = h('button', { class: 'btn ghost small', type: 'button' }, `💡 提示（${hints.length + (q.audioAnswer ? 1 : 0)} 层）`);
    hintBtn.addEventListener('click', () => {
      hinted = true;
      if (level < hints.length) hintBox.append(h('p', {}, `提示 ${level + 1}：${hints[level]}`));
      else if (q.audioAnswer) { playAudioAnswer(q); hintBox.append(h('p', {}, '最后一层：听一听这个音的实际音高。')); }
      level += 1;
      if (level >= hints.length + (q.audioAnswer ? 1 : 0)) hintBtn.disabled = true;
    });
    actions.append(hintBtn);
    root.append(hintBox);
  }
  actions.append(checkBtn);
  root.append(actions, feedback);

  let getValue = () => null;
  const setReady = (v) => { checkBtn.disabled = !v; };

  if (q.type === 'choice' || q.type === 'multi') {
    const multi = q.type === 'multi';
    let opts2 = q.shuffleOptions ? shuffle(q.options) : q.options;
    const sel = new Set();
    const list = h('div', { class: `options${q.optionStaves ? ' staves' : ''}${opts2.length > 4 && !q.optionStaves ? ' grid' : ''}`, role: multi ? 'group' : 'radiogroup' });
    opts2.forEach((o, i) => {
      const b = h('button', { class: 'opt', type: 'button', role: multi ? 'checkbox' : 'radio', 'aria-checked': 'false', 'data-value': o.value },
        q.optionStaves ? [h('span', { class: 'opt-tag' }, String.fromCharCode(65 + i)), staffView(o.staff, { compact: true, label: `选项 ${String.fromCharCode(65 + i)}` })] : o.label);
      b.addEventListener('click', () => {
        if (finished) return;
        if (multi) { sel.has(o.value) ? sel.delete(o.value) : sel.add(o.value); }
        else { sel.clear(); sel.add(o.value); }
        list.querySelectorAll('.opt').forEach((x) => x.setAttribute('aria-checked', String(sel.has(x.dataset.value))));
        setReady(sel.size > 0);
      });
      list.append(b);
    });
    if (multi) answerArea.append(h('p', { class: 'muted small' }, '可以选多个，选好后点「检查答案」。'));
    answerArea.append(list);
    getValue = () => (multi ? [...sel] : [...sel][0]);
    root._mark = (ok) => {
      list.querySelectorAll('.opt').forEach((x) => {
        const v = x.dataset.value;
        const right = multi ? q.answer.includes(v) : v === q.answer;
        if (ok || attempts >= 2 || finished) { if (right) x.classList.add('right'); }
        if (sel.has(v) && !right) x.classList.add('wrong');
      });
    };
    root._reset = () => { sel.clear(); setReady(false); list.querySelectorAll('.opt').forEach((x) => { x.classList.remove('wrong'); x.setAttribute('aria-checked', 'false'); }); };
  } else if (q.type === 'order') {
    const o = orderWidget(q.tiles, setReady);
    answerArea.append(o.el);
    getValue = o.value;
    root._mark = (ok) => o.mark(q.answer, ok);
    root._reset = () => o.reset();
  } else if (q.type === 'keyboard-scale') {
    let idx = 0, mistakes = 0;
    const progress = h('p', { class: 'scale-progress', 'aria-live': 'polite' }, '已点：');
    const kb = keyboard({
      onKey: (m) => {
        if (finished || idx >= q.answer.length) return;
        if (m === q.answer[idx]) {
          kb.mark(m, 'ok'); idx += 1;
          setText(progress, '已点：' + q.names.slice(0, idx).join(' – '));
          if (idx === q.answer.length) { setReady(true); checkBtn.click(); }
        } else {
          mistakes += 1;
          kb.mark(m, 'bad'); setTimeout(() => kb.clear('bad'), 500);
          feedback.replaceChildren(h('p', { class: 'soft' }, bilingual(`这个音不对。下一个音和 ${q.names[idx - 1] ?? '前一个音'} 应该相差${idx === 0 ? '……从 Ré 开始' : [2, 2, 1, 2, 2, 2, 1][idx - 1] === 1 ? '半音（紧挨着的键）' : '全音（中间隔一个键）'}。`,idx===0?'Commence par Ré.':`Depuis ${q.names[idx-1]}, avance de ${[2,2,1,2,2,2,1][idx-1]===1?'un demi-ton : une touche voisine':'un ton : deux demi-tons'}.`)));
        }
      },
    });
    answerArea.append(kb, progress);
    checkBtn.hidden = true;
    getValue = () => (mistakes === 0 ? 'clean' : 'mistakes');
    root._mark = () => {};
    root._reset = () => {};
    q = { ...q, _scaleOk: () => mistakes === 0 };
  }

  checkBtn.addEventListener('click', () => {
    if (finished) return;
    const v = getValue();
    let ok;
    if (q.type === 'multi') ok = sameSet(v, q.answer);
    else if (q.type === 'order') ok = v.join('|') === q.answer.join('|');
    else if (q.type === 'keyboard-scale') ok = true;
    else ok = v === q.answer;
    attempts += 1;
    const firstTry = attempts === 1 && (q.type !== 'keyboard-scale' || v === 'clean');
    root._mark(ok);
    if (ok) {
      finished = true;
      ctx.record({ ok: true, firstTry, hinted, followup: attempts > 1 });
      sparkle(checkBtn);
      showFeedback(true, firstTry);
    } else {
      if (attempts === 1) ctx.record({ ok: false, firstTry: true, hinted });
      showFeedback(false);
    }
  });

  function showFeedback(ok, firstTry) {
    feedback.replaceChildren();
    feedback.className = `q-feedback ${ok ? 'good' : 'retry'}`;
    const head = ok
      ? (firstTry ? pick(['答对了！', 'Bravo！', '完全正确！', 'Très bien !']) : '这次对了！记住这个规则，明天还会再见到它。')
      : '还差一点。先读一读下面的规则，再试一次。';
    feedback.append(mino(ok ? 'cheer' : 'calm', 44), h('div', {}, h('p', { class: 'fb-head' }, head), h('p', { class: 'fb-explain' }, q.explain)));
    if (q.board && (ok || attempts >= 2)) feedback.append(fingerboard({ pos: q.board.pos, reveal: q.board.reveal, interactive: true }));
    if (q.spacing && (ok || attempts >= 2)) feedback.append(spacingDiagram(q.spacing));
    if (q.audioAnswer && (ok || attempts >= 2)) feedback.append(h('button', { class: 'btn ghost small', type: 'button', onclick: () => playAudioAnswer(q) }, '▶ 听正确的音'));
    const row = h('div', { class: 'q-actions' });
    if (ok) {
      row.append(h('button', { class: 'btn primary', type: 'button', onclick: () => ctx.next(), autofocus: true }, '继续'));
    } else {
      row.append(h('button', { class: 'btn primary', type: 'button', onclick: () => { feedback.replaceChildren(); feedback.className = 'q-feedback'; root._reset(); } }, '再试一次'));
      if (attempts >= 2) {
        row.append(h('button', { class: 'btn ghost', type: 'button', onclick: () => { finished = true; root._mark(false); ctx.next(); } }, '看过答案，继续'));
        root._mark(false);
      }
    }
    feedback.append(row);
    checkBtn.disabled = true;
    row.querySelector('button')?.focus({ preventScroll: true });
    feedback.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  return root;
}

function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function playList(list) {
  if (!audio.ready) return;
  if (list.length === 1) playNoteStr(list[0], 1.0);
  else playSeq(list, 72);
}
function playAudioAnswer(q) {
  const ns = q.audioAnswer.notes.map((n) => (typeof n === 'string' ? n : noteToString(n)));
  playList(ns);
}

/** 声音未开启时的内联按钮（iOS 必须由点击触发） */
export function soundGate() {
  const b = h('button', { class: 'btn sound-gate small', type: 'button' }, '🔈 先开启声音');
  b.addEventListener('click', async () => {
    const ok = await audio.unlock();
    setText(b, ok ? '🔊 声音已开启' : '无法开启声音，请检查静音开关');
    if (ok) setTimeout(() => b.remove(), 900);
  });
  return b;
}

/** 排序组件：点按放入/取回；也支持拖动（指针事件，触屏可用）和键盘（Tab + Enter） */
function orderWidget(tiles, setReady) {
  const pool = shuffle(tiles);
  // 避免正好是正确顺序
  if (pool.join() === tiles.join() && tiles.length > 1) pool.push(pool.shift());
  const answer = [];
  const ansRow = h('ol', { class: 'order-answer', 'aria-label': '你的排列' });
  const poolRow = h('div', { class: 'order-pool', 'aria-label': '待选' });
  const el = h('div', { class: 'order' }, h('p', { class: 'muted small' }, '按顺序点选（或拖到上方），点上方的块可以取回。'), ansRow, poolRow);

  function draw() {
    ansRow.replaceChildren(...answer.map((t, i) => tileEl(t, 'ans', i)));
    for (let i = answer.length; i < tiles.length; i++) ansRow.append(h('li', { class: 'slot-empty', 'aria-hidden': 'true' }, String(i + 1)));
    poolRow.replaceChildren(...pool.filter((t) => t != null).map((t) => tileEl(t, 'pool')));
    setReady(answer.length === tiles.length);
  }
  function tileEl(t, where, i) {
    const b = h(where === 'ans' ? 'li' : 'button', { class: 'tile', type: where === 'ans' ? null : 'button', tabindex: '0', 'data-tile': t }, t);
    const act = () => {
      if (el.classList.contains('locked')) return;
      if (where === 'pool') { pool[pool.indexOf(t)] = null; answer.push(t); }
      else { answer.splice(i, 1); pool[pool.indexOf(null)] = t; }
      draw();
    };
    b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
    // 指针：短按 = 点选；拖动 = 放到答案行指定位置
    b.addEventListener('pointerdown', (e) => {
      if (el.classList.contains('locked')) return;
      const sx = e.clientX, sy = e.clientY;
      let ghost = null;
      const move = (ev) => {
        if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8) {
          ghost = b.cloneNode(true); ghost.classList.add('ghost-tile'); document.body.append(ghost);
          b.classList.add('dragging');
        }
        if (ghost) { ghost.style.left = `${ev.clientX}px`; ghost.style.top = `${ev.clientY}px`; }
      };
      const up = (ev) => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        if (!ghost) { act(); return; }
        ghost.remove(); b.classList.remove('dragging');
        const target = document.elementFromPoint(ev.clientX, ev.clientY);
        const overAns = target?.closest('.order-answer');
        if (overAns) {
          const li = target.closest('.tile');
          const at = li ? [...ansRow.children].indexOf(li) : answer.length;
          if (where === 'pool') { pool[pool.indexOf(t)] = null; answer.splice(at, 0, t); }
          else { answer.splice(i, 1); answer.splice(Math.min(at, answer.length), 0, t); }
          draw();
        } else if (where === 'ans' && target?.closest('.order-pool')) act();
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
    return b;
  }
  draw();
  return {
    el,
    value: () => answer.slice(),
    mark(right, ok) {
      [...ansRow.querySelectorAll('.tile')].forEach((li, i) => li.classList.add(li.dataset.tile === right[i] ? 'right' : 'wrong'));
      if (ok) el.classList.add('locked');
    },
    reset() {
      el.classList.remove('locked');
      answer.splice(0).forEach((t) => { pool[pool.indexOf(null)] = t; });
      draw();
    },
  };
}
