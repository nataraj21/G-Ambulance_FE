import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

function RoutingControl({ sourceLat, sourceLon, destLat, destLon }) {
  const map = useMap();
  const routingRef = useRef(null);

  useEffect(() => {
    if (!map || !sourceLat || !sourceLon || !destLat || !destLon) return;

    // Create new route
    const control = L.Routing.control({
      waypoints: [
        L.latLng(Number(sourceLat), Number(sourceLon)),
        L.latLng(Number(destLat), Number(destLon))
      ],
      routeWhileDragging: false,
      addWaypoints: false,
      fitSelectedRoutes: true,
      showAlternatives: false,
      position: "bottomleft",
      createMarker: () => null,
      lineOptions: {
        styles: [
          { color: "#4285F4", opacity: 0.9, weight: 6 },
          { color: "#1a73e8", opacity: 0.4, weight: 10 }
        ]
      }
    }).addTo(map);

    // Patch internal _clearLines to prevent crash when async OSRM response
    // arrives after the control has been removed from the map
    const origClearLines = control._clearLines;
    control._clearLines = function () {
      try {
        if (this._map) {
          origClearLines.call(this);
        }
      } catch (e) {
        // Silently ignore
      }
    };

    routingRef.current = control;

    // Cleanup
    return () => {
      try {
        if (routingRef.current) {
          routingRef.current.setWaypoints([]);
          map.removeControl(routingRef.current);
          routingRef.current = null;
        }
      } catch (e) {
        // Safely ignore if map is already destroyed
      }
    };
  }, [map, sourceLat, sourceLon, destLat, destLon]);

  return null;
}

export default RoutingControl;
