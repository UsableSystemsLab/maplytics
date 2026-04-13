import apiClient from './apiClient';

/**
 * Fetch comparison statistics for a dataset across specified districts.
 * @param {string} datasetId - UUID of the dataset
 * @param {number[]} districtIds - array of district_id values
 * @returns {Promise<{ fields: Array, districts: Array }>}
 */
export const getComparisonStats = async (datasetId, districtIds) => {
    return apiClient.post('/comparison/stats', {
        dataset_id: datasetId,
        district_ids: districtIds,
    });
};
