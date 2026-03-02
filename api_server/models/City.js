import { DataTypes } from 'sequelize';
import { sequelize } from '../configs/postgresDB.js';

/**
 * @swagger
 * components:
 *   schemas:
 *     City:
 *       type: object
 *       properties:
 *         city_id:
 *           type: integer
 *           example: 1
 *         region_id:
 *           type: integer
 *           example: 1
 *         name_ar:
 *           type: string
 *           example: 'الرياض'
 *         name_en:
 *           type: string
 *           example: 'Riyadh'
 *         center:
 *           type: object
 *           description: PostGIS Point geometry (SRID 4326)
 */
const City = sequelize.define(
    'City',
    {
        city_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            field: 'city_id',
            allowNull: false,
        },
        region_id: {
            type: DataTypes.INTEGER,
            field: 'region_id',
            allowNull: false,
            references: {
                model: 'regions',
                key: 'region_id',
            },
        },
        name_ar: {
            type: DataTypes.STRING(64),
            field: 'name_ar',
            allowNull: false,
            defaultValue: '',
        },
        name_en: {
            type: DataTypes.STRING(64),
            field: 'name_en',
            allowNull: false,
            defaultValue: '',
        },
        center: {
            type: DataTypes.GEOMETRY('POINT', 4326),
            field: 'center',
            allowNull: false,
        },
    },
    {
        tableName: 'cities',
        schema: 'public',
        timestamps: false,
    }
);

export default City;
