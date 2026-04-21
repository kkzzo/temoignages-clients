'use client';

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  // Build page list with ellipsis: 1 ... 4 5 [6] 7 8 ... 20
  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <nav className="flex items-center justify-center gap-1 mt-10" aria-label="Pagination">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="h-9 w-9 flex items-center justify-center rounded-md border border-gray-200 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-gray-400 transition"
        aria-label="Page précédente"
      >
        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M7.5 2 L3.5 6 L7.5 10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>

      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-gray-400 text-sm">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`h-9 min-w-[36px] px-2 rounded-md text-sm font-medium transition ${
              p === currentPage
                ? 'bg-black text-white'
                : 'border border-gray-200 text-gray-700 hover:border-gray-400'
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="h-9 w-9 flex items-center justify-center rounded-md border border-gray-200 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-gray-400 transition"
        aria-label="Page suivante"
      >
        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M4.5 2 L8.5 6 L4.5 10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    </nav>
  );
}

function getPageNumbers(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = new Set([1, total, current, current - 1, current + 1]);
  // Always show 2 and total-1 if near boundary
  if (current <= 3) { pages.add(2); pages.add(3); pages.add(4); }
  if (current >= total - 2) { pages.add(total - 1); pages.add(total - 2); pages.add(total - 3); }

  const sorted = Array.from(pages).filter(p => p >= 1 && p <= total).sort((a, b) => a - b);

  // Insert ellipsis where gaps exist
  const result = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push('…');
    result.push(p);
  });
  return result;
}
