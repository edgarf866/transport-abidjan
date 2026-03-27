import { Crosshair } from 'lucide-react';

export default function CoordsHUD({ coords }) {
  return (
    <div className="glass-panel coords-hud" style={{
      position: 'absolute',
      bottom: 8,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      padding: '6px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      maxWidth: 'calc(100vw - 24px)',
    }}>
      <Crosshair size={12} color="var(--text-muted)" />
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        color: 'var(--text-secondary)',
        letterSpacing: 0.5,
      }}>
        {coords
          ? `${coords.lat.toFixed(5)}°N  ${Math.abs(coords.lng).toFixed(5)}°W`
          : 'Survoler la carte'
        }
      </span>
      <div className="coords-divider" style={{ width: 1, height: 14, background: 'var(--glass-border)' }} />
      <span className="coords-crs" style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        color: 'var(--text-muted)',
      }}>
        WGS84 — EPSG:4326
      </span>
    </div>
  );
}
