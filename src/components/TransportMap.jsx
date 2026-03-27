import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Marker,
  Popup,
  GeoJSON,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import {
  ABIDJAN_CENTER,
  DEFAULT_ZOOM,
  BUS_LINES,
  TRANSPORT_HUBS,
  COMMUNES,
} from '../data/transport';
import { getHubIcon, formatNumber, getGareTypeLabel } from '../utils/helpers';

delete L.Icon.Default.prototype._getIconUrl;

// Canvas renderer pour les couches avec beaucoup de points (performance)
const canvasRenderer = L.canvas({ padding: 0.5 });

function createDivIcon(html, size = [30, 30]) {
  return L.divIcon({
    html,
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1] / 2],
    className: '',
  });
}

function MouseTracker({ onMove, mapClickMode, onMapClick }) {
  useMapEvents({
    mousemove(e) {
      onMove({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
    click(e) {
      if (mapClickMode) {
        onMapClick?.(e.latlng);
      }
    },
  });
  return null;
}

function MapController({ flyTo }) {
  const map = useMap();
  useEffect(() => {
    if (flyTo) {
      map.flyTo(flyTo, 16, { duration: 1.2 });
    }
  }, [flyTo, map]);
  return null;
}

// ============================================================
// Couleurs par type de ligne — basées sur les vraies données BD
// ============================================================
function getLineColor(properties) {
  const type = (properties?.type_ligne || '').toLowerCase();
  const op = (properties?.operateur || '').toLowerCase();

  // SOTRA
  if (type.includes('express')) return '#ef4444';
  if (type.includes('wibus')) return '#8b5cf6';
  if (type.includes('monbus') && type.includes('navette')) return '#f59e0b';
  if (type.includes('monbus')) return '#f97316';

  // Informel — Gbaka
  if (type.includes('gbaka')) return '#eab308';

  // Informel — Woro-woro
  if (type.includes('woro') && type.includes('banalis')) return '#10b981';
  if (type.includes('woro')) return '#22c55e';

  // Fallback opérateur
  if (op === 'sotra') return '#f97316';
  if (op === 'informel') return '#84cc16';

  return '#60a5fa';
}

// Icône emoji par type de gare
function getGareIcon(type) {
  const icons = {
    gare_routiere: '🚍',
    gare_woro: '🚕',
    gare_lagunaire: '⛴️',
    gare_gbaka: '🚐',
    gare_sotra: '🚏',
  };
  return icons[type] || '📍';
}

// Couleur par type de gare
function getGareColor(type) {
  const colors = {
    gare_routiere: '#22d3ee',
    gare_woro: '#22c55e',
    gare_lagunaire: '#06b6d4',
    gare_gbaka: '#eab308',
    gare_sotra: '#f97316',
  };
  return colors[type] || '#94a3b8';
}

// ============================================================
// Composant pour les arrêts — MarkerCluster + icônes adaptatives
// Cluster automatique aux petits zooms, icônes 🚏 détaillées en zoom
// ============================================================
function NeonArrets({ data, operatorFilter }) {
  const map = useMap();
  const clusterRef = useRef(null);

  useEffect(() => {
    if (!map || !data?.features?.length) return;

    // Créer le cluster group avec style custom
    const cluster = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      disableClusteringAtZoom: 17,
      chunkedLoading: true,
      chunkInterval: 100,
      chunkDelay: 10,
      iconCreateFunction: (clusterObj) => {
        const count = clusterObj.getChildCount();
        let size, className;
        if (count < 50) {
          size = 36; className = 'cluster-small';
        } else if (count < 200) {
          size = 42; className = 'cluster-medium';
        } else {
          size = 50; className = 'cluster-large';
        }
        return L.divIcon({
          html: `<div class="arret-cluster ${className}"><span>${count}</span></div>`,
          iconSize: [size, size],
          className: '',
        });
      },
    });

    // Filtrer par opérateur si un filtre est actif
    const features = operatorFilter
      ? data.features.filter(f => {
          const op = (f.properties?.operateur || '').toLowerCase();
          if (operatorFilter === 'sotra') return op === 'sotra';
          if (operatorFilter === 'informel') return op !== 'sotra';
          return true;
        })
      : data.features;

    // Créer les markers
    const markers = features
      .filter(f => f.geometry?.coordinates?.length >= 2)
      .map(f => {
        const coords = f.geometry.coordinates;
        const p = f.properties || {};
        const isSotra = p.operateur === 'SOTRA';
        const color = isSotra ? '#f97316' : '#22d3ee';

        const icon = L.divIcon({
          html: `<div style="
            display:flex;align-items:center;justify-content:center;
            width:22px;height:22px;border-radius:6px;
            background:var(--bg-surface);
            border:1.5px solid ${color};
            box-shadow:0 0 6px ${color}44;
            font-size:13px;
          ">🚏</div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
          className: '',
        });

        const marker = L.marker([coords[1], coords[0]], { icon });
        marker.bindPopup(`
          <div style="font-family:var(--font-display);min-width:180px">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
              <span style="font-size:16px">🚏</span>
              <strong style="color:${color};font-size:13px">${p.nom || 'Arret sans nom'}</strong>
            </div>
            <div style="color:#94a3b8;font-size:11px">
              ${isSotra
                ? '<span style="color:#f97316">&#9679;</span> Operateur: SOTRA'
                : '<span style="color:#22d3ee">&#9679;</span> Operateur: ' + (p.operateur || 'Inconnu')}
            </div>
          </div>
        `);
        return marker;
      });

    cluster.addLayers(markers);
    map.addLayer(cluster);
    clusterRef.current = cluster;

    return () => {
      map.removeLayer(cluster);
      clusterRef.current = null;
    };
  }, [map, data, operatorFilter]);

  return null;
}

// ============================================================
// Composant GeoJSON pour les gares (Points) depuis Neon
// ============================================================
function NeonGares({ data, onSelect }) {
  if (!data?.features?.length) return null;

  return (
    <GeoJSON
      key={`gares-${data.features.length}`}
      data={data}
      pointToLayer={(feature, latlng) => {
        const typeGare = feature.properties?.type_gare || '';
        const emoji = getGareIcon(typeGare);
        const icon = L.divIcon({
          html: `<div style="font-size:18px;text-align:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.6))">${emoji}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          className: '',
        });
        return L.marker(latlng, { icon });
      }}
      onEachFeature={(feature, layer) => {
        const p = feature.properties || {};
        const color = getGareColor(p.type_gare);
        layer.bindPopup(`
          <div style="font-family:var(--font-display);min-width:160px">
            <strong style="color:${color};font-size:13px">${getGareIcon(p.type_gare)} ${p.nom || 'Gare'}</strong><br/>
            <span style="color:#94a3b8;font-size:11px">
              ${getGareTypeLabel(p.type_gare)}
            </span>
          </div>
        `);
        if (onSelect) {
          layer.on('click', () => {
            const coords = feature.geometry.coordinates;
            onSelect({
              type: 'hub',
              data: {
                name: p.nom,
                typeHub: p.type_gare,
                category: p.type_gare,
                lat: coords[1],
                lng: coords[0],
                desc: getGareTypeLabel(p.type_gare),
              },
            });
          });
        }
      }}
    />
  );
}

// ============================================================
// Composant GeoJSON pour les lignes de transport depuis Neon
// ============================================================
function NeonLignes({ data, onSelect }) {
  if (!data?.features?.length) return null;

  return (
    <GeoJSON
      key={`lignes-${data.features.length}`}
      data={data}
      style={(feature) => ({
        color: getLineColor(feature.properties),
        weight: 3,
        opacity: 0.7,
      })}
      onEachFeature={(feature, layer) => {
        const p = feature.properties || {};
        const color = getLineColor(p);
        layer.bindPopup(`
          <div style="font-family:var(--font-display);min-width:180px">
            <strong style="color:${color};font-size:13px">${p.nom || 'Ligne'}</strong><br/>
            <span style="color:#94a3b8;font-size:11px">
              ${p.operateur ? 'Opérateur: ' + p.operateur + '<br/>' : ''}
              Type: ${p.type_ligne || '—'}
            </span>
          </div>
        `);
        if (onSelect) {
          layer.on('click', () => {
            onSelect({
              type: 'line',
              data: {
                name: p.nom,
                id: p.code_ligne || p.id,
                color,
                operator: p.operateur,
                typeTransport: p.type_ligne,
                frequency: p.frequence,
                desc: p.nom,
              },
            });
          });
        }
      }}
    />
  );
}

// ============================================================
// Composant GeoJSON pour les routes depuis Neon
// ============================================================
function NeonRoutes({ data }) {
  if (!data?.features?.length) return null;

  const routeColors = {
    motorway: '#ef4444',
    trunk: '#f97316',
    primary: '#eab308',
    secondary: '#22c55e',
    motorway_link: '#ef444488',
    trunk_link: '#f9731688',
    primary_link: '#eab30888',
  };

  return (
    <GeoJSON
      key={`routes-${data.features.length}`}
      data={data}
      style={(feature) => {
        const type = feature.properties?.type_route || '';
        return {
          color: routeColors[type] || '#60a5fa',
          weight: type.includes('link') ? 1.5 : 2.5,
          opacity: 0.5,
        };
      }}
      onEachFeature={(feature, layer) => {
        const p = feature.properties || {};
        layer.bindPopup(`
          <div style="font-family:var(--font-display);min-width:150px">
            <strong style="color:#eab308;font-size:13px">${p.nom || 'Route'}</strong><br/>
            <span style="color:#94a3b8;font-size:11px">
              Type: ${p.type_route || '—'}
              ${p.nb_voies ? '<br/>Voies: ' + p.nb_voies : ''}
            </span>
          </div>
        `);
      }}
    />
  );
}

// ============================================================
// Composant pour les communes — cercles + labels avec nom
// Labels visibles dès zoom 11, infos population à zoom >= 13
// ============================================================
function NeonCommunes({ data }) {
  const map = useMap();
  const layerGroupRef = useRef(null);

  useEffect(() => {
    if (!map || !data?.features?.length) return;

    layerGroupRef.current = L.layerGroup().addTo(map);

    function updateCommunes() {
      const group = layerGroupRef.current;
      if (!group) return;
      group.clearLayers();

      const zoom = map.getZoom();

      data.features.forEach(feature => {
        const coords = feature.geometry?.coordinates;
        if (!coords || coords.length < 2) return;
        const latlng = [coords[1], coords[0]];
        const p = feature.properties || {};

        // Cercle proportionnel à la population
        const pop = p.population || 0;
        const baseRadius = zoom >= 14 ? 12 : zoom >= 12 ? 10 : 8;
        const popBonus = Math.min(pop / 200000, 1) * 6;
        const radius = baseRadius + popBonus;

        const circle = L.circleMarker(latlng, {
          radius,
          fillColor: '#34d399',
          color: 'rgba(52, 211, 153, 0.4)',
          weight: 2,
          fillOpacity: 0.35,
        });

        circle.bindPopup(`
          <div style="font-family:var(--font-display);min-width:160px">
            <strong style="color:#34d399;font-size:14px">${p.nom}</strong><br/>
            <span style="color:#94a3b8;font-size:11px">
              ${p.description || ''}<br/>
              Pop: ${formatNumber(p.population)} | ${p.superficie_km2 || '—'} km²
            </span>
          </div>
        `);
        group.addLayer(circle);

        // Label texte avec le nom de la commune
        const labelSize = zoom >= 14 ? 12 : zoom >= 12 ? 11 : 10;
        const showPop = zoom >= 13;
        const labelHtml = `
          <div style="
            font-family:var(--font-mono);
            font-size:${labelSize}px;
            font-weight:600;
            color:#34d399;
            text-shadow: 0 0 6px rgba(0,0,0,0.8), 0 0 12px rgba(0,0,0,0.5);
            white-space:nowrap;
            text-align:center;
            line-height:1.3;
          ">
            ${p.nom || 'Commune'}
            ${showPop && pop ? `<br/><span style="font-size:${labelSize - 2}px;color:#94a3b8;font-weight:400">${formatNumber(pop)} hab.</span>` : ''}
          </div>
        `;
        const labelIcon = L.divIcon({
          html: labelHtml,
          className: 'transport-label',
          iconSize: [120, 30],
          iconAnchor: [60, -radius - 4],
        });
        const labelMarker = L.marker(latlng, { icon: labelIcon, interactive: false });
        group.addLayer(labelMarker);
      });
    }

    updateCommunes();
    map.on('zoomend', updateCommunes);

    return () => {
      map.off('zoomend', updateCommunes);
      if (layerGroupRef.current) {
        map.removeLayer(layerGroupRef.current);
        layerGroupRef.current = null;
      }
    };
  }, [map, data]);

  return null;
}

// ============================================================
// Composant GeoJSON pour le transport lagunaire depuis Neon
// ============================================================
function NeonLagunaire({ data }) {
  if (!data?.features?.length) return null;

  return (
    <GeoJSON
      key={`lagunaire-${data.features.length}`}
      data={data}
      style={() => ({
        color: '#06b6d4',
        weight: 3,
        opacity: 0.8,
        dashArray: '8 6',
      })}
      onEachFeature={(feature, layer) => {
        const p = feature.properties || {};
        layer.bindPopup(`
          <div style="font-family:var(--font-display);min-width:160px">
            <strong style="color:#06b6d4;font-size:13px">⛴️ ${p.nom || 'Ligne lagunaire'}</strong><br/>
            <span style="color:#94a3b8;font-size:11px">
              ${p.operateur ? 'Opérateur: ' + p.operateur : ''}
            </span>
          </div>
        `);
      }}
    />
  );
}

// ============================================================
// Composant GeoJSON pour les voies ferrées depuis Neon
// ============================================================
function NeonVoiesFerrees({ data }) {
  if (!data?.features?.length) return null;

  return (
    <GeoJSON
      key={`voies-${data.features.length}`}
      data={data}
      style={() => ({
        color: '#ef4444',
        weight: 3,
        opacity: 0.7,
        dashArray: '12 6',
      })}
      onEachFeature={(feature, layer) => {
        const p = feature.properties || {};
        layer.bindPopup(`
          <div style="font-family:var(--font-display);min-width:150px">
            <strong style="color:#ef4444;font-size:13px">🚂 ${p.nom || 'Voie ferrée'}</strong><br/>
            <span style="color:#94a3b8;font-size:11px">
              ${p.operateur ? 'Opérateur: ' + p.operateur : ''}
              ${p.type_rail ? '<br/>Type: ' + p.type_rail : ''}
            </span>
          </div>
        `);
      }}
    />
  );
}

// ============================================================
// Marqueur pulsant temporaire — apparaît lors d'un fly-to (recherche)
// Disparaît après 4 secondes
// ============================================================
function SearchPulseMarker({ position }) {
  const map = useMap();
  const markerRef = useRef(null);

  useEffect(() => {
    if (!map || !position) return;

    const icon = L.divIcon({
      html: `<div class="search-pulse-marker">
        <div class="search-pulse-ring"></div>
        <div class="search-pulse-dot"></div>
      </div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      className: '',
    });

    const marker = L.marker(position, { icon, interactive: false });
    marker.addTo(map);
    markerRef.current = marker;

    const timeout = setTimeout(() => {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    }, 4000);

    return () => {
      clearTimeout(timeout);
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    };
  }, [map, position]);

  return null;
}

// ============================================================
// Détecte le thème et retourne l'URL de tuiles correspondante
// ============================================================
function DynamicTileLayer() {
  const [tileUrl, setTileUrl] = useState(
    'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
  );

  useEffect(() => {
    function checkTheme() {
      const isLight = document.documentElement.classList.contains('light-theme');
      setTileUrl(isLight
        ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      );
    }
    checkTheme();
    // Observer les changements de classe sur <html>
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <TileLayer
      key={tileUrl}
      url={tileUrl}
      attribution='&copy; <a href="https://osm.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
      maxZoom={19}
    />
  );
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
// ============================================================
// Marqueurs A/B pour itinéraire + marqueur position utilisateur
// ============================================================
function TravelMarkers({ markers }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!map) return;
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }
    if (!markers?.length) return;

    const group = L.layerGroup();

    markers.forEach(m => {
      let html, size;
      if (m.type === 'departure') {
        html = `<div style="
          width:32px;height:32px;border-radius:50%;
          background:rgba(34,211,238,0.2);border:2.5px solid #22d3ee;
          display:flex;align-items:center;justify-content:center;
          font-size:14px;font-weight:800;color:#22d3ee;
          box-shadow:0 0 12px rgba(34,211,238,0.4);
          font-family:var(--font-display);
        ">A</div>`;
        size = [32, 32];
      } else if (m.type === 'arrival') {
        html = `<div style="
          width:32px;height:32px;border-radius:50%;
          background:rgba(251,146,60,0.2);border:2.5px solid #fb923c;
          display:flex;align-items:center;justify-content:center;
          font-size:14px;font-weight:800;color:#fb923c;
          box-shadow:0 0 12px rgba(251,146,60,0.4);
          font-family:var(--font-display);
        ">B</div>`;
        size = [32, 32];
      } else if (m.type === 'user') {
        html = `<div style="
          width:18px;height:18px;border-radius:50%;
          background:#3b82f6;border:3px solid #fff;
          box-shadow:0 0 12px rgba(59,130,246,0.5), 0 0 24px rgba(59,130,246,0.2);
        "></div>`;
        size = [18, 18];
      }

      if (html) {
        const icon = L.divIcon({
          html,
          iconSize: size,
          iconAnchor: [size[0] / 2, size[1] / 2],
          className: '',
        });
        L.marker([m.lat, m.lon], { icon, interactive: false }).addTo(group);
      }
    });

    group.addTo(map);
    layerRef.current = group;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, markers]);

  return null;
}

// ============================================================
// Change le curseur en crosshair quand le mode clic itinéraire est actif
// ============================================================
function MapCursorMode({ active }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const container = map.getContainer();
    if (active) {
      container.style.cursor = 'crosshair';
    } else {
      container.style.cursor = '';
    }
    return () => { container.style.cursor = ''; };
  }, [map, active]);
  return null;
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export default function TransportMap({ layers, onSelect, onMouseMove, flyTo, supabaseData, operatorFilter, mapClickMode, onMapClick, travelMarkers, routeResult }) {

  const isLive = supabaseData?.isLive;

  // Callbacks pour les données statiques (fallback)
  const handleLineClick = useCallback((line) => {
    onSelect({
      type: 'line',
      data: {
        ...line,
        typeTransport: line.type,
        desc: `Ligne ${line.id} opérée par ${line.operator}. Fréquence: ${line.frequency}.`,
      },
    });
  }, [onSelect]);

  const handleHubClick = useCallback((hub) => {
    onSelect({
      type: 'hub',
      data: { ...hub, typeHub: hub.type },
    });
  }, [onSelect]);

  return (
    <MapContainer
      center={ABIDJAN_CENTER}
      zoom={DEFAULT_ZOOM}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
      attributionControl={true}
    >
      <DynamicTileLayer />

      <MouseTracker onMove={onMouseMove} mapClickMode={mapClickMode} onMapClick={onMapClick} />
      <MapController flyTo={flyTo} />
      <MapCursorMode active={!!mapClickMode} />
      {travelMarkers?.length > 0 && <TravelMarkers markers={travelMarkers} />}

      {/* ============================================================ */}
      {/* MODE NEON POSTGIS — Données réelles de la base              */}
      {/* ============================================================ */}
      {isLive && (
        <>
          {/* Routes principales */}
          {layers.routes && supabaseData.routes && (
            <NeonRoutes data={supabaseData.routes} />
          )}

          {/* Lignes de transport (bus, gbaka, woro-woro) */}
          {layers.lignes && supabaseData.lignes && (
            <NeonLignes data={supabaseData.lignes} onSelect={onSelect} />
          )}

          {/* Transport lagunaire */}
          {layers.lagunaire && supabaseData.lagunaire && (
            <NeonLagunaire data={supabaseData.lagunaire} />
          )}

          {/* Voies ferrées */}
          {layers.voiesFerrees && supabaseData.voiesFerrees && (
            <NeonVoiesFerrees data={supabaseData.voiesFerrees} />
          )}

          {/* Arrêts de bus (avec clustering) */}
          {layers.arrets && supabaseData.arrets && (
            <NeonArrets data={supabaseData.arrets} operatorFilter={operatorFilter} />
          )}

          {/* Gares routières */}
          {layers.gares && supabaseData.gares && (
            <NeonGares data={supabaseData.gares} onSelect={onSelect} />
          )}

          {/* Communes depuis la BD */}
          {layers.communes && supabaseData.communes && (
            <NeonCommunes data={supabaseData.communes} />
          )}
        </>
      )}

      {/* ============================================================ */}
      {/* MODE STATIQUE — Fallback quand l'API est indisponible       */}
      {/* ============================================================ */}
      {!isLive && (
        <>
          {/* Communes */}
          {layers.communes && COMMUNES.map(c => (
            <CircleMarker
              key={c.id}
              center={[c.lat, c.lng]}
              radius={6}
              pathOptions={{
                fillColor: '#34d399',
                color: 'rgba(255,255,255,0.3)',
                weight: 1.5,
                fillOpacity: 0.5,
              }}
            >
              <Popup>
                <div style={{ fontFamily: 'var(--font-display)' }}>
                  <strong style={{ color: '#34d399', fontSize: 14 }}>{c.name}</strong>
                  <br />
                  <span style={{ color: '#94a3b8', fontSize: 11 }}>{c.desc}</span>
                  <br />
                  <span style={{ color: '#94a3b8', fontSize: 11 }}>
                    Pop: {formatNumber(c.pop)} | {c.area} km²
                  </span>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* Bus Lines statiques */}
          {layers.lignes && BUS_LINES.filter(l => l.type !== 'lagunaire').map(line => (
            <Polyline
              key={line.id}
              positions={line.coords}
              pathOptions={{
                color: line.color,
                weight: 4,
                opacity: 0.8,
                dashArray: line.type === 'express' ? null : '8 6',
              }}
              eventHandlers={{ click: () => handleLineClick(line) }}
            >
              <Popup>
                <div style={{ fontFamily: 'var(--font-display)' }}>
                  <strong style={{ color: line.color }}>{line.id} — {line.name}</strong>
                  <br />
                  <span style={{ color: '#94a3b8', fontSize: 11 }}>
                    {line.operator} | {line.frequency} | {formatNumber(line.dailyRiders)} pass./j
                  </span>
                </div>
              </Popup>
            </Polyline>
          ))}

          {/* Lagunaire statique */}
          {layers.lagunaire && BUS_LINES.filter(l => l.type === 'lagunaire').map(line => (
            <Polyline
              key={line.id}
              positions={line.coords}
              pathOptions={{ color: line.color, weight: 3, opacity: 0.7, dashArray: '4 8' }}
              eventHandlers={{ click: () => handleLineClick(line) }}
            >
              <Popup>
                <div style={{ fontFamily: 'var(--font-display)' }}>
                  <strong style={{ color: line.color }}>{line.name}</strong>
                </div>
              </Popup>
            </Polyline>
          ))}

          {/* Bus stops statiques */}
          {layers.arrets && BUS_LINES.map(line =>
            line.coords.map((coord, i) => (
              <CircleMarker
                key={`${line.id}-stop-${i}`}
                center={coord}
                radius={4}
                pathOptions={{
                  fillColor: line.color,
                  color: '#fff',
                  weight: 1.5,
                  fillOpacity: 0.9,
                }}
              >
                <Popup>
                  <div style={{ fontFamily: 'var(--font-display)' }}>
                    <strong>Arrêt {i + 1}</strong> — {line.name}
                  </div>
                </Popup>
              </CircleMarker>
            ))
          )}

          {/* Hubs statiques */}
          {layers.gares && TRANSPORT_HUBS.map(hub => {
            const icon = createDivIcon(`
              <div style="font-size:22px;text-align:center;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.6));cursor:pointer;">
                ${getHubIcon(hub.type)}
              </div>
            `, [36, 36]);
            return (
              <Marker
                key={hub.id}
                position={[hub.lat, hub.lng]}
                icon={icon}
                eventHandlers={{ click: () => handleHubClick(hub) }}
              >
                <Popup>
                  <div style={{ fontFamily: 'var(--font-display)', minWidth: 180 }}>
                    <strong style={{ color: 'var(--cyan)', fontSize: 14 }}>
                      {getHubIcon(hub.type)} {hub.name}
                    </strong>
                    <br />
                    <span style={{ color: '#94a3b8', fontSize: 11 }}>{hub.desc}</span>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </>
      )}

      {/* Marqueur pulsant pour la recherche */}
      {flyTo && <SearchPulseMarker position={flyTo} />}
    </MapContainer>
  );
}
