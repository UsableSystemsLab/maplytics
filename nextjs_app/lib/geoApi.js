const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

const getHeaders = () => ({
    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_API_SERVER_KEY}`,
});

export const getRegionBoundaries = async () => {
    const res = await fetch(`${API_BASE_URL}/geo/regions`, { headers: getHeaders() });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Failed to fetch region boundaries (${res.status}): ${body}`);
    }
    return res.json();
};

export const getCityBoundaries = async ({ region_id } = {}) => {
    const params = new URLSearchParams();
    if (region_id) params.set('region_id', region_id);
    const qs = params.toString();

    const res = await fetch(`${API_BASE_URL}/geo/cities${qs ? `?${qs}` : ''}`, { headers: getHeaders() });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Failed to fetch city boundaries (${res.status}): ${body}`);
    }
    return res.json();
};

export const getChoroplethData = async ({ points, level, region_id, city_id }) => {
    const res = await fetch(`${API_BASE_URL}/geo/choropleth`, {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ points, level, region_id, city_id }),
    });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Failed to fetch choropleth data (${res.status}): ${body}`);
    }
    return res.json();
};

export const getDistrictBoundaries = async ({ region_id, city_id } = {}) => {
    const params = new URLSearchParams();
    if (region_id) params.set('region_id', region_id);
    if (city_id) params.set('city_id', city_id);
    const qs = params.toString();

    const res = await fetch(`${API_BASE_URL}/geo/districts${qs ? `?${qs}` : ''}`, { headers: getHeaders() });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Failed to fetch district boundaries (${res.status}): ${body}`);
    }
    return res.json();
};
