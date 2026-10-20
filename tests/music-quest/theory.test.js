import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SHARP_ORDER, FLAT_ORDER, FR_NAME, parseNote, midi, frequency, frenchName, keySignatureAlters,
  keySignatureSteps, actualAlter, majorScale, halfStepPairs, stepKind, pitchDirection, measureBeats,
  onsetsInBeats, noteToString, KEYS,
} from '../../music-theory/js/theory.js';

test('升号顺序 Fa–Do–Sol–Ré–La–Mi–Si', () => {
  assert.deepEqual(SHARP_ORDER.map((s) => FR_NAME[s]), ['Fa', 'Do', 'Sol', 'Ré', 'La', 'Mi', 'Si']);
});
test('降号顺序 Si–Mi–La–Ré–Sol–Do–Fa，且为升号倒序', () => {
  assert.deepEqual(FLAT_ORDER.map((s) => FR_NAME[s]), ['Si', 'Mi', 'La', 'Ré', 'Sol', 'Do', 'Fa']);
  assert.deepEqual(FLAT_ORDER, SHARP_ORDER.slice().reverse());
});
test('相邻升号相差纯五度（7 个半音，取模）', () => {
  for (let i = 0; i < 6; i++) {
    const d = (midi(SHARP_ORDER[i + 1] + '4') - midi(SHARP_ORDER[i] + '4') + 12) % 12;
    assert.equal(d, 7);
  }
});
test('MIDI 与频率：A4=69=440Hz，C4=60，空弦', () => {
  assert.equal(midi('A4'), 69);
  assert.equal(midi('C4'), 60);
  assert.equal(midi('G3'), 55);
  assert.equal(midi('D4'), 62);
  assert.equal(midi('E5'), 76);
  assert.equal(frequency(69), 440);
  assert.ok(Math.abs(frequency(55) - 196) < 0.01);
  assert.ok(Math.abs(frequency(76) - 659.255) < 0.01);
  assert.equal(midi('F#4'), 66);
  assert.equal(midi('Bb4'), 70);
  assert.equal(midi('B#3'), 60);
});
test('法语音名拼写', () => {
  assert.equal(frenchName('F#4'), 'Fa♯');
  assert.equal(frenchName('Bb3'), 'Si♭');
  assert.equal(frenchName('D5', { withOctave: true }), 'Ré4', '法国八度习惯');
  assert.equal(frenchName('A4', { withOctave: true }), 'La3');
  assert.equal(frenchName('C4', { withOctave: true }), 'Do3');
  assert.equal(noteToString(parseNote('C#5')), 'C#5');
});
test('调号映射', () => {
  assert.deepEqual(keySignatureAlters(2), { F: 1, C: 1 });
  assert.deepEqual(keySignatureAlters(-2), { B: -1, E: -1 });
  assert.deepEqual(keySignatureSteps(3), ['F', 'C', 'G']);
  assert.deepEqual(keySignatureSteps(0), []);
  assert.throws(() => keySignatureAlters(8));
});
test('调号对应的大调：每个 KEYS 条目的大调音阶恰好使用该调号', () => {
  for (const k of KEYS) {
    const tonic = k.major[0];
    const alter = k.major.length > 1 ? -1 : 0;
    const sc = majorScale(tonic, 4, alter);
    const altered = sc.slice(0, 7).filter((n) => n.alter !== 0).map((n) => n.step).sort();
    assert.deepEqual(altered, keySignatureSteps(k.count).slice().sort(), k.fr);
    sc.slice(0, 7).forEach((n) => { if (n.alter) assert.equal(n.alter, Math.sign(k.count)); });
  }
});
test('D 大调：Ré–Mi–Fa♯–Sol–La–Si–Do♯–Ré，半音在 Fa♯–Sol、Do♯–Ré', () => {
  const d = majorScale('D', 4);
  assert.deepEqual(d.map((n) => frenchName(n)), ['Ré', 'Mi', 'Fa♯', 'Sol', 'La', 'Si', 'Do♯', 'Ré']);
  assert.deepEqual(halfStepPairs(d), [[2, 3], [6, 7]]);
});
test('全音半音判断', () => {
  assert.equal(stepKind('E4', 'F4'), 'demi-ton');
  assert.equal(stepKind('B4', 'C5'), 'demi-ton');
  assert.equal(stepKind('C4', 'D4'), 'ton');
  assert.equal(stepKind('F#4', 'G4'), 'demi-ton');
  assert.equal(stepKind('C4', 'E4'), null);
});
test('临时记号规则：同小节同谱位、小节线复位、调号所有八度', () => {
  const N = (step, octave, acc, measure) => ({ step, octave, acc, measure });
  const m = [N('F', 4, 'n', 1), N('G', 4, null, 1), N('F', 4, null, 1), N('F', 4, null, 2), N('F', 5, null, 2)];
  assert.equal(actualAlter(m, 0, 2), 0);
  assert.equal(actualAlter(m, 2, 2), 0, '同小节内还原号持续');
  assert.equal(actualAlter(m, 3, 2), 1, '过小节线恢复调号');
  assert.equal(actualAlter(m, 4, 2), 1, '调号对其他八度也有效');
  const oct = [N('F', 5, 'n', 1), N('F', 4, null, 1)];
  assert.equal(actualAlter(oct, 1, 1), 1, '临时记号不影响其他八度');
  const flat = [N('B', 4, null, 1), N('B', 4, 'n', 1), N('B', 4, null, 1)];
  assert.equal(actualAlter(flat, 0, -2), -1);
  assert.equal(actualAlter(flat, 2, -2), 0);
  const sharp = [N('C', 5, '#', 1), N('C', 5, null, 1)];
  assert.equal(actualAlter(sharp, 1, 0), 1);
});
test('音高方向', () => {
  assert.equal(pitchDirection('D4', 'A4'), 'higher');
  assert.equal(pitchDirection('A4', 'D4'), 'lower');
  assert.equal(pitchDirection('E5', 'E5'), 'same');
});
test('节奏起点', () => {
  assert.deepEqual(onsetsInBeats(['h', 'q', 'q']), { onsets: [0, 2, 3], total: 4 });
  assert.deepEqual(onsetsInBeats(['q', '8', '8', 'q', 'q']).onsets, [0, 1, 1.5, 2, 3]);
  assert.equal(measureBeats([{ dur: 'h', measure: 1 }, { dur: 'h', measure: 1 }]).get(1), 4);
});
