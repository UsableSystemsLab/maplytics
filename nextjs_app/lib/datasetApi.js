const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const API_KEY = process.env.NEXT_PUBLIC_API_SERVER_KEY;

const getHeaders = (userId) => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
    ...(userId && { 'X-User-Id': userId })
});

export const ingestDataset = async (datasetName, data, entityType = 'generic', description = '', forceOverride = false) => {
    const response = await fetch(`${API_BASE_URL}/datasets/ingest`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            dataset_name: datasetName,
            entity_type: entityType,
            description,
            data,
            force_override: forceOverride
        })
    });

    if (!response.ok) {
        const error = await response.json();
        if (response.status === 409) {
            const conflictError = new Error(error.error || 'Dataset already exists');
            conflictError.isConflict = true;
            conflictError.existingDataset = error.existing_dataset;
            conflictError.hint = error.hint;
            throw conflictError;
        }
        throw new Error(error.error || 'Failed to ingest dataset');
    }

    return response.json();
};

export const getDatasets = async () => {
    const response = await fetch(`${API_BASE_URL}/datasets`, {
        method: 'GET',
        headers: getHeaders()
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch datasets');
    }

    return response.json();
};

export const getDatasetGeoJSON = async (datasetId) => {
    const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}/geojson`, {
        method: 'GET',
        headers: getHeaders()
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch GeoJSON');
    }

    return response.json();
};

export const getDatasetById = async (datasetId) => {
    const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}`, {
        method: 'GET',
        headers: getHeaders()
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch dataset');
    }

    return response.json();
};

export const deleteDataset = async (datasetId) => {
    const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}`, {
        method: 'DELETE',
        headers: getHeaders()
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete dataset');
    }

    return response.json();
};

export const getProjectDatasetData = async (projectId, datasetId, userId) => {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/datasets/${datasetId}/data`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_API_SERVER_KEY}`,
            'X-User-Id': userId
        }
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch dataset data');
    }

    return response.json();
};

export const ingestDatasetFromFile = async (file, datasetName, entityType = 'generic', forceOverride = false) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const parsed = JSON.parse(e.target.result);

                let finalName, finalType, finalData;

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
    const response = await fetch(`${API_BASE_URL}/datasets/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: getHeaders()
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to search datasets');
    }

    return response.json();
};

export const fetchProjectDatasets = async (projectId, userId) => {
    if (!projectId || !userId) return [];
    
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/datasets`, {
        headers: getHeaders(userId)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch project datasets');
    }

    return response.json();
};

export const deleteProjectDataset = async (projectId, datasetId, userId) => {
    if (!projectId || !datasetId || !userId) throw new Error('Missing required IDs');

    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/datasets/${datasetId}`, {
        method: 'DELETE',
        headers: getHeaders(userId)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete project dataset');
    }

    return response.json();
};
