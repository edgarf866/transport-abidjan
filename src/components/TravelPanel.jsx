import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Navigation, MapPin, LocateFixed, ArrowRight, RotateCcw, Loader2, X, ChevronDown, ChevronUp, Footprints, Bus, ArrowLeftRight, Search, Crosshair } from 'lucide-react';
import { api } from '../lib/api';

/**
 * TravelPanel — Information voyageur + Itinéraire A→B
 *
 * Tab 1 : Arrêt le plus proche (géolocalisation)
 * Tab 2 : Itinéraire A→B (3 modes : géoloc, recherche textuelle, clic carte)
 */

// ─── Helpers ───

function getTypeLabel(type) {
  const labels = {
    express: 'Express', monbus: 'MonBus', wibus: 'WiBus',
    gbaka: 'Gbaka', woro: 'Woro-Woro', 'woro-woro': 'Woro-Woro',
    'woro_banalise': 'Woro Banalisé',
  };
  return labels[type?.toLowerCase()] || type || '—';
}

function getTypeColor(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('express')) return '#ef4444';
  if (t.includes('monbus')) return '#f97316';
  if (t.includes('wibus')) return '#8b5cf6';
  if (t.includes('gbaka')) return '#eab308';
  if (t.includes('woro')) return '#22c55e';
  return '#60a5fa';
}

function getTypeIcon(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('express')) return '🚍';
  if (t.includes('monbus')) return '🚌';
  if (t.includes('gbaka')) return '🚐';
  if (t.includes('woro')) return '🚕';
  return '🚏';
}

