import { Project, User } from '../models/index.js';
import { s3Client, BUCKET_NAME } from '../configs/s3Client.js';
import { ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";

export const getProjects = async (req, res) => {
    try {
        const userId = req.userId;
        const projects = await Project.findAll({
            where: { 
                user_id: userId,
                is_deleted: false
            },
            order: [['created_at', 'DESC']]
        });
        res.status(200).json(projects);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch projects', message: error.message });
    }
};

export const createProject = async (req, res) => {
    try {
        const { name, description } = req.body;
        const userId = req.userId;
        const userEmail = req.headers['x-user-email'];

        if (!name) {
            return res.status(400).json({ error: 'Project name is required' });
        }

        // Ensure user exists in our local database (onboarding)
        // This prevents foreign key violations for new Firebase users
        try {
            await User.findOrCreate({
                where: { id: userId },
                defaults: { 
                    id: userId,
                    email: userEmail || `${userId}@placeholder.com`, // Fallback if email missing
                    role: 'User'
                }
            });
        } catch (err) {
            console.error('User synchronization failed:', err);
            // We continue as it might already exist or fail for other reasons
        }

        const newProject = await Project.create({
            name,
            description,
            user_id: userId
        });

        res.status(201).json(newProject);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create project', message: error.message });
    }
};

export const deleteProject = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const project = await Project.findOne({
            where: { id, user_id: userId }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found or not authorized' });
        }

        project.is_deleted = true;
        await project.save();

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
        }

        res.status(200).json({ message: 'Project deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete project', message: error.message });
    }
};
