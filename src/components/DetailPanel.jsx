import { X, Clock, Users, ArrowRightLeft, MapPin, Info } from 'lucide-react';
import { getHubIcon, getLineTypeLabel, formatNumber, getCategoryColor, getGareTypeLabel } from '../utils/helpers';

export default function DetailPanel({ selection, onClose }) {
  if (!selection) return null;

  const isLine = selection.type === 'line';
  const isHub = selection.type === 'hub';
  const data = selection.data;

  return (
    <div className="glass-panel-solid animate-slide-right" style={{
      width: '100%',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px 12px',
        borderBottom: '1px solid var(--glass-border)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
      }}>
        <div style={{ flex: 1 }}>
          {isLine && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: data.color || '#60a5fa',
                  boxShadow: `0 0 8px ${data.color || '#60a5fa'}88`,
                }} />
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: 1,
                  color: data.color || '#60a5fa',
                }}>
                  {data.id ? `${data.id} — ` : ''}{getLineTypeLabel(data.typeTransport)}
                </span>
              </div>
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0,
              }}>
                {data.name}
              </h3>
            </>
          )}
          {isHub && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 20 }}>{getHubIcon(data.typeHub)}</span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: 1,
                  color: getCategoryColor(data.category),
                  textTransform: 'uppercase',
                }}>
                  {getGareTypeLabel(data.typeHub)}
                </span>
              </div>
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0,
              }}>
                {data.name}
              </h3>
            </>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: '1px solid var(--glass-border)',
            borderRadius: 6,
            width: 28, height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            transition: 'all 0.2s',
            flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.color = 'var(--red)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: 16 }}>
        {/* Description */}
        {data.desc && (
          <p style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            marginBottom: 16,
          }}>
            {data.desc}
          </p>
        )}

        {/* Metrics grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          marginBottom: 16,
        }}>
          {isLine && (
            <>
              {data.frequency && (
                <MetricCard icon={Clock} label="Fréquence" value={data.frequency} color="var(--cyan)" />
              )}
              {data.dailyRiders != null && (
                <MetricCard icon={Users} label="Passagers/j" value={formatNumber(data.dailyRiders)} color="var(--amber)" />
              )}
              {data.operator && (
                <MetricCard icon={ArrowRightLeft} label="Opérateur" value={data.operator} color="var(--purple)" />
              )}
              {data.typeTransport && (
                <MetricCard icon={MapPin} label="Type" value={getLineTypeLabel(data.typeTransport)} color="var(--emerald)" />
              )}
            </>
          )}
          {isHub && (
            <>
              {data.lines != null && (
                <MetricCard icon={ArrowRightLeft} label="Lignes" value={data.lines} color="var(--cyan)" />
              )}
              {data.dailyPassengers != null && (
                <MetricCard icon={Users} label="Passagers/j" value={formatNumber(data.dailyPassengers)} color="var(--amber)" />
              )}
              {data.lat != null && (
                <MetricCard icon={MapPin} label="Latitude" value={data.lat.toFixed(4)} color="var(--emerald)" />
              )}
              {data.lng != null && (
                <MetricCard icon={MapPin} label="Longitude" value={data.lng.toFixed(4)} color="var(--blue)" />
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid var(--glass-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <Info size={10} color="var(--text-muted)" />
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--text-muted)',
        }}>
          Source: OpenStreetMap / Neon PostGIS
        </span>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color }) {
  return (
    <div style={{
      padding: '10px 12px',
      background: 'var(--metric-card-bg)',
      borderRadius: 8,
      border: '1px solid var(--glass-border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Icon size={10} color={color} />
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 8,
          letterSpacing: 1,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
        }}>
          {label}
        </span>
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 14,
        fontWeight: 700,
        color: 'var(--text-primary)',
      }}>
        {value}
      </div>
    </div>
  );
}
