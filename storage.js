const DB_NAME = 'deckucate-decks';
const STORE = 'decks';
const VERSION = 1;
let database;

function openDb() {
  if (database) return database;
  database = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return database;
}

async function transaction(mode, operation) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = operation(tx.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.onerror = () => reject(tx.error);
  });
}
export const listDecks = () => transaction('readonly', store => store.getAll());
export const getDeck = id => transaction('readonly', store => store.get(id));
export const saveDeck = deck => transaction('readwrite', store => store.put(deck));
export const deleteDeck = id => transaction('readwrite', store => store.delete(id));
