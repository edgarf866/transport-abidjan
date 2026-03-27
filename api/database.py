"""
Connexion à Neon PostGIS avec pool de connexions.
"""

import os
import psycopg2
from psycopg2 import pool
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL non définie. "
        "Copie api/.env.example en api/.env et configure ta connection string Neon."
    )

# Pool de connexions (min 1, max 5 pour le free tier Neon)
connection_pool = pool.ThreadedConnectionPool(
    minconn=1,
    maxconn=5,
    dsn=DATABASE_URL,
)


def get_conn():
    """Récupère une connexion du pool."""
    return connection_pool.getconn()


def release_conn(conn):
    """Remet une connexion dans le pool."""
    connection_pool.putconn(conn)


def query(sql, params=None):
    """
    Exécute une requête SQL et retourne les résultats.
    Gère automatiquement la connexion et la libération.
    """
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            if cur.description:
                columns = [desc[0] for desc in cur.description]
                rows = cur.fetchall()
                return [dict(zip(columns, row)) for row in rows]
            return []
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        release_conn(conn)


def execute(sql, params=None):
    """Exécute une requête d'écriture (INSERT, UPDATE, DELETE) et retourne le résultat."""
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            conn.commit()
            if cur.description:
                columns = [desc[0] for desc in cur.description]
                row = cur.fetchone()
                return dict(zip(columns, row)) if row else None
            return None
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        release_conn(conn)


def query_single(sql, params=None):
    """Exécute une requête et retourne un seul résultat (ex: json_build_object)."""
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            result = cur.fetchone()
            return result[0] if result else None
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        release_conn(conn)
