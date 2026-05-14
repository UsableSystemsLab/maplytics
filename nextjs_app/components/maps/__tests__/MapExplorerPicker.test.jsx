import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { store } from "@/lib/store/store";
import { MapEngineContext } from "@/components/maps/MapEngineContext";
import MapExplorer from "@/components/MapExplorer";

jest.mock("@/components/maps/leaflet/LeafletMapExplorer", () => ({
  __esModule: true,
  default: () => <div data-testid="leaflet-explorer" />,
}));
jest.mock("@/components/maps/mapbox/MapboxMapExplorer", () => ({
  __esModule: true,
  default: () => <div data-testid="mapbox-explorer" />,
}));

function withEngine(engine, ui) {
  return (
    <Provider store={store}>
      <MapEngineContext.Provider value={{ engine, mapboxToken: "pk", reportMapboxError: () => {} }}>
        {ui}
      </MapEngineContext.Provider>
    </Provider>
  );
}

describe("MapExplorer picker", () => {
  it("renders Leaflet child when engine is 'leaflet'", () => {
    render(withEngine("leaflet", <MapExplorer />));
    expect(screen.getByTestId("leaflet-explorer")).toBeInTheDocument();
  });

  it("renders Mapbox child when engine is 'mapbox'", () => {
    render(withEngine("mapbox", <MapExplorer />));
    expect(screen.getByTestId("mapbox-explorer")).toBeInTheDocument();
  });
});
