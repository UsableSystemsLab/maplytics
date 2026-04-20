import { DataTypes } from 'sequelize';
import { sequelize } from '../configs/postgresDB.js';

/**
 * @swagger
 * components:
 *   schemas:
 *     Dataset_Project:
 *       type: object
 *       properties:
 *         dataset_id:
 *           type: string
 *           format: uuid
 *         project_id:
 *           type: string
 *           format: uuid
 */

const Dataset_Project = sequelize.define(
    'Dataset_Project',
    {
        dataset_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            field: "dataset_id",
            references: {
                model: 'Dataset',
                key: 'dataset_id'
            }
        },
        project_id: {
            type: DataTypes.UUID,
            primaryKey: true,
            field: "project_id",
            references: {
                model: 'Project',
                key: 'project_id'
            }
        }
    },
    {
        tableName: "Dataset_Project",
        schema: "public",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
);

export default Dataset_Project;
