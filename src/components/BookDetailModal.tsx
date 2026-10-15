import React, { useState, useEffect } from 'react';
import { X, BookOpen, Download, Trash2, Star, Calendar, FileType, HardDrive, Plus } from 'lucide-react';
import { updateBookDetails, deleteBook, getJournalEntriesForBook, saveJournalEntry } from '../services/db';
import { exportSingleBook } from '../services/sync';
import type { Book, JournalEntry } from '../types';

interface BookDetailModalProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenReader: (book: Book) => void;
  onBookDeleted: (bookId: string) => void;
  onBookUpdated: (book: Book) => void;
}

export const BookDetailModal: React.FC<BookDetailModalProps> = ({
  book,
  isOpen,
  onClose,
  onOpenReader,
  onBookDeleted,
  onBookUpdated,
}) => {
  const [rating, setRating] = useState<number>(book?.rating || 0);
  const [notes, setNotes] = useState<string>(book?.personalNotes || '');
  const [quotes, setQuotes] = useState<JournalEntry[]>([]);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [showAddQuote, setShowAddQuote] = useState(false);
  const [newQuoteText, setNewQuoteText] = useState('');
  const [newQuoteAnnotation, setNewQuoteAnnotation] = useState('');

  useEffect(() => {
    if (book) {
      setRating(book.rating || 0);
      setNotes(book.personalNotes || '');
      setIsConfirmingDelete(false);
      setShowAddQuote(false);
      getJournalEntriesForBook(book.id).then(setQuotes);
    }
  }, [book]);

  if (!isOpen || !book) return null;

  const handleRating = async (newRating: number) => {
    const val = rating === newRating ? 0 : newRating;
    setRating(val);
    await updateBookDetails(book.id, { rating: val });
    onBookUpdated({ ...book, rating: val });
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    await updateBookDetails(book.id, { personalNotes: notes });
    onBookUpdated({ ...book, personalNotes: notes });
    setTimeout(() => setIsSavingNotes(false), 500);
  };

  const handleDelete = async () => {
    await deleteBook(book.id);
    onBookDeleted(book.id);
    onClose();
  };

  const handleExport = async () => {
    try {
      await exportSingleBook(book.id);
    } catch (e: any) {
      alert(`Export error: ${e.message}`);
    }
  };

  const handleAddQuote = async () => {
    if (!newQuoteText.trim()) return;

    const entry: JournalEntry = {
      id: 'journal_' + Date.now(),
      bookId: book.id,
      bookTitle: book.title,
      bookAuthor: book.author,
      type: 'quote',
      text: newQuoteText.trim(),
      annotation: newQuoteAnnotation.trim() || undefined,
      createdAt: Date.now(),
    };

    await saveJournalEntry(entry);
    setQuotes([entry, ...quotes]);
    setNewQuoteText('');
    setNewQuoteAnnotation('');
    setShowAddQuote(false);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Book Details
          </span>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="book-detail-grid">
          <div className="book-detail-cover">
            {book.coverUrl ? (
              <img src={book.coverUrl} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div className="typographic-cover">
                <span className="typographic-cover-format">{book.format}</span>
                <h3 className="typographic-cover-title" style={{ fontSize: '0.95rem' }}>{book.title}</h3>
                <p className="typographic-cover-author" style={{ fontSize: '0.75rem' }}>{book.author}</p>
              </div>
            )}
          </div>

          <div className="book-detail-info">
            <h2 className="book-detail-title">{book.title}</h2>
            <div className="book-detail-author">by {book.author}</div>

            <div className="book-detail-badges">
              <div className="detail-badge" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FileType size={12} />
                <span>{book.format.toUpperCase()}</span>
              </div>
              <div className="detail-badge" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <HardDrive size={12} />
                <span>{formatBytes(book.fileSize)}</span>
              </div>
              <div className="detail-badge" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={12} />
                <span>Added {formatDate(book.dateAdded)}</span>
              </div>
            </div>

            {/* Reading Progress */}
            <div style={{ margin: '1rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                <span>Reading Progress</span>
                <strong style={{ color: 'var(--text-primary)' }}>{book.progress}%</strong>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${book.progress}%` }} />
              </div>
              {book.currentLocation?.chapterTitle && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Current: {book.currentLocation.chapterTitle}
                </div>
              )}
              {book.format === 'pdf' && book.currentLocation?.pageNumber && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Page {book.currentLocation.pageNumber} of {book.totalPages || book.currentLocation.totalPages || '?'}
                </div>
              )}
            </div>

            {/* Star Rating */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: '0.75rem 0' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginRight: '0.4rem' }}>Rating:</span>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRating(star)}
                  style={{ color: star <= rating ? '#c98a2c' : 'var(--border-strong)', padding: '2px' }}
                  title={`${star} star`}
                >
                  <Star size={16} fill={star <= rating ? '#c98a2c' : 'none'} />
                </button>
              ))}
            </div>

            <div className="book-detail-actions">
              <button className="btn-primary" onClick={() => onOpenReader(book)}>
                <BookOpen size={16} />
                <span>{book.progress > 0 ? 'Resume Reading' : 'Start Reading'}</span>
              </button>

              <button className="btn-minimal" onClick={handleExport} title="Download file to this device">
                <Download size={15} />
                <span>Export File</span>
              </button>

              {!isConfirmingDelete ? (
                <button
                  className="btn-minimal"
                  style={{ color: 'var(--accent-burgundy)' }}
                  onClick={() => setIsConfirmingDelete(true)}
                  title="Remove from local library"
                >
                  <Trash2 size={15} />
                  <span>Remove</span>
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    className="btn-minimal"
                    style={{ backgroundColor: 'var(--accent-burgundy)', color: '#fff', borderColor: 'transparent' }}
                    onClick={handleDelete}
                  >
                    Confirm Delete
                  </button>
                  <button className="btn-minimal" onClick={() => setIsConfirmingDelete(false)}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Personal Notes Section */}
        <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Personal Reflection & Notes
            </span>
            {notes !== (book.personalNotes || '') && (
              <button className="btn-minimal" style={{ padding: '0.2rem 0.5rem', fontSize: '0.78rem' }} onClick={handleSaveNotes}>
                {isSavingNotes ? 'Saved' : 'Save Notes'}
              </button>
            )}
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Write your private impressions, reading thoughts, or book review..."
            rows={3}
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.88rem', lineHeight: 1.5 }}
          />
        </div>

        {/* Saved Quotes & Highlights from this book */}
        <div style={{ marginTop: '1.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Saved Quotes & Highlights ({quotes.length})
            </span>
            <button
              className="btn-minimal"
              style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}
              onClick={() => setShowAddQuote(!showAddQuote)}
            >
              <Plus size={13} />
              <span>Add Quote</span>
            </button>
          </div>

          {showAddQuote && (
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
              <textarea
                value={newQuoteText}
                onChange={(e) => setNewQuoteText(e.target.value)}
                placeholder="Paste or write the quote..."
                rows={2}
                style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', marginBottom: '0.5rem' }}
              />
              <input
                type="text"
                value={newQuoteAnnotation}
                onChange={(e) => setNewQuoteAnnotation(e.target.value)}
                placeholder="Optional personal reflection on this quote..."
                style={{ width: '100%', padding: '0.45rem', fontSize: '0.82rem', marginBottom: '0.6rem' }}
              />
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button className="btn-minimal" onClick={() => setShowAddQuote(false)}>Cancel</button>
                <button className="btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem' }} onClick={handleAddQuote}>Save</button>
              </div>
            </div>
          )}

          {quotes.length === 0 ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No quotes saved yet. Highlight text while reading to add passages to your Journal.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '200px', overflowY: 'auto' }}>
              {quotes.map((q) => (
                <div key={q.id} style={{ padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: q.annotation ? '0.4rem' : 0 }}>
                    “{q.text}”
                  </p>
                  {q.annotation && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{q.annotation}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
