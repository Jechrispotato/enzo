import { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { LibraryView } from './components/Views/LibraryView';
import { JournalView } from './components/Views/JournalView';
import { SyncView } from './components/Views/SyncView';
import { SettingsView } from './components/Views/SettingsView';
import { BookDetailModal } from './components/BookDetailModal';
import { ImportModal } from './components/ImportModal';
import { ReaderView } from './components/Reader/ReaderView';
import { getAllBooks, getAllJournalEntries, getReaderSettings } from './services/db';
import { ensureSampleLibrary } from './services/sampleBook';
import type { Book, JournalEntry, FilterOption } from './types';
import './App.css';

export function App() {
  const [currentView, setCurrentView] = useState<'library' | 'journal' | 'sync' | 'settings'>('library');
  const [books, setBooks] = useState<Book[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  
  // Library Display & Filters
  const [viewMode, setViewMode] = useState<'carousel' | 'grid'>('carousel');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Reader
  const [selectedDetailBook, setSelectedDetailBook] = useState<Book | null>(null);
  const [activeReaderBook, setActiveReaderBook] = useState<Book | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAppFading, setIsAppFading] = useState(false);

  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Load books, journal, and reader theme from IndexedDB
  const refreshLibrary = useCallback(async () => {
    try {
      let loadedBooks = await getAllBooks();
      // If brand new or empty, automatically load the 3 sample books from the screenshots
      if (loadedBooks.length === 0) {
        loadedBooks = await ensureSampleLibrary();
      }
      const loadedJournal = await getAllJournalEntries();
      setBooks(loadedBooks);
      setJournalEntries(loadedJournal);
    } catch (e) {
      console.error('Error loading library from IndexedDB', e);
    }
  }, []);

  useEffect(() => {
    refreshLibrary();

    // Load initial theme
    getReaderSettings().then((settings) => {
      document.documentElement.setAttribute('data-theme', settings.theme);
    });

    // PWA beforeinstallprompt handler
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [refreshLibrary]);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // Subtle fade in / fade out transition when book is clicked
  const handleOpenReader = (book: Book) => {
    setIsAppFading(true);
    setTimeout(() => {
      setSelectedDetailBook(null);
      setActiveReaderBook(book);
      setTimeout(() => {
        setIsAppFading(false);
      }, 50);
    }, 220);
  };

  const handleBackToLibrary = () => {
    setIsAppFading(true);
    setTimeout(() => {
      setActiveReaderBook(null);
      refreshLibrary();
      setTimeout(() => {
        setIsAppFading(false);
      }, 50);
    }, 220);
  };

  const handleBookAdded = (book: Book) => {
    setBooks((prev) => [book, ...prev.filter((b) => b.id !== book.id)]);
  };

  const handleBookDeleted = (bookId: string) => {
    setBooks((prev) => prev.filter((b) => b.id !== bookId));
    if (selectedDetailBook?.id === bookId) {
      setSelectedDetailBook(null);
    }
  };

  const handleBookUpdated = (updated: Book) => {
    setBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    if (selectedDetailBook?.id === updated.id) {
      setSelectedDetailBook(updated);
    }
  };

  const handleSeedSampleLibrary = async () => {
    try {
      const seeded = await ensureSampleLibrary();
      setBooks((prev) => {
        const existingIds = new Set(prev.map((b) => b.id));
        const toAdd = seeded.filter((b) => !existingIds.has(b.id));
        return [...prev, ...toAdd];
      });
    } catch (e) {
      console.error('Error seeding sample books', e);
    }
  };

  // Filtered books
  const filteredBooks = useMemo(() => {
    let result = [...books];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
      );
    }

    if (activeFilter === 'reading') {
      result = result.filter((b) => b.progress > 0 && b.progress < 100);
    } else if (activeFilter === 'completed') {
      result = result.filter((b) => b.progress === 100);
    } else if (activeFilter === 'epub') {
      result = result.filter((b) => b.format === 'epub');
    } else if (activeFilter === 'pdf') {
      result = result.filter((b) => b.format === 'pdf');
    } else if (activeFilter === 'txt') {
      result = result.filter((b) => b.format === 'txt' || b.format === 'md');
    }

    return result;
  }, [books, searchQuery, activeFilter]);

  // Identify most recent book for resume
  const continueBook = useMemo(() => {
    if (books.length === 0) return null;
    const sorted = [...books].sort((a, b) => b.lastRead - a.lastRead);
    return sorted[0];
  }, [books]);

  // If reading view is active, render reader full-screen with smooth fade container
  if (activeReaderBook) {
    return (
      <div className={`app-fade-container ${isAppFading ? 'fading' : ''}`}>
        <ReaderView
          book={activeReaderBook}
          onBackToLibrary={handleBackToLibrary}
          onBookUpdated={handleBookUpdated}
        />
      </div>
    );
  }

  return (
    <div className={`enzo-app app-fade-container ${isAppFading ? 'fading' : ''}`}>
      <Header
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        onOpenImport={() => setIsImportModalOpen(true)}
        deferredPrompt={deferredPrompt}
        onInstallApp={handleInstallApp}
        books={books}
        journalCount={journalEntries.length}
        continueBook={continueBook}
        onOpenReader={handleOpenReader}
        activeFilter={activeFilter}
        onSelectFilter={setActiveFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode((prev) => (prev === 'carousel' ? 'grid' : 'carousel'))}
        onSeedSampleLibrary={handleSeedSampleLibrary}
      />

      <main className="enzo-main">
        {currentView === 'library' && (
          <LibraryView
            books={filteredBooks}
            viewMode={viewMode}
            onToggleViewMode={() => setViewMode((prev) => (prev === 'carousel' ? 'grid' : 'carousel'))}
            onOpenReader={handleOpenReader}
            onOpenImport={() => setIsImportModalOpen(true)}
            onSeedSampleLibrary={handleSeedSampleLibrary}
          />
        )}

        {currentView === 'journal' && (
          <JournalView
            entries={journalEntries}
            books={books}
            onEntriesUpdated={refreshLibrary}
            onOpenBook={(bookId) => {
              const matched = books.find((b) => b.id === bookId);
              if (matched) handleOpenReader(matched);
            }}
          />
        )}

        {currentView === 'sync' && (
          <SyncView
            books={books}
            journalCount={journalEntries.length}
            onLibraryImported={refreshLibrary}
          />
        )}

        {currentView === 'settings' && (
          <SettingsView
            onLibraryReset={refreshLibrary}
            deferredPrompt={deferredPrompt}
            onInstallApp={handleInstallApp}
          />
        )}
      </main>

      {/* Book Detail Modal */}
      <BookDetailModal
        book={selectedDetailBook}
        isOpen={Boolean(selectedDetailBook)}
        onClose={() => setSelectedDetailBook(null)}
        onOpenReader={handleOpenReader}
        onBookDeleted={handleBookDeleted}
        onBookUpdated={handleBookUpdated}
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onBookImported={handleBookAdded}
      />
    </div>
  );
}

export default App;
