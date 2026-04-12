import { DataTypes } from 'sequelize';
import { sequelize } from '../configs/postgresDB.js';

/**
 * @swagger
 * components:
 *   schemas:
 *     Project:
 *       type: object
 *       required:
 *         - name
 *         - user_id
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: The unique identifier for the project.
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *         name:
 *           type: string
 *           description: The name of the project.
 *           example: "Urban Mobility Analysis"
 *         description:
 *           type: string
 *           description: A detailed description of the project.
 *           example: "Analyzing traffic flow in Jeddah city center."
 *         user_id:
 *           type: string
 *           description: The ID of the user who owns the project (Firebase UID).
 *           example: "xC9jTEIaficN5qJe9RdW01mmHi02"
 *         is_deleted:
 *           type: boolean
 *           description: Flag for soft deletion.
 *           default: false
 */
const Project = sequelize.define(
    'Project',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            field: "project_id",
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING(255),
            field: "project_name",
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            field: "description",
            allowNull: true,
        },
        is_deleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: "is_deleted",
        },
        user_id: {
            type: DataTypes.STRING(128),
            allowNull: false,
            field: "user_id",
        },
    },
    {
        tableName: "Project",
        schema: "public",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
    }
);

export default Project;
