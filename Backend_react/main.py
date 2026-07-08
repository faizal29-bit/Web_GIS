from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any
import mysql.connector
import numpy as np
import skfuzzy as fuzz
from skfuzzy import control as ctrl
import os

# Database Class
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
        """Untuk AI Prediction"""
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

    def check_sekolah_table(self):
        """Cek apakah tabel sekolah ada dan memiliki kolom validasi"""
        try:
            cursor = self.connection.cursor()
            cursor.execute("SHOW TABLES LIKE 'sekolah'")
            table_exists = cursor.fetchone() is not None
            
            if table_exists:
                # Cek apakah tabel memiliki kolom validasi (kelengkapan, validitas, mutakhir, total)
                cursor.execute("""
                    SHOW COLUMNS FROM sekolah 
                    WHERE Field IN ('kelengkapan', 'validitas', 'mutakhir', 'total')
                """)
                columns = cursor.fetchall()
                has_validation_columns = len(columns) == 4
            
            cursor.close()
            return table_exists and has_validation_columns
        except Exception as e:
            print(f"Error checking sekolah table: {e}")
            return False

# Global database instance
db = Database()

# Fuzzy Mamdani Predictor Class - MODIFIED: hanya menggunakan 3 input
class FuzzyMamdaniPredictor:
    def __init__(self):
        self.setup_fuzzy_system()
    
    def setup_fuzzy_system(self):
        # Input variables - HANYA 3 VARIABEL: kelengkapan, validitas, mutakhir
        self.kelengkapan = ctrl.Antecedent(np.arange(0, 101, 1), 'kelengkapan')
        self.validitas = ctrl.Antecedent(np.arange(0, 101, 1), 'validitas')
        self.mutakhir = ctrl.Antecedent(np.arange(0, 101, 1), 'mutakhir')
        
        # Output variable
        self.prediksi = ctrl.Consequent(np.arange(0, 101, 1), 'prediksi')
        
        # Membership functions - Input (3 variabel)
        # kelengkapan
        self.kelengkapan['rendah'] = fuzz.trimf(self.kelengkapan.universe, [0, 0, 40])
        self.kelengkapan['sedang'] = fuzz.trimf(self.kelengkapan.universe, [30, 50, 70])
        self.kelengkapan['tinggi'] = fuzz.trimf(self.kelengkapan.universe, [60, 100, 100])
        
        # Validitas
        self.validitas['rendah'] = fuzz.trimf(self.validitas.universe, [0, 0, 40])
        self.validitas['sedang'] = fuzz.trimf(self.validitas.universe, [30, 50, 70])
        self.validitas['tinggi'] = fuzz.trimf(self.validitas.universe, [60, 100, 100])
        
        # Mutakhir
        self.mutakhir['rendah'] = fuzz.trimf(self.mutakhir.universe, [0, 0, 40])
        self.mutakhir['sedang'] = fuzz.trimf(self.mutakhir.universe, [30, 50, 70])
        self.mutakhir['tinggi'] = fuzz.trimf(self.mutakhir.universe, [60, 100, 100])
        
        # Membership functions - Output
        self.prediksi['sangat_rendah'] = fuzz.trimf(self.prediksi.universe, [0, 0, 30])
        self.prediksi['rendah'] = fuzz.trimf(self.prediksi.universe, [20, 40, 60])
        self.prediksi['sedang'] = fuzz.trimf(self.prediksi.universe, [50, 60, 70])
        self.prediksi['tinggi'] = fuzz.trimf(self.prediksi.universe, [60, 75, 85])
        self.prediksi['sangat_tinggi'] = fuzz.trimf(self.prediksi.universe, [75, 100, 100])
        

        rules = [

        ctrl.Rule(self.kelengkapan['rendah'] & self.validitas['rendah'] & self.mutakhir['rendah'], self.prediksi['sangat_rendah']),

        ctrl.Rule(self.kelengkapan['rendah'] & self.validitas['rendah'] & self.mutakhir['sedang'], self.prediksi['rendah']),
        ctrl.Rule(self.kelengkapan['rendah'] & self.validitas['sedang'] & self.mutakhir['rendah'], self.prediksi['rendah']),
        ctrl.Rule(self.kelengkapan['sedang'] & self.validitas['rendah'] & self.mutakhir['rendah'], self.prediksi['rendah']),

        ctrl.Rule(self.kelengkapan['rendah'] & self.validitas['rendah'] & self.mutakhir['tinggi'], self.prediksi['rendah']),
        ctrl.Rule(self.kelengkapan['rendah'] & self.validitas['tinggi'] & self.mutakhir['rendah'], self.prediksi['rendah']),
        ctrl.Rule(self.kelengkapan['tinggi'] & self.validitas['rendah'] & self.mutakhir['rendah'], self.prediksi['rendah']),


        ctrl.Rule(self.kelengkapan['rendah'] & self.validitas['sedang'] & self.mutakhir['sedang'], self.prediksi['sedang']),
        ctrl.Rule(self.kelengkapan['sedang'] & self.validitas['rendah'] & self.mutakhir['sedang'], self.prediksi['sedang']),
        ctrl.Rule(self.kelengkapan['sedang'] & self.validitas['sedang'] & self.mutakhir['rendah'], self.prediksi['sedang']),

        ctrl.Rule(self.kelengkapan['rendah'] & self.validitas['sedang'] & self.mutakhir['tinggi'], self.prediksi['sedang']),
        ctrl.Rule(self.kelengkapan['rendah'] & self.validitas['tinggi'] & self.mutakhir['sedang'], self.prediksi['sedang']),
        ctrl.Rule(self.kelengkapan['sedang'] & self.validitas['rendah'] & self.mutakhir['tinggi'], self.prediksi['sedang']),
        ctrl.Rule(self.kelengkapan['tinggi'] & self.validitas['rendah'] & self.mutakhir['sedang'], self.prediksi['sedang']),
        ctrl.Rule(self.kelengkapan['sedang'] & self.validitas['tinggi'] & self.mutakhir['rendah'], self.prediksi['sedang']),
        ctrl.Rule(self.kelengkapan['tinggi'] & self.validitas['sedang'] & self.mutakhir['rendah'], self.prediksi['sedang']),

        ctrl.Rule(self.kelengkapan['sedang'] & self.validitas['sedang'] & self.mutakhir['sedang'], self.prediksi['sedang']),

        ctrl.Rule(self.kelengkapan['tinggi'] & self.validitas['sedang'] & self.mutakhir['sedang'], self.prediksi['tinggi']),
        ctrl.Rule(self.kelengkapan['sedang'] & self.validitas['tinggi'] & self.mutakhir['sedang'], self.prediksi['tinggi']),
        ctrl.Rule(self.kelengkapan['sedang'] & self.validitas['sedang'] & self.mutakhir['tinggi'], self.prediksi['tinggi']),

        ctrl.Rule(self.kelengkapan['tinggi'] & self.validitas['tinggi'] & self.mutakhir['sedang'], self.prediksi['tinggi']),
        ctrl.Rule(self.kelengkapan['tinggi'] & self.validitas['sedang'] & self.mutakhir['tinggi'], self.prediksi['tinggi']),
        ctrl.Rule(self.kelengkapan['sedang'] & self.validitas['tinggi'] & self.mutakhir['tinggi'], self.prediksi['tinggi']),

        ctrl.Rule(self.kelengkapan['tinggi'] & self.validitas['tinggi'] & self.mutakhir['rendah'], self.prediksi['tinggi']),
        ctrl.Rule(self.kelengkapan['tinggi'] & self.validitas['rendah'] & self.mutakhir['tinggi'], self.prediksi['tinggi']),
        ctrl.Rule(self.kelengkapan['rendah'] & self.validitas['tinggi'] & self.mutakhir['tinggi'], self.prediksi['tinggi']),

        ctrl.Rule(self.kelengkapan['tinggi'] & self.validitas['tinggi'] & self.mutakhir['tinggi'], self.prediksi['sangat_tinggi']),

        ]
        
        self.prediction_ctrl = ctrl.ControlSystem(rules)
        self.prediction_system = ctrl.ControlSystemSimulation(self.prediction_ctrl)
    
    def predict(self, kelengkapan: float, validitas: float, mutakhir: float) -> Dict[str, Any]:
        """
        MODIFIED: Hanya menggunakan 3 parameter input
        total tidak digunakan dalam perhitungan fuzzy
        """
        try:
            # Input validation untuk 3 parameter
            if not all(isinstance(x, (int, float)) for x in [kelengkapan, validitas, mutakhir]):
                raise ValueError("Semua input harus berupa angka")
            
            if not all(0 <= x <= 100 for x in [kelengkapan, validitas, mutakhir]):
                raise ValueError("Semua input harus antara 0 dan 100")
            
            # Set input values - HANYA 3 nilai
            self.prediction_system.input['kelengkapan'] = float(kelengkapan)
            self.prediction_system.input['validitas'] = float(validitas)
            self.prediction_system.input['mutakhir'] = float(mutakhir)
            
            # Compute prediction
            self.prediction_system.compute()
            
            # Get result
            result = self.prediction_system.output['prediksi']
            
            # Categorize result
            if result >= 80:
                kategori = "Sangat Baik"
                color = "#10b981"
                score = "A"
            elif result >= 70:
                kategori = "Baik"
                color = "#3b82f6"
                score = "B"
            elif result >= 60:
                kategori = "Cukup"
                color = "#f59e0b"
                score = "C"
            elif result >= 50:
                kategori = "Kurang"
                color = "#ef4444"
                score = "D"
            else:
                kategori = "Sangat Kurang"
                color = "#dc2626"
                score = "E"
            
            return {
                'success': True,
                'nilai': round(float(result), 2),
                'kategori': kategori,
                'color': color,
                'score': score,
                'note': 'AI menggunakan 3 parameter: kelengkapan, validitas, mutakhir'
            }
            
        except Exception as e:
            return {
                'success': False,
                'nilai': 0,
                'kategori': 'Error',
                'error': str(e)
            }

