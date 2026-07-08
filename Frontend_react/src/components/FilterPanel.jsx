import React from 'react'
import { toTitleCase } from '../utils/helpers'

const FilterPanel = ({
  isOpen,
  onClose,
  kabupatenList,
  kecamatanList,
  selectedKabupaten,
  selectedKecamatan,
  onKabupatenChange,
  onKecamatanChange,
  negeriChecked,
  swastaChecked,
  onNegeriChange,
  onSwastaChange,
  jenjangInput,
  onJenjangChange,
  onFilterApply // Prop baru untuk handle aplikasi filter
}) => {
  // Fungsi untuk handle klik tombol filter
  const handleFilterClick = () => {
    // Panggil fungsi untuk apply filter
    if (onFilterApply) {
      onFilterApply();
    }
    
    // Tutup panel filter
    onClose();
  }

  return (
    <div className={`filter-panel ${isOpen ? 'open' : ''}`}>
      <button id="closeFilterBtn" className="close-btn" onClick={onClose}>
        &times;
      </button>
      <h2>Filter Sebaran</h2>
      
      <div className="filter-group">
        <label htmlFor="kabupatenSelect">Kabupaten/Kota</label>
        <select 
          id="kabupatenSelect"
          value={selectedKabupaten}
          onChange={(e) => onKabupatenChange(e.target.value)}
        >
          <option value="all">Pilih Semua</option>
          {kabupatenList.map(kabupaten => (
            <option key={kabupaten} value={kabupaten}>
              {toTitleCase(kabupaten)}
            </option>
          ))}
        </select>
      </div>
      
      <div className="filter-group">
        <label htmlFor="kecamatanSelect">Kecamatan</label>
        <select 
          id="kecamatanSelect"
          value={selectedKecamatan}
          onChange={(e) => onKecamatanChange(e.target.value)}
          disabled={!kecamatanList.length}
        >
          <option value="all">Pilih Semua</option>
          {kecamatanList.map(kecamatan => (
            <option key={kecamatan} value={kecamatan}>
              {toTitleCase(kecamatan)}
            </option>
          ))}
        </select>
      </div>
      
      <div className="filter-group">
        <label>Status Sekolah</label>
        <div className="checkbox-group">
          <input 
            type="checkbox" 
            id="negeriCheckbox" 
            value="Negeri"
            checked={negeriChecked}
            onChange={(e) => onNegeriChange(e.target.checked)}
          />
          <label htmlFor="negeriCheckbox">Negeri</label>
          <input 
            type="checkbox" 
            id="swastaCheckbox" 
            value="Swasta"
            checked={swastaChecked}
            onChange={(e) => onSwastaChange(e.target.checked)}
          />
          <label htmlFor="swastaCheckbox">Swasta</label>
        </div>
      </div>

      <div className="filter-group">
        <label htmlFor="jenjangInput">Jenjang:</label>
        <input 
          type="text" 
          id="jenjangInput" 
          placeholder="Contoh: SD, TK, PAUD"
          value={jenjangInput}
          onChange={(e) => onJenjangChange(e.target.value)}
        />
      </div>

      <button id="filterBtn" onClick={handleFilterClick}>
        🔍 Filter
      </button>
    </div>
  )
}

export default FilterPanel