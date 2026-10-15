import JSZip from 'jszip';
import {
  getAllBooks,
  getBook,
  getBookFile,
  getAllJournalEntries,
  getReaderSettings,
  saveBook,
  saveJournalEntry,
  saveReaderSettings,
  updateBookProgress,
  updateBookDetails,
} from './db';
import type { Book, SyncManifest } from '../types';

export interface ImportReport {
  success: boolean;
  booksImported: number;
  booksUpdated: number;
  journalEntriesImported: number;
  errors: string[];
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

// Export Entire Library as ZIP
export async function exportLibraryArchive(
  onProgress?: (progress: number, label: string) => void
): Promise<{ blob: Blob; filename: string }> {
  onProgress?.(5, 'Gathering library contents...');

  const books = await getAllBooks();
  const journal = await getAllJournalEntries();
  const settings = await getReaderSettings();

  const zip = new JSZip();

  // Separate covers into clean manifest map
  const covers: Record<string, string> = {};
  const manifestBooks: Omit<Book, 'coverUrl'>[] = [];

  for (const book of books) {
    const { coverUrl, ...rest } = book;
    if (coverUrl) {
      covers[book.id] = coverUrl;
    }
    manifestBooks.push(rest);
  }

  const manifest: SyncManifest = {
    app: 'enzo',
    version: 1,
    exportedAt: new Date().toISOString(),
    books: manifestBooks,
    covers,
    journal,
    settings,
  };

  zip.file('enzo-manifest.json', JSON.stringify(manifest, null, 2));

  // Add individual book files
  const booksFolder = zip.folder('books');
  let processed = 0;

  for (const book of books) {
    processed++;
    const percent = 10 + Math.round((processed / Math.max(1, books.length)) * 60);
    onProgress?.(percent, `Packaging "${book.title}" (${processed}/${books.length})...`);

    const fileRecord = await getBookFile(book.id);
    if (fileRecord && booksFolder) {
      const fileName = `${book.id}.${book.format}`;
      booksFolder.file(fileName, fileRecord.data);
    }
  }

  onProgress?.(80, 'Compressing archive...');

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      const p = 80 + Math.round(metadata.percent * 0.2);
      onProgress?.(p, `Finalizing zip archive (${metadata.percent.toFixed(0)}%)...`);
    }
  );

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `enzo-library-${dateStr}.zip`;

  onProgress?.(100, 'Export complete!');
  return { blob: zipBlob, filename };
}

// Validate archive before importing
export async function inspectLibraryArchive(zipBlob: Blob): Promise<{
  valid: boolean;
  manifest?: SyncManifest;
  error?: string;
  bookCount: number;
  journalCount: number;
}> {
  try {
    const zip = await JSZip.loadAsync(zipBlob);
    const manifestFile = zip.file('enzo-manifest.json');

    if (!manifestFile) {
      return {
        valid: false,
        error: 'Not a valid enzo library backup. "enzo-manifest.json" was not found in the archive.',
        bookCount: 0,
        journalCount: 0,
      };
    }

    const manifestText = await manifestFile.async('text');
    const manifest = JSON.parse(manifestText) as SyncManifest;

    if (manifest.app !== 'enzo') {
      return {
        valid: false,
        error: 'Archive was not created by enzo reader.',
        bookCount: 0,
        journalCount: 0,
      };
    }

    return {
      valid: true,
      manifest,
      bookCount: manifest.books?.length || 0,
      journalCount: manifest.journal?.length || 0,
    };
  } catch (err: any) {
    return {
      valid: false,
      error: `Could not read archive: ${err.message || 'File may be corrupted.'}`,
      bookCount: 0,
      journalCount: 0,
    };
  }
}

