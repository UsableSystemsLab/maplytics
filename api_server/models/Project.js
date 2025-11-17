import { DataTypes } from "sequelize";
import { sequelize } from "../configs/postgresDB.js";

/**
 * @swagger
 * components:
 *   schemas:
 *     Project:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: '123e4567-e89b-12d3-a456-426614174000'
 *         name:
 *           type: string
 *           example: 'Traffic Analysis'
 *         description:
 *           type: string
 *           example: 'A project for analyzing traffic patterns'
 *         user_id:
 *           type: string
 *           example: '123e4567-e89b-12d3-a456-426614174000'
 */
// Project model definition
const Project = sequelize.define(
    "Project",
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
            field: "is_deleted",
            defaultValue: false,
            allowNull: false,
        },
        user_id: {
            type: DataTypes.UUID,
            field: "user_id",
            allowNull: false,
            references: {
                model: "User",
                key: "user_id",
            },
            onDelete: "CASCADE",
        },
    },
    {
        tableName: "Project",
        schema: "public",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
    },
);

export default Project;
