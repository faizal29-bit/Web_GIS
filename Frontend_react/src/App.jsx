import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import FilterPanel from './components/FilterPanel';
import ChartsPanel from './components/ChartsPanel';
import MapComponent from './components/MapComponent';
import ChartsPage from './pages/ChartsPage';
import AIPrediction from './pages/AiPrediction';
import { standardizeKabupatenName, toTitleCase } from './utils/helpers';
import L from 'leaflet';
import './styles/style.css';

const API_ENDPOINT = 'http://127.0.0.1:5000/api/sekolah';

function App() {
  const [sekolahData, setSekolahData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [map, setMap] = useState(null);
  const [markerClusterLayer, setMarkerClusterLayer] = useState(null);
  const [kabupatenLayer, setKabupatenLayer] = useState(null);
  const [kabupatenColors, setKabupatenColors] = useState({});
  const [searchMarker, setSearchMarker] = useState(null);
  const [infoBoxContent, setInfoBoxContent] = useState('<b>Memuat data...</b>');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isChartsPanelOpen, setIsChartsPanelOpen] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);

  // Filter states
  const [selectedKabupaten, setSelectedKabupaten] = useState('all');
  const [selectedKecamatan, setSelectedKecamatan] = useState('all');
  const [negeriChecked, setNegeriChecked] = useState(true);
  const [swastaChecked, setSwastaChecked] = useState(true);
  const [jenjangInput, setJenjangInput] = useState('');
  const [kabupatenList, setKabupatenList] = useState([]);
  const [kecamatanList, setKecamatanList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initial view state
  const initialCenter = [-7.150975, 110.140259];
  const initialZoom = 10;

  // Fetch data on component mount
  useEffect(() => {
    fetchDataAndUpdateMap();
  }, []);

  // Apply filters when dependencies change - FIXED
  useEffect(() => {
    if (sekolahData.length > 0) {
      applyFilters();
      
      // Saat filter berubah, KELUAR dari mode pencarian
      if (isSearchActive) {
        exitSearchMode();
      }
    }
  }, [sekolahData, selectedKabupaten, selectedKecamatan, negeriChecked, swastaChecked, jenjangInput]);

  // Fungsi untuk keluar dari mode pencarian
  const exitSearchMode = useCallback(() => {
    setIsSearchActive(false);
    
    // Hapus marker pencarian
    if (searchMarker && map) {
      map.removeLayer(searchMarker);
      setSearchMarker(null);
    }
    
    // Tampilkan kembali marker cluster
    if (markerClusterLayer && map) {
      map.addLayer(markerClusterLayer);
    }
    
    // Tampilkan kembali layer kabupaten
    if (kabupatenLayer && map) {
      map.addLayer(kabupatenLayer);
    }
  }, [map, markerClusterLayer, searchMarker, kabupatenLayer]);

  const fetchDataAndUpdateMap = async () => {
    setLoading(true);
    setInfoBoxContent('<b>Memuat data dari API...</b>');

    try {
      const response = await fetch(API_ENDPOINT);

      if (!response.ok) {
        throw new Error(`Gagal mengambil data dari API (Status: ${response.status})`);
      }

      const rawData = await response.json();

      if (!rawData || rawData.length === 0) {
        throw new Error('Data API kosong atau tidak ada data yang dikembalikan');
      }

      console.log('Total baris dari API:', rawData.length);

      // Filter data dengan koordinat valid
      const filteredDataWithCoords = rawData.filter(row => {
        const lat = row.lintang;
        const lng = row.bujur;

        return (
          lat && lng &&
          !isNaN(parseFloat(lat)) &&
          !isNaN(parseFloat(lng)) &&
          parseFloat(lat) !== 0 &&
          parseFloat(lng) !== 0
        );
      });

      console.log('Data setelah filter koordinat:', filteredDataWithCoords.length);

      // Process data
      const processedData = filteredDataWithCoords.map(row => ({
        ...row,
        kabupaten: row.kabupaten ? standardizeKabupatenName(row.kabupaten) : '',
        jenjang: row.jenjang ? row.jenjang.toLowerCase().trim() : '',
        kecamatan: row.kecamatan ? row.kecamatan.toLowerCase().trim() : '',
        status_sekolah: row.status_sekolah || 'Tidak diketahui'
      }));

      setSekolahData(processedData);
      populateKabupatenFilter(processedData);

      setInfoBoxContent(`
        <b>Data berhasil dimuat!</b><br>
        Total ${processedData.length} sekolah ditemukan dari API.
        <br><small>Diperbarui: ${new Date().toLocaleTimeString()}</small>
      `);

    } catch (error) {
      console.error('Error fetching data:', error);
      setInfoBoxContent(`
        <b>Gagal memuat data dari API!</b><br>
        <small>${error.message}</small>
      `);
    } finally {
      setLoading(false);
    }
  };

  const populateKabupatenFilter = (data) => {
    const uniqueKabupaten = [...new Set(data.map(row => row.kabupaten).filter(Boolean))];
    uniqueKabupaten.sort();
    setKabupatenList(uniqueKabupaten);
  };

  const handleKabupatenChange = (kabupaten) => {
    setSelectedKabupaten(kabupaten);
    populateKecamatanFilter(kabupaten);
  };

  const populateKecamatanFilter = (selectedKabupaten) => {
    if (selectedKabupaten === 'all') {
      setKecamatanList([]);
      setSelectedKecamatan('all');
      return;
    }

    const filteredData = sekolahData.filter(row => row.kabupaten === selectedKabupaten);
    const uniqueKecamatan = [...new Set(filteredData.map(row => row.kecamatan).filter(Boolean))];
    uniqueKecamatan.sort();
    setKecamatanList(uniqueKecamatan);
    setSelectedKecamatan('all');
  };

  const applyFilters = () => {
    const selectedStatuses = [];
    if (negeriChecked) selectedStatuses.push('negeri');
    if (swastaChecked) selectedStatuses.push('swasta');

    const filtered = sekolahData.filter(row => {
      const matchesKabupaten = selectedKabupaten === 'all' || row.kabupaten === selectedKabupaten;
      const matchesKecamatan = selectedKecamatan === 'all' || row.kecamatan === selectedKecamatan;
      const matchesStatus = selectedStatuses.length === 0 || 
                           selectedStatuses.includes(row.status_sekolah?.toLowerCase());
      const matchesJenjang = jenjangInput === '' || 
                            row.jenjang?.includes(jenjangInput.toLowerCase());

      return matchesKabupaten && matchesKecamatan && matchesStatus && matchesJenjang;
    });

    setFilteredData(filtered);
    
    // Update info box
    if (selectedKabupaten === 'all' && selectedKecamatan === 'all' && 
        jenjangInput === '' && negeriChecked && swastaChecked) {
      setInfoBoxContent(`
        <b>Peta Sekolah Jateng</b><br>
        Total: ${sekolahData.length} sekolah<br>
        <small>Klik marker untuk melihat detail sekolah</small>
      `);
    } else {
      setInfoBoxContent(`<b>Hasil Filter:</b><br>Menampilkan ${filtered.length} sekolah.`);
    }
  };

  // 🔥 PENCARIAN SEDERHANA & AKURAT - HANYA TAMPILKAN 1 MARKER
  const handleSearch = (query) => {
    if (!query || query.trim() === '') {
      resetAllMarkers();
      return false;
    }

    setIsSearchActive(true);

    // Hapus marker pencarian sebelumnya jika ada
    if (searchMarker && map) {
      map.removeLayer(searchMarker);
      setSearchMarker(null);
    }

    const cleanQuery = query.trim().toLowerCase();

    // 1. CARI BERDASARKAN NPSN (PALING AKURAT)
    const resultByNpsn = sekolahData.find(row => 
      row.npsn && row.npsn.toString().toLowerCase() === cleanQuery
    );

    if (resultByNpsn) {
      displaySearchResult(resultByNpsn, 'npsn');
      return true;
    }

    // 2. CARI BERDASARKAN NAMA (EXACT MATCH DULU)
    const exactMatch = sekolahData.find(row => 
      row.nama && row.nama.toLowerCase().trim() === cleanQuery
    );

    if (exactMatch) {
      displaySearchResult(exactMatch, 'nama');
      return true;
    }

    // 3. CARI BERDASARKAN NAMA (CONTAINS)
    const containsMatch = sekolahData.find(row => 
      row.nama && row.nama.toLowerCase().includes(cleanQuery)
    );

    if (containsMatch) {
      displaySearchResult(containsMatch, 'nama');
      return true;
    }

    // 4. JIKA TIDAK DITEMUKAN
    // setInfoBoxContent(`
    //   <div class="search-result-not-found">
    //     <b style="color: #dc2626;">✗ SEKOLAH TIDAK DITEMUKAN</b><br>
    //     <small>Pencarian: "${query}"</small><br>
    //     <em>Pastikan NPSN atau nama sekolah benar.</em>
    //     <br><br>
    //     <button class="close-search-btn" onclick="window.dispatchEvent(new CustomEvent('closeSearch'))" style="
    //       background: #3b82f6;
    //       color: white;
    //       border: none;
    //       padding: 5px 10px;
    //       border-radius: 4px;
    //       cursor: pointer;
    //       font-size: 12px;
    //     ">
    //       Kembali ke Semua Sekolah
    //     </button>
    //   </div>
    // `);
    return false;
  };

  // Fungsi untuk menampilkan hasil pencarian (hanya 1 marker)
  const displaySearchResult = (result, searchType) => {
    const lat = parseFloat(result.lintang);
    const lng = parseFloat(result.bujur);

    if (!isNaN(lat) && !isNaN(lng)) {
      // Sembunyikan semua marker cluster
      if (markerClusterLayer && map) {
        map.removeLayer(markerClusterLayer);
      }
      
      // Sembunyikan layer kabupaten jika ada
      if (kabupatenLayer && map) {
        map.removeLayer(kabupatenLayer);
      }

      // Create custom search marker dengan ikon khusus
      const newSearchMarker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'sekolah-marker searched',
          html: `<div style="
            background-color: #3b82f6;
            border: 3px solid #1d4ed8;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            box-shadow: 0 0 15px rgba(59, 130, 246, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 12px;
          ">!</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      }).bindPopup(`
        <div style="min-width: 250px; font-size: 14px;">
          <b style="color: #2563eb;">${result.nama || 'Nama tidak tersedia'}</b><br>
          <hr style="margin: 5px 0;">
          <b>NPSN:</b> ${result.npsn || '-'}<br>
          <b>Status:</b> ${result.status_sekolah || '-'}<br>
          <b>Jenjang:</b> ${toTitleCase(result.jenjang || '-')}<br>
          <b>Kecamatan:</b> ${toTitleCase(result.kecamatan || '-')}<br>
          <b>Kabupaten:</b> ${toTitleCase(result.kabupaten || '-')}<br>
          <b>Jumlah Siswa:</b> ${result.total_siswa || result.total_siswa === 0 ? result.total_siswa : '-'}<br>
          <b>Jumlah Guru:</b> ${result.total_guru || result.total_guru === 0 ? result.total_guru : '-'}<br>
          <b>Koordinat:</b> <small>${lat.toFixed(6)}, ${lng.toFixed(6)}</small>
          <br>
          <br>
          <small style="color: #666;">Hasil pencarian ${searchType}</small>
        </div>
      `);

      // if (map) {
      //   newSearchMarker.addTo(map);
      //   map.setView([lat, lng], 15);
      //   newSearchMarker.openPopup();
      // }
      if (map) {
        newSearchMarker.addTo(map);

        // --- MULAI KODE BARU (LOGIKA OFFSET) ---
        const zoomLevel = 15;
        
        // 1. Ubah koordinat marker ke titik pixel layar
        const targetPoint = map.project([lat, lng], zoomLevel);
        
        // 2. Geser titik tengah peta ke ATAS (y - 150px) 
        // Supaya marker terlihat turun ke BAWAH menjauhi header
        const offsetPoint = targetPoint.subtract([0, 80]); 
        
        // 3. Kembalikan ke koordinat latitude/longitude
        const newCenter = map.unproject(offsetPoint, zoomLevel);
        
        // 4. Set view ke titik tengah baru
        map.setView(newCenter, zoomLevel);
        // --- SELESAI KODE BARU ---

        newSearchMarker.openPopup();
      }

      setSearchMarker(newSearchMarker);

      // Format nama dan lokasi untuk ditampilkan
      const namaSekolah = result.nama || 'Nama tidak tersedia';
      const npsnSekolah = result.npsn || '-';
      const statusSekolah = result.status_sekolah || '-';
      const jenjangSekolah = toTitleCase(result.jenjang || '-');
      const kecamatanSekolah = toTitleCase(result.kecamatan || '-');
      const kabupatenSekolah = toTitleCase(result.kabupaten || '-');
      
      setInfoBoxContent(``);
    } else {
      setInfoBoxContent(`
        <div class="search-result-error">
          <b style="color: #dc2626;">⚠ Koordinat Tidak Valid</b><br>
          <b>${result.nama || 'Nama tidak tersedia'}</b><br>
          NPSN: ${result.npsn || '-'}<br>
          <em>Koordinat: ${result.lintang}, ${result.bujur}</em>
          <br><br>
          <button class="close-search-btn" onclick="window.dispatchEvent(new CustomEvent('closeSearch'))" style="
            background: #3b82f6;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
          ">
            Kembali ke Semua Sekolah
          </button>
        </div>
      `);
      setIsSearchActive(false);
    }
  };

  // Fungsi untuk mengembalikan semua marker ke peta
  const resetAllMarkers = useCallback(() => {
    setIsSearchActive(false);
    
    // Hapus marker pencarian khusus
    if (searchMarker && map) {
      map.removeLayer(searchMarker);
      setSearchMarker(null);
    }
    
    // Tampilkan kembali semua marker cluster
    if (markerClusterLayer && map) {
      map.addLayer(markerClusterLayer);
    }
    
    // Tampilkan kembali layer kabupaten
    if (kabupatenLayer && map) {
      map.addLayer(kabupatenLayer);
    }
    
    // Reset info box berdasarkan filter aktif
    if (selectedKabupaten === 'all' && selectedKecamatan === 'all' && 
        jenjangInput === '' && negeriChecked && swastaChecked) {
      setInfoBoxContent(`
        <b>Peta Sekolah Jateng</b><br>
        Total: ${sekolahData.length} sekolah<br>
        <small>Klik marker untuk melihat detail sekolah</small>
      `);
    } else {
      setInfoBoxContent(`<b>Hasil Filter:</b><br>Menampilkan ${filteredData.length} sekolah.`);
    }
    
    // Reset zoom ke view awal jika tidak sedang filter
    if (map && selectedKabupaten === 'all' && selectedKecamatan === 'all') {
      map.setView(initialCenter, initialZoom);
    }
  }, [map, markerClusterLayer, searchMarker, kabupatenLayer, sekolahData.length, filteredData.length, selectedKabupaten, selectedKecamatan, jenjangInput, negeriChecked, swastaChecked]);

  // Event listener untuk close search dari info box
  useEffect(() => {
    const handleCloseSearch = () => {
      resetAllMarkers();
    };

    window.addEventListener('closeSearch', handleCloseSearch);
    
    return () => {
      window.removeEventListener('closeSearch', handleCloseSearch);
    };
  }, [resetAllMarkers]);

  const toggleChartsPanel = () => {
    setIsChartsPanelOpen(!isChartsPanelOpen);
  };

  const toggleFilterPanel = () => {
    setIsFilterPanelOpen(!isFilterPanelOpen);
    
    // Saat membuka panel filter, keluar dari mode pencarian jika aktif
    if (isSearchActive && !isFilterPanelOpen) {
      exitSearchMode();
    }
  };

  const clearFilters = () => {
    setSelectedKabupaten('all');
    setSelectedKecamatan('all');
    setNegeriChecked(true);
    setSwastaChecked(true);
    setJenjangInput('');
    setKecamatanList([]);
    resetAllMarkers();
  };

  return (
    <Router>
      <div className="app">
        <Routes>
          {/* Redirect root to map */}
          <Route path="/" element={<Navigate to="/map" replace />} />
          
          {/* Map page with all components */}
          <Route path="/map" element={
            <>
              <Dashboard
                onSearch={handleSearch}
                onResetSearch={resetAllMarkers}
                infoBoxContent={infoBoxContent}
                onOpenFilter={toggleFilterPanel}
                onToggleCharts={toggleChartsPanel}
                showCharts={isChartsPanelOpen}
                loading={loading}
                totalSchools={sekolahData.length}
                filteredSchools={filteredData.length}
                isSearchActive={isSearchActive}
              />

              <ChartsPanel
                sekolahData={filteredData.length > 0 ? filteredData : sekolahData}
                isOpen={isChartsPanelOpen}
                onClose={() => setIsChartsPanelOpen(false)}
              />

              <FilterPanel
                isOpen={isFilterPanelOpen}
                onClose={() => setIsFilterPanelOpen(false)}
                kabupatenList={kabupatenList}
                kecamatanList={kecamatanList}
                selectedKabupaten={selectedKabupaten}
                selectedKecamatan={selectedKecamatan}
                onKabupatenChange={handleKabupatenChange}
                onKecamatanChange={setSelectedKecamatan}
                negeriChecked={negeriChecked}
                swastaChecked={swastaChecked}
                onNegeriChange={setNegeriChecked}
                onSwastaChange={setSwastaChecked}
                jenjangInput={jenjangInput}
                onJenjangChange={setJenjangInput}
                onClearFilters={clearFilters}
              />

              <MapComponent
                onMapLoad={setMap}
                onMarkerClusterLoad={setMarkerClusterLayer}
                onKabupatenLayerLoad={setKabupatenLayer}
                data={filteredData.length > 0 ? filteredData : sekolahData}
                kabupatenColors={kabupatenColors}
                onKabupatenColorsChange={setKabupatenColors}
                sekolahData={sekolahData}
                searchMarker={searchMarker}
                isSearchActive={isSearchActive}
                initialCenter={initialCenter}
                initialZoom={initialZoom}
                resetAllMarkers={resetAllMarkers}
              />
            </>
          } />
          
          {/* AI Prediction page */}
          <Route path="/ai-prediction" element={<AIPrediction />} />
          
          {/* Charts page */}
          <Route path="/charts" element={<ChartsPage sekolahData={sekolahData} />} />
          
          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/map" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;