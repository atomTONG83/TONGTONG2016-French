import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STRINGS, placements, slotsOn, notesForFinger, fingerSpacing, midiAt } from '../../music-theory/js/violin.js';
import { midi } from '../../music-theory/js/theory.js';

test('四根空弦 Sol3 Ré4 La4 Mi5，相邻纯五度', () => {
  assert.deepEqual(STRINGS.map((s) => s.open), ['G3', 'D4', 'A4', 'E5']);
  for (let i = 0; i < 3; i++) assert.equal(midi(STRINGS[i + 1].open) - midi(STRINGS[i].open), 7);
});
test('第一把位 La 弦：Si=1、Do=低2、Do♯=高2、Ré=3、Mi=4', () => {
  const f = (n) => placements(n, 'first').find((p) => p.string === 'A');
  assert.equal(f('B4').finger, 1);
  assert.equal(f('C5').finger, 2); assert.equal(f('C5').label, '低2指');
  assert.equal(f('C#5').finger, 2); assert.equal(f('C#5').label, '高2指');
  assert.equal(f('D5').finger, 3);
  assert.equal(f('E5').finger, 4);
  assert.equal(f('Bb4').label, '低1指');
});
test('第一把位 Ré 弦：Mi=1、Fa=低2、Fa♯=高2、Sol=3、La=4', () => {
  const f = (n) => placements(n, 'first').find((p) => p.string === 'D').finger;
  assert.deepEqual(['E4', 'F4', 'F#4', 'G4', 'A4'].map(f), [1, 2, 2, 3, 4]);
});
test('第一把位 Sol 弦与 Mi 弦', () => {
  const g = (n) => placements(n, 'first').find((p) => p.string === 'G').finger;
  assert.deepEqual(['A3', 'B3', 'C4', 'D4'].map(g), [1, 2, 3, 4]);
  const e = (n) => placements(n, 'first').find((p) => p.string === 'E').finger;
  assert.deepEqual(['F#5', 'G5', 'G#5', 'A5', 'B5'].map(e), [1, 2, 2, 3, 4]);
});
test('第三把位：1 指在空弦上方纯四度', () => {
  assert.equal(placements('D5', 'third').find((p) => p.string === 'A').finger, 1);
  assert.equal(placements('C4', 'third').find((p) => p.string === 'G').finger, 1);
  assert.equal(placements('G4', 'third').find((p) => p.string === 'D').finger, 1);
  assert.equal(placements('A5', 'third').find((p) => p.string === 'E').finger, 1);
  const a = (n) => placements(n, 'third').find((p) => p.string === 'A').finger;
  assert.deepEqual(['D5', 'E5', 'F5', 'F#5', 'G5'].map(a), [1, 2, 3, 3, 4]);
});
test('同一个音的多种拉法：La4 = La 弦空弦 或 Ré 弦 4 指', () => {
  const p = placements('A4', 'first').map((x) => `${x.string}${x.finger}`).sort();
  assert.deepEqual(p, ['A0', 'D4']);
  assert.deepEqual(placements('D5', 'first').map((x) => `${x.string}${x.finger}`), ['A3']);
});
test('2 指不能单独确定音名：第一把位 2 指对应 8 个不同音', () => {
  const s = notesForFinger(2, 'first');
  assert.equal(new Set(s.map((x) => x.midi)).size, 8);
});
test('手指靠拢：La 弦第一把位 D 大调 Do♯–Ré 靠拢；Do 大调 Si–Do 靠拢', () => {
  assert.equal(fingerSpacing('C#5', 'D5', 'A', 'first').kind, 'close');
  assert.equal(fingerSpacing('B4', 'C#5', 'A', 'first').kind, 'apart');
  assert.equal(fingerSpacing('B4', 'C5', 'A', 'first').kind, 'close');
  assert.equal(fingerSpacing('F#5', 'G5', 'E', 'first').kind, 'close');
});
test('音位表内所有 midiAt 与 placements 互逆', () => {
  for (const s of STRINGS) for (const pos of ['first', 'third']) for (const slot of slotsOn(s.id, pos)) {
    assert.equal(slot.midi, midiAt(s.id, slot.semis));
  }
});
