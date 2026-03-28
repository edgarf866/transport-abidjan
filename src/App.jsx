import { useState, useCallback, useEffect } from 'react';
import TransportMap from './components/TransportMap';
import TopHUD from './components/TopHUD';
import LayerPanel from './components/LayerPanel';
import OperatorFilter from './components/OperatorFilter';
import StatsPanel from './components/StatsPanel';
import DetailPanel from './components/DetailPanel';
import LegendPanel from './components/LegendPanel';
import CoordsHUD from './components/CoordsHUD';
import BrandingPanel from './components/BrandingPanel';
import MobileToggle from './components/MobileToggle';
import OnboardingTutorial from './components/OnboardingTutorial';
import TravelPanel from './components/TravelPanel';
import InstallPrompt from './components/InstallPrompt';
import ContributePanel from './components/ContributePanel';
import AlertBanner from './components/AlertBanner';
import AdminDashboard from './components/AdminDashboard';
import { useLayers } from './hooks/useLayers';
import { useTransportData } from './hooks/useTransportData';
import { api } from './lib/api';

export default function App() {
  const { layers, toggleLayer, setAllLayers } = useLayers();
  const transportData = useTransportData();
  const [selection, setSelection] = useState(null);
  const [mouseCoords, setMouseCoords] = useState(null);
  const [flyTo, setFlyTo] = useState(null);
  const [operatorFilter, setOperatorFilter] = useState(null);
  const [mobileLeft, setMobileLeft] = useState(false);
  const [mobileRight, setMobileRight] = useState(false);
  const [activeTab, setActiveTab] = useState('nearby');

  // ─── Admin state (accès via /#minad) ───
  const [showAdmin, setShowAdmin] = useState(() => window.location.hash === '#minad');

  useEffect(() => {
    const onHash = () => {
      setShowAdmin(window.location.hash === '#minad');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // ─── Contribute state ───
  const [showContribute, setShowContribute] = useState(false);
  const [contributeMapClick, setContributeMapClick] = useState(null);
  const [contributePickMode, setContributePickMode] = useState(false);

  // ─── Travel / Itinéraire state ───
  const [showTravel, setShowTravel] = useState(false);
  const [mapClickMode, setMapClickMode] = useState(null); // 'departure' | 'arrival' | null
  const [departure, setDeparture] = useState(null);
  const [arrival, setArrival] = useState(null);
  const [routeResult, setRouteResult] = useState(null);
  const [travelMarkers, setTravelMarkers] = useState([]); // {lat, lon, type: 'user'|'departure'|'arrival'}

  const handleSelect = useCallback((item) => {
    setSelection(item);
    if (item.coords) {
      setFlyTo(item.coords);
    } else if (item.type === 'hub' && item.data.lat != null) {
      setFlyTo([item.data.lat, item.data.lng]);
    } else if (item.type === 'line' && item.data.coords?.length) {
      const mid = item.data.coords[Math.floor(item.data.coords.length / 2)];
      setFlyTo(mid);
    }
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelection(null);
  }, []);

  const handleSetDeparture = useCallback((point) => {
    setDeparture(point);
    if (point) {
      setTravelMarkers(prev => [...prev.filter(m => m.type !== 'departure'), { ...point, type: 'departure' }]);
    } else {
      setTravelMarkers(prev => prev.filter(m => m.type !== 'departure'));
    }
    setRouteResult(null);
  }, []);

  const handleSetArrival = useCallback((point) => {
    setArrival(point);
    if (point) {
      setTravelMarkers(prev => [...prev.filter(m => m.type !== 'arrival'), { ...point, type: 'arrival' }]);
    } else {
      setTravelMarkers(prev => prev.filter(m => m.type !== 'arrival'));
    }
    setRouteResult(null);
  }, []);

  // Map click handler for itinerary mode AND contribute mode
  const handleMapClick = useCallback(async (latlng) => {
    // Contribute pick mode
    if (contributePickMode) {
      setContributeMapClick({ lat: latlng.lat, lng: latlng.lng });
      setContributePickMode(false);
      return;
    }

    if (!mapClickMode) return;
    const point = { lat: latlng.lat, lon: latlng.lng, label: `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}` };
    // Try to find nearest stop name for better label
    try {
      const nearby = await api.getNearby(latlng.lng, latlng.lat, 500);
      if (nearby?.features?.[0]?.properties?.nom) {
        point.label = `📍 Près de ${nearby.features[0].properties.nom}`;
      }
    } catch {}
    if (mapClickMode === 'departure') {
      handleSetDeparture(point);
    } else if (mapClickMode === 'arrival') {
      handleSetArrival(point);
    }
    setMapClickMode(null);
  }, [mapClickMode, contributePickMode, handleSetDeparture, handleSetArrival]);

  const handleRequestMapClick = useCallback((mode) => {
    setMapClickMode(mode);
  }, []);

  const handleClearRoute = useCallback(() => {
    setDeparture(null);
    setArrival(null);
    setRouteResult(null);
    setMapClickMode(null);
    setTravelMarkers(prev => prev.filter(m => m.type === 'user'));
  }, []);

  const handleSetMarker = useCallback((marker) => {
    setTravelMarkers(prev => [...prev.filter(m => m.type !== marker.type), marker]);
  }, []);

  const handleTravelFlyTo = useCallback((coords) => {
    setFlyTo(coords);
  }, []);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      position: 'relative',
      overflow: 'hidden',
      background: 'var(--bg-void)',
    }}>
      <div className="scanline-overlay" />

      {/* Loading */}
      {transportData.loading && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)', zIndex: 9999,
          padding: '20px 40px',
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--glass-border)',
          borderRadius: 12, textAlign: 'center',
        }}>
          <div style={{
            width: 32, height: 32,
            border: '3px solid var(--glass-border)',
            borderTopColor: 'var(--cyan)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 12px',
          }} />
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--cyan)' }}>
            CHARGEMENT...
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* MAP */}
      <TransportMap
        layers={layers}
        onSelect={handleSelect}
        onMouseMove={setMouseCoords}
        flyTo={flyTo}
        supabaseData={transportData}
        operatorFilter={operatorFilter}
        mapClickMode={mapClickMode || (contributePickMode ? 'contribute' : null)}
        onMapClick={handleMapClick}
        travelMarkers={travelMarkers}
        routeResult={routeResult}
      />

      {/* Top HUD + Search bar intégrée */}
      <TopHUD transportData={transportData} onSearchSelect={handleSelect} />

      {/* Alert banner — alertes transport en temps réel */}
      <AlertBanner onAlertClick={(lat, lng) => setFlyTo([lat, lng])} />

      {/* Left column */}
      <div className={`panel-left-col ${mobileLeft ? 'mobile-visible' : ''}`}>
        <LayerPanel layers={layers} toggleLayer={toggleLayer} setAllLayers={setAllLayers} />
        <OperatorFilter active={operatorFilter} onChange={setOperatorFilter} />

        {/* Data source badge */}
        <div style={{
          padding: '4px 10px',
          background: transportData.isLive
            ? 'rgba(34, 211, 238, 0.1)' : 'rgba(251, 146, 60, 0.1)',
          border: `1px solid ${transportData.isLive
            ? 'rgba(34,211,238,0.3)' : 'rgba(251,146,60,0.3)'}`,
          borderRadius: 6,
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: transportData.isLive ? 'var(--cyan)' : 'var(--orange)',
            boxShadow: `0 0 6px ${transportData.isLive ? 'var(--cyan)' : 'var(--orange)'}`,
            animation: 'blink 2s ease infinite',
          }} />
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9,
            color: transportData.isLive ? 'var(--cyan)' : 'var(--orange)',
            letterSpacing: 0.5,
          }}>
            {transportData.isLive ? 'NEON POSTGIS' : 'STATIC DATA'}
          </span>
        </div>

        <StatsPanel liveStats={transportData.stats} />
      </div>

      {/* Right column — contenu statique (détails, légende, branding) */}
      <div className={`panel-right-col ${mobileRight ? 'mobile-visible' : ''} ${showTravel && activeTab === 'itineraire' ? 'itinerary-active' : ''}`}>
        {/* Travel Panel DESKTOP uniquement — sur mobile il est indépendant */}
        <div className="travel-panel-desktop">
          {showTravel ? (
            <TravelPanel
              onFlyTo={handleTravelFlyTo}
              onSetMarker={handleSetMarker}
              onRequestMapClick={handleRequestMapClick}
              mapClickMode={mapClickMode}
              departure={departure}
              arrival={arrival}
              onSetDeparture={handleSetDeparture}
              onSetArrival={handleSetArrival}
              onClearRoute={handleClearRoute}
              routeResult={routeResult}
              onSetRouteResult={setRouteResult}
              onClose={() => setShowTravel(false)}
              transportData={transportData}
              onTabChange={setActiveTab}
              onContribute={() => { setShowTravel(false); setShowContribute(true); setMobileLeft(false); setMobileRight(false); }}
            />
          ) : null}
        </div>

        {selection
          ? <DetailPanel selection={selection} onClose={handleCloseDetail} />
          : !showTravel ? <BrandingPanel /> : null
        }
        {(!showTravel || activeTab !== 'itineraire') && <LegendPanel />}
      </div>

      {/* Travel Panel MOBILE — indépendant, plein écran */}
      {showTravel && (
        <div className="travel-panel-mobile">
          <TravelPanel
            onFlyTo={handleTravelFlyTo}
            onSetMarker={handleSetMarker}
            onRequestMapClick={handleRequestMapClick}
            mapClickMode={mapClickMode}
            departure={departure}
            arrival={arrival}
            onSetDeparture={handleSetDeparture}
            onSetArrival={handleSetArrival}
            onClearRoute={handleClearRoute}
            routeResult={routeResult}
            onSetRouteResult={setRouteResult}
            onClose={() => setShowTravel(false)}
            transportData={transportData}
            onTabChange={setActiveTab}
            onContribute={() => { setShowTravel(false); setShowContribute(true); setMobileLeft(false); setMobileRight(false); }}
          />
        </div>
      )}

      {/* Bouton flottant Contribuer 📝 */}
      <button
        onClick={() => {
          const next = !showContribute;
          setShowContribute(next);
          if (!next) { setContributePickMode(false); setContributeMapClick(null); }
          // Fermer les autres panneaux sur mobile
          if (next) { setMobileLeft(false); setMobileRight(false); }
        }}
        title="Contribuer"
        className="contribute-fab"
        style={{
          position: 'absolute',
          bottom: 112,
          right: 20,
          zIndex: 1000,
          width: 44, height: 44,
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: showContribute
            ? 'linear-gradient(135deg, var(--emerald), #059669)'
            : 'var(--glass-bg)',
          backdropFilter: 'blur(8px)',
          border: `1.5px solid ${showContribute ? 'var(--emerald)' : 'var(--glass-border)'}`,
          boxShadow: showContribute
            ? '0 4px 20px rgba(52,211,153,0.3)'
            : '0 4px 16px rgba(0,0,0,0.3)',
          cursor: 'pointer',
          transition: 'all 0.3s',
          color: showContribute ? '#fff' : 'var(--text-secondary)',
          fontSize: 20,
        }}
      >
        📝
      </button>

      {/* Panneau de contribution */}
      {showContribute && (
        <div className="contribute-panel-mobile" style={{
          position: 'fixed',
          bottom: 164,
          right: 12,
          zIndex: 1100,
          width: 340,
          maxWidth: 'calc(100vw - 24px)',
          maxHeight: 'calc(100vh - 180px)',
          overflowY: 'auto',
        }}>
          <div className="glass-panel-solid">
            <ContributePanel
              onClose={() => { setShowContribute(false); setContributePickMode(false); setContributeMapClick(null); }}
              onPickOnMap={() => setContributePickMode(true)}
              mapClickPosition={contributeMapClick}
              existingArrets={transportData.arrets}
              existingGares={transportData.gares}
              existingLignes={transportData.lignes}
            />
          </div>
        </div>
      )}

      {/* Indicateur mode placement carte */}
      {contributePickMode && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1001,
          padding: '12px 24px',
          background: 'rgba(8, 15, 28, 0.92)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--emerald)',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', gap: 10,
          animation: 'pulse 2s ease infinite',
        }}>
          <span style={{ fontSize: 24 }}>📍</span>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 14, fontWeight: 600,
            color: 'var(--emerald)',
          }}>
            Cliquez sur la carte pour placer le point
          </span>
          <button
            onClick={() => setContributePickMode(false)}
            style={{
              background: 'none', border: '1px solid var(--glass-border)',
              borderRadius: 6, padding: '4px 8px',
              color: 'var(--text-muted)', cursor: 'pointer',
              fontSize: 11,
            }}
          >
            Annuler
          </button>
        </div>
      )}

      {/* Bouton flottant Info Voyageur */}
      <button
        onClick={() => {
          const next = !showTravel;
          setShowTravel(next);
          // Fermer les autres panneaux sur mobile
          if (next) { setMobileLeft(false); setMobileRight(false); setShowContribute(false); setContributePickMode(false); setContributeMapClick(null); }
        }}
        className="travel-fab"
        style={{
          position: 'absolute',
          bottom: 60,
          right: 20,
          zIndex: 1000,
          width: 44, height: 44,
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: showTravel
            ? 'linear-gradient(135deg, var(--cyan), #0891b2)'
            : 'var(--glass-bg)',
          backdropFilter: 'blur(8px)',
          border: `1.5px solid ${showTravel ? 'var(--cyan)' : 'var(--glass-border)'}`,
          boxShadow: showTravel
            ? '0 4px 20px rgba(34,211,238,0.3)'
            : '0 4px 16px rgba(0,0,0,0.3)',
          cursor: 'pointer',
          transition: 'all 0.3s',
          color: showTravel ? '#fff' : 'var(--text-secondary)',
        }}
        title="Information voyageur"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="3 11 22 2 13 21 11 13 3 11" />
        </svg>
      </button>

      {/* Mobile toggle buttons */}
      <MobileToggle
        showLeft={mobileLeft}
        showRight={mobileRight}
        onToggleLeft={() => {
          const next = !mobileLeft;
          setMobileLeft(next);
          setMobileRight(false);
          if (next) { setShowContribute(false); setContributePickMode(false); setContributeMapClick(null); }
        }}
        onToggleRight={() => {
          const next = !mobileRight;
          setMobileRight(next);
          setMobileLeft(false);
          if (next) { setShowContribute(false); setContributePickMode(false); setContributeMapClick(null); }
        }}
      />

      {/* Bottom coords */}
      <CoordsHUD coords={mouseCoords} />

      {/* Onboarding tutorial — premier lancement uniquement */}
      <OnboardingTutorial />

      {/* PWA Install prompt */}
      <InstallPrompt />

      {/* Admin Dashboard — accès via /#minad uniquement */}
      {showAdmin && (
        <AdminDashboard onClose={() => { setShowAdmin(false); window.location.hash = ''; }} />
      )}
    </div>
  );
}
