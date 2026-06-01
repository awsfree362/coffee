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
        with open('database_optimizations_messages.sql', 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # Split by delimiter changes and statements
        statements = []
        current_statement = []
        delimiter = ';'
        
        for line in sql_content.split('\n'):
            line = line.strip()
            
            if line.startswith('DELIMITER'):
                if current_statement:
                    statements.append('\n'.join(current_statement))
                    current_statement = []
                delimiter = line.split()[1]
                continue
            
            if line:
                current_statement.append(line)
                if line.endswith(delimiter) and delimiter != '//':
                    statements.append('\n'.join(current_statement))
                    current_statement = []
                elif delimiter == '//' and line.endswith('//'):
                    statements.append('\n'.join(current_statement))
                    current_statement = []
                    delimiter = ';'
        
        if current_statement:
            statements.append('\n'.join(current_statement))
        
        # Execute each statement
        for statement in statements:
            statement = statement.strip().rstrip(';').rstrip('//')
            if statement and not statement.startswith('--'):
                try:
                    cursor.execute(statement)
                    print(f"OK: {statement[:80]}...")
                except Exception as e:
                    error_msg = str(e)
                    if 'Duplicate' not in error_msg and 'already exists' not in error_msg:
                        print(f"ERROR: {error_msg[:100]}")
        
        connection.commit()
        print("\nDatabase optimizations completed successfully!")

except Exception as e:
    print(f"Error: {e}")
finally:
    connection.close()
