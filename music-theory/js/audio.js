// Music Quest · Web Audio 音频引擎（无第三方依赖）
// iOS Safari：AudioContext 必须在用户手势（点击）里创建或 resume，
// 因此界面上有显式的「开启声音」按钮；播放失败时返回 false，由界面提示。

import { frequency } from './theory.js';

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.listeners = new Set();
    this.sources = new Set();
    this.timers = new Set();
  }
  get supported() {
    return typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext);
  }
  get ready() {
    return !!this.ctx && this.ctx.state === 'running';
  }
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit() { this.listeners.forEach((fn) => fn(this)); }

  /** 必须在点击事件中调用。返回 Promise<boolean> */
  async unlock() {
    if (!this.supported) return false;
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.8;
        this.master.connect(this.ctx.destination);
        this.ctx.onstatechange = () => this.emit();
        // iOS 旧版本：播放一个静音缓冲以真正解锁
        const buf = this.ctx.createBuffer(1, 1, 22050);
        const src = this.ctx.createBufferSource();
        src.buffer = buf; src.connect(this.ctx.destination); src.start(0);
      }
      if (this.ctx.state !== 'running') await this.ctx.resume();
    } catch {
      return false;
    }
    this.emit();
    return this.ready;
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.02);
    this.emit();
  }

  now() { return this.ctx ? this.ctx.currentTime : 0; }

  track(source) { this.sources.add(source);source.addEventListener('ended',()=>this.sources.delete(source),{once:true}); }
  stop() {
    this.sources.forEach(s=>{try{s.stop();}catch{}});this.sources.clear();
    this.timers.forEach(clearTimeout);this.timers.clear();
  }

  /** 类弦乐音色：锯齿波 + 三角波，经低通滤波，带起音和释音（不加揉弦，保证音高清晰） */
  note(midiNum, { at = null, dur = 0.7, vel = 0.32 } = {}) {
    if (!this.ready || this.muted) return false;
    const ctx = this.ctx;
    const t0 = at ?? ctx.currentTime + 0.02;
    const f = frequency(midiNum);
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = Math.min(4200, f * 6);
    lp.Q.value = 0.7;
    const o1 = ctx.createOscillator();
    o1.type = 'sawtooth'; o1.frequency.value = f;
    const o2 = ctx.createOscillator();
    o2.type = 'triangle'; o2.frequency.value = f;
    const g2 = ctx.createGain(); g2.gain.value = 0.6;
    o1.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(this.master);
    const a = 0.04, r = 0.12;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vel, t0 + a);
    g.gain.setValueAtTime(vel, t0 + Math.max(a, dur - r));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    this.track(o1);this.track(o2);
    o1.start(t0); o2.start(t0);
    o1.stop(t0 + dur + 0.05); o2.stop(t0 + dur + 0.05);
    return true;
  }

  /** 依次播放 [{ midi, beats }]，bpm 为四分音符速度；返回总时长（秒） */
  sequence(items, { bpm = 72, gap = 0.04, onNote = null } = {}) {
    if (!this.ready || this.muted) return 0;
    const spb = 60 / bpm;
    let t = this.ctx.currentTime + 0.08;
    const start = t;
    items.forEach((it, i) => {
      const dur = it.beats * spb;
      if (it.midi != null) this.note(it.midi, { at: t, dur: Math.max(0.12, dur - gap) });
      if (onNote) {
        const delay = (t - this.ctx.currentTime) * 1000;
        const timer=setTimeout(() => {this.timers.delete(timer);onNote(i);}, Math.max(0, delay));this.timers.add(timer);
      }
      t += dur;
    });
    return t - start;
  }

  /** 节拍器滴答声（重拍更高） */
  click(at, accent = false) {
    if (!this.ready) return false;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.value = accent ? 1760 : 1175;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(this.muted ? 0.0001 : 0.25, at + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
    o.connect(g); g.connect(this.master ?? ctx.destination);
    this.track(o);o.start(at); o.stop(at + 0.06);
    return true;
  }
}

export const audio = new AudioEngine();
