"use client";
import { useEffect, useRef, useContext, forwardRef, useImperativeHandle } from "react";
import { MapEngineContext } from "@/components/maps/MapEngineContext";
import { MAPBOX_STYLE, SAUDI_CENTER, SAUDI_ZOOM } from "@/components/maps/shared/mapDefaults";
import { getDistrictColor } from "@/lib/districtColors";


const LAYER_PALETTE = ['#0E3147', '#A7B34F', '#13B38D', '#F59E0B', '#EF4444', '#8B5CF6'];

const generatePopupContent = (properties) => {
  if (!properties || Object.keys(properties).length === 0) {
    return '<p style="color: #6b7280;">No properties available</p>';
  }
  const nameFields = ['name', 'name_ar', 'title', 'label'];
  let primaryName = '';
  for (const field of nameFields) {
    if (properties[field]) { primaryName = properties[field]; break; }
  }
  let html = '<div style="padding: 8px; max-width: 250px;">';
  if (primaryName) {
    html += `<h3 style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: #1f2937;">${primaryName}</h3>`;
  }
  html += '<div style="display: flex; flex-direction: column; gap: 2px;">';
  for (const [key, value] of Object.entries(properties)) {
    if (nameFields.includes(key)) continue;
    if (typeof value === 'object') continue;
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    html += `<p style="font-size: 13px; margin: 0;"><span style="font-weight: 500; color: #4b5563;">${label}:</span> <span style="color: #1f2937;">${value}</span></p>`;
  }
  html += '</div></div>';
  return html;
};

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

// Stamps a per-feature `_lyrColor` property so paint can use ["get","_lyrColor"].
function stampColors(geojson, layer, layerIndex, isLast, { colorBy, getFeatureColor, fillOpacity }) {
  if (!geojson?.features?.length) return geojson;
  const features = geojson.features.map(f => {
    let color;
    if (getFeatureColor) color = getFeatureColor(f);
    else if (colorBy) color = getDistrictColor(f.properties?.[colorBy] ?? 'Unknown');
    else color = LAYER_PALETTE[layerIndex % LAYER_PALETTE.length];
    return {
      ...f,
      properties: {
        ...(f.properties || {}),
        _lyrColor: color,
        _lyrFillOpacity: isLast ? fillOpacity : 0.2,
      },
    };
  });
  return { ...geojson, features };
}

