"use client";
import { useState, useCallback, useRef, forwardRef, useImperativeHandle } from "react";
import BoundaryMap from "@/components/BoundaryMap";

/**
 * MapComponent
 *
 * A thin, type-agnostic map shell. It owns only:
 *   - BoundaryMap rendering
 *   - zoom / center state (surfaced via onZoomChange + onMoveEnd)
 *   - imperative zoomIn / zoomOut via ref
 *
 * It knows nothing about choropleth, heatmap, or any other type.
 * The parent (MapArea) is responsible for picking the right renderer,
 * getting geojson + colorFn from it, and passing them in here.
 *
 * Props
 * ─────
 * geojson          – GeoJSON FeatureCollection to render (points or polygons)
 * getFeatureColor  – optional (feature) => colorString for polygon fill
 * fillOpacity      – polygon fill opacity (default 0.3)
 * colorBy          – field name for categorical point coloring (default map mode)
 * fitBounds        – whether to auto-fit the map to geojson on load (default true)
 * showZoomControl  – show Leaflet's built-in zoom control (default false)
 * className        – extra classes for the wrapper div
 * onZoomChange     – callback(zoom: number)
 * onMoveEnd        – callback({ center: [lat, lng], zoom: number })
 */
const MapComponent = forwardRef(function MapComponent(
    {
        geojson,
        getFeatureColor = null,
        fillOpacity = 0.3,
        colorBy = null,
        fitBounds = true,
        showZoomControl = false,
        className = "",
        onZoomChange,
        onMoveEnd,
    },
    ref
) {
    const boundaryMapRef = useRef(null);

    // Expose zoom controls imperatively so MapArea's buttons still work
    useImperativeHandle(ref, () => ({
        zoomIn: () => boundaryMapRef.current?.zoomIn(),
        zoomOut: () => boundaryMapRef.current?.zoomOut(),
        getCenter: () => boundaryMapRef.current?.getCenter(),
    }));

    const handleMoveEnd = useCallback(
        ({ center, zoom }) => {
            onMoveEnd?.({ center, zoom });
        },
        [onMoveEnd]
    );

    const handleZoomChange = useCallback(
        (zoom) => {
            onZoomChange?.(zoom);
        },
        [onZoomChange]
    );

    return (
        <div className={`relative w-full h-full ${className}`}>
            <BoundaryMap
                ref={boundaryMapRef}
                geojson={geojson}
                fitBounds={fitBounds}
                colorBy={getFeatureColor ? null : colorBy}
                getFeatureColor={getFeatureColor}
                fillOpacity={fillOpacity}
                showZoomControl={showZoomControl}
                onZoomChange={handleZoomChange}
                onMoveEnd={handleMoveEnd}
                className="h-full w-full"
            />
        </div>
    );
});

export default MapComponent;
