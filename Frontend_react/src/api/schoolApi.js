// src/api/schoolApi.js

const API_SEKOLAH_URL = `${process.env.REACT_APP_BASE_URL}sekolah`;

/**
 * Mengambil data sekolah dari API.
 * Sesuai dengan logika fetch di kode JS asli.
 */
export const fetchSchoolData = async () => {
    try {
        const response = await fetch(API_SEKOLAH_URL);
        if (!response.ok) {
            throw new Error('Gagal terhubung ke API PHP. Status: ' + response.statusText);
        }
        const data = await response.json();

        if (data.error || !Array.isArray(data)) {
            throw new Error(data.error || 'API mengembalikan data yang tidak valid atau kosong.');
        }

        return data;

    } catch (error) {
        console.error('Error saat memuat data dari PHP/MySQL:', error);
        throw error;
    }
};

/**
 * Mengambil data GeoJSON untuk batas wilayah.
 */
export const fetchGeoJson = async () => {
    try {
        const response = await fetch('/jateng.geojson'); // Path relatif dari folder public
        if (!response.ok) {
            throw new Error('Gagal memuat jateng.geojson. Status: ' + response.statusText);
        }
        const geoJsonData = await response.json();
        return geoJsonData;
    } catch (error) {
        console.error('Error loading GeoJSON:', error);
        throw error;
    }
}