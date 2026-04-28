"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getDatasets, getDatasetGeoJSON } from '@/lib/datasetApi';
import { computeFieldStats } from '@/lib/fieldStats';

function inferFields(geojson) {
    if (!geojson?.features?.length) return [];
    // Only check the first 100 features to infer fields
    const featuresToCheck = geojson.features.slice(0, 100);
    const fieldMap = new Map();
    
    for (const f of featuresToCheck) {
        if (f.properties) {
            for (const key of Object.keys(f.properties)) {
                if (!fieldMap.has(key)) {
                    fieldMap.set(key, typeof f.properties[key] === 'number' ? 'number' : 'string');
                }
            }
        }
    }
    
    return Array.from(fieldMap.entries()).map(([name, type]) => ({ name, type }));
}

export function useDatasetComparison() {
    const { user } = useAuth();
    
    const [allDatasets, setAllDatasets] = useState([]);
    const [loadingDatasets, setLoadingDatasets] = useState(false);
    const [error, setError] = useState(null);

    const [datasetIdA, setDatasetIdA] = useState('');
    const [datasetIdB, setDatasetIdB] = useState('');

    const [dataA, setDataA] = useState(null);
    const [dataB, setDataB] = useState(null);
    const [loadingA, setLoadingA] = useState(false);
    const [loadingB, setLoadingB] = useState(false);

    const [selectedField, setSelectedField] = useState('');

    useEffect(() => {
        const fetchAllDatasets = async () => {
            setLoadingDatasets(true);
            try {
                // Fetch public datasets
                const publicRes = await getDatasets({ is_public: true });
                let datasets = publicRes.datasets || [];
                
                // Fetch private datasets if logged in
                if (user) {
                    try {
                        const privateRes = await getDatasets({ is_public: false });
                        const privateDatasets = privateRes.datasets || [];
                        const existingIds = new Set(datasets.map(d => String(d.id || d.dataset_id)));
                        for (const d of privateDatasets) {
                            if (!existingIds.has(String(d.id || d.dataset_id))) {
                                datasets.push(d);
                            }
                        }
                    } catch (err) {
                        console.error('Failed to fetch private datasets:', err);
                    }
                }
                
                // Add unique identifiers for dropdown
                const formattedDatasets = datasets.map(d => ({
                    ...d,
                    uniqueId: String(d.id || d.dataset_id)
                }));
                
                setAllDatasets(formattedDatasets);
            } catch (err) {
                console.error('Failed to fetch datasets:', err);
                setError('Failed to load datasets list.');
            } finally {
                setLoadingDatasets(false);
            }
        };
        fetchAllDatasets();
    }, [user]);

    const loadDatasetData = async (datasetId, setData, setLoading) => {
        if (!datasetId) {
            setData(null);
            return;
        }
        setLoading(true);
        try {
            const geojson = await getDatasetGeoJSON(datasetId);
            const fields = inferFields(geojson);
            
            const propertiesList = geojson.features.map(f => f.properties).filter(Boolean);
            const stats = {
                total_count: geojson.features.length,
                field_stats: computeFieldStats(propertiesList, fields)
            };

            setData({ geojson, fields, stats });
        } catch (err) {
            console.error(`Failed to load data for dataset ${datasetId}:`, err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDatasetData(datasetIdA, setDataA, setLoadingA);
    }, [datasetIdA]);

    useEffect(() => {
        loadDatasetData(datasetIdB, setDataB, setLoadingB);
    }, [datasetIdB]);

    const fields = useMemo(() => {
        const fieldsA = dataA?.fields || [];
        const fieldsB = dataB?.fields || [];
        const fieldMap = new Map();
        [...fieldsA, ...fieldsB].forEach(f => fieldMap.set(f.name, f));
        return Array.from(fieldMap.values());
    }, [dataA, dataB]);

    const stringFields = useMemo(() => fields.filter(f => f.type === 'string'), [fields]);
    const numericFields = useMemo(() => fields.filter(f => f.type === 'number'), [fields]);

    useEffect(() => {
        if (stringFields.length > 0 && (!selectedField || !stringFields.find(f => f.name === selectedField))) {
            const nameField = stringFields.find(f => f.name.toLowerCase() === 'name');
            if (nameField) {
                setSelectedField(nameField.name);
            } else {
                setSelectedField(stringFields[0].name);
            }
        }
    }, [stringFields, selectedField]);

    const datasetAName = allDatasets.find(d => d.uniqueId === datasetIdA)?.name || 'Dataset A';
    const datasetBName = allDatasets.find(d => d.uniqueId === datasetIdB)?.name || 'Dataset B';

    const featurePointsA = useMemo(() => dataA?.geojson || null, [dataA]);
    const featurePointsB = useMemo(() => dataB?.geojson || null, [dataB]);

    const chartDataA = dataA?.stats?.field_stats?.[selectedField]?.breakdown || [];
    const chartDataB = dataB?.stats?.field_stats?.[selectedField]?.breakdown || [];

    return {
        allDatasets,
        datasetIdA, datasetIdB,
        setDatasetIdA, setDatasetIdB,
        datasetAName, datasetBName,
        statsA: dataA?.stats,
        statsB: dataB?.stats,
        loadingA, loadingB, loadingDatasets, error,
        numericFields, stringFields,
        selectedField, setSelectedField,
        featurePointsA, featurePointsB,
        chartDataA, chartDataB,
    };
}
