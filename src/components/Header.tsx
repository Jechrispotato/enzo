import React, { useState, useEffect } from 'react';
import { BookOpen, Bookmark, RefreshCw, Settings, Plus, Download, WifiOff, Menu, X } from 'lucide-react';

interface HeaderProps {
  currentView: 'library' | 'journal' | 'sync' | 'settings';
  onNavigate: (view: 'library' | 'journal' | 'sync' | 'settings') => void;
  onOpenImport: () => void;
  deferredPrompt: any;
  onInstallApp: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  onOpenImport,
  deferredPrompt,
  onInstallApp,
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

  return (
    <>
      <header className="enzo-header">
        <div className="enzo-brand" onClick={() => onNavigate('library')} title="enzo - 724">
          <img
            src="/enzo_logo.png"
            alt="enzo"
            className="enzo-brand-logo"
          />
        </div>

        <div className="enzo-header-actions">
          {!isOnline && (
            <div className="offline-pill" title="You are reading offline. Local library is fully accessible.">
              <WifiOff size={13} />
              <span>Offline</span>
            </div>
          )}

          <button className="btn-primary" onClick={onOpenImport}>
            <Plus size={16} />
            <span>Add Book</span>
          </button>

          <button
            className="hamburger-btn"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Open Navigation Menu"
            title="Menu"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* Hamburger Navigation Drawer */}
      {isMenuOpen && (
        <div className="modal-overlay" onClick={() => setIsMenuOpen(false)}>
          <aside className="side-drawer drawer-right" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <img
                  src="/enzo_logo.png"
                  alt="enzo"
                  style={{ height: '24px', width: 'auto' }}
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

            <div className="drawer-body" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
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
                  <span>Journal</span>
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
                  <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
                    <button
                      className="btn-minimal"
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={() => {
                        onInstallApp();
                        setIsMenuOpen(false);
                      }}
                    >
                      <Download size={15} />
                      <span>Install enzo PWA</span>
                    </button>
                  </div>
                )}
              </nav>

              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', paddingTop: '2rem' }}>
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
