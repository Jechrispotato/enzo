import React, { useState, useRef } from 'react';
import type { Book } from '../../types';
import { generateDesignerCover } from '../../services/coverGenerator';

interface LibraryViewProps {
  books: Book[];
  viewMode: 'carousel' | 'grid';
  onToggleViewMode: () => void;
  onOpenReader: (book: Book) => void;
  onOpenImport: () => void;
  onSeedSampleLibrary: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  books,
  viewMode,
  onToggleViewMode,
  onOpenReader,
  onOpenImport,
  onSeedSampleLibrary,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);

  // Touch drag state for carousel
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Helper to get book cover (uses embedded coverUrl or generates designer art)
  const getCoverUrl = (book: Book, index: number) => {
    return book.coverUrl || generateDesignerCover(book.title, book.author, index);
  };

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    touchStartRef.current = { x: clientX, y: clientY, time: Date.now() };
  };

  const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (!touchStartRef.current) return;
    const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
    const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;

    const dx = clientX - touchStartRef.current.x;
    const dy = Math.abs(clientY - touchStartRef.current.y);
    touchStartRef.current = null;

    // Horizontal swipe threshold
    if (Math.abs(dx) > 40 && Math.abs(dx) > dy) {
      if (dx < 0 && activeIndex < books.length - 1) {
        // Swipe left -> Next book
        setActiveIndex((prev) => prev + 1);
      } else if (dx > 0 && activeIndex > 0) {
        // Swipe right -> Prev book
        setActiveIndex((prev) => prev - 1);
      }
    }
  };

  if (books.length === 0) {
    return (
      <div className="library-empty-stage">
        <p className="font-deutsch" style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          0 books
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '1.5rem', textAlign: 'center', maxWidth: '320px' }}>
          Your quiet library is ready for its first volume.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="btn-primary" onClick={onOpenImport}>
            Import Book
          </button>
          <button className="btn-minimal" onClick={onSeedSampleLibrary} style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-btn)' }}>
            Load 3 Sample Books
          </button>
        </div>
      </div>
    );
  }

  const safeActiveIndex = Math.min(activeIndex, books.length - 1);
  const activeBook = books[safeActiveIndex];

  return (
    <div className="library-selection-container">
      {/* =========================================================================
          VIEW A: POCKET CAROUSEL VIEW (Matching Screenshot 2)
          ========================================================================= */}
      {viewMode === 'carousel' && (
        <div
          className="pocket-carousel-stage"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseUp={handleTouchEnd}
        >
          {/* Peeking Previous Book (Left) */}
          {safeActiveIndex > 0 ? (
            <div
              className="pocket-peeking-item left"
              onClick={() => setActiveIndex(safeActiveIndex - 1)}
              title={books[safeActiveIndex - 1].title}
            >
              <div className="pocket-sleeve peeking">
                <img
                  src={getCoverUrl(books[safeActiveIndex - 1], safeActiveIndex - 1)}
                  alt={books[safeActiveIndex - 1].title}
                  className="pocket-book-cover"
                />
                <div className="pocket-frosted-front" />
              </div>
            </div>
          ) : (
            <div className="pocket-peeking-placeholder left" />
          )}

          {/* Active Center Book inside Frosted Pocket */}
          <div
            className="pocket-active-item"
            onClick={() => onOpenReader(activeBook)}
            role="button"
            tabIndex={0}
            title={`Read "${activeBook.title}"`}
          >
            <div className="pocket-sleeve active">
              <img
                src={getCoverUrl(activeBook, safeActiveIndex)}
                alt={activeBook.title}
                className="pocket-book-cover"
              />
              <div className="pocket-frosted-front" />
            </div>

            {/* Typography Below Pocket */}
            <div className="pocket-meta-info">
              <h2 className="pocket-book-title font-deutsch">
                "{activeBook.title}"
              </h2>
              <p className="pocket-book-author">
                by {activeBook.author}
              </p>
            </div>
          </div>

          {/* Peeking Next Book (Right) */}
          {safeActiveIndex < books.length - 1 ? (
            <div
              className="pocket-peeking-item right"
              onClick={() => setActiveIndex(safeActiveIndex + 1)}
              title={books[safeActiveIndex + 1].title}
            >
              <div className="pocket-sleeve peeking">
                <img
                  src={getCoverUrl(books[safeActiveIndex + 1], safeActiveIndex + 1)}
                  alt={books[safeActiveIndex + 1].title}
                  className="pocket-book-cover"
                />
                <div className="pocket-frosted-front" />
              </div>
            </div>
          ) : (
            <div className="pocket-peeking-placeholder right" />
          )}
        </div>
      )}

      {/* =========================================================================
          VIEW B: CLEAN 2-COLUMN GRID VIEW (Matching Screenshot 1)
          ========================================================================= */}
      {viewMode === 'grid' && (
        <div className="clean-grid-stage">
          <div className="clean-grid-books">
            {books.map((book, idx) => (
              <div
                key={book.id || idx}
                className="clean-grid-item"
                onClick={() => onOpenReader(book)}
                role="button"
                tabIndex={0}
                title={`Open "${book.title}"`}
              >
                <img
                  src={getCoverUrl(book, idx)}
                  alt={book.title}
                  className="clean-grid-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>

          {/* Bottom count in Deutsch Gothic font */}
          <div className="clean-grid-footer">
            <span className="clean-grid-count font-deutsch">
              {books.length} {books.length === 1 ? 'book' : 'books'}
            </span>
          </div>
        </div>
      )}

      {/* Subtle Bottom Curve Handle to Toggle Views */}
      <div className="bottom-view-toggle-area">
        <button
          className="bottom-view-toggle-handle"
          onClick={onToggleViewMode}
          title={viewMode === 'carousel' ? 'Switch to Grid View' : 'Switch to Carousel View'}
          aria-label="Toggle view"
        >
          <div className="bottom-handle-bar" />
        </button>
      </div>
    </div>
  );
};
