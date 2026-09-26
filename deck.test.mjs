import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDeckCsv, shuffledIndices } from './deck.js';

test('keeps paired values, commas, quotes, newlines and language headings', () => {
  const deck = parseDeckCsv('\uFEFFSpanish [es-ES],English [en-GB]\r\n"¿Dónde, exactamente?","Where, exactly?"\r\n"He said ""hola""","He said ""hello"""\r\n"two\nlines","two\nlines"', 'Spanish_revision.csv');
  assert.equal(deck.name, 'Spanish revision');
  assert.deepEqual(deck.headers, [{ label: 'Spanish', lang: 'es-ES' }, { label: 'English', lang: 'en-GB' }]);
  assert.deepEqual(deck.cards[0], ['¿Dónde, exactamente?', 'Where, exactly?']);
  assert.deepEqual(deck.cards[1], ['He said "hola"', 'He said "hello"']);
  assert.deepEqual(deck.cards[2], ['two\nlines', 'two\nlines']);
});

test('rejects missing answers and extra columns', () => {
  assert.throws(() => parseDeckCsv('Question,Answer\nWhy?,', 'bad.csv'), /empty side/);
  assert.throws(() => parseDeckCsv('Question,Answer\nOne,Two,Three', 'bad.csv'), /exactly two/);
});

test('shuffled stack shows each card once and avoids immediate repeat on reshuffle', () => {
  const first = shuffledIndices(12, -1, () => 0.4);
  const second = shuffledIndices(12, first.at(-1), () => 0.4);
  assert.deepEqual([...first].sort((a,b)=>a-b), Array.from({length:12}, (_,i)=>i));
  assert.notEqual(second[0], first.at(-1));
});
