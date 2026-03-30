const API_BASE_URL = "http://localhost:4000/api";

const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_API_SERVER_KEY}`,
});

/**
 * Fetch comparison statistics for a dataset across specified districts.
 * @param {string} datasetId - UUID of the dataset
 * @param {number[]} districtIds - array of district_id values
 * @returns {Promise<{ fields: Array, districts: Array }>}
 */
export const getComparisonStats = async (datasetId, districtIds) => {
    const res = await fetch(`${API_BASE_URL}/comparison/stats`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            dataset_id: datasetId,
            district_ids: districtIds,
        }),
    });

    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Failed to fetch comparison stats (${res.status}): ${body}`);
    }

    return res.json();
};
