import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { LibraryView } from './components/Views/LibraryView';
import { JournalView } from './components/Views/JournalView';
import { SyncView } from './components/Views/SyncView';
import { SettingsView } from './components/Views/SettingsView';
import { BookDetailModal } from './components/BookDetailModal';
import { ImportModal } from './components/ImportModal';
import { ReaderView } from './components/Reader/ReaderView';
import { getAllBooks, getAllJournalEntries, getReaderSettings } from './services/db';
import type { Book, JournalEntry } from './types';
import './App.css';

export function App() {
  const [currentView, setCurrentView] = useState<'library' | 'journal' | 'sync' | 'settings'>('library');
  const [books, setBooks] = useState<Book[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  
  // Modals & Reader
  const [selectedDetailBook, setSelectedDetailBook] = useState<Book | null>(null);
  const [activeReaderBook, setActiveReaderBook] = useState<Book | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Load books, journal, and reader theme from IndexedDB
  const refreshLibrary = useCallback(async () => {
    try {
      const loadedBooks = await getAllBooks();
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

  const handleOpenReader = (book: Book) => {
    setSelectedDetailBook(null);
    setActiveReaderBook(book);
  };

  const handleBackToLibrary = () => {
    setActiveReaderBook(null);
    refreshLibrary();
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

  // If reading view is active, render reader full-screen
  if (activeReaderBook) {
    return (
      <ReaderView
        book={activeReaderBook}
        onBackToLibrary={handleBackToLibrary}
        onBookUpdated={handleBookUpdated}
      />
    );
  }

  return (
    <div className="enzo-app">
      <Header
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        onOpenImport={() => setIsImportModalOpen(true)}
        deferredPrompt={deferredPrompt}
        onInstallApp={handleInstallApp}
      />

      <main className="enzo-main">
        {currentView === 'library' && (
          <LibraryView
            books={books}
            journalCount={journalEntries.length}
            onOpenBookDetail={(book) => setSelectedDetailBook(book)}
            onOpenReader={handleOpenReader}
            onOpenImport={() => setIsImportModalOpen(true)}
            onBookAdded={handleBookAdded}
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
