/**
 * Client API pour le backend FastAPI / Neon PostGIS.
 *
 * En dev  : http://localhost:8000
 * En prod : l'URL de ton API déployée (Railway, Render, etc.)
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function fetchGeoJSON(endpoint) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    console.warn(`[API] Erreur sur ${endpoint}:`, err.message)
    return null
  }
}

export const api = {
  getArrets:       () => fetchGeoJSON('/api/arrets'),
  getGares:        () => fetchGeoJSON('/api/gares'),
  getLignes:       () => fetchGeoJSON('/api/lignes'),
  getRoutes:       () => fetchGeoJSON('/api/routes'),
  getCommunes:     () => fetchGeoJSON('/api/communes'),
  getLagunaire:    () => fetchGeoJSON('/api/lagunaire'),
  getVoiesFerrees: () => fetchGeoJSON('/api/voies_ferrees'),
  getStats:        () => fetchGeoJSON('/api/stats'),

  getNearby: (lon, lat, rayon = 500) =>
    fetchGeoJSON(`/api/nearby?lon=${lon}&lat=${lat}&rayon=${rayon}`),

  getLinesAtPoint: (lon, lat, radius = 150) =>
    fetchGeoJSON(`/api/lines-at-point?lon=${lon}&lat=${lat}&radius=${radius}`),

  getLigneArrets: (ligneId) =>
    fetchGeoJSON(`/api/ligne/${ligneId}/arrets`),

  getItineraire: async (fromLon, fromLat, toLon, toLat, radius = 300) => {
    try {
      const res = await fetch(`${API_BASE}/api/itineraire?from_lon=${fromLon}&from_lat=${fromLat}&to_lon=${toLon}&to_lat=${toLat}&radius=${radius}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[API] Erreur itineraire:', err.message);
      return null;
    }
  },

  // Géocodage Nominatim — recherche libre (type Google Maps)
  geocode: async (query) => {
    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        limit: '6',
        countrycodes: 'ci',
        viewbox: '-4.15,5.15,-3.7,5.55',
        bounded: '1',
        addressdetails: '1',
      });
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { 'Accept-Language': 'fr' },
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  // ── Contributions collaboratives ──

  submitContribution: async (contribution) => {
    try {
      const res = await fetch(`${API_BASE}/api/contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contribution),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      return data;
    } catch (err) {
      console.warn('[API] Erreur contribution:', err.message);
      return { success: false, message: err.message };
    }
  },

  getAlerts: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/contributions/alerts`);
      if (!res.ok) return { alerts: [], count: 0 };
      return await res.json();
    } catch {
      return { alerts: [], count: 0 };
    }
  },

  getContributionsCount: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/contributions/count`);
      if (!res.ok) return { approved: 0 };
      return await res.json();
    } catch {
      return { approved: 0 };
    }
  },

  // ── Admin ──

  adminGetContributions: async (password, status = 'pending', type = null, limit = 50, offset = 0) => {
    try {
      let url = `${API_BASE}/api/admin/contributions?status=${status}&limit=${limit}&offset=${offset}`;
      if (type) url += `&type=${type}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${password}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      return { contributions: [], total: 0, error: err.message };
    }
  },

  adminReviewContribution: async (password, id, status, adminNote = null) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/contributions/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${password}`,
        },
        body: JSON.stringify({ status, admin_note: adminNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      return data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  adminGetStats: async (password) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${password}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      return { error: err.message };
    }
  },

  healthCheck: async () => {
    try {
      const res = await fetch(`${API_BASE}/health`)
      const data = await res.json()
      return data.status === 'ok'
    } catch {
      return false
    }
  },
}
