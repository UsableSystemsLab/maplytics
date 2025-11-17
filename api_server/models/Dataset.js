import { DataTypes } from "sequelize";
import { sequelize } from "../configs/postgresDB.js";

/**
 * @swagger
 * components:
 *   schemas:
 *     Dataset:
 *       type: object
 *       properties:
 *         dataset_id:
 *           type: string
 *           example: '123e4567-e89b-12d3-a456-426614174000'
 *         dataset_slug:
 *           type: string
 *           example: 'traffic-data-jeddah'
 *         dataset_name:
 *           type: string
 *           example: 'Jeddah Traffic Flow Dataset'
 *         description:
 *           type: string
 *           example: 'A dataset containing real-time traffic information across Jeddah city.'
 *         data_source:
 *           type: string
 *           example: 'OpenStreetMap'
 *         entity_type:
 *           type: string
 *           example: 'traffic'
 *         geometry_type:
 *           type: string
 *           example: 'POINT'
 *         spatial_coverage:
 *           type: string
 *           example: 'Jeddah, Saudi Arabia'
 *         bounding_box:
 *           type: string
 *           example: 'POLYGON((39.1201 21.5433, 39.2001 21.5433, 39.2001 21.5933, 39.1201 21.5933, 39.1201 21.5433))'
 *         feature_count:
 *           type: integer
 *           example: 1245
 *         last_updated:
 *           type: string
 *           example: '2025-11-12T14:23:00Z'
 *         file_format:
 *           type: string
 *           example: 'GeoJSON'
 *         uploaded_at:
 *           type: string
 *           example: '2025-11-10T09:45:00Z'
 *         user_id:
 *           type: string
 *           example: '987e6543-e21b-65d3-a456-426614174999'
 */
// Dataset model definition
const Dataset = sequelize.define(
  "Dataset",
    {
        dataset_id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            field: "dataset_id",
            primaryKey: true,
        },
        dataset_slug: {
            type: DataTypes.STRING(255),
            field: "dataset_slug",
            allowNull: false,
        },
        dataset_name: {
            type: DataTypes.STRING(255),
            field: "dataset_name",
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            field: "description",
            allowNull: true,
        },
        data_source: {
            type: DataTypes.STRING(255),
            field: "data_source",
            allowNull: true,
        },
        entity_type: {
            type: DataTypes.STRING(100),
            field: "entity_type",
            allowNull: true,
        },
        geometry_type: {
            type: DataTypes.STRING(50),
            field: "geometry_type",
            allowNull: true,
        },
        spatial_coverage: {
            type: DataTypes.TEXT,
            field: "spatial_coverage",
            allowNull: true,
        },
        bounding_box: {
            type: DataTypes.GEOMETRY("POLYGON", 4326),
            field: "bounding_box",
            allowNull: true,
        },
        feature_count: {
            type: DataTypes.INTEGER,
            field: "feature_count",
            defaultValue: 0,
            allowNull: false,
        },
        file_format: {
            type: DataTypes.STRING(50),
            field: "file_format",
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
        tableName: "Dataset",
        schema: "public",
        timestamps: true,
        createdAt: "uploaded_at",
        updatedAt: "last_updated",
    }
);

export default Dataset;