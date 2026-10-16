import { parseEpubFile } from './parsers/epubParser';
import { parsePdfMetadata } from './parsers/pdfParser';
import { parseTxtFile } from './parsers/txtParser';
import { saveBook, getAllBooks } from './db';
import type { Book, BookFormat } from '../types';

export interface ImportResult {
  success: boolean;
  book?: Book;
  error?: string;
  isDuplicate?: boolean;
}

export async function importBookFile(
  file: File | { blob: Blob; name: string; coverOverride?: string }
): Promise<ImportResult> {
  const fileName = 'name' in file ? file.name : 'Unknown';
  const fileBlob = 'blob' in file ? file.blob : file;
  const coverOverride = 'coverOverride' in file ? file.coverOverride : undefined;
  const ext = fileName.split('.').pop()?.toLowerCase();

  let format: BookFormat;
  if (ext === 'epub') {
    format = 'epub';
  } else if (ext === 'pdf') {
    format = 'pdf';
  } else if (ext === 'txt') {
    format = 'txt';
  } else if (ext === 'md') {
    format = 'md';
  } else {
    return {
      success: false,
      error: `Unsupported file format ".${ext}". Please choose an EPUB (.epub), PDF (.pdf), or Text (.txt, .md) file.`,
    };
  }

  try {
    const bookId = 'book_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    let title = fileName.replace(/\.[^/.]+$/, '');
    let author = 'Unknown Author';
    let coverUrl: string | undefined;
    let description: string | undefined;
    let language: string | undefined;
    let totalPages: number | undefined;
    let toc: Book['toc'] = undefined;

    if (format === 'epub') {
      const parsed = await parseEpubFile(fileBlob);
      title = parsed.metadata.title || title;
      author = parsed.metadata.author || author;
      description = parsed.metadata.description;
      language = parsed.metadata.language;
      coverUrl = parsed.metadata.coverUrl;
      toc = parsed.toc;
      parsed.cleanup();
    } else if (format === 'pdf') {
      const parsed = await parsePdfMetadata(fileBlob, title);
      title = parsed.title;
      author = parsed.author;
      totalPages = parsed.numPages;
      coverUrl = parsed.coverUrl;
    } else if (format === 'txt' || format === 'md') {
      const parsed = await parseTxtFile(fileBlob, title);
      title = parsed.title;
      author = parsed.author;
      toc = parsed.sections.map((s, idx) => ({
        id: `sec_${idx}`,
        title: s.title,
        href: `sec_${idx}`,
      }));
    }

    if (coverOverride) {
      coverUrl = coverOverride;
    }

    // Check for duplicates
    const existingBooks = await getAllBooks();
    const isDuplicate = existingBooks.some(
      (b) => b.title.trim().toLowerCase() === title.trim().toLowerCase() && 
             b.author.trim().toLowerCase() === author.trim().toLowerCase()
    );

    if (isDuplicate) {
      return {
        success: false,
        isDuplicate: true,
        error: `A book titled "${title}" by ${author} already exists in your library.`,
      };
    }

    const newBook: Book = {
      id: bookId,
      title,
      author,
      format,
      coverUrl,
      description,
      language,
      dateAdded: Date.now(),
      lastRead: Date.now(),
      fileSize: fileBlob.size,
      progress: 0,
      totalPages,
      toc,
      currentLocation: format === 'pdf' ? { pageNumber: 1, totalPages } : { chapterIndex: 0, scrollPercent: 0 },
    };

    await saveBook(newBook, fileBlob, fileName);

    return {
      success: true,
      book: newBook,
    };
  } catch (err: any) {
    console.error('Failed to import file', err);
    return {
      success: false,
      error: `Could not parse "${fileName}": ${err.message || 'File may be corrupted or encrypted.'}`,
    };
  }
}