const MapboxBoundaryMap = forwardRef(function MapboxBoundaryMap({
  layers = [],
  primaryGeojson,
  className = "w-full h-full",
  center = SAUDI_CENTER,
  zoom = SAUDI_ZOOM,
  fitBounds: shouldFitBounds = true,
  onFeatureClick,
  colorBy,
  getFeatureColor,
  fillOpacity = 0.3,
  showZoomControl = true,
  onZoomChange,
  onMoveEnd,
}, ref) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const tracked = useRef([]); // list of {srcId, fillId, lineId, circleId}
  const onZoomChangeRef = useRef(onZoomChange);
  onZoomChangeRef.current = onZoomChange;
  const onMoveEndRef = useRef(onMoveEnd);
  onMoveEndRef.current = onMoveEnd;
  const onFeatureClickRef = useRef(onFeatureClick);
  onFeatureClickRef.current = onFeatureClick;
  const { mapboxToken, reportMapboxError } = useContext(MapEngineContext);

  useImperativeHandle(ref, () => ({
    zoomIn: () => mapRef.current?.zoomIn(),
    zoomOut: () => mapRef.current?.zoomOut(),
    getZoom: () => mapRef.current?.getZoom(),
    getCenter: () => {
      const c = mapRef.current?.getCenter();
      return c ? [c.lat, c.lng] : null;
    },
  }));

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      await import("mapbox-gl/dist/mapbox-gl.css");
      if (cancelled) return;

      mapboxgl.accessToken = mapboxToken;
      const [lat, lng] = center;
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: MAPBOX_STYLE,
        center: [lng, lat],
        zoom,
        minZoom: 3,
        maxZoom: 18,
      });

      if (showZoomControl) {
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      }

      map.on("error", (e) => reportMapboxError(e.error || e));
      map.on("zoomend", () => { onZoomChangeRef.current?.(map.getZoom()); });
      map.on("moveend", () => {
        const c = map.getCenter();
        onMoveEndRef.current?.({ center: [c.lat, c.lng], zoom: map.getZoom() });
      });

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
  }, [mapboxToken]);

  // Render layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (!mapRef.current) return;

      // Tear down previous tracked layers
      for (const t of tracked.current) {
        for (const id of [t.fillId, t.lineId, t.circleId]) {
          if (id && map.getLayer(id)) map.removeLayer(id);
        }
        if (map.getSource(t.srcId)) map.removeSource(t.srcId);
      }
      tracked.current = [];

      const bboxBuilder = [];

      layers.forEach((layer, idx) => {
        if (!layer.geojson?.features?.length) return;

        const isLast = layer.id === layers[layers.length - 1]?.id;
        const stamped = stampColors(layer.geojson, layer, idx, isLast, { colorBy, getFeatureColor, fillOpacity });
        const srcId = `bnd-src-${layer.id}`;
        const fillId = `bnd-fill-${layer.id}`;
        const lineId = `bnd-line-${layer.id}`;
        const circleId = `bnd-circle-${layer.id}`;

        map.addSource(srcId, { type: "geojson", data: stamped });
        map.addLayer({
          id: fillId,
          type: "fill",
          source: srcId,
          filter: ["any", ["==", ["geometry-type"], "Polygon"], ["==", ["geometry-type"], "MultiPolygon"]],
          paint: {
            "fill-color": ["get", "_lyrColor"],
            "fill-opacity": ["get", "_lyrFillOpacity"],
          },
        });
        map.addLayer({
          id: lineId,
          type: "line",
          source: srcId,
          filter: ["any",
            ["==", ["geometry-type"], "Polygon"],
            ["==", ["geometry-type"], "MultiPolygon"],
            ["==", ["geometry-type"], "LineString"],
            ["==", ["geometry-type"], "MultiLineString"],
          ],
          paint: {
            "line-color": ["get", "_lyrColor"],
            "line-width": 2,
            "line-opacity": 0.8,
          },
        });
        map.addLayer({
          id: circleId,
          type: "circle",
          source: srcId,
          filter: ["==", ["geometry-type"], "Point"],
          paint: {
            "circle-radius": 7,
            "circle-color": ["get", "_lyrColor"],
            "circle-stroke-color": ["get", "_lyrColor"],
            "circle-stroke-width": 2,
            "circle-opacity": 0.6,
          },
        });

        for (const interactiveId of [fillId, lineId, circleId]) {
          map.on("click", interactiveId, (e) => {
            const feat = e.features?.[0];
            if (!feat) return;
            new mapboxgl.Popup({ maxWidth: "300px" })
              .setLngLat(e.lngLat)
              .setHTML(generatePopupContent(feat.properties || {}))
              .addTo(map);
            onFeatureClickRef.current?.(feat);
          });
          map.on("mouseenter", interactiveId, () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", interactiveId, () => { map.getCanvas().style.cursor = ""; });
        }

        tracked.current.push({ srcId, fillId, lineId, circleId });

        const bbox = computeBboxFromGeoJSON(layer.geojson);
        if (bbox) bboxBuilder.push(bbox);
      });

      if (primaryGeojson?.features?.length) {
        const bbox = computeBboxFromGeoJSON(primaryGeojson);
        if (bbox) bboxBuilder.push(bbox);
      }

      if (shouldFitBounds && bboxBuilder.length > 0) {
        let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
        for (const [[lo, la], [hi, ha]] of bboxBuilder) {
          if (lo < minLng) minLng = lo;
          if (la < minLat) minLat = la;
          if (hi > maxLng) maxLng = hi;
          if (ha > maxLat) maxLat = ha;
        }
        map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 50, duration: 400 });
      }
    };

    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers, primaryGeojson, shouldFitBounds, colorBy, getFeatureColor, fillOpacity]);

  return <div ref={containerRef} className={className} />;
});

MapboxBoundaryMap.displayName = "MapboxBoundaryMap";
export default MapboxBoundaryMap;
