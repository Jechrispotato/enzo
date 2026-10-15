import React, { useState } from 'react';
import {
  ArrowLeft,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Check,
} from 'lucide-react';
import type { Book, ReaderSettings, TocItem } from '../../types';

interface SwordMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book;
  activeTitle: string;
  currentIndex: number;
  totalItems: number;
  toc: TocItem[];
  settings: ReaderSettings;
  onUpdateSettings: (newProps: Partial<ReaderSettings>) => void;
  onSelectChapter: (index: number) => void;
  onBackToLibrary: () => void;
  isImmersive: boolean;
  onToggleImmersive: () => void;
}

export const SwordMenuModal: React.FC<SwordMenuModalProps> = ({
  isOpen,
  onClose,
  book,
  activeTitle,
  currentIndex,
  totalItems,
  toc,
  settings,
  onUpdateSettings,
  onSelectChapter,
  onBackToLibrary,
  isImmersive,
  onToggleImmersive,
}) => {
  const [activeTab, setActiveTab] = useState<'progress' | 'toc' | 'settings'>('progress');

  if (!isOpen) return null;

  const currentPercent = totalItems > 0 ? Math.round(((currentIndex + 1) / totalItems) * 100) : 0;

  return (
    <div className="sword-modal-backdrop" onClick={onClose}>
      <div
        className="sword-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Reading options and settings"
      >
        {/* Top Header */}
        <div className="sword-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <img
              src="/sword.png"
              alt="Sword emblem"
              className="reader-sword-img"
              style={{ height: '18px', width: 'auto' }}
            />
            <span
              style={{
                fontFamily: 'var(--font-serif)',
                fontWeight: 600,
                fontSize: '1rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '220px',
              }}
            >
              {book.title}
            </span>
          </div>

          <button
            className="btn-icon"
            onClick={onClose}
            aria-label="Close menu"
            style={{ borderRadius: 'var(--radius-btn)', padding: '0.4rem' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Back to Library Button (Primary Action) */}
        <div style={{ padding: '0 1.25rem 0.75rem' }}>
          <button
            className="btn-sword-back"
            onClick={() => {
              onClose();
              onBackToLibrary();
            }}
          >
            <ArrowLeft size={16} />
            <span>Return to Library</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="sword-modal-tabs">
          <button
            className={`sword-tab-btn ${activeTab === 'progress' ? 'active' : ''}`}
            onClick={() => setActiveTab('progress')}
          >
            Progress
          </button>
          <button
            className={`sword-tab-btn ${activeTab === 'toc' ? 'active' : ''}`}
            onClick={() => setActiveTab('toc')}
          >
            Chapters ({toc.length || totalItems})
          </button>
          <button
            className={`sword-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Appearance
          </button>
        </div>

        {/* Tab Content */}
        <div className="sword-modal-body">
          {/* 1. PROGRESS TAB */}
          {activeTab === 'progress' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="sword-progress-display">
                <div className="font-deutsch sword-progress-number">
                  {currentIndex + 1} / {totalItems}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  {activeTitle || `Chapter ${currentIndex + 1}`}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--accent-active)', fontWeight: 600, marginTop: '0.25rem' }}>
                  {currentPercent}% completed
                </div>
              </div>

              {/* Slider scrubber */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>Start (1)</span>
                  <span>End ({totalItems})</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, totalItems - 1)}
                  value={currentIndex}
                  onChange={(e) => onSelectChapter(parseInt(e.target.value, 10))}
                  className="sword-scrubber"
                />
              </div>

              {/* Prev / Next Steppers */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  className="btn-minimal sword-nav-btn"
                  onClick={() => {
                    if (currentIndex > 0) onSelectChapter(currentIndex - 1);
                  }}
                  disabled={currentIndex === 0}
                  style={{ flex: 1, opacity: currentIndex === 0 ? 0.35 : 1 }}
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>
                <button
                  className="btn-minimal sword-nav-btn"
                  onClick={() => {
                    if (currentIndex < totalItems - 1) onSelectChapter(currentIndex + 1);
                  }}
                  disabled={currentIndex >= totalItems - 1}
                  style={{ flex: 1, opacity: currentIndex >= totalItems - 1 ? 0.35 : 1 }}
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Distraction free toggle */}
              <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  className="btn-minimal"
                  onClick={onToggleImmersive}
                  style={{ width: '100%', justifyContent: 'center', gap: '0.5rem', padding: '0.6rem' }}
                >
                  {isImmersive ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  <span>{isImmersive ? 'Exit Distraction-Free Mode' : 'Distraction-Free Mode'}</span>
                </button>
              </div>
            </div>
          )}

          {/* 2. TABLE OF CONTENTS TAB */}
          {activeTab === 'toc' && (
            <div className="sword-toc-list">
              {toc.length > 0 ? (
                toc.map((item, idx) => {
                  const isActive = idx === currentIndex;
                  return (
                    <button
                      key={item.id || idx}
                      className={`sword-toc-item ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        onSelectChapter(idx);
                        onClose();
                      }}
                    >
                      <span className="sword-toc-number font-deutsch">{idx + 1}</span>
                      <span className="sword-toc-title">{item.title || `Chapter ${idx + 1}`}</span>
                      {isActive && <Check size={16} className="sword-toc-check" />}
                    </button>
                  );
                })
              ) : (
                Array.from({ length: totalItems }).map((_, idx) => {
                  const isActive = idx === currentIndex;
                  return (
                    <button
                      key={idx}
                      className={`sword-toc-item ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        onSelectChapter(idx);
                        onClose();
                      }}
                    >
                      <span className="sword-toc-number font-deutsch">{idx + 1}</span>
                      <span className="sword-toc-title">Section {idx + 1}</span>
                      {isActive && <Check size={16} className="sword-toc-check" />}
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* 3. SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Theme Selection */}
              <div>
                <label className="sword-setting-label">Theme</label>
                <div className="sword-theme-grid">
                  {[
                    { id: 'paper', name: 'Warm Paper', bg: '#fbf8f2', text: '#1f1e1b' },
                    { id: 'white', name: 'Pure White', bg: '#ffffff', text: '#1a1a1a' },
                    { id: 'sepia', name: 'Sepia', bg: '#f4edd8', text: '#2d2315' },
                    { id: 'dark', name: 'Dark Ink', bg: '#141413', text: '#ece8df' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      className={`sword-theme-pill ${settings.theme === t.id ? 'active' : ''}`}
                      onClick={() => onUpdateSettings({ theme: t.id as any })}
                      style={{ backgroundColor: t.bg, color: t.text }}
                    >
                      <span>{t.name}</span>
                      {settings.theme === t.id && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Typography */}
              <div>
                <label className="sword-setting-label">Font Family</label>
                <div className="sword-options-row">
                  {[
                    { id: 'newsreader', label: 'Newsreader', font: 'var(--font-serif)' },
                    { id: 'garamond', label: 'Garamond', font: 'var(--font-serif-classic)' },
                    { id: 'sans', label: 'Sans', font: 'var(--font-sans)' },
                    { id: 'dyslexic', label: 'Dyslexic', font: 'var(--font-dyslexic)' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      className={`sword-pill-btn ${settings.fontFamily === f.id ? 'active' : ''}`}
                      style={{ fontFamily: f.font }}
                      onClick={() => onUpdateSettings({ fontFamily: f.id as any })}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <label className="sword-setting-label" style={{ margin: 0 }}>Font Size</label>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{settings.fontSize}px</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    className="sword-stepper-btn"
                    onClick={() => onUpdateSettings({ fontSize: Math.max(14, settings.fontSize - 1) })}
                  >
                    A-
                  </button>
                  <input
                    type="range"
                    min="14"
                    max="28"
                    value={settings.fontSize}
                    onChange={(e) => onUpdateSettings({ fontSize: parseInt(e.target.value, 10) })}
                    className="sword-scrubber"
                  />
                  <button
                    className="sword-stepper-btn"
                    onClick={() => onUpdateSettings({ fontSize: Math.min(28, settings.fontSize + 1) })}
                  >
                    A+
                  </button>
                </div>
              </div>

              {/* Line Spacing */}
              <div>
                <label className="sword-setting-label">Line Spacing</label>
                <div className="sword-options-row">
                  {[
                    { val: 1.4, label: 'Compact' },
                    { val: 1.7, label: 'Normal' },
                    { val: 2.0, label: 'Relaxed' },
                  ].map((ls) => (
                    <button
                      key={ls.val}
                      className={`sword-pill-btn ${settings.lineSpacing === ls.val ? 'active' : ''}`}
                      onClick={() => onUpdateSettings({ lineSpacing: ls.val })}
                    >
                      {ls.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Margins */}
              <div>
                <label className="sword-setting-label">Page Margins</label>
                <div className="sword-options-row">
                  {[
                    { id: 'compact', label: 'Compact' },
                    { id: 'normal', label: 'Normal' },
                    { id: 'generous', label: 'Generous' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      className={`sword-pill-btn ${settings.pageMargins === m.id ? 'active' : ''}`}
                      onClick={() => onUpdateSettings({ pageMargins: m.id as any })}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
