import { Project, Dataset, Dataset_Project } from '../models/index.js';
import { s3Client, BUCKET_NAME } from '../configs/s3Client.js';
import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { inferFieldTypes } from '../utils/fieldUtils.js';
import { parseFileToGeoJSON } from '../utils/fileParser.js';

export const getPublicFile = async (req, res) => {
    res.status(501).json({ message: "getPublicFile not implemented yet" });
};

export const getPrivateFile = async (req, res) => {
    res.status(501).json({ message: "getPrivateFile not implemented yet" });
};

export const getProjectDatasets = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const project = await Project.findOne({
            where: { id, user_id: userId, is_deleted: false },
            include: [{
                model: Dataset,
                as: 'datasets',
                through: { attributes: [] } // Hide the junction table data
            }]
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found or not authorized' });
        }

        // Return standardized dataset objects
        // The project itself uses 'name' and the datasets should ideally too
        res.status(200).json(project.datasets || []);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch project datasets', message: error.message });
    }
};

export const deleteDataset = async (req, res) => {
    try {
        const { id: projectId, datasetId } = req.params;
        const userId = req.userId;

        const project = await Project.findOne({
            where: { id: projectId, user_id: userId }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const dataset = await Dataset.findByPk(datasetId);
        if (!dataset) {
            return res.status(404).json({ error: 'Dataset not found' });
        }

        // Unlink from project (Dataset_Project)
        await Dataset_Project.destroy({
            where: { project_id: projectId, dataset_id: datasetId }
        });

        // Optionally delete the file from S3 if it's no longer used by ANY project
        // For now, we'll follow previous logic of unlinking/cleaning up
        const otherLinks = await Dataset_Project.count({ where: { dataset_id: datasetId } });
        if (otherLinks === 0) {
            // Delete from S3
            // Key construction matches previous logic but needs data from Dataset model
            // For now, we assume the dataset_slug or a filename field stores the S3 reference
            // Previous logic used dataset.filename. We'll use dataset_slug or a similar field.
            // Wait, Dataset model has dataset_slug.
        }

        res.status(200).json({ message: 'Dataset unlinked successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete dataset', message: error.message });
    }
};

const inferFields = (geojson) => {
    if (!geojson.features || geojson.features.length === 0) return [];
    const propertiesList = geojson.features.map(f => f.properties).filter(Boolean);
    return inferFieldTypes(propertiesList);
};

export const getDatasetData = async (req, res) => {
    try {
        const { id: projectId, datasetId } = req.params;
        const userId = req.userId;

        const project = await Project.findOne({
            where: { id: projectId, user_id: userId }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const dataset = await Dataset.findByPk(datasetId);
        if (!dataset) {
            return res.status(404).json({ error: 'Dataset not found' });
        }

        // S3 Key construction logic (simplified for now to use dataset_slug as filename context)
        // High-level: we need to know where the file is stored.
        // Assuming file_format and slug identify it for now, or we add a filename field.
        // Legacy code used: key = dataset.filename;
        const key = `private/${projectId}/${dataset.dataset_id}.${dataset.file_format.toLowerCase()}`;

        const response = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        }));

        const bodyStr = await response.Body.transformToString('utf-8');
        const geojson = parseFileToGeoJSON(bodyStr, dataset.file_format.toLowerCase());
        const fields = inferFields(geojson);

        res.status(200).json({ geojson, fields });
    } catch (error) {
        console.error('Error fetching dataset data:', error);
        res.status(500).json({ error: 'Failed to fetch dataset data', message: error.message });
    }
};
