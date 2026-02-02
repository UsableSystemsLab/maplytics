export const uploadPublicFile = (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'No file uploaded'
        });
    }

    res.status(201).json({
        success: true,
        message: 'Public dataset uploaded successfully',
        type: 'public',
        userId: req.userId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: `/files/public/${req.userId}/${req.file.filename}`,
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
                filename: req.file.filename,
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
        success: true,
        message: 'Private dataset uploaded successfully',
        type: 'private',
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: `/files/private/${projectId}/${req.file.filename}`,
    });
};