// Import Library from ZIP
export async function importLibraryArchive(
  zipBlob: Blob,
  onProgress?: (progress: number, label: string) => void
): Promise<ImportReport> {
  const report: ImportReport = {
    success: false,
    booksImported: 0,
    booksUpdated: 0,
    journalEntriesImported: 0,
    errors: [],
  };

  try {
    onProgress?.(10, 'Inspecting backup archive...');
    const zip = await JSZip.loadAsync(zipBlob);
    const manifestFile = zip.file('enzo-manifest.json');

    if (!manifestFile) {
      throw new Error('Archive does not contain enzo-manifest.json');
    }

    const manifestText = await manifestFile.async('text');
    const manifest = JSON.parse(manifestText) as SyncManifest;

    // Restore reader settings if present
    if (manifest.settings) {
      await saveReaderSettings(manifest.settings);
    }

    const existingBooks = await getAllBooks();
    const existingBookMap = new Map<string, Book>(existingBooks.map((b) => [b.id, b]));

    const booksFolder = zip.folder('books');
    const manifestBooks = manifest.books || [];
    let processed = 0;

    for (const b of manifestBooks) {
      processed++;
      const percent = 20 + Math.round((processed / Math.max(1, manifestBooks.length)) * 60);
      onProgress?.(percent, `Restoring "${b.title}" (${processed}/${manifestBooks.length})...`);

      const coverUrl = manifest.covers?.[b.id];
      const fullBook: Book = {
        ...b,
        coverUrl,
      };

      const existing = existingBookMap.get(b.id);

      if (existing) {
        // Book already exists: update progress, notes, and rating if newer
        if (b.lastRead > existing.lastRead) {
          await updateBookProgress(b.id, b.progress, b.currentLocation);
          await updateBookDetails(b.id, {
            rating: b.rating ?? existing.rating,
            personalNotes: b.personalNotes ?? existing.personalNotes,
          });
        }
        report.booksUpdated++;
      } else {
        // Find file in zip
        const candidateNames = [
          `${b.id}.${b.format}`,
          `${b.id}`,
          `books/${b.id}.${b.format}`,
        ];

        let fileInZip: JSZip.JSZipObject | null = null;
        for (const name of candidateNames) {
          const f = zip.file(name) || (booksFolder ? booksFolder.file(`${b.id}.${b.format}`) : null);
          if (f) {
            fileInZip = f;
            break;
          }
        }

        if (fileInZip) {
          const fileData = await fileInZip.async('blob');
          const fileName = `${b.title}.${b.format}`;
          await saveBook(fullBook, fileData, fileName);
          report.booksImported++;
        } else {
          report.errors.push(`Book file for "${b.title}" could not be located in the archive.`);
        }
      }
    }

    // Restore Journal entries
    if (manifest.journal && manifest.journal.length > 0) {
      onProgress?.(85, 'Restoring reading journal...');
      const existingJournal = await getAllJournalEntries();
      const existingJournalIds = new Set(existingJournal.map((j) => j.id));

      for (const entry of manifest.journal) {
        if (!existingJournalIds.has(entry.id)) {
          await saveJournalEntry(entry);
          report.journalEntriesImported++;
        }
      }
    }

    onProgress?.(100, 'Library restored successfully!');
    report.success = true;
    return report;
  } catch (err: any) {
    report.success = false;
    report.errors.push(err.message || 'Failed to restore library.');
    return report;
  }
}

// Export single book
export async function exportSingleBook(bookId: string): Promise<boolean> {
  const book = await getBook(bookId);
  const fileRecord = await getBookFile(bookId);

  if (!book || !fileRecord) {
    throw new Error('Book not found in local library');
  }

  // Clean filename: "Title - Author.ext"
  const safeTitle = book.title.replace(/[\\/:*?"<>|]/g, '').trim() || 'Book';
  const safeAuthor = book.author.replace(/[\\/:*?"<>|]/g, '').trim() || 'Author';
  const filename = `${safeTitle} — ${safeAuthor}.${book.format}`;

  downloadBlob(fileRecord.data, filename);
  return true;
}
