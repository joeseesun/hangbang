import type { ICanvasElement, ITierRow } from '@/data/templates';

export interface PersistedCanvasData {
  title: string;
  rows: ITierRow[];
  elements: ICanvasElement[];
  templateId: string;
}

const STORAGE_KEY = '__app_tierlist_data';
const LEGACY_STORAGE_KEY = 'tierlist_canvas_v3';
const DB_NAME = 'hang-tierlist';
const DB_VERSION = 1;
const STORE_NAME = 'canvas';
const CURRENT_KEY = 'current';
const LOCAL_MIRROR_LIMIT = 3_500_000;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('无法打开本地数据库'));
  });
}

async function readIndexedDb(): Promise<PersistedCanvasData | null> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(CURRENT_KEY);
    request.onsuccess = () => resolve((request.result as PersistedCanvasData | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error('无法读取本地数据'));
    transaction.oncomplete = () => database.close();
  });
}

async function writeIndexedDb(data: PersistedCanvasData): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(data, CURRENT_KEY);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error('无法保存到本地数据库'));
    };
  });
}

function parseStoredData(raw: string | null): PersistedCanvasData | null {
  if (!raw) return null;
  const parsed = JSON.parse(raw) as Partial<PersistedCanvasData> & { storage?: string };
  if (parsed.storage === 'indexedDB') return null;
  if (!Array.isArray(parsed.rows) || !Array.isArray(parsed.elements)) return null;
  return parsed as PersistedCanvasData;
}

export async function loadCanvasData(): Promise<PersistedCanvasData | null> {
  try {
    const indexed = await readIndexedDb();
    if (indexed) return indexed;
  } catch {
    // Safari 隐私模式等环境可能禁用 IndexedDB，继续读 localStorage 兜底。
  }

  return (
    parseStoredData(window.localStorage.getItem(STORAGE_KEY)) ??
    parseStoredData(window.localStorage.getItem(LEGACY_STORAGE_KEY))
  );
}

export async function saveCanvasData(data: PersistedCanvasData): Promise<void> {
  const serialized = JSON.stringify(data);

  try {
    await writeIndexedDb(data);
    window.localStorage.setItem(
      STORAGE_KEY,
      serialized.length <= LOCAL_MIRROR_LIMIT
        ? serialized
        : JSON.stringify({ version: 4, storage: 'indexedDB', updatedAt: Date.now() })
    );
    return;
  } catch {
    // IndexedDB 不可用时保留原有 localStorage 行为，由上层展示配额错误。
  }

  window.localStorage.setItem(STORAGE_KEY, serialized);
}
