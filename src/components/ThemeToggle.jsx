import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

/**
 * ThemeToggle — Bouton pour basculer entre le mode sombre et clair.
 * Applique la classe 'light-theme' sur <html> et persiste le choix en localStorage.
 */
export default function ThemeToggle() {
  const [light, setLight] = useState(() => {
    try {
      return localStorage.getItem('transport-theme') === 'light';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (light) {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
    try {
      localStorage.setItem('transport-theme', light ? 'light' : 'dark');
    } catch {}
  }, [light]);

  return (
    <button
      onClick={() => setLight(prev => !prev)}
      title={light ? 'Passer en mode sombre' : 'Passer en mode clair'}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        borderRadius: 8,
        border: '1px solid var(--glass-border)',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(12px)',
        cursor: 'pointer',
        color: light ? '#f59e0b' : 'var(--cyan)',
        transition: 'all 0.3s',
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = light ? '#f59e0b55' : 'var(--glass-border-hover)';
        e.currentTarget.style.transform = 'scale(1.1)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--glass-border)';
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {light ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
