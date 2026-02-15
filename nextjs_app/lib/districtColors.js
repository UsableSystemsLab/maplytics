// Color cache to maintain consistent colors per district
const districtColorCache = new Map();
let colorIndex = 0;

export const generateDistrictColor = (seed) => {
    const goldenRatio = 0.618033988749895;
    const hue = (seed * goldenRatio * 360) % 360;
    return `hsl(${Math.round(hue)}, 70%, 50%)`;
};


export const getDistrictColor = (district) => {
    if (!district) return '#6B7280'; // Gray for unknown

    if (!districtColorCache.has(district)) {
        districtColorCache.set(district, generateDistrictColor(colorIndex++));
    }
    return districtColorCache.get(district);
};


export const resetDistrictColors = () => {
    districtColorCache.clear();
    colorIndex = 0;
};


export const getDistrictColorCache = () => {
    return new Map(districtColorCache);
};
