import type { BibWork, DataSource, SavedAnalysis, SavedAnalysisRecord } from "@/types/bibliometric";

const DB_NAME = "bibanalyze";
const STORE_NAME = "analyses";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveAnalysis(
  meta: {
    id?: string;
    name: string;
    source: DataSource;
    fileName?: string;
    searchParams?: Record<string, unknown>;
  },
  works: BibWork[],
): Promise<SavedAnalysis> {
  const db = await openDB();
  const now = new Date().toISOString();
  const record: SavedAnalysisRecord = {
    id: meta.id ?? crypto.randomUUID(),
    name: meta.name,
    source: meta.source,
    fileName: meta.fileName,
    searchParams: meta.searchParams,
    worksCount: works.length,
    createdAt: meta.id ? ((await loadAnalysis(meta.id))?.createdAt ?? now) : now,
    updatedAt: now,
    works,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => {
      const { works: _, ...saved } = record;
      resolve(saved);
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadAnalysis(id: string): Promise<SavedAnalysisRecord | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function listAnalyses(): Promise<SavedAnalysis[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).index("createdAt").openCursor(null, "prev");
    const results: SavedAnalysis[] = [];
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        const { works: _, ...meta } = cursor.value as SavedAnalysisRecord;
        results.push(meta);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteAnalysis(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function renameAnalysis(id: string, name: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => {
      if (!req.result) { reject(new Error("Not found")); return; }
      const record = req.result as SavedAnalysisRecord;
      record.name = name;
      record.updatedAt = new Date().toISOString();
      store.put(record);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
