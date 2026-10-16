import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Bookmark,
  RefreshCw,
  Settings,
  Plus,
  Download,
  WifiOff,
  Menu,
  X,
  Search,
  Check,
  Sparkles,
} from 'lucide-react';
import type { Book, FilterOption } from '../types';

interface HeaderProps {
  currentView: 'library' | 'journal' | 'sync' | 'settings';
  onNavigate: (view: 'library' | 'journal' | 'sync' | 'settings') => void;
  onOpenImport: () => void;
  deferredPrompt: any;
  onInstallApp: () => void;
  books?: Book[];
  journalCount?: number;
  continueBook?: Book | null;
  onOpenReader?: (book: Book) => void;
  activeFilter?: FilterOption;
  onSelectFilter?: (filter: FilterOption) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  viewMode?: 'carousel' | 'grid';
  onToggleViewMode?: () => void;
  onSeedSampleLibrary?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  onOpenImport,
  deferredPrompt,
  onInstallApp,
  books = [],
  journalCount = 0,
  continueBook,
  onOpenReader,
  activeFilter = 'all',
  onSelectFilter,
  searchQuery = '',
  onSearchChange,
  viewMode = 'carousel',
  onToggleViewMode,
  onSeedSampleLibrary,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleNavClick = (view: 'library' | 'journal' | 'sync' | 'settings') => {
    onNavigate(view);
    setIsMenuOpen(false);
  };

  const inProgressCount = books.filter((b) => b.progress > 0 && b.progress < 100).length;
  const completedCount = books.filter((b) => b.progress === 100).length;

