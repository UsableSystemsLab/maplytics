export const LAT_FIELD_NAMES = ['latitude', 'lat', 'Latitude', 'LAT', 'Lat'];
export const LNG_FIELD_NAMES = ['longitude', 'lng', 'Longitude', 'LNG', 'Lng', 'lon', 'Lon'];

export const isLatField = (name) => LAT_FIELD_NAMES.includes(name);
export const isLngField = (name) => LNG_FIELD_NAMES.includes(name);
export const isCoordinateField = (name) => isLatField(name) || isLngField(name);

export const extractLatitude = (item) => {
    return item.latitude ?? item.lat ?? item.Latitude ?? item.LAT ?? item.Lat ?? null;
};

export const extractLongitude = (item) => {
    return item.longitude ?? item.lng ?? item.Longitude ?? item.LNG ?? item.Lng ?? item.lon ?? item.Lon ?? null;
};

export const validateCoordinates = (lat, lng) => {
    if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
    const numLat = Number(lat);
    const numLng = Number(lng);
    if (isNaN(numLat) || isNaN(numLng)) return false;
    return numLat >= -90 && numLat <= 90 && numLng >= -180 && numLng <= 180;
};

export const removeCoordinateFields = (obj) => {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        if (!isCoordinateField(key) && key !== 'geometry') {
            result[key] = value;
        }
    }
    return result;
};
