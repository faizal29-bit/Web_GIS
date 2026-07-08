# WebGIS Klasifikasi Kualitas Data Dapodik Menggunakan Metode Fuzzy Mamdani

## Deskripsi

WebGIS Klasifikasi Kualitas Data Dapodik merupakan sistem berbasis web yang dikembangkan untuk mengklasifikasikan dan memvisualisasikan kualitas data administrasi satuan pendidikan di Provinsi Jawa Tengah menggunakan metode Fuzzy Mamdani. Sistem ini membantu BBPMP Provinsi Jawa Tengah dalam memantau kualitas data melalui peta interaktif sehingga proses analisis dan penentuan prioritas pendampingan menjadi lebih mudah.

## Fitur

- Menampilkan lokasi satuan pendidikan pada peta interaktif.
- Mengelompokkan marker secara otomatis menggunakan Marker Cluster.
- Menampilkan choropleth batas administrasi kabupaten/kota.
- Melakukan pencarian sekolah berdasarkan nama atau NPSN.
- Menyediakan filter berdasarkan kabupaten, kecamatan, jenjang, dan status sekolah.
- Mengklasifikasikan kualitas data menggunakan metode Fuzzy Mamdani.
- Menampilkan statistik distribusi data sekolah.
- Menampilkan hasil klasifikasi dalam bentuk tabel.

## Teknologi

### Frontend

- React
- Vite
- React Leaflet
- Leaflet
- Leaflet.markercluster
- Axios
- React Router

### Backend

- Python
- FastAPI
- Scikit-Fuzzy
- Pandas
- Pydantic
- MySQL Connector

### Database

- MySQL

## Struktur Proyek

```
project
│
├── backend
│   ├── api
│   ├── database
│   ├── fuzzy
│   ├── models
│   ├── main.py
│   └── requirements.txt
│
├── frontend
│   ├── public
│   ├── src
│   │   ├── components
│   │   ├── pages
│   │   ├── services
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
│
├── data
│   ├── sekolah.csv
│   └── jateng.geojson
│
└── README.md
```

## Dataset

Dataset yang digunakan merupakan data satuan pendidikan Provinsi Jawa Tengah yang bersumber dari BBPMP Provinsi Jawa Tengah. Dataset terdiri dari 46.961 data sekolah yang tersebar pada 35 kabupaten/kota.

Variabel yang digunakan dalam proses klasifikasi meliputi:

- Kelengkapan
- Validitas
- Kemutakhiran

Sedangkan atribut lain digunakan sebagai informasi pendukung, seperti identitas sekolah, lokasi, koordinat geografis, dan nilai Total.

## Metode

Metode yang digunakan adalah Fuzzy Mamdani dengan:

- Tiga variabel masukan, yaitu Kelengkapan, Validitas, dan Kemutakhiran.
- Tiga himpunan fuzzy pada setiap variabel, yaitu Rendah, Sedang, dan Tinggi.
- Dua puluh tujuh aturan inferensi (Rule Base).
- Defuzzifikasi menggunakan metode Centroid.

Hasil inferensi diklasifikasikan menjadi lima kategori kualitas data:

- Sangat Baik (A)
- Baik (B)
- Cukup (C)
- Kurang (D)
- Sangat Kurang (E)

## Instalasi

### Backend

Masuk ke folder backend.

```bash
cd backend
```

Install seluruh dependency.

```bash
pip install -r requirements.text
```

Jalankan server FastAPI.

```bash
uvicorn main:app --reload --port 5000
```

Backend akan berjalan pada:

```
http://localhost:5000
```

### Frontend

Masuk ke folder frontend.

```bash
cd frontend
```

Install dependency.

```bash
npm install
```

Jalankan aplikasi.

```bash
npm run dev
```

Frontend akan berjalan pada:

```
http://localhost:5173
```

## API

Endpoint utama yang tersedia meliputi:

| Method | Endpoint | Deskripsi |
|---------|----------|-----------|
| GET | /api/sekolah | Mengambil seluruh data sekolah |
| GET | /api/filters | Mengambil data filter |
| GET | /api/search-sekolah | Mencari sekolah berdasarkan nama atau NPSN |
| POST | /api/predict-batch | Melakukan klasifikasi menggunakan Fuzzy Mamdani |

## Hasil

Sistem yang dikembangkan mampu:

- Menampilkan persebaran 46.961 satuan pendidikan pada peta interaktif.
- Mengklasifikasikan kualitas data menggunakan metode Fuzzy Mamdani.
- Menampilkan hasil klasifikasi berdasarkan indikator Kelengkapan, Validitas, dan Kemutakhiran.
- Menyediakan fitur pencarian dan penyaringan data.
- Menampilkan statistik distribusi data sekolah.
- Membantu proses monitoring kualitas data Dapodik secara spasial.

## Pengembang

Faizal Imam Safangat

Program Studi Informatika  
Fakultas Teknologi Industri  
Universitas Islam Sultan Agung
