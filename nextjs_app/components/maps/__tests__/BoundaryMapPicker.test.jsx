import { createRef } from "react";
import { render } from "@testing-library/react";
import { MapEngineContext } from "@/components/maps/MapEngineContext";
import BoundaryMap from "@/components/BoundaryMap";

const leafletApi = { engine: "leaflet" };
const mapboxApi = { engine: "mapbox" };

jest.mock("@/components/maps/leaflet/LeafletBoundaryMap", () => {
  const { forwardRef, useImperativeHandle } = require("react");
  return {
    __esModule: true,
    default: forwardRef(function StubLeaflet(_props, ref) {
      useImperativeHandle(ref, () => leafletApi, []);
      return <div data-testid="leaflet-boundary" />;
    }),
  };
});
jest.mock("@/components/maps/mapbox/MapboxBoundaryMap", () => {
  const { forwardRef, useImperativeHandle } = require("react");
  return {
    __esModule: true,
    default: forwardRef(function StubMapbox(_props, ref) {
      useImperativeHandle(ref, () => mapboxApi, []);
      return <div data-testid="mapbox-boundary" />;
    }),
  };
});

function withEngine(engine, ui) {
  return (
    <MapEngineContext.Provider value={{ engine, mapboxToken: "pk", reportMapboxError: () => {} }}>
      {ui}
    </MapEngineContext.Provider>
  );
}

describe("BoundaryMap picker", () => {
  it("renders Leaflet child and forwards ref when engine is 'leaflet'", () => {
    const ref = createRef();
    const { getByTestId } = render(withEngine("leaflet", <BoundaryMap ref={ref} />));
    expect(getByTestId("leaflet-boundary")).toBeInTheDocument();
    expect(ref.current).toBe(leafletApi);
  });

  it("renders Mapbox child and forwards ref when engine is 'mapbox'", () => {
    const ref = createRef();
    const { getByTestId } = render(withEngine("mapbox", <BoundaryMap ref={ref} />));
    expect(getByTestId("mapbox-boundary")).toBeInTheDocument();
    expect(ref.current).toBe(mapboxApi);
  });
});
