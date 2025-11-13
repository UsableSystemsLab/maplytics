import { DataTypes } from "sequelize";
import { sequelize } from "../configs/postgresDB.js";
/**
 * @swagger
 * components:
 *   schemas: 
 *   Dataset_Metadata:
 *    type: object
 *   properties:
 *    dataset_id:
 *    type: string
 *  example: '123e4567-e89b-12d3-a456-426614174000'
 *   metadata:
 *  type: object
 * example: {
 *   source: 'OpenStreetMap',
 *  license: 'ODbL',
 * last_updated: '2025-11-01'
 * }
 *    created_at:
 *    type: string
 * example: '2025-11-12T14:23:00Z'
 *   updated_at:
 *  type: string
 * example: '2025-11-12T15:45:00Z'
 * **/
 // Dataset_Metadata model definition
const Dataset_Metadata = sequelize.define(
    "Dataset_Metadata",
    {
        dataset_id: {
            type: DataTypes.UUID,
            field: "dataset_id",
            primaryKey: true,
            allowNull: false,
            references: {
                model: "Dataset",
                key: "dataset_id",
            },
            onDelete: "CASCADE",
        },
        metadata: { 
            type: DataTypes.JSONB,
            field: "metadata",
            allowNull: false,
        },
    },
    {
        tableName: "Dataset_Metadata",
        schema: "public",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
    }
);
export default Dataset_Metadata;