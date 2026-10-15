import React, { useState } from 'react';
import { X, Quote, BookmarkCheck } from 'lucide-react';
import { saveJournalEntry } from '../../services/db';
import type { Book, JournalEntry } from '../../types';

interface SaveQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
  book: Book;
  currentChapterTitle?: string;
  currentPageNumber?: number;
  onSaved: (entry: JournalEntry) => void;
}

export const SaveQuoteModal: React.FC<SaveQuoteModalProps> = ({
  isOpen,
  onClose,
  selectedText,
  book,
  currentChapterTitle,
  currentPageNumber,
  onSaved,
}) => {
  const [annotation, setAnnotation] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    const entry: JournalEntry = {
      id: 'journal_' + Date.now(),
      bookId: book.id,
      bookTitle: book.title,
      bookAuthor: book.author,
      type: 'quote',
      text: selectedText.trim(),
      annotation: annotation.trim() || undefined,
      chapterTitle: currentChapterTitle,
      pageNumber: currentPageNumber,
      createdAt: Date.now(),
    };

    await saveJournalEntry(entry);
    setIsSaved(true);
    onSaved(entry);

    setTimeout(() => {
      setIsSaved(false);
      setAnnotation('');
      onClose();
    }, 800);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
            <Quote size={16} />
            <span>Save to Reading Journal</span>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <blockquote
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: '1.05rem',
            lineHeight: 1.55,
            padding: '1rem 1.25rem',
            backgroundColor: 'var(--bg-secondary)',
            borderLeft: '3px solid var(--accent-active)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.25rem',
            color: 'var(--text-primary)',
            maxHeight: '180px',
            overflowY: 'auto',
          }}
        >
          “{selectedText}”
        </blockquote>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
            Personal Reflection (Optional)
          </label>
          <textarea
            value={annotation}
            onChange={(e) => setAnnotation(e.target.value)}
            placeholder="Add your note or why this passage resonated..."
            rows={2}
            style={{ width: '100%', padding: '0.65rem', fontSize: '0.88rem', lineHeight: 1.4 }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
          <button className="btn-minimal" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={isSaved}>
            {isSaved ? (
              <>
                <BookmarkCheck size={16} />
                <span>Saved to Journal!</span>
              </>
            ) : (
              <span>Save Quote</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
