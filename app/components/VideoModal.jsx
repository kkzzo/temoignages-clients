'use client';

import { useEffect } from 'react';

const LIBRARY_ID = process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID || 'YOUR_LIBRARY_ID';

export default function VideoModal({ video, onClose, onNext, onPrev, position, total }) {
  // Keyboard shortcuts: Esc to close, arrows to navigate
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && onNext) onNext();
      if (e.key === 'ArrowLeft' && onPrev) onPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, onNext, onPrev]);

  return (
    <div
      onClick={onClose}
      className="modal-backdrop fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-4xl relative"
      >
        <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
          <iframe
            key={video.guid}
            src={`https://iframe.mediadelivery.net/embed/${LIBRARY_ID}/${video.guid}?autoplay=true&preload=true`}
            className="w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>

        <div className="mt-3 flex items-center justify-between text-white">
          <div>
            <p className="font-medium">{video.clientName}</p>
            <p className="text-sm text-white/70">
              {[video.role, video.company].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {total > 1 && (
              <span className="text-xs text-white/60 mr-2">
                {position} / {total}
              </span>
            )}
            {onPrev && (
              <button
                onClick={onPrev}
                className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-white/10 transition"
                title="Précédent (←)"
              >
                <svg width="14" height="14" viewBox="0 0 14 14"><path d="M9 2 L4 7 L9 12" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            )}
            {onNext && (
              <button
                onClick={onNext}
                className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-white/10 transition"
                title="Suivant (→)"
              >
                <svg width="14" height="14" viewBox="0 0 14 14"><path d="M5 2 L10 7 L5 12" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-sm px-3 py-1.5 rounded-md hover:bg-white/10 transition"
              title="Fermer (Esc)"
            >
              Fermer ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
