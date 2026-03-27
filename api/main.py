"""
============================================================
TRANSPORTMAP API — Grand Abidjan
============================================================
API REST GeoJSON pour le réseau de transport du Grand Abidjan.
Sert les données PostGIS (Neon) au frontend React/Leaflet.

Auteur  : Edgar Kouassi — MEDEV GROUP SARL
Stack   : FastAPI + Neon PostGIS
============================================================

Démarrage local :
    cd api
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000

Endpoints :
    GET /                       → Infos API
    GET /api/arrets              → GeoJSON des arrêts de bus
    GET /api/gares               → GeoJSON des gares routières
    GET /api/lignes              → GeoJSON des lignes de bus
    GET /api/routes              → GeoJSON des routes principales
    GET /api/communes            → GeoJSON des communes
    GET /api/nearby?lon=&lat=&r= → Arrêts dans un rayon
    GET /api/stats               → Statistiques globales
    GET /health                  → Santé de l'API + BDD
"""

import os
import hashlib
import json
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, Query, HTTPException, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List
from dotenv import load_dotenv

from database import query, query_single, execute

load_dotenv()

# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="TransportMap API",
    description="API GeoJSON du réseau de transport du Grand Abidjan",
    version="1.0.0",
    docs_url="/docs",
)

# CORS — autoriser le frontend React
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174,http://localhost:5175").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in allowed_origins],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["*"],
)


# ============================================================
# HELPERS
# ============================================================

def geojson_response(sql, params=None):
    """Exécute une requête GeoJSON et retourne la réponse."""
    try:
        result = query_single(sql, params)
        if result is None:
            return {"type": "FeatureCollection", "features": []}
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# ROUTES
# ============================================================

@app.get("/")
def root():
    """Informations sur l'API."""
    return {
        "name": "TransportMap API",
        "version": "1.0.0",
        "author": "Edgar Kouassi — MEDEV GROUP",
        "description": "API GeoJSON du réseau de transport du Grand Abidjan",
        "endpoints": [
            "/api/arrets",
            "/api/gares",
            "/api/lignes",
            "/api/routes",
            "/api/communes",
            "/api/lagunaire",
            "/api/voies_ferrees",
            "/api/arrets/bbox?west=-4.1&south=5.2&east=-3.9&north=5.5",
            "/api/nearby?lon=-4.02&lat=5.35&rayon=500",
            "/api/lines-at-point?lon=-4.02&lat=5.35&radius=150",
            "/api/ligne/1/arrets",
            "/api/itineraire?from_lon=-4.02&from_lat=5.35&to_lon=-3.98&to_lat=5.31",
            "/api/stats",
            "/health",
            "/docs",
        ],
    }


@app.get("/health")
def health():
    """Vérifie la santé de l'API et la connexion PostGIS."""
    try:
        result = query_single("SELECT PostGIS_Version() AS version")
        return {
            "status": "ok",
            "database": "connected",
            "postgis_version": result,
        }
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "database": "disconnected", "detail": str(e)},
        )


# ------------------------------------------------------------
# ARRÊTS DE BUS
# ------------------------------------------------------------

@app.get("/api/arrets")
def get_arrets():
    """Retourne tous les arrêts de bus en GeoJSON."""
    return geojson_response("""
        SELECT json_build_object(
            'type', 'FeatureCollection',
            'features', COALESCE(json_agg(
                json_build_object(
                    'type', 'Feature',
                    'geometry', ST_AsGeoJSON(geom)::json,
                    'properties', json_build_object(
                        'id', id,
                        'nom', nom,
                        'operateur', operateur,
                        'type_arret', type_arret
                    )
                )
            ), '[]'::json)
        )
        FROM transport.arrets
    """)


# ------------------------------------------------------------
# GARES ROUTIÈRES
# ------------------------------------------------------------

@app.get("/api/gares")
def get_gares():
    """Retourne toutes les gares en GeoJSON."""
    return geojson_response("""
        SELECT json_build_object(
            'type', 'FeatureCollection',
            'features', COALESCE(json_agg(
                json_build_object(
                    'type', 'Feature',
                    'geometry', ST_AsGeoJSON(geom)::json,
                    'properties', json_build_object(
                        'id', id,
                        'nom', nom,
                        'type_gare', type_gare,
                        'nb_lignes', nb_lignes,
                        'passagers_jour', passagers_jour
                    )
                )
            ), '[]'::json)
        )
        FROM transport.gares
    """)


# ------------------------------------------------------------
# LIGNES DE BUS
# ------------------------------------------------------------

@app.get("/api/lignes")
def get_lignes():
    """Retourne toutes les lignes de bus en GeoJSON."""
    return geojson_response("""
        SELECT json_build_object(
            'type', 'FeatureCollection',
            'features', COALESCE(json_agg(
                json_build_object(
                    'type', 'Feature',
                    'geometry', ST_AsGeoJSON(geom)::json,
                    'properties', json_build_object(
                        'id', id,
                        'code_ligne', code_ligne,
                        'nom', nom,
                        'operateur', operateur,
                        'type_ligne', type_ligne,
                        'frequence', frequence
                    )
                )
            ), '[]'::json)
        )
        FROM transport.lignes
    """)


# ------------------------------------------------------------
# ROUTES PRINCIPALES
# ------------------------------------------------------------

@app.get("/api/routes")
def get_routes():
    """Retourne les routes principales en GeoJSON."""
    return geojson_response("""
        SELECT json_build_object(
            'type', 'FeatureCollection',
            'features', COALESCE(json_agg(
                json_build_object(
                    'type', 'Feature',
                    'geometry', ST_AsGeoJSON(geom)::json,
                    'properties', json_build_object(
                        'id', id,
                        'nom', nom,
                        'type_route', type_route,
                        'nb_voies', nb_voies
                    )
                )
            ), '[]'::json)
        )
        FROM transport.routes
    """)


# ------------------------------------------------------------
# COMMUNES
# ------------------------------------------------------------

@app.get("/api/communes")
def get_communes():
    """Retourne les communes du Grand Abidjan en GeoJSON."""
    return geojson_response("""
        SELECT json_build_object(
            'type', 'FeatureCollection',
            'features', COALESCE(json_agg(
                json_build_object(
                    'type', 'Feature',
                    'geometry', ST_AsGeoJSON(geom)::json,
                    'properties', json_build_object(
                        'id', id,
                        'nom', nom,
                        'population', population,
                        'superficie_km2', superficie_km2,
                        'description', description
                    )
                )
            ), '[]'::json)
        )
        FROM transport.communes
    """)


# ------------------------------------------------------------
# ARRÊTS PAR BBOX (viewport)
# ------------------------------------------------------------

@app.get("/api/arrets/bbox")
def get_arrets_bbox(
    west: float = Query(..., description="Longitude ouest"),
    south: float = Query(..., description="Latitude sud"),
    east: float = Query(..., description="Longitude est"),
    north: float = Query(..., description="Latitude nord"),
    limit: int = Query(500, description="Nombre max d'arrêts", ge=10, le=6000),
):
    """
    Retourne les arrêts dans un rectangle (bbox).
    Utilise l'index GIST pour une requête performante.
    """
    return geojson_response("""
        SELECT json_build_object(
            'type', 'FeatureCollection',
            'features', COALESCE(json_agg(
                json_build_object(
                    'type', 'Feature',
                    'geometry', ST_AsGeoJSON(geom)::json,
                    'properties', json_build_object(
                        'id', id,
                        'nom', nom,
                        'operateur', operateur,
                        'type_arret', type_arret
                    )
                )
            ), '[]'::json)
        )
        FROM (
            SELECT * FROM transport.arrets
            WHERE geom && ST_MakeEnvelope(%s, %s, %s, %s, 4326)
            LIMIT %s
        ) sub
    """, (west, south, east, north, limit))


# ------------------------------------------------------------
# RECHERCHE PAR PROXIMITÉ (isochrone simplifié)
# ------------------------------------------------------------

@app.get("/api/nearby")
def get_nearby(
    lon: float = Query(..., description="Longitude du point central"),
    lat: float = Query(..., description="Latitude du point central"),
    rayon: int = Query(500, description="Rayon de recherche en mètres", ge=50, le=5000),
):
    """
    Retourne les arrêts dans un rayon donné autour d'un point.
    Utilise ST_DWithin pour une recherche spatiale performante (index GIST).
    """
    return geojson_response("""
        SELECT json_build_object(
            'type', 'FeatureCollection',
            'features', COALESCE(json_agg(
                json_build_object(
                    'type', 'Feature',
                    'geometry', ST_AsGeoJSON(geom)::json,
                    'properties', json_build_object(
                        'id', id,
                        'nom', nom,
                        'operateur', operateur,
                        'distance_m', ROUND(ST_Distance(
                            geom::geography,
                            ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography
                        )::numeric)
                    )
                )
            ORDER BY ST_Distance(
                geom::geography,
                ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography
            )), '[]'::json)
        )
        FROM transport.arrets
        WHERE ST_DWithin(
            geom::geography,
            ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography,
            %s
        )
    """, (lon, lat, lon, lat, lon, lat, rayon))


# ------------------------------------------------------------
# TRANSPORT LAGUNAIRE
# ------------------------------------------------------------

