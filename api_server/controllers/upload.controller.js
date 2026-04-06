import { readProjects, writeProjects } from './project.controller.js';
import { s3Client, BUCKET_NAME } from '../configs/s3Client.js';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { parseFileToGeoJSON } from '../utils/fileParser.js';
import { insertFeaturesIntoDB } from '../utils/featureInserter.js';

/**
 * After uploading file, fetch the file back, parse it, and insert features into Postgres.
 * Runs asynchronously, does not block the upload response.
 */
async function insertFeaturesFromS3(s3Key, datasetName, userId, originalName) {
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

    // Adapt for S3 or local storage
    const filename = req.file.key || req.file.filename;
    const location = req.file.location || `/files/public/${req.userId}/${filename}`;

    // Extract just the filename suffix from the S3 key
    // S3 key format: public/userId/timestamp-filename.csv
    const filenameSuffix = filename.split('/').pop();

    // Insert features into Postgres (async, non-blocking)
    const pgDatasetId = await insertFeaturesFromS3(
        filename, displayName, req.userId, req.file.originalname
    );

    // Persist metadata to project for public datasets
    if (projectId) {
        try {
            const projects = readProjects();
            const projectIndex = projects.findIndex(p => p.id === projectId);

            if (projectIndex !== -1) {
                if (!projects[projectIndex].datasets) {
                    projects[projectIndex].datasets = [];
                }

                projects[projectIndex].datasets.push({
                    id: `ds-${Date.now()}`,
                    name: displayName,
                    filename: filenameSuffix,
                    originalName: req.file.originalname,
                    size: req.file.size,
                    createdAt: new Date().toISOString(),
                    type: 'public',
                    userId: req.userId,
                    ...(pgDatasetId && { pgDatasetId }),
                });

                writeProjects(projects);
            }
        } catch (err) {
            console.error("Error saving public dataset metadata:", err);
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
        ...(pgDatasetId && { pgDatasetId }),
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

    // Adapt for S3 or local storage
    const filename = req.file.key || req.file.filename;
    const s3Url = req.file.location; // http://rustfs:9000/datasets/... (docker network)
    const browserUrl = s3Url ? s3Url.replace('http://rustfs:9000', 'http://localhost:9000') : null;

    // Extract just the filename suffix from the S3 key
    // S3 key format: private/projectId/timestamp-filename.csv
    const filenameSuffix = filename.split('/').pop();

    // Insert features into Postgres
    const pgDatasetId = await insertFeaturesFromS3(
        filename, displayName, req.userId, req.file.originalname
    );

    // Persist metadata to project
    try {
        const projects = readProjects();
        const projectIndex = projects.findIndex(p => p.id === projectId);

        if (projectIndex !== -1) {
            if (!projects[projectIndex].datasets) {
                projects[projectIndex].datasets = [];
            }

            projects[projectIndex].datasets.push({
                id: `ds-${Date.now()}`,
                name: displayName, // User provided name
                filename: filenameSuffix, // Store only the suffix
                originalName: req.file.originalname,
                size: req.file.size,
                createdAt: new Date().toISOString(),
                type: 'private',
                ...(pgDatasetId && { pgDatasetId }),
            });

            writeProjects(projects);
        }
    } catch (err) {
        console.error("Error saving dataset metadata:", err);
    }

    res.status(201).json({
        message: 'File uploaded successfully',
        id: `ds-${Date.now()}`,
        name: displayName,
        filename: filenameSuffix, // Return suffix for consistent frontend state
        originalName: req.file.originalname,
        size: req.file.size,
        url: browserUrl || `/files/private/${projectId}/${filenameSuffix}`,
        ...(pgDatasetId && { pgDatasetId }),
    });
};
