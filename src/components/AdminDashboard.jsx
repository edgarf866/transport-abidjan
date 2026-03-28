import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { X, LogOut, Loader2, ChevronLeft, ChevronRight, Lock } from 'lucide-react';

const TYPE_CONFIG = {
  nouvel_arret:        { emoji: '\u{1F68F}', label: 'Nouvel arr\u00eat',        color: 'var(--emerald)' },
  correction_nom:      { emoji: '\u270F\uFE0F',  label: 'Correction nom',       color: 'var(--blue)' },
  position_incorrecte: { emoji: '\u{1F4CD}', label: 'Position incorrecte',  color: 'var(--purple)' },
  prix_trajet:         { emoji: '\u{1F4B0}', label: 'Prix trajet',          color: 'var(--amber)' },
  horaire:             { emoji: '\u23F0',     label: 'Horaire',              color: 'var(--cyan)' },
  alerte:              { emoji: '\u26A0\uFE0F',  label: 'Alerte',               color: 'var(--red)' },
  enrichir_gare:       { emoji: '\u{1F3E2}', label: 'Enrichir gare',        color: 'var(--orange)' },
  trajet_textuel:      { emoji: '\u{1F690}', label: 'Trajet textuel',       color: '#2dd4bf' },
};

const STATUS_TABS = [
  { key: 'pending',  label: 'En attente' },
  { key: 'approved', label: 'Approuv\u00e9es' },
  { key: 'rejected', label: 'Rejet\u00e9es' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'Tous les types' },
  { value: 'nouvel_arret', label: '\u{1F68F} Nouvel arr\u00eat' },
  { value: 'correction_nom', label: '\u270F\uFE0F Correction nom' },
  { value: 'position_incorrecte', label: '\u{1F4CD} Position incorrecte' },
  { value: 'prix_trajet', label: '\u{1F4B0} Prix trajet' },
  { value: 'horaire', label: '\u23F0 Horaire' },
  { value: 'alerte', label: '\u26A0\uFE0F Alerte' },
  { value: 'enrichir_gare', label: '\u{1F3E2} Enrichir gare' },
  { value: 'trajet_textuel', label: '\u{1F690} Trajet textuel' },
];

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function ContributionData({ type, data }) {
  if (!data) return null;
  const rowStyle = { display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-secondary)' };
  const labelStyle = { color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 };
  const valStyle = { color: 'var(--text-primary)' };

  const row = (label, value) => value ? (
    <div key={label} style={{ marginBottom: 4 }}>
      <span style={labelStyle}>{label}: </span>
      <span style={valStyle}>{value}</span>
    </div>
  ) : null;

  switch (type) {
    case 'nouvel_arret':
      return (
        <div style={rowStyle}>
          {row('Nom', data.nom)}
          {row('Type transport', data.type_transport)}
          {row('Lat/Lng', data.lat != null ? `${data.lat}, ${data.lng}` : null)}
        </div>
      );
    case 'correction_nom':
      return (
        <div style={rowStyle}>
          {row('Ancien nom', data.reference || data.ancien_nom)}
          {row('Nouveau nom', data.nouveau_nom)}
        </div>
      );
    case 'position_incorrecte':
      return (
        <div style={rowStyle}>
          {row('R\u00e9f\u00e9rence', data.reference || data.nom)}
          {row('Nouvelle position', data.lat != null ? `${data.lat}, ${data.lng}` : null)}
        </div>
      );
    case 'prix_trajet':
      return (
        <div style={rowStyle}>
          {row('D\u00e9part', data.depart)}
          {row('Arriv\u00e9e', data.arrivee)}
          {row('Mode', data.mode)}
          {row('Prix', data.prix != null ? `${data.prix} FCFA` : null)}
        </div>
      );
    case 'horaire':
      return (
        <div style={rowStyle}>
          {row('Ligne', data.ligne)}
          {row('Mode', data.mode)}
          {row('Horaires', data.horaires)}
        </div>
      );
    case 'alerte':
      return (
        <div style={rowStyle}>
          {row('Type alerte', data.type_alerte)}
          {row('Description', data.description)}
          {row('Dur\u00e9e', data.duree)}
        </div>
      );
    case 'enrichir_gare':
      return (
        <div style={rowStyle}>
          {row('Gare', data.gare || data.nom)}
          {row('Lignes', Array.isArray(data.lignes) ? data.lignes.join(', ') : data.lignes)}
          {row('Infos', data.infos)}
        </div>
      );
    case 'trajet_textuel':
      return (
        <div style={rowStyle}>
          {row('Mode', data.mode)}
          {row('Nom ligne', data.nom_ligne)}
          {row('De', data.from || data.depart)}
          {row('\u00c0', data.to || data.arrivee)}
          {data.points_passage && Array.isArray(data.points_passage) && data.points_passage.length > 0 && (
            <div style={{ width: '100%', marginBottom: 4 }}>
              <span style={labelStyle}>Points de passage: </span>
              <span style={valStyle}>{data.points_passage.join(' \u2192 ')}</span>
            </div>
          )}
          {row('Prix', data.prix != null ? `${data.prix} FCFA` : null)}
          {row('Fr\u00e9quence', data.frequence)}
        </div>
      );
    default:
      return (
        <pre style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'pre-wrap', margin: 0 }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      );
  }
}

