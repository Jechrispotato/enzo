export type BookFormat = 'epub' | 'pdf' | 'txt' | 'md';

export interface TocItem {
  id?: string;
  title: string;
  href: string;
  subitems?: TocItem[];
}

export interface ReadingLocation {
  chapterIndex?: number;
  chapterHref?: string;
  chapterTitle?: string;
  pageNumber?: number; // for PDF (1-based)
  totalPages?: number; // for PDF
  scrollPercent?: number; // 0 to 100
  cfi?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  format: BookFormat;
  coverUrl?: string; // base64 data URL or extracted image
  description?: string;
  language?: string;
  dateAdded: number; // timestamp
  lastRead: number; // timestamp
  fileSize: number; // bytes
  progress: number; // 0 to 100
  currentLocation?: ReadingLocation;
  toc?: TocItem[];
  totalPages?: number;
  rating?: number; // 1 to 5
  personalNotes?: string;
  isSample?: boolean;
}

export interface BookFileData {
  id: string;
  data: Blob;
  fileName: string;
  mimeType: string;
}

export type JournalEntryType = 'quote' | 'note' | 'highlight';

export interface JournalEntry {
  id: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  type: JournalEntryType;
  text: string;
  annotation?: string;
  chapterTitle?: string;
  pageNumber?: number;
  createdAt: number;
  tags?: string[];
}

export type ReaderTheme = 'paper' | 'white' | 'sepia' | 'dark';
export type ReaderFontFamily = 'newsreader' | 'garamond' | 'sans' | 'dyslexic';
export type ReaderTextAlign = 'left' | 'justify';
export type ReaderColumnWidth = 'narrow' | 'medium' | 'wide' | 'full';
export type ReaderPageMargins = 'compact' | 'normal' | 'generous';

export interface ReaderSettings {
  theme: ReaderTheme;
  fontFamily: ReaderFontFamily;
  fontSize: number; // 14 to 28
  lineSpacing: number; // 1.4 to 2.2
  textAlign: ReaderTextAlign;
  columnWidth: ReaderColumnWidth;
  pageMargins: ReaderPageMargins;
}

export interface StorageStats {
  usageMB: number;
  quotaMB: number;
  percentUsed: number;
  isPersistent: boolean;
  bookCount: number;
}

export interface SyncManifest {
  app: 'enzo';
  version: 1;
  exportedAt: string;
  deviceInfo?: string;
  books: Omit<Book, 'coverUrl'>[];
  covers: Record<string, string>; // bookId -> base64 coverUrl
  journal: JournalEntry[];
  settings: ReaderSettings;
}

export type LibraryViewMode = 'grid' | 'list' | 'shelves';
export type SortOption = 'recent' | 'title' | 'author' | 'progress' | 'dateAdded';
export type FilterOption = 'all' | 'reading' | 'completed' | 'epub' | 'pdf' | 'txt';
