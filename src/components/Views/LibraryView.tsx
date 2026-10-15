import React, { useState, useMemo } from 'react';
import { Search, LayoutGrid, List as ListIcon, Columns3, BookOpen, Sparkles, Plus, ArrowUpRight } from 'lucide-react';
import { BookCard } from '../BookCard';
import { createAndImportSampleEpub } from '../../services/sampleBook';
import type { Book, LibraryViewMode, SortOption, FilterOption } from '../../types';

interface LibraryViewProps {
  books: Book[];
  journalCount: number;
  onOpenBookDetail: (book: Book) => void;
  onOpenReader: (book: Book) => void;
  onOpenImport: () => void;
  onBookAdded: (book: Book) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  books,
  journalCount,
  onOpenBookDetail,
  onOpenReader,
  onOpenImport,
  onBookAdded,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [sortOption, setSortOption] = useState<SortOption>('recent');
  const [viewMode, setViewMode] = useState<LibraryViewMode>('grid');
  const [isAddingSample, setIsAddingSample] = useState(false);

  // Identify most recently read book
  const continueBook = useMemo(() => {
    if (books.length === 0) return null;
    const sorted = [...books].sort((a, b) => b.lastRead - a.lastRead);
    return sorted[0].progress > 0 ? sorted[0] : sorted[0];
  }, [books]);

  // Filter and sort books
  const filteredBooks = useMemo(() => {
    let result = [...books];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
      );
    }

    // Filter
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

    // Sort
    result.sort((a, b) => {
      if (sortOption === 'recent') return b.lastRead - a.lastRead;
      if (sortOption === 'dateAdded') return b.dateAdded - a.dateAdded;
      if (sortOption === 'title') return a.title.localeCompare(b.title);
      if (sortOption === 'author') return a.author.localeCompare(b.author);
      if (sortOption === 'progress') return b.progress - a.progress;
      return 0;
    });

