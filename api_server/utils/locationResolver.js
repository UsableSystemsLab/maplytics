import { distance as levenshtein } from 'fastest-levenshtein';
import { Sequelize } from 'sequelize';
import { Region, City, District } from '../models/index.js';
import { sequelize } from '../configs/postgresDB.js';

const NOISE_TOKENS = new Set(['al', 'district', 'dist']);
const MAX_DISTANCE = 2;

const tokens = (text) =>
    String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s\-']/g, ' ')
        .replace(/-/g, ' ')
        .split(/\s+/)
        .filter(Boolean);

export const normalize = (text) =>
    tokens(text).filter((t) => !NOISE_TOKENS.has(t)).join(' ').trim();

const fetchRows = async (model) => {
    return model.findAll({
        attributes: [
            'name_en',
            [Sequelize.literal('ST_AsGeoJSON("boundaries")'), 'boundary_geojson'],
        ],
        where: {
            name_en: { [Sequelize.Op.ne]: null },
            boundaries: { [Sequelize.Op.ne]: null },
        },
        raw: true,
    });
};

// City has no boundaries column of its own — its polygon is the union of its districts.
const fetchCityRows = async () => {
    const [rows] = await sequelize.query(`
        SELECT c.name_en,
               (SELECT ST_AsGeoJSON(ST_Union(d.boundaries))
                FROM districts d
                WHERE d.city_id = c.city_id
                  AND d.boundaries IS NOT NULL) AS boundary_geojson
        FROM cities c
        WHERE c.name_en IS NOT NULL AND c.name_en <> ''
    `);
    return rows;
};

const LEVELS = [
    { name: 'district', fetch: () => fetchRows(District) },
    { name: 'city', fetch: fetchCityRows },
    { name: 'region', fetch: () => fetchRows(Region) },
];

const matchOne = (input, rows) => {
    const target = normalize(input);
    if (!target) return null;
    let best = null;
    for (const row of rows) {
        const candidate = normalize(row.name_en);
        if (!candidate) continue;
        const dist = levenshtein(target, candidate);
        if (dist <= MAX_DISTANCE && (best === null || dist < best.dist)) {
            best = { dist, row };
        }
    }
    if (!best) return null;
    return {
        input,
        name_en: best.row.name_en,
        boundary: best.row.boundary_geojson ? JSON.parse(best.row.boundary_geojson) : null,
    };
};

const matchAtLevel = async (names, level) => {
    const rows = await level.fetch();
    const matches = names.map((n) => matchOne(n, rows));
    if (matches.every((m) => m !== null && m.boundary)) return matches;
    return null;
};

export const resolve = async (names) => {
    if (!Array.isArray(names) || names.length !== 2) {
        return { error: 'bad_request' };
    }
    for (const level of LEVELS) {
        const matches = await matchAtLevel(names, level);
        if (matches) return { level: level.name, matches };
    }
    return null;
};
