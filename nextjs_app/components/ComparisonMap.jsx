"use client";
import { useMapEngine } from "@/components/maps/useMapEngine";
import LeafletComparisonMap from "@/components/maps/leaflet/LeafletComparisonMap";
import MapboxComparisonMap from "@/components/maps/mapbox/MapboxComparisonMap";

export default function ComparisonMap(props) {
  const { engine } = useMapEngine();
  return engine === "mapbox"
    ? <MapboxComparisonMap {...props} />
    : <LeafletComparisonMap {...props} />;
}