@app.get("/api/lagunaire")
def get_lagunaire():
    """Retourne les lignes de transport lagunaire en GeoJSON."""
    return geojson_response("""
        SELECT json_build_object(
            'type', 'FeatureCollection',
            'features', COALESCE(json_agg(
                json_build_object(
                    'type', 'Feature',
                    'geometry', ST_AsGeoJSON(geom)::json,
                    'properties', json_build_object(
                        'id', id,
                        'nom', nom,
                        'operateur', operateur,
                        'frequence', frequence
                    )
                )
            ), '[]'::json)
        )
        FROM transport.lagunaire
    """)


# ------------------------------------------------------------
# VOIES FERRÉES
# ------------------------------------------------------------

@app.get("/api/voies_ferrees")
def get_voies_ferrees():
    """Retourne les voies ferrées en GeoJSON."""
    return geojson_response("""
        SELECT json_build_object(
            'type', 'FeatureCollection',
            'features', COALESCE(json_agg(
                json_build_object(
                    'type', 'Feature',
                    'geometry', ST_AsGeoJSON(geom)::json,
                    'properties', json_build_object(
                        'id', id,
                        'nom', nom,
                        'type_rail', type_rail,
                        'operateur', operateur
                    )
                )
            ), '[]'::json)
        )
        FROM transport.voies_ferrees
    """)


# ------------------------------------------------------------
# LIGNES À PROXIMITÉ D'UN POINT
# ------------------------------------------------------------

@app.get("/api/lines-at-point")
def get_lines_at_point(
    lon: float = Query(..., description="Longitude du point"),
    lat: float = Query(..., description="Latitude du point"),
    radius: int = Query(150, description="Rayon de recherche en mètres", ge=1, le=500),
):
    """
    Retourne les lignes desservant les arrêts proches d'un point.
    Utilise la table arrets_lignes si disponible, sinon fallback spatial.
    """
    # Try using junction table first
    try:
        result = geojson_response("""
            SELECT json_build_object(
                'type', 'FeatureCollection',
                'features', COALESCE(json_agg(DISTINCT
                    json_build_object(
                        'type', 'Feature',
                        'geometry', ST_AsGeoJSON(l.geom)::json,
                        'properties', json_build_object(
                            'id', l.id,
                            'code_ligne', l.code_ligne,
                            'nom', l.nom,
                            'operateur', l.operateur,
                            'type_ligne', l.type_ligne,
                            'frequence', l.frequence,
                            'nb_arrets', sub.nb_arrets,
                            'distance_m', sub.min_dist
                        )
                    )
                ), '[]'::json)
            )
            FROM (
                SELECT
                    al.ligne_id,
                    COUNT(*) AS nb_arrets,
                    MIN(al.distance_m) AS min_dist
                FROM transport.arrets_lignes al
                JOIN transport.arrets a ON a.id = al.arret_id
                WHERE ST_DWithin(
                    a.geom::geography,
                    ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography,
                    %s
                )
                GROUP BY al.ligne_id
            ) sub
            JOIN transport.lignes l ON l.id = sub.ligne_id
            ORDER BY sub.min_dist
        """, (lon, lat, radius))
        # Check if result has features (table exists and has data)
        if result and result.get('features') and len(result['features']) > 0:
            return result
    except:
        pass  # Table doesn't exist yet, use fallback

    # Fallback: direct spatial matching
    return geojson_response("""
        SELECT json_build_object(
            'type', 'FeatureCollection',
            'features', COALESCE(json_agg(
                json_build_object(
                    'type', 'Feature',
                    'geometry', ST_AsGeoJSON(geom)::json,
                    'properties', json_build_object(
                        'id', id,
                        'code_ligne', code_ligne,
                        'nom', nom,
                        'operateur', operateur,
                        'type_ligne', type_ligne,
                        'frequence', frequence,
                        'distance_m', ROUND(ST_Distance(
                            geom::geography,
                            ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography
                        )::numeric)
                    )
                )
            ORDER BY ST_Distance(
                geom::geography,
                ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography
            )), '[]'::json)
        )
        FROM transport.lignes
        WHERE ST_DWithin(
            geom::geography,
            ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography,
            %s
        )
    """, (lon, lat, lon, lat, lon, lat, radius))


@app.get("/api/ligne/{ligne_id}/arrets")
def get_ligne_arrets(ligne_id: int):
    """Retourne les arrêts desservis par une ligne, dans l'ordre séquentiel."""
    try:
        return geojson_response("""
            SELECT json_build_object(
                'type', 'FeatureCollection',
                'features', COALESCE(json_agg(
                    json_build_object(
                        'type', 'Feature',
                        'geometry', ST_AsGeoJSON(a.geom)::json,
                        'properties', json_build_object(
                            'id', a.id,
                            'nom', a.nom,
                            'operateur', a.operateur,
                            'sequence', al.sequence,
                            'distance_m', al.distance_m
                        )
                    )
                ORDER BY al.sequence), '[]'::json)
            )
            FROM transport.arrets_lignes al
            JOIN transport.arrets a ON a.id = al.arret_id
            WHERE al.ligne_id = %s
        """, (ligne_id,))
    except:
        return {"type": "FeatureCollection", "features": []}


# ------------------------------------------------------------
# ITINÉRAIRE MULTI-ÉTAPES — Décomposition A → B → C → D
# ------------------------------------------------------------

def _get_active_alerts():
    """Retourne les alertes approuvées des dernières 24h avec leur zone d'impact."""
    try:
        return query("""
            SELECT
                id, data,
                ST_Y(geom) AS lat, ST_X(geom) AS lng
            FROM transport.contributions
            WHERE type = 'alerte'
              AND status = 'approved'
              AND geom IS NOT NULL
              AND created_at > NOW() - INTERVAL '24 hours'
        """)
    except:
        return []


def _get_alerted_line_ids():
    """Retourne les IDs des lignes impactées par des alertes actives + le type d'alerte.
    Rayon d'impact : 300m autour de chaque alerte."""
    alerts = _get_active_alerts()
    if not alerts:
        return {}, []

    blocked_lines = {}  # ligne_id -> {alert_type, severity}
    alert_infos = []

    for alert in alerts:
        data = alert.get('data', {})
        if isinstance(data, str):
            data = json.loads(data)

        alert_type = data.get('alert_type', data.get('type_alerte', ''))
        description = data.get('description', '')

        # Alertes bloquantes (exclure la ligne)
        blocking = alert_type.lower() in ('route coupée', 'grève', 'inondation')
        # Alertes pénalisantes (ajouter du temps)
        penalty_min = 20 if not blocking else 0

        # Trouver les lignes qui passent dans un rayon de 300m
        try:
            impacted = query("""
                SELECT DISTINCT l.id, l.nom
                FROM transport.lignes l
                WHERE ST_DWithin(
                    l.geom::geography,
                    ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography,
                    300
                )
            """, (alert['lng'], alert['lat']))

            for line in impacted:
                lid = line['id']
                if blocking:
                    blocked_lines[lid] = {
                        'alert_type': alert_type,
                        'blocked': True,
                        'penalty_min': 0,
                        'description': description,
                    }
                elif lid not in blocked_lines:
                    blocked_lines[lid] = {
                        'alert_type': alert_type,
                        'blocked': False,
                        'penalty_min': penalty_min,
                        'description': description,
                    }
        except:
            pass

        alert_infos.append({
            'type': alert_type,
            'description': description,
            'lat': alert['lat'],
            'lng': alert['lng'],
            'blocking': blocking,
        })

    return blocked_lines, alert_infos


def _find_nearest_stops(lon, lat, radius, limit=5):
    """Trouve les arrêts et gares les plus proches d'un point."""
    stops = query("""
        SELECT id, nom, 'arret' AS type,
               ROUND(ST_Distance(geom::geography,
                   ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography)::numeric) AS distance_m,
               ST_X(geom) AS lon, ST_Y(geom) AS lat
        FROM transport.arrets
        WHERE ST_DWithin(geom::geography,
            ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, %s)
        ORDER BY geom::geography <-> ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography
        LIMIT %s
    """, (lon, lat, lon, lat, radius, lon, lat, limit))

    gares = query("""
        SELECT id, nom, 'gare' AS type,
               type_gare,
               ROUND(ST_Distance(geom::geography,
                   ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography)::numeric) AS distance_m,
               ST_X(geom) AS lon, ST_Y(geom) AS lat
        FROM transport.gares
        WHERE ST_DWithin(geom::geography,
            ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, %s)
        ORDER BY geom::geography <-> ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography
        LIMIT %s
    """, (lon, lat, lon, lat, radius, lon, lat, limit))

    return stops + gares


def _get_lines_at_stop(stop_id):
    """Retourne les lignes qui desservent un arrêt via arrets_lignes."""
    try:
        return query("""
            SELECT l.id, l.nom, l.operateur, l.type_ligne, l.depart, l.arrivee,
                   l.duree_min, al.sequence
            FROM transport.arrets_lignes al
            JOIN transport.lignes l ON l.id = al.ligne_id
            WHERE al.arret_id = %s
            ORDER BY al.sequence
        """, (stop_id,))
    except:
        return []


