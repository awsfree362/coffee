import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

try:
    conn = mysql.connector.connect(
        host=os.getenv('DB_HOST'),
        port=int(os.getenv('DB_PORT')),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD'),
        database=os.getenv('DB_NAME')
    )
    
    cursor = conn.cursor()
    
    with open('database_update_reels.sql', 'r') as f:
        sql_commands = f.read().split(';')
        
        for command in sql_commands:
            command = command.strip()
            if command:
                try:
                    cursor.execute(command)
                    print(f"Executed: {command[:50]}...")
                except Exception as e:
                    print(f"Error: {e}")
                    print(f"Command: {command[:100]}")
    
    conn.commit()
    print("\nDatabase migration completed successfully!")
    
except Exception as e:
    print(f"Database connection error: {e}")
finally:
    if 'conn' in locals():
        conn.close()
