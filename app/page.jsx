'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import videosData from '@/data/manifest.json';

const PAGE_SIZE = 24;

const LANGUAGES = [
  { key: 'all',      label: 'All',     flag: '🌍' },
  { key: 'Français', label: 'French',  flag: '🇫🇷' },
  { key: 'Anglais',  label: 'English', flag: '🇬🇧' },
  { key: 'Espagnol', label: 'Spanish', flag: '🇪🇸' },
  { key: 'Italien',  label: 'Italian', flag: '🇮🇹' },
  { key: 'Dutch',    label: 'Dutch',   flag: '🇳🇱' },
];

const BUNNY_CDN = process.env.NEXT_PUBLIC_BUNNY_CDN_HOSTNAME || 'vz-c45a5c9c-463.b-cdn.net';
const BUNNY_LIB = process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID || '641934';

function thumbUrl(guid) {
  return `https://${BUNNY_CDN}/${guid}/thumbnail.jpg`;
}
function playerUrl(guid) {
  return `https://iframe.mediadelivery.net/embed/${BUNNY_LIB}/${guid}?autoplay=true&loop=false&muted=false&preload=true`;
}

// ── VideoCard ──────────────────────────────────────────────
function VideoCard({ video, onClick }) {
  const [imgOk, setImgOk] = useState(true);
  const lang = LANGUAGES.find(l => l.key === video.language) || LANGUAGES[0];

  return (
    <div className="video-card" onClick={() => onClick(video)}>
      <div className="thumb-wrap">
        {imgOk ? (
          <img
            src={thumbUrl(video.guid)}
            alt={video.clientName}
            loading="lazy"
            onError={() => setImgOk(false)}
          />
        ) : (
          <div style={{ width:'100%',height:'100%',background:'linear-gradient(135deg,#1a1a2e,#16213e)',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <span style={{ fontSize:'3rem' }}>{lang.flag}</span>
          </div>
        )}
        <div className="thumb-overlay">
          <div className="play-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
        {video.duration && <div className="duration-badge">{video.duration}</div>}
      </div>
      <div className="card-body">
        <div className="card-lang">{lang.flag} {lang.label}</div>
      </div>
    </div>
  );
}

// ── VideoModal ─────────────────────────────────────────────
function VideoModal({ video, onClose, onNext, onPrev, position, total }) {
  const lang = LANGUAGES.find(l => l.key === video.language) || LANGUAGES[0];

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && onNext) onNext();
      if (e.key === 'ArrowLeft' && onPrev) onPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, onNext, onPrev]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-inner" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-video">
          <iframe
            src={playerUrl(video.guid)}
            allow="autoplay; fullscreen"
            allowFullScreen
          />
        </div>
        <div className="modal-controls">
          <div className="modal-info">
            <div className="modal-meta">{lang.flag} {lang.label} · {position}/{total}</div>
          </div>
          <div className="modal-nav">
            <button className="nav-btn" onClick={onPrev} disabled={!onPrev}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button className="nav-btn" onClick={onNext} disabled={!onNext}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PresentationMode ───────────────────────────────────────
function PresentationMode({ videos, onExit }) {
  const [idx, setIdx] = useState(0);
  const [autoplay, setAutoplay] = useState(false);
  const video = videos[idx];

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onExit();
      if (e.key === 'ArrowRight') setIdx(i => Math.min(i + 1, videos.length - 1));
      if (e.key === 'ArrowLeft') setIdx(i => Math.max(i - 1, 0));
      if (e.key === ' ') { e.preventDefault(); setAutoplay(a => !a); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onExit, videos.length]);

  if (!video) return null;
  const lang = LANGUAGES.find(l => l.key === video.language) || LANGUAGES[0];

  return (
    <div className="pres-overlay">
      <div className="pres-video">
        <iframe
          key={video.guid}
          src={playerUrl(video.guid)}
          allow="autoplay; fullscreen"
          allowFullScreen
          style={{ width:'100%',height:'100%',border:'none' }}
        />
      </div>
      <div className="pres-ui">
        <div className="pres-top">
          <div>
            <div className="pres-title">⭐ Elio's Wall of Fame</div>
            <div className="pres-counter">{lang.flag} {lang.label} · {idx+1}/{videos.length}</div>
          </div>
          <button className="pres-btn" onClick={onExit}>✕ Exit</button>
        </div>
        <div className="pres-bottom">
          <button className="pres-btn" onClick={() => setIdx(i => Math.max(i-1,0))} disabled={idx===0}>
            ← Previous
          </button>
          <button className={`pres-btn ${autoplay ? 'gold' : ''}`} onClick={() => setAutoplay(a => !a)}>
            {autoplay ? '⏸ Auto' : '▶ Auto'}
          </button>
          <button className="pres-btn" onClick={() => setIdx(i => Math.min(i+1,videos.length-1))} disabled={idx===videos.length-1}>
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PAGE ───────────────────────────────────────────────────
export default function Page() {
  const [search, setSearch]       = useState('');
  const [activeLang, setActiveLang] = useState('all');
  const [page, setPage]           = useState(1);
  const [selected, setSelected]   = useState(null);
  const [presenting, setPresenting] = useState(false);

  // Stats
  const stats = useMemo(() => {
    const byLang = {};
    videosData.forEach(v => {
      byLang[v.language] = (byLang[v.language] || 0) + 1;
    });
    return { total: videosData.length, byLang };
  }, []);

  // Filter
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return videosData.filter(v => {
      if (activeLang !== 'all' && v.language !== activeLang) return false;
      if (q) {
        const hay = [v.clientName, v.language].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [search, activeLang]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const paginated = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);

  const selIdx = selected ? filtered.findIndex(v => v.guid === selected.guid) : -1;
  const goNext = useCallback(() => { if (selIdx < filtered.length-1) setSelected(filtered[selIdx+1]); }, [selIdx, filtered]);
  const goPrev = useCallback(() => { if (selIdx > 0) setSelected(filtered[selIdx-1]); }, [selIdx, filtered]);

  const handleLang = (key) => { setActiveLang(key); setPage(1); };
  const handleSearch = (v) => { setSearch(v); setPage(1); };

  // Current lang info
  const currentLang = LANGUAGES.find(l => l.key === activeLang);

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="hero-badge">
          <span>⭐</span> Wall of Fame
        </div>
        <h1 className="hero-title">Elio's Wall<br/>of Fame</h1>
        <p className="hero-sub">
          Hundreds of clients sharing their authentic experience, in their own language.
        </p>
        <div className="hero-stats">
          <div className="hero-stat">
            <strong>{stats.total}</strong>
            <span>Testimonials</span>
          </div>
          <div className="hero-stat">
            <strong>{Object.keys(stats.byLang).filter(k=>k!=='Autre').length}</strong>
            <span>Languages</span>
          </div>
          <div className="hero-stat">
            <strong>100%</strong>
            <span>Authentic</span>
          </div>
        </div>
      </section>

      {/* CONTROLS */}
      <div className="controls">
        <div className="search-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="search-input"
            type="search"
            placeholder="Search..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>
        {filtered.length > 0 && (
          <button className="pres-launch" onClick={() => setPresenting(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            Presentation mode
          </button>
        )}
      </div>

      {/* LANG TABS */}
      <div className="lang-tabs">
        {LANGUAGES.map(l => {
          const count = l.key === 'all' ? stats.total : (stats.byLang[l.key] || 0);
          if (l.key !== 'all' && count === 0) return null;
          return (
            <button
              key={l.key}
              className={`lang-tab ${activeLang === l.key ? 'active' : ''}`}
              onClick={() => handleLang(l.key)}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
              <span className="count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* GRID */}
      <div className="section-wrap">
        {filtered.length === 0 ? (
          <div className="empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <p>No testimonials found.</p>
          </div>
        ) : (
          <>
            <div className="section-header">
              <div className="section-title">
                <span className="section-flag">{currentLang?.flag}</span>
                <span>{currentLang?.label === 'All' ? 'All testimonials' : currentLang?.label}</span>
                <span className="section-count">{filtered.length} video{filtered.length > 1 ? 's' : ''}</span>
              </div>
            </div>
            <div className="video-grid">
              {paginated.map(v => (
                <VideoCard key={v.guid} video={v} onClick={setSelected} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="pagination">
          <button className="page-btn" onClick={() => setPage(p => p-1)} disabled={curPage===1}>←</button>
          {Array.from({length: totalPages}, (_,i) => i+1)
            .filter(p => p===1 || p===totalPages || Math.abs(p-curPage)<=2)
            .reduce((acc, p, i, arr) => {
              if (i > 0 && p - arr[i-1] > 1) acc.push('…');
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) => p === '…'
              ? <span key={`e${i}`} className="page-btn" style={{cursor:'default'}}>…</span>
              : <button key={p} className={`page-btn ${p===curPage?'active':''}`} onClick={() => setPage(p)}>{p}</button>
            )
          }
          <button className="page-btn" onClick={() => setPage(p => p+1)} disabled={curPage===totalPages}>→</button>
        </div>
      )}

      {/* MODAL */}
      {selected && (
        <VideoModal
          video={selected}
          onClose={() => setSelected(null)}
          onNext={selIdx < filtered.length-1 ? goNext : null}
          onPrev={selIdx > 0 ? goPrev : null}
          position={selIdx+1}
          total={filtered.length}
        />
      )}

      {/* PRESENTATION */}
      {presenting && (
        <PresentationMode
          videos={filtered}
          onExit={() => setPresenting(false)}
        />
      )}

      {/* FOOTER */}
      <footer>
        <strong>⭐ Elio's Wall of Fame</strong> · {stats.total} authentic testimonials
      </footer>
    </>
  );
}
