import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from "react-leaflet";
import { useEffect, useState, useRef } from "react";
import { getAllLocations, seedMockData } from "../Services/Api";
import RoutingControl from "./RoutingControl";
import L from "leaflet";

// Icons for different devices
function makeDeviceIcon(index, isOnline) {
    const colors = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c", "#e67e22"];
    const color = isOnline ? colors[index % colors.length] : "#718096"; // Gray for offline
    return L.divIcon({
        html: `<div style="
      background:${color};
      border:3px solid white;
      border-radius:50%;
      width:32px;height:32px;
      display:flex;align-items:center;justify-content:center;
      font-size:16px;
      box-shadow:0 2px 8px rgba(0,0,0,0.4);
      filter: ${!isOnline ? 'grayscale(100%) opacity(80%)' : 'none'};
    ">🚑</div>`,
        className: "",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });
}

function FitBounds({ devices }) {
    const map = useMap();
    const fittedRef = useRef(false);

    useEffect(() => {
        if (devices.length > 0 && !fittedRef.current) {
            const bounds = devices.map((d) => [
                Number(d.latitude),
                Number(d.longitude),
            ]);
            map.fitBounds(bounds, { padding: [40, 40] });
            fittedRef.current = true;
        }
    }, [devices]);

    return null;
}

function MapCenter({ selectedDevice }) {
    const map = useMap();
    useEffect(() => {
        if (selectedDevice) {
            map.flyTo([Number(selectedDevice.latitude), Number(selectedDevice.longitude)], 15);
        }
    }, [selectedDevice, map]);
    return null;
}

