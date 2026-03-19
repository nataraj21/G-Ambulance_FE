import axios from "axios";

// Use relative URL so Vite proxy forwards to backend.
// This works on BOTH laptop (localhost) AND mobile (via laptop's network IP).
const API = axios.create({
  baseURL: "/api/"
});

export const getSignals = () => API.get("TrafficSignals");

export const getAmbulanceLocation = () => API.get("ambulance/location");

export const getAllLocations = () => API.get("ambulance/all-locations");

export const updateAmbulanceLocation = (data) =>
  API.post("ambulance/update-location", data);

