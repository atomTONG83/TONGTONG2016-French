// 极简 DOM 工具（无框架，沿用站点原有的原生 JS 写法）
import {bilingual, accessible} from '../i18n.js';
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, ['aria-label','title'].includes(k) ? accessible(String(v)) : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : bilingual(String(kid)));
  }
  return el;
}
export const $ = (sel, root = document) => root.querySelector(sel);

export function svgEl(tag, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

export const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

let toastTimer;
export function toast(msg) {
  let t = document.getElementById('mq-toast');
  if (!t) { t = h('div', { id: 'mq-toast', role: 'status', 'aria-live': 'polite' }); document.body.append(t); }
  t.replaceChildren(bilingual(msg));
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

/** 答对时的星光音符小动画（尊重 reduced-motion） */
export function sparkle(anchor) {
  if (prefersReducedMotion() || !anchor) return;
  const r = anchor.getBoundingClientRect();
  const glyphs = ['♪', '✦', '♫', '✧', '♩'];
  for (let i = 0; i < 7; i++) {
    const s = h('span', { class: 'spark', 'aria-hidden': 'true' }, glyphs[i % glyphs.length]);
    const ang = (Math.PI * 2 * i) / 7;
    s.style.left = `${r.left + r.width / 2}px`;
    s.style.top = `${r.top + r.height / 2}px`;
    s.style.setProperty('--dx', `${Math.cos(ang) * 70}px`);
    s.style.setProperty('--dy', `${Math.sin(ang) * 50 - 30}px`);
    document.body.append(s);
    setTimeout(() => s.remove(), 900);
  }
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
