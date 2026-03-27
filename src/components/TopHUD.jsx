import { useState, useEffect } from 'react';
import { Activity, Satellite } from 'lucide-react';
import SearchBar from './SearchBar';
import ThemeToggle from './ThemeToggle';

export default function TopHUD({ transportData, onSearchSelect }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (d) => d.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  return (
    <div className="top-hud-wrapper">
      {/* Rangée 1 : titre + statuts + theme toggle */}
      <div className="glass-panel animate-slide-down top-hud" style={{
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        justifyContent: 'center',
        whiteSpace: 'nowrap',
      }}>
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--cyan)',
            boxShadow: '0 0 8px rgba(34,211,238,0.6)',
            animation: 'blink 2s ease infinite',
            flexShrink: 0,
          }} />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 2.5,
            color: 'var(--cyan)',
          }}>
            TRANSPORT<span style={{ color: 'var(--text-muted)' }}>MAP</span>
          </span>
        </div>

        {/* Divider */}
        <div className="hud-divider" style={{ width: 1, height: 20, background: 'var(--glass-border)', flexShrink: 0 }} />

        {/* Subtitle */}
        <span className="hud-subtitle" style={{
          fontFamily: 'var(--font-display)',
          fontSize: 11,
          color: 'var(--text-secondary)',
          fontWeight: 500,
          letterSpacing: 0.3,
        }}>
          Grand Abidjan
        </span>

        {/* Status */}
        <div className="hud-status" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Activity size={11} color="var(--emerald)" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--emerald)' }}>LIVE</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Satellite size={11} color="var(--text-muted)" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>OSM</span>
          </div>
        </div>

        {/* Time */}
        <span className="hud-time" style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--text-muted)',
          letterSpacing: 0.3,
        }}>
          {formatTime(time)}
        </span>

        {/* Theme toggle */}
        <ThemeToggle />
      </div>

      {/* Rangée 2 : barre de recherche */}
      <div className="search-bar-row">
        <SearchBar transportData={transportData} onSelect={onSearchSelect} />
      </div>
    </div>
  );
}
