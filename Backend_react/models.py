from pydantic import BaseModel
from typing import Optional

class Sekolah(BaseModel):
    nama: str
    jenjang: str
    desa_kelurahan: str
    kecamatan: str
    kabupaten: str
    provinsi: str
    lintang: str
    bujur: str
    status_sekolah: str
    npsn: str

class PredictionRequest(BaseModel):
    kelengkapan: float
    validitas: float
    mutakhir: float
    total: float

class PredictionResponse(BaseModel):
    success: bool
    nilai: float
    kategori: str
    color: str
    score: str