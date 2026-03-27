import { GeoJSON, useMap } from 'react-leaflet'
import { useEffect, useRef } from 'react'

/**
 * Composant qui affiche une couche GeoJSON depuis Supabase PostGIS.
 * 
 * Prend un GeoJSON FeatureCollection et le rend sur la carte
 * avec le style et les popups configurés.
 */
export default function GeoJSONLayer({
  data,
  visible = true,
  style = {},
  pointRadius = 5,
  pointColor = '#22d3ee',
  onFeatureClick,
}) {
  const layerRef = useRef(null)

  if (!visible || !data || !data.features || data.features.length === 0) {
    return null
  }

  const defaultStyle = (feature) => {
    const geomType = feature.geometry.type

    if (geomType === 'Point') {
      return {} // Points are handled by pointToLayer
    }

    return {
      color: style.color || '#22d3ee',
      weight: style.weight || 3,
      opacity: style.opacity || 0.7,
      dashArray: style.dashArray || null,
      ...style,
    }
  }

  const pointToLayer = (feature, latlng) => {
    const L = window.L || require('leaflet')
    return L.circleMarker(latlng, {
      radius: pointRadius,
      fillColor: pointColor,
      color: '#fff',
      weight: 1.5,
      fillOpacity: 0.8,
    })
  }

  const onEachFeature = (feature, layer) => {
    const props = feature.properties || {}

    // Build popup content
    const entries = Object.entries(props)
      .filter(([k, v]) => v && v !== '' && k !== 'id')
      .slice(0, 6) // Max 6 fields in popup

    if (entries.length > 0) {
      const content = entries
        .map(([k, v]) => `<strong>${k}</strong>: ${v}`)
        .join('<br/>')

      layer.bindPopup(
        `<div style="font-family:var(--font-display,sans-serif);font-size:12px;color:#e2e8f0;min-width:160px">${content}</div>`
      )
    }

    if (onFeatureClick) {
      layer.on('click', () => onFeatureClick(feature))
    }
  }

  // Use a unique key to force re-render when data changes
  const key = `geojson-${data.features.length}-${Date.now()}`

  return (
    <GeoJSON
      key={key}
      ref={layerRef}
      data={data}
      style={defaultStyle}
      pointToLayer={pointToLayer}
      onEachFeature={onEachFeature}
    />
  )
}
