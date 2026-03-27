import { METRO_PROJECT } from '../data/transport';

const LINE_TYPES = [
  { label: 'MonBus (SOTRA)', color: '#f97316' },
  { label: 'Express (SOTRA)', color: '#ef4444' },
  { label: 'Wibus (SOTRA)', color: '#8b5cf6' },
  { label: 'Navette (SOTRA)', color: '#f59e0b' },
  { label: 'Gbaka', color: '#eab308' },
  { label: 'Woro-Woro', color: '#22c55e' },
  { label: 'Woro-Woro Banalisé', color: '#10b981' },
  { label: 'Bateau-bus', color: '#06b6d4', dash: true },
];

const ROUTE_TYPES = [
  { label: 'Autoroute', color: '#ef4444' },
  { label: 'Trunk', color: '#f97316' },
  { label: 'Primaire', color: '#eab308' },
  { label: 'Secondaire', color: '#22c55e' },
];

const MARKER_TYPES = [
  { icon: '🚍', label: 'Gare routière' },
  { icon: '🚕', label: 'Gare Woro' },
  { icon: '⛴️', label: 'Gare lagunaire' },
  { icon: '🚐', label: 'Gare Gbaka' },
  { icon: '🚏', label: 'Gare SOTRA' },
  { icon: '🚂', label: 'Voie ferrée' },
];

export default function LegendPanel() {
  return (
    <div className="glass-panel animate-slide-right" style={{
      padding: '12px 16px',
      width: '100%',
      overflowY: 'auto',
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: 1.5,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        marginBottom: 10,
      }}>
        Légende
      </div>

      {/* Lignes de transport */}
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 8,
        letterSpacing: 1,
        color: 'var(--text-muted)',
        marginBottom: 6,
      }}>
        LIGNES DE TRANSPORT
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
        {LINE_TYPES.map(lt => (
          <div key={lt.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 20, height: 3,
              borderRadius: 2,
              background: lt.dash
                ? `repeating-linear-gradient(90deg, ${lt.color} 0px, ${lt.color} 4px, transparent 4px, transparent 7px)`
                : lt.color,
              boxShadow: `0 0 4px ${lt.color}44`,
            }} />
            <span style={{
              fontSize: 10,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-display)',
            }}>
              {lt.label}
            </span>
          </div>
        ))}
      </div>

      {/* Routes */}
      <div style={{
        paddingTop: 8,
        borderTop: '1px solid var(--glass-border)',
        marginBottom: 6,
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 8,
          letterSpacing: 1,
          color: 'var(--text-muted)',
          marginBottom: 6,
        }}>
          ROUTES
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
          {ROUTE_TYPES.map(rt => (
            <div key={rt.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 20, height: 3,
                borderRadius: 2,
                background: rt.color,
                opacity: 0.6,
              }} />
              <span style={{
                fontSize: 10,
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-display)',
              }}>
                {rt.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Metro line */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        paddingTop: 8,
        borderTop: '1px solid var(--glass-border)',
        marginBottom: 10,
      }}>
        <div style={{
          width: 20, height: 3,
          borderRadius: 2,
          background: `repeating-linear-gradient(90deg, ${METRO_PROJECT.color} 0px, ${METRO_PROJECT.color} 4px, transparent 4px, transparent 7px)`,
        }} />
        <span style={{
          fontSize: 10,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-display)',
          flex: 1,
        }}>
          Métro L1
        </span>
        <span style={{
          fontSize: 10,
          padding: '1px 5px',
          borderRadius: 3,
          background: 'rgba(236, 72, 153, 0.15)',
          color: 'var(--metro-color)',
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
        }}>
          PROJET
        </span>
      </div>

      {/* Hub markers */}
      <div style={{ paddingTop: 8, borderTop: '1px solid var(--glass-border)' }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 8,
          letterSpacing: 1,
          color: 'var(--text-muted)',
          marginBottom: 6,
        }}>
          MARQUEURS
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {MARKER_TYPES.map(m => (
            <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 12 }}>{m.icon}</span>
              <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{m.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
