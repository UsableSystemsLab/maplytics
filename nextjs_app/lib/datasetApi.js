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

export const ingestDatasetFromFile = async (file, datasetName, entityType = 'generic', forceOverride = false) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const parsed = JSON.parse(e.target.result);

                let finalName, finalType, finalData;

                // Check if the file is in wrapped format
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.data) {
                    finalName = parsed.dataset_name || datasetName;
                    finalType = parsed.entity_type || entityType;
                    finalData = parsed.data;

                    if (!Array.isArray(finalData)) {
                        throw new Error('The "data" field must be an array');
                    }
                } else if (Array.isArray(parsed)) {
                    finalName = datasetName;
                    finalType = entityType;
                    finalData = parsed;
                } else {
                    throw new Error('File must contain either a JSON array or an object with a "data" array');
                }

                const result = await ingestDataset(finalName, finalData, finalType, '', forceOverride);
                resolve(result);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
};

export const searchDatasets = async (query) => {
    return apiClient.get(`/datasets/search?q=${encodeURIComponent(query)}`);
};
