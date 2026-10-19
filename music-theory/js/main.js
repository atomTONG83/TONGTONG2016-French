// Music Quest 入口：哈希路由（#/、#/map、#/lesson/:id、#/review、#/tasks、#/parent）
// 使用哈希路由，静态托管（GitHub Pages / Worker 静态资源）都不需要额外的深链接重写规则。
import { h, $ } from './ui/dom.js';
import { createStore } from './store.js';
import { audio } from './audio.js';
import { primarySkill } from './content/index.js';
import { hallPage, mapPage, lessonPage, reviewPage, tasksPage, parentPage, notFound, VIOLIN_URL, HOME_URL } from './ui/pages.js';

const store = createStore(safeStorage());
store.setItemSkillResolver(primarySkill);
audio.muted = !!store.state.settings.muted;

function safeStorage() {
  try { const k = '__mq_test__'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return localStorage; }
  catch { return null; }
}

const app = $('#app');
const soundBtn = $('#sound-toggle');

function updateSoundBtn() {
  const on = audio.ready && !audio.muted;
  soundBtn.textContent = audio.muted ? '🔇 已静音' : on ? '🔊 声音开' : '🔈 开启声音';
  soundBtn.setAttribute('aria-pressed', String(on));
}
soundBtn.addEventListener('click', async () => {
  if (!audio.ready) {
    const ok = await audio.unlock();
    if (!ok) { soundBtn.textContent = '⚠ 无法开启声音'; return; }
    if (audio.muted) { audio.setMuted(false); store.setSetting('muted', false); }
  } else {
    audio.setMuted(!audio.muted);
    store.setSetting('muted', audio.muted);
  }
  updateSoundBtn();
});
audio.onChange(updateSoundBtn);
// 从后台回来时，iOS 可能把 AudioContext 挂起：下一次点击时自动恢复
document.addEventListener('pointerdown', () => { if (audio.ctx && audio.ctx.state !== 'running') audio.unlock(); }, { capture: true });

// 从小提琴页面进入时保留来源，返回链接更醒目
const fromViolin = new URLSearchParams(location.search).get('from') === 'violin';
if (fromViolin) $('#back-violin')?.classList.add('emph');

function route() {
  app.querySelectorAll('.rhythm').forEach((r) => r._cleanup?.());
  const hash = location.hash.replace(/^#/, '') || '/';
  const parts = hash.split('/').filter(Boolean);
  let view;
  try {
    if (!parts.length) view = hallPage(store);
    else if (parts[0] === 'map') view = mapPage(store);
    else if (parts[0] === 'lesson' && parts[1]) view = lessonPage(store, decodeURIComponent(parts[1]));
    else if (parts[0] === 'review') view = reviewPage(store);
    else if (parts[0] === 'tasks') view = tasksPage(store);
    else if (parts[0] === 'parent') view = parentPage(store);
    else view = notFound();
  } catch (e) {
    console.error(e);
    view = h('div', { class: 'page empty' }, h('h1', {}, '页面出错了'), h('p', {}, '请刷新页面重试。学习记录不会因此丢失。'), h('a', { class: 'btn primary', href: '#/' }, '回到冒险大厅'));
  }
  app.replaceChildren(view);
  document.querySelectorAll('.topnav a').forEach((a) => a.toggleAttribute('aria-current', a.getAttribute('href') === `#/${parts[0] ?? ''}` || (a.getAttribute('href') === '#/' && !parts.length)));
  const h1 = app.querySelector('h1, h2');
  if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
updateSoundBtn();
if (!store.persistent) console.warn('Music Quest: 存储不可用，记录不会保存');
route();

export { store, VIOLIN_URL, HOME_URL };
