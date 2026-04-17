import apiClient from './apiClient';

/**
 * Upload API client for frontend operations.
 * Handles both public and private file uploads.
 */

export const uploadFile = async ({ file, isPrivate, projectId, layerName }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (layerName) {
        formData.append('name', layerName);
    }

    let endpoint;
    if (isPrivate) {
        if (!projectId) {
            throw new Error('Project ID is required for private uploads');
        }
        endpoint = `/datasets/upload/private?projectId=${projectId}`;
    } else {
        endpoint = `/datasets/upload/public${projectId ? `?projectId=${projectId}` : ''}`;
    }

    return apiClient.post(endpoint, formData);
};
