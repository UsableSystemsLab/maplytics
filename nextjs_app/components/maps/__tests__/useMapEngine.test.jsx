import { render, act } from "@testing-library/react";
import { MapEngineProvider } from "@/components/maps/MapEngineContext";
import { useMapEngine } from "@/components/maps/useMapEngine";

function Probe({ onValue }) {
  const value = useMapEngine();
  onValue(value);
  return null;
}

const ORIGINAL_ENV = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

afterEach(() => {
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN = ORIGINAL_ENV;
  sessionStorage.clear();
});

describe("MapEngineProvider + useMapEngine", () => {
  it("resolves to leaflet when no token is configured", () => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = "";
    let captured;
    render(
      <MapEngineProvider>
        <Probe onValue={(v) => { captured = v; }} />
      </MapEngineProvider>
    );
    expect(captured.engine).toBe("leaflet");
    expect(captured.mapboxToken).toBeFalsy();
  });

  it("resolves to mapbox when a token is configured and sessionStorage is clean", () => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = "pk.test_token";
    let captured;
    render(
      <MapEngineProvider>
        <Probe onValue={(v) => { captured = v; }} />
      </MapEngineProvider>
    );
    expect(captured.engine).toBe("mapbox");
    expect(captured.mapboxToken).toBe("pk.test_token");
  });

  it("respects sticky leaflet fallback from sessionStorage", () => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = "pk.test_token";
    sessionStorage.setItem("maplytics:mapEngine", "leaflet");
    let captured;
    render(
      <MapEngineProvider>
        <Probe onValue={(v) => { captured = v; }} />
      </MapEngineProvider>
    );
    expect(captured.engine).toBe("leaflet");
  });

  it("reportMapboxError flips engine to leaflet and persists in sessionStorage", () => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = "pk.test_token";
    let captured;
    render(
      <MapEngineProvider>
        <Probe onValue={(v) => { captured = v; }} />
      </MapEngineProvider>
    );
    expect(captured.engine).toBe("mapbox");

    act(() => { captured.reportMapboxError(new Error("quota exhausted")); });

    expect(captured.engine).toBe("leaflet");
    expect(sessionStorage.getItem("maplytics:mapEngine")).toBe("leaflet");
  });
});
