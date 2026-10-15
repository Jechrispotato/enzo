import React, { useState, useEffect, useRef } from 'react';
import { parseTxtFile, type ParsedTxt } from '../../services/parsers/txtParser';
import { updateBookProgress } from '../../services/db';
import type { Book, ReaderSettings, TocItem } from '../../types';
import { ChevronLeft, ChevronRight, Bookmark, Loader2 } from 'lucide-react';
import { PaperPageTurner } from './PaperPageTurner';

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

  useEffect(() => {
    if (externalSectionIndex !== undefined && externalSectionIndex !== sectionIndex) {
      setSectionIndex(externalSectionIndex);
    }
  }, [externalSectionIndex]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionCoords, setSelectionCoords] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

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
    if (parsed && sectionIndex < parsed.sections.length - 1) {
      setSectionIndex((prev) => prev + 1);
    }
  };

  const goToPrev = () => {
    if (sectionIndex > 0) {
      setSectionIndex((prev) => prev - 1);
    }
  };

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

  if (isLoading || !parsed) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Loader2 size={32} className="animate-spin" />
      </div>
    );
  }

  const currentSection = parsed.sections[sectionIndex];
  const totalSections = parsed.sections.length;

  const renderSectionProse = (sec: { title: string; content: string } | undefined, isCurrent = false) => {
    if (!sec) return <div className="paper-page-empty" />;
    const paragraphs = sec.content.split(/\r?\n\s*\r?\n/);

    return (
      <div className={`reader-prose-wrapper width-${settings.columnWidth} margin-${settings.pageMargins}`}>
        <article
          className={`reader-prose font-${settings.fontFamily} align-${settings.textAlign}`}
          style={{
            fontSize: `${settings.fontSize}px`,
            lineHeight: settings.lineSpacing,
          }}
        >
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', marginBottom: '2rem' }}>
            {sec.title}
          </h1>

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

        {isCurrent && totalSections > 1 && (
          <div className="chapter-nav-paper-row">
            <button
              className="btn-paper-turn"
              onClick={goToPrev}
              disabled={sectionIndex === 0}
              style={{ opacity: sectionIndex === 0 ? 0.35 : 1 }}
            >
              <ChevronLeft size={16} />
              <span>Previous Section</span>
            </button>

            <span className="font-deutsch" style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
              {sectionIndex + 1} / {totalSections}
            </span>

            <button
              className="btn-paper-turn"
              onClick={goToNext}
              disabled={sectionIndex >= totalSections - 1}
              style={{ opacity: sectionIndex >= totalSections - 1 ? 0.35 : 1 }}
            >
              <span>Next Section</span>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="reader-body"
      onMouseUp={handleMouseUp}
      onTouchEnd={handleMouseUp}
      onClick={(e) => {
        if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'P') {
          onToggleImmersive();
        }
      }}
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

      <PaperPageTurner
        currentContent={renderSectionProse(currentSection, true)}
        nextContent={renderSectionProse(parsed.sections[sectionIndex + 1])}
        prevContent={renderSectionProse(parsed.sections[sectionIndex - 1])}
        hasNext={sectionIndex < totalSections - 1}
        hasPrev={sectionIndex > 0}
        onNext={goToNext}
        onPrev={goToPrev}
        theme={settings.theme}
      />
    </div>
  );
};
