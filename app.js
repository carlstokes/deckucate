import './vendor/compact/ui.js';
import { parseDeckCsv, guessLanguage, shuffledIndices } from './deck.js';
import { listDecks, saveDeck, deleteDeck } from './storage.js';


const $ = id => document.getElementById(id);
const views = ['home', 'setup', 'session', 'full', 'complete'];
const languages = [
  ['off', 'Off'], ['en-GB', 'English (UK)'], ['en-US', 'English (US)'],
  ['es-ES', 'Spanish (Spain)'], ['es-MX', 'Spanish (Mexico)'],
  ['fr-FR', 'French'], ['de-DE', 'German'], ['it-IT', 'Italian']
];
const state = { decks: [], deck: null, direction: 0, sessionSpeed: 1, order: [], position: 0, flipped: false, filePurpose: 'add' };
let statusTimer;
let updateRegistration;
let pendingUpdate;

function showStatus(message) {
  $('status').textContent = message;
  $('status').hidden = false;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => $('status').hidden = true, 4800);
}
function showView(view) {
  for (const name of views) $(`${name}-view`).hidden = name !== view;
  $('update-banner').hidden = !pendingUpdate || !['home', 'complete'].includes(view);
  window.scrollTo({ top: 0, behavior: 'instant' });
  if (view === 'session') requestAnimationFrame(fitCardText);
}
function offerUpdate(worker) {
  if (!navigator.serviceWorker.controller) return;
  pendingUpdate = worker;
  $('update-banner').hidden = $('home-view').hidden && $('complete-view').hidden;
}
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  let hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) { hadController = true; return; }
    if (!reloading) { reloading = true; location.reload(); }
  });
  try {
    const registration = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
    updateRegistration = registration;
    if (registration.waiting) offerUpdate(registration.waiting);
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed') offerUpdate(registration.waiting || worker);
      });
    });
    const check = () => registration.update().catch(() => {});
    check();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  } catch { /* The cached app remains usable offline. */ }
}
function textElement(tag, className, content) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  el.textContent = content;
  return el;
}
function cardCount(n) { return `${n} ${n === 1 ? 'card' : 'cards'}`; }
function directionLabel(deck, direction) {
  return `${deck.headers[direction].label} → ${deck.headers[1 - direction].label}`;
}
function deckMark() {
  const mark = document.createElement('span');
  mark.className = 'deck-mark';
  mark.setAttribute('aria-hidden', 'true');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('icon');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', '#i-stack');
  svg.append(use);
  mark.append(svg);
  return mark;
}
function deckButton(deck) {
  const row = document.createElement('div');
  row.className = 'home-deck';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'home-deck-open';
  button.setAttribute('aria-label', `Revise ${deck.name}, ${cardCount(deck.cards.length)}, ${directionLabel(deck, deck.direction ?? 0)}`);
  button.append(deckMark());
  const labels = document.createElement('span');
  labels.className = 'home-deck-text';
  labels.append(textElement('strong', '', deck.name), textElement('small', '', `${cardCount(deck.cards.length)} · ${directionLabel(deck, deck.direction ?? 0)}`));
  button.append(labels);
  button.addEventListener('click', () => chooseDeck(deck.id));
  const settings = document.createElement('button');
  settings.type = 'button';
  settings.className = 'home-deck-settings';
  settings.setAttribute('aria-label', `Settings for ${deck.name}`);
  settings.title = `Settings for ${deck.name}`;
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.classList.add('icon');
  icon.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', '#i-settings');
  icon.append(use);
  settings.append(icon);
  settings.addEventListener('click', () => chooseDeck(deck.id, true));
  row.append(button, settings);
  return row;
}
function renderDecks() {
  $('home-deck-list').replaceChildren(...state.decks.map(deckButton));
  const hasDecks = state.decks.length > 0;
  $('home-decks').hidden = !hasDecks;
  $('empty-hint').hidden = hasDecks;
  $('home-view').classList.toggle('has-decks', hasDecks);
  $('home-eyebrow').textContent = hasDecks ? 'Your decks' : 'Ready when you are';
  $('home-title').textContent = hasDecks ? 'Choose a deck.' : 'Start revising.';
  $('home-description').textContent = hasDecks ? 'Start a revision session with the cards in random order.' : 'Choose a CSV to create a deck. Revise its cards in random order, with speech when it helps.';
}
function langOptions(select, value) {
  select.replaceChildren(...languages.map(([code, label]) => {
    const option = document.createElement('wa-option');
    option.value = code;
    option.textContent = label;
    return option;
  }));
  // A recognised code outside the short list should still travel with the CSV.
  if (value && !languages.some(([code]) => code.toLowerCase() === value.toLowerCase())) {
    const option = document.createElement('wa-option');
    option.value = value;
    option.textContent = value;
    select.append(option);
  }
  select.value = value || 'off';
}
function updateSetupSummary() {
  $('setup-summary').textContent = `${cardCount(state.deck.cards.length)} · From ${state.deck.filename} · ${state.deck.savedOnDevice === false ? 'Not saved on this device' : 'Saved on this device'}`;
}
function chooseDeck(id, showSettings = false) {
  stopSpeech();
  state.deck = state.decks.find(d => d.id === id);
  if (!state.deck) return;
  state.direction = state.deck.direction ?? 0;
  $('setup-title').textContent = state.deck.name;
  updateSetupSummary();
  for (const button of document.querySelectorAll('.direction-option')) {
    const side = Number(button.dataset.side);
    button.textContent = directionLabel(state.deck, side);
    button.classList.toggle('selected', side === state.direction);
    button.setAttribute('aria-pressed', String(side === state.direction));
  }
  for (let i = 0; i < 2; i++) {
    $(`lang-label-${i}`).textContent = `${state.deck.headers[i].label} side`;
    langOptions($(`lang-${i}`), state.deck.languages[i]);
  }
  state.deck.speed = Number(state.deck.speed) < 1 ? 0.5 : Number(state.deck.speed) > 1 ? 1.5 : 1;
  updateSpeedButtons();
  renderDecks();
  if (showSettings) showView('setup');
  else startSession(-1, false);
}
async function persistPreferences() {
  if (!state.deck) return;
  state.deck.direction = state.direction;
  state.deck.languages = [$('lang-0').value, $('lang-1').value];
  state.deck.speed = Number(state.deck.speed) || 1;
  const wasSaved = state.deck.savedOnDevice;
  state.deck.savedOnDevice = true;
  try { await saveDeck(state.deck); updateSetupSummary(); }
  catch { state.deck.savedOnDevice = wasSaved; showStatus('These preferences could not be saved on this device.'); }
}
function startSession(previousLast = -1, saveSettings = true) {
  if (!state.deck) return;
  stopSpeech();
  if (saveSettings) persistPreferences();
  state.sessionSpeed = state.deck.speed;
  state.order = shuffledIndices(state.deck.cards.length, previousLast);
  state.position = 0;
  state.flipped = false;
  $('session-title').textContent = state.deck.name;
  $('session-direction').textContent = directionLabel(state.deck, state.direction);
  $('progress-track').setAttribute('aria-valuemax', String(state.order.length));
  renderCard();
  showView('session');
}
function visibleSide() { return state.flipped ? 1 - state.direction : state.direction; }
function fitCardText() {
  const text = $('card-text');
  if ($('session-view').hidden || !$('flashcard').clientHeight) return;
  text.style.fontSize = '';
  const base = parseFloat(getComputedStyle(text).fontSize);
  const overflows = () => text.scrollHeight > text.clientHeight + 1 || text.scrollWidth > text.clientWidth + 1;
  if (overflows()) {
    for (let size = Math.floor(base) - 1; size >= 17 && overflows(); size--) text.style.fontSize = `${size}px`;
  }
  $('read-full').hidden = !overflows();
}
function renderCard() {
  const card = state.deck.cards[state.order[state.position]];
  const side = visibleSide();
  $('card-side').textContent = state.deck.headers[side].label;
  $('card-text').textContent = card[side];
  $('card-text').classList.toggle('long', card[side].length > 85);
  $('card-hint').textContent = `Tap for ${state.deck.headers[1 - side].label}`;
  $('session-progress-text').textContent = `${state.position + 1} / ${state.order.length}`;
  $('progress-fill').style.width = `${(state.position + 1) / state.order.length * 100}%`;
  $('progress-track').setAttribute('aria-valuenow', String(state.position + 1));
  $('flashcard').setAttribute('aria-label', `Show ${state.deck.headers[1 - side].label} side`);
  $('session-speed').textContent = `Voice speed: ${speedLabel(state.sessionSpeed)}`;
  $('speak-button').disabled = state.deck.languages[side] === 'off' || !('speechSynthesis' in window);
  $('previous-button').disabled = state.position === 0;
  $('read-full').hidden = true;
  if (!$('session-view').hidden) requestAnimationFrame(fitCardText);
}
function speedLabel(speed) { return Number(speed) < 1 ? 'Slow' : Number(speed) > 1 ? 'Fast' : 'Normal'; }
function updateSpeedButtons() {
  for (const button of document.querySelectorAll('[data-rate]')) {
    const selected = Number(button.dataset.rate) === Number(state.deck?.speed);
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  }
}
function previewSpeed() {
  if (!state.deck || !('speechSynthesis' in window)) return;
  const side = state.direction;
  const lang = state.deck.languages[side];
  if (!lang || lang === 'off') return;
  stopSpeech();
  const utterance = new SpeechSynthesisUtterance(state.deck.cards[0][side]);
  utterance.lang = lang;
  utterance.rate = state.deck.speed;
  speechSynthesis.speak(utterance);
}
function stopSpeech() { if ('speechSynthesis' in window) speechSynthesis.cancel(); }
function nextCard() {
  stopSpeech();
  if (state.position + 1 >= state.order.length) {
    $('complete-title').textContent = state.deck.name;
    $('complete-copy').textContent = `You reviewed all ${cardCount(state.order.length)}.`;
    showView('complete');
    return;
  }
  state.position++;
  state.flipped = false;
  renderCard();
}
function previousCard() {
  if (state.position === 0) return;
  stopSpeech();
  state.position--;
  state.flipped = false;
  renderCard();
}
function speak() {
  if (!('speechSynthesis' in window)) return;
  const side = visibleSide();
  const lang = state.deck.languages[side];
  if (!lang || lang === 'off') return;
  stopSpeech();
  const utterance = new SpeechSynthesisUtterance(state.deck.cards[state.order[state.position]][side]);
  utterance.lang = lang;
  utterance.rate = state.sessionSpeed;
  speechSynthesis.speak(utterance);
}
function openFile(purpose = 'add') {
  state.filePurpose = purpose;
  $('file-input').value = '';
  $('file-input').click();
}
async function fileChosen(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!/\.csv$/i.test(file.name)) { showStatus('Please select a .csv file.'); return; }
  try {
    const parsed = parseDeckCsv(await file.text(), file.name);
    const id = file.name.toLocaleLowerCase();
    if (state.filePurpose === 'refresh' && id !== state.deck?.id) {
      showStatus(`Choose ${state.deck.filename} to refresh this deck. Add another file from the deck list.`);
      return;
    }
    const existing = state.decks.find(d => d.id === id);
    if (existing && state.filePurpose !== 'refresh' && !confirm(`Replace the saved deck “${existing.name}” with this file?`)) return;
    const deck = {
      ...parsed, id, loadedAt: Date.now(),
      languages: existing?.languages || parsed.headers.map(h => h.lang || guessLanguage(h.label)),
      direction: existing?.direction ?? 0, speed: existing?.speed || 1
    };
    let saved = true;
    try { await saveDeck(deck); } catch { saved = false; }
    deck.savedOnDevice = saved;
    state.decks = [deck, ...state.decks.filter(d => d.id !== id)];
    chooseDeck(id, true);
    const message = !saved ? 'Deck opened for this session, but could not be saved on this device.'
      : existing ? 'Deck refreshed from the selected CSV.' : `${cardCount(deck.cards.length)} ready to revise.`;
    showStatus(message);
  } catch (error) { showStatus(error.message || 'This CSV could not be opened.'); }
}
function applyTheme(choice) {
  const systemDark = matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = choice === 'dark' || (choice === 'system' && systemDark);
  document.documentElement.classList.toggle('wa-dark', dark);
  document.documentElement.classList.toggle('wa-light', !dark);
  document.querySelector('meta[name="theme-color"]').content = dark ? '#171721' : '#faf9fe';
  const current = dark ? 'Dark' : 'Light';
  const next = dark ? 'Light' : 'Dark';
  const source = choice === 'system' ? ' (device setting)' : '';
  $('theme-button').setAttribute('aria-label', `${current} appearance${source}. Switch to ${next}`);
  $('theme-button').title = `${current}${source} · switch to ${next}`;
  $('theme-sun').hidden = dark;
  $('theme-moon').hidden = !dark;
}
function wireEvents() {
  $('update-now').addEventListener('click', () => {
    const worker = updateRegistration?.waiting || pendingUpdate;
    if (!worker) return;
    $('update-now').disabled = true;
    $('update-now').textContent = 'Updating…';
    worker.postMessage({ type: 'SKIP_WAITING' });
  });
  $('home-add').addEventListener('click', () => openFile());
  $('add-csv').addEventListener('click', () => openFile());
  $('file-input').addEventListener('change', fileChosen);
  $('theme-button').addEventListener('click', () => {
    const next = document.documentElement.classList.contains('wa-dark') ? 'light' : 'dark';
    localStorage.setItem('deckucate-theme', next);
    applyTheme(next);
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if ((localStorage.getItem('deckucate-theme') || 'system') === 'system') applyTheme('system'); });
  $('setup-back').addEventListener('click', () => showView('home'));
  $('session-back').addEventListener('click', () => { stopSpeech(); showView('home'); });
  $('complete-back').addEventListener('click', () => showView('home'));
  $('refresh-deck').addEventListener('click', () => openFile('refresh'));
  $('remove-deck').addEventListener('click', async () => {
    if (!confirm(`Remove “${state.deck.name}” from this device? The original CSV will not be changed.`)) return;
    try { if (state.deck.savedOnDevice !== false) await deleteDeck(state.deck.id); }
    catch { showStatus('Could not remove this deck.'); return; }
    state.decks = state.decks.filter(d => d.id !== state.deck.id);
    state.deck = null; renderDecks(); showView('home');
  });
  for (const button of document.querySelectorAll('.direction-option')) button.addEventListener('click', () => {
    state.direction = Number(button.dataset.side);
    for (const item of document.querySelectorAll('.direction-option')) {
      const selected = item === button;
      item.classList.toggle('selected', selected);
      item.setAttribute('aria-pressed', String(selected));
    }
    state.deck.direction = state.direction;
    renderDecks();
    persistPreferences();
  });
  for (const id of ['lang-0', 'lang-1']) $(id).addEventListener('change', persistPreferences);
  for (const button of document.querySelectorAll('[data-rate]')) button.addEventListener('click', () => {
    state.deck.speed = Number(button.dataset.rate);
    updateSpeedButtons();
    persistPreferences();
    previewSpeed();
  });
  $('start-session').addEventListener('click', () => startSession());
  $('flashcard').addEventListener('click', () => { state.flipped = !state.flipped; stopSpeech(); renderCard(); });
  $('read-full').addEventListener('click', () => {
    stopSpeech();
    $('full-side').textContent = state.deck.headers[visibleSide()].label;
    $('full-text').textContent = state.deck.cards[state.order[state.position]][visibleSide()];
    showView('full');
  });
  $('full-back').addEventListener('click', () => showView('session'));
  $('previous-button').addEventListener('click', previousCard);
  $('next-button').addEventListener('click', nextCard);
  $('speak-button').addEventListener('click', speak);
  $('reshuffle').addEventListener('click', () => startSession(state.order.at(-1), false));
  $('review-last').addEventListener('click', () => { state.flipped = false; renderCard(); showView('session'); });
  $('session-speed').addEventListener('click', () => {
    state.sessionSpeed = state.sessionSpeed === 1 ? 0.5 : state.sessionSpeed === 0.5 ? 1.5 : 1;
    renderCard(); speak();
  });
  let startX = null, startY = null;
  $('flashcard').addEventListener('touchstart', e => { startX = e.changedTouches[0].clientX; startY = e.changedTouches[0].clientY; }, { passive: true });
  $('flashcard').addEventListener('touchend', e => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      e.preventDefault();
      if (dx < 0) previousCard(); else nextCard();
    }
    startX = startY = null;
  }, { passive: false });
  document.addEventListener('keydown', e => {
    if (!$('full-view').hidden && e.key === 'Escape') { e.preventDefault(); showView('session'); return; }
    if ($('session-view').hidden || e.target.closest('wa-select')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); nextCard(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); previousCard(); }
  });
  window.addEventListener('resize', () => { if (!$('session-view').hidden) requestAnimationFrame(fitCardText); });
}
async function init() {
  const theme = localStorage.getItem('deckucate-theme') || 'system';
  applyTheme(theme);
  wireEvents();
  if (!('speechSynthesis' in window)) $('speak-button').disabled = true;
  try { state.decks = (await listDecks()).sort((a, b) => b.loadedAt - a.loadedAt); }
  catch { showStatus('Decks cannot be saved on this device right now. You can still choose a CSV to revise.'); }
  renderDecks(); showView('home');
  registerServiceWorker();
}
init();
