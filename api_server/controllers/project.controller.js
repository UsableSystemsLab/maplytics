import fs from 'fs';
import { s3Client, BUCKET_NAME } from '../configs/s3Client.js';
import { ListObjectsV2Command, DeleteObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";

const PROJECTS_FILE = '/datasets/projects.json';

// Helper to read projects
const readProjects = () => {
    if (!fs.existsSync(PROJECTS_FILE)) {
        return [];
    }
    const data = fs.readFileSync(PROJECTS_FILE, 'utf8');
    try {
        return JSON.parse(data);
    } catch (err) {
        console.error('Error parsing projects.json:', err);
        return [];
    }
};

// Helper to write projects
const writeProjects = (projects) => {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2));
};

export const getProjects = (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
    }

    const projects = readProjects();
    // Filter projects by user ID
    const userProjects = projects.filter(p => p.userId === userId);
    res.status(200).json(userProjects);
};

export const createProject = (req, res) => {
    const { name, id, datasets } = req.body;
    const userId = req.headers['x-user-id'];

    if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
    }

    if (!name || !id) {
        return res.status(400).json({ error: 'Project name and ID are required' });
    }

    const projects = readProjects();
    const newProject = {
        id,
        name,
        userId, // Associate project with user
        createdAt: new Date().toISOString(),
        datasets: datasets ? datasets.map((d, i) => ({
            id: `ds-${i}-${Date.now()}`,
            name: d.name,
            filename: d.filename,
            originalName: d.originalName,
            size: d.size,
            createdAt: new Date().toISOString(),
            type: d.type || 'private'
        })) : []
    };

    projects.push(newProject);
    writeProjects(projects);


    res.status(201).json(newProject);
};

export const deleteProject = async (req, res) => {
    const { id } = req.params;
    const userId = req.headers['x-user-id'];

    if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
    }

    let projects = readProjects();

    const projectIndex = projects.findIndex(p => p.id === id);
    if (projectIndex === -1) {
        return res.status(404).json({ error: 'Project not found' });
    }

    // Verify ownership
    if (projects[projectIndex].userId !== userId) {
        return res.status(403).json({ error: 'Not authorized to delete this project' });
    }

    projects.splice(projectIndex, 1);
    writeProjects(projects);

    // Delete project "folder" (all objects with prefix) from S3
    const prefix = `private/${id}/`;
    try {
        const listParams = {
            Bucket: BUCKET_NAME,
            Prefix: prefix
        };

        const listedObjects = await s3Client.send(new ListObjectsV2Command(listParams));

        if (listedObjects.Contents && listedObjects.Contents.length > 0) {
            const deleteParams = {
                Bucket: BUCKET_NAME,
                Delete: { Objects: [] }
            };

            listedObjects.Contents.forEach(({ Key }) => {
                deleteParams.Delete.Objects.push({ Key });
            });

            await s3Client.send(new DeleteObjectsCommand(deleteParams));
        }
    } catch (err) {
        console.error("Error deleting project files from S3:", err);
        // We don't fail the request if S3 cleanup fails, but we log it
    }

    res.status(200).json({ message: 'Project deleted successfully' });
};

export const getProjectDatasets = async (req, res) => {
    const { id } = req.params;
    const userId = req.headers['x-user-id'];

    if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
    }

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
    const userId = req.headers['x-user-id'];

    if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
    }

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
        key = `private/${id}/${dataset.filename}`;
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
