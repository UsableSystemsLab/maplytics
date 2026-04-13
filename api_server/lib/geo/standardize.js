import { isCoordinateField, isLatField } from './coordinate-utils.js';

const MISSING_VALUE_STRINGS = new Set([
    '', 'null', 'NULL', 'N/A', 'n/a', 'NA', 'na', '-', 'undefined', 'none', 'None', 'NONE'
]);

// Convert a string to snake_case.
const toSnakeCase = (str) => {
    return str
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')   // camelCase boundaries
        .replace(/[\s\-\.]+/g, '_')                 // spaces, hyphens, dots -> underscore
        .replace(/_+/g, '_')                        // collapse multiple underscores
        .replace(/^_|_$/g, '')                      // trim leading/trailing underscores
        .toLowerCase();
};

// Normalize field names to snake_case. Coordinate field variants are mapped
// to their canonical names so extraction always works.

export const standardizeFieldNames = (items) => {
    if (items.length === 0) return { items: [], renamedFields: {} };

    const firstItem = items[0];
    const originalNames = Object.keys(firstItem);

    // Build rename map, handling collisions
    const renamedFields = {};
    const usedNames = new Set();

    const nameMap = {}; // original -> normalized
    for (const name of originalNames) {
        // Keep coordinate fields as canonical names
        let normalized;
        if (isCoordinateField(name)) {
            // Map all lat variants to 'latitude', all lng variants to 'longitude'
            normalized = isLatField(name) ? 'latitude' : 'longitude';
        } else {
            normalized = toSnakeCase(name);
        }

        // Handle collisions
        let finalName = normalized;
        let counter = 2;
        while (usedNames.has(finalName)) {
            finalName = `${normalized}_${counter}`;
            counter++;
        }
        usedNames.add(finalName);
        nameMap[name] = finalName;

        if (name !== finalName) {
            renamedFields[name] = finalName;
        }
    }

    // If no renames needed, return as-is
    if (Object.keys(renamedFields).length === 0) {
        return { items, renamedFields: {} };
    }

    // Apply renames
    const transformedItems = items.map(item => {
        const newItem = {};
        for (const [key, value] of Object.entries(item)) {
            newItem[nameMap[key] ?? key] = value;
        }
        return newItem;
    });

    return { items: transformedItems, renamedFields };
};

/**
 * Standardize property values in a GeoJSON FeatureCollection:
 * - Replace missing/null-like string values with "Unknown"
 * - Trim string whitespace
 * - Ensure every feature has the same set of property keys
**/
export const standardizeValues = (geojson) => {
    if (!geojson.features || geojson.features.length === 0) return { geojson, filledCount: 0 };

    // Collect all property keys and detect their types
    const allKeys = new Set();
    const numericKeys = new Set();
    geojson.features.forEach(f => {
        if (f.properties) {
            for (const [key, val] of Object.entries(f.properties)) {
                allKeys.add(key);
                if (typeof val === 'number' || (val !== '' && val !== null && val !== undefined && !isNaN(Number(val)) && typeof val !== 'boolean')) {
                    numericKeys.add(key);
                }
            }
        }
    });

    // A key is numeric only if ALL non-empty values are numeric
    for (const key of numericKeys) {
        const hasNonNumeric = geojson.features.some(f => {
            const val = f.properties?.[key];
            if (val === undefined || val === null || val === '') return false;
            return typeof val !== 'number' && isNaN(Number(val));
        });
        if (hasNonNumeric) numericKeys.delete(key);
    }

    let filledCount = 0;
    const keysArray = [...allKeys];

    geojson.features.forEach(f => {
        if (!f.properties) f.properties = {};

        for (const key of keysArray) {
            const val = f.properties[key];
            const isMissing = val === undefined || val === null || MISSING_VALUE_STRINGS.has(String(val).trim());

            if (isMissing) {
                if (numericKeys.has(key)) {
                    f.properties[key] = null;
                } else {
                    f.properties[key] = 'Unknown';
                    filledCount++;
                }
            } else if (typeof val === 'string') {
                f.properties[key] = val.trim();
            }
        }
    });

    return { geojson, filledCount };
};

// Remove duplicate features with identical coordinates and properties.

export const deduplicateFeatures = (geojson) => {
    if (!geojson.features || geojson.features.length === 0) {
        return { geojson, duplicatesRemoved: 0 };
    }

    const seen = new Set();
    const uniqueFeatures = [];

    for (const feature of geojson.features) {
        const coords = feature.geometry?.coordinates;
        if (!coords) {
            uniqueFeatures.push(feature);
            continue;
        }

        const sortedProps = Object.keys(feature.properties || {})
            .sort()
            .reduce((acc, k) => { acc[k] = feature.properties[k]; return acc; }, {});

        const hash = `${coords[0].toFixed(6)},${coords[1].toFixed(6)}|${JSON.stringify(sortedProps)}`;

        if (!seen.has(hash)) {
            seen.add(hash);
            uniqueFeatures.push(feature);
        }
    }

    const duplicatesRemoved = geojson.features.length - uniqueFeatures.length;
    geojson.features = uniqueFeatures;
    return { geojson, duplicatesRemoved };
};
