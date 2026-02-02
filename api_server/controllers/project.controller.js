import fs from 'fs';
import path from 'path';

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

    const privateFolder = `/datasets/private/${id}`;
    if (!fs.existsSync(privateFolder)) {
        fs.mkdirSync(privateFolder, { recursive: true });
    }

    res.status(201).json(newProject);
};

export const deleteProject = (req, res) => {
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

    // Delete project folder
    const privateFolder = `/datasets/private/${id}`;
    if (fs.existsSync(privateFolder)) {
        fs.rmSync(privateFolder, { recursive: true, force: true });
    }

    res.status(200).json({ message: 'Project deleted successfully' });
};

export const getProjectDatasets = (req, res) => {
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

    const privateFolder = `/datasets/private/${id}`;
    let diskDatasets = [];

    if (fs.existsSync(privateFolder)) {
        try {
            const files = fs.readdirSync(privateFolder);
            diskDatasets = files.map((file, index) => {
                const stats = fs.statSync(path.join(privateFolder, file));
                const cleanName = file.replace(/^\d+-/, '');
                return {
                    id: `ds-disk-${index}`, // Temporary ID for disk-only items
                    name: cleanName,
                    originalFilename: file,
                    filename: file,
                    size: stats.size,
                    createdAt: stats.birthtime,
                    type: 'private',
                    isDisk: true
                };
            });
        } catch (err) {
            console.error('Error reading project datasets from disk:', err);
        }
    }

    const metaDatasets = project.datasets || [];

    // Create a map of filenames in metadata
    const metaFilenames = new Set(metaDatasets.map(d => d.filename));

    // Filter out disk items that are already in metadata
    const orphanDiskItems = diskDatasets.filter(d => !metaFilenames.has(d.filename));

    // Combine metadata items + orphan disk items
    const allDatasets = [...metaDatasets, ...orphanDiskItems];

    res.status(200).json(allDatasets);
};