def _get_lines_near_gare(gare_id):
    """Retourne les lignes (bus + lagunaire) proches d'une gare (spatial)."""
    # Lignes de bus
    bus_lines = query("""
        SELECT l.id, l.nom, l.operateur, l.type_ligne, l.depart, l.arrivee,
               l.duree_min
        FROM transport.lignes l
        JOIN transport.gares g ON g.id = %s
        WHERE ST_DWithin(l.geom::geography, g.geom::geography, 150)
    """, (gare_id,))

    # Lignes lagunaires (bateau-bus) — chercher si gare lagunaire
    lag_lines = []
    try:
        lag_lines = query("""
            SELECT l.id, l.nom, l.operateur,
                   'lagunaire' AS type_ligne,
                   l.depart, l.arrivee, l.duree_min
            FROM transport.lagunaire l
            JOIN transport.gares g ON g.id = %s
            WHERE g.type_gare = 'gare_lagunaire'
              AND ST_DWithin(l.geom::geography, g.geom::geography, 500)
        """, (gare_id,))
    except:
        pass

    return bus_lines + lag_lines


def _get_lagunaire_near_point(lon, lat, radius=800):
    """Retourne les lignes lagunaires proches d'un point (via gares lagunaires)."""
    try:
        return query("""
            SELECT l.id, l.nom, l.operateur,
                   'lagunaire' AS type_ligne,
                   l.depart, l.arrivee, l.duree_min,
                   g.id AS gare_id, g.nom AS gare_nom,
                   ST_X(g.geom) AS gare_lon, ST_Y(g.geom) AS gare_lat,
                   ROUND(ST_Distance(g.geom::geography,
                       ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography)::numeric) AS distance_m
            FROM transport.gares g
            JOIN transport.lagunaire l
                ON ST_DWithin(l.geom::geography, g.geom::geography, 500)
            WHERE g.type_gare = 'gare_lagunaire'
              AND ST_DWithin(g.geom::geography,
                  ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, %s)
            ORDER BY distance_m
            LIMIT 5
        """, (lon, lat, lon, lat, radius))
    except:
        return []


def _build_step(mode, instruction, ligne=None, from_stop=None, to_stop=None,
                duration_min=None, distance_m=None, coords=None):
    """Construit un objet étape d'itinéraire."""
    step = {
        "mode": mode,            # 'marche', 'bus_sotra', 'gbaka', 'woro_woro', 'bateau', etc.
        "instruction": instruction,
    }
    if ligne:
        step["ligne"] = {
            "id": ligne.get("id"),
            "nom": ligne.get("nom"),
            "type": ligne.get("type_ligne"),
            "operateur": ligne.get("operateur"),
        }
    if from_stop:
        step["from"] = {"nom": from_stop.get("nom"), "lon": float(from_stop.get("lon", 0)), "lat": float(from_stop.get("lat", 0))}
    if to_stop:
        step["to"] = {"nom": to_stop.get("nom"), "lon": float(to_stop.get("lon", 0)), "lat": float(to_stop.get("lat", 0))}
    if duration_min is not None:
        step["duree_min"] = round(float(duration_min), 1)
    if distance_m is not None:
        step["distance_m"] = round(float(distance_m))
    if coords:
        step["coords"] = coords
    return step


