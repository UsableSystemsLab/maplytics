import { DataTypes } from 'sequelize';
import { sequelize } from '../configs/postgresDB.js';

/**
 * @swagger
 * components:
 *   schemas:
 *     Region:
 *       type: object
 *       properties:
 *         region_id:
 *           type: integer
 *           example: 1
 *         capital_city_id:
 *           type: integer
 *           example: 3
 *         code:
 *           type: string
 *           example: 'RD'
 *         name_ar:
 *           type: string
 *           example: 'منطقة الرياض'
 *         name_en:
 *           type: string
 *           example: 'Riyadh'
 *         center:
 *           type: object
 *           description: PostGIS Point geometry (SRID 4326)
 *         boundaries:
 *           type: object
 *           description: PostGIS Polygon geometry (SRID 4326)
 *         population:
 *           type: integer
 *           example: 6777146
 */
const Region = sequelize.define(
    'Region',
    {
        region_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            field: 'region_id',
            allowNull: false,
        },
        capital_city_id: {
            type: DataTypes.INTEGER,
            field: 'capital_city_id',
            allowNull: false,
        },
        code: {
            type: DataTypes.STRING(2),
            field: 'code',
            allowNull: false,
            defaultValue: '',
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
        boundaries: {
            type: DataTypes.GEOMETRY('POLYGON', 4326),
            field: 'boundaries',
            allowNull: false,
        },
        population: {
            type: DataTypes.INTEGER,
            field: 'population',
            allowNull: true,
        },
    },
    {
        tableName: 'regions',
        schema: 'public',
        timestamps: false,
    }
);

export default Region;
