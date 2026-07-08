import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './AiPrediction.css';

const AiPrediction = () => {
  const navigate = useNavigate();
  
  const API_BASE = import.meta.env?.VITE_API_BASE || 
                   window.env?.REACT_APP_API_BASE || 
                   'http://localhost:5000/api';
  
  // State untuk filter - DIPISAH DARI PENCARIAN
  const [filters, setFilters] = useState({
    jenjang: 'all',
    kabupaten: 'all',
    kecamatan: 'all',
    status_sekolah: 'all'
  });
  
  // STATE BARU: Pencarian terpisah
  const [searchQuery, setSearchQuery] = useState('');
  
  // STATE BARU: Limit data yang ditampilkan
  const [dataLimit, setDataLimit] = useState(50); // Default 50 data
  
  // STATE BARU: Sorting untuk kolom total
  const [sortByTotal, setSortByTotal] = useState('desc'); // 'desc' = tertinggi, 'asc' = terendah
  
  const [filterOptions, setFilterOptions] = useState({
    kabupaten: [],
    kecamatan: [],
    jenjang: [],
    status_sekolah: []
  });
  
  const [predictedData, setPredictedData] = useState([]);
  const [displayedData, setDisplayedData] = useState([]); // Data yang ditampilkan setelah filter dan sort
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [stats, setStats] = useState(null);
  const [filteredStats, setFilteredStats] = useState(null);
  const [error, setError] = useState('');
  const [predictionStats, setPredictionStats] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null); // STATE BARU: sekolah yang dipilih dari search

  // Data options untuk dropdown - TETAP SAMA
  const jenjangOptions = [
    { value: 'all', label: 'Semua Jenjang' },
    { value: 'PAUD', label: 'PAUD/TK' },
    { value: 'SD', label: 'SD/MI' },
    { value: 'SMP', label: 'SMP/MTS' },
    { value: 'SMA', label: 'SMA/MA' },
    { value: 'SMK', label: 'SMK' }
  ];

  const statusOptions = [
    { value: 'all', label: 'Semua Status' },
    { value: 'Negeri', label: 'Negeri' },
    { value: 'Swasta', label: 'Swasta' }
  ];

  // Options untuk limit data
  const limitOptions = [
    { value: 10, label: '10 data' },
    { value: 25, label: '25 data' },
    { value: 50, label: '50 data' },
    { value: 75, label: '75 data' },
    { value: 100, label: '100 data' },
    { value: 200, label: '200 data' },
    { value: 300, label: '300 data' },
    { value: 500, label: '500 data' },
    { value: 0, label: 'Semua data' }
  ];

  // Options untuk sorting total
  const sortOptions = [
    { value: 'desc', label: 'Nilai Tertinggi' },
    { value: 'asc', label: 'Nilai Terendah' }
  ];

  // Fetch initial data
  useEffect(() => {
    console.log('🔗 API Base URL:', API_BASE);
    fetchFilterOptions();
    fetchStats();
  }, []);

  // Fetch kecamatan when kabupaten changes
  useEffect(() => {
    if (filters.kabupaten !== 'all') {
      fetchKecamatanOptions(filters.kabupaten);
    } else {
      setFilterOptions(prev => ({ ...prev, kecamatan: [] }));
      setFilters(prev => ({ ...prev, kecamatan: 'all' }));
    }
  }, [filters.kabupaten]);

  // Fetch filtered stats when filters change
  useEffect(() => {
    if (hasActiveFilters()) {
      fetchFilteredStats();
    } else {
      setFilteredStats(null);
    }
  }, [filters]);

  // Apply data limit and sorting when predictedData or settings change
  useEffect(() => {
    if (predictedData.length > 0) {
      applyDisplaySettings();
    }
  }, [predictedData, dataLimit, sortByTotal]);

  // Fungsi untuk mengatur data yang ditampilkan berdasarkan limit dan sorting
  const applyDisplaySettings = useCallback(() => {
    let processedData = [...predictedData];
    
    // 1. Apply sorting berdasarkan total
    if (sortByTotal === 'desc') {
      processedData.sort((a, b) => b.total - a.total); // Tertinggi ke terendah
    } else if (sortByTotal === 'asc') {
      processedData.sort((a, b) => a.total - b.total); // Terendah ke tertinggi
    }
    
    // 2. Apply limit data
    if (dataLimit > 0 && processedData.length > dataLimit) {
      processedData = processedData.slice(0, dataLimit);
    }
    
    setDisplayedData(processedData);
  }, [predictedData, dataLimit, sortByTotal]);

  // Normalisasi teks untuk pencarian
  const normalizeSearchText = useCallback((text) => {
    if (!text) return '';
    
    return text
      .toLowerCase()
      .trim()
      .replace(/\bsd\b/g, 'sekolah dasar')
      .replace(/\bsmp\b/g, 'sekolah menengah pertama')
      .replace(/\bsma\b/g, 'sekolah menengah atas')
      .replace(/\bsmk\b/g, 'sekolah menengah kejuruan')
      .replace(/\bmi\b/g, 'madrasah ibtidaiyah')
      .replace(/\bmts\b/g, 'madrasah tsanawiyah')
      .replace(/\bma\b/g, 'madrasah aliyah')
      .replace(/\bnegeri\b/g, 'negeri')
      .replace(/\bn\b/g, 'negeri')
      .replace(/\bswasta\b/g, 'swasta')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }, []);

  // Pencarian fleksibel
  const flexibleSearch = useCallback((query, data) => {
    if (!query || query.length < 2) return [];
    
    const normalizedQuery = normalizeSearchText(query);
    const queryTerms = normalizedQuery.split(' ').filter(term => term.length > 1);
    
    if (queryTerms.length === 0) return [];
    
    return data.filter(sekolah => {
      // Cek exact match untuk NPSN
      if (sekolah.npsn?.toString().includes(query)) {
        return true;
      }
      
      const searchFields = [
        sekolah.nama?.toLowerCase() || '',
        normalizeSearchText(sekolah.nama || ''),
        sekolah.jenjang?.toLowerCase() || '',
        sekolah.status_sekolah?.toLowerCase() || '',
        sekolah.kabupaten?.toLowerCase() || '',
        sekolah.kecamatan?.toLowerCase() || ''
      ].join(' ');
      
      let matchScore = 0;
      queryTerms.forEach(term => {
        if (searchFields.includes(term)) {
          matchScore++;
        } else {
          const hasPartialMatch = searchFields.split(' ').some(fieldTerm => 
            fieldTerm.includes(term) || term.includes(fieldTerm)
          );
          if (hasPartialMatch) matchScore += 0.5;
        }
      });
      
      const matchThreshold = Math.max(1, queryTerms.length * 0.5);
      return matchScore >= matchThreshold;
    });
  }, [normalizeSearchText]);

  // Debounced search
  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // Fetch functions
  const fetchFilterOptions = async () => {
    try {
      console.log('🔍 Fetching filter options from:', `${API_BASE}/filters`);
      const response = await fetch(`${API_BASE}/filters`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setFilterOptions({
          kabupaten: ['all', ...(data.filters.kabupaten || [])],
          kecamatan: [],
          jenjang: ['all', ...(data.filters.jenjang || [])],
          status_sekolah: ['all', ...(data.filters.status_sekolah || [])]
        });
        console.log('✅ Filter options loaded successfully');
      } else {
        setError(data.warning || 'Gagal mengambil data filter');
      }
    } catch (err) {
      console.error('❌ Error fetching filter options:', err);
      setError('Tidak ada data yang tersedia dari server!!');
    }
  };

  const fetchKecamatanOptions = async (kabupaten) => {
    try {
      const response = await fetch(`${API_BASE}/kecamatan/${encodeURIComponent(kabupaten)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setFilterOptions(prev => ({
          ...prev,
          kecamatan: ['all', ...(data.kecamatan || [])]
        }));
      }
    } catch (err) {
      console.error('Error fetching kecamatan:', err);
    }
  };

  const fetchStats = async () => {
    try {
      console.log('📊 Fetching stats from:', `${API_BASE}/stats`);
      const response = await fetch(`${API_BASE}/stats`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
        console.log('✅ Stats loaded successfully');
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchFilteredStats = async () => {
    try {
      const apiFilters = {
        kabupaten: filters.kabupaten === 'all' ? '' : filters.kabupaten,
        kecamatan: filters.kecamatan === 'all' ? '' : filters.kecamatan,
        jenjang: filters.jenjang === 'all' ? '' : filters.jenjang,
        status_sekolah: filters.status_sekolah === 'all' ? '' : filters.status_sekolah
      };

      const response = await fetch(`${API_BASE}/stats-filtered`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiFilters)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFilteredStats(data.stats);
        }
      }
    } catch (err) {
      console.error('Error fetching filtered stats:', err);
    }
  };

  // PERBAIKAN: Search sekolah - TIDAK MENGUBAH FILTER
  const searchSekolah = async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      setSelectedSchool(null); // Reset sekolah terpilih
      return;
    }

    setSearchLoading(true);
    
    try {
      const response = await fetch(`${API_BASE}/search-sekolah?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const flexResults = flexibleSearch(query, data.sekolah || []);
          const finalResults = flexResults.length > 0 ? flexResults : (data.sekolah || []);
          
          setSearchResults(finalResults.slice(0, 5));
          setShowSearchResults(true);
          setSelectedSchool(null); // Reset saat mencari baru
        }
      }
    } catch (err) {
      console.error('Error searching sekolah:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  // PERBAIKAN: Debounced search handler
  const debouncedSearch = useCallback(
    debounce((query) => {
      if (query.length >= 2) {
        searchSekolah(query);
      }
    }, 300),
    []
  );

  // PERBAIKAN: Handle search change - TIDAK MENGUBAH FILTER
  const handleSearchChange = (value) => {
    setSearchQuery(value);
    
    if (value.length >= 2) {
      debouncedSearch(value);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
      setSelectedSchool(null);
    }
  };

  // PERBAIKAN: Select search result - HANYA SET SEKOLAH YANG DIPILIH
  const selectSearchResult = (sekolah) => {
    setSelectedSchool(sekolah);
    setSearchQuery(`${sekolah.nama} (${sekolah.npsn})`);
    setShowSearchResults(false);
    setSearchResults([]);
    
    // OPTIONAL: Bisa juga auto-set filter berdasarkan sekolah yang dipilih
    setFilters({
      jenjang: sekolah.jenjang,
      kabupaten: sekolah.kabupaten,
      kecamatan: sekolah.kecamatan,
      status_sekolah: sekolah.status_sekolah
    });
  };

  // PERBAIKAN: Handle filter change - TIDAK MEMPENGARUHI PENCARIAN
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [filterName]: value };
      
      if (filterName === 'kabupaten' && value === 'all') {
        newFilters.kecamatan = 'all';
      }
      
      return newFilters;
    });
    setError('');
    
    // Reset sekolah terpilih ketika mengubah filter
    if (selectedSchool) {
      setSelectedSchool(null);
      setSearchQuery('');
    }
  };

  // PERBAIKAN BESAR: Handle Predict - PREDIKSI SPESIFIK ATAU BERDASARKAN FILTER
  const handlePredict = async () => {
    // Jika ada sekolah yang dipilih dari pencarian, prediksi hanya sekolah itu
    if (selectedSchool) {
      await predictSingleSchool(selectedSchool);
      return;
    }
    
    // Jika tidak ada sekolah yang dipilih, prediksi berdasarkan filter
    if (!canPredict) {
      setError('⚠️ Pilih setidaknya satu filter ATAU cari sekolah spesifik untuk prediksi');
      return;
    }

    await predictByFilters();
  };

  // PERBAIKAN: Prediksi sekolah tunggal - GUNAKAN ENDPOINT YANG ADA
  const predictSingleSchool = async (sekolah) => {
    setLoading(true);
    setError('');
    setPredictionStats(null);
    
    try {
      console.log('🤖 Starting Single School AI Prediction...');
      console.log('🎯 School:', sekolah.nama, sekolah.npsn);
      
      // PERBAIKAN: Gunakan endpoint yang sudah ada dengan filter spesifik
      const apiFilters = {
        kabupaten: sekolah.kabupaten,
        kecamatan: sekolah.kecamatan,
        jenjang: sekolah.jenjang,
        status_sekolah: sekolah.status_sekolah,
        search: sekolah.npsn // Gunakan NPSN untuk mendapatkan sekolah spesifik
      };

      console.log('📤 Sending request to existing endpoint:', `${API_BASE}/predict-batch`);
      const response = await fetch(`${API_BASE}/predict-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiFilters)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
      }

      const result = await response.json();
      console.log('📊 Single prediction response:', result);

      if (result.success && result.data) {
        // Filter hasil untuk memastikan hanya sekolah yang dipilih yang ditampilkan
        const filteredResults = result.data.filter(item => 
          item.npsn === sekolah.npsn || item.nama === sekolah.nama
        );
        
        // Jika tidak ditemukan di hasil, buat manual dari data sekolah
        const finalResults = filteredResults.length > 0 ? filteredResults : [{
          ...sekolah,
          prediction: {
            success: true,
            nilai: 'N/A',
            kategori: 'Tidak dapat diprediksi',
            score: 'N/A',
            color: '#6b7280'
          }
        }];
        
        setPredictedData(finalResults);
        setShowResults(true);
        
        // Calculate category distribution
        const categoryStats = calculateCategoryDistribution(finalResults);
        setPredictionStats(categoryStats);
        
        console.log('✅ Single prediction completed successfully');
      } else {
        // Fallback: Jika prediksi gagal, tampilkan data sekolah tanpa prediksi
        const fallbackResult = [{
          ...sekolah,
          prediction: {
            success: false,
            nilai: 'N/A',
            kategori: 'Prediksi gagal',
            score: 'N/A',
            color: '#6b7280'
          }
        }];
        
        setPredictedData(fallbackResult);
        setShowResults(true);
        setPredictionStats(calculateCategoryDistribution(fallbackResult));
        
        console.log('⚠️ Using fallback for single prediction');
      }
    } catch (err) {
      console.error('❌ Single prediction error:', err);
      
      // Fallback error handling
      const errorResult = [{
        ...sekolah,
        prediction: {
          success: false,
          nilai: 'Error',
          kategori: 'Gagal prediksi',
          score: 'E',
          color: '#dc2626'
        }
      }];
      
      setPredictedData(errorResult);
      setShowResults(true);
      setPredictionStats(calculateCategoryDistribution(errorResult));
      setError(`Gagal prediksi sekolah tunggal: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // FUNGSI BARU: Prediksi berdasarkan filter
  const predictByFilters = async () => {
    setLoading(true);
    setError('');
    setPredictionStats(null);
    
    try {
      console.log('🤖 Starting Batch AI Prediction by Filters...');
      console.log('📊 Filters:', filters);
      
      const apiFilters = {
        kabupaten: filters.kabupaten === 'all' ? '' : filters.kabupaten,
        kecamatan: filters.kecamatan === 'all' ? '' : filters.kecamatan,
        jenjang: filters.jenjang === 'all' ? '' : filters.jenjang,
        status_sekolah: filters.status_sekolah === 'all' ? '' : filters.status_sekolah
      };

      console.log('📤 Sending request to:', `${API_BASE}/predict-batch`);
      const response = await fetch(`${API_BASE}/predict-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiFilters)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
      }

      const result = await response.json();
      console.log('📊 Batch prediction response:', result);

      if (result.success) {
        setPredictedData(result.data);
        setShowResults(true);
        
        const categoryStats = calculateCategoryDistribution(result.data);
        setPredictionStats(categoryStats);
        
        console.log('✅ Batch prediction completed successfully');
      } else {
        setError(result.message || 'Terjadi kesalahan saat prediksi');
      }
    } catch (err) {
      console.error('❌ Batch prediction error:', err);
      setError(`Gagal terhubung ke server AI: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const calculateCategoryDistribution = (data) => {
    const distribution = {
      'Sangat Baik': 0,
      'Baik': 0,
      'Cukup': 0,
      'Kurang': 0,
      'Sangat Kurang': 0
    };
    
    data.forEach(item => {
      if (item.prediction && item.prediction.kategori) {
        distribution[item.prediction.kategori]++;
      }
    });
    
    return distribution;
  };

  // PERBAIKAN: Handle reset - RESET SEMUA INCLUDING PENCARIAN
  const handleReset = () => {
    setFilters({
      jenjang: 'all',
      kabupaten: 'all',
      kecamatan: 'all',
      status_sekolah: 'all'
    });
    setSearchQuery('');
    setSelectedSchool(null);
    setPredictedData([]);
    setDisplayedData([]);
    setShowResults(false);
    setError('');
    setPredictionStats(null);
    setSearchResults([]);
    setShowSearchResults(false);
    setFilteredStats(null);
    setDataLimit(50); // Reset ke default
    setSortByTotal('desc'); // Reset ke default
  };

  const handleNavigateBack = () => {
    navigate(-1);
  };

  const handleExportCSV = () => {
    if (displayedData.length === 0) return;
    
    const csvHeaders = ['NPSN', 'Nama Sekolah', 'Jenjang', 'Status', 'Kabupaten', 'Kecamatan', 'Siswa Pria',
    'Siswa Wanita',
    'Jumlah Siswa',
    'Guru Pria',
    'Guru Wanita',
    'Jumlah Guru',
                        'Kelengkapan', 'Validitas', 'Mutakhir', 'Total', 'Nilai Prediksi', 'Kategori', 'Score'];
    
    const csvRows = displayedData.map(item => [
      item.npsn,
      `"${item.nama}"`,
      item.jenjang,
      item.status_sekolah,
      item.kabupaten,
      item.kecamatan,
      item.siswa_pria || 0,
    item.siswa_wanita || 0,
    item.jumlah_siswa || 0,
    item.guru_pria || 0,
    item.guru_wanita || 0,
    item.jumlah_guru || 0,
      item.kelengkapan.toFixed(1),
      item.validitas.toFixed(1),
      item.mutakhir.toFixed(1),
      item.total.toFixed(1),
      item.prediction?.nilai || 0,
      item.prediction?.kategori || 'Error',
      item.prediction?.score || 'E'
    ]);
    
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `prediksi_ai_${new Date().getTime()}.csv`;
    link.click();
    
    console.log('📥 CSV exported successfully');
  };

  const showDetail = (item) => {
    const detailMessage = `
 DETAIL PREDIKSI AI FUZZY MAMDANI
=================================

📊 DATA INPUT:
• Kelengkapan: ${item.kelengkapan.toFixed(1)}%
• Validitas: ${item.validitas.toFixed(1)}%
• Mutakhir: ${item.mutakhir.toFixed(1)}%
• Total: ${item.total.toFixed(1)}%

👨‍🎓 DATA SISWA:
• Siswa Pria: ${item.siswa_pria?.toLocaleString() || '0'} orang
• Siswa Wanita: ${item.siswa_wanita?.toLocaleString() || '0'} orang
• Jumlah Siswa: ${item.jumlah_siswa?.toLocaleString() || '0'} orang

👨‍🏫 DATA GURU:
• Guru Pria: ${item.guru_pria?.toLocaleString() || '0'} orang
• Guru Wanita: ${item.guru_wanita?.toLocaleString() || '0'} orang
• Jumlah Guru: ${item.jumlah_guru?.toLocaleString() || '0'} orang

🎯 HASIL PREDIKSI:
• Kategori: ${item.prediction?.kategori || 'Error'}
• Score: ${item.prediction?.score || 'N/A'}

🏫 INFORMASI SEKOLAH:
• Nama: ${item.nama}
• NPSN: ${item.npsn}
• Jenjang: ${item.jenjang}
• Status: ${item.status_sekolah}
• Lokasi: ${item.kecamatan}, ${item.kabupaten}

📈 SISTEM FUZZY MAMDANI:
Algoritma ini menganalisis 4 parameter menggunakan logika fuzzy dan aturan IF-THEN untuk menghasilkan prediksi yang akurat dan dapat dijelaskan.
    `;
    
    alert(detailMessage);
  };

  // PERBAIKAN: canPredict - BISA BERDASARKAN FILTER ATAU SEKOLAH TERPILIH
  const hasActiveFilters = () => {
    return filters.jenjang !== 'all' || 
           filters.kabupaten !== 'all' || 
           filters.kecamatan !== 'all' || 
           filters.status_sekolah !== 'all';
  };

  const canPredict = hasActiveFilters() || selectedSchool;

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'negeri': return 'status-negeri';
      case 'swasta': return 'status-swasta';
      default: return 'status-default';
    }
  };

  const kabupatenOptions = [
    { value: 'all', label: 'Semua Kabupaten/Kota' },
    ...(filterOptions.kabupaten
      .filter(kab => kab !== 'all')
      .sort()
      .map(kab => ({ value: kab, label: kab }))
    )
  ];

  const kecamatanOptions = [
    { value: 'all', label: 'Semua Kecamatan' },
    ...(filters.kabupaten !== 'all' 
      ? filterOptions.kecamatan
          .filter(kec => kec !== 'all')
          .sort()
          .map(kec => ({ value: kec, label: kec }))
      : []
    )
  ];

  const displayStats = filteredStats || stats;

  return (
    <div className="ai-prediction">
      {/* Back Button */}
      <button className="back-button" onClick={handleNavigateBack}>
        ← Kembali ke Dashboard
      </button>

      <div className="charts-container">
        {/* Header */}
        <div className="charts-header">
          <h1 className="charts-title"> Prediksi Dapodik Dengan AI</h1>
          <p className="charts-subtitle">
            Analisis Kualitas Dapodik Se-Jawa Tengah.
          </p>
        </div>

        {/* Statistics Cards */}
        {displayStats && (
          <div className="stats-section">
            <h3 className="stats-title">
              {filteredStats ? ' Statistik Data Filter' : ' Statistik Keseluruhan'}
            </h3>
            <div className="stats-grid">
              <div className="stat-card modern-card">
                <div className="stat-icon"></div>
                <div className="stat-value">{displayStats.total_sekolah?.toLocaleString() || 0}</div>
                <div className="stat-label">Total Sekolah</div>
              </div>
              <div className="stat-card modern-card">
                <div className="stat-icon"></div>
                <div className="stat-value">{displayStats.rata_rata?.kelengkapan || 0}%</div>
                <div className="stat-label">Rata-rata Kelengkapan</div>
              </div>
              <div className="stat-card modern-card">
                <div className="stat-icon"></div>
                <div className="stat-value">{displayStats.rata_rata?.validitas || 0}%</div>
                <div className="stat-label">Rata-rata Validitas</div>
              </div>
              <div className="stat-card modern-card">
                <div className="stat-icon"></div>
                <div className="stat-value">{displayStats.rata_rata?.mutakhir || 0}%</div>
                <div className="stat-label">Rata-rata Mutakhir</div>
              </div>
              <div className="stat-card modern-card highlight">
                <div className="stat-icon"></div>
                <div className="stat-value">{displayStats.rata_rata?.total || 0}%</div>
                <div className="stat-label">Rata-rata Total</div>
              </div>
            </div>
            {filteredStats && (
              <div className="stats-note">
                📍 Menampilkan statistik berdasarkan filter yang dipilih
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {/* Filters Section dengan PENCARIAN TERPISAH */}
        <div className="filters-section modern-card">
          <h3 className="filters-title">Filter Data untuk Prediksi AI</h3>
          
          {/* Search Box yang DIPISAH dari Filter */}
          <div className="search-cari">
            <div className="search-group">
              <label className="filter-label">
                 Cari Sekolah Spesifik 
                {selectedSchool && <span className="selected-indicator"> ✓ Terpilih</span>}
              </label>
              <div className="search-input-container">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Ketik nama sekolah atau NPSN..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
                {searchLoading && (
                  <div className="search-loading">⏳ Mencari...</div>
                )}
                {showSearchResults && searchResults.length > 0 && (
                  <div className="search-results">
                    {searchResults.map(sekolah => (
                      <div 
                        key={sekolah.npsn}
                        className="search-result-item"
                        onClick={() => selectSearchResult(sekolah)}
                      >
                        <div className="search-result-name">{sekolah.nama}</div>
                        <div className="search-result-details">
                          {sekolah.npsn} • {sekolah.jenjang} • {sekolah.status_sekolah} • {sekolah.kabupaten}
                        </div>
                      </div>
                    ))}
                    {searchResults.length >= 5 && (
                      <div className="search-result-more">
                        🔍 Tampilkan 5 hasil pertama. Perbaiki pencarian untuk hasil lebih spesifik.
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="search-hint">
                ⓘ Contoh: "sd negeri kalisogra", "12345678" (NPSN)
              </div>
              
              {/* Info sekolah yang terpilih */}
              {selectedSchool && (
                <div className="selected-school-info">
                  <div className="selected-school-card">
                    <div className="selected-school-header">
                      <span className="selected-badge">✓ SEKOLAH DIPILIH</span>
                    </div>
                    <div className="selected-school-details">
                      <strong>{selectedSchool.nama}</strong>
                      <div>NPSN: {selectedSchool.npsn} • {selectedSchool.jenjang} • {selectedSchool.status_sekolah}</div>
                      <div>Lokasi: {selectedSchool.kecamatan}, {selectedSchool.kabupaten}</div>
                    </div>
                    <button 
                      className="clear-selection"
                      onClick={() => {
                        setSelectedSchool(null);
                        setSearchQuery('');
                      }}
                    >
                      ✕ Hapus Pilihan
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Filter untuk prediksi batch */}
          <div className="filter-section-divider">
            <span>ATAU Prediksi Berdasarkan Filter</span>
          </div>

          <div className="filter-grid">
            <div className="filter-group">
              <label className="filter-label"> Jenjang Pendidikan</label>
              <select 
                className="filter-select"
                value={filters.jenjang}
                onChange={(e) => handleFilterChange('jenjang', e.target.value)}
              >
                {jenjangOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label"> Kabupaten/Kota</label>
              <select 
                className="filter-select"
                value={filters.kabupaten}
                onChange={(e) => handleFilterChange('kabupaten', e.target.value)}
              >
                {kabupatenOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label"> Kecamatan</label>
              <select 
                className="filter-select"
                value={filters.kecamatan}
                onChange={(e) => handleFilterChange('kecamatan', e.target.value)}
                disabled={filters.kabupaten === 'all'}
              >
                {kecamatanOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {filters.kabupaten === 'all' && (
                <div className="filter-hint">Pilih kabupaten terlebih dahulu</div>
              )}
            </div>

            <div className="filter-group">
              <label className="filter-label"> Status Sekolah</label>
              <select 
                className="filter-select"
                value={filters.status_sekolah}
                onChange={(e) => handleFilterChange('status_sekolah', e.target.value)}
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-actions">
            <button 
              className="filter-reset modern-button secondary"
              onClick={handleReset}
            >
              🔄 Reset Semua
            </button>
            
            <button 
              className={`predict-button modern-button primary ${!canPredict || loading || !stats ? 'disabled' : ''}`}
              onClick={handlePredict}
              disabled={!canPredict || loading || !stats}
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  🧠 Memproses AI...
                </>
              ) : selectedSchool ? (
                ` Prediksi "${selectedSchool.nama.substring(0, 20)}..."`
              ) : (
                ' Jalankan Prediksi AI'
              )}
            </button>
          </div>

          {!canPredict && (
            <div className="filter-hint-message">
              ⓘ Pilih setidaknya satu filter ATAU cari sekolah spesifik untuk menjalankan prediksi
            </div>
          )}

          {selectedSchool && (
            <div className="prediction-mode-info">
              💡 <strong>Mode Prediksi Sekolah Tunggal:</strong> Hanya <strong>"{selectedSchool.nama}"</strong> yang akan diprediksi
            </div>
          )}

          {!stats && (
            <div className="filter-hint-message">
              ⚠️ Backend tidak terhubung. Pastikan server Python berjalan di port 5000.
            </div>
          )}
        </div>

        {/* Category Distribution Stats */}
        {showResults && predictionStats && (
          <div className="category-stats modern-card">
            <h3>📊 Distribusi Hasil Prediksi</h3>
            <div className="category-grid">
              <div className="category-item" style={{borderLeft: '4px solid #10b981'}}>
                <div className="category-label">Sangat Baik (A)</div>
                <div className="category-value">{predictionStats['Sangat Baik']} sekolah</div>
              </div>
              <div className="category-item" style={{borderLeft: '4px solid #3b82f6'}}>
                <div className="category-label">Baik (B)</div>
                <div className="category-value">{predictionStats['Baik']} sekolah</div>
              </div>
              <div className="category-item" style={{borderLeft: '4px solid #f59e0b'}}>
                <div className="category-label">Cukup (C)</div>
                <div className="category-value">{predictionStats['Cukup']} sekolah</div>
              </div>
              <div className="category-item" style={{borderLeft: '4px solid #ef4444'}}>
                <div className="category-label">Kurang (D)</div>
                <div className="category-value">{predictionStats['Kurang']} sekolah</div>
              </div>
              <div className="category-item" style={{borderLeft: '4px solid #dc2626'}}>
                <div className="category-label">Sangat Kurang (E)</div>
                <div className="category-value">{predictionStats['Sangat Kurang']} sekolah</div>
              </div>
            </div>
            {selectedSchool && (
              <div className="single-prediction-note">
                💡 <strong>Mode Sekolah Tunggal:</strong> Menampilkan prediksi untuk 1 sekolah spesifik
              </div>
            )}
          </div>
        )}

        {/* Results Section */}
        {showResults && (
          <div className="prediction-results modern-card">
            <div className="results-header">
              <div>
                <h3>Hasil Prediksi AI</h3>
                <div className="results-info">
                  <span className="results-count">
                    {selectedSchool ? ' 1 sekolah diprediksi' : ` ${predictedData.length} sekolah diprediksi`}
                  </span>
                  {selectedSchool ? (
                    <span className="filter-applied">🔎 Sekolah Spesifik</span>
                  ) : (
                    <>
                      {filters.kabupaten !== 'all' && (
                        <span className="filter-applied"> {filters.kabupaten}</span>
                      )}
                      {filters.kecamatan !== 'all' && (
                        <span className="filter-applied"> {filters.kecamatan}</span>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              {/* Controls untuk limit data dan sorting */}
              <div className="results-controls">
                {/* Dropdown untuk limit data */}
                <div className="control-group">
                  <label htmlFor="dataLimit" className="control-label">Tampilkan: </label>
                  <select 
                    id="dataLimit"
                    value={dataLimit}
                    onChange={(e) => setDataLimit(Number(e.target.value))}
                    className="control-select"
                  >
                    {limitOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Dropdown untuk sorting total */}
                <div className="control-group">
                  <label htmlFor="sortTotal" className="control-label">Total: </label>
                  <select 
                    id="sortTotal"
                    value={sortByTotal}
                    onChange={(e) => setSortByTotal(e.target.value)}
                    className="control-select"
                  >
                    {sortOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <button className="export-button modern-button success" onClick={handleExportCSV}>
                  📥 Export CSV
                </button>
              </div>
            </div>

            {displayedData.length > 0 ? (
              <div className="results-table-container">
                <table className="prediction-table modern-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Nama Sekolah</th>
                      <th>Status</th>
                      <th>Jenjang</th>
                      <th>Lokasi</th>
                      <th>Siswa Pria</th>
                      <th>Siswa Wanita</th>
                      <th>Jumlah Siswa</th>
                      <th>Guru Pria</th>
                      <th>Guru Wanita</th>
                      <th>Jumlah Guru</th>
                      <th>Kelengkapan</th>
                      <th>Validitas</th>
                      <th>Mutakhir</th>
                      <th>Total {sortByTotal === 'desc' ? '↓' : '↑'}</th>
                      <th>Prediksi</th>
                      <th>Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedData.map((item, index) => (
                      <tr key={`${item.npsn}-${index}`} className="table-row">
                        <td className="number-cell">{index + 1}</td>
                        <td className="school-name">
                          <div className="school-info">
                            <div className="school-name-text">{item.nama}</div>
                            <div className="npsn-text">NPSN: {item.npsn}</div>
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${getStatusBadgeClass(item.status_sekolah)}`}>
                            {item.status_sekolah}
                          </span>
                        </td>
                        <td>
                          <span className="jenjang-badge">{item.jenjang}</span>
                        </td>
                        <td className="location-cell">
                          <div className="location-main">{item.kabupaten}</div>
                          <div className="location-sub">{item.kecamatan}</div>
                        </td>
                        <td className="number-cell">
          {item.siswa_pria || item.siswa_pria === 0 ? item.siswa_pria.toLocaleString() : '-'}
        </td>
        <td className="number-cell">
          {item.siswa_wanita || item.siswa_wanita === 0 ? item.siswa_wanita.toLocaleString() : '-'}
        </td>
        <td className="number-cell highlight">
          {item.jumlah_siswa || item.jumlah_siswa === 0 ? item.jumlah_siswa.toLocaleString() : '-'}
        </td>
        <td className="number-cell">
          {item.guru_pria || item.guru_pria === 0 ? item.guru_pria.toLocaleString() : '-'}
        </td>
        <td className="number-cell">
          {item.guru_wanita || item.guru_wanita === 0 ? item.guru_wanita.toLocaleString() : '-'}
        </td>
        <td className="number-cell highlight">
          {item.jumlah_guru || item.jumlah_guru === 0 ? item.jumlah_guru.toLocaleString() : '-'}
        </td>
                        <td className="score-cell">{item.kelengkapan.toFixed(1)}</td>
                        <td className="score-cell">{item.validitas.toFixed(1)}</td>
                        <td className="score-cell">{item.mutakhir.toFixed(1)}</td>
                        <td className="score-cell total-score">
                          <div className="total-value">{item.total.toFixed(1)}</div>
                          {index < 3 && sortByTotal === 'desc' && (
                            <div className="ranking-badge">
                              {/* {index === 0 ? '🥇 Tertinggi' : index === 1 ? '🥈' : index === 2 ? '🥉' : ''} */}
                            </div>
                          )}
                          {index < 3 && sortByTotal === 'asc' && (
                            <div className="ranking-badge lowest">
                              {/* {index === 0 ? '⚠️ Terendah' : index === 1 ? '▾' : index === 2 ? '▾' : ''} */}
                            </div>
                          )}
                        </td>
                        <td>
                          {item.prediction?.success ? (
                            <span 
                              className="prediction-badge"
                              style={{ backgroundColor: item.prediction.color }}
                            >
                              {item.prediction.score} - {item.prediction.kategori}
                            </span>
                          ) : (
                            <span className="prediction-error">Error</span>
                          )}
                        </td>
                        <td className="action-cell">
                          <button 
                            className="detail-button modern-button outline"
                            onClick={() => showDetail(item)}
                            title="Lihat detail prediksi"
                          >
                            📊 Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* Footer info */}
                <div className="table-footer">
                  <div className="footer-info">
                    <span className="footer-text">
                      Menampilkan {displayedData.length} dari {predictedData.length} data
                    </span>
                    <span className="footer-text">
                      • Urutan: {sortByTotal === 'desc' ? 'Total Tertinggi ke Terendah' : 'Total Terendah ke Tertinggi'}
                    </span>
                    <span className="footer-text">
                      • 3 data ter{sortByTotal === 'desc' ? 'tinggi' : 'rendah'} ditandai dengan badge
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-results">
                <div className="no-results-icon">🔍</div>
                <h4>Tidak ada data yang ditemukan</h4>
                <p>Coba ubah filter pencarian</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AiPrediction;