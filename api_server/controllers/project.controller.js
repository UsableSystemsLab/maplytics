import fs from 'fs';
import path from 'path';
import { s3Client, BUCKET_NAME } from '../configs/s3Client.js';
import { ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";

const DATA_DIR = path.join('/app', 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');

// Helper to read projects
export const readProjects = () => {
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
export const writeProjects = (projects) => {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2));
};

export const getProjects = (req, res) => {
    const userId = req.userId;

    const projects = readProjects();
    // Filter projects by user ID
    const userProjects = projects.filter(p => p.userId === userId);
    res.status(200).json(userProjects);
};

export const createProject = (req, res) => {
    const { name, id, datasets } = req.body;
    const userId = req.userId;

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
    const userId = req.userId;

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
