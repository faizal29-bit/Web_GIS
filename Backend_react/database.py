import mysql.connector
from typing import List, Dict, Any
import os

class Database:
    def __init__(self):
        self.connection = None
        
    def connect(self):
        try:
            self.connection = mysql.connector.connect(
                host=os.getenv('DB_HOST', 'localhost'),
                user=os.getenv('DB_USER', 'root'),
                password=os.getenv('DB_PASSWORD', ''),
                database=os.getenv('DB_NAME', 'data_sekolah_baru'),
                port=int(os.getenv('DB_PORT', 3306)),
                charset='utf8mb4',
                buffered=True,
                autocommit=True
            )
            print("✅ Database connected successfully")
            return True
        except mysql.connector.Error as e:
            print(f"❌ Error connecting to database: {e}")
            self.connection = None
            return False

    def disconnect(self):
        if self.connection and self.connection.is_connected():
            self.connection.close()
            print("✅ Database disconnected")

    def get_all_sekolah(self) -> List[Dict[str, Any]]:
        """Untuk chart.jsx - TIDAK DIUBAH"""
        if not self.connection or not self.connection.is_connected():
            self.connect()
            
        try:
            cursor = self.connection.cursor(dictionary=True)
            query = "SELECT * FROM sekolah"
            cursor.execute(query)
            results = cursor.fetchall()
            cursor.close()
            return results
        except mysql.connector.Error as e:
            print(f"Database error in get_all_sekolah: {e}")
            return []

    def execute_query(self, query: str, params: tuple = None) -> List[Dict[str, Any]]:
        """Untuk AI Prediction - DIPERBAIKI"""
        if not self.connection or not self.connection.is_connected():
            if not self.connect():
                return []
            
        try:
            cursor = self.connection.cursor(dictionary=True)
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            results = cursor.fetchall()
            cursor.close()
            return results
        except mysql.connector.Error as e:
            print(f"Database error in execute_query: {e}")
            return []

    def check_validasi_table(self):
        """Cek apakah tabel validasi ada"""
        try:
            cursor = self.connection.cursor()
            cursor.execute("SHOW TABLES LIKE 'validasi'")
            result = cursor.fetchone()
            cursor.close()
            return result is not None
        except Exception as e:
            print(f"Error checking validasi table: {e}")
            return False

# Global database instance
db = Database()