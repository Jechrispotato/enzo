import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Book, JournalEntry, ReaderSettings, StorageStats } from '../types';

interface EnzoDBSchema extends DBSchema {
  books: {
    key: string;
    value: Book;
    indexes: {
      'by-last-read': number;
      'by-date-added': number;
    };
  };
  files: {
    key: string;
    value: {
      id: string;
      data: Blob;
      fileName: string;
      mimeType: string;
      size: number;
    };
  };
  journal: {
    key: string;
    value: JournalEntry;
    indexes: {
      'by-book': string;
      'by-created': number;
    };
  };
  settings: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'enzo-library-v1';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<EnzoDBSchema>> | null = null;

export function getDB(): Promise<IDBPDatabase<EnzoDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<EnzoDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Books metadata store
        if (!db.objectStoreNames.contains('books')) {
          const bookStore = db.createObjectStore('books', { keyPath: 'id' });
          bookStore.createIndex('by-last-read', 'lastRead');
          bookStore.createIndex('by-date-added', 'dateAdded');
        }

        // Binary files store (Blobs are stored natively in IndexedDB)
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'id' });
        }

        // Journal & highlights store
        if (!db.objectStoreNames.contains('journal')) {
          const journalStore = db.createObjectStore('journal', { keyPath: 'id' });
          journalStore.createIndex('by-book', 'bookId');
          journalStore.createIndex('by-created', 'createdAt');
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      },
    });
  }
  return dbPromise;
}

// Default Reader Settings
export const DEFAULT_SETTINGS: ReaderSettings = {
  theme: 'paper',
  fontFamily: 'newsreader',
  fontSize: 18,
  lineSpacing: 1.7,
  textAlign: 'left',
  columnWidth: 'medium',
  pageMargins: 'normal',
};

// Book Operations
export async function saveBook(book: Book, fileBlob: Blob, fileName: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['books', 'files'], 'readwrite');
  
  await tx.objectStore('books').put(book);
  await tx.objectStore('files').put({
    id: book.id,
    data: fileBlob,
    fileName,
    mimeType: fileBlob.type || 'application/octet-stream',
    size: fileBlob.size,
  });
  
  await tx.done;
}

export async function getAllBooks(): Promise<Book[]> {
  const db = await getDB();
  const books = await db.getAll('books');
  return books.sort((a, b) => b.lastRead - a.lastRead);
}

export async function getBook(id: string): Promise<Book | undefined> {
  const db = await getDB();
  return db.get('books', id);
}

export async function getBookFile(id: string): Promise<{ data: Blob; fileName: string; mimeType: string } | undefined> {
  const db = await getDB();
  return db.get('files', id);
}

export async function updateBookProgress(
  id: string,
  progress: number,
  location?: Book['currentLocation']
): Promise<void> {
  const db = await getDB();
  const book = await db.get('books', id);
  if (!book) return;

  book.progress = Math.min(100, Math.max(0, Math.round(progress)));
  book.lastRead = Date.now();
  if (location) {
    book.currentLocation = {
      ...book.currentLocation,
      ...location,
    };
  }
  await db.put('books', book);
}

export async function updateBookDetails(id: string, updates: Partial<Book>): Promise<void> {
  const db = await getDB();
  const book = await db.get('books', id);
  if (!book) return;

  const updatedBook = { ...book, ...updates };
  await db.put('books', updatedBook);
}

export async function deleteBook(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['books', 'files', 'journal'], 'readwrite');
  
  await tx.objectStore('books').delete(id);
  await tx.objectStore('files').delete(id);
  
  // Optionally clean up journal entries for this book
  const journalIndex = tx.objectStore('journal').index('by-book');
  let cursor = await journalIndex.openCursor(IDBKeyRange.only(id));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }

  await tx.done;
}

// Journal Operations
export async function saveJournalEntry(entry: JournalEntry): Promise<void> {
  const db = await getDB();
  await db.put('journal', entry);
}

export async function deleteJournalEntry(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('journal', id);
}

export async function getAllJournalEntries(): Promise<JournalEntry[]> {
  const db = await getDB();
  const entries = await db.getAll('journal');
  return entries.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getJournalEntriesForBook(bookId: string): Promise<JournalEntry[]> {
  const db = await getDB();
  const entries = await db.getAllFromIndex('journal', 'by-book', bookId);
  return entries.sort((a, b) => b.createdAt - a.createdAt);
}

// Settings Operations
export async function getReaderSettings(): Promise<ReaderSettings> {
  try {
    const db = await getDB();
    const saved = await db.get('settings', 'reader');
    if (saved) return { ...DEFAULT_SETTINGS, ...saved };
  } catch (e) {
    console.warn('Failed to get settings from DB, falling back to defaults', e);
  }
  return DEFAULT_SETTINGS;
}

export async function saveReaderSettings(settings: ReaderSettings): Promise<void> {
  const db = await getDB();
  await db.put('settings', settings, 'reader');
}

// Storage Statistics and Persistence
export async function getStorageStats(): Promise<StorageStats> {
  let usageMB = 0;
  let quotaMB = 0;
  let percentUsed = 0;
  let isPersistent = false;

  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      usageMB = Math.round((usage / (1024 * 1024)) * 10) / 10;
      quotaMB = Math.round((quota / (1024 * 1024)) * 10) / 10;
      percentUsed = quota > 0 ? Math.min(100, Math.round((usage / quota) * 100)) : 0;
    } catch (e) {
      console.warn('Storage estimate error', e);
    }
  }

  if (navigator.storage && navigator.storage.persisted) {
    try {
      isPersistent = await navigator.storage.persisted();
    } catch (e) {
      console.warn('Persistent storage check error', e);
    }
  }

  const db = await getDB();
  const bookCount = await db.count('books');

  return {
    usageMB,
    quotaMB,
    percentUsed,
    isPersistent,
    bookCount,
  };
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    try {
      return await navigator.storage.persist();
    } catch (e) {
      console.warn('Could not request persistent storage', e);
      return false;
    }
  }
  return false;
}

export async function clearEntireLibrary(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['books', 'files', 'journal'], 'readwrite');
  await tx.objectStore('books').clear();
  await tx.objectStore('files').clear();
  await tx.objectStore('journal').clear();
  await tx.done;
}
