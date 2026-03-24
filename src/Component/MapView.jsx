import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { getSignals, getAllLocations, updateAmbulanceLocation } from "../Services/Api";
import HospitalSidebar from "./HospitalSidebar";
import { HOSPITALS } from "../Data/hospitals";
import L from "leaflet";
import RoutingControl from "./RoutingControl";

// Helper to calculate distance between two points (in km)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper component for handling map clicks (custom points on map)
function MapClickMarker({ destination, onSelectHospital }) {
  useMapEvents({
    click(e) {
      const clickLat = e.latlng.lat;
      const clickLon = e.latlng.lng;

      // Find the nearest hospital
      let nearest = null;
      let minDistance = Infinity;

      HOSPITALS.forEach(h => {
        const dist = getDistance(clickLat, clickLon, h.lat, h.lon);
        if (dist < minDistance) {
          minDistance = dist;
          nearest = h;
        }
      });

      if (nearest) {
        onSelectHospital(nearest);
      }
    },
  });

  const destinationIcon = L.divIcon({
    html: '<div style="font-size:32px; filter: drop-shadow(0 0 8px #e74c3c);">📍</div>',
    className: "",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });

  return destination === null ? null : (
    <Marker position={[destination.lat, destination.lon]} icon={destinationIcon}>
      <Tooltip direction="top" offset={[0, -40]} permanent={false} sticky>
        🏥 {destination.name || 'Selected Destination'}
      </Tooltip>
      <Popup>{destination.name || 'Selected Destination'}</Popup>
    </Marker>
  );
}

// Component to handle map centering when GPS is turned on
function MapUpdater({ isGpsOn, myGeoLocation }) {
  const map = useMap();
  const [hasCentered, setHasCentered] = useState(false);

  useEffect(() => {
    if (isGpsOn && myGeoLocation && !hasCentered) {
      map.flyTo([myGeoLocation.lat, myGeoLocation.lon], 15);
      setHasCentered(true);
    }
    if (!isGpsOn) {
      setHasCentered(false);
    }
  }, [isGpsOn, myGeoLocation, map, hasCentered]);

  return null;
}