@app.get("/api/itineraire")
def get_itineraire(
    from_lon: float = Query(..., description="Longitude de départ"),
    from_lat: float = Query(..., description="Latitude de départ"),
    to_lon: float = Query(..., description="Longitude d'arrivée"),
    to_lat: float = Query(..., description="Latitude d'arrivée"),
    radius: int = Query(500, description="Rayon de recherche en mètres", ge=50, le=2000),
):
    """
    Calcule un itinéraire multi-étapes en transport en commun.
    Retourne les étapes détaillées (marche + transport + correspondances).
    Supporte la "décomposition" : A → B → C → D avec plusieurs modes.
    """
    try:
        itineraires = []

        # --- 0. Récupérer les alertes actives ---
        alerted_lines, active_alerts = _get_alerted_line_ids()

        # --- 1. Points d'accès proches du départ et de l'arrivée ---
        dep_stops = _find_nearest_stops(from_lon, from_lat, radius)
        arr_stops = _find_nearest_stops(to_lon, to_lat, radius)

        if not dep_stops or not arr_stops:
            # Élargir le rayon si rien trouvé
            dep_stops = _find_nearest_stops(from_lon, from_lat, 1500, limit=3)
            arr_stops = _find_nearest_stops(to_lon, to_lat, 1500, limit=3)

        if not dep_stops or not arr_stops:
            return {
                "departure": {"lon": from_lon, "lat": from_lat},
                "arrival": {"lon": to_lon, "lat": to_lat},
                "itineraires": [],
                "message": "Aucun arrêt ou gare trouvé à proximité"
            }

        # --- 2. Pour chaque arrêt de départ, trouver les lignes disponibles ---
        dep_lines_map = {}  # stop_key -> [lignes]
        for s in dep_stops:
            key = f"{s['type']}_{s['id']}"
            if s['type'] == 'arret':
                dep_lines_map[key] = {"stop": s, "lines": _get_lines_at_stop(s['id'])}
            else:
                dep_lines_map[key] = {"stop": s, "lines": _get_lines_near_gare(s['id'])}

        arr_lines_map = {}
        for s in arr_stops:
            key = f"{s['type']}_{s['id']}"
            if s['type'] == 'arret':
                arr_lines_map[key] = {"stop": s, "lines": _get_lines_at_stop(s['id'])}
            else:
                arr_lines_map[key] = {"stop": s, "lines": _get_lines_near_gare(s['id'])}

        dep_line_ids = set()
        for v in dep_lines_map.values():
            for l in v['lines']:
                dep_line_ids.add(l['id'])

        arr_line_ids = set()
        for v in arr_lines_map.values():
            for l in v['lines']:
                arr_line_ids.add(l['id'])

        # --- 3. Chercher les trajets DIRECTS ---
        common_line_ids = dep_line_ids & arr_line_ids

        for lid in list(common_line_ids)[:5]:
            # Trouver le stop de départ et d'arrivée pour cette ligne
            dep_stop = None
            dep_line = None
            for v in dep_lines_map.values():
                for l in v['lines']:
                    if l['id'] == lid:
                        dep_stop = v['stop']
                        dep_line = l
                        break
                if dep_stop:
                    break

            arr_stop = None
            for v in arr_lines_map.values():
                for l in v['lines']:
                    if l['id'] == lid:
                        arr_stop = v['stop']
                        break
                if arr_stop:
                    break

            if not dep_stop or not arr_stop or not dep_line:
                continue

            steps = []
            # Étape 1 : marche vers l'arrêt de départ
            walk_dist = float(dep_stop.get('distance_m', 0))
            if walk_dist > 20:
                steps.append(_build_step(
                    'marche',
                    f"Marchez jusqu'à {dep_stop['nom']}",
                    distance_m=walk_dist,
                    duration_min=walk_dist / 80,
                    from_stop={"nom": "Votre position", "lon": from_lon, "lat": from_lat},
                    to_stop=dep_stop,
                ))

            # Étape 2 : prendre la ligne
            duree = dep_line.get('duree_min')
            type_l = (dep_line.get('type_ligne') or '').lower()
            mode = 'bateau' if 'lagunaire' in type_l else 'gbaka' if 'gbaka' in type_l else 'woro_woro' if 'woro' in type_l else 'bus_sotra' if 'sotra' in type_l or 'bus' in type_l or 'express' in type_l else 'transport'
            steps.append(_build_step(
                mode,
                f"Prenez {dep_line['nom']}",
                ligne=dep_line,
                from_stop=dep_stop,
                to_stop=arr_stop,
                duration_min=duree,
            ))

            # Étape 3 : marche vers la destination
            walk_dist_arr = float(arr_stop.get('distance_m', 0))
            if walk_dist_arr > 20:
                steps.append(_build_step(
                    'marche',
                    f"Marchez jusqu'à votre destination",
                    distance_m=walk_dist_arr,
                    duration_min=walk_dist_arr / 80,
                    from_stop=arr_stop,
                    to_stop={"nom": "Destination", "lon": to_lon, "lat": to_lat},
                ))

            total_duree = sum(s.get('duree_min', 0) for s in steps)
            itineraires.append({
                "type": "direct",
                "nb_correspondances": 0,
                "duree_totale_min": round(total_duree, 1),
                "steps": steps,
            })

        # --- 3b. Chercher les trajets via BATEAU-BUS (lagunaire) ---
        try:
            dep_lag = _get_lagunaire_near_point(from_lon, from_lat, 1000)
            arr_lag = _get_lagunaire_near_point(to_lon, to_lat, 1000)

            if dep_lag and arr_lag:
                # Trouver les lignes lagunaires communes
                dep_lag_ids = {l['id'] for l in dep_lag}
                arr_lag_ids = {l['id'] for l in arr_lag}
                common_lag = dep_lag_ids & arr_lag_ids

                for lag_id in list(common_lag)[:2]:
                    dep_l = next(l for l in dep_lag if l['id'] == lag_id)
                    arr_l = next(l for l in arr_lag if l['id'] == lag_id)

                    steps = []

                    # Marche vers gare lagunaire de départ
                    walk1 = float(dep_l.get('distance_m', 0))
                    dep_gare = {"nom": dep_l['gare_nom'], "lon": float(dep_l['gare_lon']), "lat": float(dep_l['gare_lat'])}
                    if walk1 > 20:
                        steps.append(_build_step(
                            'marche', f"Marchez jusqu'à la gare lagunaire {dep_l['gare_nom']}",
                            distance_m=walk1, duration_min=walk1 / 80,
                            from_stop={"nom": "Votre position", "lon": from_lon, "lat": from_lat},
                            to_stop=dep_gare,
                        ))

                    # Bateau-bus
                    arr_gare = {"nom": arr_l['gare_nom'], "lon": float(arr_l['gare_lon']), "lat": float(arr_l['gare_lat'])}
                    steps.append(_build_step(
                        'bateau', f"Prenez le bateau-bus {dep_l['nom']}",
                        ligne={"id": dep_l['id'], "nom": dep_l['nom'], "type_ligne": "lagunaire", "operateur": dep_l.get('operateur')},
                        from_stop=dep_gare, to_stop=arr_gare,
                        duration_min=dep_l.get('duree_min'),
                    ))

                    # Marche vers destination
                    walk2 = float(arr_l.get('distance_m', 0))
                    if walk2 > 20:
                        steps.append(_build_step(
                            'marche', f"Marchez jusqu'à votre destination",
                            distance_m=walk2, duration_min=walk2 / 80,
                            from_stop=arr_gare,
                            to_stop={"nom": "Destination", "lon": to_lon, "lat": to_lat},
                        ))

                    total_duree = sum(s.get('duree_min', 0) for s in steps)
                    itineraires.append({
                        "type": "bateau-bus",
                        "nb_correspondances": 0,
                        "duree_totale_min": round(total_duree, 1),
                        "steps": steps,
                    })
        except:
            pass

        # --- 4. Chercher les trajets avec 1 CORRESPONDANCE ---
        #     Utilise arrets_lignes (même arrêt) + connexions_pietonnes (arrêts proches à pied)
        if len(itineraires) < 3:
            try:
                transfers = query("""
                    WITH dep_lines AS (
                        SELECT DISTINCT al.ligne_id
                        FROM transport.arrets_lignes al
                        JOIN transport.arrets a ON a.id = al.arret_id
                        WHERE ST_DWithin(a.geom::geography,
                            ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, %s)
                    ),
                    arr_lines AS (
                        SELECT DISTINCT al.ligne_id
                        FROM transport.arrets_lignes al
                        JOIN transport.arrets a ON a.id = al.arret_id
                        WHERE ST_DWithin(a.geom::geography,
                            ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, %s)
                    ),
                    -- Correspondances au même arrêt
                    same_stop_transfers AS (
                        SELECT DISTINCT ON (al1.ligne_id, al2.ligne_id)
                            al1.ligne_id AS dep_ligne_id,
                            al2.ligne_id AS arr_ligne_id,
                            a.nom AS transfer_from_nom,
                            ST_X(a.geom) AS transfer_from_lon,
                            ST_Y(a.geom) AS transfer_from_lat,
                            a.nom AS transfer_to_nom,
                            ST_X(a.geom) AS transfer_to_lon,
                            ST_Y(a.geom) AS transfer_to_lat,
                            0::numeric AS walk_distance_m,
                            2::numeric AS walk_duree_min,
                            g.nom AS gare_nom,
                            g.type_gare AS gare_type
                        FROM dep_lines dl
                        JOIN transport.arrets_lignes al1 ON al1.ligne_id = dl.ligne_id
                        JOIN transport.arrets_lignes al2 ON al2.arret_id = al1.arret_id
                            AND al2.ligne_id != al1.ligne_id
                        JOIN arr_lines ar ON ar.ligne_id = al2.ligne_id
                        JOIN transport.arrets a ON a.id = al1.arret_id
                        LEFT JOIN transport.gares g
                            ON ST_DWithin(g.geom::geography, a.geom::geography, 100)
                        LIMIT 6
                    ),
                    -- Correspondances piétonnes (arrêts proches à pied)
                    walk_transfers AS (
                        SELECT DISTINCT ON (al1.ligne_id, al2.ligne_id)
                            al1.ligne_id AS dep_ligne_id,
                            al2.ligne_id AS arr_ligne_id,
                            cp.from_nom AS transfer_from_nom,
                            ST_X(a_from.geom) AS transfer_from_lon,
                            ST_Y(a_from.geom) AS transfer_from_lat,
                            cp.to_nom AS transfer_to_nom,
                            ST_X(a_to.geom) AS transfer_to_lon,
                            ST_Y(a_to.geom) AS transfer_to_lat,
                            cp.distance_m AS walk_distance_m,
                            cp.duree_marche_min AS walk_duree_min,
                            g.nom AS gare_nom,
                            g.type_gare AS gare_type
                        FROM dep_lines dl
                        JOIN transport.arrets_lignes al1 ON al1.ligne_id = dl.ligne_id
                        JOIN transport.connexions_pietonnes cp
                            ON cp.from_id = al1.arret_id AND cp.from_type = 'arret'
                        JOIN transport.arrets_lignes al2
                            ON al2.arret_id = cp.to_id AND al2.ligne_id != al1.ligne_id
                        JOIN arr_lines ar ON ar.ligne_id = al2.ligne_id
                        JOIN transport.arrets a_from ON a_from.id = cp.from_id
                        JOIN transport.arrets a_to ON a_to.id = cp.to_id
                        LEFT JOIN transport.gares g
                            ON ST_DWithin(g.geom::geography, a_to.geom::geography, 100)
                        WHERE cp.distance_m <= 250
                        LIMIT 6
                    ),
                    all_transfers AS (
                        SELECT * FROM same_stop_transfers
                        UNION ALL
                        SELECT * FROM walk_transfers
                    )
                    SELECT
                        tp.*,
                        ld.nom AS dep_nom, ld.type_ligne AS dep_type,
                        ld.operateur AS dep_operateur, ld.duree_min AS dep_duree,
                        ld.depart AS dep_depart, ld.arrivee AS dep_arrivee,
                        la.nom AS arr_nom, la.type_ligne AS arr_type,
                        la.operateur AS arr_operateur, la.duree_min AS arr_duree,
                        la.depart AS arr_depart, la.arrivee AS arr_arrivee
                    FROM all_transfers tp
                    JOIN transport.lignes ld ON ld.id = tp.dep_ligne_id
                    JOIN transport.lignes la ON la.id = tp.arr_ligne_id
                    ORDER BY tp.walk_distance_m ASC
                    LIMIT 12
                """, (from_lon, from_lat, radius, to_lon, to_lat, radius))
            except:
                transfers = []

            seen = set()
            for t in transfers:
                pair_key = f"{t['dep_ligne_id']}_{t['arr_ligne_id']}"
                if pair_key in seen:
                    continue
                seen.add(pair_key)

                dep_stop = dep_stops[0]
                arr_stop = arr_stops[0]

                # Point où on descend (from) et point où on reprend (to)
                transfer_from = {
                    "nom": t.get('gare_nom') or t['transfer_from_nom'],
                    "lon": float(t['transfer_from_lon']),
                    "lat": float(t['transfer_from_lat']),
                    "type": t.get('gare_type') or 'arret',
                }
                transfer_to = {
                    "nom": t.get('transfer_to_nom') or t['transfer_from_nom'],
                    "lon": float(t['transfer_to_lon']),
                    "lat": float(t['transfer_to_lat']),
                    "type": t.get('gare_type') or 'arret',
                }

                walk_dist = float(t.get('walk_distance_m') or 0)
                walk_duree = float(t.get('walk_duree_min') or 2)

                steps = []

                # Marche vers arrêt de départ
                walk1 = float(dep_stop.get('distance_m', 0))
                if walk1 > 20:
                    steps.append(_build_step(
                        'marche', f"Marchez jusqu'à {dep_stop['nom']}",
                        distance_m=walk1, duration_min=walk1 / 80,
                        from_stop={"nom": "Votre position", "lon": from_lon, "lat": from_lat},
                        to_stop=dep_stop,
                    ))

                # Ligne 1 (départ → correspondance)
                dep_type = (t.get('dep_type') or '').lower()
                mode1 = 'bateau' if 'lagunaire' in dep_type else 'gbaka' if 'gbaka' in dep_type else 'woro_woro' if 'woro' in dep_type else 'bus_sotra' if 'sotra' in dep_type or 'bus' in dep_type or 'express' in dep_type else 'transport'
                dep_duree = t.get('dep_duree')
                steps.append(_build_step(
                    mode1, f"Prenez {t['dep_nom']}",
                    ligne={"id": t['dep_ligne_id'], "nom": t['dep_nom'], "type_ligne": t['dep_type'], "operateur": t['dep_operateur']},
                    from_stop=dep_stop,
                    to_stop=transfer_from,
                    duration_min=dep_duree if dep_duree else None,
                ))

                # Correspondance (marche entre les 2 arrêts ou sur place)
                transfer_label = transfer_from['nom']
                if t.get('gare_type'):
                    gare_labels = {'gare_routiere': 'Gare routière', 'gare_woro': 'Gare woro-woro',
                                   'gare_gbaka': 'Gare gbaka', 'gare_lagunaire': 'Gare lagunaire',
                                   'gare_sotra': 'Gare SOTRA'}
                    transfer_label = f"{gare_labels.get(t['gare_type'], 'Gare')} {transfer_from['nom']}"

                if walk_dist > 20:
                    # Correspondance piétonne entre 2 arrêts distincts
                    steps.append(_build_step(
                        'marche',
                        f"Marchez de {transfer_from['nom']} à {transfer_to['nom']}",
                        distance_m=walk_dist,
                        duration_min=walk_duree,
                        from_stop=transfer_from,
                        to_stop=transfer_to,
                    ))
                else:
                    # Même arrêt ou très proche
                    steps.append(_build_step(
                        'correspondance',
                        f"Correspondance à {transfer_label}",
                        from_stop=transfer_from, to_stop=transfer_to,
                        duration_min=walk_duree,
                    ))

                # Ligne 2 (correspondance → arrivée)
                arr_type = (t.get('arr_type') or '').lower()
                mode2 = 'bateau' if 'lagunaire' in arr_type else 'gbaka' if 'gbaka' in arr_type else 'woro_woro' if 'woro' in arr_type else 'bus_sotra' if 'sotra' in arr_type or 'bus' in arr_type or 'express' in arr_type else 'transport'
                arr_duree = t.get('arr_duree')
                steps.append(_build_step(
                    mode2, f"Prenez {t['arr_nom']}",
                    ligne={"id": t['arr_ligne_id'], "nom": t['arr_nom'], "type_ligne": t['arr_type'], "operateur": t['arr_operateur']},
                    from_stop=transfer_to,
                    to_stop=arr_stop,
                    duration_min=arr_duree if arr_duree else None,
                ))

                # Marche vers destination
                walk2 = float(arr_stop.get('distance_m', 0))
                if walk2 > 20:
                    steps.append(_build_step(
                        'marche', f"Marchez jusqu'à votre destination",
                        distance_m=walk2, duration_min=walk2 / 80,
                        from_stop=arr_stop,
                        to_stop={"nom": "Destination", "lon": to_lon, "lat": to_lat},
                    ))

                total_duree = sum(s.get('duree_min', 0) for s in steps)
                itineraires.append({
                    "type": "correspondance",
                    "nb_correspondances": 1,
                    "duree_totale_min": round(total_duree, 1),
                    "steps": steps,
                })

                if len(itineraires) >= 5:
                    break

        # --- 5. Chercher les trajets avec 2 CORRESPONDANCES si besoin ---
        #     Utilise arrets_lignes + connexions_pietonnes pour les 2 points de transfert
        if len(itineraires) < 2:
            try:
                double_transfers = query("""
                    WITH dep_lines AS (
                        SELECT DISTINCT al.ligne_id
                        FROM transport.arrets_lignes al
                        JOIN transport.arrets a ON a.id = al.arret_id
                        WHERE ST_DWithin(a.geom::geography,
                            ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, %s)
                    ),
                    arr_lines AS (
                        SELECT DISTINCT al.ligne_id
                        FROM transport.arrets_lignes al
                        JOIN transport.arrets a ON a.id = al.arret_id
                        WHERE ST_DWithin(a.geom::geography,
                            ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, %s)
                    ),
                    -- Correspondance 1 : même arrêt OU connexion piétonne
                    t1_same AS (
                        SELECT al1.ligne_id AS leg1_id, al2.ligne_id AS mid_id,
                            al1.arret_id AS t1_from_id, al1.arret_id AS t1_to_id,
                            0::numeric AS t1_walk_m, 2::numeric AS t1_walk_min
                        FROM dep_lines dl
                        JOIN transport.arrets_lignes al1 ON al1.ligne_id = dl.ligne_id
                        JOIN transport.arrets_lignes al2 ON al2.arret_id = al1.arret_id AND al2.ligne_id != al1.ligne_id
                    ),
                    t1_walk AS (
                        SELECT al1.ligne_id AS leg1_id, al2.ligne_id AS mid_id,
                            cp.from_id AS t1_from_id, cp.to_id AS t1_to_id,
                            cp.distance_m AS t1_walk_m, cp.duree_marche_min AS t1_walk_min
                        FROM dep_lines dl
                        JOIN transport.arrets_lignes al1 ON al1.ligne_id = dl.ligne_id
                        JOIN transport.connexions_pietonnes cp ON cp.from_id = al1.arret_id AND cp.from_type = 'arret'
                        JOIN transport.arrets_lignes al2 ON al2.arret_id = cp.to_id AND al2.ligne_id != al1.ligne_id
                        WHERE cp.distance_m <= 200
                    ),
                    t1_all AS (SELECT * FROM t1_same UNION ALL SELECT * FROM t1_walk),
                    -- Correspondance 2 : même arrêt OU connexion piétonne
                    t2_same AS (
                        SELECT t1.leg1_id, t1.mid_id, t1.t1_from_id, t1.t1_to_id,
                            t1.t1_walk_m, t1.t1_walk_min,
                            al3.arret_id AS t2_from_id, al3.arret_id AS t2_to_id,
                            0::numeric AS t2_walk_m, 2::numeric AS t2_walk_min,
                            al4.ligne_id AS leg3_id
                        FROM t1_all t1
                        JOIN transport.arrets_lignes al3 ON al3.ligne_id = t1.mid_id AND al3.arret_id != t1.t1_to_id
                        JOIN transport.arrets_lignes al4 ON al4.arret_id = al3.arret_id AND al4.ligne_id != t1.mid_id
                        JOIN arr_lines ar ON ar.ligne_id = al4.ligne_id
                        WHERE t1.leg1_id != t1.mid_id AND t1.mid_id != al4.ligne_id AND t1.leg1_id != al4.ligne_id
                    ),
                    t2_walk AS (
                        SELECT t1.leg1_id, t1.mid_id, t1.t1_from_id, t1.t1_to_id,
                            t1.t1_walk_m, t1.t1_walk_min,
                            cp2.from_id AS t2_from_id, cp2.to_id AS t2_to_id,
                            cp2.distance_m AS t2_walk_m, cp2.duree_marche_min AS t2_walk_min,
                            al4.ligne_id AS leg3_id
                        FROM t1_all t1
                        JOIN transport.arrets_lignes al3 ON al3.ligne_id = t1.mid_id AND al3.arret_id != t1.t1_to_id
                        JOIN transport.connexions_pietonnes cp2 ON cp2.from_id = al3.arret_id AND cp2.from_type = 'arret'
                        JOIN transport.arrets_lignes al4 ON al4.arret_id = cp2.to_id AND al4.ligne_id != t1.mid_id
                        JOIN arr_lines ar ON ar.ligne_id = al4.ligne_id
                        WHERE cp2.distance_m <= 200
                          AND t1.leg1_id != t1.mid_id AND t1.mid_id != al4.ligne_id AND t1.leg1_id != al4.ligne_id
                    ),
                    all_double AS (
                        SELECT * FROM t2_same UNION ALL SELECT * FROM t2_walk
                    )
                    SELECT DISTINCT ON (ad.leg1_id, ad.mid_id, ad.leg3_id)
                        ad.*,
                        l1.nom AS leg1_nom, l1.type_ligne AS leg1_type, l1.operateur AS leg1_op, l1.duree_min AS leg1_duree,
                        a_t1f.nom AS t1_from_nom, ST_X(a_t1f.geom) AS t1_from_lon, ST_Y(a_t1f.geom) AS t1_from_lat,
                        a_t1t.nom AS t1_to_nom, ST_X(a_t1t.geom) AS t1_to_lon, ST_Y(a_t1t.geom) AS t1_to_lat,
                        mid_l.nom AS leg2_nom, mid_l.type_ligne AS leg2_type, mid_l.operateur AS leg2_op, mid_l.duree_min AS leg2_duree,
                        a_t2f.nom AS t2_from_nom, ST_X(a_t2f.geom) AS t2_from_lon, ST_Y(a_t2f.geom) AS t2_from_lat,
                        a_t2t.nom AS t2_to_nom, ST_X(a_t2t.geom) AS t2_to_lon, ST_Y(a_t2t.geom) AS t2_to_lat,
                        l3.nom AS leg3_nom, l3.type_ligne AS leg3_type, l3.operateur AS leg3_op, l3.duree_min AS leg3_duree
                    FROM all_double ad
                    JOIN transport.lignes l1 ON l1.id = ad.leg1_id
                    JOIN transport.lignes mid_l ON mid_l.id = ad.mid_id
                    JOIN transport.lignes l3 ON l3.id = ad.leg3_id
                    JOIN transport.arrets a_t1f ON a_t1f.id = ad.t1_from_id
                    JOIN transport.arrets a_t1t ON a_t1t.id = ad.t1_to_id
                    JOIN transport.arrets a_t2f ON a_t2f.id = ad.t2_from_id
                    JOIN transport.arrets a_t2t ON a_t2t.id = ad.t2_to_id
                    ORDER BY ad.leg1_id, ad.mid_id, ad.leg3_id, (ad.t1_walk_m + ad.t2_walk_m) ASC
                    LIMIT 3
                """, (from_lon, from_lat, radius, to_lon, to_lat, radius))
            except:
                double_transfers = []

            for dt in double_transfers:
                dep_stop = dep_stops[0]
                arr_stop = arr_stops[0]

                steps = []
                walk1 = float(dep_stop.get('distance_m', 0))
                if walk1 > 20:
                    steps.append(_build_step('marche', f"Marchez jusqu'à {dep_stop['nom']}",
                        distance_m=walk1, duration_min=walk1/80,
                        from_stop={"nom": "Votre position", "lon": from_lon, "lat": from_lat}, to_stop=dep_stop))

                t1_from = {"nom": dt['t1_from_nom'], "lon": float(dt['t1_from_lon']), "lat": float(dt['t1_from_lat'])}
                t1_to = {"nom": dt['t1_to_nom'], "lon": float(dt['t1_to_lon']), "lat": float(dt['t1_to_lat'])}
                t2_from = {"nom": dt['t2_from_nom'], "lon": float(dt['t2_from_lon']), "lat": float(dt['t2_from_lat'])}
                t2_to = {"nom": dt['t2_to_nom'], "lon": float(dt['t2_to_lon']), "lat": float(dt['t2_to_lat'])}

                def _mode(tl):
                    tl = (tl or '').lower()
                    if 'lagunaire' in tl: return 'bateau'
                    if 'gbaka' in tl: return 'gbaka'
                    if 'woro' in tl: return 'woro_woro'
                    if 'sotra' in tl or 'bus' in tl or 'express' in tl: return 'bus_sotra'
                    return 'transport'

                # Leg 1
                steps.append(_build_step(_mode(dt['leg1_type']), f"Prenez {dt['leg1_nom']}",
                    ligne={"id": dt['leg1_id'], "nom": dt['leg1_nom'], "type_ligne": dt['leg1_type'], "operateur": dt['leg1_op']},
                    from_stop=dep_stop, to_stop=t1_from, duration_min=dt.get('leg1_duree')))

                # Correspondance 1
                t1_walk = float(dt.get('t1_walk_m') or 0)
                t1_duree = float(dt.get('t1_walk_min') or 2)
                if t1_walk > 20:
                    steps.append(_build_step('marche', f"Marchez de {t1_from['nom']} à {t1_to['nom']}",
                        distance_m=t1_walk, duration_min=t1_duree,
                        from_stop=t1_from, to_stop=t1_to))
                else:
                    steps.append(_build_step('correspondance', f"Correspondance à {t1_from['nom']}",
                        from_stop=t1_from, to_stop=t1_to, duration_min=t1_duree))

                # Leg 2
                steps.append(_build_step(_mode(dt['leg2_type']), f"Prenez {dt['leg2_nom']}",
                    ligne={"id": dt['mid_id'], "nom": dt['leg2_nom'], "type_ligne": dt['leg2_type'], "operateur": dt['leg2_op']},
                    from_stop=t1_to, to_stop=t2_from, duration_min=dt.get('leg2_duree')))

                # Correspondance 2
                t2_walk = float(dt.get('t2_walk_m') or 0)
                t2_duree = float(dt.get('t2_walk_min') or 2)
                if t2_walk > 20:
                    steps.append(_build_step('marche', f"Marchez de {t2_from['nom']} à {t2_to['nom']}",
                        distance_m=t2_walk, duration_min=t2_duree,
                        from_stop=t2_from, to_stop=t2_to))
                else:
                    steps.append(_build_step('correspondance', f"Correspondance à {t2_from['nom']}",
                        from_stop=t2_from, to_stop=t2_to, duration_min=t2_duree))

                # Leg 3
                steps.append(_build_step(_mode(dt['leg3_type']), f"Prenez {dt['leg3_nom']}",
                    ligne={"id": dt['leg3_id'], "nom": dt['leg3_nom'], "type_ligne": dt['leg3_type'], "operateur": dt['leg3_op']},
                    from_stop=t2_to, to_stop=arr_stop, duration_min=dt.get('leg3_duree')))

                walk2 = float(arr_stop.get('distance_m', 0))
                if walk2 > 20:
                    steps.append(_build_step('marche', f"Marchez jusqu'à votre destination",
                        distance_m=walk2, duration_min=walk2/80,
                        from_stop=arr_stop, to_stop={"nom": "Destination", "lon": to_lon, "lat": to_lat}))

                total_duree = sum(s.get('duree_min', 0) for s in steps)
                itineraires.append({
                    "type": "2_correspondances",
                    "nb_correspondances": 2,
                    "duree_totale_min": round(total_duree, 1),
                    "steps": steps,
                })

        # --- 6. Appliquer les alertes actives aux itinéraires ---
        filtered_itineraires = []
        for itin in itineraires:
            blocked = False
            penalties = []
            alert_warnings = []

            for step in itin.get('steps', []):
                ligne = step.get('ligne')
                if not ligne or not ligne.get('id'):
                    continue

                lid = ligne['id']
                if lid in alerted_lines:
                    alert_info = alerted_lines[lid]
                    if alert_info['blocked']:
                        # Ligne bloquée → exclure cet itinéraire entier
                        blocked = True
                        alert_warnings.append({
                            'ligne': ligne.get('nom'),
                            'type': alert_info['alert_type'],
                            'blocked': True,
                            'message': f"⚠️ {alert_info['alert_type']} — {ligne.get('nom')} indisponible",
                        })
                        break
                    else:
                        # Ligne pénalisée → ajouter du temps
                        penalty = alert_info['penalty_min']
                        step['duree_min'] = round(step.get('duree_min', 10) + penalty, 1)
                        step['alerte'] = {
                            'type': alert_info['alert_type'],
                            'penalty_min': penalty,
                            'description': alert_info['description'],
                        }
                        penalties.append(penalty)
                        alert_warnings.append({
                            'ligne': ligne.get('nom'),
                            'type': alert_info['alert_type'],
                            'blocked': False,
                            'message': f"⚠️ {alert_info['alert_type']} — +{penalty} min sur {ligne.get('nom')}",
                        })

            if blocked:
                # On garde l'itinéraire mais marqué comme bloqué (pour info)
                itin['blocked'] = True
                itin['alert_warnings'] = alert_warnings
                filtered_itineraires.append(itin)
            else:
                if penalties:
                    # Recalculer la durée totale avec pénalités
                    itin['duree_totale_min'] = round(
                        sum(s.get('duree_min', 0) for s in itin['steps']), 1
                    )
                    itin['alert_warnings'] = alert_warnings
                itin['blocked'] = False
                filtered_itineraires.append(itin)

        # Trier : non-bloqués d'abord, puis par correspondances + durée
        filtered_itineraires.sort(key=lambda x: (
            x.get('blocked', False),
            x['nb_correspondances'],
            x.get('duree_totale_min', 999)
        ))

        # Construire les warnings globaux
        global_alerts = []
        if active_alerts:
            for a in active_alerts:
                global_alerts.append({
                    'type': a['type'],
                    'description': a['description'],
                    'lat': a['lat'],
                    'lng': a['lng'],
                    'blocking': a['blocking'],
                })

        return {
            "departure": {"lon": from_lon, "lat": from_lat},
            "arrival": {"lon": to_lon, "lat": to_lat},
            "nearest_dep_stop": dep_stops[0] if dep_stops else None,
            "nearest_arr_stop": arr_stops[0] if arr_stops else None,
            "itineraires": filtered_itineraires[:5],
            "nb_resultats": len(filtered_itineraires[:5]),
            "active_alerts": global_alerts if global_alerts else None,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ------------------------------------------------------------
# STATISTIQUES GLOBALES
# ------------------------------------------------------------

@app.get("/api/stats")
def get_stats():
    """Retourne les statistiques globales du réseau de transport."""
    try:
        stats = {}

        # Nombre d'arrêts
        r = query_single("SELECT COUNT(*) FROM transport.arrets")
        stats["nb_arrets"] = r or 0

        # Nombre de gares
        r = query_single("SELECT COUNT(*) FROM transport.gares")
        stats["nb_gares"] = r or 0

        # Nombre de lignes
        r = query_single("SELECT COUNT(*) FROM transport.lignes")
        stats["nb_lignes"] = r or 0

        # Longueur totale du réseau routier (km)
        r = query_single("""
            SELECT ROUND(SUM(ST_Length(geom::geography) / 1000)::numeric, 2)
            FROM transport.routes
        """)
        stats["reseau_routier_km"] = float(r) if r else 0

        # Population totale
        r = query_single("SELECT SUM(population) FROM transport.communes")
        stats["population_totale"] = r or 0

        # Nombre de communes
        r = query_single("SELECT COUNT(*) FROM transport.communes")
        stats["nb_communes"] = r or 0

        # Nombre de lignes lagunaires
        r = query_single("SELECT COUNT(*) FROM transport.lagunaire")
        stats["nb_lagunaire"] = r or 0

        # Nombre de voies ferrées
        r = query_single("SELECT COUNT(*) FROM transport.voies_ferrees")
        stats["nb_voies_ferrees"] = r or 0

        # Opérateurs distincts
        rows = query("""
            SELECT DISTINCT operateur FROM (
                SELECT operateur FROM transport.lignes WHERE operateur IS NOT NULL
                UNION
                SELECT operateur FROM transport.lagunaire WHERE operateur IS NOT NULL
            ) t ORDER BY operateur
        """)
        stats["operateurs"] = [r["operateur"] for r in rows]

        # Arrêts par commune (top 5)
        rows = query("""
            SELECT c.nom, COUNT(a.id) AS nb_arrets
            FROM transport.communes c
            LEFT JOIN transport.arrets a
                ON ST_DWithin(c.geom::geography, a.geom::geography, 5000)
            GROUP BY c.nom
            ORDER BY nb_arrets DESC
            LIMIT 5
        """)
        stats["top_communes"] = rows

        return stats

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# ============================================================
# CONTRIBUTIONS COLLABORATIVES
# ============================================================

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "transportmap2026")