export default function AdminDashboard({ onClose }) {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [stats, setStats] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const storedPassword = password;

  const fetchStats = useCallback(async () => {
    const result = await api.adminGetStats(storedPassword);
    if (!result.error) setStats(result);
  }, [storedPassword]);

  const fetchContributions = useCallback(async () => {
    setLoading(true);
    const result = await api.adminGetContributions(
      storedPassword,
      statusFilter,
      typeFilter || null,
      50,
      offset
    );
    if (!result.error) {
      setContributions(result.contributions || []);
      setTotal(result.total || 0);
    }
    setLoading(false);
  }, [storedPassword, statusFilter, typeFilter, offset]);

  useEffect(() => {
    if (authenticated) {
      fetchStats();
      fetchContributions();
    }
  }, [authenticated, fetchStats, fetchContributions]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);
    const result = await api.adminGetStats(password);
    setLoading(false);
    if (result.error) {
      setLoginError('Mot de passe incorrect');
    } else {
      setStats(result);
      setAuthenticated(true);
    }
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setPassword('');
    setStats(null);
    setContributions([]);
    setError('');
  };

  const handleStatusChange = (status) => {
    setStatusFilter(status);
    setOffset(0);
  };

  const handleTypeChange = (e) => {
    setTypeFilter(e.target.value);
    setOffset(0);
  };

  const [lastAction, setLastAction] = useState(null);

  const handleApprove = async (id) => {
    setActionLoading(id);
    const res = await api.adminReviewContribution(storedPassword, id, 'approved');
    if (res.applied_action) {
      setLastAction({ id, action: res.applied_action });
      setTimeout(() => setLastAction(null), 5000);
    }
    await Promise.all([fetchStats(), fetchContributions()]);
    setActionLoading(null);
  };

  const handleRejectConfirm = async (id) => {
    setActionLoading(id);
    await api.adminReviewContribution(storedPassword, id, 'rejected', rejectReason || null);
    setRejectingId(null);
    setRejectReason('');
    await Promise.all([fetchStats(), fetchContributions()]);
    setActionLoading(null);
  };

  // ── Overlay container ──
  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100dvh',
    zIndex: 9000,
    background: 'var(--bg-void)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    overflowY: 'auto',
    fontFamily: 'var(--font-display)',
  };

  const containerStyle = {
    width: '100%',
    maxWidth: 900,
    padding: 20,
  };

  // ── LOGIN SCREEN ──
  if (!authenticated) {
    return (
      <div style={overlayStyle}>
        <div style={{
          ...containerStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100dvh',
        }}>
          <div style={{
            background: 'var(--metric-card-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--panel-radius)',
            padding: 32,
            width: '100%',
            maxWidth: 400,
          }}>
            <h2 style={{
              color: 'var(--text-primary)',
              fontSize: 20,
              margin: '0 0 24px',
              textAlign: 'center',
              fontFamily: 'var(--font-display)',
            }}>
              {'\u{1F510}'} Administration TransportMap
            </h2>
            <form onSubmit={handleLogin}>
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <Lock size={16} style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }} />
                <input
                  type="password"
                  placeholder="Mot de passe admin"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setLoginError(''); }}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 38px',
                    background: 'var(--bg-deep)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    fontFamily: 'var(--font-mono)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              {loginError && (
                <div style={{
                  color: 'var(--red)',
                  fontSize: 13,
                  marginBottom: 12,
                  textAlign: 'center',
                }}>
                  {loginError}
                </div>
              )}
              <button
                type="submit"
                disabled={loading || !password}
                style={{
                  width: '100%',
                  minHeight: 44,
                  background: 'var(--cyan)',
                  color: '#000',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading ? 'wait' : 'pointer',
                  opacity: loading || !password ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginBottom: 12,
                  transition: 'opacity 0.2s',
                }}
              >
                {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                Connexion
              </button>
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: '100%',
                  minHeight: 44,
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 8,
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
              >
                Retour
              </button>
            </form>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  // ── DASHBOARD ──
  const statCards = stats ? [
    { emoji: '\u{1F7E1}', label: 'En attente', value: stats.pending ?? 0, color: 'var(--amber)' },
    { emoji: '\u2705',     label: 'Approuv\u00e9es', value: stats.approved ?? 0, color: 'var(--emerald)' },
    { emoji: '\u274C',     label: 'Rejet\u00e9es', value: stats.rejected ?? 0, color: 'var(--red)' },
    { emoji: '\u{1F4CA}', label: 'Total', value: stats.total ?? 0, color: 'var(--cyan)' },
  ] : [];

  const pageCount = Math.ceil(total / 50);
  const currentPage = Math.floor(offset / 50) + 1;

  return (
    <div style={overlayStyle}>
      <div style={containerStyle}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <h1 style={{
            color: 'var(--text-primary)',
            fontSize: 20,
            margin: 0,
            fontFamily: 'var(--font-display)',
          }}>
            {'\u2699\uFE0F'} Administration
          </h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleLogout}
              style={{
                minHeight: 44,
                padding: '0 16px',
                background: 'transparent',
                color: 'var(--text-muted)',
                border: '1px solid var(--glass-border)',
                borderRadius: 8,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'border-color 0.2s',
              }}
            >
              <LogOut size={14} /> D\u00e9connexion
            </button>
            <button
              onClick={onClose}
              style={{
                minHeight: 44,
                width: 44,
                background: 'transparent',
                color: 'var(--text-muted)',
                border: '1px solid var(--glass-border)',
                borderRadius: 8,
                fontSize: 16,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'border-color 0.2s',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Stats cards */}
        {stats && (
          <div data-admin-stats="" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
            marginBottom: 20,
          }}>
            {statCards.map((s) => (
              <div key={s.label} style={{
                background: 'var(--metric-card-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--panel-radius)',
                padding: '16px 12px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>{s.emoji}</div>
                <div style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: s.color,
                  fontFamily: 'var(--font-mono)',
                }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}>
          {/* Status tabs */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-deep)',
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid var(--glass-border)',
          }}>
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleStatusChange(tab.key)}
                style={{
                  minHeight: 38,
                  padding: '0 16px',
                  background: statusFilter === tab.key ? 'var(--cyan)' : 'transparent',
                  color: statusFilter === tab.key ? '#000' : 'var(--text-secondary)',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: statusFilter === tab.key ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={handleTypeChange}
            style={{
              minHeight: 38,
              padding: '0 12px',
              background: 'var(--bg-deep)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--glass-border)',
              borderRadius: 8,
              fontSize: 13,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            padding: 40,
            color: 'var(--text-muted)',
          }}>
            <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        )}

        {/* Action feedback banner */}
        {lastAction && (
          <div style={{
            padding: '10px 16px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 8,
            color: 'var(--emerald)',
            fontSize: 13,
            fontFamily: 'var(--font-display)',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            {'\u2705'} <strong>Action appliquée :</strong> {lastAction.action}
          </div>
        )}

        {/* Contributions list */}
        {!loading && contributions.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: 'var(--text-muted)',
            fontSize: 15,
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>
              {statusFilter === 'pending' ? '\u{1F4ED}' : statusFilter === 'approved' ? '\u2705' : '\u{1F4AD}'}
            </div>
            Aucune contribution {statusFilter === 'pending' ? 'en attente' : statusFilter === 'approved' ? 'approuv\u00e9e' : 'rejet\u00e9e'} pour le moment
          </div>
        )}

        {!loading && contributions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {contributions.map((c) => {
              const cfg = TYPE_CONFIG[c.type] || { emoji: '\u{1F4CB}', label: c.type, color: 'var(--text-muted)' };
              const isRejecting = rejectingId === c.id;
              const isActionLoading = actionLoading === c.id;

              return (
                <div key={c.id} style={{
                  background: 'var(--metric-card-bg)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--panel-radius)',
                  padding: 16,
                  transition: 'border-color 0.2s',
                }}>
                  {/* Card header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 10,
                    flexWrap: 'wrap',
                  }}>
                    {/* Type badge */}
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '3px 10px',
                      background: `${cfg.color}20`,
                      color: cfg.color,
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                    }}>
                      {cfg.emoji} {cfg.label}
                    </span>

                    {/* Pseudo */}
                    <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                      {c.pseudo || 'Anonyme'}
                    </span>

                    {/* Date */}
                    <span style={{
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                      marginLeft: 'auto',
                    }}>
                      {formatDate(c.created_at)}
                    </span>
                  </div>

                  {/* Data details */}
                  <div style={{ marginBottom: 10 }}>
                    <ContributionData type={c.type} data={c.data} />
                  </div>

                  {/* Location */}
                  {c.lat != null && c.lng != null && (
                    <div style={{
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                      marginBottom: 10,
                    }}>
                      {'\u{1F4CD}'} {Number(c.lat).toFixed(4)}, {Number(c.lng).toFixed(4)}
                    </div>
                  )}

                  {/* Admin note for reviewed items */}
                  {c.admin_note && (
                    <div style={{
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-deep)',
                      padding: '8px 12px',
                      borderRadius: 6,
                      marginBottom: 10,
                      borderLeft: '3px solid var(--glass-border)',
                    }}>
                      <strong>Note admin :</strong> {c.admin_note}
                    </div>
                  )}

                  {/* Status badge for reviewed items */}
                  {c.status === 'approved' && (
                    <div style={{ fontSize: 12, color: 'var(--emerald)', marginBottom: 6 }}>
                      Approuv\u00e9e \u2705 {c.reviewed_at ? `\u2014 ${formatDate(c.reviewed_at)}` : ''}
                    </div>
                  )}
                  {c.status === 'rejected' && (
                    <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 6 }}>
                      Rejet\u00e9e \u274C {c.reviewed_at ? `\u2014 ${formatDate(c.reviewed_at)}` : ''}
                    </div>
                  )}

                  {/* Action buttons for pending items */}
                  {c.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                      <button
                        onClick={() => handleApprove(c.id)}
                        disabled={isActionLoading}
                        style={{
                          minHeight: 36,
                          padding: '0 16px',
                          background: 'var(--emerald)',
                          color: '#000',
                          border: 'none',
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: isActionLoading ? 'wait' : 'pointer',
                          opacity: isActionLoading ? 0.6 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          transition: 'opacity 0.2s',
                        }}
                      >
                        {isActionLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : '\u2705'} Approuver
                      </button>

                      {!isRejecting ? (
                        <button
                          onClick={() => { setRejectingId(c.id); setRejectReason(''); }}
                          disabled={isActionLoading}
                          style={{
                            minHeight: 36,
                            padding: '0 16px',
                            background: 'var(--red)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            opacity: isActionLoading ? 0.6 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            transition: 'opacity 0.2s',
                          }}
                        >
                          {'\u274C'} Rejeter
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1, minWidth: 200 }}>
                          <input
                            type="text"
                            placeholder="Raison du rejet (optionnel)"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            autoFocus
                            style={{
                              flex: 1,
                              minHeight: 36,
                              padding: '0 10px',
                              background: 'var(--bg-deep)',
                              border: '1px solid var(--glass-border)',
                              borderRadius: 6,
                              color: 'var(--text-primary)',
                              fontSize: 13,
                              outline: 'none',
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRejectConfirm(c.id);
                              if (e.key === 'Escape') setRejectingId(null);
                            }}
                          />
                          <button
                            onClick={() => handleRejectConfirm(c.id)}
                            disabled={isActionLoading}
                            style={{
                              minHeight: 36,
                              padding: '0 12px',
                              background: 'var(--red)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 6,
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: isActionLoading ? 'wait' : 'pointer',
                              opacity: isActionLoading ? 0.6 : 1,
                            }}
                          >
                            Confirmer
                          </button>
                          <button
                            onClick={() => setRejectingId(null)}
                            style={{
                              minHeight: 36,
                              padding: '0 10px',
                              background: 'transparent',
                              color: 'var(--text-muted)',
                              border: '1px solid var(--glass-border)',
                              borderRadius: 6,
                              fontSize: 13,
                              cursor: 'pointer',
                            }}
                          >
                            Annuler
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && total > 50 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: '12px 0 24px',
          }}>
            <button
              onClick={() => setOffset(Math.max(0, offset - 50))}
              disabled={offset === 0}
              style={{
                minHeight: 38,
                padding: '0 16px',
                background: offset === 0 ? 'transparent' : 'var(--bg-deep)',
                color: offset === 0 ? 'var(--text-muted)' : 'var(--text-secondary)',
                border: '1px solid var(--glass-border)',
                borderRadius: 8,
                fontSize: 13,
                cursor: offset === 0 ? 'default' : 'pointer',
                opacity: offset === 0 ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <ChevronLeft size={14} /> Pr\u00e9c\u00e9dent
            </button>
            <span style={{
              fontSize: 13,
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}>
              {offset + 1}\u2013{Math.min(offset + 50, total)} sur {total} contributions
            </span>
            <button
              onClick={() => setOffset(offset + 50)}
              disabled={offset + 50 >= total}
              style={{
                minHeight: 38,
                padding: '0 16px',
                background: offset + 50 >= total ? 'transparent' : 'var(--bg-deep)',
                color: offset + 50 >= total ? 'var(--text-muted)' : 'var(--text-secondary)',
                border: '1px solid var(--glass-border)',
                borderRadius: 8,
                fontSize: 13,
                cursor: offset + 50 >= total ? 'default' : 'pointer',
                opacity: offset + 50 >= total ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              Suivant <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Non-paginated count */}
        {!loading && contributions.length > 0 && total <= 50 && (
          <div style={{
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            padding: '4px 0 24px',
          }}>
            {total} contribution{total > 1 ? 's' : ''}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @media (max-width: 768px) {
          [data-admin-stats] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}
