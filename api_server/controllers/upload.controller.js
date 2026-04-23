import { Project, Dataset, Dataset_Project } from '../models/index.js';
import { s3Client, BUCKET_NAME } from '../configs/s3Client.js';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { parseFileToGeoJSON } from '../utils/fileParser.js';
import { insertFeaturesIntoDB } from '../utils/featureInserter.js';

/**
 * After uploading file, fetch the file back, parse it, and insert features into Postgres.
 * Runs asynchronously, does not block the upload response.
 */
async function insertFeaturesFromS3(s3Key, datasetName, description, userId, author, originalName, isPublic = true, isVerified = false) {
    try {
        const response = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
        }));

        const content = await response.Body.transformToString('utf-8');
        const ext = (originalName || '').split('.').pop().toLowerCase();
        const geojson = parseFileToGeoJSON(content, ext);

        const datasetId = await insertFeaturesIntoDB({
            datasetName,
            description,
            userId,
            author,
            fileFormat: ext,
            geojson,
            isPublic,
            isVerified
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
    const description = req.body.description || null;

    const filename = req.file.key || req.file.filename;
    const location = req.file.location || `/files/public/${req.userId}/${filename}`;
    const filenameSuffix = filename.split('/').pop();

    const author = req.user?.displayName || "unknown user";
    const pgDatasetId = await insertFeaturesFromS3(
        filename, displayName, description, req.userId, author, req.file.originalname, true, req.isAdmin
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
        author: author,
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
    // We still allow projectId for backward compatibility and linking, 
    // but the dataset is primarily linked to the user and marked as private (is_public: false)

    const displayName = req.body.name || req.file.originalname;
    const description = req.body.description || null;

    const filename = req.file.key || req.file.filename;
    const location = req.file.location || `/files/private/${req.userId}/${filename}`;
    const filenameSuffix = filename.split('/').pop();

    const author = req.user?.displayName || "unknown user";
    const pgDatasetId = await insertFeaturesFromS3(
        filename, displayName, description, req.userId, author, req.file.originalname, false, req.isAdmin
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
            console.error("Error saving private dataset association:", err);
            // Non-critical error, we still have the dataset linked to the user
        }
    }

    res.status(201).json({
        success: true,
        message: 'Private dataset uploaded successfully',
        type: 'private',
        userId: req.userId,
        projectId: projectId,
        author: author,
        filename: filenameSuffix,
        originalName: req.file.originalname,
        size: req.file.size,
        url: location,
        id: pgDatasetId,
        name: displayName
    });
};
