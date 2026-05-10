import apiClient from './apiClient';

export const createComparisonJob = async ({ query, projectId, datasets }) => {
    return apiClient.post('/nlq', {
        type: 'comparison',
        query,
        projectId,
        datasets,
    });
};

export const getComparisonJobStatus = async (jobId) => {
    return apiClient.get(`/nlq/${jobId}`);
};

export const getComparisonJobResult = async (jobId) => {
    return apiClient.get(`/nlq/${jobId}/result`);
};

export const getComparisonHistory = async (projectId) => {
    return apiClient.get(`/nlq/project/${projectId}?type=comparison`);
};
