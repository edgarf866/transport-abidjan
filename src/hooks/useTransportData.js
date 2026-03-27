import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import {
  BUS_LINES,
  TRANSPORT_HUBS,
  COMMUNES,
  METRO_PROJECT,
} from '../data/transport'

/**
 * Hook principal de chargement des données transport.
 *
 * Mode API (production) :
 *   - Appelle le backend FastAPI qui interroge Neon PostGIS
 *   - Les données GeoJSON viennent de la base de données
 *
 * Mode statique (fallback) :
 *   - Si l'API est inaccessible, utilise les données en dur
 *   - Permet de développer le frontend sans backend
 */
export function useTransportData() {
  const [data, setData] = useState({
    arrets: null,
    gares: null,
    lignes: null,
    routes: null,
    communes: null,
    lagunaire: null,
    voiesFerrees: null,
    stats: null,
    // Fallback statiques
    busLines: BUS_LINES,
    transportHubs: TRANSPORT_HUBS,
    communesStatic: COMMUNES,
    metroProject: METRO_PROJECT,
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [source, setSource] = useState('static')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    // 1. Vérifier si l'API est accessible
    const apiOk = await api.healthCheck()

    if (!apiOk) {
      console.log('[TransportMap] API inaccessible → mode données statiques')
      setSource('static')
      setLoading(false)
      return
    }

    // 2. Charger depuis l'API FastAPI
    console.log('[TransportMap] Chargement depuis FastAPI / Neon PostGIS...')
    setSource('neon')

    try {
      const [arrets, gares, lignes, routes, communes, lagunaire, voiesFerrees, stats] = await Promise.all([
        api.getArrets(),
        api.getGares(),
        api.getLignes(),
        api.getRoutes(),
        api.getCommunes(),
        api.getLagunaire(),
        api.getVoiesFerrees(),
        api.getStats(),
      ])

      setData(prev => ({
        ...prev,
        arrets,
        gares,
        lignes,
        routes,
        communes,
        lagunaire,
        voiesFerrees,
        stats,
      }))

      const counts = [
        arrets?.features?.length || 0,
        gares?.features?.length || 0,
        lignes?.features?.length || 0,
        routes?.features?.length || 0,
        communes?.features?.length || 0,
        lagunaire?.features?.length || 0,
        voiesFerrees?.features?.length || 0,
      ]
      console.log(
        `[TransportMap] Chargé : ${counts[0]} arrêts, ${counts[1]} gares, ` +
        `${counts[2]} lignes, ${counts[3]} routes, ${counts[4]} communes, ` +
        `${counts[5]} lagunaire, ${counts[6]} voies ferrées`
      )

    } catch (err) {
      console.error('[TransportMap] Erreur API:', err)
      setError(err.message)
      setSource('static')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Recherche les arrêts dans un rayon (appel API PostGIS).
   */
  const searchNearby = useCallback(async (lng, lat, rayon = 500) => {
    if (source !== 'neon') return null
    return api.getNearby(lng, lat, rayon)
  }, [source])

  return {
    ...data,
    loading,
    error,
    source,
    searchNearby,
    isLive: source === 'neon',
  }
}
