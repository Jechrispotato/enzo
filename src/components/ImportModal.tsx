import React, { useState, useRef } from 'react';
import { UploadCloud, X, CheckCircle, AlertCircle, FileText, Loader2 } from 'lucide-react';
import { importBookFile } from '../services/bookImporter';
import type { Book } from '../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookImported: (book: Book) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onBookImported,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importedBooks, setImportedBooks] = useState<Book[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setImportErrors([]);
    setImportedBooks([]);

    const errors: string[] = [];
    const successful: Book[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setStatusMessage(`Processing "${file.name}" (${i + 1}/${files.length})...`);

      const result = await importBookFile(file);
      if (result.success && result.book) {
        successful.push(result.book);
        onBookImported(result.book);
      } else {
        errors.push(result.error || `Failed to import ${file.name}`);
      }
    }

    setIsProcessing(false);
    setStatusMessage('');
    setImportErrors(errors);
    setImportedBooks(successful);

    // If all were successful and only 1 file, auto close after brief delay
    if (errors.length === 0 && successful.length === 1) {
      setTimeout(() => {
        onClose();
      }, 1200);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Add to Your Library</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div
          className={`dropzone ${isDragging ? 'active' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            multiple
            accept=".epub,.pdf,.txt,.md,application/epub+zip,application/pdf,text/plain,text/markdown"
            onChange={(e) => handleFiles(e.target.files)}
          />

          <div className="dropzone-icon">
            {isProcessing ? (
              <Loader2 size={36} className="animate-spin" />
            ) : (
              <UploadCloud size={38} />
            )}
          </div>

          <div className="dropzone-text">
            {isProcessing ? statusMessage : 'Choose files or drop them here'}
          </div>
          <div className="dropzone-hint">
            Supports EPUB, PDF, and Text (.txt, .md) documents
          </div>
        </div>

        {importedBooks.length > 0 && (
          <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {importedBooks.map((b) => (
              <div
                key={b.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                  color: 'var(--accent-olive)',
                }}
              >
                <CheckCircle size={15} />
                <span>Added <strong>{b.title}</strong> by {b.author}</span>
              </div>
            ))}
          </div>
        )}

        {importErrors.length > 0 && (
          <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {importErrors.map((err, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                  color: 'var(--accent-burgundy)',
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{err}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <FileText size={13} />
          <span>Local storage only. Your files never leave your browser.</span>
        </div>
      </div>
    </div>
  );
};