function AllGpsDevices() {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [isSeeding, setIsSeeding] = useState(false);
    const [selectedVehicleNumber, setSelectedVehicleNumber] = useState(null);
    const myDeviceId = localStorage.getItem("gps_device_id");

    const fetchDevices = () => {
        getAllLocations()
            .then((res) => {
                if (!Array.isArray(res.data)) {
                    console.error("AllGpsDevices API returned non-array data:", res.data);
                    setDevices([]);
                    setLoading(false);
                    return;
                }
                const latestMap = new Map();
                res.data.forEach((device) => {
                    const existing = latestMap.get(device.vehicleNumber);
                    // Standardize time string for comparison
                    const timeStr = (device.updatedTime && !device.updatedTime.includes("Z") && !device.updatedTime.includes("+")) ? device.updatedTime + "Z" : device.updatedTime;
                    const updatedTime = new Date(timeStr);

                    if (!existing || updatedTime > new Date((existing.updatedTime && !existing.updatedTime.includes("Z") && !existing.updatedTime.includes("+")) ? existing.updatedTime + "Z" : existing.updatedTime)) {
                        latestMap.set(device.vehicleNumber, device);
                    }
                });

                console.log("Fetched devices:", res.data);
                setDevices(Array.from(latestMap.values()).sort((a, b) => a.vehicleNumber.localeCompare(b.vehicleNumber)));
                setLastUpdated(new Date());
                setLoading(false);
            });
    };

    const handleSeedData = () => {
        setIsSeeding(true);
        seedMockData()
            .then(() => {
                fetchDevices();
                setTimeout(() => setIsSeeding(false), 2000);
            })
            .catch((err) => {
                console.error("Failed to seed data:", err);
                setIsSeeding(false);
            });
    };

    useEffect(() => {
        fetchDevices();
        const interval = setInterval(fetchDevices, 3000);
        return () => clearInterval(interval);
    }, []);

    const defaultCenter = [11.916242, 79.809547];

    const now = new Date();
    const onlineCount = devices.filter(d => {
        const timeStr = (d.updatedTime && !d.updatedTime.includes("Z") && !d.updatedTime.includes("+")) ? d.updatedTime + "Z" : d.updatedTime;
        return (now - new Date(timeStr)) < 30000;
    }).length;

    const selectedDevice = devices.find(d => d.vehicleNumber === selectedVehicleNumber);

    return (
        <div className="all-gps-screen">
            {/* Header */}
            <div className="all-gps-header">
                <div className="all-gps-title">
                    <span>📡</span>
                    <h2>GPS Signal Monitor</h2>
                </div>
                <div className="all-gps-meta">
                    <span className="device-count-badge">{onlineCount} online / {devices.length} total</span>
                    {lastUpdated && (
                        <span className="last-updated">
                            Updated: {lastUpdated.toLocaleTimeString()}
                        </span>
                    )}
                    <button
                        onClick={handleSeedData}
                        disabled={isSeeding}
                        className="seed-data-btn"
                        style={{
                            padding: "6px 12px",
                            fontSize: "12px",
                            fontWeight: "bold",
                            borderRadius: "6px",
                            border: "none",
                            backgroundColor: isSeeding ? "#718096" : "#3498db",
                            color: "white",
                            cursor: isSeeding ? "not-allowed" : "pointer",
                            marginLeft: "12px",
                            transition: "all 0.2s"
                        }}
                    >
                        {isSeeding ? "⌛ Seeding..." : "➕ Seed Demo Data"}
                    </button>
                </div>
            </div>

            <div className="all-gps-body">
                {/* Sidebar - device list */}
                <div className="device-sidebar">
                    <h3 className="sidebar-title">Connected Devices</h3>
                    {loading ? (
                        <div className="device-loading">Loading...</div>
                    ) : devices.length === 0 ? (
                        <div className="no-devices">No active GPS devices found</div>
                    ) : (
                        <div className="device-list">
                            {Array.isArray(devices) && devices.map((device, index) => {
                                const isMe = device.vehicleNumber === myDeviceId;
                                // offline if last update > 30 seconds ago
                                const timeStr = (device.updatedTime && !device.updatedTime.includes("Z") && !device.updatedTime.includes("+")) ? device.updatedTime + "Z" : device.updatedTime;
                                const isOnline = (now - new Date(timeStr)) < 30000;

                                return (
                                    <div
                                        key={device.id}
                                        className={`device-card ${isMe ? "device-card-me" : ""} ${!isOnline ? "device-card-offline" : ""} ${selectedVehicleNumber === device.vehicleNumber ? "active" : ""}`}
                                        style={{
                                            opacity: !isOnline ? 0.6 : 1,
                                            cursor: "pointer",
                                            borderLeft: selectedVehicleNumber === device.vehicleNumber ? "4px solid #3498db" : "4px solid transparent",
                                            background: selectedVehicleNumber === device.vehicleNumber ? "rgba(52, 152, 219, 0.1)" : ""
                                        }}
                                        onClick={() => setSelectedVehicleNumber(device.vehicleNumber)}
                                    >
                                        <div className="device-card-top">
                                            <div
                                                className="device-color-dot"
                                                style={{
                                                    background: isOnline ? ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c", "#e67e22"][index % 7] : "#718096",
                                                }}
                                            />
                                            <span className="device-name">
                                                {device.vehicleNumber}
                                                {isMe && <span className="me-badge">YOU</span>}
                                                {!isOnline && <span className="me-badge" style={{ background: "#718096", color: "#e2e8f0" }}>OFFLINE</span>}
                                            </span>
                                        </div>
                                        <div className="device-coords">
                                            <span>📍 {Number(device.latitude).toFixed(5)}, {Number(device.longitude).toFixed(5)}</span>
                                        </div>
                                        <div className="device-speed">
                                            🏃 Speed: {(Number(device.speed) * 3.6).toFixed(1)} km/h
                                        </div>
                                        {device.destinationName && (
                                            <div className="device-destination" style={{ color: "#3498db", fontSize: "12px", marginTop: "4px", fontWeight: "600" }}>
                                                🏥 Destination: {device.destinationName}
                                            </div>
                                        )}
                                        <div className="device-time">
                                            🕐 {isOnline ? 'Online now' : `Last seen: ${new Date(device.updatedTime).toLocaleTimeString()}`}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Map */}
                <div className="all-gps-map">
                    <MapContainer
                        center={defaultCenter}
                        zoom={13}
                        style={{ height: "100%", width: "100%" }}
                    >
                        <TileLayer
                            attribution="OpenStreetMap"
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {devices.length > 0 && <FitBounds devices={devices} />}
                        {selectedDevice && <MapCenter selectedDevice={selectedDevice} />}

                        {selectedDevice && selectedDevice.destinationLatitude && selectedDevice.destinationLongitude && (
                            <RoutingControl
                                sourceLat={selectedDevice.latitude}
                                sourceLon={selectedDevice.longitude}
                                destLat={selectedDevice.destinationLatitude}
                                destLon={selectedDevice.destinationLongitude}
                            />
                        )}

                        {Array.isArray(devices) && devices.map((device, index) => {
                            const timeStr = (device.updatedTime && !device.updatedTime.includes("Z") && !device.updatedTime.includes("+")) ? device.updatedTime + "Z" : device.updatedTime;
                            const isOnline = (now - new Date(timeStr)) < 30000;
                            return (
                                <Marker
                                    key={device.id}
                                    position={[Number(device.latitude), Number(device.longitude)]}
                                    icon={makeDeviceIcon(index, isOnline)}
                                >
                                    <Tooltip permanent direction="top" offset={[0, -20]} className="marker-tooltip">
                                        <strong>{device.vehicleNumber}</strong>
                                    </Tooltip>
                                    <Popup>
                                        <div style={{ minWidth: "160px" }}>
                                            <strong>🚑 {device.vehicleNumber}</strong>
                                            {device.vehicleNumber === myDeviceId && (
                                                <span style={{ color: "#3498db", marginLeft: "6px", fontSize: "11px" }}>(YOU)</span>
                                            )}
                                            {!isOnline && (
                                                <span style={{ color: "#718096", marginLeft: "6px", fontSize: "11px", fontWeight: "bold" }}>(OFFLINE)</span>
                                            )}
                                            <br />
                                            📍 {Number(device.latitude).toFixed(6)}, {Number(device.longitude).toFixed(6)}
                                            <br />
                                            🏃 {(Number(device.speed) * 3.6).toFixed(1)} km/h
                                            {device.destinationName && (
                                                <>
                                                    <br />
                                                    🏥 <strong>To: {device.destinationName}</strong>
                                                </>
                                            )}
                                            <br />
                                            🕐 {isOnline ? 'Active' : `Last updated: ${new Date(device.updatedTime).toLocaleTimeString()}`}
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MapContainer>
                </div>
            </div>
        </div>
    );
}

export default AllGpsDevices;
