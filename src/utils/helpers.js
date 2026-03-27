export function formatNumber(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'k';
  return n.toString();
}

export function getHubIcon(type) {
  const icons = {
    gare_routiere: '🚍',
    gare_woro: '🚕',
    gare_lagunaire: '⛴️',
    gare_gbaka: '🚐',
    gare_sotra: '🚏',
    // fallbacks statiques
    gare: '🚏',
    aeroport: '✈️',
    port: '⚓',
    metro: '🚇',
  };
  return icons[type] || '📍';
}

export function getCategoryColor(category) {
  const colors = {
    gare_routiere: '#22d3ee',
    gare_woro: '#22c55e',
    gare_lagunaire: '#06b6d4',
    gare_gbaka: '#eab308',
    gare_sotra: '#f97316',
    // fallbacks statiques
    major: '#22d3ee',
    secondary: '#60a5fa',
    international: '#fbbf24',
    future: '#a78bfa',
  };
  return colors[category] || '#94a3b8';
}

export function getLineTypeLabel(type) {
  if (!type) return '—';
  // Nettoyage pour les types réels de la BD
  const t = type.toLowerCase();
  if (t.includes('express')) return 'Express';
  if (t.includes('wibus')) return 'Wibus';
  if (t.includes('monbus') && t.includes('navette')) return 'MonBus Navette';
  if (t.includes('monbus')) return 'MonBus';
  if (t.includes('gbaka')) return 'Gbaka';
  if (t.includes('woro')) return 'Woro-Woro';
  if (t.includes('bateau') || t.includes('lagunaire')) return 'Lagunaire';
  return type;
}

export function getGareTypeLabel(type) {
  const labels = {
    gare_routiere: 'Gare routière',
    gare_woro: 'Gare Woro-Woro',
    gare_lagunaire: 'Gare lagunaire',
    gare_gbaka: 'Gare Gbaka',
    gare_sotra: 'Gare SOTRA',
  };
  return labels[type] || type || '—';
}
