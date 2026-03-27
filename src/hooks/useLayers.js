import { useState, useCallback } from 'react';

const DEFAULT_LAYERS = {
  lignes: true,
  arrets: true,
  gares: true,
  routes: true,
  communes: true,
  lagunaire: true,
  voiesFerrees: true,
};

export function useLayers() {
  const [layers, setLayers] = useState(DEFAULT_LAYERS);

  const toggleLayer = useCallback((key) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const setAllLayers = useCallback((value) => {
    setLayers(Object.fromEntries(Object.keys(DEFAULT_LAYERS).map(k => [k, value])));
  }, []);

  return { layers, toggleLayer, setAllLayers };
}
