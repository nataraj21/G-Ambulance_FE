import { useEffect, useState } from 'react';
import MapView from './Component/MapView';
import GpsTracker from './Component/GpsTracker';
import AllGpsDevices from './Component/AllGpsDevices';
import { updateAmbulanceLocation } from "./Services/Api";
import './App.css';

// Get and Set Device ID (Persistent across sessions)
const getMyDeviceId = () => {
  return localStorage.getItem("gps_device_id");
};

const saveMyDeviceId = (id) => {
  localStorage.setItem("gps_device_id", id);
};

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [myDeviceId, setMyDeviceId] = useState(getMyDeviceId());
  const [tempId, setTempId] = useState(""); // For the setup form

  // Persistent GPS state
  const [isGpsOn, setIsGpsOn] = useState(() => {
    return localStorage.getItem("is_gps_on") === "true";
  });

  const [myGeoLocation, setMyGeoLocation] = useState(null);
  const [destination, setDestination] = useState(() => {
    const saved = localStorage.getItem("ambulance_destination");
    return saved ? JSON.parse(saved) : null;
  });

  // 1. Sync GPS Toggle and Destination to Persistent Storage
  useEffect(() => {
    localStorage.setItem("is_gps_on", isGpsOn);
    if (destination) {
      localStorage.setItem("ambulance_destination", JSON.stringify(destination));
    } else {
      localStorage.removeItem("ambulance_destination");
    }
  }, [isGpsOn, destination]);

  // 2. Global WatchPosition logic
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setMyGeoLocation({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          speed: pos.coords.speed || 0
        });
      },
      (err) => console.warn("Watch Error:", err),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // 3. Global Heartbeat (updates backend if GPS is ON)
  useEffect(() => {
    if (!isGpsOn || !myGeoLocation || !myDeviceId) return;

    const sendUpdate = () => {
      updateAmbulanceLocation({
        vehicleNumber: myDeviceId,
        latitude: myGeoLocation.lat,
        longitude: myGeoLocation.lon,
        speed: myGeoLocation.speed || 0,
      }).catch((err) => console.error("Global GPS Sync Error:", err));
    };

    sendUpdate(); // Initial call
    const interval = setInterval(sendUpdate, 5000); // Pulse every 5s
    return () => clearInterval(interval);
  }, [isGpsOn, myGeoLocation?.lat, myGeoLocation?.lon, myDeviceId, destination]);

  const toggleGps = () => setIsGpsOn(prev => !prev);

  const handleRegister = (e) => {
    e.preventDefault();
    if (tempId.trim()) {
      const formattedId = tempId.trim().toUpperCase();
      saveMyDeviceId(formattedId);
      setMyDeviceId(formattedId);
    }
  };

  const handleChangeVehicle = () => {
    if (window.confirm("Are you sure you want to change vehicle? This will stop your current tracking.")) {
      setIsGpsOn(false);
      localStorage.removeItem("gps_device_id");
      setMyDeviceId(null);
      setTempId("");
    }
  };

  // 4. Setup / Login Screen
  if (!myDeviceId) {
    return (
      <div className="setup-container" style={{
        height: "100vh", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f1117"
      }}>
        <div className="setup-card" style={{
          background: "#1a1d26", padding: "40px", borderRadius: "20px", width: "100%", maxWidth: "400px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", textAlign: "center"
        }}>
          <div style={{ fontSize: "50px", marginBottom: "20px" }}>🚑</div>
          <h1 style={{ color: "white", marginBottom: "10px" }}>Ambulance Setup</h1>
          <p style={{ color: "#718096", marginBottom: "30px" }}>Enter your Vehicle Number to start tracking</p>

          <form onSubmit={handleRegister}>
            <input
              type="text"
              placeholder="e.g. TN-01-AB-1234"
              value={tempId}
              onChange={(e) => setTempId(e.target.value)}
              style={{
                width: "100%", padding: "12px 16px", borderRadius: "10px", border: "1px solid #34495e",
                background: "#0f1117", color: "white", fontSize: "16px", marginBottom: "20px", outline: "none"
              }}
              required
            />
            <button
              type="submit"
              className="setup-btn"
              style={{
                width: "100%", padding: "14px", borderRadius: "10px", border: "none",
                background: "linear-gradient(135deg, #3498db, #2980b9)", color: "white",
                fontWeight: "bold", fontSize: "16px", cursor: "pointer", transition: "all 0.3s"
              }}
            >
              START TRACKING
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <nav className="app-nav">
        <div className="nav-brand">
          <span>🚑</span>
          <span className="nav-brand-text">Ambulance GPS ({myDeviceId})</span>
        </div>
        <div className="nav-tabs">
          <button
            id="tab-dashboard"
            className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            🗺️ Dashboard
          </button>
          <button
            id="tab-gps-monitor"
            className={`nav-tab ${activeTab === 'gps-monitor' ? 'active' : ''}`}
            onClick={() => setActiveTab('gps-monitor')}
          >
            📡 GPS Monitor
          </button>
          <button
            id="tab-my-gps"
            className={`nav-tab ${activeTab === 'my-gps' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-gps')}
          >
            📍 My GPS
          </button>
          <button
            className="nav-tab logout-tab"
            onClick={handleChangeVehicle}
            style={{ color: "#e74c3c", borderLeft: "1px solid rgba(255,255,255,0.1)", marginLeft: "10px" }}
          >
            🔄 Change Vehicle
          </button>
        </div>
      </nav>

      {/* Screen Content */}
      <main className="app-main">
        {activeTab === 'dashboard' && (
          <div className="screen-dashboard">
            <div className="screen-header">
              <div className="screen-header-left">
                <h1>Ambulance Dashboard</h1>
                <p className="screen-subtitle">Live map view of ambulance and traffic signals</p>
              </div>
              <div id="dashboard-header-right"></div>
            </div>
            <MapView
              isGpsOn={isGpsOn}
              setIsGpsOn={setIsGpsOn}
              myGeoLocation={myGeoLocation}
              myDeviceId={myDeviceId}
              destination={destination}
              allowSelection={false}
            />
          </div>
        )}

        {activeTab === 'gps-monitor' && (
          <div className="screen-gps-monitor">
            <AllGpsDevices />
          </div>
        )}

        {activeTab === 'my-gps' && (
          <div className="screen-my-gps">
            <div className="screen-header">
              <h1>My GPS Tracker</h1>
              <p className="screen-subtitle">Your device is sending live location to the server</p>
            </div>
            <GpsTracker
              isGpsOn={isGpsOn}
              setIsGpsOn={setIsGpsOn}
              myGeoLocation={myGeoLocation}
              myDeviceId={myDeviceId}
              destination={destination}
              setDestination={setDestination}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;