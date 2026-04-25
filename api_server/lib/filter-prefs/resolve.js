/**
 * Resolve which fields should appear as filters for a given user/dataset.
 *
 * Resolution order:
 *   1. User override (row in User_Dataset_Filter_Prefs) — even an empty array wins.
 *   2. Dataset default (Dataset_Metadata.metadata.defaultFilterableFields).
 *   3. null → show all fields (back-compat with pre-existing datasets).
 *
 * @param {object} args
 * @param {string[]|null} args.userPref        - User's saved override, or null if no row.
 * @param {string[]|null} args.datasetDefault  - Dataset-level default, or null if not set.
 * @returns {{ filterableFields: string[]|null, source: 'user'|'default'|'none' }}
 */
export const resolveFilterableFields = ({ userPref, datasetDefault }) => {
    if (Array.isArray(userPref)) {
        return { filterableFields: userPref, source: 'user' };
    }
    if (Array.isArray(datasetDefault)) {
        return { filterableFields: datasetDefault, source: 'default' };
    }
    return { filterableFields: null, source: 'none' };
};
