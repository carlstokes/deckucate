/** Parse a two-column CSV deck. Quoted commas, quotes, and newlines are supported. */
export function parseDeckCsv(text, filename = 'Untitled deck.csv') {
  const source = String(text).replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], field = '', quoted = false, afterQuote = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') { quoted = false; afterQuote = true; }
      else field += ch;
    } else if (afterQuote) {
      if (ch === ',') { row.push(field); field = ''; afterQuote = false; }
      else if (ch === '\n' || ch === '\r') {
        row.push(field); rows.push(row); row = []; field = ''; afterQuote = false;
        if (ch === '\r' && source[i + 1] === '\n') i++;
      } else if (ch !== ' ' && ch !== '\t') throw new Error('Unexpected text after a closing quote in the CSV.');
    } else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      row.push(field); rows.push(row); row = []; field = '';
      if (ch === '\r' && source[i + 1] === '\n') i++;
    } else if (ch === '"' && field.trim() === '') { field = ''; quoted = true; }
    else if (ch === '"') throw new Error('A quote inside a value must be doubled ("").');
    else field += ch;
  }
  if (quoted) throw new Error('A quoted value is not closed.');
  if (field !== '' || row.length || afterQuote) { row.push(field); rows.push(row); }
  const filled = rows.filter(r => r.some(v => v.trim() !== ''));
  if (filled.length < 2) throw new Error('The CSV needs two column headings and at least one card.');
  if (filled[0].length !== 2) throw new Error('The first row must have exactly two column headings.');
  const headers = filled[0].map(readHeading);
  if (headers.some(h => !h.label)) throw new Error('Both sides need a column heading.');
  const cards = filled.slice(1).map((r, i) => {
    if (r.length !== 2) throw new Error(`Card ${i + 1} must have exactly two columns.`);
    const sides = r.map(v => v.trim());
    if (sides.some(v => !v)) throw new Error(`Card ${i + 1} has an empty side.`);
    return sides;
  });
  const name = filename.replace(/\.csv$/i, '').replace(/[-_]+/g, ' ').trim() || 'Untitled deck';
  return { name, filename, headers, cards };
}

function readHeading(value) {
  const match = value.trim().match(/^(.*?)\s*\[([a-z]{2,3}(?:-[a-z0-9]{2,8})*)\]\s*$/i);
  return match ? { label: match[1].trim(), lang: match[2] } : { label: value.trim(), lang: '' };
}

export function guessLanguage(label) {
  const name = label.toLowerCase();
  if (/spanish|español/.test(name)) return 'es-ES';
  if (/english/.test(name)) return 'en-GB';
  if (/french|français/.test(name)) return 'fr-FR';
  if (/german|deutsch/.test(name)) return 'de-DE';
  if (/italian|italiano/.test(name)) return 'it-IT';
  return 'en-GB';
}

export function shuffledIndices(count, previousFirst = -1, random = Math.random) {
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  if (count > 1 && order[0] === previousFirst) [order[0], order[1]] = [order[1], order[0]];
  return order;
}

// Older saved decks only have loadedAt. Treat that as their added date.
const addedAt = deck => deck.addedAt ?? deck.loadedAt ?? 0;
const byName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) || a.id.localeCompare(b.id);

export function importDates(existing, now) {
  return {
    addedAt: existing ? addedAt(existing) || now : now,
    ...(existing?.lastUsedAt ? { lastUsedAt: existing.lastUsedAt } : {})
  };
}

export function sortDecks(decks, order) {
  return [...decks].sort((a, b) => {
    if (order === 'name-asc') return byName(a, b);
    if (order === 'name-desc') return byName(b, a);
    if (order === 'used') {
      const used = (b.lastUsedAt || 0) - (a.lastUsedAt || 0);
      if (used) return used;
    }
    return addedAt(b) - addedAt(a) || byName(a, b);
  });
}
