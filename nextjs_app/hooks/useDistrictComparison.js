"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getDistrictBoundaries } from '@/lib/geoApi';
import { getProjectDatasetData } from '@/lib/datasetApi';
import { pointInGeometry } from '@/lib/aggregateData';
import { getComparisonStats } from '@/lib/comparisonApi';
import { computeFieldStats } from '@/lib/fieldStats';


export function useDistrictComparison() {
    const { user } = useAuth();

    // Dataset state (from sidebar layerSelected event)
    const [selectedDataset, setSelectedDataset] = useState(null);
    const [geojsonData, setGeojsonData] = useState(null);
    const [fieldsMetadata, setFieldsMetadata] = useState([]);

    // District state
    const [allDistricts, setAllDistricts] = useState([]);
    const [districtBoundaries, setDistrictBoundaries] = useState(null);
    const [cityA, setCityA] = useState('');
    const [cityB, setCityB] = useState('');
    const [districtA, setDistrictA] = useState('');
    const [districtB, setDistrictB] = useState('');

    // Comparison state
    const [selectedField, setSelectedField] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Backend stats (PostGIS)
    const [comparisonResult, setComparisonResult] = useState(null);
    const [statsLoading, setStatsLoading] = useState(false);

    const userRef = useRef(user);
    userRef.current = user;

    // Load districts on mount

    useEffect(() => {
        const loadDistricts = async () => {
            try {
                const data = await getDistrictBoundaries();
                setDistrictBoundaries(data);
                const list = data.features.map(f => ({
                    district_id: f.properties.district_id,
                    name_en: f.properties.name_en,
                    name_ar: f.properties.name_ar,
                    city_name: f.properties.city_name,
                }));
                setAllDistricts(list);
            } catch (err) {
                console.error('Failed to load districts:', err);
            }
        };
        loadDistricts();
    }, []);

    // Listen for layerSelected event

    const loadLayerData = useCallback(async (projectId, datasetId) => {
        setLoading(true);
        setError(null);
        try {
            const userId = userRef.current?.uid;
            const result = await getProjectDatasetData(projectId, datasetId, userId);
            const { geojson, fields } = result;

            setGeojsonData(geojson);
            setFieldsMetadata(fields || []);

            // Auto-select first string field for chart comparison
            const firstString = (fields || []).find(f => f.type === 'string');
            if (firstString) setSelectedField(firstString.name);
        } catch (err) {
            console.error('Failed to load layer data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadLayerDataRef = useRef(loadLayerData);
    loadLayerDataRef.current = loadLayerData;

    useEffect(() => {
        const handleLayerSelected = async (e) => {
            const detail = e.detail;
            if (!detail) {
                setSelectedDataset(null);
                setGeojsonData(null);
                setFieldsMetadata([]);
                setSelectedField('');
                setComparisonResult(null);
                return;
            }
            const { projectId, datasetId, datasetName, pgDatasetId } = detail;
            setSelectedDataset({ projectId, datasetId, datasetName, pgDatasetId });
            await loadLayerDataRef.current(projectId, datasetId);
        };

        window.addEventListener('layerSelected', handleLayerSelected);
        return () => window.removeEventListener('layerSelected', handleLayerSelected);
    }, []);

    // Client-side spatial filtering

    const filterFeaturesInDistrict = useCallback((districtId) => {
        if (!geojsonData?.features || !districtBoundaries?.features || !districtId) {
            return [];
        }

        const boundary = districtBoundaries.features.find(
            f => String(f.properties.district_id) === String(districtId)
        );
        if (!boundary?.geometry) return [];

        const pointFeatures = geojsonData.features.filter(f => f.geometry?.type === 'Point');
        return pointFeatures.filter(f =>
            pointInGeometry(f.geometry.coordinates, boundary.geometry)
        );
    }, [geojsonData, districtBoundaries]);

    // Fetch stats from backend (PostGIS ST_Contains)

    const pgDatasetId = selectedDataset?.pgDatasetId;

    useEffect(() => {
        const districtIds = [districtA, districtB].filter(Boolean);
        if (!pgDatasetId || districtIds.length === 0) {
            setComparisonResult(null);
            return;
        }

        let cancelled = false;
        setStatsLoading(true);

        getComparisonStats(pgDatasetId, districtIds)
            .then(result => {
                if (!cancelled) setComparisonResult(result);
            })
            .catch(err => {
                if (!cancelled) console.error('Failed to fetch comparison stats:', err);
            })
            .finally(() => {
                if (!cancelled) setStatsLoading(false);
            });

        return () => { cancelled = true; };
    }, [pgDatasetId, districtA, districtB]);

    // Per-district stats (backend PostGIS or client-side fallback)

    const statsA = useMemo(() => {
        if (!districtA) return null;
        // Backend stats available
        if (comparisonResult) {
            return comparisonResult.districts.find(d => String(d.district_id) === String(districtA)) || null;
        }
        // Client-side fallback (no pgDatasetId — dataset uploaded before Postgres integration)
        if (!geojsonData) return null;
        const features = filterFeaturesInDistrict(districtA);
        const propertiesList = features.map(f => f.properties).filter(Boolean);
        return {
            total_count: features.length,
            field_stats: computeFieldStats(propertiesList, fieldsMetadata),
        };
    }, [comparisonResult, districtA, geojsonData, filterFeaturesInDistrict, fieldsMetadata]);

    const statsB = useMemo(() => {
        if (!districtB) return null;
        // Backend stats available
        if (comparisonResult) {
            return comparisonResult.districts.find(d => String(d.district_id) === String(districtB)) || null;
        }
        // Client-side fallback
        if (!geojsonData) return null;
        const features = filterFeaturesInDistrict(districtB);
        const propertiesList = features.map(f => f.properties).filter(Boolean);
        return {
            total_count: features.length,
            field_stats: computeFieldStats(propertiesList, fieldsMetadata),
        };
    }, [comparisonResult, districtB, geojsonData, filterFeaturesInDistrict, fieldsMetadata]);

    const featurePointsA = useMemo(() => {
        if (!districtA || !geojsonData) return null;
        const features = filterFeaturesInDistrict(districtA);
        if (!features.length) return null;
        return { type: 'FeatureCollection', features };
    }, [districtA, geojsonData, filterFeaturesInDistrict]);

    const featurePointsB = useMemo(() => {
        if (!districtB || !geojsonData) return null;
        const features = filterFeaturesInDistrict(districtB);
        if (!features.length) return null;
        return { type: 'FeatureCollection', features };
    }, [districtB, geojsonData, filterFeaturesInDistrict]);

    // City / District cascading

    const allCities = useMemo(() => {
        const cityMap = new Map();
        for (const d of allDistricts) {
            if (d.city_name && !cityMap.has(d.city_name)) {
                cityMap.set(d.city_name, { name: d.city_name });
            }
        }
        return Array.from(cityMap.values());
    }, [allDistricts]);

    const districtsForCityA = useMemo(
        () => cityA
            ? allDistricts.filter(d => d.city_name === cityA && String(d.district_id) !== String(districtB))
            : [],
        [allDistricts, cityA, districtB]
    );
    const districtsForCityB = useMemo(
        () => cityB
            ? allDistricts.filter(d => d.city_name === cityB && String(d.district_id) !== String(districtA))
            : [],
        [allDistricts, cityB, districtA]
    );

    const handleCityAChange = (val) => { setCityA(val); setDistrictA(''); };
    const handleCityBChange = (val) => { setCityB(val); setDistrictB(''); };

    // Derived data

    // Use backend fields if available, otherwise use fieldsMetadata from dataset load
    const fields = comparisonResult?.fields || fieldsMetadata;

    const stringFields = useMemo(
        () => fields.filter(f => f.type === 'string'),
        [fields]
    );
    const numericFields = useMemo(
        () => fields.filter(f => f.type === 'number'),
        [fields]
    );

    const districtAName = allDistricts.find(d => String(d.district_id) === String(districtA))?.name_en || 'District A';
    const districtBName = allDistricts.find(d => String(d.district_id) === String(districtB))?.name_en || 'District B';

    const boundaryA = useMemo(() => {
        return districtBoundaries?.features?.find(f => String(f.properties.district_id) === String(districtA)) || null;
    }, [districtBoundaries, districtA]);

    const boundaryB = useMemo(() => {
        return districtBoundaries?.features?.find(f => String(f.properties.district_id) === String(districtB)) || null;
    }, [districtBoundaries, districtB]);

    const chartDataA = statsA?.field_stats?.[selectedField]?.breakdown || [];
    const chartDataB = statsB?.field_stats?.[selectedField]?.breakdown || [];

    return {
        // Dataset
        selectedDataset, geojsonData, loading, error,
        // Districts
        allCities, cityA, cityB, districtA, districtB,
        districtsForCityA, districtsForCityB,
        handleCityAChange, handleCityBChange,
        setDistrictA, setDistrictB,
        districtAName, districtBName,
        // Stats (from backend PostGIS)
        statsA, statsB, statsLoading, numericFields, stringFields,
        selectedField, setSelectedField,
        // Map data
        boundaryA, boundaryB, featurePointsA, featurePointsB,
        // Chart data
        chartDataA, chartDataB,
    };
}
