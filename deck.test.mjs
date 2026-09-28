import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDeckCsv, shuffledIndices, importDates, sortDecks } from './deck.js';

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

const deck = (id, name, loadedAt, extra = {}) => ({ id, name, loadedAt, ...extra });
const ids = decks => decks.map(item => item.id);

test('older saved decks remain valid and unused decks follow recently used decks', () => {
  const saved = [
    deck('old.csv', 'Old', 100),
    deck('new.csv', 'New', 300),
    deck('used.csv', 'Used', 50, { lastUsedAt: 400 })
  ];
  assert.deepEqual(ids(sortDecks(saved, 'used')), ['used.csv', 'new.csv', 'old.csv']);
  assert.deepEqual(ids(sortDecks(saved, 'added')), ['new.csv', 'old.csv', 'used.csv']);
  assert.equal(saved[0].addedAt, undefined);
});

test('refreshing a deck preserves its added and last used dates', () => {
  const existing = deck('spanish.csv', 'Spanish', 100, { addedAt: 80, lastUsedAt: 250 });
  assert.deepEqual(importDates(existing, 500), { addedAt: 80, lastUsedAt: 250 });
  assert.deepEqual(importDates(deck('legacy.csv', 'Legacy', 100), 500), { addedAt: 100 });
  assert.deepEqual(importDates(undefined, 500), { addedAt: 500 });
});

test('both name orders ignore case and do not change the original deck array', () => {
  const saved = [deck('z.csv', 'Zebra', 2), deck('a.csv', 'apple', 1)];
  assert.deepEqual(ids(sortDecks(saved, 'name-asc')), ['a.csv', 'z.csv']);
  assert.deepEqual(ids(sortDecks(saved, 'name-desc')), ['z.csv', 'a.csv']);
  assert.deepEqual(ids(saved), ['z.csv', 'a.csv']);
});
