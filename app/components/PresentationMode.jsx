'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const LIBRARY_ID = process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID || 'YOUR_LIBRARY_ID';

export default function PresentationMode({ videos, onExit }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const [showOverlay, setShowOverlay] = useState(true);
  const containerRef = useRef(null);
  const hideTimerRef = useRef(null);

  const current = videos[currentIndex];

  const goNext = useCallback(() => {
    setCurrentIndex(i => Math.min(i + 1, videos.length - 1));
  }, [videos.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex(i => Math.max(i - 1, 0));
  }, []);

  // Enter fullscreen on mount
  useEffect(() => {
    const el = containerRef.current;
    if (el?.requestFullscreen) {
      el.requestFullscreen().catch(() => {
        // Might fail if not triggered by user gesture; container still covers the screen
      });
    }
    return () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

  // Exit when user presses Esc / exits fullscreen via native controls
  useEffect(() => {
    const handleFsChange = () => {
      if (!document.fullscreenElement) onExit();
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, [onExit]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onExit();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === ' ') {
        e.preventDefault();
        setAutoplay(a => !a);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onExit, goNext, goPrev]);

  // Listen for 'ended' postMessage from Bunny iframe → auto-advance
  useEffect(() => {
    if (!autoplay) return;

    const handleMessage = (event) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        const eventName = data?.event || data?.type || data?.name;
        if (eventName === 'ended' || eventName === 'video-ended') {
          goNext();
        }
      } catch { /* non-JSON message, ignore */ }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [autoplay, goNext]);

  // Auto-hide overlay after mouse inactivity
  const showOverlayTemporarily = useCallback(() => {
    setShowOverlay(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowOverlay(false), 3000);
  }, []);

  useEffect(() => {
    showOverlayTemporarily();
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, [currentIndex, showOverlayTemporarily]);

  const isLast = currentIndex === videos.length - 1;
  const isFirst = currentIndex === 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={showOverlayTemporarily}
      className="fixed inset-0 z-[60] bg-black flex items-center justify-center cursor-default"
    >
      {/* Video */}
      <iframe
        key={current.guid}
        src={`https://iframe.mediadelivery.net/embed/${LIBRARY_ID}/${current.guid}?autoplay=true&preload=true&loop=false`}
        className="absolute inset-0 w-full h-full"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />

      {/* Top overlay */}
      <div
        className={`absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 ${
          showOverlay ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-start justify-between text-white">
          <div>
            <p className="text-xl font-medium">{current.clientName}</p>
            <p className="text-sm text-white/80 mt-0.5">
              {[current.role, current.company].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className="text-sm text-white/70 tabular-nums">
            {currentIndex + 1} / {videos.length}
          </div>
        </div>
      </div>

      {/* Bottom overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 ${
          showOverlay ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between text-white gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={goPrev}
              disabled={isFirst}
              className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 transition disabled:opacity-30 disabled:cursor-not-allowed text-sm"
            >
              ← Précédent
            </button>
            <button
              onClick={goNext}
              disabled={isLast}
              className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 transition disabled:opacity-30 disabled:cursor-not-allowed text-sm"
            >
              Suivant →
            </button>
          </div>

          <div className="flex items-center gap-4">
            <label className="text-sm flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoplay}
                onChange={e => setAutoplay(e.target.checked)}
                className="accent-white w-4 h-4"
              />
              Enchaînement auto
            </label>
            <button
              onClick={onExit}
              className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 transition text-sm"
            >
              Quitter (Esc)
            </button>
          </div>
        </div>
        <p className="text-center text-xs text-white/50 mt-3">
          ← → pour naviguer · Espace pour activer/désactiver l&apos;enchaînement · Esc pour quitter
        </p>
      </div>
    </div>
  );
}
