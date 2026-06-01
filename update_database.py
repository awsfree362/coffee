import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

# Database connection
connection = pymysql.connect(
    host=os.getenv('DB_HOST'),
    port=int(os.getenv('DB_PORT')),
    user=os.getenv('DB_USER'),
    password=os.getenv('DB_PASSWORD'),
    database=os.getenv('DB_NAME'),
    charset='utf8mb4'
)

try:
    with connection.cursor() as cursor:
        # Read SQL file
        with open('database_updates_messages.sql', 'r') as f:
            sql_commands = f.read().split(';')
        
        # Execute each command
        for command in sql_commands:
            command = command.strip()
            if command:
                try:
                    cursor.execute(command)
                    print(f"OK: {command[:50]}...")
                except Exception as e:
                    print(f"ERROR: {str(e)[:100]}")
        
        connection.commit()
        print("\nDatabase updates completed successfully!")

except Exception as e:
    print(f"Error: {e}")
finally:
    connection.close()
