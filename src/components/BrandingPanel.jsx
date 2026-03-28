export default function BrandingPanel() {
  return (
    <div style={{
      padding: '10px 14px',
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(8px)',
      borderRadius: 8,
      border: '1px solid var(--glass-border)',
      width: '100%',
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        letterSpacing: 1,
        color: 'var(--text-muted)',
        marginBottom: 4,
      }}>
        RÉALISÉ PAR
      </div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--text-primary)',
      }}>
        Edgar Kouassi
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        color: 'var(--cyan-dim)',
        marginTop: 2,
      }}>
        MEDEV
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 8,
        color: 'var(--text-muted)',
        marginTop: 4,
      }}>
        React + Leaflet + PostGIS
      </div>
    </div>
  );
}
