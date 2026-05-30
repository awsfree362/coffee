import os
import mysql.connector
from dotenv import load_dotenv

load_dotenv()

def init_database():
    print("Connecting to database...")
    conn = mysql.connector.connect(
        host=os.getenv('DB_HOST'),
        port=int(os.getenv('DB_PORT')),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD'),
        database=os.getenv('DB_NAME')
    )
    
    cursor = conn.cursor()
    
    print("Reading schema file...")
    with open('database_schema.sql', 'r', encoding='utf-8') as f:
        schema = f.read()
    
    print("Executing schema...")
    for statement in schema.split(';'):
        statement = statement.strip()
        if statement:
            try:
                cursor.execute(statement)
                conn.commit()
            except mysql.connector.Error as e:
                print(f"Warning: {e}")
    
    print("Database initialized successfully!")
    cursor.close()
    conn.close()

if __name__ == '__main__':
    init_database()
