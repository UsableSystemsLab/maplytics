"use client";
import { createContext, useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "maplytics:mapEngine";

export const MapEngineContext = createContext({
  engine: "leaflet",
  mapboxToken: null,
  reportMapboxError: () => {},
});

export function MapEngineProvider({ children }) {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || null;
  const [engine, setEngine] = useState("leaflet"); // SSR-safe default

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sticky = window.sessionStorage.getItem(STORAGE_KEY);
    if (sticky === "leaflet") {
      setEngine("leaflet");
      return;
    }
    if (!mapboxToken) {
      setEngine("leaflet");
      return;
    }
    setEngine("mapbox");
  }, [mapboxToken]);

  const reportMapboxError = useCallback((err) => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, "leaflet");
    }
    // eslint-disable-next-line no-console
    console.warn("Mapbox failed, falling back to Leaflet:", err);
    setEngine("leaflet");
  }, []);

  return (
    <MapEngineContext.Provider value={{ engine, mapboxToken, reportMapboxError }}>
      {children}
    </MapEngineContext.Provider>
  );
}
