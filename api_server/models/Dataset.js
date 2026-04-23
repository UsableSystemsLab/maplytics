import { DataTypes } from "sequelize";
import { sequelize } from "../configs/postgresDB.js";

/**
 * @swagger
 * components:
 *   schemas:
 *     Dataset:
 *       type: object
 *       required:
 *         - name
 *         - slug
 *         - user_id
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: The unique identifier for the dataset.
 *           example: "b3f1a2c4-8d9b-41d4-a716-446655440001"
 *         name:
 *           type: string
 *           description: Human-readable name of the dataset.
 *           example: "Jeddah Traffic Zones"
 *         slug:
 *           type: string
 *           description: URL-friendly identifier for the dataset.
 *           example: "jeddah-traffic-zones"
 *         description:
 *           type: string
 *           description: Optional description of the dataset.
 *         file_format:
 *           type: string
 *           description: Format of the source file (GeoJSON, CSV, etc).
 *           example: "GeoJSON"
 *         user_id:
 *           type: string
 *           description: The ID of the user who owns the dataset (Firebase UID).
 *           example: "xC9jTEIaficN5qJe9RdW01mmHi02"
 *         feature_count:
 *           type: integer
 *           description: Number of spatial features in the dataset.
 *           default: 0
 *         is_public:
 *           type: boolean
 *           description: Whether the dataset is publicly available.
 *           default: true
 */
const Dataset = sequelize.define(
    "Dataset",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            field: "dataset_id",
            primaryKey: true,
        },
        slug: {
            type: DataTypes.STRING(255),
            field: "dataset_slug",
            allowNull: false,
        },
        name: {
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
            type: DataTypes.STRING(128),
            field: "user_id",
            allowNull: false,
        },
        author: {
            type: DataTypes.STRING(255),
            field: "author",
            allowNull: true,
        },
        is_public: {
            type: DataTypes.BOOLEAN,
            field: "is_public",
            defaultValue: true,
            allowNull: false,
        },
        is_verified: {
            type: DataTypes.BOOLEAN,
            field: "is_verified",
            defaultValue: false,
            allowNull: false,
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