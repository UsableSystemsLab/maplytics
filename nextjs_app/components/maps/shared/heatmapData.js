
export function toLeafletHeatPoints(features) {
  return features.map(f => [f.lat, f.lng, f.intensity ?? 1]);
}

export function toMapboxHeatGeoJSON(features) {
  return {
    type: "FeatureCollection",
    features: features.map(f => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [f.lng, f.lat] }, // GeoJSON is [lng, lat]
      properties: { intensity: f.intensity ?? 1 },
    })),
  };
}
