import { extractLatitude, extractLongitude, validateCoordinates, isLatField, isLngField } from './coordinate-utils.js';

export const buildGeoJSONFromObjects = (items) => {
    const features = [];
    items.forEach(item => {
        const lat = extractLatitude(item);
        const lng = extractLongitude(item);
        if (validateCoordinates(lat, lng)) {
            const properties = {};
            for (const [key, value] of Object.entries(item)) {
                if (!isLatField(key) && !isLngField(key)) {
                    properties[key] = value;
                }
            }
            features.push({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [Number(lng), Number(lat)]
                },
                properties
            });
        }
    });
    return { type: 'FeatureCollection', features };
};