function MapView({ isGpsOn, setIsGpsOn, myGeoLocation, myDeviceId, destination, setDestination, allowSelection = true }) {
  const [signals, setSignals] = useState([]);
  const [ambulances, setAmbulances] = useState([]);

  // Default center point when loading
  const defaultCenter = [11.916242, 79.809547];

  function makeAmbulanceIcon(isMe, isOnline = true) {
    const opacity = isOnline ? 1 : 0.6;
    const filter = isMe ? "drop-shadow(0 0 8px #3498db)" : (isOnline ? "none" : "grayscale(100%)");
    return L.divIcon({
      html: `<div style="font-size:${isMe ? "32px" : "30px"}; filter: ${filter}; opacity: ${opacity}">🚑</div>`,
      className: "",
      iconSize: [40, 40],
    });
  }

  const signalIcon = L.divIcon({
    html: '<div style="font-size:30px;">🚦</div>',
    className: "",
    iconSize: [40, 40],
  });

  // Load traffic signals
  useEffect(() => {
    getSignals()
      .then((res) => {
        // Safety check: Ensure res.data is an array
        if (Array.isArray(res.data)) {
          setSignals(res.data);
        } else {
          console.error("TrafficSignals API returned non-array data:", res.data);
          setSignals([]);
        }
      })
      .catch((err) => {
        console.error("Failed to load traffic signals:", err);
        setSignals([]);
      });
  }, []);

  // Fetch all live ambulances and handle the proper active state
  useEffect(() => {
    const fetchAmbulances = () => {
      getAllLocations()
        .then((res) => {
          if (!Array.isArray(res.data)) {
            console.error("Ambulance locations API returned non-array data:", res.data);
            return;
          }
          const now = new Date();
          const latestMap = new Map();

          res.data.forEach((amb) => {
            const timeStr = (amb.updatedTime && !amb.updatedTime.includes("Z") && !amb.updatedTime.includes("+"))
              ? amb.updatedTime + "Z"
              : amb.updatedTime;
            const updatedTime = new Date(timeStr);
            const isOnline = (now - updatedTime) < 30000;

            const existing = latestMap.get(amb.vehicleNumber);
            // Avoid duplicates: If multiple exist, take the most recent update
            if (!existing || updatedTime > new Date(existing.updatedTime.includes("Z") ? existing.updatedTime : existing.updatedTime + "Z")) {
              latestMap.set(amb.vehicleNumber, { ...amb, isOnline });
            }
          });

          setAmbulances(Array.from(latestMap.values()));
        })
        .catch((err) => console.log(err));
    };

    fetchAmbulances(); // initial fetch
    const interval = setInterval(fetchAmbulances, 2000); // Poll every 2s
    return () => clearInterval(interval);
  }, []);

  const handleHospitalSelect = (h) => {
    setDestination({ lat: h.lat, lon: h.lon, name: h.name });
  };

  return (
    <div style={{ height: "calc(100vh - 180px)", width: "100%", background: "#0f1117", overflow: "hidden", padding: "16px" }}>
      <div style={{ height: "100%", width: "100%", borderRadius: "16px", overflow: "hidden", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
        <MapContainer center={defaultCenter} zoom={13} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution="OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapUpdater isGpsOn={isGpsOn} myGeoLocation={myGeoLocation} />

          {allowSelection && (
            <MapClickMarker destination={destination} onSelectHospital={handleHospitalSelect} />
          )}

          {(() => {
            const myAmbulance = ambulances.find((amb) => amb.vehicleNumber === myDeviceId);
            const sourceLat = (isGpsOn && myGeoLocation) ? myGeoLocation.lat : (myAmbulance ? Number(myAmbulance.latitude) : myGeoLocation?.lat);
            const sourceLon = (isGpsOn && myGeoLocation) ? myGeoLocation.lon : (myAmbulance ? Number(myAmbulance.longitude) : myGeoLocation?.lon);
            if (sourceLat && sourceLon && destination) {
              return (
                <RoutingControl
                  sourceLat={sourceLat}
                  sourceLon={sourceLon}
                  destLat={destination.lat}
                  destLon={destination.lon}
                />
              );
            }
            return null;
          })()}

          {(() => {
            const myAmb = ambulances.find(a => a.vehicleNumber === myDeviceId);
            const pos = (isGpsOn && myGeoLocation)
              ? [myGeoLocation.lat, myGeoLocation.lon]
              : (myAmb ? [Number(myAmb.latitude), Number(myAmb.longitude)] : null);

            if (!pos) return null;

            return (
              <Marker position={pos} icon={makeAmbulanceIcon(true, isGpsOn || (myAmb?.isOnline))}>
                <Tooltip permanent direction="top" offset={[0, -40]} className="marker-tooltip">
                  <strong>{myDeviceId}</strong> (YOU)
                </Tooltip>
                <Popup>
                  🚑 <strong>{myDeviceId}</strong> <span style={{ color: "#3498db" }}> (YOU)</span>
                  <br />
                  {isGpsOn ? "📡 Live Accuracy Mode" : (myAmb?.isOnline ? "🕐 Active (Reporting from DB)" : "📵 Offline (Last reported position)")}
                  <br />
                  Speed: {((isGpsOn && myGeoLocation ? myGeoLocation.speed : (myAmb ? myAmb.speed : 0)) * 3.6).toFixed(1)} km/h
                </Popup>
              </Marker>
            );
          })()}

          {/* Show Other Ambulances - Only show online ones */}
          {Array.isArray(ambulances) && ambulances
            .filter((amb) => amb.vehicleNumber !== myDeviceId && amb.isOnline)
            .map((amb) => (
              <Marker
                key={amb.vehicleNumber}
                position={[Number(amb.latitude), Number(amb.longitude)]}
                icon={makeAmbulanceIcon(false, amb.isOnline)}
              >
                <Tooltip permanent direction="top" offset={[0, -40]} className="marker-tooltip">
                  <strong>{amb.vehicleNumber}</strong>
                </Tooltip>
                <Popup>
                  🚑 <strong>{amb.vehicleNumber}</strong>
                  <br />
                  Speed: {(Number(amb.speed) * 3.6).toFixed(1)} km/h
                  {amb.destinationName && (
                    <>
                      <br />
                      🏥 <strong>To: {amb.destinationName}</strong>
                    </>
                  )}
                  <br />
                  {amb.isOnline ? "🕐 Active" : "📵 Offline (Last seen)"}
                </Popup>
              </Marker>
            ))}

          {Array.isArray(signals) && signals.map((signal) => (
            <Marker
              key={`sig-${signal.id}`}
              position={[signal.latitude, signal.longitude]}
              icon={signalIcon}
            >
              <Popup>
                🚦 <strong>{signal.signalName}</strong>
                <br />
                Status: {signal.status}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

export default MapView;