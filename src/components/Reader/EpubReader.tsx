import React, { useState, useEffect, useRef } from 'react';
import { parseEpubFile, type ParsedEpub } from '../../services/parsers/epubParser';
import { updateBookProgress } from '../../services/db';
import type { Book, ReaderSettings, TocItem } from '../../types';
import { ChevronLeft, ChevronRight, Bookmark, Loader2 } from 'lucide-react';
import { PaperPageTurner } from './PaperPageTurner';

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
  const [chaptersCache, setChaptersCache] = useState<Record<number, { html: string; title: string }>>({});
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

  // 2. Load Chapter whenever chapterIndex changes and preload adjacent chapters
  useEffect(() => {
    if (!parsed || parsed.spine.length === 0) return;

    const safeIndex = Math.max(0, Math.min(chapterIndex, parsed.spine.length - 1));
    const spineItem = parsed.spine[safeIndex];

    const applyChapter = (res: { html: string; title: string }) => {
      setChapterContent(res);
      setChaptersCache((prev) => ({ ...prev, [safeIndex]: res }));
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
    };

    if (chaptersCache[safeIndex]) {
      applyChapter(chaptersCache[safeIndex]);
    } else {
      setIsLoading(true);
      parsed.loadChapter(spineItem.href)
        .then((res) => {
          applyChapter(res);
        })
        .catch((err) => {
          console.error('Error loading chapter', err);
          setError(`Failed to load chapter: ${err.message}`);
          setIsLoading(false);
        });
    }

    // Preload next chapter
    if (safeIndex + 1 < parsed.spine.length && !chaptersCache[safeIndex + 1]) {
      parsed.loadChapter(parsed.spine[safeIndex + 1].href)
        .then((nextRes) => {
          setChaptersCache((prev) => ({ ...prev, [safeIndex + 1]: nextRes }));
        })
        .catch(() => {});
    }

    // Preload previous chapter
    if (safeIndex - 1 >= 0 && !chaptersCache[safeIndex - 1]) {
      parsed.loadChapter(parsed.spine[safeIndex - 1].href)
        .then((prevRes) => {
          setChaptersCache((prev) => ({ ...prev, [safeIndex - 1]: prevRes }));
        })
        .catch(() => {});
    }
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

  const renderChapterProse = (content: { html: string; title: string }, isCurrent = false) => (
    <div className={`reader-prose-wrapper width-${settings.columnWidth} margin-${settings.pageMargins}`}>
      <article
        className={`reader-prose font-${settings.fontFamily} align-${settings.textAlign}`}
        style={{
          fontSize: `${settings.fontSize}px`,
          lineHeight: settings.lineSpacing,
        }}
        dangerouslySetInnerHTML={{ __html: content.html }}
      />

      {isCurrent && (
        <div className="chapter-nav-paper-row">
          <button
            className="btn-paper-turn"
            onClick={goToPrevChapter}
            disabled={chapterIndex === 0}
            style={{ opacity: chapterIndex === 0 ? 0.35 : 1 }}
          >
            <ChevronLeft size={16} />
            <span>Previous Chapter</span>
          </button>

          <span className="font-deutsch" style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
            {chapterIndex + 1} / {spineLength}
          </span>

          <button
            className="btn-paper-turn"
            onClick={goToNextChapter}
            disabled={chapterIndex >= spineLength - 1}
            style={{ opacity: chapterIndex >= spineLength - 1 ? 0.35 : 1 }}
          >
            <span>Next Chapter</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );

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

      {isLoading && !chaptersCache[chapterIndex] ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '1rem', color: 'var(--text-secondary)' }}>
          <Loader2 size={32} className="animate-spin" />
          <p style={{ fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>Preparing chapter...</p>
        </div>
      ) : (
        <PaperPageTurner
          currentContent={renderChapterProse(chapterContent, true)}
          nextContent={chaptersCache[chapterIndex + 1] ? renderChapterProse(chaptersCache[chapterIndex + 1]) : undefined}
          prevContent={chaptersCache[chapterIndex - 1] ? renderChapterProse(chaptersCache[chapterIndex - 1]) : undefined}
          hasNext={chapterIndex < spineLength - 1}
          hasPrev={chapterIndex > 0}
          onNext={goToNextChapter}
          onPrev={goToPrevChapter}
          theme={settings.theme}
        />
      )}
    </div>
  );
};
