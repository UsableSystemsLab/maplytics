"use client";
import { useEffect, useRef, useContext } from "react";
import { MapEngineContext } from "@/components/maps/MapEngineContext";
import { MAPBOX_STYLE, DEFAULT_CENTER, DEFAULT_ZOOM } from "@/components/maps/shared/mapDefaults";

// Mirrors LeafletComparisonMap props:
//   markers: [{ position: [lat, lng], title: string }, ...]
//   boundaryGeoJSON, featurePoints (FeatureCollection of Points)
// Coordinate boundary: Leaflet [lat, lng] in props -> Mapbox [lng, lat] internally.

export default function MapboxComparisonMap({
  mapId,
  center,
  zoom,
  markers = [],
  boundaryGeoJSON = null,
  featurePoints = null,
  color = '#2563eb',
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerObjsRef = useRef([]);
  const { mapboxToken, reportMapboxError } = useContext(MapEngineContext);

  // Init map once per mapId
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      await import("mapbox-gl/dist/mapbox-gl.css");
      if (cancelled) return;

      mapboxgl.accessToken = mapboxToken;

      const [lat, lng] = center || DEFAULT_CENTER;
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: MAPBOX_STYLE,
        center: [lng, lat],
        zoom: zoom ?? DEFAULT_ZOOM,
        attributionControl: true,
      });

      map.on("error", (e) => reportMapboxError(e.error || e));
      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapId, mapboxToken]);

  // Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let mounted = true;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (!mounted || !mapRef.current) return;

      markerObjsRef.current.forEach(m => m.remove());
      markerObjsRef.current = [];

      markers.forEach(m => {
        const [lat, lng] = m.position;
        const marker = new mapboxgl.Marker()
          .setLngLat([lng, lat])
          .addTo(mapRef.current);
        if (m.title) {
          marker.setPopup(new mapboxgl.Popup().setText(m.title));
        }
        markerObjsRef.current.push(marker);
      });
    })();

    return () => {
      mounted = false;
      markerObjsRef.current.forEach(m => m.remove());
      markerObjsRef.current = [];
    };
  }, [markers]);

  // Boundary
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !boundaryGeoJSON) return;

    const apply = () => {
      if (map.getSource("boundary-src")) {
        map.getSource("boundary-src").setData(boundaryGeoJSON);
      } else {
        map.addSource("boundary-src", { type: "geojson", data: boundaryGeoJSON });
        map.addLayer({
          id: "boundary-fill",
          type: "fill",
          source: "boundary-src",
          paint: { "fill-color": color, "fill-opacity": 0.12 },
        });
        map.addLayer({
          id: "boundary-line",
          type: "line",
          source: "boundary-src",
          paint: { "line-color": color, "line-width": 3 },
        });
      }

      const bbox = computeBboxFromGeoJSON(boundaryGeoJSON);
      if (bbox) map.fitBounds(bbox, { padding: 30, duration: 600 });
    };

    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);

    return () => {
      if (!mapRef.current) return;
      const m = mapRef.current;
      if (m.getLayer("boundary-fill")) m.removeLayer("boundary-fill");
      if (m.getLayer("boundary-line")) m.removeLayer("boundary-line");
      if (m.getSource("boundary-src")) m.removeSource("boundary-src");
    };
  }, [boundaryGeoJSON, color]);

  // Feature points (supports Point / Polygon / LineString geometries — mirrors L.geoJSON)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !featurePoints?.features?.length) return;

    const apply = () => {
      if (map.getSource("feature-points-src")) {
        map.getSource("feature-points-src").setData(featurePoints);
      } else {
        map.addSource("feature-points-src", { type: "geojson", data: featurePoints });

        map.addLayer({
          id: "feature-points-fill",
          type: "fill",
          source: "feature-points-src",
          filter: ["any",
            ["==", ["geometry-type"], "Polygon"],
            ["==", ["geometry-type"], "MultiPolygon"],
          ],
          paint: { "fill-color": color, "fill-opacity": 0.25 },
        });
        map.addLayer({
          id: "feature-points-outline",
          type: "line",
          source: "feature-points-src",
          filter: ["any",
            ["==", ["geometry-type"], "Polygon"],
            ["==", ["geometry-type"], "MultiPolygon"],
            ["==", ["geometry-type"], "LineString"],
            ["==", ["geometry-type"], "MultiLineString"],
          ],
          paint: { "line-color": color, "line-width": 2 },
        });
        map.addLayer({
          id: "feature-points-circle",
          type: "circle",
          source: "feature-points-src",
          paint: {
            "circle-radius": 7,
            "circle-color": color,
            "circle-stroke-color": "#fff",
            "circle-stroke-width": 2,
          },
        });

        import("mapbox-gl").then(({ default: mapboxgl }) => {
          const openPopup = (e) => {
            const feat = e.features?.[0];
            if (!feat) return;
            const props = feat.properties || {};
            const featureName = props.name || props.title || props.id || "Feature";
            const HIDDEN = new Set(["name", "title", "id", "_dataset_id"]);
            const entries = Object.entries(props).filter(([k, v]) =>
              !HIDDEN.has(k) && typeof v !== "object" && v !== null && v !== ""
            );
            const propsHtml = entries.length
              ? `<dl class="maplytics-popup__list">${entries.slice(0, 12).map(([k, v]) =>
                  `<div class="maplytics-popup__row"><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(String(v))}</dd></div>`
                ).join("")}</dl>`
              : '<div class="maplytics-popup__empty">No additional properties</div>';
            const html = `
              <div class="maplytics-popup__body">
                <h3 class="maplytics-popup__title">${escapeHtml(featureName)}</h3>
                ${propsHtml}
              </div>
            `;
            const lngLat = feat.geometry?.type === "Point" ? feat.geometry.coordinates : e.lngLat;
            new mapboxgl.Popup({
              className: "maplytics-popup",
              maxWidth: "320px",
              offset: 12,
              closeOnClick: true,
            })
              .setLngLat(lngLat)
              .setHTML(html)
              .addTo(map);
          };
          ["feature-points-circle", "feature-points-fill", "feature-points-outline"].forEach((id) => {
            map.on("click", id, openPopup);
            map.on("mouseenter", id, () => { map.getCanvas().style.cursor = "pointer"; });
            map.on("mouseleave", id, () => { map.getCanvas().style.cursor = ""; });
          });
        });
      }

      if (!boundaryGeoJSON) {
        const bbox = computeBboxFromGeoJSON(featurePoints);
        if (bbox) map.fitBounds(bbox, { padding: 30, duration: 600 });
      }
    };

    if (map.isStyleLoaded()) {
      apply();
    } else {
      map.once("load", apply);
      map.once("idle", () => {
        if (!map.getSource("feature-points-src")) apply();
      });
    }

    return () => {
      if (!mapRef.current) return;
      const m = mapRef.current;
      ["feature-points-circle", "feature-points-outline", "feature-points-fill"].forEach((id) => {
        if (m.getLayer(id)) m.removeLayer(id);
      });
      if (m.getSource("feature-points-src")) m.removeSource("feature-points-src");
    };
  }, [featurePoints, color, boundaryGeoJSON]);

  return <div ref={containerRef} id={mapId} className="w-full h-full rounded-lg" />;
}

// Helpers --------------------------------------------------------------

function computeBboxFromGeoJSON(geojson) {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  const visit = (coords) => {
    if (typeof coords[0] === "number") {
      const [lng, lat] = coords;
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
    } else {
      coords.forEach(visit);
    }
  };
  const walk = (g) => {
    if (!g) return;
    if (g.type === "FeatureCollection") g.features.forEach(f => walk(f));
    else if (g.type === "Feature") walk(g.geometry);
    else if (g.coordinates) visit(g.coordinates);
  };
  walk(geojson);
  if (!isFinite(minLng)) return null;
  return [[minLng, minLat], [maxLng, maxLat]];
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
