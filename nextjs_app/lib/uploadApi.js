import apiClient from './apiClient';

/**
 * Upload API client for frontend operations.
 * Handles both public and private file uploads.
 */

export const uploadFile = async ({ file, isPrivate, projectId, layerName, description, popupFields }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (layerName) {
        formData.append('name', layerName);
    }
    if (description) {
        formData.append('description', description);
    }
    if (popupFields?.length) {
        formData.append('popup_fields', JSON.stringify(popupFields));
    }

    let endpoint;
    if (isPrivate) {
        endpoint = `/datasets/upload/private${projectId ? `?projectId=${projectId}` : ''}`;
    } else {
        endpoint = `/datasets/upload/public${projectId ? `?projectId=${projectId}` : ''}`;
    }

    return apiClient.post(endpoint, formData);
};
