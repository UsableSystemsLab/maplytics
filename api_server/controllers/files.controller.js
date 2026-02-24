import { s3Client, BUCKET_NAME } from '../configs/s3Client.js';
import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { readProjects, writeProjects } from './project.controller.js';

export const getPublicFile = async (req, res) => {
    res.status(501).json({ message: "getPublicFile not implemented yet" });
};

export const getPrivateFile = async (req, res) => {
    res.status(501).json({ message: "getPrivateFile not implemented yet" });
};

export const getProjectDatasets = async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;

    // Verify project exists and belongs to user
    const projects = readProjects();
    const project = projects.find(p => p.id === id);

    if (!project) {
        return res.status(404).json({ error: 'Project not found' });
    }

    if (project.userId !== userId) {
        return res.status(403).json({ error: 'Not authorized to access this project' });
    }

    // Only return datasets from metadata - it's the authoritative source
    // Metadata contains the user-provided display names.
    const metaDatasets = project.datasets || [];
    res.status(200).json(metaDatasets);
};

export const deleteDataset = async (req, res) => {
    const { id, datasetId } = req.params;
    const userId = req.userId;

    let projects = readProjects();
    const projectIndex = projects.findIndex(p => p.id === id);

    if (projectIndex === -1) {
        return res.status(404).json({ error: 'Project not found' });
    }

    // Verify ownership
    if (projects[projectIndex].userId !== userId) {
        return res.status(403).json({ error: 'Not authorized to modify this project' });
    }

    const project = projects[projectIndex];
    if (!project.datasets) {
        return res.status(404).json({ error: 'Dataset not found' });
    }

    const datasetIndex = project.datasets.findIndex(d => d.id === datasetId);

    if (datasetIndex === -1) {
        return res.status(404).json({ error: 'Dataset not found' });
    }

    const dataset = project.datasets[datasetIndex];

    // Delete file from S3
    // Handle both cases: filename is just the suffix, or filename is the full key
    let key = dataset.filename;
    if (!key.startsWith('private/') && !key.startsWith('public/')) {
        if (dataset.type === 'public' && dataset.userId) {
            key = `public/${dataset.userId}/${dataset.filename}`;
        } else {
            key = `private/${id}/${dataset.filename}`;
        }
    }

    try {
        await s3Client.send(new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        }));
    } catch (err) {
        console.error("Error deleting file from S3:", err);
    }

    // Remove from metadata
    project.datasets.splice(datasetIndex, 1);

    // Update project
    projects[projectIndex] = project;
    writeProjects(projects);

    res.status(200).json({ message: 'Dataset deleted successfully' });
};


const extractLatitude = (item) => {
    return item.latitude ?? item.lat ?? item.Latitude ?? item.LAT ?? item.Lat ?? null;
};

const extractLongitude = (item) => {
    return item.longitude ?? item.lng ?? item.Longitude ?? item.LNG ?? item.Lng ?? item.lon ?? item.Lon ?? null;
};

const LAT_FIELD_NAMES = ['latitude', 'lat', 'Latitude', 'LAT', 'Lat'];
const LNG_FIELD_NAMES = ['longitude', 'lng', 'Longitude', 'LNG', 'Lng', 'lon', 'Lon'];

const isLatField = (name) => LAT_FIELD_NAMES.includes(name);
const isLngField = (name) => LNG_FIELD_NAMES.includes(name);

const parseCSV = (text) => {
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
};

const buildGeoJSONFromObjects = (items) => {
    const features = [];
    items.forEach(item => {
        const lat = extractLatitude(item);
        const lng = extractLongitude(item);
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
};

const inferFields = (geojson) => {
    const fields = [];
    if (!geojson.features || geojson.features.length === 0) return fields;

    const keySet = new Set();
    geojson.features.forEach(f => {
        if (f.properties) {
            Object.keys(f.properties).forEach(k => keySet.add(k));
        }
    });

    keySet.forEach(key => {
        const values = geojson.features
            .map(f => f.properties?.[key])
            .filter(v => v !== undefined && v !== null && v !== '');

        const allNumbers = values.length > 0 && values.every(v => typeof v === 'number' || (!isNaN(Number(v)) && typeof v !== 'boolean'));
        const type = allNumbers ? 'number' : 'string';

        const field = { name: key, type };
        if (type === 'string') {
            const unique = [...new Set(values.map(String))];
            if (unique.length <= 100) {
                field.values = unique;
            }
        } else {
            const nums = values.map(Number);
            field.min = Math.min(...nums);
            field.max = Math.max(...nums);
        }
        fields.push(field);
    });

    return fields;
};

export const getDatasetData = async (req, res) => {
    const { id: projectId, datasetId } = req.params;
    const userId = req.userId;

    const projects = readProjects();
    const project = projects.find(p => p.id === projectId);

    if (!project) {
        return res.status(404).json({ error: 'Project not found' });
    }

    if (project.userId !== userId) {
        return res.status(403).json({ error: 'Not authorized to access this project' });
    }

    const dataset = (project.datasets || []).find(d => d.id === datasetId);
    if (!dataset) {
        return res.status(404).json({ error: 'Dataset not found' });
    }

    // Build the S3 key based on dataset type
    let key = dataset.filename;
    if (!key.startsWith('private/') && !key.startsWith('public/')) {
        if (dataset.type === 'public' && (dataset.userId || userId)) {
            key = `public/${dataset.userId || userId}/${dataset.filename}`;
        } else {
            key = `private/${projectId}/${dataset.filename}`;
        }
    }

    try {
        const response = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        }));

        const bodyStr = await response.Body.transformToString('utf-8');
        const ext = (dataset.originalName || dataset.filename || '').split('.').pop().toLowerCase();

        console.log('[getDatasetData] S3 key:', key);
        console.log('[getDatasetData] Extension:', ext);
        console.log('[getDatasetData] File content (first 500 chars):', bodyStr.substring(0, 500));

        let geojson;

        if (ext === 'csv') {
            const rows = parseCSV(bodyStr);
            console.log('[getDatasetData] CSV parsed rows:', rows.length, 'First row keys:', rows[0] ? Object.keys(rows[0]) : 'none');
            geojson = buildGeoJSONFromObjects(rows);
        } else {
            // JSON or GeoJSON
            const parsed = JSON.parse(bodyStr);
            console.log('[getDatasetData] JSON type:', parsed.type, 'isArray:', Array.isArray(parsed), 'features:', parsed.features?.length);

            if (parsed.type === 'FeatureCollection' && Array.isArray(parsed.features)) {
                geojson = parsed;
            } else if (Array.isArray(parsed)) {
                geojson = buildGeoJSONFromObjects(parsed);
            } else if (parsed.type === 'Feature' && parsed.geometry) {
                geojson = { type: 'FeatureCollection', features: [parsed] };
            } else if (Array.isArray(parsed.data)) {
                // Wrapped format: { dataset_name: "...", data: [...] }
                geojson = buildGeoJSONFromObjects(parsed.data);
            } else {
                // Try treating as a single object with lat/lng
                geojson = buildGeoJSONFromObjects([parsed]);
            }
        }
        console.log('[getDatasetData] Final features count:', geojson.features.length);

        const fields = inferFields(geojson);

        res.status(200).json({ geojson, fields });
    } catch (err) {
        console.error('Error fetching dataset from RustFS:', err);
        if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
            return res.status(404).json({ error: 'Dataset file not found in storage' });
        }
        res.status(500).json({ error: 'Failed to fetch dataset data' });
    }
};