VALID_CONTRIBUTION_TYPES = [
    'nouvel_arret', 'correction_nom', 'position_incorrecte',
    'prix_trajet', 'horaire', 'alerte',
    'enrichir_gare', 'trajet_textuel'
]


# ── Pydantic Models ──

class ContributionCreate(BaseModel):
    type: str = Field(..., description="Type de contribution")
    pseudo: Optional[str] = Field(None, max_length=50)
    fingerprint: Optional[str] = Field(None, max_length=64)
    lat: Optional[float] = None
    lng: Optional[float] = None
    reference_id: Optional[int] = None
    reference_type: Optional[str] = None
    data: dict = Field(default_factory=dict)


class ContributionReview(BaseModel):
    status: str = Field(..., description="'approved' ou 'rejected'")
    admin_note: Optional[str] = None


# ── Anti-spam helpers ──

def _hash_ip(request: Request) -> str:
    """Hash SHA256 de l'IP client (ne stocke pas l'IP brute)."""
    client_ip = request.client.host if request.client else "unknown"
    return hashlib.sha256(client_ip.encode()).hexdigest()[:32]


def _check_spam(fingerprint: str, ip_hash: str):
    """Vérifie le rate limiting : max 5 contributions/heure, cooldown 60s."""
    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)

    # Vérifier par fingerprint
    if fingerprint:
        count_fp = query_single("""
            SELECT COUNT(*) FROM transport.contributions
            WHERE fingerprint = %s AND created_at > %s
        """, (fingerprint, one_hour_ago))
        if count_fp and count_fp >= 5:
            raise HTTPException(
                status_code=429,
                detail="Trop de contributions. Réessayez dans 1 heure."
            )

        # Cooldown 60s
        last = query_single("""
            SELECT EXTRACT(EPOCH FROM (NOW() - MAX(created_at)))
            FROM transport.contributions
            WHERE fingerprint = %s
        """, (fingerprint,))
        if last is not None and last < 60:
            raise HTTPException(
                status_code=429,
                detail=f"Attendez {int(60 - last)} secondes avant de soumettre."
            )

    # Vérifier aussi par IP hash
    count_ip = query_single("""
        SELECT COUNT(*) FROM transport.contributions
        WHERE ip_hash = %s AND created_at > %s
    """, (ip_hash, one_hour_ago))
    if count_ip and count_ip >= 10:
        raise HTTPException(
            status_code=429,
            detail="Trop de contributions depuis cette connexion."
        )


