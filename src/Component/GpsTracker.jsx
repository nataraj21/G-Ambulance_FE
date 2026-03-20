import { useEffect, useState } from "react";
import { updateAmbulanceLocation, getAllLocations } from "../Services/Api";
import HospitalSidebar from "./HospitalSidebar";

function GpsTracker({ isGpsOn, setIsGpsOn, myGeoLocation, myDeviceId }) {
  const [ambulances, setAmbulances] = useState([]);
  const [destination, setDestination] = useState(null);
  const status = !isGpsOn ? "❌ GPS Tracker is OFF" : (myGeoLocation ? "✅ Live GPS Active" : "📡 Connecting to GPS satellites...");

  // Fetch all ambulances so HospitalSidebar can calculate distances
  useEffect(() => {
    const fetchAmbulances = () => {
      getAllLocations()
        .then((res) => {
          setAmbulances(res.data);
        })
        .catch((err) => console.log(err));
    };

    fetchAmbulances();
    const interval = setInterval(fetchAmbulances, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: "flex", height: "calc(100vh - 180px)", width: "100%", background: "#0f1117", overflow: "hidden" }}>
      {/* Tracker Content wrapper */}
      <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div className="gps-tracker-card" style={{ width: "100%", maxWidth: "600px" }}>
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
      </div>

      {/* Right-side Hospital Sidebar */}
      <HospitalSidebar 
        ambulances={ambulances}
        myDeviceId={myDeviceId}
        myGeoLocation={myGeoLocation}
        destination={destination}
        setDestination={setDestination}
      />
    </div>
  );
}

export default GpsTracker;
