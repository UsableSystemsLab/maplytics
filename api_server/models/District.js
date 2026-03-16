import { DataTypes } from 'sequelize';
import { sequelize } from '../configs/postgresDB.js';

/**
 * @swagger
 * components:
 *   schemas:
 *     District:
 *       type: object
 *       properties:
 *         district_id:
 *           type: integer
 *           format: int64
 *           example: 101
 *         city_id:
 *           type: integer
 *           example: 1
 *         region_id:
 *           type: integer
 *           example: 1
 *         name_ar:
 *           type: string
 *           example: 'حي السليمانية'
 *         name_en:
 *           type: string
 *           example: 'Al Sulaimaniyah District'
 *         boundaries:
 *           type: object
 *           description: PostGIS Polygon geometry (SRID 4326)
 */
const District = sequelize.define(
    'District',
    {
        district_id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            field: 'district_id',
            allowNull: false,
        },
        city_id: {
            type: DataTypes.INTEGER,
            field: 'city_id',
            allowNull: true,
            references: {
                model: 'cities',
                key: 'city_id',
            },
        },
        region_id: {
            type: DataTypes.INTEGER,
            field: 'region_id',
            allowNull: true,
            references: {
                model: 'regions',
                key: 'region_id',
            },
        },
        name_ar: {
            type: DataTypes.TEXT,
            field: 'name_ar',
            allowNull: true,
        },
        name_en: {
            type: DataTypes.TEXT,
            field: 'name_en',
            allowNull: true,
        },
        boundaries: {
            type: DataTypes.GEOMETRY('POLYGON', 4326),
            field: 'boundaries',
            allowNull: true,
        },
    },
    {
        tableName: 'districts',
        schema: 'public',
        timestamps: false,
    }
);

export default District;
