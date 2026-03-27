import { useState, useRef, useEffect, useMemo, useCallback } from 'react';

/**
 * SearchBar — Barre de recherche globale pour arrêts, lignes, gares et communes.
 *
 * Props:
 *   transportData — objet contenant arrets, gares, lignes, communes (GeoJSON)
 *   onSelect      — callback({ type, data, coords }) pour fly-to + affichage détail
 */
export default function SearchBar({ transportData, onSelect }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // ---- Indexer toutes les données en une seule liste ----
  const allItems = useMemo(() => {
    const items = [];

    // Arrêts
    if (transportData?.arrets?.features) {
      transportData.arrets.features.forEach(f => {
        const p = f.properties || {};
        const coords = f.geometry?.coordinates;
        if (!coords || coords.length < 2) return;
        items.push({
          id: `arret-${p.id || items.length}`,
          name: p.nom || 'Arrêt sans nom',
          category: 'arret',
          label: '🚏 Arrêt',
          color: p.operateur === 'SOTRA' ? '#f97316' : '#22d3ee',
          sub: p.operateur || '',
          lat: coords[1],
          lng: coords[0],
          props: p,
        });
      });
    }

    // Gares
    if (transportData?.gares?.features) {
      transportData.gares.features.forEach(f => {
        const p = f.properties || {};
        const coords = f.geometry?.coordinates;
        if (!coords || coords.length < 2) return;
        const icons = { gare_routiere: '🚍', gare_woro: '🚕', gare_lagunaire: '⛴️', gare_gbaka: '🚐', gare_sotra: '🚏' };
        items.push({
          id: `gare-${p.id || items.length}`,
          name: p.nom || 'Gare',
          category: 'gare',
          label: `${icons[p.type_gare] || '📍'} Gare`,
          color: '#22d3ee',
          sub: p.type_gare?.replace(/_/g, ' ') || '',
          lat: coords[1],
          lng: coords[0],
          props: p,
        });
      });
    }

    // Lignes
    if (transportData?.lignes?.features) {
      transportData.lignes.features.forEach(f => {
        const p = f.properties || {};
        const geom = f.geometry;
        if (!geom) return;
        // Trouver le milieu de la ligne pour le fly-to
        let midLat = 5.35, midLng = -4.0;
        try {
          const coordsList = geom.type === 'MultiLineString' ? geom.coordinates[0] : geom.coordinates;
          if (coordsList?.length) {
            const mid = coordsList[Math.floor(coordsList.length / 2)];
            midLng = mid[0]; midLat = mid[1];
          }
        } catch {}
        items.push({
          id: `ligne-${p.id || p.code_ligne || items.length}`,
          name: p.nom || `Ligne ${p.code_ligne || ''}`,
          category: 'ligne',
          label: '🚌 Ligne',
          color: '#f97316',
          sub: `${p.operateur || ''} ${p.type_ligne || ''}`.trim(),
          lat: midLat,
          lng: midLng,
          props: p,
        });
      });
    }

    // Communes
    if (transportData?.communes?.features) {
      transportData.communes.features.forEach(f => {
        const p = f.properties || {};
        const coords = f.geometry?.coordinates;
        if (!coords || coords.length < 2) return;
        items.push({
          id: `commune-${p.id || items.length}`,
          name: p.nom || 'Commune',
          category: 'commune',
          label: '🏘️ Commune',
          color: '#34d399',
          sub: p.population ? `${(p.population / 1000).toFixed(0)}k hab.` : '',
          lat: coords[1],
          lng: coords[0],
          props: p,
        });
      });
    }

    return items;
  }, [transportData]);

  // ---- Filtrer par texte ----
  const results = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];
    const q = query.toLowerCase().trim();
    const matched = allItems.filter(item =>
      item.name.toLowerCase().includes(q) ||
      item.sub.toLowerCase().includes(q) ||
      item.category.includes(q)
    );
    // Trier : nom exact d'abord, puis par catégorie (gares/communes avant arrêts)
    const priority = { commune: 0, gare: 1, ligne: 2, arret: 3 };
    matched.sort((a, b) => {
      const aExact = a.name.toLowerCase().startsWith(q) ? 0 : 1;
      const bExact = b.name.toLowerCase().startsWith(q) ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      return (priority[a.category] || 9) - (priority[b.category] || 9);
    });
    return matched.slice(0, 20); // Max 20 résultats
  }, [query, allItems]);

  // ---- Sélection d'un résultat ----
  const handlePick = useCallback((item) => {
    setQuery('');
    setOpen(false);
    setActiveIndex(-1);
    if (onSelect) {
      onSelect({
        type: item.category === 'arret' ? 'hub' : item.category === 'ligne' ? 'line' : 'hub',
        data: {
          name: item.name,
          lat: item.lat,
          lng: item.lng,
          ...item.props,
        },
        coords: [item.lat, item.lng],
      });
    }
  }, [onSelect]);

  // ---- Clavier : flèches + Enter + Escape ----
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
      inputRef.current?.blur();
      return;
    }
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handlePick(results[activeIndex]);
    }
  }, [results, activeIndex, handlePick]);

  // Fermer la liste si on clique en dehors
  useEffect(() => {
    function handleClickOutside(e) {
      if (listRef.current && !listRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll sur l'élément actif
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const el = listRef.current.children[activeIndex];
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const showResults = open && results.length > 0;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Input */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--glass-border)',
        borderRadius: 10,
        padding: '6px 12px',
        transition: 'border-color 0.2s',
        borderColor: open ? 'var(--glass-border-hover)' : 'var(--glass-border)',
      }}>
        <span style={{ fontSize: 14, opacity: 0.5 }}>🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="Rechercher arrêt, ligne, gare, commune..."
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setActiveIndex(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-display)',
            fontSize: 12,
            letterSpacing: 0.3,
          }}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(false); }}
            aria-label="Effacer la recherche"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 16, lineHeight: 1,
              padding: 2,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown résultats */}
      {showResults && (
        <div
          ref={listRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0, right: 0,
            background: 'var(--bg-surface)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border)',
            borderRadius: 10,
            maxHeight: 300,
            overflowY: 'auto',
            zIndex: 2000,
            boxShadow: 'var(--glass-shadow)',
          }}
        >
          {results.map((item, i) => (
            <div
              key={item.id}
              onClick={() => handlePick(item)}
              onMouseEnter={() => setActiveIndex(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px',
                cursor: 'pointer',
                background: i === activeIndex ? 'var(--cyan-glow)' : 'transparent',
                borderBottom: i < results.length - 1 ? '1px solid var(--glass-border)' : 'none',
                transition: 'background 0.15s',
              }}
            >
              {/* Badge catégorie */}
              <span style={{
                fontSize: 9,
                fontFamily: 'var(--font-mono)',
                color: item.color,
                background: `${item.color}15`,
                border: `1px solid ${item.color}30`,
                borderRadius: 4,
                padding: '2px 6px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>
                {item.label}
              </span>

              {/* Nom */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12,
                  color: 'var(--text-primary)',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {item.name}
                </div>
                {item.sub && (
                  <div style={{
                    fontSize: 10,
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {item.sub}
                  </div>
                )}
              </div>

              {/* Flèche */}
              <span style={{ color: 'var(--text-muted)', fontSize: 12, flexShrink: 0 }}>→</span>
            </div>
          ))}
        </div>
      )}

      {/* Message "aucun résultat" */}
      {open && query.length >= 2 && results.length === 0 && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0, right: 0,
          background: 'var(--bg-surface)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--glass-border)',
          borderRadius: 10,
          padding: '12px 16px',
          textAlign: 'center',
          zIndex: 2000,
        }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
            Aucun résultat pour "{query}"
          </span>
        </div>
      )}
    </div>
  );
}
