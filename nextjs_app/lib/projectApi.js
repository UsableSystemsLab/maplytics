import apiClient from './apiClient';

/**
 * Project API client for frontend operations.
 * Identification is handled by the apiClient using Firebase ID tokens.
 */

export const getProjects = async () => {
    return apiClient.get('/projects');
};

export const createProject = async ({ id, name, datasets }) => {
    return apiClient.post('/projects', { id, name, datasets });
};

export const deleteProject = async (projectId) => {
    return apiClient.delete(`/projects/${projectId}`);
};

export const getProjectDatasets = async (projectId) => {
    return apiClient.get(`/projects/${projectId}/datasets`);
};

export const deleteProjectDataset = async (projectId, datasetId) => {
    return apiClient.delete(`/projects/${projectId}/datasets/${datasetId}`);
};
