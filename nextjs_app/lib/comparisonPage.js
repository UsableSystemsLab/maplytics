export function featureCollection(features) {
    return {
        type: "FeatureCollection",
        features: (features || []).filter(Boolean),
    };
}

export function splitComparisonGeoJSON(geojson) {
    const features = Array.isArray(geojson?.features) ? geojson.features : [];
    const by = (side, role) =>
        features.filter(
            (feature) =>
                feature?.properties?.comparisonSide === side &&
                feature?.properties?.comparisonRole === role,
        );

    return {
        A: {
            boundary: featureCollection(by("A", "district-boundary")),
            points: featureCollection(by("A", "dataset-feature")),
        },
        B: {
            boundary: featureCollection(by("B", "district-boundary")),
            points: featureCollection(by("B", "dataset-feature")),
        },
    };
}

export function buildComparisonRequest({ query, projectId, selectedDatasetId }) {
    return {
        type: "comparison",
        query: query.trim(),
        projectId,
        datasets: [selectedDatasetId],
    };
}
