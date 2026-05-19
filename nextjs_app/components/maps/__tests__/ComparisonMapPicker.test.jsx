import { render, screen } from "@testing-library/react";
import { MapEngineContext } from "@/components/maps/MapEngineContext";
import ComparisonMap from "@/components/ComparisonMap";

jest.mock("@/components/maps/leaflet/LeafletComparisonMap", () => ({
  __esModule: true,
  default: () => <div data-testid="leaflet-comparison" />,
}));
jest.mock("@/components/maps/mapbox/MapboxComparisonMap", () => ({
  __esModule: true,
  default: () => <div data-testid="mapbox-comparison" />,
}));

function withEngine(engine, ui) {
  return (
    <MapEngineContext.Provider value={{ engine, mapboxToken: "pk", reportMapboxError: () => {} }}>
      {ui}
    </MapEngineContext.Provider>
  );
}

describe("ComparisonMap picker", () => {
  it("renders Leaflet child when engine is 'leaflet'", () => {
    render(withEngine("leaflet", <ComparisonMap mapId="a" center={[0,0]} zoom={3} />));
    expect(screen.getByTestId("leaflet-comparison")).toBeInTheDocument();
    expect(screen.queryByTestId("mapbox-comparison")).toBeNull();
  });

  it("renders Mapbox child when engine is 'mapbox'", () => {
    render(withEngine("mapbox", <ComparisonMap mapId="a" center={[0,0]} zoom={3} />));
    expect(screen.getByTestId("mapbox-comparison")).toBeInTheDocument();
    expect(screen.queryByTestId("leaflet-comparison")).toBeNull();
  });
});
