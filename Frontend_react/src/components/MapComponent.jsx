import React, { useEffect, useRef } from 'react'
import { toTitleCase } from '../utils/helpers'

// Import Leaflet Core and CSS
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// 💡 FIX: Import Marker Cluster JavaScript file
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'

// Fix for default markers in Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const MapComponent = ({
  onMapLoad,
  onMarkerClusterLoad,
  data,
  kabupatenColors,
  onKabupatenColorsChange,
  onKabupatenLayerChange,
  sekolahData
}) => {
  const mapContainerRef = useRef(null) 
  const mapRef = useRef(null)
  const markerClusterLayerRef = useRef(null)
  const kabupatenLayerRef = useRef(null)
  const renderedMarkersRef = useRef(new Set())
  const initialColorsAssigned = useRef(false);

  // Helper function untuk menormalisasi nama kabupaten
  const normalizeKabupatenName = (rawName) => {
    const standardizedName = rawName.toLowerCase().trim();
    const nameMap = {
      "purwokerto": "kab banyumas",
      "salatiga": "kota salatiga",
      "surakarta": "kota surakarta",
      "solo": "kota surakarta",
    }
    
    let nameForFiltering = nameMap[standardizedName] || standardizedName;
    nameForFiltering = nameForFiltering.replace(/^kabupaten\s/g, 'kab ').replace(/^kota\s/g, 'kota ').trim();
    
    if (!nameForFiltering.startsWith('kab ') && !nameForFiltering.startsWith('kota ')) {
      nameForFiltering = 'kab ' + nameForFiltering;
    }
    
    return nameForFiltering.trim();
  }

  // --- 1. Map Initialization (Runs once) ---
  useEffect(() => {
    let map;
    if (mapContainerRef.current && !mapRef.current) {
      // 💡 FIX: Gunakan ref elemen DOM langsung
      map = L.map(mapContainerRef.current).setView([-7.1, 110], 8)

      L.control.zoom({
      position: 'bottomright'
      }).addTo(map);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap'
      }).addTo(map)
  
      const markerClusterLayer = L.markerClusterGroup({
        disableClusteringAtZoom: 13,
        maxClusterRadius: 50
      })
      map.addLayer(markerClusterLayer)
  
      mapRef.current = map
      markerClusterLayerRef.current = markerClusterLayer
  
      onMapLoad(map)
      onMarkerClusterLoad(markerClusterLayer)
      
      map.invalidateSize();
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    }
  }, [])

  // --- 2. Marker Data Update (Runs on data change) ---
  useEffect(() => {
    if (!markerClusterLayerRef.current || !data) return

    const markerClusterLayer = markerClusterLayerRef.current
    markerClusterLayer.clearLayers()
    renderedMarkersRef.current.clear()

    const newMarkers = []

    data.forEach(row => {
      const lat = parseFloat(row.lintang)
      const lng = parseFloat(row.bujur)

      if (!isNaN(lat) && !isNaN(lng)) {
        const markerId = `${lat.toFixed(6)}-${lng.toFixed(6)}-${row.npsn}`

        if (renderedMarkersRef.current.has(markerId)) {
          return
        }

        renderedMarkersRef.current.add(markerId)

        const markerColor = row.status_sekolah === 'Negeri' ? 'blue' : 'orange'

        const customIcon = L.divIcon({
          className: 'custom-marker',
          html: `<div class="marker-dot" style="background-color: ${markerColor}; width: 15px; height: 15px; border-radius: 50%; border: 1px solid white;"></div>`,
          iconSize: [15, 15],
          iconAnchor: [7.5, 7.5]
        })

        const marker = L.marker([lat, lng], { icon: customIcon })
        
        const nama = toTitleCase(row.nama) || "Sekolah"
        const npsn = toTitleCase(row.npsn) || "NPSN"
        const alamat = toTitleCase(row.desa_kelurahan) || "Alamat tidak tersedia"
        const kabupaten = toTitleCase(row.kabupaten) || "Kabupaten/Kota tidak tersedia"
        const kecamatan = toTitleCase(row.kecamatan) || "Kecamatan tidak tersedia"
        const status = toTitleCase(row.status_sekolah) || "Status tidak tersedia"

        // Di dalam MapComponent.jsx, bagian marker.bindPopup:
marker.bindPopup(`
  <b>${toTitleCase(row.nama)}</b><br>
  NPSN: ${row.npsn || 'NPSN'}<br>
  Status: ${toTitleCase(row.status_sekolah) || 'Status tidak tersedia'}<br>
  Jenjang: ${toTitleCase(row.jenjang) || 'Jenjang tidak tersedia'}<br>
  Kabupaten/Kota: ${toTitleCase(row.kabupaten) || 'Kabupaten tidak tersedia'}<br>
  Kecamatan: ${toTitleCase(row.kecamatan) || 'Kecamatan tidak tersedia'}<br>
  Alamat: ${toTitleCase(row.desa_kelurahan) || 'Alamat tidak tersedia'}
`);
        
        newMarkers.push(marker);
      }
    })
    
    markerClusterLayer.addLayers(newMarkers);
    
  }, [data])


  // --- 3. GeoJSON Initialization (Runs once after map is ready) ---
  useEffect(() => {
    // 💡 FIX PENTING: Jalankan GeoJSON hanya setelah map dan sekolahData siap, dan hanya sekali.
    if (mapRef.current && sekolahData.length > 0 && !kabupatenLayerRef.current) {
        renderKabupatenLayer(
            mapRef.current, 
            sekolahData, 
            kabupatenColors, 
            onKabupatenColorsChange, 
            onKabupatenLayerChange
        );
    }
  }, [mapRef.current, sekolahData]); // Bergantung pada map dan sekolahData

  // --- 4. Kabupaten Layer Style Update (Runs on color change) ---
  useEffect(() => {
    if (kabupatenLayerRef.current && kabupatenColors) {
      const kabupatenLayer = kabupatenLayerRef.current;
      
      const styleKabupaten = (feature) => {
        const kabupatenName = feature.properties.province || feature.properties.NAME_1 || 'Nama Tidak Dikenali'
        const standardizedName = normalizeKabupatenName(kabupatenName);

        return {
          fillColor: kabupatenColors[standardizedName] || '#999999',
          weight: 2,
          opacity: 1,
          color: 'white',
          fillOpacity: 0.5
        }
      }
      
      kabupatenLayer.setStyle(styleKabupaten);
    }
  }, [kabupatenColors]);


  // --- Fungsi Render GeoJSON Kabupaten ---
  const renderKabupatenLayer = (map, sekolahData, kabupatenColors, onKabupatenColorsChange, onKabupatenLayerChange) => {
    fetch('/jateng.geojson')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(geoJsonData => {
        
        const getRandomColor = () => {
          const letters = '0123456789ABCDEF'
          let color = '#'
          for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)]
          }
          return color
        }
        
        let newKabupatenColors = {};
        
        const styleKabupaten = (feature) => {
          const kabupatenName = feature.properties.province || feature.properties.NAME_1 || 'Nama Tidak Dikenali'
          const standardizedName = normalizeKabupatenName(kabupatenName);

          if (!kabupatenColors[standardizedName] && !initialColorsAssigned.current) {
            newKabupatenColors[standardizedName] = getRandomColor();
          }

          const currentColor = kabupatenColors[standardizedName] || newKabupatenColors[standardizedName] || '#999999';

          return {
            fillColor: currentColor,
            weight: 2,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.5
          }
        }

        const kabupatenLayer = L.geoJSON(geoJsonData, {
          style: styleKabupaten,
          onEachFeature: function (feature, layer) {
            const rawName = feature.properties.province || feature.properties.NAME_1 || 'Nama Tidak Dikenali'
            const nameForFiltering = normalizeKabupatenName(rawName);

            const schoolCount = sekolahData.filter(row => {
              return row.kabupaten && row.kabupaten.toLowerCase().trim() === nameForFiltering
            }).length

            const popupContent = `
              <div style="text-align: center; color: white;">
                <div style="
                  background-color: #38c172; 
                  padding: 5px 10px;
                  margin: -12px -12px 5px -12px;
                  border-radius: 4px 4px 0 0;
                  font-weight: bold;
                  font-size: 14px;
                ">
                  ${toTitleCase(rawName)} 
                </div>
                <div style="
                  color: #333; 
                  padding: 5px 0 0 0;
                  font-size: 18px;
                  font-weight: bold;
                ">
                  ${schoolCount} Sekolah
                </div>
              </div>
            `
            
            layer.bindPopup(popupContent)
            
            layer.on({
              mouseover: function (e) {
                e.target.setStyle({ weight: 4, color: '#666' })
                if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                    e.target.bringToFront()
                }
              },
              mouseout: function (e) {
                kabupatenLayer.resetStyle(e.target)
              },
              click: function (e) {
                e.target.openPopup()
              }
            })
          }
        }).addTo(map)
        
        if (Object.keys(newKabupatenColors).length > 0) {
            onKabupatenColorsChange(prev => ({
                ...prev,
                ...newKabupatenColors
            }));
            initialColorsAssigned.current = true;
        }

        kabupatenLayerRef.current = kabupatenLayer
        onKabupatenLayerChange(kabupatenLayer)
      })
      .catch(error => {
        console.error('Error loading GeoJSON:', error)
        // alert('Gagal memuat data GeoJSON kabupaten. Pastikan file "jateng.geojson" ada di folder public.')
      })
  }

  // --- Render Method ---
  return (
    <div 
      ref={mapContainerRef} 
      id="map" 
      style={{ height: '100vh', width: '100%' }} 
    />
  )
}

export default MapComponent