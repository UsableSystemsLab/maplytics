    import apiClient from './apiClient';

/**
 * Upload API client for frontend operations.
 * Handles both public and private file uploads.
 */

export const uploadFile = async ({ file, isProjectDataset, projectId, layerName, description }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (layerName) {
        formData.append('name', layerName);
    }
    if (description) {
        formData.append('description', description);
    }

    let endpoint;
    if (isProjectDataset) {
        if (!projectId) {
            throw new Error('Project ID is required for project datasets');
        }
        endpoint = `/datasets/upload/project?projectId=${projectId}`;
    } else {
        endpoint = `/datasets/upload/public${projectId ? `?projectId=${projectId}` : ''}`;
    }

    return apiClient.post(endpoint, formData);
};
