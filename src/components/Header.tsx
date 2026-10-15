import React, { useState, useEffect } from 'react';
import { BookOpen, Bookmark, RefreshCw, Settings, Plus, Download, WifiOff } from 'lucide-react';

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

  return (
    <header className="enzo-header">
      <div className="enzo-brand" onClick={() => onNavigate('library')}>
        <svg className="enzo-logo-mark" viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="6" fill="var(--bg-secondary)" stroke="var(--border-strong)" />
          <path d="M7 6 C10 5, 12 7, 14 8 C16 7, 18 5, 21 6 L21 19 C18 18, 16 19, 14 20 C12 19, 10 18, 7 19 Z" fill="var(--text-primary)" />
          <path d="M14 8 L14 20" stroke="var(--bg-secondary)" strokeWidth="1.2" />
        </svg>
        <div className="enzo-wordmark">
          enzo<span className="dot">.</span>
        </div>
      </div>

      <nav className="enzo-nav" aria-label="Main Navigation">
        <button
          className={`enzo-nav-btn ${currentView === 'library' ? 'active' : ''}`}
          onClick={() => onNavigate('library')}
        >
          <BookOpen size={16} />
          <span>Library</span>
        </button>

        <button
          className={`enzo-nav-btn ${currentView === 'journal' ? 'active' : ''}`}
          onClick={() => onNavigate('journal')}
        >
          <Bookmark size={16} />
          <span>Journal</span>
        </button>

        <button
          className={`enzo-nav-btn ${currentView === 'sync' ? 'active' : ''}`}
          onClick={() => onNavigate('sync')}
        >
          <RefreshCw size={16} />
          <span>Sync & Transfer</span>
        </button>

        <button
          className={`enzo-nav-btn ${currentView === 'settings' ? 'active' : ''}`}
          onClick={() => onNavigate('settings')}
          aria-label="Settings"
        >
          <Settings size={16} />
          <span>Settings</span>
        </button>
      </nav>

      <div className="enzo-header-actions">
        {!isOnline && (
          <div className="offline-pill" title="You are reading offline. Local library is fully accessible.">
            <WifiOff size={13} />
            <span>Offline</span>
          </div>
        )}

        {deferredPrompt && (
          <button className="btn-minimal" onClick={onInstallApp} title="Install enzo as a PWA">
            <Download size={14} />
            <span>Install</span>
          </button>
        )}

        <button className="btn-primary" onClick={onOpenImport}>
          <Plus size={15} />
          <span>Add Book</span>
        </button>
      </div>
    </header>
  );
};
