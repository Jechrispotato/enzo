import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  FileArchive,
  CheckCircle,
  AlertCircle,
  BookDown,
  Loader2,
} from 'lucide-react';
import {
  exportLibraryArchive,
  inspectLibraryArchive,
  importLibraryArchive,
  downloadBlob,
  exportSingleBook,
  type ImportReport,
} from '../../services/sync';
import type { Book } from '../../types';

interface SyncViewProps {
  books: Book[];
  journalCount: number;
  onLibraryImported: () => void;
}

export const SyncView: React.FC<SyncViewProps> = ({
  books,
  journalCount,
  onLibraryImported,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');

  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState('');
  const [importReport, setImportReport] = useState<ImportReport | null>(null);

  const [selectedSingleBookId, setSelectedSingleBookId] = useState<string>(books[0]?.id || '');
  const [isExportingSingle, setIsExportingSingle] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Full Library Export
  const handleExportLibrary = async () => {
    if (books.length === 0) {
      alert('Your library is currently empty. Add books before exporting.');
      return;
    }

    setIsExporting(true);
    setExportProgress(5);
    setExportStatus('Starting export...');

    try {
      const { blob, filename } = await exportLibraryArchive((percent, status) => {
        setExportProgress(percent);
        setExportStatus(status);
      });

      downloadBlob(blob, filename);
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
        setExportStatus('');
      }, 1500);
    } catch (err: any) {
      console.error('Export error', err);
      alert(`Export failed: ${err.message}`);
      setIsExporting(false);
    }
  };

  // Handle ZIP File Selection for Import
  const handleSelectZipFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset state
    setImportReport(null);
    setIsImporting(true);
    setImportProgress(10);
    setImportStatus(`Validating "${file.name}"...`);

    try {
      const inspection = await inspectLibraryArchive(file);
      if (!inspection.valid) {
        setImportReport({
          success: false,
          booksImported: 0,
          booksUpdated: 0,
          journalEntriesImported: 0,
          errors: [inspection.error || 'Invalid backup archive.'],
        });
        setIsImporting(false);
        return;
      }

      setImportStatus(`Found ${inspection.bookCount} books and ${inspection.journalCount} journal reflections...`);

      const report = await importLibraryArchive(file, (percent, status) => {
        setImportProgress(percent);
        setImportStatus(status);
      });

      setImportReport(report);
      if (report.success) {
        onLibraryImported();
      }
    } catch (err: any) {
      setImportReport({
        success: false,
        booksImported: 0,
        booksUpdated: 0,
        journalEntriesImported: 0,
        errors: [err.message || 'Import failed'],
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Individual Book Export
  const handleExportSingle = async () => {
    if (!selectedSingleBookId) return;
    setIsExportingSingle(true);
    try {
      await exportSingleBook(selectedSingleBookId);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    } finally {
      setIsExportingSingle(false);
    }
  };

  return (
    <div className="sync-view-container">
      <div className="sync-hero">
        <div className="library-greeting-subtitle">Cross-Device Reading</div>
        <h2>Sync & Transfer</h2>
        <p>
          Move your library, reading progress, and journal between laptop and phone — with complete privacy and zero backend.
        </p>
      </div>

      {/* Honest Architecture Explanation Banner */}
      <div className="sync-notice-banner">
        <strong>How enzo works:</strong> Your library stays entirely on your devices. To move books from your laptop to your phone, export your library as an archive and import it on your phone. Automatic cloud synchronization is not enabled because enzo does not store your books on any remote database or server.
      </div>

      {/* 3-Step Laptop-to-Phone Guide */}
      <div className="sync-steps-grid">
        <div className="sync-step-card">
          <div className="sync-step-num">01</div>
          <div className="sync-step-title">Export on Laptop</div>
          <div className="sync-step-desc">
            Click <strong>Export Library</strong> below. enzo packages your book files, reading positions, ratings, and quotes into <code>enzo-library.zip</code>.
          </div>
        </div>

        <div className="sync-step-card">
          <div className="sync-step-num">02</div>
          <div className="sync-step-title">Send to Your Phone</div>
          <div className="sync-step-desc">
            Transfer the ZIP file to your phone using AirDrop, email attachment, iCloud / Google Drive download, or local USB.
          </div>
        </div>

        <div className="sync-step-card">
          <div className="sync-step-num">03</div>
          <div className="sync-step-title">Import on Phone</div>
          <div className="sync-step-desc">
            Open enzo on your phone's browser, tap <strong>Import Library</strong>, and select the ZIP. Your books and reading bookmarks are instantly restored!
          </div>
        </div>
      </div>

      {/* Primary Actions: Export and Import */}
      <div className="sync-actions-grid">
        {/* Export Card */}
        <div className="sync-action-card">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', color: 'var(--accent-active)' }}>
              <Download size={22} />
              <h3 className="sync-action-title" style={{ margin: 0 }}>Export Library</h3>
            </div>
            <p className="sync-action-desc">
              Download your entire personal library ({books.length} {books.length === 1 ? 'book' : 'books'}, {journalCount} reflections) as a self-contained ZIP archive.
            </p>
          </div>

          <div>
            {isExporting ? (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                  <span>{exportStatus}</span>
                  <strong>{exportProgress}%</strong>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${exportProgress}%` }} />
                </div>
              </div>
            ) : null}

            <button
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={handleExportLibrary}
              disabled={isExporting || books.length === 0}
            >
              {isExporting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Packaging Library...</span>
                </>
              ) : (
                <>
                  <FileArchive size={16} />
                  <span>Download enzo-library.zip</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Import Card */}
        <div className="sync-action-card">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', color: 'var(--accent-active)' }}>
              <Upload size={22} />
              <h3 className="sync-action-title" style={{ margin: 0 }}>Import Library</h3>
            </div>
            <p className="sync-action-desc">
              Restore a previously exported <code>enzo-library.zip</code>. Existing books won't be duplicated and latest reading progress will be merged.
            </p>
          </div>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".zip,application/zip"
              onChange={handleSelectZipFile}
            />

            {isImporting ? (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                  <span>{importStatus}</span>
                  <strong>{importProgress}%</strong>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${importProgress}%` }} />
                </div>
              </div>
            ) : null}

            <button
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', backgroundColor: 'var(--text-primary)' }}
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
            >
              {isImporting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Restoring Library...</span>
                </>
              ) : (
                <>
                  <Upload size={16} />
                  <span>Select enzo-library.zip</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Import Report Modal / Banner */}
      {importReport && (
        <div
          style={{
            marginTop: '2rem',
            padding: '1.25rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${importReport.success ? 'var(--accent-olive)' : 'var(--accent-burgundy)'}`,
            backgroundColor: 'var(--bg-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            {importReport.success ? (
              <CheckCircle size={20} style={{ color: 'var(--accent-olive)' }} />
            ) : (
              <AlertCircle size={20} style={{ color: 'var(--accent-burgundy)' }} />
            )}
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>
              {importReport.success ? 'Library Successfully Restored' : 'Import Incomplete'}
            </h4>
          </div>

          <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            {importReport.booksImported} new books added, {importReport.booksUpdated} books updated, and {importReport.journalEntriesImported} reflections restored.
          </p>

          {importReport.errors.length > 0 && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--accent-burgundy)' }}>
              {importReport.errors.map((e, idx) => (
                <div key={idx}>• {e}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transfer Individual Book Section */}
      {books.length > 0 && (
        <div
          style={{
            marginTop: '3.5rem',
            paddingTop: '2rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <BookDown size={18} style={{ color: 'var(--text-secondary)' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Download Individual Book</h3>
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Need just one file on your other device? Select a volume from your shelf to download its original ebook file.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', maxWidth: '520px', flexWrap: 'wrap' }}>
            <select
              value={selectedSingleBookId}
              onChange={(e) => setSelectedSingleBookId(e.target.value)}
              style={{ flex: 1, minWidth: '220px', padding: '0.45rem 0.75rem', fontSize: '0.88rem' }}
            >
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} — {b.author} ({b.format.toUpperCase()})
                </option>
              ))}
            </select>

            <button
              className="btn-minimal"
              onClick={handleExportSingle}
              disabled={isExportingSingle || !selectedSingleBookId}
            >
              <Download size={15} />
              <span>{isExportingSingle ? 'Exporting...' : 'Export File'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
