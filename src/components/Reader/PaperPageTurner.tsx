import React, { useState, useRef, useEffect, useCallback } from 'react';

interface PaperPageTurnerProps {
  currentContent: React.ReactNode;
  nextContent?: React.ReactNode;
  prevContent?: React.ReactNode;
  hasNext: boolean;
  hasPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
  theme?: string;
  triggerNextRef?: React.MutableRefObject<(() => void) | null>;
  triggerPrevRef?: React.MutableRefObject<(() => void) | null>;
}

export const PaperPageTurner: React.FC<PaperPageTurnerProps> = ({
  currentContent,
  nextContent,
  prevContent,
  hasNext,
  hasPrev,
  onNext,
  onPrev,
  theme: _theme = 'paper',
  triggerNextRef,
  triggerPrevRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag state
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [turnDirection, setTurnDirection] = useState<'next' | 'prev' | null>(null);
  const [dragProgress, setDragProgress] = useState(0); // 0 to 1
  const [isAnimating, setIsAnimating] = useState(false);

  // Drag coordinates
  const dragStartRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const isVerticalScrollRef = useRef(false);

  // Execute turn transition to completion
  const completeTurn = useCallback((dir: 'next' | 'prev') => {
    setIsAnimating(true);
    setTurnDirection(dir);
    setDragProgress(1);

    setTimeout(() => {
      if (dir === 'next') {
        onNext();
      } else {
        onPrev();
      }
      // Reset after turn completes
      setIsAnimating(false);
      setIsDragging(false);
      setTurnDirection(null);
      setDragProgress(0);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }, 400);
  }, [onNext, onPrev]);

  // Cancel turn (snap back)
  const cancelTurn = useCallback((_dir: 'next' | 'prev') => {
    setIsAnimating(true);
    setDragProgress(0);

    setTimeout(() => {
      setIsAnimating(false);
      setIsDragging(false);
      setTurnDirection(null);
      setDragProgress(0);
    }, 280);
  }, []);

  // Expose programmatic turn triggers to parent (e.g. for keyboard or buttons)
  useEffect(() => {
    if (triggerNextRef) {
      triggerNextRef.current = () => {
        if (hasNext && !isAnimating && !isDragging) {
          completeTurn('next');
        }
      };
    }
    if (triggerPrevRef) {
      triggerPrevRef.current = () => {
        if (hasPrev && !isAnimating && !isDragging) {
          completeTurn('prev');
        }
      };
    }
  }, [hasNext, hasPrev, isAnimating, isDragging, completeTurn, triggerNextRef, triggerPrevRef]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (isAnimating || isDragging) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        if (hasNext) {
          e.preventDefault();
          completeTurn('next');
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (hasPrev) {
          e.preventDefault();
          completeTurn('prev');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasNext, hasPrev, isAnimating, isDragging, completeTurn]);

  // Pointer event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isAnimating) return;
    // Don't drag if clicking buttons, links, or inputs
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, [role="button"], .selection-popover')) return;

    // Only primary mouse button or touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
    };
    isVerticalScrollRef.current = false;
    setIsPointerDown(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDown || isAnimating) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    // Check gesture direction if not already committed
    if (!isDragging && !isVerticalScrollRef.current) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
        // Vertical scrolling dominates - leave to browser
        isVerticalScrollRef.current = true;
        return;
      }
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 12) {
        // Horizontal page turn gesture engaged
        setIsDragging(true);
      }
    }

    if (!isDragging) return;

    // Prevent text selection during drag
    e.preventDefault();

    const containerWidth = containerRef.current?.offsetWidth || window.innerWidth || 600;
    const turnDistance = Math.min(Math.max(240, containerWidth * 0.45), 420);

    if (dx < 0) {
      // Dragging left -> Next page
      if (!hasNext) {
        setDragProgress(0.04); // subtle resistance bump
        setTurnDirection(null);
        return;
      }
      setTurnDirection('next');
      const prog = Math.min(1, Math.max(0, -dx / turnDistance));
      setDragProgress(prog);
    } else if (dx > 0) {
      // Dragging right -> Previous page
      if (!hasPrev) {
        setDragProgress(0.04);
        setTurnDirection(null);
        return;
      }
      setTurnDirection('prev');
      const prog = Math.min(1, Math.max(0, dx / turnDistance));
      setDragProgress(prog);
    }
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDown) return;
    setIsPointerDown(false);

    if (isDragging && turnDirection) {
      const dt = Date.now() - dragStartRef.current.time;
      const dx = Math.abs(e.clientX - dragStartRef.current.x);
      const velocity = dx / (dt || 1);

      // Complete turn if dragged > 18% or flicked fast (>0.25 px/ms)
      if (dragProgress > 0.18 || velocity > 0.25) {
        completeTurn(turnDirection);
      } else {
        cancelTurn(turnDirection);
      }
    } else {
      setIsDragging(false);
      setTurnDirection(null);
      setDragProgress(0);
    }
  };

  // Compute angles and lighting for 3D turn
  let angle = 0;
  if (turnDirection === 'next') {
    angle = dragProgress * 180;
  } else if (turnDirection === 'prev') {
    angle = (1 - dragProgress) * 180;
  }

  // Realistic paper lighting curve
  const curlIntensity = Math.sin((angle / 180) * Math.PI);
  const isTurning = isDragging || isAnimating;

  return (
    <div
      ref={containerRef}
      className={`paper-turn-stage ${isDragging ? 'dragging' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUpOrCancel}
      onPointerCancel={handlePointerUpOrCancel}
    >
      {/* If not actively turning, render content cleanly without 3D overhead */}
      {!isTurning ? (
        <div className="paper-page-normal">
          {currentContent}
        </div>
      ) : (
        <div className="paper-3d-book">
          {/* Underneath Layer */}
          <div className="paper-page-underneath">
            {turnDirection === 'next' ? (
              nextContent || <div className="paper-page-empty" />
            ) : (
              currentContent
            )}

            {/* Ambient paper shadow on the underneath page */}
            <div
              className="paper-ambient-shadow"
              style={{
                opacity: turnDirection === 'next' ? (1 - dragProgress) * 0.28 : dragProgress * 0.28,
              }}
            />
          </div>

          {/* Turning Leaf (The dynamic curling paper) */}
          <div
            className={`paper-turning-leaf ${isAnimating ? 'animating' : ''}`}
            style={{
              transform: `rotateY(-${angle}deg)`,
              transformOrigin: 'left center',
              transition: isAnimating
                ? 'transform 0.4s cubic-bezier(0.2, 0.8, 0.25, 1)'
                : 'none',
            }}
          >
            {/* Front of the turning page (visible 0deg to 90deg) */}
            <div
              className="paper-leaf-front"
              style={{
                opacity: angle > 90 ? 0 : 1,
                pointerEvents: angle > 90 ? 'none' : 'auto',
              }}
            >
              {turnDirection === 'next' ? currentContent : prevContent}

              {/* Dynamic Paper Curl Cylinder Highlight & Crease Shadow */}
              <div
                className="paper-curl-overlay"
                style={{
                  opacity: curlIntensity,
                  background: `linear-gradient(to right, 
                    rgba(0, 0, 0, 0) 0%, 
                    rgba(0, 0, 0, ${0.06 * curlIntensity}) 35%, 
                    rgba(255, 255, 255, ${0.16 * curlIntensity}) 55%, 
                    rgba(0, 0, 0, ${0.12 * curlIntensity}) 90%, 
                    rgba(0, 0, 0, ${0.25 * curlIntensity}) 100%)`,
                }}
              />
            </div>

            {/* Back of the turning page (visible 90deg to 180deg) */}
            <div
              className="paper-leaf-back"
              style={{
                opacity: angle >= 90 ? 1 : 0,
                transform: 'rotateY(180deg)',
              }}
            >
              {/* Back side subtle book leaf texture */}
              <div className="paper-leaf-back-content">
                <div
                  className="paper-spine-gradient"
                  style={{
                    opacity: curlIntensity * 0.7,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subtle Side Page-Turn Tap Zones / Hints */}
      {!isTurning && (
        <>
          {hasPrev && (
            <button
              className="paper-edge-turn-zone left"
              onClick={(e) => {
                e.stopPropagation();
                completeTurn('prev');
              }}
              title="Drag or click to turn previous page"
              aria-label="Previous page"
            >
              <div className="paper-curl-hint left" />
            </button>
          )}
          {hasNext && (
            <button
              className="paper-edge-turn-zone right"
              onClick={(e) => {
                e.stopPropagation();
                completeTurn('next');
              }}
              title="Drag or click to turn next page"
              aria-label="Next page"
            >
              <div className="paper-curl-hint right" />
            </button>
          )}
        </>
      )}
    </div>
  );
};
