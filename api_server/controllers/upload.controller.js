export const uploadPublicFile = (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'No file uploaded'
        });
    }

    // Adapt for S3 or local storage
    const filename = req.file.key || req.file.filename;
    const location = req.file.location || `/files/public/${req.userId}/${filename}`;

    res.status(201).json({
        success: true,
        message: 'Public dataset uploaded successfully',
        type: 'public',
        userId: req.userId,
        filename: filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: location,
    });
};

import fs from 'fs';

const PROJECTS_FILE = '/datasets/projects.json';

const readProjects = () => {
    if (!fs.existsSync(PROJECTS_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf8'));
    } catch (e) {
        return [];
    }
};

const writeProjects = (projects) => {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2));
};

export const uploadPrivateFile = (req, res) => {
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
                type: 'private'
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
    });
};