function formatDist(m) {
  if (m == null) return '';
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

// ─── Autocomplete / recherche de lieux ───

function buildSearchIndex(transportData) {
  const items = [];

  if (transportData?.arrets?.features) {
    transportData.arrets.features.forEach(f => {
      const p = f.properties || {};
      const coords = f.geometry?.coordinates;
      if (!coords || coords.length < 2 || !p.nom) return;
      items.push({
        name: p.nom,
        category: 'arret',
        icon: '🚏',
        sub: p.operateur || '',
        lat: coords[1],
        lon: coords[0],
      });
    });
  }

  if (transportData?.gares?.features) {
    transportData.gares.features.forEach(f => {
      const p = f.properties || {};
      const coords = f.geometry?.coordinates;
      if (!coords || coords.length < 2) return;
      const icons = { gare_routiere: '🚍', gare_woro: '🚕', gare_lagunaire: '⛴️', gare_gbaka: '🚐', gare_sotra: '🚏' };
      items.push({
        name: p.nom || 'Gare',
        category: 'gare',
        icon: icons[p.type_gare] || '📍',
        sub: p.type_gare?.replace(/_/g, ' ') || '',
        lat: coords[1],
        lon: coords[0],
      });
    });
  }

  if (transportData?.communes?.features) {
    transportData.communes.features.forEach(f => {
      const p = f.properties || {};
      const coords = f.geometry?.coordinates;
      if (!coords || coords.length < 2) return;
      items.push({
        name: p.nom || 'Commune',
        category: 'commune',
        icon: '🏘️',
        sub: p.population ? `${(p.population / 1000).toFixed(0)}k hab.` : '',
        lat: coords[1],
        lon: coords[0],
      });
    });
  }

  return items;
}

function fuzzyMatch(query, name) {
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const n = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return n.includes(q);
}

// ─── Composant : Champ de saisie avec autocomplete + 3 modes ───

function LocationInput({
  label,
  color,
  letter,
  value,
  onChange,
  onGeolocate,
  onMapClick,
  searchIndex,
  placeholder,
  mapClickActive,
}) {
  const [text, setText] = useState('');
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Sync text with value from outside (map click, geoloc, reset)
  useEffect(() => {
    if (value === null) {
      // Reset complet quand la valeur est vidée (ex: bouton réinitialiser)
      setText('');
      setResults([]);
      setShowDropdown(false);
    } else if (value?.label && text !== value.label) {
      setText(value.label);
      setShowDropdown(false);
    }
  }, [value]);

  // Search — local DB first, then Nominatim for external places
  const nominatimTimeout = useRef(null);
  const [nominatimLoading, setNominatimLoading] = useState(false);

  useEffect(() => {
    if (text.length < 2) {
      setResults([]);
      return;
    }

    // 1. Recherche locale (BDD)
    const localMatches = searchIndex
      .filter(item => fuzzyMatch(text, item.name))
      .slice(0, 8);

    // Priorité : gares > arrêts nommés > communes
    const priority = { gare: 0, commune: 1, arret: 2 };
    localMatches.sort((a, b) => {
      const pa = priority[a.category] ?? 3;
      const pb = priority[b.category] ?? 3;
      if (pa !== pb) return pa - pb;
      const aExact = a.name.toLowerCase().startsWith(text.toLowerCase()) ? 0 : 1;
      const bExact = b.name.toLowerCase().startsWith(text.toLowerCase()) ? 0 : 1;
      return aExact - bExact;
    });

    setResults(localMatches);

    // 2. Recherche Nominatim (debounced — toujours si 3+ caractères)
    if (nominatimTimeout.current) clearTimeout(nominatimTimeout.current);
    if (text.length >= 3) {
      // Ouvrir le dropdown immédiatement (même sans résultat local)
      // pour montrer le loading Nominatim
      setShowDropdown(true);
      setNominatimLoading(true);
      nominatimTimeout.current = setTimeout(async () => {
        try {
          const places = await api.geocode(text);
          const nominatimResults = places
            .filter(p => p.lat && p.lon)
            .map(p => ({
              name: p.display_name?.split(',').slice(0, 2).join(',') || p.display_name,
              category: 'lieu',
              icon: '📌',
              sub: p.type?.replace(/_/g, ' ') || 'lieu',
              lat: parseFloat(p.lat),
              lon: parseFloat(p.lon),
            }));

          // Fusionner : locaux en premier, puis Nominatim (sans doublons)
          const localNames = new Set(localMatches.map(m => m.name.toLowerCase()));
          const uniqueNominatim = nominatimResults.filter(
            r => !localNames.has(r.name.toLowerCase())
          );

          const merged = [...localMatches, ...uniqueNominatim].slice(0, 12);
          setResults(merged);
          setShowDropdown(merged.length > 0);
        } catch {}
        setNominatimLoading(false);
      }, 400);
    } else {
      // Moins de 3 caractères : que des résultats locaux
      setShowDropdown(localMatches.length > 0);
    }

    return () => { if (nominatimTimeout.current) clearTimeout(nominatimTimeout.current); };
  }, [text, searchIndex]);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const handleSelect = (item) => {
    setText(item.name);
    setShowDropdown(false);
    onChange({
      lat: item.lat,
      lon: item.lon,
      label: `${item.icon} ${item.name}`,
    });
  };

  const handleGeolocate = async () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { longitude: lon, latitude: lat } = pos.coords;
        // Find nearest stop name
        let label = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
        try {
          const nearby = await api.getNearby(lon, lat, 500);
          if (nearby?.features?.[0]?.properties?.nom) {
            label = `📍 Près de ${nearby.features[0].properties.nom}`;
          }
        } catch {}
        setText(label);
        onChange({ lat, lon, label });
        onGeolocate?.({ lat, lon });
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontFamily: 'var(--font-mono)', fontSize: 9, color, letterSpacing: 0.5, fontWeight: 600,
      }}>
        <div style={{
          width: 20, height: 20, borderRadius: '50%',
          background: `${color}22`, border: `2px solid ${color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 800, color,
          fontFamily: 'var(--font-display)',
        }}>{letter}</div>
        {label}
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        {/* Input texte */}
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => { setText(e.target.value); if (!e.target.value) onChange(null); }}
            onFocus={() => { if (results.length > 0 || text.length >= 3) setShowDropdown(true); }}
            placeholder={placeholder}
            title={text}
            style={{
              width: '100%',
              padding: '8px 6px 8px 26px',
              borderRadius: 8,
              background: value ? `${color}0a` : 'var(--bg-elevated)',
              border: `1px solid ${value ? `${color}44` : 'var(--glass-border)'}`,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)',
              fontSize: 11,
              outline: 'none',
              transition: 'all 0.2s',
              boxSizing: 'border-box',
            }}
          />
          <Search
            size={12}
            style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-muted)', pointerEvents: 'none',
            }}
          />

          {/* Dropdown résultats */}
          {showDropdown && (
            <div
              ref={dropdownRef}
              style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                zIndex: 100, marginTop: 4,
                maxHeight: 200, overflowY: 'auto',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--glass-border)',
                borderRadius: 8,
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}
            >
              {results.map((item, i) => {
                const prevCategory = i > 0 ? results[i - 1].category : null;
                const showSeparator = item.category === 'lieu' && prevCategory !== 'lieu';
                return (
                  <div key={i}>
                    {showSeparator && (
                      <div style={{
                        padding: '4px 10px', fontSize: 8, fontFamily: 'var(--font-mono)',
                        color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)',
                        borderBottom: '1px solid var(--glass-border)',
                        letterSpacing: 0.5,
                      }}>
                        LIEUX AUTOUR D'ABIDJAN
                      </div>
                    )}
                    <button
                      onClick={() => handleSelect(item)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                        padding: '7px 10px', cursor: 'pointer',
                        background: 'transparent',
                        border: 'none', borderBottom: '1px solid var(--glass-border)',
                        textAlign: 'left', transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(34,211,238,0.06)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ fontSize: 14, flexShrink: 0 }}>{item.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 500,
                          color: 'var(--text-primary)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {item.name}
                        </div>
                        <div style={{
                          fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)',
                        }}>
                          {item.sub}
                        </div>
                      </div>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 8,
                        padding: '1px 5px', borderRadius: 4,
                        background: item.category === 'lieu' ? 'rgba(251,146,60,0.1)' : 'rgba(255,255,255,0.05)',
                        color: item.category === 'lieu' ? 'var(--orange)' : 'var(--text-muted)',
                      }}>
                        {item.category}
                      </span>
                    </button>
                  </div>
                );
              })}
              {nominatimLoading && (
                <div style={{
                  padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)',
                }}>
                  <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
                  Recherche de lieux...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bouton géolocalisation */}
        <button
          onClick={handleGeolocate}
          disabled={geoLoading}
          title="Ma position"
          style={{
            width: 34, height: 34, borderRadius: 8, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--glass-border)',
            color: 'var(--cyan)', cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {geoLoading
            ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            : <LocateFixed size={14} />
          }
        </button>

        {/* Bouton clic sur carte */}
        <button
          onClick={() => onMapClick?.()}
          title="Pointer sur la carte"
          style={{
            width: 34, height: 34, borderRadius: 8, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: mapClickActive ? `${color}22` : 'var(--bg-elevated)',
            border: `1px solid ${mapClickActive ? color : 'var(--glass-border)'}`,
            color: mapClickActive ? color : 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            animation: mapClickActive ? 'blink 1.5s ease infinite' : 'none',
          }}
        >
          <Crosshair size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Sous-composant : Arrêt le plus proche ───

function NearestStopTab({ onFlyTo, onSetMarker }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userPos, setUserPos] = useState(null);
  const [nearbyStops, setNearbyStops] = useState([]);
  const [selectedStop, setSelectedStop] = useState(null);
  const [stopLines, setStopLines] = useState([]);
  const [loadingLines, setLoadingLines] = useState(false);
  const [radius, setRadius] = useState(500);

  const locate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNearbyStops([]);
    setSelectedStop(null);
    setStopLines([]);

    if (!navigator.geolocation) {
      setError('Géolocalisation non supportée par votre navigateur');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { longitude: lon, latitude: lat } = pos.coords;
        setUserPos({ lon, lat });
        onSetMarker?.({ lat, lon, type: 'user' });
        onFlyTo?.([lat, lon]);

        try {
          const result = await api.getNearby(lon, lat, radius);
          if (result?.features?.length) {
            setNearbyStops(result.features);
          } else {
            setError(`Aucun arrêt trouvé dans un rayon de ${radius}m`);
          }
        } catch (e) {
          setError('Erreur lors de la recherche des arrêts');
        }
        setLoading(false);
      },
      (err) => {
        const msgs = {
          1: 'Accès à la localisation refusé. Activez-la dans vos paramètres.',
          2: 'Position indisponible. Vérifiez votre GPS.',
          3: 'Délai de localisation dépassé. Réessayez.',
        };
        setError(msgs[err.code] || 'Erreur de géolocalisation');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [radius, onFlyTo, onSetMarker]);

  const selectStop = useCallback(async (stop) => {
    const coords = stop.geometry.coordinates;
    setSelectedStop(stop);
    setLoadingLines(true);
    setStopLines([]);
    onFlyTo?.([coords[1], coords[0]]);

    try {
      const result = await api.getLinesAtPoint(coords[0], coords[1], 150);
      if (result?.features?.length) {
        setStopLines(result.features);
      }
    } catch (e) {
      console.warn('Erreur chargement lignes:', e);
    }
    setLoadingLines(false);
  }, [onFlyTo]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Bouton géolocalisation */}
      <button
        onClick={locate}
        disabled={loading}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '10px 16px', borderRadius: 10,
          background: 'linear-gradient(135deg, rgba(34,211,238,0.15), rgba(34,211,238,0.05))',
          border: '1px solid rgba(34,211,238,0.3)',
          color: 'var(--cyan)', cursor: loading ? 'wait' : 'pointer',
          fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600,
          transition: 'all 0.2s',
        }}
      >
        {loading
          ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
          : <LocateFixed size={16} />
        }
        {loading ? 'Localisation en cours...' : 'Me localiser'}
      </button>

      {/* Sélecteur de rayon */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: 0.5 }}>
          RAYON
        </span>
        {[300, 500, 1000].map(r => (
          <button
            key={r}
            onClick={() => setRadius(r)}
            style={{
              padding: '3px 8px', borderRadius: 6, fontSize: 10,
              fontFamily: 'var(--font-mono)',
              background: radius === r ? 'rgba(34,211,238,0.15)' : 'transparent',
              border: `1px solid ${radius === r ? 'rgba(34,211,238,0.3)' : 'var(--glass-border)'}`,
              color: radius === r ? 'var(--cyan)' : 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            {r}m
          </button>
        ))}
      </div>

      {/* Erreur */}
      {error && (
        <div style={{
          padding: '8px 12px', borderRadius: 8,
          background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)',
          fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--red)',
        }}>
          {error}
        </div>
      )}

      {/* Liste des arrêts proches */}
      {nearbyStops.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: 0.5 }}>
            {nearbyStops.length} ARRÊT{nearbyStops.length > 1 ? 'S' : ''} TROUVÉ{nearbyStops.length > 1 ? 'S' : ''}
          </div>
          {nearbyStops.slice(0, 8).map((stop, i) => {
            const p = stop.properties;
            const isSelected = selectedStop === stop;
            const isSotra = p.operateur === 'SOTRA';
            return (
              <button
                key={i}
                onClick={() => selectStop(stop)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 8, textAlign: 'left',
                  background: isSelected ? 'rgba(34,211,238,0.1)' : 'transparent',
                  border: `1px solid ${isSelected ? 'rgba(34,211,238,0.25)' : 'var(--glass-border)'}`,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                <span style={{ fontSize: 16 }}>🚏</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 500,
                    color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {p.nom || 'Arrêt sans nom'}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 9,
                    color: isSotra ? 'var(--orange)' : 'var(--cyan-dim)',
                  }}>
                    {p.operateur || 'Inconnu'}
                  </div>
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
                  color: 'var(--cyan)', whiteSpace: 'nowrap',
                }}>
                  {formatDist(p.distance_m)}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Lignes desservant l'arrêt sélectionné */}
      {selectedStop && (
        <div style={{
          padding: '10px 12px', borderRadius: 8,
          background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: 0.5, marginBottom: 6 }}>
            LIGNES DESSERVANT CET ARRÊT
          </div>
          {loadingLines ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 11 }}>
              <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
              Recherche des lignes...
            </div>
          ) : stopLines.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {stopLines.map((line, i) => {
                const p = line.properties;
                const color = getTypeColor(p.type_ligne);
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '4px 8px', borderRadius: 6,
                      background: `${color}11`,
                      border: `1px solid ${color}33`,
                    }}
                  >
                    <span style={{ fontSize: 12 }}>{getTypeIcon(p.type_ligne)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 500,
                        color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {p.nom || p.code_ligne || 'Ligne'}
                      </div>
                    </div>
                    {p.nb_arrets && (
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)',
                        padding: '1px 5px', borderRadius: 4,
                        background: 'rgba(255,255,255,0.05)',
                      }}>
                        {p.nb_arrets} arrêts
                      </span>
                    )}
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)',
                      padding: '1px 5px', borderRadius: 4,
                      background: 'rgba(255,255,255,0.05)',
                    }}>
                      {getTypeLabel(p.type_ligne)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--text-muted)' }}>
              Aucune ligne trouvée à proximité
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helpers pour l'affichage des étapes ───

function getModeIcon(mode) {
  const icons = {
    marche: '🚶', correspondance: '🔄',
    bus_sotra: '🚌', gbaka: '🚐', woro_woro: '🚕',
    bateau: '⛴️', transport: '🚍',
  };
  return icons[mode] || '🚍';
}

function getModeColor(mode) {
  const colors = {
    marche: '#94a3b8', correspondance: '#fbbf24',
    bus_sotra: '#ef4444', gbaka: '#eab308', woro_woro: '#22c55e',
    bateau: '#3b82f6', transport: '#60a5fa',
  };
  return colors[mode] || '#60a5fa';
}

function getModeLabel(mode) {
  const labels = {
    marche: 'Marche', correspondance: 'Correspondance',
    bus_sotra: 'Bus SOTRA', gbaka: 'Gbaka', woro_woro: 'Woro-Woro',
    bateau: 'Bateau-bus', transport: 'Transport',
  };
  return labels[mode] || mode;
}

// ─── Composant : une étape d'itinéraire ───

function StepCard({ step, index, total, onFlyTo }) {
  const color = getModeColor(step.mode);
  const isLast = index === total - 1;

  return (
    <div style={{ display: 'flex', gap: 10, position: 'relative' }}>
      {/* Timeline verticale */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 24 }}>
        <div style={{
          width: 24, height: 24, borderRadius: '50%',
          background: `${color}22`, border: `2px solid ${color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, zIndex: 1,
        }}>
          {getModeIcon(step.mode)}
        </div>
        {!isLast && (
          <div style={{
            flex: 1, width: 2, minHeight: 20,
            background: step.mode === 'marche'
              ? `repeating-linear-gradient(to bottom, ${color} 0, ${color} 4px, transparent 4px, transparent 8px)`
              : color,
          }} />
        )}
      </div>

      {/* Contenu */}
      <div
        onClick={() => {
          if (step.from?.lat && step.from?.lon) onFlyTo?.([step.from.lat, step.from.lon]);
        }}
        style={{
          flex: 1, paddingBottom: isLast ? 0 : 10, cursor: step.from?.lat ? 'pointer' : 'default',
        }}
      >
        {/* Mode label with emoji */}
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, color,
          lineHeight: '24px', display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <span style={{ fontSize: 13 }}>{getModeIcon(step.mode)}</span>
          {getModeLabel(step.mode)}
        </div>

        {/* Ligne name prominently if available */}
        {step.ligne?.nom && (
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700,
            color: 'var(--text-primary)', marginTop: 2,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <span style={{
              display: 'inline-block', padding: '1px 7px', borderRadius: 5,
              background: `${color}25`, border: `1px solid ${color}55`,
              fontFamily: 'var(--font-mono)', fontSize: 10, color,
            }}>
              {step.ligne.nom}
            </span>
            {step.ligne.type && (
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)',
              }}>
                {getTypeLabel(step.ligne.type)}
              </span>
            )}
          </div>
        )}

        {/* Instruction text */}
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 500,
          color: 'var(--text-secondary)', lineHeight: '18px', marginTop: 3,
        }}>
          {step.instruction}
        </div>

        {/* Infos supplémentaires */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
          {step.duree_min != null && step.duree_min > 0 && (
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 9,
              padding: '2px 7px', borderRadius: 4,
              background: `${color}15`, color, border: `1px solid ${color}33`,
            }}>
              ~{Math.round(step.duree_min)} min
            </span>
          )}
          {step.distance_m != null && (
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 9,
              padding: '2px 7px', borderRadius: 4,
              background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)',
            }}>
              {formatDist(step.distance_m)}
            </span>
          )}
          {step.ligne?.operateur && (
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 9,
              padding: '2px 6px', borderRadius: 4,
              background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)',
            }}>
              {step.ligne.operateur}
            </span>
          )}
        </div>

        {/* Alerte sur cette étape */}
        {step.alerte && (
          <div style={{
            marginTop: 5, padding: '4px 8px', borderRadius: 5,
            background: 'rgba(251, 146, 60, 0.12)',
            border: '1px solid rgba(251, 146, 60, 0.3)',
            fontFamily: 'var(--font-display)', fontSize: 10, color: '#fb923c',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ fontSize: 12 }}>{'\u26A0\uFE0F'}</span>
            {step.alerte.type} — +{step.alerte.penalty_min} min
          </div>
        )}

        {/* From -> To */}
        {step.from?.nom && step.to?.nom && step.mode !== 'correspondance' && (
          <div style={{
            marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span>{step.from.nom}</span>
            <ArrowRight size={8} />
            <span>{step.to.nom}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Composant : carte d'itinéraire complet ───

function ItineraireCard({ itineraire, index, isExpanded, onToggle, onFlyTo }) {
  const typeColors = {
    direct: { bg: 'rgba(34,211,153,0.06)', border: 'rgba(34,211,153,0.2)', label: '#22d3a0' },
    'bateau-bus': { bg: 'rgba(59,130,246,0.06)', border: 'rgba(59,130,246,0.2)', label: '#3b82f6' },
    correspondance: { bg: 'rgba(251,191,36,0.06)', border: 'rgba(251,191,36,0.2)', label: '#fbbf24' },
    '2_correspondances': { bg: 'rgba(251,146,60,0.06)', border: 'rgba(251,146,60,0.2)', label: '#fb923c' },
  };
  const tc = typeColors[itineraire.type] || typeColors.correspondance;

  const typeLabels = {
    direct: 'Direct',
    'bateau-bus': 'Bateau-bus',
    correspondance: '1 correspondance',
    '2_correspondances': '2 correspondances',
  };

  const badgeColors = {
    direct: { bg: '#22c55e', text: '#fff' },
    'bateau-bus': { bg: '#3b82f6', text: '#fff' },
    correspondance: { bg: '#f97316', text: '#fff' },
    '2_correspondances': { bg: '#ef4444', text: '#fff' },
  };
  const badge = badgeColors[itineraire.type] || badgeColors.correspondance;

  // Modes utilisés dans cet itinéraire (hors marche et correspondance)
  const modes = [...new Set(itineraire.steps
    .filter(s => s.mode !== 'marche' && s.mode !== 'correspondance')
    .map(s => getModeIcon(s.mode)))];

  const isBlocked = itineraire.blocked;
  const hasWarnings = itineraire.alert_warnings?.length > 0;

  return (
    <div style={{
      borderRadius: 8, overflow: 'hidden',
      background: isBlocked ? 'rgba(239, 68, 68, 0.04)' : tc.bg,
      border: `1px solid ${isBlocked ? 'rgba(239, 68, 68, 0.25)' : tc.border}`,
      transition: 'all 0.2s',
      opacity: isBlocked ? 0.6 : 1,
    }}>
      {/* En-tête cliquable */}
      <div
        onClick={onToggle}
        style={{
          padding: '10px 12px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
        }}
      >
        <div style={{
          width: 22, height: 22, borderRadius: '50%',
          background: isBlocked ? 'rgba(239,68,68,0.15)' : `${tc.label}22`,
          border: `2px solid ${isBlocked ? '#ef4444' : tc.label}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 800, color: isBlocked ? '#ef4444' : tc.label,
          fontFamily: 'var(--font-display)',
        }}>
          {isBlocked ? '\u2716' : index + 1}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700,
              padding: '2px 8px', borderRadius: 10,
              background: isBlocked ? '#ef4444' : badge.bg,
              color: isBlocked ? '#fff' : badge.text,
              letterSpacing: 0.3,
            }}>
              {isBlocked ? 'Indisponible' : (typeLabels[itineraire.type] || 'Itinéraire')}
            </span>
            {hasWarnings && !isBlocked && (
              <span style={{ fontSize: 11 }}>{'\u26A0\uFE0F'}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
            {modes.map((icon, i) => (
              <span key={i} style={{ fontSize: 12 }}>{icon}</span>
            ))}
            {itineraire.duree_totale_min > 0 && (
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-primary)',
                fontWeight: 600, marginLeft: 4,
                textDecoration: isBlocked ? 'line-through' : 'none',
              }}>
                ~{Math.round(itineraire.duree_totale_min)} min
              </span>
            )}
          </div>
        </div>

        {isExpanded
          ? <ChevronUp size={14} color="var(--text-muted)" />
          : <ChevronDown size={14} color="var(--text-muted)" />
        }
      </div>

      {/* Bannière d'alertes */}
      {hasWarnings && isExpanded && (
        <div style={{
          padding: '6px 12px',
          background: isBlocked ? 'rgba(239,68,68,0.08)' : 'rgba(251,146,60,0.08)',
          borderTop: `1px solid ${isBlocked ? 'rgba(239,68,68,0.2)' : 'rgba(251,146,60,0.2)'}`,
        }}>
          {itineraire.alert_warnings.map((w, i) => (
            <div key={i} style={{
              fontFamily: 'var(--font-display)', fontSize: 10,
              color: w.blocked ? '#ef4444' : '#fb923c',
              padding: '2px 0',
            }}>
              {w.message}
            </div>
          ))}
        </div>
      )}

      {/* Étapes détaillées */}
      {isExpanded && (
        <div style={{
          padding: '8px 12px 12px',
          borderTop: `1px solid ${tc.border}`,
        }}>
          {itineraire.steps.map((step, i) => (
            <StepCard
              key={i}
              step={step}
              index={i}
              total={itineraire.steps.length}
              onFlyTo={onFlyTo}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sous-composant : Itinéraire A→B avec 3 modes ───

function ItineraireTab({ departure, arrival, onSetDeparture, onSetArrival, onRequestMapClick, mapClickMode, onFlyTo, onClearRoute, routeResult, onSetRouteResult, searchIndex }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(0);

  const search = useCallback(async () => {
    if (!departure || !arrival) return;
    setLoading(true);
    setError(null);
    onSetRouteResult(null);

    try {
      const result = await api.getItineraire(departure.lon, departure.lat, arrival.lon, arrival.lat, 500);
      if (!result) {
        setError('Impossible de contacter le serveur');
      } else if (!result.itineraires?.length) {
        setError(result.message || 'Aucun itinéraire trouvé. Essayez des points plus proches du réseau de transport.');
      } else {
        onSetRouteResult(result);
        setExpanded(0);
      }
    } catch (e) {
      setError('Erreur lors du calcul de l\'itinéraire');
    }
    setLoading(false);
  }, [departure, arrival, onSetRouteResult]);

  // Auto-search when both points are set
  useEffect(() => {
    if (departure && arrival) {
      search();
    }
  }, [departure, arrival]);

  // Distance à vol d'oiseau
  const distance = useMemo(() => {
    if (!departure || !arrival) return null;
    const R = 6371e3;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(arrival.lat - departure.lat);
    const dLon = toRad(arrival.lon - departure.lon);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(departure.lat)) * Math.cos(toRad(arrival.lat)) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }, [departure, arrival]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Champ Départ (A) */}
      <LocationInput
        label="DÉPART"
        color="#22d3ee"
        letter="A"
        value={departure}
        onChange={onSetDeparture}
        onGeolocate={(pos) => onFlyTo?.([pos.lat, pos.lon])}
        onMapClick={() => onRequestMapClick('departure')}
        searchIndex={searchIndex}
        placeholder="Tapez un lieu, quartier, arrêt..."
        mapClickActive={mapClickMode === 'departure'}
      />

      {/* Flèche */}
      <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 8, right: 8, top: '50%', borderTop: '1px dashed var(--glass-border)' }} />
        <div style={{
          width: 24, height: 24, borderRadius: '50%', zIndex: 1,
          background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ArrowRight size={12} color="var(--text-muted)" style={{ transform: 'rotate(90deg)' }} />
        </div>
      </div>

      {/* Champ Arrivée (B) */}
      <LocationInput
        label="ARRIVÉE"
        color="#fb923c"
        letter="B"
        value={arrival}
        onChange={onSetArrival}
        onGeolocate={(pos) => onFlyTo?.([pos.lat, pos.lon])}
        onMapClick={() => onRequestMapClick('arrival')}
        searchIndex={searchIndex}
        placeholder="Tapez un lieu, quartier, arrêt..."
        mapClickActive={mapClickMode === 'arrival'}
      />

      {/* Distance + Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={search}
          disabled={!departure || !arrival || loading}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '9px 14px', borderRadius: 8,
            background: departure && arrival
              ? 'linear-gradient(135deg, rgba(34,211,238,0.2), rgba(34,211,238,0.05))'
              : 'transparent',
            border: `1px solid ${departure && arrival ? 'rgba(34,211,238,0.3)' : 'var(--glass-border)'}`,
            color: departure && arrival ? 'var(--cyan)' : 'var(--text-muted)',
            fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600,
            cursor: departure && arrival ? 'pointer' : 'default',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading
            ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            : <Navigation size={14} />
          }
          {loading ? 'Calcul...' : 'Chercher itinéraire'}
        </button>
        {distance != null && (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)',
            padding: '4px 8px', borderRadius: 6,
            background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)',
            whiteSpace: 'nowrap',
          }}>
            {formatDist(distance)}
          </span>
        )}
        <button
          onClick={() => { setError(null); setExpanded(0); onSetRouteResult(null); onClearRoute(); }}
          style={{
            padding: '9px 12px', borderRadius: 8,
            background: 'transparent', border: '1px solid var(--glass-border)',
            color: 'var(--text-muted)', cursor: 'pointer',
          }}
          title="Réinitialiser"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Erreur */}
      {error && (
        <div style={{
          padding: '8px 12px', borderRadius: 8,
          background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)',
          fontFamily: 'var(--font-display)', fontSize: 11, color: '#f87171',
        }}>
          {error}
        </div>
      )}

      {/* Alertes actives globales */}
      {routeResult?.active_alerts?.length > 0 && (
        <div style={{
          padding: '8px 10px', borderRadius: 6,
          background: 'rgba(239, 68, 68, 0.06)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          marginBottom: 8,
        }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700,
            color: '#ef4444', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4,
          }}>
            {'\u26A0\uFE0F'} {routeResult.active_alerts.length} alerte{routeResult.active_alerts.length > 1 ? 's' : ''} en cours
          </div>
          {routeResult.active_alerts.map((a, i) => (
            <div key={i} style={{
              fontFamily: 'var(--font-display)', fontSize: 10,
              color: a.blocking ? '#ef4444' : '#fb923c',
              padding: '1px 0',
            }}>
              {a.blocking ? '\u{1F6AB}' : '\u26A0\uFE0F'} {a.type}{a.description ? ` — ${a.description}` : ''}
            </div>
          ))}
        </div>
      )}

      {/* Résultats — nouveau format multi-étapes */}
      {routeResult?.itineraires?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 0.5,
            color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Navigation size={10} />
            {routeResult.nb_resultats} ITINÉRAIRE{routeResult.nb_resultats > 1 ? 'S' : ''} TROUVÉ{routeResult.nb_resultats > 1 ? 'S' : ''}
          </div>

          {routeResult.itineraires.map((itin, i) => (
            <ItineraireCard
              key={i}
              itineraire={itin}
              index={i}
              isExpanded={expanded === i}
              onToggle={() => setExpanded(expanded === i ? null : i)}
              onFlyTo={onFlyTo}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Composant principal ───

const TABS = [
  { id: 'nearby', label: 'Arrêt proche', icon: LocateFixed },
  { id: 'itineraire', label: 'Itinéraire', icon: Navigation },
];

export default function TravelPanel({
  onFlyTo,
  onSetMarker,
  onRequestMapClick,
  mapClickMode,
  departure,
  arrival,
  onSetDeparture,
  onSetArrival,
  onClearRoute,
  routeResult,
  onSetRouteResult,
  onClose,
  transportData,
  onTabChange,
}) {
  const [tab, setTab] = useState('nearby');

  // Notify parent of initial tab on mount
  useEffect(() => {
    onTabChange?.('nearby');
  }, []);

  const handleSetTab = useCallback((newTab) => {
    setTab(newTab);
    onTabChange?.(newTab);
  }, [onTabChange]);

  // Build search index from transport data
  const searchIndex = useMemo(() => {
    return buildSearchIndex(transportData);
  }, [transportData?.arrets, transportData?.gares, transportData?.communes]);

  return (
    <div style={{
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(16px)',
      borderRadius: 'var(--panel-radius)',
      border: '1px solid var(--glass-border)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px',
        borderBottom: '1px solid var(--glass-border)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Navigation size={14} color="var(--cyan)" />
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
          }}>
            Information voyageur
          </span>
        </div>
        {onClose && (
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 2,
            color: 'var(--text-muted)',
          }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--glass-border)',
      }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handleSetTab(t.id)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px', cursor: 'pointer',
                background: active ? 'rgba(34,211,238,0.08)' : 'transparent',
                border: 'none',
                borderBottom: `2px solid ${active ? 'var(--cyan)' : 'transparent'}`,
                color: active ? 'var(--cyan)' : 'var(--text-muted)',
                fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: active ? 600 : 400,
                transition: 'all 0.2s',
              }}
            >
              <Icon size={13} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Indication mode clic actif */}
      {mapClickMode && (
        <div style={{
          padding: '6px 14px',
          background: mapClickMode === 'departure' ? 'rgba(34,211,238,0.1)' : 'rgba(251,146,60,0.1)',
          borderBottom: '1px solid var(--glass-border)',
          fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 0.5,
          color: mapClickMode === 'departure' ? 'var(--cyan)' : 'var(--orange)',
          textAlign: 'center',
          animation: 'blink 1.5s ease infinite',
        }}>
          CLIQUEZ SUR LA CARTE POUR PLACER LE POINT {mapClickMode === 'departure' ? 'A (DÉPART)' : 'B (ARRIVÉE)'}
        </div>
      )}

      {/* Content */}
      <div style={{ padding: '12px 14px', maxHeight: tab === 'itineraire' ? 'calc(100vh - 260px)' : 420, overflowY: 'auto' }}>
        {tab === 'nearby' && (
          <NearestStopTab onFlyTo={onFlyTo} onSetMarker={onSetMarker} />
        )}
        {tab === 'itineraire' && (
          <ItineraireTab
            departure={departure}
            arrival={arrival}
            onSetDeparture={onSetDeparture}
            onSetArrival={onSetArrival}
            onRequestMapClick={onRequestMapClick}
            mapClickMode={mapClickMode}
            onFlyTo={onFlyTo}
            onClearRoute={onClearRoute}
            routeResult={routeResult}
            onSetRouteResult={onSetRouteResult}
            searchIndex={searchIndex}
          />
        )}
      </div>
    </div>
  );
}
