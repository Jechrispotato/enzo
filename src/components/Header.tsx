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
      <div className="enzo-brand" onClick={() => onNavigate('library')} title="enzo - 724">
        <img
          src="/enzo_logo.png"
          alt="enzo - 724"
          className="enzo-brand-logo"
        />
        <span className="enzo-brand-tagline">724</span>
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
