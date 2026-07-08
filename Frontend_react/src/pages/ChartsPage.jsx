import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import './ChartsPage.css';

const ChartsPage = ({ sekolahData = [] }) => {
  const navigate = useNavigate();
  
  // State untuk filter
  const [filters, setFilters] = useState({
    jenjang: 'all',
    kabupaten: 'all',
    kecamatan: 'all',
    status: 'all'
  });
  
  // State untuk chart type
  const [activeChart, setActiveChart] = useState('distribusi');
  
  // State untuk chart visualization type
  const [chartVisualization, setChartVisualization] = useState('card');
  
  // Data state
  const [processedData, setProcessedData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // Data options untuk dropdown
  const jenjangOptions = [
    { value: 'all', label: 'Semua Jenjang' },
    { value: 'paud', label: 'TK/PAUD' },
    { value: 'sd', label: 'SD/MI' },
    { value: 'smp', label: 'SMP/MTS' },
    { value: 'sma', label: 'SMA/MA' },
  ];

  const statusOptions = [
    { value: 'all', label: 'Semua Status' },
    { value: 'negeri', label: 'Negeri' },
    { value: 'swasta', label: 'Swasta' }
  ];

  // Generate kabupaten options dari data
  const kabupatenOptions = [
    { value: 'all', label: 'Semua Kabupaten/Kota' },
    ...(sekolahData.length > 0 
      ? [...new Set(sekolahData.map(item => item.kabupaten).filter(Boolean))]
          .sort()
          .map(kab => ({ value: kab, label: kab }))
      : [])
  ];

  // Generate kecamatan options berdasarkan kabupaten yang dipilih
  const kecamatanOptions = [
    { value: 'all', label: 'Semua Kecamatan' },
    ...(filters.kabupaten !== 'all' && sekolahData.length > 0
      ? [...new Set(sekolahData
          .filter(item => item.kabupaten === filters.kabupaten)
          .map(item => item.kecamatan)
          .filter(Boolean))]
          .sort()
          .map(kec => ({ value: kec, label: kec }))
      : [])
  ];

  // Chart types - DIPISAH: Jumlah Siswa dan Jumlah Guru terpisah
  const chartTypes = [
    { id: 'distribusi', label: 'Distribusi Sekolah', icon: '📊' },
    { id: 'status', label: 'Status Sekolah', icon: '🏫' },
    { id: 'kecamatan', label: 'Per Kab/Kec', icon: '🗺️' },
    { id: 'jumlah_siswa', label: 'Jumlah Siswa', icon: '👨‍🎓' },
    { id: 'jumlah_guru', label: 'Jumlah Guru', icon: '👨‍🏫' },
  ];

  // Chart visualization types
  const visualizationTypes = [
    { id: 'card', label: 'Card View', icon: '🃏' },
    { id: 'bar', label: 'Bar Chart', icon: '📈' },
    { id: 'pie', label: 'Pie Chart', icon: '🥧' },
  ];

  // Process data ketika sekolahData atau filter berubah
  useEffect(() => {
    if (sekolahData.length > 0) {
      processData();
    } else {
      setLoading(false);
    }
  }, [sekolahData, filters]);

  // Fungsi untuk menghitung total siswa dan guru dari data
  const calculateTotals = () => {
    const filteredData = sekolahData.filter(sekolah => {
      const matchesJenjang = filters.jenjang === 'all' || 
        (sekolah.jenjang && sekolah.jenjang.includes(filters.jenjang));
      
      const matchesKabupaten = filters.kabupaten === 'all' || 
        sekolah.kabupaten === filters.kabupaten;
      
      const matchesKecamatan = filters.kecamatan === 'all' || 
        sekolah.kecamatan === filters.kecamatan;
      
      const matchesStatus = filters.status === 'all' || 
        (sekolah.status_sekolah && sekolah.status_sekolah.toLowerCase() === filters.status);

      return matchesJenjang && matchesKabupaten && matchesKecamatan && matchesStatus;
    });

    // Hitung total siswa dan guru
    const totalSiswa = filteredData.reduce((sum, sekolah) => {
      // Coba beberapa kemungkinan nama kolom untuk siswa
      const siswaPria = sekolah.siswa_pria || sekolah.siswa_laki || 0;
      const siswaWanita = sekolah.siswa_perempuan || sekolah.siswa_wanita || 0;
      const totalSiswa = sekolah.total_siswa || siswaPria + siswaWanita;
      return sum + (parseInt(totalSiswa) || 0);
    }, 0);

    const totalGuru = filteredData.reduce((sum, sekolah) => {
      // Coba beberapa kemungkinan nama kolom untuk guru
      const guruPria = sekolah.guru_pria || sekolah.guru_laki || 0;
      const guruWanita = sekolah.guru_perempuan || sekolah.guru_wanita || 0;
      const totalGuru = sekolah.total_guru || guruPria + guruWanita;
      return sum + (parseInt(totalGuru) || 0);
    }, 0);

    return { totalSiswa, totalGuru };
  };

  const processData = () => {
    setLoading(true);
    
    try {
      // Filter data berdasarkan kriteria
      const filteredData = sekolahData.filter(sekolah => {
        const matchesJenjang = filters.jenjang === 'all' || 
          (sekolah.jenjang && sekolah.jenjang.includes(filters.jenjang));
        
        const matchesKabupaten = filters.kabupaten === 'all' || 
          sekolah.kabupaten === filters.kabupaten;
        
        const matchesKecamatan = filters.kecamatan === 'all' || 
          sekolah.kecamatan === filters.kecamatan;
        
        const matchesStatus = filters.status === 'all' || 
          (sekolah.status_sekolah && sekolah.status_sekolah.toLowerCase() === filters.status);

        return matchesJenjang && matchesKabupaten && matchesKecamatan && matchesStatus;
      });

      // Hitung statistics
      const totalSekolah = filteredData.length;
      const sekolahNegeri = filteredData.filter(s => s.status_sekolah === 'Negeri').length;
      const sekolahSwasta = filteredData.filter(s => s.status_sekolah === 'Swasta').length;
      
      // Hitung total siswa dan guru menggunakan fungsi yang sudah dibuat
      const { totalSiswa, totalGuru } = calculateTotals();
      
      // Hitung rata-rata siswa dan guru per sekolah
      const rataSiswaPerSekolah = totalSekolah > 0 ? (totalSiswa / totalSekolah).toFixed(1) : 0;
      const rataGuruPerSekolah = totalSekolah > 0 ? (totalGuru / totalSekolah).toFixed(1) : 0;
      
      // Hitung rasio siswa per guru
      const rasioSiswaGuru = totalGuru > 0 ? (totalSiswa / totalGuru).toFixed(1) : 0;

      // Hitung per jenjang (jumlah sekolah)
      const jenjangCount = {};
      // Hitung per jenjang (jumlah siswa)
      const jenjangSiswa = {};
      // Hitung per jenjang (jumlah guru)
      const jenjangGuru = {};
      
      filteredData.forEach(sekolah => {
        const jenjang = sekolah.jenjang || 'Tidak Diketahui';
        jenjangCount[jenjang] = (jenjangCount[jenjang] || 0) + 1;
        
        // Hitung siswa untuk jenjang ini
        const siswaPria = sekolah.siswa_pria || sekolah.siswa_laki || 0;
        const siswaWanita = sekolah.siswa_perempuan || sekolah.siswa_wanita || 0;
        const totalSiswaJenjang = sekolah.total_siswa || siswaPria + siswaWanita;
        jenjangSiswa[jenjang] = (jenjangSiswa[jenjang] || 0) + (parseInt(totalSiswaJenjang) || 0);
        
        // Hitung guru untuk jenjang ini
        const guruPria = sekolah.guru_pria || sekolah.guru_laki || 0;
        const guruWanita = sekolah.guru_perempuan || sekolah.guru_wanita || 0;
        const totalGuruJenjang = sekolah.total_guru || guruPria + guruWanita;
        jenjangGuru[jenjang] = (jenjangGuru[jenjang] || 0) + (parseInt(totalGuruJenjang) || 0);
      });

      // Hitung per kabupaten (jumlah sekolah)
      const kabupatenCount = {};
      // Hitung per kabupaten (jumlah siswa)
      const kabupatenSiswa = {};
      // Hitung per kabupaten (jumlah guru)
      const kabupatenGuru = {};
      
      filteredData.forEach(sekolah => {
        const kabupaten = sekolah.kabupaten || 'Tidak Diketahui';
        kabupatenCount[kabupaten] = (kabupatenCount[kabupaten] || 0) + 1;
        
        // Hitung siswa untuk kabupaten ini
        const siswaPria = sekolah.siswa_pria || sekolah.siswa_laki || 0;
        const siswaWanita = sekolah.siswa_perempuan || sekolah.siswa_wanita || 0;
        const totalSiswaKab = sekolah.total_siswa || siswaPria + siswaWanita;
        kabupatenSiswa[kabupaten] = (kabupatenSiswa[kabupaten] || 0) + (parseInt(totalSiswaKab) || 0);
        
        // Hitung guru untuk kabupaten ini
        const guruPria = sekolah.guru_pria || sekolah.guru_laki || 0;
        const guruWanita = sekolah.guru_perempuan || sekolah.guru_wanita || 0;
        const totalGuruKab = sekolah.total_guru || guruPria + guruWanita;
        kabupatenGuru[kabupaten] = (kabupatenGuru[kabupaten] || 0) + (parseInt(totalGuruKab) || 0);
      });

      // Hitung per kecamatan (jika kabupaten dipilih)
      const kecamatanCount = {};
      const kecamatanSiswa = {};
      const kecamatanGuru = {};
      
      if (filters.kabupaten !== 'all') {
        filteredData.forEach(sekolah => {
          const kecamatan = sekolah.kecamatan || 'Tidak Diketahui';
          kecamatanCount[kecamatan] = (kecamatanCount[kecamatan] || 0) + 1;
          
          // Hitung siswa untuk kecamatan ini
          const siswaPria = sekolah.siswa_pria || sekolah.siswa_laki || 0;
          const siswaWanita = sekolah.siswa_perempuan || sekolah.siswa_wanita || 0;
          const totalSiswaKec = sekolah.total_siswa || siswaPria + siswaWanita;
          kecamatanSiswa[kecamatan] = (kecamatanSiswa[kecamatan] || 0) + (parseInt(totalSiswaKec) || 0);
          
          // Hitung guru untuk kecamatan ini
          const guruPria = sekolah.guru_pria || sekolah.guru_laki || 0;
          const guruWanita = sekolah.guru_perempuan || sekolah.guru_wanita || 0;
          const totalGuruKec = sekolah.total_guru || guruPria + guruWanita;
          kecamatanGuru[kecamatan] = (kecamatanGuru[kecamatan] || 0) + (parseInt(totalGuruKec) || 0);
        });
      }

      // Hitung status siswa dan guru
      const statusSiswa = {
        'Negeri': filteredData
          .filter(s => s.status_sekolah === 'Negeri')
          .reduce((sum, sekolah) => {
            const siswaPria = sekolah.siswa_pria || sekolah.siswa_laki || 0;
            const siswaWanita = sekolah.siswa_perempuan || sekolah.siswa_wanita || 0;
            const totalSiswa = sekolah.total_siswa || siswaPria + siswaWanita;
            return sum + (parseInt(totalSiswa) || 0);
          }, 0),
        'Swasta': filteredData
          .filter(s => s.status_sekolah === 'Swasta')
          .reduce((sum, sekolah) => {
            const siswaPria = sekolah.siswa_pria || sekolah.siswa_laki || 0;
            const siswaWanita = sekolah.siswa_perempuan || sekolah.siswa_wanita || 0;
            const totalSiswa = sekolah.total_siswa || siswaPria + siswaWanita;
            return sum + (parseInt(totalSiswa) || 0);
          }, 0)
      };
      
      const statusGuru = {
        'Negeri': filteredData
          .filter(s => s.status_sekolah === 'Negeri')
          .reduce((sum, sekolah) => {
            const guruPria = sekolah.guru_pria || sekolah.guru_laki || 0;
            const guruWanita = sekolah.guru_perempuan || sekolah.guru_wanita || 0;
            const totalGuru = sekolah.total_guru || guruPria + guruWanita;
            return sum + (parseInt(totalGuru) || 0);
          }, 0),
        'Swasta': filteredData
          .filter(s => s.status_sekolah === 'Swasta')
          .reduce((sum, sekolah) => {
            const guruPria = sekolah.guru_pria || sekolah.guru_laki || 0;
            const guruWanita = sekolah.guru_perempuan || sekolah.guru_wanita || 0;
            const totalGuru = sekolah.total_guru || guruPria + guruWanita;
            return sum + (parseInt(totalGuru) || 0);
          }, 0)
      };

      // Set statistics
      setStats({
        totalSekolah,
        sekolahNegeri,
        sekolahSwasta,
        persentaseNegeri: totalSekolah > 0 ? ((sekolahNegeri / totalSekolah) * 100).toFixed(1) : 0,
        persentaseSwasta: totalSekolah > 0 ? ((sekolahSwasta / totalSekolah) * 100).toFixed(1) : 0,
        totalSiswa,
        totalGuru,
        rataSiswaPerSekolah,
        rataGuruPerSekolah,
        rasioSiswaGuru
      });

      // Set processed data untuk charts
      setProcessedData({
        jenjang: {
          labels: Object.keys(jenjangCount),
          data: Object.values(jenjangCount), // jumlah sekolah
          siswa: Object.values(jenjangSiswa), // jumlah siswa
          guru: Object.values(jenjangGuru),   // jumlah guru
          colors: generateColors(Object.keys(jenjangCount).length),
        },
        kabupaten: {
          labels: Object.keys(kabupatenCount),
          data: Object.values(kabupatenCount), // jumlah sekolah
          siswa: Object.values(kabupatenSiswa), // jumlah siswa
          guru: Object.values(kabupatenGuru),   // jumlah guru
          colors: generateColors(Object.keys(kabupatenCount).length),
        },
        kecamatan: {
          labels: Object.keys(kecamatanCount),
          data: Object.values(kecamatanCount), // jumlah sekolah
          siswa: Object.values(kecamatanSiswa), // jumlah siswa
          guru: Object.values(kecamatanGuru),   // jumlah guru
          colors: generateColors(Object.keys(kecamatanCount).length),
        },
        status: {
          labels: ['Negeri', 'Swasta'],
          data: [sekolahNegeri, sekolahSwasta], // jumlah sekolah
          siswa: [statusSiswa.Negeri, statusSiswa.Swasta], // jumlah siswa
          guru: [statusGuru.Negeri, statusGuru.Swasta],   // jumlah guru
          colors: ['#3498db', '#e74c3c']
        }
      });

    } catch (error) {
      console.error('Error processing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateColors = (count) => {
    const colors = [];
    for (let i = 0; i < count; i++) {
      const hue = (i * 137.5) % 360; // Golden angle approximation
      colors.push(`hsl(${hue}, 70%, 65%)`);
    }
    return colors;
  };

  // Fungsi untuk export ke Excel
  const exportToExcel = () => {
    try {
      // Filter data berdasarkan kriteria yang aktif
      const filteredData = sekolahData.filter(sekolah => {
        if (!sekolah) return false;
        
        const matchesJenjang = filters.jenjang === 'all' || 
          (sekolah.jenjang && sekolah.jenjang.toLowerCase().includes(filters.jenjang.toLowerCase()));
        
        const matchesKabupaten = filters.kabupaten === 'all' || 
          sekolah.kabupaten === filters.kabupaten;
        
        const matchesKecamatan = filters.kecamatan === 'all' || 
          sekolah.kecamatan === filters.kecamatan;
        
        const matchesStatus = filters.status === 'all' || 
          (sekolah.status_sekolah && sekolah.status_sekolah.toLowerCase() === filters.status);

        return matchesJenjang && matchesKabupaten && matchesKecamatan && matchesStatus;
      });

      // Jika tidak ada data, tampilkan alert
      if (filteredData.length === 0) {
        alert('Tidak ada data untuk di-export');
        setExportMenuOpen(false);
        return;
      }

      // Siapkan data untuk Excel dengan data siswa dan guru
      const excelData = filteredData.map(item => {
        // Ambil data siswa
        const siswaPria = item.siswa_pria || item.siswa_laki || 0;
        const siswaWanita = item.siswa_perempuan || item.siswa_wanita || 0;
        const totalSiswa = item.total_siswa || siswaPria + siswaWanita;
        
        // Ambil data guru
        const guruPria = item.guru_pria || item.guru_laki || 0;
        const guruWanita = item.guru_perempuan || item.guru_wanita || 0;
        const totalGuru = item.total_guru || guruPria + guruWanita;
        
        // Hitung rasio siswa/guru
        const rasioSiswaGuru = totalGuru > 0 ? (totalSiswa / totalGuru).toFixed(2) : '-';
        
        return {
          'NPSN': item.npsn || '-',
          'Nama Sekolah': item.nama || '-',
          'Jenjang': item.jenjang || '-',
          'Status': item.status_sekolah || '-',
          'Kabupaten': item.kabupaten || '-',
          'Kecamatan': item.kecamatan || '-',
          'Jumlah Siswa': parseInt(totalSiswa) || 0,
          'Jumlah Guru': parseInt(totalGuru) || 0,
          'Rasio Siswa/Guru': rasioSiswaGuru,
          'Alamat': item.desa_kelurahan || '-',
          'Email': item.email || '-',
          'Telepon': item.telepon || '-'
        };
      });

      // Buat workbook baru
      const wb = XLSX.utils.book_new();
      
      // Buat worksheet dari data
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // Atur lebar kolom
      const colWidths = [
        { wch: 15 }, // NPSN
        { wch: 30 }, // Nama Sekolah
        { wch: 12 }, // Jenjang
        { wch: 12 }, // Status
        { wch: 20 }, // Kabupaten
        { wch: 20 }, // Kecamatan
        { wch: 12 }, // Jumlah Siswa
        { wch: 12 }, // Jumlah Guru
        { wch: 15 }, // Rasio Siswa/Guru
        { wch: 40 }, // Alamat
        { wch: 25 }, // Email
        { wch: 15 }  // Telepon
      ];
      ws['!cols'] = colWidths;

      // Tambahkan worksheet ke workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Data Sekolah');

      // Buat worksheet untuk summary
      const summaryData = [
        ['LAPORAN DATA SEKOLAH'],
        [''],
        ['FILTER YANG DIGUNAKAN'],
        ['Jenjang', jenjangOptions.find(j => j.value === filters.jenjang)?.label || 'Semua'],
        ['Kabupaten', filters.kabupaten === 'all' ? 'Semua' : filters.kabupaten],
        ['Kecamatan', filters.kecamatan === 'all' ? 'Semua' : filters.kecamatan],
        ['Status', statusOptions.find(s => s.value === filters.status)?.label || 'Semua'],
        [''],
        ['STATISTIK UTAMA'],
        ['Total Sekolah', stats?.totalSekolah || 0],
        ['Sekolah Negeri', stats?.sekolahNegeri || 0],
        ['Sekolah Swasta', stats?.sekolahSwasta || 0],
        ['Total Siswa', stats?.totalSiswa?.toLocaleString() || 0],
        ['Total Guru', stats?.totalGuru?.toLocaleString() || 0],
        ['Rata Siswa per Sekolah', stats?.rataSiswaPerSekolah || 0],
        ['Rata Guru per Sekolah', stats?.rataGuruPerSekolah || 0],
        ['Rasio Siswa per Guru', stats?.rasioSiswaGuru || 0],
        [''],
        ['Dibuat pada', new Date().toLocaleString('id-ID')]
      ];

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      
      // Atur lebar kolom untuk summary
      wsSummary['!cols'] = [
        { wch: 25 }, { wch: 30 }
      ];

      XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');

      // Generate filename
      const filename = `Data_Sekolah_${filters.jenjang === 'all' ? 'Semua' : filters.jenjang}_${filters.kabupaten === 'all' ? 'Semua' : filters.kabupaten}_${new Date().getTime()}.xlsx`;

      // Export ke file Excel
      XLSX.writeFile(wb, filename);
      
      setExportMenuOpen(false);
      
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Terjadi error saat export data Excel. Silakan coba lagi.');
      setExportMenuOpen(false);
    }
  };

  // Fungsi untuk export ke PDF
  const exportToPDF = () => {
    try {
      if (!processedData || !stats) {
        alert('Tidak ada data untuk di-export');
        setExportMenuOpen(false);
        return;
      }

      const chartData = getChartData();
      let total = 0;
      let dataType = 'sekolah';

      // Tentukan total berdasarkan chart yang aktif
      if (activeChart === 'distribusi' || activeChart === 'status' || activeChart === 'kecamatan') {
        total = chartData.data.reduce((sum, value) => sum + value, 0);
        dataType = 'sekolah';
      } else if (activeChart === 'jumlah_siswa') {
        total = stats.totalSiswa;
        dataType = 'siswa';
      } else if (activeChart === 'jumlah_guru') {
        total = stats.totalGuru;
        dataType = 'guru';
      }

      if (total === 0) {
        alert('Tidak ada data untuk di-export');
        setExportMenuOpen(false);
        return;
      }

      // Buat konten HTML untuk PDF
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Laporan Data Sekolah</title>
          <style>
            body { 
              font-family: 'Arial', sans-serif; 
              margin: 25px; 
              color: #333;
              line-height: 1.4;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px;
              border-bottom: 3px solid #667eea;
              padding-bottom: 20px;
            }
            .header h1 { 
              color: #667eea; 
              margin: 0;
              font-size: 28px;
            }
            .header .subtitle {
              color: #666;
              font-size: 16px;
              margin-top: 5px;
            }
            .section { 
              margin-bottom: 25px; 
            }
            .section h2 { 
              color: #2d3748; 
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 8px;
              font-size: 20px;
              margin-bottom: 15px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 20px;
            }
            .info-card {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
              border-left: 4px solid #667eea;
            }
            .info-card h3 {
              margin: 0 0 10px 0;
              color: #2d3748;
              font-size: 16px;
            }
            .info-card p {
              margin: 5px 0;
              font-size: 14px;
            }
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin: 20px 0;
            }
            .stat-item {
              background: #f1f3f4;
              padding: 15px;
              border-radius: 8px;
              text-align: center;
            }
            .stat-value {
              font-size: 20px;
              font-weight: bold;
              color: #667eea;
            }
            .stat-label {
              font-size: 12px;
              color: #666;
              margin-top: 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
              font-size: 14px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: left;
            }
            th {
              background-color: #667eea;
              color: white;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f8f9fa;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              color: #666;
              font-size: 12px;
              border-top: 1px solid #ddd;
              padding-top: 15px;
            }
            @media print {
              body { margin: 15px; }
              .header { margin-bottom: 20px; }
              .section { margin-bottom: 20px; }
              .stats-grid { grid-template-columns: repeat(2, 1fr); }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>LAPORAN DATA SEKOLAH</h1>
            <div class="subtitle">Dashboard Statistik Sekolah - ${chartTypes.find(chart => chart.id === activeChart)?.label}</div>
          </div>

          <div class="info-grid">
            <div class="info-card">
              <h3>Filter yang Digunakan</h3>
              <p><strong>Jenjang:</strong> ${filters.jenjang === 'all' ? 'Semua' : jenjangOptions.find(j => j.value === filters.jenjang)?.label}</p>
              <p><strong>Kabupaten:</strong> ${filters.kabupaten === 'all' ? 'Semua' : filters.kabupaten}</p>
              <p><strong>Kecamatan:</strong> ${filters.kecamatan === 'all' ? 'Semua' : filters.kecamatan}</p>
              <p><strong>Status:</strong> ${filters.status === 'all' ? 'Semua' : statusOptions.find(s => s.value === filters.status)?.label}</p>
            </div>
            
            <div class="info-card">
              <h3>Ringkasan Statistik</h3>
              ${activeChart === 'jumlah_siswa' ? `<p><strong>Total Siswa:</strong> ${stats.totalSiswa.toLocaleString()}</p>` : ''}
              ${activeChart === 'jumlah_guru' ? `<p><strong>Total Guru:</strong> ${stats.totalGuru.toLocaleString()}</p>` : ''}
              <p><strong>Total Sekolah:</strong> ${stats.totalSekolah.toLocaleString()}</p>
              <p><strong>Sekolah Negeri:</strong> ${stats.sekolahNegeri.toLocaleString()} (${stats.persentaseNegeri}%)</p>
              <p><strong>Sekolah Swasta:</strong> ${stats.sekolahSwasta.toLocaleString()} (${stats.persentaseSwasta}%)</p>
              <p><strong>Tanggal:</strong> ${new Date().toLocaleDateString('id-ID')}</p>
            </div>
          </div>

          <div class="section">
            <h2>${chartTypes.find(chart => chart.id === activeChart)?.label}</h2>
            <table>
              <thead>
                <tr>
                  <th>Kategori</th>
                  ${activeChart === 'distribusi' || activeChart === 'status' || activeChart === 'kecamatan' 
                    ? '<th>Jumlah Sekolah</th><th>Persentase</th>'
                    : activeChart === 'jumlah_siswa'
                    ? '<th>Jumlah Siswa</th><th>Persentase</th>'
                    : '<th>Jumlah Guru</th><th>Persentase</th>'}
                </tr>
              </thead>
              <tbody>
                ${chartData.labels.map((label, index) => {
                  let value = 0;
                  if (activeChart === 'distribusi' || activeChart === 'status' || activeChart === 'kecamatan') {
                    value = chartData.data[index] || 0;
                  } else if (activeChart === 'jumlah_siswa') {
                    value = chartData.siswa ? chartData.siswa[index] : 0;
                  } else if (activeChart === 'jumlah_guru') {
                    value = chartData.guru ? chartData.guru[index] : 0;
                  }
                  
                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                  
                  return `
                    <tr>
                      <td>${label}</td>
                      <td>${value.toLocaleString()}</td>
                      <td>${percentage}%</td>
                    </tr>
                  `;
                }).join('')}
                <tr style="background-color: #e8f4fd; font-weight: bold;">
                  <td>TOTAL</td>
                  <td>${total.toLocaleString()}</td>
                  <td>100%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="footer">
            <p>Dibuat secara otomatis oleh Sistem Dashboard Sekolah</p>
            <p>${new Date().toLocaleString('id-ID', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
        </body>
        </html>
      `;

      // Buka window baru untuk print
      const printWindow = window.open('', '_blank');
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Tunggu konten load lalu print
      printWindow.onload = function() {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
      
      setExportMenuOpen(false);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Terjadi error saat export PDF. Silakan coba lagi.');
      setExportMenuOpen(false);
    }
  };

  // Fungsi export JSON
  const exportData = () => {
    try {
      const dataToExport = {
        filters,
        statistics: stats,
        chartData: processedData ? getChartData() : null,
        timestamp: new Date().toISOString(),
        totalRecords: stats?.totalSekolah || 0
      };
      
      const dataStr = JSON.stringify(dataToExport, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `data-sekolah-${new Date().getTime()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setExportMenuOpen(false);
    } catch (error) {
      console.error('Error exporting JSON:', error);
      alert('Terjadi error saat export JSON. Silakan coba lagi.');
      setExportMenuOpen(false);
    }
  };

  // Helper function untuk mendapatkan chart data
  const getChartData = () => {
    if (!processedData) return { labels: [], data: [], siswa: [], guru: [] };
    
    // Tentukan data mana yang akan ditampilkan berdasarkan chart yang aktif
    let baseData;
    if (filters.kabupaten !== 'all') {
      baseData = processedData.kecamatan;
    } else {
      baseData = processedData.jenjang;
    }

    switch (activeChart) {
      case 'distribusi':
        return {
          labels: processedData.jenjang.labels,
          data: processedData.jenjang.data,
          siswa: processedData.jenjang.siswa,
          guru: processedData.jenjang.guru,
          colors: processedData.jenjang.colors
        };
      case 'status':
        return {
          labels: processedData.status.labels,
          data: processedData.status.data,
          siswa: processedData.status.siswa,
          guru: processedData.status.guru,
          colors: processedData.status.colors
        };
      case 'kecamatan':
        return filters.kabupaten !== 'all' 
          ? {
              labels: processedData.kecamatan.labels,
              data: processedData.kecamatan.data,
              siswa: processedData.kecamatan.siswa,
              guru: processedData.kecamatan.guru,
              colors: processedData.kecamatan.colors
            }
          : {
              labels: processedData.kabupaten.labels,
              data: processedData.kabupaten.data,
              siswa: processedData.kabupaten.siswa,
              guru: processedData.kabupaten.guru,
              colors: processedData.kabupaten.colors
            };
      case 'jumlah_siswa':
        // Hanya tampilkan data siswa
        return {
          labels: baseData.labels,
          data: baseData.siswa, // Data siswa
          siswa: baseData.siswa,
          guru: baseData.guru,
          colors: baseData.colors
        };
      case 'jumlah_guru':
        // Hanya tampilkan data guru
        return {
          labels: baseData.labels,
          data: baseData.guru, // Data guru
          siswa: baseData.siswa,
          guru: baseData.guru,
          colors: baseData.colors
        };
      default:
        return {
          labels: processedData.jenjang.labels,
          data: processedData.jenjang.data,
          siswa: processedData.jenjang.siswa,
          guru: processedData.jenjang.guru,
          colors: processedData.jenjang.colors
        };
    }
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [filterName]: value };
      
      // Reset kecamatan jika kabupaten berubah
      if (filterName === 'kabupaten' && value === 'all') {
        newFilters.kecamatan = 'all';
      }
      
      return newFilters;
    });
  };

  const handleBackToMap = () => {
    navigate('/map');
  };

  // Render Card View - DIPISAH: hanya tampilkan data yang sesuai dengan chart aktif
  const renderCardView = (chartData) => {
    let total = 0;
    let dataLabel = 'sekolah';
    
    // Tentukan total dan label berdasarkan chart yang aktif
    if (activeChart === 'distribusi' || activeChart === 'status' || activeChart === 'kecamatan') {
      total = chartData.data.reduce((sum, value) => sum + value, 0);
      dataLabel = 'sekolah';
    } else if (activeChart === 'jumlah_siswa') {
      total = stats?.totalSiswa || 0;
      dataLabel = 'siswa';
    } else if (activeChart === 'jumlah_guru') {
      total = stats?.totalGuru || 0;
      dataLabel = 'guru';
    }
    
    return (
  <div className="distribution-grid">
    {chartData.labels
      .filter((label, index) => {
        // Filter label yang tidak ingin ditampilkan
        const excludedLabels = ['SLB', 'SKB', 'PKBM'];
        return !excludedLabels.some(excludedLabel => 
          label.toUpperCase().includes(excludedLabel.toUpperCase())
        );
      })
      .map((label, index) => {
        // Index baru setelah filter, jadi kita perlu cari index asli
        const originalIndex = chartData.labels.indexOf(label);
        
        let value = 0;
        
        // Tentukan nilai yang akan ditampilkan berdasarkan chart aktif
        if (activeChart === 'distribusi' || activeChart === 'status' || activeChart === 'kecamatan') {
          value = chartData.data[originalIndex] || 0;
        } else if (activeChart === 'jumlah_siswa') {
          value = chartData.siswa ? chartData.siswa[originalIndex] : 0;
        } else if (activeChart === 'jumlah_guru') {
          value = chartData.guru ? chartData.guru[originalIndex] : 0;
        }
        
        const percentage = total > 0 ? (value / total) * 100 : 0;
        
        return (
          <div key={index} className="distribution-card">
            <div className="card-value-top-inline">
              <span className="card-value-display">
                {value.toLocaleString()} {dataLabel} ({percentage.toFixed(1)}%)
              </span>
            </div>
            <div className="card-content">
              <span className="card-dot" style={{ backgroundColor: chartData.colors[originalIndex] }}></span>
              <span className="card-label">{label}</span>
            </div>
            
            <div className="bar-container-card">
              <div 
                className="bar-fill-card" 
                style={{ width: `${percentage}%`, backgroundColor: chartData.colors[originalIndex] }}
              ></div>
            </div>
          </div>
        );
      })}
  </div>
);
  };

  // Render Bar Chart - DIPISAH: hanya tampilkan data yang sesuai dengan chart aktif
  const renderBarChart = (chartData) => {
    let total = 0;
    let dataLabel = 'sekolah';
    let dataValues = [];
    
    // Tentukan data yang akan ditampilkan berdasarkan chart aktif
    if (activeChart === 'distribusi' || activeChart === 'status' || activeChart === 'kecamatan') {
      dataValues = chartData.data;
      total = dataValues.reduce((sum, value) => sum + value, 0);
      dataLabel = 'sekolah';
    } else if (activeChart === 'jumlah_siswa') {
      dataValues = chartData.siswa || [];
      total = stats?.totalSiswa || 0;
      dataLabel = 'siswa';
    } else if (activeChart === 'jumlah_guru') {
      dataValues = chartData.guru || [];
      total = stats?.totalGuru || 0;
      dataLabel = 'guru';
    }
    
    const maxValue = Math.max(...dataValues);
    const minBarHeight = 20;
    const itemCount = chartData.labels.length;
    const needsScroll = itemCount > 8;
    
    return (
  <div className={`bar-chart-container ${needsScroll ? 'scrollable' : 'centered'}`}>
    <div className={`bar-chart-wrapper ${needsScroll ? 'scroll-wrapper' : 'centered-wrapper'}`}>
      <div className="bar-chart-content">
        <div className="bar-chart-bars">
          {chartData.labels
            .filter((label, index) => {
              // Filter label yang tidak ingin ditampilkan
              const excludedLabels = ['SLB', 'SKB', 'PKBM'];
              return !excludedLabels.some(excludedLabel => 
                label.toUpperCase().includes(excludedLabel.toUpperCase())
              );
            })
            .map((label, index) => {
              // Index baru setelah filter, jadi kita perlu cari index asli
              const originalIndex = chartData.labels.indexOf(label);
              const value = dataValues[originalIndex] || 0;
              const percentage = total > 0 ? (value / total) * 100 : 0;
              const barHeight = maxValue > 0 ? Math.max((value / maxValue) * 100, minBarHeight) : minBarHeight;
              
              return (
                <div key={index} className="bar-chart-item">
                  <div className="bar-chart-label" title={label}>
                    {label.length > 12 ? `${label.substring(0, 12)}...` : label}
                  </div>
                  <div className="bar-chart-bar-container">
                    <div 
                      className="bar-chart-bar"
                      style={{ 
                        height: `${barHeight}%`,
                        backgroundColor: chartData.colors[originalIndex]
                      }}
                      title={`${label}: ${value.toLocaleString()} ${dataLabel} (${percentage.toFixed(1)}%)`}
                    >
                      <span className="bar-chart-value">{value.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="bar-chart-percentage">{percentage.toFixed(1)}%</div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
    {needsScroll && (
      <div className="scroll-indicator">
        <span>← Geser untuk melihat lebih banyak data →</span>
      </div>
    )}
  </div>
);
  };

  // Render Pie Chart - DIPISAH: hanya tampilkan data yang sesuai dengan chart aktif
  const renderPieChart = (chartData) => {
    let total = 0;
    let dataLabel = 'sekolah';
    let dataValues = [];
    
    // Tentukan data yang akan ditampilkan berdasarkan chart aktif
    if (activeChart === 'distribusi' || activeChart === 'status' || activeChart === 'kecamatan') {
      dataValues = chartData.data;
      total = dataValues.reduce((sum, value) => sum + value, 0);
      dataLabel = 'sekolah';
    } else if (activeChart === 'jumlah_siswa') {
      dataValues = chartData.siswa || [];
      total = stats?.totalSiswa || 0;
      dataLabel = 'siswa';
    } else if (activeChart === 'jumlah_guru') {
      dataValues = chartData.guru || [];
      total = stats?.totalGuru || 0;
      dataLabel = 'guru';
    }
    
    let currentAngle = 0;
    
    return (
  <div className="pie-chart-container">
    <div className="pie-chart-visual">
      <svg width="200" height="200" viewBox="0 0 200 200" className="pie-chart-svg">
        {/* Filter data untuk visual chart */}
        {(() => {
          // Filter data yang akan ditampilkan
          const filteredIndices = chartData.labels
            .map((label, index) => ({ label, index }))
            .filter(({ label }) => {
              const excludedLabels = ['SLB', 'SKB', 'PKBM'];
              return !excludedLabels.some(excludedLabel => 
                label.toUpperCase().includes(excludedLabel.toUpperCase())
              );
            });

          const filteredValues = filteredIndices.map(({ index }) => dataValues[index] || 0);
          const filteredTotal = filteredValues.reduce((sum, val) => sum + val, 0);
          let currentAngle = 0;

          // Hitung berapa banyak data setelah filter
          const filteredCount = filteredIndices.length;

          if (filteredCount === 1) {
            // KASUS 1: Hanya ada satu data setelah filter
            const colorIndex = filteredIndices[0].index;
            return (
              <>
                <circle 
                  cx="100" 
                  cy="100" 
                  r="80" 
                  fill={chartData.colors[colorIndex]} 
                  stroke="#fff" 
                  strokeWidth="2"
                  className="pie-slice single-slice"
                />
                <circle cx="100" cy="100" r="50" fill="white" />
              </>
            );
          } else if (filteredCount === 0) {
            // KASUS 2: Tidak ada data setelah filter
            return (
              <>
                <circle 
                  cx="100" 
                  cy="100" 
                  r="80" 
                  fill="#f0f0f0" 
                  stroke="#ddd" 
                  strokeWidth="2"
                  className="pie-slice empty-slice"
                />
                <circle cx="100" cy="100" r="50" fill="white" />
              </>
            );
          } else {
            // KASUS 3: Ada multiple data setelah filter
            return (
              <>
                {filteredIndices.map(({ index: originalIndex }, sliceIndex) => {
                  const value = dataValues[originalIndex] || 0;
                  const angle = filteredTotal > 0 ? (value / filteredTotal) * 360 : 0;
                  const largeArcFlag = angle > 180 ? 1 : 0;
                  
                  const x1 = 100 + 80 * Math.cos(currentAngle * Math.PI / 180);
                  const y1 = 100 + 80 * Math.sin(currentAngle * Math.PI / 180);
                  
                  const x2 = 100 + 80 * Math.cos((currentAngle + angle) * Math.PI / 180);
                  const y2 = 100 + 80 * Math.sin((currentAngle + angle) * Math.PI / 180);
                  
                  const pathData = [
                    `M 100 100`,
                    `L ${x1} ${y1}`,
                    `A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                    `Z`
                  ].join(' ');
                  
                  const slice = (
                    <path
                      key={sliceIndex}
                      d={pathData}
                      fill={chartData.colors[originalIndex]}
                      stroke="#fff"
                      strokeWidth="2"
                      className="pie-slice"
                    />
                  );
                  
                  currentAngle += angle;
                  return slice;
                })}
                <circle cx="100" cy="100" r="50" fill="white" />
              </>
            );
          }
        })()}
      </svg>
    </div>
    <div className="pie-chart-legend">
      {chartData.labels
        .filter((label, index) => {
          // Filter label yang tidak ingin ditampilkan di legend
          const excludedLabels = ['SLB', 'SKB', 'PKBM'];
          return !excludedLabels.some(excludedLabel => 
            label.toUpperCase().includes(excludedLabel.toUpperCase())
          );
        })
        .map((label, filteredIndex) => {
          // Cari index asli untuk mendapatkan data yang benar
          const originalIndex = chartData.labels.indexOf(label);
          const value = dataValues[originalIndex] || 0;
          
          // Hitung persentase berdasarkan total data yang difilter
          const filteredIndices = chartData.labels
            .map((label, index) => ({ label, index }))
            .filter(({ label }) => {
              const excludedLabels = ['SLB', 'SKB', 'PKBM'];
              return !excludedLabels.some(excludedLabel => 
                label.toUpperCase().includes(excludedLabel.toUpperCase())
              );
            });
          
          const filteredValues = filteredIndices.map(({ index }) => dataValues[index] || 0);
          const filteredTotal = filteredValues.reduce((sum, val) => sum + val, 0);
          const percentage = filteredTotal > 0 ? ((value / filteredTotal) * 100).toFixed(1) : '0.0';
          
          return (
            <div key={filteredIndex} className="pie-legend-item">
              <span 
                className="pie-legend-color" 
                style={{ backgroundColor: chartData.colors[originalIndex] }}
              ></span>
              <div className="pie-legend-content">
                <span className="pie-legend-label">{label}</span><br/>
                <span className="pie-legend-value">
                  {value.toLocaleString()} {dataLabel} ({percentage}%)
                </span>
              </div>
            </div>
          );
        })}
    </div>
  </div>
);
  };

  const renderChart = () => {
    if (loading) {
      return (
        <div className="chart-loading">
          <div className="spinner"></div>
          <p>Memuat data chart...</p>
        </div>
      );
    }

    if (!processedData) {
      return (
        <div className="chart-empty">
          <div className="empty-icon">📊</div>
          <p>Tidak ada data untuk ditampilkan</p>
        </div>
      );
    }

    const chartData = getChartData();
    let total = 0;
    let totalLabel = 'sekolah';
    
    // Tentukan total dan label berdasarkan chart yang aktif
    if (activeChart === 'distribusi' || activeChart === 'status' || activeChart === 'kecamatan') {
      total = chartData.data.reduce((sum, value) => sum + value, 0);
      totalLabel = 'sekolah';
    } else if (activeChart === 'jumlah_siswa') {
      total = stats?.totalSiswa || 0;
      totalLabel = 'siswa';
    } else if (activeChart === 'jumlah_guru') {
      total = stats?.totalGuru || 0;
      totalLabel = 'guru';
    }

    return (
      <div className="chart-visualization horizontal-layout">
        <div className="chart-header">
          <h3>{chartTypes.find(chart => chart.id === activeChart)?.label}</h3>
          <div className="chart-total">
            Total: {total.toLocaleString()} {totalLabel}
          </div>
        </div>
        
        {/* Visualization Type Selector */}
        <div className="visualization-types">
          {visualizationTypes.map(viz => (
            <button
              key={viz.id}
              className={`visualization-type-btn ${chartVisualization === viz.id ? 'active' : ''}`}
              onClick={() => setChartVisualization(viz.id)}
            >
              <span className="visualization-icon">{viz.icon}</span>
              <span className="visualization-label">{viz.label}</span>
            </button>
          ))}
        </div>
        
        {/* Render chart berdasarkan tipe visualisasi */}
        {chartVisualization === 'card' && renderCardView(chartData)}
        {chartVisualization === 'bar' && renderBarChart(chartData)}
        {chartVisualization === 'pie' && renderPieChart(chartData)}
      </div>
    );
  };

  return (
    <div className="charts-page">
      {/* Back Button */}
      <button className="back-button" onClick={handleBackToMap}>
        ← Kembali ke Peta
      </button>

      <div className="charts-container">
        {/* Header */}
        <div className="charts-header">
          <h1 className="charts-title">Dashboard Statistik Sekolah Lengkap</h1>
          <p className="charts-subtitle">
            Visualisasi data sekolah, siswa, dan guru menggunakan berbagai jenis Grafik.
          </p>
        </div>

        {/* Statistics Cards - DITAMBAHKAN DATA SISWA DAN GURU */}
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon"></div>
              <div className="stat-value">{stats.totalSekolah.toLocaleString()}</div>
              <div className="stat-label">Total Sekolah</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"></div>
              <div className="stat-value">{stats.totalSiswa.toLocaleString()}</div>
              <div className="stat-label">Total Siswa</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"></div>
              <div className="stat-value">{stats.totalGuru.toLocaleString()}</div>
              <div className="stat-label">Total Guru</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"></div>
              <div className="stat-value">{stats.rasioSiswaGuru}</div>
              <div className="stat-label">Rasio Siswa/Guru</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"></div>
              <div className="stat-value">{stats.rataSiswaPerSekolah}</div>
              <div className="stat-label">Rata Siswa/Sekolah</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"></div>
              <div className="stat-value">{stats.sekolahNegeri.toLocaleString()}</div>
              <div className="stat-label">Sekolah Negeri</div>
              <div className="stat-percentage">{stats.persentaseNegeri}%</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"></div>
              <div className="stat-value">{stats.sekolahSwasta.toLocaleString()}</div>
              <div className="stat-label">Sekolah Swasta</div>
              <div className="stat-percentage">{stats.persentaseSwasta}%</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"></div>
              <div className="stat-value">{kabupatenOptions.length - 1}</div>
              <div className="stat-label">Kabupaten/Kota</div>
            </div>
          </div>
        )}

        {/* Filters Section */}
        <div className="filters-section">
          <h3 className="filters-title">🔍 Filter Data</h3>
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
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
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
              className="filter-reset"
              onClick={() => setFilters({
                jenjang: 'all',
                kabupaten: 'all',
                kecamatan: 'all',
                status: 'all'
              })}
            >
              🔄 Reset Filter
            </button>
            
            {/* Export Dropdown */}
            <div className="export-dropdown">
              <button 
                className="export-btn"
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
              >
                📥 Export Data ▼
              </button>
              
              {exportMenuOpen && (
                <div className="export-menu">
                  <button 
                    className="export-option"
                    onClick={exportToExcel}
                  >
                    📊 Export Excel
                  </button>
                  <button 
                    className="export-option"
                    onClick={exportToPDF}
                  >
                    📄 Export PDF Lengkap
                  </button>
                  <button 
                    className="export-option"
                    onClick={exportData}
                  >
                    💾 Export JSON
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chart Type Selection - DITAMBAHKAN JUMLAH SISWA DAN GURU */}
        <div className="chart-types">
          {chartTypes.map(chart => (
            <button
              key={chart.id}
              className={`chart-type-btn ${activeChart === chart.id ? 'active' : ''}`}
              onClick={() => setActiveChart(chart.id)}
            >
              <span className="chart-icon">{chart.icon}</span>
              <span className="chart-label">{chart.label}</span>
            </button>
          ))}
        </div>

        {/* Main Chart */}
        <div className="main-chart">
          <div className="chart-card">
            <div className="chart-content">
              {renderChart()}
            </div>
          </div>
        </div>

        {/* Data Summary - DITAMBAHKAN INFO SISWA DAN GURU */}
        {processedData && stats && (
          <div className="data-summary">
            <h3>Ringkasan Data Lengkap</h3>
            <div className="summary-grid">
              <div className="summary-item">
                <span className="summary-label">Total Sekolah:</span>
                <span className="summary-value">{stats.totalSekolah} sekolah</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Total Siswa:</span>
                <span className="summary-value">{stats.totalSiswa.toLocaleString()} siswa</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Total Guru:</span>
                <span className="summary-value">{stats.totalGuru.toLocaleString()} guru</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Rasio Siswa/Guru:</span>
                <span className="summary-value">{stats.rasioSiswaGuru}</span>
              </div>
              <div className="summary-item full-width">
                <span className="summary-label">Filter Aktif:</span>
                <span className="summary-value">
                  {filters.jenjang !== 'all' && `Jenjang: ${jenjangOptions.find(j => j.value === filters.jenjang)?.label} `}
                  {filters.kabupaten !== 'all' && `Kabupaten: ${filters.kabupaten} `}
                  {filters.kecamatan !== 'all' && `Kecamatan: ${filters.kecamatan} `}
                  {filters.status !== 'all' && `Status: ${statusOptions.find(s => s.value === filters.status)?.label}`}
                  {filters.jenjang === 'all' && filters.kabupaten === 'all' && filters.kecamatan === 'all' && filters.status === 'all' && 'Semua Data'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChartsPage;