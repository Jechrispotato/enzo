import React from 'react';
import { X, AlignLeft, AlignJustify, Type } from 'lucide-react';
import type { ReaderSettings, ReaderTheme, ReaderFontFamily, ReaderColumnWidth, ReaderPageMargins } from '../../types';

interface ReaderSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ReaderSettings;
  onUpdateSettings: (newSettings: Partial<ReaderSettings>) => void;
}

export const ReaderSettingsDrawer: React.FC<ReaderSettingsDrawerProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const themes: Array<{ id: ReaderTheme; label: string; bg: string; color: string; border: string }> = [
    { id: 'paper', label: 'Warm Paper', bg: '#fbf8f2', color: '#1f1e1b', border: '#e6dfd5' },
    { id: 'white', label: 'Pure White', bg: '#ffffff', color: '#1a1a1a', border: '#e5e5e5' },
    { id: 'sepia', label: 'Sepia', bg: '#f4edd8', color: '#2d2315', border: '#ddd0b2' },
    { id: 'dark', label: 'Dark Ink', bg: '#141413', color: '#ece8df', border: '#2a2a26' },
  ];

  const fonts: Array<{ id: ReaderFontFamily; label: string; sample: string }> = [
    { id: 'newsreader', label: 'Newsreader', sample: 'Literary Serif' },
    { id: 'garamond', label: 'EB Garamond', sample: 'Classical Book' },
    { id: 'sans', label: 'Jakarta Sans', sample: 'Modern Sans' },
    { id: 'dyslexic', label: 'Dyslexic / Clear', sample: 'High Legibility' },
  ];

  const columnWidths: Array<{ id: ReaderColumnWidth; label: string }> = [
    { id: 'narrow', label: 'Narrow' },
    { id: 'medium', label: 'Medium' },
    { id: 'wide', label: 'Wide' },
    { id: 'full', label: 'Full' },
  ];

  const margins: Array<{ id: ReaderPageMargins; label: string }> = [
    { id: 'compact', label: 'Compact' },
    { id: 'normal', label: 'Normal' },
    { id: 'generous', label: 'Generous' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <aside className="side-drawer drawer-right" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
            <Type size={16} />
            <span>Reading Preferences</span>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close settings">
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body">
          {/* Themes */}
          <div className="setting-group">
            <div className="setting-label">Background Theme</div>
            <div className="theme-options-grid">
              {themes.map((t) => (
                <button
                  key={t.id}
                  className={`theme-option-btn ${settings.theme === t.id ? 'active' : ''}`}
                  style={{ backgroundColor: t.bg, color: t.color, borderColor: t.border }}
                  onClick={() => onUpdateSettings({ theme: t.id })}
                >
                  <span className="theme-swatch" style={{ backgroundColor: t.bg }} />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Typography */}
          <div className="setting-group">
            <div className="setting-label">Typeface</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {fonts.map((f) => (
                <button
                  key={f.id}
                  className="btn-minimal"
                  style={{
                    justifyContent: 'space-between',
                    borderColor: settings.fontFamily === f.id ? 'var(--accent-active)' : 'var(--border-subtle)',
                    backgroundColor: settings.fontFamily === f.id ? 'var(--bg-secondary)' : 'transparent',
                    fontWeight: settings.fontFamily === f.id ? 600 : 400,
                  }}
                  onClick={() => onUpdateSettings({ fontFamily: f.id })}
                >
                  <span>{f.label}</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{f.sample}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div className="setting-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <span className="setting-label" style={{ margin: 0 }}>Font Size</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{settings.fontSize}px</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>A</span>
              <input
                type="range"
                min="14"
                max="26"
                step="1"
                value={settings.fontSize}
                onChange={(e) => onUpdateSettings({ fontSize: parseInt(e.target.value, 10) })}
                style={{ flex: 1, accentColor: 'var(--accent-active)' }}
              />
              <span style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>A</span>
            </div>
          </div>

          {/* Line Spacing */}
          <div className="setting-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <span className="setting-label" style={{ margin: 0 }}>Line Spacing</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{settings.lineSpacing.toFixed(1)}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
              {[1.4, 1.6, 1.8, 2.0].map((lh) => (
                <button
                  key={lh}
                  className="btn-minimal"
                  style={{
                    justifyContent: 'center',
                    borderColor: settings.lineSpacing === lh ? 'var(--accent-active)' : 'var(--border-subtle)',
                    backgroundColor: settings.lineSpacing === lh ? 'var(--bg-secondary)' : 'transparent',
                  }}
                  onClick={() => onUpdateSettings({ lineSpacing: lh })}
                >
                  {lh.toFixed(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Text Alignment */}
          <div className="setting-group">
            <div className="setting-label">Alignment</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button
                className="btn-minimal"
                style={{
                  justifyContent: 'center',
                  borderColor: settings.textAlign === 'left' ? 'var(--accent-active)' : 'var(--border-subtle)',
                  backgroundColor: settings.textAlign === 'left' ? 'var(--bg-secondary)' : 'transparent',
                }}
                onClick={() => onUpdateSettings({ textAlign: 'left' })}
              >
                <AlignLeft size={16} />
                <span>Left</span>
              </button>
              <button
                className="btn-minimal"
                style={{
                  justifyContent: 'center',
                  borderColor: settings.textAlign === 'justify' ? 'var(--accent-active)' : 'var(--border-subtle)',
                  backgroundColor: settings.textAlign === 'justify' ? 'var(--bg-secondary)' : 'transparent',
                }}
                onClick={() => onUpdateSettings({ textAlign: 'justify' })}
              >
                <AlignJustify size={16} />
                <span>Justified</span>
              </button>
            </div>
          </div>

          {/* Column Width */}
          <div className="setting-group">
            <div className="setting-label">Column Width</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem' }}>
              {columnWidths.map((cw) => (
                <button
                  key={cw.id}
                  className="btn-minimal"
                  style={{
                    justifyContent: 'center',
                    fontSize: '0.78rem',
                    padding: '0.4rem 0.2rem',
                    borderColor: settings.columnWidth === cw.id ? 'var(--accent-active)' : 'var(--border-subtle)',
                    backgroundColor: settings.columnWidth === cw.id ? 'var(--bg-secondary)' : 'transparent',
                  }}
                  onClick={() => onUpdateSettings({ columnWidth: cw.id })}
                >
                  {cw.label}
                </button>
              ))}
            </div>
          </div>

          {/* Page Margins */}
          <div className="setting-group">
            <div className="setting-label">Page Margins</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
              {margins.map((m) => (
                <button
                  key={m.id}
                  className="btn-minimal"
                  style={{
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    borderColor: settings.pageMargins === m.id ? 'var(--accent-active)' : 'var(--border-subtle)',
                    backgroundColor: settings.pageMargins === m.id ? 'var(--bg-secondary)' : 'transparent',
                  }}
                  onClick={() => onUpdateSettings({ pageMargins: m.id })}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};
