import os
import sys
from dotenv import load_dotenv
import mysql.connector
import redis

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

def test_mysql():
    print("Testing MySQL connection...")
    try:
        conn = mysql.connector.connect(
            host=os.getenv('DB_HOST'),
            port=int(os.getenv('DB_PORT')),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD'),
            database=os.getenv('DB_NAME')
        )
        cursor = conn.cursor()
        cursor.execute("SELECT VERSION()")
        version = cursor.fetchone()
        print(f"✓ MySQL connected! Version: {version[0]}")
        
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        print(f"✓ Found {len(tables)} tables in database")
        
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"✗ MySQL connection failed: {e}")
        return False

def test_redis():
    print("\nTesting Redis connection...")
    try:
        r = redis.from_url(os.getenv('REDIS_URL'))
        r.ping()
        print("✓ Redis connected!")
        
        r.set('test_key', 'test_value')
        value = r.get('test_key')
        print(f"✓ Redis read/write working! Value: {value.decode('utf-8')}")
        r.delete('test_key')
        return True
    except Exception as e:
        print(f"✗ Redis connection failed: {e}")
        return False

def test_directories():
    print("\nTesting upload directories...")
    dirs = ['uploads/profiles', 'uploads/posts', 'uploads/messages', 
            'uploads/events', 'uploads/payments', 'uploads/qrcodes']
    all_exist = True
    for d in dirs:
        if os.path.exists(d):
            print(f"✓ {d} exists")
        else:
            print(f"✗ {d} missing")
            all_exist = False
    return all_exist

if __name__ == '__main__':
    print("=" * 50)
    print("Coffee Platform - System Test")
    print("=" * 50)
    print()
    
    mysql_ok = test_mysql()
    redis_ok = test_redis()
    dirs_ok = test_directories()
    
    print("\n" + "=" * 50)
    if mysql_ok and redis_ok and dirs_ok:
        print("✓ ALL TESTS PASSED!")
        print("You can now run: python app.py")
    else:
        print("✗ SOME TESTS FAILED")
        print("Please check your configuration")
    print("=" * 50)
