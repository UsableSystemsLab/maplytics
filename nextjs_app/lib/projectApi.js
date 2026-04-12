const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const API_KEY = process.env.NEXT_PUBLIC_API_SERVER_KEY;

const getHeaders = (userId, userEmail) => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
    ...(userId && { 'X-User-Id': userId }),
    ...(userEmail && { 'X-User-Email': userEmail })
});

export const fetchProjects = async (userId) => {
    if (!userId) return [];

    const response = await fetch(`${API_BASE_URL}/projects`, {
        headers: getHeaders(userId)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch projects');
    }

    return response.json();
};

export const deleteProject = async (projectId, userId) => {
    if (!projectId || !userId) throw new Error('Project ID and User ID are required');

    const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        method: 'DELETE',
        headers: getHeaders(userId)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete project');
    }

    return response.json();
};

export const createProject = async (projectData, userId) => {
    if (!userId) throw new Error('User ID is required');

    const response = await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        headers: getHeaders(userId, projectData.email),
        body: JSON.stringify(projectData)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create project');
    }

    return response.json();
};
