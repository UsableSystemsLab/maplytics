import apiClient from './apiClient';

export const getRegionBoundaries = async () => {
    return apiClient.get('/geo/regions');
};

export const getCityBoundaries = async ({ region_id } = {}) => {
    const params = new URLSearchParams();
    if (region_id) params.set('region_id', region_id);
    const qs = params.toString();
    return apiClient.get(`/geo/cities${qs ? `?${qs}` : ''}`);
};

export const getChoroplethData = async ({ points, level, region_id, city_id }) => {
    return apiClient.post('/geo/choropleth', { points, level, region_id, city_id });
};

export const getDistrictBoundaries = async ({ region_id, city_id } = {}) => {
    const params = new URLSearchParams();
    if (region_id) params.set('region_id', region_id);
    if (city_id) params.set('city_id', city_id);
    const qs = params.toString();
    return apiClient.get(`/geo/districts${qs ? `?${qs}` : ''}`);
};
