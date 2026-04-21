'use client';

export default function FilterBar({
  search,
  onSearchChange,
  tagCatalog,
  activeTags,
  onTagToggle,
  onClear,
}) {
  const hasAnyTag = (tagCatalog.sector.length + tagCatalog.year.length + tagCatalog.tag.length) > 0;
  const hasActive = search.length > 0 || activeTags.length > 0;

  return (
    <div className="mb-6">
      <input
        type="text"
        placeholder="Rechercher un client, une entreprise…"
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        className="w-full h-11 px-4 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition mb-4"
      />

      {hasAnyTag && (
        <div className="space-y-3">
          <TagGroup
            label="Secteur"
            category="sector"
            values={tagCatalog.sector}
            activeTags={activeTags}
            onToggle={onTagToggle}
          />
          <TagGroup
            label="Année"
            category="year"
            values={tagCatalog.year}
            activeTags={activeTags}
            onToggle={onTagToggle}
          />
          {tagCatalog.tag.length > 0 && (
            <TagGroup
              label="Tags"
              category="tag"
              values={tagCatalog.tag}
              activeTags={activeTags}
              onToggle={onTagToggle}
            />
          )}
        </div>
      )}

      {hasActive && (
        <button
          onClick={onClear}
          className="mt-3 text-xs text-gray-500 hover:text-gray-900 underline underline-offset-2"
        >
          Effacer tous les filtres
        </button>
      )}
    </div>
  );
}

function TagGroup({ label, category, values, activeTags, onToggle }) {
  if (values.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-gray-500 mr-1 min-w-[60px]">{label}</span>
      {values.map(value => {
        const key = `${category}:${value}`;
        const isActive = activeTags.includes(key);
        return (
          <button
            key={key}
            onClick={() => onToggle(key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              isActive
                ? 'bg-black text-white border border-black'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-400'
            }`}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}