def _verify_admin(authorization: Optional[str]):
    """Vérifie le header Authorization pour les routes admin."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authentification requise")
    token = authorization.replace("Bearer ", "").strip()
    if token != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Mot de passe incorrect")


# ── Endpoint public : soumettre une contribution ──

@app.post("/api/contributions")
async def create_contribution(body: ContributionCreate, request: Request):
    """Soumettre une contribution citoyenne."""

    # Valider le type
    if body.type not in VALID_CONTRIBUTION_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Type invalide. Types acceptés: {', '.join(VALID_CONTRIBUTION_TYPES)}"
        )

    # Valider les données minimales
    if not body.data:
        raise HTTPException(status_code=400, detail="Données requises")

    # Valider le type de référence
    if body.reference_type and body.reference_type not in ('arret', 'ligne', 'gare'):
        raise HTTPException(status_code=400, detail="reference_type invalide")

    # Anti-spam
    ip_hash = _hash_ip(request)
    _check_spam(body.fingerprint or "", ip_hash)

    # Construire la géométrie si lat/lng fournis
    geom_sql = "NULL"
    params_list = []

    if body.lat is not None and body.lng is not None:
        geom_sql = "ST_SetSRID(ST_MakePoint(%s, %s), 4326)"
        params_list = [body.lng, body.lat]

    sql = f"""
        INSERT INTO transport.contributions
            (type, pseudo, fingerprint, ip_hash, geom,
             reference_id, reference_type, data, status)
        VALUES (
            %s, %s, %s, %s, {geom_sql},
            %s, %s, %s::jsonb, 'pending'
        )
        RETURNING id, type, status, created_at
    """

    params = [
        body.type,
        body.pseudo or "Anonyme",
        body.fingerprint,
        ip_hash,
        *params_list,
        body.reference_id,
        body.reference_type,
        json.dumps(body.data, ensure_ascii=False),
    ]

    try:
        result = execute(sql, params)
        return {
            "success": True,
            "message": "Merci ! Votre contribution sera vérifiée sous 24h.",
            "contribution": result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Endpoint public : alertes actives ──

@app.get("/api/contributions/alerts")
def get_active_alerts():
    """Retourne les alertes approuvées des dernières 24h."""
    try:
        rows = query("""
            SELECT
                id, pseudo, data, created_at,
                ST_Y(geom) AS lat, ST_X(geom) AS lng
            FROM transport.contributions
            WHERE type = 'alerte'
              AND status = 'approved'
              AND created_at > NOW() - INTERVAL '24 hours'
            ORDER BY created_at DESC
        """)
        return {"alerts": rows, "count": len(rows)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Endpoint public : compteur de contributions ──

@app.get("/api/contributions/count")
def get_contributions_count():
    """Compteur public de contributions approuvées."""
    try:
        count = query_single("""
            SELECT COUNT(*) FROM transport.contributions WHERE status = 'approved'
        """)
        return {"approved": count or 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Endpoints admin ──

@app.get("/api/admin/contributions")
def admin_list_contributions(
    status: str = Query("pending"),
    type: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    authorization: Optional[str] = Header(None),
):
    """Liste les contributions (admin protégé)."""
    _verify_admin(authorization)

    where_clauses = ["status = %s"]
    params = [status]

    if type:
        where_clauses.append("type = %s")
        params.append(type)

    where = " AND ".join(where_clauses)
    params.extend([limit, offset])

    try:
        rows = query(f"""
            SELECT
                id, type, pseudo, fingerprint, data, status,
                admin_note, created_at, reviewed_at,
                reference_id, reference_type,
                ST_Y(geom) AS lat, ST_X(geom) AS lng
            FROM transport.contributions
            WHERE {where}
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """, params)

        total = query_single(f"""
            SELECT COUNT(*) FROM transport.contributions WHERE {" AND ".join(where_clauses[:len(where_clauses)])}
        """, params[:len(where_clauses)])

        return {"contributions": rows, "total": total or 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/api/admin/contributions/{contribution_id}")
async def admin_review_contribution(
    contribution_id: int,
    body: ContributionReview,
    authorization: Optional[str] = Header(None),
):
    """Approuver ou rejeter une contribution (admin protégé)."""
    _verify_admin(authorization)

    if body.status not in ('approved', 'rejected'):
        raise HTTPException(status_code=400, detail="Status doit être 'approved' ou 'rejected'")

    try:
        result = execute("""
            UPDATE transport.contributions
            SET status = %s, admin_note = %s, reviewed_at = NOW()
            WHERE id = %s
            RETURNING id, type, status, pseudo, data, reference_id, reference_type
        """, (body.status, body.admin_note, contribution_id))

        if not result:
            raise HTTPException(status_code=404, detail="Contribution introuvable")

        # ── Actions à l'approbation ──
        applied_action = None
        if body.status == 'approved':
            ctype = result.get('type')
            data = result.get('data', {})
            if isinstance(data, str):
                data = json.loads(data)
            ref_id = result.get('reference_id')
            ref_type = result.get('reference_type')

            contrib_geo = query("""
                SELECT ST_Y(geom) AS lat, ST_X(geom) AS lng
                FROM transport.contributions WHERE id = %s AND geom IS NOT NULL
            """, (contribution_id,))
            geo = contrib_geo[0] if contrib_geo else None

            # 🚏 Nouvel arrêt → INSERT arrets + rattacher aux lignes proches
            if ctype == 'nouvel_arret' and geo and data.get('nom'):
                new_arret = execute("""
                    INSERT INTO transport.arrets (nom, operateur, geom)
                    VALUES (%s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326))
                    RETURNING id
                """, (data['nom'], data.get('transport_type'), geo['lng'], geo['lat']))

                if new_arret:
                    # Rattacher aux lignes dans un rayon de 80m
                    execute("""
                        INSERT INTO transport.arrets_lignes (arret_id, ligne_id, distance_m, position_frac, sequence)
                        SELECT
                            %s,
                            l.id,
                            ROUND(ST_Distance(l.geom::geography, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography)::numeric, 1),
                            ST_LineLocatePoint(ST_LineMerge(l.geom), ST_SetSRID(ST_MakePoint(%s, %s), 4326)),
                            0
                        FROM transport.lignes l
                        WHERE ST_DWithin(l.geom::geography, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, 80)
                        ON CONFLICT (arret_id, ligne_id) DO NOTHING
                    """, (new_arret['id'], geo['lng'], geo['lat'], geo['lng'], geo['lat'], geo['lng'], geo['lat']))
                    applied_action = f"Arrêt '{data['nom']}' créé (id={new_arret['id']}) + rattaché aux lignes proches"

            # ✏️ Correction nom → UPDATE arrets ou gares
            elif ctype == 'correction_nom' and ref_id and data.get('nouveau_nom'):
                table = 'transport.arrets' if ref_type == 'arret' else 'transport.gares'
                execute(f"""
                    UPDATE {table} SET nom = %s WHERE id = %s
                """, (data['nouveau_nom'], ref_id))
                applied_action = f"Nom corrigé dans {table} (id={ref_id}) → '{data['nouveau_nom']}'"

            # 📍 Position incorrecte → UPDATE geom + recalculer arrets_lignes
            elif ctype == 'position_incorrecte' and ref_id and geo:
                table = 'transport.arrets' if ref_type == 'arret' else 'transport.gares'
                execute(f"""
                    UPDATE {table}
                    SET geom = ST_SetSRID(ST_MakePoint(%s, %s), 4326)
                    WHERE id = %s
                """, (geo['lng'], geo['lat'], ref_id))

                # Si c'est un arrêt, recalculer ses liaisons aux lignes
                if ref_type == 'arret':
                    execute("""
                        DELETE FROM transport.arrets_lignes WHERE arret_id = %s
                    """, (ref_id,))
                    execute("""
                        INSERT INTO transport.arrets_lignes (arret_id, ligne_id, distance_m, position_frac, sequence)
                        SELECT
                            %s,
                            l.id,
                            ROUND(ST_Distance(l.geom::geography, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography)::numeric, 1),
                            ST_LineLocatePoint(ST_LineMerge(l.geom), ST_SetSRID(ST_MakePoint(%s, %s), 4326)),
                            0
                        FROM transport.lignes l
                        WHERE ST_DWithin(l.geom::geography, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, 80)
                        ON CONFLICT (arret_id, ligne_id) DO NOTHING
                    """, (ref_id, geo['lng'], geo['lat'], geo['lng'], geo['lat'], geo['lng'], geo['lat']))
                applied_action = f"Position corrigée dans {table} (id={ref_id}) + liaisons recalculées"

            # 💰 Prix trajet → UPDATE lignes.prix_min / prix_max
            elif ctype == 'prix_trajet' and data.get('prix') is not None:
                prix = int(data['prix'])
                if ref_id:
                    # Ligne connue → mettre à jour ses prix
                    execute("""
                        UPDATE transport.lignes
                        SET prix_min = LEAST(COALESCE(prix_min, %s), %s),
                            prix_max = GREATEST(COALESCE(prix_max, %s), %s)
                        WHERE id = %s
                    """, (prix, prix, prix, prix, ref_id))
                    applied_action = f"Prix mis à jour pour ligne id={ref_id} : {prix} FCFA"
                else:
                    applied_action = "Prix enregistré (pas de ligne de référence)"

            # ⏰ Horaire → UPDATE lignes.frequence
            elif ctype == 'horaire' and data.get('horaires'):
                if ref_id:
                    execute("""
                        UPDATE transport.lignes SET frequence = %s WHERE id = %s
                    """, (data['horaires'], ref_id))
                    applied_action = f"Fréquence mise à jour pour ligne id={ref_id}"
                else:
                    applied_action = "Horaire enregistré (pas de ligne de référence)"

            # 🏢 Enrichir gare → UPDATE gares
            elif ctype == 'enrichir_gare' and ref_id:
                # Mettre à jour nb_lignes si on peut compter les lignes mentionnées
                lignes_text = data.get('lignes', '')
                if lignes_text:
                    nb = len([l for l in lignes_text.split(',') if l.strip()])
                    execute("""
                        UPDATE transport.gares
                        SET nb_lignes = GREATEST(COALESCE(nb_lignes, 0), %s)
                        WHERE id = %s
                    """, (nb, ref_id))
                applied_action = f"Gare enrichie (id={ref_id})"

            # ⚠️ Alerte → déjà gérée via /api/contributions/alerts (rien à faire)
            elif ctype == 'alerte':
                applied_action = "Alerte activée (visible 24h dans la bannière)"

            # 🚐 Trajet textuel → créer une ligne + arrêts + arrets_lignes
            elif ctype == 'trajet_textuel':
                nom_ligne = data.get('ligne') or data.get('nom_ligne') or ''
                depart = data.get('depart') or data.get('from') or ''
                arrivee = data.get('arrivee') or data.get('to') or ''
                transport_type = data.get('transport_type') or data.get('mode') or 'gbaka'
                points_passage = data.get('points_passage') or []
                prix = data.get('prix')
                frequence = data.get('frequence')

                if nom_ligne or (depart and arrivee):
                    # Déterminer type_ligne et opérateur
                    type_map = {
                        'gbaka': ('gbaka', 'Gbaka'),
                        'woro-woro': ('woro_woro', 'Woro-woro'),
                        'bus_sotra': ('bus_express', 'SOTRA'),
                        'bateau-bus': ('lagunaire', 'STL'),
                    }
                    type_ligne, operateur = type_map.get(transport_type, ('gbaka', 'Gbaka'))

                    final_nom = nom_ligne or f"{operateur} {depart} — {arrivee}"

                    # 1) Créer la ligne (sans géométrie — on relie via les arrêts)
                    new_ligne = execute("""
                        INSERT INTO transport.lignes
                            (nom, type_ligne, operateur, depart, arrivee, frequence,
                             prix_min, prix_max)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                    """, (
                        final_nom, type_ligne, operateur,
                        depart, arrivee, frequence,
                        int(prix) if prix else None,
                        int(prix) if prix else None,
                    ))

                    if new_ligne:
                        ligne_id = new_ligne['id']
                        rattaches = []

                        # 2) Construire la liste ordonnée : départ + points_passage + arrivée
                        all_points = []
                        if depart:
                            all_points.append(depart)
                        all_points.extend([p for p in points_passage if p and p.strip()])
                        if arrivee:
                            all_points.append(arrivee)

                        # 3) Pour chaque point, chercher l'arrêt existant le plus proche par nom
                        for seq, point_name in enumerate(all_points):
                            point_clean = point_name.strip()
                            if not point_clean:
                                continue

                            # Recherche fuzzy : arrêt dont le nom contient le texte
                            match = query("""
                                SELECT id, nom, ST_X(geom) AS lon, ST_Y(geom) AS lat
                                FROM transport.arrets
                                WHERE LOWER(nom) LIKE %s
                                ORDER BY LENGTH(nom)
                                LIMIT 1
                            """, (f"%{point_clean.lower()}%",))

                            arret_id = None
                            if match:
                                arret_id = match[0]['id']
                            else:
                                # Aucun arrêt trouvé → en créer un nouveau (sans géométrie)
                                # On ne peut pas inventer des coordonnées
                                new_arret = execute("""
                                    INSERT INTO transport.arrets (nom, operateur)
                                    VALUES (%s, %s)
                                    RETURNING id
                                """, (point_clean, operateur))
                                if new_arret:
                                    arret_id = new_arret['id']

                            if arret_id:
                                # Rattacher à la ligne avec séquence
                                execute("""
                                    INSERT INTO transport.arrets_lignes
                                        (arret_id, ligne_id, distance_m, position_frac, sequence)
                                    VALUES (%s, %s, 0, %s, %s)
                                    ON CONFLICT (arret_id, ligne_id) DO UPDATE
                                        SET sequence = EXCLUDED.sequence
                                """, (arret_id, ligne_id,
                                      seq / max(len(all_points) - 1, 1),
                                      seq))
                                rattaches.append(point_clean)

                        applied_action = (
                            f"Ligne '{final_nom}' créée (id={ligne_id}), "
                            f"{len(rattaches)} arrêts rattachés : {' → '.join(rattaches)}"
                        )
                    else:
                        applied_action = "Erreur : impossible de créer la ligne"
                else:
                    applied_action = "Trajet textuel enregistré (données insuffisantes pour créer une ligne)"

        return {
            "success": True,
            "message": f"Contribution {body.status}",
            "contribution": result,
            "applied_action": applied_action,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/admin/stats")
def admin_stats(authorization: Optional[str] = Header(None)):
    """Statistiques des contributions (admin protégé)."""
    _verify_admin(authorization)
    try:
        rows = query("""
            SELECT status, COUNT(*) AS count
            FROM transport.contributions
            GROUP BY status
        """)
        stats = {r['status']: r['count'] for r in rows}

        type_rows = query("""
            SELECT type, COUNT(*) AS count
            FROM transport.contributions
            WHERE status = 'pending'
            GROUP BY type
            ORDER BY count DESC
        """)

        return {
            "pending": stats.get('pending', 0),
            "approved": stats.get('approved', 0),
            "rejected": stats.get('rejected', 0),
            "total": sum(stats.values()),
            "pending_by_type": type_rows,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# LANCEMENT
# ============================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)


