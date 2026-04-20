/**
 * Dataset API client for frontend operations
 * Communicates with the backend API for dataset ingestion and retrieval
 */
import apiClient from './apiClient';

export const ingestDataset = async (datasetName, data, entityType = 'generic', description = '', forceOverride = false) => {
    try {
        return await apiClient.post('/datasets/ingest', {
            dataset_name: datasetName,
            entity_type: entityType,
            description,
            data,
            force_override: forceOverride
        });
    } catch (error) {
        // Special handling for 409 conflict
        if (error.status === 409 && error.data) {
            const conflictError = new Error(error.data.error || 'Dataset already exists');
            conflictError.isConflict = true;
            conflictError.existingDataset = error.data.existing_dataset;
            conflictError.hint = error.data.hint;
            throw conflictError;
        }
        throw error;
    }
};

export const getDatasets = async () => {
    return apiClient.get('/datasets');
};

export const getDatasetGeoJSON = async (datasetId) => {
    return apiClient.get(`/datasets/${datasetId}/geojson`);
};

export const getDatasetById = async (datasetId) => {
    return apiClient.get(`/datasets/${datasetId}`);
};

export const deleteDataset = async (datasetId) => {
    return apiClient.delete(`/datasets/${datasetId}`);
};

export const getProjectDatasetData = async (projectId, datasetId) => {
    // Note: userId is now automatically extracted from the token on the backend
    return apiClient.get(`/projects/${projectId}/datasets/${datasetId}/data`);
};

export const searchDatasets = async (query) => {
    return apiClient.get(`/datasets/search?q=${encodeURIComponent(query)}`);
};
