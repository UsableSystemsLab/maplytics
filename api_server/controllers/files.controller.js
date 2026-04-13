import { s3Client, BUCKET_NAME } from '../configs/s3Client.js';
import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { readProjects, writeProjects } from './project.controller.js';
import { parseCSV, buildGeoJSONFromObjects, inferFields } from '../lib/geo/index.js';

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

        const geojson = parseFileToGeoJSON(bodyStr, ext);

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
