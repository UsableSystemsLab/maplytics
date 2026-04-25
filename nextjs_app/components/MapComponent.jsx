"use client";
import { useState, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from "react";
import BoundaryMap from "@/components/BoundaryMap";
import ChoroplethRender from "@/components/ChoroplethRender";

const MapComponent = forwardRef(function MapComponent(
    { type, view, displayGeojson, allLayers = [], categoryField = null, onZoomChange, onMoveEnd, panelSlotRef, className = "" },
    ref
) {
    const boundaryMapRef = useRef(null);

    useImperativeHandle(ref, () => ({
        zoomIn: () => boundaryMapRef.current?.zoomIn(),
        zoomOut: () => boundaryMapRef.current?.zoomOut(),
        getCenter: () => boundaryMapRef.current?.getCenter(),
    }));

    const [zoomLevel, setZoomLevel] = useState(5);
    const [mapCenter, setMapCenter] = useState([23.8859, 45.0792]);

    const handleMoveEnd = useCallback(({ center, zoom }) => {
        setMapCenter(center);
        setZoomLevel(zoom);
        onMoveEnd?.({ center, zoom });
    }, [onMoveEnd]);

    const handleZoomChange = useCallback((zoom) => {
        setZoomLevel(zoom);
        onZoomChange?.(zoom);
    }, [onZoomChange]);

    // Each renderer exposes { geojson, colorFn, loading } via onReady
    const [rendererOutput, setRendererOutput] = useState({ geojson: null, colorFn: null });
    const handleRendererReady = useCallback((output) => { setRendererOutput(output); }, []);

    const isRendererActive = !!type && !!rendererOutput.geojson;
    const mapGeojson = isRendererActive ? rendererOutput.geojson : displayGeojson;
    const mapColorFn = isRendererActive ? rendererOutput.colorFn : null;

    return (
        <div className={`relative w-full h-full ${className}`}>
            <BoundaryMap
                ref={boundaryMapRef}
                layers={allLayers}
                primaryGeojson={mapGeojson}
                fitBounds={!isRendererActive && allLayers.length <= 1}
                colorBy={mapColorFn ? null : categoryField}
                getFeatureColor={mapColorFn}
                fillOpacity={isRendererActive ? 0.65 : 0.3}
                showZoomControl={false}
                onZoomChange={handleZoomChange}
                onMoveEnd={handleMoveEnd}
                className="h-full w-full"
            />

            {/* Add new types here — each renderer follows the onReady contract */}
            {type === "choropleth" && (
                <ChoroplethRender
                    displayGeojson={displayGeojson}
                    mapCenter={mapCenter}
                    zoomLevel={zoomLevel}
                    view={view}
                    panelSlotRef={panelSlotRef}
                    onReady={handleRendererReady}
                />
            )}
        </div>
    );
});

export default MapComponent;
