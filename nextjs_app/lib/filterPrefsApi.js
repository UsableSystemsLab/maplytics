import apiClient from './apiClient';

export const getFilterPrefs = (datasetId) =>
    apiClient.get(`/datasets/${datasetId}/filter-prefs`);

export const putFilterPrefs = (datasetId, filterableFields) =>
    apiClient.put(`/datasets/${datasetId}/filter-prefs`, { filterableFields });

export const deleteFilterPrefs = (datasetId) =>
    apiClient.delete(`/datasets/${datasetId}/filter-prefs`);

export const putDefaultFilterFields = (datasetId, filterableFields) =>
    apiClient.put(`/datasets/${datasetId}/default-filter-fields`, { filterableFields });
