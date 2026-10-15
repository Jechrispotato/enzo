import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  ShieldCheck,
  Download,
  Trash2,
  Smartphone,
} from 'lucide-react';
import { getStorageStats, requestPersistentStorage, clearEntireLibrary } from '../../services/db';
import type { StorageStats } from '../../types';

interface SettingsViewProps {
  onLibraryReset: () => void;
  deferredPrompt: any;
  onInstallApp: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onLibraryReset,
  deferredPrompt,
  onInstallApp,
}) => {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [persisting, setPersisting] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    getStorageStats().then(setStats);

    const isApp = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(isApp);
  }, []);

  const handleRequestPersistence = async () => {
    setPersisting(true);
    const granted = await requestPersistentStorage();
    const updated = await getStorageStats();
    setStats(updated);
    setPersisting(false);
    if (granted) {
      alert('Persistent storage granted. The browser will not automatically clear your library during routine cleanup.');
    } else {
      alert('The browser could not grant permanent storage exemption, but books remain safely stored in your IndexedDB.');
    }
  };

  const handleClearAll = async () => {
    await clearEntireLibrary();
    onLibraryReset();
    const updated = await getStorageStats();
    setStats(updated);
    setIsConfirmingClear(false);
  };

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <div className="library-greeting-subtitle">Configuration & Privacy</div>
        <h1 className="library-greeting-title" style={{ fontSize: '2rem' }}>
          Settings & Storage
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.2rem' }}>
          Manage your local library storage, PWA installation, and device retention.
        </p>
      </div>

      {/* Storage Management Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1.75rem',
          marginBottom: '2rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          <HardDrive size={20} style={{ color: 'var(--accent-active)' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Local Browser Storage</h3>
        </div>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
          All your imported ebook files and reading records are saved in your device's <strong>IndexedDB</strong>. Nothing is ever sent to a remote server.
        </p>

        {stats && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
              <span>Space Used by enzo</span>
              <strong>{stats.usageMB} MB {stats.quotaMB > 0 ? `of ${stats.quotaMB} MB` : ''}</strong>
            </div>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${Math.max(2, stats.percentUsed)}%` }} />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldCheck size={16} style={{ color: stats?.isPersistent ? 'var(--accent-olive)' : 'var(--text-muted)' }} />
              <span>Storage Status: {stats?.isPersistent ? 'Persistent (Protected)' : 'Best-Effort (Standard)'}</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Requesting persistent storage prevents the browser from evicting books when device storage runs low.
            </p>
          </div>

          {!stats?.isPersistent && (
            <button
              className="btn-minimal"
              onClick={handleRequestPersistence}
              disabled={persisting}
            >
              {persisting ? 'Requesting...' : 'Request Protection'}
            </button>
          )}
        </div>
      </div>

      {/* Progressive Web App Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1.75rem',
          marginBottom: '2rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          <Smartphone size={20} style={{ color: 'var(--accent-active)' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>PWA & Offline Capability</h3>
        </div>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
          enzo is an installable Progressive Web App. Once installed to your home screen or desktop dock, it opens full-screen like a native reading app and functions seamlessly without an active internet connection.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            App Mode: <strong>{isStandalone ? 'Installed Standalone App' : 'Web Browser Tab'}</strong>
          </div>

          {deferredPrompt && (
            <button className="btn-primary" onClick={onInstallApp}>
              <Download size={15} />
              <span>Install enzo PWA</span>
            </button>
          )}
        </div>
      </div>

      {/* Dangerous Reset Area */}
      <div
        style={{
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1.5rem',
          marginBottom: '2.5rem',
        }}
      >
        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent-burgundy)', marginBottom: '0.4rem' }}>
          Reset Local Library
        </h4>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
          Permanently delete all stored books, reading progress, and journal notes from this browser. This cannot be undone. Be sure to export your library first if you wish to keep your notes.
        </p>

        {!isConfirmingClear ? (
          <button
            className="btn-minimal"
            style={{ color: 'var(--accent-burgundy)' }}
            onClick={() => setIsConfirmingClear(true)}
          >
            <Trash2 size={14} />
            <span>Clear Library</span>
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button
              className="btn-primary"
              style={{ backgroundColor: 'var(--accent-burgundy)' }}
              onClick={handleClearAll}
            >
              Yes, Delete All Books
            </button>
            <button className="btn-minimal" onClick={() => setIsConfirmingClear(false)}>
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* About enzo */}
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', padding: '1rem 0' }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
          enzo — A quiet, intimate digital reading sanctuary.
        </p>
        <p>Zero backend • No subscriptions • Zero tracking • Pure local privacy</p>
      </div>
    </div>
  );
};