# FastAPI App
app = FastAPI(
    title="Sekolah Jateng API - Complete with AI",
    description="API lengkap untuk data sekolah, peta, charts, dan prediksi AI Fuzzy Mamdani (3 parameter)",
    version="4.1.0"  # Version updated
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup & Shutdown
@app.on_event("startup")
async def startup_event():
    print("=" * 60)
    print("🚀 Starting Sekolah Jateng Complete API Server")
    print("🤖 Fuzzy Mamdani AI System (3 Parameter) initialized")
    print("=" * 60)
    if db.connect():
        print("✅ Database connected successfully")
        # Check if sekolah table exists with validation columns
        if db.check_sekolah_table():
            print("✅ Sekolah table found with validation columns")
        else:
            print("⚠️ Sekolah table not found or missing validation columns")
            print("   Kolom yang diperlukan: kelengkapan, validitas, mutakhir, total")
    else:
        print("❌ Failed to connect to database")
    print("🌐 Server ready at http://localhost:5000")
    print("📚 API Documentation: http://localhost:5000/docs")
    print("=" * 60)

@app.on_event("shutdown")
async def shutdown_event():
    print("🛑 Shutting down server...")
    db.disconnect()

# ===== ENDPOINT UNTUK CHART.JSX =====
@app.get("/")
async def root():
    return {
        "message": "Sekolah Jateng Complete API", 
        "version": "4.1.0",
        "ai_engine": "Fuzzy Mamdani (3 Parameter)",
        "ai_parameters": ["kelengkapan", "validitas", "mutakhir"],
        "note": "Kolom 'total' tetap ditampilkan tetapi tidak digunakan dalam perhitungan AI",
        "endpoints": {
            "health": "/api/health",
            "sekolah": "/api/sekolah",
            "filters": "/api/filters",
            "kecamatan": "/api/kecamatan/{kabupaten}",
            "stats": "/api/stats",
            "predict_batch": "/api/predict-batch",
            "search_sekolah": "/api/search-sekolah",
            "stats_filtered": "/api/stats-filtered"
        }
    }

@app.get("/api/health")
async def health_check():
    try:
        if db.connection and db.connection.is_connected():
            has_table = db.check_sekolah_table()
            return {
                "status": "healthy", 
                "database": "connected",
                "sekolah_table": "complete" if has_table else "incomplete",
                "ai_engine": "Fuzzy Mamdani (3 Parameter) ready",
                "service": "Complete API v4.1.0"
            }
        else:
            return {"status": "unhealthy", "database": "disconnected"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/sekolah")
async def get_all_sekolah():
    """Endpoint untuk chart.jsx - TIDAK DIUBAH"""
    try:
        print("📚 Fetching all sekolah data...")
        results = db.get_all_sekolah()
        
        if results is None:
            raise HTTPException(status_code=500, detail="Database error")
        
        sekolah_list = []
        for row in results:
            sekolah_data = {
                "nama": row.get("nama") or "",
                "jenjang": row.get("jenjang") or "",
                "desa_kelurahan": row.get("desa_kelurahan") or "",
                "kecamatan": row.get("kecamatan") or "",
                "kabupaten": row.get("kabupaten") or "",
                "provinsi": row.get("provinsi") or "",
                "lintang": str(row.get("lintang") or ""),
                "bujur": str(row.get("bujur") or ""),
                "status_sekolah": row.get("status_sekolah") or "",
                "npsn": row.get("npsn") or "",
                "siswa_pria": row.get("siswa_pria") or 0,
                "siswa_perempuan": row.get("siswa_perempuan") or 0,
                "total_siswa": row.get("total_siswa") or 0,
                "guru_pria": row.get("guru_pria") or 0,
                "guru_perempuan": row.get("guru_perempuan") or 0,
                "total_guru": row.get("total_guru") or 0
            }
            sekolah_list.append(sekolah_data)
        
        print(f"✅ Returning {len(sekolah_list)} sekolah records")
        return sekolah_list
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== ENDPOINT UNTUK AI PREDICTION =====
# Semua endpoint filter tetap sama, tidak perlu diubah
@app.get("/api/filters")
async def get_filters():
    """Get available filter options untuk AI Prediction"""
    try:
        print("🔍 Fetching filter options...")
        
        # Check if sekolah table exists
        if not db.check_sekolah_table(): 
            return {
                "success": True,
                "filters": {
                    "kabupaten": [],
                    "jenjang": [],
                    "status_sekolah": []
                },
                "warning": "Tabel sekolah tidak ditemukan atau tidak lengkap"
            }
        
        # Kabupaten
        kabupaten_query = """
        SELECT DISTINCT kabupaten 
        FROM sekolah
        WHERE kabupaten IS NOT NULL 
        AND kabupaten != '' 
        AND kelengkapan IS NOT NULL
        ORDER BY kabupaten
        """
        kabupaten_list = db.execute_query(kabupaten_query)
        
        # Jenjang - Handle PAUD/TK
        jenjang_query = """
        SELECT DISTINCT jenjang 
        FROM sekolah
        WHERE jenjang IS NOT NULL 
        AND jenjang != '' 
        AND kelengkapan IS NOT NULL
        ORDER BY jenjang
        """
        jenjang_list = db.execute_query(jenjang_query)
        
        # Process jenjang untuk menggabungkan PAUD dan TK
        jenjang_processed = set()
        for jenjang in jenjang_list:
            jenjang_value = jenjang['jenjang'].upper().strip()
            if jenjang_value in ['PAUD', 'TK']:
                jenjang_processed.add('PAUD')
            else:
                jenjang_processed.add(jenjang_value)
        
        jenjang_list_final = sorted(list(jenjang_processed))
        
        # Status Sekolah
        status_query = """
        SELECT DISTINCT status_sekolah 
        FROM sekolah
        WHERE status_sekolah IS NOT NULL 
        AND status_sekolah != '' 
        AND kelengkapan IS NOT NULL
        ORDER BY status_sekolah
        """
        status_list = db.execute_query(status_query)
        
        print(f"✅ Filters: {len(kabupaten_list)} kabupaten, {len(jenjang_list_final)} jenjang, {len(status_list)} status")
        
        return {
            "success": True,
            "filters": {
                "kabupaten": [k['kabupaten'] for k in kabupaten_list],
                "jenjang": jenjang_list_final,
                "status_sekolah": [s['status_sekolah'] for s in status_list]
            }
        }
        
    except Exception as e:
        print(f"❌ Error fetching filters: {str(e)}")
        return {
            "success": False,
            "filters": {
                "kabupaten": [],
                "jenjang": [],
                "status_sekolah": []
            },
            "error": str(e)
        }

@app.get("/api/kecamatan/{kabupaten}")
async def get_kecamatan(kabupaten: str):
    """Get kecamatan by kabupaten"""
    try:
        print(f"🏘️ Fetching kecamatan for {kabupaten}...")
        
        if not db.check_sekolah_table():
            return {
                "success": True,
                "kecamatan": []
            }
        
        query = """
        SELECT DISTINCT kecamatan 
        FROM sekolah
        WHERE kabupaten = %s 
        AND kecamatan IS NOT NULL 
        AND kecamatan != '' 
        AND kelengkapan IS NOT NULL
        ORDER BY kecamatan
        """
        kecamatan_list = db.execute_query(query, (kabupaten,))
        
        print(f"✅ Found {len(kecamatan_list)} kecamatan")
        
        return {
            "success": True,
            "kecamatan": [k['kecamatan'] for k in kecamatan_list]
        }
        
    except Exception as e:
        print(f"❌ Error fetching kecamatan: {str(e)}")
        return {
            "success": False,
            "kecamatan": [],
            "error": str(e)
        }

@app.get("/api/stats")
async def get_stats():
    """Get statistics untuk dashboard"""
    try:
        print("📊 Fetching overall statistics...")
        
        if not db.check_sekolah_table():
            return {
                "success": True,
                "stats": {
                    "total_sekolah": 0,
                    "rata_rata": {
                        "kelengkapan": 0,
                        "validitas": 0,
                        "mutakhir": 0,
                        "total": 0
                    }
                }
            }
        
        query = """
        SELECT 
            COUNT(*) as total,
            AVG(kelengkapan) as avg_kelengkapan,
            AVG(validitas) as avg_validitas,
            AVG(mutakhir) as avg_mutakhir,
            AVG(total) as avg_total
        FROM sekolah
        WHERE kelengkapan IS NOT NULL
        """
        
        stats = db.execute_query(query)
        
        if stats:
            stat_data = stats[0]
            return {
                "success": True,
                "stats": {
                    "total_sekolah": stat_data['total'],
                    "rata_rata": {
                        "kelengkapan": round(float(stat_data['avg_kelengkapan'] or 0), 1),
                        "validitas": round(float(stat_data['avg_validitas'] or 0), 1),
                        "mutakhir": round(float(stat_data['avg_mutakhir'] or 0), 1),
                        "total": round(float(stat_data['avg_total'] or 0), 1)
                    }
                }
            }
        else:
            return {
                "success": True,
                "stats": {
                    "total_sekolah": 0,
                    "rata_rata": {"kelengkapan": 0, "validitas": 0, "mutakhir": 0, "total": 0}
                }
            }
            
    except Exception as e:
        print(f"❌ Error fetching stats: {str(e)}")
        return {
            "success": False,
            "stats": {
                "total_sekolah": 0,
                "rata_rata": {"kelengkapan": 0, "validitas": 0, "mutakhir": 0, "total": 0}
            },
            "error": str(e)
        }

@app.post("/api/stats-filtered")
async def get_stats_filtered(filters: dict):
    """Get statistics berdasarkan filter"""
    try:
        print("📊 Fetching filtered statistics...")
        
        if not db.check_sekolah_table():
            return {
                "success": True,
                "stats": {
                    "total_sekolah": 0,
                    "rata_rata": {
                        "kelengkapan": 0,
                        "validitas": 0,
                        "mutakhir": 0,
                        "total": 0
                    }
                }
            }
        
        # Build query
        query = """
        SELECT 
            COUNT(*) as total,
            AVG(kelengkapan) as avg_kelengkapan,
            AVG(validitas) as avg_validitas,
            AVG(mutakhir) as avg_mutakhir,
            AVG(total) as avg_total
        FROM sekolah
        WHERE 1=1
        AND kelengkapan IS NOT NULL
        """
        
        params = []
        
        if filters.get('kabupaten'):
            query += " AND kabupaten = %s"
            params.append(filters['kabupaten'])
        
        if filters.get('kecamatan'):
            query += " AND kecamatan = %s"
            params.append(filters['kecamatan'])
        
        if filters.get('jenjang'):
            # Handle PAUD/TK filter
            if filters['jenjang'] == 'PAUD':
                query += " AND (jenjang = %s OR jenjang = %s)"
                params.append('PAUD')
                params.append('TK')
            else:
                query += " AND jenjang = %s"
                params.append(filters['jenjang'])
        
        if filters.get('status_sekolah'):
            query += " AND status_sekolah = %s"
            params.append(filters['status_sekolah'])
        
        if filters.get('search'):
            query += " AND (nama LIKE %s OR npsn LIKE %s)"
            params.append(f"%{filters['search']}%")
            params.append(f"%{filters['search']}%")
        
        stats = db.execute_query(query, tuple(params) if params else None)
        
        if stats:
            stat_data = stats[0]
            return {
                "success": True,
                "stats": {
                    "total_sekolah": stat_data['total'],
                    "rata_rata": {
                        "kelengkapan": round(float(stat_data['avg_kelengkapan'] or 0), 1),
                        "validitas": round(float(stat_data['avg_validitas'] or 0), 1),
                        "mutakhir": round(float(stat_data['avg_mutakhir'] or 0), 1),
                        "total": round(float(stat_data['avg_total'] or 0), 1)
                    }
                }
            }
        else:
            return {
                "success": True,
                "stats": {
                    "total_sekolah": 0,
                    "rata_rata": {"kelengkapan": 0, "validitas": 0, "mutakhir": 0, "total": 0}
                }
            }
            
    except Exception as e:
        print(f"❌ Error fetching filtered stats: {str(e)}")
        return {
            "success": False,
            "stats": {
                "total_sekolah": 0,
                "rata_rata": {"kelengkapan": 0, "validitas": 0, "mutakhir": 0, "total": 0}
            },
            "error": str(e)
        }

@app.get("/api/search-sekolah")
async def search_sekolah(q: str = ""):
    """Search sekolah by name or NPSN"""
    try:
        if not q or len(q) < 2:
            return {
                "success": True,
                "sekolah": []
            }
        
        query = """
        SELECT 
            npsn, nama, jenjang, status_sekolah,
            kabupaten, kecamatan,
            kelengkapan, validitas, mutakhir, total
        FROM sekolah
        WHERE (nama LIKE %s OR npsn LIKE %s)
        AND kelengkapan IS NOT NULL
        LIMIT 20
        """
        
        results = db.execute_query(query, (f"%{q}%", f"%{q}%"))
        
        return {
            "success": True,
            "sekolah": results
        }
        
    except Exception as e:
        return {
            "success": False,
            "sekolah": [],
            "error": str(e)
        }

@app.post("/api/predict-batch")
async def predict_batch(filters: dict):
    """
    Main AI Prediction endpoint dengan Fuzzy Mamdani - MODIFIED untuk 3 parameter
    """
    try:
        print("=" * 60)
        print("🤖 Starting Fuzzy Mamdani AI Prediction (3 Parameters)")
        print(f"📊 Filters: {filters}")
        print("=" * 60)
        
        # Check if sekolah table exists with validation columns
        if not db.check_sekolah_table():
            raise HTTPException(
                status_code=400, 
                detail="Tabel 'sekolah' tidak ditemukan atau tidak memiliki kolom validasi. "
                       "Pastikan tabel memiliki kolom: kelengkapan, validitas, mutakhir, total"
            )
        
        # Build query - TAMBAHKAN SEMUA KOLOM SISWA DAN GURU
        query = """
        SELECT 
            npsn, 
            nama, 
            jenjang, 
            status_sekolah,
            kabupaten, 
            kecamatan,
            kelengkapan, 
            validitas, 
            mutakhir, 
            total,
            -- DATA SISWA (cek nama kolom yang sesuai di database Anda)
            IFNULL(siswa_pria, 0) as siswa_pria,
            IFNULL(siswa_perempuan, 0) as siswa_perempuan,
            IFNULL(total_siswa, 0) as jumlah_siswa,
            -- DATA GURU (cek nama kolom yang sesuai di database Anda)
            IFNULL(guru_pria, 0) as guru_pria,
            IFNULL(guru_perempuan, 0) as guru_perempuan,
            IFNULL(total_guru, 0) as jumlah_guru
        FROM sekolah
        WHERE 1=1
        AND kelengkapan IS NOT NULL
        """
        
        params = []
        
        if filters.get('kabupaten'):
            query += " AND kabupaten = %s"
            params.append(filters['kabupaten'])
        
        if filters.get('kecamatan'):
            query += " AND kecamatan = %s"
            params.append(filters['kecamatan'])
        
        if filters.get('jenjang'):
            # Handle PAUD/TK filter
            if filters['jenjang'] == 'PAUD':
                query += " AND (jenjang = %s OR jenjang = %s)"
                params.append('PAUD')
                params.append('TK')
            else:
                query += " AND jenjang = %s"
                params.append(filters['jenjang'])
        
        if filters.get('status_sekolah'):
            query += " AND status_sekolah = %s"
            params.append(filters['status_sekolah'])
        
        if filters.get('search'):
            query += " AND (nama LIKE %s OR npsn LIKE %s)"
            params.append(f"%{filters['search']}%")
            params.append(f"%{filters['search']}%")
        
        query += " LIMIT 2500"
        
        # Execute query
        print(f"📝 Query: {query}")
        print(f"📝 Params: {params}")
        results = db.execute_query(query, tuple(params) if params else None)
        
        if not results:
            print("⚠️ Tidak ada data yang ditemukan")
            return {
                "success": True,
                "message": "Tidak ada data yang sesuai dengan filter",
                "data": [],
                "total": 0
            }
        
        print(f"✅ Found {len(results)} schools to predict")
        print(f"📊 Sample row keys: {list(results[0].keys()) if results else 'No results'}")
        
        # Initialize Fuzzy Predictor
        predictor = FuzzyMamdaniPredictor()
        predicted_data = []
        
        # Statistics
        success_count = 0
        error_count = 0
        
        for row in results:
            try:
                # DEBUG: Print sample data
                if len(predicted_data) == 0:
                    print(f"🔍 Sample data from database:")
                    print(f"  - siswa_pria: {row.get('siswa_pria', 'NOT FOUND')}")
                    print(f"  - siswa_perempuan: {row.get('siswa_perempuan', 'NOT FOUND')}")
                    print(f"  - jumlah_siswa: {row.get('jumlah_siswa', 'NOT FOUND')}")
                    print(f"  - guru_pria: {row.get('guru_pria', 'NOT FOUND')}")
                    print(f"  - guru_perempuan: {row.get('guru_perempuan', 'NOT FOUND')}")
                    print(f"  - jumlah_guru: {row.get('jumlah_guru', 'NOT FOUND')}")
                
                # MODIFIED: Hanya menggunakan 3 parameter untuk AI Prediction
                prediction = predictor.predict(
                    float(row['kelengkapan']),
                    float(row['validitas']),
                    float(row['mutakhir'])
                )
                
                if prediction['success']:
                    success_count += 1
                else:
                    error_count += 1
                
                # Total tetap ditampilkan tetapi tidak digunakan dalam AI
                school_data = {
                    'npsn': row['npsn'],
                    'nama': row['nama'],
                    'jenjang': row['jenjang'],
                    'status_sekolah': row['status_sekolah'],
                    'kabupaten': row['kabupaten'],
                    'kecamatan': row['kecamatan'],
                    'kelengkapan': float(row['kelengkapan']),
                    'validitas': float(row['validitas']),
                    'mutakhir': float(row['mutakhir']),
                    'total': float(row['total']),
                    # Data siswa - GANTI DENGAN NAMA YANG SESUAI DI DATABASE ANDA
                    'siswa_pria': row.get('siswa_pria', row.get('siswa_laki', 0)),
                    'siswa_wanita': row.get('siswa_perempuan', row.get('siswa_perempuan', row.get('siswa_wanita', 0))),
                    'jumlah_siswa': row.get('jumlah_siswa', row.get('total_siswa', 0)),
                    # Data guru - GANTI DENGAN NAMA YANG SESUAI DI DATABASE ANDA
                    'guru_pria': row.get('guru_pria', row.get('guru_laki', 0)),
                    'guru_wanita': row.get('guru_perempuan', row.get('guru_perempuan', row.get('guru_wanita', 0))),
                    'jumlah_guru': row.get('jumlah_guru', row.get('total_guru', 0)),
                    'prediction': prediction
                }
                
                predicted_data.append(school_data)
                
            except Exception as e:
                print(f"⚠️ Prediction error for {row.get('npsn', 'UNKNOWN')}: {e}")
                error_count += 1
                continue
        
        print("=" * 60)
        print(f"🎉 Prediction Complete!")
        print(f"🤖 AI menggunakan 3 parameter: kelengkapan, validitas, mutakhir")
        print(f"📊 Total tetap ditampilkan tetapi tidak digunakan dalam perhitungan AI")
        print(f"✅ Success: {success_count} schools")
        print(f"❌ Errors: {error_count} schools")
        print(f"📈 Total: {len(predicted_data)} schools processed")
        
        # DEBUG: Print first school data
        if predicted_data:
            print(f"🔍 First school data structure:")
            first_school = predicted_data[0]
            print(f"  - siswa_pria: {first_school.get('siswa_pria', 'NOT SET')}")
            print(f"  - siswa_wanita: {first_school.get('siswa_wanita', 'NOT SET')}")
            print(f"  - jumlah_siswa: {first_school.get('jumlah_siswa', 'NOT SET')}")
            print(f"  - guru_pria: {first_school.get('guru_pria', 'NOT SET')}")
            print(f"  - guru_wanita: {first_school.get('guru_wanita', 'NOT SET')}")
            print(f"  - jumlah_guru: {first_school.get('jumlah_guru', 'NOT SET')}")
        
        print("=" * 60)
        
        return {
            "success": True,
            "message": f"Berhasil memprediksi {len(predicted_data)} sekolah",
            "data": predicted_data,
            "total": len(predicted_data),
            "statistics": {
                "success": success_count,
                "errors": error_count
            },
            "ai_info": {
                "parameters_used": ["kelengkapan", "validitas", "mutakhir"],
                "note": "Kolom 'total' tetap ditampilkan tetapi tidak digunakan dalam perhitungan fuzzy"
            },
            "filters_applied": filters
        }
        
    except Exception as e:
        print(f"❌ Prediction error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Prediksi gagal: {str(e)}")

# Run server
if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting server on http://localhost:5000")
    uvicorn.run(app, host="0.0.0.0", port=5000, reload=True)