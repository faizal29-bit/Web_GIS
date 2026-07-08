import React, { useState, useEffect } from 'react';
import { toTitleCase } from '../utils/helpers';

const ChartsPanel = ({ sekolahData, isOpen, onClose }) => {
  const [chartType, setChartType] = useState('bar');
  const [selectedKabupaten, setSelectedKabupaten] = useState('all');
  const [selectedKecamatan, setSelectedKecamatan] = useState('all');
  const [selectedJenjang, setSelectedJenjang] = useState(['sd', 'smp', 'sma']);
  const [chartData, setChartData] = useState([]);
  const [kabupatenList, setKabupatenList] = useState([]);
  const [kecamatanList, setKecamatanList] = useState([]);

  // Populate kabupaten list
  useEffect(() => {
    if (sekolahData.length > 0) {
      const uniqueKabupaten = [...new Set(sekolahData.map(row => row.kabupaten).filter(Boolean))];
      uniqueKabupaten.sort();
      setKabupatenList(uniqueKabupaten);
    }
  }, [sekolahData]);

  // Populate kecamatan list based on selected kabupaten
  useEffect(() => {
    if (selectedKabupaten === 'all') {
      setKecamatanList([]);
      return;
    }
    
    const filteredData = sekolahData.filter(row => row.kabupaten === selectedKabupaten);
    const uniqueKecamatan = [...new Set(filteredData.map(row => row.kecamatan).filter(Boolean))];
    uniqueKecamatan.sort();
    setKecamatanList(uniqueKecamatan);
    setSelectedKecamatan('all');
  }, [selectedKabupaten, sekolahData]);

  // Generate chart data
  useEffect(() => {
    if (sekolahData.length === 0) return;

    let filteredData = sekolahData;

    // Filter by kabupaten
    if (selectedKabupaten !== 'all') {
      filteredData = filteredData.filter(row => row.kabupaten === selectedKabupaten);
    }

    // Filter by kecamatan
    if (selectedKecamatan !== 'all') {
      filteredData = filteredData.filter(row => row.kecamatan === selectedKecamatan);
    }

    // Filter by jenjang
    filteredData = filteredData.filter(row => {
      const jenjang = row.jenjang.toLowerCase();
      return selectedJenjang.some(j => jenjang.includes(j));
    });

    // Group data for chart
    const groupedData = {};
    
    if (selectedKabupaten === 'all') {
      // Group by kabupaten
      filteredData.forEach(row => {
        const kabupaten = row.kabupaten || 'Tidak Diketahui';
        if (!groupedData[kabupaten]) {
          groupedData[kabupaten] = {
            sd: 0, smp: 0, sma: 0, total: 0
          };
        }
        
        const jenjang = row.jenjang.toLowerCase();
        if (jenjang.includes('sd') || jenjang.includes('mi')) {
          groupedData[kabupaten].sd++;
        } else if (jenjang.includes('smp') || jenjang.includes('mts')) {
          groupedData[kabupaten].smp++;
        } else if (jenjang.includes('sma') || jenjang.includes('smk') || jenjang.includes('ma')) {
          groupedData[kabupaten].sma++;
        }
        groupedData[kabupaten].total++;
      });
    } else if (selectedKecamatan === 'all') {
      // Group by kecamatan
      filteredData.forEach(row => {
        const kecamatan = row.kecamatan || 'Tidak Diketahui';
        if (!groupedData[kecamatan]) {
          groupedData[kecamatan] = {
            sd: 0, smp: 0, sma: 0, total: 0
          };
        }
        
        const jenjang = row.jenjang.toLowerCase();
        if (jenjang.includes('sd') || jenjang.includes('mi')) {
          groupedData[kecamatan].sd++;
        } else if (jenjang.includes('smp') || jenjang.includes('mts')) {
          groupedData[kecamatan].smp++;
        } else if (jenjang.includes('sma') || jenjang.includes('smk') || jenjang.includes('ma')) {
          groupedData[kecamatan].sma++;
        }
        groupedData[kecamatan].total++;
      });
    } else {
      // Group by jenjang for specific kecamatan
      const jenjangCount = { sd: 0, smp: 0, sma: 0, total: 0 };
      
      filteredData.forEach(row => {
        const jenjang = row.jenjang.toLowerCase();
        if (jenjang.includes('sd') || jenjang.includes('mi')) {
          jenjangCount.sd++;
        } else if (jenjang.includes('smp') || jenjang.includes('mts')) {
          jenjangCount.smp++;
        } else if (jenjang.includes('sma') || jenjang.includes('smk') || jenjang.includes('ma')) {
          jenjangCount.sma++;
        }
        jenjangCount.total++;
      });
      
      groupedData[selectedKecamatan] = jenjangCount;
    }

    // Convert to array for chart
    const chartDataArray = Object.entries(groupedData).map(([name, data]) => ({
      name: toTitleCase(name),
      sd: data.sd,
      smp: data.smp,
      sma: data.sma,
      total: data.total
    }));

    // Sort by total descending
    chartDataArray.sort((a, b) => b.total - a.total);
    
    setChartData(chartDataArray);
  }, [sekolahData, selectedKabupaten, selectedKecamatan, selectedJenjang]);

  const handleJenjangChange = (jenjang) => {
    setSelectedJenjang(prev =>
      prev.includes(jenjang)
        ? prev.filter(j => j !== jenjang)
        : [...prev, jenjang]
    );
  };

  const renderChart = () => {
    if (chartData.length === 0) {
      return <div className="no-data">Tidak ada data untuk ditampilkan</div>;
    }

    const maxTotal = Math.max(...chartData.map(d => d.total));
    const maxBarHeight = 200;

    return (
      <div className="chart-container">
        {chartType === 'bar' && (
          <div className="bar-chart">
            {chartData.map((item, index) => (
              <div key={index} className="bar-item">
                <div className="bar-label">{item.name}</div>
                <div className="bars">
                  {selectedJenjang.includes('sd') && (
                    <div 
                      className="bar sd-bar" 
                      style={{ height: `${(item.sd / maxTotal) * maxBarHeight}px` }}
                      title={`SD: ${item.sd}`}
                    >
                      <span className="bar-value">{item.sd}</span>
                    </div>
                  )}
                  {selectedJenjang.includes('smp') && (
                    <div 
                      className="bar smp-bar" 
                      style={{ height: `${(item.smp / maxTotal) * maxBarHeight}px` }}
                      title={`SMP: ${item.smp}`}
                    >
                      <span className="bar-value">{item.smp}</span>
                    </div>
                  )}
                  {selectedJenjang.includes('sma') && (
                    <div 
                      className="bar sma-bar" 
                      style={{ height: `${(item.sma / maxTotal) * maxBarHeight}px` }}
                      title={`SMA: ${item.sma}`}
                    >
                      <span className="bar-value">{item.sma}</span>
                    </div>
                  )}
                </div>
                <div className="bar-total">Total: {item.total}</div>
              </div>
            ))}
          </div>
        )}

        {chartType === 'pie' && (
          <div className="pie-chart">
            {chartData.slice(0, 10).map((item, index) => (
              <div key={index} className="pie-item">
                <div className="pie-info">
                  <strong>{item.name}</strong>
                  <div>SD: {item.sd}</div>
                  <div>SMP: {item.smp}</div>
                  <div>SMA: {item.sma}</div>
                  <div>Total: {item.total}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {chartType === 'table' && (
          <div className="table-chart">
            <table>
              <thead>
                <tr>
                  <th>Wilayah</th>
                  {selectedJenjang.includes('sd') && <th>SD/MI</th>}
                  {selectedJenjang.includes('smp') && <th>SMP/MTS</th>}
                  {selectedJenjang.includes('sma') && <th>SMA/SMK/MA</th>}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((item, index) => (
                  <tr key={index}>
                    <td>{item.name}</td>
                    {selectedJenjang.includes('sd') && <td>{item.sd}</td>}
                    {selectedJenjang.includes('smp') && <td>{item.smp}</td>}
                    {selectedJenjang.includes('sma') && <td>{item.sma}</td>}
                    <td><strong>{item.total}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="charts-panel">
      <button className="close-charts-btn" onClick={onClose}>
        &times;
      </button>
      
      <h3>Grafik Data Sekolah</h3>
      
      {/* Controls */}
      <div className="chart-controls">
        <div className="control-group">
          <label>Jenis Grafik:</label>
          <select 
            value={chartType} 
            onChange={(e) => setChartType(e.target.value)}
          >
            <option value="bar">Bar Chart</option>
            <option value="pie">Pie Chart</option>
            <option value="table">Tabel</option>
          </select>
        </div>

        <div className="control-group">
          <label>Kabupaten:</label>
          <select 
            value={selectedKabupaten} 
            onChange={(e) => setSelectedKabupaten(e.target.value)}
          >
            <option value="all">Semua Kabupaten</option>
            {kabupatenList.map(kab => (
              <option key={kab} value={kab}>{toTitleCase(kab)}</option>
            ))}
          </select>
        </div>

        {selectedKabupaten !== 'all' && (
          <div className="control-group">
            <label>Kecamatan:</label>
            <select 
              value={selectedKecamatan} 
              onChange={(e) => setSelectedKecamatan(e.target.value)}
            >
              <option value="all">Semua Kecamatan</option>
              {kecamatanList.map(kec => (
                <option key={kec} value={kec}>{toTitleCase(kec)}</option>
              ))}
            </select>
          </div>
        )}

        <div className="control-group">
          <label>Jenjang:</label>
          <div className="jenjang-checkboxes">
            <label>
              <input
                type="checkbox"
                checked={selectedJenjang.includes('sd')}
                onChange={() => handleJenjangChange('sd')}
              />
              SD/MI
            </label>
            <label>
              <input
                type="checkbox"
                checked={selectedJenjang.includes('smp')}
                onChange={() => handleJenjangChange('smp')}
              />
              SMP/MTS
            </label>
            <label>
              <input
                type="checkbox"
                checked={selectedJenjang.includes('sma')}
                onChange={() => handleJenjangChange('sma')}
              />
              SMA/SMK/MA
            </label>
          </div>
        </div>
      </div>

      {/* Chart Display */}
      <div className="chart-display">
        {renderChart()}
      </div>

      {/* Summary */}
      <div className="chart-summary">
        <strong>Total Data: {chartData.reduce((sum, item) => sum + item.total, 0)} sekolah</strong>
        <div>Menampilkan {chartData.length} wilayah</div>
      </div>
    </div>
  );
};

export default ChartsPanel;