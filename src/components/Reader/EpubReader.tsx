import React, { useState, useEffect, useRef } from 'react';
import { parseEpubFile, type ParsedEpub } from '../../services/parsers/epubParser';
import { updateBookProgress } from '../../services/db';
import type { Book, ReaderSettings, TocItem } from '../../types';
import { ChevronLeft, ChevronRight, Bookmark, Loader2 } from 'lucide-react';

interface EpubReaderProps {
  book: Book;
  fileBlob: Blob;
  settings: ReaderSettings;
  chapterIndex?: number;
  onTocLoaded: (toc: TocItem[]) => void;
  onActiveChapterChange: (title: string, index: number, total: number) => void;
  onQuoteRequested: (text: string, chapterTitle: string) => void;
  onToggleImmersive: () => void;
}

export const EpubReader: React.FC<EpubReaderProps> = ({
  book,
  fileBlob,
  settings,
  chapterIndex: externalChapterIndex,
  onTocLoaded,
  onActiveChapterChange,
  onQuoteRequested,
  onToggleImmersive,
}) => {
  const [parsed, setParsed] = useState<ParsedEpub | null>(null);
  const [chapterIndex, setChapterIndex] = useState<number>(
    externalChapterIndex !== undefined ? externalChapterIndex : (book.currentLocation?.chapterIndex || 0)
  );
  const [chapterContent, setChapterContent] = useState<{ html: string; title: string }>({ html: '', title: '' });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sync external chapterIndex when passed from TOC
  useEffect(() => {
    if (externalChapterIndex !== undefined && externalChapterIndex !== chapterIndex) {
      setChapterIndex(externalChapterIndex);
    }
  }, [externalChapterIndex]);
  
  // Selection popup state
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionCoords, setSelectionCoords] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Parse EPUB on mount
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    parseEpubFile(fileBlob)
      .then((res) => {
        if (isCancelled) {
          res.cleanup();
          return;
        }
        setParsed(res);
        onTocLoaded(res.toc);

        // Find initial chapter
        let initialIdx = 0;
        if (book.currentLocation?.chapterIndex !== undefined && book.currentLocation.chapterIndex < res.spine.length) {
          initialIdx = book.currentLocation.chapterIndex;
        } else if (book.currentLocation?.chapterHref) {
          const matched = res.spine.findIndex((s) => s.href.split('#')[0] === book.currentLocation?.chapterHref?.split('#')[0]);
          if (matched !== -1) initialIdx = matched;
        }

        setChapterIndex(initialIdx);
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error('EPUB parse error', err);
          setError(err.message || 'Could not parse EPUB');
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [fileBlob]);

  // 2. Load Chapter whenever chapterIndex changes
  useEffect(() => {
    if (!parsed || parsed.spine.length === 0) return;

    const safeIndex = Math.max(0, Math.min(chapterIndex, parsed.spine.length - 1));
    const spineItem = parsed.spine[safeIndex];

    setIsLoading(true);
    parsed.loadChapter(spineItem.href)
      .then((res) => {
        setChapterContent(res);
        setIsLoading(false);
        onActiveChapterChange(res.title, safeIndex, parsed.spine.length);

        // Calculate progress
        const overallProgress = Math.round(((safeIndex + 1) / parsed.spine.length) * 100);
        updateBookProgress(book.id, overallProgress, {
          chapterIndex: safeIndex,
          chapterHref: spineItem.href,
          chapterTitle: res.title,
        });

        // Scroll to top of new chapter
        window.scrollTo({ top: 0, behavior: 'instant' });
      })
      .catch((err) => {
        console.error('Error loading chapter', err);
        setError(`Failed to load chapter: ${err.message}`);
        setIsLoading(false);
      });
  }, [parsed, chapterIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        goToNextChapter();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        goToPrevChapter();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [parsed, chapterIndex]);

  const goToNextChapter = () => {
    if (parsed && chapterIndex < parsed.spine.length - 1) {
      setChapterIndex((prev) => prev + 1);
    }
  };

  const goToPrevChapter = () => {
    if (chapterIndex > 0) {
      setChapterIndex((prev) => prev - 1);
    }
  };

  // Intercept clicks on links inside chapter
  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // Check if clicked an internal link
    const link = target.closest('a');
    if (link) {
      const chapterTarget = link.getAttribute('data-chapter-target');
      const internalAnchor = link.getAttribute('data-internal-anchor');

      if (chapterTarget && parsed) {
        e.preventDefault();
        const targetClean = chapterTarget.split('#')[0];
        const matchedIdx = parsed.spine.findIndex((s) => s.href.split('#')[0] === targetClean);
        if (matchedIdx !== -1) {
          setChapterIndex(matchedIdx);
          return;
        }
      }

      if (internalAnchor) {
        e.preventDefault();
        const anchorEl = document.getElementById(internalAnchor) || document.querySelector(`[name="${internalAnchor}"]`);
        if (anchorEl) {
          anchorEl.scrollIntoView({ behavior: 'smooth' });
          return;
        }
      }
    }

    // If click was not on a selection or link, and not text selection in progress, toggle immersive mode on desktop / mobile
    const sel = window.getSelection();
    if (!sel || sel.toString().trim().length === 0) {
      // If user tapped cleanly on empty space
      if (target === containerRef.current || target.classList.contains('reader-body') || target.tagName === 'P') {
        // Debounced or direct toggle
        onToggleImmersive();
      }
    }
  };

  // Handle text selection for saving quotes
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setSelectedText('');
      setSelectionCoords(null);
      return;
    }

    const text = selection.toString().trim();
    if (text.length >= 3) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectedText(text);
      setSelectionCoords({
        x: rect.left + rect.width / 2,
        y: rect.top + window.scrollY,
      });
    } else {
      setSelectedText('');
      setSelectionCoords(null);
    }
  };

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
        <h3 style={{ color: 'var(--accent-burgundy)', marginBottom: '1rem' }}>Could not read book</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
        <button className="btn-primary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  const spineLength = parsed?.spine.length || 1;

  return (
    <div
      ref={containerRef}
      className="reader-body"
      onClick={handleContentClick}
      onMouseUp={handleMouseUp}
      onTouchEnd={handleMouseUp}
    >
      {/* Selection Popover */}
      {selectedText && selectionCoords && (
        <div
          className="selection-popover"
          style={{
            left: `${selectionCoords.x}px`,
            top: `${selectionCoords.y}px`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onQuoteRequested(selectedText, chapterContent.title);
            setSelectedText('');
            setSelectionCoords(null);
          }}
        >
          <Bookmark size={14} />
          <span>Save Quote</span>
        </div>
      )}

      <div
        className={`reader-prose-wrapper width-${settings.columnWidth} margin-${settings.pageMargins}`}
      >
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '1rem', color: 'var(--text-secondary)' }}>
            <Loader2 size={32} className="animate-spin" />
            <p style={{ fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>Preparing chapter...</p>
          </div>
        ) : (
          <>
            <article
              className={`reader-prose font-${settings.fontFamily} align-${settings.textAlign}`}
              style={{
                fontSize: `${settings.fontSize}px`,
                lineHeight: settings.lineSpacing,
              }}
              dangerouslySetInnerHTML={{ __html: chapterContent.html }}
            />

            {/* In-chapter navigation footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '4rem',
                paddingTop: '2rem',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <button
                className="btn-minimal"
                onClick={goToPrevChapter}
                disabled={chapterIndex === 0}
                style={{ opacity: chapterIndex === 0 ? 0.35 : 1 }}
              >
                <ChevronLeft size={16} />
                <span>Previous Chapter</span>
              </button>

              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-serif)' }}>
                {chapterIndex + 1} of {spineLength}
              </span>

              <button
                className="btn-minimal"
                onClick={goToNextChapter}
                disabled={chapterIndex >= spineLength - 1}
                style={{ opacity: chapterIndex >= spineLength - 1 ? 0.35 : 1 }}
              >
                <span>Next Chapter</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
