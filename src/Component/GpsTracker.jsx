import { useEffect, useState } from "react";
import { updateAmbulanceLocation } from "../Services/Api";

// Generate or retrieve a unique device ID for this phone/browser
function getDeviceId() {
  let id = localStorage.getItem("gps_device_id");
  if (!id) {
    id = "Device-" + Math.random().toString(36).substring(2, 9).toUpperCase();
    localStorage.setItem("gps_device_id", id);
  }
  return id;
}

function GpsTracker({ isGpsOn, setIsGpsOn, myGeoLocation, myDeviceId }) {
  const status = !isGpsOn ? "❌ GPS Tracker is OFF" : (myGeoLocation ? "✅ Live GPS Active" : "📡 Connecting to GPS satellites...");

  return (
    <div className="gps-tracker-card">
      <div className="gps-tracker-header">
        <span className="gps-icon">📡</span>
        <h2>My GPS Tracker</h2>
      </div>

      <div className="device-id-badge">
        Device ID: <strong>{myDeviceId}</strong>
      </div>

      <div style={{ margin: "20px 0", textAlign: "center" }}>
        <button
          onClick={() => setIsGpsOn(!isGpsOn)}
          style={{
            padding: "12px 24px",
            fontSize: "16px",
            fontWeight: "bold",
            borderRadius: "50px",
            border: "none",
            backgroundColor: isGpsOn ? "#2ecc71" : "#e74c3c",
            color: "white",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            transition: "all 0.3s ease"
          }}
        >
          {isGpsOn ? "TURN GPS OFF" : "TURN GPS ON"}
        </button>
      </div>

      <div className={`gps-status ${isGpsOn && myGeoLocation ? "active" : "waiting"}`}>
        {status}
      </div>

      {isGpsOn && myGeoLocation ? (
        <div className="gps-coords">
          <div className="coord-row">
            <span className="coord-label">Latitude</span>
            <span className="coord-value">{myGeoLocation.lat.toFixed(6)}</span>
          </div>
          <div className="coord-row">
            <span className="coord-label">Longitude</span>
            <span className="coord-value">{myGeoLocation.lon.toFixed(6)}</span>
          </div>
          <div className="coord-row">
            <span className="coord-label">Speed</span>
            <span className="coord-value">
              {(myGeoLocation.speed * 3.6).toFixed(1)} km/h
            </span>
          </div>
        </div>
      ) : (
        <div className="gps-waiting">
          <div className="pulse-ring"></div>
          <p>{isGpsOn ? "Waiting for GPS signal..." : "Tracking is disabled. Turn it on to send your location to the system."}</p>
        </div>
      )}
    </div>
  );
}

export default GpsTracker;
