import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import L from 'leaflet';
import axios from 'axios';

// Import required CSS
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom North Arrow component
const NorthArrow = () => {
  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      background: 'white',
      padding: '10px',
      borderRadius: '4px',
      boxShadow: '0 0 10px rgba(0,0,0,0.2)',
      zIndex: 1000
    }}>
      <div style={{ 
        transform: 'rotate(0deg)',
        fontSize: '24px'
      }}>
        ⬆️
      </div>
      <div style={{ textAlign: 'center', fontSize: '12px' }}>N</div>
    </div>
  );
};

const MapView = () => {
  const [area, setArea] = useState(0);
  const [drawnLayers, setDrawnLayers] = useState([]);
  const defaultCenter = [20.5937, 78.9629]; // Center of India
  const defaultZoom = 5;

  const calculatePolygonArea = (layer) => {
    const areaInSqMeters = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);
    const areaInSqKm = (areaInSqMeters / 1000000).toFixed(4);
    setArea(areaInSqKm);
  };

  const handleCreated = (e) => {
    const { layer } = e;
    if (layer instanceof L.Polygon) {
      calculatePolygonArea(layer);
      setDrawnLayers([...drawnLayers, layer]);
    }
  };

  const handleSaveLayout = async () => {
    if (drawnLayers.length === 0) {
      alert('Please draw a plot boundary first');
      return;
    }

    const coordinates = drawnLayers[drawnLayers.length - 1].getLatLngs()[0].map(latLng => ({
      lat: latLng.lat,
      lng: latLng.lng
    }));

    try {
      const response = await axios.post('/api/maps/save-layout', {
        coordinates,
        area
      });
      alert('Layout saved successfully!');
    } catch (error) {
      console.error('Error saving layout:', error);
      alert('Error saving layout. Please try again.');
    }
  };

  return (
    <div style={{ height: '100vh', width: '100%', position: 'relative' }}>
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <FeatureGroup>
          <EditControl
            position="topright"
            onCreated={handleCreated}
            draw={{
              rectangle: false,
              circle: false,
              circlemarker: false,
              marker: false,
              polyline: false,
              polygon: {
                allowIntersection: false,
                showArea: true
              },
            }}
          />
        </FeatureGroup>
        <NorthArrow />
      </MapContainer>

      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        background: 'white',
        padding: '15px',
        borderRadius: '4px',
        boxShadow: '0 0 10px rgba(0,0,0,0.2)',
        zIndex: 1000
      }}>
        <div><strong>Plot Area:</strong> {area} km²</div>
        <button 
          onClick={handleSaveLayout}
          style={{
            marginTop: '10px',
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Save Layout
        </button>
      </div>
    </div>
  );
};

export default MapView;