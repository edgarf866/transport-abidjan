import { Filter } from 'lucide-react';

const OPERATORS = [
  { key: null,        label: 'Tous',     color: '#94a3b8', emoji: '🔘' },
  { key: 'sotra',     label: 'SOTRA',    color: '#f97316', emoji: '🚌' },
  { key: 'informel',  label: 'Informel', color: '#22d3ee', emoji: '🚐' },
];

/**
 * OperatorFilter — Filtrer les arrêts et lignes par opérateur.
 *
 * Props:
 *   active   — clé de l'opérateur actif (null = tous)
 *   onChange — callback(key) quand l'utilisateur change le filtre
 */
export default function OperatorFilter({ active, onChange }) {
  return (
    <div className="glass-panel" style={{
      padding: '10px 12px',
      width: '100%',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
      }}>
        <Filter size={12} color="var(--cyan)" />
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: 1.2,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
        }}>
          Operateur
        </span>
      </div>

      {/* Boutons */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {OPERATORS.map(op => {
          const isActive = active === op.key;
          return (
            <button
              key={op.key || 'all'}
              onClick={() => onChange(isActive ? null : op.key)}
              style={{
                flex: 1,
                minWidth: 55,
                padding: '5px 6px',
                borderRadius: 6,
                border: `1px solid ${isActive ? op.color + '66' : 'var(--glass-border)'}`,
                background: isActive ? op.color + '18' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = op.color + '44';
                  e.currentTarget.style.background = op.color + '0a';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = 'var(--glass-border)';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <span style={{ fontSize: 14 }}>{op.emoji}</span>
              <span style={{
                fontSize: 9,
                fontFamily: 'var(--font-mono)',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? op.color : 'var(--text-muted)',
                letterSpacing: 0.5,
              }}>
                {op.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
