import React, { useState, useEffect, useRef } from 'react';
import { parseTxtFile, type ParsedTxt } from '../../services/parsers/txtParser';
import { updateBookProgress } from '../../services/db';
import type { Book, ReaderSettings, TocItem } from '../../types';
import { Bookmark, Loader2 } from 'lucide-react';

interface TxtReaderProps {
  book: Book;
  fileBlob: Blob;
  settings: ReaderSettings;
  sectionIndex?: number;
  onTocLoaded: (toc: TocItem[]) => void;
  onActiveSectionChange: (title: string, index: number, total: number) => void;
  onQuoteRequested: (text: string, sectionTitle: string) => void;
  onToggleImmersive: () => void;
}

export const TxtReader: React.FC<TxtReaderProps> = ({
  book,
  fileBlob,
  settings,
  sectionIndex: externalSectionIndex,
  onTocLoaded,
  onActiveSectionChange,
  onQuoteRequested,
  onToggleImmersive,
}) => {
  const [parsed, setParsed] = useState<ParsedTxt | null>(null);
  const [sectionIndex, setSectionIndex] = useState<number>(
    externalSectionIndex !== undefined ? externalSectionIndex : (book.currentLocation?.chapterIndex || 0)
  );

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFading, setIsFading] = useState<boolean>(false);
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionCoords, setSelectionCoords] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const pointerDownRef = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    if (externalSectionIndex !== undefined && externalSectionIndex !== sectionIndex) {
      setIsFading(true);
      const timer = setTimeout(() => {
        setSectionIndex(externalSectionIndex);
        setTimeout(() => setIsFading(false), 50);
      }, 180);
      return () => clearTimeout(timer);
    }
  }, [externalSectionIndex]);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    parseTxtFile(fileBlob, book.title)
      .then((res) => {
        if (isCancelled) return;
        setParsed(res);
        setIsLoading(false);

        // Generate TOC
        const tocItems: TocItem[] = res.sections.map((s, idx) => ({
          id: `sec_${idx}`,
          title: s.title,
          href: `sec_${idx}`,
        }));
        onTocLoaded(tocItems);

        const initialIdx = Math.min(book.currentLocation?.chapterIndex || 0, res.sections.length - 1);
        setSectionIndex(initialIdx);
        onActiveSectionChange(res.sections[initialIdx]?.title || 'Text', initialIdx, res.sections.length);
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error('Error parsing text file', err);
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [fileBlob]);

  useEffect(() => {
    if (!parsed || parsed.sections.length === 0) return;

    const currentSec = parsed.sections[sectionIndex];
    if (currentSec) {
      onActiveSectionChange(currentSec.title, sectionIndex, parsed.sections.length);
      const overallProgress = Math.round(((sectionIndex + 1) / parsed.sections.length) * 100);
      updateBookProgress(book.id, overallProgress, {
        chapterIndex: sectionIndex,
        chapterTitle: currentSec.title,
      });
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [sectionIndex, parsed]);

  const goToNext = () => {
    if (parsed && sectionIndex < parsed.sections.length - 1 && !isFading) {
      setIsFading(true);
      setTimeout(() => {
        setSectionIndex((prev) => prev + 1);
        setTimeout(() => setIsFading(false), 50);
      }, 180);
    }
  };

  const goToPrev = () => {
    if (sectionIndex > 0 && !isFading) {
      setIsFading(true);
      setTimeout(() => {
        setSectionIndex((prev) => prev - 1);
        setTimeout(() => setIsFading(false), 50);
      }, 180);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        goToNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        goToPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [parsed, sectionIndex, isFading]);

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
      goToPrev();
    } else if (clickX > screenWidth * 0.68) {
      goToNext();
    } else {
      onToggleImmersive();
    }
  };

  if (isLoading || !parsed) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Loader2 size={32} className="animate-spin" />
      </div>
    );
  }

  const currentSection = parsed.sections[sectionIndex];
  const paragraphs = currentSection ? currentSection.content.split(/\r?\n\s*\r?\n/) : [];

  return (
    <div
      ref={containerRef}
      className="reader-body"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      style={{ userSelect: 'text', touchAction: 'pan-y' }}
    >
      {selectedText && selectionCoords && (
        <div
          className="selection-popover"
          style={{
            left: `${selectionCoords.x}px`,
            top: `${selectionCoords.y}px`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onQuoteRequested(selectedText, currentSection?.title || 'Note');
            setSelectedText('');
            setSelectionCoords(null);
          }}
        >
          <Bookmark size={14} />
          <span>Save Quote</span>
        </div>
      )}

      <div className={`reader-fade-container ${isFading ? 'fading' : ''}`}>
        <div className={`reader-prose-wrapper width-${settings.columnWidth} margin-${settings.pageMargins}`}>
          <article
            className={`reader-prose font-${settings.fontFamily} align-${settings.textAlign}`}
            style={{
              fontSize: `${settings.fontSize}px`,
              lineHeight: settings.lineSpacing,
            }}
          >
            {currentSection && (
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', marginBottom: '2rem' }}>
                {currentSection.title}
              </h1>
            )}

            {paragraphs.map((p, idx) => {
              const cleanP = p.trim();
              if (!cleanP) return null;

              if (cleanP.startsWith('>')) {
                return (
                  <blockquote key={idx}>
                    {cleanP.replace(/^>\s*/, '')}
                  </blockquote>
                );
              }

              if (cleanP.startsWith('#')) {
                return (
                  <h2 key={idx}>
                    {cleanP.replace(/^#+\s*/, '')}
                  </h2>
                );
              }

              return <p key={idx}>{cleanP}</p>;
            })}
          </article>
        </div>
      </div>
    </div>
  );
};
