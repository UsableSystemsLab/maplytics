import { Dataset, Dataset_Metadata, User_Dataset_Filter_Prefs } from '../models/index.js';
import { resolveFilterableFields } from '../lib/filter-prefs/resolve.js';
import logger from '../configs/logger.js';

const validateFieldList = (value) => {
    if (!Array.isArray(value)) return { ok: false, error: 'filterableFields must be an array' };
    for (const v of value) {
        if (typeof v !== 'string' || v.length === 0) {
            return { ok: false, error: 'every filterableFields entry must be a non-empty string' };
        }
        if (v.length > 200) return { ok: false, error: 'field names must be <= 200 chars' };
    }
    return { ok: true };
};

const readPrefs = async (userId, datasetId) => {
    const [userRow, meta] = await Promise.all([
        User_Dataset_Filter_Prefs.findOne({ where: { user_id: userId, dataset_id: datasetId } }),
        Dataset_Metadata.findOne({ where: { dataset_id: datasetId } }),
    ]);
    return resolveFilterableFields({
        userPref: userRow ? userRow.filterable_fields : null,
        datasetDefault: meta?.metadata?.defaultFilterableFields ?? null,
    });
};

export const getFilterPrefs = async (req, res) => {
    try {
        const { datasetId } = req.params;
        const userId = req.userId;
        const resolved = await readPrefs(userId, datasetId);
        res.status(200).json(resolved);
    } catch (error) {
        logger.error('getFilterPrefs failed:', error);
        res.status(500).json({ error: 'Failed to fetch filter prefs' });
    }
};

export const putFilterPrefs = async (req, res) => {
    try {
        const { datasetId } = req.params;
        const userId = req.userId;
        const { filterableFields } = req.body ?? {};

        const check = validateFieldList(filterableFields);
        if (!check.ok) return res.status(400).json({ error: check.error });

        const dataset = await Dataset.findByPk(datasetId);
        if (!dataset) return res.status(404).json({ error: 'Dataset not found' });

        await User_Dataset_Filter_Prefs.upsert({
            user_id: userId,
            dataset_id: datasetId,
            filterable_fields: filterableFields,
        });

        res.status(200).json({ filterableFields, source: 'user' });
    } catch (error) {
        logger.error('putFilterPrefs failed:', error);
        res.status(500).json({ error: 'Failed to save filter prefs' });
    }
};

export const deleteFilterPrefs = async (req, res) => {
    try {
        const { datasetId } = req.params;
        const userId = req.userId;
        await User_Dataset_Filter_Prefs.destroy({
            where: { user_id: userId, dataset_id: datasetId },
        });
        res.status(200).json({ ok: true });
    } catch (error) {
        logger.error('deleteFilterPrefs failed:', error);
        res.status(500).json({ error: 'Failed to clear filter prefs' });
    }
};

export const putDefaultFilterFields = async (req, res) => {
    try {
        const { datasetId } = req.params;
        const userId = req.userId;
        const { filterableFields } = req.body ?? {};

        const check = validateFieldList(filterableFields);
        if (!check.ok) return res.status(400).json({ error: check.error });

        const dataset = await Dataset.findByPk(datasetId);
        if (!dataset) return res.status(404).json({ error: 'Dataset not found' });
        if (dataset.user_id !== userId) {
            return res.status(403).json({ error: 'Only the dataset owner can set defaults' });
        }

        const existing = await Dataset_Metadata.findOne({ where: { dataset_id: datasetId } });
        const nextMetadata = {
            ...(existing?.metadata ?? {}),
            defaultFilterableFields: filterableFields,
        };

        if (existing) {
            await existing.update({ metadata: nextMetadata });
        } else {
            await Dataset_Metadata.create({
                dataset_id: datasetId,
                metadata: nextMetadata,
            });
        }

        res.status(200).json({ filterableFields });
    } catch (error) {
        logger.error('putDefaultFilterFields failed:', error);
        res.status(500).json({ error: 'Failed to save dataset default' });
    }
};
