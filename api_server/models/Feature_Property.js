import { DataTypes } from "sequelize";
import { sequelize } from "../configs/postgresDB.js";

/**
 * @swagger
 * components:
 *   schemas:
 *    Feature_Property:
 *     type: object
 *    properties:
 *     feature_id:
 *      type: string
 *     example: '123e4567-e89b-12d3-a456-426614174000'
 *    properties:
 *    type: object
 *   example: {
 *     speed: 45,
 *    congestion: 'low'
 *   }
 *    created_at:
 *    type: string
 *  example: '2025-11-12T14:23:00Z'
 *  updated_at:
 *   type: string
 *  example: '2025-11-12T15:45:00Z'
 **/
 // Feature_Property model definition
const Feature_Property = sequelize.define(
  "Feature_Property",
    {
        feature_id: {
            type: DataTypes.UUID,
            field: "feature_id",
            primaryKey: true,
            references: {
                model: "Feature",
                key: "feature_id",
            },
            onDelete: "CASCADE",
        },
        properties: {
            type: DataTypes.JSONB,
            field: "properties",
            allowNull: false,
        },
    },
    {
        tableName: "Feature_Property",
        schema: "public",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
    }
);
export default Feature_Property;