import React from 'react';
import { X, List } from 'lucide-react';
import type { TocItem } from '../../types';

interface TocDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  toc: TocItem[];
  activeChapterHref?: string;
  activeChapterIndex?: number;
  onSelectChapter: (href: string, index: number) => void;
}

export const TocDrawer: React.FC<TocDrawerProps> = ({
  isOpen,
  onClose,
  toc,
  activeChapterHref,
  activeChapterIndex,
  onSelectChapter,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <aside className="side-drawer drawer-left" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
            <List size={16} />
            <span>Table of Contents ({toc.length})</span>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close table of contents">
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body" style={{ padding: '0.75rem 0' }}>
          {toc.length === 0 ? (
            <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>
              No explicit table of contents found.
            </div>
          ) : (
            <div className="toc-list">
              {toc.map((item, idx) => {
                const isActive =
                  (activeChapterHref && item.href.split('#')[0] === activeChapterHref.split('#')[0]) ||
                  activeChapterIndex === idx;

                return (
                  <button
                    key={item.href + '_' + idx}
                    className={`toc-item-btn ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      onSelectChapter(item.href, idx);
                      onClose();
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', minWidth: '18px' }}>
                        {idx + 1}.
                      </span>
                      <span style={{ flex: 1 }}>{item.title || `Chapter ${idx + 1}`}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
