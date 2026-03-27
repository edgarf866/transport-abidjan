import { Layers, Eye, EyeOff, Bus, MapPin, Building2, Map, Train, Ship, Route } from 'lucide-react';
import { LAYER_CONFIG } from '../data/transport';

const ICONS = {
  Bus,
  MapPin,
  Building2,
  Map,
  Train,
  Ship,
  Route,
};

export default function LayerPanel({ layers, toggleLayer, setAllLayers }) {
  const allOn = Object.values(layers).every(Boolean);

  return (
    <div className="glass-panel animate-slide-left" style={{
      padding: 0,
      width: '100%',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--glass-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Layers size={14} color="var(--cyan)" />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: 1.5,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
          }}>
            Couches
          </span>
        </div>
        <button
          onClick={() => setAllLayers(!allOn)}
          style={{
            background: 'none',
            border: '1px solid var(--glass-border)',
            borderRadius: 6,
            padding: '3px 8px',
            fontSize: 9,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.target.style.borderColor = 'var(--cyan)'; e.target.style.color = 'var(--cyan)'; }}
          onMouseLeave={e => { e.target.style.borderColor = 'var(--glass-border)'; e.target.style.color = 'var(--text-muted)'; }}
        >
          {allOn ? 'MASQUER' : 'AFFICHER'}
        </button>
      </div>

      {/* Layers */}
      <div className="stagger-children" style={{ padding: '8px 0' }}>
        {Object.entries(LAYER_CONFIG).map(([key, config]) => {
          const IconComp = ICONS[config.icon] || Map;
          const active = layers[key];
          if (active === undefined) return null;
          return (
            <button
              key={key}
              onClick={() => toggleLayer(key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '8px 16px',
                background: active ? 'rgba(34, 211, 238, 0.04)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34, 211, 238, 0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = active ? 'rgba(34, 211, 238, 0.04)' : 'transparent'; }}
            >
              {/* Status dot */}
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: active ? config.color : 'var(--text-muted)',
                opacity: active ? 1 : 0.3,
                boxShadow: active ? `0 0 6px ${config.color}66` : 'none',
                transition: 'all 0.3s',
              }} />

              {/* Icon */}
              <IconComp size={14} color={active ? config.color : 'var(--text-muted)'} style={{ transition: 'color 0.3s' }} />

              {/* Label */}
              <span style={{
                flex: 1,
                textAlign: 'left',
                fontSize: 12,
                fontFamily: 'var(--font-display)',
                fontWeight: 500,
                color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                transition: 'color 0.3s',
              }}>
                {config.label}
              </span>

              {/* Toggle icon */}
              {active
                ? <Eye size={12} color="var(--text-muted)" />
                : <EyeOff size={12} color="var(--text-muted)" style={{ opacity: 0.4 }} />
              }
            </button>
          );
        })}
      </div>
    </div>
  );
}
