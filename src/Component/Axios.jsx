


import axios from "axios";

const API = axios.create({
  baseURL: "https://localhost:7002/TrafficSignals"
});

export const getSignals = () => API.get("/signal");