  return (
    <>
      <header className="enzo-header">
        {/* Left: Sword Emblem (toggles carousel / grid view) */}
        <button
          className="header-sword-btn"
          onClick={onToggleViewMode}
          title={viewMode === 'carousel' ? 'Switch to Grid View' : 'Switch to Carousel View'}
          aria-label="Toggle Library View"
        >
          <img
            src="/sword.png"
            alt="Toggle View"
            className="header-sword-img"
          />
        </button>

        {/* Center: enzo Logo */}
        <div className="enzo-brand" onClick={() => onNavigate('library')} title="enzo - 724">
          <img
            src="/enzo_logo.png"
            alt="enzo"
            className="enzo-brand-logo"
          />
        </div>

        {/* Right: Circular Hamburger Button */}
        <div className="enzo-header-actions">
          {!isOnline && (
            <div className="offline-pill" title="You are reading offline. Local library is fully accessible.">
              <WifiOff size={13} />
            </div>
          )}

          <button
            className="hamburger-btn"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Open Navigation Menu, Filters & Resume"
            title="Menu & Filters"
          >
            <Menu size={18} />
          </button>
        </div>
      </header>

      {/* Comprehensive Hamburger Navigation & Library Drawer */}
      {isMenuOpen && (
        <div className="modal-overlay" onClick={() => setIsMenuOpen(false)}>
          <aside className="side-drawer drawer-right" onClick={(e) => e.stopPropagation()}>
            {/* Drawer Header */}
            <div className="drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <img
                  src="/enzo_logo.png"
                  alt="enzo"
                  style={{ height: '22px', width: 'auto' }}
                  className="enzo-brand-logo"
                />
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setIsMenuOpen(false)}
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            <div className="drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
              
              {/* 1. RESUME / CONTINUE READING SECTION */}
              {continueBook && onOpenReader && (
                <div className="drawer-section">
                  <div className="drawer-section-label">Resume Reading</div>
                  <div
                    className="drawer-resume-card"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenReader(continueBook);
                    }}
                  >
                    {continueBook.coverUrl ? (
                      <img
                        src={continueBook.coverUrl}
                        alt={continueBook.title}
                        className="drawer-resume-thumb"
                      />
                    ) : (
                      <div className="drawer-resume-thumb-placeholder font-deutsch">
                        {continueBook.title.substring(0, 2)}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 className="drawer-resume-title">{continueBook.title}</h4>
                      <p className="drawer-resume-author">by {continueBook.author}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                        <div className="progress-bar-track" style={{ flex: 1, height: '4px' }}>
                          <div className="progress-bar-fill" style={{ width: `${continueBook.progress}%` }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-active)' }}>
                          {continueBook.progress}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. HOW MANY READS (READING STATS) */}
              <div className="drawer-section">
                <div className="drawer-section-label">Reading Statistics</div>
                <div className="drawer-stats-grid">
                  <div className="drawer-stat-item">
                    <span className="drawer-stat-num font-deutsch">{books.length}</span>
                    <span className="drawer-stat-label">Volumes</span>
                  </div>
                  <div className="drawer-stat-item">
                    <span className="drawer-stat-num font-deutsch">{inProgressCount}</span>
                    <span className="drawer-stat-label">In Progress</span>
                  </div>
                  <div className="drawer-stat-item">
                    <span className="drawer-stat-num font-deutsch">{completedCount}</span>
                    <span className="drawer-stat-label">Finished</span>
                  </div>
                  <div className="drawer-stat-item">
                    <span className="drawer-stat-num font-deutsch">{journalCount}</span>
                    <span className="drawer-stat-label">Quotes</span>
                  </div>
                </div>
              </div>

              {/* 3. SEE ALL FILTERED & SEARCH */}
              {onSelectFilter && onSearchChange && (
                <div className="drawer-section">
                  <div className="drawer-section-label">Filter & Search</div>
                  
                  {/* Search Input */}
                  <div className="search-box" style={{ width: '100%', marginBottom: '0.75rem' }}>
                    <Search size={14} style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Search title, author..."
                      value={searchQuery}
                      onChange={(e) => onSearchChange(e.target.value)}
                      style={{ fontSize: '0.85rem' }}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => onSearchChange('')}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Filter Pills */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {[
                      { id: 'all', label: `All (${books.length})` },
                      { id: 'reading', label: `Reading (${inProgressCount})` },
                      { id: 'completed', label: `Completed (${completedCount})` },
                      { id: 'epub', label: 'EPUB' },
                      { id: 'pdf', label: 'PDF' },
                      { id: 'txt', label: 'TXT' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        className={`drawer-filter-pill ${activeFilter === f.id ? 'active' : ''}`}
                        onClick={() => onSelectFilter(f.id as FilterOption)}
                      >
                        <span>{f.label}</span>
                        {activeFilter === f.id && <Check size={12} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. ACTIONS & VIEW TOGGLE */}
              <div className="drawer-section">
                <div className="drawer-section-label">Library Actions</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button
                    className="btn-primary"
                    style={{ width: '100%', justifyContent: 'center', gap: '0.5rem' }}
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenImport();
                    }}
                  >
                    <Plus size={16} />
                    <span>Import New Book</span>
                  </button>

                  {onToggleViewMode && (
                    <button
                      className="btn-minimal"
                      style={{ width: '100%', justifyContent: 'center', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-btn)' }}
                      onClick={onToggleViewMode}
                    >
                      <span>Display: {viewMode === 'carousel' ? 'Pocket Carousel' : 'Cover Grid'}</span>
                    </button>
                  )}

                  {onSeedSampleLibrary && (
                    <button
                      className="btn-minimal"
                      style={{ width: '100%', justifyContent: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}
                      onClick={() => {
                        onSeedSampleLibrary();
                        setIsMenuOpen(false);
                      }}
                    >
                      <Sparkles size={14} />
                      <span>Load 3 Sample Books</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 5. NAVIGATION LINKS */}
              <div className="drawer-section" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                <nav className="hamburger-nav-list">
                  <button
                    className={`hamburger-nav-item ${currentView === 'library' ? 'active' : ''}`}
                    onClick={() => handleNavClick('library')}
                  >
                    <BookOpen size={18} />
                    <span>Library</span>
                  </button>

                  <button
                    className={`hamburger-nav-item ${currentView === 'journal' ? 'active' : ''}`}
                    onClick={() => handleNavClick('journal')}
                  >
                    <Bookmark size={18} />
                    <span>Journal Reflections</span>
                  </button>

                  <button
                    className={`hamburger-nav-item ${currentView === 'sync' ? 'active' : ''}`}
                    onClick={() => handleNavClick('sync')}
                  >
                    <RefreshCw size={18} />
                    <span>Sync & Transfer</span>
                  </button>

                  <button
                    className={`hamburger-nav-item ${currentView === 'settings' ? 'active' : ''}`}
                    onClick={() => handleNavClick('settings')}
                  >
                    <Settings size={18} />
                    <span>Settings</span>
                  </button>

                  {deferredPrompt && (
                    <button
                      className="btn-minimal"
                      style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
                      onClick={() => {
                        onInstallApp();
                        setIsMenuOpen(false);
                      }}
                    >
                      <Download size={15} />
                      <span>Install enzo PWA</span>
                    </button>
                  )}
                </nav>
              </div>

              {/* Footer */}
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', paddingTop: '1rem' }}>
                <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
                  enzo - 724
                </p>
                <p>Personal Digital Library</p>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
