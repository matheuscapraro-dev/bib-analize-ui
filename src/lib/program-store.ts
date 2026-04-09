/**
 * IndexedDB-based storage for program comparison data.
 * Replaces sessionStorage to avoid the ~5 MB quota limit
 * when large datasets are fetched (many authors × many works).
 */

const DB_NAME = "bibanalyze";
const STORE_NAME = "program_data";
const DB_VERSION = 2; // bump from v1 used by saved-analyses-db
const KEY = "current";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      // Keep the existing analyses store if present
      if (!db.objectStoreNames.contains("analyses")) {
        const s = db.createObjectStore("analyses", { keyPath: "id" });
        s.createIndex("createdAt", "createdAt", { unique: false });
      }
      // Create the new program_data store
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveProgramData(data: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(data, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadProgramData(): Promise<any | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(KEY);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function clearProgramData(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
