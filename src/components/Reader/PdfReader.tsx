import React, { useState, useEffect, useRef } from 'react';
import { loadPdfDocument } from '../../services/parsers/pdfParser';
import { updateBookProgress } from '../../services/db';
import type { Book, ReaderSettings } from '../../types';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Loader2 } from 'lucide-react';

interface PdfReaderProps {
  book: Book;
  fileBlob: Blob;
  settings: ReaderSettings;
  onActivePageChange: (pageNum: number, totalPages: number) => void;
  onToggleImmersive: () => void;
}

export const PdfReader: React.FC<PdfReaderProps> = ({
  book,
  fileBlob,
  onActivePageChange,
  onToggleImmersive,
}) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(book.currentLocation?.pageNumber || 1);
  const [totalPages, setTotalPages] = useState<number>(book.totalPages || 1);
  const [scale, setScale] = useState<number>(1.0);
  const [fitMode, setFitMode] = useState<'width' | 'custom'>('width');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [renderError, setRenderError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);

  // 1. Load PDF document
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setRenderError(null);

    loadPdfDocument(fileBlob)
      .then((doc) => {
        if (isCancelled) return;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        const initialPage = book.currentLocation?.pageNumber
          ? Math.min(book.currentLocation.pageNumber, doc.numPages)
          : 1;
        setCurrentPage(initialPage);
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error('PDF load error', err);
          setRenderError(err.message || 'Could not load PDF document.');
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [fileBlob]);

  // 2. Render Page whenever currentPage, scale, or fitMode changes
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let isMounted = true;
    setIsLoading(true);

    // Cancel previous render task if any
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }

    pdfDoc.getPage(currentPage).then((page: any) => {
      if (!isMounted || !canvasRef.current || !containerRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Calculate scale
      let effectiveScale = scale;
      const containerWidth = containerRef.current.clientWidth - 32;

      if (fitMode === 'width' && containerWidth > 0) {
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        effectiveScale = Math.min(2.0, Math.max(0.6, containerWidth / unscaledViewport.width));
      }

      const pixelRatio = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: effectiveScale * pixelRatio });

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / pixelRatio}px`;
      canvas.style.height = `${viewport.height / pixelRatio}px`;

      const renderContext = {
        canvasContext: ctx,
        viewport,
        canvas,
      };

      const task = page.render(renderContext as any);
      renderTaskRef.current = task;

      task.promise
        .then(() => {
          if (!isMounted) return;
          setIsLoading(false);
          onActivePageChange(currentPage, totalPages);

          // Update progress in DB
          const progressPercent = Math.round((currentPage / totalPages) * 100);
          updateBookProgress(book.id, progressPercent, {
            pageNumber: currentPage,
            totalPages,
          });
        })
        .catch((err: any) => {
          if (err.name !== 'RenderingCancelledException') {
            console.error('Page render error', err);
          }
        });
    });

    return () => {
      isMounted = false;
    };
  }, [pdfDoc, currentPage, scale, fitMode]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        goToNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        goToPrevPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages]);

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const handleZoomIn = () => {
    setFitMode('custom');
    setScale((prev) => Math.min(2.5, prev + 0.15));
  };

  const handleZoomOut = () => {
    setFitMode('custom');
    setScale((prev) => Math.max(0.6, prev - 0.15));
  };

  const handleFitWidth = () => {
    setFitMode('width');
  };

  if (renderError) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
        <h3 style={{ color: 'var(--accent-burgundy)', marginBottom: '1rem' }}>Could not display PDF</h3>
        <p style={{ color: 'var(--text-secondary)' }}>{renderError}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="reader-body"
      style={{ flexDirection: 'column', alignItems: 'center' }}
      onClick={(e) => {
        // Toggle immersive if clicking container background
        if (e.target === containerRef.current) {
          onToggleImmersive();
        }
      }}
    >
      {/* PDF Controls Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          className="btn-minimal"
          onClick={goToPrevPage}
          disabled={currentPage <= 1}
          style={{ opacity: currentPage <= 1 ? 0.4 : 1 }}
        >
          <ChevronLeft size={16} />
          <span>Previous</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
          <span>Page</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={currentPage}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val >= 1 && val <= totalPages) {
                setCurrentPage(val);
              }
            }}
            style={{ width: '60px', padding: '0.25rem 0.5rem', textAlign: 'center', borderRadius: 'var(--radius-btn)' }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>of {totalPages}</span>
        </div>

        <button
          className="btn-minimal"
          onClick={goToNextPage}
          disabled={currentPage >= totalPages}
          style={{ opacity: currentPage >= totalPages ? 0.4 : 1 }}
        >
          <span>Next</span>
          <ChevronRight size={16} />
        </button>

        <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--border-subtle)', margin: '0 0.25rem' }} />

        <button className="btn-minimal" onClick={handleZoomOut} title="Zoom Out">
          <ZoomOut size={15} />
        </button>
        <button className="btn-minimal" onClick={handleZoomIn} title="Zoom In">
          <ZoomIn size={15} />
        </button>
        <button
          className={`btn-minimal ${fitMode === 'width' ? 'active' : ''}`}
          onClick={handleFitWidth}
          title="Fit to Page Width"
        >
          <Maximize2 size={15} />
          <span>Fit Width</span>
        </button>
      </div>

      {/* PDF Canvas View */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              top: '50px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10,
              backgroundColor: 'var(--bg-elevated)',
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              border: '1px solid var(--border-strong)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem',
            }}
          >
            <Loader2 size={16} className="animate-spin" />
            <span>Rendering page...</span>
          </div>
        )}
        <canvas ref={canvasRef} className="pdf-canvas-card" />
      </div>
    </div>
  );
};
