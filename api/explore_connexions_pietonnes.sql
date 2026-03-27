-- ============================================================
-- EXPLORATION DE LA TABLE connexions_pietonnes
-- Exécute ce script dans pgAdmin ou psql
-- ============================================================

-- 1. Structure de la table
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'transport'
  AND table_name = 'connexions_pietonnes'
ORDER BY ordinal_position;

-- 2. Nombre total de lignes
SELECT COUNT(*) AS total_rows FROM transport.connexions_pietonnes;

-- 3. Échantillon de 20 lignes
SELECT * FROM transport.connexions_pietonnes LIMIT 20;

-- 4. Stats sur les colonnes numériques (distances, durées si elles existent)
SELECT
    MIN(distance_m) AS dist_min,
    MAX(distance_m) AS dist_max,
    AVG(distance_m)::int AS dist_avg,
    MIN(duree_min) AS duree_min,
    MAX(duree_min) AS duree_max,
    AVG(duree_min)::numeric(5,1) AS duree_avg
FROM transport.connexions_pietonnes;

-- 5. Valeurs distinctes des colonnes texte (types, modes, etc.)
-- Adapter les noms de colonnes selon le résultat de la requête 1
SELECT DISTINCT type FROM transport.connexions_pietonnes;
SELECT DISTINCT mode FROM transport.connexions_pietonnes;

-- 6. Vérifier les jointures possibles avec arrets et gares
SELECT
    cp.*,
    a1.nom AS arret_from_nom,
    a2.nom AS arret_to_nom
FROM transport.connexions_pietonnes cp
LEFT JOIN transport.arrets a1 ON cp.arret_from_id = a1.gid
LEFT JOIN transport.arrets a2 ON cp.arret_to_id = a2.gid
LIMIT 20;

-- 7. Si les colonnes sont différentes, essayer avec gares
SELECT
    cp.*,
    g1.nom AS gare_from_nom,
    g2.nom AS gare_to_nom
FROM transport.connexions_pietonnes cp
LEFT JOIN transport.gares g1 ON cp.from_id = g1.gid
LEFT JOIN transport.gares g2 ON cp.to_id = g2.gid
LIMIT 20;

-- 8. Index existants
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'connexions_pietonnes';

-- 9. Géométrie si elle existe
SELECT
    ST_GeometryType(geom) AS geom_type,
    ST_SRID(geom) AS srid,
    COUNT(*) AS count
FROM transport.connexions_pietonnes
WHERE geom IS NOT NULL
GROUP BY ST_GeometryType(geom), ST_SRID(geom);
