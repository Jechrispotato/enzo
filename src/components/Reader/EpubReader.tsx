import React, { useState, useEffect, useRef } from 'react';
import { parseEpubFile, type ParsedEpub } from '../../services/parsers/epubParser';
import { updateBookProgress } from '../../services/db';
import type { Book, ReaderSettings, TocItem } from '../../types';
import { Bookmark, Loader2 } from 'lucide-react';

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
  const [isFading, setIsFading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync external chapterIndex when passed from TOC / SwordHub
  useEffect(() => {
    if (externalChapterIndex !== undefined && externalChapterIndex !== chapterIndex) {
      setIsFading(true);
      const timer = setTimeout(() => {
        setChapterIndex(externalChapterIndex);
        setTimeout(() => setIsFading(false), 50);
      }, 180);
      return () => clearTimeout(timer);
    }
  }, [externalChapterIndex]);
  
  // Selection popup state
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionCoords, setSelectionCoords] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const pointerDownRef = useRef<{ x: number; y: number; time: number } | null>(null);

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

  // 2. Load Chapter content
  useEffect(() => {
    if (!parsed || parsed.spine.length === 0) return;

    const safeIndex = Math.max(0, Math.min(chapterIndex, parsed.spine.length - 1));
    const spineItem = parsed.spine[safeIndex];

    parsed.loadChapter(spineItem.href)
      .then((res) => {
        setChapterContent(res);
        setIsLoading(false);
        onActiveChapterChange(res.title, safeIndex, parsed.spine.length);

        const overallProgress = Math.round(((safeIndex + 1) / parsed.spine.length) * 100);
        updateBookProgress(book.id, overallProgress, {
          chapterIndex: safeIndex,
          chapterHref: spineItem.href,
          chapterTitle: res.title,
        });

        window.scrollTo({ top: 0, behavior: 'instant' });
      })
      .catch((err) => {
        console.error('Error loading chapter', err);
        setError(`Failed to load chapter: ${err.message}`);
        setIsLoading(false);
      });
  }, [parsed, chapterIndex]);

  // Navigate with smooth fade
  const goToNextChapter = () => {
    if (parsed && chapterIndex < parsed.spine.length - 1 && !isFading) {
      setIsFading(true);
      setTimeout(() => {
        setChapterIndex((prev) => prev + 1);
        setTimeout(() => setIsFading(false), 50);
      }, 180);
    }
  };

  const goToPrevChapter = () => {
    if (chapterIndex > 0 && !isFading) {
      setIsFading(true);
      setTimeout(() => {
        setChapterIndex((prev) => prev - 1);
        setTimeout(() => setIsFading(false), 50);
      }, 180);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        goToNextChapter();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        goToPrevChapter();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [parsed, chapterIndex, isFading]);

  // Intercept clicks on links inside chapter
  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const link = target.closest('a');
    if (link) {
      const chapterTarget = link.getAttribute('data-chapter-target');
      const internalAnchor = link.getAttribute('data-internal-anchor');

      if (chapterTarget && parsed) {
        e.preventDefault();
        const targetClean = chapterTarget.split('#')[0];
        const matchedIdx = parsed.spine.findIndex((s) => s.href.split('#')[0] === targetClean);
        if (matchedIdx !== -1) {
          setIsFading(true);
          setTimeout(() => {
            setChapterIndex(matchedIdx);
            setTimeout(() => setIsFading(false), 50);
          }, 180);
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
  };

  // Tap-only navigation detection
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    pointerDownRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
    };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    // Check text selection for quotes
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.toString().trim().length >= 3) {
      const text = selection.toString().trim();
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectedText(text);
      setSelectionCoords({
        x: rect.left + rect.width / 2,
        y: rect.top + window.scrollY,
      });
      pointerDownRef.current = null;
      return;
    } else {
      setSelectedText('');
      setSelectionCoords(null);
    }

    if (!pointerDownRef.current) return;
    const start = pointerDownRef.current;
    pointerDownRef.current = null;

    const dx = Math.abs(e.clientX - start.x);
    const dy = Math.abs(e.clientY - start.y);
    const duration = Date.now() - start.time;

    // Must be a clean tap (not dragging or vertical scroll)
    if (dx > 12 || dy > 12 || duration > 350) {
      return;
    }

    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, [role="button"], .selection-popover')) {
      return;
    }

    // Tap Zones: Left 32% = Prev, Right 32% = Next, Center = Toggle Immersive
    const screenWidth = window.innerWidth;
    const clickX = e.clientX;

    if (clickX < screenWidth * 0.32) {
      goToPrevChapter();
    } else if (clickX > screenWidth * 0.68) {
      goToNextChapter();
    } else {
      onToggleImmersive();
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

  return (
    <div
      ref={containerRef}
      className="reader-body"
      onClick={handleContentClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      style={{ userSelect: 'text', touchAction: 'pan-y' }}
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

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '1rem', color: 'var(--text-secondary)' }}>
          <Loader2 size={32} className="animate-spin" />
          <p style={{ fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>Preparing chapter...</p>
        </div>
      ) : (
        <div className={`reader-fade-container ${isFading ? 'fading' : ''}`}>
          <div className={`reader-prose-wrapper width-${settings.columnWidth} margin-${settings.pageMargins}`}>
            <article
              className={`reader-prose font-${settings.fontFamily} align-${settings.textAlign}`}
              style={{
                fontSize: `${settings.fontSize}px`,
                lineHeight: settings.lineSpacing,
              }}
              dangerouslySetInnerHTML={{ __html: chapterContent.html }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
