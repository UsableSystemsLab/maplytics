import { toLeafletHeatPoints, toMapboxHeatGeoJSON } from "@/components/maps/shared/heatmapData";

describe("toLeafletHeatPoints", () => {
  it("returns [lat, lng, intensity] triples", () => {
    const out = toLeafletHeatPoints([
      { lat: 24.7, lng: 46.6, intensity: 0.8 },
      { lat: 25.0, lng: 47.0, intensity: 0.4 },
    ]);
    expect(out).toEqual([
      [24.7, 46.6, 0.8],
      [25.0, 47.0, 0.4],
    ]);
  });

  it("defaults missing intensity to 1", () => {
    const out = toLeafletHeatPoints([{ lat: 24.7, lng: 46.6 }]);
    expect(out).toEqual([[24.7, 46.6, 1]]);
  });

  it("returns an empty array for empty input", () => {
    expect(toLeafletHeatPoints([])).toEqual([]);
  });
});

describe("toMapboxHeatGeoJSON", () => {
  it("returns a FeatureCollection with [lng, lat] coordinates", () => {
    const out = toMapboxHeatGeoJSON([
      { lat: 24.7, lng: 46.6, intensity: 0.8 },
    ]);
    expect(out).toEqual({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [46.6, 24.7] }, // lng, lat
          properties: { intensity: 0.8 },
        },
      ],
    });
  });

  it("defaults missing intensity to 1", () => {
    const out = toMapboxHeatGeoJSON([{ lat: 24.7, lng: 46.6 }]);
    expect(out.features[0].properties.intensity).toBe(1);
  });

  it("returns a FeatureCollection with empty features for empty input", () => {
    expect(toMapboxHeatGeoJSON([])).toEqual({
      type: "FeatureCollection",
      features: [],
    });
  });
});
