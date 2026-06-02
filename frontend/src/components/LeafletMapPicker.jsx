import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Circle } from 'react-leaflet';
import L from 'leaflet';

// Import leaflet icon assets directly to fix bundling resolution issues
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// Override default marker icons
const DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom icons for other entities
const kvkIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const fpoIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapPickerEvents({ onPick }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      onPick(lat, lng);
    },
  });
  return null;
}

export default function LeafletMapPicker({ 
  lat = 20.5937, 
  lon = 78.9629, 
  zoom = 5, 
  onLocationSelect = null, 
  isPicker = false,
  kvks = [],
  fpos = [],
  outbreaks = []
}) {
  const [position, setPosition] = useState([lat, lon]);

  useEffect(() => {
    if (lat && lon) {
      setPosition([lat, lon]);
    }
  }, [lat, lon]);

  const handleMapClick = (pickedLat, pickedLon) => {
    setPosition([pickedLat, pickedLon]);
    if (onLocationSelect) {
      onLocationSelect(pickedLat, pickedLon);
    }
  };

  return (
    <div className="w-full h-80 relative overflow-hidden rounded-xl shadow-premium border border-slate-200">
      <MapContainer 
        center={position} 
        zoom={zoom} 
        scrollWheelZoom={true} 
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Active Picker / Selected Marker */}
        {isPicker && (
          <Marker position={position}>
            <Popup>
              <div className="text-center font-medium">
                Selected Land GPS<br/>
                ({position[0].toFixed(4)}, {position[1].toFixed(4)})
              </div>
            </Popup>
          </Marker>
        )}
        
        {isPicker && onLocationSelect && (
          <MapPickerEvents onPick={handleMapClick} />
        )}

        {/* Display nearby KVK centers if provided */}
        {kvks.map((kvk) => (
          <Marker key={`kvk-${kvk.id}`} position={[kvk.lat, kvk.lon]} icon={kvkIcon}>
            <Popup>
              <div className="p-1">
                <span className="inline-block text-[10px] font-bold bg-green-100 text-primary-dark px-1.5 py-0.5 rounded-full mb-1">KVK LAB</span>
                <h4 className="font-semibold text-primary text-sm">{kvk.name}</h4>
                <p className="text-xs text-slate-500">{kvk.district}, {kvk.state}</p>
                <p className="text-xs font-medium text-slate-700 mt-1">📞 {kvk.contact}</p>
                {kvk.distance_km && <p className="text-xs font-semibold text-accent mt-0.5">Duri: {kvk.distance_km} km</p>}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Display FPOs if provided */}
        {fpos.map((fpo) => (
          <Marker key={`fpo-${fpo.id}`} position={[fpo.lat || 19.5, fpo.lon || 75.5]} icon={fpoIcon}>
            <Popup>
              <div className="p-1">
                <span className="inline-block text-[10px] font-bold bg-amber-100 text-accent-dark px-1.5 py-0.5 rounded-full mb-1">FPO CONNECTION</span>
                <h4 className="font-semibold text-accent text-sm">{fpo.name}</h4>
                <p className="text-xs text-slate-500">{fpo.district}, {fpo.state}</p>
                <p className="text-xs text-slate-700 mt-1">🌾 Handles: {fpo.crops}</p>
                <p className="text-xs font-medium text-blue-600 mt-0.5">✉️ {fpo.contact_email}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Display Disease Outbreaks as danger heat circles */}
        {outbreaks.map((out, idx) => (
          <React.Fragment key={`outbreak-${idx}`}>
            <Circle 
              center={[out.lat, out.lon]}
              pathOptions={{ fillColor: 'red', color: 'red' }}
              radius={Math.min(out.outbreak_count * 8000, 40000)} // scale diameter based on severity
            />
            <Marker position={[out.lat, out.lon]}>
              <Popup>
                <div className="p-1">
                  <span className="inline-block text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full mb-1">DISEASE OUTBREAK</span>
                  <h4 className="font-semibold text-red-600 text-sm">{out.disease_name}</h4>
                  <p className="text-xs text-slate-500">{out.district}, {out.state}</p>
                  <p className="text-xs font-bold text-slate-700 mt-1">Severity: {out.outbreak_count} reports</p>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}
      </MapContainer>
    </div>
  );
}
