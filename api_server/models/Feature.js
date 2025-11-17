import { DataTypes } from "sequelize";
import { sequelize } from "../configs/postgresDB.js";
/**
 * @swagger
 * components:
 *   schemas:
 *     Feature:
 *       type: object
 *       properties:
 *         feature_id:
 *           type: string
 *           example: '123e4567-e89b-12d3-a456-426614174000'
 *         feature_name:
 *           type: string
 *           example: 'Traffic Flow'
 *         dataset_id:
 *           type: string
 *           example: '123e4567-e89b-12d3-a456-426614174000'
 *         geometry:
 *           type: object
 *           properties:
 *             type:
 *               type: string
 *               example: 'Point'
 *             coordinates:
 *               type: array
 *               items:
 *                 type: number
 *               example: [39.1234, 21.5678]
 *         properties:
 *           type: object
 *           example:
 *             speed: 45
 *             congestion: 'low'
 */

// Feature model definition
const Feature = sequelize.define(
  "Feature",
  {
    feature_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        field: "feature_id",
        primaryKey: true,
    },
    dataset_id: {
        type: DataTypes.UUID,
        field: "dataset_id",
        allowNull: false,
        references: {
            model: "Dataset",
            key: "dataset_id",
        },
        onDelete: "CASCADE",
    },
    geometry: {
        type: DataTypes.GEOMETRY("GEOMETRY", 4326),
        field: "geometry",
        allowNull: false,
    },

    },
    {
        tableName: "Feature",
        schema: "public",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
    }
);

export default Feature;