    return result;
  }, [books, searchQuery, activeFilter, sortOption]);

  const inProgressCount = books.filter((b) => b.progress > 0 && b.progress < 100).length;
  const completedCount = books.filter((b) => b.progress === 100).length;

  const handleAddSample = async () => {
    setIsAddingSample(true);
    try {
      const sample = await createAndImportSampleEpub();
      if (sample) {
        onBookAdded(sample);
      }
    } catch (e: any) {
      alert(`Could not load sample: ${e.message}`);
    } finally {
      setIsAddingSample(false);
    }
  };

  return (
    <div className="library-view">
      {/* Editorial Greeting Header */}
      <div className="library-hero">
        <div className="library-greeting-subtitle">Personal Library</div>
        <h1 className="library-greeting-title">A little time for reading.</h1>
        <div className="library-stats-bar">
          <span>{books.length} {books.length === 1 ? 'volume' : 'volumes'}</span>
          <span className="library-stats-dot" />
          <span>{inProgressCount} in progress</span>
          <span className="library-stats-dot" />
          <span>{completedCount} finished</span>
          <span className="library-stats-dot" />
          <span>{journalCount} journal reflections</span>
        </div>
      </div>

      {/* Continue Reading Featured Card */}
      {continueBook && (
        <div className="continue-reading-card">
          <div className="continue-cover-wrapper" onClick={() => onOpenReader(continueBook)} style={{ cursor: 'pointer' }}>
            {continueBook.coverUrl ? (
              <img src={continueBook.coverUrl} alt={continueBook.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div className="typographic-cover" style={{ padding: '0.5rem' }}>
                <span className="typographic-cover-format" style={{ fontSize: '0.55rem' }}>{continueBook.format}</span>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: '0.72rem', textAlign: 'center', lineHeight: 1.2 }}>
                  {continueBook.title}
                </span>
              </div>
            )}
          </div>

          <div className="continue-info">
            <div className="continue-label">Continue Reading</div>
            <h2 className="continue-title" onClick={() => onOpenReader(continueBook)}>
              {continueBook.title}
            </h2>
            <div className="continue-author">by {continueBook.author}</div>

            <div className="continue-progress-row">
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${continueBook.progress}%` }} />
              </div>
              <span className="progress-percent-text">{continueBook.progress}%</span>
            </div>
          </div>

          <button className="btn-primary" onClick={() => onOpenReader(continueBook)} style={{ alignSelf: 'center' }}>
            <BookOpen size={15} />
            <span>Resume</span>
          </button>
        </div>
      )}

      {/* Library Toolbar */}
      <div className="library-toolbar">
        <div className="search-box">
          <Search size={15} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by title or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filter Pills */}
        <div className="filter-pills">
          <button
            className={`filter-pill ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-pill ${activeFilter === 'reading' ? 'active' : ''}`}
            onClick={() => setActiveFilter('reading')}
          >
            Reading
          </button>
          <button
            className={`filter-pill ${activeFilter === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveFilter('completed')}
          >
            Finished
          </button>
          <button
            className={`filter-pill ${activeFilter === 'epub' ? 'active' : ''}`}
            onClick={() => setActiveFilter('epub')}
          >
            EPUB
          </button>
          <button
            className={`filter-pill ${activeFilter === 'pdf' ? 'active' : ''}`}
            onClick={() => setActiveFilter('pdf')}
          >
            PDF
          </button>
          <button
            className={`filter-pill ${activeFilter === 'txt' ? 'active' : ''}`}
            onClick={() => setActiveFilter('txt')}
          >
            Text
          </button>
        </div>

        {/* View & Sort Controls */}
        <div className="view-controls">
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', marginRight: '0.5rem' }}
          >
            <option value="recent">Recently Read</option>
            <option value="dateAdded">Date Added</option>
            <option value="title">Title (A-Z)</option>
            <option value="author">Author</option>
            <option value="progress">Reading Progress</option>
          </select>

          <button
            className={`icon-btn-toggle ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid view"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            className={`icon-btn-toggle ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List view"
          >
            <ListIcon size={15} />
          </button>
          <button
            className={`icon-btn-toggle ${viewMode === 'shelves' ? 'active' : ''}`}
            onClick={() => setViewMode('shelves')}
            title="Bookshelf view"
          >
            <Columns3 size={15} />
          </button>
        </div>
      </div>

      {/* Books Content */}
      {filteredBooks.length === 0 ? (
        <div className="empty-library">
          {books.length === 0 ? (
            <>
              <div className="empty-library-quote">
                “Your next favorite book is waiting.”
              </div>
              <p className="empty-library-desc">
                enzo is your quiet personal reading sanctuary. Add your own EPUB, PDF, or text files to begin. Everything stays locally on your device.
              </p>
              <div className="empty-actions">
                <button className="btn-primary" onClick={onOpenImport}>
                  <Plus size={16} />
                  <span>Import Your First Book</span>
                </button>
                <button
                  className="btn-minimal"
                  onClick={handleAddSample}
                  disabled={isAddingSample}
                >
                  <Sparkles size={15} />
                  <span>{isAddingSample ? 'Adding sample...' : 'Add Sample Classic'}</span>
                </button>
              </div>
            </>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', padding: '3rem 0' }}>
              No books matched "{searchQuery}".
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Grid View */}
          {viewMode === 'grid' && (
            <div className="books-grid">
              {filteredBooks.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onClick={() => onOpenBookDetail(book)}
                />
              ))}
            </div>
          )}

          {/* Compact List View */}
          {viewMode === 'list' && (
            <div className="books-list">
              {filteredBooks.map((book) => (
                <div
                  key={book.id}
                  className="book-list-row"
                  onClick={() => onOpenBookDetail(book)}
                >
                  <div className="book-list-main">
                    <span className="book-list-format-tag">{book.format}</span>
                    <div style={{ minWidth: 0 }}>
                      <div className="book-list-title">{book.title}</div>
                      <div className="book-list-author">by {book.author}</div>
                    </div>
                  </div>

                  <div className="book-list-meta">
                    <div style={{ width: '80px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div className="progress-bar-track" style={{ height: '3px' }}>
                        <div className="progress-bar-fill" style={{ width: `${book.progress}%` }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', minWidth: '28px' }}>
                        {book.progress}%
                      </span>
                    </div>

                    <button
                      className="btn-minimal"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenReader(book);
                      }}
                    >
                      <span>Read</span>
                      <ArrowUpRight size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Shelf-inspired View */}
          {viewMode === 'shelves' && (
            <div className="books-shelf-wrapper">
              <div className="books-shelf">
                {filteredBooks.map((book) => (
                  <div
                    key={book.id}
                    className="shelf-book"
                    onClick={() => onOpenBookDetail(book)}
                  >
                    <div className="shelf-book-spine">
                      {book.coverUrl ? (
                        <img src={book.coverUrl} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div className="typographic-cover" style={{ padding: '0.6rem' }}>
                          <span className="typographic-cover-format" style={{ fontSize: '0.6rem' }}>{book.format}</span>
                          <span style={{ fontFamily: 'var(--font-serif)', fontSize: '0.78rem', textAlign: 'center' }}>
                            {book.title}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="shelf-book-title">{book.title}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
