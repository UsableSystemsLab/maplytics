import { Project, Dataset, Dataset_Project } from '../models/index.js';
import { s3Client, BUCKET_NAME } from '../configs/s3Client.js';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { parseFileToGeoJSON } from '../utils/fileParser.js';
import { insertFeaturesIntoDB } from '../utils/featureInserter.js';

/**
 * After uploading file, fetch the file back, parse it, and insert features into Postgres.
 * Runs asynchronously, does not block the upload response.
 */
async function insertFeaturesFromS3(s3Key, datasetName, userId, username, originalName) {
    try {
        const response = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
        }));

        const content = await response.Body.transformToString('utf-8');
        const ext = (originalName || '').split('.').pop().toLowerCase();
        const geojson = parseFileToGeoJSON(content, ext);

        if (!geojson?.features?.length) {
            console.warn('[upload] No features parsed from file:', s3Key);
            return null;
        }

        const datasetId = await insertFeaturesIntoDB({
            datasetName,
            userId,
            username,
            fileFormat: ext,
            geojson,
        });

        return datasetId;
    } catch (err) {
        console.error('[upload] Failed to insert features into DB:', err);
        return null;
    }
}

export const uploadPublicFile = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'No file uploaded'
        });
    }

    const projectId = req.query.projectId;
    const displayName = req.body.name || req.file.originalname;

    const filename = req.file.key || req.file.filename;
    const location = req.file.location || `/files/public/${req.userId}/${filename}`;
    const filenameSuffix = filename.split('/').pop();

    const username = req.user?.name || "unknown user";

    const pgDatasetId = await insertFeaturesFromS3(
        filename, displayName, req.userId, username, req.file.originalname
    );

    if (projectId && pgDatasetId) {
        try {
            const project = await Project.findByPk(projectId);
            if (project) {
                await Dataset_Project.create({
                    project_id: projectId,
                    dataset_id: pgDatasetId
                });
            }
        } catch (err) {
            console.error("Error saving public dataset association:", err);
        }
    }

    res.status(201).json({
        success: true,
        message: 'Public dataset uploaded successfully',
        type: 'public',
        userId: req.userId,
        filename: filenameSuffix,
        originalName: req.file.originalname,
        size: req.file.size,
        url: location,
        id: pgDatasetId, // Return the actual dataset ID
        name: displayName
    });
};

export const uploadPrivateFile = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'No file uploaded'
        });
    }

    const projectId = req.query.projectId;
    const displayName = req.body.name || req.file.originalname;

    const filename = req.file.key || req.file.filename;
    const s3Url = req.file.location;
    const browserUrl = s3Url ? s3Url.replace('http://rustfs:9000', 'http://localhost:9000') : null;
    const filenameSuffix = filename.split('/').pop();

    const username = req.user?.name || "unknown user";

    const pgDatasetId = await insertFeaturesFromS3(
        filename, displayName, req.userId, username, req.file.originalname
    );

    if (projectId && pgDatasetId) {
        try {
            const project = await Project.findByPk(projectId);
            if (project) {
                await Dataset_Project.create({
                    project_id: projectId,
                    dataset_id: pgDatasetId
                });
            }
        } catch (err) {
            console.error("Error saving dataset association:", err);
        }
    }

    res.status(201).json({
        message: 'File uploaded successfully',
        id: pgDatasetId,
        name: displayName,
        filename: filenameSuffix,
        originalName: req.file.originalname,
        size: req.file.size,
        url: browserUrl || `/files/private/${projectId}/${filenameSuffix}`,
    });
};
