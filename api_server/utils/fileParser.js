// Extract GeoJSON from CSV, JSON, and GeoJSON file content.


const LAT_FIELD_NAMES = ['latitude', 'lat', 'Latitude', 'LAT', 'Lat'];
const LNG_FIELD_NAMES = ['longitude', 'lng', 'Longitude', 'LNG', 'Lng', 'lon', 'Lon'];

const isLatField = (name) => LAT_FIELD_NAMES.includes(name);
const isLngField = (name) => LNG_FIELD_NAMES.includes(name);

export function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const parseRow = (row) => {
        const fields = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < row.length; i++) {
            const ch = row[i];
            if (ch === '"') {
                inQuotes = !inQuotes;
            } else if (ch === ',' && !inQuotes) {
                fields.push(current.trim());
                current = '';
            } else {
                current += ch;
            }
        }
        fields.push(current.trim());
        return fields;
    };

    const headers = parseRow(lines[0]);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseRow(lines[i]);
        const obj = {};
        headers.forEach((h, idx) => {
            let val = values[idx] ?? '';
            if (val !== '' && !isNaN(Number(val))) {
                val = Number(val);
            }
            obj[h] = val;
        });
        rows.push(obj);
    }
    return rows;
}

export function buildGeoJSONFromObjects(items) {
    const features = [];
    items.forEach(item => {
        const lat = item.latitude ?? item.lat ?? item.Latitude ?? item.LAT ?? item.Lat ?? null;
        const lng = item.longitude ?? item.lng ?? item.Longitude ?? item.LNG ?? item.Lng ?? item.lon ?? item.Lon ?? null;
        if (lat !== null && lng !== null && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
            const properties = {};
            for (const [key, value] of Object.entries(item)) {
                if (!isLatField(key) && !isLngField(key)) {
                    properties[key] = value;
                }
            }
            features.push({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [Number(lng), Number(lat)]
                },
                properties
            });
        }
    });
    return { type: 'FeatureCollection', features };
}

/**
 * Parse raw file content into a GeoJSON FeatureCollection.
 * Handles CSV, GeoJSON, JSON arrays, and wrapped formats.
**/
export function parseFileToGeoJSON(content, extension) {
    if (extension === 'csv') {
        const rows = parseCSV(content);
        return buildGeoJSONFromObjects(rows);
    }

    const parsed = JSON.parse(content);

    if (parsed.type === 'FeatureCollection' && Array.isArray(parsed.features)) {
        return parsed;
    }
    if (Array.isArray(parsed)) {
        return buildGeoJSONFromObjects(parsed);
    }
    if (parsed.type === 'Feature' && parsed.geometry) {
        return { type: 'FeatureCollection', features: [parsed] };
    }
    if (Array.isArray(parsed.data)) {
        return buildGeoJSONFromObjects(parsed.data);
    }
    return buildGeoJSONFromObjects([parsed]);
}
