import { DataTypes } from 'sequelize';
import { sequelize } from '../configs/postgresDB.js';

const NLQJob = sequelize.define(
    'NLQJob',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            field: 'job_id',
        },
        type: {
            type: DataTypes.ENUM('aggregation', 'comparison', 'descriptive'),
            allowNull: false,
        },
        query: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        status: {
            type: DataTypes.STRING(50),
            defaultValue: 'processing',
            allowNull: false,
        },
        result_path: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        project_id: {
            type: DataTypes.UUID,
            allowNull: false,
        }
    },
    {
        tableName: 'NLQJob',
        schema: 'public',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);

export default NLQJob;
