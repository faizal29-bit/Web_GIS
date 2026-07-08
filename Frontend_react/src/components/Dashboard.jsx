import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const Dashboard = ({ onSearch, infoBoxContent, onOpenFilter, onToggleCharts, showCharts }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchStatus, setSearchStatus] = useState('') // 'found', 'not-found', atau ''
  const navigate = useNavigate()

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchStatus('')
      onSearch('')
      return
    }
    
    // Simpan query sebelum direset
    const queryToSearch = searchQuery.toLowerCase().trim()
    
    // Kirim query ke parent component
    const result = onSearch(queryToSearch)
    
    // AUTO-CLEAR INPUT SETELAH PENCARIAN
    setSearchQuery('')
    
    // Set status berdasarkan hasil pencarian
    // Asumsikan onSearch mengembalikan true jika ditemukan, false jika tidak
    if (result === false) {
      setSearchStatus('not-found')
      // Hapus notifikasi setelah 5 detik
      setTimeout(() => setSearchStatus(''), 5000)
    } else {
      setSearchStatus('found')
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleNavigateToCharts = () => {
    navigate('/charts')
  }

  const handleNavigateToAi = () => {
    navigate('/ai-prediction')
  }

  return (
    <div className="dashboard">
      <h2>Peta Sekolah Jawa Tengah</h2>

      {/* NOTIFIKASI TIDAK DITEMUKAN */}
      {searchStatus === 'not-found' && (
        <div className="notification not-found" style={{
          position: 'absolute',
          top: '70px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#fef2f2',
          color: '#dc2626',
          padding: '12px 20px',
          borderRadius: '8px',
          border: '1px solid #fecaca',
          zIndex: 1001,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          animation: 'slideDown 0.3s ease'
        }}>
          <span style={{ fontSize: '18px' }}>⚠️</span>
          <div>
            <strong>Sekolah tidak ditemukan!</strong>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>
              Coba periksa kembali nama atau NPSN
            </div>
          </div>
          <button 
            onClick={() => setSearchStatus('')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#dc2626',
              fontSize: '18px',
              cursor: 'pointer',
              marginLeft: '10px'
            }}
          >
            ×
          </button>
        </div>
      )}

      <style>
        {`
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateX(-50%) translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(-50%) translateY(0);
            }
          }
        `}
      </style>

      <div className='but'>   
        <button 
          className="charts-page-ai"
          onClick={handleNavigateToAi}
        >
          Prediksi AI
        </button>

        <button 
          className="charts-page-btn"
          onClick={handleNavigateToCharts}
        >
          Grafik
        </button>
      </div>

      <div className="search-box">
        <input 
          type="text" 
          id="searchInput" 
          placeholder="Cari sekolah atau NPSN..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <button id="searchBtn" onClick={handleSearch}>Cari</button>
        <button id="openFilterBtn" className="filter-toggle-btn" onClick={onOpenFilter}>
          Filter
        </button>
      </div>

      <div 
        id="infoBox" 
        className="info-box"
        dangerouslySetInnerHTML={{ __html: infoBoxContent }}
        style={{ display: infoBoxContent ? 'block' : 'none' }}
      />
    </div>
  )
}

export default Dashboard