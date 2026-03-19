import { useEffect, useState } from 'react';
import MapView from './Component/MapView';
import GpsTracker from './Component/GpsTracker';
import AllGpsDevices from './Component/AllGpsDevices';
import { updateAmbulanceLocation } from "./Services/Api";
import './App.css';

// Unify Device ID across the entire app
const getMyDeviceId = () => {
  let id = localStorage.getItem("gps_device_id");
  if (!id) {
    id = "Amb-" + Math.random().toString(36).substring(2, 7).toUpperCase();
    localStorage.setItem("gps_device_id", id);
  }
  return id;
};

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [myDeviceId] = useState(getMyDeviceId);
  
  // Persistent GPS state
  const [isGpsOn, setIsGpsOn] = useState(() => {
    return localStorage.getItem("is_gps_on") === "true";
  });
  
  const [myGeoLocation, setMyGeoLocation] = useState(null);

  // 1. Sync GPS Toggle to Persistent Storage
  useEffect(() => {
    localStorage.setItem("is_gps_on", isGpsOn);
  }, [isGpsOn]);

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
    if (!isGpsOn || !myGeoLocation) return;

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
  }, [isGpsOn, myGeoLocation?.lat, myGeoLocation?.lon, myDeviceId]);

  const toggleGps = () => setIsGpsOn(prev => !prev);

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <nav className="app-nav">
        <div className="nav-brand">
          <span>🚑</span>
          <span className="nav-brand-text">Ambulance GPS System</span>
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
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;