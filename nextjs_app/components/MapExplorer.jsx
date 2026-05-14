"use client";
import { useMapEngine } from "@/components/maps/useMapEngine";
import LeafletMapExplorer from "@/components/maps/leaflet/LeafletMapExplorer";
import MapboxMapExplorer from "@/components/maps/mapbox/MapboxMapExplorer";

export default function MapExplorer(props) {
  const { engine } = useMapEngine();
  return engine === "mapbox"
    ? <MapboxMapExplorer {...props} />
    : <LeafletMapExplorer {...props} />;
}
