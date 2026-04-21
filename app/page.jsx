'use client';

import { useState, useMemo, useCallback } from 'react';
import videosData from '@/data/manifest.json';
import FilterBar from './components/FilterBar';
import VideoGrid from './components/VideoGrid';
import VideoModal from './components/VideoModal';
import PresentationMode from './components/PresentationMode';
import Pagination from './components/Pagination';

const PAGE_SIZE = 24;

export default function Page() {
  const [search, setSearch] = useState('');
  const [activeTags, setActiveTags] = useState([]); // ["sector:SaaS", "year:2025"]
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [presenting, setPresenting] = useState(false);

  // Build tag catalog from data
  const tagCatalog = useMemo(() => {
    const sectors = new Set();
    const years = new Set();
    const customTags = new Set();

    videosData.forEach(v => {
      if (v.sector) sectors.add(v.sector);
      if (v.year) years.add(String(v.year));
      (v.tags || []).forEach(t => customTags.add(t));
    });

    return {
      sector: Array.from(sectors).sort(),
      year: Array.from(years).sort((a, b) => b.localeCompare(a)),
      tag: Array.from(customTags).sort(),
    };
  }, []);

  // Filter: within a category = OR, between categories = AND
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const byCategory = activeTags.reduce((acc, key) => {
      const [cat, val] = key.split(':');
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(val);
      return acc;
    }, {});

    return videosData.filter(v => {
      if (q) {
        const haystack = [v.clientName, v.company, v.role]
          .filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (byCategory.sector && !byCategory.sector.includes(v.sector)) return false;
      if (byCategory.year && !byCategory.year.includes(String(v.year))) return false;
      if (byCategory.tag) {
        const videoTags = v.tags || [];
        if (!byCategory.tag.some(t => videoTags.includes(t))) return false;
      }
      return true;
    });
  }, [search, activeTags]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleSearchChange = useCallback((value) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleTagToggle = useCallback((tagKey) => {
    setActiveTags(prev =>
      prev.includes(tagKey) ? prev.filter(t => t !== tagKey) : [...prev, tagKey]
    );
    setPage(1);
  }, []);

  const handleClearTags = useCallback(() => {
    setActiveTags([]);
    setSearch('');
    setPage(1);
  }, []);

  // Modal navigation based on the current filtered list
  const selectedIndex = selected ? filtered.findIndex(v => v.guid === selected.guid) : -1;
  const goNext = useCallback(() => {
    if (selectedIndex < 0 || selectedIndex >= filtered.length - 1) return;
    setSelected(filtered[selectedIndex + 1]);
  }, [selectedIndex, filtered]);
  const goPrev = useCallback(() => {
    if (selectedIndex <= 0) return;
    setSelected(filtered[selectedIndex - 1]);
  }, [selectedIndex, filtered]);

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-medium tracking-tight">
            Témoignages clients
          </h1>
          <p className="mt-2 text-gray-500">
            {videosData.length} retours d&apos;expérience de nos clients
          </p>
        </div>
        {filtered.length > 0 && (
          <button
            onClick={() => setPresenting(true)}
            className="self-start sm:self-auto inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-800 transition"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 2 L11 7 L3 12 Z" fill="currentColor" />
            </svg>
            Mode présentation
          </button>
        )}
      </header>

      <FilterBar
        search={search}
        onSearchChange={handleSearchChange}
        tagCatalog={tagCatalog}
        activeTags={activeTags}
        onTagToggle={handleTagToggle}
        onClear={handleClearTags}
      />

      {filtered.length === 0 ? (
        <p className="text-center text-gray-500 py-16">
          Aucun témoignage ne correspond à ta recherche.
        </p>
      ) : (
        <>
          <VideoGrid videos={paginated} onVideoClick={setSelected} />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
          <p className="text-center text-xs text-gray-400 mt-4">
            {filtered.length} sur {videosData.length} témoignages
          </p>
        </>
      )}

      {selected && (
        <VideoModal
          video={selected}
          onClose={() => setSelected(null)}
          onNext={selectedIndex < filtered.length - 1 ? goNext : null}
          onPrev={selectedIndex > 0 ? goPrev : null}
          position={selectedIndex + 1}
          total={filtered.length}
        />
      )}

      {presenting && (
        <PresentationMode
          videos={filtered}
          onExit={() => setPresenting(false)}
        />
      )}
    </main>
  );
}
