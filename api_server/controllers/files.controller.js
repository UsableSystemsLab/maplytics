import { Project, Dataset, Dataset_Project, Dataset_Metadata, User_Dataset_Filter_Prefs } from '../models/index.js';
import { s3Client, BUCKET_NAME } from '../configs/s3Client.js';
import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { inferFieldTypes } from '../utils/fieldUtils.js';
import { parseFileToGeoJSON } from '../utils/fileParser.js';
import { parseCSV, buildGeoJSONFromObjects, inferFields } from '../lib/geo/index.js';
import { resolveFilterableFields } from '../lib/filter-prefs/resolve.js';

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

        res.status(200).json({ message: 'Dataset unlinked successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete dataset', message: error.message });
    }
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
        const key = `projects/${projectId}/${dataset.dataValues.slug}.${dataset.file_format.toLowerCase()}`;
        console.log(key);
        console.log(dataset.dataValues.slug);
        console.log(dataset.file_format.toLowerCase());
        console.dir(dataset)


        const response = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        }));

        const bodyStr = await response.Body.transformToString('utf-8');
        const geojson = parseFileToGeoJSON(bodyStr, dataset.file_format.toLowerCase());
        const fields = inferFields(geojson);

        const [userRow, meta] = await Promise.all([
            User_Dataset_Filter_Prefs.findOne({ where: { user_id: userId, dataset_id: datasetId } }),
            Dataset_Metadata.findOne({ where: { dataset_id: datasetId } }),
        ]);
        const { filterableFields, source } = resolveFilterableFields({
            userPref: userRow ? userRow.filterable_fields : null,
            datasetDefault: meta?.metadata?.defaultFilterableFields ?? null,
        });

        res.status(200).json({ geojson, fields, filterableFields, source });
    } catch (error) {
        console.error('Error fetching dataset data:', error);
        res.status(500).json({ error: 'Failed to fetch dataset data', message: error.message });
    }
};