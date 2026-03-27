import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { X, ChevronLeft, MapPin, Search, Plus, Trash2, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';

// ─── Helpers ───

function generateFingerprint() {
  const raw = [navigator.userAgent, screen.width, screen.height, Intl.DateTimeFormat().resolvedOptions().timeZone].join('|');
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

const TRANSPORT_MODES = [
  { value: 'gbaka', label: 'Gbaka' },
  { value: 'woro-woro', label: 'Woro-woro' },
  { value: 'bus_sotra', label: 'Bus SOTRA' },
  { value: 'bateau-bus', label: 'Bateau-bus' },
];

const ALERT_TYPES = [
  'Route coupée',
  'Embouteillage',
  'Grève',
  'Inondation',
  'Accident',
  'Autre',
];

const ALERT_DURATIONS = [
  { value: '1h', label: '1 heure' },
  { value: '2h', label: '2 heures' },
  { value: '6h', label: '6 heures' },
  { value: '12h', label: '12 heures' },
  { value: '24h', label: '24 heures' },
];

const CONTRIBUTION_TYPES = [
  { key: 'nouvel_arret', emoji: '\u{1F68F}', label: 'Arrêt manquant' },
  { key: 'correction_nom', emoji: '\u270F\uFE0F', label: 'Corriger un nom' },
  { key: 'position_incorrecte', emoji: '\u{1F4CD}', label: 'Position incorrecte' },
  { key: 'prix_trajet', emoji: '\u{1F4B0}', label: "Prix d'un trajet" },
  { key: 'horaire', emoji: '\u23F0', label: 'Horaire / fréquence' },
  { key: 'alerte', emoji: '\u26A0\uFE0F', label: 'Signaler un problème' },
  { key: 'enrichir_gare', emoji: '\u{1F3E2}', label: 'Enrichir une gare' },
  { key: 'trajet_textuel', emoji: '\u{1F690}', label: 'Décrire un trajet' },
];

// ─── Shared styles ───

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  background: 'var(--metric-card-bg)',
  border: '1px solid var(--glass-border)',
  borderRadius: 8,
  color: 'var(--text-primary)',
  fontSize: 14,
  fontFamily: 'var(--font-display)',
  outline: 'none',
  minHeight: 44,
  boxSizing: 'border-box',
};

const selectStyle = {
  ...inputStyle,
  appearance: 'none',
  WebkitAppearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2394a3b8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  paddingRight: 32,
};

const labelStyle = {
  display: 'block',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: 1,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  marginBottom: 6,
};

const btnPrimary = {
  width: '100%',
  padding: '12px 16px',
  background: 'var(--cyan)',
  color: '#000',
  border: 'none',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  fontFamily: 'var(--font-display)',
  cursor: 'pointer',
  minHeight: 44,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  transition: 'opacity 0.2s',
};

const btnSecondary = {
  ...btnPrimary,
  background: 'var(--metric-card-bg)',
  color: 'var(--text-primary)',
  border: '1px solid var(--glass-border)',
};

// ─── SearchSelect Component ───

function SearchSelect({ items, placeholder, value, onChange, labelKey = 'name' }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return items.filter(it => {
      const name = (it[labelKey] || it.name || it.nom || '').toLowerCase();
      return name.includes(q);
    }).slice(0, 8);
  }, [query, items, labelKey]);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectedLabel = value
    ? (value[labelKey] || value.name || value.nom || '')
    : '';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {value ? (
        <div style={{
          ...inputStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedLabel}
          </span>
          <button
            type="button"
            onClick={() => { onChange(null); setQuery(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            style={{ ...inputStyle, paddingLeft: 34 }}
          />
        </div>
      )}

      {open && !value && filtered.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 9999,
          background: 'var(--bg-surface)',
          border: '1px solid var(--glass-border)',
          borderRadius: 8,
          marginTop: 4,
          maxHeight: 200,
          overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          backdropFilter: 'none',
          isolation: 'isolate',
        }}>
          {filtered.map((it, i) => (
            <button
              type="button"
              key={i}
              onClick={() => { onChange(it); setOpen(false); setQuery(''); }}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'none',
                border: 'none',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--glass-border)' : 'none',
                color: 'var(--text-primary)',
                fontSize: 13,
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: 'var(--font-display)',
              }}
            >
              {it[labelKey] || it.name || it.nom}
              {it.type && (
                <span style={{ marginLeft: 8, color: 'var(--text-muted)', fontSize: 11 }}>
                  {it.type}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Flatten arrets/gares/lignes for search ───

function flattenFeatures(geojson, category) {
  if (!geojson?.features) return [];
  return geojson.features
    .filter(f => f.geometry?.coordinates && f.properties)
    .map(f => {
      const coords = f.geometry.coordinates;
      // Pour les lignes (LineString/MultiLineString), prendre le milieu ou le premier point
      let lat, lng;
      if (f.geometry.type === 'Point') {
        lng = coords[0];
        lat = coords[1];
      } else if (f.geometry.type === 'LineString' && coords.length > 0) {
        const mid = coords[Math.floor(coords.length / 2)];
        lng = mid[0];
        lat = mid[1];
      } else if (f.geometry.type === 'MultiLineString' && coords.length > 0 && coords[0].length > 0) {
        const firstLine = coords[0];
        const mid = firstLine[Math.floor(firstLine.length / 2)];
        lng = mid[0];
        lat = mid[1];
      } else {
        return null;
      }

      return {
        name: f.properties.nom || f.properties.name || f.properties.code_ligne || 'Sans nom',
        type: f.properties.type_gare || f.properties.type_ligne || f.properties.operateur || category,
        lat,
        lng,
        id: f.properties.id || f.properties.gid,
        _category: category,
        // Infos supplémentaires pour les lignes
        ...(category === 'ligne' && {
          code_ligne: f.properties.code_ligne,
          operateur: f.properties.operateur,
          frequence: f.properties.frequence,
          depart: f.properties.depart,
          arrivee: f.properties.arrivee,
        }),
      };
    }).filter(Boolean);
}

// ─── Main Component ───

export default function ContributePanel({
  onClose,
  onPickOnMap,
  mapClickPosition,
  existingArrets,
  existingGares,
  existingLignes,
}) {
  const [step, setStep] = useState(1);
  const [type, setType] = useState(null);
  const [formData, setFormData] = useState({});
  const [pseudo, setPseudo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [waitingMapClick, setWaitingMapClick] = useState(null); // which field is waiting

  // Flatten arrets/gares/lignes for search
  const arretsList = useMemo(() => flattenFeatures(existingArrets, 'arret'), [existingArrets]);
  const garesList = useMemo(() => flattenFeatures(existingGares, 'gare'), [existingGares]);
  const lignesList = useMemo(() => flattenFeatures(existingLignes, 'ligne'), [existingLignes]);
  const allStops = useMemo(() => [...arretsList, ...garesList], [arretsList, garesList]);

  // Handle map click position updates
  useEffect(() => {
    if (mapClickPosition && waitingMapClick) {
      setFormData(prev => ({
        ...prev,
        [waitingMapClick + '_lat']: mapClickPosition.lat,
        [waitingMapClick + '_lng']: mapClickPosition.lng,
      }));
      setWaitingMapClick(null);
    }
  }, [mapClickPosition, waitingMapClick]);

  // Success auto-close
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => onClose(), 3000);
      return () => clearTimeout(t);
    }
  }, [success, onClose]);

  const updateField = useCallback((key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  const handlePickMap = useCallback((fieldPrefix) => {
    setWaitingMapClick(fieldPrefix);
    onPickOnMap();
  }, [onPickOnMap]);

  const handleSelectType = useCallback((key) => {
    setType(key);
    setFormData({});
    setStep(2);
    setError(null);
  }, []);

  const goBack = useCallback(() => {
    if (step === 3) {
      setStep(2);
    } else if (step === 2) {
      setStep(1);
      setType(null);
      setFormData({});
    }
    setError(null);
  }, [step]);

  const goToSubmit = useCallback(() => {
    setStep(3);
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setError(null);

    try {
      const fingerprint = generateFingerprint();
      const contribution = {
        type,
        pseudo: pseudo.trim() || 'Anonyme',
        fingerprint,
        data: {},
      };

      // ── Normalize data & extract reference/geometry per type ──
      if (type === 'nouvel_arret') {
        contribution.lat = formData.position_lat;
        contribution.lng = formData.position_lng;
        contribution.data = {
          nom: formData.nom,
          transport_type: formData.transport_type,
        };

      } else if (type === 'correction_nom') {
        const stop = formData.selected_stop;
        if (stop) {
          contribution.reference_id = stop.id;
          contribution.reference_type = stop._category; // 'arret' ou 'gare'
          contribution.lat = stop.lat;
          contribution.lng = stop.lng;
          contribution.data = {
            ancien_nom: stop.name,
            nouveau_nom: formData.nouveau_nom,
          };
        }

      } else if (type === 'position_incorrecte') {
        const stop = formData.selected_stop;
        if (stop) {
          contribution.reference_id = stop.id;
          contribution.reference_type = stop._category;
          contribution.lat = formData.position_lat;
          contribution.lng = formData.position_lng;
          contribution.data = {
            nom: stop.name,
            ancien_lat: stop.lat,
            ancien_lng: stop.lng,
            new_lat: formData.position_lat,
            new_lng: formData.position_lng,
          };
        }

      } else if (type === 'prix_trajet') {
        const ligne = formData.selected_ligne;
        if (ligne) {
          contribution.reference_id = ligne.id;
          contribution.reference_type = 'ligne';
        }
        contribution.data = {
          ligne_nom: ligne?.name || formData.depart_text,
          depart: formData.depart,
          arrivee: formData.arrivee,
          transport_type: formData.transport_type,
          prix: formData.prix ? Number(formData.prix) : null,
        };

      } else if (type === 'horaire') {
        const ligne = formData.selected_ligne;
        if (ligne) {
          contribution.reference_id = ligne.id;
          contribution.reference_type = 'ligne';
        }
        contribution.data = {
          ligne_nom: ligne?.name || formData.ligne,
          transport_type: formData.transport_type,
          horaires: formData.horaires,
        };

      } else if (type === 'alerte') {
        contribution.lat = formData.position_lat;
        contribution.lng = formData.position_lng;
        contribution.data = {
          alert_type: formData.alert_type,
          description: formData.description,
          duree: formData.duree,
        };

      } else if (type === 'enrichir_gare') {
        const gare = formData.selected_gare;
        if (gare) {
          contribution.reference_id = gare.id;
          contribution.reference_type = 'gare';
          contribution.lat = gare.lat;
          contribution.lng = gare.lng;
          contribution.data = {
            gare_nom: gare.name,
            lignes: formData.lignes,
            infos: formData.infos,
          };
        }

      } else if (type === 'trajet_textuel') {
        contribution.data = {
          transport_type: formData.transport_type,
          ligne: formData.ligne,
          depart: formData.depart,
          arrivee: formData.arrivee,
          points_passage: (formData.points_passage || []).filter(p => p.trim()),
          prix: formData.prix ? Number(formData.prix) : null,
          frequence: formData.frequence,
        };
      }

      const result = await api.submitContribution(contribution);

      if (result.success === false) {
        throw new Error(result.message || 'Erreur inconnue');
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'envoi');
    } finally {
      setSubmitting(false);
    }
  }, [type, formData, pseudo]);

  // ─── Render: Success ───
  if (success) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <CheckCircle size={48} color="var(--emerald)" style={{ marginBottom: 12 }} />
        <div style={{
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-display)',
        }}>
          Merci ! Votre contribution sera vérifiée sous 24h
        </div>
      </div>
    );
  }

  // ─── Step Dots ───
  const renderStepDots = () => (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
      {[1, 2, 3].map(s => (
        <div
          key={s}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: s <= step ? 'var(--cyan)' : 'var(--glass-border)',
            transition: 'background 0.3s',
          }}
        />
      ))}
    </div>
  );

  // ─── Map click button ───
  const renderMapButton = (fieldPrefix, label) => {
    const lat = formData[fieldPrefix + '_lat'];
    const lng = formData[fieldPrefix + '_lng'];
    const isWaiting = waitingMapClick === fieldPrefix;

    return (
      <div>
        <button
          type="button"
          onClick={() => handlePickMap(fieldPrefix)}
          style={{
            ...btnSecondary,
            borderColor: isWaiting ? 'var(--cyan)' : 'var(--glass-border)',
            color: isWaiting ? 'var(--cyan)' : 'var(--text-primary)',
          }}
        >
          <MapPin size={16} />
          {isWaiting ? 'Cliquez sur la carte...' : label}
        </button>
        {lat != null && lng != null && (
          <div style={{
            marginTop: 6,
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-secondary)',
          }}>
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </div>
        )}
      </div>
    );
  };

  // ─── Dynamic points list (for trajet_textuel) ───
  const renderPointsPassage = () => {
    const points = formData.points_passage || [];
    return (
      <div>
        <label style={labelStyle}>Points de passage</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {points.map((pt, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                value={pt}
                placeholder={`Point ${i + 1}`}
                onChange={e => {
                  const updated = [...points];
                  updated[i] = e.target.value;
                  updateField('points_passage', updated);
                }}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                type="button"
                onClick={() => {
                  const updated = points.filter((_, j) => j !== i);
                  updateField('points_passage', updated);
                }}
                style={{
                  background: 'none',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 8,
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  width: 44,
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
                aria-label={`Supprimer le point ${i + 1}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => updateField('points_passage', [...points, ''])}
            style={{
              ...btnSecondary,
              fontSize: 13,
              padding: '10px 12px',
            }}
          >
            <Plus size={16} />
            Ajouter un point de passage
          </button>
        </div>
      </div>
    );
  };

  // ─── Step 2 form fields ───
  const renderFormFields = () => {
    const gap = 16;
    const fields = { display: 'flex', flexDirection: 'column', gap };

    switch (type) {
      case 'nouvel_arret':
        return (
          <div style={fields}>
            {renderMapButton('position', '\u{1F4CD} Placer sur la carte')}
            <div>
              <label style={labelStyle}>Nom de l'arrêt</label>
              <input
                type="text"
                placeholder="Ex: Carrefour Vie"
                value={formData.nom || ''}
                onChange={e => updateField('nom', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Type de transport</label>
              <select
                value={formData.transport_type || ''}
                onChange={e => updateField('transport_type', e.target.value)}
                style={selectStyle}
              >
                <option value="">-- Sélectionner --</option>
                {TRANSPORT_MODES.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>
        );

      case 'correction_nom':
        return (
          <div style={fields}>
            <div>
              <label style={labelStyle}>Chercher l'arrêt ou la gare à corriger</label>
              <SearchSelect
                items={allStops}
                placeholder="Tapez un nom..."
                value={formData.selected_stop || null}
                onChange={v => updateField('selected_stop', v)}
              />
            </div>
            <div>
              <label style={labelStyle}>Nouveau nom correct</label>
              <input
                type="text"
                placeholder="Nom corrigé"
                value={formData.nouveau_nom || ''}
                onChange={e => updateField('nouveau_nom', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
        );

      case 'position_incorrecte':
        return (
          <div style={fields}>
            <div>
              <label style={labelStyle}>Chercher l'arrêt ou la gare</label>
              <SearchSelect
                items={allStops}
                placeholder="Tapez un nom..."
                value={formData.selected_stop || null}
                onChange={v => updateField('selected_stop', v)}
              />
            </div>
            {renderMapButton('position', '\u{1F4CD} Placer la bonne position')}
          </div>
        );

      case 'prix_trajet':
        return (
          <div style={fields}>
            <div>
              <label style={labelStyle}>Chercher la ligne (optionnel)</label>
              <SearchSelect
                items={lignesList}
                placeholder="Tapez un nom de ligne..."
                value={formData.selected_ligne || null}
                onChange={v => updateField('selected_ligne', v)}
              />
              {formData.selected_ligne && (
                <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {formData.selected_ligne.operateur && `${formData.selected_ligne.operateur} · `}
                  {formData.selected_ligne.depart && `${formData.selected_ligne.depart} → ${formData.selected_ligne.arrivee}`}
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Départ</label>
              <input
                type="text"
                placeholder="Ex: Yopougon Siporex"
                value={formData.depart || ''}
                onChange={e => updateField('depart', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Arrivée</label>
              <input
                type="text"
                placeholder="Ex: Plateau"
                value={formData.arrivee || ''}
                onChange={e => updateField('arrivee', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Mode de transport</label>
              <select
                value={formData.transport_type || ''}
                onChange={e => updateField('transport_type', e.target.value)}
                style={selectStyle}
              >
                <option value="">-- Sélectionner --</option>
                {TRANSPORT_MODES.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Prix en FCFA</label>
              <input
                type="number"
                placeholder="Ex: 200"
                value={formData.prix || ''}
                onChange={e => updateField('prix', e.target.value)}
                style={inputStyle}
                min="0"
              />
            </div>
          </div>
        );

      case 'horaire':
        return (
          <div style={fields}>
            <div>
              <label style={labelStyle}>Chercher la ligne</label>
              <SearchSelect
                items={lignesList}
                placeholder="Tapez un nom de ligne..."
                value={formData.selected_ligne || null}
                onChange={v => updateField('selected_ligne', v)}
              />
              {formData.selected_ligne && (
                <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {formData.selected_ligne.operateur && `${formData.selected_ligne.operateur} · `}
                  {formData.selected_ligne.frequence && `Fréquence actuelle : ${formData.selected_ligne.frequence}`}
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Ou tapez le nom manuellement</label>
              <input
                type="text"
                placeholder="Ex: Ligne 81"
                value={formData.ligne || ''}
                onChange={e => updateField('ligne', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Mode de transport</label>
              <select
                value={formData.transport_type || ''}
                onChange={e => updateField('transport_type', e.target.value)}
                style={selectStyle}
              >
                <option value="">-- Sélectionner --</option>
                {TRANSPORT_MODES.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Horaires / fréquence</label>
              <textarea
                placeholder="Ex: Départ toutes les 15 min de 6h à 21h"
                value={formData.horaires || ''}
                onChange={e => updateField('horaires', e.target.value)}
                style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              />
            </div>
          </div>
        );

      case 'alerte':
        return (
          <div style={fields}>
            {renderMapButton('position', '\u{1F4CD} Localiser le problème')}
            <div>
              <label style={labelStyle}>Type de problème</label>
              <select
                value={formData.alert_type || ''}
                onChange={e => updateField('alert_type', e.target.value)}
                style={selectStyle}
              >
                <option value="">-- Sélectionner --</option>
                {ALERT_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea
                placeholder="Décrivez le problème..."
                value={formData.description || ''}
                onChange={e => updateField('description', e.target.value)}
                style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Durée estimée</label>
              <select
                value={formData.duree || ''}
                onChange={e => updateField('duree', e.target.value)}
                style={selectStyle}
              >
                <option value="">-- Sélectionner --</option>
                {ALERT_DURATIONS.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          </div>
        );

      case 'enrichir_gare':
        return (
          <div style={fields}>
            <div>
              <label style={labelStyle}>Chercher la gare</label>
              <SearchSelect
                items={garesList}
                placeholder="Tapez un nom de gare..."
                value={formData.selected_gare || null}
                onChange={v => updateField('selected_gare', v)}
              />
            </div>
            <div>
              <label style={labelStyle}>Lignes disponibles</label>
              <textarea
                placeholder="Ex: Gbaka vers Adjamé, Woro-woro vers Cocody"
                value={formData.lignes || ''}
                onChange={e => updateField('lignes', e.target.value)}
                style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Informations complémentaires</label>
              <textarea
                placeholder="État, services, etc."
                value={formData.infos || ''}
                onChange={e => updateField('infos', e.target.value)}
                style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              />
            </div>
          </div>
        );

      case 'trajet_textuel':
        return (
          <div style={fields}>
            <div>
              <label style={labelStyle}>Mode de transport</label>
              <select
                value={formData.transport_type || ''}
                onChange={e => updateField('transport_type', e.target.value)}
                style={selectStyle}
              >
                <option value="">-- Sélectionner --</option>
                {TRANSPORT_MODES.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Nom de la ligne</label>
              <input
                type="text"
                placeholder="Ex: Gbaka Yopougon-Adjamé"
                value={formData.ligne || ''}
                onChange={e => updateField('ligne', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Départ</label>
              <input
                type="text"
                placeholder="Terminus de départ"
                value={formData.depart || ''}
                onChange={e => updateField('depart', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Arrivée</label>
              <input
                type="text"
                placeholder="Terminus d'arrivée"
                value={formData.arrivee || ''}
                onChange={e => updateField('arrivee', e.target.value)}
                style={inputStyle}
              />
            </div>
            {renderPointsPassage()}
            <div>
              <label style={labelStyle}>Prix (FCFA, optionnel)</label>
              <input
                type="number"
                placeholder="Ex: 200"
                value={formData.prix || ''}
                onChange={e => updateField('prix', e.target.value)}
                style={inputStyle}
                min="0"
              />
            </div>
            <div>
              <label style={labelStyle}>Fréquence (optionnel)</label>
              <input
                type="text"
                placeholder="Ex: Toutes les 10 min"
                value={formData.frequence || ''}
                onChange={e => updateField('frequence', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ─── Render ───
  return (
    <div style={{
      width: '100%',
      maxHeight: 'calc(100vh - 160px)',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 16px 12px',
        borderBottom: '1px solid var(--glass-border)',
        position: 'sticky',
        top: 0,
        background: 'var(--glass-bg)',
        zIndex: 10,
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {step > 1 && (
            <button
              type="button"
              onClick={goBack}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
              }}
              aria-label="Retour"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}>
            Contribuer
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label="Fermer"
        >
          <X size={20} />
        </button>
      </div>

      {/* Step dots */}
      <div style={{ padding: '12px 16px 0' }}>
        {renderStepDots()}
      </div>

      {/* Content */}
      <div style={{ padding: '0 16px 16px', flex: 1 }}>
        {/* Step 1: Choose type */}
        {step === 1 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 10,
            animation: 'fadeIn 0.2s ease',
          }}>
            {CONTRIBUTION_TYPES.map(ct => (
              <button
                key={ct.key}
                type="button"
                onClick={() => handleSelectType(ct.key)}
                style={{
                  padding: '14px 10px',
                  background: 'var(--metric-card-bg)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 10,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'border-color 0.2s, transform 0.15s',
                  minHeight: 44,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--cyan)';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--glass-border)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <span style={{ fontSize: 22 }}>{ct.emoji}</span>
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-display)',
                  textAlign: 'center',
                  lineHeight: 1.3,
                }}>
                  {ct.label}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Form fields */}
        {step === 2 && (
          <div style={{ animation: 'fadeIn 0.2s ease' }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-accent)',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span>{CONTRIBUTION_TYPES.find(c => c.key === type)?.emoji}</span>
              <span>{CONTRIBUTION_TYPES.find(c => c.key === type)?.label}</span>
            </div>

            {renderFormFields()}

            <button
              type="button"
              onClick={goToSubmit}
              style={{ ...btnPrimary, marginTop: 20 }}
            >
              Continuer
            </button>
          </div>
        )}

        {/* Step 3: Pseudo + Submit */}
        {step === 3 && (
          <div style={{ animation: 'fadeIn 0.2s ease', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 14,
              color: 'var(--text-secondary)',
              textAlign: 'center',
              marginBottom: 4,
            }}>
              Dernière étape !
            </div>

            <div>
              <label style={labelStyle}>Votre pseudo (optionnel)</label>
              <input
                type="text"
                placeholder="Anonyme"
                value={pseudo}
                onChange={e => setPseudo(e.target.value)}
                style={inputStyle}
              />
            </div>

            {error && (
              <div style={{
                padding: '10px 12px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 8,
                color: '#ef4444',
                fontSize: 13,
                fontFamily: 'var(--font-display)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <AlertTriangle size={16} />
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                ...btnPrimary,
                opacity: submitting ? 0.7 : 1,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Envoi en cours...
                </>
              ) : (
                'Envoyer ma contribution'
              )}
            </button>
          </div>
        )}
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
