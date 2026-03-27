import { Users, Route, MapPin, Zap, Building2, Ship } from 'lucide-react';
import { formatNumber } from '../utils/helpers';

export default function StatsPanel({ liveStats }) {
  // Si les stats live sont disponibles, les utiliser
  const stats = liveStats
    ? [
        { icon: Users, label: 'POPULATION', value: formatNumber(liveStats.population_totale), color: 'var(--cyan)' },
        { icon: Route, label: 'LIGNES', value: formatNumber(liveStats.nb_lignes), color: 'var(--bus-color)' },
        { icon: MapPin, label: 'ARRÊTS', value: formatNumber(liveStats.nb_arrets), color: 'var(--emerald)' },
        { icon: Building2, label: 'GARES', value: formatNumber(liveStats.nb_gares), color: 'var(--amber)' },
        { icon: Ship, label: 'LAGUNAIRE', value: formatNumber(liveStats.nb_lagunaire), color: 'var(--teal)' },
        { icon: Zap, label: 'RÉSEAU KM', value: liveStats.reseau_routier_km + ' km', color: 'var(--purple)' },
      ]
    : [
        { icon: Users, label: 'POPULATION', value: '—', color: 'var(--cyan)' },
        { icon: Route, label: 'LIGNES', value: '—', color: 'var(--bus-color)' },
        { icon: MapPin, label: 'ARRÊTS', value: '—', color: 'var(--emerald)' },
        { icon: Building2, label: 'GARES', value: '—', color: 'var(--amber)' },
      ];

  const operators = liveStats?.operateurs || [];

  return (
    <div className="glass-panel animate-slide-left" style={{
      padding: '14px 16px',
      width: '100%',
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: 1.5,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        marginBottom: 12,
      }}>
        Indicateurs clés
      </div>

      <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {stats.map(({ icon: Icon, label, value, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 32, height: 32,
              borderRadius: 8,
              background: `${color}11`,
              border: `1px solid ${color}22`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Icon size={14} color={color} />
            </div>
            <div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--text-primary)',
                lineHeight: 1,
              }}>
                {value}
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 8,
                fontWeight: 500,
                letterSpacing: 1.2,
                color: 'var(--text-muted)',
                marginTop: 2,
              }}>
                {label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Operators bar */}
      {operators.length > 0 && (
        <div style={{
          marginTop: 14,
          paddingTop: 12,
          borderTop: '1px solid var(--glass-border)',
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 8,
            letterSpacing: 1,
            color: 'var(--text-muted)',
            marginBottom: 6,
          }}>
            OPÉRATEURS
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {operators.map(op => (
              <span key={op} style={{
                padding: '2px 8px',
                borderRadius: 4,
                background: 'rgba(34, 211, 238, 0.06)',
                border: '1px solid var(--glass-border)',
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: 'var(--text-secondary)',
              }}>
                {op}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
