import os
import mysql.connector
from mysql.connector import pooling
import redis
from dotenv import load_dotenv

load_dotenv()

# MySQL connection pool
db_config = {
    'host': os.getenv('DB_HOST'),
    'port': int(os.getenv('DB_PORT')),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('DB_NAME'),
    'pool_name': 'coffee_pool',
    'pool_size': 10,
    'pool_reset_session': True
}

connection_pool = pooling.MySQLConnectionPool(**db_config)

def get_db_connection():
    return connection_pool.get_connection()

def execute_query(query, params=None, fetch=False, fetch_one=False):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(query, params or ())
        if fetch_one:
            result = cursor.fetchone()
        elif fetch:
            result = cursor.fetchall()
        else:
            conn.commit()
            result = cursor.lastrowid
        return result
    finally:
        cursor.close()
        conn.close()

# Redis client
redis_client = redis.from_url(os.getenv('REDIS_URL'))

def cache_get(key):
    value = redis_client.get(key)
    return value.decode('utf-8') if value else None

def cache_set(key, value, expiry=3600):
    redis_client.setex(key, expiry, value)

def cache_delete(key):
    redis_client.delete(key)
