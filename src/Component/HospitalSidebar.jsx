import { useState } from "react";
import { HOSPITALS } from "../Data/hospitals";

// Helper to calculate distance between two points (in km)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const HospitalSidebar = ({ ambulances, myDeviceId, myGeoLocation, destination, setDestination }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleHospitalSelect = (h) => {
    setDestination({ lat: h.lat, lon: h.lon, name: h.name });
    setSearchQuery(h.name);
  };

  const filteredHospitals = HOSPITALS.filter((h) => {
    const words = searchQuery.toLowerCase().trim().split(/\s+/);
    const name = h.name.toLowerCase();
    return words.every((word) => name.includes(word));
  });

  return (
    <aside className="hospital-sidebar">
      <div className="hospital-sidebar-header">
        <h3>
          <span>🏥</span> Hospital Finder
        </h3>
        <p className="hospital-count">{filteredHospitals.length} hospitals found</p>
        <div className="hospital-search-box">
          <span className="search-icon-inside">🔍</span>
          <input
            type="text"
            placeholder="Search hospital name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="hospital-list">
        {filteredHospitals.map((h) => {
          const myAmbulance = ambulances.find((amb) => amb.vehicleNumber === myDeviceId);
          const sourceLat = (myGeoLocation?.lat) || (myAmbulance ? Number(myAmbulance.latitude) : null);
          const sourceLon = (myGeoLocation?.lon) || (myAmbulance ? Number(myAmbulance.longitude) : null);
          const dist = sourceLat && sourceLon ? getDistance(sourceLat, sourceLon, h.lat, h.lon) : null;

          return (
            <div
              key={h.id}
              className={`hospital-item ${destination?.lat === h.lat && destination?.lon === h.lon ? "active" : ""}`}
              onClick={() => handleHospitalSelect(h)}
            >
              <div className="hospital-item-name">{h.name}</div>
              <div className="hospital-item-details">
                {dist !== null && (
                  <span className="hospital-item-distance">
                    📍 {dist.toFixed(1)} km away
                  </span>
                )}
                <span>ID: {h.id}</span>
              </div>
            </div>
          );
        })}
      </div>

      {destination && (
        <div className="selected-hospital-info">
          <h4>Selected Destination</h4>
          <div style={{ color: "#e2e8f0", fontSize: "14px", fontWeight: "600" }}>{destination.name}</div>
          <div className="route-actions">
            <button
              className="btn-outline"
              onClick={() => {
                setDestination(null);
                setSearchQuery("");
              }}
            >
              Clear
            </button>
            <button className="btn-primary" onClick={() => {
              // Potential action like "Start Navigation" or just zoom to point
            }}>
              Navigate
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};

export default HospitalSidebar;
