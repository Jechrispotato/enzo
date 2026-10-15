import React, { useState, useMemo } from 'react';
import { Bookmark, Search, Copy, Check, Trash2, Plus, BookOpen } from 'lucide-react';
import { deleteJournalEntry, saveJournalEntry } from '../../services/db';
import type { JournalEntry, Book } from '../../types';

interface JournalViewProps {
  entries: JournalEntry[];
  books: Book[];
  onEntriesUpdated: () => void;
  onOpenBook: (bookId: string) => void;
}

export const JournalView: React.FC<JournalViewProps> = ({
  entries,
  books,
  onEntriesUpdated,
  onOpenBook,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBookId, setSelectedBookId] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isAddingManual, setIsAddingManual] = useState(false);

  // Manual entry form state
  const [manualBookId, setManualBookId] = useState<string>(books[0]?.id || '');
  const [manualText, setManualText] = useState('');
  const [manualAnnotation, setManualAnnotation] = useState('');

  const filteredEntries = useMemo(() => {
    let result = [...entries];

    if (selectedBookId !== 'all') {
      result = result.filter((e) => e.bookId === selectedBookId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.text.toLowerCase().includes(q) ||
          e.bookTitle.toLowerCase().includes(q) ||
          (e.annotation && e.annotation.toLowerCase().includes(q))
      );
    }

    return result;
  }, [entries, selectedBookId, searchQuery]);

  const handleCopy = (id: string, text: string, title: string, author: string) => {
    const formatted = `“${text}”\n— ${author}, ${title}`;
    navigator.clipboard.writeText(formatted);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleDelete = async (id: string) => {
    await deleteJournalEntry(id);
    onEntriesUpdated();
  };

  const handleCreateManual = async () => {
    if (!manualText.trim() || !manualBookId) return;

    const matchedBook = books.find((b) => b.id === manualBookId);
    if (!matchedBook) return;

    const newEntry: JournalEntry = {
      id: 'journal_' + Date.now(),
      bookId: matchedBook.id,
      bookTitle: matchedBook.title,
      bookAuthor: matchedBook.author,
      type: 'quote',
      text: manualText.trim(),
      annotation: manualAnnotation.trim() || undefined,
      createdAt: Date.now(),
    };

    await saveJournalEntry(newEntry);
    onEntriesUpdated();
    setManualText('');
    setManualAnnotation('');
    setIsAddingManual(false);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="journal-view-container">
      <div className="journal-header">
        <div>
          <div className="library-greeting-subtitle">Notebook</div>
          <h1 className="library-greeting-title" style={{ fontSize: '2rem' }}>
            Reading Journal
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Passages, reflections, and quotes collected across your reading.
          </p>
        </div>

        {books.length > 0 && (
          <button className="btn-primary" onClick={() => setIsAddingManual(true)}>
            <Plus size={15} />
            <span>New Reflection</span>
          </button>
        )}
      </div>

      {/* Manual Entry Form */}
      {isAddingManual && (
        <div
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-md)',
            padding: '1.5rem',
            marginBottom: '2rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Add Reflection to Journal</span>
            <button className="modal-close-btn" onClick={() => setIsAddingManual(false)}>✕</button>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
              Select Book
            </label>
            <select
              value={manualBookId}
              onChange={(e) => setManualBookId(e.target.value)}
              style={{ width: '100%', padding: '0.45rem', fontSize: '0.85rem' }}
            >
              {books.map((b) => (
                <option key={b.id} value={b.id}>{b.title} — {b.author}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
              Quotation / Passage
            </label>
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Paste or write the passage from the book..."
              rows={3}
              style={{ width: '100%', padding: '0.6rem', fontSize: '0.88rem' }}
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
              Personal Reflection (Optional)
            </label>
            <input
              type="text"
              value={manualAnnotation}
              onChange={(e) => setManualAnnotation(e.target.value)}
              placeholder="Your thought or commentary..."
              style={{ width: '100%', padding: '0.45rem', fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
            <button className="btn-minimal" onClick={() => setIsAddingManual(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleCreateManual}>Save to Journal</button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <div className="search-box" style={{ flex: 1 }}>
          <Search size={15} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search quotes or reflections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {books.length > 0 && (
          <select
            value={selectedBookId}
            onChange={(e) => setSelectedBookId(e.target.value)}
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
          >
            <option value="all">All Books ({entries.length})</option>
            {books.map((b) => (
              <option key={b.id} value={b.id}>{b.title}</option>
            ))}
          </select>
        )}
      </div>

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1.5rem', maxWidth: '480px', margin: '0 auto' }}>
          <Bookmark size={32} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            No journal entries yet.
          </p>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            While reading any book in enzo, highlight text to save it as a quote, or click "New Reflection" above.
          </p>
        </div>
      ) : (
        <div className="journal-list">
          {filteredEntries.map((entry) => (
            <article key={entry.id} className="journal-card">
              <div className="journal-quote-mark">“</div>
              <p className="journal-quote-text">{entry.text}</p>

              {entry.annotation && (
                <div className="journal-annotation">
                  {entry.annotation}
                </div>
              )}

              <footer className="journal-card-footer">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <button
                    style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    onClick={() => onOpenBook(entry.bookId)}
                    title="Open book in reader"
                  >
                    <BookOpen size={13} />
                    <span>{entry.bookTitle}</span>
                  </button>
                  <span>•</span>
                  <span>{entry.bookAuthor}</span>
                  {entry.chapterTitle && (
                    <>
                      <span>•</span>
                      <span>{entry.chapterTitle}</span>
                    </>
                  )}
                  <span>•</span>
                  <span>{formatDate(entry.createdAt)}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button
                    className="btn-minimal"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                    onClick={() => handleCopy(entry.id, entry.text, entry.bookTitle, entry.bookAuthor)}
                    title="Copy formatted quote"
                  >
                    {copiedId === entry.id ? (
                      <>
                        <Check size={13} style={{ color: 'var(--accent-olive)' }} />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  <button
                    className="btn-minimal"
                    style={{ padding: '0.25rem 0.4rem', color: 'var(--accent-burgundy)' }}
                    onClick={() => handleDelete(entry.id)}
                    title="Delete entry"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </footer>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
