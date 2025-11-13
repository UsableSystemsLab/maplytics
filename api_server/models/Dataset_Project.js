import { DataTypes } from "sequelize";
import { sequelize } from "../configs/postgresDB.js";
/**
 * @swagger
 * components:
 *   schemas:
 *     Dataset_Project:
 *       type: object
 *       properties:
 *         dataset_id:
 *           type: string
 *           example: '123e4567-e89b-12d3-a456-426614174000'
 *         project_id:
 *           type: string
 *           example: '987e6543-e21b-65d3-a456-426614174999'
 *         created_at:
 *           type: string
 *           example: '2025-11-12T14:23:00Z'
 *         updated_at:
 *           type: string
 *           example: '2025-11-12T15:45:00Z'
 */
// Dataset_Project model definition
const Dataset_Project = sequelize.define(
    "Dataset_Project",
    {
        dataset_id: {
            type: DataTypes.UUID,
            field: "dataset_id",
            primaryKey: true,
            references: {
                model: "Dataset",
                key: "dataset_id",
            },
            onDelete: "CASCADE",
        },
        project_id: {
            type: DataTypes.UUID,
            field: "project_id",
            primaryKey: true,
            references: {
                model: "Project",
                key: "project_id",
            },
            onDelete: "CASCADE",
        },
    },
    {
        tableName: "Dataset_Project",
        schema: "public",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
    }
);

export default Dataset_Project;
