"use client";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useSelector, useDispatch } from "react-redux";
import { selectSelectedLayers, removeLayer } from "@/lib/store/features/layersSlice";
import { selectActiveProject } from "@/lib/store/features/projectSlice";
import DatasetDrawer from "@/components/DatasetDrawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMapSync } from "@/hooks/use-map-sync";
import MapLayerPanel from "@/components/MapLayerPanel";
import MapSummaryPanel from "@/components/MapSummaryPanel";
import MapResultsSidebar from "@/components/MapResultsSidebar";
import MapCommandInput from "@/components/MapCommandInput";
import MapResultPreview from "@/components/MapResultPreview";
import { getNlqProjectJobs } from "@/lib/nlqApi";

export default function LeafletMapExplorer({ className = "w-full h-full" }) {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const dispatch = useDispatch();
    
    const selectedLayers = useSelector(selectSelectedLayers);
    const activeProject = useSelector(selectActiveProject);
    const isMobile = useIsMobile();

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [visibleLayerIds, setVisibleLayerIds] = useState(new Set());
    const [isPanelExpanded, setIsPanelExpanded] = useState(true);
    const [layerVizModes, setLayerVizModes] = useState({});
    const [jobs, setJobs] = useState([]);
    const [isLoadingJobs, setIsLoadingJobs] = useState(false);
    const [selectedJobId, setSelectedJobId] = useState(null);
    const [choroplethSettings, setChoroplethSettings] = useState({});

    const handleChoroplethSettingsChange = (layerId, patch) => {
        setChoroplethSettings(prev => ({
            ...prev,
            [layerId]: { ...(prev[layerId] || { boundaryLock: 'auto', colorScheme: 'Blues' }), ...patch }
        }));
    };

    const isInitialSync = useRef(false);
    const prevSelectedLayersRef = useRef([]);

    const prevJobsRef = useRef([]);

    const fetchJobs = async (isInitial = false) => {
        if (!activeProject?.id) return;
        
        const data = await getNlqProjectJobs(activeProject.id);
        // Ensure stable sort (latest first)
        const sortedData = [...data].sort((a, b) => {
            const dateA = new Date(a.created_at || a.updated_at || 0);
            const dateB = new Date(b.created_at || b.updated_at || 0);
            return dateB - dateA;
        });

        // Find latest done job in current and previous sets
        const latestDone = sortedData.find(j => j.status === "done" && (j.result_path?.endsWith(".png") || j.result_path?.includes("/result")));
        const prevLatestDone = prevJobsRef.current.find(j => j.status === "done" && (j.result_path?.endsWith(".png") || j.result_path?.includes("/result")));

        // Auto-selection conditions:
        // 1. A new job just finished (latestDone.id changed)
        // 2. Initial load and nothing is selected yet
        const aNewJobFinished = latestDone && latestDone.id !== prevLatestDone?.id;
        const initialAutoSelect = isInitial && !selectedJobId && latestDone;

        if (aNewJobFinished || initialAutoSelect) {
            setSelectedJobId(latestDone.job_id || latestDone.id);
        }

        setJobs(sortedData);
        prevJobsRef.current = sortedData;
    };

    // Initial load and project change
    useEffect(() => {
        if (activeProject?.id) {
            fetchJobs(true);
        }
    }, [activeProject?.id]);

    // Smart polling: only when processing
    useEffect(() => {
        const hasProcessing = jobs.some(j => j.status === "processing" || j.status === "queued");
        if (!hasProcessing || !activeProject?.id) return;

        const interval = setInterval(() => fetchJobs(false), 4000);
        return () => clearInterval(interval);
    }, [jobs, activeProject?.id, selectedJobId]);

    // 1. Sync visibleLayerIds with selectedLayers on mount/rehydration
    useEffect(() => {
        if (!isInitialSync.current && selectedLayers.length > 0) {
            setVisibleLayerIds(new Set(selectedLayers.map(l => l.id)));
            isInitialSync.current = true;
            prevSelectedLayersRef.current = selectedLayers;
        }
    }, [selectedLayers]);

    // 2. Auto-show newly added layers
    useEffect(() => {
        const prevIds = new Set(prevSelectedLayersRef.current.map(l => l.id));
        const newLayers = selectedLayers.filter(l => !prevIds.has(l.id));
        
        if (newLayers.length > 0) {
            setVisibleLayerIds(prev => {
                const next = new Set(prev);
                newLayers.forEach(l => next.add(l.id));
                return next;
            });
        }
        prevSelectedLayersRef.current = selectedLayers;
    }, [selectedLayers]);

    // 2. Initialize Leaflet Map
    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current) return;

        const map = L.map(mapContainerRef.current, {
            center: [23.8859, 45.0792],
            zoom: 6,
            zoomControl: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);
        mapInstanceRef.current = map;

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    // 3. Handle Mobile Panel State
    useEffect(() => {
        setIsPanelExpanded(!isMobile);
    }, [isMobile]);

    // 4. Custom Hook for Layer Syncing (API Fetching + Leaflet Updates)
    useMapSync(
        mapInstanceRef.current,
        selectedLayers,
        visibleLayerIds,
        layerVizModes,
        dispatch,
        choroplethSettings,
        setChoroplethSettings
    );

    // 5. UI Handlers
    const toggleVisibility = (id) => {
        setVisibleLayerIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleRemoveLayer = (id) => {
        dispatch(removeLayer(id));
        setVisibleLayerIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    };

    return (
        <div className="relative w-full h-full">
            <div ref={mapContainerRef} className={className} style={{ minHeight: "400px" }} />
            
            <MapLayerPanel
                selectedLayers={selectedLayers}
                visibleLayerIds={visibleLayerIds}
                layerVizModes={layerVizModes}
                choroplethSettings={choroplethSettings}
                onChoroplethSettingsChange={handleChoroplethSettingsChange}
                isMobile={isMobile}
                isPanelExpanded={isPanelExpanded}
                setIsPanelExpanded={setIsPanelExpanded}
                setIsDrawerOpen={setIsDrawerOpen}
                toggleVisibility={toggleVisibility}
                handleRemoveLayer={handleRemoveLayer}
                setLayerVizModes={setLayerVizModes}
            />

            <MapResultsSidebar 
                isMobile={isMobile}
                jobs={jobs}
                isLoading={isLoadingJobs}
                selectedJobId={selectedJobId}
                onViewJob={setSelectedJobId}
            />

            <MapResultPreview 
                jobs={jobs}
                isMobile={isMobile}
                selectedJobId={selectedJobId}
            />

            <MapCommandInput 
                isMobile={isMobile}
                onSuccess={() => fetchJobs(false)}
            />

            <MapSummaryPanel 
                selectedLayers={selectedLayers}
                visibleLayerIds={visibleLayerIds}
                isMobile={isMobile}
            />

            <DatasetDrawer 
                isOpen={isDrawerOpen} 
                onClose={() => setIsDrawerOpen(false)} 
                activeProject={activeProject} 
            />
        </div>
    );
}
