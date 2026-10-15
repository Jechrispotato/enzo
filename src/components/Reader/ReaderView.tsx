import React, { useState, useEffect } from 'react';
import { ArrowLeft, List, SlidersHorizontal, Eye, EyeOff, Loader2 } from 'lucide-react';
import { EpubReader } from './EpubReader';
import { PdfReader } from './PdfReader';
import { TxtReader } from './TxtReader';
import { TocDrawer } from './TocDrawer';
import { ReaderSettingsDrawer } from './ReaderSettingsDrawer';
import { SaveQuoteModal } from './SaveQuoteModal';
import { getBookFile, getReaderSettings, saveReaderSettings } from '../../services/db';
import type { Book, ReaderSettings, TocItem, JournalEntry } from '../../types';

interface ReaderViewProps {
  book: Book;
  onBackToLibrary: () => void;
  onBookUpdated?: (book: Book) => void;
}

export const ReaderView: React.FC<ReaderViewProps> = ({
  book,
  onBackToLibrary,
}) => {
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(true);
  const [fileError, setFileError] = useState<string | null>(null);

  // Settings
  const [settings, setSettings] = useState<ReaderSettings>({
    theme: 'paper',
    fontFamily: 'newsreader',
    fontSize: 18,
    lineSpacing: 1.7,
    textAlign: 'left',
    columnWidth: 'medium',
    pageMargins: 'normal',
  });

  // Navigation & State
  const [activeTitle, setActiveTitle] = useState<string>('');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [totalItems, setTotalItems] = useState<number>(1);
  const [toc, setToc] = useState<TocItem[]>(book.toc || []);

  // Drawers & Modals
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImmersive, setIsImmersive] = useState(false);

  // Quote Saving
  const [quoteModalData, setQuoteModalData] = useState<{
    isOpen: boolean;
    text: string;
    chapterTitle?: string;
    pageNumber?: number;
  }>({ isOpen: false, text: '' });

  // 1. Load book file from IndexedDB
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingFile(true);
    setFileError(null);

    getBookFile(book.id)
      .then((rec) => {
        if (isCancelled) return;
        if (!rec || !rec.data) {
          setFileError('Book file was not found in browser storage. It may have been cleared or not imported properly.');
        } else {
          setFileBlob(rec.data);
        }
        setIsLoadingFile(false);
      })
      .catch((err) => {
        if (!isCancelled) {
          setFileError(`Storage error: ${err.message}`);
          setIsLoadingFile(false);
        }
      });

    // Load reader preferences
    getReaderSettings().then((s) => {
      setSettings(s);
      document.documentElement.setAttribute('data-theme', s.theme);
    });

    return () => {
      isCancelled = true;
      // Reset theme attribute to default when leaving reader if desired
    };
  }, [book.id]);

  const handleUpdateSettings = async (newProps: Partial<ReaderSettings>) => {
    const updated = { ...settings, ...newProps };
    setSettings(updated);
    if (newProps.theme) {
      document.documentElement.setAttribute('data-theme', newProps.theme);
    }
    await saveReaderSettings(updated);
  };

  const handleQuoteRequested = (text: string, title: string) => {
    setQuoteModalData({
      isOpen: true,
      text,
      chapterTitle: title,
      pageNumber: book.format === 'pdf' ? currentIndex + 1 : undefined,
    });
  };

  if (isLoadingFile) {
    return (
      <div className="reader-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Loader2 size={36} className="animate-spin" style={{ color: 'var(--accent-active)', marginBottom: '1rem' }} />
        <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '1.1rem' }}>
          Opening "{book.title}"...
        </p>
      </div>
    );
  }

  if (fileError || !fileBlob) {
    return (
      <div className="reader-container" style={{ justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
        <div style={{ maxWidth: '480px', textAlign: 'center' }}>
          <h3 style={{ color: 'var(--accent-burgundy)', marginBottom: '1rem', fontFamily: 'var(--font-serif)', fontSize: '1.5rem' }}>
            Could not open book
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            {fileError || 'File data missing.'}
          </p>
          <button className="btn-primary" onClick={onBackToLibrary}>
            Return to Library
          </button>
        </div>
      </div>
    );
  }

  const currentPercent = totalItems > 0 ? Math.round(((currentIndex + 1) / totalItems) * 100) : 0;

  return (
    <div className="reader-container">
      {/* Top Header */}
      <header className={`reader-header ${isImmersive ? 'immersive-hidden' : ''}`}>
        <button
          className="btn-minimal"
          onClick={onBackToLibrary}
          style={{ border: 'none', padding: '0.4rem 0.6rem' }}
          aria-label="Back to library"
        >
          <ArrowLeft size={18} />
          <span style={{ fontSize: '0.85rem' }}>Library</span>
        </button>

        <div className="reader-header-center">
          <span className="reader-header-title">{book.title}</span>
          <span className="reader-header-chapter">
            {activeTitle || (book.format === 'pdf' ? `Page ${currentIndex + 1} of ${totalItems}` : 'Reading')}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {book.format !== 'pdf' && (
            <button
              className="btn-minimal"
              onClick={() => setIsTocOpen(true)}
              title="Table of Contents"
            >
              <List size={16} />
              <span className="screen-reader-only">Contents</span>
            </button>
          )}

          <button
            className="btn-minimal"
            onClick={() => setIsSettingsOpen(true)}
            title="Appearance & Typography"
          >
            <SlidersHorizontal size={16} />
            <span className="screen-reader-only">Appearance</span>
          </button>

          <button
            className="btn-minimal"
            onClick={() => setIsImmersive(!isImmersive)}
            title={isImmersive ? 'Show controls' : 'Distraction-free mode'}
          >
            {isImmersive ? <EyeOff size={16} /> : <Eye size={16} />}
            <span className="screen-reader-only">Immersive Mode</span>
          </button>
        </div>
      </header>

      {/* Reader Formats */}
      {book.format === 'epub' && (
        <EpubReader
          book={book}
          fileBlob={fileBlob}
          settings={settings}
          chapterIndex={currentIndex}
          onTocLoaded={(loadedToc) => setToc(loadedToc)}
          onActiveChapterChange={(title, index, total) => {
            setActiveTitle(title);
            setCurrentIndex(index);
            setTotalItems(total);
          }}
          onQuoteRequested={handleQuoteRequested}
          onToggleImmersive={() => setIsImmersive((prev) => !prev)}
        />
      )}

      {book.format === 'pdf' && (
        <PdfReader
          book={book}
          fileBlob={fileBlob}
          settings={settings}
          onActivePageChange={(pageNum, total) => {
            setCurrentIndex(pageNum - 1);
            setTotalItems(total);
            setActiveTitle(`Page ${pageNum} of ${total}`);
          }}
          onToggleImmersive={() => setIsImmersive((prev) => !prev)}
        />
      )}

      {(book.format === 'txt' || book.format === 'md') && (
        <TxtReader
          book={book}
          fileBlob={fileBlob}
          settings={settings}
          sectionIndex={currentIndex}
          onTocLoaded={(loadedToc) => setToc(loadedToc)}
          onActiveSectionChange={(title, index, total) => {
            setActiveTitle(title);
            setCurrentIndex(index);
            setTotalItems(total);
          }}
          onQuoteRequested={handleQuoteRequested}
          onToggleImmersive={() => setIsImmersive((prev) => !prev)}
        />
      )}

      {/* Bottom Footer Progress Bar */}
      <footer className={`reader-footer ${isImmersive ? 'immersive-hidden' : ''}`}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', minWidth: '60px' }}>
          {activeTitle || 'Reading'}
        </span>

        <div style={{ flex: 1, maxWidth: '400px', margin: '0 1rem' }}>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${currentPercent}%` }} />
          </div>
        </div>

        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', minWidth: '40px', textAlign: 'right' }}>
          {currentPercent}%
        </span>
      </footer>

      {/* TOC Drawer */}
      <TocDrawer
        isOpen={isTocOpen}
        onClose={() => setIsTocOpen(false)}
        toc={toc}
        activeChapterIndex={currentIndex}
        onSelectChapter={(_href, index) => {
          setCurrentIndex(index);
        }}
      />

      {/* Reader Settings Drawer */}
      <ReaderSettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />

      {/* Save Quote Modal */}
      <SaveQuoteModal
        isOpen={quoteModalData.isOpen}
        onClose={() => setQuoteModalData({ isOpen: false, text: '' })}
        selectedText={quoteModalData.text}
        book={book}
        currentChapterTitle={quoteModalData.chapterTitle}
        currentPageNumber={quoteModalData.pageNumber}
        onSaved={(_entry: JournalEntry) => {
          // Notify
        }}
      />
    </div>
  );
};
