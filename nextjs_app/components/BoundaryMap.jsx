"use client";
import { forwardRef } from "react";
import { useMapEngine } from "@/components/maps/useMapEngine";
import LeafletBoundaryMap from "@/components/maps/leaflet/LeafletBoundaryMap";
import MapboxBoundaryMap from "@/components/maps/mapbox/MapboxBoundaryMap";

const BoundaryMap = forwardRef(function BoundaryMap(props, ref) {
  const { engine } = useMapEngine();
  return engine === "mapbox"
    ? <MapboxBoundaryMap ref={ref} {...props} />
    : <LeafletBoundaryMap ref={ref} {...props} />;
});

export default BoundaryMap;
